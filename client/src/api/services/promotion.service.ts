import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { PromoItem } from '../../pages/admin/AdminPromotionsPage';

export const promotionService = {
  async getPromotions(): Promise<PromoItem[]> {
    const response = await axiosClient.get<ApiResponse<PromoItem[]>>(
      ENDPOINTS.ADMIN_PROMOTIONS.LIST
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  async createPromotion(promo: Omit<PromoItem, 'id'>): Promise<PromoItem> {
    const response = await axiosClient.post<ApiResponse<PromoItem>>(
      ENDPOINTS.ADMIN_PROMOTIONS.LIST,
      promo
    );
    return response.data?.data || (response.data as unknown as PromoItem);
  },

  async updatePromotion(id: number, promo: Partial<PromoItem>): Promise<PromoItem> {
    const response = await axiosClient.put<ApiResponse<PromoItem>>(
      ENDPOINTS.ADMIN_PROMOTIONS.DETAIL(id),
      promo
    );
    return response.data?.data || (response.data as unknown as PromoItem);
  },

  async deletePromotion(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_PROMOTIONS.DETAIL(id));
  },
};
