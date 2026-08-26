# Running Monolithic E-Commerce on Docker (Without Docker Compose)

This branch contains the **Monolithic E-Commerce Application**, designed to run with **ONLY 2 CONTAINERS**:
1. **`paaptol-db`**: Single PostgreSQL Database container holding all products, orders, and customer data.
2. **`paaptol-website`**: Monolithic Next.js application container serving the UI and handling API logic directly.

---

## 🚀 Quick Start (Automated Scripts)

### Windows (PowerShell):
```powershell
.\run-monolith.ps1
```
To stop and clean up:
```powershell
.\stop-monolith.ps1
```

### Linux / macOS (Bash):
```bash
chmod +x run-monolith.sh stop-monolith.sh
./run-monolith.sh
```
To stop and clean up:
```bash
./stop-monolith.sh
```

---

## 🛠 Manual Step-by-Step CLI Execution (Without Compose)

### Step 1: Create Docker Network
```bash
docker network create paaptol-monolith-net
```

### Step 2: Create Persistent Database Volume
```bash
docker volume create pgdata_monolith
```

### Step 3: Run Database Container (`paaptol-db`)
```bash
docker run -d --name paaptol-db \
  --network paaptol-monolith-net \
  -p 5432:5432 \
  -v pgdata_monolith:/var/lib/postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=paaptol \
  postgres:16-alpine
```

### Step 4: Build Website Docker Image
```bash
docker build -t ecommerce-website .
```

### Step 5: Run Database Migration & Seeding Container
```bash
docker run --rm --name paaptol-db-setup \
  --network paaptol-monolith-net \
  -e DATABASE_URL="postgresql://postgres:postgres@paaptol-db:5432/paaptol" \
  ecommerce-website npx tsx src/scripts/setup-db.ts
```

### Step 6: Run Monolithic Website Container (`paaptol-website`)
```bash
docker run -d --name paaptol-website \
  --network paaptol-monolith-net \
  -p 3000:3000 \
  -e IS_MONOLITH="true" \
  -e DATABASE_URL="postgresql://postgres:postgres@paaptol-db:5432/paaptol" \
  ecommerce-website npm run dev
```

---

## 🔍 Accessing the Monolithic App
- **Web App**: [http://localhost:3000](http://localhost:3000)

---

## 🧹 Cleanup Commands
```bash
docker stop paaptol-website paaptol-db
docker rm paaptol-website paaptol-db
docker network rm paaptol-monolith-net
# Optional: remove database volume
docker volume rm pgdata_monolith
```
