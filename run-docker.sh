#!/usr/bin/env bash
set -e

echo "============================================================"
echo " Starting Paaptol 4-Microservices Architecture & DB-Sync    "
echo "============================================================"

# 1. Create Docker Network
echo -e "\n[1/7] Creating bridge network 'ecommerce-network'..."
if ! docker network ls --format '{{.Name}}' | grep -q '^ecommerce-network$'; then
    docker network create ecommerce-network
    echo "Network 'ecommerce-network' created."
else
    echo "Network 'ecommerce-network' already exists."
fi

# 2. Create Named Volumes for 4 Mini Databases
echo -e "\n[2/7] Creating persistent Docker volumes..."
volumes=("pgdata_auth" "pgdata_search" "pgdata_cart" "pgdata_order")
for vol in "${volumes[@]}"; do
    if ! docker volume ls --format '{{.Name}}' | grep -q "^${vol}$"; then
        docker volume create "${vol}" > /dev/null
        echo "Volume '${vol}' created."
    else
        echo "Volume '${vol}' already exists."
    fi
done

# 3. Start 4 Mini Database Containers
echo -e "\n[3/7] Launching 4 isolated PostgreSQL database containers..."
PG_PASS="Qwyhao268910_@&[+619hsksh2901h"

run_db () {
    local name=$1
    local port=$2
    local vol=$3
    local db=$4

    docker rm -f "$name" 2>/dev/null || true
    docker run -d --name "$name" \
        --network ecommerce-network \
        -p "$port" \
        -v "${vol}:/var/lib/postgresql/data" \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD="$PG_PASS" \
        -e POSTGRES_DB="$db" \
        postgres:16-alpine > /dev/null
    echo "Database container '$name' running on port $port."
}

run_db "paaptol-auth-db" "54321:5432" "pgdata_auth" "paaptol_auth"
run_db "paaptol-search-db" "54322:5432" "pgdata_search" "paaptol_search"
run_db "paaptol-cart-db" "54323:5432" "pgdata_cart" "paaptol_cart"
run_db "paaptol-order-db" "54324:5432" "pgdata_order" "paaptol_order"

# 4. Build Application Docker Image
echo -e "\n[4/7] Building application image 'ecommerce-app'..."
docker build -t ecommerce-app .
echo "Image 'ecommerce-app' built successfully."

# 5. Wait for DB readiness & Run Setup Script
echo -e "\n[5/7] Initializing microservice database schemas & sync tables..."
sleep 6

AUTH_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-auth-db:5432/paaptol_auth"
SEARCH_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-search-db:5432/paaptol_search"
CART_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-cart-db:5432/paaptol_cart"
ORDER_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-order-db:5432/paaptol_order"

docker run --rm --name paaptol-db-setup \
    --network ecommerce-network \
    -e AUTH_DATABASE_URL="$AUTH_CONN" \
    -e SEARCH_DATABASE_URL="$SEARCH_CONN" \
    -e CART_DATABASE_URL="$CART_CONN" \
    -e ORDER_DATABASE_URL="$ORDER_CONN" \
    ecommerce-app npx tsx src/scripts/setup-microservices-db.ts

echo "Database schemas and sync tables initialized successfully."

clear_container () {
    docker rm -f "$1" 2>/dev/null || true
}

# 6. Launch 4 Microservice Containers + DB Sync Engine + API Gateway
echo -e "\n[6/7] Launching 4 backend microservices, DB sync engine, and API Gateway..."

# 1. Auth Service (Port 3001)
clear_container "paaptol-auth-service"
docker run -d --name paaptol-auth-service \
    --network ecommerce-network \
    -p 3001:3001 \
    -e AUTH_DATABASE_URL="$AUTH_CONN" \
    ecommerce-app npx tsx src/services/auth.ts > /dev/null
echo "1. Auth Service running on port 3001"

# 2. Search / Catalog Service (Port 3002)
clear_container "paaptol-search-service"
docker run -d --name paaptol-search-service \
    --network ecommerce-network \
    -p 3002:3002 \
    -e SEARCH_DATABASE_URL="$SEARCH_CONN" \
    ecommerce-app npx tsx src/services/search.ts > /dev/null
echo "2. Search / Catalog Service running on port 3002"

# 3. Cart Service (Port 3003)
clear_container "paaptol-cart-service"
docker run -d --name paaptol-cart-service \
    --network ecommerce-network \
    -p 3003:3003 \
    -e CART_DATABASE_URL="$CART_CONN" \
    ecommerce-app npx tsx src/services/cart.ts > /dev/null
echo "3. Cart Service running on port 3003"

# 4. Order & Payment Service (Port 3004)
clear_container "paaptol-order-service"
docker run -d --name paaptol-order-service \
    --network ecommerce-network \
    -p 3004:3004 \
    -e ORDER_DATABASE_URL="$ORDER_CONN" \
    -e SEARCH_SERVICE_URL="http://paaptol-search-service:3002" \
    ecommerce-app npx tsx src/services/order.ts > /dev/null
echo "4. Order & Payment Service running on port 3004"

# 5. DB Sync Engine (Port 3006)
clear_container "paaptol-db-sync-service"
docker run -d --name paaptol-db-sync-service \
    --network ecommerce-network \
    -p 3006:3006 \
    -e AUTH_DATABASE_URL="$AUTH_CONN" \
    -e SEARCH_DATABASE_URL="$SEARCH_CONN" \
    -e CART_DATABASE_URL="$CART_CONN" \
    -e ORDER_DATABASE_URL="$ORDER_CONN" \
    ecommerce-app npx tsx src/services/db-sync.ts > /dev/null
echo "5. Cross-DB Synchronization Engine running on port 3006"

# 6. Gateway Service (Port 5000)
clear_container "paaptol-gateway-service"
docker run -d --name paaptol-gateway-service \
    --network ecommerce-network \
    -p 5000:5000 \
    -e AUTH_SERVICE_URL="http://paaptol-auth-service:3001" \
    -e SEARCH_SERVICE_URL="http://paaptol-search-service:3002" \
    -e CART_SERVICE_URL="http://paaptol-cart-service:3003" \
    -e ORDER_SERVICE_URL="http://paaptol-order-service:3004" \
    -e SYNC_SERVICE_URL="http://paaptol-db-sync-service:3006" \
    ecommerce-app npx tsx src/services/gateway.ts > /dev/null
echo "API Gateway Service running on port 5000"

# 7. Launch Frontend Container
echo -e "\n[7/7] Launching Next.js Frontend..."
clear_container "paaptol-frontend"
docker run -d --name paaptol-frontend \
    --network ecommerce-network \
    -p 3000:3000 \
    -e NEXT_GATEWAY_URL="http://paaptol-gateway-service:5000" \
    ecommerce-app npm run dev > /dev/null
echo "Frontend application running on port 3000"

echo "============================================================"
echo " All 4 microservices + DB sync + Frontend started!"
echo " Frontend URL: http://localhost:3000"
echo " API Gateway:  http://localhost:5000"
echo " DB Sync API:  http://localhost:5000/api/sync/status"
echo " Run ./stop-docker.sh to stop and clean up."
echo "============================================================"
