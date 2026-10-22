import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-[#f5f7fb] flex font-sans overflow-hidden">
      {/* Sidebar: Cố định 100% bên trái màn hình với width w-64 */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Workspace: Đẩy sang phải bằng lg:pl-64, cố định h-screen, không cuộn cả trang */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f5f7fb] lg:pl-64 h-screen overflow-hidden">
        <AdminHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 bg-[#f5f7fb] p-3 sm:p-4 lg:p-5 overflow-hidden flex flex-col min-h-0">
          <div className="w-full max-w-[1400px] mx-auto h-full flex flex-col min-h-0 overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
