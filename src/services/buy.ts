import * as http from 'http';
import { Pool } from 'pg';
import * as crypto from 'crypto';

const PORT = 3004;
const DB_URL = process.env.BUY_DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_buy';

const pool = new Pool({ connectionString: DB_URL });

// Port config for other services
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3002';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';

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

  try {
    // POST /checkout
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

      // 1. Fetch product prices and metadata from Search Service
      try {
        for (const item of items) {
          const productRes = await fetch(`${SEARCH_SERVICE_URL}/products/${item.productId}`);
          if (!productRes.ok) {
            throw new Error(`Product with ID ${item.productId} not found in catalog.`);
          }
          const product = await productRes.json();
          
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} left.`);
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

      // 2. Deduct stock from Search Service
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

      // Rollback stock if deduction failed
      if (!stockSuccess) {
        for (const dp of deductedProducts) {
          await fetch(`${SEARCH_SERVICE_URL}/products/deduct-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: dp.productId, quantity: -dp.quantity }) // Pass negative quantity to restore
          });
        }
        return sendJson(res, { error: `Stock validation failed: ${stockError}` }, 400);
      }

      // 3. Process Charge via Payment Gateway Service
      let paymentSuccess = false;
      let paymentDetails: any = null;

      try {
        const paymentRes = await fetch(`${PAYMENT_SERVICE_URL}/charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, amount: total })
        });
        
        const paymentData = await paymentRes.json();
        if (paymentRes.ok && paymentData.success) {
          paymentSuccess = true;
          paymentDetails = paymentData;
        }
      } catch (err) {
        console.error('Payment connection error:', err);
      }

      // Rollback stock if payment failed
      if (!paymentSuccess) {
        for (const dp of deductedProducts) {
          await fetch(`${SEARCH_SERVICE_URL}/products/deduct-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: dp.productId, quantity: -dp.quantity })
          });
        }
        return sendJson(res, { error: 'Payment processing failed. Please verify payment options and try again.' }, 400);
      }

      // 4. Save order to Buy DB
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

        for (const item of resolvedItems) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, name, quantity, price)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, item.productId, item.name, item.quantity, item.price]
          );
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
        
        // Rollback stock in Search Service as final fallback
        for (const dp of deductedProducts) {
          await fetch(`${SEARCH_SERVICE_URL}/products/deduct-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: dp.productId, quantity: -dp.quantity })
          });
        }

        return sendJson(res, { error: `Order writing failed: ${err.message}` }, 500);
      } finally {
        client.release();
      }
    }

    // Default 404
    sendJson(res, { error: 'Not Found' }, 404);
  } catch (err: any) {
    console.error('Buy Service error:', err);
    sendJson(res, { error: 'Internal Server Error', details: err.message }, 500);
  }
});

export function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`Buy Service listening on port ${port}`);
  });
  return server;
}

// Start if executed directly
if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
