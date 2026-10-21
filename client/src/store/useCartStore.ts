// ============================================================
// useCartStore — Zustand store quản lý giỏ hàng (LocalStorage)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '../models/product.model';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface CartStore {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  increaseQuantity: (productId: number) => void;
  decreaseQuantity: (productId: number) => void;
  clearCart: () => void;
  syncCart: () => void;
}

function calcTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + (i.product.price || 0) * i.quantity, 0),
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
        const maxStock = product.stock !== undefined && product.stock > 0 ? product.stock : 999;

        if (existing) {
          const newQty = Math.min(existing.quantity + quantity, maxStock);
          existing.quantity = newQty;
          // Cập nhật thông tin mới nhất của product
          existing.product = product;
        } else {
          items.push({
            product,
            quantity: Math.min(quantity, maxStock),
          });
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

        const items = get().items.map((i) => {
          if (i.product.id === productId) {
            const maxStock =
              i.product.stock !== undefined && i.product.stock > 0 ? i.product.stock : 999;
            return {
              ...i,
              quantity: Math.min(quantity, maxStock),
            };
          }
          return i;
        });

        set({ items, ...calcTotals(items) });
      },

      increaseQuantity: (productId) => {
        const item = get().items.find((i) => i.product.id === productId);
        if (item) {
          get().updateQuantity(productId, item.quantity + 1);
        }
      },

      decreaseQuantity: (productId) => {
        const item = get().items.find((i) => i.product.id === productId);
        if (item) {
          get().updateQuantity(productId, item.quantity - 1);
        }
      },

      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0 });
      },

      syncCart: () => {
        // Đồng bộ và tính toán lại tổng tiền từ danh sách hiện có
        const currentItems = get().items;
        set({ ...calcTotals(currentItems) });
      },
    }),
    {
      name: STORAGE_KEYS.CART_STORAGE,
    }
  )
);

export default useCartStore;
