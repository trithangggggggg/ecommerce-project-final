import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Eye,
  ArrowLeft,
  Share2,
  ChevronRight,
  Check,
  Newspaper,
} from 'lucide-react';
import { articleService } from '../../api/services/article.service';
import type { Article } from '../../models/article.model';

export const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        // Backend tự động tăng views khi gọi GET /api/articles/{slug}
        const data = await articleService.getArticleBySlug(slug);
        setArticle(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Không tìm thấy bài viết yêu cầu');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#f8fafc] text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Đang tải bài viết...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <Newspaper className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy bài viết</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md">{error || 'Bài viết không tồn tại hoặc đã bị xóa.'}</p>
        <Link
          to="/articles"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang tin tức</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-20">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Link to="/" className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <Link to="/articles" className="hover:text-blue-600 transition">
            Tin tức &amp; Đánh giá
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="font-semibold text-slate-800 truncate max-w-xs">{article.title}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-8">
        {/* Article Header Meta */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {article.category || 'Công nghệ'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 pb-5 border-b border-slate-200 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                NEX
              </div>
              <div>
                <div className="font-bold text-slate-800">Ban Biên Tập NEXOR Tech</div>
                <div className="flex items-center gap-2 mt-0.5 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {article.createdAt ? new Date(article.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <Eye className="w-3 h-3 text-blue-500" />
                    {article.views ?? 0} lượt xem
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
                title="Chia sẻ liên kết bài viết"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Chia sẻ'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Article Summary Box */}
        {article.summary && (
          <div className="my-6 p-4.5 sm:p-5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-950 font-medium text-sm sm:text-base leading-relaxed italic shadow-xs">
            &ldquo;{article.summary}&rdquo;
          </div>
        )}

        {/* Featured Image */}
        {article.thumbnail && (
          <div className="my-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 aspect-16/9">
            <img
              src={article.thumbnail}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/tech-future-banner.jpg';
              }}
            />
          </div>
        )}

        {/* CKEditor 5 Rich HTML Content */}
        <article className="mt-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs">
          <div
            className="prose prose-slate max-w-none 
              prose-headings:text-slate-900 prose-headings:font-extrabold prose-headings:tracking-tight
              prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2
              prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-sm sm:prose-p:text-base prose-p:mb-4
              prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-li:my-1 prose-li:text-slate-700
              prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4 prose-li:my-1 prose-li:text-slate-700
              prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-slate-50 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-slate-700 prose-blockquote:my-6
              prose-img:rounded-2xl prose-img:shadow-md prose-img:my-6 prose-img:w-full prose-img:object-cover
              prose-table:border-collapse prose-table:w-full prose-table:my-6 prose-th:border prose-th:border-slate-200 prose-th:p-3 prose-th:bg-slate-50 prose-td:border prose-td:border-slate-200 prose-td:p-3
              prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-xl"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {/* Bottom Navigation */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xem thêm bài viết khác</span>
          </Link>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs text-slate-500 hover:text-slate-800 transition"
          >
            Lên đầu trang ↑
          </button>
        </div>
      </main>
    </div>
  );
};

export default ArticleDetailPage;
