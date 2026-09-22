/**
 * Ứng Dụng Kỷ Niệm Yêu Thương: Ngọc Ánh & Tú Uyên
 * Toàn bộ logic giao diện, slider, đăng nhập, đổi mật khẩu, đổi màu nền và ghi log
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. HỆ THỐNG GHI LOG THAO TÁC NGẦM (TỰ ĐỘNG LƯU TRỰC TIẾP VÀO USER_ACTIVITY.LOG)
    // =========================================================================
    const Logger = {
        storageKey: 'weddingAppLogs',
        fileHandle: null,
        directoryHandle: null,
        
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

            // 2. Tự động ghi trực tiếp vào file user_activity.log qua máy chủ nội bộ (server.ps1 / khoi_dong.bat)
            this.sendToServer(logLine);

            // 3. Tự động ghi vào file nếu có fileHandle kết nối
            this.writeToFileHandle(logLine);
        },

        // Gửi ngầm tới server nội bộ để ghi vào D:\TNA\Project\anhuyen\user_activity.log
        async sendToServer(logLine) {
            const endpoints = ['/api/log', 'http://localhost:8080/api/log'];
            for (const ep of endpoints) {
                try {
                    await fetch(ep, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: logLine,
                        mode: 'cors'
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

        login(username, password) {
            const creds = this.getCredentials();
            if (username === creds.username && password === creds.password) {
                sessionStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('isLoggedIn', 'true');
                Logger.log('LOGIN_SUCCESS', `Đăng nhập thành công với tài khoản: ${username}`);
                return true;
            }
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
            Logger.log('CHANGE_PASSWORD_SUCCESS', 'Đã đổi mật khẩu thành công');
            return { success: true, message: 'Đổi mật khẩu thành công!' };
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
        versionKey: 'weddingMemoriesVersion',
        _cache: null,
        _version: 0,
        _isPushing: false,
        _isFetching: false,
        _pendingPush: null,
        _pollTimer: null,

        getEndpoints(path) {
            const list = [path];
            if (window.location.origin && window.location.origin.startsWith('http')) {
                list.push(`${window.location.origin}${path}`);
            }
            if (!window.location.origin || window.location.origin.includes('localhost') || window.location.origin === 'null') {
                list.push(`http://localhost:8080${path}`);
                list.push(`http://127.0.0.1:8080${path}`);
            }
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

        getAll() {
            if (this._cache !== null) return this._cache;
            try {
                this._cache = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            } catch (e) {
                this._cache = [];
            }
            return this._cache;
        },

        async saveAll(memories) {
            this._cache = [...memories];

            // 1. Lưu vào LocalStorage
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(memories));
            } catch (e) {
                Logger.log('STORAGE_QUOTA_NOTICE', 'LocalStorage đã đầy, chuyển lưu an toàn qua IndexedDB & Server');
            }

            // 2. Lưu vào IndexedDB
            try {
                await IDBStorage.saveAll(memories);
            } catch (e) {}

            // 3. Đồng bộ lên Server nội bộ
            const syncResult = await this.syncToServer(memories);
            return syncResult;
        },

        async syncToServer(memoriesToSend) {
            if (this._isPushing) {
                this._pendingPush = memoriesToSend || this.getAll();
                return true;
            }
            this._isPushing = true;
            updateSyncStatusUI('syncing');

            const list = memoriesToSend || this.getAll();
            const deletedIds = this.getDeletedIds();

            const payload = {
                memories: list,
                deletedIds: deletedIds
            };

            const endpoints = this.getEndpoints('/api/memories');
            let success = false;

            for (const ep of endpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 12000);

                    const resp = await fetch(ep, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json;charset=utf-8',
                            'Cache-Control': 'no-cache, no-store'
                        },
                        body: JSON.stringify(payload),
                        mode: 'cors',
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (resp.ok) {
                        const data = await resp.json();
                        if (data && data.status === 'ok') {
                            if (data.version) {
                                this._version = String(data.version);
                                try { localStorage.setItem(this.versionKey, String(data.version)); } catch (e) {}
                            }
                            if (Array.isArray(data.memories)) {
                                this._cache = data.memories;
                                try { localStorage.setItem(this.storageKey, JSON.stringify(data.memories)); } catch (e) {}
                                try { await IDBStorage.saveAll(data.memories); } catch (e) {}
                            }
                            if (deletedIds.length > 0) {
                                this.clearDeletedIds(deletedIds);
                            }
                            success = true;
                            updateSyncStatusUI('synced');
                            break;
                        }
                    }
                } catch (e) {}
            }

            this._isPushing = false;

            if (this._pendingPush) {
                const nextData = this._pendingPush;
                this._pendingPush = null;
                return await this.syncToServer(nextData);
            }

            if (!success) {
                updateSyncStatusUI('error');
            }
            return success;
        },

        async fetchLatestFromServer() {
            if (this._isFetching) return false;
            this._isFetching = true;
            updateSyncStatusUI('syncing');

            const endpoints = this.getEndpoints('/api/memories');
            let updated = false;

            for (const ep of endpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const url = `${ep}?_t=${Date.now()}`;
                    const resp = await fetch(url, {
                        mode: 'cors',
                        cache: 'no-store',
                        headers: { 'Cache-Control': 'no-cache, no-store' },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (resp.ok) {
                        const serverVer = resp.headers.get('X-Server-Version');
                        const data = await resp.json();
                        const serverMemories = Array.isArray(data) ? data : (data.memories || []);
                        const newVer = (data && data.version) || serverVer;

                        if (newVer) {
                            this._version = String(newVer);
                            try { localStorage.setItem(this.versionKey, this._version); } catch (e) {}
                        }

                        if (Array.isArray(serverMemories)) {
                            const merged = this.mergeWithLocal(serverMemories);
                            this._cache = merged;
                            try { localStorage.setItem(this.storageKey, JSON.stringify(merged)); } catch (e) {}
                            try { await IDBStorage.saveAll(merged); } catch (e) {}

                            if (typeof renderMemories === 'function') renderMemories();
                            if (typeof renderVietnamMap === 'function') renderVietnamMap();

                            if (merged.length > serverMemories.length) {
                                setTimeout(() => this.syncToServer(merged), 200);
                            }
                            updated = true;
                            updateSyncStatusUI('synced');
                            break;
                        }
                    }
                } catch (e) {}
            }

            this._isFetching = false;
            if (!updated && !this._isPushing) {
                updateSyncStatusUI('error');
            }
            return updated;
        },

        mergeWithLocal(serverMemories) {
            const deletedIds = this.getDeletedIds();
            const localMemories = this.getAll();
            const map = new Map();

            // 1. Nạp danh sách server trước
            for (const item of serverMemories) {
                if (!item || !item.id) continue;
                if (deletedIds.includes(String(item.id))) continue;
                map.set(String(item.id), { ...item });
            }

            // 2. Bổ sung các kỷ niệm mới ở máy local chưa kịp sync lên
            for (const localItem of localMemories) {
                if (!localItem || !localItem.id) continue;
                const idStr = String(localItem.id);
                if (deletedIds.includes(idStr)) continue;

                if (map.has(idStr)) {
                    const serverItem = map.get(idStr);
                    const serverImgs = serverItem.images || (serverItem.image ? [serverItem.image] : []);
                    const localImgs = localItem.images || (localItem.image ? [localItem.image] : []);
                    
                    const combined = [...serverImgs];
                    for (const lImg of localImgs) {
                        if (!combined.includes(lImg)) {
                            combined.push(lImg);
                        }
                    }
                    serverItem.images = combined;
                    map.set(idStr, serverItem);
                } else {
                    map.set(idStr, localItem);
                }
            }

            const result = Array.from(map.values());
            result.sort((a, b) => {
                const dateA = a.date || a.createdAt || '';
                const dateB = b.date || b.createdAt || '';
                return dateB.localeCompare(dateA);
            });
            return result;
        },

        async checkServerVersionAndSync() {
            if (this._isFetching || this._isPushing) return;

            const endpoints = this.getEndpoints('/api/version');

            for (const ep of endpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 4000);

                    const url = `${ep}?_t=${Date.now()}`;
                    const resp = await fetch(url, {
                        mode: 'cors',
                        cache: 'no-store',
                        headers: { 'Cache-Control': 'no-cache, no-store' },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (resp.ok) {
                        const data = await resp.json();
                        if (data && data.status === 'ok') {
                            const sVersion = String(data.version || 0);
                            const currentLocalCount = (this._cache || []).length;

                            if (sVersion !== String(this._version) || data.count !== currentLocalCount) {
                                await this.fetchLatestFromServer();
                            } else {
                                updateSyncStatusUI('synced');
                            }
                            return;
                        }
                    }
                } catch (e) {}
            }
            if (!this._isPushing) {
                updateSyncStatusUI('error');
            }
        },

        async initSync() {
            try {
                const idbList = await IDBStorage.getAll();
                if (idbList && idbList.length > 0) {
                    this._cache = idbList;
                    try { localStorage.setItem(this.storageKey, JSON.stringify(idbList)); } catch (e) {}
                }
            } catch (e) {}

            try {
                this._version = localStorage.getItem(this.versionKey) || 0;
            } catch (e) {}

            await this.fetchLatestFromServer();

            if (!this._pollTimer) {
                this._pollTimer = setInterval(() => {
                    this.checkServerVersionAndSync();
                }, 3000);
            }

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.checkServerVersionAndSync();
                }
            });
            window.addEventListener('focus', () => {
                this.checkServerVersionAndSync();
            });
        },

        async add(item) {
            if (!Auth.isLoggedIn()) {
                Logger.log('UNAUTHORIZED_ADD', 'Từ chối thêm kỷ niệm do chưa đăng nhập');
                return false;
            }
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

    // Hàm nén ảnh siêu nhẹ tối ưu hoàn toàn cho điện thoại (iOS Safari, Android) & máy tính
    const compressImage = async (file, maxWidth = 1000, quality = 0.72) => {
        // 1. Tận dụng createImageBitmap nếu trình duyệt hỗ trợ (tiết kiệm RAM, tránh crash trên điện thoại)
        if (typeof createImageBitmap === 'function') {
            try {
                const bitmap = await createImageBitmap(file);
                let width = bitmap.width;
                let height = bitmap.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, width, height);
                if (typeof bitmap.close === 'function') bitmap.close();

                const base64 = canvas.toDataURL('image/jpeg', quality);
                return base64;
            } catch (err) {
                // Fallback xuống phương pháp tiếp theo nếu không decode được trực tiếp
            }
        }

        // 2. Dùng URL.createObjectURL để tránh tạo chuỗi base64 khổng lồ trong bộ nhớ RAM điện thoại
        return new Promise((resolve, reject) => {
            let objectUrl = null;
            try {
                objectUrl = URL.createObjectURL(file);
            } catch (e) {
                // Tiếp tục thử FileReader nếu không tạo được URL
            }

            if (objectUrl) {
                const img = new Image();
                img.onload = () => {
                    try {
                        URL.revokeObjectURL(objectUrl);
                    } catch (e) {}

                    let width = img.naturalWidth || img.width;
                    let height = img.naturalHeight || img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', quality));
                };

                img.onerror = () => {
                    try {
                        URL.revokeObjectURL(objectUrl);
                    } catch (e) {}
                    tryFileReader();
                };

                img.src = objectUrl;
            } else {
                tryFileReader();
            }

            function tryFileReader() {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        let width = fallbackImg.naturalWidth || fallbackImg.width;
                        let height = fallbackImg.naturalHeight || fallbackImg.height;

                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(fallbackImg, 0, 0, width, height);

                        resolve(canvas.toDataURL('image/jpeg', quality));
                    };
                    fallbackImg.onerror = reject;
                    fallbackImg.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
        });
    };

    // Hàm tải ảnh trực tiếp lên máy chủ nội bộ vào thư mục uploads/ (giúp ứng dụng siêu nhẹ)
    const uploadImagesToServer = async (imagesArray) => {
        if (!imagesArray || !imagesArray.length) return [];
        const results = [];
        const endpoints = MemoryStore.getEndpoints('/api/upload');
        for (let i = 0; i < imagesArray.length; i++) {
            const img = imagesArray[i];
            if (img && img.startsWith('data:image/')) {
                let uploadedUrl = null;
                for (const ep of endpoints) {
                    try {
                        const controller = new AbortController();
                        const toId = setTimeout(() => controller.abort(), 10000);
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
                results.push(uploadedUrl || img);
            } else {
                results.push(img);
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

    loginBtn.addEventListener('click', () => {
        const u = usernameInput.value.trim();
        const p = passwordInput.value.trim();

        if (Auth.login(u, p)) {
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
            const ok = await MemoryStore.fetchLatestFromServer();
            if (ok) {
                Logger.log('MANUAL_SYNC_SUCCESS', 'Người dùng đã bấm đồng bộ thành công');
            } else {
                Logger.log('MANUAL_SYNC_FAILED', 'Người dùng bấm đồng bộ nhưng máy chủ chưa phản hồi');
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

    // =========================================================================
    // 9. XỬ LÝ MODAL CÀI ĐẶT & THAY ĐỔI MÀU NỀN & LOGS
    // =========================================================================
    const openSettingsModal = () => {
        Logger.log('OPEN_MODAL', 'Mở modal Cài đặt hệ thống');
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
            thumbWrap.className = 'relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white shadow-xs';
            thumbWrap.innerHTML = `
                <img src="${src}" class="w-full h-full object-cover">
                <button type="button" class="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-90 group-hover:opacity-100 transition-all cursor-pointer" data-remove-idx="${idx}" title="Xóa ảnh này">
                    ✕
                </button>
            `;
            previewThumbnails.appendChild(thumbWrap);
        });

        // Thẻ bấm để thêm ảnh nhanh chóng ngay trong ô preview
        const addMoreTile = document.createElement('label');
        addMoreTile.htmlFor = 'media-upload';
        addMoreTile.className = 'flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/60 hover:bg-rose-100/70 text-rose-500 cursor-pointer transition-all active:scale-95 group select-none shadow-xs';
        addMoreTile.title = 'Chọn thêm ảnh từ điện thoại';
        addMoreTile.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-rose-100 group-hover:scale-110 flex items-center justify-center text-rose-500 mb-1 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <span class="text-[11px] font-bold text-rose-600">Thêm ảnh</span>
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

        Logger.log('SELECT_FILES', `Người dùng đã chọn ${files.length} file ảnh`);
        
        const progressBarContainer = document.getElementById('upload-progress-container');
        const progressBar = document.getElementById('upload-progress-bar');
        const progressText = document.getElementById('upload-progress-text');
        const textMain = document.getElementById('upload-text-main');

        if (progressBarContainer) progressBarContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
        if (textMain) textMain.textContent = `Đang xử lý ${files.length} ảnh...`;
        uploadTrigger.classList.add('opacity-75', 'pointer-events-none');
        
        let processedCount = 0;
        let successCount = 0;

        for (const file of files) {
            processedCount++;
            const pct = Math.round((processedCount / files.length) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.textContent = `Đang nén ảnh (${processedCount}/${files.length})...`;

            const isImage = (file.type && file.type.startsWith('image/')) || 
                            /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
            if (!isImage) continue;

            try {
                // Nén ảnh chất lượng tối ưu cho điện thoại & máy tính
                const base64 = await compressImage(file, 1000, 0.72);
                if (base64) {
                    selectedImages.push(base64);
                    successCount++;
                }
            } catch (err) {
                Logger.log('IMAGE_COMPRESS_ERROR', `Lỗi xử lý file ${file.name}`, { error: String(err) });
            }
        }

        if (progressBarContainer) progressBarContainer.classList.add('hidden');
        if (textMain) textMain.textContent = 'Chọn Ảnh / Video Kỷ Niệm';
        uploadTrigger.classList.remove('opacity-75', 'pointer-events-none');

        updatePreviewThumbnails();
        mediaUpload.value = ''; // Reset input để có thể chọn tiếp nhiều lần trên điện thoại

        if (successCount > 0) {
            Logger.log('IMAGES_PROCESSED', `Đã chuẩn bị thành công ${successCount}/${files.length} ảnh`);
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

        // Tải ảnh trực tiếp lên máy chủ để tối ưu bộ nhớ
        const finalImages = await uploadImagesToServer(selectedImages);

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
        const memories = MemoryStore.getAll();
        const isOwner = Auth.isLoggedIn();
        memoriesContainer.innerHTML = '';

        if (!memories.length) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        memories.forEach((item) => {
            const memoryId = item.id;
            const images = item.images && item.images.length ? item.images : (item.image ? [item.image] : []);
            const totalImages = images.length;

            if (carouselState[memoryId] === undefined) {
                carouselState[memoryId] = 0;
            }

            const card = document.createElement('article');
            card.className = 'bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-md border border-rose-100 transition-all hover:shadow-xl fade-in';

            // 1. PHẦN MEDIA: ẢNH ĐƠN HOẶC ALBUM XẾP CHỒNG (CÁCH 0.5CM, TỰ ĐỘNG CHUYỂN 2 GIÂY)
            let mediaMarkup = '';

            if (totalImages > 1) {
                // Hiển thị Album xếp chồng cách nhau 0.5cm
                mediaMarkup = `
                    <div class="stacked-deck-container" id="carousel-${memoryId}">
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
                                    <div class="stacked-card-frame">
                                        <img src="${imgSrc}" alt="Kỷ niệm tình yêu" loading="lazy">
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
                // Hiển thị 1 ảnh FULL tỷ lệ
                mediaMarkup = `
                    <div class="w-full bg-black/5 overflow-hidden flex items-center justify-center p-3">
                        <img src="${images[0]}" alt="Kỷ niệm tình yêu" class="w-full max-h-[540px] object-contain rounded-2xl block" loading="lazy">
                    </div>
                `;
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
                            <div class="flex items-center space-x-2">
                                <input type="file" id="input-add-photo-${memoryId}" class="sr-only-file sr-only" accept="image/jpeg,image/png,image/webp,image/gif,image/*" multiple>
                                <label for="input-add-photo-${memoryId}" class="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-xl transition-colors flex items-center space-x-1 text-xs font-bold border border-rose-200/80 shadow-xs cursor-pointer select-none active:scale-95" data-add-photo="${memoryId}" title="Thêm ảnh vào album này">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span class="btn-text">Thêm ảnh</span>
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
                }

                const prevBtn = card.querySelector(`[data-prev="${memoryId}"]`);
                const nextBtn = card.querySelector(`[data-next="${memoryId}"]`);
                const dots = card.querySelectorAll(`[data-dot-for="${memoryId}"]`);

                if (prevBtn) {
                    prevBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        slideTo(memoryId, (carouselState[memoryId] || 0) - 1, totalImages, true);
                        startAutoSlide(memoryId, totalImages); // Reset lại chu kỳ 2s
                    });
                }

                if (nextBtn) {
                    nextBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        slideTo(memoryId, (carouselState[memoryId] || 0) + 1, totalImages, true);
                        startAutoSlide(memoryId, totalImages); // Reset lại chu kỳ 2s
                    });
                }

                dots.forEach(d => {
                    d.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(d.getAttribute('data-dot-idx'));
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
                        if (!isImg) continue;
                        try {
                            const base64 = await compressImage(file, 1000, 0.72);
                            if (base64) newCompressedImages.push(base64);
                        } catch (err) {
                            Logger.log('IMAGE_COMPRESS_ERROR', `Lỗi xử lý file ${file.name}`, { error: String(err) });
                        }
                    }

                    if (newCompressedImages.length) {
                        btnText.textContent = 'Đang đồng bộ...';
                        const finalUploadedUrls = await uploadImagesToServer(newCompressedImages);
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
    const removeVietnameseTones = (str) => {
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
    };

    // Tìm kiếm các kỷ niệm của đôi bạn thuộc tỉnh thành này
    const findMemoriesForProvince = (prov, memories) => {
        if (!memories || !memories.length) return [];
        const nameNorm = removeVietnameseTones(prov.name);
        const shortNorm = removeVietnameseTones(prov.shortName);
        const aliasNorms = (prov.aliases || []).map(a => removeVietnameseTones(a)).filter(a => a.length >= 2);

        return memories.filter(m => {
            if (!m.location) return false;
            const locNorm = removeVietnameseTones(m.location);
            
            // So khớp trực tiếp tên tỉnh / thành phố
            if (locNorm.includes(nameNorm) || nameNorm.includes(locNorm)) return true;
            if (locNorm.includes(shortNorm) || shortNorm.includes(locNorm)) return true;
            
            // So khớp danh sách bí danh, danh lam, địa danh du lịch nổi tiếng
            return aliasNorms.some(alias => locNorm.includes(alias) || alias.includes(locNorm));
        });
    };

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
                                        <img src="${firstImg}" class="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform">
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

    // Hàm chọn địa điểm trên bản đồ
    const selectMapLocation = (provId, shouldScrollToFeed = false) => {
        selectedLocationId = provId;
        updateLocationDetailsBox(provId, shouldScrollToFeed);
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
                this.setPan(this.startViewX - svgDx, this.startViewY - svgDy);
            });

            window.addEventListener('mouseup', () => {
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
                    this.zoomToPoint(initialPinchZoom * scale, midX, midY);
                } else if (e.touches.length === 1 && this.currentZoom > 1.05) {
                    if (e.cancelable) e.preventDefault();
                    const rect = svg.getBoundingClientRect();
                    const dx = (e.touches[0].clientX - touchStartX) * (this.viewW / rect.width);
                    const dy = (e.touches[0].clientY - touchStartY) * (this.viewH / rect.height);
                    this.setPan(touchStartViewX - dx, touchStartViewY - dy);
                }
            }, { passive: false });

            wrapper.addEventListener('touchend', () => {
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
                            <filter id="pin-shadow-${p.id}" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#e11d48" flood-opacity="0.38"/>
                            </filter>
                        </defs>
                        <!-- Vòng hào quang đập nhịp tim phát sáng -->
                        <circle cx="${px}" cy="${py}" r="${photoR + 7}" class="province-pin-halo pin-halo-circle" fill="rgba(244, 63, 94, 0.22)" stroke="#e11d48" stroke-width="1.5" />
                        <!-- Khung viền ảnh lãng mạn -->
                        <circle cx="${px}" cy="${py}" r="${photoR + 2.5}" class="pin-frame-circle" fill="#ffffff" stroke="#e11d48" stroke-width="2.5" filter="url(#pin-shadow-${p.id})" />
                        <!-- Ảnh đại diện chụp tại địa điểm này -->
                        <image class="pin-photo-img" href="${firstPhoto}" x="${px - photoR}" y="${py - photoR}" width="${photoR * 2}" height="${photoR * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-pin-${p.id})" />
                        <!-- Huy hiệu trái tim nhỏ xinh ở góc trên -->
                        <g class="pin-heart-badge" transform="translate(${px + photoR * 0.72}, ${py - photoR * 0.72})">
                            <circle cx="0" cy="0" r="${Math.max(5.5, photoR * 0.32)}" fill="#e11d48" stroke="#ffffff" stroke-width="1.5" />
                            <text x="0" y="${photoR * 0.12}" text-anchor="middle" font-size="${Math.max(6.5, photoR * 0.36)}" fill="#ffffff">❤️</text>
                        </g>
                        <!-- Thẻ tên địa danh và số lượng ảnh -->
                        <g class="pin-label-badge" transform="translate(${px}, ${py + photoR + 4})">
                            <rect x="-${badgeW / 2}" y="0" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" class="pin-badge-rect" fill="#ffffff" stroke="#f43f5e" stroke-width="1.2" filter="url(#pin-shadow-${p.id})" />
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
            if (visitedProvinces.length > 0) {
                chipsContainer.innerHTML = visitedProvinces.map(p => {
                    const count = (provinceMemoryMap[p.id] || []).length;
                    const isSelected = p.id === selectedLocationId;
                    return `
                        <button class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${isSelected ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200/80'}" onclick="window.selectAndScrollMap('${p.id}')">
                            <span>📍 ${p.shortName}</span>
                            <span class="${isSelected ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'} rounded-full px-1.5 py-0.2 text-[10px] font-extrabold">${count}</span>
                        </button>
                    `;
                }).join('');
            } else {
                chipsContainer.innerHTML = `
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

        // Di chuột tới đâu, tim bung tỏa tới đó
        window.addEventListener('mousemove', (e) => {
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
            const count = 7;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
                createHeartParticle(e.clientX, e.clientY, true, angle, 0.8 + Math.random() * 0.5);
            }
        }, { passive: true });

        // Hỗ trợ lướt ngón tay trên điện thoại / tablet
        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                const touch = e.touches[0];
                const now = performance.now();
                const dist = Math.hypot(touch.clientX - lastX, touch.clientY - lastY);
                if (dist >= minDistance || now - lastTime >= minInterval) {
                    lastX = touch.clientX;
                    lastY = touch.clientY;
                    lastTime = now;
                    createHeartParticle(touch.clientX, touch.clientY, false);
                }
            }
        }, { passive: true });
    };

    initHeartCursorTrail();

    // Khởi tạo kiểm tra đăng nhập ban đầu & render bản đồ
    checkInitialLogin();
    renderVietnamMap();
    MemoryStore.initSync();
    Logger.log('APP_READY', 'Hệ thống đã khởi tạo hoàn tất');
});

