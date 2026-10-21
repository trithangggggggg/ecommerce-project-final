import React, { useState } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import Button from '../../components/common/Button/Button';

interface Promo {
  code: string;
  discount: string;
  minOrder: string;
  expiry: string;
  usage: string;
  status: 'ACTIVE' | 'EXPIRED';
}

const MOCK_PROMOS: Promo[] = [
  { code: 'TECHWELCOME', discount: 'Giảm 10% (Tối đa 500k)', minOrder: 'Đơn từ 2.000.000₫', expiry: '31/12/2026', usage: '142/500 lượt', status: 'ACTIVE' },
  { code: 'APPLEDEAL', discount: 'Giảm 1.000.000₫', minOrder: 'Đơn Apple từ 15.000.000₫', expiry: '30/11/2026', usage: '89/100 lượt', status: 'ACTIVE' },
  { code: 'FREESHIP', discount: 'Miễn phí giao hàng toàn quốc', minOrder: 'Mọi đơn hàng', expiry: 'Không thời hạn', usage: '1.200 lượt', status: 'ACTIVE' },
  { code: 'GAMINGPRO', discount: 'Giảm 500.000₫', minOrder: 'Phụ kiện & Laptop Gaming', expiry: '15/10/2026', usage: '50/50 lượt', status: 'EXPIRED' },
];

export const AdminPromotionsPage: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-0.5">Quản lý bán hàng</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Mã khuyến mãi & Voucher</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {MOCK_PROMOS.length} mã
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Quản lý các chương trình ưu đãi, voucher giảm giá cho khách hàng</p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => alert('Thêm voucher mới!')}>
          Tạo mã mới
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_PROMOS.map((promo) => (
          <div key={promo.code} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                promo.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {promo.status === 'ACTIVE' ? 'Đang áp dụng' : 'Hết hạn'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(promo.code)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold cursor-pointer"
              >
                {copied === promo.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === promo.code ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            <div>
              <span className="text-sm font-extrabold text-slate-900 font-mono tracking-wider bg-slate-50 px-2 py-1 rounded-md border border-slate-200 block text-center">
                {promo.code}
              </span>
              <p className="text-xs font-bold text-blue-600 mt-2">{promo.discount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{promo.minOrder}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Đã dùng: {promo.usage}</span>
              <span>HSD: {promo.expiry}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPromotionsPage;
