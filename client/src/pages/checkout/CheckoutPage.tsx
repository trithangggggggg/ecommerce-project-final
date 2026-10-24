import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Lock,
  Tag,
  Check,
  X,
  Gift,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { orderService } from '../../api/services/order.service';
import { promotionService, type PromotionCheckResult } from '../../api/services/promotion.service';
import type { PromoItem } from '../admin/AdminPromotionsPage';
import { ROUTES } from '../../constants/routes';
import { formatPrice } from '../../utils/format';
import type { CheckoutRequest } from '../../models/order.model';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();

  const { items, totalItems, totalPrice, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  // Form State
  const [receiverName, setReceiverName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');

  // Coupon / Voucher State
  const [couponInput, setCouponInput] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<PromotionCheckResult | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [availablePromotions, setAvailablePromotions] = useState<PromoItem[]>([]);

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);

  // Tự động điền dữ liệu từ thông tin tài khoản đang đăng nhập
  useEffect(() => {
    if (user) {
      if (!receiverName) setReceiverName(user.fullName || '');
      if (!phoneNumber) setPhoneNumber(user.phone || user.phoneNumber || '');
      if (!shippingAddress) setShippingAddress(user.address || '');
    }
  }, [user]);

  // Lấy danh sách voucher khả dụng để hiển thị gợi ý
  useEffect(() => {
    promotionService
      .getAvailablePromotions()
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailablePromotions(data);
        }
      })
      .catch((err) => {
        console.error('Không thể lấy danh sách voucher khả dụng:', err);
      });
  }, []);

  // Tính số tiền giảm và tổng thanh toán cuối cùng
  const discountAmount = appliedPromotion ? appliedPromotion.discountAmount : 0;
  const finalTotal = Math.max(0, totalPrice - discountAmount);

  // Xử lý áp dụng mã giảm giá
  const handleApplyCoupon = async (codeToApply?: string) => {
    const rawCode = (codeToApply !== undefined ? codeToApply : couponInput).trim();
    if (!rawCode) {
      setCouponError('Vui lòng nhập mã giảm giá');
      setCouponSuccess(null);
      return;
    }

    setCouponError(null);
    setCouponSuccess(null);
    setIsCheckingCoupon(true);

    try {
      const result = await promotionService.checkPromotion(rawCode, totalPrice);
      if (result && result.isValid) {
        setAppliedPromotion(result);
        setCouponInput(result.code);
        setCouponSuccess(`Áp dụng thành công! Đã giảm ${result.discount}`);
      } else {
        setAppliedPromotion(null);
        setCouponError(result?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: unknown) {
      setAppliedPromotion(null);
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể kiểm tra mã giảm giá lúc này.';
      setCouponError(msg);
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  // Gỡ mã giảm giá
  const handleRemoveCoupon = () => {
    setAppliedPromotion(null);
    setCouponInput('');
    setCouponError(null);
    setCouponSuccess(null);
  };

  // Kiểm tra nếu chưa đăng nhập, chuyển hướng hoặc cảnh báo
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] bg-[#f5f6fa] py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Yêu cầu đăng nhập</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Vui lòng đăng nhập vào tài khoản của bạn để tiến hành đặt hàng và lưu lịch sử đơn hàng.
          </p>
          <div className="space-y-3">
            <Button
              variant="dark"
              size="md"
              fullWidth
              onClick={() => navigate(ROUTES.LOGIN, { state: { from: ROUTES.CHECKOUT } })}
            >
              Đăng nhập ngay
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => navigate(ROUTES.CART)}
            >
              Quay lại giỏ hàng
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Nếu giỏ hàng rỗng
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-[70vh] bg-[#f5f6fa] py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng rỗng</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Bạn chưa có sản phẩm nào trong giỏ để thực hiện thanh toán. Hãy chọn sản phẩm trước nhé!
          </p>
          <Button
            variant="dark"
            size="md"
            fullWidth
            onClick={() => navigate(ROUTES.PRODUCTS)}
          >
            Mua sắm ngay
          </Button>
        </div>
      </div>
    );
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate form inputs
    if (!receiverName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên người nhận hàng');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại người nhận');
      return;
    }
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phoneNumber.trim().replace(/\s+/g, ''))) {
      setErrorMessage('Số điện thoại không đúng định dạng (VD: 0912345678)');
      return;
    }
    if (!shippingAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ nhận hàng chi tiết');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Giỏ hàng của bạn đang trống');
      return;
    }

    const payload: CheckoutRequest = {
      receiverName: receiverName.trim(),
      phoneNumber: phoneNumber.trim(),
      shippingAddress: shippingAddress.trim(),
      note: note.trim() || undefined,
      paymentMethod,
      couponCode: appliedPromotion?.code || undefined,
      items: items.map((i) => ({
        productId: i.product.id,
        variantId: i.variantId || i.variant?.id,
        quantity: i.quantity,
      })),
    };

    setIsSubmitting(true);
    try {
      const createdOrder = await orderService.checkout(payload);

      // Đặt hàng thành công -> Xóa giỏ hàng
      clearCart();
      setOrderSuccess(createdOrder.id);

      // Chuyển hướng sang trang lịch sử đơn hàng
      setTimeout(() => {
        navigate(ROUTES.MY_ORDERS, {
          replace: true,
          state: { newOrderId: createdOrder.id },
        });
      }, 1200);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể xử lý đơn hàng lúc này. Vui lòng thử lại!';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  // Phân loại mã giảm giá khả dụng: Mã đền bù cá nhân vs Mã công khai
  const compensationVouchers = availablePromotions.filter(
    (p) => p.code.toUpperCase().startsWith('DENBU') || Boolean(p.userId)
  );
  const publicVouchers = availablePromotions.filter(
    (p) => !p.code.toUpperCase().startsWith('DENBU') && !p.userId
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1360px] mx-auto space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link to={ROUTES.HOME} className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link to={ROUTES.CART} className="hover:text-blue-600 transition">
            Giỏ hàng
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">Thanh toán (COD)</span>
        </nav>

        {/* Page Title */}
        <div className="pb-2 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            Thanh toán đơn hàng
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Vui lòng nhập địa chỉ nhận hàng và xác nhận thông tin thanh toán
          </p>
        </div>

        {/* Success Modal / Banner */}
        {orderSuccess && (
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-3 text-xs animate-fade-in shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block text-sm">
                Đặt hàng thành công! Mã đơn: #{orderSuccess}
              </span>
              <span>Hệ thống đang chuyển hướng bạn đến trang Lịch sử đơn hàng...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-800 flex items-start gap-3 text-xs animate-fade-in shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Không thể tạo đơn hàng</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleCheckoutSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Delivery & Payment Details (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Receiver Information */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    1. Thông tin giao hàng
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Receiver Name */}
                  <Input
                    label="Họ và tên người nhận"
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />

                  {/* Phone Number */}
                  <Input
                    label="Số điện thoại nhận hàng"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0912 345 678"
                    leftIcon={<Phone className="w-4 h-4" />}
                    required
                  />
                </div>

                {/* Shipping Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ nhận hàng chi tiết <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 pt-3 pointer-events-none text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <textarea
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition resize-none"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Ghi chú giao hàng (tuỳ chọn)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 pt-3 pointer-events-none text-gray-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ví dụ: Giao vào giờ hành chính, gọi trước khi đến..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Payment Method */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    2. Phương thức thanh toán
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* COD Option */}
                  <label
                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition cursor-pointer ${
                      paymentMethod === 'COD'
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">
                          Thanh toán khi nhận hàng (COD)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Bạn chỉ thanh toán tiền mặt cho nhân viên giao hàng sau khi đã kiểm tra sản phẩm.
                      </p>
                    </div>
                  </label>

                  {/* VNPAY / Banking (Demo only) */}
                  <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 opacity-70 cursor-not-allowed">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="ONLINE"
                      disabled
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">
                          Thanh toán online qua VNPAY / QR Ngân hàng
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                          Sắp hỗ trợ
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Cổng thanh toán điện tử đang được nâng cấp hệ thống.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Order Items Summary & Confirmation (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Sản phẩm đặt mua ({totalItems})
                  </h3>
                  <Link
                    to={ROUTES.CART}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Sửa giỏ hàng
                  </Link>
                </div>

                {/* Items scroll list */}
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-2">
                  {items.map((item) => {
                    const variant = item.variant;
                    const unitPrice = variant?.price ?? item.product.price ?? 0;
                    const itemImage = variant?.imageUrl || item.product.imageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100';

                    return (
                      <div
                        key={item.variantId || variant?.id || item.product.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 p-1 shrink-0 flex items-center justify-center">
                            <img
                              src={itemImage}
                              alt={item.product.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {item.product.name}
                            </h4>
                            {variant && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {variant.title || 'Tiêu chuẩn'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  SKU: {variant.sku}
                                </span>
                              </div>
                            )}
                            <span className="text-[11px] text-gray-500 block mt-0.5">
                              Số lượng: {item.quantity} × {formatPrice(unitPrice)}
                            </span>
                          </div>
                        </div>

                        <span className="font-bold text-gray-900 shrink-0">
                          {formatPrice(unitPrice * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Voucher / Mã giảm giá */}
                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      Mã giảm giá / Voucher
                    </span>
                    {appliedPromotion && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Đã áp dụng
                      </span>
                    )}
                  </div>

                  {appliedPromotion ? (
                    /* Thẻ hiển thị mã khi đã áp dụng thành công */
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Gift className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-emerald-900 tracking-wider">
                              {appliedPromotion.code}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-200 text-emerald-800">
                              -{appliedPromotion.discount}
                            </span>
                            {appliedPromotion.code.toUpperCase().startsWith('DENBU') && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Mã đền bù của bạn
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-emerald-700 block truncate font-medium">
                            Giảm {formatPrice(discountAmount)} cho đơn hàng này
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Gỡ mã giảm giá"
                      >
                        <X className="w-3 h-3" />
                        <span>Gỡ</span>
                      </button>
                    </div>
                  ) : (
                    /* Ô nhập mã giảm giá khi chưa áp dụng */
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Tag className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value.toUpperCase());
                              if (couponError) setCouponError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCoupon();
                              }
                            }}
                            placeholder="Nhập mã giảm giá..."
                            className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium uppercase bg-white border border-gray-200 rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="dark"
                          size="sm"
                          onClick={() => handleApplyCoupon()}
                          isLoading={isCheckingCoupon}
                          disabled={!couponInput.trim() || isCheckingCoupon}
                          className="shrink-0 text-xs px-3.5 py-2 font-bold"
                        >
                          Áp dụng
                        </Button>
                      </div>

                      {/* Thông báo lỗi nếu có */}
                      {couponError && (
                        <p className="text-[11px] text-red-600 flex items-center gap-1 pl-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{couponError}</span>
                        </p>
                      )}

                      {/* 1. Mã đền bù cá nhân (nếu tài khoản này có đơn hàng bị hủy được đền bù) */}
                      {compensationVouchers.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                            <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Mã đền bù dành riêng cho bạn:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {compensationVouchers.map((promo) => (
                              <button
                                key={promo.id || promo.code}
                                type="button"
                                onClick={() => handleApplyCoupon(promo.code)}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer shadow-2xs"
                                title={promo.title || `Mã đền bù giảm ${promo.discount}`}
                              >
                                <span className="font-mono">{promo.code}</span>
                                <span className="text-amber-400">|</span>
                                <span className="text-emerald-700 font-bold">-{promo.discount}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Mã ưu đãi công khai thông thường */}
                      {publicVouchers.length > 0 && (
                        <div className="pt-0.5">
                          <span className="text-[10px] font-semibold text-gray-500 block mb-1">
                            Mã ưu đãi công khai:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {publicVouchers.slice(0, 4).map((promo) => (
                              <button
                                key={promo.id || promo.code}
                                type="button"
                                onClick={() => handleApplyCoupon(promo.code)}
                                className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                                title={promo.title || `Giảm ${promo.discount}`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="font-mono font-bold">{promo.code}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-emerald-700 font-bold">-{promo.discount}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {couponSuccess && !appliedPromotion && (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1 pl-1">
                      <Check className="w-3 h-3 shrink-0" />
                      <span>{couponSuccess}</span>
                    </p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
                  </div>

                  {discountAmount > 0 && appliedPromotion && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Giảm giá voucher ({appliedPromotion.code})
                      </span>
                      <span className="font-bold">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span className="font-semibold text-emerald-600">Miễn phí</span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">Tổng thanh toán</span>
                      <span className="text-[10px] text-gray-400">Đã bao gồm thuế GTGT</span>
                    </div>
                    <span className="text-xl font-black text-red-600">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={Boolean(orderSuccess)}
                    className="font-bold shadow-md hover:shadow-lg"
                  >
                    {isSubmitting
                      ? 'Đang tạo đơn hàng...'
                      : `Xác nhận đặt hàng (${formatPrice(finalTotal)})`}
                  </Button>
                </div>

                <div className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Cam kết bảo mật thông tin khách hàng tuyệt đối</span>
                </div>
              </div>

              {/* Back to cart */}
              <div>
                <Link
                  to={ROUTES.CART}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại chỉnh sửa giỏ hàng</span>
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
