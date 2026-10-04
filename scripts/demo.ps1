param(
  [ValidateSet("setup","up","stage","stop2","start2","logs","ps","cert","https","http","down","help")]
  [string]$Action = "help",
  [int]$Step = 0
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Cần Docker Desktop." }
docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Cần Docker Compose v2." }
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
$Compose = @("compose", "-f", "compose.yaml")
if (Test-Path ".https-enabled") { $Compose += @("-f", "compose.https.yaml") }
function Run-Docker([string[]]$DockerArgs) {
  & docker @DockerArgs
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed, exit $LASTEXITCODE." }
}
function Env-Value([string]$Name) {
  return ((Get-Content ".env" | Where-Object { $_ -match ("^" + $Name + "=") }) -replace ("^" + $Name + "="), "")
}
switch ($Action) {
  "setup" { Write-Host "Đã chuẩn bị .env. Có thể sửa cổng/mật khẩu trước khi chạy up." }
  "up" {
    Run-Docker ($Compose + @("up","-d","--build","--wait","--wait-timeout","240"))
    Run-Docker ($Compose + @("exec","-T","nginx","nginx","-t"))
    Run-Docker ($Compose + @("exec","-T","nginx","nginx","-s","reload"))
    Write-Host ("Mở http://localhost:" + (Env-Value "HTTP_PORT"))
  }
  "stage" {
    if ($Step -lt 1 -or $Step -gt 4) { throw "Dùng: .\scripts\demo.ps1 stage 1|2|3|4" }
    if (Test-Path ".https-enabled") { throw "Chạy http để trở về bước 4 trước khi chuyển stage." }
    $Previous = [System.IO.File]::ReadAllBytes((Join-Path $PWD "nginx/nginx.conf"))
    Copy-Item ("nginx/stages/" + $Step + ".conf") "nginx/nginx.conf" -Force
    try {
      Run-Docker ($Compose + @("exec","-T","nginx","nginx","-t"))
      Run-Docker ($Compose + @("exec","-T","nginx","nginx","-s","reload"))
    } catch {
      [System.IO.File]::WriteAllBytes((Join-Path $PWD "nginx/nginx.conf"), $Previous)
      throw
    }
    Write-Host "Đã chuyển sang bước $Step. Chờ khoảng 1 giây rồi tải lại trang."
  }
  "stop2" { Run-Docker ($Compose + @("stop","backend2")) }
  "start2" { Run-Docker ($Compose + @("start","backend2")) }
  "logs" { Run-Docker ($Compose + @("logs","-f","--tail=30","nginx","backend1","backend2")) }
  "ps" { Run-Docker ($Compose + @("ps")) }
  "cert" {
    $OpenSSL = $null
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
      $OpenSSL = "openssl"
    } else {
      $candidates = @(
        "C:\Program Files\Git\usr\bin\openssl.exe",
        "C:\Program Files\Git\mingw64\bin\openssl.exe",
        "C:\Program Files (x86)\Git\usr\bin\openssl.exe"
      )
      foreach ($cand in $candidates) {
        if (Test-Path $cand) { $OpenSSL = $cand; break }
      }
    }
    if (-not $OpenSSL) {
      throw "Cần OpenSSL. Hãy cài OpenSSL, thêm Git usr/bin vào PATH hoặc dùng WSL: bash scripts/demo.sh cert"
    }
    if (Test-Path "certs/luma.key") { Write-Host "Cert đã có. Không ghi đè."; break }
    New-Item -ItemType Directory -Force "certs" | Out-Null
    & $OpenSSL req -x509 -nodes -newkey rsa:2048 -keyout certs/luma.key -out certs/luma.crt -days 30 -subj "/CN=luma.test" -addext "subjectAltName=DNS:luma.test,DNS:localhost,IP:127.0.0.1"
    if ($LASTEXITCODE -ne 0) { throw "Không tạo được chứng chỉ." }
  }
  "https" {
    if (-not (Test-Path "certs/luma.key") -or -not (Test-Path "certs/luma.crt")) { throw "Chạy cert trước." }
    $Previous = [System.IO.File]::ReadAllBytes((Join-Path $PWD "nginx/nginx.conf"))
    Copy-Item "nginx/stages/5.conf" "nginx/nginx.conf" -Force
    try {
      Run-Docker @("compose","-f","compose.yaml","-f","compose.https.yaml","run","--rm","--no-deps","nginx","nginx","-t")
      Run-Docker @("compose","-f","compose.yaml","-f","compose.https.yaml","up","-d","--no-deps","--force-recreate","nginx")
    } catch {
      [System.IO.File]::WriteAllBytes((Join-Path $PWD "nginx/nginx.conf"), $Previous)
      throw
    }
    New-Item -ItemType File -Force ".https-enabled" | Out-Null
    Write-Host ("Mở https://luma.test:" + (Env-Value "HTTPS_PORT"))
    Write-Host ("Nếu chưa sửa hosts: https://localhost:" + (Env-Value "HTTPS_PORT"))
  }
  "http" {
    Copy-Item "nginx/stages/4.conf" "nginx/nginx.conf" -Force
    Run-Docker @("compose","-f","compose.yaml","up","-d","--no-deps","--force-recreate","nginx")
    Remove-Item ".https-enabled" -Force -ErrorAction SilentlyContinue
  }
  "down" { Run-Docker ($Compose + @("down")); Write-Host "Giữ lại volume dữ liệu." }
  default { Write-Host "setup | up | stage 1..4 | stop2 | start2 | logs | ps | cert | https | http | down" }
}
