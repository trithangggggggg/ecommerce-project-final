import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Eye,
  ArrowLeft,
  Share2,
  ChevronRight,
  Check,
  Newspaper,
  Clock,
  BookOpen,
  List,
  ShoppingCart,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { articleService } from '../../api/services/article.service';
import { productService } from '../../api/services/product.service';
import type { Article } from '../../models/article.model';
import type { Product } from '../../models/product.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tính thời gian đọc ước tính (phút) dựa trên word count */
function estimateReadingTime(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200)); // 200 từ/phút
}

/** Trích xuất danh sách heading (h2, h3) từ HTML để tạo TOC */
interface TocItem {
  id: string;
  level: 2 | 3;
  text: string;
}

function extractToc(htmlContent: string): TocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const headings = doc.querySelectorAll('h2, h3');
  const toc: TocItem[] = [];
  headings.forEach((h, index) => {
    const level = parseInt(h.tagName.replace('H', ''), 10) as 2 | 3;
    const text = h.textContent?.trim() || '';
    if (text) {
      const id = `heading-${index}`;
      toc.push({ id, level, text });
    }
  });
  return toc;
}

/** Inject id vào các heading trong HTML để hỗ trợ scroll-to anchor */
function injectHeadingIds(htmlContent: string): string {
  let idx = 0;
  return htmlContent.replace(/<(h[23])([^>]*)>/gi, (_, tag, attrs) => {
    return `<${tag} id="heading-${idx++}"${attrs}>`;
  });
}

/** Format giá tiền VNĐ */
function formatPrice(price: number) {
  return price.toLocaleString('vi-VN') + '₫';
}

/** Map category từ bài viết sang categoryId (sản phẩm liên quan heuristic) */
const ARTICLE_CATEGORY_TO_PRODUCT_KEYWORD: Record<string, string> = {
  'Công nghệ': 'laptop',
  'Đánh giá': 'iphone',
  'Tin tức': 'smartphone',
  'Thủ thuật': 'phụ kiện',
  'Khuyến mãi': '',
};

