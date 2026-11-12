import { Link } from 'react-router-dom';
import {
  Shield,
  Truck,
  RefreshCw,
  CreditCard,
  PhoneCall,
  Mail,
  MapPin,
  Clock,
} from 'lucide-react';
import { useSiteConfigStore } from '../../../store/useSiteConfigStore';
import { ROUTES } from '../../../constants/routes';
import { formatPrice } from '../../../utils/format';

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function MessageCircleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.75 1.38 5.21 3.56 6.86L4.6 21.8a.5.5 0 0 0 .72.56l4.02-2.1c.85.19 1.74.29 2.66.29 5.52 0 10-4.03 10-9s-4.48-9-10-9z" />
    </svg>
  );
}

export default function Footer() {
  const { config, policies } = useSiteConfigStore();
  const { store, shipping, payment, social } = config;
  const freeshipLabel =
    shipping.freeshipThreshold > 0
      ? `Miễn phí đơn từ ${formatPrice(shipping.freeshipThreshold)}`
      : `Phí giao hàng tiêu chuẩn ${formatPrice(shipping.defaultFee)}`;

  const serviceBenefits = [
    { icon: Truck, title: 'Giao hàng siêu tốc', desc: freeshipLabel },
    { icon: Shield, title: 'Bảo hành chính hãng', desc: '12 - 24 tháng cam kết đổi mới' },
    { icon: RefreshCw, title: '1 đổi 1 trong 30 ngày', desc: 'Nhanh chóng nếu lỗi từ NSX' },
    { icon: CreditCard, title: 'Thanh toán linh hoạt', desc: shipping.estimatedLeadTime || '2 - 3 ngày làm việc' },
  ];

  const activePaymentMethods: string[] = [];
  if (payment.codEnabled) activePaymentMethods.push('COD (Tiền mặt)');
  if (payment.sepayEnabled) activePaymentMethods.push('VietQR / SePay');
  if (payment.vnpayEnabled) activePaymentMethods.push('VNPay');

  const socialLinks = [
    { icon: YoutubeIcon, label: 'YouTube', color: '#ff0000', href: social.youtubeUrl },
    { icon: FacebookIcon, label: 'Facebook', color: '#1877f2', href: social.facebookUrl },
    { icon: MessageCircleIcon, label: 'Zalo', color: '#0068ff', href: social.zaloUrl },
  ].filter((item) => Boolean(item.href && item.href.trim() && item.href.trim() !== '#'));

  return (
    <footer role="contentinfo" className="bg-white text-gray-600 border-t border-gray-200 mt-16 font-sans">
      {/* 4 Value Proposition Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {serviceBenefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Icon size={20} />
                </span>
                <div>
                  <div className="font-bold text-sm text-gray-900">{title}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Hotline Support & Store Info */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/images/nexor_logo.png"
                alt={store.name || 'NEXOR Logo'}
                className="w-8 h-8 object-contain drop-shadow-sm"
              />
              <span className="text-lg font-black tracking-tight text-gray-900">
                {store.shortName || 'NEXOR'}<span className="text-indigo-600">.</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {store.tagline || 'Hệ thống bán lẻ thiết bị công nghệ chính hãng.'}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <PhoneCall size={14} className="text-blue-600 shrink-0" />
                <span>
                  Hotline hỗ trợ: <strong className="text-gray-900">{store.hotlineLabel || store.hotline || '1800 6688'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={14} className="text-blue-600 shrink-0" />
                <span>
                  Giờ làm việc: <strong>{store.openHours || '08:00 - 22:00'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail size={14} className="text-blue-600 shrink-0" />
                <span>
                  Email: <strong>{store.email || 'support@nexor.vn'}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <MapPin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <span>{store.address || 'TP. Hồ Chí Minh & Hà Nội · Giao hàng toàn quốc'}</span>
              </div>
            </div>

            {activePaymentMethods.length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-bold text-gray-900 mb-2">Phương thức thanh toán hỗ trợ</div>
                <div className="flex flex-wrap gap-1.5">
                  {activePaymentMethods.map((pm) => (
                    <span
                      key={pm}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[11px] font-semibold border border-gray-200"
                    >
                      {pm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Dynamic Policies from Admin */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3.5">
              Thông tin & Chính sách
            </h3>
            <ul className="space-y-2 text-xs">
              {policies.length > 0 ? (
                policies.slice(0, 7).map((policy) => (
                  <li key={policy.id}>
                    <Link
                      to={`${ROUTES.POLICIES}/${encodeURIComponent(policy.slug)}`}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {policy.title}
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <Link
                    to={ROUTES.POLICIES}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Trung tâm Chính sách & Điều khoản
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3.5">
              Dịch vụ & Tiện ích
            </h3>
            <ul className="space-y-2 text-xs">
              {[
                { title: 'Tất cả sản phẩm công nghệ', to: ROUTES.PRODUCTS },
                { title: 'Tin tức & Đánh giá công nghệ', to: ROUTES.ARTICLES },
                { title: 'Hệ thống showroom toàn quốc', to: ROUTES.STORES },
                { title: 'Tra cứu đơn hàng của tôi', to: ROUTES.MY_ORDERS },
                { title: 'Giỏ hàng & Thanh toán', to: ROUTES.CART },
                { title: 'Trung tâm Chính sách & Bảo hành', to: ROUTES.POLICIES },
              ].map((link) => (
                <li key={link.title}>
                  <Link
                    to={link.to}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3.5">
              Kết nối với {store.shortName || 'NEXOR'}
            </h3>

            {socialLinks.length > 0 ? (
              <div className="flex gap-2.5 mb-4">
                {socialLinks.map(({ icon: Icon, label, color, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 transition-transform hover:-translate-y-0.5 hover:bg-gray-200"
                    style={{ color }}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Liên hệ trực tiếp qua hotline{' '}
                <strong className="text-gray-800">{store.hotline || '1800 6688'}</strong> hoặc email{' '}
                <strong className="text-gray-800">{store.email || 'support@nexor.vn'}</strong> để được tư vấn nhanh chóng.
              </p>
            )}

            <div className="text-xs text-gray-500 space-y-1.5 mb-4">
              <div className="font-bold text-gray-900">Cam kết dịch vụ:</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[11px] font-bold">
                  100% Chính hãng
                </span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">
                  Bảo hành minh bạch
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-200 bg-gray-50 py-4 px-4 text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">
          {store.name || 'NEXOR Technology Store'}
        </p>
        <p>{store.copyright || `© ${new Date().getFullYear()} NEXOR Technology. Bảo lưu mọi quyền.`}</p>
      </div>
    </footer>
  );
}
