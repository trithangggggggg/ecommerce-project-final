import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { SupplierItem } from '../../pages/admin/AdminSuppliersPage';

export const supplierService = {
  async getSuppliers(): Promise<SupplierItem[]> {
    const response = await axiosClient.get<ApiResponse<SupplierItem[]>>(
      ENDPOINTS.ADMIN_SUPPLIERS.LIST
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  async createSupplier(supplier: Omit<SupplierItem, 'id'>): Promise<SupplierItem> {
    const response = await axiosClient.post<ApiResponse<SupplierItem>>(
      ENDPOINTS.ADMIN_SUPPLIERS.LIST,
      supplier
    );
    return response.data?.data || (response.data as unknown as SupplierItem);
  },

  async updateSupplier(id: number, supplier: Partial<SupplierItem>): Promise<SupplierItem> {
    const response = await axiosClient.put<ApiResponse<SupplierItem>>(
      ENDPOINTS.ADMIN_SUPPLIERS.DETAIL(id),
      supplier
    );
    return response.data?.data || (response.data as unknown as SupplierItem);
  },

  async deleteSupplier(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_SUPPLIERS.DETAIL(id));
  },
};
