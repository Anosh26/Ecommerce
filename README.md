## Monolithic E-Commerce (`monolithic-ecommerce` branch)

This branch contains the **Monolithic architecture** of the Paaptol E-Commerce application, designed to run using **ONLY 2 CONTAINERS** via pure Docker CLI commands (without Docker Compose):

1. **`paaptol-db`**: PostgreSQL database container storing products, orders, and items.
2. **`paaptol-website`**: Next.js application container running both the user interface and backend API routes.

---

### Quick Start

- **Windows (PowerShell)**: Run `.\run-monolith.ps1` (Stop: `.\stop-monolith.ps1`)
- **Linux / macOS (Bash)**: Run `./run-monolith.sh` (Stop: `./stop-monolith.sh`)

For full manual CLI step-by-step commands, refer to [MONOLITHIC.md](file:///c:/Users/Anosh/Documents/Notes/Projects/Cloud_Computing\Ecommerce/MONOLITHIC.md).
