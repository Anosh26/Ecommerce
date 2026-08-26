import React from 'react';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import ProductActions from '@/components/ProductActions';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  
  const GATEWAY_URL = process.env.NEXT_GATEWAY_URL || 'http://localhost:5000';
  let product: any = null;
  if (process.env.IS_MONOLITH === 'true' || !process.env.NEXT_GATEWAY_URL) {
    try {
      const { getProductById } = await import('@/lib/db');
      product = await getProductById(resolvedParams.id);
    } catch (err) {
      console.error('Monolithic getProductById failed:', err);
    }
  } else {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/search/products/${resolvedParams.id}`, { cache: 'no-store' });
      if (res.ok) {
        product = await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch product details:', err);
    }
  }

  if (!product) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          padding: '3rem 2rem',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--error)', marginBottom: '1rem' }}>Product Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            The product you are looking for does not exist or has been removed from our catalog.
          </p>
          <Link href="/" className="btn btn-primary">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <div style={{ paddingTop: '2.5rem' }}>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Catalog
        </Link>
      </div>

      {/* Main Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '3rem',
        alignItems: 'start'
      }}>
        {/* Left Side: Product Showcase Image Card */}
        <div>
          <ProductImage 
            id={product.id} 
            name={product.name} 
            category={product.category}
            className="product-detail-image"
          />
        </div>

        {/* Right Side: Product Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="badge badge-primary">{product.category}</span>
              {isOutOfStock ? (
                <span className="badge badge-danger" style={{ background: 'var(--error-glow)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  Out of Stock
                </span>
              ) : (
                <span className="badge badge-success">
                  In Stock
                </span>
              )}
              <span style={{ color: '#fbbf24', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                ★ {product.rating}
              </span>
            </div>

            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem'
            }}>
              {product.name}
            </h1>
            
            <p style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '1rem 0'
            }}>
              ₹{product.price.toFixed(2)}
            </p>
          </div>

          <div style={{ 
            borderTop: '1px solid var(--border-subtle)', 
            borderBottom: '1px solid var(--border-subtle)', 
            padding: '1.5rem 0' 
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Description
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.6',
            }}>
              {product.description}
            </p>
          </div>

          {/* Add to Cart Actions Component */}
          <ProductActions product={product} />

          {/* Additional info features */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>Free Delivery:</strong> Ships directly from our centralized monolithic inventory hub.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>Secure Processing:</strong> Fully verified in-app mock transaction validation.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
