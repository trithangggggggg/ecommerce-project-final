import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';

export interface ImportReceiptItemPayload {
  productId: number;
  productName?: string;
  variantId?: number;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  sellingPrice?: number;
}

export interface ImportReceiptPayload {
  receiptCode?: string;
  importDate: string;
  supplierName?: string;
  importerName?: string;
  warehouse?: string;
  note?: string;
  items: ImportReceiptItemPayload[];
}

export interface ImportReceiptItemDto {
  id: number;
  productId: number;
  productName: string;
  variantId?: number;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  sellingPrice?: number;
  totalPrice: number;
}

export interface ImportReceiptDto {
  id: number;
  receiptCode: string;
  importDate: string;
  supplierName?: string;
  importerName?: string;
  warehouse?: string;
  note?: string;
  totalQuantity: number;
  totalAmount: number;
  items: ImportReceiptItemDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ImportReceiptListResponse {
  data: ImportReceiptDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const inventoryService = {
  /**
   * Lấy danh sách phiếu nhập kho
   */
  async getReceipts(params: { page?: number; limit?: number; keyword?: string } = {}): Promise<ImportReceiptListResponse> {
    try {
      const page = params.page ? params.page - 1 : 0;
      const size = params.limit || 10;
      const queryParams: Record<string, any> = { page, size, sort: 'createdAt,desc' };
      if (params.keyword) {
        queryParams.keyword = params.keyword.trim();
      }

      const res = await axiosClient.get(ENDPOINTS.ADMIN_INVENTORY_RECEIPTS.LIST, { params: queryParams });
      const rawData = res.data?.data;

      if (rawData && Array.isArray(rawData.content)) {
        return {
          data: rawData.content,
          total: rawData.totalElements || rawData.content.length,
          page: (rawData.pageNumber || 0) + 1,
          limit: rawData.pageSize || size,
          totalPages: rawData.totalPages || 1,
        };
      } else if (Array.isArray(rawData)) {
        return {
          data: rawData,
          total: rawData.length,
          page: 1,
          limit: size,
          totalPages: 1,
        };
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu nhập kho:', err);
    }

    return {
      data: [],
      total: 0,
      page: 1,
      limit: params.limit || 10,
      totalPages: 0,
    };
  },

  /**
   * Lấy chi tiết phiếu nhập kho theo ID
   */
  async getReceiptById(id: number): Promise<ImportReceiptDto> {
    const res = await axiosClient.get(ENDPOINTS.ADMIN_INVENTORY_RECEIPTS.DETAIL(id));
    return res.data?.data;
  },

  /**
   * Tạo phiếu nhập kho và cập nhật tồn kho
   */
  async createReceipt(payload: ImportReceiptPayload): Promise<ImportReceiptDto> {
    const res = await axiosClient.post(ENDPOINTS.ADMIN_INVENTORY_RECEIPTS.LIST, payload);
    return res.data?.data;
  },
};

