import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { ShippingCarrier } from '../../pages/admin/AdminShippingPage';

export const shippingService = {
  async getCarriers(): Promise<ShippingCarrier[]> {
    const response = await axiosClient.get<ApiResponse<ShippingCarrier[]>>(
      ENDPOINTS.ADMIN_SHIPPING_CARRIERS.LIST
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  async createCarrier(carrier: Omit<ShippingCarrier, 'id'>): Promise<ShippingCarrier> {
    const response = await axiosClient.post<ApiResponse<ShippingCarrier>>(
      ENDPOINTS.ADMIN_SHIPPING_CARRIERS.LIST,
      carrier
    );
    return response.data?.data || (response.data as unknown as ShippingCarrier);
  },

  async updateCarrier(id: number, carrier: Partial<ShippingCarrier>): Promise<ShippingCarrier> {
    const response = await axiosClient.put<ApiResponse<ShippingCarrier>>(
      ENDPOINTS.ADMIN_SHIPPING_CARRIERS.DETAIL(id),
      carrier
    );
    return response.data?.data || (response.data as unknown as ShippingCarrier);
  },

  async deleteCarrier(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_SHIPPING_CARRIERS.DETAIL(id));
  },
};
