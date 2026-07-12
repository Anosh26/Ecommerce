'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount, user, logout } = useCart();

  return (
    <nav className="navbar" style={{ borderBottom: '3px solid #1e293b' }}>
      <div className="container nav-container">
        <Link href="/" className="logo-text" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>
          PAAPTOL ☀️
        </Link>
        
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link 
            href="/" 
            className={`nav-link ${pathname === '/' ? 'active' : ''}`}
            style={{ fontWeight: 700 }}
          >
            Catalog
          </Link>
          
          <Link 
            href="/cart" 
            className={`nav-link cart-icon-container ${pathname === '/cart' ? 'active' : ''}`}
            style={{ fontWeight: 700, position: 'relative', display: 'inline-flex', alignItems: 'center' }}
          >
            Cart
            {cartCount > 0 && (
              <span className="cart-badge" style={{
                position: 'absolute',
                top: '-8px',
                right: '-16px',
                background: '#22c55e',
                color: '#ffffff',
                border: '2px solid #1e293b',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {cartCount}
              </span>
            )}
          </Link>

          {user?.role === 'admin' && (
            <Link 
              href="/admin" 
              className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}
              style={{ fontWeight: 700, color: '#d97706' }}
            >
              Admin Control
            </Link>
          )}

          {/* Authentication State Display */}
          <div style={{ borderLeft: '2px solid #1e293b', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#14532d' }}>
                  Hi, {user.name.split(' ')[0]}!
                </span>
                <button
                  onClick={logout}
                  className="btn btn-sm"
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: '2px solid #1e293b',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0px #1e293b'
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="btn btn-sm"
                style={{
                  background: '#facc15',
                  color: '#1e293b',
                  border: '2px solid #1e293b',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '2px 2px 0px #1e293b'
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
