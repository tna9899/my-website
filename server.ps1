# =======================================================
# MÁY CHỦ NỘI BỘ SIÊU NHẸ CHO TRANG WEB KỶ NIỆM
# Tự động phục vụ web & Ghi log trực tiếp vào folder anhuyen
# Tự động chọn cổng khả dụng, không bao giờ bị lỗi cổng bận
# =======================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$folder = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $folder) { $folder = "D:\TNA\Project\anhuyen" }
$logFile = Join-Path $folder "user_activity.log"

# Kiểm tra nếu máy chủ đã chạy sẵn từ trước trên cổng 8080
try {
    $existing = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
    if ($existing.StatusCode -eq 200) {
        Write-Host "=======================================================" -ForegroundColor Cyan
        Write-Host "   TRANG WEB KỶ NIỆM: NGỌC ÁNH - TÚ UYÊN" -ForegroundColor Yellow
        Write-Host "   Máy chủ đang chạy sẵn tại: http://localhost:8080" -ForegroundColor Green
        Write-Host "   Đang mở trình duyệt cho bạn..." -ForegroundColor Cyan
        Write-Host "=======================================================" -ForegroundColor Cyan
        Start-Process "http://localhost:8080"
        Start-Sleep -Seconds 2
        exit
    }
} catch {}

# Tìm cổng khả dụng từ 8080 đến 8089
$portsToTry = @(8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089)
$listener = $null
$port = 8080
$started = $false

foreach ($p in $portsToTry) {
    try {
        $temp = New-Object System.Net.HttpListener
        $temp.Prefixes.Add("http://localhost:$p/")
        $temp.Start()
        $listener = $temp
        $port = $p
        $started = $true
        break
    } catch {
        if ($temp) {
            try { $temp.Close() } catch {}
        }
    }
}

if (-not $started) {
    Write-Host "Lỗi: Không tìm thấy cổng trống từ 8080 đến 8089." -ForegroundColor Red
    pause
    exit
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   TRANG WEB KỶ NIỆM: NGỌC ÁNH - TÚ UYÊN" -ForegroundColor Yellow
Write-Host "   Máy chủ đang chạy tại: http://localhost:$port" -ForegroundColor Green
Write-Host "   Mọi log thao tác sẽ tự động lưu vào: $logFile" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Nhấn Ctrl + C để dừng máy chủ bất kỳ lúc nào.`n"

# Tự động mở trình duyệt
Start-Process "http://localhost:$port"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Cho phép CORS
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # XỬ LÝ API GHI LOG TỪ TRÌNH DUYỆT
        if ($request.Url.AbsolutePath -eq "/api/log" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $logContent = $reader.ReadToEnd()
            $reader.Close()

            if ($logContent) {
                [System.IO.File]::AppendAllText($logFile, "$logContent`r`n", [System.Text.Encoding]::UTF8)
                Write-Host "[LOG] $logContent" -ForegroundColor Gray
            }

            $response.StatusCode = 200
            $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
            $response.ContentType = "application/json"
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # XỬ LÝ API KỶ NIỆM (ĐỒNG BỘ DỮ LIỆU ĐIỆN THOẠI & MÁY TÍNH)
        $memoriesFile = Join-Path $folder "memories.json"
        if ($request.Url.AbsolutePath -eq "/api/memories") {
            if ($request.HttpMethod -eq "GET") {
                $content = "[]"
                if (Test-Path $memoriesFile) {
                    $content = [System.IO.File]::ReadAllText($memoriesFile, [System.Text.Encoding]::UTF8)
                }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }
            if ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                if ($body) {
                    [System.IO.File]::WriteAllText($memoriesFile, $body, [System.Text.Encoding]::UTF8)
                    Write-Host '[MEMORIES] Da dong bo du lieu ky niem thanh cong' -ForegroundColor Green
                }
                $response.StatusCode = 200
                $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }
        }

        # PHỤC VỤ STATIC FILES (index.html, style.css, script.js...)
        $urlPath = $request.Url.AbsolutePath.TrimStart('/')
        if ([string]::IsNullOrEmpty($urlPath)) {
            $urlPath = "index.html"
        }

        $filePath = Join-Path $folder $urlPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".webp" { $response.ContentType = "image/webp" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                default { $response.ContentType = "application/octet-stream" }
            }

            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }

        $response.Close()
    } catch {
        # Bỏ qua lỗi ngắt kết nối client
    }
}
