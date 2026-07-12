'use client';

import React from 'react';
import Link from 'next/link';
import { Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';
import ProductImage from './ProductImage';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="product-card">
      <Link href={`/products/${product.id}`} className="product-card-link">
        <ProductImage id={product.id} name={product.name} category={product.category} />
      </Link>
      <div className="product-card-info">
        <div className="product-card-meta">
          <span className="badge badge-primary">{product.category}</span>
          {product.stock < 5 && product.stock > 0 ? (
            <span className="badge" style={{ color: '#9a3412', borderColor: '#1e293b', background: '#ffedd5', fontWeight: 800 }}>
              Only {product.stock} Left!
            </span>
          ) : null}
          <span className="product-card-rating">★ {product.rating}</span>
        </div>
        <Link href={`/products/${product.id}`}>
          <h3 className="product-card-title">{product.name}</h3>
        </Link>
        <p className="product-card-desc">{product.description}</p>
        <div className="product-card-footer">
          <span className="product-card-price">₹{product.price.toFixed(2)}</span>
          <button
            onClick={() => addToCart(product)}
            disabled={isOutOfStock}
            className={`btn btn-primary btn-sm ${isOutOfStock ? 'btn-disabled' : ''}`}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
