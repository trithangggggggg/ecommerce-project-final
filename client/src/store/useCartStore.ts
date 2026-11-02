// ============================================================
// useCartStore — Zustand store quản lý giỏ hàng theo variantId
// Persist: dữ liệu giỏ hàng được lưu vào localStorage, F5 không mất
// Storage name: 'cart-storage' (STORAGE_KEYS.CART_STORAGE)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../models/product.model';
import { STORAGE_KEYS } from '../constants/storageKeys';

// --------------------------------------------------------
// Kết quả trả về của addItem để caller biết trạng thái
// --------------------------------------------------------
export interface AddItemResult {
  /** true nếu thêm thành công (kể cả bị giới hạn stock) */
  success: boolean;
  /** true nếu đã đạt hoặc vượt maxStock (không thêm được thêm) */
  maxStockReached: boolean;
  /** Số lượng thực tế được thêm vào (có thể bị giới hạn bởi maxStock) */
  addedQty: number;
  maxStock: number;
}

// --------------------------------------------------------
// CartStore interface
// --------------------------------------------------------
interface CartStore {
  items: CartItem[];
  /** Tổng số lượng tất cả sản phẩm trong giỏ */
  totalItems: number;
  /** Tổng tiền tạm tính */
  totalPrice: number;
  /** Alias cho totalPrice (subtotal) */
  subtotal: number;

  addItem: (product: Product, variantOrQty?: ProductVariant | number, quantity?: number) => AddItemResult;
  removeItem: (variantId: number, productId?: number) => void;
  updateQuantity: (variantId: number, quantity: number, productId?: number) => void;
  increaseQuantity: (variantId: number, productId?: number) => boolean;
  decreaseQuantity: (variantId: number, productId?: number) => void;
  clearCart: () => void;
  syncCart: () => void;
}

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------

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
  if (typeof item.product.stock === 'number' && item.product.stock > 0) {
    return item.product.stock;
  }
  return 999;
}

function calcTotals(items: CartItem[]) {
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + getItemPrice(i) * i.quantity, 0);
  return {
    totalItems,
    totalPrice,
    subtotal: totalPrice,
  };
}

/**
 * So sánh item trong giỏ với (variantId, productId) được truyền vào.
 * Ưu tiên khớp theo variantId trước, fallback về productId nếu item không có variant.
 */
function isMatch(item: CartItem, variantId: number, productId?: number): boolean {
  // Ưu tiên: khớp theo variantId
  if (item.variantId && item.variantId === variantId) return true;
  if (item.variant && item.variant.id === variantId) return true;
  // Fallback: nếu productId được truyền vào và item không có variantId
  if (productId && !item.variantId && item.product.id === productId) return true;
  // Legacy: nếu variantId chính là product.id và item không có variant
  if (!item.variantId && !item.variant && item.product.id === variantId) return true;
  return false;
}

