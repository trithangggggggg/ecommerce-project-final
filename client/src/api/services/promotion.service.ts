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
  type?: 'ORDER' | 'SHIPPING';
  isValid?: boolean;
  valid?: boolean;
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

  async applyPromotion(code: string, subtotal: number, shippingFee?: number): Promise<PromotionCheckResult> {
    const response = await axiosClient.post<ApiResponse<PromotionCheckResult>>(
      ENDPOINTS.PROMOTIONS.APPLY,
      { code, subtotal, shippingFee }
    );
    return response.data?.data || (response.data as unknown as PromotionCheckResult);
  },

  async checkPromotion(code: string, subtotal: number, shippingFee?: number): Promise<PromotionCheckResult> {
    return this.applyPromotion(code, subtotal, shippingFee);
  },

  async getAvailablePromotions(): Promise<PromoItem[]> {
    const response = await axiosClient.get<ApiResponse<PromoItem[]>>(
      ENDPOINTS.PROMOTIONS.AVAILABLE
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  async getPromotionById(id: number): Promise<PromoItem> {
    const response = await axiosClient.get<ApiResponse<PromoItem>>(
      ENDPOINTS.ADMIN_PROMOTIONS.DETAIL(id)
    );
    return response.data?.data || (response.data as unknown as PromoItem);
  },

  async createPromotion(promo: Omit<PromoItem, 'id' | 'usedCount'> & { usedCount?: number }): Promise<PromoItem> {
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

  async togglePromotionStatus(id: number, status?: 'ACTIVE' | 'INACTIVE'): Promise<PromoItem> {
    const response = await axiosClient.put<ApiResponse<PromoItem>>(
      ENDPOINTS.ADMIN_PROMOTIONS.STATUS(id),
      null,
      status ? { params: { status } } : undefined
    );
    return response.data?.data || (response.data as unknown as PromoItem);
  },

  async deletePromotion(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_PROMOTIONS.DETAIL(id));
  },
};
