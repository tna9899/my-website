# 📖 Hướng Dẫn Tạo Firebase Realtime Database (Miễn Phí 100%)

Mô hình hoạt động tối ưu của website:
- 📸 **Lưu trữ ảnh**: Toàn bộ ảnh được lưu trữ trên **ImageKit.io** (20GB CDN miễn phí, đã cấu hình sẵn trong web).
- ⚡ **Đồng bộ thời gian thực**: Sử dụng **Firebase Realtime Database** để truyền tín hiệu cập nhật tức thì (**dưới 0.1 giây**) giữa Điện thoại và Máy tính.
- 🌐 **Đường link website**: Giữ nguyên tên miền GitHub Pages của bạn: `https://tna9899.github.io/my-website/`.

Bạn chỉ mất khoảng **2 phút** để kích hoạt:

---

## 🚀 Bước 1: Tạo Dự Án Firebase Mới

1. Truy cập: **[https://console.firebase.google.com/](https://console.firebase.google.com/)**
2. Đăng nhập bằng tài khoản Google (Gmail) của bạn.
3. Bấm vào nút **"Add project"** (hoặc **"Thêm dự án"**).
4. Điền tên dự án: ví dụ `anhuyen-wedding` ➔ Bấm **Continue**.
5. Ở bước **Google Analytics**: Hãy **TẮT** công tắc (Disable) để tạo nhanh gọn ➔ Bấm **Create project**.
6. Đợi vài giây rồi bấm **Continue**.

---

## ⚡ Bước 2: Bật Realtime Database (Đồng bộ tức thì)

1. Ở thanh menu bên trái, tìm và bấm vào mục **Build** ➔ Chọn **Realtime Database**.
2. Bấm nút **Create Database**.
3. **Database location**: Chọn **Singapore `asia-southeast1`** (hoặc United States) để tốc độ nhanh nhất.
4. Ở bước chọn **Security rules**:
   - Chọn **"Start in test mode"** (Bắt đầu ở chế độ thử nghiệm).
   - Bấm **Enable**.
5. Sau khi tạo xong, chuyển sang tab **Rules** (ở phía trên), đảm bảo nội dung rules là:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   ➔ Bấm **Publish** để lưu.

*(Lưu ý: Bạn KHÔNG CẦN bật Storage của Firebase vì ảnh đã được lưu trữ vĩnh viễn trên ImageKit).*

---

## 🔑 Bước 3: Lấy Mã Cấu Hình Web App (Firebase Config)

1. Ở góc trên cùng bên trái màn hình Firebase Console, bấm vào biểu tượng bánh răng ⚙️ bên cạnh chữ **Project Overview** ➔ Chọn **Project settings** (Cài đặt dự án).
2. Cuộn chuột xuống dưới cùng trang tới mục **"Your apps"**.
3. Bấm vào biểu tượng Web **`</>`**.
4. Điền tên app (ví dụ: `my-website`) ➔ **KHÔNG** cần tích chọn Firebase Hosting ➔ Bấm **Register app**.
5. Firebase sẽ hiển thị đoạn mã tương tự như sau:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyD-xxxxxxxxxxxxxxxxxxxx",
     authDomain: "anhuyen-wedding.firebaseapp.com",
     databaseURL: "https://anhuyen-wedding-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "anhuyen-wedding",
     storageBucket: "anhuyen-wedding.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```

---

## 📲 Bước 4: Dán Vào Website Để Kích Hoạt

1. Mở trang web: **[https://tna9899.github.io/my-website/](https://tna9899.github.io/my-website/)**
2. Đăng nhập tài khoản quản trị: `anhuyen` / `123456`.
3. Bấm vào nút **Cài Đặt** (biểu tượng bánh răng ⚙️ ở góc trang web).
4. Tìm mục **"Google Firebase (Đồng Bộ Thời Gian Thực)"**:
   - Dán toàn bộ đoạn mã `firebaseConfig` (hoặc chuỗi JSON) vào ô văn bản.
   - Bấm **"Lưu & Kích Hoạt Firebase"**.
5. Trang web sẽ tải lại và hiển thị huy hiệu: **🟢 Đã kết nối Realtime**.

---

## 🎉 Tận Hưởng Thành Quả!
- Ảnh tải lên sẽ được lưu trên **ImageKit CDN**.
- Dữ liệu kỷ niệm được truyền qua **Firebase WebSocket**: Đăng ảnh trên điện thoại thì máy tính sẽ **lập tức nhảy ảnh mới trong 0.1 giây**!
