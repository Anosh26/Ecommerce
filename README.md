# Paaptol E-Commerce — 4-Microservices & Multi-VM GCP Architecture

This project is an e-commerce platform engineered with a **4-Microservices Architecture**, where each microservice runs with its own **isolated mini-database on a separate VM**, fully compliant with cloud security and distributed database requirements:

1. **Maximum 4 Microservices**:
   - **Auth Service** (Port 3001) + `paaptol_auth` DB (Port 5432)
   - **Catalog / Search Service** (Port 3002) + `paaptol_search` DB (Port 5432)
   - **Cart Service** (Port 3003) + `paaptol_cart` DB (Port 5432)
   - **Order & Payment Service** (Port 3004) + `paaptol_order` DB (Port 5432)
2. **Strict Network Security**:
   - Only the **Frontend / API Gateway VM** is reachable via an **External Public IP**.
   - The 4 microservice VMs reside entirely on a **Private VPC Subnet** (`10.128.0.0/24`) with NO external IPs and all public traffic blocked via GCP Firewall rules.
3. **Cross-Database Synchronization**:
   - A dedicated **DB Sync Engine** continuously replicates and reconciles users, product catalog updates, stock events, and completed orders across the 4 mini-databases over the private VPC.

---

## 🚀 Quick Start (Local Docker Testing)

### Option 1: Docker Compose (All 4 Services + 4 DBs + Gateway + Sync Engine)
```bash
docker compose up --build
```
Access the application at [http://localhost:3000](http://localhost:3000) (Admin Resiliency & Sync Console: [http://localhost:3000/admin](http://localhost:3000/admin)).

### Option 2: Pure Docker CLI (Without Docker Compose)
- **Linux / macOS**: `./run-docker.sh` (To stop: `./stop-docker.sh`)
- **Windows (PowerShell)**: `.\run-docker.ps1` (To stop: `.\stop-docker.ps1`)

---

## ☁️ Deploying on Google Cloud Platform (Multi-VM Setup)

For production deployment across 5 separate Google Cloud Compute Engine VMs (1 Public Gateway VM + 4 Private Microservice VMs):

1. Open **Google Cloud Shell** (`https://shell.cloud.google.com`).
2. Clone the repository and execute the automated GCP deploy script:
   ```bash
   git clone https://github.com/Anosh26/Ecommerce.git
   cd Ecommerce
   chmod +x gcp/deploy-gcp.sh gcp/teardown-gcp.sh gcp/startup-scripts/*.sh
   ./gcp/deploy-gcp.sh
   ```
3. The script configures the VPC, Cloud NAT, Firewalls, and provisions all 5 VMs.

For step-by-step instructions, verification commands, and architecture diagrams, refer to [gcp/README_GCP.md](file:///c:/Users/Anosh/Documents/Notes/Projects/Cloud_Computing/Ecommerce/gcp/README_GCP.md).

---

## 🔄 Verifying Database Synchronization
The application features a real-time sync status API and an interactive sync panel in the Admin dashboard:
- **API Endpoint**: `GET /api/sync/status` (via Gateway)
- **Manual Trigger**: `POST /api/sync/trigger`
- **Admin UI**: Log in with `admin@sunny.com` / `admin123` at `/admin` to view live sync metrics and trigger manual synchronization cycles.
