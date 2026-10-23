// ============================================================
// useCartStore — Zustand store quản lý giỏ hàng theo variantId
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../models/product.model';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface CartStore {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;

  addItem: (product: Product, variantOrQty?: ProductVariant | number, quantity?: number) => void;
  removeItem: (variantId: number, productId?: number) => void;
  updateQuantity: (variantId: number, quantity: number, productId?: number) => void;
  increaseQuantity: (variantId: number, productId?: number) => void;
  decreaseQuantity: (variantId: number, productId?: number) => void;
  clearCart: () => void;
  syncCart: () => void;
}

function getItemPrice(item: CartItem): number {
  if (item.variant && typeof item.variant.price === 'number') {
    return item.variant.price;
  }
  return item.product.price || 0;
}

function getItemMaxStock(item: CartItem): number {
  if (item.variant && typeof item.variant.stock === 'number') {
    return item.variant.stock;
  }
  if (typeof item.product.stock === 'number') {
    return item.product.stock;
  }
  return 999;
}

function calcTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + getItemPrice(i) * i.quantity, 0),
  };
}

function isMatch(item: CartItem, variantId: number, productId?: number): boolean {
  if (item.variantId && item.variantId === variantId) return true;
  if (item.variant && item.variant.id === variantId) return true;
  if (productId && item.product.id === productId) return true;
  // If variantId was passed as product.id in legacy calls
  if (!item.variantId && item.product.id === variantId) return true;
  return false;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,

      addItem: (product, variantOrQty, maybeQty) => {
        let variant: ProductVariant | undefined;
        let quantity = 1;

        if (typeof variantOrQty === 'number') {
          quantity = variantOrQty;
          variant = undefined;
        } else {
          variant = variantOrQty;
          quantity = typeof maybeQty === 'number' ? maybeQty : 1;
        }

        const items = [...get().items];

        // If no explicit variant passed, pick the first variant if available
        const activeVariant =
          variant ||
          (product.variants && product.variants.length > 0 ? product.variants[0] : undefined);
        const activeVariantId = activeVariant?.id;

        const existingIndex = items.findIndex((i) => {
          if (activeVariantId) {
            return (i.variantId && i.variantId === activeVariantId) || (i.variant?.id === activeVariantId);
          }
          return i.product.id === product.id;
        });

        const maxStock = activeVariant
          ? activeVariant.stock ?? 999
          : product.stock !== undefined && product.stock > 0
          ? product.stock
          : 999;

        if (existingIndex > -1) {
          const current = items[existingIndex];
          const newQty = Math.min(current.quantity + quantity, maxStock);
          items[existingIndex] = {
            ...current,
            variantId: activeVariantId || current.variantId,
            variant: activeVariant || current.variant,
            product,
            quantity: newQty,
          };
        } else {
          items.push({
            variantId: activeVariantId,
            variant: activeVariant,
            product,
            quantity: Math.min(quantity, maxStock),
          });
        }

        set({ items, ...calcTotals(items) });
      },

      removeItem: (variantId, productId) => {
        const items = get().items.filter((i) => !isMatch(i, variantId, productId));
        set({ items, ...calcTotals(items) });
      },

      updateQuantity: (variantId, quantity, productId) => {
        if (quantity <= 0) {
          get().removeItem(variantId, productId);
          return;
        }

        const items = get().items.map((i) => {
          if (isMatch(i, variantId, productId)) {
            const maxStock = getItemMaxStock(i);
            return {
              ...i,
              quantity: Math.min(quantity, maxStock),
            };
          }
          return i;
        });

        set({ items, ...calcTotals(items) });
      },

      increaseQuantity: (variantId, productId) => {
        const item = get().items.find((i) => isMatch(i, variantId, productId));
        if (item) {
          get().updateQuantity(variantId, item.quantity + 1, productId);
        }
      },

      decreaseQuantity: (variantId, productId) => {
        const item = get().items.find((i) => isMatch(i, variantId, productId));
        if (item) {
          get().updateQuantity(variantId, item.quantity - 1, productId);
        }
      },

      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0 });
      },

      syncCart: () => {
        const currentItems = get().items;
        set({ ...calcTotals(currentItems) });
      },
    }),
    {
      name: STORAGE_KEYS.CART_STORAGE,
      version: 2, // Bumped to 2 to automatically migrate / clean legacy carts
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Reset legacy cart so stale items don't cause runtime errors
          return { items: [], totalItems: 0, totalPrice: 0 };
        }
        return persistedState as CartStore;
      },
    }
  )
);

export default useCartStore;