// ---------------------------------------------------------------------------
// TOC Sidebar Component
// ---------------------------------------------------------------------------
interface TableOfContentsProps {
  toc: TocItem[];
  activeId: string | null;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ toc, activeId }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (toc.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-bold text-slate-800">Mục lục bài viết</span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* TOC list */}
      {!collapsed && (
        <nav className="border-t border-slate-100 px-3 py-2 space-y-0.5 max-h-72 overflow-y-auto">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`block text-xs py-1.5 rounded-lg px-2 transition-all leading-snug ${
                item.level === 3 ? 'pl-5' : ''
              } ${
                activeId === item.id
                  ? 'bg-blue-50 text-blue-700 font-bold border-l-2 border-blue-500'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              {item.level === 3 && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 align-middle" />
              )}
              {item.text}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Related Products Block
// ---------------------------------------------------------------------------
interface RelatedProductsProps {
  category?: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ category }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const keyword = category ? ARTICLE_CATEGORY_TO_PRODUCT_KEYWORD[category] || category : '';
    productService
      .getProducts({ keyword: keyword || undefined, limit: 4, page: 1 })
      .then((res) => setProducts((res.data || []).slice(0, 4)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Sản phẩm liên quan</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-14 h-14 bg-slate-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-bold text-slate-800">Sản phẩm liên quan</span>
        </div>
        <Link
          to="/products"
          className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
        >
          Xem thêm <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {products.map((product) => {
          const price = product.minPrice ?? product.price ?? 0;
          const originalPrice = product.originalPrice;
          const rawImage = product.images?.[0];
          const image =
            typeof rawImage === 'string'
              ? rawImage
              : (rawImage as { url?: string })?.url ?? product.imageUrl ?? '';

          return (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition group"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                {image ? (
                  <img
                    src={image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 transition line-clamp-2 leading-snug">
                  {product.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-black text-blue-600">{formatPrice(price)}</span>
                  {originalPrice && originalPrice > price && (
                    <span className="text-[10px] text-slate-400 line-through">
                      {formatPrice(originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const listPath = location.pathname.startsWith('/news') ? '/news' : '/articles';
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch article
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    articleService
      .getArticleBySlug(slug)
      .then((data) => setArticle(data))
      .catch((err: any) => {
        setError(err?.response?.data?.message || 'Không tìm thấy bài viết yêu cầu');
      })
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // Trích xuất TOC và inject id heading
  const toc = useMemo(() => (article ? extractToc(article.content) : []), [article]);
  const readingTime = useMemo(
    () => (article ? estimateReadingTime(article.content) : 0),
    [article]
  );
  const contentWithIds = useMemo(
    () => (article ? injectHeadingIds(article.content) : ''),
    [article]
  );

  // IntersectionObserver: highlight heading đang xem trong TOC
  useEffect(() => {
    if (!contentRef.current || toc.length === 0) return;
    const headingEls = toc
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 }
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc, contentWithIds]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#f8fafc] text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Đang tải bài viết...</p>
      </div>
    );
  }

  // ---- Not found ----
  if (error || !article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <Newspaper className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy bài viết</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          {error || 'Bài viết không tồn tại hoặc đã bị xóa.'}
        </p>
        <Link
          to={listPath}
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
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Link to="/" className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <Link to={listPath} className="hover:text-blue-600 transition">
            Tin tức & Đánh giá
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
            {article.title}
          </span>
        </div>
      </div>

      {/* Main layout: Article (left) + Sidebar (right) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
        {/* ---- MAIN ARTICLE COLUMN ---- */}
        <main>
          {/* Meta: category + tiêu đề + thông tin */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {article.category && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {article.category}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {article.title}
            </h1>

            {/* Author row + meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 pb-5 border-b border-slate-200 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                  NEX
                </div>
                <div>
                  <div className="font-bold text-slate-800">Ban Biên Tập NEXOR Tech</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {article.createdAt
                        ? new Date(article.createdAt).toLocaleDateString('vi-VN')
                        : 'Mới cập nhật'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <Eye className="w-3 h-3 text-blue-500" />
                      {article.views ?? 0} lượt xem
                    </span>
                    <span>•</span>
                    {/* ⏱ Thời gian đọc ước tính */}
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <Clock className="w-3 h-3 text-amber-500" />
                      {readingTime} phút đọc
                    </span>
                  </div>
                </div>
              </div>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
                title="Chia sẻ liên kết bài viết"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Đã sao chép' : 'Chia sẻ'}</span>
              </button>
            </div>
          </div>

          {/* Tóm tắt bài viết */}
          {article.summary && (
            <div className="my-6 p-4 sm:p-5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-950 font-medium text-sm sm:text-base leading-relaxed italic shadow-xs">
              &ldquo;{article.summary}&rdquo;
            </div>
          )}

          {/* Featured thumbnail */}
          {article.thumbnail && (
            <div className="my-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
              <img
                src={article.thumbnail}
                alt={article.title}
                className="w-full h-auto object-cover aspect-[16/9]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* TOC inline (Mobile): hiển thị khi TOC có >= 3 mục, trên màn hình < xl */}
          {toc.length >= 3 && (
            <div className="xl:hidden my-6">
              <TableOfContents toc={toc} activeId={activeHeadingId} />
            </div>
          )}

          {/* CKEditor 5 Rich HTML Content */}
          <article className="mt-6 bg-white p-5 sm:p-9 rounded-3xl border border-slate-200/80 shadow-xs">
            <div
              ref={contentRef}
              className="
                prose prose-slate max-w-none
                prose-headings:text-slate-900 prose-headings:font-extrabold prose-headings:tracking-tight
                prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2
                prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-sm sm:prose-p:text-base prose-p:mb-4
                prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-li:my-1 prose-li:text-slate-700
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4
                prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-slate-50 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-slate-700 prose-blockquote:my-6
                prose-img:rounded-2xl prose-img:shadow-md prose-img:my-6 prose-img:w-full prose-img:object-cover
                prose-table:border-collapse prose-table:w-full prose-table:my-6 prose-th:border prose-th:border-slate-200 prose-th:p-3 prose-th:bg-slate-50 prose-td:border prose-td:border-slate-200 prose-td:p-3
                prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-xl
              "
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />
          </article>

          {/* Bottom nav */}
          <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
            <Link
              to={listPath}
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

        {/* ---- SIDEBAR COLUMN (Desktop xl+) ---- */}
        <aside className="hidden xl:flex flex-col gap-5 self-start sticky top-24">
          {/* Thống kê bài viết */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-4">
            <div className="flex flex-col items-center gap-1 flex-1 text-center border-r border-slate-100 pr-4">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <span className="text-lg font-black text-slate-800">{readingTime}</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                Phút đọc
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1 text-center">
              <Eye className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-black text-slate-800">{article.views ?? 0}</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                Lượt xem
              </span>
            </div>
          </div>

          {/* TOC (Table of Contents) */}
          {toc.length >= 2 && <TableOfContents toc={toc} activeId={activeHeadingId} />}

          {/* Sản phẩm liên quan */}
          <RelatedProducts category={article.category} />
        </aside>
      </div>
    </div>
  );
};

export default ArticleDetailPage;
