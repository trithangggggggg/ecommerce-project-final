import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BannerItem } from '../models/banner.model';
import { STORAGE_KEYS } from '../constants/storageKeys';


export const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'banner-default-1',
    title: 'ASUS TUF F15 - Chiến game mạnh mẽ',
    subtitle: 'Hiệu năng ấn tượng, thiết kế bền bỉ dành cho game thủ',
    imageUrl: 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/asus_tuf_f15_fxuvax.jpg',
    linkUrl: '/products',
    order: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'banner-default-2',
    title: 'Tai nghe gaming HyperX Cloud III',
    subtitle: 'Âm thanh sống động, trải nghiệm gaming đỉnh cao',
    imageUrl: 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_tai_nghe_hyper_cloud_3_bwvebf.jpg',
    linkUrl: '/products',
    order: 2,
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'banner-default-3',
    title: 'Bảng vẽ điện tử XP-Pen Artist 24 Pro',
    subtitle: 'Khơi nguồn sáng tạo, nâng tầm trải nghiệm thiết kế',
    imageUrl: 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_bang_ve_dien_tru_r1iezy.jpg',
    linkUrl: '/products',
    order: 3,
    isActive: true,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'banner-default-4',
    title: 'Chuột gaming Razer DeathAdder Essential',
    subtitle: 'Thiết kế công thái học, kiểm soát chính xác trong từng trận đấu',
    imageUrl: 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763665/chu%E1%BB%99t_gaming_razer_deathadder_essential_m5s1he.jpg',
    linkUrl: '/products',
    order: 4,
    isActive: true,
    createdAt: '2026-01-04T00:00:00.000Z',
  },
];


interface BannerStore {
  banners: BannerItem[];
  addBanner: (banner: Omit<BannerItem, 'id' | 'order' | 'createdAt'>) => void;
  updateBanner: (id: string, updates: Partial<BannerItem>) => void;
  deleteBanner: (id: string) => void;
  moveBanner: (id: string, direction: 'up' | 'down') => void;
  toggleActive: (id: string) => void;
  resetToDefault: () => void;
  getActiveBanners: () => BannerItem[];
}

export const useBannerStore = create<BannerStore>()(
  persist(
    (set, get) => ({
      banners: DEFAULT_BANNERS,

      addBanner: (newBannerData) => {
        const currentBanners = get().banners;
        const maxOrder = currentBanners.length > 0 ? Math.max(...currentBanners.map((b) => b.order)) : 0;
        const newBanner: BannerItem = {
          ...newBannerData,
          id: `banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          order: maxOrder + 1,
          createdAt: new Date().toISOString(),
        };

        set({ banners: [...currentBanners, newBanner] });
      },

      updateBanner: (id, updates) => {
        set((state) => ({
          banners: state.banners.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      deleteBanner: (id) => {
        set((state) => {
          const filtered = state.banners.filter((item) => item.id !== id);
          // Re-index orders
          const reordered = filtered.map((item, index) => ({
            ...item,
            order: index + 1,
          }));
          return { banners: reordered };
        });
      },

      moveBanner: (id, direction) => {
        set((state) => {
          const sorted = [...state.banners].sort((a, b) => a.order - b.order);
          const index = sorted.findIndex((item) => item.id === id);
          if (index === -1) return state;

          if (direction === 'up' && index > 0) {
            // Swap with previous item
            const prev = sorted[index - 1];
            const current = sorted[index];
            const tempOrder = prev.order;
            prev.order = current.order;
            current.order = tempOrder;
          } else if (direction === 'down' && index < sorted.length - 1) {
            // Swap with next item
            const next = sorted[index + 1];
            const current = sorted[index];
            const tempOrder = next.order;
            next.order = current.order;
            current.order = tempOrder;
          }

          return { banners: [...sorted].sort((a, b) => a.order - b.order) };
        });
      },

      toggleActive: (id) => {
        set((state) => ({
          banners: state.banners.map((item) =>
            item.id === id ? { ...item, isActive: !item.isActive } : item
          ),
        }));
      },

      resetToDefault: () => {
        set({ banners: DEFAULT_BANNERS });
      },

      getActiveBanners: () => {
        return get()
          .banners.filter((b) => b.isActive)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: STORAGE_KEYS.BANNER_STORAGE,
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return { banners: DEFAULT_BANNERS };
        }
        return persistedState;
      },
    }
  )
);
