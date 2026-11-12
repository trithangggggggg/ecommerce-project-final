import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Zap,
  Clock,
  AlertTriangle,
  ExternalLink,
  Search,
  Ticket,
  QrCode,
  Banknote,
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSiteConfigStore } from '../../store/useSiteConfigStore';
import { orderService } from '../../api/services/order.service';
import { shippingService } from '../../api/services/shipping.service';
import paymentService from '../../api/services/payment.service';
import type { ShippingCarrier } from '../admin/AdminShippingPage';
import { promotionService, type PromotionCheckResult } from '../../api/services/promotion.service';
import type { PromoItem } from '../admin/AdminPromotionsPage';
import { ROUTES } from '../../constants/routes';
import { formatPrice } from '../../utils/format';
import { getPaymentMethodLabel, type CheckoutRequest, type OrderResponse, type PaymentMethod } from '../../models/order.model';
import type { CartItem } from '../../models/product.model';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

// Helper: Tính thời gian giao hàng dự kiến theo đơn vị vận chuyển
const getEstimatedDeliveryTime = (
  carrier?: ShippingCarrier | null,
  defaultLeadTime = '2 - 3 ngày làm việc'
): string => {
  if (carrier?.estimatedDelivery?.trim()) {
    return carrier.estimatedDelivery.trim();
  }
  if (!carrier) return defaultLeadTime;
  const code = (carrier.code || '').toUpperCase();
  const service = (carrier.serviceType || '').toLowerCase();
  if (
    code.includes('EXPRESS') ||
    code.includes('FAST') ||
    code.includes('HOATOC') ||
    service.includes('hỏa tốc') ||
    service.includes('nhanh')
  ) {
    return '1 - 2 ngày làm việc (Nhanh)';
  }
  if (code.includes('GHN') || code.includes('GHTK') || code.includes('JNT')) {
    return '1 - 3 ngày làm việc';
  }
  if (code.includes('VNPOST') || code.includes('VIETTEL') || service.includes('tiết kiệm')) {
    return '2 - 4 ngày làm việc';
  }
  return defaultLeadTime;
};

