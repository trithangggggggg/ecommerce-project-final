import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { PromoItem } from '../../pages/admin/AdminPromotionsPage';

export interface PromotionCheckResult {
  code: string;
  title: string;
  discount: string;
  discountAmount: number;
  subtotal: number;
  finalTotal: number;
  minOrder?: string;
  expiry?: string;
  isValid: boolean;
  message?: string;
}

export const promotionService = {
  async getPromotions(): Promise<PromoItem[]> {
    const response = await axiosClient.get<ApiResponse<PromoItem[]>>(
      ENDPOINTS.ADMIN_PROMOTIONS.LIST
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  async checkPromotion(code: string, subtotal: number): Promise<PromotionCheckResult> {
    const response = await axiosClient.get<ApiResponse<PromotionCheckResult>>(
      ENDPOINTS.PROMOTIONS.CHECK,
      { params: { code, subtotal } }
    );
    return response.data?.data || (response.data as unknown as PromotionCheckResult);
  },

  async getAvailablePromotions(): Promise<PromoItem[]> {
    const response = await axiosClient.get<ApiResponse<PromoItem[]>>(
      ENDPOINTS.PROMOTIONS.AVAILABLE
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
