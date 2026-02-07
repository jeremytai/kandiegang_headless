/**
 * CartContext.tsx
 * Global cart state for shop: add/remove/update items, open/close cart offcanvas.
 * Cart items are keyed by priceId so same product+variant merges into one line with quantity.
 * Optional: persist to localStorage so cart survives refresh.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const CART_STORAGE_KEY = 'kandiegang_cart';

export interface CartLineItem {
  id: string;
  priceId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  quantity: number;
  variantLabel?: string;
  /** Display price per unit in currency (e.g. 25.50 for €25.50). Used for subtotal. */
  price?: number;
}

export type CartItemInput = Omit<CartLineItem, 'id' | 'quantity'> & { quantity?: number };

function makeCartId(priceId: string): string {
  return priceId;
}

function loadCartFromStorage(): CartLineItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartLineItem =>
        typeof item === 'object' &&
        item != null &&
        typeof (item as CartLineItem).id === 'string' &&
        typeof (item as CartLineItem).priceId === 'string' &&
        typeof (item as CartLineItem).productId === 'string' &&
        typeof (item as CartLineItem).productTitle === 'string' &&
        typeof (item as CartLineItem).productSlug === 'string' &&
        typeof (item as CartLineItem).quantity === 'number' &&
        (item as CartLineItem).quantity > 0 &&
        ((item as CartLineItem).price === undefined ||
          (typeof (item as CartLineItem).price === 'number' && (item as CartLineItem).price >= 0))
    );
  } catch {
    return [];
  }
}

function saveCartToStorage(items: CartLineItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  isOpen: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartLineItem[]>(loadCartFromStorage);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const addItem = useCallback((input: CartItemInput) => {
    const quantity = Math.max(1, input.quantity ?? 1);
    const id = makeCartId(input.priceId);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      const newItem: CartLineItem = {
        id,
        priceId: input.priceId,
        productId: input.productId,
        productTitle: input.productTitle,
        productSlug: input.productSlug,
        quantity,
        variantLabel: input.variantLabel,
        price: input.price,
      };
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    const q = Math.max(0, Math.floor(quantity));
    if (q === 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: q } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value: CartContextValue = {
    items,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    isOpen,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
