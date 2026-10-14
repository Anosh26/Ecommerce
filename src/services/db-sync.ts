import * as http from 'http';
import { Pool } from 'pg';

const PORT = parseInt(process.env.SYNC_SERVICE_PORT || '3006');
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '5000'); // every 5 seconds

// Mini Database connection strings across the VPC
const AUTH_DB_URL = process.env.AUTH_DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_auth';
const SEARCH_DB_URL = process.env.SEARCH_DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_search';
const CART_DB_URL = process.env.CART_DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_cart';
const ORDER_DB_URL = process.env.ORDER_DATABASE_URL || process.env.BUY_DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_order';

const authPool = new Pool({ connectionString: AUTH_DB_URL });
const searchPool = new Pool({ connectionString: SEARCH_DB_URL });
const cartPool = new Pool({ connectionString: CART_DB_URL });
const orderPool = new Pool({ connectionString: ORDER_DB_URL });

export interface SyncStats {
  lastSyncTime: string | null;
  totalCycles: number;
  syncedUsers: number;
  syncedProducts: number;
  syncedStockEvents: number;
  syncedOrders: number;
  lastError: string | null;
  databases: {
    auth: boolean;
    search: boolean;
    cart: boolean;
    order: boolean;
  };
}

const stats: SyncStats = {
  lastSyncTime: null,
  totalCycles: 0,
  syncedUsers: 0,
  syncedProducts: 0,
  syncedStockEvents: 0,
  syncedOrders: 0,
  lastError: null,
  databases: {
    auth: false,
    search: false,
    cart: false,
    order: false
  }
};

/**
 * 1. Synchronize Users: Auth DB -> Cart DB & Order DB
 */
async function syncUsers() {
  try {
    const authUsers = await authPool.query('SELECT id, name, email, role, created_at FROM users');
    stats.databases.auth = true;

    for (const u of authUsers.rows) {
      // Sync to Cart DB
      try {
        await cartPool.query(`
          INSERT INTO synced_users (id, name, email, role, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE 
          SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP
        `, [u.id, u.name, u.email, u.role]);
        stats.databases.cart = true;
      } catch (err: any) {
        // Table may still be provisioning
      }

      // Sync to Order DB
      try {
        await orderPool.query(`
          INSERT INTO synced_users (id, name, email, role, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE 
          SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP
        `, [u.id, u.name, u.email, u.role]);
        stats.databases.order = true;
      } catch (err: any) {
        // Table may still be provisioning
      }
    }

    stats.syncedUsers = authUsers.rows.length;
  } catch (err: any) {
    stats.databases.auth = false;
    throw new Error(`User sync error: ${err.message}`);
  }
}

/**
 * 2. Synchronize Products & Inventory: Search DB -> Cart DB & Order DB
 */
async function syncProducts() {
  try {
    const searchProducts = await searchPool.query('SELECT id, name, description, price, category, stock, rating FROM products');
    stats.databases.search = true;

    for (const p of searchProducts.rows) {
      // Sync to Cart DB
      try {
        await cartPool.query(`
          INSERT INTO synced_products (id, name, price, stock, category, updated_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE 
          SET name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock, category = EXCLUDED.category, updated_at = CURRENT_TIMESTAMP
        `, [p.id, p.name, p.price, p.stock, p.category]);
        stats.databases.cart = true;
      } catch (err: any) {}

      // Sync to Order DB
      try {
        await orderPool.query(`
          INSERT INTO synced_products (id, name, price, stock, category, updated_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE 
          SET name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock, category = EXCLUDED.category, updated_at = CURRENT_TIMESTAMP
        `, [p.id, p.name, p.price, p.stock, p.category]);
        stats.databases.order = true;
      } catch (err: any) {}
    }

    stats.syncedProducts = searchProducts.rows.length;
  } catch (err: any) {
    stats.databases.search = false;
    throw new Error(`Product sync error: ${err.message}`);
  }
}

/**
 * 3. Synchronize Stock Events: Order DB -> Search DB
 * When orders deduct stock on Order DB, reconcile and update Search DB stock
 */
