'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';

interface ProductActionsProps {
  product: Product;
}

export default function ProductActions({ product }: ProductActionsProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const isOutOfStock = product.stock <= 0;

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setQuantity(Math.max(1, Math.min(val, product.stock)));
    }
  };

  const increment = () => {
    setQuantity((q) => Math.min(q + 1, product.stock));
  };

  const decrement = () => {
    setQuantity((q) => Math.max(q - 1, 1));
  };

  return (
    <div className="product-actions-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
      {!isOutOfStock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Quantity:</span>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <button 
              type="button" 
              onClick={decrement}
              style={{ padding: '0.75rem 1rem', background: 'transparent', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={handleQtyChange}
              style={{
                width: '60px',
                border: 'none',
                textAlign: 'center',
                background: 'transparent',
                padding: '0.75rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: 'none'
              }}
              min="1"
              max={product.stock}
            />
            <button 
              type="button" 
              onClick={increment}
              style={{ padding: '0.75rem 1rem', background: 'transparent', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ({product.stock} units available)
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => addToCart(product, quantity)}
          disabled={isOutOfStock}
          className={`btn btn-primary ${isOutOfStock ? 'btn-disabled' : ''}`}
          style={{ flex: 1, padding: '1rem 2rem', fontSize: '1.05rem' }}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Shopping Cart'}
        </button>
      </div>
    </div>
  );
}
