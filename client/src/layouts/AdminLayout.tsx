import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-slate-50 flex font-sans overflow-hidden text-slate-900">
      {/* Sidebar: Cố định bên trái với width w-60 */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Workspace: Đẩy sang phải bằng lg:pl-60, cố định h-screen */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 lg:pl-60 h-screen overflow-hidden">
        <AdminHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 bg-slate-50 p-3.5 sm:p-5 lg:p-6 overflow-hidden flex flex-col min-h-0">
          <div className="w-full max-w-[1440px] mx-auto h-full flex flex-col min-h-0 overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
