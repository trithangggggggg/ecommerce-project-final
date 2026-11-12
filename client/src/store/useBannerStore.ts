import { create } from 'zustand';
import { bannerService, type BannerItem } from '../api/services/banner.service';

export type Banner = BannerItem;

interface BannerStore {
  banners: BannerItem[];
  isLoading: boolean;
  isLoaded: boolean;
  fetchBanners: (force?: boolean) => Promise<void>;
}

export const useBannerStore = create<BannerStore>((set, get) => ({
  banners: [],
  isLoading: false,
  isLoaded: false,

  fetchBanners: async (force = false) => {
    if (get().isLoading) return;
    if (get().isLoaded && !force) return;
    set({ isLoading: true });
    try {
      const list = await bannerService.getPublicBanners();
      set({ banners: list, isLoaded: true });
    } catch {
      set({ banners: [], isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));
