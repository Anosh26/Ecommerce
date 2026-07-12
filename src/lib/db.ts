import { Pool } from 'pg';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  rating: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  customerName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  status: string;
  createdAt: string;
  estimatedDelivery: string;
}

// Create a single global connection pool for the Postgres database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paaptol',
});

// Helper to convert database rows to Product interfaces
function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    category: row.category,
    image: row.image,
    stock: parseInt(row.stock),
    rating: parseFloat(row.rating),
  };
}

// Get all products from PostgreSQL database
export async function getProducts(): Promise<Product[]> {
  const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
  return result.rows.map(mapRowToProduct);
}

// Get a single product by ID
export async function getProductById(id: string): Promise<Product | undefined> {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (result.rows.length === 0) return undefined;
  return mapRowToProduct(result.rows[0]);
}

// Place a new order inside our Postgres DB using an ACID transaction block
export async function createOrder(orderData: {
  items: { productId: string; quantity: number }[];
  customerName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
}): Promise<Order> {
  const client = await pool.connect();
  
  try {
    // Start SQL transaction block
    await client.query('BEGIN');

    const orderItems: OrderItem[] = [];
    let total = 0;

    // 1. Process items, lock rows, validate stock, and calculate subtotal
    for (const item of orderData.items) {
      // Row-level lock "FOR UPDATE" to ensure safety under concurrent checkouts
      const productRes = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );

      if (productRes.rows.length === 0) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      const product = productRes.rows[0];
      const currentStock = parseInt(product.stock);
      const price = parseFloat(product.price);

      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${currentStock} left.`);
      }

      // Deduct stock in DB
      const newStock = currentStock - item.quantity;
      await client.query(
        'UPDATE products SET stock = $1 WHERE id = $2',
        [newStock, item.productId]
      );

      total += price * item.quantity;

      orderItems.push({
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        price,
      });
    }

    // 2. Create order headers
    const orderId = `ord-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const deliveryDays = Math.floor(Math.random() * 4) + 2; 
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + deliveryDays);

    const estimatedDelivery = estimatedDeliveryDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const status = 'processing';
    const createdAt = new Date().toISOString();

    // Insert order into orders table
    await client.query(
      `INSERT INTO orders (id, customer_name, email, address, city, postal_code, total, status, estimated_delivery)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        orderId,
        orderData.customerName,
        orderData.email,
        orderData.address,
        orderData.city,
        orderData.postalCode,
        total,
        status,
        estimatedDelivery
      ]
    );

    // Insert order line items into order_items table
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.productId, item.name, item.quantity, item.price]
      );
    }

    // Commit Transaction
    await client.query('COMMIT');

    const newOrder: Order = {
      id: orderId,
      items: orderItems,
      total: parseFloat(total.toFixed(2)),
      customerName: orderData.customerName,
      email: orderData.email,
      address: orderData.address,
      city: orderData.city,
      postalCode: orderData.postalCode,
      status,
      createdAt,
      estimatedDelivery,
    };

    return newOrder;
  } catch (error) {
    // Rollback changes on failure
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}
