import * as http from 'http';
import { Pool } from 'pg';
import * as crypto from 'crypto';

const PORT = 3001;
const DB_URL = process.env.AUTH_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paaptol_auth';

const pool = new Pool({ connectionString: DB_URL });

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate simple mock token: base64 encoded user info + simple signature
function generateToken(user: { id: string; name: string; email: string; role?: string }): string {
  const payload = JSON.stringify(user);
  const signature = crypto.createHmac('sha256', 'sunny-secret-key').update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

function verifyToken(token: string): { id: string; name: string; email: string; role?: string } | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const { payload, signature } = JSON.parse(raw);
    const expectedSignature = crypto.createHmac('sha256', 'sunny-secret-key').update(payload).digest('hex');
    
    if (signature === expectedSignature) {
      return JSON.parse(payload);
    }
  } catch (e) {
    // Invalid token format
  }
  return null;
}

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

const failures = {
  offline: false,
  latency: 0
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

  // 1. Handle Simulated Failure Controls
  if (req.method === 'GET' && url.pathname === '/failures') {
    return sendJson(res, failures);
  }
  if (req.method === 'POST' && url.pathname === '/configure-failures') {
    try {
      const body = await getJsonBody(req);
      if (body.offline !== undefined) failures.offline = !!body.offline;
      if (body.latency !== undefined) failures.latency = parseInt(body.latency) || 0;
      console.log('[Auth Service] Failures configured:', failures);
      return sendJson(res, { success: true, failures });
    } catch (err: any) {
      return sendJson(res, { error: 'Invalid failure config body', details: err.message }, 400);
    }
  }

  // 2. Intercept requests for simulated failures
  if (failures.offline && (url.pathname === '/login' || url.pathname === '/register' || url.pathname === '/verify')) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Auth Service Offline (Simulated Tech Issue)' }));
    return;
  }

  if (failures.latency > 0 && (url.pathname === '/login' || url.pathname === '/register' || url.pathname === '/verify')) {
    await new Promise(resolve => setTimeout(resolve, failures.latency));
  }

  try {
    if (req.method === 'POST' && url.pathname === '/register') {
      const { name, email, password, role } = await getJsonBody(req);
      
      if (!name || !email || !password) {
        return sendJson(res, { error: 'Missing name, email, or password' }, 400);
      }

      // Check if user already exists
      const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        return sendJson(res, { error: 'User with this email already exists' }, 400);
      }

      const id = `usr-${crypto.randomBytes(4).toString('hex')}`;
      const passwordHash = hashPassword(password);
      const userRole = role || 'user';

      await pool.query(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
        [id, name, email, passwordHash, userRole]
      );

      const userPayload = { id, name, email, role: userRole };
      const token = generateToken(userPayload);

      return sendJson(res, { success: true, user: userPayload, token }, 201);
    } 
    
    else if (req.method === 'POST' && url.pathname === '/login') {
      const { email, password } = await getJsonBody(req);

      if (!email || !password) {
        return sendJson(res, { error: 'Missing email or password' }, 400);
      }

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return sendJson(res, { error: 'Invalid email or password' }, 400);
      }

      const user = result.rows[0];
      const passwordHash = hashPassword(password);

      if (user.password_hash !== passwordHash) {
        return sendJson(res, { error: 'Invalid email or password' }, 400);
      }

      const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role };
      const token = generateToken(userPayload);

      return sendJson(res, { success: true, user: userPayload, token });
    } 
    
    else if (req.method === 'POST' && url.pathname === '/verify') {
      const { token } = await getJsonBody(req);
      if (!token) {
        return sendJson(res, { error: 'Missing token' }, 400);
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return sendJson(res, { valid: false, error: 'Invalid token' }, 401);
      }

      return sendJson(res, { valid: true, user: decoded });
    } 
    
    else {
      sendJson(res, { error: 'Not Found' }, 404);
    }
  } catch (err: any) {
    console.error('Auth Service error:', err);
    sendJson(res, { error: 'Internal Server Error', details: err.message }, 500);
  }
});

export function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`Auth Service listening on port ${port}`);
  });
  return server;
}

// Start if executed directly
if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
