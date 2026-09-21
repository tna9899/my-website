# =======================================================
# MAY CHU NOI BO SIEU NHE CHO TRANG WEB KY NIEM
# Tu dong phuc vu web & Dong bo anh thoi gian thuc 2 chieu
# Tu dong chon cong kha dung & Ghi nhan cong cho Cloudflare Tunnel
# =======================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$folder = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $folder) { $folder = "D:\TNA\Project\anhuyen" }
$logFile = Join-Path $folder "user_activity.log"
$memoriesFile = Join-Path $folder "memories.json"
$backupFile = Join-Path $folder "memories.backup.json"
$portFile = Join-Path $folder "server_port.txt"

# Theo doi phien ban du lieu may chu
$global:serverVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
if (Test-Path $memoriesFile) {
    try {
        $global:serverVersion = [System.IO.File]::GetLastWriteTimeUtc($memoriesFile).Ticks
    } catch {}
}

# Kiem tra neu may chu da chay san tu truoc
try {
    $existingPort = 8080
    if (Test-Path $portFile) {
        $savedPort = (Get-Content $portFile -Raw).Trim()
        if ($savedPort -match '^\d+$') { $existingPort = [int]$savedPort }
    }
    $existing = Invoke-WebRequest -Uri "http://localhost:$existingPort/api/version" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
    if ($existing.StatusCode -eq 200) {
        Write-Host "=======================================================" -ForegroundColor Cyan
        Write-Host "   TRANG WEB KY NIEM: NGOC ANH - TU UYEN" -ForegroundColor Yellow
        Write-Host "   May chu dang chay san tai: http://localhost:$existingPort" -ForegroundColor Green
        Write-Host "   Dang mo trinh duyet cho ban..." -ForegroundColor Cyan
        Write-Host "=======================================================" -ForegroundColor Cyan
        Start-Process "http://localhost:$existingPort"
        Start-Sleep -Seconds 2
        exit
    }
} catch {}

# Tim cong kha dung tu 8080 den 8089
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
    Write-Host "Loi: Khong tim thay cong trong tu 8080 den 8089." -ForegroundColor Red
    pause
    exit
}

