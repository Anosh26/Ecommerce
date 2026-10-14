import { Client } from 'pg';
import * as crypto from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol';

const databases = [
  { name: 'paaptol_auth', setup: setupAuthDb },
  { name: 'paaptol_search', setup: setupSearchDb },
  { name: 'paaptol_cart', setup: setupCartDb },
  { name: 'paaptol_order', setup: setupOrderDb },
];

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Starting PostgreSQL setup for Paaptol 4-Microservices Architecture...');

  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.error('Error: DATABASE_URL format is invalid. Expected: postgresql://user:password@host:port/database');
    process.exit(1);
  }

  const [_, user, password, host, port, _defaultDb] = match;
  const decodedUser = decodeURIComponent(user);
  const decodedPassword = decodeURIComponent(password);

  // Connect to default 'postgres' database to ensure our 4 databases exist in single-cluster mode
  if (!process.env.AUTH_DATABASE_URL) {
    const defaultClient = new Client({
      user: decodedUser,
      password: decodedPassword,
      host,
      port: parseInt(port),
      database: 'postgres'
    });

    try {
      await defaultClient.connect();
      
      for (const db of databases) {
        const dbCheck = await defaultClient.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [db.name]
        );

        if (dbCheck.rowCount === 0) {
          console.log(`Database '${db.name}' does not exist. Creating...`);
          await defaultClient.query(`CREATE DATABASE ${db.name}`);
          console.log(`Database '${db.name}' created successfully.`);
        } else {
          console.log(`Database '${db.name}' already exists.`);
        }
      }
    } catch (err) {
      console.error('Notice: Direct connection to targets assumed...', err);
    } finally {
      try {
        await defaultClient.end();
      } catch {}
    }
  }

  // Setup each database schema and synchronization tables
  for (const db of databases) {
    let dbConnectionString = '';
    if (db.name === 'paaptol_auth') dbConnectionString = process.env.AUTH_DATABASE_URL || '';
    else if (db.name === 'paaptol_search') dbConnectionString = process.env.SEARCH_DATABASE_URL || '';
    else if (db.name === 'paaptol_cart') dbConnectionString = process.env.CART_DATABASE_URL || '';
    else if (db.name === 'paaptol_order') {
      dbConnectionString = process.env.ORDER_DATABASE_URL || process.env.BUY_DATABASE_URL || '';
    }

    if (!dbConnectionString) {
      dbConnectionString = `postgresql://${user}:${password}@${host}:${port}/${db.name}`;
    }

    const client = new Client({ connectionString: dbConnectionString });
    
    try {
      await client.connect();
      console.log(`--- Setting up mini-database '${db.name}' ---`);
      await db.setup(client);
      console.log(`Mini-database '${db.name}' set up successfully.`);
    } catch (err) {
      console.error(`Fatal error setting up database '${db.name}':`, err);
      process.exit(1);
    } finally {
      await client.end();
    }
  }

  console.log('All 4 Paaptol microservice databases & sync tables initialized successfully!');
}

async function setupAuthDb(client: Client) {
  // Users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS synced_order_summaries (
      order_id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NOT NULL,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default user
  const defaultUserCheck = await client.query('SELECT 1 FROM users WHERE email = $1', ['user@sunny.com']);
  if (defaultUserCheck.rowCount === 0) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
      ['user-1', 'Sunny Explorer', 'user@sunny.com', hashPassword('sunny123'), 'user']
    );
    console.log(`Auth DB seeded user: user@sunny.com / sunny123`);
  }

  // Seed default admin
  const defaultAdminCheck = await client.query('SELECT 1 FROM users WHERE email = $1', ['admin@sunny.com']);
  if (defaultAdminCheck.rowCount === 0) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
      ['admin-1', 'Sunny Admin', 'admin@sunny.com', hashPassword('admin123'), 'admin']
    );
    console.log(`Auth DB seeded admin: admin@sunny.com / admin123`);
  }
}

async function setupSearchDb(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      image VARCHAR(255) NOT NULL,
      stock INT NOT NULL,
      rating DECIMAL(2, 1) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const productCount = await client.query('SELECT COUNT(*) FROM products');
  if (parseInt(productCount.rows[0].count) === 0) {
    console.log('Seeding products for Search DB...');
    const seedProducts = [
      {
        id: "prod-1",
        name: "Aura SoundMax Wireless",
        description: "Premium hybrid active noise-canceling headphones with spatial audio, smart touch controls, and up to 45 hours of battery life.",
        price: 29999.00,
        category: "Electronics",
        image: "/images/aura-headphones.webp",
        stock: 14,
        rating: 4.8
      },
      {
        id: "prod-2",
        name: "Nova X1 Cyber Sneakers",
        description: "Futuristic techwear shoes featuring advanced cushioning, breathable mesh, and customizable neon accent patterns.",
        price: 18000.00,
        category: "Footwear",
        image: "/images/cyber-sneakers.webp",
        stock: 8,
        rating: 4.9
      },
      {
        id: "prod-3",
        name: "Horizon Minimalist Backpack",
        description: "Waterproof modular sleek design with hidden smart compartments, laptop protection sleeve, and anti-theft design.",
        price: 5000.00,
        category: "Accessories",
        image: "/images/horizon-backpack.webp",
        stock: 20,
        rating: 4.5
      },
      {
        id: "prod-4",
        name: "Apex Mechanical Keyboard",
        description: "Hot-swappable tactile linear switches, customizable dynamic RGB lighting, and an aircraft-grade aluminum CNC body.",
        price: 6500.00,
        category: "Electronics",
        image: "/images/apex-keyboard.webp",
        stock: 12,
        rating: 4.7
      },
      {
        id: "prod-5",
        name: "Solaris Sport Smartwatch",
        description: "Sleek AMOLED display, health tracking sensors, offline GPS maps, and solar charging capabilities.",
        price: 2500.00,
        category: "Electronics",
        image: "/images/solaris-watch.webp",
        stock: 10,
        rating: 4.6
      },
      {
        id: "prod-6",
        name: "Vanguard Leather Jacket",
        description: "Handcrafted full-grain leather, modern fit biker cut, premium metal hardware, and comfortable inner lining.",
        price: 3500.00,
        category: "Apparel",
        image: "/images/vanguard-jacket.webp",
        stock: 5,
        rating: 4.8
      }
    ];

    for (const p of seedProducts) {
      await client.query(
        `INSERT INTO products (id, name, description, price, category, image, stock, rating)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [p.id, p.name, p.description, p.price, p.category, p.image, p.stock, p.rating]
      );
    }
    console.log('Search DB products seeded.');
  }
}

async function setupCartDb(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      quantity INT NOT NULL,
      stock INT NOT NULL,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS synced_users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS synced_products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT NOT NULL,
      category VARCHAR(100),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function setupOrderDb(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      postal_code VARCHAR(20) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      estimated_delivery VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(50) PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL,
      transaction_ref VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS synced_users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS synced_products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT NOT NULL,
      category VARCHAR(100),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_events (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      quantity_deducted INT NOT NULL,
      synced BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

main();
