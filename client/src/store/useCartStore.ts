// ============================================================
// useCartStore — Zustand store quản lý giỏ hàng theo variantId
// Hỗ trợ phân tách giỏ hàng độc lập theo từng tài khoản người dùng
// Lưu trữ bền vững tại localStorage (F5 không mất)
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
export interface CartStore {
  items: CartItem[];
  /** Tổng số lượng tất cả sản phẩm trong giỏ */
  totalItems: number;
  /** Tổng tiền tạm tính */
  totalPrice: number;
  /** Alias cho totalPrice (subtotal) */
  subtotal: number;

  /** ID của người dùng sở hữu giỏ hàng hiện tại */
  currentUserId: string | null;
  /** Bảng lưu giỏ hàng riêng biệt theo từng user: { [userId]: CartItem[] } */
  userCarts: Record<string, CartItem[]>;

  addItem: (product: Product, variantOrQty?: ProductVariant | number, quantity?: number) => AddItemResult;
  removeItem: (variantId: number, productId?: number) => void;
  updateQuantity: (variantId: number, quantity: number, productId?: number) => void;
  increaseQuantity: (variantId: number, productId?: number) => boolean;
  decreaseQuantity: (variantId: number, productId?: number) => void;
  clearCart: () => void;
  syncCart: () => void;

