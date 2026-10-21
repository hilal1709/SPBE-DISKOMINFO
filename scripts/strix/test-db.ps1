# Database uji lokal untuk Strix: Postgres di Docker (port 55433), skema + migrasi, akun uji per peran.
# Tidak pernah memakai DATABASE_URL di .env.local (produksi).
$ErrorActionPreference = "Stop"
$name = "spbe-strix-db"
$env:DATABASE_URL = "postgres://spbe:spbe-uji@localhost:55433/spbe?sslmode=disable"

if (-not (docker ps -a --format "{{.Names}}" | Select-String -SimpleMatch $name)) {
  docker run -d --name $name -e POSTGRES_USER=spbe -e POSTGRES_PASSWORD=spbe-uji -e POSTGRES_DB=spbe -p 127.0.0.1:55433:5432 postgres:16-alpine | Out-Null
} else {
  docker start $name | Out-Null
}
for ($i = 0; $i -lt 30; $i++) {
  docker exec $name pg_isready -U spbe -d spbe 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

node database/migrate.mjs
pnpm exec tsx scripts/strix/seed-test-users.mts
