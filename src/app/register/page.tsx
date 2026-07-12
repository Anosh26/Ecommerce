'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function RegisterPage() {
  const { login } = useCart();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      await login(data.user, data.token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1rem' }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: '#ffffff',
        border: '3px solid #1e293b',
        borderRadius: '16px',
        boxShadow: '6px 6px 0px #1e293b',
        padding: '2.5rem',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#14532d', marginBottom: '0.5rem', textAlign: 'center' }}>
          Create Account
        </h1>
        <p style={{ color: '#4a6148', fontSize: '0.95rem', marginBottom: '2rem', textAlign: 'center', fontWeight: 500 }}>
          Sign up to save orders and sync items across devices.
        </p>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #ef4444',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="name" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
              Full Name
            </label>
            <input
              type="text"
              id="name"
              placeholder="Sunny Explorer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                border: '2px solid #1e293b',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none',
                background: '#ffffff',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                border: '2px solid #1e293b',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none',
                background: '#ffffff',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                border: '2px solid #1e293b',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none',
                background: '#ffffff',
                color: '#1e293b'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: '#22c55e',
              color: '#ffffff',
              border: '2px solid #1e293b',
              borderRadius: '8px',
              padding: '0.8rem',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '3px 3px 0px #1e293b',
              transition: 'all 0.15s ease',
              marginTop: '0.5rem'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = '1px 1px 0px #1e293b';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '3px 3px 0px #1e293b';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#16a34a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#22c55e';
            }}
          >
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', fontWeight: 500, color: '#4a6148' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#fbbf24', fontWeight: 700, textDecoration: 'underline' }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
