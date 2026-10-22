import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';

export interface SupplierItem {
  id: number;
  code: string;
  name: string;
  brand: string;
  contact: string;
  email: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const INITIAL_SUPPLIERS: SupplierItem[] = [
  { id: 1, code: 'NCC-APPLE-VN', name: 'Apple Vietnam Authorized Distributor', brand: 'Apple', contact: '028 3822 1234', email: 'distribution@apple.vn', address: 'Tòa nhà Deutsches Haus, Lê Duẩn, Quận 1, TP.HCM', status: 'ACTIVE' },
  { id: 2, code: 'NCC-SAMSUNG', name: 'Samsung Electronics Vina Corporation', brand: 'Samsung', contact: '024 3755 8888', email: 'b2b.partner@samsung.com', address: 'Tòa nhà Bitexco Financial Tower, Quận 1, TP.HCM', status: 'ACTIVE' },
  { id: 3, code: 'NCC-FPT-SYNNEX', name: 'FPT Synnex Distribution Co., Ltd', brand: 'Dell, HP, Asus, Lenovo', contact: '024 7300 6666', email: 'synnex.tech@fpt.com', address: 'Tòa nhà FPT Cầu Giấy, Duy Tân, Cầu Giấy, Hà Nội', status: 'ACTIVE' },
  { id: 4, code: 'NCC-DIGIWORLD', name: 'DGW - Digiworld Corporation', brand: 'Xiaomi, Sony, Acer', contact: '028 3929 0059', email: 'partner@digiworld.com.vn', address: 'Số 195 Cô Bắc, Phường Cô Giang, Quận 1, TP.HCM', status: 'ACTIVE' },
  { id: 5, code: 'NCC-PETROSETCO', name: 'PSD - Petrosetco Distribution', brand: 'Apple, Microsoft, Corsair', contact: '028 3911 8888', email: 'contact@psd.com.vn', address: 'Số 1-5 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM', status: 'ACTIVE' },
  { id: 6, code: 'NCC-VINH-XUAN', name: 'Vĩnh Xuân Computer (SPC)', brand: 'ASUS, Gigabyte, MSI', contact: '024 3943 9121', email: 'sales@spc.com.vn', address: 'Số 39 Trần Quốc Toản, Hàng Bài, Hoàn Kiếm, Hà Nội', status: 'ACTIVE' },
  { id: 7, code: 'NCC-VIEN-SON', name: 'Viễn Sơn Distribution (Micro-Star)', brand: 'MSI, Kingston, ViewSonic', contact: '028 3832 6085', email: 'info@microstar.vn', address: 'Số 175 Bùi Thị Xuân, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', status: 'ACTIVE' },
  { id: 8, code: 'NCC-ELITE-VN', name: 'Elite Technology JSC', brand: 'Cisco, Fortinet, HP Enterprise', contact: '028 3512 3959', email: 'sales@elite-jsc.com', address: 'Tòa nhà Rosana, 60 Nguyễn Đình Chiểu, Quận 1, TP.HCM', status: 'INACTIVE' },
  { id: 9, code: 'NCC-KTC-TECH', name: 'KTC Co., Ltd (Khải Thiên)', brand: 'Logitech, SanDisk, WD', contact: '028 3835 1515', email: 'distribution@ktc.com.vn', address: '384 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM', status: 'ACTIVE' },
  { id: 10, code: 'NCC-MEGATECH', name: 'Mega Technology Group', brand: 'Anker, Baseus, Ugreen', contact: '024 3783 4567', email: 'partner@megatech.vn', address: 'Số 12 Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội', status: 'ACTIVE' },
  { id: 11, code: 'NCC-LOGITECH-VN', name: 'Logitech Vietnam Representative Office', brand: 'Logitech, Astro Gaming', contact: '028 3910 7799', email: 'vietnam.b2b@logitech.com', address: 'Tòa nhà Saigon Tower, Lê Duẩn, Quận 1, TP.HCM', status: 'ACTIVE' },
  { id: 12, code: 'NCC-LG-VN', name: 'LG Electronics Vietnam Hải Phòng', brand: 'LG Monitors, Gram Laptops', contact: '0225 883 1000', email: 'b2b.lg@lge.com', address: 'KCN Tràng Duệ, An Dương, TP. Hải Phòng', status: 'ACTIVE' },
  { id: 13, code: 'NCC-AUDIO-TECH', name: 'Audio Technica & Marshall VN Distro', brand: 'Marshall, JBL, Harman Kardon', contact: '028 3930 9999', email: 'sound.partner@audio.vn', address: '180 Nam Kỳ Khởi Nghĩa, Phường 6, Quận 3, TP.HCM', status: 'ACTIVE' },
  { id: 14, code: 'NCC-INTEL-VN', name: 'Intel Products Vietnam Co., Ltd', brand: 'Intel Core, Arc GPU', contact: '028 3736 3000', email: 'partner.relations@intel.com', address: 'Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM', status: 'INACTIVE' },
];

const ITEMS_PER_PAGE = 10;

export const AdminSuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(INITIAL_SUPPLIERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierItem | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    brand: '',
    contact: '',
    email: '',
    address: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    brand: '',
    contact: '',
    email: '',
    address: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code.trim() || !addForm.name.trim()) {
      showToast('Vui lòng điền mã và tên nhà cung cấp!');
      return;
    }

