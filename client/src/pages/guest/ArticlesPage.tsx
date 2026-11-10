import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Newspaper,
  Calendar,
  Eye,
  ArrowRight,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { articleService } from '../../api/services/article.service';
import type { Article } from '../../models/article.model';

const CATEGORIES = ['Tất cả', 'Công nghệ', 'Đánh giá', 'Tin tức', 'Thủ thuật'];

export const ArticlesPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const res = await articleService.getPublicArticles({
          category: selectedCategory === 'Tất cả' ? undefined : selectedCategory,
          keyword: keyword.trim() || undefined,
          page: 0,
          size: 20,
          sort: 'createdAt,desc',
        });
        if (res && res.content) {
          setArticles(res.content);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error('Lỗi khi tải bài viết:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [selectedCategory, keyword]);

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const remainingArticles = articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-16">
      {/* Hero Banner Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEXOR Tech Insights &amp; News</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl">
            Tin Tức &amp; Đánh Giá Công Nghệ Đỉnh Cao
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Cập nhật xu hướng AI, đánh giá thiết bị thông minh, mẹo tối ưu hiệu năng và những chuyển động công nghệ mới nhất.
          </p>

          {/* Search bar inside Hero */}
          <div className="mt-8 w-full max-w-xl relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, phân tích, thiết bị..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/20 transition"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Đang cập nhật tin tức mới nhất...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Không tìm thấy bài viết nào</h3>
            <p className="text-xs text-slate-500 mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
            </p>
          </div>
        ) : (
          <div className="space-y-10 mt-4">
            {/* Featured Hero Article */}
            {featuredArticle && (
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 group">
                <div className="lg:col-span-7 relative overflow-hidden aspect-16/10 lg:aspect-auto min-h-[300px]">
                  <img
                    src={featuredArticle.thumbnail || '/images/tech-future-banner.jpg'}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/tech-future-banner.jpg';
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
                      {featuredArticle.category || 'Nổi bật'}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {featuredArticle.createdAt
                          ? new Date(featuredArticle.createdAt).toLocaleDateString('vi-VN')
                          : 'Hôm nay'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        {featuredArticle.views || 0} lượt xem
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      <Link to={`/articles/${featuredArticle.slug}`}>
                        {featuredArticle.title}
                      </Link>
                    </h2>

                    <p className="mt-3 text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {featuredArticle.summary ||
                        'Khám phá ngay bài viết công nghệ chuyên sâu được biên tập bởi đội ngũ chuyên gia NEXOR.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      to={`/articles/${featuredArticle.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>Đọc tiếp bài viết</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Remaining Articles */}
            {remainingArticles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">Bài viết mới cập nhật</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remainingArticles.map((item) => (
                    <article
                      key={item.id}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group"
                    >
                      <Link
                        to={`/articles/${item.slug}`}
                        className="relative block aspect-16/9 overflow-hidden bg-slate-100"
                      >
                        <img
                          src={item.thumbnail || '/images/tech-future-banner.jpg'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/tech-future-banner.jpg';
                          }}
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white/90 backdrop-blur-xs text-slate-800 shadow-xs">
                          {item.category || 'Tin tức'}
                        </span>
                      </Link>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                                : 'Hôm nay'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {item.views || 0}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm leading-snug">
                            <Link to={`/articles/${item.slug}`}>{item.title}</Link>
                          </h4>

                          <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {item.summary || 'Nhấn để xem chi tiết bài viết...'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <Link
                            to={`/articles/${item.slug}`}
                            className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1"
                          >
                            <span>Chi tiết</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticlesPage;
