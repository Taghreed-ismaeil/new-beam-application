import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// The cart is saved on the device so it survives the app being closed (or
// killed in the background) — e.g. a guest who leaves mid-checkout to fetch
// their sign-up code comes back to the same items.
const STORAGE_KEY = 'beem_cart_lines';
// Set while the cart holds an already-placed order being edited (opened from
// the WhatsApp receipt's "edit" link) — confirming then updates that order.
const EDIT_KEY = 'beem_cart_editing';

export type EditingOrder = {
  orderId: number;
  /** 'edit' replaces the order's items; 'add' only appends new ones (order already being prepared). */
  mode?: 'edit' | 'add';
  orderType: string;
  paymentMethod: string;
  address?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  tableId?: number | null;
  tableNumber?: string | null;
};

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
  /** Sets a line's quantity and notes in place (editing it from the item page). */
  updateLine: (menuItemId: number, quantity: number, notes?: string) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  clear: () => void;
  total: number;
  /** Non-null while editing an existing order. */
  editing: EditingOrder | null;
  /** Replaces the cart with an order's items and switches to editing it. */
  startEditing: (order: any, images?: Record<number, string>) => void;
  /** Empties the cart and starts adding new items to an order being prepared. */
  startAdding: (order: any) => void;
  /** Leaves editing mode (the cart keeps its items). */
  stopEditing: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [editing, setEditing] = useState<EditingOrder | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(EDIT_KEY)
      .then((raw) => raw && setEditing(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  function saveEditing(next: EditingOrder | null) {
    setEditing(next);
    (next ? AsyncStorage.setItem(EDIT_KEY, JSON.stringify(next)) : AsyncStorage.removeItem(EDIT_KEY)).catch(() => {});
  }

  function startEditing(order: any, images: Record<number, string> = {}) {
    setLines(
      (order.items ?? []).map((i: any) => ({
        menuItemId: i.menuItemId,
        name: i.nameEnSnapshot || i.nameSnapshot,
        nameAr: i.nameSnapshot,
        nameEn: i.nameEnSnapshot,
        price: Number(i.unitPriceSnapshot),
        quantity: i.quantity,
        notes: i.notes ?? null,
        imageUrl: images[i.menuItemId] ?? null,
      })),
    );
    saveEditing({
      orderId: order.id,
      mode: 'edit',
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      address: order.deliveryAddress,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      tableId: order.tableId,
      tableNumber: order.table?.tableNumber ?? null,
    });
  }

  function startAdding(order: any) {
    setLines([]);
    saveEditing({ orderId: order.id, mode: 'add', orderType: order.orderType, paymentMethod: order.paymentMethod });
  }

  function stopEditing() {
    saveEditing(null);
  }
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

  function updateLine(menuItemId: number, quantity: number, notes?: string) {
    const note = notes?.trim() || null;
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.menuItemId !== menuItemId)
        : prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity, notes: note } : l)),
    );
  }

  function setQuantity(menuItemId: number, quantity: number) {
    if (quantity <= 0) return remove(menuItemId);
    setLines((prev) => prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l)));
  }

  function clear() {
    setLines([]);
    saveEditing(null);
  }

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);

  return (
    <CartContext.Provider value={{ lines, add, addMany, remove, updateLine, setQuantity, clear, total, editing, startEditing, startAdding, stopEditing }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
