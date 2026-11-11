import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Home,
  Receipt,
  CreditCard,
  PackageCheck,
} from 'lucide-react';
import paymentService, { type SepayReturnResponse } from '../../api/services/payment.service';
import { formatPrice } from '../../utils/format';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SepayReturnResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lấy các tham số cơ bản từ query string
  const paymentParam = searchParams.get('payment');
  const invoiceParam = searchParams.get('invoice');
  const orderIdParam = searchParams.get('orderId');

  useEffect(() => {
    let isMounted = true;

    const verifyPayment = async () => {
      // Chuyển toàn bộ query params thành Record<string, string>
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        paramsObj[key] = value;
      });

      // Tự động map các tham số nếu điều hướng từ VNPAY chuẩn
      if (!paramsObj['payment'] && paramsObj['vnp_ResponseCode']) {
        paramsObj['payment'] =
          paramsObj['vnp_ResponseCode'] === '00'
            ? 'success'
            : paramsObj['vnp_ResponseCode'] === '24'
            ? 'cancel'
            : 'error';
      }
      if (!paramsObj['orderId'] && paramsObj['vnp_TxnRef']) {
        if (/^\d+$/.test(paramsObj['vnp_TxnRef'])) {
          paramsObj['orderId'] = paramsObj['vnp_TxnRef'];
        } else {
          paramsObj['invoice'] = paramsObj['vnp_TxnRef'];
        }
      }

      // Nếu không có bất kỳ param nào liên quan đến thanh toán
      if (!paymentParam && !paramsObj['vnp_ResponseCode'] && !paramsObj['orderId']) {
        if (isMounted) {
          setLoading(false);
          setErrorMessage('Không tìm thấy thông tin giao dịch thanh toán trong liên kết.');
        }
        return;
      }

      try {
        setLoading(true);
        const data = await paymentService.verifyPayment(paramsObj);
        if (isMounted) {
          setResult(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Không thể xác thực kết quả giao dịch từ cổng thanh toán.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyPayment();

    return () => {
      isMounted = false;
    };
  }, [searchParams, paymentParam]);

  // Phân tích trạng thái giao dịch
  const vnpResponseCode = searchParams.get('vnp_ResponseCode');
  const isVnpSuccess = vnpResponseCode === '00';
  const isVnpCancel = vnpResponseCode === '24';

  const isSuccess = result
    ? result.success
    : isVnpSuccess || paymentParam?.toLowerCase() === 'success';

  const isCancelled = result
    ? result.cancelled
    : isVnpCancel || paymentParam?.toLowerCase() === 'cancel';

  const vnpAmount = searchParams.get('vnp_Amount');
  const parsedVnpAmount = vnpAmount ? Number(vnpAmount) / 100 : undefined;

  const displayOrderId =
    result?.orderId ||
    orderIdParam ||
    (searchParams.get('vnp_TxnRef') && /^\d+$/.test(searchParams.get('vnp_TxnRef') || '')
      ? searchParams.get('vnp_TxnRef')
      : null);
  const displayInvoice =
    result?.invoiceNumber ||
    invoiceParam ||
    searchParams.get('vnp_TransactionNo') ||
    searchParams.get('vnp_TxnRef');
  const displayAmount = result?.amount ?? parsedVnpAmount;

  return (
    <div className="min-h-[80vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <div className="max-w-xl w-full">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 text-center space-y-5 animate-fade-in">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-75" />
              <div className="w-14 h-14 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Đang đối soát giao dịch</h2>
              <p className="text-sm text-slate-500">
                Hệ thống đang kết nối với cổng thanh toán để xác thực kết quả giao dịch. Vui lòng chờ trong giây lát...
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
            {/* Header Banner */}
            <div
              className={`p-8 text-center text-white ${
                isSuccess
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  : isCancelled
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                  : 'bg-gradient-to-br from-rose-500 to-red-600'
              }`}
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                {isSuccess ? (
                  <CheckCircle2 className="w-12 h-12 text-white" />
                ) : isCancelled ? (
                  <AlertTriangle className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                {isSuccess
                  ? 'Thanh toán thành công!'
                  : isCancelled
                  ? 'Giao dịch đã bị hủy'
                  : 'Thanh toán không thành công'}
              </h1>
              <p className="mt-2 text-sm text-white/90 max-w-md mx-auto">
                {result?.message ||
                  errorMessage ||
                  (isSuccess
                    ? 'Đơn hàng của bạn đã được ghi nhận thanh toán thành công và đang được chuẩn bị đóng gói.'
                    : isCancelled
                    ? 'Bạn đã hủy quá trình thanh toán trực tuyến hoặc phiên làm việc đã hết hạn.'
                    : 'Giao dịch bị từ chối hoặc gặp trục trặc kỹ thuật. Vui lòng thử lại hoặc chọn phương thức khác.')}
              </p>
            </div>

            {/* Chi tiết đơn hàng */}
            <div className="p-6 sm:p-8 space-y-6">
              {(displayOrderId || displayInvoice || displayAmount) && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-500" />
                    <span>Thông tin giao dịch</span>
                  </div>

                  <div className="divide-y divide-slate-200/60 text-sm">
                    {displayOrderId && (
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-slate-500">Mã đơn hàng:</span>
                        <span className="font-bold text-slate-800">#{displayOrderId}</span>
                      </div>
                    )}

                    {displayInvoice && (
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-slate-500">Mã hóa đơn / GD:</span>
                        <span className="font-mono font-medium text-slate-700 text-xs">
                          {displayInvoice}
                        </span>
                      </div>
                    )}

                    {displayAmount !== undefined && displayAmount !== null && (
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-slate-500">Số tiền:</span>
                        <span className="text-base font-black text-rose-600">
                          {formatPrice(displayAmount)}
                        </span>
                      </div>
                    )}

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-500">Cổng thanh toán:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>VNPAY / SePay</span>
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-500">Trạng thái:</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isSuccess
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCancelled
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isSuccess
                          ? 'Đã thanh toán'
                          : isCancelled
                          ? 'Đã hủy'
                          : 'Chưa hoàn tất'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => navigate(ROUTES.MY_ORDERS || '/my-orders')}
                  className="font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <PackageCheck className="w-5 h-5" />
                  <span>Xem danh sách đơn hàng</span>
                </Button>

                {!isSuccess && (
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={() => navigate(ROUTES.CHECKOUT || '/checkout')}
                    className="font-bold flex items-center justify-center gap-2 border-slate-300 hover:bg-slate-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Thử đặt lại đơn hàng</span>
                  </Button>
                )}

                <Link
                  to={ROUTES.HOME || '/'}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
                >
                  <Home className="w-4 h-4" />
                  <span>Về trang chủ</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
