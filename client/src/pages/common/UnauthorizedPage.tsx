import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">403 - Không Có Quyền Truy Cập</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Tài khoản của bạn không có quyền để truy cập vào khu vực này. Trang này chỉ dành riêng cho Quản trị viên (Admin).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={ROUTES.HOME}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Trang chủ
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập tài khoản khác
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
