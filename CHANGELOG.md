# Changelog

## 0.7.0 · 2026-11-02

- Tách source server, frontend, logic preview dùng chung và test thành các thư mục riêng.
- Tách endpoint/cookie/transport, quản lý phiên, API/static routes và lưu snapshot khỏi HTTP app.
- Tách controller, form, renderer, media và primitive canvas của Preview account.
- Chuẩn hóa source bằng Prettier; thêm lockfile, EditorConfig và kiểm tra tự động.
- Thêm README HTML và handbook cho kiến trúc, cộng tác, dữ liệu/API, phiên và xử lý lỗi.
- Thêm CI Node 22/24 trên Linux/Windows và mẫu PR cho hai người cùng phát triển.
- Lưu snapshot nguyên tử theo hàng đợi; không ghi credential hoặc dữ liệu thật vào Git.
- Giữ các tính năng 0.6: collector, gallery, map native, C6, tùy chỉnh thông tin và PNG build.

## Trước khi đưa vào repo

Bản prototype 0.6 có cấu trúc phẳng và được chạy trong workspace nghiên cứu. Repo này chỉ chứa source sản phẩm, asset có nguồn và test giả lập; không nhập lịch sử capture, snapshot tài khoản hoặc runtime cũ.
