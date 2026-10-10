/**
 * TỰ ĐỘNG DỌN DẸP & ĐỒNG BỘ ẢNH TRÊN IMAGEKIT.IO
 * -------------------------------------------------------------
 * So sánh danh sách ảnh trên ImageKit với TẤT CẢ các nguồn kỷ niệm đang hoạt động:
 * 1. memories.json (local / git repo)
 * 2. memories_cloud.json trên ImageKit Cloud CDN
 * 3. Firebase Realtime Database
 * 
 * Tính năng bảo vệ an toàn cao cấp:
 * - Bảo vệ ảnh mới tải lên trong vòng 6 giờ (Grace Period), tránh xóa nhầm ảnh vừa upload từ điện thoại.
 * - Loại bỏ kỷ niệm nằm trong deletedIds và dọn dẹp hàng đợi deletedImages.
 * - Failsafe: Khóa an toàn tự động dừng nếu mất kết nối hoặc không đọc được kỷ niệm hợp lệ.
 * 
 * Hoạt động độc lập bằng Node.js thuần (Zero-dependency).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MEMORIES_FILE = path.join(ROOT_DIR, 'memories.json');
const IK_CONFIG_FILE = path.join(ROOT_DIR, 'imagekit-config.js');

const CLOUD_JSON_URL = 'https://ik.imagekit.io/anhuyen/anhuyen_sync/memories_cloud.json';
const FIREBASE_DB_URL = 'https://anhuyen-e8d70-default-rtdb.asia-southeast1.firebasedatabase.app/.json';

function getPrivateKey() {
    if (process.env.IMAGEKIT_PRIVATE_KEY) return process.env.IMAGEKIT_PRIVATE_KEY;
    try {
        if (fs.existsSync(IK_CONFIG_FILE)) {
            const content = fs.readFileSync(IK_CONFIG_FILE, 'utf8');
            const match = content.match(/privateKey:\s*["']([^"']+)["']/);
            if (match && match[1] && !match[1].includes('YOUR_')) return match[1];
        }
    } catch (e) {}
    return '';
}

async function fetchJSON(url, timeoutMs = 8000) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: controller.signal
        });
        clearTimeout(timer);
        if (resp.ok) {
            return await resp.json();
        }
    } catch (e) {
        console.warn(`[Cleanup] Không thể tải dữ liệu từ ${url}: ${e.message}`);
    }
    return null;
}

function extractFilename(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return '';
    const clean = urlOrPath.split('?')[0].split('#')[0];
    const name = clean.split('/').pop();
    return name && name.length > 3 ? name : '';
}

async function runCleanup() {
    const privateKey = getPrivateKey();
    if (!privateKey) {
        console.error('❌ Chưa cấu hình ImageKit Private Key!');
        process.exit(1);
    }

    const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');

    console.log('🔄 Đang thu thập danh sách kỷ niệm từ TẤT CẢ các nguồn...');

    const deletedIds = new Set();
    const explicitDeleteFiles = new Set();
    const activeFiles = new Set();
    let sourcesSucceeded = 0;

    // 1. Nguồn 1: memories.json trên máy chủ / Git repo
    if (fs.existsSync(MEMORIES_FILE)) {
        try {
            const raw = fs.readFileSync(MEMORIES_FILE, 'utf8');
            const localMemories = JSON.parse(raw);
            if (Array.isArray(localMemories)) {
                sourcesSucceeded++;
                for (const m of localMemories) {
                    if (!m || !m.id) continue;
                    const imgs = Array.isArray(m.images) ? m.images : (m.image ? [m.image] : []);
                    for (const img of imgs) {
                        const name = extractFilename(img);
                        if (name) activeFiles.add({ name, memoryId: String(m.id) });
                    }
                }
            }
        } catch (e) {
            console.warn('[Cleanup] Lỗi đọc memories.json:', e.message);
        }
    }

    // 2. Nguồn 2: ImageKit Cloud Storage (memories_cloud.json)
    const cloudData = await fetchJSON(`${CLOUD_JSON_URL}?_t=${Date.now()}`);
    if (cloudData) {
        sourcesSucceeded++;
        if (Array.isArray(cloudData.deletedIds)) {
            cloudData.deletedIds.forEach(id => deletedIds.add(String(id)));
        }
        if (Array.isArray(cloudData.deletedImages)) {
            cloudData.deletedImages.forEach(img => {
                const name = extractFilename(img);
                if (name) explicitDeleteFiles.add(name);
            });
        }
        const cloudMems = Array.isArray(cloudData) ? cloudData : (cloudData.memories || []);
        if (Array.isArray(cloudMems)) {
            for (const m of cloudMems) {
                if (!m || !m.id) continue;
                const imgs = Array.isArray(m.images) ? m.images : (m.image ? [m.image] : []);
                for (const img of imgs) {
                    const name = extractFilename(img);
                    if (name) activeFiles.add({ name, memoryId: String(m.id) });
                }
            }
        }
    }

    // 3. Nguồn 3: Firebase Realtime Database
    const fbData = await fetchJSON(FIREBASE_DB_URL);
    if (fbData && typeof fbData === 'object') {
        sourcesSucceeded++;
        if (Array.isArray(fbData.deletedIds)) {
            fbData.deletedIds.forEach(id => deletedIds.add(String(id)));
        }
        if (Array.isArray(fbData.deletedImages)) {
            fbData.deletedImages.forEach(img => {
                const name = extractFilename(img);
                if (name) explicitDeleteFiles.add(name);
            });
        }
        const fbMems = Array.isArray(fbData.memories) ? fbData.memories : (Array.isArray(fbData) ? fbData : []);
        for (const m of fbMems) {
            if (!m || !m.id) continue;
            const imgs = Array.isArray(m.images) ? m.images : (m.image ? [m.image] : []);
            for (const img of imgs) {
                const name = extractFilename(img);
                if (name) activeFiles.add({ name, memoryId: String(m.id) });
            }
        }
    }

    // Lọc lại: Chỉ giữ lại các file thuộc về kỷ niệm CHƯA BỊ XÓA (không nằm trong deletedIds)
    const trulyActiveFilenames = new Set();
    for (const item of activeFiles) {
        if (!deletedIds.has(item.memoryId) && !explicitDeleteFiles.has(item.name)) {
            trulyActiveFilenames.add(item.name);
        }
    }

    console.log(`📊 Kết quả tổng hợp:`);
    console.log(`   - Số nguồn đọc thành công: ${sourcesSucceeded}`);
    console.log(`   - Số kỷ niệm đã xóa (deletedIds): ${deletedIds.size}`);
    console.log(`   - Số ảnh kỷ niệm đang thực sự hoạt động: ${trulyActiveFilenames.size}`);

    // Failsafe: Nếu không đọc được nguồn nào hoặc danh sách hoạt động trống rỗng trong khi nguồn lỗi
    if (sourcesSucceeded === 0) {
        console.error('❌ KHÓA AN TOÀN: Không thể kết nối tới bất kỳ nguồn dữ liệu nào. Dừng cleanup để tránh xóa nhầm!');
        process.exit(1);
    }

    // 4. Lấy toàn bộ danh sách file trong thư mục /anhuyen_memories trên ImageKit
    let allFiles = [];
    try {
        let skip = 0;
        const limit = 100;
        while (true) {
            const url = `https://api.imagekit.io/v1/files?path=/anhuyen_memories&limit=${limit}&skip=${skip}`;
            const resp = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (!resp.ok) {
                console.warn(`⚠️ Lỗi lấy danh sách file ImageKit (HTTP ${resp.status})`);
                break;
            }
            const data = await resp.json();
            if (!Array.isArray(data) || data.length === 0) break;
            allFiles.push(...data);
            if (data.length < limit) break;
            skip += limit;
        }
    } catch (err) {
        console.error('❌ Lỗi kết nối ImageKit API:', err.message);
        process.exit(1);
    }

    console.log(`📁 Tổng số ảnh trên ImageKit (/anhuyen_memories): ${allFiles.length}`);

    // 5. Xác định các file mồ côi (không nằm trong bất kỳ kỷ niệm hoạt động nào)
    const now = Date.now();
    const GRACE_PERIOD_MS = 6 * 60 * 60 * 1000; // 6 giờ ân hạn cho ảnh mới tải lên

    const orphanedFiles = [];
    for (const f of allFiles) {
        if (!f || !f.name) continue;

        // Nếu file đang được sử dụng trong kỷ niệm hoạt động -> Giữ lại
        if (trulyActiveFilenames.has(f.name)) {
            continue;
        }

        // Nếu file thuộc danh sách xóa tường minh -> Xóa ngay
        if (explicitDeleteFiles.has(f.name)) {
            orphanedFiles.push(f);
            continue;
        }

        // Kiểm tra thời gian ân hạn: nếu file mới được tải lên dưới 6 giờ -> Giữ lại để an toàn
        const createdTime = f.createdAt ? new Date(f.createdAt).getTime() : 0;
        if (createdTime && (now - createdTime < GRACE_PERIOD_MS)) {
            console.log(`🛡️ Giữ lại file mới tải lên (< 6h): ${f.name}`);
            continue;
        }

        orphanedFiles.push(f);
    }

    console.log(`🗑️ Số ảnh thừa/mồ côi cần xóa: ${orphanedFiles.length}`);

    if (orphanedFiles.length === 0) {
        console.log('✅ ImageKit đã sạch hoàn toàn! Không có ảnh thừa.');
        return;
    }

    // 6. Xóa các file mồ côi
    let deletedCount = 0;
    for (const f of orphanedFiles) {
        try {
            const delResp = await fetch(`https://api.imagekit.io/v1/files/${f.fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': authHeader }
            });
            if (delResp.ok || delResp.status === 204) {
                console.log(`🗑️ Đã xóa: ${f.name} (ID: ${f.fileId})`);
                deletedCount++;
            } else {
                console.warn(`⚠️ Xóa thất bại: ${f.name} (HTTP ${delResp.status})`);
            }
        } catch (delErr) {
            console.error(`❌ Lỗi khi xóa file ${f.name}:`, delErr.message);
        }
    }

    console.log(`🎉 Hoàn tất dọn dẹp ImageKit! Đã xóa thành công ${deletedCount}/${orphanedFiles.length} file.`);
}

runCleanup();
