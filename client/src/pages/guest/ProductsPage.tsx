import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Package,
  RotateCcw,
} from 'lucide-react';
import { productService, categoryService } from '../../api/services/product.service';
import type { Category, FilterParams, Product } from '../../models/product.model';
import ProductCard from '../../components/common/Card/ProductCard';
import ProductCardSkeleton from '../../components/common/Card/ProductCardSkeleton';
import { useDebounce } from '../../hooks/useDebounce';

const BRAND_FILTERS = [
  'Tất cả',
  'Apple',
  'Samsung',
  'Xiaomi',
  'OPPO',
  'ASUS',
  'Dell',
  'Lenovo',
  'Sony',
];

const PRICE_RANGES = [
  { label: 'Tất cả giá', min: 0, max: Infinity },
  { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
  { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
  { label: '10 - 20 triệu', min: 10000000, max: 20000000 },
  { label: 'Trên 20 triệu', min: 20000000, max: Infinity },
];

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: 'newest', label: 'Hàng mới về' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'name_asc', label: 'Tên A → Z' },
] as const;

const PAGE_SIZE = 12;

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlKeyword = searchParams.get('keyword') ?? '';
  const urlCategory = searchParams.get('category') ?? '';
  const urlSort = (searchParams.get('sortBy') ?? '') as FilterParams['sortBy'] | '';
  const urlPage = Number(searchParams.get('page') ?? '1');

  const [keyword, setKeyword] = useState(urlKeyword);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedBrand, setSelectedBrand] = useState('Tất cả');
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(0);
  const [sortBy, setSortBy] = useState(urlSort);
  const [page, setPage] = useState(urlPage);

  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedKeyword = useDebounce(keyword, 400);

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setKeyword(searchParams.get('keyword') ?? '');
    setSelectedCategory(searchParams.get('category') ?? '');
    setSortBy((searchParams.get('sortBy') ?? '') as FilterParams['sortBy'] | '');
    setPage(Number(searchParams.get('page') ?? '1'));
  }, [searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: FilterParams = {
        limit: 100,
        ...(debouncedKeyword ? { keyword: debouncedKeyword } : {}),
        ...(selectedCategory ? { categorySlug: selectedCategory } : {}),
        ...(sortBy ? { sortBy: sortBy as FilterParams['sortBy'] } : {}),
      };
      const result = await productService.getProducts(params);
      setRawProducts(result.data);
    } catch {
      setError('Không thể tải sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, selectedCategory, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return rawProducts.filter((product) => {
      if (selectedBrand !== 'Tất cả') {
        const brandMatch =
          product.brand?.toLowerCase() === selectedBrand.toLowerCase() ||
          product.name.toLowerCase().includes(selectedBrand.toLowerCase());
        if (!brandMatch) return false;
      }
      const range = PRICE_RANGES[selectedPriceIndex];
      if (product.price < range.min || product.price > range.max) {
        return false;
      }
      return true;
    });
  }, [rawProducts, selectedBrand, selectedPriceIndex]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (slug) newParams.set('category', slug);
    else newParams.delete('category');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    setKeyword('');
    setSelectedCategory('');
    setSelectedBrand('Tất cả');
    setSelectedPriceIndex(0);
    setSortBy('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters =
    debouncedKeyword ||
    selectedCategory ||
    selectedBrand !== 'Tất cả' ||
    selectedPriceIndex > 0 ||
    sortBy;

  const selectedCategoryName =
    categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 mb-6">
        <div>
          <nav className="text-xs text-gray-500 mb-1">
            <Link to="/" className="hover:text-blue-600">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-semibold">
              {selectedCategoryName || 'Tất cả sản phẩm'}
            </span>
          </nav>
          <h1 className="text-2xl font-black text-gray-900">
            {selectedCategoryName ? `Danh mục: ${selectedCategoryName}` : 'Danh sách sản phẩm'}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredProducts.length} sản phẩm)
            </span>
          </h1>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-semibold text-gray-600">
            Sắp xếp theo:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as FilterParams['sortBy'] | '');
              setPage(1);
            }}
            className="text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 font-medium focus:outline-none focus:border-blue-600"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Box */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        {/* Brand Filter */}
        <div className="mb-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Thương hiệu
          </div>
          <div className="flex flex-wrap gap-2">
            {BRAND_FILTERS.map((brand) => (
              <button
                key={brand}
                onClick={() => { setSelectedBrand(brand); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedBrand === brand
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="mb-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Mức giá
          </div>
          <div className="flex flex-wrap gap-2">
            {PRICE_RANGES.map((range, idx) => (
              <button
                key={range.label}
                onClick={() => { setSelectedPriceIndex(idx); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedPriceIndex === idx
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Chips */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Danh mục
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategorySelect('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                !selectedCategory
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
              }`}
            >
              Tất cả danh mục
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedCategory === cat.slug
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Clear */}
        {hasActiveFilters && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-500">Đang lọc:</span>
              {debouncedKeyword && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
                  Từ khóa: "{debouncedKeyword}"
                </span>
              )}
              {selectedBrand !== 'Tất cả' && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
                  {selectedBrand}
                </span>
              )}
              {selectedPriceIndex > 0 && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
                  {PRICE_RANGES[selectedPriceIndex].label}
                </span>
              )}
              {selectedCategory && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
                  {selectedCategoryName}
                </span>
              )}
            </div>

            <button
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} /> Bỏ chọn tất cả
            </button>
          </div>
        )}
      </div>

      {/* Product Grid */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Package size={52} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="text-sm text-gray-500 mb-4">
            Hãy thử tìm kiếm với từ khóa khác hoặc xóa bớt các bộ lọc
          </p>
          <button
            onClick={handleClearAllFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Xóa bộ lọc
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {paginatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8" role="navigation">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                    page === p
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
