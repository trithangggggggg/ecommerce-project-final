import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { WheelStatusResponse, WheelSpinResponse } from '../../models/wheel.model';

export const wheelService = {
  /**
   * Lấy cấu hình và trạng thái lượt quay hôm nay
   */
  async getStatus(): Promise<WheelStatusResponse> {
    const res = await axiosClient.get<ApiResponse<WheelStatusResponse>>(ENDPOINTS.WHEEL.STATUS);
    return res.data.data;
  },

  /**
   * Thực hiện quay thưởng vòng quay may mắn
   */
  async spin(): Promise<WheelSpinResponse> {
    const res = await axiosClient.post<ApiResponse<WheelSpinResponse>>(ENDPOINTS.WHEEL.SPIN);
    return res.data.data;
  },
};

export default wheelService;

