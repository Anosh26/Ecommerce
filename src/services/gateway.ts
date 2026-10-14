import * as http from 'http';

const PORT = 5000;

// Internal routing table mapping public API prefixes to the 4 internal microservices
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || process.env.BUY_SERVICE_URL || 'http://localhost:3004';

const ROUTING_TABLE: Record<string, string> = {
  '/api/auth': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  '/api/search': process.env.SEARCH_SERVICE_URL || 'http://localhost:3002',
  '/api/cart': process.env.CART_SERVICE_URL || 'http://localhost:3003',
  '/api/buy': ORDER_SERVICE_URL,
  '/api/payment': ORDER_SERVICE_URL,
  '/api/order': ORDER_SERVICE_URL,
  '/api/sync': process.env.SYNC_SERVICE_URL || 'http://localhost:3006',
};

function getRawBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function sendJson(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  
  // Health check for Cloud Load Balancer / External Monitoring
  if (url.pathname === '/health' || url.pathname === '/') {
    return sendJson(res, {
      status: 'healthy',
      service: 'api-gateway',
      microservices: {
        auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3002',
        cart: process.env.CART_SERVICE_URL || 'http://localhost:3003',
        order: ORDER_SERVICE_URL,
        sync: process.env.SYNC_SERVICE_URL || 'http://localhost:3006'
      }
    });
  }

  // Find matching route prefix
  let routePrefix = '';
  for (const prefix in ROUTING_TABLE) {
    if (url.pathname.startsWith(prefix)) {
      routePrefix = prefix;
      break;
    }
  }

  if (!routePrefix) {
    return sendJson(res, { error: `Gateway Routing Error: No service registered for path ${url.pathname}` }, 404);
  }

  const targetServiceUrl = ROUTING_TABLE[routePrefix];
  // Sub-path under the target service: e.g., /api/auth/login becomes /login
  const remainingPath = url.pathname.slice(routePrefix.length) || '/';
  const targetUrl = `${targetServiceUrl}${remainingPath}${url.search}`;

  console.log(`[Gateway Proxy]: ${req.method} ${url.pathname} -> ${targetUrl}`);

  try {
    const rawBody = req.method !== 'GET' && req.method !== 'HEAD' ? await getRawBody(req) : undefined;
    
    // Copy incoming headers but remove host, connection, and expect headers to avoid conflict
    const headers: Record<string, string> = {};
    for (const key in req.headers) {
      if (key !== 'host' && key !== 'connection' && key !== 'expect' && typeof req.headers[key] === 'string') {
        headers[key] = req.headers[key] as string;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: rawBody ? new Uint8Array(rawBody) : undefined
    });

    const responseBody = await response.arrayBuffer();

    // Forward headers from target service
    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    response.headers.forEach((val, key) => {
      if (key !== 'transfer-encoding' && key !== 'content-encoding') {
        responseHeaders[key] = val;
      }
    });

    res.writeHead(response.status, responseHeaders);
    res.end(Buffer.from(responseBody));
  } catch (err: any) {
    console.error(`[Gateway Proxy Error] for path ${url.pathname}:`, err);
    sendJson(res, { error: 'API Gateway connection failed', details: err.message }, 502);
  }
});

export function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`API Gateway Service listening on port ${port}`);
  });
  return server;
}

// Start if executed directly
if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
