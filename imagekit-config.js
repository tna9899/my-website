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
    publicKey: "public_40B+sKfyhW9/0sHo3fH/Po03KsE=",
    privateKey: "private_56DTP94rfNX81lg0BadRFHO1QQM=",
    urlEndpoint: "https://ik.imagekit.io/anhuyen"
};

// Đảm bảo gắn vào window cho toàn bộ ứng dụng truy cập
window.imagekitConfig = imagekitConfig;

// Kiểm tra xem đã điền thông tin thật chưa
window.isImageKitConfigured = Boolean(
    imagekitConfig.publicKey && 
    !imagekitConfig.publicKey.includes("YOUR_") &&
    imagekitConfig.privateKey &&
    !imagekitConfig.privateKey.includes("YOUR_") &&
    imagekitConfig.urlEndpoint &&
    !imagekitConfig.urlEndpoint.includes("YOUR_")
);

/**
 * Thuật toán SHA-1 / HMAC-SHA-1 bằng Javascript thuần (Pure JS)
 * Đảm bảo 100% hoạt động trên mọi điện thoại di động (kể cả mở trong Zalo, Facebook Webview, HTTP LAN)
 * ngay cả khi window.crypto.subtle không khả dụng.
 */
function jsHmacSha1(keyStr, messageStr) {
    function sha1(bytes) {
        function add(x, y) {
            const lsw = (x & 0xFFFF) + (y & 0xFFFF);
            const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }
        function rol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
        function ft(t, b, c, d) {
            if (t < 20) return (b & c) | ((~b) & d);
            if (t < 40) return b ^ c ^ d;
            if (t < 60) return (b & c) | (b & d) | (c & d);
            return b ^ c ^ d;
        }
        function kt(t) {
            return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
        }

        const words = [];
        for (let i = 0; i < bytes.length; i++) {
            words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
        }
        const bitLen = bytes.length * 8;
        words[bitLen >> 5] |= 0x80 << (24 - (bitLen % 32));
        words[(((bitLen + 64) >> 9) << 4) + 15] = bitLen;

        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;
        const w = new Array(80);

        for (let i = 0; i < words.length; i += 16) {
            const olda = a, oldb = b, oldc = c, oldd = d, olde = e;
            for (let j = 0; j < 80; j++) {
                if (j < 16) w[j] = words[i + j] || 0;
                else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);

                const t = add(add(rol(a, 5), ft(j, b, c, d)), add(add(e, w[j]), kt(j)));
                e = d; d = c; c = rol(b, 30); b = a; a = t;
            }
            a = add(a, olda); b = add(b, oldb); c = add(c, oldc); d = add(d, oldd); e = add(e, olde);
        }

        const out = [];
        [a, b, c, d, e].forEach(v => {
            out.push((v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF);
        });
        return out;
    }

    const utf8Encoder = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : {
        encode: (s) => {
            const arr = [];
            for (let i = 0; i < s.length; i++) {
                let code = s.charCodeAt(i);
                if (code < 128) arr.push(code);
                else if (code < 2048) arr.push((code >> 6) | 192, (code & 63) | 128);
                else arr.push((code >> 12) | 224, ((code >> 6) & 63) | 128, (code & 63) | 128);
            }
            return new Uint8Array(arr);
        }
    };

    let key = Array.from(utf8Encoder.encode(keyStr));
    const msg = Array.from(utf8Encoder.encode(messageStr));

    if (key.length > 64) key = sha1(key);
    while (key.length < 64) key.push(0);

    const oPad = key.map(b => b ^ 0x5C);
    const iPad = key.map(b => b ^ 0x36);

    const innerHash = sha1(iPad.concat(msg));
    const outerHash = sha1(oPad.concat(innerHash));

    return outerHash.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hàm tự động tạo chữ ký HMAC-SHA1 bảo mật chuẩn ImageKit
 * Hoạt động 100% trên cả điện thoại (iOS, Android, Webview) và máy tính
 */
window.getImageKitAuth = async function() {
    if (!window.isImageKitConfigured || !imagekitConfig.privateKey) {
        throw new Error('Chưa điền Private Key trong imagekit-config.js');
    }

    const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now();
    const expire = Math.floor(Date.now() / 1000) + 1800; // Có hiệu lực trong 30 phút
    const rawData = token + String(expire);

    let signature = '';

    // Cách 1: Ưu tiên dùng Web Crypto API chuẩn (HTTPS)
    if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.importKey === 'function') {
        try {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(imagekitConfig.privateKey);
            const messageData = encoder.encode(rawData);

            const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-1' },
                false,
                ['sign']
            );

            const sigBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
            const hashArray = Array.from(new Uint8Array(sigBuffer));
            signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn('[ImageKit Auth] Web Crypto thất bại, chuyển sang Pure JS HMAC-SHA1:', e);
        }
    }

    // Cách 2: Dự phòng Pure JS HMAC-SHA1 nếu không có Web Crypto (Safari cũ, Webview di động, HTTP)
    if (!signature) {
        signature = jsHmacSha1(imagekitConfig.privateKey, rawData);
    }

    return {
        token: token,
        expire: expire,
        signature: signature
    };
};
