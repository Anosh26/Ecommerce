import * as http from 'http';
import { Pool } from 'pg';
import * as crypto from 'crypto';

const PORT = 3005;
const DB_URL = process.env.PAYMENT_DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol_payment';

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
    // POST /charge
    if (req.method === 'POST' && url.pathname === '/charge') {
      const { orderId, amount } = await getJsonBody(req);
      if (!orderId || amount === undefined) {
        return sendJson(res, { error: 'Missing orderId or amount' }, 400);
      }

      // Simulate a payment processor charge
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

    // Default 404
    sendJson(res, { error: 'Not Found' }, 404);
  } catch (err: any) {
    console.error('Payment Service error:', err);
    sendJson(res, { error: 'Internal Server Error', details: err.message }, 500);
  }
});

export function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`Payment Service listening on port ${port}`);
  });
  return server;
}

// Start if executed directly
if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
