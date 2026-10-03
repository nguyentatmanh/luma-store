#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
command -v docker >/dev/null || { echo "Cần Docker Desktop / Docker Engine."; exit 1; }
docker compose version >/dev/null
[[ -f .env ]] || cp .env.example .env
COMPOSE=(docker compose -f compose.yaml)
[[ -f .https-enabled ]] && COMPOSE+=(-f compose.https.yaml)

action="${1:-help}"
case "$action" in
  setup)
    echo "Đã chuẩn bị .env. Có thể sửa cổng/mật khẩu trước khi chạy up."
    ;;
  up)
    "${COMPOSE[@]}" up -d --build --wait --wait-timeout 240
    "${COMPOSE[@]}" exec -T nginx nginx -t
    "${COMPOSE[@]}" exec -T nginx nginx -s reload
    echo "Mở http://localhost:$(sed -n 's/^HTTP_PORT=//p' .env)"
    ;;
  stage)
    step="${2:-}"
    [[ "$step" =~ ^[1-4]$ ]] || { echo "Dùng: bash scripts/demo.sh stage 1|2|3|4"; exit 1; }
    if [[ -f .https-enabled ]]; then
      echo "Đang ở HTTPS. Dùng lệnh http để trở về bước 4 trước."
      exit 1
    fi
    cp nginx/nginx.conf nginx/.previous.conf
    cp "nginx/stages/$step.conf" nginx/nginx.conf
    if ! "${COMPOSE[@]}" exec -T nginx nginx -t; then
      cp nginx/.previous.conf nginx/nginx.conf
      rm nginx/.previous.conf
      echo "Cấu hình không hợp lệ; đã khôi phục cấu hình trước."
      exit 1
    fi
    if ! "${COMPOSE[@]}" exec -T nginx nginx -s reload; then
      cp nginx/.previous.conf nginx/nginx.conf
      rm nginx/.previous.conf
      echo "Reload thất bại; đã khôi phục file cấu hình."
      exit 1
    fi
    rm nginx/.previous.conf
    echo "Đã chuyển sang bước $step. Chờ khoảng 1 giây rồi tải lại trang."
    ;;
  stop2)
    "${COMPOSE[@]}" stop backend2
    echo "Đã dừng backend2. Gọi API ở bước 3 hoặc 4 để thử failover."
    ;;
  start2)
    "${COMPOSE[@]}" start backend2
    echo "Đã khởi động backend2. Chờ healthcheck, sau đó gọi API."
    ;;
  logs)
    "${COMPOSE[@]}" logs -f --tail=30 nginx backend1 backend2
    ;;
  ps)
    "${COMPOSE[@]}" ps
    ;;
  cert)
    command -v openssl >/dev/null || { echo "Cần OpenSSL (có sẵn trong Ubuntu/WSL)."; exit 1; }
    mkdir -p certs
    [[ ! -f certs/luma.key ]] || { echo "Cert đã có. Không ghi đè."; exit 0; }
    openssl req -x509 -nodes -newkey rsa:2048 \
      -keyout certs/luma.key -out certs/luma.crt -days 30 \
      -subj "/CN=luma.test" \
      -addext "subjectAltName=DNS:luma.test,DNS:localhost,IP:127.0.0.1"
    chmod 600 certs/luma.key
    echo "Đã tạo chứng chỉ tự ký cho luma.test và localhost."
    ;;
  https)
    [[ -f certs/luma.key && -f certs/luma.crt ]] || { echo "Chạy cert trước."; exit 1; }
    cp nginx/nginx.conf nginx/.previous.conf
    cp nginx/stages/5.conf nginx/nginx.conf
    if ! docker compose -f compose.yaml -f compose.https.yaml run --rm --no-deps nginx nginx -t; then
      cp nginx/.previous.conf nginx/nginx.conf; rm nginx/.previous.conf
      echo "Kiểm tra HTTPS thất bại; đã khôi phục cấu hình."; exit 1
    fi
    if ! docker compose -f compose.yaml -f compose.https.yaml up -d --no-deps --force-recreate nginx; then
      cp nginx/.previous.conf nginx/nginx.conf; rm nginx/.previous.conf
      echo "Chưa bật HTTPS; cấu hình đã được khôi phục."; exit 1
    fi
    rm nginx/.previous.conf
    touch .https-enabled
    echo "Mở https://luma.test:$(sed -n 's/^HTTPS_PORT=//p' .env)"
    echo "Nếu chưa sửa hosts, mở https://localhost:$(sed -n 's/^HTTPS_PORT=//p' .env)"
    ;;
  http)
    cp nginx/stages/4.conf nginx/nginx.conf
    docker compose -f compose.yaml up -d --no-deps --force-recreate nginx
    rm -f .https-enabled
    echo "Đã trở về HTTP, bước 4."
    ;;
  down)
    "${COMPOSE[@]}" down
    echo "Đã dừng hệ thống. Volume dữ liệu được giữ lại."
    ;;
  *)
    echo "Lệnh: setup | up | stage 1..4 | stop2 | start2 | logs | ps | cert | https | http | down"
    ;;
esac