// Regex chuẩn số điện thoại di động Việt Nam (10 chữ số bắt đầu bằng 03, 05, 07, 08, 09 hoặc tiền tố +84 / 84)
const VIETNAMESE_PHONE_REGEX = /^(?:(?:\+84|84)|0)[35789][0-9]{8}$/;

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { items, totalItems, totalPrice, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { config } = useSiteConfigStore();
  const codEnabled = config.payment.codEnabled;
  const sepayEnabled = config.payment.sepayEnabled;
  const freeshipThreshold = config.shipping.freeshipThreshold ?? 20_000_000;
  const halfShipThreshold = config.shipping.halfShipThreshold ?? 10_000_000;
  const defaultShippingFee = config.shipping.defaultFee ?? 30_000;
  const defaultLeadTime = config.shipping.estimatedLeadTime || '2 - 3 ngày làm việc';

  // Nhận thông tin sản phẩm Mua Ngay (nếu đi từ nút Mua Ngay)
  const buyNowItem = (location.state as { buyNowItem?: CartItem } | null)?.buyNowItem;
  const isBuyNow = Boolean(buyNowItem);
  const checkoutItems: CartItem[] = buyNowItem ? [buyNowItem] : items;
  const checkoutTotalItems = buyNowItem ? buyNowItem.quantity : totalItems;
  const checkoutUnitPrice = buyNowItem
    ? (buyNowItem.variant?.price ?? buyNowItem.product.price ?? 0)
    : 0;
  const checkoutTotalPrice = buyNowItem
    ? checkoutUnitPrice * buyNowItem.quantity
    : totalPrice;

  // Form State
  const [receiverName, setReceiverName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  // Form Field Errors
  const [fieldErrors, setFieldErrors] = useState<{
    receiverName?: string;
    phoneNumber?: string;
    shippingAddress?: string;
  }>({});

  // Shipping Carrier State
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<number | null>(null);
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(false);

  // Coupon / Voucher State (Mã giảm giá đơn hàng)
  const [couponInput, setCouponInput] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<PromotionCheckResult | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [availablePromotions, setAvailablePromotions] = useState<PromoItem[]>([]);

  // Shipping Voucher State (Mã ưu đãi vận chuyển)
  const [appliedShippingPromotion, setAppliedShippingPromotion] = useState<PromotionCheckResult | null>(null);

  // Modal Chọn mã giảm giá (bảng hiển thị tất cả voucher có hiệu lực giống nhập kho)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string>('');
  const [voucherSearchQuery, setVoucherSearchQuery] = useState('');
  const [voucherTypeTab, setVoucherTypeTab] = useState<'ALL' | 'ORDER' | 'SHIPPING' | 'COMPENSATION'>('ALL');

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outOfStockError, setOutOfStockError] = useState<string | null>(null);
  const [orderSuccessData, setOrderSuccessData] = useState<OrderResponse | null>(null);

  const receiverNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  // Tự động điền dữ liệu từ thông tin tài khoản đang đăng nhập
  useEffect(() => {
    if (user) {
      setReceiverName((prev) => prev || user.fullName || user.username || '');
      setPhoneNumber((prev) => prev || user.phone || user.phoneNumber || '');
      setShippingAddress((prev) => prev || user.address || '');
    }
  }, [user]);

  useEffect(() => {
    if (paymentMethod === 'COD' && !codEnabled && sepayEnabled) {
      setPaymentMethod('SEPAY');
    } else if (paymentMethod === 'SEPAY' && !sepayEnabled && codEnabled) {
      setPaymentMethod('COD');
    }
  }, [paymentMethod, codEnabled, sepayEnabled]);

  // Lấy danh sách đối tác vận chuyển khả dụng
  useEffect(() => {
    setIsLoadingCarriers(true);
    shippingService
      .getActiveCarriers()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCarriers(data);
          setSelectedCarrierId(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Không thể lấy danh sách đối tác vận chuyển:', err);
      })
      .finally(() => {
        setIsLoadingCarriers(false);
      });
  }, []);

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

  // Tính số tiền giảm voucher đơn hàng và tiền hàng sau giảm
  const discountAmount = appliedPromotion ? appliedPromotion.discountAmount : 0;
  const subtotalAfterDiscount = Math.max(0, checkoutTotalPrice - discountAmount);

  // Đối tác vận chuyển được khách chọn
  const selectedCarrier = carriers.find((c) => c.id === selectedCarrierId) || carriers[0];
  const baseShippingFee = selectedCarrier ? (selectedCarrier.shippingFee ?? defaultShippingFee) : defaultShippingFee;

  // 1. Tính mức cước theo chính sách giá trị đơn hàng cấu hình từ Admin:
  let tierShippingFee = baseShippingFee;
  let shippingBadge = '';
  let shippingDiscountLabel = '';
  if (freeshipThreshold <= 0 || subtotalAfterDiscount >= freeshipThreshold) {
    tierShippingFee = 0;
    shippingBadge = freeshipThreshold > 0
      ? `Freeship 100% (Đơn ≥ ${formatPrice(freeshipThreshold)})`
      : 'Freeship 100%';
    shippingDiscountLabel = freeshipThreshold > 0 ? `Đơn ≥ ${formatPrice(freeshipThreshold)}` : 'Freeship toàn quốc';
  } else if (halfShipThreshold > 0 && subtotalAfterDiscount >= halfShipThreshold) {
    tierShippingFee = Math.round(baseShippingFee / 2);
    shippingBadge = `Giảm 50% ship (Đơn ≥ ${formatPrice(halfShipThreshold)})`;
    shippingDiscountLabel = `Đơn ≥ ${formatPrice(halfShipThreshold)}`;
  }
  const shippingTierDiscount = baseShippingFee - tierShippingFee;

  // 2. Tính mức giảm từ Voucher Vận chuyển (Freeship Voucher) nếu có:
  let shippingVoucherDiscount = 0;
  if (appliedShippingPromotion && tierShippingFee > 0) {
    if (appliedShippingPromotion.discountAmount && appliedShippingPromotion.discountAmount > 0) {
      shippingVoucherDiscount = Math.min(tierShippingFee, appliedShippingPromotion.discountAmount);
    } else {
      const rawDiscount = appliedShippingPromotion.discount || '';
      if (rawDiscount.includes('%')) {
        const pct = parseFloat(rawDiscount.replace('%', '')) || 0;
        shippingVoucherDiscount = Math.round((tierShippingFee * pct) / 100);
      } else {
        const num = parseFloat(rawDiscount.replace(/\D/g, '')) || 0;
        shippingVoucherDiscount = Math.min(tierShippingFee, num);
      }
    }
  }

  // Phí vận chuyển thực tế khách trả sau chính sách và voucher:
  const actualShippingFee = Math.max(0, tierShippingFee - shippingVoucherDiscount);
  const finalTotal = subtotalAfterDiscount + actualShippingFee;

  // Validate inputs
  const validateForm = (): boolean => {
    const errors: {
      receiverName?: string;
      phoneNumber?: string;
      shippingAddress?: string;
    } = {};

    const cleanName = receiverName.trim();
    if (!cleanName) {
      errors.receiverName = 'Vui lòng nhập họ và tên người nhận hàng';
    } else if (cleanName.length < 2) {
      errors.receiverName = 'Họ và tên người nhận quá ngắn (tối thiểu 2 ký tự)';
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone) {
      errors.phoneNumber = 'Vui lòng nhập số điện thoại người nhận';
    } else if (!VIETNAMESE_PHONE_REGEX.test(cleanPhone)) {
      errors.phoneNumber = 'Số điện thoại không đúng định dạng VN (10 số, VD: 0912345678)';
    }

    const cleanAddress = shippingAddress.trim();
    if (!cleanAddress) {
      errors.shippingAddress = 'Vui lòng nhập địa chỉ nhận hàng chi tiết';
    } else if (cleanAddress.length < 5) {
      errors.shippingAddress = 'Địa chỉ nhận hàng quá ngắn (tối thiểu 5 ký tự)';
    }

    setFieldErrors(errors);

    if (errors.receiverName && receiverNameRef.current) {
      receiverNameRef.current.focus();
    } else if (errors.phoneNumber && phoneRef.current) {
      phoneRef.current.focus();
    } else if (errors.shippingAddress && addressRef.current) {
      addressRef.current.focus();
    }

    return Object.keys(errors).length === 0;
  };

  // Xử lý áp dụng mã giảm giá (hỗ trợ cả mã đơn hàng và mã Freeship) qua POST /api/promotions/apply
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
      const result = await promotionService.applyPromotion(rawCode, checkoutTotalPrice, tierShippingFee);
      // Jackson có thể serialize boolean thành isValid hoặc valid
      const isSuccess = Boolean(
        result &&
        (result.isValid === true ||
         result.valid === true ||
         (result.message && result.message.toLowerCase().includes('thành công')))
      );

      if (isSuccess) {
        setCouponError(null);
        // Tự động nhận diện mã Freeship hoặc mã giảm giá đơn hàng
        const isShippingPromo =
          result.type === 'SHIPPING' ||
          result.code.toUpperCase().startsWith('FREESHIP') ||
          result.code.toUpperCase().startsWith('SHIP') ||
          (result.message && result.message.toLowerCase().includes('vận chuyển'));

        if (isShippingPromo) {
          setAppliedShippingPromotion(result);
          setCouponInput('');
          setCouponSuccess(`Áp dụng thành công mã Freeship "${result.code}" (-${result.discount} phí ship)!`);
        } else {
          setAppliedPromotion(result);
          setCouponInput('');
          setCouponSuccess(`Áp dụng thành công mã giảm giá "${result.code}" (-${result.discount})!`);
        }
      } else {
        setCouponSuccess(null);
        setCouponError(result?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể kiểm tra mã giảm giá lúc này. Vui lòng thử lại!';
      setCouponError(msg);
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  // Gỡ mã giảm giá đơn hàng
  const handleRemoveCoupon = () => {
    setAppliedPromotion(null);
    setCouponError(null);
    setCouponSuccess(null);
  };

  // Gỡ mã giảm giá vận chuyển
  const handleRemoveShippingCoupon = () => {
    setAppliedShippingPromotion(null);
    setCouponError(null);
    setCouponSuccess(null);
  };

  // Mở modal chọn mã giảm giá
  const handleOpenVoucherModal = () => {
    promotionService
      .getAvailablePromotions()
      .then((data) => {
        if (Array.isArray(data)) setAvailablePromotions(data);
      })
      .catch(() => {});
    if (appliedPromotion) {
      setSelectedVoucherCode(appliedPromotion.code);
    } else if (appliedShippingPromotion) {
      setSelectedVoucherCode(appliedShippingPromotion.code);
    } else if (couponInput.trim()) {
      setSelectedVoucherCode(couponInput.trim());
    } else {
      setSelectedVoucherCode('');
    }
    setVoucherSearchQuery('');
    setVoucherTypeTab('ALL');
    setIsVoucherModalOpen(true);
  };

  const parseMinOrder = (minOrderStr?: string): number => {
    if (!minOrderStr) return 0;
    if (minOrderStr.toLowerCase().includes('mọi')) return 0;
    const num = parseInt(minOrderStr.replace(/\D/g, ''), 10);
    return isNaN(num) ? 0 : num;
  };

  // Xử lý gửi đơn hàng (Checkout)
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Chống submit 2 lần khi đang xử lý
    if (isSubmitting) return;

    setErrorMessage(null);
    setOutOfStockError(null);

    // Validate form inputs
    if (!validateForm()) {
      return;
    }

    if (checkoutItems.length === 0) {
      setErrorMessage('Không có sản phẩm nào để thanh toán');
      return;
    }

    if (!codEnabled && !sepayEnabled) {
      setErrorMessage('Hệ thống đang tạm khóa thanh toán. Vui lòng thử lại sau.');
      return;
    }
    if ((paymentMethod === 'COD' && !codEnabled) || (paymentMethod === 'SEPAY' && !sepayEnabled)) {
      setErrorMessage('Phương thức thanh toán đã chọn hiện đang tạm ngưng.');
      return;
    }

    const payload: CheckoutRequest = {
      receiverName: receiverName.trim(),
      phoneNumber: phoneNumber.trim().replace(/\s+/g, ''),
      shippingAddress: shippingAddress.trim(),
      note: note.trim() || undefined,
      paymentMethod,
      carrierId: selectedCarrierId || undefined,
      couponCode: appliedPromotion?.code || undefined,
      shippingCouponCode: appliedShippingPromotion?.code || undefined,
      items: checkoutItems.map((i) => ({
        productId: i.product.id,
        variantId: i.variantId || i.variant?.id,
        quantity: i.quantity,
      })),
    };

    setIsSubmitting(true);
    try {
      const createdOrder = await orderService.checkout(payload);

      // Đặt hàng thành công:
      // - Nếu thanh toán giỏ hàng thông thường -> Xóa toàn bộ giỏ hàng
      // - Nếu là Mua ngay (buyNow) -> Chỉ xóa món đó khỏi giỏ nếu nó từng nằm trong giỏ, giữ lại các món khác
      if (!isBuyNow || !buyNowItem) {
        clearCart();
      } else {
        const buyNowVariantId = buyNowItem.variantId || buyNowItem.variant?.id;
        if (buyNowVariantId) {
          useCartStore.getState().removeItem(buyNowVariantId, buyNowItem.product.id);
        }
      }

      // Nếu chọn thanh toán qua SePay
      if (paymentMethod === 'SEPAY') {
        try {
          const paymentData = await paymentService.createPayment({
            orderId: createdOrder.id,
            description: `Thanh toan don hang ${createdOrder.id}`,
          });
          if (paymentData.checkoutUrl && paymentData.paymentMode !== 'VIETQR_DIRECT') {
            paymentService.redirectToGateway(paymentData.checkoutUrl, paymentData.checkoutFields);
            return;
          }
          if (paymentData.checkoutUrl) {
            paymentService.redirectToGateway(paymentData.checkoutUrl, paymentData.checkoutFields);
            return;
          }
          navigate(`${ROUTES.PAYMENT_QR}/${createdOrder.id}`, {
            state: { paymentData, order: createdOrder },
          });
          return;
        } catch {
          // Chuyển sang trang thanh toán QR để người dùng thử lại ngay hoặc quay về Đơn hàng của tôi (tránh đặt trùng đơn)
          navigate(`${ROUTES.PAYMENT_QR}/${createdOrder.id}`, {
            state: { order: createdOrder },
          });
          return;
        }
      }

      // Lưu chi tiết đơn hàng thành công và chuyển sang màn hình "Đặt hàng thành công"
      setOrderSuccessData(createdOrder);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể xử lý đơn hàng lúc này. Vui lòng thử lại!';

      // Xử lý lỗi hết hàng / không đủ số lượng tồn kho
      const isOutOfStock =
        msg.toLowerCase().includes('không đủ số lượng tồn kho') ||
        msg.toLowerCase().includes('tồn kho') ||
        msg.toLowerCase().includes('hết hàng') ||
        msg.toLowerCase().includes('ngừng kinh doanh');

      if (isOutOfStock) {
        setOutOfStockError(msg);
        try {
          useCartStore.getState().syncCart();
        } catch {
          // ignore
        }
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // MÀN HÌNH 1: ĐẶT HÀNG THÀNH CÔNG (Dedicated Success View)
  // ============================================================
  if (orderSuccessData) {
    const finalPaidAmount = orderSuccessData.finalAmount ?? orderSuccessData.totalAmount ?? finalTotal;

    return (
      <div className="min-h-screen bg-[#f5f6fa] py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-500">
            <Link to={ROUTES.HOME} className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link to={ROUTES.CHECKOUT} className="hover:text-blue-600 transition">
              Thanh toán
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-900">Đặt hàng thành công</span>
          </nav>

          {/* Banner Thông báo thành công */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 sm:p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-1">
                Giao dịch thành công
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Đặt hàng thành công!
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto">
                Cảm ơn bạn đã mua sắm tại cửa hàng. Đơn hàng của bạn đã được ghi nhận trên hệ thống và đang được xử lý để giao đến bạn sớm nhất.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs">
              <span className="text-gray-500 font-medium">Mã đơn hàng:</span>
              <span className="font-mono font-black text-blue-600 text-sm">
                #{orderSuccessData.id}
              </span>
            </div>
          </div>

          {/* Chi tiết đơn hàng */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide pb-3 border-b border-gray-100 flex items-center justify-between">
              <span>Thông tin chi tiết đơn hàng #{orderSuccessData.id}</span>
              <span className="text-xs font-normal normal-case text-gray-500">
                {new Date(orderSuccessData.createdAt).toLocaleString('vi-VN')}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-xl space-y-1.5">
                <span className="font-bold text-gray-800 flex items-center gap-1.5 uppercase text-[11px]">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Người nhận hàng
                </span>
                <p className="font-semibold text-gray-900">{orderSuccessData.receiverName}</p>
                <p className="text-gray-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-gray-400" />
                  {orderSuccessData.phoneNumber}
                </p>
                <p className="text-gray-600 flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                  <span>{orderSuccessData.shippingAddress}</span>
                </p>
                {orderSuccessData.note && (
                  <p className="text-gray-500 italic pt-1 border-t border-gray-200">
                    Ghi chú: {orderSuccessData.note}
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl space-y-1.5">
                <span className="font-bold text-gray-800 flex items-center gap-1.5 uppercase text-[11px]">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  Vận chuyển & Thanh toán
                </span>
                <p className="text-gray-900">
                  <span className="text-gray-500">Đối tác vận chuyển: </span>
                  <span className="font-semibold">
                    {orderSuccessData.carrierName || orderSuccessData.shippingCarrierName || selectedCarrier?.name || 'Giao hàng tiêu chuẩn'}
                  </span>
                </p>
                <p className="text-indigo-700 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>Dự kiến giao: {getEstimatedDeliveryTime(selectedCarrier, defaultLeadTime)}</span>
                </p>
                <p className="text-gray-900 pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Phương thức thanh toán: </span>
                  <span className="font-bold text-gray-900">
                    {getPaymentMethodLabel(orderSuccessData.paymentMethod)}
                  </span>
                </p>
                <p className="text-gray-900">
                  <span className="text-gray-500">Tổng thanh toán: </span>
                  <span className="font-black text-red-600 text-sm">
                    {formatPrice(finalPaidAmount)}
                  </span>
                </p>
              </div>
            </div>

            {/* Danh sách sản phẩm trong đơn hàng */}
            {(orderSuccessData.orderItems || orderSuccessData.items || []).length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-bold text-gray-700 block mb-2">
                  Danh sách sản phẩm ({(orderSuccessData.orderItems || orderSuccessData.items || []).length}):
                </span>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {(orderSuccessData.orderItems || orderSuccessData.items || []).map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.productImageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100'}
                          alt={item.productName}
                          className="w-10 h-10 object-contain rounded-lg border border-gray-100 p-0.5"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{item.productName}</h4>
                          <span className="text-[11px] text-gray-500">
                            {item.variantName ? `${item.variantName} • ` : ''}SL: {item.quantity} × {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 shrink-0">
                        {formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
              <Link
                to={ROUTES.PRODUCTS}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Tiếp tục mua hàng</span>
              </Link>

              <Link
                to={ROUTES.MY_ORDERS}
                state={{ newOrderId: orderSuccessData.id }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm transition"
              >
                <span>Xem đơn hàng trong Lịch sử</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MÀN HÌNH 2: CHƯA ĐĂNG NHẬP
  // ============================================================
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

  // ============================================================
  // MÀN HÌNH 3: KHÔNG CÓ SẢN PHẨM THANH TOÁN
  // ============================================================
  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#f5f6fa] py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có sản phẩm thanh toán</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Bạn chưa có sản phẩm nào để thực hiện thanh toán. Hãy chọn sản phẩm trước nhé!
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

  // Phân loại mã giảm giá khả dụng: Mã freeship, Mã đền bù cá nhân, Mã công khai
  const shippingVouchers = availablePromotions.filter(
    (p) =>
      p.type === 'SHIPPING' ||
      p.code.toUpperCase().startsWith('FREESHIP') ||
      p.code.toUpperCase().startsWith('SHIP')
  );
  const compensationVouchers = availablePromotions.filter(
    (p) =>
      (p.code.toUpperCase().startsWith('DENBU') || Boolean(p.userId)) &&
      p.type !== 'SHIPPING' &&
      !p.code.toUpperCase().startsWith('FREESHIP') &&
      !p.code.toUpperCase().startsWith('SHIP')
  );
  const publicVouchers = availablePromotions.filter(
    (p) =>
      !p.code.toUpperCase().startsWith('DENBU') &&
      !p.userId &&
      p.type !== 'SHIPPING' &&
      !p.code.toUpperCase().startsWith('FREESHIP') &&
      !p.code.toUpperCase().startsWith('SHIP')
  );

  // Danh sách voucher lọc cho modal bảng mã giảm giá
  const filteredVouchers = availablePromotions.filter((p) => {
    if (voucherTypeTab === 'ORDER') {
      const isOrder =
        p.type !== 'SHIPPING' &&
        !p.code.toUpperCase().startsWith('FREESHIP') &&
        !p.code.toUpperCase().startsWith('SHIP') &&
        !p.code.toUpperCase().startsWith('DENBU') &&
        !p.userId;
      if (!isOrder) return false;
    } else if (voucherTypeTab === 'SHIPPING') {
      const isShip =
        p.type === 'SHIPPING' ||
        p.code.toUpperCase().startsWith('FREESHIP') ||
        p.code.toUpperCase().startsWith('SHIP');
      if (!isShip) return false;
    } else if (voucherTypeTab === 'COMPENSATION') {
      const isComp = p.code.toUpperCase().startsWith('DENBU') || Boolean(p.userId);
      if (!isComp) return false;
    }

    if (voucherSearchQuery.trim()) {
      const q = voucherSearchQuery.toLowerCase();
      const matchCode = p.code.toLowerCase().includes(q);
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchDiscount = (p.discount || '').toLowerCase().includes(q);
      return matchCode || matchTitle || matchDiscount;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f5f6fa] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1360px] mx-auto space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link to={ROUTES.HOME} className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          {isBuyNow && buyNowItem?.product ? (
            <>
              <Link to={`/products/${buyNowItem.product.id}`} className="hover:text-blue-600 transition max-w-[200px] truncate">
                {buyNowItem.product.name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-900">Mua ngay & Thanh toán</span>
            </>
          ) : (
            <>
              <Link to={ROUTES.CART} className="hover:text-blue-600 transition">
                Giỏ hàng
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-900">Thanh toán đơn hàng</span>
            </>
          )}
        </nav>

        {/* Page Title */}
        <div className="pb-2 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            {isBuyNow ? 'Mua ngay - Thanh toán' : 'Thanh toán đơn hàng'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isBuyNow
              ? 'Xác nhận thông tin giao hàng và thanh toán cho sản phẩm bạn vừa chọn mua ngay'
              : 'Vui lòng nhập địa chỉ nhận hàng và xác nhận thông tin thanh toán'}
          </p>
        </div>

        {/* Buy Now Notification Banner */}
        {isBuyNow && (
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap size={14} className="fill-white" />
              </div>
              <div>
                <span className="font-bold">Đang ở chế độ Mua ngay:</span> Bạn đang đặt mua riêng sản phẩm này. Các sản phẩm khác trong giỏ hàng vẫn được lưu giữ nguyên vẹn!
              </div>
            </div>
            <Link
              to={ROUTES.CART}
              className="text-blue-600 hover:text-blue-800 font-bold underline shrink-0 sm:self-center"
            >
              Xem giỏ hàng ({totalItems})
            </Link>
          </div>
        )}

        {/* Cảnh báo Hết hàng / Không đủ tồn kho */}
        {outOfStockError && (
          <div className="p-4 rounded-2xl border-2 border-red-300 bg-red-50 text-red-900 space-y-3 animate-fade-in shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold text-sm block text-red-900 mb-1">
                  Sản phẩm đã hết hàng hoặc không đủ số lượng tồn kho!
                </span>
                <p className="text-red-700 leading-relaxed font-medium">
                  {outOfStockError}
                </p>
                <p className="text-red-600 mt-1">
                  Hệ thống đã tự động đồng bộ lại giỏ hàng của bạn. Vui lòng quay lại giỏ hàng để cập nhật số lượng hoặc chọn sản phẩm khác.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate(ROUTES.CART)}
                className="text-xs font-bold"
              >
                Quay lại giỏ hàng để chỉnh sửa
              </Button>
              <button
                type="button"
                onClick={() => setOutOfStockError(null)}
                className="text-xs text-gray-500 hover:text-gray-800 underline font-medium"
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        )}

        {/* Error Alert chung */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-800 flex items-start justify-between gap-3 text-xs animate-fade-in shadow-xs">
            <div className="flex items-start gap-3 flex-1">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Không thể tạo đơn hàng</span>
                <span>{errorMessage}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
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
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    1. Thông tin giao hàng
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Receiver Name */}
                  <div>
                    <Input
                      ref={receiverNameRef}
                      label="Họ và tên người nhận"
                      type="text"
                      value={receiverName}
                      onChange={(e) => {
                        setReceiverName(e.target.value);
                        if (fieldErrors.receiverName) {
                          setFieldErrors((prev) => ({ ...prev, receiverName: undefined }));
                        }
                      }}
                      placeholder="Nguyễn Văn A"
                      leftIcon={<User className="w-4 h-4" />}
                      required
                      error={fieldErrors.receiverName}
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <Input
                      ref={phoneRef}
                      label="Số điện thoại nhận hàng"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (fieldErrors.phoneNumber) {
                          setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                        }
                      }}
                      placeholder="0912 345 678"
                      leftIcon={<Phone className="w-4 h-4" />}
                      required
                      error={fieldErrors.phoneNumber}
                    />
                  </div>
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
                      ref={addressRef}
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => {
                        setShippingAddress(e.target.value);
                        if (fieldErrors.shippingAddress) {
                          setFieldErrors((prev) => ({ ...prev, shippingAddress: undefined }));
                        }
                      }}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      required
                      className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition resize-none ${
                        fieldErrors.shippingAddress
                          ? 'border-red-400 focus:ring-red-500/20 focus:border-red-600'
                          : 'border-gray-200 hover:border-gray-300 focus:ring-blue-500/15 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.shippingAddress && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{fieldErrors.shippingAddress}</span>
                    </p>
                  )}
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

              {/* Card 2: Shipping Carrier */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      2. Đơn vị vận chuyển
                    </h2>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      actualShippingFee === 0
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                    }`}
                  >
                    {actualShippingFee === 0
                      ? 'Miễn phí giao hàng'
                      : `Cước phí: ${formatPrice(actualShippingFee)}`}
                  </span>
                </div>

                {/* Banner ưu đãi phí giao hàng */}
                <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-emerald-50/90 border border-blue-200/70 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Ưu đãi phí giao hàng theo giá trị đơn
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Giảm 50% phí ship đơn từ <strong className="text-blue-700 font-bold">10.000.000₫</strong> • Miễn phí ship 100% đơn từ <strong className="text-emerald-700 font-bold">20.000.000₫</strong>
                      </p>
                    </div>
                  </div>
                  {shippingBadge && (
                    <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
                      ✓ {shippingBadge}
                    </span>
                  )}
                </div>

                {isLoadingCarriers ? (
                  <div className="py-6 text-center text-xs text-gray-500 space-y-2">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <span>Đang tải các đối tác giao hàng...</span>
                  </div>
                ) : carriers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">
                    Hệ thống sẽ tự động chỉ định đối tác giao vận nhanh nhất cho đơn hàng của bạn.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {carriers.map((c) => {
                      const isSelected = selectedCarrierId === c.id;
                      const cFee = c.shippingFee ?? defaultShippingFee;
                      const isCarrierFree = freeshipThreshold <= 0 || subtotalAfterDiscount >= freeshipThreshold;
                      const isCarrierHalf =
                        !isCarrierFree && halfShipThreshold > 0 && subtotalAfterDiscount >= halfShipThreshold;
                      const carrierActualFee = isCarrierFree
                        ? 0
                        : isCarrierHalf
                          ? Math.round(cFee / 2)
                          : cFee;
                      const estTime = getEstimatedDeliveryTime(c, defaultLeadTime);

                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCarrierId(c.id)}
                          className={`relative p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/20'
                              : 'border-gray-200 hover:border-indigo-200 bg-white hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-xs text-gray-900 truncate">
                                {c.name}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 shrink-0">
                                {c.code}
                              </span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Thời gian dự kiến và loại hình dịch vụ */}
                          <div className="space-y-1">
                            <p className="text-[11px] text-gray-500 line-clamp-1">
                              {c.serviceType || 'Chuyển phát nhanh tiêu chuẩn'}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium">
                              <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>Dự kiến: {estTime}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-100/80 text-[10px]">
                            {isCarrierFree ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <span>Freeship 0₫</span>
                                <span className="line-through text-gray-400 font-normal text-[9px]">
                                  {formatPrice(cFee)}
                                </span>
                              </span>
                            ) : isCarrierHalf ? (
                              <span className="text-blue-700 font-bold flex items-center gap-1">
                                <span>{formatPrice(carrierActualFee)}</span>
                                <span className="line-through text-gray-400 font-normal text-[9px]">
                                  {formatPrice(cFee)}
                                </span>
                                <span className="text-emerald-600 font-bold">(-50%)</span>
                              </span>
                            ) : (
                              <span className="text-gray-900 font-bold">
                                {formatPrice(cFee)}
                              </span>
                            )}
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              ★ {c.rating ? c.rating.toFixed(1) : '5.0'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 3: Payment Method (COD vs Chuyển khoản VietQR tại Nexor) */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      3. Phương thức thanh toán
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400">
                    An toàn • Bảo mật 100%
                  </span>
                </div>

                <div className="space-y-3">
                  {!codEnabled && !sepayEnabled && (
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 font-medium">
                      Hệ thống hiện tạm khóa tất cả phương thức thanh toán theo cấu hình quản trị. Vui lòng quay lại sau.
                    </div>
                  )}

                  {/* COD Option */}
                  {codEnabled && (
                    <label
                      className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition cursor-pointer ${
                        paymentMethod === 'COD'
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/15'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="COD"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="sr-only"
                      />
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            Thanh toán khi nhận hàng (COD)
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Phổ biến
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                paymentMethod === 'COD'
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {paymentMethod === 'COD' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                          Thanh toán tiền mặt trực tiếp cho nhân viên giao hàng sau khi kiểm tra sản phẩm.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* Thanh toán Chuyển khoản VietQR trực tiếp tại Nexor */}
                  {sepayEnabled && (
                    <label
                      className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition cursor-pointer ${
                        paymentMethod === 'SEPAY'
                          ? 'border-blue-600 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 shadow-xs ring-1 ring-blue-500/15'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="SEPAY"
                        checked={paymentMethod === 'SEPAY'}
                        onChange={() => setPaymentMethod('SEPAY')}
                        className="sr-only"
                      />
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            Thanh toán qua SePay
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Xác nhận tức thì
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                paymentMethod === 'SEPAY'
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {paymentMethod === 'SEPAY' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                          Thanh toán trực tuyến qua cổng SePay (Quét mã VietQR tự động xác nhận qua ứng dụng ngân hàng hoặc ví điện tử trong 3–5 giây).
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                            VietQR / NAPAS 24/7
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                            Mọi ngân hàng VN
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                            Xác nhận tự động
                          </span>
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Order Items Summary & Confirmation (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Sản phẩm đặt mua ({checkoutTotalItems})
                  </h3>
                  {isBuyNow ? (
                    <Link
                      to={buyNowItem?.product?.id ? `/products/${buyNowItem.product.id}` : ROUTES.PRODUCTS}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Đổi sản phẩm
                    </Link>
                  ) : (
                    <Link
                      to={ROUTES.CART}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Sửa giỏ hàng
                    </Link>
                  )}
                </div>

                {/* Items scroll list */}
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-2">
                  {checkoutItems.map((item) => {
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
                    {(appliedPromotion || appliedShippingPromotion) && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Đã áp dụng
                      </span>
                    )}
                  </div>

                  {/* Danh sách các mã đã áp dụng thành công */}
                  {(appliedPromotion || appliedShippingPromotion) && (
                    <div className="space-y-2">
                      {appliedPromotion && (
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
                                    Mã đền bù
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
                            title="Gỡ mã giảm giá đơn hàng"
                          >
                            <X className="w-3 h-3" />
                            <span>Gỡ</span>
                          </button>
                        </div>
                      )}

                      {appliedShippingPromotion && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-xs text-indigo-900 tracking-wider">
                                  {appliedShippingPromotion.code}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-200 text-indigo-800">
                                  -{appliedShippingPromotion.discount}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                  Mã Freeship
                                </span>
                              </div>
                              <span className="text-[11px] text-indigo-700 block truncate font-medium">
                                Giảm {formatPrice(shippingVoucherDiscount)} phí vận chuyển
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleRemoveShippingCoupon}
                            className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition shrink-0 flex items-center gap-1 cursor-pointer"
                            title="Gỡ mã Freeship"
                          >
                            <X className="w-3 h-3" />
                            <span>Gỡ</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ô nhập mã giảm giá dùng chung */}
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
                          placeholder="NHẬP MÃ GIẢM GIÁ..."
                          className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium uppercase bg-white border border-gray-200 rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenVoucherModal}
                        className="shrink-0 text-xs px-3.5 py-2 font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98]"
                      >
                        <Ticket className="w-3.5 h-3.5 text-amber-300" />
                        <span>Chọn mã giảm giá</span>
                      </button>
                    </div>

                    {/* Thông báo lỗi nếu có */}
                    {couponError && (
                      <p className="text-[11px] text-red-600 flex items-center gap-1 pl-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{couponError}</span>
                      </p>
                    )}

                    {/* Thông báo thành công */}
                    {couponSuccess && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1 pl-1">
                        <Check className="w-3 h-3 shrink-0" />
                        <span>{couponSuccess}</span>
                      </p>
                    )}

                    {/* 1. Mã đền bù cá nhân (nếu có) */}
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
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-gray-900">{formatPrice(checkoutTotalPrice)}</span>
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

                  {selectedCarrier && (
                    <div className="flex justify-between text-gray-600">
                      <span>Đơn vị giao hàng</span>
                      <span className="font-semibold text-indigo-700 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        {selectedCarrier.name}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển gốc</span>
                    <span className="font-semibold text-gray-900">{formatPrice(baseShippingFee)}</span>
                  </div>

                  {/* Ưu đãi phí ship theo giá trị đơn (nếu có) */}
                  {shippingTierDiscount > 0 && (
                    <div className="flex justify-between text-blue-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        Ưu đãi giá trị đơn ({shippingDiscountLabel})
                      </span>
                      <span className="font-bold">
                        -{formatPrice(shippingTierDiscount)}
                      </span>
                    </div>
                  )}

                  {/* Voucher Freeship (nếu có) */}
                  {shippingVoucherDiscount > 0 && appliedShippingPromotion && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-emerald-600" />
                        Voucher Freeship ({appliedShippingPromotion.code})
                      </span>
                      <span className="font-bold">-{formatPrice(shippingVoucherDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t border-dashed border-gray-200">
                    <span className="flex items-center gap-1.5">
                      <span>Phí vận chuyển thực thu</span>
                      {shippingBadge && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                          {shippingBadge}
                        </span>
                      )}
                    </span>
                    <span className={actualShippingFee === 0 ? 'text-emerald-700 font-bold' : 'text-gray-900 font-bold'}>
                      {actualShippingFee === 0 ? '0₫ (Miễn phí)' : formatPrice(actualShippingFee)}
                    </span>
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

                {/* Submit Button (Chống click 2 lần bằng disabled + isLoading) */}
                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="font-bold shadow-md hover:shadow-lg"
                  >
                    {isSubmitting
                      ? 'Đang xử lý đơn hàng...'
                      : paymentMethod === 'SEPAY'
                      ? `Thanh toán qua SePay (${formatPrice(finalTotal)})`
                      : `Xác nhận đặt hàng (${formatPrice(finalTotal)})`}
                  </Button>
                </div>

                <div className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Cam kết bảo mật thông tin khách hàng tuyệt đối</span>
                </div>
              </div>

              {/* Back button */}
              <div>
                <Link
                  to={isBuyNow ? (buyNowItem?.product?.id ? `/products/${buyNowItem.product.id}` : ROUTES.PRODUCTS) : ROUTES.CART}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{isBuyNow ? 'Quay lại chi tiết sản phẩm' : 'Quay lại chỉnh sửa giỏ hàng'}</span>
                </Link>
              </div>
            </div>
          </div>
        </form>

        {/* ======================================================== */}
        {/* MODAL: BẢNG CHỌN MÃ GIẢM GIÁ (GIỐNG BẢNG NHẬP KHO)       */}
        {/* ======================================================== */}
        {isVoucherModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl sm:max-w-5xl w-full p-4 sm:p-5 shadow-2xl font-sans max-h-[92vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <span>Chọn mã giảm giá & Voucher ưu đãi</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Top Toolbar: Search + Tabs */}
              <div className="shrink-0 space-y-2.5 py-2.5 border-b border-slate-100">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={voucherSearchQuery}
                    onChange={(e) => setVoucherSearchQuery(e.target.value)}
                    placeholder="Tìm theo mã voucher, tên ưu đãi, mức giảm..."
                    className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {voucherSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setVoucherSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setVoucherTypeTab('ALL')}
                    className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                      voucherTypeTab === 'ALL'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({availablePromotions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherTypeTab('ORDER')}
                    className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                      voucherTypeTab === 'ORDER'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Mã đơn hàng ({publicVouchers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherTypeTab('SHIPPING')}
                    className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                      voucherTypeTab === 'SHIPPING'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Freeship vận chuyển ({shippingVouchers.length})
                  </button>
                  {compensationVouchers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setVoucherTypeTab('COMPENSATION')}
                      className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                        voucherTypeTab === 'COMPENSATION'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      Mã đền bù của bạn ({compensationVouchers.length})
                    </button>
                  )}
                </div>
              </div>

              {/* BẢNG DANH SÁCH MÃ GIẢM GIÁ (GIỐNG BẢNG NHẬP KHO) */}
              <div className="flex-1 min-h-[180px] max-h-[400px] border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-2xs my-2">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-10 bg-slate-50">STT</th>
                      <th className="py-2.5 px-2 text-center w-12 bg-slate-50">Chọn</th>
                      <th className="py-2.5 px-3 min-w-[130px] bg-slate-50">Mã Voucher</th>
                      <th className="py-2.5 px-3 min-w-[210px] bg-slate-50">Tên chương trình & Mô tả</th>
                      <th className="py-2.5 px-3 min-w-[130px] bg-slate-50">Loại ưu đãi</th>
                      <th className="py-2.5 px-3 text-right min-w-[100px] bg-slate-50">Mức giảm</th>
                      <th className="py-2.5 px-3 min-w-[130px] bg-slate-50">Đơn tối thiểu</th>
                      <th className="py-2.5 px-3 min-w-[100px] bg-slate-50">Hạn sử dụng</th>
                      <th className="py-2.5 px-2 text-center w-24 bg-slate-50">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <Tag className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
                            <p className="text-xs font-semibold text-slate-600">
                              Không tìm thấy mã giảm giá nào phù hợp
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Vui lòng thử tìm kiếm với từ khóa khác hoặc chuyển danh mục tab
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map((promo, idx) => {
                        const isShipping =
                          promo.type === 'SHIPPING' ||
                          promo.code.toUpperCase().startsWith('FREESHIP') ||
                          promo.code.toUpperCase().startsWith('SHIP');
                        const isCompensation =
                          promo.code.toUpperCase().startsWith('DENBU') || Boolean(promo.userId);
                        const isApplied =
                          (appliedPromotion && appliedPromotion.code === promo.code) ||
                          (appliedShippingPromotion && appliedShippingPromotion.code === promo.code);
                        const isSelected = selectedVoucherCode === promo.code;
                        const minReq = parseMinOrder(promo.minOrder);
                        const isEligible = checkoutTotalPrice >= minReq;

                        return (
                          <tr
                            key={promo.id || promo.code}
                            onClick={() => setSelectedVoucherCode(promo.code)}
                            className={`hover:bg-slate-50/70 transition cursor-pointer ${
                              isSelected ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            {/* STT */}
                            <td className="py-2.5 px-2 text-center font-bold text-slate-600">
                              {idx + 1}
                            </td>

                            {/* Chọn (Radio) */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="radio"
                                name="voucherRadio"
                                checked={isSelected}
                                onChange={() => setSelectedVoucherCode(promo.code)}
                                className="w-3.5 h-3.5 text-blue-600 accent-blue-600 cursor-pointer"
                              />
                            </td>

                            {/* Mã voucher */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                                {promo.code}
                              </span>
                              {isApplied && (
                                <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Đang dùng
                                </span>
                              )}
                            </td>

                            {/* Tên & Mô tả */}
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-800 block text-xs">
                                {promo.title || promo.code}
                              </span>
                            </td>

                            {/* Loại ưu đãi */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isShipping ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                  <Truck className="w-2.5 h-2.5" /> Giảm ship
                                </span>
                              ) : isCompensation ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  <Gift className="w-2.5 h-2.5" /> Mã đền bù
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                  <Tag className="w-2.5 h-2.5" /> Giảm đơn hàng
                                </span>
                              )}
                            </td>

                            {/* Mức giảm */}
                            <td className="py-2.5 px-3 text-right font-black text-emerald-600 whitespace-nowrap text-xs sm:text-[13px]">
                              -{promo.discount}
                            </td>

                            {/* Đơn tối thiểu */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-slate-700 font-medium block text-xs">
                                {promo.minOrder || 'Mọi đơn hàng'}
                              </span>
                              {isEligible ? (
                                <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Đủ điều kiện
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">
                                  Chưa đạt giá trị
                                </span>
                              )}
                            </td>

                            {/* Hạn sử dụng */}
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                              {promo.expiry || 'Vô thời hạn'}
                            </td>

                            {/* Thao tác */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setSelectedVoucherCode(promo.code);
                                  await handleApplyCoupon(promo.code);
                                  setIsVoucherModalOpen(false);
                                }}
                                disabled={isApplied || isCheckingCoupon}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  isApplied
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                                }`}
                              >
                                {isApplied ? 'Đang dùng' : 'Áp dụng'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Modal: Hiển thị mã đang chọn + Nút Áp dụng */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 shrink-0">
                <div className="text-xs">
                  {selectedVoucherCode ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Mã đã chọn:</span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedVoucherCode}
                      </span>
                      {availablePromotions.find((p) => p.code === selectedVoucherCode) && (
                        <span className="text-emerald-600 font-bold">
                          (Giảm {availablePromotions.find((p) => p.code === selectedVoucherCode)?.discount})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">
                      * Nhấp vào một mã trong bảng để chọn, sau đó bấm "Áp dụng"
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsVoucherModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedVoucherCode) {
                        await handleApplyCoupon(selectedVoucherCode);
                        setIsVoucherModalOpen(false);
                      }
                    }}
                    disabled={!selectedVoucherCode || isCheckingCoupon}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isCheckingCoupon ? 'Đang kiểm tra...' : 'Áp dụng'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
