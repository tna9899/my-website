/**
 * CẤU HÌNH GOOGLE FIREBASE - ĐỒNG BỘ THỜI GIAN THỰC & LƯU TRỮ ẢNH GOOGLE CLOUD
 * -------------------------------------------------------------------------
 * Firebase cung cấp:
 * 1. Cloud Storage: 5GB lưu trữ ảnh miễn phí trên Google Cloud CDN.
 * 2. Realtime Database: Đồng bộ WebSocket tức thì (< 0.1 giây) giữa mọi thiết bị.
 *
 * Xem hướng dẫn tạo Firebase miễn phí chi tiết tại file: HUONG_DAN_TAO_FIREBASE.md
 * Hoặc dán cấu hình trực tiếp vào mục "Cài Đặt" trên giao diện Website.
 * -------------------------------------------------------------------------
 */

// Cấu hình mặc định (Bạn có thể điền trực tiếp vào đây hoặc nhập qua giao diện Cài Đặt web)
const defaultFirebaseConfig = {
    apiKey: "AIzaSyD0nq6wb7EKm7eSHW3dp2F9f2GCrbTJX7o",
    authDomain: "anhuyen-e8d70.firebaseapp.com",
    databaseURL: "https://anhuyen-e8d70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "anhuyen-e8d70",
    storageBucket: "anhuyen-e8d70.firebasestorage.app",
    messagingSenderId: "21876934485",
    appId: "1:21876934485:web:190db6148cda43b01311dc",
    measurementId: "G-8GH7C4NLC6"
};

(function() {
    // 1. Kiểm tra xem người dùng đã dán cấu hình vào trình duyệt chưa
    let activeConfig = defaultFirebaseConfig;
    try {
        const storedStr = localStorage.getItem('weddingFirebaseConfig');
        if (storedStr) {
            const parsed = JSON.parse(storedStr);
            if (parsed && parsed.apiKey && parsed.projectId) {
                activeConfig = parsed;
            }
        }
    } catch (e) {
        console.warn('[Firebase] Lỗi đọc cấu hình từ localStorage:', e);
    }

    // 2. Kiểm tra tính hợp lệ của cấu hình
    const isConfigured = Boolean(
        activeConfig &&
        activeConfig.apiKey &&
        activeConfig.apiKey.trim().length > 10 &&
        !activeConfig.apiKey.includes('YOUR_') &&
        activeConfig.projectId &&
        activeConfig.projectId.trim().length > 2 &&
        !activeConfig.projectId.includes('YOUR_')
    );

    window.firebaseConfig = activeConfig;
    window.isFirebaseConfigured = isConfigured;
    window.firebaseDB = null;
    window.firebaseStorage = null;

    // 3. Khởi tạo Firebase SDK nếu đã có cấu hình và thư viện đã tải
    if (isConfigured && typeof firebase !== 'undefined') {
        try {
            // Tránh khởi tạo lặp lại
            let app;
            if (!firebase.apps || firebase.apps.length === 0) {
                app = firebase.initializeApp(activeConfig);
            } else {
                app = firebase.app();
            }

            // Khởi tạo Realtime Database
            if (typeof firebase.database === 'function') {
                try {
                    // Nếu có databaseURL hoặc suy ra từ projectId
                    if (activeConfig.databaseURL) {
                        window.firebaseDB = firebase.database();
                    } else {
                        // Thử kết nối URL mặc định của Firebase RTDB
                        window.firebaseDB = firebase.database();
                    }
                    console.log('[Firebase] Realtime Database đã sẵn sàng.');
                } catch (dbErr) {
                    console.warn('[Firebase] Khởi tạo Database cảnh báo:', dbErr.message);
                }
            }

            // Khởi tạo Cloud Storage
            if (typeof firebase.storage === 'function') {
                try {
                    window.firebaseStorage = firebase.storage();
                    console.log('[Firebase] Cloud Storage đã sẵn sàng.');
                } catch (stErr) {
                    console.warn('[Firebase] Khởi tạo Storage cảnh báo:', stErr.message);
                }
            }

            console.log('✅ [Firebase] Khởi tạo thành công cho dự án:', activeConfig.projectId);
        } catch (initErr) {
            console.error('[Firebase] Lỗi khi khởi tạo Firebase:', initErr);
        }
    }

    // 4. Các hàm tiện ích hỗ trợ lưu/xóa cấu hình từ giao diện người dùng
    window.saveFirebaseConfig = function(configInput) {
        try {
            let configObj = null;

            if (configInput && typeof configInput === 'object') {
                configObj = configInput;
            } else if (typeof configInput === 'string') {
                let str = configInput.trim();

                // 1. Cắt lấy phần đối tượng giữa cặp ngoặc nhọn { ... } nếu có
                if (str.includes('{') && str.includes('}')) {
                    const start = str.indexOf('{');
                    const end = str.lastIndexOf('}');
                    str = str.substring(start, end + 1);
                }

                // 2. Thử phân tích cú pháp bằng JSON.parse trực tiếp
                try {
                    configObj = JSON.parse(str);
                } catch (e) {}

                // 3. Nếu không phải JSON chuẩn, phân tích như JavaScript Object Literal
                if (!configObj) {
                    try {
                        const fn = new Function('return (' + str + ');');
                        const evaluated = fn();
                        if (evaluated && typeof evaluated === 'object' && !Array.isArray(evaluated)) {
                            configObj = evaluated;
                        }
                    } catch (e) {}
                }

                // 4. Fallback: Trích xuất từng trường Firebase độc lập bằng Regex
                if (!configObj || !configObj.apiKey || !configObj.projectId) {
                    const fields = {};
                    const knownKeys = [
                        'apiKey', 'authDomain', 'databaseURL', 'projectId',
                        'storageBucket', 'messagingSenderId', 'appId', 'measurementId'
                    ];
                    for (const key of knownKeys) {
                        const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"\`]?([^'",\`\\r\\n}]+)['"\`]?`, 'i');
                        const match = configInput.match(regex);
                        if (match && match[1]) {
                            fields[key] = match[1].trim();
                        }
                    }
                    if (fields.apiKey && fields.projectId) {
                        configObj = fields;
                    }
                }
            }

            if (!configObj || !configObj.apiKey || !configObj.projectId) {
                throw new Error('Cấu hình Firebase không hợp lệ hoặc thiếu "apiKey" / "projectId"!');
            }

            // Chuẩn hóa và làm sạch dữ liệu các trường
            const cleanObj = {};
            for (const [k, v] of Object.entries(configObj)) {
                if (typeof v === 'string') {
                    cleanObj[k] = v.trim();
                } else if (v !== undefined && v !== null) {
                    cleanObj[k] = String(v).trim();
                }
            }

            localStorage.setItem('weddingFirebaseConfig', JSON.stringify(cleanObj, null, 2));
            window.firebaseConfig = cleanObj;
            window.isFirebaseConfigured = true;

            return { success: true, message: 'Đã lưu cấu hình Firebase thành công!' };
        } catch (err) {
            return { success: false, message: err.message };
        }
    };

    window.clearFirebaseConfig = function() {
        localStorage.removeItem('weddingFirebaseConfig');
        return true;
    };

    window.getFirebaseConfig = function() {
        return window.firebaseConfig;
    };
})();
