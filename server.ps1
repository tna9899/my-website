# =======================================================
# MAY CHU NOI BO SIEU NHE CHO TRANG WEB KY NIEM
# Tu dong phuc vu web & Dong bo anh thoi gian thuc 2 chieu (May tinh <-> Dien thoai)
# Tu dong luu anh vao thu muc uploads/ de trang web sieu nhe, khong bao gio tran bo nho
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
$linkFile = Join-Path $folder "link_online.txt"
$uploadsFolder = Join-Path $folder "uploads"

if (-not (Test-Path $uploadsFolder)) {
    New-Item -ItemType Directory -Path $uploadsFolder -Force | Out-Null
}

# Khoi tao phien ban & so luong ky niem trong bo nho RAM
$global:serverVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$global:memoryCount = 0

if (Test-Path $memoriesFile) {
    try {
        $rawInit = [System.IO.File]::ReadAllText($memoriesFile, [System.Text.Encoding]::UTF8)
        $parsedInit = ConvertFrom-Json $rawInit -ErrorAction SilentlyContinue
        if ($parsedInit -is [System.Array]) { $global:memoryCount = $parsedInit.Count }
        elseif ($parsedInit) { $global:memoryCount = 1 }
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
        $temp.Prefixes.Add("http://127.0.0.1:$p/")
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

# Lay dia chi IP mang noi bo (Wifi LAN) de thiet bi khac co the truy cap truc tiep
$localIp = ""
try {
    $ipObj = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual' -and $_.IPAddress -notmatch '^127\.' } | Select-Object -First 1
    if ($ipObj) { $localIp = $ipObj.IPAddress }
} catch {}

# Doc link online neu co
$onlineLink = ""
if (Test-Path $linkFile) {
    try {
        $onlineLink = (Get-Content $linkFile -Raw).Trim()
    } catch {}
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   TRANG WEB KY NIEM: NGOC ANH - TU UYEN" -ForegroundColor Yellow
Write-Host "   May chu dang chay thanh cong tren cong: $port" -ForegroundColor Green
Write-Host "   - Tren may tinh nay:    http://localhost:$port" -ForegroundColor Cyan
if ($localIp) {
    Write-Host "   - Tren mang Wifi noi bo: http://${localIp}:$port" -ForegroundColor Cyan
}
if ($onlineLink) {
    Write-Host "   - Link truc tuyen Cloudflare: $onlineLink" -ForegroundColor Yellow
}
Write-Host "   Moi anh tai len se tu dong luu vao thu muc uploads/ sieu nhe!" -ForegroundColor Green
Write-Host "   Dong bo 2 chieu thoi gian thuc giua May tinh <-> Dien thoai da san sang." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Nhan Ctrl + C de dung may chu bat ky luc nao.`n"

# Tu dong mo trinh duyet
Start-Process "http://localhost:$port"

# Ham ho tro boc tach va luu anh base64 thanh file vat ly trong thu muc uploads/ (giu nguyen 100% chat luong & do phan giai goc)
function Save-Base64ToUploads($b64String, $prefixId, $idx) {
    if (-not $b64String -or -not ($b64String -is [string])) { return "" }
    if (-not $b64String.StartsWith("data:image/")) {
        return $b64String # Neu da la duong dan file (uploads/...) thi giu nguyen
    }

    try {
        $commaIdx = $b64String.IndexOf(',')
        if ($commaIdx -lt 0) { return "" }

        $data = $b64String.Substring($commaIdx + 1)
        if (-not $data -or $data.Length -lt 20) { return "" }

        $bytes = [System.Convert]::FromBase64String($data)
        if (-not $bytes -or $bytes.Length -lt 20) { return "" }
        
        $header = $b64String.Substring(0, $commaIdx)
        $ext = "jpg"
        if ($header -match 'image\/([a-zA-Z0-9\+\-]+)') {
            $matchedExt = $matches[1].ToLower()
            if ($matchedExt -eq 'jpeg') { $ext = 'jpg' }
            elseif ($matchedExt -eq 'svg+xml') { $ext = 'svg' }
            elseif ($matchedExt -match '^(jpg|png|webp|gif|svg|avif|heic|heif|bmp|tiff?)$') { $ext = $matchedExt }
        }

        $safeId = [string]$prefixId -replace '[^a-zA-Z0-9_-]', ''
        if (-not $safeId) { $safeId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
        $fileName = "img_${safeId}_${idx}_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()).$ext"
        $filePath = Join-Path $uploadsFolder $fileName
        
        [System.IO.File]::WriteAllBytes($filePath, $bytes)
        return "uploads/$fileName"
    } catch {
        return ""
    }
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Cho phep CORS toan dien cho may tinh & dien thoai & Cloudflare Tunnel
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With, X-Server-Version")
        $response.Headers.Add("Access-Control-Expose-Headers", "X-Server-Version")
        $response.Headers.Add("Access-Control-Max-Age", "86400")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.ContentLength64 = 0
            $response.Close()
            continue
        }

        # 1. API KIEM TRA PHIEN BAN SIEU NHE (/api/version) - Duoi 40 bytes, phan hoi 0.5ms
        if ($request.Url.AbsolutePath -eq "/api/version" -and $request.HttpMethod -eq "GET") {
            $vObj = @{
                status = "ok"
                version = [string]$global:serverVersion
                count = $global:memoryCount
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

        # 2. API TAI ANH RIENG LE SIEU TOC (/api/upload)
        if ($request.Url.AbsolutePath -eq "/api/upload" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $savedUrls = [System.Collections.Generic.List[string]]::new()
            try {
                $upData = ConvertFrom-Json $body -ErrorAction Stop
                if ($upData -is [PSCustomObject] -and $upData.PSObject.Properties['image']) {
                    $u = Save-Base64ToUploads $upData.image "up" 0
                    $savedUrls.Add($u)
                } elseif ($upData -is [PSCustomObject] -and $upData.PSObject.Properties['images']) {
                    $idx = 0
                    foreach ($img in $upData.images) {
                        $u = Save-Base64ToUploads $img "up" $idx
                        $savedUrls.Add($u)
                        $idx++
                    }
                }
            } catch {}

            $resObj = @{
                status = "ok"
                urls = $savedUrls
                url = if ($savedUrls.Count -gt 0) { $savedUrls[0] } else { "" }
            }
            $resJson = ConvertTo-Json $resObj -Compress
            $resBuf = [System.Text.Encoding]::UTF8.GetBytes($resJson)
            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 200
            $response.ContentLength64 = $resBuf.Length
            $response.OutputStream.Write($resBuf, 0, $resBuf.Length)
            $response.Close()
            continue
        }

        # 3. API GHI LOG TU TRINH DUYET (/api/log)
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

        # 3.5 API DONG BO TAI KHOAN CHU NHAN (/api/auth)
        if ($request.Url.AbsolutePath -eq "/api/auth") {
            $authFile = Join-Path $folder "auth.json"
            if ($request.HttpMethod -eq "GET") {
                $authContent = '{"username":"anhuyen","password":"anhuyen","role":"Chủ nhân","owner":"Ngọc Ánh & Tú Uyên"}'
                if (Test-Path $authFile) {
                    try { $authContent = [System.IO.File]::ReadAllText($authFile, [System.Text.Encoding]::UTF8) } catch {}
                }
                $authBuf = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok","auth":' + $authContent + '}')
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $authBuf.Length
                $response.OutputStream.Write($authBuf, 0, $authBuf.Length)
                $response.Close()
                continue
            }
            if ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $authBody = $reader.ReadToEnd()
                $reader.Close()
                if ($authBody) {
                    try {
                        [System.IO.File]::WriteAllText($authFile, $authBody, [System.Text.Encoding]::UTF8)
                    } catch {}
                }
                $response.StatusCode = 200
                $authBuf = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $authBuf.Length
                $response.OutputStream.Write($authBuf, 0, $authBuf.Length)
                $response.Close()
                continue
            }
        }

        # 4. API KY NIEM (DONG BO 2 CHIEU THONG MINH DIEN THOAI & MAY TINH)
        if ($request.Url.AbsolutePath -eq "/api/memories") {
            if ($request.HttpMethod -eq "GET") {
                $content = "[]"
                if (Test-Path $memoriesFile) {
                    $content = [System.IO.File]::ReadAllText($memoriesFile, [System.Text.Encoding]::UTF8)
                }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)

                # Chong cache tuyet doi de dien thoai luon nhan ky niem moi nhat
                $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                $response.Headers.Add("Pragma", "no-cache")
                $response.Headers.Add("Expires", "0")
                $response.Headers.Add("X-Server-Version", [string]$global:serverVersion)
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

                    # Sao luu du phong
                    if (Test-Path $memoriesFile) {
                        Copy-Item -Path $memoriesFile -Destination $backupFile -Force -ErrorAction SilentlyContinue
                    }

                    # Bang tra cuu memories theo ID dung Hashtable tuyet doi khong loi
                    $memoryMap = [System.Collections.Specialized.OrderedDictionary]::new()
                    foreach ($m in $currentMemories) {
                        if ($m -and $m.id) {
                            $idStr = [string]$m.id
                            if ($deletedIds -notcontains $idStr) {
                                $memoryMap[$idStr] = $m
                            }
                        }
                    }

                    # Xu ly merge danh sach gui len & chuyen anh base64 thanh file uploads
                    foreach ($inItem in $incomingMemories) {
                        if (-not $inItem -or -not $inItem.id) { continue }
                        $idStr = [string]$inItem.id
                        if ($deletedIds -contains $idStr) { continue }

                        # Chuyen tat ca anh base64 cua inItem thanh file uploads/
                        $cleanInImgs = [System.Collections.Generic.List[string]]::new()
                        $rawImgs = @()
                        if ($inItem.PSObject.Properties['images'] -and $inItem.images) {
                            $rawImgs = $inItem.images
                        } elseif ($inItem.PSObject.Properties['image'] -and $inItem.image) {
                            $rawImgs = @($inItem.image)
                        }
                        
                        $imgIdx = 0
                        foreach ($img in $rawImgs) {
                            if ($img) {
                                $savedPath = Save-Base64ToUploads $img $idStr $imgIdx
                                $cleanInImgs.Add($savedPath)
                                $imgIdx++
                            }
                        }

                        if ($memoryMap.Contains($idStr)) {
                            $existing = $memoryMap[$idStr]

                            # CHU Y: $cleanInImgs la danh sach anh moi nhat do nguoi dung quyet dinh!
                            # Neu nguoi dung da xoa anh khoi album thi $cleanInImgs phai THAY THE danh sach cu!
                            # KHONG dung union gop anh de tranh lam hoi sinh cac anh da bi xoa!
                            $updatedObj = [PSCustomObject]@{
                                id = $idStr
                                images = if ($cleanInImgs.Count -gt 0) { @($cleanInImgs) } else { @($existing.images) }
                                content = if ($inItem.content) { $inItem.content } else { $existing.content }
                                location = if ($inItem.location) { $inItem.location } else { $existing.location }
                                date = if ($inItem.date) { $inItem.date } else { $existing.date }
                                createdAt = if ($inItem.createdAt) { $inItem.createdAt } elseif ($existing.createdAt) { $existing.createdAt } else { [DateTime]::UtcNow.ToString("o") }
                            }
                            $memoryMap[$idStr] = $updatedObj
                        } else {
                            $newObj = [PSCustomObject]@{
                                id = $idStr
                                images = @($cleanInImgs)
                                content = [string]$inItem.content
                                location = [string]$inItem.location
                                date = [string]$inItem.date
                                createdAt = if ($inItem.createdAt) { [string]$inItem.createdAt } else { [DateTime]::UtcNow.ToString("o") }
                            }
                            $memoryMap[$idStr] = $newObj
                        }
                    }

                    $finalList = @($memoryMap.Values)
                    $sortedList = @($finalList | Sort-Object -Property @{Expression={ if ($_.date) { $_.date } else { $_.createdAt } }} -Descending)

                    # Luu vao memories.json duoi dang mang chuan
                    $finalJson = ConvertTo-Json -InputObject @($sortedList) -Depth 10 -Compress
                    [System.IO.File]::WriteAllText($memoriesFile, $finalJson, [System.Text.Encoding]::UTF8)

                    $global:serverVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                    $global:memoryCount = $sortedList.Count

                    Write-Host "[MEMORIES] Dong bo thanh cong: $($sortedList.Count) ky niem (Phien ban: $global:serverVersion)" -ForegroundColor Green

                    $resObj = @{
                        status = "ok"
                        version = [string]$global:serverVersion
                        count = $sortedList.Count
                        memories = $sortedList
                    }
                    $resJson = ConvertTo-Json $resObj -Depth 10 -Compress
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resJson)

                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                    $response.Headers.Add("X-Server-Version", [string]$global:serverVersion)
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

        # 5. PHUC VU STATIC FILES (index.html, style.css, script.js, uploads/...)
        $rawPath = $request.Url.AbsolutePath.TrimStart('/')
        if ([string]::IsNullOrEmpty($rawPath)) {
            $rawPath = "index.html"
        }

        # Giai ma ky tu URL (vd %20 thanh khoang trang)
        $urlPath = [System.Uri]::UnescapeDataString($rawPath).Replace('/', '\')
        $filePath = Join-Path $folder $urlPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { 
                    $response.ContentType = "text/html; charset=utf-8"
                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                }
                ".css"  { 
                    $response.ContentType = "text/css; charset=utf-8"
                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                }
                ".js"   { 
                    $response.ContentType = "application/javascript; charset=utf-8"
                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                }
                ".json" {
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                }
                ".png"  { 
                    $response.ContentType = "image/png"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".jpg"  { 
                    $response.ContentType = "image/jpeg"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".jpeg" { 
                    $response.ContentType = "image/jpeg"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".webp" { 
                    $response.ContentType = "image/webp"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".svg"  { 
                    $response.ContentType = "image/svg+xml"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".gif"  { 
                    $response.ContentType = "image/gif"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".heic" { 
                    $response.ContentType = "image/heic"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".heif" { 
                    $response.ContentType = "image/heif"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".avif" { 
                    $response.ContentType = "image/avif"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".bmp"  { 
                    $response.ContentType = "image/bmp"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".tiff" { 
                    $response.ContentType = "image/tiff"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
                ".tif" { 
                    $response.ContentType = "image/tiff"
                    $response.Headers.Add("Cache-Control", "public, max-age=86400")
                }
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
