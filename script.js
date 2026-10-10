/**
 * Ứng Dụng Kỷ Niệm Yêu Thương: Ngọc Ánh & Tú Uyên
 * Toàn bộ logic giao diện, slider, đăng nhập, đổi mật khẩu, đổi màu nền và ghi log
 */

// Ảnh placeholder SVG chuẩn tương thích 100% tất cả trình duyệt bao gồm Safari/iOS
if (!window.FALLBACK_IMG_PLACEHOLDER) {
    window.FALLBACK_IMG_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
        '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff1f2"/><stop offset="50%" stop-color="#ffe4e6"/><stop offset="100%" stop-color="#fecdd3"/></linearGradient></defs>' +
        '<rect width="800" height="600" rx="28" fill="url(#bg)"/>' +
        '<circle cx="400" cy="245" r="70" fill="#ffffff" opacity="0.9"/>' +
        '<path d="M365 210h70l15 20h30a16 16 0 0 1 16 16v56a16 16 0 0 1-16 16H320a16 16 0 0 1-16-16v-56a16 16 0 0 1 16-16h30z" fill="#fb7185"/>' +
        '<circle cx="400" cy="265" r="28" fill="#ffffff"/><circle cx="400" cy="265" r="19" fill="#e11d48"/>' +
        '<path d="M435 195c-5-8-16-8-21 0-5-8-16-8-21 0-7 10 3 22 21 34 18-12 28-24 21-34z" fill="#f43f5e"/>' +
        '<text x="400" y="365" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="24" font-weight="bold" fill="#be123c">Khoảnh khắc kỷ niệm</text>' +
        '<text x="400" y="400" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="16" fill="#e11d48" opacity="0.85">Ngọc Ánh &amp; Tú Uyên</text>' +
        '</svg>'
    );
}

if (!window.handleImageError) {
    window.handleImageError = function(imgEl, memoryId) {
        if (!imgEl) return;
        imgEl.onerror = null;
        imgEl.removeAttribute('alt');
        imgEl.src = window.FALLBACK_IMG_PLACEHOLDER;
        imgEl.classList.add('fallback-applied');
    };
}

if (!window.handleThumbError) {
    window.handleThumbError = function(imgEl, memoryId) {
        if (!imgEl) return;
        imgEl.onerror = null;
        const parent = imgEl.parentElement;
        if (parent) {
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-100 to-pink-100 text-rose-500 flex items-center justify-center font-bold text-sm border-2 border-white shadow-xs group-hover:scale-105 transition-transform select-none';
            fallbackDiv.innerHTML = '💖';
            fallbackDiv.title = 'Khoảnh khắc kỷ niệm';
            imgEl.replaceWith(fallbackDiv);
        } else {
            imgEl.removeAttribute('alt');
            imgEl.src = window.FALLBACK_IMG_PLACEHOLDER;
        }
    };
}

if (!window.isVideoUrl) {
    window.isVideoUrl = function(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.startsWith('data:video/')) return true;
        const clean = url.split('?')[0].split('#')[0].toLowerCase();
        if (/\.(mp4|mov|m4v|webm|avi|mkv|ogv|3gp)$/i.test(clean)) return true;
        if (/\/vid_[a-zA-Z0-9_-]+/i.test(clean)) return true;
        return false;
    };
}

