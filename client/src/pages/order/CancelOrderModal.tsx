import React from 'react';
import { AlertTriangle, X, ShoppingBag } from 'lucide-react';
import { type OrderResponse } from '../../models/order.model';
import { formatPrice } from '../../utils/format';
import Button from '../../components/common/Button/Button';

export interface CancelOrderModalProps {
  order: OrderResponse | null;
  isOpen: boolean;
  isCancelling: boolean;
  onClose: () => void;
  onConfirm: (orderId: number) => void;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  isCancelling,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !order) return null;

  const items = order.orderItems || order.items || [];
  const totalItemsCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
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
                Mã đơn: #ORD-{order.id}
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
          Bạn có chắc chắn muốn hủy đơn hàng này không? Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái <strong className="text-red-600 font-bold">Đã hủy</strong> và không thể hoàn tác.
        </p>

        {/* Order mini summary */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5 text-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              Số lượng món:
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
            <span className="text-gray-600 font-medium">Tổng tiền:</span>
            <span className="font-extrabold text-sm text-red-600">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
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
            onClick={() => onConfirm(order.id)}
            disabled={isCancelling}
            isLoading={isCancelling}
          >
            {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;

