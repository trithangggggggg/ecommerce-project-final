import { create } from 'zustand';
import { wishlistService } from '../api/services/wishlist.service';
import type { Product } from '../models/product.model';

interface WishlistState {
  productIds: number[];
  items: Product[];
  isLoading: boolean;
  hasLoadedIds: boolean;
  fetchWishlistIds: () => Promise<void>;
  fetchWishlistItems: () => Promise<void>;
  toggleItem: (productId: number | string) => Promise<boolean>;
  removeItem: (productId: number | string) => Promise<void>;
  isLiked: (productId: number | string | undefined | null) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: [],
  items: [],
  isLoading: false,
  hasLoadedIds: false,

  fetchWishlistIds: async () => {
    try {
      const ids = await wishlistService.getMyWishlistIds();
      set({ productIds: ids.map(Number), hasLoadedIds: true });
    } catch {
      set({ productIds: [], hasLoadedIds: false });
    }
  },

  fetchWishlistItems: async () => {
    set({ isLoading: true });
    try {
      const products = await wishlistService.getMyWishlist();
      set({
        items: products,
        productIds: products.map((p) => Number(p.id)),
        isLoading: false,
        hasLoadedIds: true,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleItem: async (productId: number | string): Promise<boolean> => {
    const numericId = Number(productId);
    const res = await wishlistService.toggleWishlist(numericId);
    const liked = Boolean(res?.liked);
    const nextIds = Array.isArray(res?.productIds)
      ? res.productIds.map(Number)
      : liked
        ? Array.from(new Set([...get().productIds, numericId]))
        : get().productIds.filter((id) => id !== numericId);

    set((state) => ({
      productIds: nextIds,
      items: liked ? state.items : state.items.filter((p) => Number(p.id) !== numericId),
      hasLoadedIds: true,
    }));
    return liked;
  },

  removeItem: async (productId: number | string): Promise<void> => {
    const numericId = Number(productId);
    await wishlistService.removeFromWishlist(numericId);
    set((state) => ({
      productIds: state.productIds.filter((id) => id !== numericId),
      items: state.items.filter((p) => Number(p.id) !== numericId),
    }));
  },

  isLiked: (productId: number | string | undefined | null): boolean => {
    if (productId === undefined || productId === null) return false;
    return get().productIds.includes(Number(productId));
  },

  clear: () => set({ productIds: [], items: [], isLoading: false, hasLoadedIds: false }),
}));

