# Cùng phát triển HoyoShowcase

Hướng dẫn đầy đủ: [docs/contributing.html](docs/contributing.html).

1. Tạo nhánh từ `main` mới nhất, ví dụ `feat/preview-layout` hoặc `fix/collector-pagination`.
2. Chia công việc theo server/frontend và báo nhau trước khi sửa `src/shared/preview-config.mjs` hoặc hợp đồng JSON/sự kiện.
3. Chạy `npm ci`, `npm run check`; dùng `npm run format` để sửa định dạng.
4. Mở PR nhỏ, ghi rõ hành vi, cách kiểm tra và ảnh giao diện khi cần. Người còn lại review trước khi merge.
5. Giữ dữ liệu thật ở `data/`; chỉ dùng fixture giả lập trong test/CI.