# Ghi nhan cong dang chay de start_tunnel.ps1 dung chinh xac
Set-Content -Path $portFile -Value "$port" -Encoding UTF8

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   TRANG WEB KY NIEM: NGOC ANH - TU UYEN" -ForegroundColor Yellow
Write-Host "   May chu dang chay tai: http://localhost:$port" -ForegroundColor Green
Write-Host "   Moi log thao tac se tu dong luu vao: $logFile" -ForegroundColor Green
Write-Host "   Da kich hoat dong bo 2 chieu (May tinh <-> Dien thoai)" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Nhan Ctrl + C de dung may chu bat ky luc nao.`n"

# Tu dong mo trinh duyet
Start-Process "http://localhost:$port"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Cho phep CORS toan dien cho may tinh & dien thoai (Cloudflare Tunnel)
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With")
        $response.Headers.Add("Access-Control-Max-Age", "86400")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.ContentLength64 = 0
            $response.Close()
            continue
        }

        # 1. XU LY API KIEM TRA PHIEN BAN SIEU NHE (/api/version) - Danh cho auto-sync ~30 bytes
        if ($request.Url.AbsolutePath -eq "/api/version" -and $request.HttpMethod -eq "GET") {
            $count = 0
            if (Test-Path $memoriesFile) {
                try {
                    $existingJson = [System.IO.File]::ReadAllText($memoriesFile, [System.Text.Encoding]::UTF8)
                    $parsed = ConvertFrom-Json $existingJson -ErrorAction SilentlyContinue
                    if ($parsed -is [System.Array]) { $count = $parsed.Count }
                    elseif ($parsed) { $count = 1 }
                } catch {}
            }
            $vObj = @{
                status = "ok"
                version = [string]$global:serverVersion
                count = $count
            }
            $vJson = ConvertTo-Json $vObj -Compress
            $vBuffer = [System.Text.Encoding]::UTF8.GetBytes($vJson)

            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.Headers.Add("Pragma", "no-cache")
            $response.Headers.Add("Expires", "0")
            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 200
            $response.ContentLength64 = $vBuffer.Length
            $response.OutputStream.Write($vBuffer, 0, $vBuffer.Length)
            $response.Close()
            continue
        }

        # 2. XU LY API GHI LOG TU TRINH DUYET (/api/log)
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
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # 3. XU LY API KY NIEM (DONG BO 2 CHIEU THONG MINH DIEN THOAI & MAY TINH)
        if ($request.Url.AbsolutePath -eq "/api/memories") {
            if ($request.HttpMethod -eq "GET") {
                $content = "[]"
                if (Test-Path $memoriesFile) {
                    $content = [System.IO.File]::ReadAllText($memoriesFile, [System.Text.Encoding]::UTF8)
                }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)

                # Chong cache tuyet doi de dien thoai luon nhan anh moi nhat
                $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                $response.Headers.Add("Pragma", "no-cache")
                $response.Headers.Add("Expires", "0")
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()

                if ([string]::IsNullOrWhiteSpace($body)) {
                    $response.StatusCode = 400
                    $errBuf = [System.Text.Encoding]::UTF8.GetBytes('{"status":"error","message":"Du lieu trong"}')
                    $response.ContentLength64 = $errBuf.Length
                    $response.OutputStream.Write($errBuf, 0, $errBuf.Length)
                    $response.Close()
                    continue
                }

                try {
                    $incomingData = ConvertFrom-Json $body -ErrorAction Stop
                    
                    $incomingMemories = @()
                    $deletedIds = @()

                    if ($incomingData -is [PSCustomObject] -and $incomingData.PSObject.Properties['memories']) {
                        if ($incomingData.memories -is [System.Array]) {
                            $incomingMemories = $incomingData.memories
                        } elseif ($incomingData.memories) {
                            $incomingMemories = @($incomingData.memories)
                        }
                        if ($incomingData.PSObject.Properties['deletedIds'] -and $incomingData.deletedIds) {
                            $deletedIds = @($incomingData.deletedIds | ForEach-Object { [string]$_ })
                        }
                    } elseif ($incomingData -is [System.Array]) {
                        $incomingMemories = $incomingData
                    } elseif ($incomingData) {
                        $incomingMemories = @($incomingData)
                    }

                    # Doc du lieu server hien co
                    $currentMemories = @()
                    if (Test-Path $memoriesFile) {
                        try {
                            $currRaw = [System.IO.File]::ReadAllText($memoriesFile, [System.Text.Encoding]::UTF8)
                            $currParsed = ConvertFrom-Json $currRaw -ErrorAction SilentlyContinue
                            if ($currParsed -is [System.Array]) { $currentMemories = $currParsed }
                            elseif ($currParsed) { $currentMemories = @($currParsed) }
                        } catch {}
                    }

                    # Tu dong sao luu du phong truoc khi ghi de
                    if (Test-Path $memoriesFile) {
                        Copy-Item -Path $memoriesFile -Destination $backupFile -Force -ErrorAction SilentlyContinue
                    }

                    # Hashtable luu tru theo ID
                    $memoryMap = [System.Collections.Specialized.OrderedDictionary]::new()
                    foreach ($m in $currentMemories) {
                        if ($m -and $m.id) {
                            $idStr = [string]$m.id
                            if ($deletedIds -notcontains $idStr) {
                                $memoryMap[$idStr] = $m
                            }
                        }
                    }

                    # Merge thong minh danh sach gui len
                    foreach ($inItem in $incomingMemories) {
                        if (-not $inItem -or -not $inItem.id) { continue }
                        $idStr = [string]$inItem.id
                        if ($deletedIds -contains $idStr) { continue }

                        if ($memoryMap.Contains($idStr)) {
                            $existing = $memoryMap[$idStr]
                            
                            # Hop nhat anh (union khong trung lap)
                            $mergedImgs = [System.Collections.Generic.List[string]]::new()
                            $seenImgs = [System.Collections.Generic.HashSet[string]]::new()

                            if ($existing.images) {
                                foreach ($img in $existing.images) {
                                    if ($img -and $seenImgs.Add($img)) { $mergedImgs.Add($img) }
                                }
                            } elseif ($existing.image -and $seenImgs.Add($existing.image)) {
                                $mergedImgs.Add($existing.image)
                            }

                            if ($inItem.images) {
                                foreach ($img in $inItem.images) {
                                    if ($img -and $seenImgs.Add($img)) { $mergedImgs.Add($img) }
                                }
                            } elseif ($inItem.image -and $seenImgs.Add($inItem.image)) {
                                $mergedImgs.Add($inItem.image)
                            }

                            $existing.images = @($mergedImgs)

                            if ($inItem.content) { $existing.content = $inItem.content }
                            if ($inItem.location) { $existing.location = $inItem.location }
                            if ($inItem.date) { $existing.date = $inItem.date }
                            if ($inItem.createdAt -and -not $existing.createdAt) { $existing.createdAt = $inItem.createdAt }

                            $memoryMap[$idStr] = $existing
                        } else {
                            $memoryMap[$idStr] = $inItem
                        }
                    }

                    $finalList = @($memoryMap.Values)
                    $sortedList = @($finalList | Sort-Object -Property @{Expression={ if ($_.date) { $_.date } else { $_.createdAt } }} -Descending)

                    $finalJson = ConvertTo-Json -InputObject $sortedList -Depth 10 -Compress
                    [System.IO.File]::WriteAllText($memoriesFile, $finalJson, [System.Text.Encoding]::UTF8)

                    $global:serverVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

                    Write-Host "[MEMORIES] Dong bo 2 chieu thanh cong: $($sortedList.Count) ky niem (Phien ban: $global:serverVersion)" -ForegroundColor Green

                    $resObj = @{
                        status = "ok"
                        version = [string]$global:serverVersion
                        count = $sortedList.Count
                        memories = $sortedList
                    }
                    $resJson = ConvertTo-Json $resObj -Depth 10 -Compress
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resJson)

                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                    $response.StatusCode = 200
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.Close()
                    continue
                } catch {
                    Write-Host "[ERROR] Loi merge memories: $($_.Exception.Message)" -ForegroundColor Red
                    $response.StatusCode = 500
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"error","message":"' + $_.Exception.Message.Replace('"', '\"') + '"}')
                    $response.ContentLength64 = $errBytes.Length
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }
            }
        }

        # 4. PHUC VU STATIC FILES (index.html, style.css, script.js...)
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
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $notFound.Length
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }

        $response.Close()
    } catch {
        # Bo qua loi ngat ket noi client
    }
}
