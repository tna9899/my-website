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
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
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
            let configObj = configInput;
            if (typeof configInput === 'string') {
                let cleanStr = configInput.trim();
                // Nếu người dùng copy cả "const firebaseConfig = { ... };"
                if (cleanStr.includes('{') && cleanStr.includes('}')) {
                    const start = cleanStr.indexOf('{');
                    const end = cleanStr.lastIndexOf('}');
                    cleanStr = cleanStr.substring(start, end + 1);
                }
                // Thay thế các key không có ngoặc kép để JSON.parse đọc được
                cleanStr = cleanStr.replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":');
                // Xóa dấu phẩy thừa cuối object
                cleanStr = cleanStr.replace(/,\s*}/g, '}');
                configObj = JSON.parse(cleanStr);
            }

            if (!configObj || !configObj.apiKey || !configObj.projectId) {
                throw new Error('Cấu hình Firebase phải bao gồm tối thiểu "apiKey" và "projectId"!');
            }

            localStorage.setItem('weddingFirebaseConfig', JSON.stringify(configObj));
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
