import React, { useState, useEffect, useRef } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminSummaryStrip from '../../components/admin/AdminSummaryStrip';
import {
  aiService,
  type KnowledgeDocumentItem,
  type KnowledgeStats,
  type KnowledgeChunkItem,
  type AiConfigData,
  type AiConnectionTestResult,
} from '../../api/services/ai.service';

const ITEMS_PER_PAGE = 10;

export const AdminAiPage: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'files' | 'upload' | 'config'>('files');

  // Knowledge documents state
  const [documents, setDocuments] = useState<KnowledgeDocumentItem[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Chunk Modal state
  const [viewingDoc, setViewingDoc] = useState<KnowledgeDocumentItem | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunkItem[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Edit Manual Knowledge modal state
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocumentItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('FAQ');
  const [editContent, setEditContent] = useState('');
  const [loadingEditContent, setLoadingEditContent] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete modal state
  const [deletingDoc, setDeletingDoc] = useState<KnowledgeDocumentItem | null>(null);
  const [reindexingId, setReindexingId] = useState<number | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('STORE_POLICY');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('FAQ');
  const [manualContent, setManualContent] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // AI Configuration & Limits state
  const [aiConfig, setAiConfig] = useState<AiConfigData | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<AiConnectionTestResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [docs, st, cfg] = await Promise.all([
        aiService.getKnowledgeDocuments(),
        aiService.getKnowledgeStats(),
        aiService.getAiConfig(),
      ]);
      setDocuments(docs);
      setStats(st);
      setAiConfig(cfg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu Tri thức & Cấu hình AI';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    if (selectedFileType !== 'ALL' && doc.fileType.toUpperCase() !== selectedFileType.toUpperCase()) {
      return false;
    }
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return doc.fileName.toLowerCase().includes(q) || doc.category.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDocs = filteredDocs.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleOpenEditManual = async (doc: KnowledgeDocumentItem) => {
    setEditingDoc(doc);
    setEditTitle(doc.fileName.replace(/\.txt$/i, '').replace(/_/g, ' '));
    setEditCategory(doc.category || 'FAQ');
    setEditContent(doc.rawContent || '');

    if (!doc.rawContent) {
      setLoadingEditContent(true);
      try {
        const docChunks = await aiService.getKnowledgeChunks(doc.id);
        setEditContent(docChunks.map((c) => c.content).join('\n\n'));
      } catch {
        setEditContent('');
        showToast('Không thể tải nội dung chi tiết từ các đoạn tri thức.');
      } finally {
        setLoadingEditContent(false);
      }
    }
  };

  const handleEditManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    if (!editTitle.trim() || !editContent.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung tri thức!');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await aiService.updateManualKnowledge(editingDoc.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
      });
      setDocuments((prev) => prev.map((d) => (d.id === editingDoc.id ? updated : d)));
      setEditingDoc(null);
      showToast(`Đã cập nhật và tái lập chỉ mục mục tri thức "${updated.fileName}"`);
      const st = await aiService.getKnowledgeStats();
      setStats(st);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật mục tri thức';
      showToast(`Cập nhật thất bại: ${msg}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Vui lòng chọn một tệp tài liệu (PDF, DOCX hoặc TXT)!');
      return;
    }

    setUploading(true);
    try {
      const newDoc = await aiService.uploadKnowledgeFile(uploadFile, uploadCategory);
      setDocuments((prev) => [newDoc, ...prev]);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast(`Đã nạp và phân đoạn thành công tài liệu: ${newDoc.fileName}`);
      setActiveTab('files');
      // Refresh stats
      const st = await aiService.getKnowledgeStats();
      setStats(st);
    } catch (err: any) {
      showToast('Tải lên thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setUploading(false);
    }
  };

  // Handle Manual Entry
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) {
      showToast('Vui lòng điền đầy đủ tiêu đề và nội dung tài liệu!');
      return;
    }

    setSavingManual(true);
    try {
      const newDoc = await aiService.createManualKnowledge({
        title: manualTitle.trim(),
        content: manualContent.trim(),
        category: manualCategory,
      });
      setDocuments((prev) => [newDoc, ...prev]);
      setManualTitle('');
      setManualContent('');
      showToast(`Đã thêm mục tri thức thủ công: ${newDoc.fileName}`);
      setActiveTab('files');
      const st = await aiService.getKnowledgeStats();
      setStats(st);
    } catch (err: any) {
      showToast('Lưu thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setSavingManual(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingDoc) return;
    try {
      await aiService.deleteKnowledgeDocument(deletingDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      showToast(`Đã xóa tài liệu và toàn bộ chunks của: ${deletingDoc.fileName}`);
      setDeletingDoc(null);
      const st = await aiService.getKnowledgeStats();
      setStats(st);
    } catch {
      showToast('Lỗi khi xóa tài liệu');
    }
  };

  // Handle Reindex
  const handleReindex = async (doc: KnowledgeDocumentItem) => {
    setReindexingId(doc.id);
    try {
      const updated = await aiService.reindexKnowledgeDocument(doc.id);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
      showToast(`Đã tái phân đoạn & lập chỉ mục thành công: ${doc.fileName}`);
    } catch {
      showToast('Lập chỉ mục lại thất bại');
    } finally {
      setReindexingId(null);
    }
  };

  // Handle View Chunks
  const handleViewChunks = async (doc: KnowledgeDocumentItem) => {
    setViewingDoc(doc);
    setLoadingChunks(true);
    try {
      const res = await aiService.getKnowledgeChunks(doc.id);
      setChunks(res);
    } catch {
      setChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  // Handle Save AI Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiConfig) return;

    setConfigSaving(true);
    try {
      const updated = await aiService.updateAiConfig(aiConfig);
      setAiConfig(updated);
      showToast('Đã lưu cấu hình trí tuệ & giới hạn AI thành công!');
    } catch {
      showToast('Lưu cấu hình thất bại!');
    } finally {
      setConfigSaving(false);
    }
  };

  // Handle Test AI Ping
  const handleTestAiPing = async () => {
    if (!aiConfig) return;
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await aiService.testAiConnection(aiConfig.provider, aiConfig.modelName);
      setTestResult(res);
    } catch {
      setTestResult({
        success: false,
        provider: aiConfig.provider,
        status: 'ERROR',
        latencyMs: 500,
        message: 'Không thể kết nối đến máy chủ AI!',
      });
    } finally {
      setTestingAi(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'STORE_POLICY':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Chính sách</span>;
      case 'USER_GUIDE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Hướng dẫn</span>;
      case 'PRODUCT_INFO':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Sản phẩm</span>;
      case 'FAQ':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Câu hỏi FAQ</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Chung</span>;
    }
  };

  const getFileTypeBadge = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'PDF') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">PDF</span>;
    }
    if (t === 'DOCX' || t === 'DOC') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">DOCX</span>;
    }
    if (t === 'MANUAL') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">MANUAL</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">TXT</span>;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3 font-sans overflow-hidden">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-3.5 rounded-xl border border-blue-200 bg-white shadow-xl text-blue-900 text-xs font-semibold flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Tri thức & Cấu hình AI
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
              NEXOR RAG
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Nạp tài liệu tri thức (PDF, DOCX, TXT) cho trợ lý ảo và tinh chỉnh độ thông minh & giới hạn an toàn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={fetchData}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setActiveTab('upload')}
          >
            Tải lên tài liệu
          </Button>
        </div>
      </div>

      {/* Compact Stats Strip */}
      <AdminSummaryStrip
        items={[
          {
            label: 'Tài liệu',
            value: stats?.totalFiles ?? documents.length,
            subValue: `PDF ${stats?.fileTypeDistribution?.['PDF'] ?? 1} · DOCX ${stats?.fileTypeDistribution?.['DOCX'] ?? 1} · TXT ${stats?.fileTypeDistribution?.['TXT'] ?? 2}`,
          },
          {
            label: 'Dung lượng',
            value: stats?.formattedTotalSize || formatFileSize(stats?.totalSize || 45620),
          },
          {
            label: 'Chunks',
            value: stats?.totalChunks ?? documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0),
            subValue: '100% indexed',
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Mô hình AI',
            value: aiConfig?.modelName || 'gemini-1.5-flash',
            valueClassName: 'text-blue-600',
          },
        ]}
      />

      {/* Tabs Header Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs w-fit shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'files'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Danh sách tài liệu ({filteredDocs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Tải tệp & Nhập thủ công
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'config'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Trí thông minh & Giới hạn AI
        </button>
      </div>

      {/* TAB 1: DANH SÁCH TÀI LIỆU (KNOWLEDGE BASE FILES TABLE) */}
      {activeTab === 'files' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
              {/* Search input */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu tri thức..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Type filter */}
              <select
                value={selectedFileType}
                onChange={(e) => {
                  setSelectedFileType(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Mọi loại tệp</option>
                <option value="PDF">Tệp PDF</option>
                <option value="DOCX">Tệp Word (DOCX)</option>
                <option value="TXT">Tệp Văn bản (TXT)</option>
                <option value="MANUAL">Nhập thủ công (MANUAL)</option>
              </select>

              {/* Category filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Mọi danh mục</option>
                <option value="STORE_POLICY">Chính sách cửa hàng</option>
                <option value="USER_GUIDE">Hướng dẫn mua sắm</option>
                <option value="PRODUCT_INFO">Thông tin sản phẩm</option>
                <option value="FAQ">Câu hỏi thường gặp</option>
                <option value="GENERAL">Kiến thức chung</option>
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('upload')}
            >
              Thêm tài liệu mới
            </Button>
          </div>

          {/* Table Container */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tên tài liệu</th>
                  <th className="py-3 px-3">Loại</th>
                  <th className="py-3 px-3">Danh mục</th>
                  <th className="py-3 px-3">Dung lượng</th>
                  <th className="py-3 px-3">Số Chunks</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Cập nhật</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center text-slate-500 font-medium">
                      Đang tải danh sách tài liệu tri thức...
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        Không tìm thấy tài liệu tri thức nào
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Thử thay đổi từ khóa hoặc bộ lọc loại tệp, danh mục.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => handleViewChunks(doc)}>
                          {doc.fileName}
                        </div>
                        <span className="text-[10px] text-slate-400">ID #{doc.id}</span>
                      </td>
                      <td className="py-3 px-3">{getFileTypeBadge(doc.fileType)}</td>
                      <td className="py-3 px-3">{getCategoryBadge(doc.category)}</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                          {doc.chunkCount || 1} chunks
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {doc.status || 'INDEXED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(doc.updatedAt || doc.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewChunks(doc)}
                            title="Xem chi tiết các đoạn Chunks"
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            Xem
                          </button>
                          {(doc.fileType || '').toUpperCase() === 'MANUAL' && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditManual(doc)}
                              title="Chỉnh sửa nội dung tri thức thủ công"
                              className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                              Sửa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleReindex(doc)}
                            disabled={reindexingId === doc.id}
                            title="Lập chỉ mục lại tài liệu"
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {reindexingId === doc.id ? 'Đang xử lý...' : 'Lập chỉ mục'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingDoc(doc)}
                            title="Xóa tài liệu và tri thức vector"
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
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
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredDocs.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* TAB 2: NẠP TÀI LIỆU MỚI (UPLOAD FILE & MANUAL ENTRY) */}
      {activeTab === 'upload' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card Upload Tệp (PDF, DOCX, TXT) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-900">Tải lên tệp tài liệu (PDF, DOCX, TXT)</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hệ thống sẽ tự động trích xuất nội dung và chia nhỏ thành các đoạn Chunks cho AI
                </p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 mt-4">
                {/* Drag and Drop Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                  />
                  {uploadFile ? (
                    <div>
                      <div className="text-xs font-bold text-slate-900">{uploadFile.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {formatFileSize(uploadFile.size)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        Bấm để chọn tệp hoặc kéo thả vào đây
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Hỗ trợ định dạng PDF, Word (DOCX) hoặc TXT (Tối đa 15MB)
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phân loại danh mục tri thức
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STORE_POLICY">Chính sách cửa hàng (Bảo hành, Đổi trả, Freeship)</option>
                    <option value="USER_GUIDE">Hướng dẫn sử dụng & Mua sắm</option>
                    <option value="PRODUCT_INFO">Thông tin sản phẩm & Bảng giá</option>
                    <option value="FAQ">Câu hỏi thường gặp & Trả góp 0%</option>
                    <option value="GENERAL">Kiến thức chung khác</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="w-full"
                >
                  {uploading ? 'Đang nạp & phân đoạn tri thức...' : 'Tải lên & Tự động chia Chunks'}
                </Button>
              </form>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 mt-4 border border-slate-100">
              <strong>Lưu ý:</strong> Nội dung sau khi tải lên sẽ được chia thành các đoạn nhỏ (mỗi đoạn ~400-500 từ). Khi khách hàng hỏi, hệ thống sẽ truy xuất các đoạn khớp nhất để nạp vào prompt cho LLM.
            </div>
          </div>

          {/* Card Nhập Thủ Công (Manual Entries) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-900">Nhập tri thức thủ công (Manual Entry)</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thêm trực tiếp câu hỏi thường gặp, quy định đặc thù hoặc chương trình khuyến mãi riêng
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3.5 mt-4">
                <Input
                  label="Tiêu đề mục tri thức"
                  placeholder="Ví dụ: Quy định bảo hành pin và màn hình MacBook..."
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Danh mục tri thức
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FAQ">Câu hỏi thường gặp (FAQ)</option>
                    <option value="STORE_POLICY">Chính sách cửa hàng</option>
                    <option value="USER_GUIDE">Hướng dẫn khách hàng</option>
                    <option value="PRODUCT_INFO">Thông tin sản phẩm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nội dung văn bản tri thức
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Nhập chi tiết nội dung mà AI cần nắm vững để trả lời khách hàng..."
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingManual || !manualTitle.trim() || !manualContent.trim()}
                  className="w-full"
                >
                  {savingManual ? 'Đang lưu vào Vector DB...' : 'Nạp trực tiếp vào hệ thống AI'}
                </Button>
              </form>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB 3: TRÍ THÔNG MINH & GIỚI HẠN CỦA AI (AI INTELLIGENCE & LIMITS) */}
      {activeTab === 'config' && aiConfig && (
        <form onSubmit={handleSaveConfig} className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Box 1: Cấu hình Mô hình & Kết nối (Model & Provider) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Mô hình AI & Động cơ (Provider)</h2>
                  <p className="text-[11px] text-slate-500">Lựa chọn nhà cung cấp và mô hình tư vấn chính thức</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testingAi}
                  onClick={handleTestAiPing}
                >
                  {testingAi ? 'Đang kiểm tra...' : 'Kiểm tra kết nối (Ping)'}
                </Button>
              </div>

              {/* Ping Test Result Banner */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        testResult.success ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                    <span>{testResult.message}</span>
                  </div>
                  <span className="font-mono font-bold text-[11px] shrink-0">
                    {testResult.latencyMs} ms
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhà cung cấp AI (Provider)
                  </label>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GOOGLE_GEMINI">Google Gemini (Khuyến nghị - Phản hồi trong 1-2s)</option>
                    <option value="SPRING_AI">Spring AI (OpenAI GPT-4o-mini)</option>
                    <option value="SMART_ASSISTANT">Trợ lý Cục bộ Thông minh (Offline Fallback Engine)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên mô hình (Model Name)
                  </label>
                  <select
                    value={aiConfig.modelName}
                    onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="gemini-1.5-flash">gemini-1.5-flash (Chuẩn tốc độ cao, tiết kiệm token)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (Suy luận phức tạp & phân tích sâu)</option>
                    <option value="gpt-4o-mini">gpt-4o-mini (OpenAI Fast Engine)</option>
                    <option value="gpt-4o">gpt-4o (OpenAI Omni Flagship)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Gemini API Key (Masked)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={aiConfig.geminiApiKeyMasked || 'Chưa cấu hình'}
                    className="w-full px-3.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Trạng thái Động cơ
                  </label>
                  <div className="px-3.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700 truncate">
                    {aiConfig.status || 'Active'}
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Giới hạn an toàn & Chống Spam (Limits & Safety) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Giới hạn an toàn & Chống Spam (Limits & Safety)</h2>
                <p className="text-[11px] text-slate-500">Bảo vệ máy chủ khỏi quá tải và kiểm soát độ dài hội thoại</p>
              </div>

              <div className="space-y-4">
                {/* Rate Limit Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                    <span>Tần suất gọi chống Spam (Rate Limit)</span>
                    <span className="text-blue-600 font-mono font-bold">
                      {aiConfig.rateLimitPerMinute} tin nhắn / phút / IP
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={aiConfig.rateLimitPerMinute}
                    onChange={(e) => setAiConfig({ ...aiConfig, rateLimitPerMinute: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>5 tin/phút (Nghiêm ngặt)</span>
                    <span>15 tin/phút (Khuyên dùng)</span>
                    <span>60 tin/phút (Nới lỏng)</span>
                  </div>
                </div>

                {/* Max Input Length */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                    <span>Giới hạn độ dài câu hỏi khách (Max Input Length)</span>
                    <span className="text-blue-600 font-mono font-bold">
                      {aiConfig.maxInputLength} ký tự
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={1500}
                    step={50}
                    value={aiConfig.maxInputLength}
                    onChange={(e) => setAiConfig({ ...aiConfig, maxInputLength: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>200 ký tự (Ngắn)</span>
                    <span>500 ký tự (Chuẩn FR_AI_01)</span>
                    <span>1500 ký tự (Dài)</span>
                  </div>
                </div>

                {/* Max Output Tokens */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                    <span>Giới hạn độ dài câu trả lời của AI (Max Tokens)</span>
                    <span className="text-blue-600 font-mono font-bold">
                      {aiConfig.maxOutputTokens} tokens
                    </span>
                  </div>
                  <input
                    type="range"
                    min={256}
                    max={2048}
                    step={64}
                    value={aiConfig.maxOutputTokens}
                    onChange={(e) => setAiConfig({ ...aiConfig, maxOutputTokens: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>512 tokens (~200 từ)</span>
                    <span>1000 tokens (~400 từ)</span>
                    <span>2048 tokens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Độ thông minh, Nhiệt độ (Temperature) & System Prompt */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Trí thông minh & Kịch bản tư vấn (System Prompt & Temperature)</h2>
              <p className="text-[11px] text-slate-500">Thiết lập nhân cách, văn phong và mức độ sáng tạo của trợ lý AI</p>
            </div>

            <div className="space-y-4">
              {/* Temperature Slider */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                  <span>Mức độ sáng tạo (Temperature)</span>
                  <span className="text-purple-600 font-mono font-bold">
                    {aiConfig.temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={aiConfig.temperature}
                  onChange={(e) => setAiConfig({ ...aiConfig, temperature: Number(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>0.2 (Chính xác, bám sát tài liệu)</span>
                  <span>0.7 (Cân bằng & tự nhiên)</span>
                  <span>1.0 (Rất sáng tạo & văn hoa)</span>
                </div>
              </div>

              {/* System Prompt TextArea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chỉ dẫn hệ thống cốt lõi (System Prompt)
                </label>
                <textarea
                  rows={4}
                  value={aiConfig.systemPrompt}
                  onChange={(e) => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Prompt này sẽ được đưa vào làm kim chỉ nam đầu vào cho mọi lượt hội thoại của khách hàng.
                </p>
              </div>

              {/* RAG & Product Recommendations Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Cơ chế RAG (Knowledge Base)</span>
                    <input
                      type="checkbox"
                      checked={aiConfig.knowledgeBaseEnabled}
                      onChange={(e) => setAiConfig({ ...aiConfig, knowledgeBaseEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Số đoạn Chunks tối đa nạp vào Prompt:</span>
                    <span className="font-bold text-blue-600">{aiConfig.topKChunks} chunks</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={aiConfig.topKChunks}
                    onChange={(e) => setAiConfig({ ...aiConfig, topKChunks: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Gợi ý thẻ sản phẩm (Product Cards)</span>
                    <input
                      type="checkbox"
                      checked={aiConfig.suggestProductsEnabled}
                      onChange={(e) => setAiConfig({ ...aiConfig, suggestProductsEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Số thẻ sản phẩm tối đa hiển thị:</span>
                    <span className="font-bold text-blue-600">{aiConfig.maxSuggestedProducts} sản phẩm</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={aiConfig.maxSuggestedProducts}
                    onChange={(e) => setAiConfig({ ...aiConfig, maxSuggestedProducts: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchData}
            >
              Hủy thay đổi
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={configSaving}
            >
              {configSaving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình trí tuệ & giới hạn AI'}
            </Button>
          </div>
        </form>
      )}

      {/* CHUNKS VIEWER MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">
                  Chi tiết phân đoạn (Chunks) - {viewingDoc.fileName}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tổng cộng: {chunks.length || viewingDoc.chunkCount} đoạn được lập chỉ mục vector
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingChunks ? (
                <div className="py-12 px-4 text-center text-slate-500">
                  <span className="text-xs font-medium">Đang tải các đoạn chunks...</span>
                </div>
              ) : chunks.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 text-xs">
                  Chưa có đoạn tri thức nào cho tài liệu này.
                </div>
              ) : (
                chunks.map((chk, i) => (
                  <div key={chk.id || i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="text-blue-600">Đoạn #{chk.chunkIndex ?? i + 1}</span>
                      <span className="font-mono text-slate-400">~{chk.tokenCount || 40} tokens</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {chk.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end shrink-0">
              <Button variant="outline" size="sm" onClick={() => setViewingDoc(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MANUAL KNOWLEDGE MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  Chỉnh sửa mục tri thức thủ công
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ID #{editingDoc.id} · Cập nhật nội dung và tự động tái phân đoạn RAG
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleEditManualSubmit} className="flex-1 min-h-0 flex flex-col text-xs">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                <Input
                  label="Tiêu đề mục tri thức *"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Danh mục tri thức
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STORE_POLICY">Chính sách cửa hàng</option>
                    <option value="USER_GUIDE">Hướng dẫn sử dụng & Mua sắm</option>
                    <option value="PRODUCT_INFO">Thông tin sản phẩm & Bảng giá</option>
                    <option value="FAQ">Câu hỏi thường gặp & Trả góp 0%</option>
                    <option value="GENERAL">Kiến thức chung khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nội dung tri thức *
                  </label>
                  {loadingEditContent ? (
                    <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      Đang nạp nội dung hiện tại...
                    </div>
                  ) : (
                    <textarea
                      rows={8}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      required
                      placeholder="Nhập nội dung kiến thức chi tiết để AI ghi nhớ..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
                    />
                  )}
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingDoc(null)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={savingEdit || loadingEditContent}>
                  {savingEdit ? 'Đang lưu...' : 'Lưu & Tái lập chỉ mục'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tài liệu</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa tài liệu <strong>{deletingDoc.fileName}</strong>? Toàn bộ dữ liệu vector và các đoạn chunks liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống AI.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingDoc(null)}>
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDeleteConfirm}
              >
                Xóa vĩnh viễn
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAiPage;
