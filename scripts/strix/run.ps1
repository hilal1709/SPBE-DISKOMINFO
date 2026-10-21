# Pentest Strix ke build produksi lokal (port 3100) yang memakai database uji Docker.
# Prasyarat: Docker Desktop berjalan, scripts/strix/test-db.ps1 sudah dijalankan, dan STRIX_LLM + LLM_API_KEY
# tersedia (env pengguna, atau berkas .env.strix berisi baris KUNCI=nilai; gitignored).
param([switch]$SkipBuild, [string]$Instruction, [ValidateSet("quick", "standard", "deep")][string]$Mode = "standard", [double]$MaxBudget = 20, [string]$AppHost = "host.docker.internal")
$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot/../.."
Set-Location $root

if (Test-Path ".env.strix") {
  Get-Content ".env.strix" | Where-Object { $_ -match "^\s*[A-Z_]+=" } | ForEach-Object {
    $k, $v = $_ -split "=", 2
    Set-Item "env:$($k.Trim())" $v.Trim()
  }
}
$env:PATH = "C:\Program Files\Docker\Docker\resources\bin;$env:PATH"
if (-not $env:STRIX_LLM -or -not $env:LLM_API_KEY) { throw "Set STRIX_LLM dan LLM_API_KEY (env atau .env.strix) terlebih dahulu." }
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"

# Lingkungan aplikasi uji: database lokal, rahasia acak sekali pakai, http diizinkan (tanpa upgrade-insecure-requests).
$env:DATABASE_URL = "postgres://spbe:spbe-uji@localhost:55433/spbe?sslmode=disable"
$env:AUTH_SECRET = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
# Sandbox Strix (kontainer Docker) menjangkau aplikasi di mesin ini lewat host.docker.internal.
$app = "http://$($AppHost):3100"
$env:AUTH_URL = $app
$env:ALLOW_HTTP = "true"
$env:SECURITY_CONTACT = "mailto:keamanan@spbe.test"
$env:NEXT_PUBLIC_SITE_URL = $app
# Next tetap memuat .env.local untuk kunci yang belum ada di environment: timpa kunci layanan produksi dengan nilai mati
# agar uji tidak memakai kuota Gemini atau mengirim sinyal realtime ke kanal Pusher produksi.
foreach ($k in "GEMINI_API_KEY", "PUSHER_APP_ID", "PUSHER_SECRET", "NEXT_PUBLIC_PUSHER_KEY", "NEXT_PUBLIC_PUSHER_CLUSTER") { Set-Item "env:$k" "disabled" }

# Build terpisah dari .next agar tidak bentrok dengan `pnpm dev`.
$env:NEXT_DIST_DIR = ".next-strix"
# (next build menambahkan .next-strix/types ke tsconfig.json; perubahan itu tidak perlu di-commit.)
if (-not $SkipBuild) { pnpm build; if ($LASTEXITCODE) { throw "Build gagal" } }
$server = Start-Process -PassThru -NoNewWindow pnpm.cmd -ArgumentList "start", "-p", "3100" -RedirectStandardOutput "strix_runs/server.log" -RedirectStandardError "strix_runs/server.err.log"
try {
  for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-WebRequest -UseBasicParsing "http://localhost:3100/login" -TimeoutSec 2 | Out-Null; break } catch { Start-Sleep -Seconds 1 }
  }
  $accounts = Get-Content "strix_runs/akun-uji.txt" -Raw
  if (-not $Instruction) {
    $Instruction = @"
Portal SPBE Pemerintah Kabupaten Gresik (Next.js 16, Auth.js, server actions). Database ini khusus uji; boleh membuat/mengubah data.
Fokus: bypass autentikasi /cms, /keamanan, /akun dan server action; IDOR antar-OPD (operator A vs operator B); eskalasi peran di
Pengaturan > Pengguna/Hak Akses; ganti sandi (/akun/sandi): brute force, pencabutan sesi setelah ganti/reset sandi, wajib ganti sandi
sementara; unggahan .xlsx/.zip berbahaya pada Impor; ekspor /api/export/*; CSRF; XSS tersimpan; open redirect di callbackUrl login.
Akun uji:
$accounts
"@
  }
  # Salinan sumber bersih untuk sandbox Strix: hanya berkas git (tanpa .env.local yang berisi kredensial produksi).
  $source = "strix_runs/source"
  if (Test-Path $source) { Remove-Item -Recurse -Force $source }
  git ls-files -co --exclude-standard | Where-Object { $_ -notmatch "^(\.env|strix_runs/|graphify-out/)" } | ForEach-Object {
    $dest = Join-Path $source $_
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    Copy-Item -LiteralPath $_ $dest
  }
  Set-Content -Encoding utf8 "strix_runs/instruksi.txt" $Instruction
  strix -n --scan-mode $Mode --max-budget $MaxBudget --target $source --target $app --instruction-file "strix_runs/instruksi.txt"
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match "3100" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
