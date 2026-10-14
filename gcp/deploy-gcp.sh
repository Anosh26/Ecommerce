#!/usr/bin/env bash
set -e

# ==============================================================================
# Google Cloud Platform (GCP) Automated Deployment Script
# Architecture: 4 Microservices (each with mini DB on a separate VM) + 1 Public Gateway/Frontend VM
# Security: ONLY the Frontend/API Gateway has an External IP.
# Data: Cross-database synchronization engine syncing between the 4 mini DBs.
# ==============================================================================

# Configurable defaults
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
MACHINE_TYPE="${GCP_MACHINE_TYPE:-e2-medium}"
VPC_NAME="ecommerce-vpc"
SUBNET_NAME="ecommerce-subnet"
SUBNET_RANGE="10.128.0.0/24"

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo "Error: No active GCP project configured."
    echo "Please run: gcloud config set project <YOUR_PROJECT_ID>"
    exit 1
fi

echo "===================================================================="
echo " Deploying Paaptol 4-Microservices E-Commerce Application to GCP     "
echo " Project:      $PROJECT_ID"
echo " Region / Zone: $REGION / $ZONE"
echo " Machine Type: $MACHINE_TYPE"
echo "===================================================================="

# 1. Enable Required GCP APIs
echo -e "\n[1/6] Enabling Compute Engine API..."
gcloud services enable compute.googleapis.com

# 2. Create Custom VPC Network & Subnet
echo -e "\n[2/6] Setting up VPC Network and Subnet ($SUBNET_RANGE)..."
if ! gcloud compute networks describe "$VPC_NAME" >/dev/null 2>&1; then
    gcloud compute networks create "$VPC_NAME" --subnet-mode=custom
    echo "VPC network '$VPC_NAME' created."
fi

if ! gcloud compute networks subnets describe "$SUBNET_NAME" --region="$REGION" >/dev/null 2>&1; then
    gcloud compute networks subnets create "$SUBNET_NAME" \
        --network="$VPC_NAME" \
        --region="$REGION" \
        --range="$SUBNET_RANGE"
    echo "Subnet '$SUBNET_NAME' created."
fi

# 3. Create Cloud Router & Cloud NAT (allows private VMs to download packages/docker)
echo -e "\n[3/6] Setting up Cloud NAT for private microservice VMs..."
if ! gcloud compute routers describe "ecommerce-router" --region="$REGION" >/dev/null 2>&1; then
    gcloud compute routers create "ecommerce-router" \
        --network="$VPC_NAME" \
        --region="$REGION"
fi

if ! gcloud compute routers nats describe "ecommerce-nat" --router="ecommerce-router" --region="$REGION" >/dev/null 2>&1; then
    gcloud compute routers nats create "ecommerce-nat" \
        --router="ecommerce-router" \
        --region="$REGION" \
        --auto-allocate-nat-external-ips \
        --nat-all-subnet-ip-ranges
    echo "Cloud NAT 'ecommerce-nat' created."
fi

# 4. Create Firewall Rules (STRICT ISOLATION)
echo -e "\n[4/6] Configuring GCP Firewall Rules..."

# Rule A: Allow public external HTTP access ONLY to the Frontend/Gateway VM
if ! gcloud compute firewall-rules describe "ecommerce-allow-frontend-external" >/dev/null 2>&1; then
    gcloud compute firewall-rules create "ecommerce-allow-frontend-external" \
        --network="$VPC_NAME" \
        --action=ALLOW \
        --direction=INGRESS \
        --rules=tcp:80,tcp:443,tcp:3000,tcp:5000 \
        --source-ranges="0.0.0.0/0" \
        --target-tags="frontend-gateway" \
        --description="Allow external internet access ONLY to Frontend and API Gateway VM"
fi

# Rule B: Allow full internal communication within the private VPC subnet
if ! gcloud compute firewall-rules describe "ecommerce-allow-internal-vpc" >/dev/null 2>&1; then
    gcloud compute firewall-rules create "ecommerce-allow-internal-vpc" \
        --network="$VPC_NAME" \
        --action=ALLOW \
        --direction=INGRESS \
        --rules=tcp:1-65535,udp:1-65535,icmp \
        --source-ranges="$SUBNET_RANGE" \
        --description="Allow internal communication and DB synchronization between VPC VMs"
fi

