import React, { useState, useEffect, useCallback } from 'react';
import AdminPagination from '../../components/admin/AdminPagination';
import CKEditor5 from '../../components/common/CKEditor5';
import { policyService, type PolicyItem } from '../../api/services/policy.service';

const ITEMS_PER_PAGE = 10;

const POLICY_CATEGORIES = [
  { value: 'WARRANTY', label: 'Bảo hành' },
  { value: 'RETURN', label: 'Đổi trả & Hoàn tiền' },
  { value: 'SHIPPING', label: 'Vận chuyển & Giao nhận' },
  { value: 'PAYMENT', label: 'Thanh toán & Trả góp' },
  { value: 'PRIVACY', label: 'Bảo mật thông tin' },
  { value: 'TERMS', label: 'Điều khoản sử dụng' },
  { value: 'GENERAL', label: 'Quy định chung' },
];

const getCategoryLabel = (val: string) =>
  POLICY_CATEGORIES.find((c) => c.value === val)?.label || val;

export const AdminPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [detailPolicy, setDetailPolicy] = useState<PolicyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PolicyItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategory, setFormCategory] = useState('WARRANTY');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await policyService.searchAdminPolicies({
        keyword: searchQuery.trim() || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        page: currentPage - 1,
        size: ITEMS_PER_PAGE,
      });
      setPolicies(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách chính sách';
      showToast('error', msg);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, statusFilter, currentPage]);

  useEffect(() => {
    void fetchPolicies();
  }, [fetchPolicies]);

  const handleOpenAdd = () => {
    setEditingPolicy(null);
    setFormTitle('');
    setFormSlug('');
    setFormCategory('WARRANTY');
    setFormSummary('');
    setFormContent('');
    setFormDisplayOrder(totalElements + 1);
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PolicyItem) => {
    setEditingPolicy(item);
    setFormTitle(item.title);
    setFormSlug(item.slug || '');
    setFormCategory(item.category || 'GENERAL');
    setFormSummary(item.summary || '');
    setFormContent(item.content || '');
    setFormDisplayOrder(item.displayOrder ?? 0);
    setFormIsActive(Boolean(item.isActive));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenDetail = async (item: PolicyItem) => {
    setDetailPolicy(item);
    try {
      const fresh = await policyService.getAdminPolicyById(item.id);
      if (fresh) setDetailPolicy(fresh);
    } catch {
      // Keep current item
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề chính sách');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const payload = {
        title: formTitle.trim(),
        slug: formSlug.trim() || undefined,
        category: formCategory,
        summary: formSummary.trim() || undefined,
        content: formContent,
        displayOrder: Number(formDisplayOrder) || 0,
        isActive: formIsActive,
      };
      if (editingPolicy) {
        await policyService.updatePolicy(editingPolicy.id, payload);
        showToast('success', `Đã cập nhật chính sách "${payload.title}"`);
      } else {
        await policyService.createPolicy(payload);
        showToast('success', `Đã tạo chính sách "${payload.title}"`);
      }
      setIsModalOpen(false);
      await fetchPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu chính sách thất bại';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item: PolicyItem) => {
    try {
      await policyService.togglePolicyStatus(item.id, !item.isActive);
      showToast('success', `Đã ${item.isActive ? 'ẩn' : 'kích hoạt'} "${item.title}"`);
      await fetchPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi trạng thái thất bại';
      showToast('error', msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await policyService.deletePolicy(deleteTarget.id);
      showToast('success', `Đã xóa chính sách "${deleteTarget.title}"`);
      setDeleteTarget(null);
      await fetchPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa chính sách thất bại';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Chính sách & Điều khoản
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {totalElements} chính sách
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Biên soạn nội dung bảo hành, đổi trả, giao vận, thanh toán, bảo mật và điều khoản hiển thị trên website
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchPolicies()}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Thêm chính sách
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, slug hoặc tóm tắt..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:max-w-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả nhóm</option>
              {POLICY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="INACTIVE">Đang ẩn</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 font-medium tabular-nums">
            Tổng <strong className="text-slate-800">{totalElements}</strong> trang chính sách
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Tiêu đề</th>
                <th className="py-3 px-3.5">Nhóm</th>
                <th className="py-3 px-3.5">Slug</th>
                <th className="py-3 px-3.5">Thứ tự</th>
                <th className="py-3 px-3.5">Trạng thái</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Đang tải danh sách chính sách...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Chưa có chính sách nào phù hợp.
                  </td>
                </tr>
              ) : (
                policies.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 max-w-sm">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.summary && (
                        <div className="text-[11px] text-slate-500 truncate">{item.summary}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {getCategoryLabel(item.category)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      /policies/{item.slug}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-700 tabular-nums">
                      #{item.displayOrder}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(item)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.isActive ? 'Đang bật' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 cursor-pointer"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 bg-white">
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalElements}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* View Detail Modal */}
      {detailPolicy && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">{detailPolicy.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Nhóm: {getCategoryLabel(detailPolicy.category)} • Slug: /policies/{detailPolicy.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPolicy(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 text-xs">
              {detailPolicy.summary && (
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                  {detailPolicy.summary}
                </p>
              )}
              <div
                className="prose prose-sm max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: detailPolicy.content || '<p>Chưa có nội dung</p>' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                {editingPolicy ? `Cập nhật Chính sách #${editingPolicy.id}` : 'Thêm Chính sách Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Tiêu đề chính sách *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="VD: Chính sách bảo hành chính hãng 24 tháng"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhóm chính sách</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    {POLICY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Slug URL (tùy chọn)</label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="Tự động tạo từ tiêu đề"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Tóm tắt ngắn</label>
                  <input
                    type="text"
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min={0}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Hiển thị công khai trên cửa hàng</span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">Nội dung chi tiết *</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <CKEditor5
                      value={formContent}
                      onChange={setFormContent}
                      placeholder="Nhập chi tiết điều khoản / chính sách tại đây..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {isSaving ? 'Đang lưu...' : editingPolicy ? 'Cập nhật Chính sách' : 'Tạo Chính sách'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Chính sách</h3>
            <p className="text-xs text-slate-500">
              Bạn chắc chắn muốn xóa chính sách <strong className="text-slate-800">{deleteTarget.title}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteConfirm()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPoliciesPage;

