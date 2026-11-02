# Nguồn và giấy phép

## Hình ảnh game và font giao diện

Icon nguyên tố, nền thẻ độ hiếm, ảnh nền và huy hiệu vùng đất được lấy từ các asset công khai mà frontend HoYoLAB sử dụng. Nguồn từng tệp và mapping vùng nằm trong `docs/assets/game-asset-sources.json`. Các hình ảnh này giữ bản quyền của HoYoverse; thông báo MIT bên dưới không cấp phép lại hình ảnh game. Chân dung, vũ khí và thánh di vật còn dùng URL mà Battle Chronicle trả, qua cache ảnh công khai chỉ cho phép CDN HoYoverse đã xác định; không gửi cookie tài khoản tới luồng tải ảnh.

Font Outfit: Copyright 2021 The Outfit Project Authors. Giấy phép SIL Open Font License 1.1 được giữ nguyên tại `public/assets/OFL-Outfit.txt`.

Giao thức mới được đối chiếu từ `seriaati/genshin.py`, commit `a11758e4911d4d2e906290b4db013c27d023428c`; đăng nhập web đối chiếu thêm commit `83518883f840d0a318ddb18374d76d5fe29038d8`, tệp `genshin/client/components/auth/subclients/web.py`. Các phần chuyển ngữ/adapt request và DS giữ thông báo MIT dưới đây. Phần SDK được đối chiếu tài liệu API do người dùng cung cấp, có thông báo bản quyền DGP Studio; giữ thông báo tương ứng. Không lấy dữ liệu runtime hoặc kho credential cũ.

## genshin.py

MIT License

Copyright (c) 2021 sadru

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Tài liệu giao thức SDK được cung cấp

Copyright (c) DGP Studio.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
