import React, { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportService } from '../../api/services/export.service';

export interface ExportExcelButtonProps {
  /**
   * Loại dữ liệu báo cáo cần xuất:
   * - 'orders': Báo cáo đơn hàng toàn hệ thống
   * - 'inventory': Báo cáo tồn kho sản phẩm
   * - 'customers': Báo cáo danh sách khách hàng
   * - 'reports' hoặc 'revenue': Báo cáo doanh thu & hiệu quả kinh doanh
   */
  exportType?: 'orders' | 'inventory' | 'customers' | 'reports' | 'revenue';
  /** Tham số bổ sung gửi kèm request (lọc theo khoảng thời gian, trạng thái, keyword...) */
  params?: Record<string, any>;
  /** Hàm callback tùy chỉnh nếu cần xử lý riêng */
  onExport?: () => Promise<void>;
  /** Nhãn hiển thị trên nút (mặc định: 'Xuất Excel') */
  label?: string;
  /** Nhãn hiển thị khi đang tạo và tải file (mặc định: 'Đang xuất...') */
  loadingLabel?: string;
  /** Kích thước nút bấm */
  size?: 'sm' | 'md' | 'lg';
  /** Kiểu giao diện nút bấm */
  variant?: 'outline' | 'emerald' | 'primary';
  /** Class CSS tùy biến bổ sung */
  className?: string;
  /** Vô hiệu hóa nút bấm */
  disabled?: boolean;
  /** Callback khi xuất file thành công */
  onSuccess?: () => void;
  /** Callback khi gặp lỗi xuất file */
  onError?: (error: Error) => void;
}

export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  exportType = 'orders',
  params,
  onExport,
  label = 'Xuất Excel',
  loadingLabel = 'Đang xuất...',
  size = 'md',
  variant = 'outline',
  className = '',
  disabled = false,
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || disabled) return;

    try {
      setIsLoading(true);

      if (onExport) {
        await onExport();
      } else {
        switch (exportType) {
          case 'orders':
            await exportService.exportOrders(params);
            break;
          case 'inventory':
            await exportService.exportInventory(params);
            break;
          case 'customers':
            await exportService.exportCustomers(params);
            break;
          case 'reports':
          case 'revenue':
            await exportService.exportRevenue(params);
            break;
          default:
            await exportService.exportOrders(params);
            break;
        }
      }

      onSuccess?.();
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error('Không thể xuất file Excel. Vui lòng thử lại!');
      console.error('[ExportExcelButton] Lỗi xuất file:', errorObj);
      onError?.(errorObj);
      alert(errorObj.message || 'Lỗi khi tải file báo cáo Excel');
    } finally {
      setIsLoading(false);
    }
  };

  // Styling theo kích thước
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-3.5 py-2 text-xs font-semibold gap-2 rounded-lg',
    lg: 'px-4 py-2.5 text-sm font-semibold gap-2.5 rounded-xl',
  }[size];

  // Styling theo biến thể màu sắc
  const variantClasses = {
    outline:
      'bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 hover:border-emerald-300 shadow-2xs',
    emerald:
      'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 shadow-2xs',
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-2xs',
  }[variant];

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isLoading || disabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      title={isLoading ? loadingLabel : label}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
      ) : (
        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
      )}
      <span className="whitespace-nowrap">{isLoading ? loadingLabel : label}</span>
    </button>
  );
};

export default ExportExcelButton;

