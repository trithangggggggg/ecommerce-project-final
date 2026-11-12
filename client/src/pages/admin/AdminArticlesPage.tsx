import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../components/common/Button/Button';
import AdminPagination from '../../components/admin/AdminPagination';
import CKEditor5 from '../../components/common/CKEditor5';
import { articleService } from '../../api/services/article.service';
import { aiService } from '../../api/services/ai.service';
import type { Article, ArticleRequest } from '../../models/article.model';

const CATEGORY_SUGGESTIONS = ['Công nghệ', 'Đánh giá', 'Tin tức', 'Thủ thuật', 'Khuyến mãi'];

const SUGGESTED_THUMBNAILS = [
  { label: 'MacBook M3', url: '/images/macbook-hero-banner.jpg' },
  { label: 'AI & Future', url: '/images/tech-future-banner.jpg' },
  { label: 'iPhone 16 Pro', url: '/images/iphone-16-pro-max.jpg' },
  { label: 'ROG Gaming', url: '/images/asus-rog-strix.jpg' },
  { label: 'Samsung S24', url: '/images/samsung-s24-ultra.jpg' },
];

export const AdminArticlesPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORY_SUGGESTIONS);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(''); // '', 'true', 'false'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [detailArticle, setDetailArticle] = useState<Article | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formStatus, setFormStatus] = useState(true);
  const [isSlugManual, setIsSlugManual] = useState(false);

  // AI Content Generator State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Convert string to SEO slug helper in Frontend
  const generateSlugPreview = (text: string) => {
    return text
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await articleService.getAdminArticles({
        keyword: searchKeyword.trim() || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus === '' ? undefined : selectedStatus === 'true',
        page: currentPage - 1,
        size: pageSize,
        sort: 'createdAt,desc',
      });

      if (res && res.content) {
        setArticles(res.content);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.totalElements || 0);
      } else {
        setArticles([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi khi tải danh sách bài viết', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, selectedCategory, selectedStatus, currentPage]);

  const fetchCategories = useCallback(async () => {
    try {
      const serverCats = await articleService.getAdminCategories();
      const merged = Array.from(new Set([...CATEGORY_SUGGESTIONS, ...serverCats])).filter(Boolean);
      setCategories(merged);
    } catch {
      setCategories(CATEGORY_SUGGESTIONS);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenDetailModal = async (article: Article) => {
    setDetailArticle(article);
    setIsDetailLoading(true);
    try {
      const fresh = await articleService.getAdminArticleById(article.id);
      setDetailArticle(fresh);
    } catch {
      // Giữ nguyên dữ liệu hiện có
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleToggleStatus = async (article: Article) => {
    try {
      const updated = await articleService.toggleArticleStatus(article.id);
      setArticles((prev) => prev.map((a) => (a.id === article.id ? updated : a)));
      showToast(updated.status ? 'Đã xuất bản bài viết!' : 'Đã chuyển bài viết sang Bản nháp');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể đổi trạng thái bài viết', 'error');
    }
  };

  const handleOpenAddModal = () => {
    setEditingArticle(null);
    setFormTitle('');
    setFormSlug('');
    setFormCategory('');
    setFormSummary('');
    setFormContent('');
    setFormThumbnail('');
    setFormStatus(true);
    setIsSlugManual(false);
    setIsGeneratingAi(false);
    setAiMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (article: Article) => {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormSlug(article.slug);
    setFormCategory(article.category || 'Công nghệ');
    setFormSummary(article.summary || '');
    setFormContent(article.content || '');
    setFormThumbnail(article.thumbnail || '');
    setFormStatus(article.status);
    setIsSlugManual(true);
    setIsGeneratingAi(false);
    setAiMessage(null);
    setIsModalOpen(true);
  };

  const handleGenerateAiContent = async () => {
    if (!formTitle.trim()) {
      showToast('Vui lòng nhập Tiêu đề bài viết trước khi tạo nội dung bằng AI', 'error');
      return;
    }

    setIsGeneratingAi(true);
    setAiMessage(null);

    try {
      const result = await aiService.generateArticleContent(
        formTitle.trim(),
        formCategory.trim() || 'Công nghệ',
        formSummary.trim()
      );

      setFormContent(result.content);
      if (!formSummary.trim() && result.summary) {
        setFormSummary(result.summary);
      }
      setAiMessage('AI đã tạo bài viết và tóm tắt chuẩn SEO thành công!');
      setTimeout(() => setAiMessage(null), 5000);
      showToast('Tạo nội dung bài viết bằng AI thành công!');
    } catch {
      setAiMessage('Có lỗi khi kết nối AI, vui lòng thử lại.');
      showToast('Không thể tạo nội dung bằng AI', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!isSlugManual) {
      setFormSlug(generateSlugPreview(val));
    }
  };

  const handleUploadThumbnailFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingThumb(true);
      const url = await articleService.uploadThumbnail(file);
      setFormThumbnail(url);
      showToast('Đã tải ảnh đại diện bài viết thành công!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi khi tải lên ảnh đại diện', 'error');
    } finally {
      setUploadingThumb(false);
      e.target.value = '';
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề bài viết', 'error');
      return;
    }
    if (!formContent.trim() || formContent === '<p></p>') {
      showToast('Vui lòng nhập nội dung bài viết', 'error');
      return;
    }

    const payload: ArticleRequest = {
      title: formTitle.trim(),
      slug: formSlug.trim() || undefined,
      category: formCategory.trim() || 'Công nghệ',
      summary: formSummary.trim() || undefined,
      content: formContent,
      thumbnail: formThumbnail.trim() || undefined,
      status: formStatus,
    };

    try {
      setSubmitting(true);
      if (editingArticle) {
        await articleService.updateArticle(editingArticle.id, payload);
        showToast('Cập nhật bài viết thành công!');
      } else {
        await articleService.createArticle(payload);
        showToast('Tạo bài viết mới thành công (slug tự sinh chuẩn SEO)!');
      }
      setIsModalOpen(false);
      fetchArticles();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu bài viết', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await articleService.deleteArticle(deleteTarget.id);
      showToast(`Đã xóa bài viết "${deleteTarget.title}"`);
      setDeleteTarget(null);
      fetchArticles();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi khi xóa bài viết', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopySlug = (slug: string) => {
    const fullUrl = `${window.location.origin}/articles/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    showToast('Đã copy đường dẫn bài viết vào clipboard!');
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold border transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Bài viết &amp; Tin tức Công nghệ
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {totalItems} bài viết
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Soạn thảo rich text chuyên nghiệp, tự sinh slug chuẩn SEO và quản lý xuất bản tin tức
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchArticles}
            disabled={loading}
            className="whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs"
          >
            Bài viết mới
          </Button>
        </div>
      </div>

      {/* Main Data Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Integrated Filter Bar */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Tìm theo tiêu đề bài viết, tóm tắt..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer"
            >
              <option value="">Tất cả chuyên mục</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hiển thị (Public)</option>
              <option value="false">Bản nháp / Tạm ẩn</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto min-h-0 no-scrollbar">
          {loading ? (
            <div className="py-12 px-4 text-center text-slate-500">
              <p className="text-sm font-medium">Đang tải...</p>
              <p className="text-xs text-slate-400 mt-1">Đang lấy danh sách bài viết từ máy chủ</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-bold text-slate-800">Chưa có bài viết nào</p>
              <p className="text-xs text-slate-500 mt-1">
                Nhấn &quot;Bài viết mới&quot; để tạo bài viết đầu tiên cho hệ thống
              </p>
              <div className="mt-4">
                <Button size="sm" variant="outline" onClick={handleOpenAddModal}>
                  Tạo bài viết ngay
                </Button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-20">Ảnh</th>
                  <th className="py-3 px-4">Tiêu đề &amp; Slug SEO</th>
                  <th className="py-3 px-4 w-32">Chuyên mục</th>
                  <th className="py-3 px-4 w-24 text-center">Lượt xem</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-28">Ngày tạo</th>
                  <th className="py-3 px-4 w-44 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono tabular-nums">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/tech-future-banner.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-slate-400">
                            Trống
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-sm">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-slate-400">
                        <span className="font-mono text-[11px] truncate max-w-xs">
                          /{item.slug}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySlug(item.slug)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap border transition cursor-pointer ${
                            copiedSlug === item.slug
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-slate-200/80'
                          }`}
                          title="Copy đường dẫn bài viết"
                        >
                          {copiedSlug === item.slug ? 'Đã chép' : 'Chép'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.category || 'Tin tức'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-slate-100 text-slate-700">
                        {item.views ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          Hiển thị
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                          Bản nháp
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                          title="Xem chi tiết nội dung bài viết"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                            item.status
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={item.status ? 'Chuyển sang bản nháp' : 'Xuất bản công khai'}
                        >
                          {item.status ? 'Ẩn nháp' : 'Xuất bản'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                          title="Chỉnh sửa bài viết"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                          title="Xóa bài viết"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Pagination - Always pinned to bottom */}
        <div className="shrink-0 bg-white">
          <AdminPagination
            currentPage={Math.min(currentPage, Math.max(1, totalPages))}
            totalPages={Math.max(1, totalPages)}
            totalItems={totalItems}
            itemsPerPage={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Bài Viết (Tích hợp CKEditor 5) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Sticky Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingArticle ? 'Chỉnh sửa bài viết' : 'Soạn bài viết mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Soạn thảo nội dung định dạng phong phú và chèn hình ảnh minh họa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Tiêu đề & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tiêu đề bài viết <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Đánh giá MacBook Air M3 sau 3 tháng sử dụng..."
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Đường dẫn SEO (Slug)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSlugManual(false);
                        setFormSlug(generateSlugPreview(formTitle));
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Tự sinh theo tiêu đề
                    </button>
                  </div>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition">
                    <span className="pl-3.5 pr-1 text-xs text-slate-400 font-mono select-none shrink-0">
                      /articles/
                    </span>
                    <input
                      type="text"
                      placeholder="tieu-de-chuan-seo"
                      value={formSlug}
                      onChange={(e) => {
                        setIsSlugManual(true);
                        setFormSlug(e.target.value);
                      }}
                      className="w-full pr-3.5 py-2.5 text-xs font-mono bg-transparent focus:outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Chuyên mục, Trạng thái & Thumbnail */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Chuyên mục
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Nhập hoặc chọn chuyên mục"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {categories.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          formCategory === cat
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng thái xuất bản
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formStatus}
                        onChange={(e) => setFormStatus(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-3 text-xs font-semibold text-slate-700">
                        {formStatus ? 'Công khai ngay (Public)' : 'Lưu bản nháp (Ẩn)'}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ảnh đại diện (Thumbnail)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="URL hình ảnh..."
                      value={formThumbnail}
                      onChange={(e) => setFormThumbnail(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer flex items-center transition text-slate-700 whitespace-nowrap">
                      <span>{uploadingThumb ? 'Đang tải...' : 'Tải lên'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadThumbnailFile}
                        disabled={uploadingThumb}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {SUGGESTED_THUMBNAILS.map((sug) => (
                      <button
                        type="button"
                        key={sug.url}
                        onClick={() => setFormThumbnail(sug.url)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        {sug.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tóm tắt */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tóm tắt bài viết (Meta description ngắn gọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả súc tích nội dung chính của bài viết, dùng để hiển thị trên danh sách và thẻ xem trước..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 leading-relaxed"
                />
              </div>

              {/* CKEditor 5 Main Area */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nội dung chi tiết bài viết <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Hỗ trợ tiêu đề H1-H3, bôi đậm, chèn ảnh, bảng, trích dẫn, code...
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateAiContent}
                    disabled={isGeneratingAi}
                    className="inline-flex items-center px-3.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    {isGeneratingAi ? 'AI đang soạn thảo bài viết...' : 'Tạo nội dung bằng AI'}
                  </button>
                </div>

                {aiMessage && (
                  <div className="mb-2.5 p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-medium rounded-xl">
                    {aiMessage}
                  </div>
                )}

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <CKEditor5
                    value={formContent}
                    onChange={setFormContent}
                    placeholder="Bắt đầu viết nội dung bài viết công nghệ hoặc nhấn 'Tạo nội dung bằng AI'..."
                  />
                </div>
              </div>
            </form>

            {/* Sticky Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70 sticky bottom-0 z-10">
              <span className="text-xs text-slate-400">
                Slug SEO sẽ tự động chuẩn hóa khi lưu bài viết
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitForm}
                  disabled={submitting}
                  className="shadow-xs"
                >
                  {submitting
                    ? 'Đang xử lý...'
                    : editingArticle
                      ? 'Lưu thay đổi'
                      : 'Đăng bài viết'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Preview Modal */}
      {detailArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">{detailArticle.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chuyên mục: <strong>{detailArticle.category || 'Tin tức'}</strong> •{' '}
                  {detailArticle.status ? 'Đang hiển thị' : 'Bản nháp'} • {detailArticle.views ?? 0} lượt xem
                  {isDetailLoading ? ' • Đang tải mới nhất...' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailArticle(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
              {detailArticle.thumbnail && (
                <img
                  src={detailArticle.thumbnail}
                  alt={detailArticle.title}
                  className="w-full max-h-60 object-cover rounded-xl border border-slate-200"
                />
              )}
              {detailArticle.summary && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium leading-relaxed">
                  {detailArticle.summary}
                </div>
              )}
              <div className="p-4 rounded-xl border border-slate-200 bg-white prose prose-sm max-w-none text-slate-800">
                {detailArticle.content ? (
                  <div dangerouslySetInnerHTML={{ __html: detailArticle.content }} />
                ) : (
                  <p className="text-slate-400 italic">Bài viết chưa có nội dung chi tiết.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-mono text-slate-500 truncate">
                /articles/{detailArticle.slug}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailArticle(null)}>
                  Đóng
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const target = detailArticle;
                    setDetailArticle(null);
                    handleOpenEditModal(target);
                  }}
                >
                  Chỉnh sửa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa bài viết</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa bài viết{' '}
                <strong className="text-slate-900">&quot;{deleteTarget.title}&quot;</strong>?
                Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Đang xử lý...' : 'Xóa bài viết'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminArticlesPage;
