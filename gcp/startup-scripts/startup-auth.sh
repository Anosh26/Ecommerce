#!/bin/bash
set -e

# Microservice VM 1: Auth Service + Auth Mini DB
echo "=== Provisioning Auth Microservice VM (Private IP: 10.128.0.11) ==="

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

# 2. Run Auth PostgreSQL Mini Database (bind to 0.0.0.0:5432 so VPC peer VMs can sync)
mkdir -p /var/lib/paaptol-auth-data
docker run -d --name paaptol-auth-db \
  --restart always \
  -p 5432:5432 \
  -v /var/lib/paaptol-auth-data:/var/lib/postgresql/data \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_auth \
  postgres:16-alpine

# Wait for DB to be healthy
until docker exec paaptol-auth-db pg_isready -U postgres -d paaptol_auth; do
  echo "Waiting for Auth PostgreSQL DB..."
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
AUTH_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_auth"
docker run --rm --name paaptol-auth-setup \
  --network host \
  -e AUTH_DATABASE_URL="$AUTH_URL" \
  ecommerce-app npx tsx src/scripts/setup-microservices-db.ts

# 5. Start Auth Microservice on Port 3001
docker run -d --name paaptol-auth-service \
  --restart always \
  --network host \
  -e AUTH_DATABASE_URL="$AUTH_URL" \
  ecommerce-app npx tsx src/services/auth.ts

echo "=== Auth Microservice VM 1 initialized successfully! ==="
