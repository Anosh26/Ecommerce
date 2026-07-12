'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import ProductImage from '@/components/ProductImage';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  
  // Shipping Form State
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
  });

  // Processing States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      ...formData,
    };

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong during checkout.');
      }

      // Order placed successfully!
      setOrderResult(data.order);
      clearCart(); // Clear local shopping cart state
    } catch (err: any) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Success Screen View
  if (orderResult) {
    return (
      <div style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '650px',
          margin: '0 auto',
          padding: '4rem 2rem',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Success Icon */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--success-glow)',
            color: 'var(--success)',
            border: '2px solid var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '36px', height: '36px' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Payment Successful!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '2.5rem', maxWidth: '500px' }}>
            Thank you for your purchase, <strong>{orderResult.customerName}</strong>! Your transaction was processed successfully.
          </p>

          {/* Receipt Details */}
          <div style={{
            width: '100%',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            textAlign: 'left',
            marginBottom: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Order Reference:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{orderResult.id}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <span className="badge badge-success">Paid & Processing</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Delivery Address:</span>
              <span style={{ color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500 }}>
                {orderResult.address}, {orderResult.city}, {orderResult.postalCode}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount Charged:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>₹{orderResult.total.toFixed(2)}</span>
            </div>

            {/* Crucial Estimated Delivery Notice (X amount of time) */}
            <div style={{ 
              marginTop: '0.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-glow)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Estimated Delivery
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>
                {orderResult.estimatedDelivery}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Your order is being routed via our monolithic delivery courier service.
              </span>
            </div>
          </div>

          <Link href="/" className="btn btn-primary" style={{ padding: '0.8rem 2.5rem' }}>
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // 2. Empty Cart Guard
  if (cart.length === 0) {
    return (
      <div style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          padding: '3rem 2rem',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>No Items to Checkout</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Your cart is currently empty. Add products to your cart before proceeding to checkout.
          </p>
          <Link href="/" className="btn btn-primary">
            Go to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // 3. Checkout Checkout Form View
  return (
    <div style={{ paddingTop: '2.5rem' }}>
      <h1 className="page-title">Secure Checkout</h1>

      {error && (
        <div style={{
          background: 'var(--error-glow)',
          color: 'var(--error)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          fontWeight: 500,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="checkout-layout-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '3rem',
        alignItems: 'start'
      }}>
        {/* Form Container */}
        <form onSubmit={handlePlaceOrder} style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Shipping Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="customerName" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              required
              placeholder="John Doe"
              value={formData.customerName}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="address" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Shipping Address</label>
            <input
              type="text"
              id="address"
              name="address"
              required
              placeholder="123 Cyberpunk Ave"
              value={formData.address}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="city" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>City</label>
              <input
                type="text"
                id="city"
                name="city"
                required
                placeholder="Neo Tokyo"
                value={formData.city}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="postalCode" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Postal Code</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                required
                placeholder="100-0001"
                value={formData.postalCode}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.5rem',
            marginTop: '0.5rem'
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>
              Payment Information
            </h2>
            <div style={{
              background: 'var(--bg-canvas)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <div>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Simulated Monolithic Checkout</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  By clicking Place Order, the system will record your order and instantly complete payment.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn btn-primary ${isSubmitting ? 'btn-disabled' : ''}`}
            style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', marginTop: '1rem' }}
          >
            {isSubmitting ? 'Processing Payment & Order...' : `Pay & Place Order (₹${cartTotal.toFixed(2)})`}
          </button>
        </form>

        {/* Order review panel */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            Review Items ({cart.length})
          </h3>

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingRight: '0.5rem'
          }}>
            {cart.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', flexShrink: 0 }}>
                  <ProductImage id={item.id} name={item.name} category="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Qty: {item.quantity} &times; ₹{item.price.toFixed(2)}
                  </p>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span style={{ fontWeight: 500 }}>₹{cartTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.15rem',
              fontWeight: 800,
              borderTop: '1px dashed var(--border-subtle)',
              paddingTop: '0.75rem',
              marginTop: '0.25rem'
            }}>
              <span>Total Cost</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .checkout-layout-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
