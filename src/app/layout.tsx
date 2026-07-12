import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Paaptol | Monolithic Premium Ecommerce',
  description: 'A modern monolithic e-commerce experience built using Next.js and Vanilla CSS.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <CartProvider>
          <Navbar />
          <main className="main-content container">
            {children}
          </main>
          <footer style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '2rem 0',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            marginTop: 'auto'
          }}>
            <div className="container">
              <p>&copy; {new Date().getFullYear()} Paaptol. All rights reserved. Monolithic Architecture Demo.</p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
