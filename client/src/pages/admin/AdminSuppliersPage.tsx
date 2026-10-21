import React from 'react';
import { Building2, Phone, Mail } from 'lucide-react';

export const AdminSuppliersPage: React.FC = () => {
  const suppliers = [
    { name: 'Apple Vietnam Authorized Distributor', contact: '028 3822 1234', email: 'distribution@apple.vn', brand: 'Apple' },
    { name: 'Samsung Electronics Vina', contact: '024 3755 8888', email: 'b2b.partner@samsung.com', brand: 'Samsung' },
    { name: 'FPT Synnex Distribution', contact: '024 7300 6666', email: 'synnex.tech@fpt.com', brand: 'Dell, HP, Asus' },
    { name: 'DGW - Digiworld Corporation', contact: '028 3929 0059', email: 'partner@digiworld.com.vn', brand: 'Xiaomi, Sony' },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div>
        <span className="text-xs font-semibold text-slate-400 block mb-0.5">Quản lý kho</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đối tác & Nhà cung cấp</h1>
        <p className="text-xs text-slate-500 mt-1">Danh sách nhà phân phối ủy quyền thiết bị điện tử chính hãng</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {suppliers.map((s) => (
          <div key={s.name} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-sm truncate">{s.name}</h3>
                <span className="text-[11px] font-semibold text-blue-600">Thương hiệu: {s.brand}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.contact}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSuppliersPage;
