# Kết quả kiểm tra

Ngày kiểm tra: **03/10/2026**.

## Đã chạy thành công

| Nhóm | Bằng chứng kiểm tra |
|---|---|
| Schema | Tạo đủ bảng, 4 danh mục, 12 sản phẩm và phiếu tồn đầu kỳ |
| Danh sách / tổng quan | Phân trang, chỉ số thật, danh mục và query không hợp lệ |
| Sản phẩm | Tạo, đọc, sửa, SKU trùng, validation và API 404 |
| Quy tắc tồn | Chặn thay tồn qua PUT metadata; chặn nhập/xuất sản phẩm đã ngừng kinh doanh |
| Xuất đồng thời | Tồn 10, hai POST xuất 8 cùng lúc: một 201, một 409; còn 2; chỉ một phiếu xuất |
| Dữ liệu dùng chung | Gọi trực tiếp backend 01/02, đọc cùng sản phẩm, tồn và URL ảnh |
| Ảnh | PNG thật >1 MiB được đổi sang WebP; /media trả đúng MIME; file giả bị từ chối |
| Static NGINX | Stage 1 phục vụ HTML/CSS/JS và chủ động trả API 503 |
| Proxy | Stage 2 chỉ BACKEND-01; backend nhận các header chuyển tiếp |
| Round robin | Stage 3 trả luân phiên BACKEND-01/02 qua 12 GET tuần tự |
| Body limit | Cùng ảnh thật >1 MiB bị NGINX trả 413 ở 1M; qua được ở 20M |
| Failover | Dừng backend 02; 10 GET được backend 01 trả; backend 02 quay lại sau khi khởi động |
| HTTPS | Chứng chỉ SAN local; TLS request thành công, backend nhận scheme=https |
| UI Chromium | Thêm/sửa, SKU trùng inline, tìm kiếm, bộ lọc, bảng/thẻ, ảnh, ngừng/khôi phục kinh doanh |
| UI kho | Nhập/xuất, từ chối quá tồn, số dư sau phiếu và lịch sử đúng |
| Responsive | Các trang cửa hàng, trang demo và hộp thoại tại 390×844; không tràn chiều ngang trang |
| JavaScript | Không phát hiện page error trong các luồng đã chạy; syntax check toàn bộ file JS |
| Compose | Kiểm tra cấu hình HTTP/HTTPS, service, volume và cổng bằng Compose CLI |

Ảnh chụp các màn hình chính nằm trong [previews](previews/).

## Môi trường và giới hạn xác minh

Môi trường kiểm tra không có Docker Engine. Các bài kiểm tra đầu cuối chạy **NGINX 1.24**, **Node.js 24**, **MariaDB 10.11.14** và **Chromium 153** bằng tiến trình thật trong cùng một mạng local.

Để chạy trong môi trường kiểm tra, đổi địa chỉ container thành localhost, dùng cổng tạm và chạy NGINX một tiến trình. Chuyển stage bằng restart ở bản kiểm tra; mã giao cho người dùng dùng NGINX master thông thường và `nginx -s reload`.

Compose cấu hình ứng dụng bằng **MySQL 8.4**, **node:24-alpine** và **nginx:stable-alpine**. Đã kiểm tra Compose CLI nhưng chưa chạy build/start bằng Docker Engine và chưa kiểm tra trực tiếp MySQL 8.4. SQL dùng cú pháp chung, nhưng lần chạy Docker trên máy demo vẫn là bước xác nhận môi trường cuối cùng.

HTTPS được kiểm tra với chứng chỉ tự ký và bỏ kiểm tra độ tin cậy CA trong client test. Điều này xác nhận TLS và header; không chứng minh trình duyệt tin cậy chứng chỉ. PowerShell đã được rà mã/encoding, chưa thực thi trên Windows.

## Lệnh kiểm tra đi kèm

```bash
node scripts/check.mjs
node scripts/smoke.mjs http://localhost:8080
```

Smoke cần stage 4 và cả hai backend đang chạy. Kiểm tra này tạo dữ liệu có tiền tố QA và chuyển sản phẩm đó sang ngừng kinh doanh sau khi hoàn tất.
