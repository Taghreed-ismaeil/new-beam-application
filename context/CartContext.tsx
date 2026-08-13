import React, { createContext, useContext, useMemo, useState } from 'react';

export type CartLine = {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  add: (item: { id: number; name: string; price: number }) => void;
  remove: (menuItemId: number) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  clear: () => void;
  total: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  function add(item: { id: number; name: string; price: number }) {
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) => (l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function remove(menuItemId: number) {
    setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  }

  function setQuantity(menuItemId: number, quantity: number) {
    if (quantity <= 0) return remove(menuItemId);
    setLines((prev) => prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l)));
  }

  function clear() {
    setLines([]);
  }

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);

  return (
    <CartContext.Provider value={{ lines, add, remove, setQuantity, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
