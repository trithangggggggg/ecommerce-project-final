import React from 'react';
import { Truck } from 'lucide-react';

export const AdminShippingPage: React.FC = () => {
  const carriers = [
    { name: 'Giao Hàng Nhanh (GHN)', code: 'GHN-EXPRESS', status: 'Đang kết nối', activeOrders: 18, rating: '4.9/5' },
    { name: 'Giao Hàng Tiết Kiệm (GHTK)', code: 'GHTK-FAST', status: 'Đang kết nối', activeOrders: 24, rating: '4.8/5' },
    { name: 'Viettel Post', code: 'VT-POST', status: 'Đang kết nối', activeOrders: 12, rating: '4.7/5' },
    { name: 'Hỏa Tốc Nội Thành (Ahamove)', code: 'AHA-NOW', status: 'Sẵn sàng', activeOrders: 6, rating: '5.0/5' },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div>
        <span className="text-xs font-semibold text-slate-400 block mb-0.5">Vận chuyển & Giao nhận</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đối tác vận chuyển</h1>
        <p className="text-xs text-slate-500 mt-1">Quản lý tích hợp đơn vị vận chuyển và theo dõi đơn giao liên tỉnh</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {carriers.map((c) => (
          <div key={c.code} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
              <span className="text-[11px] text-slate-400 font-mono">{c.code}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs flex justify-between">
              <span className="text-slate-500">Đơn đang giao:</span>
              <span className="font-bold text-blue-600">{c.activeOrders} đơn</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminShippingPage;
