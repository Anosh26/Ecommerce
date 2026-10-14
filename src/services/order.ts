import * as http from 'http';
import { Pool } from 'pg';
import * as crypto from 'crypto';

const PORT = 3004;
const DB_URL = process.env.ORDER_DATABASE_URL || 
               process.env.BUY_DATABASE_URL || 
               'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_order';

const pool = new Pool({ connectionString: DB_URL });

// Inter-service discovery URLs (VPC private DNS/IPs in GCP)
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3002';

function getJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function sendJson(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Payment simulation & chaos engineering failure controls
const failures = {
  offline: false,
  latency: 0,
  fail_charge: false
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
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

  // 1. Health check
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
    return sendJson(res, { status: 'healthy', service: 'order-and-payment-service', port: PORT });
  }

  // 2. Simulated Failure Controls (for Admin Dashboard Chaos Testing)
  if (req.method === 'GET' && url.pathname === '/failures') {
    return sendJson(res, failures);
  }
  if (req.method === 'POST' && url.pathname === '/configure-failures') {
    try {
      const body = await getJsonBody(req);
      if (body.offline !== undefined) failures.offline = !!body.offline;
      if (body.latency !== undefined) failures.latency = parseInt(body.latency) || 0;
      if (body.fail_charge !== undefined) failures.fail_charge = !!body.fail_charge;
      console.log('[Order Service] Failures configured:', failures);
      return sendJson(res, { success: true, failures });
    } catch (err: any) {
      return sendJson(res, { error: 'Invalid failure config body', details: err.message }, 400);
    }
  }

  // Intercept requests for simulated failure testing
  if (failures.offline && (url.pathname === '/checkout' || url.pathname === '/charge')) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Order/Payment Service Offline (Simulated Loss of Connectivity)' }));
    return;
  }

  if (failures.latency > 0 && (url.pathname === '/checkout' || url.pathname === '/charge')) {
    await new Promise(resolve => setTimeout(resolve, failures.latency));
  }

  if (failures.fail_charge && (url.pathname === '/checkout' || url.pathname === '/charge')) {
    res.writeHead(402, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: 'Payment Gateway Decline (Simulated Transaction Failure)' }));
    return;
  }

  try {
    // 3. POST /charge (Internal or backward-compatible payment endpoint)
    if (req.method === 'POST' && url.pathname === '/charge') {
      const { orderId, amount } = await getJsonBody(req);
      if (!orderId || amount === undefined) {
        return sendJson(res, { error: 'Missing orderId or amount' }, 400);
      }

      const paymentId = `pay-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const transactionRef = `tx-${crypto.randomBytes(8).toString('hex')}`;
      const status = 'success';

      await pool.query(
        'INSERT INTO payments (id, order_id, amount, status, transaction_ref) VALUES ($1, $2, $3, $4, $5)',
        [paymentId, orderId, amount, status, transactionRef]
      );

      return sendJson(res, {
        success: true,
        paymentId,
        transactionRef,
        status,
        amount
      });
    }

    // 4. POST /checkout (Consolidated Order Creation + Stock Validation + Payment Charging)
    if (req.method === 'POST' && url.pathname === '/checkout') {
      const body = await getJsonBody(req);
      const { userId, items, customerName, email, address, city, postalCode } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendJson(res, { error: 'Order must contain at least one item.' }, 400);
      }
      if (!customerName || !email || !address || !city || !postalCode) {
        return sendJson(res, { error: 'All shipping information fields are required.' }, 400);
      }

      const activeUserId = userId || 'guest';
      const orderId = `ord-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      const resolvedItems: any[] = [];
      let total = 0;

      // Check stock and price (first try local synced_products DB, fallback to Search service)
      try {
        for (const item of items) {
          let product: any = null;

          // Check if local synced_products table exists in paaptol_order
          try {
            const localCheck = await pool.query(
              'SELECT id, name, price, stock FROM synced_products WHERE id = $1',
              [item.productId]
            );
            if (localCheck.rows.length > 0) {
              const row = localCheck.rows[0];
              product = {
                id: row.id,
                name: row.name,
                price: parseFloat(row.price),
                stock: parseInt(row.stock)
              };
            }
          } catch (e) {
            // synced_products table not ready yet, continue to remote fetch
          }

          if (!product) {
            const productRes = await fetch(`${SEARCH_SERVICE_URL}/products/${item.productId}`);
            if (!productRes.ok) {
              throw new Error(`Product with ID ${item.productId} not found in catalog.`);
            }
            product = await productRes.json();
          }
          
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} available.`);
          }

          total += product.price * item.quantity;
          resolvedItems.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: item.quantity
          });
        }
      } catch (err: any) {
        return sendJson(res, { error: err.message }, 400);
      }

      // Deduct stock from Search Service
      const deductedProducts: { productId: string; quantity: number }[] = [];
      let stockSuccess = true;
      let stockError = '';

      for (const item of resolvedItems) {
        try {
          const deductRes = await fetch(`${SEARCH_SERVICE_URL}/products/deduct-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity })
          });
          
          const deductData = await deductRes.json();
          if (!deductRes.ok) {
            throw new Error(deductData.error || 'Failed to deduct stock');
          }
          
          deductedProducts.push({ productId: item.productId, quantity: item.quantity });
        } catch (err: any) {
          stockSuccess = false;
          stockError = err.message;
          break;
        }
      }

      // Rollback stock if deduction failed midway
      if (!stockSuccess) {
        for (const dp of deductedProducts) {
          await fetch(`${SEARCH_SERVICE_URL}/products/deduct-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: dp.productId, quantity: -dp.quantity })
          }).catch(() => {});
        }
        return sendJson(res, { error: `Stock deduction failed: ${stockError}` }, 400);
      }

      // Process Built-in Payment Transaction
      const paymentId = `pay-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const transactionRef = `tx-${crypto.randomBytes(8).toString('hex')}`;
      const paymentDetails = {
        success: true,
        paymentId,
        transactionRef,
        status: 'success',
        amount: parseFloat(total.toFixed(2))
      };

      // Persist Order, Order Items, and Payment in Order DB transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const deliveryDays = Math.floor(Math.random() * 4) + 2; 
        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + deliveryDays);
        const estimatedDelivery = estimatedDeliveryDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // 1. Insert order
        await client.query(
          `INSERT INTO orders (id, user_id, customer_name, email, address, city, postal_code, total, status, estimated_delivery)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            orderId,
            activeUserId,
            customerName,
            email,
            address,
            city,
            postalCode,
            total,
            'paid',
            estimatedDelivery
          ]
        );

        // 2. Insert order items
        for (const item of resolvedItems) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, name, quantity, price)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, item.productId, item.name, item.quantity, item.price]
          );
        }

        // 3. Insert payment record into payments table
        await client.query(
          `INSERT INTO payments (id, order_id, amount, status, transaction_ref)
           VALUES ($1, $2, $3, $4, $5)`,
          [paymentId, orderId, total, 'success', transactionRef]
        );

        // 4. Record stock events for DB-Sync queue
        try {
          for (const item of resolvedItems) {
            await client.query(
              `INSERT INTO stock_events (order_id, product_id, quantity_deducted, synced)
               VALUES ($1, $2, $3, false)
               ON CONFLICT DO NOTHING`,
              [orderId, item.productId, item.quantity]
            );
          }
        } catch (e) {
          // Non-blocking if table is being created
        }

        await client.query('COMMIT');

        const newOrder = {
          id: orderId,
          userId: activeUserId,
          items: resolvedItems,
          total: parseFloat(total.toFixed(2)),
          customerName,
          email,
          address,
          city,
          postalCode,
          status: 'paid',
          estimatedDelivery,
          payment: paymentDetails
        };

        return sendJson(res, { success: true, order: newOrder });
      } catch (err: any) {
        await client.query('ROLLBACK');
        
        // Rollback stock in Search Service as recovery
        for (const dp of deductedProducts) {
          await fetch(`${SEARCH_SERVICE_URL}/products/deduct-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: dp.productId, quantity: -dp.quantity })
          }).catch(() => {});
        }

        return sendJson(res, { error: `Order writing failed: ${err.message}` }, 500);
      } finally {
        client.release();
      }
    }

    // 5. GET /orders
    if (req.method === 'GET' && url.pathname === '/orders') {
      const userId = url.searchParams.get('userId');
      let query = 'SELECT * FROM orders ORDER BY created_at DESC';
      const params: any[] = [];
      if (userId) {
        query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
        params.push(userId);
      }
      const result = await pool.query(query, params);
      return sendJson(res, result.rows);
    }

    // Default 404
    sendJson(res, { error: 'Not Found' }, 404);
  } catch (err: any) {
    console.error('Order Service error:', err);
    sendJson(res, { error: 'Internal Server Error', details: err.message }, 500);
  }
});

export function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`Order & Payment Service listening on port ${port}`);
  });
  return server;
}

if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
