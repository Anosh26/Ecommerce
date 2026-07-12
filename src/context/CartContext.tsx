'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/db';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface CartContextType {
  cart: CartItem[];
  user: User | null;
  token: string | null;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  login: (user: User, token: string) => Promise<void>;
  logout: () => void;
  cartCount: number;
  cartTotal: number;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial Load (Auth & Guest Cart)
  useEffect(() => {
    const savedUser = localStorage.getItem('ecommerce_user');
    const savedToken = localStorage.getItem('ecommerce_token');
    
    let activeUser: User | null = null;
    if (savedUser && savedToken) {
      try {
        activeUser = JSON.parse(savedUser);
        setUser(activeUser);
        setToken(savedToken);
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
    }

    if (activeUser) {
      // Load cart from Cart Microservice
      fetchCartFromServer(activeUser.id);
    } else {
      // Load guest cart from localStorage
      const savedCart = localStorage.getItem('ecommerce_cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error('Failed to parse guest cart data', e);
        }
      }
    }
    setIsLoaded(true);
  }, []);

  // Save guest cart to localStorage when it changes (only if guest user)
  useEffect(() => {
    if (isLoaded && !user) {
      localStorage.setItem('ecommerce_cart', JSON.stringify(cart));
    }
  }, [cart, user, isLoaded]);

  // Fetch cart from Cart Service
  const fetchCartFromServer = async (userId: string) => {
    try {
      const res = await fetch(`/api/cart?userId=${userId}`);
      if (res.ok) {
        const serverCart = await res.json();
        setCart(serverCart);
      }
    } catch (e) {
      console.error('Failed to fetch cart from server', e);
    }
  };

  // 2. Add To Cart
  const addToCart = async (product: Product, quantity = 1) => {
    const existing = cart.find((item) => item.id === product.id);
    const newQty = existing ? Math.min(existing.quantity + quantity, product.stock) : Math.min(quantity, product.stock);
    
    // Update local state
    setCart((prev) => {
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: newQty,
          stock: product.stock,
        },
      ];
    });

    // Sync with Cart Service
    if (user) {
      try {
        await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            stock: product.stock
          })
        });
      } catch (e) {
        console.error('Failed to sync add-to-cart', e);
      }
    }
  };

  // 3. Remove From Cart
  const removeFromCart = async (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));

    if (user) {
      try {
        await fetch('/api/cart/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, productId })
        });
      } catch (e) {
        console.error('Failed to sync remove-from-cart', e);
      }
    }
  };

  // 4. Update Quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    const item = cart.find(c => c.id === productId);
    if (!item) return;

    const validatedQty = Math.max(1, Math.min(quantity, item.stock));

    setCart((prev) =>
      prev.map((i) =>
        i.id === productId ? { ...i, quantity: validatedQty } : i
      )
    );

    if (user) {
      try {
        await fetch('/api/cart/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, productId, quantity: validatedQty })
        });
      } catch (e) {
        console.error('Failed to sync update-quantity', e);
      }
    }
  };

  // 5. Clear Cart
  const clearCart = async () => {
    setCart([]);
    localStorage.removeItem('ecommerce_cart');

    if (user) {
      try {
        await fetch('/api/cart/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
      } catch (e) {
        console.error('Failed to sync clear-cart', e);
      }
    }
  };

  // 6. User Login (Merges local guest cart items with server database cart)
  const login = async (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('ecommerce_user', JSON.stringify(newUser));
    localStorage.setItem('ecommerce_token', newToken);

    // Merge local guest cart items into the user's server-side cart
    if (cart.length > 0) {
      console.log('Merging guest cart items with server cart...');
      for (const item of cart) {
        try {
          await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: newUser.id,
              productId: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              stock: item.stock
            })
          });
        } catch (e) {
          console.error('Failed to sync merge item:', item.name, e);
        }
      }
      localStorage.removeItem('ecommerce_cart');
    }

    // Load fresh consolidated cart from server
    await fetchCartFromServer(newUser.id);
  };

  // 7. User Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    setCart([]);
    localStorage.removeItem('ecommerce_user');
    localStorage.removeItem('ecommerce_token');
    localStorage.removeItem('ecommerce_cart');
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = parseFloat(cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2));

  return (
    <CartContext.Provider
      value={{
        cart,
        user,
        token,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        login,
        logout,
        cartCount,
        cartTotal,
        isLoaded
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
