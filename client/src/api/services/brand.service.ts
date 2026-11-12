import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse, PageResponse } from '../../models/api.model';

export interface BrandItem {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  country?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  displayOrder: number;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandPayload {
  name: string;
  slug?: string;
  logoUrl?: string;
  country?: string;
  description?: string;
  websiteUrl?: string;
  displayOrder?: number;
  status?: boolean;
}

export const brandService = {
  async getPublicBrands(): Promise<BrandItem[]> {
    try {
      const res = await axiosClient.get<ApiResponse<BrandItem[]>>(ENDPOINTS.BRANDS);
      const data = res.data?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async searchAdminBrands(params?: {
    keyword?: string;
    status?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<BrandItem>> {
    const res = await axiosClient.get<ApiResponse<PageResponse<BrandItem>>>(ENDPOINTS.ADMIN_BRANDS.LIST, {
      params,
    });
    return res.data?.data;
  },

  async getAdminBrandById(id: number): Promise<BrandItem> {
    const res = await axiosClient.get<ApiResponse<BrandItem>>(ENDPOINTS.ADMIN_BRANDS.DETAIL(id));
    return res.data?.data;
  },

  async createBrand(payload: BrandPayload): Promise<BrandItem> {
    const res = await axiosClient.post<ApiResponse<BrandItem>>(ENDPOINTS.ADMIN_BRANDS.LIST, payload);
    return res.data?.data;
  },

  async updateBrand(id: number, payload: BrandPayload): Promise<BrandItem> {
    const res = await axiosClient.put<ApiResponse<BrandItem>>(ENDPOINTS.ADMIN_BRANDS.DETAIL(id), payload);
    return res.data?.data;
  },

  async toggleBrandStatus(id: number, status?: boolean): Promise<BrandItem> {
    const res = await axiosClient.patch<ApiResponse<BrandItem>>(
      ENDPOINTS.ADMIN_BRANDS.STATUS(id),
      status !== undefined ? { status } : undefined
    );
    return res.data?.data;
  },

  async deleteBrand(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_BRANDS.DETAIL(id));
  },
};

