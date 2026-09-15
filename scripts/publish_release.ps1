# Publish APK to GitHub Releases
$ErrorActionPreference = "Stop"

# Get credentials from git credential manager
$credInput = "protocol=https`nhost=github.com"
$credOutput = $credInput | git credential fill
$token = ""
foreach ($line in ($credOutput -split "`n")) {
    if ($line.StartsWith("password=")) {
        $token = $line.Substring("password=".Length).Trim()
    }
}

if (-not $token) {
    Write-Error "Could not retrieve GitHub token from git credentials."
    exit 1
}

$repoOwner = "ekobot2025-cyber"
$repoName = "bumkam-finance"
$tagName = "v1.0.0"
$apkPath = "D:\8 PROJECT\2026\tda_kelompok5\BUMKAM-Finance-v1.0.0.apk"

if (-not (Test-Path $apkPath)) {
    Write-Error "APK file not found at $apkPath"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "User-Agent" = "BUMKAM-Finance-Publisher"
}

# 1. Check if release already exists
$existingRelease = $null
try {
    $existingRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases/tags/$tagName" -Headers $headers -Method Get
    Write-Host "Found existing release ID: $($existingRelease.id)"
} catch {
    Write-Host "Release $tagName does not exist yet. Creating..."
}

$release = $existingRelease
if (-not $release) {
    $releaseBody = @"
# BUMKAM Finance v1.0.0 — Aplikasi Offline Android APK
**BUMKAM Hen Wani, Kampung Enggros, Jayapura, Papua**

Aplikasi pencatatan keuangan dan transaksi operasional untuk unit usaha **Pulsa** dan **Air Galon**.
Dirancang khusus untuk dapat digunakan secara **100% OFFLINE** di Kampung Enggros tanpa memerlukan koneksi internet.

### Fitur Utama:
- **One Transaction — One Input:** Otomatis memperbarui stok/saldo, kas/piutang, jurnal akuntansi debit-kredit, dan laporan keuangan.
- **Unit Pulsa:** Kontrol saldo deposit modal, pencatatan otomatis margin keuntungan jual-modal, dan validasi anti-saldo minus.
- **Unit Galon:** Kontrol 4 status tabung (Tersedia, Di Pelanggan, Kembali, Rusak/Hilang), penjualan tunai vs tempo/kredit.
- **Kartu Piutang Pelanggan:** Cicilan sebagian dan pelunasan piutang tanpa melipatgandakan omset penjualan.
- **Buku Kas & Pengeluaran:** Catat beban operasional depot dan mutasi kas tunai.
- **Laporan Keuangan Resmi:** Laba Rugi per unit, Arus Kas, Neraca, dan Rekapitulasi dengan kop surat Kampung Enggros.

---

### Cara Mengunduh & Memasang di HP Android:
1. Klik dan unduh file **`BUMKAM-Finance-v1.0.0.apk`** di bawah (bagian *Assets*).
2. Setelah terunduh di HP, klik file APK tersebut dan pilih **Install**.
3. Jika muncul peringatan *"Install from unknown sources"*, pilih **Izinkan** / **Allow**.
4. Buka aplikasi **BUMKAM Finance**.
5. Aplikasi langsung siap dipakai secara offline tanpa kuota internet!
"@

    $bodyObj = @{
        tag_name = $tagName
        target_commitish = "main"
        name = "BUMKAM Finance v1.0.0 (Offline Android APK)"
        body = $releaseBody
        draft = $false
        prerelease = $false
    }
    $bodyJson = $bodyObj | ConvertTo-Json -Depth 5

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases" -Headers $headers -Method Post -Body $bodyJson -ContentType "application/json; charset=utf-8"
    Write-Host "Created release ID: $($release.id)"
}

# 2. Check if asset already uploaded
$assets = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases/$($release.id)/assets" -Headers $headers -Method Get
$assetName = "BUMKAM-Finance-v1.0.0.apk"
foreach ($asset in $assets) {
    if ($asset.name -eq $assetName) {
        Write-Host "Asset $assetName already exists (ID: $($asset.id)). Deleting to re-upload..."
        Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases/assets/$($asset.id)" -Headers $headers -Method Delete
    }
}

# 3. Upload APK asset
Write-Host "Uploading $apkPath to GitHub Release..."
$uploadUrl = "https://uploads.github.com/repos/$repoOwner/$repoName/releases/$($release.id)/assets?name=$assetName"

$uploadHeaders = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "Content-Type" = "application/vnd.android.package-archive"
    "User-Agent" = "BUMKAM-Finance-Publisher"
}

$apkBytes = [System.IO.File]::ReadAllBytes($apkPath)

$uploadResponse = Invoke-RestMethod -Uri $uploadUrl -Headers $uploadHeaders -Method Post -Body $apkBytes
Write-Host "SUCCESS! APK Uploaded successfully!"
Write-Host "Download URL: $($uploadResponse.browser_download_url)"
Write-Host "Release Page URL: $($release.html_url)"
