import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">E-Commerce Client</h1>
        <p className="text-sm text-slate-500">Khung sườn thư mục đã sẵn sàng để phát triển.</p>
      </div>
    </div>
  </StrictMode>
);
