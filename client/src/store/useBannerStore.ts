import { create } from 'zustand';
import { bannerService, type BannerItem } from '../api/services/banner.service';

export type Banner = BannerItem;

interface BannerStore {
  banners: BannerItem[];
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  fetchBanners: (force?: boolean) => Promise<void>;
}

export const useBannerStore = create<BannerStore>((set, get) => ({
  banners: [],
  isLoading: false,
  isLoaded: false,
  hasError: false,

  fetchBanners: async (force = false) => {
    if (get().isLoading) return;
    if (get().isLoaded && !force) return;
    set({ isLoading: true, hasError: false });
    try {
      const list = await bannerService.getPublicBanners();
      set({ banners: list, isLoaded: true, hasError: false });
    } catch {
      set({ banners: get().banners, isLoaded: false, hasError: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));
