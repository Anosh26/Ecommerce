import { Worker } from 'worker_threads';
import * as path from 'path';
import { createRequire } from 'module';
import * as fs from 'fs';

const require = createRequire(import.meta.url);

// Load .env.local if present
try {
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          process.env[key] = val;
        }
      }
    }
    console.log('Loaded environment variables from .env.local');
  }
} catch (e) {
  console.error('Failed to load .env.local:', e);
}

// Generate microservice DB URLs from main DATABASE_URL for 4 microservices
const mainDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol';
const match = mainDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (match) {
  const [_, user, password, host, port] = match;
  process.env.AUTH_DATABASE_URL = process.env.AUTH_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_auth`;
  process.env.SEARCH_DATABASE_URL = process.env.SEARCH_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_search`;
  process.env.CART_DATABASE_URL = process.env.CART_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_cart`;
  process.env.ORDER_DATABASE_URL = process.env.ORDER_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_order`;
}

// Exactly 4 Microservices + API Gateway + DB Sync Engine
const services = [
  { name: '1. Auth Service (Port 3001)', path: path.resolve('./src/services/auth.ts') },
  { name: '2. Search / Catalog Service (Port 3002)', path: path.resolve('./src/services/search.ts') },
  { name: '3. Cart Service (Port 3003)', path: path.resolve('./src/services/cart.ts') },
  { name: '4. Order & Payment Service (Port 3004)', path: path.resolve('./src/services/order.ts') },
  { name: 'API Gateway Proxy (Port 5000)', path: path.resolve('./src/services/gateway.ts') },
  { name: 'DB Sync Engine (Port 3006)', path: path.resolve('./src/services/db-sync.ts') },
];

function spawnWorker(serviceName: string, servicePath: string) {
  const tsNodeRegister = require.resolve('ts-node/register').replace(/\\/g, '\\\\');
  
  const workerCode = `
    const path = require('path');
    require('${tsNodeRegister}');
    process.env.START_STANDALONE = 'true';
    require(path.resolve('${servicePath.replace(/\\/g, '\\\\')}'));
  `;
  
  const worker = new Worker(workerCode, { eval: true });

  worker.on('error', (err) => {
    console.error(`[${serviceName} Error]:`, err.message);
  });

  worker.on('exit', (code) => {
    console.log(`[${serviceName}]: Thread exited with code ${code}`);
  });

  console.log(`Started thread for [${serviceName}]`);
  return worker;
}

console.log('Booting 4 microservices + Gateway + DB Sync Engine on parallel worker threads...');
services.forEach(s => spawnWorker(s.name, s.path));
console.log('All backend services spawned. Keep this process running.');
