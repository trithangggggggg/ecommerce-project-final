import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse, PageResponse } from '../../models/api.model';

export type BannerPosition = 'HERO_SLIDER' | 'HERO_PROMO' | 'VERTICAL_PROMO' | string;

export interface BannerItem {
  id: number;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  clickCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerPayload {
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl: string;
  linkUrl?: string;
  position: BannerPosition;
  displayOrder?: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export const bannerService = {
  async getPublicBanners(position?: string): Promise<BannerItem[]> {
    const res = await axiosClient.get<ApiResponse<BannerItem[]>>(ENDPOINTS.BANNERS, {
      params: position ? { position } : undefined,
    });
    const data = res.data?.data;
    return Array.isArray(data) ? data : [];
  },

  async trackClick(id: number): Promise<void> {
    try {
      await axiosClient.post(ENDPOINTS.BANNER_CLICK(id));
    } catch {
      // Non-blocking analytics call
    }
  },

  async searchAdminBanners(params?: {
    keyword?: string;
    position?: string;
    isActive?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<BannerItem>> {
    const res = await axiosClient.get<ApiResponse<PageResponse<BannerItem>>>(ENDPOINTS.ADMIN_BANNERS.LIST, {
      params,
    });
    return res.data?.data;
  },

  async getAdminBannerById(id: number): Promise<BannerItem> {
    const res = await axiosClient.get<ApiResponse<BannerItem>>(ENDPOINTS.ADMIN_BANNERS.DETAIL(id));
    return res.data?.data;
  },

  async createBanner(payload: BannerPayload): Promise<BannerItem> {
    const res = await axiosClient.post<ApiResponse<BannerItem>>(ENDPOINTS.ADMIN_BANNERS.LIST, payload);
    return res.data?.data;
  },

  async updateBanner(id: number, payload: BannerPayload): Promise<BannerItem> {
    const res = await axiosClient.put<ApiResponse<BannerItem>>(ENDPOINTS.ADMIN_BANNERS.DETAIL(id), payload);
    return res.data?.data;
  },

  async toggleBannerStatus(id: number, isActive?: boolean): Promise<BannerItem> {
    const res = await axiosClient.patch<ApiResponse<BannerItem>>(
      ENDPOINTS.ADMIN_BANNERS.STATUS(id),
      isActive !== undefined ? { isActive } : undefined
    );
    return res.data?.data;
  },

  async deleteBanner(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_BANNERS.DETAIL(id));
  },
};

