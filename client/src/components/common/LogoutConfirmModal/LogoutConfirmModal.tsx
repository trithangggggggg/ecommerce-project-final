import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import Button from '../Button/Button';

export interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận đăng xuất',
  message = 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?',
}) => {
  // Đóng modal khi bấm phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-gray-100 max-w-sm w-full shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <LogOut className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
              <p className="text-[11px] text-gray-500">Tài khoản & Phiên đăng nhập</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-gray-600 leading-relaxed">
          {message}
        </p>

        {/* 2 Nút: Hủy và Đăng xuất */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;

