import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { ShippingCarrier } from '../../pages/admin/AdminShippingPage';

const normalizeCarrier = (raw: ShippingCarrier): ShippingCarrier => ({
  ...raw,
  code: raw.code ?? '',
  name: raw.name ?? '',
  serviceType: raw.serviceType ?? '',
  estimatedDelivery: raw.estimatedDelivery || '2 - 3 ngày làm việc',
  hotline: raw.hotline ?? '',
  shippingFee: Number.isFinite(Number(raw.shippingFee)) ? Number(raw.shippingFee) : 30000,
  activeOrders: Number.isFinite(Number(raw.activeOrders)) ? Number(raw.activeOrders) : 0,
  rating: raw.rating != null && Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : 5.0,
  status: raw.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
});

export const shippingService = {
  async getActiveCarriers(): Promise<ShippingCarrier[]> {
    try {
      const response = await axiosClient.get<ApiResponse<ShippingCarrier[]>>(
        ENDPOINTS.SHIPPING_CARRIERS
      );
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data.map(normalizeCarrier) : [];
    } catch {
      return [];
    }
  },

  async getCarriers(): Promise<ShippingCarrier[]> {
    const response = await axiosClient.get<ApiResponse<ShippingCarrier[]>>(
      ENDPOINTS.ADMIN_SHIPPING_CARRIERS.LIST
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data.map(normalizeCarrier) : [];
  },

  async createCarrier(carrier: Omit<ShippingCarrier, 'id'>): Promise<ShippingCarrier> {
    const response = await axiosClient.post<ApiResponse<ShippingCarrier>>(
      ENDPOINTS.ADMIN_SHIPPING_CARRIERS.LIST,
      carrier
    );
    const created = response.data?.data || (response.data as unknown as ShippingCarrier);
    return normalizeCarrier(created);
  },

  async updateCarrier(id: number, carrier: Partial<ShippingCarrier>): Promise<ShippingCarrier> {
    const response = await axiosClient.put<ApiResponse<ShippingCarrier>>(
      ENDPOINTS.ADMIN_SHIPPING_CARRIERS.DETAIL(id),
      carrier
    );
    const updated = response.data?.data || (response.data as unknown as ShippingCarrier);
    return normalizeCarrier(updated);
  },

  async deleteCarrier(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_SHIPPING_CARRIERS.DETAIL(id));
  },
};
