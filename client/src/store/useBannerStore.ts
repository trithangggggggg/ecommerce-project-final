import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BannerItem } from '../models/banner.model';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'banner-default-1',
    title: 'MacBook Air M3 - Siêu mỏng nhẹ, hiệu năng đỉnh cao',
    subtitle: 'Chip Apple M3 thế hệ mới - Trợ giá đổi cũ lên đến 3 triệu',
    imageUrl: '/images/macbook-hero-banner.jpg',
    linkUrl: '/products/4',
    order: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'banner-default-2',
    title: 'Khám phá Hệ sinh thái Công nghệ Tương lai',
    subtitle: 'Đồng bộ thông minh, trải nghiệm liền mạch cùng Nexor Smart Ecosystem',
    imageUrl: '/images/tech-future-banner.jpg',
    linkUrl: '/products',
    order: 2,
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'banner-default-3',
    title: 'ASUS ROG Strix - Hiệu năng gaming không giới hạn',
    subtitle: 'Trang bị card đồ họa RTX 40 series, màn hình tần số quét 240Hz',
    imageUrl: '/images/asus-rog-strix.jpg',
    linkUrl: '/products',
    order: 3,
    isActive: true,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'banner-default-4',
    title: 'Hệ sinh thái Thiết bị Thông minh Nexor',
    subtitle: 'Ưu đãi thành viên: Giảm thêm 5% cho đơn hàng đầu tiên',
    imageUrl: '/images/tech-ecosystem.jpg',
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
    }
  )
);
