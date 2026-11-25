import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Truck,
  AlertCircle,
  Gift,
  Copy,
  Check,
  Tag,
  CreditCard,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import {
  ORDER_STATUS_CONFIG,
  canPayOrderOnline,
  getPaymentMethodLabel,
  getPaymentStatusMeta,
  type OrderResponse,
} from '../../models/order.model';
import { ROUTES } from '../../constants/routes';
import { formatPrice, formatDateTime } from '../../utils/format';
import Button from '../../components/common/Button/Button';

export interface OrderDetailModalProps {
  order: OrderResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelClick?: (order: OrderResponse) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onCancelClick,
}) => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const statusCfg = ORDER_STATUS_CONFIG[order.status] || {
    label: order.status,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  };

  const items = order.orderItems || order.items || [];
  const shippingFee = order.shippingFee != null ? order.shippingFee : 0;
  const discount = order.discountAmount || 0;
  const shippingDiscount = order.shippingDiscount || 0;
  const subtotal = order.totalAmount - shippingFee + discount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Chi tiết đơn hàng #{order.id}</span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor}`}
                >
                  {statusCfg.label}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Đặt ngày {formatDateTime(order.createdAt)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Payment Method Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
          <div>
            <span className="text-gray-500 block text-[11px]">Trạng thái đơn hàng:</span>
            <span
              className={`font-bold inline-flex items-center gap-1.5 mt-0.5 ${statusCfg.color}`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              {statusCfg.label}
            </span>
          </div>

          <div className="sm:text-right">
            <span className="text-gray-500 block text-[11px]">Phương thức thanh toán:</span>
            <span className="font-bold text-gray-800 mt-0.5 flex items-center sm:justify-end gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              {getPaymentMethodLabel(order.paymentMethod)}
            </span>
            {order.paymentMethod !== 'COD' && (() => {
              const paymentMeta = getPaymentStatusMeta(order);
              return (
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${paymentMeta.className}`}
                >
                  {paymentMeta.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Cancellation Reason & Compensation Voucher Banner (if CANCELLED) */}
        {order.status === 'CANCELLED' && (order.cancelReason || order.compensationCoupon) && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Lý do hủy đơn hàng:</span>
            </div>
            <p className="text-rose-900 leading-relaxed pl-6">
              "{order.cancelReason || 'Đơn hàng đã được hủy theo yêu cầu.'}"
            </p>
            {order.compensationCoupon && (
              <div className="mt-2 pt-2 border-t border-rose-200 flex flex-wrap items-center justify-between gap-2 pl-6">
                <div className="flex items-center gap-1.5 text-amber-900">
                  <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold">Mã giảm giá 5% tri ân dành riêng cho bạn:</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(order.compensationCoupon!)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-amber-300 font-mono font-bold text-amber-800 hover:bg-amber-100/80 transition cursor-pointer shadow-xs text-xs"
                  title="Bấm để sao chép mã"
                >
                  <span>{order.compensationCoupon}</span>
                  {copiedCode === order.compensationCoupon ? (
                    <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Đã chép
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1. Thông tin người nhận */}
        <div className="space-y-2 text-xs bg-gray-50/60 p-4 rounded-xl border border-gray-200/80">
          <h4 className="font-bold text-gray-900 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Thông tin người nhận</span>
          </h4>
          <div className="space-y-1.5 text-gray-700 mt-2">
            <p className="flex items-center gap-2">
              <span className="text-gray-500 w-24">Họ và tên:</span>
              <strong className="text-gray-900 font-bold">{order.receiverName}</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-gray-500 w-24">Số điện thoại:</span>
              <span className="font-semibold text-gray-900">{order.phoneNumber}</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-gray-500 w-24 shrink-0">Địa chỉ nhận:</span>
              <span className="text-gray-800">{order.shippingAddress}</span>
            </p>
            {order.note && (
              <p className="flex items-start gap-2 pt-1 border-t border-gray-200 text-gray-600">
                <span className="text-gray-500 w-24 shrink-0">Ghi chú:</span>
                <span className="italic">{order.note}</span>
              </p>
            )}
          </div>
        </div>

        {/* Thông tin vận chuyển nếu có */}
        {(order.carrierName || order.trackingCode) && (
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-indigo-950">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Đơn vị vận chuyển</span>
              </div>
              {order.carrierName && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  {order.carrierName}
                </span>
              )}
            </div>
            {order.trackingCode && (
              <div className="flex items-center justify-between pt-1 border-t border-indigo-100">
                <span className="text-gray-600 text-[11px]">Mã vận đơn:</span>
                <button
                  type="button"
                  onClick={() => handleCopy(order.trackingCode!)}
                  className="inline-flex items-center gap-1 font-mono font-bold text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded text-xs hover:bg-indigo-50 transition cursor-pointer"
                  title="Sao chép mã vận đơn"
                >
                  <span>{order.trackingCode}</span>
                  {copiedCode === order.trackingCode ? (
                    <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                      <Check className="w-3 h-3 text-emerald-600" /> Đã chép
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-indigo-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Danh sách món (Sản phẩm) */}
        <div className="space-y-2">
          <h4 className="font-bold text-gray-900 uppercase tracking-wide text-[11px] flex items-center justify-between">
            <span>Danh sách món ({items.reduce((s, i) => s + i.quantity, 0)} món)</span>
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
            {items.map((item) => (
              <div
                key={item.id || item.productId}
                className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={
                      item.productImageUrl ||
                      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80'
                    }
                    alt={item.productName}
                    className="w-12 h-12 object-contain rounded-lg bg-gray-50 border border-gray-100 p-1 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.productId}`}
                      className="font-bold text-gray-900 hover:text-blue-600 transition truncate block"
                    >
                      {item.productName}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {item.variantName && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {item.variantName}
                        </span>
                      )}
                      {item.sku && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          SKU: {item.sku}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Số lượng: {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-gray-900 shrink-0 text-sm">
                  {formatPrice(item.totalPrice || item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Tổng tiền */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính tiền hàng</span>
            <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Giảm giá voucher {order.couponCode ? `(${order.couponCode})` : ''}
              </span>
              <span className="font-semibold">-{formatPrice(discount)}</span>
            </div>
          )}

          {shippingDiscount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                Voucher Freeship {order.shippingCouponCode ? `(${order.shippingCouponCode})` : ''}
              </span>
              <span className="font-semibold">-{formatPrice(shippingDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>Phí vận chuyển</span>
            <span
              className={`font-semibold ${shippingFee === 0 ? 'text-emerald-600' : 'text-gray-900'
                }`}
            >
              {shippingFee === 0 ? 'Miễn phí (0₫)' : formatPrice(shippingFee)}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
            <span className="font-bold text-sm text-gray-900">Tổng tiền</span>
            <span className="text-lg font-black text-red-600">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {/* Nút "Hủy đơn" chỉ hiện khi trạng thái = PENDING */}
          {order.status === 'PENDING' && onCancelClick ? (
            <button
              type="button"
              onClick={() => onCancelClick(order)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Hủy đơn</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {canPayOrderOnline(order) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate(`${ROUTES.PAYMENT_QR}/${order.id}`);
                  }}
                  leftIcon={<QrCode className="w-3.5 h-3.5" />}
                >
                  Thanh toán QR
                </Button>
              )}
            <Button variant="dark" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
