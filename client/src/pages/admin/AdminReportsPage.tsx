import React from 'react';
import { BarChart3, ArrowUpRight } from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans">
      <div>
        <span className="text-xs font-semibold text-slate-400 block mb-0.5">Báo cáo & Phân tích</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo cáo doanh thu & Hiệu quả kinh doanh</h1>
        <p className="text-xs text-slate-500 mt-1">Phân tích tăng trưởng doanh số, tỷ suất lợi nhuận và xu hướng tiêu dùng</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">Doanh thu tháng này</span>
          <span className="text-2xl font-black text-slate-900">485.600.000 ₫</span>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +18.2% so với tháng trước
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">Lợi nhuận ròng ước tính</span>
          <span className="text-2xl font-black text-blue-600">92.400.000 ₫</span>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Tỷ suất 19.0%
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">Giá trị trung bình đơn (AOV)</span>
          <span className="text-2xl font-black text-purple-600">8.450.000 ₫</span>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +5.4%
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs text-center py-12">
        <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Biểu đồ phân tích doanh số nâng cao</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Hệ thống đang tổng hợp dữ liệu giao dịch từ 30 ngày gần nhất để trích xuất báo cáo chuyên sâu.
        </p>
      </div>
    </div>
  );
};

export default AdminReportsPage;
