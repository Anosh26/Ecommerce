# Running Paaptol Microservices on Docker (Without Docker Compose)

This guide provides full instructions and script utilities for running the Paaptol E-Commerce microservices application using pure **Docker CLI** commands without needing `docker-compose`.

---

## 🚀 Quick Start (Automated Scripts)

### Option A: Windows (PowerShell)
To automatically create network, volumes, build the image, start databases, initialize schemas, and launch all services:
```powershell
.\run-docker.ps1
```

To stop and remove all containers, network, and temporary resources:
```powershell
.\stop-docker.ps1
```

### Option B: Linux / macOS (Bash)
Make the scripts executable and run:
```bash
chmod +x run-docker.sh stop-docker.sh
./run-docker.sh
```

To stop and clean up:
```bash
./stop-docker.sh
```

---

## 🛠 Manual Step-by-Step CLI Execution

If you prefer to run raw `docker` CLI commands step-by-step:

### Step 1: Create Docker Network
Create a custom bridge network so containers can discover each other by container name via DNS:
```bash
docker network create ecommerce-network
```

### Step 2: Create Persistent Named Volumes
Create persistent volumes for the 5 microservice databases:
```bash
docker volume create pgdata_auth
docker volume create pgdata_search
docker volume create pgdata_cart
docker volume create pgdata_buy
docker volume create pgdata_payment
```

### Step 3: Launch PostgreSQL Database Containers
Launch 5 isolated PostgreSQL containers on `ecommerce-network`:

```bash
# 1. Auth Database
docker run -d --name paaptol-auth-db \
  --network ecommerce-network \
  -p 54321:5432 \
  -v pgdata_auth:/var/lib/postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_auth \
  postgres:16-alpine

# 2. Search Database
docker run -d --name paaptol-search-db \
  --network ecommerce-network \
  -p 54322:5432 \
  -v pgdata_search:/var/lib/postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_search \
  postgres:16-alpine

# 3. Cart Database
docker run -d --name paaptol-cart-db \
  --network ecommerce-network \
  -p 54323:5432 \
  -v pgdata_cart:/var/lib/postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_cart \
  postgres:16-alpine

# 4. Buy Database
docker run -d --name paaptol-buy-db \
  --network ecommerce-network \
  -p 54324:5432 \
  -v pgdata_buy:/var/lib/postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_buy \
  postgres:16-alpine

# 5. Payment Database
docker run -d --name paaptol-payment-db \
  --network ecommerce-network \
  -p 54325:5432 \
  -v pgdata_payment:/var/lib/postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Qwyhao268910_@&[+619hsksh2901h \
  -e POSTGRES_DB=paaptol_payment \
  postgres:16-alpine
```

---

### Step 4: Build Application Docker Image
Build the common Docker image used by all Node microservices and the Next.js frontend:
```bash
docker build -t ecommerce-app .
```

---

### Step 5: Run Database Setup & Seeding Container
Run a temporary container to execute database migrations and initial seed data across all 5 databases:
```bash
docker run --rm --name paaptol-db-setup \
  --network ecommerce-network \
  -e DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-auth-db:5432/paaptol_auth" \
  -e AUTH_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-auth-db:5432/paaptol_auth" \
  -e SEARCH_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-search-db:5432/paaptol_search" \
  -e CART_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-cart-db:5432/paaptol_cart" \
  -e BUY_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-buy-db:5432/paaptol_buy" \
  -e PAYMENT_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-payment-db:5432/paaptol_payment" \
  ecommerce-app npx tsx src/scripts/setup-microservices-db.ts
```

---

### Step 6: Launch Microservice Containers

```bash
# 1. Auth Service
docker run -d --name paaptol-auth-service \
  --network ecommerce-network \
  -p 3001:3001 \
  -e AUTH_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-auth-db:5432/paaptol_auth" \
  ecommerce-app npx tsx src/services/auth.ts

# 2. Search Service
docker run -d --name paaptol-search-service \
  --network ecommerce-network \
  -p 3002:3002 \
  -e SEARCH_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-search-db:5432/paaptol_search" \
  ecommerce-app npx tsx src/services/search.ts

# 3. Cart Service
docker run -d --name paaptol-cart-service \
  --network ecommerce-network \
  -p 3003:3003 \
  -e CART_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-cart-db:5432/paaptol_cart" \
  ecommerce-app npx tsx src/services/cart.ts

# 4. Payment Service
docker run -d --name paaptol-payment-service \
  --network ecommerce-network \
  -p 3005:3005 \
  -e PAYMENT_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-payment-db:5432/paaptol_payment" \
  ecommerce-app npx tsx src/services/payment.ts

# 5. Buy Service
docker run -d --name paaptol-buy-service \
  --network ecommerce-network \
  -p 3004:3004 \
  -e BUY_DATABASE_URL="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-buy-db:5432/paaptol_buy" \
  -e SEARCH_SERVICE_URL="http://paaptol-search-service:3002" \
  -e PAYMENT_SERVICE_URL="http://paaptol-payment-service:3005" \
  ecommerce-app npx tsx src/services/buy.ts

# 6. Gateway Service
docker run -d --name paaptol-gateway-service \
  --network ecommerce-network \
  -p 5000:5000 \
  -e AUTH_SERVICE_URL="http://paaptol-auth-service:3001" \
  -e SEARCH_SERVICE_URL="http://paaptol-search-service:3002" \
  -e CART_SERVICE_URL="http://paaptol-cart-service:3003" \
  -e BUY_SERVICE_URL="http://paaptol-buy-service:3004" \
  -e PAYMENT_SERVICE_URL="http://paaptol-payment-service:3005" \
  ecommerce-app npx tsx src/services/gateway.ts

# 7. Frontend Application
docker run -d --name paaptol-frontend \
  --network ecommerce-network \
  -p 3000:3000 \
  -e NEXT_GATEWAY_URL="http://paaptol-gateway-service:5000" \
  ecommerce-app npm run dev
```

---

## 🔍 Accessing the Application

Once running, access:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **API Gateway**: [http://localhost:5000](http://localhost:5000)

---

## 🧹 Manual Cleanup Commands

To stop and remove all containers and network:

```bash
# Stop and remove containers
docker stop paaptol-frontend paaptol-gateway-service paaptol-buy-service paaptol-payment-service paaptol-cart-service paaptol-search-service paaptol-auth-service paaptol-payment-db paaptol-buy-db paaptol-cart-db paaptol-search-db paaptol-auth-db
docker rm paaptol-frontend paaptol-gateway-service paaptol-buy-service paaptol-payment-service paaptol-cart-service paaptol-search-service paaptol-auth-service paaptol-payment-db paaptol-buy-db paaptol-cart-db paaptol-search-db paaptol-auth-db

# Remove network
docker network rm ecommerce-network

# (Optional) Remove volumes if resetting data
docker volume rm pgdata_auth pgdata_search pgdata_cart pgdata_buy pgdata_payment
```
