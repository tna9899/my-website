# 📸 HƯỚNG DẪN ĐĂNG KÝ VÀ CẤU HÌNH IMAGEKIT.IO (100% MIỄN PHÍ)

**ImageKit.io** là dịch vụ lưu trữ và tối ưu hóa hình ảnh đám mây hàng đầu thế giới với CDN siêu tốc.
- ✅ **20 GB băng thông tải ảnh mỗi tháng hoàn toàn MIỄN PHÍ** (Đủ xem hàng chục nghìn lượt ảnh).
- ✅ **KHÔNG yêu cầu thẻ tín dụng / visa** (Không bao giờ lo bị trừ tiền như Firebase).
- ✅ **Lưu trữ ảnh vĩnh viễn** không bị mất khi tắt máy tính hay khi deploy lên cloud.
- ✅ **Tự động tối ưu dung lượng & giữ nét 100%**, ảnh load nhanh gấp 5 lần trên điện thoại 4G.

---

## 📌 BƯỚC 1: Đăng Ký Tài Khoản Miễn Phí (Chỉ mất 1 phút)

1. Truy cập trang đăng ký: 👉 **[https://imagekit.io/registration](https://imagekit.io/registration)**
2. Nhập Email và Mật khẩu của bạn (hoặc bấm **Sign in with Google**).
3. Ở bước chọn **ImageKit ID** (Tên miền ảnh): Bạn có thể đặt tên bất kỳ, ví dụ `anhuyen` hoặc `ngocanh-tuuyen`.
4. Bấm **Complete setup** để vào màn hình chính.

---

## 📌 BƯỚC 2: Lấy Khóa API (API Keys)

1. Tại thanh menu bên trái, tìm và bấm vào biểu tượng bánh răng **⚙️ Settings** hoặc mục **Developer Options** (hoặc truy cập trực tiếp: [https://imagekit.io/dashboard/developer/api-keys](https://imagekit.io/dashboard/developer/api-keys)).
2. Bạn sẽ thấy 3 thông tin quan trọng:
   - **URL-endpoint**: dạng `https://ik.imagekit.io/tên_id_của_bạn`
   - **Public Key**: dạng `public_xxxxxxxxxxxxxxxxxxxx`
   - **Private Key**: dạng `private_xxxxxxxxxxxxxxxxxxx` (Bấm nút hình con mắt để hiện)
3. Sao chép 3 giá trị này.

---

## 📌 BƯỚC 3: Dán Thông Tin Vào Dự Án

1. Mở file **`imagekit-config.js`** trong thư mục dự án của bạn:
   ```javascript
   const imagekitConfig = {
       publicKey: "public_xxxxxxxxxxxxxxxxxxxx",
       privateKey: "private_xxxxxxxxxxxxxxxxxxx",
       urlEndpoint: "https://ik.imagekit.io/tên_id_của_bạn"
   };
   ```
2. Lưu file lại. Thế là xong!

---

## 📌 BƯỚC 4: Chuyển Toàn Bộ Ảnh Cũ Lên ImageKit (1-Click)

1. Mở file **`migrate_to_imagekit.html`** trên trình duyệt (hoặc khởi động server rồi vào `http://localhost:8080/migrate_to_imagekit.html`).
2. Bấm nút **"Nạp memories.json"** ➜ Bấm **"Bắt đầu chuyển ảnh lên ImageKit"**.
3. Hệ thống sẽ tự động tải toàn bộ ảnh trong thư mục `uploads/` lên ImageKit.io và đổi đường dẫn trong `memories.json` sang link CDN đám mây vĩnh viễn!

---

## 📌 BƯỚC 5: Tận Hưởng

Từ giờ trở đi:
- Bất cứ khi nào bạn hoặc người thương đăng ảnh kỷ niệm mới trên điện thoại hay máy tính, ảnh sẽ được tự động tải thẳng lên **ImageKit.io**.
- Ảnh hiển thị sắc nét, siêu nhanh trên mọi thiết bị và không bao giờ bị mất!
