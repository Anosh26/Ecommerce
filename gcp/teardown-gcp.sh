#!/usr/bin/env bash

# ==============================================================================
# Google Cloud Platform (GCP) Teardown Script
# Safely stops and deletes all 5 VMs, NAT, Router, Firewalls, Subnet, and VPC.
# ==============================================================================

ZONE="${GCP_ZONE:-us-central1-a}"
REGION="${GCP_REGION:-us-central1}"
VPC_NAME="ecommerce-vpc"
SUBNET_NAME="ecommerce-subnet"

echo "===================================================================="
echo " Tearing down Paaptol GCP Microservice Infrastructure...            "
echo "===================================================================="

# 1. Delete all 5 VMs
echo "[1/5] Deleting Compute Engine VMs..."
vms=("vm-gateway-frontend" "vm-auth" "vm-search" "vm-cart" "vm-order")
for vm in "${vms[@]}"; do
    if gcloud compute instances describe "$vm" --zone="$ZONE" >/dev/null 2>&1; then
        echo "Deleting instance '$vm'..."
        gcloud compute instances delete "$vm" --zone="$ZONE" --quiet
    fi
done

# 2. Delete Cloud NAT & Router
echo "[2/5] Deleting Cloud NAT and Cloud Router..."
if gcloud compute routers nats describe "ecommerce-nat" --router="ecommerce-router" --region="$REGION" >/dev/null 2>&1; then
    gcloud compute routers nats delete "ecommerce-nat" --router="ecommerce-router" --region="$REGION" --quiet
fi
if gcloud compute routers describe "ecommerce-router" --region="$REGION" >/dev/null 2>&1; then
    gcloud compute routers delete "ecommerce-router" --region="$REGION" --quiet
fi

# 3. Delete Firewall Rules
echo "[3/5] Deleting Firewall Rules..."
fws=("ecommerce-allow-frontend-external" "ecommerce-allow-internal-vpc" "ecommerce-allow-ssh")
for fw in "${fws[@]}"; do
    if gcloud compute firewall-rules describe "$fw" >/dev/null 2>&1; then
        gcloud compute firewall-rules delete "$fw" --quiet
    fi
done

# 4. Delete Subnet
echo "[4/5] Deleting Subnet '$SUBNET_NAME'..."
if gcloud compute networks subnets describe "$SUBNET_NAME" --region="$REGION" >/dev/null 2>&1; then
    gcloud compute networks subnets delete "$SUBNET_NAME" --region="$REGION" --quiet
fi

# 5. Delete VPC Network
echo "[5/5] Deleting VPC Network '$VPC_NAME'..."
if gcloud compute networks describe "$VPC_NAME" >/dev/null 2>&1; then
    gcloud compute networks delete "$VPC_NAME" --quiet
fi

echo "===================================================================="
echo " Cleanup complete! All GCP resources removed.                      "
echo "===================================================================="