async function syncStockEvents() {
  try {
    const pendingEvents = await orderPool.query(`
      SELECT id, product_id, quantity_deducted 
      FROM stock_events 
      WHERE synced = false 
      LIMIT 100
    `);

    let count = 0;
    for (const event of pendingEvents.rows) {
      try {
        await searchPool.query(`
          UPDATE products 
          SET stock = GREATEST(stock - $1, 0)
          WHERE id = $2
        `, [event.quantity_deducted, event.product_id]);

        await orderPool.query(`
          UPDATE stock_events 
          SET synced = true, synced_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [event.id]);
        count++;
      } catch (err: any) {}
    }

    stats.syncedStockEvents += count;
  } catch (err: any) {
    // If table doesn't exist yet, non-critical
  }
}

/**
 * 4. Synchronize Orders: Order DB -> Auth DB & Cart Cleanup on Cart DB
 */
async function syncOrdersAndPurgeCarts() {
  try {
    const recentOrders = await orderPool.query(`
      SELECT id, user_id, customer_name, email, total, status, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 50
    `);

    for (const o of recentOrders.rows) {
      // Sync order summary to Auth DB
      try {
        await authPool.query(`
          INSERT INTO synced_order_summaries (order_id, user_id, customer_name, total, status, created_at, synced_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          ON CONFLICT (order_id) DO UPDATE 
          SET status = EXCLUDED.status, synced_at = CURRENT_TIMESTAMP
        `, [o.id, o.user_id, o.customer_name, o.total, o.status, o.created_at]);
      } catch (err: any) {}

      // Clean up cart on Cart DB for this user if active
      if (o.user_id && o.user_id !== 'guest') {
        try {
          await cartPool.query('DELETE FROM cart_items WHERE user_id = $1', [o.user_id]);
        } catch (err: any) {}
      }
    }

    stats.syncedOrders = recentOrders.rows.length;
  } catch (err: any) {}
}

/**
 * Execute a complete full sync cycle across all 4 databases
 */
export async function executeSyncCycle(): Promise<SyncStats> {
  try {
    await syncUsers();
    await syncProducts();
    await syncStockEvents();
    await syncOrdersAndPurgeCarts();

    stats.lastSyncTime = new Date().toISOString();
    stats.totalCycles += 1;
    stats.lastError = null;

    // Record heartbeat in each database's sync_metadata table
    const heartbeatQuery = `
      INSERT INTO sync_metadata (key, value, updated_at)
      VALUES ('last_sync', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `;
    const nowIso = stats.lastSyncTime;
    await Promise.allSettled([
      authPool.query(heartbeatQuery, [nowIso]),
      searchPool.query(heartbeatQuery, [nowIso]),
      cartPool.query(heartbeatQuery, [nowIso]),
      orderPool.query(heartbeatQuery, [nowIso]),
    ]);

  } catch (err: any) {
    stats.lastError = err.message;
    console.error('[DB Sync Engine Error]:', err.message);
  }

  return stats;
}

// Start recurring synchronization worker loop
let syncTimer: NodeJS.Timeout | null = null;
export function startSyncDaemon(intervalMs = SYNC_INTERVAL_MS) {
  console.log(`[DB Sync Engine] Starting cross-database synchronization loop (interval: ${intervalMs}ms)...`);
  executeSyncCycle();
  syncTimer = setInterval(executeSyncCycle, intervalMs);
}

// Lightweight HTTP server for monitoring and triggering sync via API Gateway
function sendJson(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://localhost:${PORT}`);

  if (req.method === 'GET' && (url.pathname === '/status' || url.pathname === '/' || url.pathname === '/health')) {
    return sendJson(res, {
      service: 'db-sync-engine',
      status: stats.lastError ? 'degraded' : 'healthy',
      metrics: stats
    });
  }

  if (req.method === 'POST' && (url.pathname === '/trigger' || url.pathname === '/sync-now')) {
    const updatedStats = await executeSyncCycle();
    return sendJson(res, {
      success: true,
      message: 'Cross-database synchronization executed successfully across 4 mini databases.',
      metrics: updatedStats
    });
  }

  sendJson(res, { error: 'Not Found' }, 404);
});

export function startServer(port = PORT) {
  startSyncDaemon();
  server.listen(port, () => {
    console.log(`[DB Sync Engine] Listening on port ${port}`);
  });
  return server;
}

if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
