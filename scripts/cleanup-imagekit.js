/**
 * TỰ ĐỘNG DỌN DẸP & XÓA ẢNH KHÔNG CÒN DÙNG TRÊN IMAGEKIT.IO
 * -------------------------------------------------------------
 * So sánh danh sách ảnh trong memories.json với các file trong thư mục /anhuyen_memories trên ImageKit.
 * Bất kỳ ảnh nào không còn nằm trong bất kỳ kỷ niệm nào sẽ được tự động xóa vĩnh viễn.
 * Hoạt động độc lập bằng Node.js thuần (Zero-dependency).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MEMORIES_FILE = path.join(ROOT_DIR, 'memories.json');
const IK_CONFIG_FILE = path.join(ROOT_DIR, 'imagekit-config.js');

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

async function runCleanup() {
    const privateKey = getPrivateKey();
    if (!privateKey) {
        console.error('❌ Chưa cấu hình ImageKit Private Key!');
        process.exit(1);
    }

    const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');

    // 1. Đọc danh sách ảnh còn đang sử dụng trong memories.json
    let activeFiles = new Set();
    try {
        if (fs.existsSync(MEMORIES_FILE)) {
            const raw = fs.readFileSync(MEMORIES_FILE, 'utf8');
            const memories = JSON.parse(raw);
            if (Array.isArray(memories)) {
                for (const m of memories) {
                    const imgs = Array.isArray(m.images) ? m.images : (m.image ? [m.image] : []);
                    for (const img of imgs) {
                        if (typeof img === 'string' && img.includes('ik.imagekit.io')) {
                            const name = img.split('/').pop().split('?')[0];
                            if (name) activeFiles.add(name);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('❌ Lỗi đọc memories.json:', e.message);
    }

    console.log(`🔍 Số ảnh kỷ niệm đang sử dụng: ${activeFiles.size}`);

    // 2. Lấy danh sách file trong thư mục /anhuyen_memories trên ImageKit
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

    // 3. Tìm các ảnh mồ côi (không còn trong memories.json)
    const orphanedFiles = allFiles.filter(f => f && f.name && !activeFiles.has(f.name));
    console.log(`🗑️ Số ảnh mồ côi cần xóa: ${orphanedFiles.length}`);

    if (orphanedFiles.length === 0) {
        console.log('✅ ImageKit đã sạch hoàn toàn! Không có ảnh thừa.');
        return;
    }

    // 4. Xóa các file mồ côi
    for (const f of orphanedFiles) {
        try {
            const delResp = await fetch(`https://api.imagekit.io/v1/files/${f.fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': authHeader }
            });
            if (delResp.ok || delResp.status === 204) {
                console.log(`🗑️ Đã xóa: ${f.name} (ID: ${f.fileId})`);
            } else {
                console.warn(`⚠️ Xóa thất bại: ${f.name} (HTTP ${delResp.status})`);
            }
        } catch (delErr) {
            console.error(`❌ Lỗi khi xóa file ${f.name}:`, delErr.message);
        }
    }

    console.log('🎉 Hoàn tất dọn dẹp ảnh thừa trên ImageKit!');
}

runCleanup();
