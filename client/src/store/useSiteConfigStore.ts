import { create } from 'zustand';
import { settingService, type PublicSiteConfig } from '../api/services/setting.service';
import { policyService, type PolicyItem } from '../api/services/policy.service';

const DEFAULT_CONFIG: PublicSiteConfig = {
  values: {},
  shipping: {
    freeshipThreshold: 20_000_000,
    halfShipThreshold: 10_000_000,
    defaultFee: 30_000,
    estimatedLeadTime: '2 - 3 ngày làm việc',
  },
  payment: {
    codEnabled: true,
    sepayEnabled: true,
    vnpayEnabled: false,
  },
  store: {
    name: 'NEXOR Technology Store',
    shortName: 'NEXOR',
    tagline: 'Hệ sinh thái Công nghệ & Trải nghiệm AI',
    hotline: '1800 6688',
    hotlineLabel: '1800 6688 (Miễn phí)',
    email: 'support@nexor.vn',
    address: 'Tầng 12, Tòa nhà Nexor Tower, Quận 1, TP. Hồ Chí Minh',
    openHours: '08:00 - 22:00 (Thứ 2 - Chủ Nhật)',
    copyright: '© 2026 NEXOR Technology. Bảo lưu mọi quyền.',
  },
  social: {
    facebookUrl: '',
    youtubeUrl: '',
    zaloUrl: '',
  },
  general: {
    wheelEnabled: true,
    promoTickerText: '',
    flashSaleBannerTitle: 'GIỜ VÀNG GIÁ SỐC - SĂN DEAL CHÍNH HÃNG',
  },
};

interface SiteConfigStore {
  config: PublicSiteConfig;
  policies: PolicyItem[];
  isLoaded: boolean;
  isLoading: boolean;
  fetchSiteConfig: (force?: boolean) => Promise<void>;
  refreshPolicies: () => Promise<void>;
}

export const useSiteConfigStore = create<SiteConfigStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  policies: [],
  isLoaded: false,
  isLoading: false,

  fetchSiteConfig: async (force = false) => {
    if (get().isLoading) return;
    if (get().isLoaded && !force) return;
    set({ isLoading: true });
    try {
      const [cfg, pols] = await Promise.all([
        settingService.getPublicSettings().catch(() => null),
        policyService.getPublicPolicies().catch(() => []),
      ]);
      set({
        config: cfg ? { ...DEFAULT_CONFIG, ...cfg } : get().config,
        policies: Array.isArray(pols) ? pols : get().policies,
        isLoaded: cfg !== null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshPolicies: async () => {
    try {
      const pols = await policyService.getPublicPolicies();
      set({ policies: pols });
    } catch {
      // Keep current policies if error
    }
  },
}));

