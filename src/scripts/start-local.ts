import { execSync, spawn } from 'child_process';

console.log('--- Starting Paaptol Store Locally ---');

// 1. Run database setup
try {
  console.log('Running database setup...');
  execSync('npx tsx src/scripts/setup-microservices-db.ts', { stdio: 'inherit' });
} catch (err) {
  console.error('Database setup failed. Make sure PostgreSQL is running locally.');
  process.exit(1);
}

// 2. Start backend microservices runner
console.log('Starting backend microservices...');
const backend = spawn('npx', ['tsx', 'src/scripts/run-services.ts'], { stdio: 'inherit', shell: true });

// 3. Start Next.js dev server
console.log('Starting Next.js dev server...');
const frontend = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });

// Propagate termination signals
const cleanup = () => {
  console.log('\nShutting down local servers...');
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