  /** Chuyển đổi giỏ hàng sang người dùng cụ thể (tự động tải giỏ hàng của user đó) */
  switchUser: (userId: number | string | null) => void;
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
 * Lấy User ID hiện tại từ localStorage
 */
function getActiveUserId(): string | null {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u) {
        if (u.id != null) return String(u.id);
        if (u.email) return String(u.email);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * So sánh item trong giỏ với (variantId, productId) được truyền vào.
 */
function isMatch(item: CartItem, variantId: number, productId?: number): boolean {
  if (item.variantId && item.variantId === variantId) return true;
  if (item.variant && item.variant.id === variantId) return true;
  if (productId && !item.variantId && item.product.id === productId) return true;
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
      currentUserId: null,
      userCarts: {},

      // ----------------------------------------------------
      // switchUser: Chuyển giỏ hàng theo tài khoản người dùng
      // - Nếu userId rỗng (đăng xuất): ẩn giỏ hàng (items = [])
      // - Nếu tài khoản mới chưa có giỏ: items = []
      // - Nếu tài khoản cũ đã có giỏ: phục hồi items của tài khoản đó
      // ----------------------------------------------------
      switchUser: (userId) => {
        const targetKey = userId != null ? String(userId) : null;
        const currentKey = get().currentUserId;

        // Lưu giỏ hàng hiện tại vào userCarts trước khi chuyển
        const updatedUserCarts = { ...get().userCarts };
        if (currentKey) {
          updatedUserCarts[currentKey] = get().items;
        }

        if (!targetKey) {
          // Đăng xuất: xóa hiển thị giỏ hàng
          set({
            currentUserId: null,
            items: [],
            totalItems: 0,
            totalPrice: 0,
            subtotal: 0,
            userCarts: updatedUserCarts,
          });
          return;
        }

        // Đăng nhập vào targetKey:
        const userItems = updatedUserCarts[targetKey] || [];
        const totals = calcTotals(userItems);

        set({
          currentUserId: targetKey,
          items: userItems,
          totalItems: totals.totalItems,
          totalPrice: totals.totalPrice,
          subtotal: totals.subtotal,
          userCarts: updatedUserCarts,
        });
      },

      // ----------------------------------------------------
      // addItem: Thêm sản phẩm vào giỏ hàng
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

        if (requestedQty < 1) {
          requestedQty = 1;
        }

        // Bắt buộc người dùng phải đăng nhập mới được thêm vào giỏ hàng
        const activeUser = getActiveUserId();
        if (!activeUser) {
          return { success: false, maxStockReached: false, addedQty: 0, maxStock: 0 };
        }

        // Đảm bảo store đang đúng user
        if (get().currentUserId !== activeUser) {
          get().switchUser(activeUser);
        }

        if (!product || !product.id) {
          return { success: false, maxStockReached: false, addedQty: 0, maxStock: 0 };
        }

        const items = [...get().items];

        const activeVariant =
          variant ||
          (product.variants && product.variants.length > 0 ? product.variants[0] : undefined);
        const activeVariantId = activeVariant?.id;

        const maxStock = activeVariant
          ? (activeVariant.stock ?? 999)
          : product.stock !== undefined && product.stock > 0
          ? product.stock
          : 999;

        const existingIndex = items.findIndex((i) => {
          if (activeVariantId) {
            return (
              (i.variantId && i.variantId === activeVariantId) ||
              i.variant?.id === activeVariantId
            );
          }
          return !i.variantId && !i.variant && i.product.id === product.id;
        });

        let result: AddItemResult;

        if (existingIndex > -1) {
          const current = items[existingIndex];
          const currentQty = current.quantity;

          if (currentQty >= maxStock) {
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

          result = {
            success: true,
            maxStockReached: newQty >= maxStock,
            addedQty: actualAdded,
            maxStock,
          };
        } else {
          const addedQty = Math.min(requestedQty, maxStock);
          items.push({
            variantId: activeVariantId,
            variant: activeVariant,
            product,
            quantity: addedQty,
          });

          result = {
            success: true,
            maxStockReached: addedQty >= maxStock,
            addedQty,
            maxStock,
          };
        }

        // Lưu vào userCarts
        const userCarts = { ...get().userCarts };
        userCarts[activeUser] = items;

        set({ items, userCarts, currentUserId: activeUser, ...calcTotals(items) });
        return result;
      },

      // ----------------------------------------------------
      // removeItem: Xóa một sản phẩm khỏi giỏ hàng
      // ----------------------------------------------------
      removeItem: (variantId, productId) => {
        const items = get().items.filter((i) => !isMatch(i, variantId, productId));
        const activeUser = get().currentUserId || getActiveUserId();
        const userCarts = { ...get().userCarts };
        if (activeUser) {
          userCarts[activeUser] = items;
        }
        set({ items, userCarts, ...calcTotals(items) });
      },

      // ----------------------------------------------------
      // updateQuantity: Cập nhật số lượng sản phẩm
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

        const activeUser = get().currentUserId || getActiveUserId();
        const userCarts = { ...get().userCarts };
        if (activeUser) {
          userCarts[activeUser] = items;
        }

        set({ items, userCarts, ...calcTotals(items) });
      },

      // ----------------------------------------------------
      // increaseQuantity
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
      // decreaseQuantity
      // ----------------------------------------------------
      decreaseQuantity: (variantId, productId) => {
        const item = get().items.find((i) => isMatch(i, variantId, productId));
        if (item && item.quantity > 1) {
          get().updateQuantity(variantId, item.quantity - 1, productId);
        }
      },

      // ----------------------------------------------------
      // clearCart: Xóa toàn bộ giỏ hàng của user hiện tại
      // ----------------------------------------------------
      clearCart: () => {
        const activeUser = get().currentUserId || getActiveUserId();
        const userCarts = { ...get().userCarts };
        if (activeUser) {
          userCarts[activeUser] = [];
        }
        set({ items: [], totalItems: 0, totalPrice: 0, subtotal: 0, userCarts });
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
      version: 3, // Bumped lên version 3 để hỗ trợ giỏ hàng theo User
      migrate: (persistedState: unknown, version: number) => {
        if (version < 3) {
          // Reset dữ liệu cũ để tránh lỗi tài khoản mới bị dính sản phẩm cũ
          return {
            items: [],
            totalItems: 0,
            totalPrice: 0,
            subtotal: 0,
            currentUserId: null,
            userCarts: {},
          };
        }
        return persistedState as CartStore;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Tự động kiểm tra user đang đăng nhập hiện tại
          const activeUser = getActiveUserId();
          if (!activeUser) {
            state.currentUserId = null;
            state.items = [];
            state.totalItems = 0;
            state.totalPrice = 0;
            state.subtotal = 0;
          } else {
            // Nạp đúng giỏ hàng của activeUser
            state.currentUserId = activeUser;
            const userItems = state.userCarts?.[activeUser] || [];
            state.items = userItems;
            const totals = calcTotals(userItems);
            state.totalItems = totals.totalItems;
            state.totalPrice = totals.totalPrice;
            state.subtotal = totals.subtotal;
          }
        }
      },
    }
  )
);

export default useCartStore;
