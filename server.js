/**
 * =========================================================================
 * MAY CHU CLOUD & NOI BO CHO TRANG WEB KY NIEM: NGOC ANH - TU UYEN
 * Chay muot ma tren tat ca cac nen tang Cloud (Render, Railway, Koyeb, Docker, VPS, Linux, Mac, Windows)
 * Tu dong dong bo 2 chieu thoi gian thuc giua Dien thoai & May tinh
 * Khong phu thuoc bat ky thu vien ngoai nao (Zero-dependency), khoi dong trong 50ms!
 * =========================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = parseInt(process.env.PORT || '8080', 10);
const ROOT_DIR = __dirname;
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const MEMORIES_FILE = path.join(ROOT_DIR, 'memories.json');
const BACKUP_FILE = path.join(ROOT_DIR, 'memories.backup.json');
const LOG_FILE = path.join(ROOT_DIR, 'user_activity.log');
const AUTH_FILE = path.join(ROOT_DIR, 'auth.json');

// Dam bao thu muc uploads/ luon ton tai
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Khoi tao Server Version & Memory Count trong RAM
let serverVersion = Date.now().toString();
let memoryCount = 0;

function readMemoriesFromDisk() {
    try {
        if (fs.existsSync(MEMORIES_FILE)) {
            const raw = fs.readFileSync(MEMORIES_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                memoryCount = data.length;
                return data;
            }
        }
    } catch (e) {
        console.error('[MEMORIES] Loi doc memories.json:', e.message);
    }
    return [];
}

const initialMemories = readMemoriesFromDisk();
try {
    if (fs.existsSync(MEMORIES_FILE)) {
        serverVersion = fs.statSync(MEMORIES_FILE).mtimeMs.toString();
    }
} catch (e) {}

// Ham ho tro luu chuoi anh Base64 thanh file vat ly trong thu muc uploads/ (giu 100% do phan giai goc)
function saveBase64ToUploads(b64String, prefixId, idx) {
    if (!b64String || typeof b64String !== 'string' || !b64String.startsWith('data:image/')) {
        return b64String; // Da la duong dan file (uploads/...) thi giu nguyen
    }

    try {
        const commaIdx = b64String.indexOf(',');
        if (commaIdx === -1) return b64String;

        const header = b64String.substring(0, commaIdx);
        let ext = 'jpg';
        const match = header.match(/image\/([a-zA-Z0-9\+\-]+)/);
        if (match) {
            let mExt = match[1].toLowerCase();
            if (mExt === 'jpeg') ext = 'jpg';
            else if (mExt === 'svg+xml') ext = 'svg';
            else if (/^(jpg|png|webp|gif|svg|avif)$/.test(mExt)) ext = mExt;
        }

        const data = b64String.substring(commaIdx + 1);
        const buffer = Buffer.from(data, 'base64');
        const safeId = String(prefixId || '').replace(/[^a-zA-Z0-9_-]/g, '') || Date.now().toString();
        const fileName = `img_${safeId}_${idx}_${Date.now()}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, fileName);

        fs.writeFileSync(filePath, buffer);
        return `uploads/${fileName}`;
    } catch (err) {
        console.error('[UPLOAD] Loi luu file anh base64:', err.message);
        return b64String;
    }
}

// MIME Types tuong thich web tieu chuan
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.avif': 'image/avif'
};

// Ham doc toan bo Request Body (ho tro payload lon den 50MB cho anh phan giai cuc cao)
function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer.toString('utf8'));
        });
        req.on('error', err => reject(err));
    });
}

// Gui Response JSON chuan
function sendJSON(res, statusCode, data, headers = {}) {
    const jsonStr = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Server-Version': String(serverVersion),
        ...headers
    });
    res.end(jsonStr);
}

// Khoi tao Server HTTP
const server = http.createServer(async (req, res) => {
    // 1. Cho phep CORS toan dien cho Dien thoai, May tinh, Tunnel, va Cloud
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With, X-Server-Version');
    res.setHeader('Access-Control-Expose-Headers', 'X-Server-Version');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // =========================================================================
    // 2. API PHIEN BAN (/api/version) - Duoi 40 bytes, phan hoi duoi 0.5ms
    // =========================================================================
    if (pathname === '/api/version' && req.method === 'GET') {
        sendJSON(res, 200, {
            status: 'ok',
            version: String(serverVersion),
            count: memoryCount
        });
        return;
    }

    // =========================================================================
    // 3. API TAI ANH TRUC TIEP (/api/upload) - Luu anh goc vao thu muc uploads/
    // =========================================================================
    if (pathname === '/api/upload' && req.method === 'POST') {
        try {
            const bodyStr = await readRequestBody(req);
            const payload = JSON.parse(bodyStr || '{}');
            const savedUrls = [];

            if (payload.image) {
                const u = saveBase64ToUploads(payload.image, 'up', 0);
                savedUrls.push(u);
            } else if (Array.isArray(payload.images)) {
                payload.images.forEach((img, idx) => {
                    const u = saveBase64ToUploads(img, 'up', idx);
                    savedUrls.push(u);
                });
            }

            sendJSON(res, 200, {
                status: 'ok',
                urls: savedUrls,
                url: savedUrls.length > 0 ? savedUrls[0] : ''
            });
        } catch (err) {
            sendJSON(res, 500, { status: 'error', message: err.message });
        }
        return;
    }

    // =========================================================================
    // 4. API DONG BO KY NIEM 2 CHIEU THOI GIAN THUC (/api/memories)
    // =========================================================================
    if (pathname === '/api/memories') {
        // GET: Lay danh sach ky niem hien tai
        if (req.method === 'GET') {
            const memories = readMemoriesFromDisk();
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Server-Version': String(serverVersion)
            });
            res.end(JSON.stringify(memories));
            return;
        }

        // POST: Nhan danh sach ky niem moi tu Dien thoai hoac May tinh va merge thong minh
        if (req.method === 'POST') {
            try {
                const bodyStr = await readRequestBody(req);
                if (!bodyStr || !bodyStr.trim()) {
                    sendJSON(res, 400, { status: 'error', message: 'Du lieu trong' });
                    return;
                }

                const incomingData = JSON.parse(bodyStr);
                let incomingMemories = [];
                let deletedIds = [];

                if (incomingData && typeof incomingData === 'object' && Array.isArray(incomingData.memories)) {
                    incomingMemories = incomingData.memories;
                    if (Array.isArray(incomingData.deletedIds)) {
                        deletedIds = incomingData.deletedIds.map(String);
                    }
                } else if (Array.isArray(incomingData)) {
                    incomingMemories = incomingData;
                }

                // Doc du lieu hien co tren may chu
                const currentMemories = readMemoriesFromDisk();

                // Sao luu du phong truoc khi ghi de
                try {
                    if (fs.existsSync(MEMORIES_FILE)) {
                        fs.copyFileSync(MEMORIES_FILE, BACKUP_FILE);
                    }
                } catch (e) {}

                // Bang tra cuu Map de merge khong trung lap
                const memoryMap = new Map();
                for (const m of currentMemories) {
                    if (m && m.id) {
                        const idStr = String(m.id);
                        if (!deletedIds.includes(idStr)) {
                            memoryMap.set(idStr, m);
                        }
                    }
                }

                // Xu ly merge va chuyen tat ca anh Base64 thanh file uploads/
                for (const inItem of incomingMemories) {
                    if (!inItem || !inItem.id) continue;
                    const idStr = String(inItem.id);
                    if (deletedIds.includes(idStr)) continue;

                    const rawImgs = Array.isArray(inItem.images) ? inItem.images : (inItem.image ? [inItem.image] : []);
                    const cleanImgs = rawImgs.map((img, idx) => saveBase64ToUploads(img, idStr, idx));

                    if (memoryMap.has(idStr)) {
                        const existing = memoryMap.get(idStr);
                        const exImgs = Array.isArray(existing.images) ? existing.images : (existing.image ? [existing.image] : []);
                        
                        // Hop nhat danh sach anh
                        const mergedImgs = Array.from(new Set([...exImgs, ...cleanImgs]));

                        memoryMap.set(idStr, {
                            id: idStr,
                            images: mergedImgs,
                            content: inItem.content !== undefined ? inItem.content : existing.content,
                            location: inItem.location !== undefined ? inItem.location : existing.location,
                            date: inItem.date !== undefined ? inItem.date : existing.date,
                            createdAt: inItem.createdAt || existing.createdAt || new Date().toISOString()
                        });
                    } else {
                        memoryMap.set(idStr, {
                            id: idStr,
                            images: cleanImgs,
                            content: inItem.content || '',
                            location: inItem.location || '',
                            date: inItem.date || '',
                            createdAt: inItem.createdAt || new Date().toISOString()
                        });
                    }
                }

                // Sap xep ky niem theo thoi gian moi nhat len dau
                const sortedList = Array.from(memoryMap.values()).sort((a, b) => {
                    const dateA = a.date || a.createdAt || '';
                    const dateB = b.date || b.createdAt || '';
                    return dateB.localeCompare(dateA);
                });

                // Luu vao memories.json
                fs.writeFileSync(MEMORIES_FILE, JSON.stringify(sortedList), 'utf8');

                serverVersion = Date.now().toString();
                memoryCount = sortedList.length;

                console.log(`[MEMORIES] Dong bo thanh cong: ${sortedList.length} ky niem (Version: ${serverVersion})`);

                sendJSON(res, 200, {
                    status: 'ok',
                    version: serverVersion,
                    count: memoryCount,
                    memories: sortedList
                });
            } catch (err) {
                console.error('[MEMORIES] Loi xu ly merge memories:', err.message);
                sendJSON(res, 500, { status: 'error', message: err.message });
            }
            return;
        }
    }

    // =========================================================================
    // 5. API GHI NHAT KY HOAT DONG (/api/log)
    // =========================================================================
    if (pathname === '/api/log' && req.method === 'POST') {
        try {
            const logContent = await readRequestBody(req);
            if (logContent) {
                fs.appendFileSync(LOG_FILE, `${logContent}\r\n`, 'utf8');
                console.log(`[LOG] ${logContent}`);
            }
            sendJSON(res, 200, { status: 'ok' });
        } catch (err) {
            sendJSON(res, 200, { status: 'ok' });
        }
        return;
    }

    // =========================================================================
    // 6. API DONG BO TAI KHOAN CHU NHAN (/api/auth)
    // =========================================================================
    if (pathname === '/api/auth') {
        if (req.method === 'GET') {
            let authData = { username: 'anhuyen', password: 'anhuyen', role: 'Chủ nhân', owner: 'Ngọc Ánh & Tú Uyên' };
            try {
                if (fs.existsSync(AUTH_FILE)) {
                    authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
                }
            } catch (e) {}
            sendJSON(res, 200, { status: 'ok', auth: authData });
            return;
        }

        if (req.method === 'POST') {
            try {
                const bodyStr = await readRequestBody(req);
                const payload = JSON.parse(bodyStr || '{}');
                if (payload.username && payload.password) {
                    fs.writeFileSync(AUTH_FILE, JSON.stringify(payload, null, 2), 'utf8');
                    sendJSON(res, 200, { status: 'ok', message: 'Da dong bo tai khoan chu nhan' });
                    return;
                }
            } catch (e) {}
            sendJSON(res, 400, { status: 'error', message: 'Du lieu auth khong hop le' });
            return;
        }
    }

    // =========================================================================
    // 7. API SAO LUU TOAN BO DU LIEU (/api/backup)
    // =========================================================================
    if (pathname === '/api/backup' && req.method === 'GET') {
        const memories = readMemoriesFromDisk();
        const backupPackage = {
            exportDate: new Date().toISOString(),
            version: serverVersion,
            totalMemories: memories.length,
            memories: memories
        };
        const backupStr = JSON.stringify(backupPackage, null, 2);
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="ky-niem-backup-${Date.now()}.json"`,
            'Cache-Control': 'no-cache'
        });
        res.end(backupStr);
        return;
    }

    // =========================================================================
    // 8. PHUC VU STATIC FILES (index.html, style.css, script.js, uploads/...)
    // =========================================================================
    let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\' || safePath === '') {
        safePath = 'index.html';
    }

    let filePath = path.join(ROOT_DIR, safePath);

    // Bao ve an toan: khong cho phep truy cap ngoai thu muc ROOT_DIR
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Neu khong tim thay file va khong phai API/uploads, fallback ve index.html (SPA support)
            if (!pathname.startsWith('/api') && !pathname.startsWith('/uploads')) {
                const indexPath = path.join(ROOT_DIR, 'index.html');
                fs.readFile(indexPath, (indexErr, indexData) => {
                    if (indexErr) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(indexData);
                    }
                });
                return;
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' || ext === '.gif';
        const isText = ext === '.html' || ext === '.css' || ext === '.js' || ext === '.json' || ext === '.svg';

        const headers = {
            'Content-Type': contentType
        };

        if (isImage) {
            headers['Cache-Control'] = 'public, max-age=86400'; // Cache anh 1 ngay de tai sieu nhanh
        } else {
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            headers['Pragma'] = 'no-cache';
            headers['Expires'] = '0';
        }

        // Ho tro nen GZIP cho cac file text/code de dien thoai tai trang trong tich tac
        const acceptEncoding = req.headers['accept-encoding'] || '';
        if (isText && acceptEncoding.includes('gzip')) {
            headers['Content-Encoding'] = 'gzip';
            res.writeHead(200, headers);
            const rawStream = fs.createReadStream(filePath);
            const gzipStream = zlib.createGzip();
            rawStream.pipe(gzipStream).pipe(res);
        } else {
            headers['Content-Length'] = stats.size;
            res.writeHead(200, headers);
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('=======================================================');
    console.log('   TRANG WEB KY NIEM: NGOC ANH - TU UYEN (CLOUD SERVER)');
    console.log(`   May chu Cloud Node.js dang chay tren cong: ${PORT}`);
    console.log(`   - Truc tiep: http://localhost:${PORT}`);
    console.log('   - San sang hoan toan de Deploy len Render / Railway / Koyeb / VPS');
    console.log(`   - So luong ky niem da tai: ${memoryCount}`);
    console.log('   - Dong bo 2 chieu thoi gian thuc Dien thoai <-> May tinh');
    console.log('=======================================================');
});
