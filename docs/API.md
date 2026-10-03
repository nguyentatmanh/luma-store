# API

Base URL khi chạy mặc định: `http://localhost:8080/api`.

## Quy ước

Response thành công:

```json
{
  "data": {},
  "meta": { "serverId": "BACKEND-01", "requestId": "uuid" }
}
```

Response lỗi ứng dụng:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Vui lòng kiểm tra thông tin đã nhập.",
    "fields": { "sku": "Chọn một mã SKU khác." }
  },
  "meta": { "serverId": "BACKEND-02", "requestId": "uuid" }
}
```

NGINX có response riêng cho stage 1 và HTTP 413 vì request đó chưa đến backend. Mỗi response API từ backend có `X-Backend-Id` và `X-Request-Id`.

## Endpoint

| Method | URL | Kết quả |
|---|---|---|
| GET | `/categories` | Các danh mục |
| GET | `/overview` | Metrics, danh mục, hàng cần bổ sung, phiếu gần đây |
| GET | `/products` | Danh sách phân trang |
| GET | `/products/:id` | Một sản phẩm |
| POST | `/products` | Tạo sản phẩm, HTTP 201 |
| PUT | `/products/:id` | Cập nhật metadata; không thay tồn kho |
| POST | `/products/:id/image` | Một ảnh multipart, field `image`; HTTP 200 |
| GET | `/inventory/movements` | Phiếu phân trang |
| POST | `/inventory/movements` | Nhập/xuất và ghi phiếu trong cùng transaction, HTTP 201 |
| GET | `/health` | Database còn kết nối |
| GET | `/server-info` | Backend hiện tại và header proxy |

## Danh sách sản phẩm

Query:

| Tham số | Giá trị | Mặc định |
|---|---|---|
| `q` | Tìm theo tên hoặc SKU | Rỗng |
| `categoryId` | ID danh mục | Tất cả |
| `status` | `active / archived / all` | `active` |
| `stock` | `all / low / out` | `all` |
| `sort` | `newest / name / priceAsc / priceDesc / stockAsc` | `newest` |
| `page` | 1–100.000 | 1 |
| `pageSize` | 1–100 | 8 |

`low` gồm sản phẩm có `stock <= lowStockAt`, kể cả hết hàng. `out` chỉ có `stock=0`. Response `data` là `{items, total, page, pageSize}`.

## Tạo sản phẩm

```json
{
  "sku": "LM-NEW01",
  "name": "Bàn phím mới",
  "description": "Gọn nhẹ cho góc làm việc.",
  "categoryId": 1,
  "price": 890000,
  "stock": 10,
  "lowStockAt": 5,
  "isActive": true
}
```

- SKU được trim và viết hoa, 2–32 ký tự `A-Z 0-9 _ -`.
- Giá là số nguyên VND, từ 0 đến 1 tỷ.
- Tồn/ngưỡng là số nguyên từ 0 đến 1.000.000.
- `PUT` gửi cùng các trường metadata nhưng **bỏ `stock`**. `isActive=false` ngừng kinh doanh; `true` khôi phục.
- Nếu tồn đầu kỳ >0, tự tạo phiếu `opening`.

## Tạo phiếu kho

```json
{
  "productId": 1,
  "kind": "in",
  "quantity": 5,
  "note": "Nhập từ nhà cung cấp"
}
```

`kind` là `in` hoặc `out`. Số lượng 1–1.000.000; ghi chú tối đa 300 ký tự. Không tạo phiếu cho sản phẩm đã ngừng kinh doanh. Không xuất vượt lượng tồn.

`GET /inventory/movements` nhận `productId` (tùy chọn), `page` và `pageSize`; mặc định 10 phiếu/trang. Phiếu mới nhất trước.

## Upload ảnh

Multipart có một file ở field `image`, không có field phụ. JPEG/PNG/WebP tĩnh, tối đa 8 MB và 20 triệu pixel. File sau xử lý có URL `/media/<uuid>.webp`.

```bash
curl -F "image=@demo-image.png" http://localhost:8080/api/products/1/image
```

Tải lại metadata sản phẩm để xem URL mới. Hai backend dùng cùng database và volume nên đều đọc được ảnh mới.

## Mã lỗi thường gặp

| HTTP | Ý nghĩa |
|---:|---|
| 400 | JSON không hợp lệ |
| 404 | Không tìm thấy sản phẩm/API |
| 409 | SKU trùng, xuất quá tồn, sản phẩm ngừng kinh doanh, vượt giới hạn tồn |
| 413 | NGINX chặn body hoặc API chặn file/JSON quá lớn |
| 422 | Validation hoặc nội dung ảnh không hợp lệ |
| 500 | Lỗi xử lý; chi tiết nằm trong log, UI nhận thông báo ngắn |
| 503 | API bị vô hiệu hóa tại stage 1; hoặc lỗi upstream tương ứng |
