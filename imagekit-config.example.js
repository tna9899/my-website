/**
 * CẤU HÌNH IMAGEKIT.IO - LƯU TRỮ ẢNH VĨNH VIỄN MIỄN PHÍ
 * -----------------------------------------------------------------
 * ImageKit.io cung cấp 20GB băng thông tải ảnh miễn phí trọn đời mỗi tháng.
 * Không yêu cầu thẻ tín dụng, không lo phát sinh phí như Firebase!
 *
 * Cách lấy thông tin cấu hình (chỉ mất 2 phút):
 * 1. Đăng ký tài khoản miễn phí tại: https://imagekit.io/registration
 * 2. Đăng nhập -> Chọn mục "Developer options" (hoặc biểu tượng bánh răng)
 * 3. Sao chép "Public Key", "Private Key", và "URL Endpoint" dán vào bên dưới:
 * -----------------------------------------------------------------
 */

const imagekitConfig = {
    publicKey: "YOUR_IMAGEKIT_PUBLIC_KEY",
    privateKey: "YOUR_IMAGEKIT_PRIVATE_KEY",
    urlEndpoint: "https://ik.imagekit.io/YOUR_IMAGEKIT_ID"
};

// Kiểm tra xem đã điền thông tin thật chưa
window.isImageKitConfigured = Boolean(
    imagekitConfig.publicKey && 
    imagekitConfig.publicKey !== "YOUR_IMAGEKIT_PUBLIC_KEY" &&
    imagekitConfig.urlEndpoint &&
    imagekitConfig.urlEndpoint !== "https://ik.imagekit.io/YOUR_IMAGEKIT_ID"
);

/**
 * Hàm tự động tạo chữ ký HMAC-SHA1 bảo mật chuẩn ImageKit bằng Web Crypto API
 * Hoạt động 100% trên cả điện thoại (iOS, Android) và máy tính không cần cài thư viện ngoài
 */
window.getImageKitAuth = async function() {
    if (!window.isImageKitConfigured || !imagekitConfig.privateKey) {
        throw new Error('Chưa điền Private Key trong imagekit-config.js');
    }

    const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now();
    const expire = Math.floor(Date.now() / 1000) + 1800; // Có hiệu lực trong 30 phút

    const encoder = new TextEncoder();
    const keyData = encoder.encode(imagekitConfig.privateKey);
    const messageData = encoder.encode(token + String(expire));

    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const sigBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(sigBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
        token: token,
        expire: expire,
        signature: signature
    };
};
