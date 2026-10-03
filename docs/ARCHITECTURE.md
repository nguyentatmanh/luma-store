# Kiến trúc và cách giải thích

## Vì sao chọn cửa hàng sản phẩm?

Một thao tác thật như thêm sản phẩm, đổi ảnh hoặc nhập hàng đã đủ đi qua frontend, NGINX, backend và database. Hai backend có thể phục vụ luân phiên mà người dùng vẫn thấy một bộ dữ liệu thống nhất.

NGINX là trọng tâm. Docker, database, mạng container, volume và chứng chỉ là phần hỗ trợ tự nhiên cho tình huống.

## Trách nhiệm từng tầng

| Tầng | Trách nhiệm | Ví dụ |
|---|---|---|
| Frontend | Hiển thị, nhận thao tác, trạng thái đang tải/lỗi/trống | `pages/products.js` |
| NGINX | Static frontend, `/media/`, `/api/` proxy, giới hạn body, upstream, TLS | `nginx/stages/4.conf` |
| Route | Ghép HTTP method + URL với controller; middleware upload | `product.routes.js` |
| Controller + Validation | Đọc request, kiểm tra đầu vào, gọi service và trả envelope | `product.controller.js` |
| Service | Quy tắc và thứ tự nghiệp vụ | `inventory.service.js` |
| Repository | Truy vấn SQL với placeholder | `inventory.repository.js` |
| Infrastructure | Mã hóa và lưu ảnh | `image-storage.js` |
| Database | Lưu lâu dài, unique SKU, foreign key, transaction và row lock | `mysql/init.sql` |

Các factory nhận dependency qua tham số. `app.js` là nơi nối chúng. Cách này giữ mỗi module đọc được độc lập mà không cần một framework kiến trúc bổ sung.

## Luồng 1 — tải danh sách sản phẩm

1. `app.js` chọn trang theo hash `#products`.
2. `pages/products.js` gửi `GET /api/products` qua `api.js`.
3. NGINX phân biệt `/api/` và chuyển đến một backend trong upstream.
4. Controller kiểm tra query; service gọi repository.
5. Repository đọc MySQL, phân trang/sắp xếp tại database.
6. Response chứa `data` và `meta`; UI dựng bảng hoặc thẻ.

Frontend dùng URL tương đối. Khi chuyển HTTP sang HTTPS, frontend gọi API theo cùng origin mà không sửa code hoặc cấu hình CORS.

## Luồng 2 — nhập/xuất kho

1. Chọn sản phẩm và mở hộp thoại nhập/xuất.
2. Frontend hiển thị dự kiến tồn sau phiếu, gửi `POST /api/inventory/movements`.
3. Service mở transaction và đọc sản phẩm bằng `SELECT … FOR UPDATE`.
4. Kiểm tra trạng thái kinh doanh và số lượng. Nếu xuất quá tồn, rollback và trả 409.
5. Cập nhật tồn sản phẩm, ghi phiếu có tồn trước/sau, rồi commit.
6. UI tải lại chỉ số/danh sách. Lịch sử hiển thị phiếu mới nhất.

**Ví dụ để giải thích:** tồn 10, hai backend cùng nhận yêu cầu xuất 8. Backend lấy lock trước xuất được, còn 2. Backend còn lại đọc 2 sau khi nhận lock, nên từ chối xuất 8. Chỉ một phiếu xuất được ghi.

Không dùng biến JavaScript hoặc file JSON cục bộ để tính tồn. Khóa nằm ở database nên có hiệu lực giữa hai tiến trình.

## Luồng 3 — đổi ảnh sản phẩm

1. Biểu mẫu lưu thông tin sản phẩm, sau đó gửi ảnh bằng multipart tới `POST /api/products/:id/image`.
2. NGINX kiểm tra kích thước **toàn bộ body**. Stage 3 là 1M; stage 4 là 20M.
3. Multer giới hạn **file** ở 8 MB; Sharp đọc nội dung thật, nhận JPEG/PNG/WebP tĩnh và tối đa 20 triệu điểm ảnh.
4. Xoay theo thông tin ảnh, resize tối đa 1200×1200, mã hóa WebP, lưu tên UUID vào volume chung.
5. Transaction cập nhật tên file trong MySQL; sau commit xóa ảnh cũ.
6. UI nhận đường dẫn `/media/…webp`; NGINX đọc volume để phục vụ ảnh.

Nếu lưu metadata thành công nhưng tải ảnh thất bại, biểu mẫu báo rõ trạng thái và giữ ID đã tạo. Bấm lưu lại sẽ cập nhật sản phẩm đó, tránh tạo sản phẩm trùng.

NGINX mount ảnh readonly; backend mount read/write. Tên file thay mỗi lần upload nên ảnh mới không bị cache theo URL cũ.

## Dữ liệu

| Bảng | Quan hệ / vai trò |
|---|---|
| `categories` | Một danh mục có nhiều sản phẩm |
| `products` | SKU unique; giá nguyên theo VND; tồn, ngưỡng cảnh báo, trạng thái và tên ảnh |
| `stock_movements` | Thuộc một sản phẩm; loại, lượng, tồn trước/sau, ghi chú, thời gian |

Ngừng kinh doanh là cập nhật `is_active`. Sản phẩm và lịch sử được giữ lại; có thể khôi phục bằng biểu mẫu sửa. Tên sản phẩm trong phiếu là snapshot tại lúc tạo phiếu.

## NGINX và cổng

| Nơi truy cập | Cổng mặc định | Mục đích |
|---|---:|---|
| Host → NGINX HTTP | 8080 → 80 | Frontend, API, media |
| Host → NGINX HTTPS | 8443 → 443 | Chỉ khi bật cấu hình HTTPS |
| Host → backend 01/02 | 127.0.0.1:5001/5002 → 8080 | Đối chiếu trực tiếp khi demo |
| Backend → MySQL | mysql:3306 | Mạng nội bộ Compose; MySQL không publish ra host |

`proxy_pass http://luma_backend;` giữ nguyên tiền tố `/api/`. Thêm dấu `/` ở cuối sẽ làm thay đổi URI theo location; các route backend hiện tại cần nhận đầy đủ `/api/products`.

`max_fails=1 fail_timeout=3s` là kiểm tra lỗi thụ động: NGINX nhận lỗi kết nối rồi tạm bỏ backend. Khi thời gian hết, request sau có thể thử lại. Docker healthcheck phục vụ việc khởi động và quan sát container; nó không trực tiếp điều khiển upstream NGINX.

Không bật retry cho request ghi đã gửi đến upstream. Demo failover dùng GET; ứng dụng chưa có idempotency key nên không hứa việc tự gửi lại mọi POST sẽ tránh thao tác trùng.

## Cách lần theo code khi thuyết trình

Mở `nginx/stages/4.conf` để chỉ location/upstream/header trước. Sau đó mở `inventory.routes.js`, `inventory.controller.js`, `inventory.validation.js`, `inventory.service.js` và `inventory.repository.js` theo đúng một thao tác xuất kho. Kết thúc tại `mysql/init.sql` và log request của backend.
