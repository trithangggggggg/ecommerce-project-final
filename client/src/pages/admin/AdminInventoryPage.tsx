import React from 'react';
import { Archive } from 'lucide-react';

export const AdminInventoryPage: React.FC = () => {
  const warehouses = [
    { name: 'Kho Tổng Miền Bắc (Hà Nội)', address: 'Kho KCN Đài Tư, Long Biên, Hà Nội', capacity: '78%', skuCount: 420 },
    { name: 'Kho Trung Chuyển Đà Nẵng', address: 'Khu công nghiệp Hòa Cầm, Cẩm Lệ, Đà Nẵng', capacity: '52%', skuCount: 180 },
    { name: 'Kho Tổng Miền Nam (TP.HCM)', address: 'Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM', capacity: '86%', skuCount: 560 },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div>
        <span className="text-xs font-semibold text-slate-400 block mb-0.5">Quản lý kho</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hệ thống kho & Tồn kho</h1>
        <p className="text-xs text-slate-500 mt-1">Theo dõi vị trí lưu trữ, sức chứa và kiểm kê hàng hóa công nghệ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <div key={w.name} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Archive className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Sức chứa {w.capacity}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{w.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{w.address}</p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs flex justify-between text-slate-600">
              <span>Mặt hàng lưu kho:</span>
              <span className="font-bold text-slate-900">{w.skuCount} SKU</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminInventoryPage;
