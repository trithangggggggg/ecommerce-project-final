import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Calendar,
  Sparkles,
  FileText,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
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

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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
      setAiMessage('✨ AI đã tạo bài viết và tóm tắt chuẩn SEO thành công!');
      setTimeout(() => setAiMessage(null), 5000);
      showToast('Tạo nội dung bài viết bằng AI thành công!');
    } catch {
      setAiMessage('⚠️ Có lỗi khi kết nối AI, vui lòng thử lại.');
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
    <div className="flex flex-col h-full overflow-hidden space-y-4">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-rose-600 text-white shadow-rose-500/20'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs shrink-0">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Quản lý Bài viết & Tin tức Công nghệ
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {totalItems} tin tức, bài viết
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Soạn thảo rich text chuyên nghiệp, tự sinh slug chuẩn SEO và quản lý xuất bản tin tức
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchArticles}
              disabled={loading}
              className="whitespace-nowrap shrink-0 flex-row"
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-5 h-5 shrink-0" />}
              onClick={handleOpenAddModal}
              className="whitespace-nowrap shrink-0 flex-row shadow-sm font-bold"
            >
              Bài viết mới
            </Button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề bài viết, tóm tắt..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">Tất cả chuyên mục</option>
              {CATEGORY_SUGGESTIONS.map((cat) => (
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
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hiển thị (Public)</option>
              <option value="false">Bản nháp / Tạm ẩn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm">Đang tải danh sách bài viết...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Chưa có bài viết nào</p>
                <p className="text-xs text-slate-400 mt-1">
                  Nhấn &quot;Bài viết mới&quot; để tạo bài viết đầu tiên cho hệ thống
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleOpenAddModal} className="mt-1">
                Tạo bài viết ngay
              </Button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-20">Ảnh</th>
                  <th className="py-3 px-4">Tiêu đề &amp; Slug SEO</th>
                  <th className="py-3 px-4 w-32">Chuyên mục</th>
                  <th className="py-3 px-4 w-28 text-center">Lượt xem</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-32">Ngày tạo</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
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
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-sm">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                        <span className="font-mono text-[11px] truncate max-w-xs">
                          /{item.slug}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySlug(item.slug)}
                          className="hover:text-blue-600 transition p-0.5"
                          title="Copy đường dẫn bài viết"
                        >
                          {copiedSlug === item.slug ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category || 'Tin tức'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-slate-600 font-semibold bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.views ?? 0}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          Hiển thị
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                          Bản nháp
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {item.createdAt ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/articles/${item.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Xem trước bài viết trên web"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Chỉnh sửa bài viết"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa bài viết"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal Thêm / Chỉnh Sửa Bài Viết (Tích hợp CKEditor 5) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingArticle ? 'Chỉnh sửa bài viết' : 'Soạn bài viết mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Soạn thảo nội dung định dạng phong phú và chèn hình ảnh minh họa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
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
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Tự sinh theo tiêu đề
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
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
                      className="w-full pl-22 pr-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Chuyên mục, Trạng thái & Tóm tắt */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Chuyên mục
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="Nhập hoặc chọn chuyên mục"
                      className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {CATEGORY_SUGGESTIONS.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
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
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5 transition text-slate-700">
                      <Upload className="w-3.5 h-3.5" />
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
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI đang soạn thảo bài viết...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        <span>✨ Tạo nội dung bằng AI</span>
                      </>
                    )}
                  </button>
                </div>

                {aiMessage && (
                  <div className="mb-2.5 p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{aiMessage}</span>
                  </div>
                )}

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <CKEditor5
                    value={formContent}
                    onChange={setFormContent}
                    placeholder="Bắt đầu viết nội dung bài viết công nghệ hoặc nhấn '✨ Tạo nội dung bằng AI'..."
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
              <span className="text-xs text-slate-400">
                Slug SEO sẽ tự động chuẩn hóa khi lưu bài viết
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitForm}
                  disabled={submitting}
                  className="gap-1.5 shadow-sm"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingArticle ? 'Lưu thay đổi' : 'Đăng bài viết'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa bài viết</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Bạn có chắc chắn muốn xóa bài viết{' '}
              <strong className="text-slate-800">&quot;{deleteTarget.title}&quot;</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
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
                className="gap-1.5"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xóa bài viết</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminArticlesPage;
