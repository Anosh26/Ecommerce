import * as http from 'http';
import { Pool } from 'pg';

const PORT = 3002;
const DB_URL = process.env.SEARCH_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paaptol_search';

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
    // GET /products
    if (req.method === 'GET' && url.pathname === '/products') {
      const category = url.searchParams.get('category') || undefined;
      const query = url.searchParams.get('query') || undefined;
      const minPrice = url.searchParams.get('minPrice') ? parseFloat(url.searchParams.get('minPrice')!) : undefined;
      const maxPrice = url.searchParams.get('maxPrice') ? parseFloat(url.searchParams.get('maxPrice')!) : undefined;
      const sortBy = url.searchParams.get('sortBy') || 'default';

      let sql = 'SELECT * FROM products WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (category && category !== 'All') {
        sql += ` AND LOWER(category) = LOWER($${paramCount})`;
        params.push(category);
        paramCount++;
      }

      if (query && query.trim() !== '') {
        const cleanQuery = `%${query.trim().toLowerCase()}%`;
        sql += ` AND (LOWER(name) LIKE $${paramCount} OR LOWER(description) LIKE $${paramCount} OR LOWER(category) LIKE $${paramCount})`;
        params.push(cleanQuery);
        paramCount++;
      }

      if (minPrice !== undefined && !isNaN(minPrice)) {
        sql += ` AND price >= $${paramCount}`;
        params.push(minPrice);
        paramCount++;
      }

      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        sql += ` AND price <= $${paramCount}`;
        params.push(maxPrice);
        paramCount++;
      }

      if (sortBy === 'price_asc') {
        sql += ' ORDER BY price ASC';
      } else if (sortBy === 'price_desc') {
        sql += ' ORDER BY price DESC';
      } else if (sortBy === 'rating') {
        sql += ' ORDER BY rating DESC';
      } else {
        sql += ' ORDER BY id ASC';
      }

      const result = await pool.query(sql, params);
      const mapped = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        category: row.category,
        image: row.image,
        stock: parseInt(row.stock),
        rating: parseFloat(row.rating),
      }));

      return sendJson(res, mapped);
    } 
    
    // GET /products/:id (expressed as matching a sub-route)
    else if (req.method === 'GET' && url.pathname.startsWith('/products/')) {
      const id = url.pathname.split('/')[2];
      if (!id || id === 'deduct-stock' || id === 'check-stock') {
        // Fall through to other handlers
      } else {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          return sendJson(res, { error: 'Product not found' }, 404);
        }
        
        const row = result.rows[0];
        return sendJson(res, {
          id: row.id,
          name: row.name,
          description: row.description,
          price: parseFloat(row.price),
          category: row.category,
          image: row.image,
          stock: parseInt(row.stock),
          rating: parseFloat(row.rating),
        });
      }
    }

    // GET /categories
    if (req.method === 'GET' && url.pathname === '/categories') {
      const result = await pool.query('SELECT DISTINCT category FROM products');
      const cats = result.rows.map(r => r.category);
      return sendJson(res, ['All', ...cats]);
    }

    // POST /products/check-stock
    if (req.method === 'POST' && url.pathname === '/products/check-stock') {
      const { productId, quantity } = await getJsonBody(req);
      if (!productId || quantity === undefined) {
        return sendJson(res, { error: 'Missing productId or quantity' }, 400);
      }

      const result = await pool.query('SELECT name, stock FROM products WHERE id = $1', [productId]);
      if (result.rows.length === 0) {
        return sendJson(res, { error: 'Product not found' }, 404);
      }

      const product = result.rows[0];
      const stock = parseInt(product.stock);
      
      return sendJson(res, {
        productId,
        name: product.name,
        available: stock >= quantity,
        stock
      });
    }

    // POST /products/deduct-stock
    if (req.method === 'POST' && url.pathname === '/products/deduct-stock') {
      const { productId, quantity } = await getJsonBody(req);
      if (!productId || quantity === undefined) {
        return sendJson(res, { error: 'Missing productId or quantity' }, 400);
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const result = await client.query('SELECT name, stock FROM products WHERE id = $1 FOR UPDATE', [productId]);
        if (result.rows.length === 0) {
          throw new Error('Product not found');
        }

        const product = result.rows[0];
        const currentStock = parseInt(product.stock);

        if (currentStock < quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Only ${currentStock} left.`);
        }

        const newStock = currentStock - quantity;
        await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, productId]);
        await client.query('COMMIT');

        return sendJson(res, { success: true, productId, newStock });
      } catch (err: any) {
        await client.query('ROLLBACK');
        return sendJson(res, { error: err.message }, 400);
      } finally {
        client.release();
      }
    }

    // Default 404
    sendJson(res, { error: 'Not Found' }, 404);
  } catch (err: any) {
    console.error('Search Service error:', err);
    sendJson(res, { error: 'Internal Server Error', details: err.message }, 500);
  }
});

export function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`Search Service listening on port ${port}`);
  });
  return server;
}

// Start if executed directly
if (require.main === module || process.env.START_STANDALONE === 'true') {
  startServer();
}
