#!/bin/bash
set -e

# Microservice VM 3: Cart Service + Cart Mini DB
echo "=== Provisioning Cart Microservice VM (Private IP: 10.128.0.13) ==="

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

# 2. Run Cart PostgreSQL Mini Database
mkdir -p /var/lib/paaptol-cart-data
docker run -d --name paaptol-cart-db \
  --restart always \
  -p 5432:5432 \
  -v /var/lib/paaptol-cart-data:/var/lib/postgresql/data \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_cart \
  postgres:16-alpine

# Wait for DB to be healthy
until docker exec paaptol-cart-db pg_isready -U postgres -d paaptol_cart; do
  echo "Waiting for Cart PostgreSQL DB..."
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
CART_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_cart"
docker run --rm --name paaptol-cart-setup \
  --network host \
  -e CART_DATABASE_URL="$CART_URL" \
  ecommerce-app npx tsx src/scripts/setup-microservices-db.ts

# 5. Start Cart Microservice on Port 3003
docker run -d --name paaptol-cart-service \
  --restart always \
  --network host \
  -e CART_DATABASE_URL="$CART_URL" \
  ecommerce-app npx tsx src/services/cart.ts

echo "=== Cart Microservice VM 3 initialized successfully! ==="
