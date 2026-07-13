import { Client } from 'pg';
import * as crypto from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@localhost:5432/paaptol';

const databases = [
  { name: 'paaptol_auth', setup: setupAuthDb },
  { name: 'paaptol_search', setup: setupSearchDb },
  { name: 'paaptol_cart', setup: setupCartDb },
  { name: 'paaptol_buy', setup: setupBuyDb },
  { name: 'paaptol_payment', setup: setupPaymentDb },
];

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Starting PostgreSQL setup for Paaptol Microservices...');

  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.error('Error: DATABASE_URL format is invalid. Expected: postgresql://user:password@host:port/database');
    process.exit(1);
  }

  const [_, user, password, host, port, _defaultDb] = match;
  const decodedUser = decodeURIComponent(user);
  const decodedPassword = decodeURIComponent(password);

  // 1. Connect to default 'postgres' database to ensure our 5 databases exist
  // We ONLY do this if we are running in single-postgres mode (i.e. AUTH_DATABASE_URL is not set).
  // In multi-postgres (isolated) mode, each database container is created with its correct database pre-created.
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
          // Note: CREATE DATABASE queries cannot run inside transaction blocks and cannot use parameters
          await defaultClient.query(`CREATE DATABASE ${db.name}`);
          console.log(`Database '${db.name}' created successfully.`);
        } else {
          console.log(`Database '${db.name}' already exists.`);
        }
      }
    } catch (err) {
      console.error('Warning: Could not connect to default postgres db to ensure DB creation:', err);
      console.log('Attempting direct connection to targets, assuming target databases already exist...');
    } finally {
      try {
        await defaultClient.end();
      } catch {}
    }
  } else {
    console.log('Detected individual database configuration (Docker mode). Skipping database creation phase.');
  }

  // 2. Set up each database schema and tables
  for (const db of databases) {
    let dbConnectionString = '';
    if (db.name === 'paaptol_auth') dbConnectionString = process.env.AUTH_DATABASE_URL || '';
    else if (db.name === 'paaptol_search') dbConnectionString = process.env.SEARCH_DATABASE_URL || '';
    else if (db.name === 'paaptol_cart') dbConnectionString = process.env.CART_DATABASE_URL || '';
    else if (db.name === 'paaptol_buy') dbConnectionString = process.env.BUY_DATABASE_URL || '';
    else if (db.name === 'paaptol_payment') dbConnectionString = process.env.PAYMENT_DATABASE_URL || '';

    if (!dbConnectionString) {
      dbConnectionString = `postgresql://${user}:${password}@${host}:${port}/${db.name}`;
    }

    const client = new Client({ connectionString: dbConnectionString });
    
    try {
      await client.connect();
      console.log(`--- Setting up database '${db.name}' ---`);
      await db.setup(client);
      console.log(`Database '${db.name}' set up successfully.`);
    } catch (err) {
      console.error(`Fatal error setting up database '${db.name}':`, err);
      process.exit(1);
    } finally {
      await client.end();
    }
  }

  console.log('All Paaptol microservices databases set up successfully!');
}

async function setupAuthDb(client: Client) {
  // Create users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure role column exists if table was previously created
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
  `);

  // Seed default user if not exists
  const defaultUserCheck = await client.query('SELECT 1 FROM users WHERE email = $1', ['user@sunny.com']);
  if (defaultUserCheck.rowCount === 0) {
    console.log('Seeding default user for Auth DB...');
    const userId = 'user-1';
    const email = 'user@sunny.com';
    const name = 'Sunny Explorer';
    const password_hash = hashPassword('sunny123');

    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
      [userId, name, email, password_hash, 'user']
    );
    console.log(`Auth DB seeded user: user@sunny.com / sunny123`);
  }

  // Seed default admin if not exists
  const defaultAdminCheck = await client.query('SELECT 1 FROM users WHERE email = $1', ['admin@sunny.com']);
  if (defaultAdminCheck.rowCount === 0) {
    console.log('Seeding default admin for Auth DB...');
    const adminId = 'admin-1';
    const adminEmail = 'admin@sunny.com';
    const adminName = 'Sunny Admin';
    const adminPasswordHash = hashPassword('admin123');

    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
      [adminId, adminName, adminEmail, adminPasswordHash, 'admin']
    );
    console.log(`Auth DB seeded admin: admin@sunny.com / admin123`);
  }
}

async function setupSearchDb(client: Client) {
  // Create products table
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      image VARCHAR(255) NOT NULL,
      stock INT NOT NULL,
      rating DECIMAL(2, 1) NOT NULL
    )
  `);

  // Seed products table if empty
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
  // Create cart_items table
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
    )
  `);
}

async function setupBuyDb(client: Client) {
  // Create orders table
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
    )
  `);

  // Create order_items table
  await client.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL
    )
  `);
}

async function setupPaymentDb(client: Client) {
  // Create payments table
  await client.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(50) PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL,
      transaction_ref VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

main();