// --------------------------------------------------------
// Store
// --------------------------------------------------------
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      subtotal: 0,

      // ----------------------------------------------------
      // addItem: Thêm sản phẩm vào giỏ hàng
      // - Nếu variantId đã tồn tại: cộng dồn quantity
      // - Nếu chưa tồn tại: thêm dòng mới
      // - Không cho vượt maxStock
      // - Trả về AddItemResult để caller xử lý Toast
      // ----------------------------------------------------
      addItem: (product, variantOrQty, maybeQty): AddItemResult => {
        let variant: ProductVariant | undefined;
        let requestedQty = 1;

        if (typeof variantOrQty === 'number') {
          requestedQty = variantOrQty;
          variant = undefined;
        } else {
          variant = variantOrQty;
          requestedQty = typeof maybeQty === 'number' ? maybeQty : 1;
        }

        // Validate: số lượng tối thiểu phải là 1
        if (requestedQty < 1) {
          requestedQty = 1;
        }

        // Validate: Bắt buộc người dùng phải đăng nhập mới được thêm vào giỏ hàng
        const hasAuth =
          typeof window !== 'undefined' &&
          (Boolean(localStorage.getItem(STORAGE_KEYS.TOKEN)) ||
            Boolean(localStorage.getItem(STORAGE_KEYS.USER)));
        if (!hasAuth) {
          return { success: false, maxStockReached: false, addedQty: 0, maxStock: 0 };
        }

        // Validate: product phải hợp lệ
        if (!product || !product.id) {
          return { success: false, maxStockReached: false, addedQty: 0, maxStock: 0 };
        }

        const items = [...get().items];

        // Nếu không có variant được truyền vào, lấy variant đầu tiên nếu sản phẩm có
        const activeVariant =
          variant ||
          (product.variants && product.variants.length > 0 ? product.variants[0] : undefined);
        const activeVariantId = activeVariant?.id;

        // Tính maxStock từ variant hoặc product
        const maxStock = activeVariant
          ? (activeVariant.stock ?? 999)
          : product.stock !== undefined && product.stock > 0
          ? product.stock
          : 999;

        // Tìm item đã tồn tại trong giỏ (theo variantId trước, productId sau)
        const existingIndex = items.findIndex((i) => {
          if (activeVariantId) {
            return (
              (i.variantId && i.variantId === activeVariantId) ||
              i.variant?.id === activeVariantId
            );
          }
          // Nếu không có variant: khớp theo productId
          return !i.variantId && !i.variant && i.product.id === product.id;
        });

        if (existingIndex > -1) {
          // Sản phẩm đã có trong giỏ → cộng dồn quantity
          const current = items[existingIndex];
          const currentQty = current.quantity;

          if (currentQty >= maxStock) {
            // Đã đạt tối đa, không thêm được
            return { success: false, maxStockReached: true, addedQty: 0, maxStock };
          }

          const newQty = Math.min(currentQty + requestedQty, maxStock);
          const actualAdded = newQty - currentQty;
          items[existingIndex] = {
            ...current,
            variantId: activeVariantId || current.variantId,
            variant: activeVariant || current.variant,
            product,
            quantity: newQty,
          };

          set({ items, ...calcTotals(items) });
          return {
            success: true,
            maxStockReached: newQty >= maxStock,
            addedQty: actualAdded,
            maxStock,
          };
        } else {
          // Sản phẩm chưa có trong giỏ → thêm dòng mới
          const addedQty = Math.min(requestedQty, maxStock);
          items.push({
            variantId: activeVariantId,
            variant: activeVariant,
            product,
            quantity: addedQty,
          });
          set({ items, ...calcTotals(items) });
          return {
            success: true,
            maxStockReached: addedQty >= maxStock,
            addedQty,
            maxStock,
          };
        }
      },

      // ----------------------------------------------------
      // removeItem: Xóa một sản phẩm khỏi giỏ hàng
      // ----------------------------------------------------
      removeItem: (variantId, productId) => {
        const items = get().items.filter((i) => !isMatch(i, variantId, productId));
        set({ items, ...calcTotals(items) });
      },

      // ----------------------------------------------------
      // updateQuantity: Cập nhật số lượng sản phẩm
      // - quantity < 1: xóa sản phẩm
      // - quantity > maxStock: giới hạn về maxStock
      // ----------------------------------------------------
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
              quantity: Math.min(Math.max(1, quantity), maxStock),
            };
          }
          return i;
        });

        set({ items, ...calcTotals(items) });
      },

      // ----------------------------------------------------
      // increaseQuantity: Tăng số lượng 1 đơn vị
      // Trả về true nếu tăng thành công, false nếu đã đạt maxStock
      // ----------------------------------------------------
      increaseQuantity: (variantId, productId): boolean => {
        const item = get().items.find((i) => isMatch(i, variantId, productId));
        if (!item) return false;
        const maxStock = getItemMaxStock(item);
        if (item.quantity >= maxStock) return false;
        get().updateQuantity(variantId, item.quantity + 1, productId);
        return true;
      },

      // ----------------------------------------------------
      // decreaseQuantity: Giảm số lượng 1 đơn vị (tối thiểu 1)
      // ----------------------------------------------------
      decreaseQuantity: (variantId, productId) => {
        const item = get().items.find((i) => isMatch(i, variantId, productId));
        if (item && item.quantity > 1) {
          get().updateQuantity(variantId, item.quantity - 1, productId);
        }
      },

      // ----------------------------------------------------
      // clearCart: Xóa toàn bộ giỏ hàng
      // ----------------------------------------------------
      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0, subtotal: 0 });
      },

      // ----------------------------------------------------
      // syncCart: Đồng bộ lại tổng tiền và số lượng
      // ----------------------------------------------------
      syncCart: () => {
        const currentItems = get().items;
        set({ ...calcTotals(currentItems) });
      },
    }),
    {
      name: STORAGE_KEYS.CART_STORAGE,
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          // Reset legacy cart để tránh lỗi runtime với dữ liệu cũ
          return { items: [], totalItems: 0, totalPrice: 0, subtotal: 0 };
        }
        // Đảm bảo subtotal được sync khi rehydrate từ storage cũ
        const state = persistedState as Partial<CartStore>;
        if (state && state.items) {
          const totalPrice =
            state.totalPrice ??
            state.items.reduce((sum, i) => sum + getItemPrice(i) * i.quantity, 0);
          return { ...state, subtotal: totalPrice, totalPrice };
        }
        return persistedState as CartStore;
      },
      // Sau khi rehydrate, sync lại subtotal để đảm bảo chính xác
      onRehydrateStorage: () => (state) => {
        if (state) {
          const totals = calcTotals(state.items || []);
          state.totalItems = totals.totalItems;
          state.totalPrice = totals.totalPrice;
          state.subtotal = totals.subtotal;
        }
      },
    }
  )
);

export default useCartStore;
