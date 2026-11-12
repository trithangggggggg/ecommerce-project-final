import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  QrCode,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Download,
  ChevronRight,
  Landmark,
  AlertCircle,
  AlertTriangle,
  Smartphone,
  Sparkles,
  PackageCheck,
  ShoppingBag,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Receipt,
  XCircle,
} from 'lucide-react';
import paymentService, {
  type SepayPaymentResponse,
  type SepayReturnResponse,
} from '../../api/services/payment.service';
import { orderService } from '../../api/services/order.service';
import type { OrderResponse } from '../../models/order.model';
import { formatPrice, formatDateTime } from '../../utils/format';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';

interface LocationState {
  paymentData?: SepayPaymentResponse;
  order?: OrderResponse;
}

interface FeedbackBanner {
  type: 'info' | 'success' | 'warning';
  text: string;
}

const POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_SECONDS = 15 * 60;

const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

async function copyTextSafe(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below when Clipboard API is blocked
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

interface CopyButtonProps {
  copied: boolean;
  onClick: () => void;
  variant?: 'default' | 'amber';
}

const CopyButton: React.FC<CopyButtonProps> = ({
  copied,
  onClick,
  variant = 'default',
}) => {
  const baseClass =
    variant === 'amber'
      ? 'bg-white border-amber-300 hover:bg-amber-100 text-amber-900 shadow-2xs'
      : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shrink-0 ${baseClass}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-700">Đã chép</span>
        </>
      ) : (
        <>
          <Copy className={`w-3.5 h-3.5 ${variant === 'amber' ? 'text-amber-700' : ''}`} />
          <span>Sao chép</span>
        </>
      )}
    </button>
  );
};

interface PaymentSuccessViewProps {
  orderId: string;
  transferContent: string;
  displayAmount: number;
  statusData: SepayReturnResponse | null;
  onNavigate: (path: string) => void;
}

