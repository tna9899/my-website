[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$folder = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $folder) { $folder = "D:\TNA\Project\anhuyen" }
$cloudflaredPath = Join-Path $folder "cloudflared.exe"

# 1. Đảm bảo máy chủ nội bộ đang chạy
$serverRunning = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
    if ($resp.StatusCode -eq 200) { $serverRunning = $true }
} catch {}

if (-not $serverRunning) {
    Write-Host "Đang khởi động máy chủ web nội bộ..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$folder\server.ps1`"" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 2. Khởi chạy Cloudflare Tunnel để lấy đường link công khai
Write-Host "Đang kết nối mạng toàn cầu Cloudflare để tạo đường link trực tuyến..." -ForegroundColor Yellow

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cloudflaredPath
$psi.Arguments = "tunnel --url http://localhost:8080 --http-host-header localhost"
$psi.RedirectStandardError = $true
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)

$publicUrl = ""
$startTime = Get-Date

while (-not $proc.HasExited -and ((Get-Date) - $startTime).TotalSeconds -lt 30) {
    $line = $proc.StandardError.ReadLine()
    if ($line -match '(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)') {
        $publicUrl = $matches[1]
        break
    }
}

if ($publicUrl) {
    Write-Host "`n=======================================================" -ForegroundColor Green
    Write-Host "   🎉 ĐÃ TẠO ĐƯỜNG LINK WEBSITE TRỰC TUYẾN THÀNH CÔNG!" -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host "`n👉 Đường link truy cập miễn phí từ mọi thiết bị (Điện thoại, iPad, PC):" -ForegroundColor Cyan
    Write-Host "   $publicUrl" -ForegroundColor Yellow -BackgroundColor Black
    Write-Host "`n(Bất kỳ ai có đường link trên đều xem được album ảnh và bản đồ của bạn!)" -ForegroundColor Gray
    Write-Host "=======================================================" -ForegroundColor Green
    
    # Lưu vào file link_online.txt
    Set-Content -Path "$folder\link_online.txt" -Value $publicUrl -Encoding UTF8
    
    # Mở trình duyệt
    Start-Process $publicUrl
    
    Write-Host "`nCửa sổ này cần được giữ mở để duy trì đường link trực tuyến." -ForegroundColor Yellow
    Write-Host "Nhấn phím bất kỳ hoặc đóng cửa sổ này để tắt đường link.`n"
    
    $proc.WaitForExit()
} else {
    Write-Host "Không lấy được link tự động. Bạn có thể mở trực tiếp bằng lệnh cloudflared." -ForegroundColor Red
}
