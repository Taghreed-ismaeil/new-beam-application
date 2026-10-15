import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// The cart is saved on the device so it survives the app being closed (or
// killed in the background) — e.g. a guest who leaves mid-checkout to fetch
// their sign-up code comes back to the same items.
const STORAGE_KEY = 'beem_cart_lines';

export type CartLine = {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  // Both names so the cart can follow the app language (older lines only have `name`).
  nameAr?: string | null;
  nameEn?: string | null;
  // Server image path (pass through imageUrl() to show it). Older saved lines may not have it.
  imageUrl?: string | null;
  // Customer's note for the kitchen ("no pickles"), sent with the order line.
  notes?: string | null;
};

type CartAddItem = {
  id: number;
  name: string;
  nameAr?: string | null;
  nameEn?: string | null;
  price: number;
  imageUrl?: string | null;
};

type CartContextValue = {
  lines: CartLine[];
  add: (item: CartAddItem) => void;
  /** Adds `quantity` at once (item details screen); a non-empty note replaces the line's note. */
  addMany: (item: CartAddItem, quantity: number, notes?: string) => void;
  remove: (menuItemId: number) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  clear: () => void;
  total: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Don't write until the saved cart has been read back, otherwise the initial
  // empty [] would overwrite it on launch.
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        // Anything added before the read finished wins over the saved copy.
        if (Array.isArray(saved)) setLines((current) => (current.length ? current : saved));
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true;
      });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines]);

  function addMany(item: CartAddItem, quantity: number, notes?: string) {
    if (quantity <= 0) return;
    const note = notes?.trim() || null;
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.id
            ? {
                ...l,
                quantity: l.quantity + quantity,
                nameAr: l.nameAr ?? item.nameAr ?? null,
                nameEn: l.nameEn ?? item.nameEn ?? null,
                imageUrl: l.imageUrl ?? item.imageUrl ?? null,
                notes: note ?? l.notes ?? null,
              }
            : l,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          nameAr: item.nameAr ?? null,
          nameEn: item.nameEn ?? null,
          price: item.price,
          quantity,
          imageUrl: item.imageUrl ?? null,
          notes: note,
        },
      ];
    });
  }

  function add(item: CartAddItem) {
    addMany(item, 1);
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
    <CartContext.Provider value={{ lines, add, addMany, remove, setQuantity, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