const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  orderId,
  transferContent,
  displayAmount,
  statusData,
  onNavigate,
}) => (
  <div className="min-h-[85vh] bg-[#f4f7fc] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
    <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-8 sm:p-10 text-center text-white">
        <div className="mx-auto w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 ring-8 ring-white/15">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Xác nhận tự động qua SePay
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Thanh toán thành công!
        </h1>
        <p className="mt-2 text-sm text-emerald-50 max-w-md mx-auto">
          Nexor đã nhận được khoản thanh toán cho đơn hàng #{orderId}. Đơn hàng của bạn đã được chuyển sang trạng thái đang xử lý.
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/70 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Biên lai thanh toán điện tử</span>
          </div>

          <div className="divide-y divide-slate-200/70 text-sm">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Mã đơn hàng:</span>
              <span className="font-extrabold text-slate-900">#{orderId}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Nội dung thanh toán:</span>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                {statusData?.invoiceNumber || transferContent}
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Số tiền đã thanh toán:</span>
              <span className="text-lg font-black text-emerald-600">
                {formatPrice(displayAmount)}
              </span>
            </div>
            {(statusData?.sepayOrderId || statusData?.paymentReference) && (
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500">Mã tham chiếu ngân hàng:</span>
                <span className="font-mono text-xs font-semibold text-slate-700">
                  {statusData.sepayOrderId || statusData.paymentReference}
                </span>
              </div>
            )}
            {statusData?.paidAt && (
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500">Thời gian ghi nhận:</span>
                <span className="font-medium text-slate-700">
                  {formatDateTime(statusData.paidAt)}
                </span>
              </div>
            )}
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Trạng thái:</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Đã thanh toán
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => onNavigate(ROUTES.MY_ORDERS)}
            leftIcon={<PackageCheck className="w-5 h-5" />}
            className="font-bold shadow-md"
          >
            Xem đơn hàng của tôi
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => onNavigate(ROUTES.PRODUCTS)}
            leftIcon={<ShoppingBag className="w-5 h-5" />}
            className="font-bold border-slate-300"
          >
            Tiếp tục mua sắm
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export const SepayQrPaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = (location.state as LocationState | null) || null;
  const matchingInitialPayment =
    locationState?.paymentData && String(locationState.paymentData.orderId) === String(orderId)
      ? locationState.paymentData
      : null;
  const matchingInitialOrder =
    locationState?.order && String(locationState.order.id) === String(orderId)
      ? locationState.order
      : null;

  const [paymentData, setPaymentData] = useState<SepayPaymentResponse | null>(matchingInitialPayment);
  const [order, setOrder] = useState<OrderResponse | null>(matchingInitialOrder);
  const [statusData, setStatusData] = useState<SepayReturnResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [checkFeedback, setCheckFeedback] = useState<FeedbackBanner | null>(null);

  const [isManualChecking, setIsManualChecking] = useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [qrImageLoaded, setQrImageLoaded] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);
  const [qrCacheKey, setQrCacheKey] = useState<number>(() => Date.now());

  const [secondsLeft, setSecondsLeft] = useState<number>(
    matchingInitialPayment?.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  const isCheckingStatusRef = useRef(false);
  const expiresAtMsRef = useRef<number>(
    Date.now() + (matchingInitialPayment?.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS) * 1000
  );
  const copyTimerRef = useRef<number | null>(null);
  const initialPaymentRef = useRef<SepayPaymentResponse | null>(matchingInitialPayment);
  const initialOrderRef = useRef<OrderResponse | null>(matchingInitialOrder);

  // Sync route param switches cleanly if user navigates between different /payment/qr/:orderId URLs
  useEffect(() => {
    const nextPayment =
      locationState?.paymentData && String(locationState.paymentData.orderId) === String(orderId)
        ? locationState.paymentData
        : null;
    const nextOrder =
      locationState?.order && String(locationState.order.id) === String(orderId)
        ? locationState.order
        : null;

    initialPaymentRef.current = nextPayment;
    initialOrderRef.current = nextOrder;
    setPaymentData(nextPayment);
    setOrder(nextOrder);
    setStatusData(null);
    setCheckFeedback(null);
    setConfirmCancelOpen(false);

    const nextTimeout = nextPayment?.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS;
    expiresAtMsRef.current = Date.now() + nextTimeout * 1000;
    setSecondsLeft(nextTimeout);
  }, [orderId, locationState]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const isPaid = Boolean(statusData?.success || statusData?.paymentStatus === 'PAID');
  const isCancelled = Boolean(statusData?.cancelled || statusData?.orderStatus === 'CANCELLED');
  const isExpired = !isPaid && !isCancelled && secondsLeft <= 0;

  const applyNewPaymentData = useCallback((fresh: SepayPaymentResponse) => {
    const timeoutSec = fresh.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS;
    expiresAtMsRef.current = Date.now() + timeoutSec * 1000;
    setPaymentData(fresh);
    setSecondsLeft(timeoutSec);
    setQrImageLoaded(false);
    setQrImageError(false);
    setQrCacheKey(Date.now());
  }, []);

  const handleCopy = async (key: string, value: string) => {
    if (!value) return;
    const copied = await copyTextSafe(value);
    if (!copied) return;
    setCopiedKey(key);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const fetchOrderSummaryQuietly = useCallback(async (id: string) => {
    try {
      const detail = await orderService.getMyOrderById(id);
      setOrder(detail);
    } catch {
      // Không chặn giao diện QR nếu tải phụ trợ đơn hàng thất bại
    }
  }, []);

  const checkStatusOnce = useCallback(
    async (manual = false) => {
      if (!orderId || isCheckingStatusRef.current) return;
      isCheckingStatusRef.current = true;
      if (manual) {
        setIsManualChecking(true);
        setCheckFeedback(null);
      }

      try {
        const res = await paymentService.getPaymentStatus(orderId);
        setStatusData(res);
        if (res.success || res.paymentStatus === 'PAID') {
          setCheckFeedback({
            type: 'success',
            text: 'Đã nhận được thanh toán! Đơn hàng của bạn đang được xử lý.',
          });
          await fetchOrderSummaryQuietly(orderId);
        } else if (res.cancelled || res.orderStatus === 'CANCELLED') {
          setCheckFeedback({
            type: 'warning',
            text: 'Đơn hàng này đã bị hủy.',
          });
        } else if (manual) {
          setCheckFeedback({
            type: 'info',
            text: 'Hệ thống chưa ghi nhận giao dịch mới. Nếu bạn vừa chuyển khoản, vui lòng đợi thêm vài giây — trang đang tự động kiểm tra liên tục.',
          });
        }
      } catch {
        if (manual) {
          setCheckFeedback({
            type: 'warning',
            text: 'Không thể kiểm tra trạng thái lúc này. Vui lòng thử lại sau giây lát.',
          });
        }
      } finally {
        isCheckingStatusRef.current = false;
        if (manual) {
          setIsManualChecking(false);
        }
      }
    },
    [orderId, fetchOrderSummaryQuietly]
  );

  // Initial loader keyed strictly on orderId + manual retryNonce
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!orderId) {
        setErrorMsg('Thiếu mã đơn hàng để khởi tạo thanh toán QR.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const [statusResult] = await Promise.allSettled([
          paymentService.getPaymentStatus(orderId),
          !initialOrderRef.current ? fetchOrderSummaryQuietly(orderId) : Promise.resolve(),
        ]);

        if (cancelled) return;

        if (statusResult.status === 'fulfilled') {
          const st = statusResult.value;
          setStatusData(st);
          if (
            st.success ||
            st.paymentStatus === 'PAID' ||
            st.cancelled ||
            st.orderStatus === 'CANCELLED'
          ) {
            setLoading(false);
            return;
          }
        } else {
          throw statusResult.reason;
        }

        if (!initialPaymentRef.current || retryNonce > 0) {
          const created = await paymentService.createPayment({
            orderId,
            description: `Thanh toan don hang ${orderId}`,
          });
          if (!cancelled) {
            applyNewPaymentData(created);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Không thể khởi tạo phiên thanh toán VietQR cho đơn hàng này.';
          setErrorMsg(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [orderId, retryNonce, fetchOrderSummaryQuietly, applyNewPaymentData]);

  // Wall-clock deadline countdown & instant resume sync + polling while session is active
  useEffect(() => {
    if (!orderId || loading || errorMsg || isPaid || isCancelled || isExpired) {
      return;
    }

    const syncRemainingTime = () => {
      const next = Math.max(0, Math.ceil((expiresAtMsRef.current - Date.now()) / 1000));
      setSecondsLeft(next);
      return next;
    };

    const countdownTimer = window.setInterval(syncRemainingTime, 1000);
    const pollerTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkStatusOnce(false);
      }
    }, POLL_INTERVAL_MS);

    const handleResume = () => {
      const remaining = syncRemainingTime();
      if (document.visibilityState === 'visible' && remaining > 0) {
        checkStatusOnce(false);
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearInterval(pollerTimer);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [orderId, loading, errorMsg, isPaid, isCancelled, isExpired, checkStatusOnce]);

  const handleRefreshQr = async () => {
    if (!orderId || isRefreshingQr) return;
    setIsRefreshingQr(true);
    setErrorMsg(null);
    setCheckFeedback(null);
    try {
      const currentStatus = await paymentService.getPaymentStatus(orderId);
      setStatusData(currentStatus);
      if (
        currentStatus.success ||
        currentStatus.paymentStatus === 'PAID' ||
        currentStatus.cancelled ||
        currentStatus.orderStatus === 'CANCELLED'
      ) {
        return;
      }
      const fresh = await paymentService.createPayment({
        orderId,
        description: `Thanh toan don hang ${orderId}`,
      });
      applyNewPaymentData(fresh);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể làm mới mã VietQR.';
      setErrorMsg(msg);
    } finally {
      setIsRefreshingQr(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId || isCancellingOrder) return;
    setIsCancellingOrder(true);
    try {
      await orderService.cancelMyOrder(orderId);
      setConfirmCancelOpen(false);
      setStatusData((prev) => ({
        success: false,
        cancelled: true,
        status: 'CANCELLED',
        message: 'Đơn hàng đã được hủy theo yêu cầu của bạn.',
        orderId: Number(orderId),
        invoiceNumber: prev?.invoiceNumber || paymentData?.invoiceNumber || null,
        amount: prev?.amount || paymentData?.amount || null,
        orderStatus: 'CANCELLED',
        paymentStatus: prev?.paymentStatus || 'UNPAID',
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy đơn hàng lúc này.';
      setCheckFeedback({ type: 'warning', text: msg });
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const resolvedQrUrl = useMemo(() => {
    if (!paymentData?.qrImageUrl) return '';
    const separator = paymentData.qrImageUrl.includes('?') ? '&' : '?';
    return `${paymentData.qrImageUrl}${separator}_t=${qrCacheKey}`;
  }, [paymentData?.qrImageUrl, qrCacheKey]);

  const transferContent =
    paymentData?.transferContent || paymentData?.paymentCode || (orderId ? `DH${orderId}` : '');
  const displayAmount = statusData?.amount ?? paymentData?.amount ?? order?.totalAmount ?? 0;

  const orderItems = useMemo(() => order?.orderItems || order?.items || [], [order]);
  const totalQty = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.quantity, 0),
    [orderItems]
  );

  // 1. LOADING
  if (loading) {
    return (
      <div className="min-h-[82vh] bg-[#f4f7fc] py-14 px-4 flex items-center justify-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/80 text-center space-y-5">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-75" />
            <div className="w-14 h-14 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-extrabold text-slate-900">
              Đang tạo mã VietQR cho đơn #{orderId}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Vui lòng chờ giây lát, Nexor đang khởi tạo phiên thanh toán bảo mật...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ERROR
  if (errorMsg) {
    return (
      <div className="min-h-[82vh] bg-[#f4f7fc] py-12 px-4 flex items-center justify-center font-sans">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-xl border border-rose-100 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">Chưa thể tạo mã VietQR lúc này</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{errorMsg}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setRetryNonce((n) => n + 1)}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Thử lại
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => navigate(ROUTES.MY_ORDERS)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Về Đơn hàng của tôi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. PAID
  if (isPaid) {
    return (
      <PaymentSuccessView
        orderId={orderId || ''}
        transferContent={transferContent}
        displayAmount={displayAmount}
        statusData={statusData}
        onNavigate={(path) => navigate(path)}
      />
    );
  }

  // 4. CANCELLED
  if (isCancelled) {
    return (
      <div className="min-h-[82vh] bg-[#f4f7fc] py-12 px-4 flex items-center justify-center font-sans">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-xl border border-amber-100 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <XCircle className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">Đơn hàng #{orderId} đã bị hủy</h2>
            <p className="text-sm text-slate-600">
              {statusData?.message ||
                'Đơn hàng đã hủy nên không thể tiếp tục thanh toán qua mã QR này.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => navigate(ROUTES.MY_ORDERS)}
            >
              Xem đơn hàng của tôi
            </Button>
            <Button variant="outline" size="md" fullWidth onClick={() => navigate(ROUTES.HOME)}>
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. MAIN VIETQR PAYMENT PAGE
  return (
    <div className="min-h-screen bg-[#f4f7fc] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Top Breadcrumb + Live Polling Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to={ROUTES.HOME} className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to={ROUTES.MY_ORDERS} className="hover:text-blue-600 transition">
              Đơn hàng của tôi
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900">Thanh toán QR #{orderId}</span>
          </nav>

          <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white border border-blue-200/80 shadow-2xs text-xs font-semibold text-blue-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
            </span>
            <span>Đang chờ chuyển khoản • Tự động kiểm tra</span>
          </div>
        </div>

        {/* Hero Security Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl px-5 py-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span>Thanh toán VietQR trực tiếp tại Nexor</span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Bảo mật SePay 24/7
                </span>
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Mở app ngân hàng quét mã bên dưới. Đơn hàng sẽ tự động xác nhận ngay sau khi chuyển khoản thành công.
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold shrink-0 border ${
              isExpired
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                : secondsLeft <= 120
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                : 'bg-white/10 border-white/15 text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isExpired ? 'Đã hết hạn' : `Hiệu lực: ${formatCountdown(secondsLeft)}`}</span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {checkFeedback && (
          <div
            className={`rounded-2xl px-4 py-3 border text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs ${
              checkFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : checkFeedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{checkFeedback.text}</span>
          </div>
        )}

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (6 cols): QR Frame */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/90 shadow-lg p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Quét mã VietQR
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    Hỗ trợ mọi app ngân hàng & ví điện tử Việt Nam
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-extrabold tracking-wide">
                NAPAS 24/7
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative p-5 rounded-3xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 shadow-inner">
                <span className="pointer-events-none absolute top-2.5 left-2.5 w-6 h-6 border-t-4 border-l-4 border-blue-600 rounded-tl-xl" />
                <span className="pointer-events-none absolute top-2.5 right-2.5 w-6 h-6 border-t-4 border-r-4 border-blue-600 rounded-tr-xl" />
                <span className="pointer-events-none absolute bottom-2.5 left-2.5 w-6 h-6 border-b-4 border-l-4 border-blue-600 rounded-bl-xl" />
                <span className="pointer-events-none absolute bottom-2.5 right-2.5 w-6 h-6 border-b-4 border-r-4 border-blue-600 rounded-br-xl" />

                <div className="relative w-60 h-60 sm:w-64 sm:h-64 bg-white rounded-2xl flex items-center justify-center overflow-hidden p-2 shadow-xs">
                  {!qrImageLoaded && !qrImageError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 animate-pulse gap-2">
                      <QrCode className="w-10 h-10 text-slate-300" />
                      <span className="text-[11px] text-slate-400 font-medium">
                        Đang tải mã QR...
                      </span>
                    </div>
                  )}

                  {qrImageError ? (
                    <div className="flex flex-col items-center justify-center text-center p-4 space-y-2.5">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <p className="text-xs text-slate-600">
                        Không tải được ảnh QR từ máy chủ SePay.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQrImageError(false);
                          setQrImageLoaded(false);
                          setQrCacheKey(Date.now());
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Tải lại QR</span>
                      </button>
                    </div>
                  ) : (
                    resolvedQrUrl && (
                      <img
                        src={resolvedQrUrl}
                        alt={`Mã QR thanh toán đơn hàng #${orderId}`}
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          qrImageLoaded ? 'opacity-100' : 'opacity-0'
                        } ${isExpired ? 'blur-[2px] opacity-40' : ''}`}
                        onLoad={() => {
                          setQrImageLoaded(true);
                          setQrImageError(false);
                        }}
                        onError={() => {
                          setQrImageLoaded(true);
                          setQrImageError(true);
                        }}
                      />
                    )
                  )}

                  {isExpired && (
                    <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-3">
                      <p className="text-xs font-bold text-slate-800">
                        Phiên QR tạm hết thời gian hiển thị
                      </p>
                      <button
                        type="button"
                        onClick={handleRefreshQr}
                        disabled={isRefreshingQr}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                        <span>Tạo lại mã QR mới</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500">Số tiền thanh toán</p>
                <p className="text-2xl font-black text-rose-600 tracking-tight mt-0.5">
                  {formatPrice(displayAmount)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className={`grid gap-3 ${
                paymentData?.qrDownloadUrl ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => checkStatusOnce(true)}
                disabled={isManualChecking}
                leftIcon={
                  <RefreshCw className={`w-4 h-4 ${isManualChecking ? 'animate-spin' : ''}`} />
                }
                className="font-bold shadow-sm"
              >
                {isManualChecking ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản'}
              </Button>

              {paymentData?.qrDownloadUrl && (
                <a
                  href={paymentData.qrDownloadUrl}
                  download={`VietQR-${transferContent}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition shadow-2xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải ảnh QR</span>
                </a>
              )}
            </div>

            {/* 3 Quick Steps */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="space-y-1.5 px-1">
                <div className="mx-auto w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <p className="font-semibold text-slate-800">1. Mở App Bank</p>
                <p className="text-slate-500 leading-tight">Chọn tính năng Quét QR</p>
              </div>
              <div className="space-y-1.5 px-1">
                <div className="mx-auto w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <p className="font-semibold text-slate-800">2. Quét mã trên</p>
                <p className="text-slate-500 leading-tight">Giữ nguyên nội dung CK</p>
              </div>
              <div className="space-y-1.5 px-1">
                <div className="mx-auto w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="font-semibold text-slate-800">3. Hoàn tất 3–5s</p>
                <p className="text-slate-500 leading-tight">Web tự động xác nhận</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (6 cols): Bank Transfer Info + Order Summary */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Thông tin chuyển khoản
                  </h2>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Sao chép nhanh 1 chạm
                </span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Ngân hàng thụ hưởng</span>
                    <span className="font-bold text-slate-900">
                      {paymentData?.bankName || paymentData?.bankCode || 'Ngân hàng hỗ trợ VietQR'}
                    </span>
                  </div>
                  {paymentData?.bankCode && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-blue-700 shrink-0">
                      {paymentData.bankCode}
                    </span>
                  )}
                </div>

                {paymentData?.accountHolder && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Chủ tài khoản</span>
                      <span className="font-bold text-slate-900 uppercase">
                        {paymentData.accountHolder}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Số tài khoản</span>
                    <span className="font-mono text-base font-black text-slate-900 tracking-wide">
                      {paymentData?.accountNumber || '—'}
                    </span>
                  </div>
                  {paymentData?.accountNumber && (
                    <CopyButton
                      copied={copiedKey === 'account'}
                      onClick={() => handleCopy('account', paymentData.accountNumber || '')}
                    />
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Số tiền chính xác</span>
                    <span className="text-base font-black text-rose-600">
                      {formatPrice(displayAmount)}
                    </span>
                  </div>
                  <CopyButton
                    copied={copiedKey === 'amount'}
                    onClick={() => handleCopy('amount', String(displayAmount))}
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/80 border-2 border-dashed border-amber-300 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide block">
                        Nội dung chuyển khoản (Bắt buộc)
                      </span>
                      <span className="font-mono text-lg font-black text-slate-900 tracking-wider">
                        {transferContent}
                      </span>
                    </div>
                    <CopyButton
                      variant="amber"
                      copied={copiedKey === 'content'}
                      onClick={() => handleCopy('content', transferContent)}
                    />
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Lưu ý: Nếu chuyển khoản thủ công, vui lòng giữ nguyên chính xác nội dung{' '}
                    <strong className="font-mono">{transferContent}</strong> để hệ thống tự động xác nhận đơn hàng.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Tóm tắt đơn hàng #{orderId}
                </h3>
                {totalQty > 0 && (
                  <span className="text-xs font-semibold text-slate-500">{totalQty} sản phẩm</span>
                )}
              </div>

              {order && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-slate-700">
                    <p className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <strong className="text-slate-900">{order.receiverName}</strong>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.phoneNumber}</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{order.shippingAddress}</span>
                    </p>
                  </div>

                  {orderItems.length > 0 && (
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 pr-1">
                      {orderItems.map((item) => (
                        <div
                          key={item.id || item.productId}
                          className="py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 truncate">
                              {item.productName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {item.variantName ? `${item.variantName} • ` : ''}SL: {item.quantity}
                            </p>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0">
                            {formatPrice(item.totalPrice || item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!confirmCancelOpen ? (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to={ROUTES.MY_ORDERS}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Để sau — Xem Đơn hàng của tôi</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setConfirmCancelOpen(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Hủy đơn hàng này
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2.5 text-xs">
                  <p className="font-bold text-rose-900">Xác nhận hủy đơn hàng #{orderId}?</p>
                  <p className="text-rose-700">
                    Nếu bạn chưa chuyển khoản, đơn hàng sẽ được hủy và hoàn lại tồn kho ngay lập tức.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={isCancellingOrder}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer disabled:opacity-60"
                    >
                      {isCancellingOrder ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelOpen(false)}
                      disabled={isCancellingOrder}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                      Giữ lại
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SepayQrPaymentPage;
