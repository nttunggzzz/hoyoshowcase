# HoyoShowcase

Ứng dụng local lấy dữ liệu Genshin Battle Chronicle, xem gallery/build và tạo ảnh Preview account tùy chỉnh. Node.js 22+, ES modules, không dependency khi chạy.

## Chạy

```sh
git clone https://github.com/Ponie25/HoyoShowcase.git
cd HoyoShowcase
npm ci
npm start
```

Mở **http://127.0.0.1:47932/**. Đăng nhập HoYoLAB Web trong app; tự hoàn tất CAPTCHA/xác minh khi nhà cung cấp yêu cầu. App không tự gửi OTP.

## Tài liệu HTML

Mở **http://127.0.0.1:47932/README.html** khi app chạy, hoặc mở file [README.html](README.html) trực tiếp từ thư mục. GitHub hiển thị source HTML; các trang được thiết kế để đọc offline/local.

- [Bắt đầu, lệnh chạy, cấu hình](README.html)
- [Kiến trúc và bản đồ source](docs/architecture.html)
- [Quy trình hai người cùng làm](docs/contributing.html)
- [Dữ liệu, API và sự kiện frontend](docs/data-model.html)
- [Phiên, lưu trữ và dữ liệu riêng](docs/security.html)
- [Xử lý lỗi](docs/troubleshooting.html)

## Phát triển

```sh
npm run demo     # dữ liệu giả lập, port 47933
npm run dev      # watch server; tải lại browser cho frontend
npm run check    # format, syntax, docs, private files, tests
```

Source: `src/server`, `src/shared`, `public`; tests/fixtures giả lập ở `tests`. Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước khi mở PR. CI kiểm tra Node 22/24 trên Linux/Windows.

Dữ liệu tài khoản thật nằm trong `data/` và bị Git bỏ qua; credential chỉ giữ trong RAM tối đa 20 phút. Repo mới clone sẽ chưa có dữ liệu tài khoản. Vũ khí/thánh di vật là các bản đang trang bị, không đại diện toàn bộ túi đồ.

Asset game và font có quyền riêng; xem [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Project cộng đồng, không phải ứng dụng chính thức của HoYoverse. Chưa chọn license riêng cho mã gốc của project.
