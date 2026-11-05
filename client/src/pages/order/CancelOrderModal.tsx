import React, { useState } from 'react';
import { AlertTriangle, X, ShoppingBag, Check } from 'lucide-react';
import { type OrderResponse } from '../../models/order.model';
import { formatPrice } from '../../utils/format';
import Button from '../../components/common/Button/Button';

export interface CancelOrderModalProps {
  order: OrderResponse | null;
  isOpen: boolean;
  isCancelling: boolean;
  onClose: () => void;
  onConfirm: (orderId: number, reason?: string) => void;
}

const CANCEL_REASONS = [
  'Tôi muốn thay đổi địa chỉ nhận hàng',
  'Tôi muốn thay đổi sản phẩm hoặc số lượng',
  'Tôi tìm thấy giá tốt hơn ở nơi khác',
  'Thời gian giao hàng dự kiến quá lâu',
  'Tôi đổi ý, không có nhu cầu mua nữa',
  'Lý do khác',
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  isCancelling,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');

  if (!isOpen || !order) return null;

  const items = order.orderItems || order.items || [];
  const totalItemsCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleConfirmClick = () => {
    const finalReason = selectedReason === 'Lý do khác' && customReason.trim()
      ? customReason.trim()
      : selectedReason;
    onConfirm(order.id, finalReason);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full shadow-2xl p-6 space-y-4">
        {/* Header Icon & Title */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-100/80 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">
                Xác nhận hủy đơn hàng
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                Mã đơn: #{order.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning text */}
        <p className="text-xs text-gray-600 leading-relaxed">
          Bạn có chắc chắn muốn hủy đơn hàng này không? Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái{' '}
          <strong className="text-red-600 font-bold">Đã hủy</strong> và các sản phẩm sẽ được tự động hoàn lại vào kho.
        </p>

        {/* Order mini summary */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5 text-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              Số lượng sản phẩm:
            </span>
            <span className="font-semibold text-gray-900">{totalItemsCount} món</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Người nhận:</span>
            <span className="font-semibold text-gray-900 truncate max-w-[200px]">
              {order.receiverName}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
            <span className="text-gray-600 font-medium">Tổng tiền thanh toán:</span>
            <span className="font-extrabold text-sm text-red-600">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Lý do hủy đơn (Tùy chọn) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            Lý do hủy đơn hàng:
          </label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {CANCEL_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <label
                  key={reason}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs border transition cursor-pointer ${
                    isSelected
                      ? 'border-red-300 bg-red-50/50 text-red-900 font-semibold'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={isSelected}
                      onChange={() => setSelectedReason(reason)}
                      disabled={isCancelling}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>{reason}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                </label>
              );
            })}
          </div>

          {selectedReason === 'Lý do khác' && (
            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Vui lòng nhập lý do cụ thể..."
              disabled={isCancelling}
              className="w-full mt-1.5 p-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isCancelling}
          >
            Giữ lại đơn
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmClick}
            disabled={isCancelling}
            isLoading={isCancelling}
          >
            {isCancelling ? 'Đang hủy đơn...' : 'Xác nhận hủy'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;
