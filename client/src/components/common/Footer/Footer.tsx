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

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.41a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3 15.69a6.34 6.34 0 0 0 10.82 4.48 6.3 6.3 0 0 0 1.97-4.5V8.04a8.28 8.28 0 0 0 4.8 1.52V6.1c-.34 0-.68-.04-1-.13z" />
    </svg>
  );
}

const SERVICE_BENEFITS = [
  { icon: Truck, title: 'Giao hàng siêu tốc', desc: 'Miễn phí cho đơn từ 500.000₫' },
  { icon: Shield, title: 'Bảo hành chính hãng', desc: '12 - 24 tháng cam kết đổi mới' },
  { icon: RefreshCw, title: '1 đổi 1 trong 30 ngày', desc: 'Nhanh chóng nếu lỗi từ NSX' },
  { icon: CreditCard, title: 'Trả góp 0% lãi suất', desc: 'Hồ sơ duyệt nhanh trong 5 phút' },
];

const PAYMENT_METHODS = [
  'VNPAY',
  'MoMo',
  'ZaloPay',
  'Apple Pay',
  'Visa',
  'MasterCard',
  'JCB',
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer role="contentinfo" className="bg-white text-gray-600 border-t border-gray-200 mt-16 font-sans">
      {/* 4 Value Proposition Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICE_BENEFITS.map(({ icon: Icon, title, desc }) => (
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
                src="/images/logo.png"
                alt="NEXOR Logo"
                className="w-8 h-8 object-contain drop-shadow-sm"
              />
              <span className="text-lg font-black tracking-tight text-gray-900">
                NEXOR<span className="text-indigo-600">.</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Hệ thống bán lẻ thiết bị công nghệ chính hãng hàng đầu Việt Nam. Cam kết chất lượng, bảo hành tận tâm.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <PhoneCall size={14} className="text-blue-600" />
                <span>Hotline mua hàng: <strong className="text-gray-900">1800.2097</strong> (Miễn phí)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={14} className="text-blue-600" />
                <span>Giờ làm việc: <strong>08:00 - 21:30</strong> hàng ngày</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail size={14} className="text-blue-600" />
                <span>Email hỗ trợ: <strong>cskh@eshoptech.vn</strong></span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <MapPin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Hà Nội & TP. Hồ Chí Minh · Giao hàng toàn quốc</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-bold text-gray-900 mb-2">Phương thức thanh toán</div>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((pm) => (
                  <span
                    key={pm}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[11px] font-semibold border border-gray-200"
                  >
                    {pm}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Policies */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3.5">
              Thông tin & Chính sách
            </h3>
            <ul className="space-y-2 text-xs">
              {[
                { title: 'Mua hàng và thanh toán Online', to: '/products' },
                { title: 'Mua hàng trả góp 0% qua thẻ', to: '/products' },
                { title: 'Chính sách giao hàng toàn quốc', to: '/products' },
                { title: 'Chính sách bảo hành chính hãng', to: '/products' },
                { title: 'Chính sách đổi trả 1 - 1 trong 30 ngày', to: '/products' },
                { title: 'Tra cứu hóa đơn điện tử VAT', to: '/profile' },
                { title: 'Chính sách bảo mật dữ liệu', to: '/products' },
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

          {/* Column 3: Services */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3.5">
              Dịch vụ & Tiện ích
            </h3>
            <ul className="space-y-2 text-xs">
              {[
                { title: 'Khách hàng doanh nghiệp (B2B)', to: '/products' },
                { title: 'Ưu đãi thanh toán ngân hàng & Ví điện tử', to: '/products' },
                { title: 'Tích điểm & Quyền lợi thành viên', to: '/profile' },
                { title: 'Thu cũ đổi mới trợ giá lên tới 2 triệu', to: '/products' },
                { title: 'Tuyển dụng nhân sự E-ShopTECH', to: '/products' },
                { title: 'Hệ thống showroom công nghệ', to: '/products' },
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
              Kết nối với E-ShopTECH
            </h3>

            <div className="flex gap-2.5 mb-4">
              {[
                { icon: YoutubeIcon, label: 'YouTube', color: '#ff0000', href: '#' },
                { icon: FacebookIcon, label: 'Facebook', color: '#1877f2', href: '#' },
                { icon: TikTokIcon, label: 'TikTok', color: '#000000', href: '#' },
              ].map(({ icon: Icon, label, color, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 transition-transform hover:-translate-y-0.5 hover:bg-gray-200"
                  style={{ color }}
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>

            <div className="text-xs text-gray-500 space-y-1.5 mb-4">
              <div className="font-bold text-gray-900">Chứng nhận uy tín:</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[11px] font-bold">
                  ✓ Bộ Công Thương
                </span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">
                  DMCA PROTECTED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-200 bg-gray-50 py-4 px-4 text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">
          Công ty Cổ phần Công nghệ E-ShopTECH Việt Nam
        </p>
        <p>© {currentYear} E-ShopTECH. Tất cả quyền được bảo lưu.</p>
      </div>
    </footer>
  );
}
