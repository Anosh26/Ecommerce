#!/bin/bash
set -e

# Microservice VM 4: Order & Payment Service + Order Mini DB + Cross-DB Sync Engine
echo "=== Provisioning Order Microservice VM (Private IP: 10.128.0.14) ==="

# 1. Install Docker & Git
apt-get update -y
apt-get install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io

# 2. Run Order PostgreSQL Mini Database
mkdir -p /var/lib/paaptol-order-data
docker run -d --name paaptol-order-db \
  --restart always \
  -p 5432:5432 \
  -v /var/lib/paaptol-order-data:/var/lib/postgresql/data \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_order \
  postgres:16-alpine

# Wait for DB to be healthy
until docker exec paaptol-order-db pg_isready -U postgres -d paaptol_order; do
  echo "Waiting for Order PostgreSQL DB..."
  sleep 2
done

# 3. Clone Repository & Build Container
cd /opt
if [ ! -d "/opt/Ecommerce" ]; then
  git clone https://github.com/Anosh26/Ecommerce.git
fi
cd /opt/Ecommerce
git checkout main || true
docker build -t ecommerce-app .

# 4. Initialize Database Schema
ORDER_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_order"
docker run --rm --name paaptol-order-setup \
  --network host \
  -e ORDER_DATABASE_URL="$ORDER_URL" \
  ecommerce-app npx tsx src/scripts/setup-microservices-db.ts

# 5. Start Order Microservice on Port 3004
docker run -d --name paaptol-order-service \
  --restart always \
  --network host \
  -e ORDER_DATABASE_URL="$ORDER_URL" \
  -e SEARCH_SERVICE_URL="http://10.128.0.12:3002" \
  ecommerce-app npx tsx src/services/order.ts

# 6. Start Cross-Database Sync Engine on Port 3006
AUTH_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@10.128.0.11:5432/paaptol_auth"
SEARCH_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@10.128.0.12:5432/paaptol_search"
CART_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@10.128.0.13:5432/paaptol_cart"

docker run -d --name paaptol-db-sync-service \
  --restart always \
  --network host \
  -e AUTH_DATABASE_URL="$AUTH_URL" \
  -e SEARCH_DATABASE_URL="$SEARCH_URL" \
  -e CART_DATABASE_URL="$CART_URL" \
  -e ORDER_DATABASE_URL="$ORDER_URL" \
  ecommerce-app npx tsx src/services/db-sync.ts

echo "=== Order Microservice & DB Sync Engine VM 4 initialized successfully! ==="
