import ProductCard from '@/components/ProductCard';
import CatalogFilters from '@/components/CatalogFilters';

interface PageProps {
  searchParams: Promise<{
    query?: string;
    category?: string;
    sortBy?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query || '';
  const category = params.category || 'All';
  const sortBy = (params.sortBy as any) || 'default';
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;

  const GATEWAY_URL = process.env.NEXT_GATEWAY_URL || 'http://localhost:5000';

  // Fetch products and categories via API Gateway
  let products: any[] = [];
  let categories: string[] = ['All'];

  try {
    const searchParamsObj = new URLSearchParams();
    if (query) searchParamsObj.set('query', query);
    if (category) searchParamsObj.set('category', category);
    if (sortBy) searchParamsObj.set('sortBy', sortBy);
    if (minPrice !== undefined && !isNaN(minPrice)) searchParamsObj.set('minPrice', minPrice.toString());
    if (maxPrice !== undefined && !isNaN(maxPrice)) searchParamsObj.set('maxPrice', maxPrice.toString());

    const productsRes = await fetch(`${GATEWAY_URL}/api/search/products?${searchParamsObj.toString()}`, { cache: 'no-store' });
    if (productsRes.ok) {
      products = await productsRes.json();
    }

    const categoriesRes = await fetch(`${GATEWAY_URL}/api/search/categories`, { cache: 'no-store' });
    if (categoriesRes.ok) {
      categories = await categoriesRes.json();
    }
  } catch (err) {
    console.error('Failed to fetch from API Gateway:', err);
  }

  return (
    <div style={{ paddingTop: '2rem' }}>
      {/* Hero Banner Section */}
      <div className="hero-banner" style={{
        background: '#fefcbd',
        border: '3px solid #1e293b',
        boxShadow: '4px 4px 0px #1e293b',
        borderRadius: 'var(--radius-lg)',
        padding: '3rem 2rem',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 900,
          marginBottom: '1rem',
          letterSpacing: '-0.03em',
          color: '#064e3b',
          lineHeight: '1.2'
        }}>
          Discover Future Techwear & Accessories ☀️
        </h1>
        <p style={{
          color: '#1e293b',
          fontSize: '1.1rem',
          maxWidth: '650px',
          lineHeight: '1.6',
          fontWeight: 600
        }}>
          Explore our handpicked collection of high-fidelity gadgets, minimalist apparel, and cyber footwear. Built entirely in a fast, multi-threaded microservices architecture.
        </p>
      </div>

      {/* Catalog Filters (Search, Categories, Sorting, Price) */}
      <CatalogFilters categories={categories} />

      {/* Product Grid */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0' }}>
          {query ? `Search results for "${query}"` : category !== 'All' ? `${category} Collection` : 'All Products'}
          <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
            ({products.length} {products.length === 1 ? 'item' : 'items'})
          </span>
        </h2>
      </div>

      {products.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5rem 2rem',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          textAlign: 'center'
        }}>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ width: '48px', height: '48px', color: 'var(--text-muted)', marginBottom: '1rem' }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" style={{ transform: 'rotate(45deg)', transformOrigin: 'center' }} />
          </svg>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Products Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            We couldn't find any products matching your active filters. Try adjusting your search keywords, price limits, or category tab.
          </p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
