import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse, PageResponse } from '../../models/api.model';

export interface FlashSaleProductItem {
  id?: number;
  productId: number;
  productName?: string;
  productBrand?: string;
  productImageUrl?: string;
  salePrice: number;
  originalPrice?: number;
  discountPercent?: number;
  stockLimit: number;
  soldCount: number;
  remainingStock?: number;
  displayOrder?: number;
}

export interface FlashSaleDto {
  id: number;
  title: string;
  description?: string | null;
  badgeText?: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
  remainingSeconds: number;
  runtimeStatus: 'LIVE' | 'UPCOMING' | 'ENDED' | 'INACTIVE' | string;
  itemCount: number;
  items?: FlashSaleProductItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlashSalePayload {
  title: string;
  description?: string;
  badgeText?: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  items: Array<{
    productId: number;
    salePrice: number;
    originalPrice?: number;
    stockLimit: number;
    soldCount?: number;
    displayOrder?: number;
  }>;
}

export const flashSaleService = {
  async getCurrentFlashSale(): Promise<FlashSaleDto | null> {
    try {
      const res = await axiosClient.get<ApiResponse<FlashSaleDto | null>>(ENDPOINTS.FLASH_SALES.CURRENT);
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  async searchAdminFlashSales(params?: {
    keyword?: string;
    isActive?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<FlashSaleDto>> {
    const res = await axiosClient.get<ApiResponse<PageResponse<FlashSaleDto>>>(ENDPOINTS.ADMIN_FLASH_SALES.LIST, {
      params,
    });
    return res.data?.data;
  },

  async getFlashSaleById(id: number): Promise<FlashSaleDto> {
    const res = await axiosClient.get<ApiResponse<FlashSaleDto>>(ENDPOINTS.ADMIN_FLASH_SALES.DETAIL(id));
    return res.data?.data;
  },

  async createFlashSale(payload: FlashSalePayload): Promise<FlashSaleDto> {
    const res = await axiosClient.post<ApiResponse<FlashSaleDto>>(ENDPOINTS.ADMIN_FLASH_SALES.LIST, payload);
    return res.data?.data;
  },

  async updateFlashSale(id: number, payload: FlashSalePayload): Promise<FlashSaleDto> {
    const res = await axiosClient.put<ApiResponse<FlashSaleDto>>(ENDPOINTS.ADMIN_FLASH_SALES.DETAIL(id), payload);
    return res.data?.data;
  },

  async toggleFlashSaleStatus(id: number, isActive?: boolean): Promise<FlashSaleDto> {
    const res = await axiosClient.patch<ApiResponse<FlashSaleDto>>(
      ENDPOINTS.ADMIN_FLASH_SALES.STATUS(id),
      isActive !== undefined ? { isActive } : undefined
    );
    return res.data?.data;
  },

  async deleteFlashSale(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_FLASH_SALES.DETAIL(id));
  },
};

