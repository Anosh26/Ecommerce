import React from 'react';
import { searchProducts, getCategories } from '@/lib/search';
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

  // Search products inside the monolith database
  const products = await searchProducts({
    query,
    category,
    sortBy,
    minPrice,
    maxPrice,
  });

  const categories = await getCategories();

  return (
    <div style={{ paddingTop: '2rem' }}>
      {/* Hero Banner Section */}
      <div className="hero-banner" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '3rem 2rem',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 800,
          marginBottom: '1rem',
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #ffffff 40%, var(--primary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: '1.2'
        }}>
          Discover Future Techwear & Accessories
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.1rem',
          maxWidth: '600px',
          lineHeight: '1.6',
          fontWeight: 400
        }}>
          Explore our handpicked collection of high-fidelity gadgets, minimalist apparel, and cyber footwear. Built entirely in a fast, monolithic system.
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
