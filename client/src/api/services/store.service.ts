import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { StoreLocation, StoreLocationRequest } from '../../models/store.model';

export const storeService = {
  /**
   * Lấy danh sách tất cả showroom cho Quản trị viên (gồm ACTIVE + INACTIVE)
   * GET /api/admin/stores (hoặc kèm ?province=...)
   */
  async getAdminStores(province?: string): Promise<StoreLocation[]> {
    const params = province ? { province } : undefined;
    const response = await axiosClient.get<ApiResponse<StoreLocation[]>>(
      ENDPOINTS.ADMIN_STORES.LIST,
      { params }
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy chi tiết showroom theo ID cho Quản trị viên
   * GET /api/admin/stores/{id}
   */
  async getAdminStoreById(id: number): Promise<StoreLocation> {
    const response = await axiosClient.get<ApiResponse<StoreLocation>>(
      ENDPOINTS.ADMIN_STORES.DETAIL(id)
    );
    return response.data?.data || (response.data as unknown as StoreLocation);
  },

  /**
   * Thêm showroom mới
   * POST /api/admin/stores
   */
  async createStore(payload: StoreLocationRequest): Promise<StoreLocation> {
    const response = await axiosClient.post<ApiResponse<StoreLocation>>(
      ENDPOINTS.ADMIN_STORES.LIST,
      payload
    );
    return response.data?.data || (response.data as unknown as StoreLocation);
  },

  /**
   * Cập nhật thông tin showroom
   * PUT /api/admin/stores/{id}
   */
  async updateStore(id: number, payload: Partial<StoreLocationRequest>): Promise<StoreLocation> {
    const response = await axiosClient.put<ApiResponse<StoreLocation>>(
      ENDPOINTS.ADMIN_STORES.DETAIL(id),
      payload
    );
    return response.data?.data || (response.data as unknown as StoreLocation);
  },

  /**
   * Xóa showroom khỏi hệ thống
   * DELETE /api/admin/stores/{id}
   */
  async deleteStore(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_STORES.DETAIL(id));
  },

  /**
   * Lấy danh sách showroom công khai đang hoạt động (ACTIVE)
   * GET /api/stores (hỗ trợ ?province=...)
   */
  async getPublicStores(province?: string): Promise<StoreLocation[]> {
    const params = province ? { province } : undefined;
    const response = await axiosClient.get<ApiResponse<StoreLocation[]>>(
      ENDPOINTS.STORES,
      { params }
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy chi tiết showroom công khai theo ID
   * GET /api/stores/{id}
   */
  async getPublicStoreById(id: number): Promise<StoreLocation> {
    const response = await axiosClient.get<ApiResponse<StoreLocation>>(
      ENDPOINTS.STORE_DETAIL(id)
    );
    return response.data?.data || (response.data as unknown as StoreLocation);
  },
};

export default storeService;