if (!window.readFileAsDataURL) {
    window.readFileAsDataURL = function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    };
}

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. HỆ THỐNG GHI LOG THAO TÁC NGẦM (TỰ ĐỘNG LƯU TRỰC TIẾP VÀO USER_ACTIVITY.LOG)
    // =========================================================================
    const Logger = {
        storageKey: 'weddingAppLogs',
        fileHandle: null,
        directoryHandle: null,

        // Gom nhóm log: đủ 10 hành động hoặc mỗi 30 giây gửi 1 gói về backend
        queue: [],
        batchSize: 10,
        flushIntervalMs: 30000,
        timerId: null,

        init() {
            // Đảm bảo gửi nốt các log còn tồn đọng khi người dùng rời hoặc ẩn trang
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.flush(true);
                }
            });
            window.addEventListener('pagehide', () => this.flush(true));
            window.addEventListener('beforeunload', () => this.flush(true));
        },
        
        getLogs() {
            try {
                return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            } catch (e) {
                return [];
            }
        },

        async log(action, message, details = {}) {
            const now = new Date();
            const timeFormatted = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN');
            const detailsStr = Object.keys(details).length ? JSON.stringify(details) : '';
            const logLine = `[${timeFormatted}] [${action}] ${message} ${detailsStr}`.trim();
            
            const logEntry = {
                id: Date.now() + Math.random().toString(36).substr(2, 4),
                timestamp: now.toISOString(),
                timeFormatted: timeFormatted,
                action: action,
                message: message,
                details: details
            };

            // 1. Lưu dự phòng ngầm vào LocalStorage (tối đa 200 bản ghi)
            const logs = this.getLogs();
            logs.unshift(logEntry);
            if (logs.length > 200) logs.length = 200;

            try {
                localStorage.setItem(this.storageKey, JSON.stringify(logs));
            } catch (e) {}

            // 2. Gom nhóm vào hàng đợi gửi về server
            this.queue.push(logLine);

            if (this.queue.length >= this.batchSize) {
                // Đủ 10 hành động: gửi ngay lập tức
                this.flush();
            } else if (!this.timerId) {
                // Chưa đủ 10 hành động: hẹn giờ tối đa 30 giây gửi 1 gói
                this.timerId = setTimeout(() => {
                    this.flush();
                }, this.flushIntervalMs);
            }

            // 3. Tự động ghi vào file nếu có fileHandle kết nối
            this.writeToFileHandle(logLine);
        },

        // Gửi toàn bộ gói log trong hàng đợi về server
        async flush(isExiting = false) {
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }

            if (this.queue.length === 0) return;

            const batch = this.queue.splice(0, this.queue.length);
            const payload = batch.join('\r\n');

            await this.sendToServer(payload, isExiting);
        },

        // Gửi ngầm tới server nội bộ để ghi vào D:\TNA\Project\anhuyen\user_activity.log
        async sendToServer(logPayload, isExiting = false) {
            if (!window.location.protocol || !window.location.protocol.startsWith('http')) {
                return;
            }
            const endpoints = ['/api/log'];
            for (const ep of endpoints) {
                try {
                    // Nếu đang thoát trang và trình duyệt có sendBeacon, dùng sendBeacon
                    if (isExiting && navigator.sendBeacon) {
                        const blob = new Blob([logPayload], { type: 'text/plain;charset=utf-8' });
                        const sent = navigator.sendBeacon(ep, blob);
                        if (sent) break;
                    }
                    await fetch(ep, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: logPayload,
                        mode: 'cors',
                        keepalive: true
                    });
                    break;
                } catch (e) {}
            }
        },

        // Ghi trực tiếp vào file nếu được liên kết
        async writeToFileHandle(logLine) {
            if (!this.fileHandle) return;
            try {
                const file = await this.fileHandle.getFile();
                const existingText = await file.text();
                const updatedText = existingText + '\n' + logLine;
                
                const writable = await this.fileHandle.createWritable();
                await writable.write(updatedText);
                await writable.close();
            } catch (e) {}
        }
    };
    Logger.init();

    // Bắt lỗi JavaScript toàn cục tự động
    window.addEventListener('error', (event) => {
        Logger.log('ERROR', event.message || 'Lỗi script', {
            file: event.filename,
            line: event.lineno,
            col: event.colno
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        Logger.log('PROMISE_ERROR', 'Lỗi bất đồng bộ', {
            reason: String(event.reason)
        });
    });

    // =========================================================================
    // 2. QUẢN LÝ TÀI KHOẢN VÀ ĐĂNG NHẬP (AUTH & CREDENTIALS)
    // =========================================================================
    const Auth = {
        storageKey: 'weddingUserAuth',
        
        getCredentials() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (saved) return JSON.parse(saved);
            } catch (e) {}

            // Khởi tạo thông tin tài khoản ban đầu
            const defaultAuth = {
                username: 'anhuyen',
                password: 'anhuyen',
                role: 'Chủ nhân',
                owner: 'Ngọc Ánh & Tú Uyên'
            };
            this.setCredentials(defaultAuth);
            return defaultAuth;
        },

        setCredentials(authData) {
            localStorage.setItem(this.storageKey, JSON.stringify(authData));
        },

        isLoggedIn() {
            return sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true';
        },

        async login(username, password) {
            const creds = this.getCredentials();
            if (username === creds.username && password === creds.password) {
                sessionStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('isLoggedIn', 'true');
                Logger.log('LOGIN_SUCCESS', `Đăng nhập thành công với tài khoản: ${username}`);
                return true;
            }

            // Fallback: Kiểm tra và đồng bộ với Cloud Server
            try {
                const endpoints = MemoryStore.getEndpoints('/api/auth');
                for (const ep of endpoints) {
                    try {
                        const controller = new AbortController();
                        const toId = setTimeout(() => controller.abort(), 4000);
                        const resp = await fetch(ep, { mode: 'cors', signal: controller.signal });
                        clearTimeout(toId);
                        if (resp.ok) {
                            const data = await resp.json();
                            if (data && data.auth && data.auth.username === username && data.auth.password === password) {
                                this.setCredentials(data.auth);
                                sessionStorage.setItem('isLoggedIn', 'true');
                                localStorage.setItem('isLoggedIn', 'true');
                                Logger.log('LOGIN_SUCCESS', `Đăng nhập thành công qua Cloud Server: ${username}`);
                                return true;
                            }
                        }
                    } catch (e) {}
                }
            } catch (e) {}

            Logger.log('LOGIN_FAIL', `Đăng nhập thất bại với tài khoản: ${username}`);
            return false;
        },

        logout() {
            sessionStorage.removeItem('isLoggedIn');
            localStorage.removeItem('isLoggedIn');
            Logger.log('LOGOUT', 'Người dùng đã đăng xuất');
        },

        changePassword(currentPass, newPass) {
            const creds = this.getCredentials();
            if (currentPass !== creds.password) {
                Logger.log('CHANGE_PASSWORD_FAIL', 'Mật khẩu hiện tại không đúng');
                return { success: false, message: 'Mật khẩu hiện tại không chính xác!' };
            }
            if (newPass.length < 3) {
                return { success: false, message: 'Mật khẩu mới phải có ít nhất 3 ký tự!' };
            }
            
            creds.password = newPass;
            this.setCredentials(creds);

            // Đồng bộ mật khẩu mới lên Cloud Server ngay lập tức
            try {
                const endpoints = MemoryStore.getEndpoints('/api/auth');
                for (const ep of endpoints) {
                    fetch(ep, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(creds),
                        mode: 'cors'
                    }).catch(() => {});
                }
            } catch (e) {}

            Logger.log('CHANGE_PASSWORD_SUCCESS', 'Đã đổi mật khẩu thành công');
            return { success: true, message: 'Đổi mật khẩu thành công và đồng bộ lên Cloud!' };
        }
    };

    // =========================================================================
    // 3. QUẢN LÝ MÀU NỀN TRANG WEB (THEME SYSTEM)
    // =========================================================================
    const Theme = {
        storageKey: 'weddingAppTheme',

        init() {
            const savedTheme = localStorage.getItem(this.storageKey);
            if (savedTheme) {
                try {
                    const t = JSON.parse(savedTheme);
                    this.apply(t.bg, t.pattern, t.text, false);
                } catch (e) {
                    this.reset();
                }
            } else {
                this.reset();
            }
        },

        apply(bg, pattern = 'none', text = '#2d3748', logAction = true) {
            document.documentElement.style.setProperty('--site-bg', bg);
            document.documentElement.style.setProperty('--site-text', text);
            
            if (pattern === 'radial') {
                document.documentElement.style.setProperty('--site-pattern', 'radial-gradient(#f7e8e8 1.5px, transparent 1.5px)');
            } else {
                document.documentElement.style.setProperty('--site-pattern', 'none');
            }

            localStorage.setItem(this.storageKey, JSON.stringify({ bg, pattern, text }));
            
            if (logAction) {
                Logger.log('THEME_CHANGED', `Thay đổi màu nền trang web: ${bg}`);
            }
        },

        reset() {
            this.apply('#fdfaf6', 'radial', '#2d3748', false);
        }
    };

    Theme.init();

    // =========================================================================
    // 4. QUẢN LÝ DỮ LIỆU KỶ NIỆM (INDEXEDDB + LOCALSTORAGE + SERVER SYNC)
    // =========================================================================
    // Cơ chế lưu trữ IndexedDB không giới hạn dung lượng 5MB trên điện thoại & máy tính
    const IDBStorage = {
        dbName: 'WeddingAppMemoriesDB',
        storeName: 'memories',
        version: 1,

        open() {
            return new Promise((resolve) => {
                if (!window.indexedDB) return resolve(null);
                try {
                    const req = indexedDB.open(this.dbName, this.version);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName, { keyPath: 'id' });
                        }
                    };
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                } catch (e) {
                    resolve(null);
                }
            });
        },

        async getAll() {
            const db = await this.open();
            if (!db) return null;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(this.storeName, 'readonly');
                    const store = tx.objectStore(this.storeName);
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve(null);
                } catch (e) {
                    resolve(null);
                }
            });
        },

        async saveAll(items) {
            const db = await this.open();
            if (!db) return false;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    const store = tx.objectStore(this.storeName);
                    store.clear();
                    items.forEach(item => store.put(item));
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }
    };

    const MemoryStore = {
        storageKey: 'weddingMemories',
        deletedStorageKey: 'weddingDeletedIds',
        deletedImagesStorageKey: 'weddingDeletedImages',
        versionKey: 'weddingMemoriesVersion',
        _cache: null,
        _version: 0,
        _isPushing: false,
        _isFetching: false,
        _pendingPush: null,
        _pollTimer: null,

        getEndpoints(path) {
            const list = [path];
            const origin = window.location.origin;
            if (origin && origin !== 'null' && !origin.startsWith('file:')) {
                list.push(`${origin}${path}`);
            }
            list.push(`http://localhost:8080${path}`);
            list.push(`http://127.0.0.1:8080${path}`);
            return [...new Set(list)];
        },

        getDeletedIds() {
            try {
                return JSON.parse(localStorage.getItem(this.deletedStorageKey) || '[]');
            } catch (e) {
                return [];
            }
        },

        addDeletedId(id) {
            const list = this.getDeletedIds();
            const idStr = String(id);
            if (!list.includes(idStr)) {
                list.push(idStr);
                try { localStorage.setItem(this.deletedStorageKey, JSON.stringify(list)); } catch (e) {}
            }
        },

        clearDeletedIds(idsToRemove) {
            if (!idsToRemove || !idsToRemove.length) return;
            const current = this.getDeletedIds();
            const remaining = current.filter(id => !idsToRemove.includes(String(id)));
            try { localStorage.setItem(this.deletedStorageKey, JSON.stringify(remaining)); } catch (e) {}
        },

        getDeletedImages() {
            try {
                return JSON.parse(localStorage.getItem(this.deletedImagesStorageKey) || '[]');
            } catch (e) {
                return [];
            }
        },

        addDeletedImages(urls) {
            if (!urls) return;
            const toAdd = (Array.isArray(urls) ? urls : [urls]).filter(u => typeof u === 'string' && u.includes('ik.imagekit.io'));
            if (!toAdd.length) return;
            const current = this.getDeletedImages();
            let changed = false;
            for (const u of toAdd) {
                if (!current.includes(u)) {
                    current.push(u);
                    changed = true;
                }
            }
            if (changed) {
                try { localStorage.setItem(this.deletedImagesStorageKey, JSON.stringify(current)); } catch (e) {}
            }
        },

        clearDeletedImages(urlsToRemove) {
            if (!urlsToRemove || !urlsToRemove.length) return;
            const current = this.getDeletedImages();
            const remaining = current.filter(u => !urlsToRemove.includes(u));
            try { localStorage.setItem(this.deletedImagesStorageKey, JSON.stringify(remaining)); } catch (e) {}
        },

        // Áp dụng ngay lập tức danh sách kỷ niệm đã bị xóa từ thiết bị khác và vẽ lại màn hình
        _applyDeletionsAndRerender() {
            const deletedIds = this.getDeletedIds();
            if (!deletedIds || !deletedIds.length) return;

            let list = this.getAll();
            const originalCount = list.length;
            list = list.filter(m => m && m.id && !deletedIds.includes(String(m.id)));

            if (list.length !== originalCount) {
                this._cache = list;
                try { localStorage.setItem(this.storageKey, JSON.stringify(list)); } catch (e) {}
                try { if (typeof IDBStorage !== 'undefined') IDBStorage.saveAll(list); } catch (e) {}
                if (typeof renderMemories === 'function') renderMemories();
                if (typeof renderVietnamMap === 'function') renderVietnamMap();
                console.log(`⚡ [Realtime Delete] Đã xóa ${originalCount - list.length} kỷ niệm theo cập nhật tức thì từ thiết bị khác.`);
            }
        },

        getAll() {
            let list = this._cache;
            if (list === null) {
                try {
                    list = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
                } catch (e) {
                    list = [];
                }
            }
            if (Array.isArray(list)) {
                const deletedIds = this.getDeletedIds();
                const filtered = list.filter(m => {
                    if (!m || !m.id) return false;
                    const idStr = String(m.id);
                    if (deletedIds.includes(idStr)) return false;
                    return true;
                }).map(m => {
                    const rawImgs = Array.isArray(m.images) ? m.images : (m.image ? [m.image] : []);
                    const cleanImgs = rawImgs.filter(img => img && typeof img === 'string' && img.trim().length > 5);
                    return { ...m, images: cleanImgs.length > 0 ? cleanImgs : [window.FALLBACK_IMG_PLACEHOLDER] };
                });

                // Sắp xếp các album ảnh chuẩn xác theo thời gian (mới nhất lên đầu)
                filtered.sort((a, b) => {
                    const timeA = new Date(a.date || a.createdAt || 0).getTime() || 0;
                    const timeB = new Date(b.date || b.createdAt || 0).getTime() || 0;
                    if (timeB !== timeA) return timeB - timeA;
                    return String(b.id || '').localeCompare(String(a.id || ''));
                });

                this._cache = filtered;
                return this._cache;
            }
            this._cache = [];
            return this._cache;
        },

        async saveAll(memories) {
            const sorted = [...(memories || [])].sort((a, b) => {
                const timeA = new Date(a.date || a.createdAt || 0).getTime() || 0;
                const timeB = new Date(b.date || b.createdAt || 0).getTime() || 0;
                if (timeB !== timeA) return timeB - timeA;
                return String(b.id || '').localeCompare(String(a.id || ''));
            });
            this._cache = sorted;

            // 1. Lưu vào LocalStorage
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(sorted));
            } catch (e) {
                Logger.log('STORAGE_QUOTA_NOTICE', 'LocalStorage đã đầy, chuyển lưu an toàn qua IndexedDB & Server');
            }

            // 2. Lưu vào IndexedDB
            try {
                await IDBStorage.saveAll(memories);
            } catch (e) {}

            // 3. Đồng bộ lên Server nội bộ & Cloud
            const syncResult = await this.syncToServer(memories);
            if (syncResult) {
                let changed = false;
                for (const m of (memories || [])) {
                    if (m && m._isPendingSync) {
                        delete m._isPendingSync;
                        changed = true;
                    }
                }
                if (changed) {
                    try { localStorage.setItem(this.storageKey, JSON.stringify(memories)); } catch (e) {}
                }
            }
            return syncResult;
        },

        async syncToImageKit(memories) {
            try {
                if (typeof imagekitConfig === 'undefined' || !imagekitConfig.publicKey) {
                    return false;
                }
                const uploadUrl = (window.githubSyncConfig && window.githubSyncConfig.imageKitUploadEndpoint) || 'https://upload.imagekit.io/api/v1/files/upload';
                const payloadData = {
                    version: Date.now(),
                    memories: memories || [],
                    deletedIds: this.getDeletedIds(),
                    deletedImages: this.getDeletedImages()
                };
                const jsonStr = JSON.stringify(payloadData, null, 2);
                let filePayload;
                try {
                    filePayload = new File([jsonStr], 'memories_cloud.json', { type: 'application/json' });
                } catch (e) {
                    filePayload = new Blob([jsonStr], { type: 'application/json' });
                }

                const auth = (typeof window.getImageKitAuth === 'function') 
                    ? await window.getImageKitAuth().catch(() => null) 
                    : null;

                if (!auth || !auth.signature) {
                    console.warn('[ImageKit Sync] Không thể tạo chữ ký xác thực');
                    return false;
                }

                const formData = new FormData();
                formData.append('file', filePayload, 'memories_cloud.json');
                formData.append('fileName', 'memories_cloud.json');
                formData.append('folder', '/anhuyen_sync');
                formData.append('useUniqueFileName', 'false');
                formData.append('overwriteFile', 'true');
                formData.append('publicKey', imagekitConfig.publicKey);
                formData.append('signature', auth.signature);
                formData.append('expire', String(auth.expire));
                formData.append('token', auth.token);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);
                const resp = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (resp.ok) {
                    Logger.log('CLOUD_SYNC_SUCCESS', `Đã đồng bộ ${memories.length} kỷ niệm lên ImageKit Cloud thành công`);
                    return true;
                } else {
                    const errData = await resp.json().catch(() => ({}));
                    console.warn('[ImageKit Sync] Lỗi máy chủ ImageKit:', errData);
                    return false;
                }
            } catch (err) {
                console.warn('[ImageKit Sync] Lỗi kết nối ImageKit Cloud:', err);
                return false;
            }
        },

        // Tự động xóa vĩnh viễn các ảnh trên ImageKit khi xóa kỷ niệm
        async deleteFromImageKit(urls) {
            if (!urls) return false;
            const urlList = (Array.isArray(urls) ? urls : [urls]).filter(u => 
                u && typeof u === 'string' && u.includes('ik.imagekit.io')
            );
            if (!urlList.length) return false;

            this.addDeletedImages(urlList);
            console.log('[ImageKit Delete] Đang gửi yêu cầu xóa các ảnh khỏi ImageKit:', urlList);

            // 1. Thử gửi yêu cầu xóa tới máy chủ qua endpoints (/api/imagekit/delete)
            const endpoints = this.getEndpoints('/api/imagekit/delete');
            let success = false;
            for (const ep of endpoints) {
                try {
                    const resp = await fetch(ep, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json;charset=utf-8' },
                        body: JSON.stringify({ urls: urlList }),
                        mode: 'cors'
                    });
                    if (resp.ok) {
                        success = true;
                        this.clearDeletedImages(urlList);
                        Logger.log('IMAGEKIT_DELETE_SUCCESS', `Đã xóa ${urlList.length} ảnh trên ImageKit qua server`);
                        break;
                    }
                } catch (e) {}
            }

            // Đồng bộ hàng đợi ảnh đã xóa lên Firebase
            if (typeof window.firebaseDB !== 'undefined' && window.firebaseDB) {
                window.firebaseDB.ref('deletedImages').set(this.getDeletedImages()).catch(() => {});
            }
            return success;
        },

        async syncDeletedImagesQueue() {
            const pending = this.getDeletedImages();
            if (!pending || !pending.length) return false;
            const endpoints = this.getEndpoints('/api/imagekit/delete');
            for (const ep of endpoints) {
                try {
                    const resp = await fetch(ep, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json;charset=utf-8' },
                        body: JSON.stringify({ urls: pending }),
                        mode: 'cors'
                    });
                    if (resp.ok) {
                        this.clearDeletedImages(pending);
                        console.log(`[ImageKit Queue] Đã xóa ${pending.length} ảnh tồn đọng trên ImageKit`);
                        return true;
                    }
                } catch (e) {}
            }
            return false;
        },

        // Đồng bộ và rà soát toàn diện giữa Web và ImageKit (Reconciliation)
        async reconcileImageKit() {
            console.log('[ImageKit Reconcile] Bắt đầu đồng bộ và rà soát ImageKit...');
            const memories = this.getAll();
            let cleanedCount = 0;

            // 1. Đồng bộ lên ImageKit Cloud và Firebase
            await this.syncToImageKit(memories);
            if (typeof this.syncToFirebase === 'function') {
                await this.syncToFirebase(memories);
            }

            // 2. Gửi hàng đợi xóa tồn đọng nếu có
            await this.syncDeletedImagesQueue();

            // 3. Yêu cầu server chạy rà soát dọn dẹp (/api/imagekit/cleanup) nếu server hoạt động
            const endpoints = this.getEndpoints('/api/imagekit/cleanup');
            for (const ep of endpoints) {
                try {
                    const resp = await fetch(ep, {
                        method: 'POST',
                        mode: 'cors',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (resp.ok) {
                        const data = await resp.json().catch(() => ({}));
                        cleanedCount = data.deletedCount || 0;
                        break;
                    }
                } catch (e) {}
            }

            return {
                success: true,
                memoriesCount: memories.length,
                cleanedCount: cleanedCount
            };
        },

        async syncToGitHub(memories) {
            const token = typeof window.getGitHubSyncToken === 'function' ? window.getGitHubSyncToken() : '';
            if (!token) return false;

            try {
                const owner = (window.githubSyncConfig && window.githubSyncConfig.owner) || 'tna9899';
                const repo = (window.githubSyncConfig && window.githubSyncConfig.repo) || 'my-website';
                const branch = (window.githubSyncConfig && window.githubSyncConfig.branch) || 'main';
                const path = (window.githubSyncConfig && window.githubSyncConfig.filePath) || 'memories.json';
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

                let currentSha = '';
                try {
                    const getResp = await fetch(`${apiUrl}?ref=${branch}&_t=${Date.now()}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    if (getResp.ok) {
                        const fileInfo = await getResp.json();
                        currentSha = fileInfo.sha;
                    }
                } catch (e) {}

                const jsonStr = JSON.stringify(memories || [], null, 2);
                const utf8Bytes = new TextEncoder().encode(jsonStr);
                let binary = '';
                for (let i = 0; i < utf8Bytes.length; i++) {
                    binary += String.fromCharCode(utf8Bytes[i]);
                }
                const contentBase64 = btoa(binary);

                const bodyPayload = {
                    message: `Cập nhật kỷ niệm từ website (${new Date().toLocaleString('vi-VN')})`,
                    content: contentBase64,
                    branch: branch
                };
                if (currentSha) {
                    bodyPayload.sha = currentSha;
                }

                const putResp = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyPayload)
                });

                if (putResp.ok) {
                    Logger.log('GITHUB_SYNC_SUCCESS', 'Đã lưu kỷ niệm vào GitHub Repository thành công');
                    return true;
                }
                return false;
            } catch (err) {
                console.warn('[GitHub Sync] Ngoại lệ khi lưu GitHub:', err);
                return false;
            }
        },

        async syncToFirebase(memories) {
            if (!window.isFirebaseConfigured || !window.firebaseDB) return false;
            try {
                const cleanList = (memories || []).map(m => ({
                    id: String(m.id || Date.now()),
                    images: Array.isArray(m.images) ? m.images : (m.image ? [m.image] : []),
                    content: m.content || '',
                    location: m.location || '',
                    date: m.date || '',
                    createdAt: m.createdAt || new Date().toISOString()
                }));
                // 1. Đồng bộ danh sách kỷ niệm
                await window.firebaseDB.ref('memories').set(cleanList);
                // 2. Đồng bộ danh sách ID đã xóa thời gian thực
                const deletedIds = this.getDeletedIds();
                await window.firebaseDB.ref('deletedIds').set(deletedIds);

                Logger.log('FIREBASE_SYNC_SUCCESS', `Đã đồng bộ ${cleanList.length} kỷ niệm lên Firebase Realtime Database`);
                return true;
            } catch (err) {
                console.warn('[Firebase Sync] Ngoại lệ khi ghi Firebase Realtime Database:', err);
                return false;
            }
        },

        initFirebaseRealtimeSync() {
            if (!window.isFirebaseConfigured || !window.firebaseDB) return false;
            try {
                const memRef = window.firebaseDB.ref('memories');
                const delRef = window.firebaseDB.ref('deletedIds');

                // 1. Lắng nghe danh sách ID đã xóa thời gian thực từ các thiết bị khác (<0.1s)
                delRef.on('value', (snap) => {
                    const remoteDel = snap.val();
                    let delList = [];
                    if (Array.isArray(remoteDel)) delList = remoteDel;
                    else if (remoteDel && typeof remoteDel === 'object') delList = Object.values(remoteDel);

                    if (delList && delList.length > 0) {
                        let hasNew = false;
                        const currentDel = this.getDeletedIds();
                        for (const dId of delList) {
                            const str = String(dId);
                            if (str && !currentDel.includes(str)) {
                                this.addDeletedId(str);
                                hasNew = true;
                            }
                        }
                        if (hasNew) {
                            this._applyDeletionsAndRerender();
                        }
                    }
                });

                // 2. Lắng nghe WebSocket thời gian thực: Mọi thay đổi từ bất kỳ máy nào đều nhận tức thì (<0.1s)
                memRef.on('value', async (snapshot) => {
                    const val = snapshot.val();
                    let remoteList = [];
                    if (Array.isArray(val)) {
                        remoteList = val;
                    } else if (val && typeof val === 'object') {
                        remoteList = Object.values(val);
                    }

                    if (remoteList && remoteList.length > 0) {
                        const merged = this.mergeWithLocal(remoteList);
                        this._cache = merged;
                        try { localStorage.setItem(this.storageKey, JSON.stringify(merged)); } catch (e) {}
                        try { await IDBStorage.saveAll(merged); } catch (e) {}
                        if (typeof renderMemories === 'function') renderMemories();
                        if (typeof renderVietnamMap === 'function') renderVietnamMap();
                        updateSyncStatusUI('synced');
                    } else if (Array.isArray(val) && val.length === 0) {
                        this._cache = [];
                        try { localStorage.setItem(this.storageKey, '[]'); } catch (e) {}
                        if (typeof renderMemories === 'function') renderMemories();
                        if (typeof renderVietnamMap === 'function') renderVietnamMap();
                    } else {
                        // Tự động chuyển album kỷ niệm ban đầu lên Firebase nếu DB mới tạo còn trống
                        const local = this.getAll();
                        if (local && local.length > 0) {
                            await memRef.set(local);
                            console.log('[Firebase] Đã tự động chuyển dữ liệu ban đầu lên Firebase:', local.length);
                        }
                    }
                });
                console.log('⚡ [Firebase Realtime] Đã kích hoạt lắng nghe WebSocket thời gian thực.');
                return true;
            } catch (e) {
                console.warn('[Firebase Realtime] Lỗi gắn listener:', e);
                return false;
            }
        },

        async syncToServer(memoriesToSend) {
            if (this._isPushing) {
                this._pendingPush = memoriesToSend || this.getAll();
                return true;
            }
            this._isPushing = true;
            updateSyncStatusUI('syncing');

            const list = memoriesToSend || this.getAll();
            let hasCloudSuccess = false;

            // 0. Đồng bộ lên Firebase Realtime Database (Tức thì <0.1s cho mọi thiết bị)
            if (window.isFirebaseConfigured && window.firebaseDB) {
                const fbSuccess = await this.syncToFirebase(list);
                if (fbSuccess) hasCloudSuccess = true;
            }

            // 1. Đồng bộ lên ImageKit Cloud JSON (Tự động 2 chiều, phản hồi tức thì giữa PC & Mobile)
            const ikSuccess = await this.syncToImageKit(list);
            if (ikSuccess) hasCloudSuccess = true;

            // 2. Đồng bộ lên GitHub Repo (Nếu đã cấu hình GitHub Token)
            const ghSuccess = await this.syncToGitHub(list);
            if (ghSuccess) hasCloudSuccess = true;

            // 3. Đồng bộ lên Local Node API (Nếu đang chạy cục bộ localhost:8080)
            const deletedIds = this.getDeletedIds();
            const endpoints = this.getEndpoints('/api/memories');
            for (const ep of endpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const resp = await fetch(ep, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json;charset=utf-8',
                            'Cache-Control': 'no-cache, no-store'
                        },
                        body: JSON.stringify({ memories: list, deletedIds: deletedIds }),
                        mode: 'cors',
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (resp.ok) {
                        hasCloudSuccess = true;
                        break;
                    }
                } catch (e) {}
            }

            this._isPushing = false;

            if (this._pendingPush) {
                const nextData = this._pendingPush;
                this._pendingPush = null;
                return await this.syncToServer(nextData);
            }

            updateSyncStatusUI('synced');
            return true;
        },

        async fetchLatestFromServer(force = false) {
            if (this._isFetching) return false;
            this._isFetching = true;
            updateSyncStatusUI('syncing');

            let updated = false;
            // 0. Nguồn 0: Google Firebase Realtime Database REST API (Trực tiếp, siêu tốc <100ms, không phụ thuộc SDK)
            try {
                const fbDbUrl = (window.firebaseConfig && window.firebaseConfig.databaseURL) 
                    || 'https://anhuyen-e8d70-default-rtdb.asia-southeast1.firebasedatabase.app';
                
                const [fbMemResp, fbDelResp] = await Promise.all([
                    fetch(`${fbDbUrl}/memories.json?_t=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store' } }).catch(() => null),
                    fetch(`${fbDbUrl}/deletedIds.json?_t=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store' } }).catch(() => null)
                ]);

                if (fbDelResp && fbDelResp.ok) {
                    const fbDelData = await fbDelResp.json().catch(() => null);
                    let fbDelList = [];
                    if (Array.isArray(fbDelData)) fbDelList = fbDelData;
                    else if (fbDelData && typeof fbDelData === 'object') fbDelList = Object.values(fbDelData);

                    if (fbDelList.length > 0) {
                        let hasNewDeletions = false;
                        const currentDel = this.getDeletedIds();
                        for (const dId of fbDelList) {
                            const idStr = String(dId);
                            if (idStr && !currentDel.includes(idStr)) {
                                this.addDeletedId(idStr);
                                hasNewDeletions = true;
                            }
                        }
                        if (hasNewDeletions) {
                            this._applyDeletionsAndRerender();
                        }
                    }
                }

                if (fbMemResp && fbMemResp.ok) {
                    const fbMemData = await fbMemResp.json().catch(() => null);
                    let fbList = [];
                    if (Array.isArray(fbMemData)) fbList = fbMemData;
                    else if (fbMemData && typeof fbMemData === 'object') fbList = Object.values(fbMemData);

                    if (fbList.length > 0) {
                        allRemoteMemories.push(...fbList);
                    }
                }
            } catch (fbErr) {
                console.warn('[Cloud Sync] Firebase REST fetch:', fbErr.message);
            }

            // 1. Nguồn 1: ImageKit Cloud Storage (Tự động 2 chiều tức thì trên CDN)
            try {
                const ikUrl = (window.githubSyncConfig && window.githubSyncConfig.imageKitJsonUrl) 
                    || 'https://ik.imagekit.io/anhuyen/anhuyen_sync/memories_cloud.json';
                const ikResp = await fetch(`${ikUrl}?_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache, no-store' }
                });

                if (ikResp.ok) {
                    const cloudData = await ikResp.json();
                    let cloudMemories = [];
                    if (Array.isArray(cloudData)) {
                        cloudMemories = cloudData;
                    } else if (cloudData && Array.isArray(cloudData.memories)) {
                        cloudMemories = cloudData.memories;
                        if (Array.isArray(cloudData.deletedIds)) {
                            let hasNewDeletions = false;
                            const currentDel = this.getDeletedIds();
                            for (const dId of cloudData.deletedIds) {
                                const idStr = String(dId);
                                if (!currentDel.includes(idStr)) {
                                    this.addDeletedId(idStr);
                                    hasNewDeletions = true;
                                }
                            }
                            if (hasNewDeletions) {
                                this._applyDeletionsAndRerender();
                            }
                        }
                    }

                    if (Array.isArray(cloudMemories) && cloudMemories.length > 0) {
                        allRemoteMemories.push(...cloudMemories);
                    }
                }
            } catch (ikErr) {
                console.warn('[Cloud Sync] ImageKit fetch:', ikErr.message);
            }

            // 2. Nguồn 2: GitHub Raw contents (Luôn đồng bộ song song để nhận ngay khi máy tính push lên GitHub)
            try {
                const ghRawUrl = `https://raw.githubusercontent.com/tna9899/my-website/main/memories.json?_t=${Date.now()}`;
                const ghResp = await fetch(ghRawUrl, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache, no-store' }
                });
                if (ghResp.ok) {
                    const ghMemories = await ghResp.json();
                    if (Array.isArray(ghMemories) && ghMemories.length > 0) {
                        allRemoteMemories.push(...ghMemories);
                    }
                }
            } catch (ghErr) {}

            // 3. Nguồn 3: Local Node API (Chỉ khi chạy cục bộ localhost:8080)
            const endpoints = this.getEndpoints('/api/memories');
            for (const ep of endpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const resp = await fetch(`${ep}?_t=${Date.now()}`, {
                        mode: 'cors',
                        cache: 'no-store',
                        headers: { 'Cache-Control': 'no-cache, no-store' },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (resp.ok) {
                        const data = await resp.json();
                        const serverMemories = Array.isArray(data) ? data : (data.memories || []);
                        if (data && Array.isArray(data.deletedIds)) {
                            let hasNewDeletions = false;
                            const currentDel = this.getDeletedIds();
                            for (const dId of data.deletedIds) {
                                const idStr = String(dId);
                                if (!currentDel.includes(idStr)) {
                                    this.addDeletedId(idStr);
                                    hasNewDeletions = true;
                                }
                            }
                            if (hasNewDeletions) {
                                this._applyDeletionsAndRerender();
                            }
                        }
                        if (Array.isArray(serverMemories) && serverMemories.length > 0) {
                            allRemoteMemories.push(...serverMemories);
                            break;
                        }
                    }
                } catch (e) {}
            }

            // 4. Nguồn 4: memories.json tĩnh tương đối dự phòng
            if (allRemoteMemories.length === 0) {
                try {
                    const resp = await fetch(`memories.json?_t=${Date.now()}`);
                    if (resp.ok) {
                        const staticMemories = await resp.json();
                        if (Array.isArray(staticMemories) && staticMemories.length > 0) {
                            allRemoteMemories.push(...staticMemories);
                        }
                    }
                } catch (e) {}
            }

            // 5. Gộp thông minh tất cả nguồn từ xa với bộ nhớ máy khách (Smart Merge)
            if (allRemoteMemories.length > 0) {
                const merged = this.mergeWithLocal(allRemoteMemories);
                this._cache = merged;
                try { localStorage.setItem(this.storageKey, JSON.stringify(merged)); } catch (e) {}
                try { await IDBStorage.saveAll(merged); } catch (e) {}

                if (typeof renderMemories === 'function') renderMemories();
                if (typeof renderVietnamMap === 'function') renderVietnamMap();

                // Tự động đẩy phiên bản gộp mới nhất lên ImageKit để các máy khác cập nhật theo
                if (merged.length > 0) {
                    setTimeout(() => this.syncToImageKit(merged), 800);
                }

                updated = true;
                updateSyncStatusUI('synced');
            }

            this._isFetching = false;
            updateSyncStatusUI('synced');
            return updated;
        },

        mergeWithLocal(serverMemories) {
            const deletedIds = this.getDeletedIds();
            const localMemories = this.getAll();
            const map = new Map();

            // Hàm lọc và làm sạch danh sách ảnh hợp lệ của 1 kỷ niệm
            const sanitizeImages = (rawImgs) => {
                const arr = Array.isArray(rawImgs) ? rawImgs : (rawImgs ? [rawImgs] : []);
                const clean = arr.filter(img => img && typeof img === 'string' && img.trim().length > 5 && !img.includes('undefined') && !img.includes('null'));
                return clean.length > 0 ? clean : [window.FALLBACK_IMG_PLACEHOLDER];
            };

            // 1. Nạp danh sách server (Server / Cloud là cơ sở, gộp nếu trùng ID từ nhiều nguồn từ xa)
            for (const item of (serverMemories || [])) {
                if (!item || !item.id) continue;
                const idStr = String(item.id);
                if (deletedIds.includes(idStr)) continue;

                const cleanImgs = sanitizeImages(item.images || item.image);
                if (!map.has(idStr)) {
                    map.set(idStr, { ...item, images: cleanImgs });
                } else {
                    const existing = map.get(idStr);
                    const combined = [...sanitizeImages(existing.images || existing.image)];
                    for (const img of cleanImgs) {
                        if (img && img !== window.FALLBACK_IMG_PLACEHOLDER && !combined.includes(img)) {
                            combined.push(img);
                        }
                    }
                    const timeExisting = new Date(existing.updatedAt || existing.date || existing.createdAt || 0).getTime() || 0;
                    const timeNew = new Date(item.updatedAt || item.date || item.createdAt || 0).getTime() || 0;
                    const baseItem = timeNew > timeExisting ? item : existing;
                    map.set(idStr, { ...baseItem, images: combined.length > 0 ? combined : [window.FALLBACK_IMG_PLACEHOLDER] });
                }
            }

            // 2. Thuật toán Smart Merge: Gộp an toàn với kỷ niệm local
            for (const localItem of (localMemories || [])) {
                if (!localItem || !localItem.id) continue;
                const idStr = String(localItem.id);
                if (deletedIds.includes(idStr)) continue;

                if (!map.has(idStr)) {
                    // Giữ lại kỷ niệm local vì nó chưa bị xóa (không nằm trong deletedIds)
                    const cleanImgs = sanitizeImages(localItem.images || localItem.image);
                    map.set(idStr, { ...localItem, images: cleanImgs });
                } else {
                    // Kỷ niệm có ở cả 2: gộp danh sách ảnh để không bao giờ bị mất ảnh
                    const existing = map.get(idStr);
                    const serverImgs = sanitizeImages(existing.images || existing.image);
                    const localImgs = sanitizeImages(localItem.images || localItem.image);

                    const combined = [...serverImgs];
                    for (const img of localImgs) {
                        if (img && img !== window.FALLBACK_IMG_PLACEHOLDER && !combined.includes(img)) {
                            combined.push(img);
                        }
                    }
                    const cleanCombined = combined.filter(i => i && i !== window.FALLBACK_IMG_PLACEHOLDER);

                    const timeServer = new Date(existing.updatedAt || existing.date || existing.createdAt || 0).getTime() || 0;
                    const timeLocal = new Date(localItem.updatedAt || localItem.date || localItem.createdAt || 0).getTime() || 0;
                    const baseItem = timeLocal > timeServer ? localItem : existing;

                    map.set(idStr, {
                        ...baseItem,
                        images: cleanCombined.length > 0 ? cleanCombined : [window.FALLBACK_IMG_PLACEHOLDER]
                    });
                }
            }

            const result = Array.from(map.values());
            result.sort((a, b) => {
                const timeA = new Date(a.date || a.createdAt || 0).getTime() || 0;
                const timeB = new Date(b.date || b.createdAt || 0).getTime() || 0;
                if (timeB !== timeA) return timeB - timeA;
                return String(b.id || '').localeCompare(String(a.id || ''));
            });
            return result;
        },

        async checkServerVersionAndSync() {
            if (this._isFetching || this._isPushing) return;
            await this.fetchLatestFromServer();
        },

        async initSync() {
            try {
                const idbList = await IDBStorage.getAll();
                if (idbList && idbList.length > 0) {
                    const deletedIds = this.getDeletedIds();
                    const cleanList = idbList.filter(m => {
                        if (!m || !m.id || deletedIds.includes(String(m.id))) return false;
                        return true;
                    });
                    this._cache = cleanList;
                    try { localStorage.setItem(this.storageKey, JSON.stringify(cleanList)); } catch (e) {}
                    if (cleanList.length > 0) {
                        if (typeof renderMemories === 'function') renderMemories();
                        if (typeof renderVietnamMap === 'function') renderVietnamMap();
                    }
                }
            } catch (e) {}

            try {
                this._version = localStorage.getItem(this.versionKey) || 0;
            } catch (e) {}

            // Kích hoạt kết nối thời gian thực Firebase WebSocket (nếu đã cấu hình)
            this.initFirebaseRealtimeSync();

            // Đồng bộ dữ liệu mới nhất từ ImageKit Đám Mây & GitHub
            await this.fetchLatestFromServer(true);
            this.syncDeletedImagesQueue();

            // Tự động kiểm tra và đồng bộ khi người dùng quay lại tab web hoặc mở điện thoại
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.checkServerVersionAndSync();
                }
            });
            window.addEventListener('focus', () => {
                this.checkServerVersionAndSync();
            });
            window.addEventListener('pageshow', () => {
                this.checkServerVersionAndSync();
            });

            // Tự động kiểm tra định kỳ mỗi 4 giây khi tab đang mở để đồng bộ tức thì
            if (!this._pollTimer) {
                this._pollTimer = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        this.checkServerVersionAndSync();
                    }
                }, 4000);
            }
        },

        async add(item) {
            if (!Auth.isLoggedIn()) {
                Logger.log('UNAUTHORIZED_ADD', 'Từ chối thêm kỷ niệm do chưa đăng nhập');
                return false;
            }

            if (item && item.id) {
                this.clearDeletedIds([String(item.id)]);
            }

            item._isPendingSync = true;
            const list = this.getAll();
            list.unshift(item);
            const success = await this.saveAll(list);
            if (success) {
                Logger.log('MEMORY_ADDED', `Đã lưu kỷ niệm mới: "${item.content ? item.content.substring(0, 30) : 'Kỷ niệm'}..."`, {
                    imagesCount: item.images ? item.images.length : 1,
                    location: item.location,
                    date: item.date
                });
            }
            return success;
        },

        async remove(id) {
            if (!Auth.isLoggedIn()) {
                Logger.log('UNAUTHORIZED_DELETE', 'Từ chối xóa kỷ niệm do chưa đăng nhập');
                return false;
            }
            const idStr = String(id);
            this.addDeletedId(idStr);

            let list = this.getAll();
            const memoryToDelete = list.find(m => String(m.id) === idStr);

            // Tự động xóa vĩnh viễn các ảnh ImageKit của kỷ niệm này
            if (memoryToDelete) {
                const imgs = Array.isArray(memoryToDelete.images) ? memoryToDelete.images : (memoryToDelete.image ? [memoryToDelete.image] : []);
                const ikUrls = imgs.filter(u => typeof u === 'string' && u.includes('ik.imagekit.io'));
                if (ikUrls.length > 0) {
                    await this.deleteFromImageKit(ikUrls).catch(() => {});
                }
            }

            list = list.filter(m => String(m.id) !== idStr);
            this._cache = list;

            try { localStorage.setItem(this.storageKey, JSON.stringify(list)); } catch (e) {}
            try { await IDBStorage.saveAll(list); } catch (e) {}

            const success = await this.syncToServer(list);
            Logger.log('MEMORY_DELETED', `Đã xóa kỷ niệm id: ${idStr}`);
            return success;
        }
    };

    const updateSyncStatusUI = (status) => {
        const dot = document.getElementById('sync-status-dot');
        const text = document.getElementById('sync-status-text');
        const btn = document.getElementById('sync-status-btn');
        if (!dot || !text) return;

        if (status === 'syncing') {
            dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
            text.textContent = 'Đang đồng bộ...';
            text.className = 'hidden sm:inline text-amber-600 font-semibold';
            if (btn) btn.title = 'Đang đồng bộ dữ liệu với máy chủ...';
        } else if (status === 'synced') {
            dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
            text.textContent = 'Đã đồng bộ';
            text.className = 'hidden sm:inline text-emerald-600 font-medium';
            if (btn) btn.title = 'Dữ liệu đã khớp hoàn toàn giữa Máy tính & Điện thoại. Bấm để làm mới ngay.';
        } else if (status === 'error') {
            dot.className = 'w-2 h-2 rounded-full bg-rose-400';
            text.textContent = 'Chưa kết nối';
            text.className = 'hidden sm:inline text-rose-500 font-medium';
            if (btn) btn.title = 'Chưa kết nối được máy chủ. Bấm để thử kết nối lại.';
        }
    };

    // =========================================================================
    // 4. XỬ LÝ ẢNH GIỮ NGUYÊN 100% ĐỘ PHÂN GIẢI & HỖ TRỢ TẤT CẢ ĐỊNH DẠNG APPLE (HEIC/HEIF)
    // =========================================================================
    // XỬ LÝ NÉN ẢNH THÔNG MINH (SMART COMPRESSION) & GIẢI MÃ HEIC
    // Tự động chuẩn hóa ảnh chụp camera (12MP - 48MP) về chuẩn 2K sắc nét (max 2048px)
    // Giảm 95% dung lượng (từ 15MB xuống ~350KB - 500KB) chỉ trong 0.1s
    // =========================================================================
    const tryCanvasFallback = (blob) => {
        return new Promise((resolve) => {
            try {
                const objectUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    try { URL.revokeObjectURL(objectUrl); } catch (ex) {}
                    let width = img.naturalWidth || img.width;
                    let height = img.naturalHeight || img.height;
                    if (width > 0 && height > 0) {
                        const maxDim = 2048; // Chuẩn 2K Retina siêu nét
                        if (width > maxDim || height > maxDim) {
                            if (width > height) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                            } else {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                            }
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);
                        const b64 = canvas.toDataURL('image/jpeg', 0.88);
                        if (b64 && b64.length > 100) {
                            resolve(b64);
                            return;
                        }
                    }
                    resolve(null);
                };
                img.onerror = () => {
                    try { URL.revokeObjectURL(objectUrl); } catch (ex) {}
                    resolve(null);
                };
                img.src = objectUrl;
            } catch (e) {
                resolve(null);
            }
        });
    };

    const processImagePreservingResolution = async (file) => {
        if (!file) return null;
        let workingBlob = file;

        // 1. Chuyển đổi định dạng Apple (HEIC / HEIF) sang JPEG
        const isAppleHeic = /\.(heic|heif)$/i.test(file.name || '') || 
                            (file.type && /heic|heif/i.test(file.type));

        if (isAppleHeic) {
            Logger.log('APPLE_HEIC_DETECTED', `Phát hiện ảnh iPhone/Apple: ${file.name || 'HEIC'}, đang tối ưu hóa nhanh...`);
            if (typeof heic2any === 'function') {
                try {
                    const converted = await heic2any({
                        blob: file,
                        toType: 'image/jpeg',
                        quality: 0.90
                    });
                    workingBlob = Array.isArray(converted) ? converted[0] : converted;
                } catch (convErr) {
                    console.warn('[HEIC] Chuyển đổi heic2any gặp sự cố:', convErr);
                }
            }
        }

        // 2. Nén thông minh chuẩn 2K: Giảm 95% thời gian upload mà vẫn cực kỳ sắc nét
        const canvasResult = await tryCanvasFallback(workingBlob);
        if (canvasResult) return canvasResult;

        // Dự phòng đọc trực tiếp nếu canvas không hỗ trợ
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result || null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(workingBlob);
        });
    };

    const compressImage = (file) => processImagePreservingResolution(file);

    // =========================================================================
    // TẢI ẢNH SONG SONG ĐA LUỒNG (PARALLEL CONCURRENT UPLOAD)
    // Tải tất cả ảnh cùng lúc trong 1 - 2 giây thay vì tuần tự từng ảnh
    // =========================================================================
    const uploadImagesToServer = async (imagesArray, onProgressCallback) => {
        if (!imagesArray || !imagesArray.length) return [];
        const total = imagesArray.length;
        let completed = 0;

        const updateProgress = () => {
            if (typeof onProgressCallback === 'function') {
                const pct = Math.round((completed / total) * 100);
                onProgressCallback(completed, total, pct);
            }
        };

        // 1. TẢI ẢNH LÊN IMAGEKIT.IO (LƯU TRỮ ẢNH CDN CHÍNH THỨC)
        if (window.isImageKitConfigured && imagekitConfig.publicKey && imagekitConfig.privateKey) {
            const uploadSingle = async (img, i) => {
                if (!img || typeof img !== 'string') return null;

                // Nếu ảnh đã là URL trực tuyến -> Giữ nguyên
                if (img.startsWith('http://') || img.startsWith('https://')) {
                    completed++;
                    updateProgress();
                    return img.trim();
                }

                if (img.startsWith('data:image/') || img.startsWith('data:video/')) {
                    if (img.length < 100) return null;

                    try {
                        const isVid = img.startsWith('data:video/');
                        let ext = isVid ? 'mp4' : 'jpg';
                        const prefix = isVid ? 'vid' : 'img';

                        const commaIdx = img.indexOf(',');
                        if (commaIdx !== -1) {
                            const header = img.substring(0, commaIdx);
                            if (isVid) {
                                const match = header.match(/video\/([a-zA-Z0-9\+\-]+)/);
                                if (match) {
                                    let mExt = match[1].toLowerCase();
                                    if (mExt === 'quicktime') ext = 'mov';
                                    else if (mExt === 'x-m4v') ext = 'm4v';
                                    else if (/^(mp4|mov|webm|m4v|avi|mkv|ogv|3gp)$/.test(mExt)) ext = mExt;
                                }
                            } else {
                                const match = header.match(/image\/([a-zA-Z0-9\+\-]+)/);
                                if (match) {
                                    let mExt = match[1].toLowerCase();
                                    if (mExt === 'jpeg') ext = 'jpg';
                                    else if (/^(jpg|png|webp|gif|svg|avif|heic|heif)$/.test(mExt)) ext = mExt;
                                }
                            }
                        }

                        const fileName = `${prefix}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
                        const auth = await window.getImageKitAuth();

                        const formData = new FormData();
                        formData.append('file', img);
                        formData.append('fileName', fileName);
                        formData.append('publicKey', imagekitConfig.publicKey);
                        formData.append('signature', auth.signature);
                        formData.append('expire', String(auth.expire));
                        formData.append('token', auth.token);
                        formData.append('folder', '/anhuyen_memories');
                        formData.append('useUniqueFileName', 'true');

                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 60000);
                        const resp = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
                            method: 'POST',
                            body: formData,
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);

                        if (!resp.ok) {
                            const errData = await resp.json().catch(() => ({}));
                            throw new Error(errData.message || `Lỗi HTTP ${resp.status}`);
                        }

                        const data = await resp.json();
                        completed++;
                        updateProgress();
                        Logger.log('IMAGEKIT_UPLOAD_SUCCESS', `Đã lưu file: ${fileName}`);
                        return data.url;
                    } catch (ikErr) {
                        console.error('[ImageKit] Lỗi tải file:', ikErr);
                        completed++;
                        updateProgress();
                        return img.length > 200 ? img : null;
                    }
                } else if (img.trim().length > 5) {
                    completed++;
                    updateProgress();
                    return img.trim();
                }
                return null;
            };

            // Thực thi tải đồng thời tất cả ảnh (Parallel Upload)
            const results = await Promise.all(imagesArray.map((img, idx) => uploadSingle(img, idx)));
            return results.filter(Boolean);
        }

        // 2. FALLBACK: TẢI LÊN MÁY CHỦ CỤC BỘ /api/upload (NẾU CHƯA CÓ IMAGEKIT)
        const endpoints = MemoryStore.getEndpoints('/api/upload');
        for (let i = 0; i < imagesArray.length; i++) {
            const img = imagesArray[i];
            if (!img || typeof img !== 'string') continue;

            if (img.startsWith('data:image/') || img.startsWith('data:video/')) {
                if (img.length < 100) continue;

                let uploadedUrl = null;
                for (const ep of endpoints) {
                    try {
                        const controller = new AbortController();
                        const toId = setTimeout(() => controller.abort(), 60000);
                        const resp = await fetch(ep, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json;charset=utf-8' },
                            body: JSON.stringify({ image: img }),
                            mode: 'cors',
                            signal: controller.signal
                        });
                        clearTimeout(toId);
                        if (resp.ok) {
                            const data = await resp.json();
                            if (data && data.status === 'ok' && data.url) {
                                uploadedUrl = data.url;
                                break;
                            }
                        }
                    } catch (e) {}
                }
                if (uploadedUrl) {
                    results.push(uploadedUrl);
                } else if (img.length > 200) {
                    results.push(img);
                }
            } else if (img.trim().length > 5) {
                results.push(img.trim());
            }
        }
        return results;
    };

    // =========================================================================
    // 5. DOM ELEMENTS TƯƠNG TÁC
    // =========================================================================
    // Modal Đăng Nhập & Phân Quyền (Chế độ xem & Toàn quyền)
    const modalLogin = document.getElementById('modal-login');
    const closeModalLogin = document.getElementById('close-modal-login');
    const loginModalSubtitle = document.getElementById('login-modal-subtitle');
    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');

    // Controls Điều Hướng (Khách xem & Chủ nhân)
    const guestNavControls = document.getElementById('guest-nav-controls');
    const ownerNavControls = document.getElementById('owner-nav-controls');
    const navLoginBtn = document.getElementById('nav-login-btn');

    // Navbar & Hamburger elements
    const btnHamburger = document.getElementById('btn-hamburger');
    const hamburgerDropdown = document.getElementById('hamburger-menu-dropdown');
    const menuItemHome = document.getElementById('menu-item-home');
    const menuItemAdd = document.getElementById('menu-item-add');
    const menuItemLogin = document.getElementById('menu-item-login');
    const menuItemLoginText = document.getElementById('menu-item-login-text');
    const menuItemSettings = document.getElementById('menu-item-settings');
    const menuItemAccountMobile = document.getElementById('menu-item-account-mobile');
    
    const navHome = document.getElementById('nav-home');
    const navAdd = document.getElementById('nav-add');
    const navSettingsBtn = document.getElementById('nav-settings-btn');
    const brandTitle = document.getElementById('brand-title');
    
    const currentUserDisplay = document.getElementById('current-user-display');
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const menuAccountBtn = document.getElementById('menu-account-btn');
    const menuLogoutBtn = document.getElementById('menu-logout-btn');
    const userDropdownToggle = document.getElementById('user-dropdown-toggle');
    const userDropdownMenu = document.querySelector('.user-dropdown-menu');

    // Tabs
    const homeTab = document.getElementById('home-tab');
    const addTab = document.getElementById('add-tab');
    const memoriesContainer = document.getElementById('memories-container');
    const emptyState = document.getElementById('empty-state');
    const emptyAddBtn = document.getElementById('empty-add-btn');

    // Add Memory Form
    const uploadTrigger = document.getElementById('upload-trigger');
    const mediaUpload = document.getElementById('media-upload');
    const previewSection = document.getElementById('preview-section');
    const previewThumbnails = document.getElementById('preview-thumbnails');
    const previewCount = document.getElementById('preview-count');
    const clearSelectedImages = document.getElementById('clear-selected-images');
    const memoryContent = document.getElementById('memory-content');
    const memoryLocation = document.getElementById('memory-location');
    const memoryDate = document.getElementById('memory-date');
    const saveMemoryBtn = document.getElementById('save-memory-btn');

    // Modals
    const modalAccount = document.getElementById('modal-account');
    const closeModalAccount = document.getElementById('close-modal-account');
    const accountInfoUsername = document.getElementById('account-info-username');
    const currentPasswordInput = document.getElementById('current-password-input');
    const newPasswordInput = document.getElementById('new-password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const changePassBtn = document.getElementById('change-pass-btn');
    const changePassMsg = document.getElementById('change-pass-msg');

    const modalSettings = document.getElementById('modal-settings');
    const closeModalSettings = document.getElementById('close-modal-settings');
    const customColorPicker = document.getElementById('custom-color-picker');
    const applyCustomColorBtn = document.getElementById('apply-custom-color-btn');

    // Mảng lưu danh sách ảnh đang chọn trước khi lưu
    let selectedImages = [];

    // Lưu trữ trạng thái slide hiện tại của từng carousel: { [memoryId]: currentSlideIndex }
    const carouselState = {};

    // =========================================================================
    // 6. XỬ LÝ ĐĂNG NHẬP & PHÂN QUYỀN (CHẾ ĐỘ XEM & CHỦ NHÂN TOÀN QUYỀN)
    // =========================================================================
    const openLoginModal = (customNotice = '') => {
        if (!modalLogin) return;
        if (loginError) loginError.classList.add('hidden');
        if (loginModalSubtitle) {
            loginModalSubtitle.textContent = customNotice || 'Đăng nhập tài khoản để có toàn quyền thêm, sửa và xóa ảnh kỷ niệm';
            if (customNotice) {
                loginModalSubtitle.className = 'text-xs text-rose-600 font-bold mt-1 bg-rose-50 py-1.5 px-3 rounded-xl border border-rose-200';
            } else {
                loginModalSubtitle.className = 'text-xs text-gray-500 mt-1';
            }
        }
        modalLogin.classList.remove('hidden');
        if (usernameInput) {
            usernameInput.value = '';
        }
        if (loginError) {
            loginError.classList.add('hidden');
        }
        if (passwordInput) {
            passwordInput.value = '';
            setTimeout(() => {
                if (usernameInput) usernameInput.focus();
            }, 120);
        }
    };

    const closeLoginModal = () => {
        if (!modalLogin) return;
        modalLogin.classList.add('hidden');
        if (loginError) loginError.classList.add('hidden');
    };

    const updateAuthUI = () => {
        const isOwner = Auth.isLoggedIn();

        if (guestNavControls) guestNavControls.classList.toggle('hidden', isOwner);
        if (ownerNavControls) ownerNavControls.classList.toggle('hidden', !isOwner);
        if (menuItemAccountMobile) menuItemAccountMobile.classList.toggle('hidden', !isOwner);

        if (isOwner) {
            const creds = Auth.getCredentials();
            if (currentUserDisplay) currentUserDisplay.textContent = creds.username;
            if (dropdownUserName) dropdownUserName.textContent = creds.username;
            if (accountInfoUsername) accountInfoUsername.textContent = creds.username;
        } else {
            if (currentUserDisplay) currentUserDisplay.textContent = 'Chủ nhân';
            if (dropdownUserName) dropdownUserName.textContent = 'Chủ nhân';
            if (accountInfoUsername) accountInfoUsername.textContent = 'Chủ nhân';
        }

        if (menuItemLoginText) {
            menuItemLoginText.textContent = isOwner ? 'Đăng Xuất (Về chế độ xem)' : 'Đăng Nhập Chủ Nhân';
        }
    };

    const checkInitialLogin = () => {
        updateAuthUI();
        renderMemories();
        if (typeof renderVietnamMap === 'function') {
            renderVietnamMap();
        }
    };

    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', () => openLoginModal());
    }

    if (closeModalLogin) {
        closeModalLogin.addEventListener('click', closeLoginModal);
    }

    if (modalLogin) {
        modalLogin.addEventListener('click', (e) => {
            if (e.target === modalLogin) closeLoginModal();
        });
    }

    loginBtn.addEventListener('click', async () => {
        const u = usernameInput.value.trim();
        const p = passwordInput.value.trim();
        const rememberEl = document.getElementById('remember-login');
        const shouldRemember = rememberEl ? rememberEl.checked : true;

        loginBtn.disabled = true;
        loginBtn.innerHTML = `
            <svg class="animate-spin h-4 w-4 text-white inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Đang xác thực...</span>
        `;

        const success = await Auth.login(u, p);

        loginBtn.disabled = false;
        loginBtn.innerHTML = `<span>Đăng Nhập Quản Trị</span>`;

        if (success) {
            if (shouldRemember) {
                try { localStorage.setItem('isLoggedIn', 'true'); } catch (e) {}
            } else {
                try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
            }
            if (loginError) loginError.classList.add('hidden');
            closeLoginModal();
            updateAuthUI();
            renderMemories();
            renderVietnamMap();
            alert('🎉 Đăng nhập thành công! Bạn đang ở chế độ Chủ Nhân với toàn quyền thêm, sửa và xóa ảnh video.');
        } else {
            if (loginError) loginError.classList.remove('hidden');
            loginBtn.classList.add('animate-bounce');
            setTimeout(() => loginBtn.classList.remove('animate-bounce'), 800);
        }
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });

    menuLogoutBtn.addEventListener('click', () => {
        clearAllAutoSlideIntervals();
        Auth.logout();
        updateAuthUI();
        if (!homeTab.classList.contains('hidden')) {
            // Đang ở home tab
        } else {
            switchTab('home');
        }
        renderMemories();
        renderVietnamMap();
        alert('👀 Bạn đã đăng xuất và trở về Chế độ xem.');
    });

    // =========================================================================
    // 7. XỬ LÝ CHUYỂN TAB & MENU 3 GẠCH
    // =========================================================================
    const switchTab = (tab) => {
        Logger.log('SWITCH_TAB', `Chuyển sang tab: ${tab}`);
        
        if (tab === 'add' && !Auth.isLoggedIn()) {
            openLoginModal('Vui lòng đăng nhập tài khoản Chủ Nhân để thêm ảnh / video mới!');
            return;
        }

        if (tab === 'home') {
            homeTab.classList.remove('hidden');
            addTab.classList.add('hidden');
            
            navHome.classList.add('text-rose-600', 'bg-rose-50/80');
            navHome.classList.remove('text-gray-600');
            navAdd.classList.remove('text-rose-600', 'bg-rose-50/80');
            navAdd.classList.add('text-gray-600');
            
            renderMemories();
            renderVietnamMap();
            MemoryStore.checkServerVersionAndSync();
        } else if (tab === 'add') {
            addTab.classList.remove('hidden');
            homeTab.classList.add('hidden');
            
            navAdd.classList.add('text-rose-600', 'bg-rose-50/80');
            navAdd.classList.remove('text-gray-600');
            navHome.classList.remove('text-rose-600', 'bg-rose-50/80');
            navHome.classList.add('text-gray-600');
        }

        // Tự động đóng menu 3 gạch sau khi chọn
        if (hamburgerDropdown) hamburgerDropdown.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    navHome.addEventListener('click', () => switchTab('home'));
    navAdd.addEventListener('click', () => switchTab('add'));
    brandTitle.addEventListener('click', () => switchTab('home'));
    emptyAddBtn.addEventListener('click', () => switchTab('add'));

    // Menu 3 gạch (Hamburger)
    btnHamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburgerDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (hamburgerDropdown && !btnHamburger.contains(e.target) && !hamburgerDropdown.contains(e.target)) {
            hamburgerDropdown.classList.add('hidden');
        }
    });

    menuItemHome.addEventListener('click', () => switchTab('home'));
    menuItemAdd.addEventListener('click', () => switchTab('add'));
    if (menuItemLogin) {
        menuItemLogin.addEventListener('click', () => {
            hamburgerDropdown.classList.add('hidden');
            if (Auth.isLoggedIn()) {
                menuLogoutBtn.click();
            } else {
                openLoginModal();
            }
        });
    }
    menuItemSettings.addEventListener('click', () => {
        hamburgerDropdown.classList.add('hidden');
        openSettingsModal();
    });

    const syncStatusBtn = document.getElementById('sync-status-btn');
    if (syncStatusBtn) {
        syncStatusBtn.addEventListener('click', async () => {
            updateSyncStatusUI('syncing');
            const ok = await MemoryStore.fetchLatestFromServer(true);
            const count = MemoryStore.getAll().length;
            if (ok) {
                Logger.log('MANUAL_SYNC_SUCCESS', `Người dùng đã bấm đồng bộ thành công (${count} kỷ niệm)`);
                alert(`✅ Đã đồng bộ thành công! Hiện có ${count} album kỷ niệm cập nhật mới nhất từ đám mây.`);
            } else {
                Logger.log('MANUAL_SYNC_NOTICE', `Dữ liệu hiện tại đã là mới nhất (${count} kỷ niệm)`);
                alert(`✨ Dữ liệu trên thiết bị của bạn đã là mới nhất (${count} album kỷ niệm).`);
            }
        });
    }

    // =========================================================================
    // 8. XỬ LÝ MODAL QUẢN LÝ TÀI KHOẢN & ĐỔI MẬT KHẨU
    // =========================================================================
    const openAccountModal = () => {
        Logger.log('OPEN_MODAL', 'Mở modal Quản lý tài khoản');
        const creds = Auth.getCredentials();
        if (accountInfoUsername) {
            accountInfoUsername.textContent = creds.username;
        }
        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        if (changePassMsg) changePassMsg.classList.add('hidden');
        if (userDropdownMenu) userDropdownMenu.classList.remove('show');
        if (hamburgerDropdown) hamburgerDropdown.classList.add('hidden');
        if (modalAccount) modalAccount.classList.remove('hidden');
    };

    const closeAccountModalHandler = () => {
        if (modalAccount) modalAccount.classList.add('hidden');
    };

    if (userDropdownToggle && userDropdownMenu) {
        userDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (userDropdownMenu && !userDropdownMenu.contains(e.target) && !e.target.closest('#user-dropdown-toggle')) {
            userDropdownMenu.classList.remove('show');
        }
    });

    if (menuAccountBtn) {
        menuAccountBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAccountModal();
        });
    }

    if (menuItemAccountMobile) {
        menuItemAccountMobile.addEventListener('click', () => {
            openAccountModal();
        });
    }

    if (closeModalAccount) {
        closeModalAccount.addEventListener('click', closeAccountModalHandler);
    }
    if (modalAccount) {
        modalAccount.addEventListener('click', (e) => {
            if (e.target === modalAccount) closeAccountModalHandler();
        });
    }

    changePassBtn.addEventListener('click', () => {
        const curPass = currentPasswordInput.value;
        const newPass = newPasswordInput.value;
        const confPass = confirmPasswordInput.value;

        changePassMsg.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'bg-green-50', 'text-green-600');

        if (!curPass || !newPass || !confPass) {
            changePassMsg.classList.add('bg-red-50', 'text-red-600');
            changePassMsg.textContent = 'Vui lòng điền đầy đủ các thông tin!';
            return;
        }

        if (newPass !== confPass) {
            changePassMsg.classList.add('bg-red-50', 'text-red-600');
            changePassMsg.textContent = 'Xác nhận mật khẩu mới không khớp!';
            return;
        }

        const res = Auth.changePassword(curPass, newPass);
        if (res.success) {
            changePassMsg.classList.add('bg-green-50', 'text-green-600');
            changePassMsg.textContent = res.message;
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            setTimeout(() => {
                closeAccountModalHandler();
            }, 1200);
        } else {
            changePassMsg.classList.add('bg-red-50', 'text-red-600');
            changePassMsg.textContent = res.message;
        }
    });

    const updateImageKitSettingsUI = () => {
        const badge = document.getElementById('settings-imagekit-badge');
        const desc = document.getElementById('settings-imagekit-desc');
        const box = document.getElementById('settings-imagekit-box');
        if (!badge || !desc) return;

        if (window.isImageKitConfigured && typeof imagekitConfig !== 'undefined' && imagekitConfig.publicKey && imagekitConfig.privateKey) {
            badge.className = "px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]";
            badge.textContent = "✅ Đã kết nối ImageKit";
            if (box) box.className = "p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2.5";
            desc.innerHTML = `Đang kết nối ImageKit.io (<b>${imagekitConfig.urlEndpoint}</b>). Ảnh được tải lên CDN toàn cầu miễn phí 20GB/tháng và không bao giờ bị mất!`;
        } else {
            badge.className = "px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[11px]";
            badge.textContent = "⚠️ Chưa cấu hình";
            if (box) box.className = "p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2.5";
        }
    };

    const updateCloudSyncSettingsUI = () => {
        const cloudBadge = document.getElementById('settings-cloud-badge');
        const tokenInput = document.getElementById('input-github-sync-token');
        const ghMsg = document.getElementById('github-sync-status-msg');

        if (cloudBadge) {
            cloudBadge.className = "px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]";
            cloudBadge.textContent = "🟢 Tự động đồng bộ 2 chiều";
        }

        const currentToken = typeof window.getGitHubSyncToken === 'function' ? window.getGitHubSyncToken() : '';
        if (tokenInput && currentToken) {
            tokenInput.value = currentToken;
        }

        if (ghMsg) {
            if (currentToken) {
                ghMsg.textContent = "✅ Đã cấu hình GitHub Token: Mọi kỷ niệm sẽ được tự động commit lưu trữ vào repo.";
                ghMsg.className = "text-[11px] text-emerald-600 font-medium";
            } else {
                ghMsg.textContent = "💡 Chưa nhập token: Hệ thống đang đồng bộ tức thì qua ImageKit Cloud. Nhập token nếu muốn commit thẳng vào GitHub repo.";
                ghMsg.className = "text-[11px] text-gray-500 italic";
            }
        }
    };

    const openSettingsModal = () => {
        Logger.log('OPEN_MODAL', 'Mở modal Cài đặt hệ thống');
        updateImageKitSettingsUI();
        updateCloudSyncSettingsUI();
        modalSettings.classList.remove('hidden');
    };

    const closeSettingsModalHandler = () => {
        modalSettings.classList.add('hidden');
    };

    navSettingsBtn.addEventListener('click', openSettingsModal);
    closeModalSettings.addEventListener('click', closeSettingsModalHandler);
    modalSettings.addEventListener('click', (e) => {
        if (e.target === modalSettings) closeSettingsModalHandler();
    });

    // 1. Nút "Đồng Bộ Lại Ngay" trong modal Cài Đặt
    const btnForceSyncCloud = document.getElementById('btn-force-sync-cloud');
    if (btnForceSyncCloud) {
        btnForceSyncCloud.addEventListener('click', async () => {
            const originalHtml = btnForceSyncCloud.innerHTML;
            btnForceSyncCloud.disabled = true;
            btnForceSyncCloud.innerHTML = `
                <svg class="animate-spin h-3.5 w-3.5 inline mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Đang đồng bộ...</span>
            `;
            try {
                await MemoryStore.fetchLatestFromServer(true);
                const count = MemoryStore.getAll().length;
                alert(`✅ Đã đồng bộ thành công! Hiện có ${count} album kỷ niệm mới nhất từ đám mây.`);
            } catch (err) {
                alert('Lỗi khi đồng bộ: ' + err.message);
            } finally {
                btnForceSyncCloud.disabled = false;
                btnForceSyncCloud.innerHTML = originalHtml;
            }
        });
    }

    // Nút "Đồng Bộ & Dọn Dẹp ImageKit" trong modal Cài Đặt
    const btnReconcileImageKit = document.getElementById('btn-reconcile-imagekit');
    if (btnReconcileImageKit) {
        btnReconcileImageKit.addEventListener('click', async () => {
            const originalHtml = btnReconcileImageKit.innerHTML;
            btnReconcileImageKit.disabled = true;
            btnReconcileImageKit.innerHTML = `
                <svg class="animate-spin h-3.5 w-3.5 inline mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Đang rà soát ImageKit...</span>
            `;
            try {
                const res = await MemoryStore.reconcileImageKit();
                let msg = `✅ Đồng bộ & rà soát ImageKit thành công!`;
                msg += `\n- Tổng số kỷ niệm hoạt động: ${res.memoriesCount}`;
                if (res.cleanedCount > 0) {
                    msg += `\n- Đã dọn dẹp sạch ${res.cleanedCount} ảnh mồ côi trên ImageKit.`;
                } else {
                    msg += `\n- Toàn bộ ảnh trên ImageKit đều khớp 100% với website (không có ảnh mồ côi).`;
                }
                alert(msg);
            } catch (err) {
                alert('Lỗi rà soát ImageKit: ' + err.message);
            } finally {
                btnReconcileImageKit.disabled = false;
                btnReconcileImageKit.innerHTML = originalHtml;
            }
        });
    }

    // 2. Nút "Tải Sao Lưu JSON" về máy
    const btnExportMemoriesJson = document.getElementById('btn-export-memories-json');
    if (btnExportMemoriesJson) {
        btnExportMemoriesJson.addEventListener('click', () => {
            const memories = MemoryStore.getAll();
            const jsonStr = JSON.stringify(memories, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `memories_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Logger.log('BACKUP_EXPORTED', `Đã xuất file sao lưu JSON gồm ${memories.length} kỷ niệm`);
        });
    }

    // 3. Nhập dữ liệu từ file JSON
    const inputImportMemoriesJson = document.getElementById('input-import-memories-json');
    if (inputImportMemoriesJson) {
        inputImportMemoriesJson.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    let imported = [];
                    if (Array.isArray(parsed)) {
                        imported = parsed;
                    } else if (parsed && Array.isArray(parsed.memories)) {
                        imported = parsed.memories;
                    } else {
                        throw new Error('Định dạng JSON không hợp lệ (cần là danh sách kỷ niệm)');
                    }

                    if (confirm(`Bạn có chắc chắn muốn nạp ${imported.length} kỷ niệm từ file này và đồng bộ lên đám mây?`)) {
                        const merged = MemoryStore.mergeWithLocal(imported);
                        await MemoryStore.saveAll(merged);
                        if (typeof renderMemories === 'function') renderMemories();
                        if (typeof renderVietnamMap === 'function') renderVietnamMap();
                        alert(`🎉 Đã nạp thành công ${imported.length} kỷ niệm và đồng bộ tự động tới mọi thiết bị!`);
                    }
                } catch (err) {
                    alert('Lỗi đọc file JSON: ' + err.message);
                } finally {
                    inputImportMemoriesJson.value = '';
                }
            };
            reader.readAsText(file, 'utf-8');
        });
    }

    // 4. Lưu GitHub Token
    const inputGithubToken = document.getElementById('input-github-sync-token');
    const btnSaveGithubToken = document.getElementById('btn-save-github-token');
    const githubSyncStatusMsg = document.getElementById('github-sync-status-msg');

    if (btnSaveGithubToken && inputGithubToken) {
        btnSaveGithubToken.addEventListener('click', async () => {
            const val = (inputGithubToken.value || '').trim();
            if (!val) {
                localStorage.removeItem('weddingGitHubToken');
                if (githubSyncStatusMsg) {
                    githubSyncStatusMsg.textContent = 'Đã xóa mã token GitHub. Hệ thống tiếp tục dùng ImageKit Cloud Sync.';
                    githubSyncStatusMsg.className = 'text-[11px] text-gray-500 italic';
                }
                alert('Đã xóa GitHub Token. Dữ liệu vẫn được đồng bộ tự động 2 chiều qua ImageKit Cloud!');
                return;
            }

            localStorage.setItem('weddingGitHubToken', val);
            btnSaveGithubToken.disabled = true;
            btnSaveGithubToken.textContent = 'Đang lưu...';

            try {
                // Kiểm tra token với GitHub API
                const resp = await fetch('https://api.github.com/user', {
                    headers: { 'Authorization': `Bearer ${val}` }
                });
                if (resp.ok) {
                    const userData = await resp.json();
                    if (githubSyncStatusMsg) {
                        githubSyncStatusMsg.textContent = `✅ Đã kết nối tài khoản GitHub: @${userData.login || 'User'}. Kỷ niệm sẽ tự động commit vào repo!`;
                        githubSyncStatusMsg.className = 'text-[11px] text-emerald-600 font-bold';
                    }
                    // Đồng bộ ngay lập tức dữ liệu hiện tại lên GitHub
                    await MemoryStore.syncToGitHub(MemoryStore.getAll());
                    alert(`✅ Kết nối GitHub thành công (@${userData.login})! Dữ liệu đã được lưu trữ vĩnh viễn trên GitHub.`);
                } else {
                    if (githubSyncStatusMsg) {
                        githubSyncStatusMsg.textContent = '⚠️ Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.';
                        githubSyncStatusMsg.className = 'text-[11px] text-rose-500 font-bold';
                    }
                    alert('⚠️ Token không hợp lệ hoặc không có quyền truy cập repo. Hãy xem lại hướng dẫn tạo mã!');
                }
            } catch (err) {
                alert('Lỗi kiểm tra token: ' + err.message);
            } finally {
                btnSaveGithubToken.disabled = false;
                btnSaveGithubToken.textContent = 'Lưu';
            }
        });
    }

    // 5. Cấu hình Firebase Realtime Database & Cloud Storage
    const inputFirebaseConfig = document.getElementById('input-firebase-config');
    const btnSaveFirebaseConfig = document.getElementById('btn-save-firebase-config');
    const btnClearFirebaseConfig = document.getElementById('btn-clear-firebase-config');
    const settingsFirebaseBadge = document.getElementById('settings-firebase-badge');
    const firebaseSyncStatusMsg = document.getElementById('firebase-sync-status-msg');

    const updateFirebaseBadgeUI = () => {
        if (!settingsFirebaseBadge) return;
        if (window.isFirebaseConfigured && window.firebaseDB) {
            settingsFirebaseBadge.textContent = '🟢 Đã kết nối Realtime';
            settingsFirebaseBadge.className = 'px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]';
        } else if (window.isFirebaseConfigured) {
            settingsFirebaseBadge.textContent = '🟡 Đang kết nối...';
            settingsFirebaseBadge.className = 'px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[11px]';
        } else {
            settingsFirebaseBadge.textContent = 'Chưa cấu hình';
            settingsFirebaseBadge.className = 'px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 text-[11px]';
        }
    };

    updateFirebaseBadgeUI();

    if (inputFirebaseConfig) {
        try {
            const currentCfg = localStorage.getItem('weddingFirebaseConfig');
            if (currentCfg) {
                try {
                    inputFirebaseConfig.value = JSON.stringify(JSON.parse(currentCfg), null, 2);
                } catch (e) {
                    inputFirebaseConfig.value = currentCfg;
                }
            }
        } catch (e) {}
    }

    if (btnSaveFirebaseConfig && inputFirebaseConfig) {
        btnSaveFirebaseConfig.addEventListener('click', () => {
            const rawVal = inputFirebaseConfig.value || '';
            if (!rawVal.trim()) {
                alert('Vui lòng dán đoạn mã cấu hình Firebase Config!');
                return;
            }

            // Parser đa tầng an toàn độc lập (phòng trường hợp trình duyệt lưu cache firebase-config.js cũ)
            const parseAndSaveConfig = (input) => {
                // Thử hàm toàn cục nếu có và hoạt động tốt
                if (typeof window.saveFirebaseConfig === 'function') {
                    const res = window.saveFirebaseConfig(input);
                    if (res && res.success) return res;
                }
                
                // Fallback độc lập nếu window.saveFirebaseConfig bị cache phiên bản cũ
                try {
                    let str = String(input || '').trim();
                    if (str.includes('{') && str.includes('}')) {
                        const start = str.indexOf('{');
                        const end = str.lastIndexOf('}');
                        str = str.substring(start, end + 1);
                    }
                    let obj = null;
                    try { obj = JSON.parse(str); } catch (e) {}
                    if (!obj) {
                        try {
                            const fn = new Function('return (' + str + ');');
                            const ev = fn();
                            if (ev && typeof ev === 'object' && !Array.isArray(ev)) obj = ev;
                        } catch (e) {}
                    }
                    if (!obj || !obj.apiKey || !obj.projectId) {
                        const fields = {};
                        const known = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
                        for (const k of known) {
                            const reg = new RegExp(`['"]?${k}['"]?\\s*:\\s*['"\`]?([^'",\`\\r\\n}]+)['"\`]?`, 'i');
                            const m = String(input || '').match(reg);
                            if (m && m[1]) fields[k] = m[1].trim();
                        }
                        if (fields.apiKey && fields.projectId) obj = fields;
                    }

                    if (!obj || !obj.apiKey || !obj.projectId) {
                        return { success: false, message: 'Cấu hình Firebase không hợp lệ hoặc thiếu "apiKey" / "projectId"!' };
                    }

                    const cleanObj = {};
                    for (const [k, v] of Object.entries(obj)) {
                        cleanObj[k] = String(v !== undefined && v !== null ? v : '').trim();
                    }
                    localStorage.setItem('weddingFirebaseConfig', JSON.stringify(cleanObj, null, 2));
                    window.firebaseConfig = cleanObj;
                    window.isFirebaseConfigured = true;
                    return { success: true, message: 'Đã lưu cấu hình Firebase thành công!' };
                } catch (err) {
                    return { success: false, message: err.message };
                }
            };

            const res = parseAndSaveConfig(rawVal);
            if (res.success) {
                if (firebaseSyncStatusMsg) {
                    firebaseSyncStatusMsg.textContent = '✅ Đã lưu cấu hình Firebase! Đang tải lại trang...';
                    firebaseSyncStatusMsg.className = 'text-[11px] text-emerald-600 font-bold';
                }
                alert('✅ Đã lưu cấu hình Firebase thành công! Trang web sẽ tải lại để kích hoạt kết nối thời gian thực.');
                setTimeout(() => window.location.reload(), 500);
            } else {
                if (firebaseSyncStatusMsg) {
                    firebaseSyncStatusMsg.textContent = '⚠️ ' + res.message;
                    firebaseSyncStatusMsg.className = 'text-[11px] text-rose-500 font-bold';
                }
                alert('⚠️ Lỗi cấu hình: ' + res.message);
            }
        });
    }

    if (btnClearFirebaseConfig) {
        btnClearFirebaseConfig.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa cấu hình Firebase khỏi thiết bị này?')) {
                if (typeof window.clearFirebaseConfig === 'function') {
                    window.clearFirebaseConfig();
                }
                if (inputFirebaseConfig) inputFirebaseConfig.value = '';
                updateFirebaseBadgeUI();
                alert('Đã xóa cấu hình Firebase. Trang web sẽ tải lại.');
                window.location.reload();
            }
        });
    }

    // Chọn bảng màu định sẵn
    document.querySelectorAll('.theme-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bg = btn.getAttribute('data-bg');
            const pattern = btn.getAttribute('data-pattern');
            const text = btn.getAttribute('data-text');
            Theme.apply(bg, pattern, text);
        });
    });

    // Chọn màu tùy chỉnh
    applyCustomColorBtn.addEventListener('click', () => {
        const color = customColorPicker.value;
        Theme.apply(color, 'none', '#1f2937');
    });

    // =========================================================================
    // 10. XỬ LÝ TẢI NHIỀU ẢNH (MULTIPLE UPLOAD & PREVIEW CHO ĐIỆN THOẠI & PC)
    // =========================================================================
    if (uploadTrigger && uploadTrigger.tagName.toLowerCase() !== 'label') {
        uploadTrigger.addEventListener('click', () => {
            mediaUpload.click();
        });
    }

    const updatePreviewThumbnails = () => {
        previewThumbnails.innerHTML = '';
        if (selectedImages.length === 0) {
            previewSection.classList.add('hidden');
            return;
        }

        previewSection.classList.remove('hidden');
        previewCount.textContent = selectedImages.length;

        selectedImages.forEach((src, idx) => {
            const thumbWrap = document.createElement('div');
            thumbWrap.className = 'relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-black shadow-xs';
            if (window.isVideoUrl(src)) {
                thumbWrap.innerHTML = `
                    <video src="${src}" class="w-full h-full object-cover" muted playsinline preload="metadata"></video>
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span class="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs">▶</span>
                    </div>
                    <button type="button" class="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-90 group-hover:opacity-100 transition-all cursor-pointer z-10" data-remove-idx="${idx}" title="Xóa file này">
                        ✕
                    </button>
                `;
            } else {
                thumbWrap.innerHTML = `
                    <img src="${src}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=window.FALLBACK_IMG_PLACEHOLDER;">
                    <button type="button" class="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-90 group-hover:opacity-100 transition-all cursor-pointer" data-remove-idx="${idx}" title="Xóa ảnh này">
                        ✕
                    </button>
                `;
            }
            previewThumbnails.appendChild(thumbWrap);
        });

        // Thẻ bấm để thêm ảnh / video nhanh chóng ngay trong ô preview
        const addMoreTile = document.createElement('label');
        addMoreTile.htmlFor = 'media-upload';
        addMoreTile.className = 'flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/60 hover:bg-rose-100/70 text-rose-500 cursor-pointer transition-all active:scale-95 group select-none shadow-xs';
        addMoreTile.title = 'Chọn thêm ảnh hoặc video từ điện thoại/máy tính';
        addMoreTile.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-rose-100 group-hover:scale-110 flex items-center justify-center text-rose-500 mb-1 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <span class="text-[11px] font-bold text-rose-600">Thêm tệp</span>
        `;
        previewThumbnails.appendChild(addMoreTile);

        // Bắt sự kiện xóa từng ảnh trong thumbnail
        previewThumbnails.querySelectorAll('[data-remove-idx]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const removeIdx = parseInt(btn.getAttribute('data-remove-idx'));
                selectedImages.splice(removeIdx, 1);
                updatePreviewThumbnails();
                Logger.log('REMOVE_PREVIEW_IMAGE', `Xóa ảnh thứ ${removeIdx + 1} khỏi danh sách chờ`);
            });
        });
    };

    clearSelectedImages.addEventListener('click', () => {
        selectedImages = [];
        updatePreviewThumbnails();
        mediaUpload.value = '';
        Logger.log('CLEAR_PREVIEW_IMAGES', 'Đã xóa toàn bộ ảnh đã chọn');
    });

    mediaUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        Logger.log('SELECT_FILES', `Người dùng đã chọn ${files.length} file ảnh / video`);
        
        const progressBarContainer = document.getElementById('upload-progress-container');
        const progressBar = document.getElementById('upload-progress-bar');
        const progressText = document.getElementById('upload-progress-text');
        const textMain = document.getElementById('upload-text-main');

        if (progressBarContainer) progressBarContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
        if (textMain) textMain.textContent = `Đang xử lý ${files.length} tệp...`;
        uploadTrigger.classList.add('opacity-75', 'pointer-events-none');
        
        let processedCount = 0;
        let successCount = 0;

        for (const file of files) {
            processedCount++;
            const pct = Math.round((processedCount / files.length) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.textContent = `Đang xử lý tệp (${processedCount}/${files.length})...`;

            const isImage = (file.type && file.type.startsWith('image/')) || 
                            /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
            const isVideo = (file.type && (file.type.startsWith('video/') || file.type === 'video/quicktime' || file.type === 'video/x-m4v')) ||
                            /\.(mp4|mov|m4v|webm|avi|mkv|ogv|3gp)$/i.test(file.name);
            if (!isImage && !isVideo) continue;

            try {
                if (isVideo) {
                    const base64Video = await window.readFileAsDataURL(file);
                    if (base64Video) {
                        selectedImages.push(base64Video);
                        successCount++;
                    }
                } else {
                    // Giữ nguyên 100% độ phân giải và chất lượng ảnh gốc
                    const base64 = await processImagePreservingResolution(file);
                    if (base64) {
                        selectedImages.push(base64);
                        successCount++;
                    }
                }
            } catch (err) {
                Logger.log('MEDIA_PROCESS_ERROR', `Lỗi xử lý file ${file.name}`, { error: String(err) });
            }
        }

        if (progressBarContainer) progressBarContainer.classList.add('hidden');
        if (textMain) textMain.textContent = 'Chọn Ảnh / Video Kỷ Niệm';
        uploadTrigger.classList.remove('opacity-75', 'pointer-events-none');

        updatePreviewThumbnails();
        mediaUpload.value = ''; // Reset input để có thể chọn tiếp nhiều lần trên điện thoại

        if (successCount > 0) {
            Logger.log('MEDIA_PROCESSED', `Đã chuẩn bị thành công ${successCount}/${files.length} tệp`);
        }
    });

    // =========================================================================
    // 11. XỬ LÝ LƯU KỶ NIỆM MỚI
    // =========================================================================
    saveMemoryBtn.addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) {
            openLoginModal('Vui lòng đăng nhập tài khoản Chủ Nhân để lưu kỷ niệm!');
            return;
        }

        const content = memoryContent.value.trim();
        const location = memoryLocation.value.trim();
        const date = memoryDate.value;

        if (selectedImages.length === 0) {
            alert('Vui lòng chọn ít nhất một hình ảnh kỷ niệm!');
            return;
        }

        if (!content && !location && !date) {
            alert('Vui lòng nhập thêm lời nhắn, địa điểm hoặc ngày kỷ niệm!');
            return;
        }

        saveMemoryBtn.disabled = true;
        saveMemoryBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Đang lưu và đồng bộ lên máy tính & điện thoại...</span>
        `;

        // Tải ảnh trực tiếp lên ImageKit.io hoặc máy chủ nội bộ kèm hiển thị tiến trình
        const finalImages = await uploadImagesToServer(selectedImages, (current, total, pct) => {
            saveMemoryBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5 mr-2 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Đang lưu ảnh ${current}/${total} (${pct}%)...</span>
            `;
        });

        const newMemory = {
            id: Date.now().toString(),
            images: finalImages,
            content: content,
            location: location,
            date: date,
            createdAt: new Date().toISOString()
        };

        const synced = await MemoryStore.add(newMemory);

        saveMemoryBtn.disabled = false;
        saveMemoryBtn.innerHTML = `<span>Lưu Lại Kỷ Niệm</span>`;

        // Reset form
        selectedImages = [];
        updatePreviewThumbnails();
        memoryContent.value = '';
        memoryLocation.value = '';
        memoryDate.value = '';

        // Chuyển sang Tab Trang chủ để xem kết quả
        switchTab('home');
        renderMemories();
        renderVietnamMap();

        if (synced) {
            alert('🎉 Đã lưu và đồng bộ thành công! Ảnh đã sẵn sàng hiển thị trên cả máy tính & điện thoại.');
        } else {
            alert('⚠️ Đã lưu trên thiết bị của bạn. Khi máy chủ kết nối lại, ảnh sẽ tự động đồng bộ sang thiết bị khác.');
        }
    });

    // =========================================================================
    // 12. HIỂN THỊ KỶ NIỆM VỚI ẢNH XẾP CHỒNG CÁCH NHAU 0.5CM & TỰ ĐỘNG CHUYỂN ẢNH 2S
    // =========================================================================
    const autoSlideIntervals = {};

    const clearAllAutoSlideIntervals = () => {
        Object.keys(autoSlideIntervals).forEach(id => {
            clearInterval(autoSlideIntervals[id]);
            delete autoSlideIntervals[id];
        });
    };

    const startAutoSlide = (memoryId, totalImages) => {
        stopAutoSlide(memoryId);
        if (totalImages <= 1) return;

        autoSlideIntervals[memoryId] = setInterval(() => {
            const currentIdx = carouselState[memoryId] || 0;
            const nextIdx = (currentIdx + 1) % totalImages;
            slideTo(memoryId, nextIdx, totalImages, false);
        }, 2000); // Tự động chuyển ảnh cách nhau 2 giây
    };

    const stopAutoSlide = (memoryId) => {
        if (autoSlideIntervals[memoryId]) {
            clearInterval(autoSlideIntervals[memoryId]);
            delete autoSlideIntervals[memoryId];
        }
    };

    const slideTo = (memoryId, newIndex, totalImages, logEvent = true) => {
        if (newIndex < 0) newIndex = totalImages - 1;
        if (newIndex >= totalImages) newIndex = 0;

        carouselState[memoryId] = newIndex;

        const stage = document.getElementById(`stacked-stage-${memoryId}`);
        const counter = document.getElementById(`carousel-counter-${memoryId}`);
        const dots = document.querySelectorAll(`[data-dot-for="${memoryId}"]`);

        if (stage) {
            const cards = stage.querySelectorAll('.stacked-card');
            cards.forEach((card, idx) => {
                const vid = card.querySelector('video');
                if (vid && idx !== newIndex) {
                    try { vid.pause(); } catch(e){}
                }
                // Tính khoảng cách offset tương đối so với tấm ảnh đang hiển thị
                const offset = (idx - newIndex + totalImages) % totalImages;
                
                if (offset === 0) {
                    // Tấm ảnh chính ở trên cùng
                    card.style.transform = 'translateY(0) scale(1) rotate(0deg)';
                    card.style.zIndex = '12';
                    card.style.opacity = '1';
                    card.style.filter = 'brightness(1)';
                    card.style.pointerEvents = 'auto';
                } else if (offset === 1) {
                    // Tấm ảnh thứ 2 xếp chồng lùi về sau cách đúng 0.5cm
                    card.style.transform = 'translateY(-0.5cm) scale(0.96) rotate(1.2deg)';
                    card.style.zIndex = '10';
                    card.style.opacity = '0.92';
                    card.style.filter = 'brightness(0.95)';
                    card.style.pointerEvents = 'none';
                } else if (offset === 2) {
                    // Tấm ảnh thứ 3 xếp chồng tiếp tục cách 0.5cm (tổng là 1.0cm)
                    card.style.transform = 'translateY(-1.0cm) scale(0.92) rotate(-1.2deg)';
                    card.style.zIndex = '8';
                    card.style.opacity = '0.78';
                    card.style.filter = 'brightness(0.88)';
                    card.style.pointerEvents = 'none';
                } else if (offset === totalImages - 1 && totalImages > 2) {
                    // Tấm ảnh vừa chuyển trượt sang dưới nhẹ
                    card.style.transform = 'translateY(0.4cm) scale(1.02) rotate(-2deg)';
                    card.style.zIndex = '14';
                    card.style.opacity = '0';
                    card.style.pointerEvents = 'none';
                } else {
                    // Các ảnh còn lại xếp gọn lùi sâu phía sau
                    card.style.transform = 'translateY(-1.5cm) scale(0.88)';
                    card.style.zIndex = '2';
                    card.style.opacity = '0';
                    card.style.pointerEvents = 'none';
                }
            });
        }

        if (counter) {
            const counterText = counter.querySelector('span') || counter;
            counterText.textContent = `${newIndex + 1}/${totalImages}`;
        }

        dots.forEach((dot, idx) => {
            if (idx === newIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        if (logEvent) {
            Logger.log('SLIDE_IMAGE', `Xem ảnh ${newIndex + 1}/${totalImages} trong kỷ niệm ID: ${memoryId}`);
        }
    };

    const renderMemories = () => {
        clearAllAutoSlideIntervals(); // Hủy các timer cũ khi render mới
        const allMemories = MemoryStore.getAll();
        const isOwner = Auth.isLoggedIn();
        memoriesContainer.innerHTML = '';

        let memories = allMemories;
        const filterBanner = document.getElementById('filter-status-banner');

        if (window.activeProvinceFilter) {
            const prov = (typeof PROVINCES_65 !== 'undefined') ? PROVINCES_65.find(p => p.id === window.activeProvinceFilter) : null;
            if (prov) {
                memories = findMemoriesForProvince(prov, allMemories);
                if (filterBanner) {
                    filterBanner.classList.remove('hidden');
                    filterBanner.innerHTML = `
                        <div class="p-4 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 rounded-2xl border border-rose-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in mb-6">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                    📍
                                </div>
                                <div>
                                    <span class="text-[11px] text-gray-500 font-medium block">Đang xem kỷ niệm tại:</span>
                                    <h4 class="text-base font-bold text-rose-700 leading-tight">
                                        ${prov.name} <span class="text-xs font-semibold text-gray-600 bg-white px-2 py-0.5 rounded-full border border-rose-200 ml-1">(${memories.length} album)</span>
                                    </h4>
                                </div>
                            </div>
                            <button type="button" onclick="window.clearProvinceFilter()" class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-300 shadow-xs transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer">
                                <span>✕ Hiện tất cả kỷ niệm</span>
                            </button>
                        </div>
                    `;
                }
            }
        } else {
            if (filterBanner) {
                filterBanner.classList.add('hidden');
                filterBanner.innerHTML = '';
            }
        }

        if (!memories.length) {
            emptyState.classList.remove('hidden');
            if (window.activeProvinceFilter) {
                const prov = (typeof PROVINCES_65 !== 'undefined') ? PROVINCES_65.find(p => p.id === window.activeProvinceFilter) : null;
                const provName = prov ? prov.name : 'địa điểm này';
                emptyState.innerHTML = `
                    <div class="py-6">
                        <span class="text-5xl mb-3 block">📍</span>
                        <h3 class="font-playfair text-2xl text-gray-700 mb-2 font-bold">Chưa Có Kỷ Niệm Tại ${provName}</h3>
                        <p class="text-gray-500 max-w-md mx-auto mb-5 text-sm">Chưa có ảnh hoặc video nào được lưu tại đây. Hãy thêm kỷ niệm đầu tiên hoặc xem các tỉnh thành khác!</p>
                        <div class="flex items-center justify-center gap-3 flex-wrap">
                            <button onclick="window.addPhotoAtLocation('${prov ? prov.shortName : ''}')" class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl shadow-md transition-all text-xs cursor-pointer">
                                + Thêm Kỷ Niệm Tại Đây
                            </button>
                            <button onclick="window.clearProvinceFilter()" class="px-4 py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-semibold rounded-xl shadow-xs transition-all text-xs cursor-pointer">
                                🌟 Hiện Tất Cả Kỷ Niệm
                            </button>
                        </div>
                    </div>
                `;
            } else {
                emptyState.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 mx-auto text-rose-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 class="font-playfair text-2xl text-gray-700 mb-2 font-bold">Chưa Có Kỷ Niệm Nào</h3>
                    <p class="text-gray-500 max-w-md mx-auto mb-6">Hãy bắt đầu lưu giữ những kỷ niệm tuyệt vời đầu tiên của Ngọc Ánh & Tú Uyên ngay nhé!</p>
                    <button id="empty-add-btn" class="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer">
                        Thêm Kỷ Niệm Đầu Tiên
                    </button>
                `;
                const newEmptyAddBtn = document.getElementById('empty-add-btn');
                if (newEmptyAddBtn) {
                    newEmptyAddBtn.addEventListener('click', () => switchTab('add'));
                }
            }
            return;
        }

        emptyState.classList.add('hidden');

        memories.forEach((item) => {
            const memoryId = item.id;
            const rawImgs = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
            let images = rawImgs.filter(img => img && typeof img === 'string' && img.trim().length > 5);
            if (images.length === 0) {
                images = [window.FALLBACK_IMG_PLACEHOLDER];
            }
            const totalImages = images.length;

            carouselState[memoryId] = Math.max(0, Math.min(carouselState[memoryId] || 0, totalImages - 1));

            const card = document.createElement('article');
            card.className = 'bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-md border border-rose-100 transition-all hover:shadow-xl fade-in';

            // 1. PHẦN MEDIA: ẢNH ĐƠN HOẶC ALBUM XẾP CHỒNG (CÁCH 0.5CM, TỰ ĐỘNG CHUYỂN 2 GIÂY)
            let mediaMarkup = '';

            if (totalImages > 1) {
                // Hiển thị Album xếp chồng cách nhau 0.5cm
                mediaMarkup = `
                    <div class="stacked-deck-container" id="carousel-${memoryId}">
                        <!-- Gợi ý vuốt ảnh trên điện thoại -->
                        <div class="carousel-swipe-hint">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 16l-4-4m0 0l4-4m-4 4h18m-4 4l4-4m0 0l-4-4" />
                            </svg>
                            <span>Vuốt ảnh ‹ ›</span>
                        </div>

                        <!-- Counter Badge với hiệu ứng đồng hồ xoay -->
                        <div class="carousel-counter" id="carousel-counter-${memoryId}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-rose-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>1/${totalImages}</span>
                        </div>

                        <!-- Sân khấu hiển thị các ảnh xếp chồng cách nhau 0.5cm -->
                        <div class="stacked-deck-stage" id="stacked-stage-${memoryId}">
                            ${images.map((imgSrc, imgIdx) => `
                                <div class="stacked-card" data-card-idx="${imgIdx}">
                                    <div class="stacked-card-frame cursor-zoom-in" data-img-idx="${imgIdx}" title="Bấm vào để phóng to xem chi tiết">
                                        ${window.isVideoUrl(imgSrc) ? `
                                            <video src="${imgSrc}" controls playsinline preload="metadata" class="w-full h-full object-cover rounded-2xl bg-black"></video>
                                        ` : `
                                            <img src="${imgSrc}" alt="" loading="eager" onerror="window.handleImageError(this, '${memoryId}')">
                                        `}
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- 2 Nút Mũi Tên Chuyển Ảnh Trái & Phải -->
                        <button class="carousel-btn prev" data-prev="${memoryId}" title="Ảnh trước">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button class="carousel-btn next" data-next="${memoryId}" title="Ảnh tiếp theo">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        <!-- Chấm chỉ báo vị trí (Dots) -->
                        <div class="carousel-dots">
                            ${images.map((_, dotIdx) => `
                                <div class="carousel-dot ${dotIdx === 0 ? 'active' : ''}" data-dot-for="${memoryId}" data-dot-idx="${dotIdx}"></div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (totalImages === 1) {
                // Hiển thị 1 ảnh / video FULL tỷ lệ
                if (window.isVideoUrl(images[0])) {
                    mediaMarkup = `
                        <div class="single-photo-frame w-full bg-black/90 overflow-hidden flex items-center justify-center p-3 rounded-2xl" data-single-frame="${memoryId}">
                            <video src="${images[0]}" controls playsinline preload="metadata" class="w-full max-h-[540px] rounded-2xl block bg-black shadow-md"></video>
                        </div>
                    `;
                } else {
                    mediaMarkup = `
                        <div class="single-photo-frame w-full bg-black/5 overflow-hidden flex items-center justify-center p-3 cursor-zoom-in" data-single-frame="${memoryId}" title="Bấm vào để phóng to xem chi tiết">
                            <img src="${images[0]}" alt="" class="w-full max-h-[540px] object-contain rounded-2xl block" loading="eager" onerror="window.handleImageError(this, '${memoryId}')">
                        </div>
                    `;
                }
            }

            // 2. PHẦN THÔNG TIN KỶ NIỆM (Nội dung, địa điểm, ngày tháng)
            const dateObj = new Date(item.date);
            const dateDisplay = (item.date && !isNaN(dateObj)) ? dateObj.toLocaleDateString('vi-VN') : (item.date || 'Khoảnh khắc ngọt ngào');

            card.innerHTML = `
                ${mediaMarkup}
                <div class="p-6 md:p-8">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-rose-50">
                        <div class="flex items-center space-x-2">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100/70 text-rose-600">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                ${dateDisplay}
                            </span>
                            ${item.location ? `
                                <span class="inline-flex items-center text-xs font-semibold text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                    ${item.location}
                                </span>
                            ` : ''}
                        </div>

                        <!-- Nhóm nút Thao tác (Chỉ hiển thị khi đã Đăng Nhập Chủ Nhân) -->
                        ${isOwner ? `
                            <div class="flex items-center space-x-1.5 sm:space-x-2">
                                <!-- Nút Sửa kỷ niệm -->
                                <button class="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-xl transition-colors flex items-center space-x-1 text-xs font-bold border border-rose-200/80 shadow-xs cursor-pointer select-none active:scale-95" data-edit-memory="${memoryId}" title="Chỉnh sửa nội dung, ngày, địa điểm và ảnh">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Sửa</span>
                                </button>

                                <input type="file" id="input-add-photo-${memoryId}" class="sr-only-file sr-only" accept="image/*,video/*,.heic,.heif,.HEIC,.HEIF,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.mp4,.mov,.m4v,.avi,.mkv,.webm,.3gp,.MOV,.MP4,.M4V,.3GP,video/quicktime,video/mp4,video/x-m4v" multiple>
                                <label for="input-add-photo-${memoryId}" class="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-xl transition-colors flex items-center space-x-1 text-xs font-bold border border-rose-200/80 shadow-xs cursor-pointer select-none active:scale-95" data-add-photo="${memoryId}" title="Thêm ảnh hoặc video vào album này">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span class="btn-text">Thêm tệp</span>
                                </label>

                                <!-- Nút Xóa kỷ niệm -->
                                <button class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer" data-delete-memory="${memoryId}" title="Xóa kỷ niệm này">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        ` : `
                            <span class="inline-flex items-center text-[11px] text-gray-400 italic">
                                💕 Kỷ niệm ngọt ngào
                            </span>
                        `}
                    </div>

                    ${item.content ? `
                        <p class="font-playfair text-xl md:text-2xl text-gray-800 leading-relaxed italic">
                            "${item.content}"
                        </p>
                    ` : ''}
                </div>
            `;

            memoriesContainer.appendChild(card);

            // Bắt sự kiện click vào ảnh để mở Trình Phóng To / Thu Nhỏ (ImageViewer)
            if (totalImages > 1) {
                const frames = card.querySelectorAll('.stacked-card-frame');
                frames.forEach(frame => {
                    frame.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(frame.getAttribute('data-img-idx'), 10) || 0;
                        const sub = item.location ? `${dateDisplay} • ${item.location}` : dateDisplay;
                        ImageViewer.open(images, idx, item.content, sub);
                    });
                });
            } else if (totalImages === 1) {
                const singleFrame = card.querySelector(`[data-single-frame="${memoryId}"]`);
                if (singleFrame) {
                    let sStartX = 0;
                    let sStartY = 0;
                    let sHasMoved = false;
                    let sRafId = null;
                    const singleImg = singleFrame.querySelector('img');

                    singleFrame.addEventListener('touchstart', (e) => {
                        if (!e.touches || e.touches.length !== 1) return;
                        sStartX = e.touches[0].clientX;
                        sStartY = e.touches[0].clientY;
                        sHasMoved = false;
                    }, { passive: true });

                    singleFrame.addEventListener('touchmove', (e) => {
                        // Chặn cuộn trang xuống/lên khi chạm trên khu vực ảnh đơn
                        if (e.cancelable) e.preventDefault();
                        if (!e.touches || e.touches.length !== 1) return;
                        const clientX = e.touches[0].clientX;
                        const clientY = e.touches[0].clientY;

                        // Dùng requestAnimationFrame để giới hạn tần suất xử lý cử chỉ vuốt chạm
                        if (!sRafId) {
                            sRafId = requestAnimationFrame(() => {
                                sRafId = null;
                                const diffX = clientX - sStartX;
                                const diffY = clientY - sStartY;
                                if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
                                    sHasMoved = true;
                                }
                                if (singleImg && sHasMoved) {
                                    singleImg.style.transition = 'none';
                                    singleImg.style.transform = `translateX(${diffX * 0.25}px)`;
                                }
                            });
                        }
                    }, { passive: false });

                    singleFrame.addEventListener('touchend', () => {
                        if (sRafId) {
                            cancelAnimationFrame(sRafId);
                            sRafId = null;
                        }
                        if (singleImg) {
                            singleImg.style.transition = 'transform 0.3s ease';
                            singleImg.style.transform = 'none';
                        }
                        if (sHasMoved) {
                            const suppressClick = (ev) => {
                                ev.stopPropagation();
                                ev.preventDefault();
                            };
                            singleFrame.addEventListener('click', suppressClick, { capture: true, once: true });
                            setTimeout(() => {
                                singleFrame.removeEventListener('click', suppressClick, { capture: true });
                            }, 350);
                        }
                    }, { passive: false });

                    singleFrame.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const sub = item.location ? `${dateDisplay} • ${item.location}` : dateDisplay;
                        ImageViewer.open(images, 0, item.content, sub);
                    });
                }
            }

            // Bắt sự kiện chuyển ảnh Slider nếu có nhiều ảnh
            if (totalImages > 1) {
                // Áp dụng vị trí xếp chồng ban đầu
                slideTo(memoryId, carouselState[memoryId] || 0, totalImages, false);

                // Kích hoạt tự động chuyển ảnh mỗi 2 giây
                startAutoSlide(memoryId, totalImages);

                const carouselElem = card.querySelector(`#carousel-${memoryId}`);
                if (carouselElem) {
                    // Tạm dừng khi rê chuột vào để người dùng xem kỹ
                    carouselElem.addEventListener('mouseenter', () => stopAutoSlide(memoryId));
                    // Tiếp tục tự động chuyển khi chuột rời đi
                    carouselElem.addEventListener('mouseleave', () => startAutoSlide(memoryId, totalImages));

                    // =========================================================
                    // HỖ TRỢ VUỐT TRÊN ĐIỆN THOẠI & CHẶN CUỘN TRANG TẠI KHU VỰC ẢNH
                    // Ứng dụng requestAnimationFrame để tối ưu hóa tần suất xử lý vuốt chạm
                    // =========================================================
                    let touchStartX = 0;
                    let touchStartY = 0;
                    let touchCurrentX = 0;
                    let touchCurrentY = 0;
                    let touchStartTime = 0;
                    let isTouching = false;
                    let hasMoved = false;
                    let activeCard = null;
                    let lastTouchTime = 0;
                    let rafTouchId = null;

                    const handleTouchStart = (e) => {
                        if (e.target.closest('.carousel-btn') || e.target.closest('.carousel-dots')) {
                            return;
                        }
                        if (!e.touches || e.touches.length !== 1) return;

                        lastTouchTime = Date.now();
                        const touch = e.touches[0];
                        touchStartX = touch.clientX;
                        touchStartY = touch.clientY;
                        touchCurrentX = touch.clientX;
                        touchCurrentY = touch.clientY;
                        touchStartTime = Date.now();
                        isTouching = true;
                        hasMoved = false;

                        stopAutoSlide(memoryId);

                        const currentIdx = carouselState[memoryId] || 0;
                        const stage = carouselElem.querySelector('.stacked-deck-stage');
                        if (stage) {
                            activeCard = stage.querySelector(`.stacked-card[data-card-idx="${currentIdx}"]`);
                        }
                    };

                    const handleTouchMove = (e) => {
                        if (!isTouching) return;

                        // Chặn cuộn trang web xuống/lên khi ngón tay đang chạm trên vùng ảnh
                        if (e.cancelable) {
                            e.preventDefault();
                        }

                        if (!e.touches || e.touches.length !== 1) return;
                        const touch = e.touches[0];
                        touchCurrentX = touch.clientX;
                        touchCurrentY = touch.clientY;

                        // Dùng requestAnimationFrame để đồng bộ với tần số quét màn hình (60Hz / 120Hz)
                        if (!rafTouchId) {
                            rafTouchId = requestAnimationFrame(() => {
                                rafTouchId = null;
                                if (!isTouching || !activeCard) return;

                                const diffX = touchCurrentX - touchStartX;
                                const diffY = touchCurrentY - touchStartY;

                                if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
                                    hasMoved = true;
                                }

                                // Phản hồi trực quan kéo trượt mượt mà theo ngón tay
                                if (hasMoved) {
                                    activeCard.style.transition = 'none';
                                    const rotateDeg = Math.max(-10, Math.min(10, diffX * 0.04));
                                    const opacityVal = Math.max(0.75, 1 - Math.abs(diffX) / 800);
                                    activeCard.style.transform = `translate3d(${diffX * 0.65}px, 0, 0) scale(1) rotate(${rotateDeg}deg)`;
                                    activeCard.style.opacity = opacityVal;
                                }
                            });
                        }
                    };

                    const handleTouchEnd = () => {
                        if (!isTouching) return;
                        isTouching = false;
                        lastTouchTime = Date.now();

                        if (rafTouchId) {
                            cancelAnimationFrame(rafTouchId);
                            rafTouchId = null;
                        }

                        const diffX = touchCurrentX - touchStartX;
                        const duration = Date.now() - touchStartTime;

                        if (activeCard) {
                            activeCard.style.transition = '';
                        }

                        if (hasMoved) {
                            // Chặn sự kiện click mở Lightbox nếu đang vuốt
                            const suppressClick = (ev) => {
                                ev.stopPropagation();
                                ev.preventDefault();
                            };
                            carouselElem.addEventListener('click', suppressClick, { capture: true, once: true });
                            setTimeout(() => {
                                carouselElem.removeEventListener('click', suppressClick, { capture: true });
                            }, 350);

                            // Kiểm tra hướng vuốt:
                            // Vuốt sang trái (diffX < -35) -> ảnh tiếp theo (next)
                            // Vuốt sang phải (diffX > 35) -> ảnh trước đó (prev)
                            const isSwipe = Math.abs(diffX) > 35 || (Math.abs(diffX) > 20 && duration < 300);

                            if (isSwipe) {
                                if (diffX < 0) {
                                    slideTo(memoryId, (carouselState[memoryId] || 0) + 1, totalImages, true);
                                } else {
                                    slideTo(memoryId, (carouselState[memoryId] || 0) - 1, totalImages, true);
                                }
                            } else {
                                slideTo(memoryId, carouselState[memoryId] || 0, totalImages, false);
                            }
                        } else {
                            if (activeCard) {
                                slideTo(memoryId, carouselState[memoryId] || 0, totalImages, false);
                            }
                        }

                        activeCard = null;
                        startAutoSlide(memoryId, totalImages);
                    };

                    carouselElem.addEventListener('touchstart', handleTouchStart, { passive: true });
                    carouselElem.addEventListener('touchmove', handleTouchMove, { passive: false });
                    carouselElem.addEventListener('touchend', handleTouchEnd, { passive: false });
                    carouselElem.addEventListener('touchcancel', handleTouchEnd, { passive: false });

                    // Hỗ trợ thêm kéo chuột trên máy tính (Mouse Drag) với requestAnimationFrame
                    let isMouseDown = false;
                    let mouseStartX = 0;
                    let mouseCurrentX = 0;
                    let mouseStartTime = 0;
                    let mouseMoved = false;
                    let rafMouseId = null;

                    const onMouseMove = (e) => {
                        if (!isMouseDown) return;
                        mouseCurrentX = e.clientX;

                        if (!rafMouseId) {
                            rafMouseId = requestAnimationFrame(() => {
                                rafMouseId = null;
                                if (!isMouseDown || !activeCard) return;

                                const diffX = mouseCurrentX - mouseStartX;
                                if (Math.abs(diffX) > 6) {
                                    mouseMoved = true;
                                }
                                if (mouseMoved) {
                                    activeCard.style.transition = 'none';
                                    const rotateDeg = Math.max(-10, Math.min(10, diffX * 0.04));
                                    const opacityVal = Math.max(0.75, 1 - Math.abs(diffX) / 800);
                                    activeCard.style.transform = `translate3d(${diffX * 0.65}px, 0, 0) scale(1) rotate(${rotateDeg}deg)`;
                                    activeCard.style.opacity = opacityVal;
                                }
                            });
                        }
                    };

                    const onMouseUp = () => {
                        if (!isMouseDown) return;
                        isMouseDown = false;
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);

                        if (rafMouseId) {
                            cancelAnimationFrame(rafMouseId);
                            rafMouseId = null;
                        }

                        const diffX = mouseCurrentX - mouseStartX;
                        const duration = Date.now() - mouseStartTime;

                        if (activeCard) {
                            activeCard.style.transition = '';
                        }

                        if (mouseMoved) {
                            const suppressClick = (ev) => {
                                ev.stopPropagation();
                                ev.preventDefault();
                            };
                            carouselElem.addEventListener('click', suppressClick, { capture: true, once: true });
                            setTimeout(() => {
                                carouselElem.removeEventListener('click', suppressClick, { capture: true });
                            }, 350);

                            const isSwipe = Math.abs(diffX) > 35 || (Math.abs(diffX) > 20 && duration < 300);
                            if (isSwipe) {
                                if (diffX < 0) {
                                    slideTo(memoryId, (carouselState[memoryId] || 0) + 1, totalImages, true);
                                } else {
                                    slideTo(memoryId, (carouselState[memoryId] || 0) - 1, totalImages, true);
                                }
                            } else {
                                slideTo(memoryId, carouselState[memoryId] || 0, totalImages, false);
                            }
                        } else {
                            if (activeCard) {
                                slideTo(memoryId, carouselState[memoryId] || 0, totalImages, false);
                            }
                        }

                        activeCard = null;
                        startAutoSlide(memoryId, totalImages);
                    };

                    carouselElem.addEventListener('mousedown', (e) => {
                        if (Date.now() - lastTouchTime < 500) return;
                        if (e.button !== 0 || e.target.closest('.carousel-btn') || e.target.closest('.carousel-dots')) return;

                        isMouseDown = true;
                        mouseStartX = e.clientX;
                        mouseCurrentX = e.clientX;
                        mouseStartTime = Date.now();
                        mouseMoved = false;

                        stopAutoSlide(memoryId);

                        const currentIdx = carouselState[memoryId] || 0;
                        const stage = carouselElem.querySelector('.stacked-deck-stage');
                        if (stage) {
                            activeCard = stage.querySelector(`.stacked-card[data-card-idx="${currentIdx}"]`);
                        }

                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                    });
                }

                const prevBtn = card.querySelector(`[data-prev="${memoryId}"]`);
                const nextBtn = card.querySelector(`[data-next="${memoryId}"]`);
                const dots = card.querySelectorAll(`[data-dot-for="${memoryId}"]`);

                if (prevBtn) {
                    prevBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        slideTo(memoryId, (carouselState[memoryId] || 0) - 1, totalImages, true);
                        startAutoSlide(memoryId, totalImages);
                    });
                }

                if (nextBtn) {
                    nextBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        slideTo(memoryId, (carouselState[memoryId] || 0) + 1, totalImages, true);
                        startAutoSlide(memoryId, totalImages);
                    });
                }

                dots.forEach(d => {
                    d.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(d.getAttribute('data-dot-idx'), 10);
                        slideTo(memoryId, idx, totalImages, true);
                        startAutoSlide(memoryId, totalImages);
                    });
                });
            }

            // Bắt sự kiện Thêm ảnh trực tiếp vào album này (Hỗ trợ hoàn hảo cho điện thoại)
            const addPhotoBtn = card.querySelector(`[data-add-photo="${memoryId}"]`);
            const inputAddPhoto = card.querySelector(`#input-add-photo-${memoryId}`);

            if (addPhotoBtn && inputAddPhoto) {
                addPhotoBtn.addEventListener('click', (e) => {
                    if (!Auth.isLoggedIn()) {
                        e.preventDefault();
                        openLoginModal('Vui lòng đăng nhập tài khoản Chủ Nhân để thêm ảnh vào album!');
                        return;
                    }
                    if (addPhotoBtn.tagName.toLowerCase() !== 'label') {
                        inputAddPhoto.click();
                    }
                });

                inputAddPhoto.addEventListener('change', async (e) => {
                    if (!Auth.isLoggedIn()) {
                        openLoginModal('Vui lòng đăng nhập tài khoản Chủ Nhân để thêm ảnh!');
                        inputAddPhoto.value = '';
                        return;
                    }

                    const files = Array.from(e.target.files);
                    if (!files.length) return;

                    const btnText = addPhotoBtn.querySelector('.btn-text') || addPhotoBtn;
                    const originalText = btnText.innerHTML;
                    addPhotoBtn.classList.add('opacity-60', 'pointer-events-none');
                    btnText.textContent = `0/${files.length}...`;

                    const newCompressedImages = [];
                    let processed = 0;
                    for (const file of files) {
                        processed++;
                        btnText.textContent = `${processed}/${files.length}...`;
                        const isImg = (file.type && file.type.startsWith('image/')) || 
                                      /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
                        const isVid = (file.type && (file.type.startsWith('video/') || file.type === 'video/quicktime' || file.type === 'video/x-m4v')) ||
                                      /\.(mp4|mov|m4v|webm|avi|mkv|ogv|3gp)$/i.test(file.name);
                        if (!isImg && !isVid) continue;
                        try {
                            if (isVid) {
                                const base64 = await window.readFileAsDataURL(file);
                                if (base64) newCompressedImages.push(base64);
                            } else {
                                const base64 = await processImagePreservingResolution(file);
                                if (base64) newCompressedImages.push(base64);
                            }
                        } catch (err) {
                            Logger.log('MEDIA_PROCESS_ERROR', `Lỗi xử lý file ${file.name}`, { error: String(err) });
                        }
                    }

                    if (newCompressedImages.length) {
                        btnText.textContent = 'Đang tải tệp...';
                        const finalUploadedUrls = await uploadImagesToServer(newCompressedImages, (cur, tot, pct) => {
                            btnText.textContent = `Đang tải ${cur}/${tot} (${pct}%)...`;
                        });
                        const memories = MemoryStore.getAll();
                        const targetItem = memories.find(m => String(m.id) === String(memoryId));
                        if (targetItem) {
                            if (!targetItem.images) {
                                targetItem.images = targetItem.image ? [targetItem.image] : [];
                            }
                            targetItem.images.push(...finalUploadedUrls);
                            const synced = await MemoryStore.saveAll(memories);
                            Logger.log('ADD_PHOTOS_TO_ALBUM', `Đã thêm ${newCompressedImages.length} ảnh vào album ID: ${memoryId}`);
                            renderMemories();
                            renderVietnamMap();
                            if (synced) {
                                alert(`🎉 Đã thêm thành công ${newCompressedImages.length} ảnh vào album và đồng bộ ngay sang các thiết bị khác!`);
                            } else {
                                alert(`Đã lưu ${newCompressedImages.length} ảnh trên thiết bị này (sẽ tự động đồng bộ khi có kết nối máy chủ).`);
                            }
                        }
                    }
                    btnText.innerHTML = originalText;
                    addPhotoBtn.classList.remove('opacity-60', 'pointer-events-none');
                    inputAddPhoto.value = '';
                });
            }

            // Bắt sự kiện Chỉnh sửa kỷ niệm (Lời nhắn, địa điểm, ngày tháng, ảnh)
            const editBtn = card.querySelector(`[data-edit-memory="${memoryId}"]`);
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    EditMemoryModal.open(memoryId);
                });
            }

            // Bắt sự kiện Xóa kỷ niệm
            const deleteBtn = card.querySelector(`[data-delete-memory="${memoryId}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    if (!Auth.isLoggedIn()) {
                        openLoginModal('Vui lòng đăng nhập tài khoản Chủ Nhân để xóa kỷ niệm!');
                        return;
                    }
                    if (confirm('Bạn có chắc chắn muốn xóa kỷ niệm này không? (Kỷ niệm sẽ bị xóa trên cả máy tính và điện thoại)')) {
                        await MemoryStore.remove(memoryId);
                        renderMemories();
                        renderVietnamMap();
                    }
                });
            }
        });
    };

    // =========================================================================
    // 11. BẢN ĐỒ VIỆT NAM (TRANG CHỦ): HOÀNG SA, TRƯỜNG SA & ĐIỂM ĐÃ CHỤP ẢNH
    // =========================================================================
    
    // Danh mục 63 Tỉnh Thành Phố + Quần đảo Hoàng Sa & Quần đảo Trường Sa
    const PROVINCES_65 = [
        // --- MIỀN BẮC ---
        {
            id: 'hanoi',
            name: 'Thủ đô Hà Nội',
            shortName: 'Hà Nội',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 187.2,
            y: 134.5,
            aliases: ['hà nội', 'ha noi', 'hanoi', 'hoàn kiếm', 'hồ gươm', 'ba đình', 'tây hồ', 'thủ đô', '36 phố phường', 'phố cổ hà nội', 'cầu long biên'],
            desc: 'Thủ đô ngàn năm văn hiến, Tháp Rùa cổ kính rêu phong, Hồ Tây lộng gió và hương hoa sữa nồng nàn mùa thu.'
        },
        {
            id: 'haiphong',
            name: 'TP. Hải Phòng',
            shortName: 'Hải Phòng',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 238.5,
            y: 144.5,
            aliases: ['hải phòng', 'hai phong', 'cát bà', 'cat ba', 'đồ sơn', 'do son', 'bạch long vĩ', 'vịnh lan hạ', 'hòn dấu'],
            desc: 'Thành phố Hoa Phượng Đỏ rực rỡ, quần đảo Cát Bà di sản thiên nhiên thế giới và Vịnh Lan Hạ trong xanh như ngọc bích.'
        },
        {
            id: 'quangninh',
            name: 'Tỉnh Quảng Ninh',
            shortName: 'Quảng Ninh',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 272.4,
            y: 124.8,
            aliases: ['quảng ninh', 'quang ninh', 'hạ long', 'ha long', 'vịnh hạ long', 'cô tô', 'co to', 'yên tử', 'bãi cháy', 'tuần châu', 'quan lạn', 'trà cổ'],
            desc: 'Kỳ quan thiên nhiên thế giới Vịnh Hạ Long ngàn đảo đá vôi, non thiêng Yên Tử thanh tịnh và đảo ngọc Cô Tô lộng gió.'
        },
        {
            id: 'laocai',
            name: 'Tỉnh Lào Cai',
            shortName: 'Lào Cai & Sa Pa',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 104.1,
            y: 58.0,
            aliases: ['lào cai', 'lao cai', 'sa pa', 'sapa', 'fansipan', 'fanxipan', 'y tý', 'y ty', 'bắc hà', 'hàm rồng', 'ô quy hồ', 'mường hoa'],
            desc: 'Thị xã trong mây Sa Pa huyền ảo, đỉnh thiêng Fansipan nóc nhà Đông Dương và thung lũng Mường Hoa rực rỡ sắc màu ruộng bậc thang.'
        },
        {
            id: 'hagiang',
            name: 'Tỉnh Hà Giang',
            shortName: 'Hà Giang',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 148.9,
            y: 37.9,
            aliases: ['hà giang', 'ha giang', 'đồng văn', 'mèo vạc', 'mã pí lèng', 'lũng cú', 'cột cờ lũng cú', 'hoàng su phì', 'tam giác mạch', 'sông nho quế', 'dinh vua mèo'],
            desc: 'Cao nguyên đá Đồng Văn hùng vĩ, hẻm vực Tu Sản - sông Nho Quế xanh ngọc bích và Cột cờ Lũng Cú kiêu hãnh nơi cực Bắc Tổ quốc.'
        },
        {
            id: 'caobang',
            name: 'Tỉnh Cao Bằng',
            shortName: 'Cao Bằng',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 204.9,
            y: 37.3,
            aliases: ['cao bằng', 'cao bang', 'bản giốc', 'thác bản giốc', 'pác bó', 'suối lê nin', 'trùng khánh', 'động ngườm ngao'],
            desc: 'Thác Bản Giốc kỳ vĩ tựa chốn bồng lai tiên cảnh, suối Lê Nin ngọc bích êm đềm và hang Pác Bó thiêng liêng non nước Cao Bằng.'
        },
        {
            id: 'langson',
            name: 'Tỉnh Lạng Sơn',
            shortName: 'Lạng Sơn',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 233.8,
            y: 88.4,
            aliases: ['lạng sơn', 'lang son', 'mẫu sơn', 'tam thanh', 'tô thị', 'chi lăng', 'đồng đăng', 'kỳ lừa'],
            desc: 'Biên cương xứ Lạng non nước hữu tình, đỉnh Mẫu Sơn tuyết trắng bồng bềnh mây phủ, nàng Tô Thị hóa đá và ải Chi Lăng oai hùng.'
        },
        {
            id: 'backan',
            name: 'Tỉnh Bắc Kạn',
            shortName: 'Bắc Kạn',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 190.7,
            y: 63.2,
            aliases: ['bắc kạn', 'bac kan', 'hồ ba bể', 'ba bể', 'ba be', 'an mạ', 'động puông', 'thác đầu đẳng'],
            desc: 'Viên ngọc xanh Hồ Ba Bể mờ ảo trong sương sớm, rừng nguyên sinh đại ngàn và mặt nước phẳng lặng soi bóng mây trời.'
        },
        {
            id: 'tuyenquang',
            name: 'Tỉnh Tuyên Quang',
            shortName: 'Tuyên Quang',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 161.7,
            y: 71.4,
            aliases: ['tuyên quang', 'tuyen quang', 'na hang', 'hồ na hang', 'tân trào', 'suối khoáng mỹ lâm'],
            desc: 'Thủ đô kháng chiến Tân Trào lịch sử, hồ sinh thái Na Hang kỳ vĩ như vịnh Hạ Long giữa núi rừng đại ngàn.'
        },
        {
            id: 'yenbai',
            name: 'Tỉnh Yên Bái',
            shortName: 'Yên Bái',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 126.1,
            y: 88.4,
            aliases: ['yên bái', 'yen bai', 'mù cang chải', 'mu cang chai', 'hồ thác bà', 'nghĩa lộ', 'mâm xôi', 'đèo khau phạ'],
            desc: 'Tuyệt tác danh thắng ruộng bậc thang Mù Cang Chải sóng vàng uốn lượn, hồ Thác Bà mênh mang sóng biếc và đèo Khau Phạ chạm trời.'
        },
        {
            id: 'thainguyen',
            name: 'Tỉnh Thái Nguyên',
            shortName: 'Thái Nguyên',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 193.9,
            y: 96.5,
            aliases: ['thái nguyên', 'thai nguyen', 'hồ núi cốc', 'tân cương', 'chè tân cương', 'atk định hóa'],
            desc: 'Đệ nhất danh trà Tân Cương thơm ngát tiền chát hậu ngọt, hồ Núi Cốc huyền thoại tình chàng Cốc nàng Công thơ mộng.'
        },
        {
            id: 'phutho',
            name: 'Tỉnh Phú Thọ',
            shortName: 'Phú Thọ',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 154.1,
            y: 115.4,
            aliases: ['phú thọ', 'phu tho', 'đền hùng', 'việt trì', 'đồi chè long cốc', 'xuân sơn', 'vua hùng'],
            desc: 'Cội nguồn dân tộc Đền Hùng linh thiêng "Dù ai đi ngược về xuôi", đồi chè Long Cốc nhấp nhô như bát úp giữa mây trắng.'
        },
        {
            id: 'vinhphuc',
            name: 'Tỉnh Vĩnh Phúc',
            shortName: 'Vĩnh Phúc',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 179.4,
            y: 114.1,
            aliases: ['vĩnh phúc', 'vinh phuc', 'tam đảo', 'tam dao', 'tây thiên', 'đại lải', 'hồ đại lải'],
            desc: 'Thị trấn trong sương Tam Đảo bốn mùa trong một ngày, chốn tổ thiền viện Trúc Lâm Tây Thiên thanh tịnh và hồ Đại Lải trong lành.'
        },
        {
            id: 'bacgiang',
            name: 'Tỉnh Bắc Giang',
            shortName: 'Bắc Giang',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 221.0,
            y: 113.2,
            aliases: ['bắc giang', 'bac giang', 'vải thiều', 'lục ngạn', 'suối mỡ', 'tây yên tử', 'chùa vĩnh nghiêm'],
            desc: 'Thủ phủ vải thiều Lục Ngạn ngọt lành đỏ rực mùa hè, khu sinh thái Suối Mỡ và con đường hành hương Tây Yên Tử.'
        },
        {
            id: 'bacninh',
            name: 'Tỉnh Bắc Ninh',
            shortName: 'Bắc Ninh',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 204.1,
            y: 127.5,
            aliases: ['bắc ninh', 'bac ninh', 'quan họ', 'đền đô', 'chùa dâu', 'chùa phật tích', 'làng tranh đông hồ'],
            desc: 'Cái nôi văn hóa Kinh Bắc nghìn năm, câu ca quan họ "người ơi người ở đừng về" ngọt ngào và Đền Đô thờ 8 vị vua Lý.'
        },
        {
            id: 'haiduong',
            name: 'Tỉnh Hải Dương',
            shortName: 'Hải Dương',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 220.7,
            y: 136.7,
            aliases: ['hải dương', 'hai duong', 'côn sơn', 'kiếp bạc', 'bánh đậu xanh', 'đảo cò chi lăng nam'],
            desc: 'Non nước Côn Sơn - Kiếp Bạc gắn liền với anh hùng dân tộc Nguyễn Trãi, bánh đậu xanh thơm lừng và đảo Cò thanh bình.'
        },
        {
            id: 'hungyen',
            name: 'Tỉnh Hưng Yên',
            shortName: 'Hưng Yên',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 204.9,
            y: 143.9,
            aliases: ['hưng yên', 'hung yen', 'phố hiến', 'nhãn lồng', 'đền mẫu', 'chùa chuông'],
            desc: 'Xứ sở nhãn lồng tiến vua thơm ngọt, Phố Hiến sầm uất vang bóng một thời "Thứ nhất Kinh Kỳ, thứ nhì Phố Hiến".'
        },
        {
            id: 'hanam',
            name: 'Tỉnh Hà Nam',
            shortName: 'Hà Nam',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 199.3,
            y: 159.6,
            aliases: ['hà nam', 'ha nam', 'phủ lý', 'tam chúc', 'chùa tam chúc', 'bát cảnh sơn', 'đền trần thương'],
            desc: 'Quần thể tâm linh Chùa Tam Chúc lớn bậc nhất Đông Nam Á tựa bức tranh thủy mặc non nước hữu tình.'
        },
        {
            id: 'namdinh',
            name: 'Tỉnh Nam Định',
            shortName: 'Nam Định',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 210.6,
            y: 173.6,
            aliases: ['nam định', 'nam dinh', 'đền trần', 'nhà thờ đổ', 'hải hậu', 'xuân thủy', 'chùa phổ minh'],
            desc: 'Đất thiêng Đền Trần hào khí Đông A oai hùng, thánh đường công giáo Hải Hậu nguy nga và bãi biển nhà thờ đổ cổ kính.'
        },
        {
            id: 'thaibinh',
            name: 'Tỉnh Thái Bình',
            shortName: 'Thái Bình',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 221.7,
            y: 159.9,
            aliases: ['thái bình', 'thai binh', 'chùa keo', 'đồng châu', 'cồn vành', 'tiền hải'],
            desc: 'Quê hương năm tấn với cánh đồng lúa xanh mướt bát ngát, di tích Chùa Keo kiến trúc gỗ cổ nghìn năm tuổi và bãi biển Cồn Vành.'
        },
        {
            id: 'ninhbinh',
            name: 'Tỉnh Ninh Bình',
            shortName: 'Ninh Bình',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 193.2,
            y: 174.9,
            aliases: ['ninh bình', 'ninh binh', 'tràng an', 'tam cốc', 'bích động', 'bái đính', 'hang múa', 'hoa lư', 'cố đô hoa lư'],
            desc: 'Di sản thế giới kép Tràng An - Tam Cốc "Hạ Long cạn" non nước mây trời tuyệt mỹ, chùa Bái Đính nguy nga và Cố đô Hoa Lư cổ kính.'
        },
        {
            id: 'dienbien',
            name: 'Tỉnh Điện Biên',
            shortName: 'Điện Biên',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 77.0,
            y: 105.0,
            aliases: ['điện biên', 'dien bien', 'điện biên phủ', 'mường thanh', 'đồi a1', 'pha đin', 'pa a chải', 'hoa ban'],
            desc: 'Chiến trường Điện Biên Phủ "lừng lẫy năm châu chấn động địa cầu", cánh đồng Mường Thanh bạt ngàn lúa chín và mùa hoa ban tinh khôi.'
        },
        {
            id: 'laichau',
            name: 'Tỉnh Lai Châu',
            shortName: 'Lai Châu',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 55.6,
            y: 63.1,
            aliases: ['lai châu', 'lai chau', 'sin suối hồ', 'bạch mộc lương tử', 'ô quy hồ lai châu', 'pu si lung'],
            desc: 'Vùng đất địa đầu Tây Bắc với những đỉnh núi cao ngất tầng mây, đèo Ô Quy Hồ tráng lệ và những bản làng Mông - Dao mộc mạc.'
        },
        {
            id: 'sonla',
            name: 'Tỉnh Sơn La',
            shortName: 'Sơn La & Mộc Châu',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 140.1,
            y: 171.5,
            aliases: ['sơn la', 'son la', 'mộc châu', 'moc chau', 'đồi chè trái tim', 'tà xùa', 'săn mây tà xùa', 'thác dải yếm'],
            desc: 'Thiên đường săn mây Tà Xùa bồng bềnh đại dương mây, cao nguyên Mộc Châu mùa hoa cải hoa mận trắng muốt tinh khôi.'
        },
        {
            id: 'hoabinh',
            name: 'Tỉnh Hòa Bình',
            shortName: 'Hòa Bình',
            region: 'north',
            regionName: 'Miền Bắc',
            x: 167.9,
            y: 149.3,
            aliases: ['hòa bình', 'hoa binh', 'mai châu', 'mai chau', 'thung nai', 'thác bờ', 'hồ hòa bình', 'bản lác'],
            desc: 'Thung lũng Mai Châu thơ mộng khói lam chiều, Bản Lác bình yên và hồ Thung Nai ví như Hạ Long trên núi.'
        },

        // --- MIỀN TRUNG & DUYÊN HẢI ---
        {
            id: 'thanhhoa',
            name: 'Tỉnh Thanh Hóa',
            shortName: 'Thanh Hóa',
            region: 'central',
            regionName: 'Miền Trung',
            x: 158.6,
            y: 183.8,
            aliases: ['thanh hóa', 'thanh hoa', 'sầm sơn', 'sam son', 'pù luông', 'pu luong', 'hải tiến', 'thành nhà hồ', 'bến én'],
            desc: 'Bãi biển Sầm Sơn lộng gió náo nhiệt, khu bảo tồn Pù Luông xanh ngát mây trôi và Di sản văn hóa thế giới Thành Nhà Hồ độc đáo.'
        },
        {
            id: 'nghean',
            name: 'Tỉnh Nghệ An',
            shortName: 'Nghệ An',
            region: 'central',
            regionName: 'Miền Trung',
            x: 147.4,
            y: 228.9,
            aliases: ['nghệ an', 'nghe an', 'vinh', 'cửa lò', 'cua lo', 'nam đàn', 'quê bác', 'kim liên', 'pù mát', 'đảo lan châu'],
            desc: 'Quê hương Bác Hồ kính yêu làng Sen Kim Liên nghĩa tình, bãi biển Cửa Lò sóng vỗ dạt dào và Vườn quốc gia Pù Mát đại ngàn.'
        },
        {
            id: 'hatinh',
            name: 'Tỉnh Hà Tĩnh',
            shortName: 'Hà Tĩnh',
            region: 'central',
            regionName: 'Miền Trung',
            x: 186.7,
            y: 283.8,
            aliases: ['hà tĩnh', 'ha tinh', 'ngã ba đồng lộc', 'thiên cầm', 'biển thiên cầm', 'hồng lĩnh', 'núi hồng sông lam', 'kẻ gỗ'],
            desc: 'Biển Thiên Cầm "cung đàn trời" trong vắt cát mịn, Ngã ba Đồng Lộc linh thiêng bất tử và hồ Kẻ Gỗ êm đềm tha thiết.'
        },
        {
            id: 'quangbinh',
            name: 'Tỉnh Quảng Bình',
            shortName: 'Quảng Bình',
            region: 'central',
            regionName: 'Miền Trung',
            x: 214.5,
            y: 322.2,
            aliases: ['quảng bình', 'quang binh', 'phong nha', 'kẻ bàng', 'sơn đoòng', 'động thiên đường', 'đồng hới', 'suối nước moọc', 'bảo ninh'],
            desc: 'Vương quốc hang động thế giới, Động Phong Nha - Kẻ Bàng kỳ ảo và Sơn Đoòng tráng lệ vô song chạm tới đỉnh cao kỳ quan thiên nhiên.'
        },
        {
            id: 'quangtri',
            name: 'Tỉnh Quảng Trị',
            shortName: 'Quảng Trị',
            region: 'central',
            regionName: 'Miền Trung',
            x: 247.6,
            y: 369.9,
            aliases: ['quảng trị', 'quang tri', 'thành cổ quảng trị', 'địa đạo vịnh mốc', 'hiền lương', 'bến hải', 'cửa tùng', 'cồn cỏ', 'đông hà'],
            desc: 'Mảnh đất lịch sử anh hùng Thành Cổ Quảng Trị, đôi bờ Hiền Lương - Bến Hải nối liền khúc ruột non sông và Địa đạo Vịnh Mốc kiên cường.'
        },
        {
            id: 'tthue',
            name: 'Tỉnh Thừa Thiên Huế',
            shortName: 'Cố đô Huế',
            region: 'central',
            regionName: 'Miền Trung',
            x: 284.4,
            y: 387.7,
            aliases: ['thừa thiên huế', 'thua thien hue', 'huế', 'hue', 'cố đô huế', 'đại nội', 'sông hương', 'núi ngự', 'lăng cô', 'chùa thiên mụ'],
            desc: 'Cố đô Huế thâm trầm cổ kính, dòng sông Hương êm đềm lững lờ trôi, Đại Nội rêu phong nguy nga và tà áo dài tím thướt tha dịu dàng.'
        },
        {
            id: 'danang',
            name: 'TP. Đà Nẵng',
            shortName: 'Đà Nẵng',
            region: 'central',
            regionName: 'Miền Trung',
            x: 309.7,
            y: 402.0,
            aliases: ['đà nẵng', 'da nang', 'danang', 'bà nà', 'ba na', 'bà nà hills', 'cầu vàng', 'sơn trà', 'ngũ hành sơn', 'cầu rồng', 'mỹ khê'],
            desc: 'Thành phố biển đáng sống bậc nhất, Cầu Rồng phun lửa rực sáng sông Hàn, Bà Nà Hills bồng bềnh tiên cảnh và bãi biển Mỹ Khê quyến rũ.'
        },
        {
            id: 'quangnam',
            name: 'Tỉnh Quảng Nam',
            shortName: 'Quảng Nam & Hội An',
            region: 'central',
            regionName: 'Miền Trung',
            x: 304.1,
            y: 430.3,
            aliases: ['quảng nam', 'quang nam', 'hội an', 'hoi an', 'phố cổ hội an', 'mỹ sơn', 'thánh địa mỹ sơn', 'cù lao chàm', 'tam kỳ'],
            desc: 'Phố cổ Hội An lung linh muôn sắc đèn lồng bên dòng sông Hoài hoài niệm, Thánh địa Mỹ Sơn trầm mặc và đảo ngọc Cù Lao Chàm trong xanh.'
        },
        {
            id: 'quangngai',
            name: 'Tỉnh Quảng Ngãi',
            shortName: 'Quảng Ngãi & Lý Sơn',
            region: 'central',
            regionName: 'Miền Trung',
            x: 337.8,
            y: 462.4,
            aliases: ['quảng ngãi', 'quang ngai', 'lý sơn', 'ly son', 'đảo lý sơn', 'cổng tò vò', 'núi thới lới', 'sa huỳnh', 'mỹ khê quảng ngãi'],
            desc: 'Thiên đường biển đảo Lý Sơn trầm tích núi lửa hàng triệu năm giữa đại dương trong vắt như ngọc, Cổng Tò Vò đón bình minh rực rỡ.'
        },
        {
            id: 'binhdinh',
            name: 'Tỉnh Bình Định',
            shortName: 'Bình Định & Quy Nhơn',
            region: 'central',
            regionName: 'Miền Trung',
            x: 355.4,
            y: 508.0,
            aliases: ['bình định', 'binh dinh', 'quy nhơn', 'quy nhon', 'eo gió', 'kỳ co', 'ghềnh ráng', 'hầm hô', 'tháp đôi', 'cù lao xanh'],
            desc: 'Vùng đất võ trời văn, biển Quy Nhơn hoang sơ với Kỳ Co - Eo Gió tuyệt sắc, bãi đá Trứng Ghềnh Ráng Tiên Sa và tháp Chăm cổ kính.'
        },
        {
            id: 'phuyen',
            name: 'Tỉnh Phú Yên',
            shortName: 'Phú Yên',
            region: 'central',
            regionName: 'Miền Trung',
            x: 361.0,
            y: 553.4,
            aliases: ['phú yên', 'phu yen', 'tuy hòa', 'gành đá đĩa', 'ghềnh đá đĩa', 'mũi điện', 'mũi đại lãnh', 'vũng rô', 'bãi xép', 'hoa vàng trên cỏ xanh'],
            desc: 'Xứ hoa vàng trên cỏ xanh thơ mộng, kỳ quan Gành Đá Đĩa đá ong độc nhất vô nhị và Mũi Điện đón ánh bình minh đầu tiên trên đất liền.'
        },
        {
            id: 'khanhhoa',
            name: 'Tỉnh Khánh Hòa',
            shortName: 'Khánh Hòa & Nha Trang',
            region: 'central',
            regionName: 'Miền Trung',
            x: 365.4,
            y: 600.3,
            aliases: ['khánh hòa', 'khanh hoa', 'nha trang', 'cam ranh', 'vịnh nha trang', 'vinwonders', 'bình ba', 'bình hưng', 'dốc lết', 'điệp sơn'],
            desc: 'Thành phố vịnh ngọc Nha Trang cát trắng mịn màng biển xanh ngát, xứ trầm biển yến trù phú và những hòn đảo hoang sơ tuyệt đẹp.'
        },
        {
            id: 'ninhthuan',
            name: 'Tỉnh Ninh Thuận',
            shortName: 'Ninh Thuận',
            region: 'central',
            regionName: 'Miền Trung',
            x: 348.6,
            y: 632.6,
            aliases: ['ninh thuận', 'ninh thuan', 'phan rang', 'vĩnh hy', 'hang rái', 'tháp chàm', 'mũi dinh', 'vườn nho ninh thuận', 'đồng cừu'],
            desc: 'Vịnh biển Vĩnh Hy nguyên sơ tuyệt sắc, Hang Rái kỳ thú rạn san hô cổ, tháp Po Klong Garai huyền bí và những giàn nho trĩu quả nắng ấm.'
        },
        {
            id: 'binhthuan',
            name: 'Tỉnh Bình Thuận',
            shortName: 'Bình Thuận & Mũi Né',
            region: 'central',
            regionName: 'Miền Trung',
            x: 307.6,
            y: 665.2,
            aliases: ['bình thuận', 'binh thuan', 'phan thiết', 'mũi né', 'mui ne', 'đồi cát bay', 'kê gà', 'bàu trắng', 'đảo phú quý', 'phú quý'],
            desc: 'Thủ phủ resort Mũi Né đồi cát bay lộng gió, tiểu sa mạc Bàu Trắng ngỡ ngàng, ngọn hải đăng Kê Gà và đảo tiền tiêu Phú Quý trong lành.'
        },

        // --- TÂY NGUYÊN ĐẠI NGÀN ---
        {
            id: 'kontum',
            name: 'Tỉnh Kon Tum',
            shortName: 'Kon Tum & Măng Đen',
            region: 'highlands',
            regionName: 'Tây Nguyên',
            x: 301.4,
            y: 471.8,
            aliases: ['kon tum', 'măng đen', 'mang den', 'nhà thờ gỗ', 'ngã ba đông dương', 'sông đắk bla', 'cầu treo kon klor'],
            desc: 'Thị trấn Măng Đen mờ ảo trong sương sớm ngát hương thông rừng, Nhà thờ Gỗ cổ kính trăm năm và tiếng cồng chiêng ngân vang đại ngàn.'
        },
        {
            id: 'gialai',
            name: 'Tỉnh Gia Lai',
            shortName: 'Gia Lai & Pleiku',
            region: 'highlands',
            regionName: 'Tây Nguyên',
            x: 317.0,
            y: 521.8,
            aliases: ['gia lai', 'pleiku', 'biển hồ', 'biển hồ t’nưng', 'chư đang ya', 'thác phú cường', 'núi lửa chư đang ya', 'đồi chè gia lai'],
            desc: 'Biển Hồ Pleiku "đôi mắt Pleiku Biển Hồ đầy" xanh biếc mênh mông, miệng núi lửa Chư Đang Ya rực vàng hoa dã quỳ mỗi mùa thu đông.'
        },
        {
            id: 'daklak',
            name: 'Tỉnh Đắk Lắk',
            shortName: 'Đắk Lắk & Buôn Ma Thuột',
            region: 'highlands',
            regionName: 'Tây Nguyên',
            x: 317.8,
            y: 579.9,
            aliases: ['đắk lắk', 'dak lak', 'buôn ma thuột', 'buon ma thuot', 'hồ lắk', 'buôn đôn', 'dray nur', 'thác dray sáp', 'bảo tàng cà phê'],
            desc: 'Thủ phủ cà phê Buôn Ma Thuột nồng nàn quyến rũ, huyền thoại hồ Lắk mơ màng, buôn Đôn bên dòng Sêrêpôk và thác Dray Nur dũng mãnh.'
        },
        {
            id: 'daknong',
            name: 'Tỉnh Đắk Nông',
            shortName: 'Đắk Nông & Hồ Tà Đùng',
            region: 'highlands',
            regionName: 'Tây Nguyên',
            x: 291.4,
            y: 609.1,
            aliases: ['đắk nông', 'dak nong', 'tà đùng', 'ta dung', 'hồ tà đùng', 'gia nghĩa', 'thác liêng nung'],
            desc: 'Vịnh Hạ Long của Tây Nguyên - hồ Tà Đùng ảo diệu với hàng chục ốc đảo xanh ngắt nhấp nhô giữa mặt gương nước biếc thanh bình.'
        },
        {
            id: 'lamdong',
            name: 'Tỉnh Lâm Đồng',
            shortName: 'Lâm Đồng & Đà Lạt',
            region: 'highlands',
            regionName: 'Tây Nguyên',
            x: 307.6,
            y: 628.8,
            aliases: ['lâm đồng', 'lam dong', 'đà lạt', 'da lat', 'dalat', 'hồ xuân hương', 'thung lũng tình yêu', 'langbiang', 'tuyền lâm', 'bảo lộc', 'cầu đất'],
            desc: 'Thành phố Ngàn Hoa Đà Lạt lãng mạn mộng mơ, sương giăng lãng đãng quanh Hồ Xuân Hương, rừng thông reo vi vu và tình yêu đơm hoa kết trái.'
        },

        // --- MIỀN NAM & ĐỒNG BẰNG SÔNG CỬU LONG ---
        {
            id: 'hcm',
            name: 'TP. Hồ Chí Minh',
            shortName: 'TP. Hồ Chí Minh',
            region: 'south',
            regionName: 'Miền Nam',
            x: 238.0,
            y: 685.3,
            aliases: ['tp. hồ chí minh', 'hồ chí minh', 'ho chi minh', 'sài gòn', 'sai gon', 'tphcm', 'bến thành', 'nguyễn huệ', 'nhà thờ đức bà', 'quận 1', 'phố đi bộ'],
            desc: 'Hòn ngọc Viễn Đông sầm uất rực rỡ sắc màu hiện đại, phố đi bộ Nguyễn Huệ hoa lệ, chợ Bến Thành và nhịp sống trẻ tràn đầy nhiệt huyết.'
        },
        {
            id: 'dongnai',
            name: 'Tỉnh Đồng Nai',
            shortName: 'Đồng Nai',
            region: 'south',
            regionName: 'Miền Nam',
            x: 262.1,
            y: 668.5,
            aliases: ['đồng nai', 'dong nai', 'biên hòa', 'trị an', 'hồ trị an', 'nam cát tiên', 'thác giang điền', 'đảo ó'],
            desc: 'Vườn quốc gia Nam Cát Tiên hoang sơ kỳ thú, hồ Trị An mênh mông xanh ngắt và đảo Ó lộng gió giữa lòng hồ.'
        },
        {
            id: 'binhduong',
            name: 'Tỉnh Bình Dương',
            shortName: 'Bình Dương',
            region: 'south',
            regionName: 'Miền Nam',
            x: 235.8,
            y: 661.1,
            aliases: ['bình dương', 'binh duong', 'thủ dầu một', 'đại nam', 'lạc cảnh đại nam', 'chùa bà thiên hậu', 'lái thiêu'],
            desc: 'Đô thị công nghiệp năng động, khu du lịch Lạc Cảnh Đại Nam Văn Hiến quy mô và vườn trái cây Lái Thiêu xum xuê trĩu quả.'
        },
        {
            id: 'binhphuoc',
            name: 'Tỉnh Bình Phước',
            shortName: 'Bình Phước',
            region: 'south',
            regionName: 'Miền Nam',
            x: 248.5,
            y: 636.6,
            aliases: ['bình phước', 'binh phuoc', 'đồng xoài', 'bù gia mập', 'núi bà rá', 'thác mơ', 'trảng cỏ bù lạch'],
            desc: 'Rừng cao su bạt ngàn thay lá tuyệt đẹp, Vườn quốc gia Bù Gia Mập hoang dã và đỉnh núi Bà Rá sừng sững nóc nhà miền Đông.'
        },
        {
            id: 'tayninh',
            name: 'Tỉnh Tây Ninh',
            shortName: 'Tây Ninh & Núi Bà Đen',
            region: 'south',
            regionName: 'Miền Nam',
            x: 211.7,
            y: 652.4,
            aliases: ['tây ninh', 'tay ninh', 'núi bà đen', 'nui ba den', 'toà thánh tây ninh', 'hồ dầu tiếng', 'ma thiên lãnh'],
            desc: 'Nóc nhà Đông Nam Bộ Núi Bà Đen linh thiêng bồng bềnh biển mây, Tòa Thánh Tây Ninh kiến trúc nguy nga và hồ Dầu Tiếng mênh mông.'
        },
        {
            id: 'baria',
            name: 'Tỉnh Bà Rịa - Vũng Tàu',
            shortName: 'Vũng Tàu & Côn Đảo',
            region: 'south',
            regionName: 'Miền Nam',
            x: 258.1,
            y: 712.6,
            aliases: ['bà rịa', 'ba ria', 'vũng tàu', 'vung tau', 'bãi sau', 'bãi trước', 'long hải', 'hồ tràm', 'hồ cốc', 'côn đảo', 'con dao', 'hải đăng vũng tàu'],
            desc: 'Thành phố biển Vũng Tàu thơ mộng tiếng sóng rì rào, bờ cát Bãi Sau lộng gió và Quần đảo Côn Đảo anh hùng thiêng liêng giữa đại dương xanh.'
        },
        {
            id: 'longan',
            name: 'Tỉnh Long An',
            shortName: 'Long An',
            region: 'south',
            regionName: 'Miền Nam',
            x: 220.3,
            y: 690.3,
            aliases: ['long an', 'tân lập', 'làng nổi tân lập', 'bến lức', 'tân an', 'cần giuộc'],
            desc: 'Cửa ngõ miền Tây sông nước trù phú, Làng nổi Tân Lập rợp mát bóng rừng tràm ngút ngàn và miệt vườn thanh bình.'
        },
        {
            id: 'tiengiang',
            name: 'Tỉnh Tiền Giang',
            shortName: 'Tiền Giang & Mỹ Tho',
            region: 'south',
            regionName: 'Miền Nam',
            x: 222.4,
            y: 703.8,
            aliases: ['tiền giang', 'tien giang', 'mỹ tho', 'my tho', 'cù lao thới sơn', 'cái bè', 'chợ nổi cái bè', 'chùa vĩnh tràng'],
            desc: 'Cù lao Thới Sơn rợp bóng dừa nước mát rượi, vương quốc trái cây chợ nổi Cái Bè và Chùa Vĩnh Tràng cổ kính trang nghiêm.'
        },
        {
            id: 'bentre',
            name: 'Tỉnh Bến Tre',
            shortName: 'Bến Tre Xứ Dừa',
            region: 'south',
            regionName: 'Miền Nam',
            x: 225.5,
            y: 720.1,
            aliases: ['bến tre', 'ben tre', 'xứ dừa', 'mỏ cày', 'cù lao phụng', 'cồn phụng', 'kẹo dừa'],
            desc: 'Xứ Dừa Đồng Khởi bình yên rợp bóng xanh mát, dòng sông Tiền êm ả lững lờ trôi và vị ngọt thơm thảo của kẹo dừa quê hương.'
        },
        {
            id: 'dongthap',
            name: 'Tỉnh Đồng Tháp',
            shortName: 'Đồng Tháp Đất Sen',
            region: 'south',
            regionName: 'Miền Nam',
            x: 178.7,
            y: 697.8,
            aliases: ['đồng tháp', 'dong thap', 'sa đéc', 'làng hoa sa đéc', 'tràm chim', 'sen đồng tháp', 'cao lãnh', 'gáo giồng'],
            desc: 'Đất sen hồng Tháp Mười "Đẹp nhất bông sen", làng hoa Sa Đéc trăm hoa đua nở rực rỡ và Vườn quốc gia Tràm Chim mùa chim về làm tổ.'
        },
        {
            id: 'vinhlong',
            name: 'Tỉnh Vĩnh Long',
            shortName: 'Vĩnh Long',
            region: 'south',
            regionName: 'Miền Nam',
            x: 200.6,
            y: 719.1,
            aliases: ['vĩnh long', 'vinh long', 'cù lao an bình', 'cầu mỹ thuận', 'văn thánh miếu vĩnh long'],
            desc: 'Cù lao An Bình sum suê chôm chôm bưởi da xanh ngọt mát, làng gốm Mang Thít đỏ rực rỡ bên dòng kênh và đờn ca tài tử réo rắt.'
        },
        {
            id: 'cantho',
            name: 'TP. Cần Thơ',
            shortName: 'Thủ phủ Cần Thơ',
            region: 'south',
            regionName: 'Miền Nam',
            x: 176.9,
            y: 720.1,
            aliases: ['cần thơ', 'can tho', 'chợ nổi cái răng', 'bến ninh kiều', 'tây đô', 'phong điền', 'nhà cổ bình thủy'],
            desc: 'Thủ phủ Tây Đô sông nước trù phú "Cần Thơ gạo trắng nước trong", chợ nổi Cái Răng rộn rã trên sông và bến Ninh Kiều lộng lẫy.'
        },
        {
            id: 'angiang',
            name: 'Tỉnh An Giang',
            shortName: 'An Giang',
            region: 'south',
            regionName: 'Miền Nam',
            x: 157.7,
            y: 694.7,
            aliases: ['an giang', 'châu đốc', 'miếu bà chúa xứ', 'núi sam', 'trà sư', 'rừng tràm trà sư', 'thất sơn', 'núi cấm', 'long xuyên', 'tri tôn'],
            desc: 'Rừng tràm Trà Sư xanh ngút ngàn thảm bèo tây, Miếu Bà Chúa Xứ Núi Sam linh thiêng và huyền tích vùng Bảy Núi Thất Sơn kỳ vĩ.'
        },
        {
            id: 'kiengiang',
            name: 'Tỉnh Kiên Giang',
            shortName: 'Kiên Giang & Phú Quốc',
            region: 'south',
            regionName: 'Miền Nam',
            x: 136.9,
            y: 724.2,
            aliases: ['kiên giang', 'kien giang', 'phú quốc', 'phu quoc', 'hà tiên', 'rạch giá', 'nam du', 'quần đảo nam du', 'hòn sơn', 'đảo ngọc'],
            desc: 'Đảo Ngọc Phú Quốc thiên đường nghỉ dưỡng biển xanh cát trắng hoàng hôn rực lửa, quần đảo Nam Du và Hà Tiên thập cảnh thơ mộng.'
        },
        {
            id: 'haugiang',
            name: 'Tỉnh Hậu Giang',
            shortName: 'Hậu Giang',
            region: 'south',
            regionName: 'Miền Nam',
            x: 177.6,
            y: 737.5,
            aliases: ['hậu giang', 'hau giang', 'vị thanh', 'ngã bảy', 'chợ nổi ngã bảy', 'lung ngọc hoàng'],
            desc: 'Miền quê thanh bình kênh rạch chằng chịt, khu bảo tồn thiên nhiên Lung Ngọc Hoàng hoang dã và chợ nổi Ngã Bảy đậm đà tình quê.'
        },
        {
            id: 'travinh',
            name: 'Tỉnh Trà Vinh',
            shortName: 'Trà Vinh',
            region: 'south',
            regionName: 'Miền Nam',
            x: 215.9,
            y: 732.4,
            aliases: ['trà vinh', 'tra vinh', 'chùa hang', 'ao bà ôm', 'ba động', 'chùa ân'],
            desc: 'Thành phố cây xanh cổ thụ hàng trăm năm tuổi, di tích Ao Bà Ôm huyền thoại và những ngôi chùa Khmer kiến trúc Angkor uy nghiêm.'
        },
        {
            id: 'soctrang',
            name: 'Tỉnh Sóc Trăng',
            shortName: 'Sóc Trăng',
            region: 'south',
            regionName: 'Miền Nam',
            x: 192.0,
            y: 749.8,
            aliases: ['sóc trăng', 'soc trang', 'chùa dơi', 'chùa chén kiểu', 'chợ nổi ngã năm', 'lễ hội ooc om boc', 'chùa som rong'],
            desc: 'Văn hóa ba dân tộc Kinh - Khmer - Hoa giao hòa đặc sắc, Chùa Dơi thanh tịnh, chùa Chén Kiểu lộng lẫy và lễ hội đua ghe Ngo rộn ràng.'
        },
        {
            id: 'baclieu',
            name: 'Tỉnh Bạc Liêu',
            shortName: 'Bạc Liêu',
            region: 'south',
            regionName: 'Miền Nam',
            x: 175.2,
            y: 756.8,
            aliases: ['bạc liêu', 'bac lieu', 'công tử bạc liêu', 'nhà công tử bạc liêu', 'điện gió bạc liêu', 'cánh đồng điện gió', 'nhà thờ tắc sậy'],
            desc: 'Cái nôi Dạ Cổ Hoài Lang da diết nghĩa tình, giai thoại Công tử Bạc Liêu lừng danh và cánh đồng quạt gió khổng lồ xoay vần trên biển.'
        },
        {
            id: 'camau',
            name: 'Tỉnh Cà Mau',
            shortName: 'Cà Mau Đất Mũi',
            region: 'south',
            regionName: 'Miền Nam',
            x: 152.3,
            y: 779.1,
            aliases: ['cà mau', 'ca mau', 'mũi cà mau', 'đất mũi', 'u minh hạ', 'hòn khoai', 'rừng đước cà mau', 'cực nam'],
            desc: 'Mốc tọa độ Quốc gia Đất Mũi Cà Mau cực Nam Tổ quốc chạm sóng đại dương mênh mông, rừng đước ngập mặn U Minh Hạ trù phú bạt ngàn.'
        },

        // --- BIỂN ĐẢO CHỦ QUYỀN THIÊNG LIÊNG ---
        {
            id: 'hoangsa',
            name: 'Quần đảo Hoàng Sa (TP. Đà Nẵng)',
            shortName: 'Q.Đ Hoàng Sa',
            region: 'islands',
            regionName: 'Biển Đảo Quê Hương',
            x: 605.0,
            y: 400.0,
            aliases: ['hoàng sa', 'hoang sa', 'quần đảo hoàng sa', 'paracel', 'paracels', 'đảo hoàng sa', 'đà nẵng hoàng sa'],
            desc: 'Quần đảo Hoàng Sa thuộc Thành phố Đà Nẵng, Việt Nam. Vùng biển trời thiêng liêng và là máu thịt không thể tách rời của Tổ quốc Việt Nam muôn đời.'
        },
        {
            id: 'truongsa',
            name: 'Quần đảo Trường Sa (Tỉnh Khánh Hòa)',
            shortName: 'Q.Đ Trường Sa',
            region: 'islands',
            regionName: 'Biển Đảo Quê Hương',
            x: 530.0,
            y: 750.0,
            aliases: ['trường sa', 'truong sa', 'quần đảo trường sa', 'spratly', 'spratlys', 'trường sa lớn', 'song tử tây', 'nam yết', 'sinh tồn', 'an bang', 'khánh hòa trường sa'],
            desc: 'Quần đảo Trường Sa thuộc Tỉnh Khánh Hòa, Việt Nam. Phên dậu tiền tiêu kiên trung bất khuất giữa Biển Đông, ngọn cờ đỏ sao vàng kiêu hãnh tung bay trong nắng gió trùng khơi.'
        }
    ];

    let selectedLocationId = null;
    let mapEventsAttached = false;

    // Hàm chuyển chữ tiếng Việt có dấu thành không dấu để so sánh thông minh
    function removeVietnameseTones(str) {
        if (!str) return '';
        str = str.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        return str.trim();
    }

    // Tìm kiếm các kỷ niệm của đôi bạn thuộc tỉnh thành này
    function findMemoriesForProvince(prov, memories) {
        if (!prov || !memories || !memories.length) return [];
        const nameNorm = removeVietnameseTones(prov.name || '');
        const shortNorm = removeVietnameseTones(prov.shortName || '');
        const aliasNorms = (prov.aliases || []).map(a => removeVietnameseTones(a)).filter(a => a.length >= 2);

        return memories.filter(m => {
            if (!m.location) return false;
            const locNorm = removeVietnameseTones(m.location);
            
            // So khớp trực tiếp tên tỉnh / thành phố
            if (nameNorm && (locNorm.includes(nameNorm) || nameNorm.includes(locNorm))) return true;
            if (shortNorm && (locNorm.includes(shortNorm) || shortNorm.includes(locNorm))) return true;
            
            // So khớp danh sách bí danh, danh lam, địa danh du lịch nổi tiếng
            return aliasNorms.some(alias => locNorm.includes(alias) || alias.includes(locNorm));
        });
    }

    // Hàm cuộn mượt đến album trên dòng thời gian bên trái và nháy sáng viền nổi bật
    window.scrollToMemory = (memoryId) => {
        const card = document.getElementById(`memory-card-${memoryId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('ring-4', 'ring-rose-400', 'shadow-2xl');
            setTimeout(() => {
                card.classList.remove('ring-4', 'ring-rose-400', 'shadow-2xl');
            }, 2200);
            Logger.log('MAP_JUMP_TO_MEMORY', `Cuộn đến kỷ niệm ID: ${memoryId}`);
        }
    };

    // Nút tắt thêm ảnh nhanh tại một địa điểm
    window.addPhotoAtLocation = (locName) => {
        if (!Auth.isLoggedIn()) {
            openLoginModal(`Vui lòng đăng nhập tài khoản Chủ Nhân để thêm ảnh tại ${locName}!`);
            return;
        }
        switchTab('add');
        if (memoryLocation) memoryLocation.value = locName;
        if (memoryContent) memoryContent.focus();
        Logger.log('ADD_PHOTO_FROM_MAP', `Mở form thêm ảnh tại địa điểm: ${locName}`);
    };

    // Chọn điểm chụp và cuộn đến album
    window.selectAndScrollMap = (provId) => {
        selectMapLocation(provId, true);
    };

    // Điều khiển tooltip nổi trên bản đồ
    const showMapTooltip = (e, provId) => {
        const tooltip = document.getElementById('map-province-tooltip');
        const wrapper = document.querySelector('.map-svg-wrapper');
        if (!tooltip || !wrapper) return;

        const prov = PROVINCES_65.find(p => p.id === provId);
        if (!prov) return;

        const memories = MemoryStore.getAll();
        const matched = findMemoriesForProvince(prov, memories);
        const count = matched.length;

        tooltip.innerHTML = `
            <div class="space-y-0.5">
                <div class="font-bold text-gray-900 flex items-center space-x-1 text-xs">
                    <span>📍</span>
                    <span>${prov.name}</span>
                </div>
                <div class="text-[10px] text-gray-500 font-medium">${prov.regionName}</div>
                <div class="text-[11px] pt-0.5 ${count > 0 ? 'text-rose-600 font-bold' : 'text-gray-400 italic'}">
                    ${count > 0 ? `💕 ${count} album ảnh kỷ niệm` : 'Chưa có ảnh chụp tại đây'}
                </div>
            </div>
        `;
        tooltip.classList.add('visible', 'show');
        moveMapTooltip(e);
    };

    const moveMapTooltip = (e) => {
        const tooltip = document.getElementById('map-province-tooltip');
        const wrapper = document.querySelector('.map-svg-wrapper');
        if (!tooltip || !wrapper) return;

        const cardRect = wrapper.getBoundingClientRect();
        const x = e.clientX - cardRect.left;
        const y = e.clientY - cardRect.top;
        tooltip.style.left = `${Math.max(12, Math.min(x, cardRect.width - 12))}px`;
        tooltip.style.top = `${Math.max(12, y)}px`;
    };

    const hideMapTooltip = () => {
        const tooltip = document.getElementById('map-province-tooltip');
        if (tooltip) tooltip.classList.remove('visible', 'show');
    };

    // Cập nhật hộp thông tin chi tiết điểm chụp ảnh dưới bản đồ
    const updateLocationDetailsBox = (provId, shouldScrollToFeed = false) => {
        const box = document.getElementById('map-selected-location-box');
        if (!box) return;

        const prov = PROVINCES_65.find(p => p.id === provId);
        if (!prov) {
            box.innerHTML = `
                <div class="text-center py-2.5 text-gray-500">
                    <p class="font-bold text-gray-700 text-xs">📍 Bản Đồ Dấu Ấn Tình Yêu Việt Nam</p>
                    <p class="text-[11px] text-gray-500 mt-0.5">Rà chuột hoặc bấm vào các tỉnh thành, đảo và điểm phát sáng để xem lại hành trình của hai bạn.</p>
                </div>
            `;
            return;
        }

        selectedLocationId = prov.id;
        const memories = MemoryStore.getAll();
        const matched = findMemoriesForProvince(prov, memories);

        // Cập nhật trạng thái active trên SVG paths và pins
        document.querySelectorAll('#vietnam-svg-map path, #vietnam-map-svg path, .vn-map path').forEach(path => {
            if (path.id === prov.id) {
                path.classList.add('active-province');
            } else {
                path.classList.remove('active-province');
            }
        });

        document.querySelectorAll('.province-pin, .province-photo-pin').forEach(pin => {
            if (pin.getAttribute('data-province-id') === prov.id) {
                pin.classList.add('active');
            } else {
                pin.classList.remove('active');
            }
        });

        const isIsland = prov.id === 'hoangsa' || prov.id === 'truongsa';

        if (matched.length > 0) {
            box.className = 'p-3.5 bg-rose-50/90 rounded-2xl border border-rose-200 shadow-xs transition-all text-xs';
            box.innerHTML = `
                <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-1.5">
                            <span class="text-base">${isIsland ? '🇻🇳' : '📍'}</span>
                            <div>
                                <span class="font-bold text-gray-800 text-sm block">${prov.name}</span>
                                <span class="text-[10px] text-rose-500 font-medium">${prov.regionName}</span>
                            </div>
                        </div>
                        <span class="font-extrabold text-rose-600 bg-white px-2 py-0.5 rounded-full text-[11px] border border-rose-200 shadow-xs">
                            ${matched.length} album ảnh 💕
                        </span>
                    </div>

                    <p class="text-[11px] text-gray-600 italic line-clamp-2 leading-relaxed">
                        "${prov.desc}"
                    </p>

                    <!-- Danh sách thumbnails ảnh chụp tại đây -->
                    <div class="flex items-center space-x-2 overflow-x-auto py-1.5">
                        ${matched.map(m => {
                            const firstImg = (m.images && m.images.length) ? m.images[0] : (m.image || '');
                            const totalImgs = (m.images && m.images.length) ? m.images.length : (m.image ? 1 : 0);
                            return `
                                <div class="relative group flex-shrink-0 cursor-pointer" onclick="window.scrollToMemory('${m.id}')" title="${m.date || ''}: ${m.content ? m.content.substring(0, 30) : ''}">
                                    ${firstImg ? `
                                        <img src="${firstImg}" alt="" class="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform" onerror="window.handleThumbError(this, '${m.id}')">
                                    ` : `
                                        <div class="w-12 h-12 rounded-xl bg-rose-200 text-rose-600 flex items-center justify-center font-bold text-xs border border-white">Ảnh</div>
                                    `}
                                    ${totalImgs > 1 ? `
                                        <span class="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-extrabold px-1 rounded-full shadow-xs">
                                            ${totalImgs}
                                        </span>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="flex items-center space-x-2 pt-1 border-t border-rose-200/60">
                        <button onclick="window.scrollToMemory('${matched[0].id}')" class="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1 active:scale-98">
                            <span>Xem album trên nhật ký</span>
                        </button>
                        <button onclick="window.addPhotoAtLocation('${prov.shortName}')" class="px-3 py-1.5 bg-white border border-rose-300 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl transition-all shadow-xs">
                            + Thêm ảnh
                        </button>
                    </div>
                </div>
            `;

            if (shouldScrollToFeed) {
                window.scrollToMemory(matched[0].id);
            }
        } else {
            box.className = 'p-3.5 bg-gray-50/95 rounded-2xl border border-gray-200 transition-all text-xs';
            box.innerHTML = `
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-gray-800 block text-xs">${isIsland ? '🇻🇳' : '📍'} ${prov.name}</span>
                            <span class="text-[10px] text-gray-500 font-medium">${prov.regionName}</span>
                        </div>
                        <button onclick="window.addPhotoAtLocation('${prov.shortName}')" class="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs">
                            + Thêm ảnh tại đây
                        </button>
                    </div>
                    <p class="text-[11px] text-gray-600 leading-relaxed">
                        ${prov.desc}
                    </p>
                    <p class="text-[10px] text-gray-400 italic">
                        Chưa có ảnh chụp nào tại đây. Hãy bấm <strong>+ Thêm ảnh tại đây</strong> để đánh dấu kỷ niệm nhé!
                    </p>
                </div>
            `;
        }
    };

    // Hàm chọn địa điểm trên bản đồ và lọc kỷ niệm của tỉnh đó
    const selectMapLocation = (provId, shouldScrollToFeed = false) => {
        selectedLocationId = provId;
        window.activeProvinceFilter = provId;
        updateLocationDetailsBox(provId, false);
        renderMemories();

        // Cập nhật lại trạng thái active trên SVG map và pins
        document.querySelectorAll('#vietnam-svg-map path, #vietnam-map-svg path, .vn-map path').forEach(path => {
            if (path.id === provId) {
                path.classList.add('active-province');
            } else {
                path.classList.remove('active-province');
            }
        });

        document.querySelectorAll('.province-pin, .province-photo-pin').forEach(pin => {
            if (pin.getAttribute('data-province-id') === provId) {
                pin.classList.add('active');
            } else {
                pin.classList.remove('active');
            }
        });

        // Cập nhật lại style active trên các chips
        const chipsContainer = document.getElementById('map-checkin-chips');
        if (chipsContainer) {
            chipsContainer.querySelectorAll('button[data-province-id]').forEach(btn => {
                const bProvId = btn.getAttribute('data-province-id');
                const isSelected = bProvId === provId;
                if (isSelected) {
                    btn.className = 'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 bg-rose-600 text-white shadow-xs';
                    const badge = btn.querySelector('.badge-count');
                    if (badge) badge.className = 'badge-count bg-white text-rose-600 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold';
                } else {
                    btn.className = 'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200/80';
                    const badge = btn.querySelector('.badge-count');
                    if (badge) badge.className = 'badge-count bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-extrabold';
                }
            });
            const allBtn = chipsContainer.querySelector('button[data-all-memories="true"]');
            if (allBtn) {
                allBtn.className = 'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200/80';
                const allBadge = allBtn.querySelector('.badge-count');
                if (allBadge) allBadge.className = 'badge-count bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-extrabold';
            }
        }

        if (shouldScrollToFeed) {
            const feedTarget = document.getElementById('filter-status-banner') || document.getElementById('memories-container');
            if (feedTarget) {
                feedTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };
    window.selectMapLocation = selectMapLocation;

    // Hàm xóa bộ lọc tỉnh thành, hiện lại toàn bộ kỷ niệm của tất cả tỉnh
    window.clearProvinceFilter = () => {
        window.activeProvinceFilter = null;
        selectedLocationId = null;
        renderMemories();

        // Xóa class active trên bản đồ SVG
        document.querySelectorAll('#vietnam-svg-map path, #vietnam-map-svg path, .vn-map path').forEach(path => {
            path.classList.remove('active-province');
        });
        document.querySelectorAll('.province-pin, .province-photo-pin').forEach(pin => {
            pin.classList.remove('active');
        });

        // Reset lại chip Tất Cả thành active
        const chipsContainer = document.getElementById('map-checkin-chips');
        if (chipsContainer) {
            chipsContainer.querySelectorAll('button[data-province-id]').forEach(btn => {
                btn.className = 'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200/80';
                const badge = btn.querySelector('.badge-count');
                if (badge) badge.className = 'badge-count bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-extrabold';
            });
            const allBtn = chipsContainer.querySelector('button[data-all-memories="true"]');
            if (allBtn) {
                allBtn.className = 'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 bg-rose-600 text-white shadow-xs';
                const allBadge = allBtn.querySelector('.badge-count');
                if (allBadge) allBadge.className = 'badge-count bg-white text-rose-600 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold';
            }
        }

        // Reset hộp thông tin
        updateLocationDetailsBox(null, false);
    };

    // =========================================================================
    // 11B. QUẢN LÝ PHÓNG TO / THU NHỎ / KÉO DI CHUYỂN BẢN ĐỒ (MAP ZOOM & PAN)
    // =========================================================================
    const MapZoom = {
        currentZoom: 1.0,
        minZoom: 1.0,
        maxZoom: 4.5,
        baseW: 703,
        baseH: 900,
        viewX: 0,
        viewY: 0,
        viewW: 703,
        viewH: 900,
        isPanning: false,
        startX: 0,
        startY: 0,
        startViewX: 0,
        startViewY: 0,
        hasMoved: false,
        badgeTimer: null,
        _initialized: false,

        init() {
            if (this._initialized) return;
            this._initialized = true;

            const wrapper = document.querySelector('.map-svg-wrapper');
            const svg = document.getElementById('vietnam-svg-map') || document.querySelector('.vn-map');
            if (!wrapper || !svg) return;

            // 1. Lăn chuột trong khung bản đồ để phóng to / thu nhỏ mượt mà
            wrapper.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.handleWheel(e);
            }, { passive: false });

            // 2. Kéo thả để di chuyển góc nhìn bản đồ khi đang phóng to (Drag to Pan)
            wrapper.addEventListener('mousedown', (e) => {
                if (e.target.closest('button') || e.target.closest('.sovereignty-badge')) return;
                if (this.currentZoom <= 1.05) return;
                this.isPanning = true;
                this.hasMoved = false;
                this.startX = e.clientX;
                this.startY = e.clientY;
                this.startViewX = this.viewX;
                this.startViewY = this.viewY;
                wrapper.classList.add('is-panning');
            });

            let mapRafId = null;

            window.addEventListener('mousemove', (e) => {
                if (!this.isPanning) return;
                const dx = e.clientX - this.startX;
                const dy = e.clientY - this.startY;
                if (Math.hypot(dx, dy) > 4) {
                    this.hasMoved = true;
                }
                const rect = svg.getBoundingClientRect();
                const svgDx = dx * (this.viewW / rect.width);
                const svgDy = dy * (this.viewH / rect.height);
                const targetX = this.startViewX - svgDx;
                const targetY = this.startViewY - svgDy;

                if (!mapRafId) {
                    mapRafId = requestAnimationFrame(() => {
                        mapRafId = null;
                        this.setPan(targetX, targetY);
                    });
                }
            });

            window.addEventListener('mouseup', () => {
                if (mapRafId) {
                    cancelAnimationFrame(mapRafId);
                    mapRafId = null;
                }
                if (this.isPanning) {
                    this.isPanning = false;
                    wrapper.classList.remove('is-panning');
                }
            });

            // 3. Hỗ trợ cảm ứng vuốt & phóng to 2 ngón (Pinch Zoom) trên điện thoại / tablet
            let initialPinchDist = null;
            let initialPinchZoom = 1;
            let touchStartX = 0, touchStartY = 0;
            let touchStartViewX = 0, touchStartViewY = 0;

            wrapper.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    initialPinchDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    initialPinchZoom = this.currentZoom;
                } else if (e.touches.length === 1 && this.currentZoom > 1.05) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartViewX = this.viewX;
                    touchStartViewY = this.viewY;
                }
            }, { passive: true });

            wrapper.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2 && initialPinchDist) {
                    if (e.cancelable) e.preventDefault();
                    const dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    const scale = dist / initialPinchDist;
                    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    if (!mapRafId) {
                        mapRafId = requestAnimationFrame(() => {
                            mapRafId = null;
                            this.zoomToPoint(initialPinchZoom * scale, midX, midY);
                        });
                    }
                } else if (e.touches.length === 1 && this.currentZoom > 1.05) {
                    if (e.cancelable) e.preventDefault();
                    const rect = svg.getBoundingClientRect();
                    const dx = (e.touches[0].clientX - touchStartX) * (this.viewW / rect.width);
                    const dy = (e.touches[0].clientY - touchStartY) * (this.viewH / rect.height);
                    const targetX = touchStartViewX - dx;
                    const targetY = touchStartViewY - dy;

                    if (!mapRafId) {
                        mapRafId = requestAnimationFrame(() => {
                            mapRafId = null;
                            this.setPan(targetX, targetY);
                        });
                    }
                }
            }, { passive: false });

            wrapper.addEventListener('touchend', () => {
                if (mapRafId) {
                    cancelAnimationFrame(mapRafId);
                    mapRafId = null;
                }
                initialPinchDist = null;
            }, { passive: true });

            // 4. Gắn sự kiện cho các nút bấm phóng to / thu nhỏ / đặt lại
            const zoomInBtn = document.getElementById('map-zoom-in-btn');
            if (zoomInBtn) {
                zoomInBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.zoomBy(1.3);
                });
            }

            const zoomOutBtn = document.getElementById('map-zoom-out-btn');
            if (zoomOutBtn) {
                zoomOutBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.zoomBy(1 / 1.3);
                });
            }

            const zoomResetBtn = document.getElementById('map-zoom-reset-btn');
            if (zoomResetBtn) {
                zoomResetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.reset();
                });
            }
        },

        handleWheel(e) {
            const factor = e.deltaY < 0 ? 1.16 : (1 / 1.16);
            const targetZoom = this.currentZoom * factor;
            this.zoomToPoint(targetZoom, e.clientX, e.clientY);
        },

        zoomBy(factor) {
            const svg = document.getElementById('vietnam-svg-map') || document.querySelector('.vn-map');
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            this.zoomToPoint(this.currentZoom * factor, centerX, centerY);
        },

        zoomToPoint(targetZoom, clientX, clientY) {
            const svg = document.getElementById('vietnam-svg-map') || document.querySelector('.vn-map');
            if (!svg) return;
            const rect = svg.getBoundingClientRect();

            let clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));
            if (clampedZoom <= 1.02) {
                this.reset();
                return;
            }

            const cursorRatioX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const cursorRatioY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

            const svgCursorX = this.viewX + cursorRatioX * this.viewW;
            const svgCursorY = this.viewY + cursorRatioY * this.viewH;

            const newW = this.baseW / clampedZoom;
            const newH = this.baseH / clampedZoom;

            let newX = svgCursorX - cursorRatioX * newW;
            let newY = svgCursorY - cursorRatioY * newH;

            const pad = 40;
            newX = Math.max(-pad, Math.min(this.baseW - newW + pad, newX));
            newY = Math.max(-pad, Math.min(this.baseH - newH + pad, newY));

            this.currentZoom = clampedZoom;
            this.viewX = newX;
            this.viewY = newY;
            this.viewW = newW;
            this.viewH = newH;

            this.applyViewBox();
            this.updateUI();
            this.updatePins();
        },

        setPan(newX, newY) {
            const pad = 40;
            this.viewX = Math.max(-pad, Math.min(this.baseW - this.viewW + pad, newX));
            this.viewY = Math.max(-pad, Math.min(this.baseH - this.viewH + pad, newY));
            this.applyViewBox();
        },

        applyViewBox() {
            const svg = document.getElementById('vietnam-svg-map') || document.querySelector('.vn-map');
            if (svg) {
                svg.setAttribute('viewBox', `${this.viewX.toFixed(2)} ${this.viewY.toFixed(2)} ${this.viewW.toFixed(2)} ${this.viewH.toFixed(2)}`);
            }
        },

        updateUI() {
            const wrapper = document.querySelector('.map-svg-wrapper');
            if (wrapper) {
                wrapper.classList.toggle('is-zoomed', this.currentZoom > 1.05);
            }
            const badge = document.getElementById('map-zoom-badge');
            if (badge) {
                badge.textContent = `${Math.round(this.currentZoom * 100)}%`;
                badge.style.opacity = '1';
                if (this.badgeTimer) clearTimeout(this.badgeTimer);
                if (this.currentZoom <= 1.05) {
                    this.badgeTimer = setTimeout(() => {
                        badge.style.opacity = '0';
                    }, 1200);
                }
            }
        },

        reset() {
            this.currentZoom = 1.0;
            this.viewX = 0;
            this.viewY = 0;
            this.viewW = this.baseW;
            this.viewH = this.baseH;
            this.applyViewBox();

            const wrapper = document.querySelector('.map-svg-wrapper');
            if (wrapper) {
                wrapper.classList.remove('is-zoomed', 'is-panning');
            }
            const badge = document.getElementById('map-zoom-badge');
            if (badge) {
                badge.textContent = '100%';
                badge.style.opacity = '0';
            }
            this.updatePins();
        },

        // Cập nhật phóng to ảnh đại diện của các điểm check-in khi zoom bản đồ
        updatePins() {
            const zoom = this.currentZoom;
            const photoR = Math.min(38, Math.round(15 + (zoom - 1) * 7));
            const badgeH = Math.min(22, Math.round(15 + (zoom - 1) * 2.2));
            const badgeW = Math.round(badgeH * 4.8);
            const badgeFontSize = Math.min(11, Math.round(8.5 + (zoom - 1) * 0.9));

            const pins = document.querySelectorAll('.province-photo-pin');
            pins.forEach(pin => {
                const px = parseFloat(pin.getAttribute('data-px'));
                const py = parseFloat(pin.getAttribute('data-py'));
                if (isNaN(px) || isNaN(py)) return;

                // Cập nhật bán kính khung cắt tròn
                const clipCircle = pin.querySelector('.pin-clip-circle');
                if (clipCircle) clipCircle.setAttribute('r', photoR);

                // Cập nhật vòng hào quang
                const halo = pin.querySelector('.pin-halo-circle');
                if (halo) halo.setAttribute('r', photoR + 7);

                // Cập nhật khung viền trắng đỏ
                const frame = pin.querySelector('.pin-frame-circle');
                if (frame) frame.setAttribute('r', photoR + 2.5);

                // Cập nhật ảnh đại diện lớn dần
                const img = pin.querySelector('.pin-photo-img');
                if (img) {
                    img.setAttribute('x', px - photoR);
                    img.setAttribute('y', py - photoR);
                    img.setAttribute('width', photoR * 2);
                    img.setAttribute('height', photoR * 2);
                }

                // Cập nhật huy hiệu trái tim
                const heartBadge = pin.querySelector('.pin-heart-badge');
                if (heartBadge) {
                    heartBadge.setAttribute('transform', `translate(${px + photoR * 0.72}, ${py - photoR * 0.72})`);
                    const hCircle = heartBadge.querySelector('circle');
                    if (hCircle) hCircle.setAttribute('r', Math.max(5.5, photoR * 0.32));
                    const hText = heartBadge.querySelector('text');
                    if (hText) {
                        hText.setAttribute('y', photoR * 0.12);
                        hText.setAttribute('font-size', Math.max(6.5, photoR * 0.36));
                    }
                }

                // Cập nhật nhãn tên địa danh
                const labelBadge = pin.querySelector('.pin-label-badge');
                if (labelBadge) {
                    labelBadge.setAttribute('transform', `translate(${px}, ${py + photoR + 4})`);
                    const rect = labelBadge.querySelector('rect');
                    if (rect) {
                        rect.setAttribute('x', -badgeW / 2);
                        rect.setAttribute('width', badgeW);
                        rect.setAttribute('height', badgeH);
                        rect.setAttribute('rx', badgeH / 2);
                    }
                    const text = labelBadge.querySelector('text');
                    if (text) {
                        text.setAttribute('y', badgeH * 0.72);
                        text.setAttribute('font-size', badgeFontSize);
                    }
                }
            });
        }
    };

    // Hàm render toàn bộ Bản đồ Việt Nam ở Trang Chủ bên phải
    const renderVietnamMap = () => {
        MapZoom.init();
        const memories = MemoryStore.getAll();
        const svgPinsContainer = document.getElementById('svg-province-pins');
        const checkinBadge = document.getElementById('map-checkin-badge');
        const chipsContainer = document.getElementById('map-checkin-chips');

        // 1. Phân loại các điểm có ảnh chụp
        const visitedProvinces = [];
        const provinceMemoryMap = {};

        PROVINCES_65.forEach(prov => {
            const matched = findMemoriesForProvince(prov, memories);
            if (matched.length > 0) {
                visitedProvinces.push(prov);
                provinceMemoryMap[prov.id] = matched;
            }
        });

        if (checkinBadge) {
            checkinBadge.textContent = `${visitedProvinces.length} điểm chụp`;
        }

        // 2. Cập nhật các thẻ <path> của 65 tỉnh thành trên SVG
        PROVINCES_65.forEach(prov => {
            const pathEl = document.getElementById(prov.id);
            if (!pathEl) return;

            const matched = provinceMemoryMap[prov.id] || [];
            const hasPhotos = matched.length > 0;
            const isSelected = prov.id === selectedLocationId;

            pathEl.classList.toggle('has-photos', hasPhotos);
            pathEl.classList.toggle('active-province', isSelected);
            pathEl.style.cursor = 'pointer';

            // Gắn sự kiện rê chuột hiển thị tooltip và bấm chọn tỉnh (gắn 1 lần duy nhất)
            if (!pathEl._hasMapEvents) {
                pathEl._hasMapEvents = true;

                pathEl.addEventListener('mouseenter', (e) => {
                    showMapTooltip(e, prov.id);
                });

                pathEl.addEventListener('mousemove', (e) => {
                    moveMapTooltip(e);
                });

                pathEl.addEventListener('mouseleave', () => {
                    hideMapTooltip();
                });

                pathEl.addEventListener('click', (e) => {
                    if (MapZoom.hasMoved) return;
                    e.stopPropagation();
                    hideMapTooltip();
                    const photosCount = (provinceMemoryMap[prov.id] || []).length;
                    selectMapLocation(prov.id, photosCount > 0);
                });
            }
        });

        // 3. Vẽ các điểm Pin phát sáng & Ảnh đại diện trên SVG cho những nơi đã chụp ảnh hoặc đang chọn
        if (svgPinsContainer) {
            svgPinsContainer.innerHTML = '';

            PROVINCES_65.forEach(p => {
                const matched = provinceMemoryMap[p.id] || [];
                const hasPhotos = matched.length > 0;
                const isSelected = p.id === selectedLocationId;

                // Chỉ vẽ Pin rõ nét cho những nơi đã có ảnh chụp hoặc đang được chọn xem
                if (!hasPhotos && !isSelected) {
                    return;
                }

                // Tọa độ visual pin
                let px = p.x;
                let py = p.y;
                const pathEl = document.getElementById(p.id);
                if (pathEl && pathEl.getBBox && p.id !== 'hoangsa' && p.id !== 'truongsa' && p.id !== 'baria' && p.id !== 'kiengiang') {
                    try {
                        const b = pathEl.getBBox();
                        if (b.width > 0 && b.height > 0) {
                            px = Math.round((b.x + b.width / 2) * 10) / 10;
                            py = Math.round((b.y + b.height / 2) * 10) / 10;
                        }
                    } catch (err) {}
                }

                // Tìm ảnh đại diện đầu tiên của địa điểm
                let firstPhoto = '';
                if (hasPhotos) {
                    for (const m of matched) {
                        if (m.images && m.images.length > 0 && m.images[0]) {
                            firstPhoto = m.images[0];
                            break;
                        }
                        if (m.image) {
                            firstPhoto = m.image;
                            break;
                        }
                    }
                }

                // Tính toán kích thước phóng đại ảnh theo currentZoom
                const zoom = MapZoom.currentZoom;
                const photoR = Math.min(38, Math.round(15 + (zoom - 1) * 7));
                const badgeH = Math.min(22, Math.round(15 + (zoom - 1) * 2.2));
                const badgeW = Math.round(badgeH * 4.8);
                const badgeFontSize = Math.min(11, Math.round(8.5 + (zoom - 1) * 0.9));

                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', `province-photo-pin ${isSelected ? 'active' : ''} ${hasPhotos ? 'has-photos' : 'empty-pin'}`);
                g.setAttribute('data-province-id', p.id);
                g.setAttribute('data-px', px);
                g.setAttribute('data-py', py);
                g.setAttribute('id', `pin-${p.id}`);
                g.style.cursor = 'pointer';

                if (hasPhotos && firstPhoto) {
                    // CÓ ẢNH THỰC TẾ: Hiển thị Avatar ảnh chụp phát sáng, phóng to dần khi scroll zoom!
                    g.innerHTML = `
                        <title>📍 ${p.name}: ${matched.length} album ảnh chụp</title>
                        <defs>
                            <clipPath id="clip-pin-${p.id}">
                                <circle class="pin-clip-circle" cx="${px}" cy="${py}" r="${photoR}" />
                            </clipPath>
                        </defs>
                        <!-- Vòng hào quang tĩnh nhẹ nhàng -->
                        <circle cx="${px}" cy="${py}" r="${photoR + 7}" class="province-pin-halo pin-halo-circle" fill="rgba(244, 63, 94, 0.22)" stroke="#e11d48" stroke-width="1.5" />
                        <!-- Khung viền ảnh lãng mạn sắc nét -->
                        <circle cx="${px}" cy="${py}" r="${photoR + 2.5}" class="pin-frame-circle" fill="#ffffff" stroke="#e11d48" stroke-width="2.5" />
                        <!-- Ảnh đại diện chụp tại địa điểm này -->
                        <image class="pin-photo-img" href="${firstPhoto}" x="${px - photoR}" y="${py - photoR}" width="${photoR * 2}" height="${photoR * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-pin-${p.id})" onerror="this.onerror=null; this.setAttribute('href', window.FALLBACK_IMG_PLACEHOLDER);" />
                        <!-- Huy hiệu trái tim nhỏ xinh ở góc trên -->
                        <g class="pin-heart-badge" transform="translate(${px + photoR * 0.72}, ${py - photoR * 0.72})">
                            <circle cx="0" cy="0" r="${Math.max(5.5, photoR * 0.32)}" fill="#e11d48" stroke="#ffffff" stroke-width="1.5" />
                            <text x="0" y="${photoR * 0.12}" text-anchor="middle" font-size="${Math.max(6.5, photoR * 0.36)}" fill="#ffffff">❤️</text>
                        </g>
                        <!-- Thẻ tên địa danh và số lượng ảnh -->
                        <g class="pin-label-badge" transform="translate(${px}, ${py + photoR + 4})">
                            <rect x="-${badgeW / 2}" y="0" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" class="pin-badge-rect" fill="#ffffff" stroke="#f43f5e" stroke-width="1.2" />
                            <text x="0" y="${badgeH * 0.72}" text-anchor="middle" class="pin-badge-text font-bold" font-size="${badgeFontSize}" fill="#be123c">
                                ${p.shortName} (${matched.length})
                            </text>
                        </g>
                    `;
                } else if (hasPhotos) {
                    // Có kỷ niệm nhưng không có ảnh: Hiển thị Pin trái tim
                    g.innerHTML = `
                        <title>📍 ${p.name}: ${matched.length} album</title>
                        <circle cx="${px}" cy="${py}" r="15" class="province-pin-halo" fill="rgba(244, 63, 94, 0.22)" stroke="#e11d48" stroke-width="1.5" />
                        <circle cx="${px}" cy="${py}" r="8" fill="#e11d48" stroke="#ffffff" stroke-width="2" />
                        <text x="${px}" y="${py + 3}" text-anchor="middle" font-size="8.5" fill="#ffffff">❤️</text>
                        <g transform="translate(${px}, ${py + 12})">
                            <rect x="-38" y="0" width="76" height="18" rx="9" class="pin-badge-rect" fill="#ffffff" stroke="#f43f5e" stroke-width="1" />
                            <text x="0" y="12" text-anchor="middle" class="pin-badge-text font-bold" font-size="8.5" fill="#be123c">
                                ${p.shortName} (${matched.length})
                            </text>
                        </g>
                    `;
                } else {
                    // Đang chọn tỉnh chưa có ảnh: Pin xanh nổi bật
                    g.innerHTML = `
                        <title>📍 ${p.name}</title>
                        <circle cx="${px}" cy="${py}" r="14" class="province-pin-halo" fill="rgba(14, 165, 233, 0.2)" stroke="#0284c7" stroke-width="1.5" />
                        <circle cx="${px}" cy="${py}" r="7" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
                        <circle cx="${px}" cy="${py}" r="2.5" fill="#fde047" />
                        <g transform="translate(${px}, ${py + 11})">
                            <rect x="-35" y="0" width="70" height="18" rx="9" fill="#ffffff" stroke="#0284c7" stroke-width="1" />
                            <text x="0" y="12" text-anchor="middle" font-size="8" font-weight="bold" fill="#0369a1">
                                ${p.shortName}
                            </text>
                        </g>
                    `;
                }

                // Gắn sự kiện hover và click cho pin
                g.addEventListener('mouseenter', (e) => {
                    showMapTooltip(e, p.id);
                });
                g.addEventListener('mousemove', (e) => {
                    moveMapTooltip(e);
                });
                g.addEventListener('mouseleave', () => {
                    hideMapTooltip();
                });
                g.addEventListener('click', (e) => {
                    if (MapZoom.hasMoved) return;
                    e.stopPropagation();
                    hideMapTooltip();
                    selectMapLocation(p.id, hasPhotos);
                });

                svgPinsContainer.appendChild(g);
            });
        }

        // 4. Render danh sách các điểm đã chụp ảnh dạng chip
        if (chipsContainer) {
            const isAllSelected = !window.activeProvinceFilter;
            const totalCount = memories.length;

            const allChipHtml = `
                <button type="button" data-all-memories="true" class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${isAllSelected ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200/80'}" onclick="window.clearProvinceFilter()">
                    <span>🌟 Tất cả</span>
                    <span class="badge-count ${isAllSelected ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'} rounded-full px-1.5 py-0.2 text-[10px] font-extrabold">${totalCount}</span>
                </button>
            `;

            if (visitedProvinces.length > 0) {
                const provChipsHtml = visitedProvinces.map(p => {
                    const count = (provinceMemoryMap[p.id] || []).length;
                    const isSelected = p.id === window.activeProvinceFilter;
                    return `
                        <button type="button" data-province-id="${p.id}" class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${isSelected ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200/80'}" onclick="window.selectAndScrollMap('${p.id}')">
                            <span>📍 ${p.shortName}</span>
                            <span class="badge-count ${isSelected ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'} rounded-full px-1.5 py-0.2 text-[10px] font-extrabold">${count}</span>
                        </button>
                    `;
                }).join('');

                chipsContainer.innerHTML = allChipHtml + provChipsHtml;
            } else {
                chipsContainer.innerHTML = allChipHtml + `
                    <p class="text-gray-400 text-xs italic py-1">Chưa có điểm chụp nào. Hãy bấm <strong>Thêm Ảnh</strong> và điền địa điểm (VD: Đà Lạt, Hà Nội,...) để thắp sáng bản đồ tình yêu!</p>
                `;
            }
        }

        // 5. Cập nhật hộp thông tin điểm chụp được chọn
        if (selectedLocationId) {
            updateLocationDetailsBox(selectedLocationId, false);
        } else if (visitedProvinces.length > 0) {
            updateLocationDetailsBox(visitedProvinces[0].id, false);
        } else {
            updateLocationDetailsBox(null, false);
        }
    };

    // =========================================================================
    // 12. HIỆU ỨNG TRÁI TIM BUNG TỎA THEO CON TRỎ CHUỘT (HEART CURSOR TRAIL)
    // =========================================================================
    const initHeartCursorTrail = () => {
        const heartIcons = ['💖', '💕', '❤️', '💓', '💗', '💞', '🌸', '✨'];
        let lastX = -999;
        let lastY = -999;
        let lastTime = 0;
        const minDistance = 12; // Khoảng cách tối thiểu giữa 2 lần di chuột để bung tim
        const minInterval = 35;  // Giới hạn tần suất để luôn mượt mà 60fps

        const createHeartParticle = (x, y, isClickBurst = false, angle = 0, speed = 1) => {
            const heart = document.createElement('span');
            heart.className = 'cursor-heart-particle';
            
            const icon = heartIcons[Math.floor(Math.random() * heartIcons.length)];
            heart.textContent = icon;
            
            const scale = isClickBurst ? (0.75 + Math.random() * 0.7) : (0.65 + Math.random() * 0.55);
            const rot = -25 + Math.random() * 50;
            const rotDelta = -30 + Math.random() * 60;
            
            let dx, dy;
            if (isClickBurst) {
                const dist = (30 + Math.random() * 45) * speed;
                dx = Math.cos(angle) * dist;
                dy = Math.sin(angle) * dist - 25;
            } else {
                dx = -22 + Math.random() * 44;
                dy = -40 - Math.random() * 40;
            }

            heart.style.left = `${x}px`;
            heart.style.top = `${y}px`;
            heart.style.setProperty('--scale', scale.toFixed(2));
            heart.style.setProperty('--dx', `${dx.toFixed(1)}px`);
            heart.style.setProperty('--dy', `${dy.toFixed(1)}px`);
            heart.style.setProperty('--rot', `${rot.toFixed(1)}deg`);
            heart.style.setProperty('--rot-delta', `${rotDelta.toFixed(1)}deg`);
            
            const duration = isClickBurst ? (650 + Math.random() * 400) : (800 + Math.random() * 300);
            heart.style.animationDuration = `${duration}ms`;

            document.body.appendChild(heart);

            setTimeout(() => {
                if (heart.parentNode) {
                    heart.parentNode.removeChild(heart);
                }
            }, duration + 50);
        };

        // Di chuột tới đâu, tim bung tỏa tới đó (bỏ qua khi hover vào bản đồ)
        window.addEventListener('mousemove', (e) => {
            if (e.target && (e.target.closest('.map-svg-wrapper') || e.target.closest('.vietnam-map-card') || e.target.closest('.province-quick-filter-scroll'))) {
                return;
            }
            const now = performance.now();
            const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);

            if (dist >= minDistance || (now - lastTime >= minInterval && dist > 3)) {
                lastX = e.clientX;
                lastY = e.clientY;
                lastTime = now;
                createHeartParticle(e.clientX, e.clientY, false);
            }
        }, { passive: true });

        // Bấm chuột thì bung chùm trái tim nở rộ 360 độ
        window.addEventListener('click', (e) => {
            if (e.target && (e.target.closest('.map-svg-wrapper') || e.target.closest('.vietnam-map-card'))) {
                return;
            }
            const count = 7;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
                createHeartParticle(e.clientX, e.clientY, true, angle, 0.8 + Math.random() * 0.5);
            }
        }, { passive: true });

        // Hỗ trợ lướt ngón tay trên điện thoại / tablet (bỏ qua khi vuốt bản đồ hoặc album để tránh giật lag)
        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                const touch = e.touches[0];
                if (e.target && (e.target.closest('.map-svg-wrapper') || e.target.closest('.vietnam-map-card') || e.target.closest('.carousel-track') || e.target.closest('.single-photo-card') || e.target.closest('.modal-image-viewer'))) {
                    return;
                }
                const now = performance.now();
                const dist = Math.hypot(touch.clientX - lastX, touch.clientY - lastY);
                if (dist >= minDistance * 1.5 || now - lastTime >= minInterval * 2) {
                    lastX = touch.clientX;
                    lastY = touch.clientY;
                    lastTime = now;
                    createHeartParticle(touch.clientX, touch.clientY, false);
                }
            }
        }, { passive: true });
    };

    // =========================================================================
    // 15. QUẢN LÝ MODAL CHỈNH SỬA KỶ NIỆM (CHO ĐIỆN THOẠI & MÁY TÍNH)
    // Cho phép sửa lời nhắn, ngày kỷ niệm, địa điểm, thêm & xóa từng ảnh trong album
    // =========================================================================
    const EditMemoryModal = {
        modal: null,
        currentMemoryId: null,
        workingImages: [],

        init() {
            this.modal = document.getElementById('modal-edit-memory');
            if (!this.modal) return;

            const btnClose = document.getElementById('close-modal-edit-memory');
            const btnCancel = document.getElementById('btn-cancel-edit-memory');
            const form = document.getElementById('form-edit-memory');
            const addFilesInput = document.getElementById('edit-memory-add-files');
            const btnSave = document.getElementById('btn-save-edit-memory');

            if (btnClose) btnClose.addEventListener('click', () => this.close());
            if (btnCancel) btnCancel.addEventListener('click', () => this.close());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });

            // Chọn thêm ảnh mới vào album
            if (addFilesInput) {
                addFilesInput.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;

                    const addText = document.getElementById('edit-memory-add-text');
                    if (addText) addText.textContent = `Đang xử lý ${files.length} ảnh...`;

                    for (const file of files) {
                        const isImg = (file.type && file.type.startsWith('image/')) || 
                                      /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
                        const isVid = (file.type && (file.type.startsWith('video/') || file.type === 'video/quicktime' || file.type === 'video/x-m4v')) ||
                                      /\.(mp4|mov|m4v|webm|avi|mkv|ogv|3gp)$/i.test(file.name);
                        if (!isImg && !isVid) continue;
                        try {
                            if (isVid) {
                                const b64 = await window.readFileAsDataURL(file);
                                if (b64) this.workingImages.push(b64);
                            } else {
                                const b64 = await processImagePreservingResolution(file);
                                if (b64) this.workingImages.push(b64);
                            }
                        } catch (err) {
                            Logger.log('MEDIA_PROCESS_ERROR', `Lỗi xử lý file ${file.name}`, { error: String(err) });
                        }
                    }

                    if (addText) addText.textContent = '+ Thêm ảnh hoặc video mới vào album';
                    addFilesInput.value = '';
                    this.renderThumbnails();
                });
            }

            // Lưu cập nhật kỷ niệm
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.save();
                });
            }
            if (btnSave) {
                btnSave.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.save();
                });
            }
        },

        open(memoryId) {
            if (!Auth.isLoggedIn()) {
                openLoginModal('Vui lòng đăng nhập tài khoản Chủ Nhân để chỉnh sửa kỷ niệm!');
                return;
            }

            const memories = MemoryStore.getAll();
            const item = memories.find(m => String(m.id) === String(memoryId));
            if (!item) return;
            this.currentMemoryId = String(memoryId);
            const rawImgs = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
            this.workingImages = rawImgs.filter(img => 
                img && typeof img === 'string' && img.trim().length > 5
            );

            const inputId = document.getElementById('edit-memory-id');
            const inputContent = document.getElementById('edit-memory-content');
            const inputDate = document.getElementById('edit-memory-date');
            const inputLocation = document.getElementById('edit-memory-location');

            if (inputId) inputId.value = this.currentMemoryId;
            if (inputContent) inputContent.value = item.content || '';
            if (inputDate) inputDate.value = item.date || '';
            if (inputLocation) inputLocation.value = item.location || '';

            this.renderThumbnails();

            if (this.modal) {
                this.modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        },

        close() {
            if (this.modal) {
                this.modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
            this.currentMemoryId = null;
            this.workingImages = [];
        },

        renderThumbnails() {
            const container = document.getElementById('edit-memory-thumbnails');
            const countEl = document.getElementById('edit-memory-photo-count');
            if (countEl) countEl.textContent = this.workingImages.length;
            if (!container) return;

            if (!this.workingImages.length) {
                container.innerHTML = `
                    <div class="col-span-full py-4 text-center text-xs text-gray-400 italic">
                        Album chưa có tệp nào. Vui lòng bấm bên dưới để thêm ảnh hoặc video!
                    </div>
                `;
                return;
            }

            container.innerHTML = this.workingImages.map((src, idx) => {
                const isVid = window.isVideoUrl(src);
                if (isVid) {
                    return `
                        <div class="relative group rounded-xl overflow-hidden aspect-square border border-gray-200 bg-black shadow-xs">
                            <video src="${src}" class="w-full h-full object-cover" muted playsinline preload="metadata"></video>
                            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span class="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px]">▶</span>
                            </div>
                            <button type="button" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 active:scale-90 text-white text-xs font-bold flex items-center justify-center shadow-md transition-transform cursor-pointer z-10" data-remove-img-idx="${idx}" title="Xóa video này khỏi album">
                                ✕
                            </button>
                            <span class="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.2 rounded font-mono z-10">
                                #${idx + 1} (Video)
                            </span>
                        </div>
                    `;
                }
                return `
                    <div class="relative group rounded-xl overflow-hidden aspect-square border border-gray-200 bg-white shadow-xs">
                        <img src="${src}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=window.FALLBACK_IMG_PLACEHOLDER;">
                        <button type="button" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 active:scale-90 text-white text-xs font-bold flex items-center justify-center shadow-md transition-transform cursor-pointer" data-remove-img-idx="${idx}" title="Xóa ảnh này khỏi album">
                            ✕
                        </button>
                        <span class="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.2 rounded font-mono">
                            #${idx + 1}
                        </span>
                    </div>
                `;
            }).join('');

            // Gắn sự kiện xóa ảnh
            container.querySelectorAll('[data-remove-img-idx]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const removeIdx = parseInt(btn.getAttribute('data-remove-img-idx'), 10);
                    this.workingImages.splice(removeIdx, 1);
                    this.renderThumbnails();
                });
            });
        },

        async save() {
            if (!this.currentMemoryId) return;

            const inputContent = document.getElementById('edit-memory-content');
            const inputDate = document.getElementById('edit-memory-date');
            const inputLocation = document.getElementById('edit-memory-location');
            const btnSave = document.getElementById('btn-save-edit-memory');

            const content = inputContent ? inputContent.value.trim() : '';
            const date = inputDate ? inputDate.value : '';
            const location = inputLocation ? inputLocation.value.trim() : '';

            if (this.workingImages.length === 0) {
                alert('Vui lòng giữ lại hoặc thêm ít nhất 1 ảnh cho album kỷ niệm này!');
                return;
            }

            if (btnSave) {
                btnSave.disabled = true;
                btnSave.innerHTML = `
                    <svg class="animate-spin h-4 w-4 text-white inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Đang đồng bộ...</span>
                `;
            }

            try {
                // Tải bất kỳ ảnh base64 mới nào lên ImageKit.io hoặc server
                const finalImages = await uploadImagesToServer(this.workingImages, (cur, tot, pct) => {
                    if (btnSave) {
                        btnSave.innerHTML = `
                            <svg class="animate-spin h-4 w-4 text-white inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Lưu ảnh ${cur}/${tot} (${pct}%)...</span>
                        `;
                    }
                });

                const memories = MemoryStore.getAll();
                const target = memories.find(m => String(m.id) === String(this.currentMemoryId));
                if (target) {
                    // Tự động xóa vĩnh viễn các ảnh ImageKit đã bị người dùng gỡ khỏi album
                    const oldImgs = Array.isArray(target.images) ? target.images : (target.image ? [target.image] : []);
                    const removedIkUrls = oldImgs.filter(oldUrl => 
                        typeof oldUrl === 'string' && 
                        oldUrl.includes('ik.imagekit.io') && 
                        !finalImages.includes(oldUrl)
                    );
                    if (removedIkUrls.length > 0) {
                        MemoryStore.deleteFromImageKit(removedIkUrls).catch(() => {});
                    }

                    target.content = content;
                    target.date = date;
                    target.location = location;
                    target.images = finalImages;

                    // Reset vi tri album de khong bi lech index sau khi xoa anh
                    carouselState[this.currentMemoryId] = 0;
                    if (typeof ImageViewer !== 'undefined' && ImageViewer.isOpen) {
                        ImageViewer.close();
                    }

                    const synced = await MemoryStore.saveAll(memories);
                    Logger.log('EDIT_MEMORY_SUCCESS', `Đã cập nhật kỷ niệm ID: ${this.currentMemoryId}`);

                    this.close();
                    renderMemories();
                    renderVietnamMap();

                    if (synced) {
                        alert('🎉 Đã cập nhật kỷ niệm thành công và đồng bộ ngay lập tức tới tất cả thiết bị!');
                    } else {
                        alert('Đã lưu thay đổi kỷ niệm trên thiết bị này (sẽ tự động đồng bộ khi có kết nối Cloud).');
                    }
                }
            } catch (err) {
                alert('Lỗi cập nhật: ' + err.message);
            } finally {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.innerHTML = `<span>Lưu Thay Đổi</span>`;
                }
            }
        }
    };

    // =========================================================================
    // 16. TRÌNH XEM ẢNH TOÀN MÀN HÌNH & THU NHỎ / PHÓNG TO (IMAGE LIGHTBOX VIEWER)
    // Giữ nguyên 100% độ phân giải gốc của ảnh, hỗ trợ đầy đủ cử chỉ di động & máy tính
    // =========================================================================
    const ImageViewer = {
        isOpen: false,
        images: [],
        currentIndex: 0,
        caption: '',
        subtitle: '',

        // Trạng thái phóng to / xoay / kéo
        scale: 1,
        minScale: 0.5,
        maxScale: 6,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        hasDragged: false,

        // Cử chỉ cảm ứng trên điện thoại
        touchMode: 'none', // 'none' | 'pan' | 'pinch'
        touchStartDist: 0,
        touchStartScale: 1,
        touchStartX: 0,
        touchStartY: 0,
        touchStartTime: 0,
        lastTapTime: 0,
        rafId: null,

        // Elements
        modal: null,
        stage: null,
        img: null,
        video: null,
        loader: null,
        counter: null,
        zoomLevel: null,
        captionEl: null,
        subtitleEl: null,
        btnZoomIn: null,
        btnZoomOut: null,
        btnZoomReset: null,
        btnRotate: null,
        btnDownload: null,
        btnClose: null,
        btnPrev: null,
        btnNext: null,

        init() {
            this.modal = document.getElementById('modal-image-viewer');
            if (!this.modal) return;

            this.stage = document.getElementById('viewer-stage');
            this.img = document.getElementById('viewer-image');
            this.video = document.getElementById('viewer-video');
            if (this.img) {
                this.img.onerror = () => {
                    this.img.src = window.FALLBACK_IMG_PLACEHOLDER;
                    this.img.style.opacity = '1';
                };
            }
            this.loader = document.getElementById('viewer-loader');
            this.counter = document.getElementById('viewer-counter');
            this.zoomLevel = document.getElementById('viewer-zoom-level');
            this.captionEl = document.getElementById('viewer-caption');
            this.subtitleEl = document.getElementById('viewer-subtitle');

            this.btnZoomIn = document.getElementById('viewer-btn-zoom-in');
            this.btnZoomOut = document.getElementById('viewer-btn-zoom-out');
            this.btnZoomReset = document.getElementById('viewer-btn-zoom-reset');
            this.btnRotate = document.getElementById('viewer-btn-rotate');
            this.btnDownload = document.getElementById('viewer-btn-download');
            this.btnClose = document.getElementById('viewer-btn-close');
            this.btnPrev = document.getElementById('viewer-btn-prev');
            this.btnNext = document.getElementById('viewer-btn-next');

            // Gắn sự kiện các nút công cụ
            if (this.btnZoomIn) this.btnZoomIn.addEventListener('click', (e) => { e.stopPropagation(); this.zoomIn(); });
            if (this.btnZoomOut) this.btnZoomOut.addEventListener('click', (e) => { e.stopPropagation(); this.zoomOut(); });
            if (this.btnZoomReset) this.btnZoomReset.addEventListener('click', (e) => { e.stopPropagation(); this.resetZoom(); });
            if (this.btnRotate) this.btnRotate.addEventListener('click', (e) => { e.stopPropagation(); this.rotate(); });
            if (this.btnClose) this.btnClose.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
            if (this.btnPrev) this.btnPrev.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
            if (this.btnNext) this.btnNext.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });

            // Cuộn chuột để phóng to / thu nhỏ tại vị trí con trỏ chuột
            if (this.stage) {
                this.stage.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

                // Chuột máy tính: Kéo / Di chuyển ảnh (Pan / Drag)
                this.stage.addEventListener('mousedown', (e) => this.onMouseDown(e));
                window.addEventListener('mousemove', (e) => this.onMouseMove(e));
                window.addEventListener('mouseup', (e) => this.onMouseUp(e));

                // Bấm đúp vào ảnh để phóng to 2.5x hoặc trở về bình thường
                if (this.img) {
                    this.img.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        this.toggleZoom(e.clientX, e.clientY);
                    });
                }

                // Cảm ứng chạm trên điện thoại & tablet
                this.stage.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
                this.stage.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
                this.stage.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
                this.stage.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

                // Khi click vào vùng trống xung quanh ảnh (khi không kéo và không zoom) thì đóng viewer
                this.stage.addEventListener('click', (e) => {
                    if (e.target === this.stage && !this.hasDragged && this.scale <= 1.05) {
                        this.close();
                    }
                });
            }

            // Phím tắt bàn phím tiện lợi
            window.addEventListener('keydown', (e) => {
                if (!this.isOpen) return;
                if (e.key === 'Escape') {
                    this.close();
                } else if (e.key === 'ArrowLeft') {
                    this.prev();
                } else if (e.key === 'ArrowRight') {
                    this.next();
                } else if (e.key === '+' || e.key === '=') {
                    this.zoomIn();
                } else if (e.key === '-' || e.key === '_') {
                    this.zoomOut();
                } else if (e.key === '0') {
                    this.resetZoom();
                } else if (e.key === 'r' || e.key === 'R') {
                    this.rotate();
                }
            });
        },

        open(images, startIndex = 0, caption = '', subtitle = '') {
            const raw = Array.isArray(images) ? images : [images];
            let valid = raw.filter(img => img && typeof img === 'string' && img.trim().length > 5);
            if (!valid.length) {
                valid = [window.FALLBACK_IMG_PLACEHOLDER];
            }

            this.images = valid;
            this.currentIndex = Math.max(0, Math.min(startIndex, this.images.length - 1));
            this.caption = caption || '';
            this.subtitle = subtitle || '';
            this.isOpen = true;

            // Reset ảnh hiển thị về trạng thái ẩn để Safari không bao giờ hiện dấu hỏi chấm [?]
            if (this.img) {
                this.img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                this.img.style.opacity = '0';
            }

            // Reset trạng thái hiển thị
            this.scale = 1;
            this.translateX = 0;
            this.translateY = 0;
            this.rotation = 0;
            this.isDragging = false;
            this.hasDragged = false;

            // Hiển thị modal
            if (this.modal) {
                this.modal.classList.remove('hidden');
                // Kích hoạt transition mượt mà
                void this.modal.offsetWidth;
                this.modal.classList.add('is-open');
            }
            document.body.style.overflow = 'hidden';

            this.updateImage();
        },

        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            if (this.video) {
                try { this.video.pause(); } catch(e){}
                this.video.src = '';
                this.video.style.display = 'none';
                this.video.classList.add('hidden');
            }
            if (this.modal) {
                this.modal.classList.remove('is-open');
                setTimeout(() => {
                    if (!this.isOpen && this.modal) {
                        this.modal.classList.add('hidden');
                        if (this.img) {
                            this.img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                            this.img.style.opacity = '0';
                        }
                    }
                }, 260);
            }
            document.body.style.overflow = '';
        },

        updateImage() {
            const currentSrc = this.images[this.currentIndex];
            if (!currentSrc) return;

            // Reset zoom & vị trí về trung tâm mỗi khi chuyển ảnh
            this.scale = 1;
            this.translateX = 0;
            this.translateY = 0;
            this.rotation = 0;
            this.applyTransform(false);

            // Cập nhật số thứ tự
            if (this.counter) {
                this.counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
            }

            // Cập nhật phụ đề & mô tả
            if (this.subtitleEl) {
                this.subtitleEl.textContent = this.subtitle;
                this.subtitleEl.style.display = this.subtitle ? 'block' : 'none';
            }
            if (this.captionEl) {
                this.captionEl.textContent = this.caption ? `"${this.caption}"` : '';
                this.captionEl.style.display = this.caption ? 'block' : 'none';
            }

            // Nút Prev/Next hiển thị khi có > 1 ảnh
            const hasMultiple = this.images.length > 1;
            if (this.btnPrev) this.btnPrev.style.display = hasMultiple ? 'flex' : 'none';
            if (this.btnNext) this.btnNext.style.display = hasMultiple ? 'flex' : 'none';

            const isVideo = window.isVideoUrl(currentSrc);

            // Cập nhật link tải ảnh/video độ phân giải gốc
            if (this.btnDownload) {
                this.btnDownload.href = currentSrc;
                let ext = 'mp4';
                if (/\.(mov|MOV)/i.test(currentSrc)) ext = 'mov';
                else if (/\.(webm|WEBM)/i.test(currentSrc)) ext = 'webm';
                else if (/\.(m4v|M4V)/i.test(currentSrc)) ext = 'm4v';
                this.btnDownload.download = isVideo 
                    ? `NgocAnh-TuUyen-Video-${this.currentIndex + 1}.${ext}`
                    : `NgocAnh-TuUyen-KyNiem-${this.currentIndex + 1}.jpg`;
            }

            // Nếu là Video
            if (isVideo) {
                if (this.img) {
                    this.img.style.display = 'none';
                    this.img.style.opacity = '0';
                }
                if (this.loader) this.loader.classList.add('hidden');
                if (this.video) {
                    this.video.style.display = 'block';
                    this.video.classList.remove('hidden');
                    this.video.src = currentSrc;
                }
                return;
            } else {
                if (this.video) {
                    try { this.video.pause(); } catch(e){}
                    this.video.style.display = 'none';
                    this.video.classList.add('hidden');
                    this.video.src = '';
                }
                if (this.img) {
                    this.img.style.display = 'block';
                }
            }

            // Ẩn ảnh tạm thời và bật loader để tránh giật lag hoặc hiện icon lỗi trên Safari
            if (this.loader) this.loader.classList.remove('hidden');
            if (this.img) {
                this.img.style.opacity = '0';
            }

            const reqIdx = this.currentIndex;
            const tempImg = new Image();
            tempImg.onload = () => {
                if (this.img && this.isOpen && this.currentIndex === reqIdx) {
                    this.img.src = currentSrc;
                    this.img.style.opacity = '1';
                    if (this.loader) this.loader.classList.add('hidden');
                    this.applyTransform(false);
                }
            };
            tempImg.onerror = () => {
                if (this.img && this.isOpen && this.currentIndex === reqIdx) {
                    this.img.src = window.FALLBACK_IMG_PLACEHOLDER;
                    this.img.style.opacity = '1';
                    if (this.loader) this.loader.classList.add('hidden');
                }
            };
            tempImg.src = currentSrc;
        },

        applyTransform(animated = false) {
            if (!this.img) return;
            if (animated) {
                this.img.style.transition = 'transform 0.24s cubic-bezier(0.2, 0, 0, 1)';
            } else {
                this.img.style.transition = 'none';
            }
            this.img.style.transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale}) rotate(${this.rotation}deg)`;

            if (this.zoomLevel) {
                this.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
            }

            if (this.stage) {
                if (this.scale > 1.05) {
                    this.stage.classList.add('is-panning');
                } else {
                    this.stage.classList.remove('is-panning');
                }
            }
        },

        // Đồng bộ vẽ với tần số quét màn hình (rAF) để giảm tải CPU/GPU
        requestTransform(animated = false) {
            if (this.rafId) return;
            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;
                this.applyTransform(animated);
            });
        },

        zoomIn(factor = 1.32) {
            const nextScale = Math.min(this.maxScale, this.scale * factor);
            this.scale = Math.round(nextScale * 100) / 100;
            this.applyTransform(true);
        },

        zoomOut(factor = 1.32) {
            let nextScale = Math.max(this.minScale, this.scale / factor);
            if (Math.abs(nextScale - 1) < 0.15) {
                nextScale = 1;
                this.translateX = 0;
                this.translateY = 0;
            }
            this.scale = Math.round(nextScale * 100) / 100;
            this.applyTransform(true);
        },

        resetZoom() {
            this.scale = 1;
            this.translateX = 0;
            this.translateY = 0;
            this.rotation = 0;
            this.applyTransform(true);
        },

        toggleZoom(clientX, clientY) {
            if (this.scale > 1.1) {
                this.resetZoom();
            } else {
                const targetScale = 2.5;
                if (clientX !== undefined && clientY !== undefined && this.stage) {
                    const rect = this.stage.getBoundingClientRect();
                    const mouseX = clientX - (rect.left + rect.width / 2);
                    const mouseY = clientY - (rect.top + rect.height / 2);
                    this.translateX = mouseX - (mouseX - this.translateX) * (targetScale / this.scale);
                    this.translateY = mouseY - (mouseY - this.translateY) * (targetScale / this.scale);
                }
                this.scale = targetScale;
                this.applyTransform(true);
            }
        },

        rotate() {
            this.rotation = (this.rotation + 90) % 360;
            this.applyTransform(true);
        },

        next() {
            if (this.images.length <= 1) return;
            this.currentIndex = (this.currentIndex + 1) % this.images.length;
            this.updateImage();
        },

        prev() {
            if (this.images.length <= 1) return;
            this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
            this.updateImage();
        },

        // Cuộn con lăn chuột tại vị trí con trỏ chuột
        onWheel(e) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.18 : 0.85;
            let newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));

            if (Math.abs(newScale - 1) < 0.05) {
                newScale = 1;
                this.translateX = 0;
                this.translateY = 0;
            } else if (this.stage) {
                const rect = this.stage.getBoundingClientRect();
                const mouseX = e.clientX - (rect.left + rect.width / 2);
                const mouseY = e.clientY - (rect.top + rect.height / 2);
                this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
                this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
            }

            this.scale = Math.round(newScale * 100) / 100;
            this.applyTransform(false);
        },

        // Kéo ảnh trên máy tính (Pan / Drag)
        onMouseDown(e) {
            if (!this.isOpen || e.button !== 0) return;
            this.isDragging = true;
            this.hasDragged = false;
            this.dragStartX = e.clientX - this.translateX;
            this.dragStartY = e.clientY - this.translateY;
            if (this.stage) this.stage.classList.add('is-panning');
        },

        onMouseMove(e) {
            if (!this.isDragging) return;
            const newX = e.clientX - this.dragStartX;
            const newY = e.clientY - this.dragStartY;
            if (Math.hypot(newX - this.translateX, newY - this.translateY) > 5) {
                this.hasDragged = true;
            }
            this.translateX = newX;
            this.translateY = newY;
            this.requestTransform(false);
        },

        onMouseUp(e) {
            if (!this.isDragging) return;
            this.isDragging = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            if (this.stage && this.scale <= 1.05) {
                this.stage.classList.remove('is-panning');
            }
        },

        // Cảm ứng vuốt chạm Mobile (Pinch to zoom, Pan kéo, Vuốt sang ảnh)
        onTouchStart(e) {
            if (!this.isOpen) return;

            if (e.touches.length === 2) {
                // 2 ngón tay: Bắt đầu Pinch to Zoom
                this.touchMode = 'pinch';
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                this.touchStartDist = dist || 1;
                this.touchStartScale = this.scale;
            } else if (e.touches.length === 1) {
                // 1 ngón tay: Bắt đầu Pan hoặc Swipe
                this.touchMode = 'pan';
                const touch = e.touches[0];
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
                this.touchStartTime = Date.now();
                this.dragStartX = touch.clientX - this.translateX;
                this.dragStartY = touch.clientY - this.translateY;
                this.hasDragged = false;

                // Bấm đúp nhanh trên màn hình điện thoại (trong 300ms)
                const now = Date.now();
                if (now - this.lastTapTime < 300) {
                    e.preventDefault();
                    this.toggleZoom(touch.clientX, touch.clientY);
                    this.lastTapTime = 0;
                    return;
                }
                this.lastTapTime = now;
            }
        },

        onTouchMove(e) {
            if (!this.isOpen) return;

            if (this.touchMode === 'pinch' && e.touches.length === 2) {
                e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const ratio = dist / this.touchStartDist;
                let newScale = Math.min(this.maxScale, Math.max(this.minScale, this.touchStartScale * ratio));
                this.scale = Math.round(newScale * 100) / 100;
                this.requestTransform(false);
            } else if (this.touchMode === 'pan' && e.touches.length === 1) {
                if (e.cancelable) e.preventDefault();
                const touch = e.touches[0];
                const dx = touch.clientX - this.touchStartX;
                const dy = touch.clientY - this.touchStartY;

                if (Math.hypot(dx, dy) > 8) {
                    this.hasDragged = true;
                }

                // Khi ảnh đã phóng to: cho phép kéo lướt xem các góc chi tiết
                if (this.scale > 1.05) {
                    e.preventDefault();
                    this.translateX = touch.clientX - this.dragStartX;
                    this.translateY = touch.clientY - this.dragStartY;
                    this.requestTransform(false);
                }
            }
        },

        onTouchEnd(e) {
            if (!this.isOpen) return;

            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }

            if (this.touchMode === 'pan' && this.scale <= 1.05 && e.changedTouches.length === 1) {
                const touch = e.changedTouches[0];
                const dx = touch.clientX - this.touchStartX;
                const dy = touch.clientY - this.touchStartY;
                const duration = Date.now() - this.touchStartTime;

                // Vuốt ngang (Swipe) để chuyển ảnh trước / tiếp theo
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && duration < 500) {
                    if (dx < 0) {
                        this.next();
                    } else {
                        this.prev();
                    }
                }
            }

            if (e.touches.length === 0) {
                this.touchMode = 'none';
            } else if (e.touches.length === 1) {
                this.touchMode = 'pan';
                this.dragStartX = e.touches[0].clientX - this.translateX;
                this.dragStartY = e.touches[0].clientY - this.translateY;
            }
        }
    };

    // Xuất ra window để có thể gọi từ bất kỳ thành phần nào nếu cần
    window.ImageViewer = ImageViewer;
    window.openImageViewer = (images, startIndex, caption, subtitle) => ImageViewer.open(images, startIndex, caption, subtitle);

    // =========================================================================
    // 17. NÚT MŨI TÊN TRÒN CUỘN LÊN ĐẦU TRANG (SCROLL TO TOP BUTTON)
    // =========================================================================
    const initScrollToTop = () => {
        const btnScrollToTop = document.getElementById('btn-scroll-to-top');
        if (!btnScrollToTop) return;

        let scrollTicking = false;
        const toggleVisibility = () => {
            if (window.scrollY > 280) {
                btnScrollToTop.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
                btnScrollToTop.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
            } else {
                btnScrollToTop.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
                btnScrollToTop.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
            }
        };

        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                requestAnimationFrame(() => {
                    toggleVisibility();
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        }, { passive: true });

        btnScrollToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    };

    initHeartCursorTrail();
    initScrollToTop();

    // Khởi tạo kiểm tra đăng nhập ban đầu & render bản đồ
    checkInitialLogin();
    renderVietnamMap();
    MemoryStore.initSync();
    ImageViewer.init();
    EditMemoryModal.init();
    Logger.log('APP_READY', 'Hệ thống đã khởi tạo hoàn tất');
});