# Rule C: Allow SSH for administrator management
if ! gcloud compute firewall-rules describe "ecommerce-allow-ssh" >/dev/null 2>&1; then
    gcloud compute firewall-rules create "ecommerce-allow-ssh" \
        --network="$VPC_NAME" \
        --action=ALLOW \
        --direction=INGRESS \
        --rules=tcp:22 \
        --source-ranges="0.0.0.0/0" \
        --description="Allow SSH for administration"
fi

# 5. Provision the 4 Private Microservice VMs (NO EXTERNAL IP)
echo -e "\n[5/6] Provisioning the 4 Microservice VMs (with isolated mini-databases)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

create_microservice_vm () {
    local vm_name=$1
    local private_ip=$2
    local startup_script=$3

    if ! gcloud compute instances describe "$vm_name" --zone="$ZONE" >/dev/null 2>&1; then
        echo "Creating $vm_name (Private IP: $private_ip, NO External IP)..."
        gcloud compute instances create "$vm_name" \
            --zone="$ZONE" \
            --machine-type="$MACHINE_TYPE" \
            --subnet="$SUBNET_NAME" \
            --private-network-ip="$private_ip" \
            --no-address \
            --tags="microservice-node" \
            --image-family="ubuntu-2204-lts" \
            --image-project="ubuntu-os-cloud" \
            --boot-disk-size="20GB" \
            --metadata-from-file=startup-script="$SCRIPT_DIR/startup-scripts/$startup_script"
    else
        echo "Instance '$vm_name' already exists."
    fi
}

create_microservice_vm "vm-auth"   "10.128.0.11" "startup-auth.sh"
create_microservice_vm "vm-search" "10.128.0.12" "startup-search.sh"
create_microservice_vm "vm-cart"   "10.128.0.13" "startup-cart.sh"
create_microservice_vm "vm-order"  "10.128.0.14" "startup-order.sh"

# 6. Provision the Frontend & API Gateway VM (THE ONLY PUBLIC VM)
echo -e "\n[6/6] Provisioning the Frontend / API Gateway VM (PUBLIC EXTERNAL IP)..."
if ! gcloud compute instances describe "vm-gateway-frontend" --zone="$ZONE" >/dev/null 2>&1; then
    echo "Creating vm-gateway-frontend (Public IP Enabled)..."
    gcloud compute instances create "vm-gateway-frontend" \
        --zone="$ZONE" \
        --machine-type="$MACHINE_TYPE" \
        --subnet="$SUBNET_NAME" \
        --private-network-ip="10.128.0.10" \
        --tags="frontend-gateway" \
        --image-family="ubuntu-2204-lts" \
        --image-project="ubuntu-os-cloud" \
        --boot-disk-size="20GB" \
        --metadata-from-file=startup-script="$SCRIPT_DIR/startup-scripts/startup-frontend.sh"
else
    echo "Instance 'vm-gateway-frontend' already exists."
fi

# Retrieve Public IP
EXTERNAL_IP=$(gcloud compute instances describe "vm-gateway-frontend" \
    --zone="$ZONE" \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo -e "\n===================================================================="
echo " 🚀 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "===================================================================="
echo " 🌐 Public Ecommerce URL: http://$EXTERNAL_IP:3000 (or http://$EXTERNAL_IP)"
echo " 🚪 API Gateway URL:     http://$EXTERNAL_IP:5000"
echo " 🔄 DB Sync Health API:  http://$EXTERNAL_IP:5000/api/sync/status"
echo "===================================================================="
echo -e "\nArchitecture Verification:"
echo " 1. vm-gateway-frontend -> External IP: $EXTERNAL_IP | Internal IP: 10.128.0.10"
echo " 2. vm-auth             -> External IP: NONE (Private) | Internal IP: 10.128.0.11"
echo " 3. vm-search           -> External IP: NONE (Private) | Internal IP: 10.128.0.12"
echo " 4. vm-cart             -> External IP: NONE (Private) | Internal IP: 10.128.0.13"
echo " 5. vm-order            -> External IP: NONE (Private) | Internal IP: 10.128.0.14"
echo ""
echo "Note: VM startup scripts take ~2-3 minutes to download Docker and boot the services."
echo "To monitor startup on the frontend VM, run:"
echo "  gcloud compute ssh vm-gateway-frontend --zone=$ZONE --command=\"sudo journalctl -u google-startup-scripts.service -f\""
echo "===================================================================="
