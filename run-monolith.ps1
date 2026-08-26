# PowerShell script to run monolithic ecommerce (2 containers) without docker-compose

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Starting Paaptol Monolithic E-Commerce (2 Containers)      " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Create network
Write-Host "[1/6] Creating Docker network 'paaptol-monolith-net'..." -ForegroundColor Yellow
docker network create paaptol-monolith-net 2>$null

# 2. Create volume
Write-Host "[2/6] Creating persistent database volume 'pgdata_monolith'..." -ForegroundColor Yellow
docker volume create pgdata_monolith 2>$null

# 3. Start DB container
Write-Host "[3/6] Starting Database Container ('paaptol-db')..." -ForegroundColor Yellow
docker run -d --name paaptol-db `
  --network paaptol-monolith-net `
  -p 5432:5432 `
  -v pgdata_monolith:/var/lib/postgresql `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=paaptol `
  postgres:16-alpine 2>$null

Write-Host "Waiting for PostgreSQL database to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 4. Build website image
Write-Host "[4/6] Building Website Docker Image ('ecommerce-website')..." -ForegroundColor Yellow
docker build -t ecommerce-website .

# 5. Run DB setup script
Write-Host "[5/6] Initializing Database Schema & Seeding Data..." -ForegroundColor Yellow
docker run --rm --name paaptol-db-setup `
  --network paaptol-monolith-net `
  -e DATABASE_URL="postgresql://postgres:postgres@paaptol-db:5432/paaptol" `
  ecommerce-website npx tsx src/scripts/setup-db.ts

# 6. Start website container
Write-Host "[6/6] Launching Monolithic Website Container ('paaptol-website')..." -ForegroundColor Yellow
docker run -d --name paaptol-website `
  --network paaptol-monolith-net `
  -p 3000:3000 `
  -e IS_MONOLITH="true" `
  -e DATABASE_URL="postgresql://postgres:postgres@paaptol-db:5432/paaptol" `
  ecommerce-website npm run dev

Write-Host "============================================================" -ForegroundColor Green
Write-Host " 🎉 Monolithic Application Started Successfully!           " -ForegroundColor Green
Write-Host " Website: http://localhost:3000                            " -ForegroundColor Green
Write-Host " Database: localhost:5432                                  " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
