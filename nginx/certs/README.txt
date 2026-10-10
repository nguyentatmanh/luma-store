Tạo cert trên máy demo:
bash scripts/demo.sh cert
hoặc:
.\scripts\demo.ps1 cert

Không đóng gói private key trong mã nguồn. Cert local sẽ có SAN cho
luma.test, localhost và 127.0.0.1; trình duyệt vẫn cảnh báo vì tự ký.
