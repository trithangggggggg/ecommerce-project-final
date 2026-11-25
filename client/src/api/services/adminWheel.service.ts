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
   * Lấy chi tiết một bản ghi lịch sử quay thưởng
   * GET /api/admin/wheel/history/{id}
   */
  async getHistoryById(id: number): Promise<AdminWheelSpinHistoryItem> {
    const response = await axiosClient.get<ApiResponse<AdminWheelSpinHistoryItem>>(
      ENDPOINTS.ADMIN_WHEEL.HISTORY_DETAIL(id)
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
   * Lấy danh sách ô phần thưởng phân trang cho Admin (bao gồm cả ACTIVE & INACTIVE)
   * GET /api/admin/wheel/rewards/paged
   */
  async getRewardsPaged(params?: { keyword?: string; isActive?: boolean; page?: number; size?: number }): Promise<PageResponse<WheelReward>> {
    const response = await axiosClient.get<ApiResponse<PageResponse<WheelReward>>>(
      ENDPOINTS.ADMIN_WHEEL.REWARDS_PAGED,
      { params }
    );
    return response.data?.data;
  },

  async getRewardById(id: number): Promise<WheelReward> {
    const response = await axiosClient.get<ApiResponse<WheelReward>>(
      ENDPOINTS.ADMIN_WHEEL.REWARD_DETAIL(id)
    );
    return response.data?.data;
  },

  async createReward(payload: Partial<WheelReward>): Promise<WheelReward> {
    const response = await axiosClient.post<ApiResponse<WheelReward>>(
      ENDPOINTS.ADMIN_WHEEL.REWARDS,
      payload
    );
    return response.data?.data;
  },

  async updateReward(id: number, payload: Partial<WheelReward>): Promise<WheelReward> {
    const response = await axiosClient.put<ApiResponse<WheelReward>>(
      ENDPOINTS.ADMIN_WHEEL.REWARD_DETAIL(id),
      payload
    );
    return response.data?.data;
  },

  async toggleRewardStatus(id: number, isActive?: boolean): Promise<WheelReward> {
    const response = await axiosClient.patch<ApiResponse<WheelReward>>(
      ENDPOINTS.ADMIN_WHEEL.REWARD_STATUS(id),
      isActive !== undefined ? { isActive } : undefined
    );
    return response.data?.data;
  },

  async deleteReward(id: number): Promise<void> {
    await axiosClient.delete<ApiResponse<void>>(
      ENDPOINTS.ADMIN_WHEEL.REWARD_DETAIL(id)
    );
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

