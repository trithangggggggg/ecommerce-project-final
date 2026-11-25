import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { VisualSearchResponse } from '../../models/visualSearch.model';

export const visualSearchService = {
  /**
   * Gọi API Backend để tìm kiếm sản phẩm bằng hình ảnh (AI Vision + Kho hàng NEXOR).
   * Toàn bộ dữ liệu sản phẩm, phân tích thị giác và thuật toán so khớp được xử lý 100% tại Backend.
   */
  async search(
    input: File | Blob | string,
    onProgressUpdate?: (step: string) => void
  ): Promise<VisualSearchResponse> {
    onProgressUpdate?.('Giai đoạn 1: Đang gửi hình ảnh lên hệ thống AI phân tích...');

    const formData = new FormData();

    if (typeof input === 'string') {
      const res = await fetch(input);
      const blob = await res.blob();
      const filename = input.split('/').pop() || 'image-url.jpg';
      formData.append('image', new File([blob], filename, { type: blob.type || 'image/jpeg' }));
    } else if (input instanceof File) {
      formData.append('image', input);
    } else if (input instanceof Blob) {
      formData.append('image', new File([input], 'captured-photo.jpg', { type: input.type || 'image/jpeg' }));
    }

    onProgressUpdate?.('Giai đoạn 2: AI đang đối soát và so khớp sản phẩm trong kho hàng...');

    const response = await axiosClient.post<{ data: VisualSearchResponse } | VisualSearchResponse>(
      ENDPOINTS.AI.VISUAL_SEARCH,
      formData,
      {
        timeout: 30000,
      }
    );

    const resData: VisualSearchResponse = (response as any)?.data?.data || (response as any)?.data;
    if (!resData) {
      throw new Error('Máy chủ không trả về kết quả tìm kiếm hợp lệ.');
    }

    onProgressUpdate?.('Hoàn tất tìm kiếm!');
    return resData;
  },
};

export default visualSearchService;
