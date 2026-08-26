#!/usr/bin/env bash

echo "============================================================"
echo " Starting Paaptol Monolithic E-Commerce (2 Containers)      "
echo "============================================================"

# 1. Create network
echo "[1/6] Creating Docker network 'paaptol-monolith-net'..."
docker network create paaptol-monolith-net 2>/dev/null || true

# 2. Create volume
echo "[2/6] Creating persistent database volume 'pgdata_monolith'..."
docker volume create pgdata_monolith 2>/dev/null || true

# 3. Start DB container
echo "[3/6] Starting Database Container ('paaptol-db')..."
docker run -d --name paaptol-db \
  --network paaptol-monolith-net \
  -p 5432:5432 \
  -v pgdata_monolith:/var/lib/postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=paaptol \
  postgres:16-alpine 2>/dev/null || true

echo "Waiting for PostgreSQL database to start..."
sleep 5

# 4. Build website image
echo "[4/6] Building Website Docker Image ('ecommerce-website')..."
docker build -t ecommerce-website .

# 5. Run DB setup script
echo "[5/6] Initializing Database Schema & Seeding Data..."
docker run --rm --name paaptol-db-setup \
  --network paaptol-monolith-net \
  -e DATABASE_URL="postgresql://postgres:postgres@paaptol-db:5432/paaptol" \
  ecommerce-website npx tsx src/scripts/setup-db.ts

# 6. Start website container
echo "[6/6] Launching Monolithic Website Container ('paaptol-website')..."
docker run -d --name paaptol-website \
  --network paaptol-monolith-net \
  -p 3000:3000 \
  -e IS_MONOLITH="true" \
  -e DATABASE_URL="postgresql://postgres:postgres@paaptol-db:5432/paaptol" \
  ecommerce-website npm run dev

echo "============================================================"
echo " 🎉 Monolithic Application Started Successfully!           "
echo " Website: http://localhost:3000                            "
echo " Database: localhost:5432                                  "
echo "============================================================"