    const newSupplier: SupplierItem = {
      id: Date.now(),
      code: addForm.code.trim().toUpperCase(),
      name: addForm.name.trim(),
      brand: addForm.brand.trim() || 'Đa thương hiệu',
      contact: addForm.contact.trim() || '024 0000 0000',
      email: addForm.email.trim() || 'partner@techsupplier.vn',
      address: addForm.address.trim() || 'Hà Nội, Việt Nam',
      status: addForm.status,
    };

    setSuppliers([newSupplier, ...suppliers]);
    setIsAddOpen(false);
    setAddForm({
      code: '',
      name: '',
      brand: '',
      contact: '',
      email: '',
      address: '',
      status: 'ACTIVE',
    });
    showToast(`Đã thêm nhà cung cấp "${newSupplier.name}"`);
  };

  // Open edit
  const handleOpenEdit = (s: SupplierItem) => {
    setEditingSupplier(s);
    setEditForm({
      code: s.code,
      name: s.name,
      brand: s.brand,
      contact: s.contact,
      email: s.email,
      address: s.address,
      status: s.status,
    });
  };

  // Edit submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setSuppliers((prev) =>
      prev.map((item) =>
        item.id === editingSupplier.id
          ? {
              ...item,
              code: editForm.code.trim().toUpperCase(),
              name: editForm.name.trim(),
              brand: editForm.brand.trim(),
              contact: editForm.contact.trim(),
              email: editForm.email.trim(),
              address: editForm.address.trim(),
              status: editForm.status,
            }
          : item
      )
    );

    showToast(`Đã cập nhật nhà cung cấp "${editForm.name}"!`);
    setEditingSupplier(null);
  };

  // Delete
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    showToast(`Đã xóa nhà cung cấp "${deleteTarget.name}"`);
    setDeleteTarget(null);
  };

  // Filter
  const filteredSuppliers = suppliers.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = s.code.toLowerCase().includes(q);
      const matchName = s.name.toLowerCase().includes(q);
      const matchBrand = s.brand.toLowerCase().includes(q);
      const matchContact = s.contact.includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      return matchCode || matchName || matchBrand || matchContact || matchEmail;
    }
    return true;
  });

  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE').length;

  // Pagination calculation
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE) || 1;
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600" />
            <span>Đối tác & Nhà cung cấp thiết bị</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {suppliers.length} nhà cung cấp
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách các nhà phân phối ủy quyền, hãng công nghệ chính hãng cung cấp linh kiện và sản phẩm
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddOpen(true)}
        >
          Thêm nhà cung cấp
        </Button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng nhà cung cấp</span>
          <span className="text-lg font-bold text-slate-900">{suppliers.length}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đang hợp tác</span>
          <span className="text-lg font-bold text-emerald-600">{activeCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Hãng đại diện</span>
          <span className="text-lg font-bold text-blue-600">25+ hãng</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tạm dừng giao dịch</span>
          <span className="text-lg font-bold text-slate-500">{inactiveCount}</span>
        </div>
      </div>

      {/* Main Table Card (Dạng bảng gọn gàng) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1 max-w-xl">
            <div className="w-full sm:w-64">
              <Input
                type="text"
                placeholder="Tìm tên đối tác, mã NCC..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg self-start sm:self-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang hợp tác ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('INACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-rose-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tạm dừng ({inactiveCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredSuppliers.length}</strong> / {suppliers.length} nhà cung cấp
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                <th className="py-2.5 px-3 bg-slate-50/95">Mã NCC</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Nhà cung cấp / Doanh nghiệp</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Thương hiệu</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Thông tin liên hệ</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Địa chỉ trụ sở</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Trạng thái</th>
                <th className="py-2.5 px-3 bg-slate-50/95 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy nhà cung cấp nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition group">
                    {/* Code */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                        {s.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate block" title={s.name}>
                          {s.name}
                        </span>
                      </div>
                    </td>

                    {/* Brand */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{s.brand}</span>
                      </span>
                    </td>

                    {/* Contact (Phone + Email) */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-800 font-medium text-xs">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{s.contact}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{s.email}</span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-2 px-3 max-w-[180px] truncate" title={s.address}>
                      <div className="flex items-center gap-1 text-slate-600 text-xs">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{s.address}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{s.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          title="Chỉnh sửa nhà cung cấp"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa nhà cung cấp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - 10 rows per page - Pinned to bottom */}
        {filteredSuppliers.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSuppliers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: THÊM NHÀ CUNG CẤP MỚI                           */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Thêm nhà cung cấp / đối tác mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã NCC (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NCC-ASUS-VN"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thương hiệu phân phối</label>
                  <input
                    type="text"
                    placeholder="VD: Apple, ASUS, Dell..."
                    value={addForm.brand}
                    onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên đơn vị / Doanh nghiệp *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công ty TNHH Phân Phối Synnex FPT..."
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    placeholder="024 1234 5678"
                    value={addForm.contact}
                    onChange={(e) => setAddForm({ ...addForm, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email giao dịch</label>
                  <input
                    type="email"
                    placeholder="partner@supplier.vn"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa chỉ trụ sở / Kho chính</label>
                <input
                  type="text"
                  placeholder="Tòa nhà văn phòng, Đường, Quận, Thành phố..."
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Trạng thái hợp tác</label>
                <select
                  value={addForm.status}
                  onChange={(e) => setAddForm({ ...addForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                >
                  <option value="ACTIVE">Đang hợp tác phân phối</option>
                  <option value="INACTIVE">Tạm dừng giao dịch</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu nhà cung cấp
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHỈNH SỬA NHÀ CUNG CẤP (SỬA)                     */}
      {/* ======================================================== */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <span>Chỉnh sửa đối tác {editingSupplier.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã NCC (Code) *</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thương hiệu phân phối</label>
                  <input
                    type="text"
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên đơn vị / Doanh nghiệp *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={editForm.contact}
                    onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email giao dịch</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa chỉ trụ sở</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Trạng thái hợp tác</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                >
                  <option value="ACTIVE">Đang hợp tác phân phối</option>
                  <option value="INACTIVE">Tạm dừng giao dịch</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingSupplier(null)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: XÁC NHẬN XÓA NHÀ CUNG CẤP                        */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa đối tác này?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa đối tác <strong>{deleteTarget.name}</strong> ({deleteTarget.code})?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
                onClick={handleDeleteConfirm}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliersPage;
