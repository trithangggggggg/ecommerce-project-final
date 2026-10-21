import React from 'react';
import { Link } from 'react-router-dom';
import { Home, HelpCircle } from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa] px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-xs border border-gray-200">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-1 tracking-tight">404</h1>
        <h2 className="text-base font-bold text-gray-800 mb-2">Trang không tồn tại</h2>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          Đường dẫn bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang địa chỉ khác trong hệ thống.
        </p>
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#181a20] hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Home className="w-4 h-4" />
          Quay lại Trang chủ
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
