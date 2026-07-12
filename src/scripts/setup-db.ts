import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paaptol';

async function main() {
  console.log('Starting PostgreSQL setup for Paaptol...');

  // Parse connection string to get credentials and target database
  // Match format: postgresql://user:password@host:port/database
  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.error('Error: DATABASE_URL format is invalid. Expected: postgresql://user:password@host:port/database');
    process.exit(1);
  }

  const [_, user, password, host, port, databaseName] = match;

  // 1. Connect to default 'postgres' database to check/create the target database
  const defaultClient = new Client({
    user,
    password,
    host,
    port: parseInt(port),
    database: 'postgres'
  });

  try {
    await defaultClient.connect();
    const dbCheck = await defaultClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [databaseName]
    );

    if (dbCheck.rowCount === 0) {
      console.log(`Database '${databaseName}' does not exist. Creating...`);
      await defaultClient.query(`CREATE DATABASE ${databaseName}`);
      console.log(`Database '${databaseName}' created successfully.`);
    } else {
      console.log(`Database '${databaseName}' already exists.`);
    }
  } catch (err) {
    console.error('Warning: Could not connect to default postgres db to ensure DB creation:', err);
    console.log('Attempting direct connection to targets, assuming target database already exists...');
  } finally {
    try {
      await defaultClient.end();
    } catch {}
  }

  // 2. Connect to the actual target e-commerce database
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`Connected to database '${databaseName}'. Setting up tables...`);

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

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
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
        product_id VARCHAR(50) REFERENCES products(id),
        name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL
      )
    `);

    console.log('Tables set up successfully.');

    // Seed products table if empty
    const productCount = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      console.log('Seeding products...');
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
      console.log('Seeding complete.');
    } else {
      console.log('Products table already has data. Skipping seed.');
    }

    console.log('Paaptol database setup successfully completed!');
  } catch (err) {
    console.error('Fatal database setup error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
