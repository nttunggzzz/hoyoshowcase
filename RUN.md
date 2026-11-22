# Hướng dẫn Chạy HoyoShowcase (RUN.md)

Tài liệu hướng dẫn triển khai và vận hành HoyoShowcase dành cho tự động hóa và tích hợp hệ thống.

---

## 1. Yêu cầu Môi trường
* **Node.js**: Phiên bản **>= 22.0.0** (Khuyến nghị Node.js 22 LTS hoặc Node.js 24).
* **NPM**: Đi kèm với Node.js.
* **Hệ điều hành**: Windows / macOS / Linux.
* **Mô hình kiến trúc**: ES Modules (`"type": "module"`), thuần chuẩn Web API và Node core modules, không phụ thuộc thư viện runtime bên thứ ba (Zero runtime dependencies).

---

## 2. Cài đặt & Khởi động

### Cài đặt
Từ thư mục gốc dự án:
```bash
npm install
# hoặc
npm ci
```

### Khởi chạy Server
```bash
npm start
# hoặc chạy trực tiếp bằng Node
node src/server/index.mjs
```

Chạy chế độ phát triển (tự reload khi đổi file server):
```bash
npm run dev
```

Kiểm thử toàn bộ hệ thống (Mock Unit Tests):
```bash
npm test
```

---

## 3. Cổng Server & Truy cập Giao diện
* **Port mặc định**: `47932`
* **Địa chỉ truy cập**:
  * Giao diện chính: [http://127.0.0.1:47932/](http://127.0.0.1:47932/)
  * Tài liệu kỹ thuật: [http://127.0.0.1:47932/README.html](http://127.0.0.1:47932/README.html)
* **Tùy chỉnh Port**: Thiết lập biến môi trường `HOYO_PORT`:
  ```bash
  # Linux / macOS
  export HOYO_PORT=8080
  npm start

  # Windows PowerShell
  $env:HOYO_PORT="8080"
  npm start
  ```

---

## 4. Cách sử dụng Giao diện Đăng nhập & Thu thập
1. Mở trình duyệt và truy cập `http://127.0.0.1:47932/`.
2. Chọn game cần thao tác: **Genshin Impact** hoặc **Honkai: Star Rail**.
3. Nhập Email / Username và Mật khẩu tài khoản HoYoverse.
4. Trường hợp HoYoverse yêu cầu CAPTCHA xếp hình hoặc mã OTP email: giao diện sẽ hiển thị popup để hoàn tất xác minh theo thời gian thực.
5. Sau khi đăng nhập thành công:
   * Chọn nhân vật / Server tương ứng từ danh sách UID.
   * Hệ thống tự động thu thập Battle Chronicle (Nhân vật, Vũ khí/Nón ánh sáng, Thánh di vật/Di vật, Vết tích, Tinh hồn...).
   * Khung Preview Showcase hiển thị thẻ ảnh tài khoản và tự động lấy số Pity thật qua API gacha.

---

## 5. Danh sách Thư mục Dữ liệu Cần Quyền Ghi
Ứng dụng cần quyền đọc/ghi trên các thư mục cục bộ sau:
* `data/`: Thư mục lưu trữ snapshot dữ liệu JSON, cache và lịch sử tài khoản.
  * `data/history/`: Lưu trữ lịch sử snapshot theo UID.
  * `data/wish/` & `data/pity/`: Lưu trữ hoặc đọc file cấu hình pity/gacha bổ trợ nếu có.
  * `data/acc-card/`: Lưu trữ thông tin thẻ tài khoản xuất ra cho bot/quy trình ngoài.

> **Lưu ý bảo mật**: Toàn bộ thư mục `data/*` (ngoại trừ file giữ chỗ `data/.gitkeep`) đã được cấu hình trong `.gitignore` để không bao giờ bị đẩy lên kho mã nguồn chung. Credential đăng nhập chỉ được lưu tạm trong RAM tối đa 20 phút và tự hủy khi hết phiên.
