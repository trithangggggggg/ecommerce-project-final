// ============================================================
// useCartStore — Zustand store quản lý giỏ hàng (client-side)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '@/models/product.model';

interface CartStore {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}

function calcTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,

      addItem: (product, quantity = 1) => {
        const items = [...get().items];
        const existing = items.find((i) => i.product.id === product.id);

        if (existing) {
          existing.quantity = Math.min(
            existing.quantity + quantity,
            product.stock
          );
        } else {
          items.push({ product, quantity: Math.min(quantity, product.stock) });
        }

        set({ items, ...calcTotals(items) });
      },

      removeItem: (productId) => {
        const items = get().items.filter((i) => i.product.id !== productId);
        set({ items, ...calcTotals(items) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const items = get().items.map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.min(quantity, i.product.stock) }
            : i
        );
        set({ items, ...calcTotals(items) });
      },

      clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0 }),
    }),
    {
      name: 'cart-storage',
    }
  )
);
