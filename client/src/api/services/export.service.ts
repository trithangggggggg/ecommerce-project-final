import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';

/**
 * Service phụ trách tải báo cáo dữ liệu lớn định dạng Excel (.xlsx) từ Backend
 */
export const exportService = {
  async downloadFile(url: string, defaultFilename: string, params?: Record<string, any>): Promise<void> {
    const response = await axiosClient.get(url, {
      params,
      responseType: 'blob',
    });

    // Trích xuất filename từ Content-Disposition header nếu có
    const disposition = response.headers?.['content-disposition'];
    let filename = defaultFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /** Xuất báo cáo đơn hàng */
  exportOrders(params?: { status?: string; fromDate?: string; toDate?: string }): Promise<void> {
    return this.downloadFile(ENDPOINTS.ADMIN_EXPORT.ORDERS, 'Bao_Cao_Don_Hang.xlsx', params);
  },

  /** Xuất báo cáo tồn kho sản phẩm */
  exportInventory(params?: { lowStockOnly?: boolean; threshold?: number }): Promise<void> {
    return this.downloadFile(ENDPOINTS.ADMIN_EXPORT.INVENTORY, 'Bao_Cao_Ton_Kho.xlsx', params);
  },

  /** Xuất báo cáo danh sách khách hàng CRM */
  exportCustomers(params?: { keyword?: string; status?: boolean }): Promise<void> {
    return this.downloadFile(ENDPOINTS.ADMIN_EXPORT.CUSTOMERS, 'Bao_Cao_Khach_Hang.xlsx', params);
  },

  /** Xuất báo cáo doanh thu tài chính theo timeline */
  exportRevenue(params?: { range?: '7days' | '30days' | 'month' | 'year' | string }): Promise<void> {
    return this.downloadFile(ENDPOINTS.ADMIN_EXPORT.REVENUE, 'Bao_Cao_Doanh_Thu.xlsx', params);
  },
};

