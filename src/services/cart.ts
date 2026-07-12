import * as http from 'http';
import { Pool } from 'pg';

const PORT = 3003;
const DB_URL = process.env.CART_DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_cart';

const pool = new Pool({ connectionString: DB_URL });

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
    // GET /cart?userId=...
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/cart')) {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return sendJson(res, { error: 'Missing userId parameter' }, 400);
      }

      const result = await pool.query(
        'SELECT product_id as id, name, price, quantity, stock FROM cart_items WHERE user_id = $1 ORDER BY id ASC',
        [userId]
      );

      const mapped = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        quantity: parseInt(row.quantity),
        stock: parseInt(row.stock)
      }));

      return sendJson(res, mapped);
    }

    // POST /cart/add
    else if (req.method === 'POST' && (url.pathname === '/add' || url.pathname === '/cart/add')) {
      const { userId, productId, name, price, quantity, stock } = await getJsonBody(req);
      if (!userId || !productId || !name || price === undefined || quantity === undefined || stock === undefined) {
        return sendJson(res, { error: 'Missing required cart item fields' }, 400);
      }

      // Upsert cart item
      await pool.query(`
        INSERT INTO cart_items (user_id, product_id, name, price, quantity, stock)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET quantity = LEAST(cart_items.quantity + $5, cart_items.stock)
      `, [userId, productId, name, price, quantity, stock]);

      return sendJson(res, { success: true });
    }

    // POST /cart/update
    else if (req.method === 'POST' && (url.pathname === '/update' || url.pathname === '/cart/update')) {
      const { userId, productId, quantity } = await getJsonBody(req);
      if (!userId || !productId || quantity === undefined) {
        return sendJson(res, { error: 'Missing userId, productId, or quantity' }, 400);
      }

      if (quantity <= 0) {
        await pool.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      } else {
        await pool.query(`
          UPDATE cart_items 
          SET quantity = LEAST($3, stock) 
          WHERE user_id = $1 AND product_id = $2
        `, [userId, productId, quantity]);
      }

      return sendJson(res, { success: true });
    }

    // POST /cart/remove
    else if (req.method === 'POST' && (url.pathname === '/remove' || url.pathname === '/cart/remove')) {
      const { userId, productId } = await getJsonBody(req);
      if (!userId || !productId) {
        return sendJson(res, { error: 'Missing userId or productId' }, 400);
      }

      await pool.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      return sendJson(res, { success: true });
    }

    // POST /cart/clear
    else if (req.method === 'POST' && (url.pathname === '/clear' || url.pathname === '/cart/clear')) {
      const { userId } = await getJsonBody(req);
      if (!userId) {
        return sendJson(res, { error: 'Missing userId' }, 400);
      }

      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
      return sendJson(res, { success: true });
    }

    // Default 404
    sendJson(res, { error: 'Not Found' }, 404);
  } catch (err: any) {
    console.error('Cart Service error:', err);
    sendJson(res, { error: 'Internal Server Error', details: err.message }, 500);
  }
});

export function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`Cart Service listening on port ${port}`);
  });
  return server;
}

// Start if executed directly
if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
