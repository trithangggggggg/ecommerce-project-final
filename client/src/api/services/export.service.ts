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

    // Nếu backend trả về JSON lỗi trong blob (ví dụ 400/403/500 nhưng axios nhận blob)
    if (response.data instanceof Blob && response.data.type?.includes('application/json')) {
      const text = await response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || 'Lỗi khi tải file báo cáo từ máy chủ');
      } catch {
        throw new Error(text || 'Lỗi khi tải file báo cáo từ máy chủ');
      }
    }

    // Trích xuất filename từ Content-Disposition header nếu có
    const disposition = response.headers?.['content-disposition'];
    let filename = defaultFilename;
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]*)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          filename = decodeURIComponent(utf8Match[1]);
        } catch {
          filename = utf8Match[1];
        }
      } else {
        const standardMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (standardMatch && standardMatch[1]) {
          filename = standardMatch[1].replace(/['"]/g, '').trim();
        }
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

export default exportService;
