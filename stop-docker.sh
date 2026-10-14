#!/usr/bin/env bash

echo "============================================================"
echo " Stopping & Cleaning Up Paaptol 4-Microservices & Databases  "
echo "============================================================"

containers=(
    "paaptol-frontend"
    "paaptol-gateway-service"
    "paaptol-db-sync-service"
    "paaptol-order-service"
    "paaptol-cart-service"
    "paaptol-search-service"
    "paaptol-auth-service"
    "paaptol-order-db"
    "paaptol-cart-db"
    "paaptol-search-db"
    "paaptol-auth-db"
    # Legacy names cleanup
    "paaptol-buy-service"
    "paaptol-payment-service"
    "paaptol-payment-db"
    "paaptol-buy-db"
)

for c in "${containers[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
        echo "Stopping and removing '${c}'..."
        docker rm -f "${c}" > /dev/null
    fi
done

echo "Removing network 'ecommerce-network'..."
if docker network ls --format '{{.Name}}' | grep -q '^ecommerce-network$'; then
    docker network rm ecommerce-network > /dev/null
fi

echo "Cleanup completed successfully!"
