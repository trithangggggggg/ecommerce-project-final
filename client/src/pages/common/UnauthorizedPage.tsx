import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa] px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-xs border border-gray-200">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">403 - Không Có Quyền Truy Cập</h1>
        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
          Tài khoản của bạn không có quyền để truy cập vào khu vực này. Trang này chỉ dành riêng cho Quản trị viên (Admin).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={ROUTES.HOME}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Trang chủ
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="px-4 py-2.5 bg-[#181a20] hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
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
