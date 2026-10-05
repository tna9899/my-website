# 📖 Hướng Dẫn Tạo Firebase & Lấy Cấu Hình (Miễn Phí 100%)

Tài liệu này hướng dẫn bạn cách tạo một dự án **Google Firebase** miễn phí chỉ trong **3 - 5 phút** để lưu trữ ảnh và đồng bộ thời gian thực (Realtime) giữa mọi thiết bị (Điện thoại, Máy tính, iPad).

---

## 🚀 Bước 1: Tạo Dự Án Firebase Mới

1. Mở trình duyệt và truy cập: **[https://console.firebase.google.com/](https://console.firebase.google.com/)**
2. Đăng nhập bằng tài khoản Google (Gmail) của bạn.
3. Bấm vào nút **"Add project"** (hoặc **"Thêm dự án"**).
4. Điền tên dự án: ví dụ `anhuyen-wedding` (hoặc tên tùy thích) ➔ Bấm **Continue**.
5. Ở bước **Google Analytics**: Bạn hãy **TẮT** công tắc (Disable) để tạo nhanh và không bị hỏi thêm các bước phức tạp ➔ Bấm **Create project**.
6. Đợi 10 giây cho hệ thống thiết lập xong ➔ Bấm **Continue**.

---

## ⚡ Bước 2: Bật Realtime Database (Cơ sở dữ liệu thời gian thực)

1. Ở thanh menu bên trái, tìm và bấm vào mục **Build** ➔ Chọn **Realtime Database**.
2. Bấm vào nút **Create Database**.
3. **Database location**: Chọn vị trí gần Việt Nam nhất (khuyến nghị chọn **Singapore `asia-southeast1`** hoặc **United States**).
4. Ở bước chọn **Security rules**:
   - Chọn mục **"Start in test mode"** (Bắt đầu ở chế độ thử nghiệm).
   - Bấm **Enable**.
5. Sau khi tạo xong, chuyển sang tab **Rules** (ở phía trên), kiểm tra và đảm bảo nội dung rules như sau:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   ➔ Bấm **Publish** để lưu.

---

## 📦 Bước 3: Bật Cloud Storage (Lưu trữ ảnh Google CDN)

1. Ở thanh menu bên trái, tìm mục **Build** ➔ Chọn **Storage**.
2. Bấm vào nút **Get started**.
3. Ở bước chọn **Security rules**:
   - Chọn mục **"Start in test mode"** ➔ Bấm **Next**.
4. **Cloud Storage location**: Giữ nguyên mặc định hoặc chọn cùng khu vực (`asia-southeast1`) ➔ Bấm **Done**.
5. Sau khi tạo xong, chuyển sang tab **Rules** (ở phía trên), đổi nội dung thành:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   ➔ Bấm **Publish** để lưu.

---

## 🔑 Bước 4: Lấy Mã Cấu Hình Web App (Firebase Config)

1. Ở góc trên cùng bên trái màn hình Firebase Console, bấm vào biểu tượng bánh răng ⚙️ bên cạnh chữ **Project Overview** ➔ Chọn **Project settings** (Cài đặt dự án).
2. Cuộn chuột xuống dưới cùng trang tới mục **"Your apps"**.
3. Bấm vào biểu tượng Web **`</>`**.
4. Điền tên app (ví dụ: `my-website`) ➔ **KHÔNG** cần tích chọn Firebase Hosting ➔ Bấm **Register app**.
5. Firebase sẽ hiển thị đoạn mã cấu hình tương tự như sau:
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

## 📲 Bước 5: Kích Hoạt Trên Website

Bạn có thể kích hoạt bằng **1 trong 2 cách** sau:

### Cách 1: Dán trực tiếp trên giao diện Website (Nhanh nhất & Khuyên Dùng)
1. Mở trang web: **[https://tna9899.github.io/my-website/](https://tna9899.github.io/my-website/)**
2. Đăng nhập tài khoản quản trị viên: `anhuyen` / `123456`.
3. Bấm vào nút **Cài Đặt** (biểu tượng bánh răng ⚙️ ở góc trang web).
4. Tìm mục **"Cấu hình Google Firebase Đám Mây"**:
   - Dán toàn bộ đoạn mã `firebaseConfig` (hoặc chuỗi JSON) vào ô văn bản.
   - Bấm **"Lưu & Kích Hoạt Firebase"**.
5. Huy hiệu trạng thái sẽ chuyển sang **🟢 Đã kết nối Firebase Thời Gian Thực**.

### Cách 2: Dán vào file `firebase-config.js` trong thư mục dự án
1. Mở file `firebase-config.js`.
2. Dán các giá trị của bạn vào biến `firebaseConfig`.
3. Lưu file, commit và push lên GitHub.

---

## 🎉 Tận Hưởng Thành Quả!
- Khi bạn đăng ảnh mới trên điện thoại, ảnh sẽ tải thẳng lên Google Cloud CDN.
- Màn hình máy tính sẽ **lập tức xuất hiện ảnh mới trong 0.1 giây** mà không cần bấm F5 hay tải lại trang!
