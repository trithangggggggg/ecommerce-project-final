import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse, PageResponse } from '../../models/api.model';
import type { Category } from '../../models/product.model';

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  showOnHome?: boolean;
  status?: boolean;
}

export const categoryApiService = {
  async getPublicCategories(): Promise<Category[]> {
    const res = await axiosClient.get<ApiResponse<Category[]>>(ENDPOINTS.CATEGORIES);
    const data = res.data?.data;
    return Array.isArray(data) ? data : [];
  },

  async searchAdminCategories(params?: {
    keyword?: string;
    status?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Category>> {
    const res = await axiosClient.get<ApiResponse<PageResponse<Category>>>(ENDPOINTS.ADMIN_CATEGORIES.LIST, {
      params,
    });
    return res.data?.data;
  },

  async getAdminCategoryById(id: number): Promise<Category> {
    const res = await axiosClient.get<ApiResponse<Category>>(ENDPOINTS.ADMIN_CATEGORIES.DETAIL(id));
    return res.data?.data;
  },

  async createCategory(payload: CategoryPayload): Promise<Category> {
    const res = await axiosClient.post<ApiResponse<Category>>(ENDPOINTS.ADMIN_CATEGORIES.LIST, payload);
    return res.data?.data;
  },

  async updateCategory(id: number, payload: CategoryPayload): Promise<Category> {
    const res = await axiosClient.put<ApiResponse<Category>>(ENDPOINTS.ADMIN_CATEGORIES.DETAIL(id), payload);
    return res.data?.data;
  },

  async toggleCategoryStatus(id: number, status?: boolean): Promise<Category> {
    const res = await axiosClient.patch<ApiResponse<Category>>(
      ENDPOINTS.ADMIN_CATEGORIES.STATUS(id),
      status !== undefined ? { status } : undefined
    );
    return res.data?.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_CATEGORIES.DETAIL(id));
  },
};

