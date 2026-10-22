import React, { useState } from 'react';
import { Save, Store, CheckCircle2 } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const AdminSettingsPage: React.FC = () => {
  const [storeName, setStoreName] = useState('NEXOR Official Store');
  const [hotline, setHotline] = useState('1900 6868');
  const [email, setEmail] = useState('support@nexor.vn');
  const [address, setAddress] = useState('Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3 font-sans select-none overflow-hidden">
      {saved && (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Cấu hình hệ thống đã được lưu thành công!</span>
        </div>
      )}

      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-xs text-slate-500 mt-0.5">Thiết lập thông tin thương hiệu, liên hệ và chính sách cửa hàng</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Tên cửa hàng / Thương hiệu"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            leftIcon={<Store className="w-4 h-4" />}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hotline hỗ trợ"
              value={hotline}
              onChange={(e) => setHotline(e.target.value)}
              required
            />
            <Input
              label="Email tiếp nhận thông tin"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Địa chỉ trụ sở chính
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="dark" size="md" leftIcon={<Save className="w-4 h-4" />}>
              Lưu thiết lập
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
