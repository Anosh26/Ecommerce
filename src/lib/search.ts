import { Product, getProducts } from './db';

export interface SearchOptions {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'default';
}

// Monolithic search engine - runs directly in our application layer
export async function searchProducts(options: SearchOptions = {}): Promise<Product[]> {
  let products = await getProducts();
  const { query, category, minPrice, maxPrice, sortBy } = options;

  // 1. Filter by category
  if (category && category !== 'All') {
    products = products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  // 2. Filter by search query (case-insensitive substring match across name, description, category)
  if (query && query.trim() !== '') {
    const cleanQuery = query.toLowerCase().trim();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(cleanQuery) ||
        p.description.toLowerCase().includes(cleanQuery) ||
        p.category.toLowerCase().includes(cleanQuery)
    );
  }

  // 3. Filter by price range
  if (minPrice !== undefined && !isNaN(minPrice)) {
    products = products.filter((p) => p.price >= minPrice);
  }
  if (maxPrice !== undefined && !isNaN(maxPrice)) {
    products = products.filter((p) => p.price <= maxPrice);
  }

  // 4. Sort results
  if (sortBy && sortBy !== 'default') {
    if (sortBy === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      products.sort((a, b) => b.rating - a.rating);
    }
  }

  return products;
}

// Get list of distinct categories for filtering
export async function getCategories(): Promise<string[]> {
  const products = await getProducts();
  const categories = products.map((p) => p.category);
  return ['All', ...Array.from(new Set(categories))];
}
