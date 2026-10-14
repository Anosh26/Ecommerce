#!/bin/bash
set -e

# Gateway & Frontend VM 0: The ONLY VM with an External Public IP
echo "=== Provisioning Gateway & Frontend VM (Public External IP) ==="

# 1. Install Docker, Nginx, & Git
apt-get update -y
apt-get install -y ca-certificates curl gnupg git iptables
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io

# 2. Clone Repository & Build Container
cd /opt
if [ ! -d "/opt/Ecommerce" ]; then
  git clone https://github.com/Anosh26/Ecommerce.git
fi
cd /opt/Ecommerce
git checkout main || true
docker build -t ecommerce-app .

# 3. Start API Gateway on Port 5000 (connected to the 4 private microservice VMs)
docker run -d --name paaptol-gateway-service \
  --restart always \
  --network host \
  -e AUTH_SERVICE_URL="http://10.128.0.11:3001" \
  -e SEARCH_SERVICE_URL="http://10.128.0.12:3002" \
  -e CART_SERVICE_URL="http://10.128.0.13:3003" \
  -e ORDER_SERVICE_URL="http://10.128.0.14:3004" \
  -e SYNC_SERVICE_URL="http://10.128.0.14:3006" \
  ecommerce-app npx tsx src/services/gateway.ts

# 4. Start Next.js Frontend on Port 3000
docker run -d --name paaptol-frontend \
  --restart always \
  --network host \
  -e NEXT_GATEWAY_URL="http://localhost:5000" \
  ecommerce-app npm run dev

# 5. Forward Port 80 to 3000 so users can simply type the External IP without :3000
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000 || true

echo "=== Frontend & Gateway VM 0 initialized successfully! ==="
