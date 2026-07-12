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

// Generate microservice DB URLs from main DATABASE_URL
const mainDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol';
const match = mainDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (match) {
  const [_, user, password, host, port] = match;
  process.env.AUTH_DATABASE_URL = process.env.AUTH_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_auth`;
  process.env.SEARCH_DATABASE_URL = process.env.SEARCH_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_search`;
  process.env.CART_DATABASE_URL = process.env.CART_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_cart`;
  process.env.BUY_DATABASE_URL = process.env.BUY_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_buy`;
  process.env.PAYMENT_DATABASE_URL = process.env.PAYMENT_DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/paaptol_payment`;
}

const services = [
  { name: 'Auth Service', path: path.resolve('./src/services/auth.ts') },
  { name: 'Search Service', path: path.resolve('./src/services/search.ts') },
  { name: 'Cart Service', path: path.resolve('./src/services/cart.ts') },
  { name: 'Buy Service', path: path.resolve('./src/services/buy.ts') },
  { name: 'Payment Service', path: path.resolve('./src/services/payment.ts') },
  { name: 'API Gateway', path: path.resolve('./src/services/gateway.ts') },
];

function spawnWorker(serviceName: string, servicePath: string) {
  // Find the absolute path of ts-node/register to ensure worker thread can resolve it
  const tsNodeRegister = require.resolve('ts-node/register').replace(/\\/g, '\\\\');
  
  // Spawn a worker thread and compile/run the TypeScript file using ts-node register hook
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

console.log('Booting all backend microservices on parallel worker threads...');
services.forEach(s => spawnWorker(s.name, s.path));
console.log('All backend services spawned. Keep this process running.');
