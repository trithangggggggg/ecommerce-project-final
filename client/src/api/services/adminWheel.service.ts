import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse, PageResponse } from '../../models/api.model';
import type {
  AdminWheelSpinHistoryItem,
  AdminWheelStatsResponse,
  AdminWheelHistoryParams,
  WheelReward,
} from '../../models/wheel.model';

export const adminWheelService = {
  /**
   * Lấy lịch sử quay thưởng phân trang và tìm kiếm
   * GET /api/admin/wheel/history
   */
  async getHistory(params?: AdminWheelHistoryParams): Promise<PageResponse<AdminWheelSpinHistoryItem>> {
    const response = await axiosClient.get<ApiResponse<PageResponse<AdminWheelSpinHistoryItem>>>(
      ENDPOINTS.ADMIN_WHEEL.HISTORY,
      { params }
    );
    return response.data?.data;
  },

  /**
   * Lấy thống kê tổng quan vòng quay
   * GET /api/admin/wheel/stats
   */
  async getStats(): Promise<AdminWheelStatsResponse> {
    const response = await axiosClient.get<ApiResponse<AdminWheelStatsResponse>>(
      ENDPOINTS.ADMIN_WHEEL.STATS
    );
    return response.data?.data;
  },

  /**
   * Lấy danh sách 8 ô phần thưởng cấu hình
   * GET /api/admin/wheel/rewards
   */
  async getRewards(): Promise<WheelReward[]> {
    const response = await axiosClient.get<ApiResponse<WheelReward[]>>(
      ENDPOINTS.ADMIN_WHEEL.REWARDS
    );
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Xóa bản ghi lịch sử quay thưởng
   * DELETE /api/admin/wheel/history/{id}
   */
  async deleteHistory(id: number): Promise<void> {
    await axiosClient.delete<ApiResponse<void>>(
      ENDPOINTS.ADMIN_WHEEL.DELETE_HISTORY(id)
    );
  },

  /**
   * Reset lượt quay hôm nay cho một người dùng cụ thể
   * POST /api/admin/wheel/reset-user/{userId}
   */
  async resetUserSpin(userId: number): Promise<void> {
    await axiosClient.post<ApiResponse<void>>(
      ENDPOINTS.ADMIN_WHEEL.RESET_USER(userId)
    );
  },
};

