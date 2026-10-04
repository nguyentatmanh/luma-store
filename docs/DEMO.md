# Kịch bản demo NGINX — khoảng 10–12 phút

## Chuẩn bị trước giờ học

Chạy `bash scripts/demo.sh up` trước để tải image và khởi tạo database. Kiểm tra cửa hàng ở [http://localhost:8080](http://localhost:8080), trang kỹ thuật ở [http://localhost:8080/demo.html](http://localhost:8080/demo.html).

Chọn một ảnh JPEG/PNG/WebP **lớn hơn 1 MB, nhỏ hơn 8 MB**. Cũng có thể tạo ảnh PNG hợp lệ khoảng 1,7 MB bằng Node:

```bash
node --input-type=module -e "import {writeFileSync} from 'node:fs'; import {imageFixture} from './tests/image-fixture.mjs'; writeFileSync('demo-image.png', imageFixture());"
```

Mở terminal log riêng:

```bash
bash scripts/demo.sh logs
```

Lệnh tương đương Windows: `powershell -ExecutionPolicy Bypass -File .\scripts\demo.ps1 <action>`. Ví dụ `… demo.ps1 stage 3`.

## 1. Giới thiệu ứng dụng — 1 phút

Ở stage 4 mặc định, giới thiệu cửa hàng: sản phẩm, tồn kho, phiếu nhập/xuất. Tìm một sản phẩm và nhập thêm 2 đơn vị. Chỉ ra tồn thay đổi, phiếu xuất hiện trong lịch sử.

“Đây là một cửa hàng nhỏ. NGINX đứng ở cửa vào; cùng lúc phục vụ giao diện và đưa API đến hai backend.”

## 2. Static files — 1 phút

```bash
bash scripts/demo.sh stage 1
```

Chờ khoảng 1 giây, tải lại **/demo.html**. Trang HTML/CSS/JS vẫn hiện, còn gọi API trả **503** do cấu hình của bước này. Màn hình cửa hàng hiển thị lỗi có nút thử lại.

Chỉ `root`, `index`, `location /` và `try_files` trong `nginx/stages/1.conf`.

## 3. Reverse proxy — 1–2 phút

```bash
bash scripts/demo.sh stage 2
```

Tải lại trang kỹ thuật, bấm **Gọi 20 request**. Tất cả trả từ **BACKEND-01**.

Chỉ `location /api/`, `proxy_pass` và các `proxy_set_header`. Đọc `xForwardedFor`, `xRealIp` và `xForwardedProto` trên trang.

Có thể mở [http://localhost:5001/api/server-info](http://localhost:5001/api/server-info) để đối chiếu gọi trực tiếp: header proxy không có vì request bỏ qua NGINX.

## 4. Upstream và round robin — 2 phút

```bash
bash scripts/demo.sh stage 3
```

Tải lại trang, xóa lịch sử quan sát, gọi 20 request. Cả **BACKEND-01** và **BACKEND-02** xuất hiện. Trong trạng thái ổn định, gọi tuần tự có thể thấy hai backend luân phiên.

Chỉ `upstream luma_backend` và hai `server`. Một worker được chọn cho bài demo để phân phối tuần tự dễ quan sát.

Mở cửa hàng, thêm/sửa một sản phẩm rồi tải lại. Dữ liệu vẫn có dù request đọc/ghi được các backend khác nhau phục vụ: cả hai đọc cùng MySQL.

## 5. client_max_body_size — 2 phút

Vẫn ở stage 3, dùng phần **Ảnh sản phẩm & giới hạn body** trên /demo.html:

1. Chọn một sản phẩm mẫu.
2. Chọn ảnh 1–8 MB đã chuẩn bị.
3. Tải lên → **HTTP 413**, response cho biết NGINX chặn body 1M.

```bash
bash scripts/demo.sh stage 4
```

Chờ khoảng 1 giây rồi tải lại **cùng ảnh**. Có thể giữ nguyên trang nếu muốn giữ file đã chọn; cấu hình NGINX đã reload nhưng nhãn stage chỉ đổi khi tải lại trang.

Ảnh được lưu thành WebP, hiện trong cửa hàng và phục vụ qua `/media/`. Giới hạn NGINX 20M cho request đi qua; API vẫn kiểm soát file tối đa 8 MB và xác minh nội dung ảnh.

## 6. Failover — 1 phút

Ở stage 4:

```bash
bash scripts/demo.sh stop2
```

Xóa lịch sử quan sát, gọi 20 request. Các GET thành công trả từ **BACKEND-01**. Trong log NGINX có thể thấy kết nối đến backend 02 bị lỗi rồi chuyển backend 01.

```bash
bash scripts/demo.sh start2
```

Đợi backend sẵn sàng và ít nhất vài giây sau lần lỗi, gọi thêm request. Backend 02 trở lại.

Đây là failover cho request đọc. NGINX không tự retry request ghi đã gửi; thao tác ghi cần cơ chế chống trùng nếu mở rộng sau này.

## 7. HTTPS và tên miền local — 2 phút

Tạo cert bằng OpenSSL trên Linux/macOS/WSL hoặc Windows có OpenSSL:

```bash
bash scripts/demo.sh cert
bash scripts/demo.sh https
```

Thêm vào file hosts trên **máy chạy trình duyệt**:

```text
127.0.0.1 luma.test
```

Linux/macOS: `/etc/hosts`. Windows: `C:\Windows\System32\drivers\etc\hosts`, sửa bằng quyền quản trị.

Mở [https://luma.test:8443/demo.html](https://luma.test:8443/demo.html). Nếu chưa sửa hosts, dùng [https://localhost:8443/demo.html](https://localhost:8443/demo.html).

Chứng chỉ tự ký có SAN cho `luma.test`, `localhost` và `127.0.0.1`; trình duyệt vẫn cảnh báo vì chưa tin cậy CA. Với demo local, vào phần nâng cao để tiếp tục nếu trình duyệt cho phép.

Bấm gọi request; backend nhận `xForwardedProto=https`. Chỉ `listen 443 ssl`, `ssl_certificate` và `ssl_certificate_key`. Stage 5 vẫn có HTTP để tiện đối chiếu; không cấu hình ép redirect sang HTTPS.

Trở lại cửa hàng bình thường:

```bash
bash scripts/demo.sh http
```

Lệnh này trở về stage 4, giữ dữ liệu đã tạo.

## Khi giảng viên hỏi

| Câu hỏi | Câu trả lời gắn với code |
|---|---|
| Hai backend có hai bộ sản phẩm riêng không? | Không. Cùng MySQL và cùng volume ảnh. |
| Vì sao giao diện biết backend nào? | Response có `X-Backend-Id` và `meta.serverId`; trang demo đọc chúng. |
| Có phải log request là doanh thu? | Không. Dashboard chỉ có số sản phẩm, tồn và giá trị hàng tồn. |
| Hai người cùng xuất kho thì sao? | Service dùng transaction + row lock; yêu cầu sau đọc số dư đã cập nhật. |
| 20M có cho phép ảnh 20 MB không? | 20M là giới hạn toàn bộ body của NGINX; API giới hạn file 8 MB. |
| Tại sao không phải mọi POST đều retry? | Request ghi có thể đã commit trước lỗi phản hồi; chưa có idempotency key. |
| Có thể xem HTTPS trực tiếp bằng IP không? | Cert có SAN 127.0.0.1 nhưng vẫn tự ký, nên chưa được trình duyệt tin cậy. |
| Tại sao proxy_pass http://luma_backend; không có / ở cuối? | Nếu có `/`, NGINX cắt URI khớp `/api/` thành `/`, khiến backend Express nhận `/products` thay vì `/api/products` và trả 404. |
| Làm sao để backend 01 nhận tải gấp đôi backend 02? | Thêm tham số `weight=2` vào `server backend1:8080 weight=2 ...;` trong khối `upstream`. |
| Minh họa header X-Real-IP ở đâu phía backend? | Console log backend in trường `realIp` (`req.get('x-real-ip')`) và API `/api/server-info` trả về trường `xRealIp`. |
| Tại sao chạy Docker/WSL nhưng phải sửa file hosts của Windows? | Trình duyệt chạy trên Windows host nên phân giải DNS qua file hosts của Windows (`C:\Windows\System32\drivers\etc\hosts`). |
| Vì sao HTTPS tự ký báo Not Secure và cách sửa trên production? | Cert tự ký không thuộc Root CA Trust Store của hệ điều hành; production dùng Certbot / Let's Encrypt để lấy chứng chỉ hợp lệ. |
