'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount } = useCart();

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link href="/" className="logo-text">
          PAAPTOL
        </Link>
        <div className="nav-links">
          <Link 
            href="/" 
            className={`nav-link ${pathname === '/' ? 'active' : ''}`}
          >
            Catalog
          </Link>
          <Link 
            href="/cart" 
            className={`nav-link cart-icon-container ${pathname === '/cart' ? 'active' : ''}`}
          >
            Cart
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
