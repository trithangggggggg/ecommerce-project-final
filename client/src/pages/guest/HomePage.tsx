import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Watch,
  Gamepad2,
  Tv,
  Cpu,
  Home,
  LayoutGrid,
  ChevronRight,
  ArrowRight,
  Zap,
  ShieldCheck,
  Heart,
  ShoppingCart,
  Sparkles,
  Camera,
  Gift,
  Newspaper,
  Eye,
  Truck,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import { categoryApiService } from '../../api/services/category.service';
import { brandService, type BrandItem } from '../../api/services/brand.service';
import { articleService } from '../../api/services/article.service';
import type { Article } from '../../models/article.model';
import {
  flashSaleService,
  type FlashSaleDto,
  type FlashSaleProductItem,
} from '../../api/services/flashSale.service';
import { bannerService, type BannerItem } from '../../api/services/banner.service';
import type { Category, Product } from '../../models/product.model';
import ProductCard from '../../components/common/Card/ProductCard';
import ProductCardSkeleton from '../../components/common/Card/ProductCardSkeleton';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useBannerStore } from '../../store/useBannerStore';
import { useSiteConfigStore } from '../../store/useSiteConfigStore';
import { ROUTES } from '../../constants/routes';
import { formatPrice } from '../../utils/format';
import HeroBannerSlider from '../../components/home/HeroBannerSlider';
import BrandLogo from '../../components/home/BrandLogo';
import bannerAiVision from '../../assets/images/banner-ai-vision.jpg';
import bannerLuckyWheel from '../../assets/images/banner-lucky-wheel.jpg';

function getCategoryIcon(slug = '', name = ''): LucideIcon {
  const key = `${slug} ${name}`.toLowerCase();
  if (key.includes('dien-thoai') || key.includes('điện thoại') || key.includes('phone')) return Smartphone;
  if (key.includes('laptop') || key.includes('macbook')) return Laptop;
  if (key.includes('may-tinh-bang') || key.includes('máy tính bảng') || key.includes('tablet') || key.includes('ipad'))
    return Tablet;
  if (key.includes('tai-nghe') || key.includes('am-thanh') || key.includes('âm thanh') || key.includes('loa'))
    return Headphones;
  if (key.includes('dong-ho') || key.includes('đồng hồ') || key.includes('watch')) return Watch;
  if (key.includes('gaming') || key.includes('game')) return Gamepad2;
  if (key.includes('tv') || key.includes('man-hinh') || key.includes('màn hình')) return Tv;
  if (key.includes('linh-kien') || key.includes('linh kiện') || key.includes('phu-kien') || key.includes('phụ kiện'))
    return Cpu;
  if (key.includes('gia-dung') || key.includes('gia dụng')) return Home;
  return LayoutGrid;
}

function getDefaultCategorySubtitle(slug = '', name = ''): string {
  const key = `${slug} ${name}`.toLowerCase();
  if (key.includes('dien-thoai') || key.includes('điện thoại') || key.includes('phone')) return 'Đa dạng thương hiệu';
  if (key.includes('laptop') || key.includes('macbook')) return 'Hiệu năng vượt trội';
  if (key.includes('may-tinh-bang') || key.includes('máy tính bảng') || key.includes('tablet')) return 'Linh hoạt, tiện lợi';
  if (key.includes('tai-nghe') || key.includes('am-thanh') || key.includes('âm thanh') || key.includes('loa'))
    return 'Âm thanh sống động';
  if (key.includes('dong-ho') || key.includes('đồng hồ') || key.includes('watch')) return 'Theo dõi sức khỏe';
  if (key.includes('phu-kien') || key.includes('phụ kiện') || key.includes('linh-kien') || key.includes('linh kiện'))
    return 'Chính hãng, bền bỉ';
  if (key.includes('gaming') || key.includes('game')) return 'Chiến game đỉnh cao';
  return 'Chính hãng Nexor';
}

function getBrandDisplay(brand: { name: string; country?: string | null }) {
  const norm = (brand.name || '').toLowerCase().trim();

  if (norm.includes('asus')) {
    return { name: 'ASUS', slogan: 'In Search of Incredible' };
  }
  if (norm.includes('hyperx') || norm.includes('hyper') || norm === 'ht') {
    return { name: 'HyperX', slogan: "We're All Gamers" };
  }
  if (norm.includes('razer')) {
    return { name: 'Razer', slogan: 'For Gamers. By Gamers.' };
  }
  if (norm.includes('xp-pen') || norm.includes('xppen') || norm.includes('xpg') || norm === 'xp') {
    return { name: 'XP-Pen', slogan: 'Graphic Tablets' };
  }
  if (norm.includes('apple')) {
    return { name: 'Apple', slogan: 'Think Different' };
  }
  if (norm.includes('samsung')) {
    return { name: 'Samsung', slogan: 'Galaxy Innovation' };
  }
  if (norm.includes('sony')) {
    return { name: 'Sony', slogan: 'Be Moved' };
  }
  if (norm.includes('dell')) {
    return { name: 'Dell', slogan: 'High Performance' };
  }
  if (norm.includes('xiaomi')) {
    return { name: 'Xiaomi', slogan: 'Smart Living AIoT' };
  }
  if (norm.includes('logitech')) {
    return { name: 'Logitech', slogan: 'Defy Logic' };
  }
  if (norm.includes('anker')) {
    return { name: 'Anker', slogan: 'Charge Fast, Live More' };
  }

  return {
    name: brand.name,
    slogan: brand.country ? `${brand.country} • Chính hãng` : 'Chính hãng 100%',
  };
}

const QUICK_GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

function isBannerCurrentlyActive(banner: BannerItem): boolean {
  if (!banner.isActive) return false;
  const now = Date.now();
  if (banner.startDate && new Date(banner.startDate).getTime() > now) return false;
  if (banner.endDate && new Date(banner.endDate).getTime() < now) return false;
  return true;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [flashSale, setFlashSale] = useState<FlashSaleDto | null>(null);
  const [flashRemainingSec, setFlashRemainingSec] = useState(0);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [addingFlashProductId, setAddingFlashProductId] = useState<number | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const isProductLiked = useWishlistStore((s) => s.isLiked);
  const toggleWishlistItem = useWishlistStore((s) => s.toggleItem);
  const {
    banners,
    isLoaded: bannersLoaded,
    hasError: bannersError,
    fetchBanners,
  } = useBannerStore();
  const { config, fetchSiteConfig } = useSiteConfigStore();

  useEffect(() => {
    if (!bannersLoaded) {
      fetchBanners();
    }
  }, [bannersLoaded, fetchBanners]);

  const loadHomeData = useCallback(async () => {
    setLoading(true);
    setProductsError(null);
    const [productsRes, categoriesRes, flashRes, brandsRes, articlesRes] = await Promise.allSettled([
      productService.getProducts({ limit: 10, sortBy: 'newest' }),
      categoryApiService.getPublicCategories(),
      flashSaleService.getCurrentFlashSale(),
      brandService.getPublicBrands(),
      articleService.getPublicArticles({ page: 0, size: 4 }),
    ]);

    if (productsRes.status === 'fulfilled') {
      setLatestProducts(Array.isArray(productsRes.value?.data) ? productsRes.value.data : []);
    } else {
      setLatestProducts([]);
      setProductsError('Không thể tải danh sách sản phẩm mới nhất.');
    }

    if (categoriesRes.status === 'fulfilled') {
      setCategories(Array.isArray(categoriesRes.value) ? categoriesRes.value : []);
    }

    if (brandsRes.status === 'fulfilled' && Array.isArray(brandsRes.value)) {
      setBrands(brandsRes.value.filter((b) => b.status !== false));
    }

    if (articlesRes.status === 'fulfilled' && articlesRes.value?.content) {
      setArticles(articlesRes.value.content);
    }

    if (flashRes.status === 'fulfilled' && flashRes.value) {
      setFlashSale(flashRes.value);
      setFlashRemainingSec(Math.max(0, flashRes.value.remainingSeconds || 0));
    } else {
      setFlashSale(null);
      setFlashRemainingSec(0);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const isFlashCountdownActive = flashRemainingSec > 0;

  useEffect(() => {
    if (!isFlashCountdownActive) return;
    const timer = setInterval(() => {
      setFlashRemainingSec((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isFlashCountdownActive]);

  const timeLeft = useMemo(() => {
    const hours = Math.floor(flashRemainingSec / 3600);
    const minutes = Math.floor((flashRemainingSec % 3600) / 60);
    const seconds = flashRemainingSec % 60;
    return { hours, minutes, seconds };
  }, [flashRemainingSec]);

  const sortedCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => c.status !== false)
        .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)),
    [categories]
  );

  const sidebarCategories = useMemo(() => sortedCategories.slice(0, 10), [sortedCategories]);
  const quickCategories = useMemo(() => {
    const marked = sortedCategories.filter((c) => c.showOnHome === true);
    return (marked.length > 0 ? marked : sortedCategories).slice(0, 6);
  }, [sortedCategories]);
  const quickGridColsClass = QUICK_GRID_COLS[quickCategories.length] || 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  const activeBannersSorted = useMemo(
    () =>
      [...banners]
        .filter(isBannerCurrentlyActive)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [banners]
  );

  const heroPromoBanners = useMemo(
    () => activeBannersSorted.filter((b) => b.position === 'HERO_PROMO').slice(0, 3),
    [activeBannersSorted]
  );

  const verticalPromoBanner = useMemo(
    () => activeBannersSorted.find((b) => b.position === 'VERTICAL_PROMO') || null,
    [activeBannersSorted]
  );

  const isWaitingInitialBanners = !bannersLoaded && !bannersError;
  const showHeroPromoColumn = heroPromoBanners.length > 0 || isWaitingInitialBanners;
  const showVerticalPromoColumn = Boolean(verticalPromoBanner) || isWaitingInitialBanners;

  const toggleWishlist = async (id: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    try {
      await toggleWishlistItem(id);
    } catch {
      // Ignore transient errors
    }
  };

  const handleFlashSaleAddToCart = async (item: FlashSaleProductItem) => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    setAddingFlashProductId(item.productId);
    try {
      const fullProduct = await productService.getProductById(item.productId);
      addItem(fullProduct, 1);
    } catch {
      navigate(`/products/${item.productId}`);
    } finally {
      setAddingFlashProductId(null);
    }
  };

  const renderBannerCard = (banner: BannerItem, className: string, imgClassName: string) => {
    const targetUrl = banner.linkUrl?.trim() || '/products';
    const isExternal = /^https?:\/\//i.test(targetUrl);
    const content = (
      <img
        src={banner.imageUrl}
        alt={banner.title}
        className={imgClassName}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/images/tech-future-banner.jpg';
        }}
      />
    );

    if (isExternal) {
      return (
        <a
          key={banner.id}
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => bannerService.trackClick(banner.id)}
          className={className}
          title={banner.title}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={banner.id}
        to={targetUrl}
        onClick={() => bannerService.trackClick(banner.id)}
        className={className}
        title={banner.title}
      >
        {content}
      </Link>
    );
  };

  const flashSaleItems = flashSale?.items ?? [];

  return (
    <div className="bg-[#f2f4f7] text-gray-800 font-sans pb-16">
      {/* 1. HERO SECTION */}
      <section className="max-w-[1360px] mx-auto px-4 pt-4 pb-4">
        <div
          className={`grid grid-cols-1 gap-3.5 items-stretch lg:h-[388px] lg:grid-rows-[minmax(0,388px)] lg:overflow-hidden ${
            showHeroPromoColumn ? 'lg:grid-cols-[210px_1fr_265px]' : 'lg:grid-cols-[210px_1fr]'
          }`}
        >
          {/* COLUMN 1: Dynamic Categories Sidebar */}
          <div className="hidden lg:block h-full min-h-0">
            <div className="bg-white rounded-2xl border border-gray-200/70 p-2 shadow-sm h-full flex flex-col justify-between overflow-hidden">
              <div className="space-y-0.5 overflow-y-auto pr-0.5">
                {sidebarCategories.length > 0 ? (
                  sidebarCategories.map((cat, idx) => {
                    const Icon = getCategoryIcon(cat.slug, cat.name);
                    const isFirst = idx === 0;
                    const categoryParam = cat.slug || String(cat.id);
                    const rowPadding = sidebarCategories.length <= 6 ? 'py-2.5' : 'py-2';
                    return (
                      <Link
                        key={cat.id}
                        to={`/products?category=${encodeURIComponent(categoryParam)}`}
                        className={`flex items-center justify-between px-2.5 ${rowPadding} rounded-xl text-xs font-semibold transition-colors group ${
                          isFirst
                            ? 'bg-[#edf2f7] text-gray-900'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={15}
                            className={
                              isFirst
                                ? 'text-gray-900 shrink-0'
                                : 'text-gray-400 group-hover:text-blue-600 transition-colors shrink-0'
                            }
                          />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <ChevronRight
                          size={13}
                          className={
                            isFirst
                              ? 'text-gray-700 shrink-0'
                              : 'text-gray-300 group-hover:text-blue-600 transition-colors shrink-0'
                          }
                        />
                      </Link>
                    );
                  })
                ) : loading ? (
                  Array.from({ length: 7 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-2.5 rounded-xl animate-pulse"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded bg-gray-200" />
                        <div className="h-3 w-24 rounded bg-gray-200" />
                      </div>
                      <div className="w-3 h-3 rounded bg-gray-100" />
                    </div>
                  ))
                ) : (
                  <Link
                    to="/products"
                    className="flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid size={15} className="text-gray-400" />
                      <span>Tất cả sản phẩm</span>
                    </div>
                    <ChevronRight size={13} className="text-gray-300" />
                  </Link>
                )}
              </div>
              {sidebarCategories.length > 0 && sidebarCategories.length < 10 && (
                <div className="pt-1.5 mt-1 border-t border-gray-100 space-y-0.5 shrink-0">
                  {sidebarCategories.length <= 7 && (
                    <Link
                      to="/products?sort=discount"
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Zap
                          size={15}
                          className="text-gray-400 group-hover:text-blue-600 transition-colors shrink-0"
                        />
                        <span className="truncate">Hot Deals - Giá sốc</span>
                      </div>
                      <ChevronRight
                        size={13}
                        className="text-gray-300 group-hover:text-blue-600 transition-colors shrink-0"
                      />
                    </Link>
                  )}
                  <Link
                    to="/products"
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <LayoutGrid
                        size={15}
                        className="text-gray-400 group-hover:text-blue-600 transition-colors shrink-0"
                      />
                      <span className="truncate">Tất cả sản phẩm</span>
                    </div>
                    <ChevronRight
                      size={13}
                      className="text-gray-300 group-hover:text-blue-600 transition-colors shrink-0"
                    />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: Main Hero Banner Slider */}
          <div className="min-w-0 min-h-0 h-full overflow-hidden">
            <HeroBannerSlider />
          </div>

          {/* COLUMN 3: Right Promo Cards (from Admin Banners: HERO_PROMO) */}
          {showHeroPromoColumn && (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-col lg:justify-between gap-3 h-full min-h-0">
              {heroPromoBanners.length > 0
                ? heroPromoBanners.map((banner) => {
                    const useNaturalPromoRatio =
                      heroPromoBanners.length === 3 && Boolean(banner.imageUrl?.includes('/images/promo-'));
                    return renderBannerCard(
                      banner,
                      useNaturalPromoRatio
                        ? 'block relative rounded-2xl overflow-hidden shadow-xs group border border-gray-200/80 hover:shadow-md transition-all bg-white h-32 sm:h-28 lg:h-auto lg:shrink-0'
                        : 'block relative rounded-2xl overflow-hidden shadow-xs group border border-gray-200/80 hover:shadow-md transition-all bg-white h-36 sm:h-28 lg:h-auto lg:flex-1 lg:min-h-0',
                      useNaturalPromoRatio
                        ? 'w-full h-full lg:h-auto block object-cover group-hover:scale-[1.02] transition-transform duration-300'
                        : 'w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300'
                    );
                  })
                : [1, 2, 3].map((slot) => (
                    <div
                      key={slot}
                      className="rounded-2xl bg-white border border-gray-200/80 shadow-xs h-32 sm:h-28 lg:flex-1 lg:min-h-0 animate-pulse p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                        <div className="h-4 w-28 bg-gray-200 rounded" />
                        <div className="h-2.5 w-24 bg-gray-100 rounded" />
                      </div>
                      <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
                    </div>
                  ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. QUICK CATEGORIES BAR (Divider Strip between Hero & Flash Sale - Dynamic from DB Categories) */}
      {(quickCategories.length > 0 || loading) && (
        <section className="max-w-[1360px] mx-auto px-4 mb-8 sm:mb-10">
          {quickCategories.length > 0 ? (
            <div className={`grid ${quickGridColsClass} gap-3.5`}>
              {quickCategories.map((cat) => {
                const Icon = getCategoryIcon(cat.slug, cat.name);
                const categoryParam = cat.slug || String(cat.id);
                const subtitle =
                  cat.description?.trim() || getDefaultCategorySubtitle(cat.slug, cat.name);
                return (
                  <Link
                    key={cat.id}
                    to={`/products?category=${encodeURIComponent(categoryParam)}`}
                    className="bg-white rounded-2xl border border-gray-200/80 py-4 px-3 shadow-xs hover:shadow-md hover:border-blue-200/80 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="text-slate-700 group-hover:text-blue-600 transition-colors mb-2">
                      <Icon size={26} strokeWidth={1.6} />
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {cat.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-normal line-clamp-1">
                      {subtitle}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((slot) => (
                <div
                  key={slot}
                  className="bg-white rounded-2xl border border-gray-200/80 py-4 px-3 shadow-xs flex flex-col items-center justify-center animate-pulse h-[104px]"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-200 mb-2" />
                  <div className="h-3 w-20 bg-gray-200 rounded mb-1.5" />
                  <div className="h-2.5 w-24 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. FLASH SALE + RIGHT VERTICAL TECH BANNER */}
      <section className="max-w-[1360px] mx-auto px-4 mb-10 sm:mb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Flash Sale Block */}
          <div
            className={`${
              showVerticalPromoColumn ? 'lg:col-span-9' : 'lg:col-span-12'
            } bg-[#1b1e26] rounded-2xl p-4 sm:p-5 shadow-sm text-white flex flex-col justify-between`}
          >
            {/* Flash Sale Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="text-white">
                  <Zap size={24} className="fill-white text-white" />
                </div>
                <div>
                  <div className="text-lg font-black tracking-wider text-white">
                    {flashSale?.title || config.general.flashSaleBannerTitle || 'FLASH SALE'}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {flashSale?.description ||
                      flashSale?.badgeText ||
                      (flashSale ? 'Giá sốc giới hạn theo khung giờ' : 'Chương trình giờ vàng giá sốc')}
                  </div>
                </div>
              </div>

              {/* Countdown Timer + Link */}
              <div className="flex items-center gap-4">
                {flashSale && flashRemainingSec > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="text-center">
                      <div className="bg-[#242833] text-white font-mono font-bold text-xs px-2 py-1 rounded border border-gray-700">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </div>
                      <span className="text-[9px] text-gray-400 font-medium">Giờ</span>
                    </div>
                    <span className="text-white font-bold text-xs -mt-3">:</span>
                    <div className="text-center">
                      <div className="bg-[#242833] text-white font-mono font-bold text-xs px-2 py-1 rounded border border-gray-700">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </div>
                      <span className="text-[9px] text-gray-400 font-medium">Phút</span>
                    </div>
                    <span className="text-white font-bold text-xs -mt-3">:</span>
                    <div className="text-center">
                      <div className="bg-[#242833] text-white font-mono font-bold text-xs px-2 py-1 rounded border border-gray-700">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                      <span className="text-[9px] text-gray-400 font-medium">Giây</span>
                    </div>
                  </div>
                )}

                <Link
                  to="/products"
                  className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1 ml-2 group"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Dynamic Flash Sale Items */}
            {loading && flashSaleItems.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3.5 flex-1">
                {[1, 2, 3, 4].map((slot) => (
                  <div
                    key={slot}
                    className="bg-white/95 rounded-xl p-3 flex flex-col justify-between h-[296px] animate-pulse"
                  >
                    <div className="h-4 w-14 bg-gray-200 rounded mb-2" />
                    <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg mb-2" />
                    <div className="space-y-1.5 mb-3">
                      <div className="h-3 w-full bg-gray-200 rounded" />
                      <div className="h-3 w-2/3 bg-gray-200 rounded" />
                    </div>
                    <div className="h-8 w-full bg-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : flashSaleItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3.5 flex-1">
                {flashSaleItems.slice(0, 4).map((item) => {
                  const orig = item.originalPrice ?? 0;
                  const computedDiscount =
                    item.discountPercent ??
                    (orig > item.salePrice ? Math.round(((orig - item.salePrice) / orig) * 100) : 0);
                  const isLiked = isProductLiked(item.productId);
                  const soldOut =
                    item.remainingStock !== undefined
                      ? item.remainingStock <= 0
                      : item.stockLimit > 0 && item.soldCount >= item.stockLimit;
                  const isAdding = addingFlashProductId === item.productId;

                  return (
                    <div
                      key={item.id ?? item.productId}
                      className="bg-white rounded-xl p-3 flex flex-col justify-between text-gray-800 shadow-sm hover:shadow-md transition-shadow relative group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        {computedDiscount > 0 ? (
                          <span className="bg-[#1b1e26] text-white text-[11px] font-bold px-2 py-0.5 rounded">
                            -{computedDiscount}%
                          </span>
                        ) : (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            DEAL HOT
                          </span>
                        )}
                        <button
                          onClick={(e) => toggleWishlist(item.productId, e)}
                          className={`p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer ${
                            isLiked ? 'text-red-500' : ''
                          }`}
                          aria-label="Yêu thích"
                        >
                          <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <Link
                        to={`/products/${item.productId}`}
                        className="w-full aspect-[4/3] flex items-center justify-center p-1.5 mb-2 overflow-hidden"
                      >
                        <img
                          src={item.productImageUrl || '/images/tech-future-banner.jpg'}
                          alt={item.productName || 'Sản phẩm Flash Sale'}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/tech-future-banner.jpg';
                          }}
                        />
                      </Link>

                      <Link
                        to={`/products/${item.productId}`}
                        className="text-xs font-bold text-gray-900 truncate hover:text-blue-600 transition-colors mb-1 block"
                        title={item.productName}
                      >
                        {item.productName || `Sản phẩm #${item.productId}`}
                      </Link>

                      <div className="flex items-center justify-between gap-1.5 text-[11px] text-gray-500 mb-1.5">
                        {item.productBrand && (
                          <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                            {item.productBrand}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          Đã bán {item.soldCount}/{item.stockLimit}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mb-2.5">
                        {item.originalPrice && item.originalPrice > item.salePrice && (
                          <span className="text-[11px] text-gray-400 line-through">
                            {formatPrice(item.originalPrice)}
                          </span>
                        )}
                        <span className="text-sm font-black text-gray-950">
                          {formatPrice(item.salePrice)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={soldOut || isAdding}
                        onClick={() => handleFlashSaleAddToCart(item)}
                        className="w-full py-2 bg-[#232733] hover:bg-[#161920] disabled:bg-gray-300 disabled:text-gray-500 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ShoppingCart size={13} />
                        <span>{soldOut ? 'Hết suất Flash Sale' : isAdding ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-gray-300 space-y-2">
                <p className="text-sm font-bold text-white">Hiện chưa có khung giờ Flash Sale đang diễn ra</p>
                <p className="text-xs text-gray-400">
                  Khám phá các sản phẩm công nghệ chính hãng với mức giá ưu đãi ngay tại cửa hàng.
                </p>
                <div className="pt-2">
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-gray-900 text-xs font-bold hover:bg-gray-100 transition-colors"
                  >
                    <span>Xem tất cả sản phẩm</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Vertical Tech Banner (from Admin Banners: VERTICAL_PROMO) */}
          {showVerticalPromoColumn && (
            <div className="lg:col-span-3 flex">
              {verticalPromoBanner ? (
                renderBannerCard(
                  verticalPromoBanner,
                  'block relative rounded-2xl overflow-hidden shadow-sm group w-full min-h-[260px] lg:min-h-0 h-full bg-[#12141a] hover:shadow-md transition-all',
                  'w-full h-full lg:absolute lg:inset-0 object-cover group-hover:scale-[1.02] transition-transform duration-300'
                )
              ) : (
                <div className="rounded-2xl w-full min-h-[260px] lg:min-h-0 h-full bg-[#161820] animate-pulse" />
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. SẢN PHẨM MỚI NHẤT (Latest Products from Backend) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-10 sm:mb-14">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-gray-900" />
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              Sản phẩm mới nhất
            </h2>
          </div>
          <Link
            to="/products?sortBy=newest"
            className="text-xs font-semibold text-gray-500 hover:text-blue-600 flex items-center gap-1 group"
          >
            <span>Xem tất cả</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : productsError ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center">
            <p className="text-sm font-semibold text-rose-700 mb-3">{productsError}</p>
            <button
              type="button"
              onClick={() => {
                void fetchBanners(true);
                void fetchSiteConfig(true);
                void loadHomeData();
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : latestProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-xs text-gray-500">
            Chưa có sản phẩm mới nào được hiển thị.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {latestProducts.slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* 5. TÍNH NĂNG ĐẶC SẮC (AI Vision Search + Lucky Wheel Gamification) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-14 sm:mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* AI Vision Search Banner Card (Full-bleed cover) */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0a1120] text-white p-6 sm:p-8 border border-blue-500/20 shadow-xl group hover:border-blue-500/40 transition-all duration-300 min-h-[220px] sm:min-h-[240px] flex items-center">
            {/* Full-bleed background illustration: fills the entire card from edge to edge */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <img
                src={bannerAiVision}
                alt="AI Visual Search Banner"
                className="absolute right-0 top-0 w-full sm:w-7/12 h-full object-cover object-center sm:object-right group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1120] via-[#0a1120]/95 sm:via-[#0a1120]/80 to-transparent w-full sm:w-3/5" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1120]/70 sm:from-transparent to-transparent" />
            </div>

            {/* Content on top */}
            <div className="relative z-10 max-w-sm sm:max-w-md text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3 backdrop-blur-sm">
                <Sparkles size={13} className="text-blue-300 animate-pulse" />
                <span>Google Gemini Vision AI</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2 text-white">
                Tìm kiếm bằng hình ảnh
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Tải ảnh hoặc chụp trực tiếp, AI sẽ tìm kiếm sản phẩm tương tự với độ chính xác cao, giúp bạn dễ dàng tìm được món đồ ưng ý.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-visual-search'))}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/40 transition-all transform active:scale-95 cursor-pointer"
                >
                  <Camera size={16} />
                  <span>Thử tìm bằng hình ảnh</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Lucky Wheel Gamification Banner Card (Full-bleed cover) */}
          <div className="relative overflow-hidden rounded-3xl bg-[#170a27] text-white p-6 sm:p-8 border border-purple-500/20 shadow-xl group hover:border-purple-500/40 transition-all duration-300 min-h-[220px] sm:min-h-[240px] flex items-center">
            {/* Full-bleed background illustration: fills the entire card from edge to edge */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <img
                src={bannerLuckyWheel}
                alt="Lucky Wheel Banner"
                className="absolute right-0 top-0 w-full sm:w-7/12 h-full object-cover object-center sm:object-right group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#170a27] via-[#170a27]/95 sm:via-[#170a27]/80 to-transparent w-full sm:w-3/5" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#170a27]/70 sm:from-transparent to-transparent" />
            </div>

            {/* Content on top */}
            <div className="relative z-10 max-w-sm sm:max-w-md text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-3 backdrop-blur-sm">
                <Gift size={13} className="text-amber-300 animate-bounce" />
                <span>Minigame hàng ngày</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2 text-white">
                Vòng quay may mắn - Trúng Voucher 100K
              </h3>
              <p className="text-xs sm:text-sm text-purple-200 leading-relaxed mb-6">
                Mỗi ngày 1 lượt quay hoàn toàn miễn phí. Cơ hội nhận voucher 100K VIP, mã giảm giá 50%, freeship toàn quốc và quà tặng độc quyền từ NEXOR.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-lucky-wheel'))}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/40 transition-all transform active:scale-95 cursor-pointer"
                >
                  <Gift size={16} />
                  <span>Quay ngay nhận quà</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. THƯƠNG HIỆU CÔNG NGHỆ CHÍNH HÃNG (Top Official Brands Marquee Showcase) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-14 sm:mb-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-gray-900 tracking-tight">
            Thương hiệu đối tác hàng đầu
          </h2>
          <Link
            to="/products"
            className="text-xs font-semibold text-gray-500 hover:text-blue-600 flex items-center gap-1 group"
          >
            <span>Tất cả thương hiệu</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Infinite Loop Marquee (2 Rows in Opposite Directions) */}
        {(() => {
          const brandList =
            brands.length > 0
              ? brands
              : [
                  { id: 1, name: 'ASUS', slug: 'asus', country: 'Quốc tế', displayOrder: 1, status: true },
                  { id: 2, name: 'HyperX', slug: 'hyperx', country: 'Quốc tế', displayOrder: 2, status: true },
                  { id: 3, name: 'Razer', slug: 'razer', country: 'Quốc tế', displayOrder: 3, status: true },
                  { id: 4, name: 'XP-Pen', slug: 'xp-pen', country: 'Quốc tế', displayOrder: 4, status: true },
                  { id: 5, name: 'Apple', slug: 'apple', country: 'Hoa Kỳ', displayOrder: 5, status: true },
                  { id: 6, name: 'Samsung', slug: 'samsung', country: 'Hàn Quốc', displayOrder: 6, status: true },
                  { id: 7, name: 'Sony', slug: 'sony', country: 'Nhật Bản', displayOrder: 7, status: true },
                  { id: 8, name: 'Dell', slug: 'dell', country: 'Hoa Kỳ', displayOrder: 8, status: true },
                  { id: 9, name: 'Xiaomi', slug: 'xiaomi', country: 'Trung Quốc', displayOrder: 9, status: true },
                  { id: 10, name: 'Logitech', slug: 'logitech', country: 'Thụy Sĩ', displayOrder: 10, status: true },
                  { id: 11, name: 'Anker', slug: 'anker', country: 'Hoa Kỳ', displayOrder: 11, status: true },
                ];
          const reversedBrandList = [...brandList].reverse();

          const renderBrandItem = (b: BrandItem, uniqueKey: string) => {
            const { name: displayName, slogan } = getBrandDisplay(b);
            return (
              <Link
                key={uniqueKey}
                to={`/products?brand=${encodeURIComponent(b.name)}`}
                className="group bg-white rounded-2xl border border-gray-100/90 p-3 sm:px-3.5 sm:py-3 shadow-xs hover:border-blue-400 hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer shrink-0 w-[240px] sm:w-[260px] select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gray-50 flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                    <BrandLogo brandName={b.name} logoUrl={b.logoUrl} />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {displayName}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-gray-400 group-hover:text-gray-500 transition-colors truncate">
                      {slogan}
                    </span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-600 shrink-0 transition-colors">
                  <ChevronRight size={12} />
                </div>
              </Link>
            );
          };

          return (
            <div className="relative overflow-hidden marquee-container py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {/* Left Gradient Fade Mask */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-[#f8fafc] via-[#f8fafc]/90 to-transparent z-10" />

              {/* Right Gradient Fade Mask */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-[#f8fafc] via-[#f8fafc]/90 to-transparent z-10" />

              {/* Track 1: Trượt liên tục từ phải sang trái */}
              <div className="flex gap-3 mb-3 animate-marquee-left">
                {[...brandList, ...brandList].map((b, idx) =>
                  renderBrandItem(b, `top-${idx}-${b.id}`)
                )}
              </div>

              {/* Track 2: Trượt liên tục từ trái sang phải */}
              <div className="flex gap-3 animate-marquee-right">
                {[...reversedBrandList, ...reversedBrandList].map((b, idx) =>
                  renderBrandItem(b, `bot-${idx}-${b.id}`)
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {/* 7. TIN TỨC CÔNG NGHỆ & ĐÁNH GIÁ (Tech Articles & Expert Reviews) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-14 sm:mb-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper size={20} className="text-gray-900" />
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              Các tin tức & Trải nghiệm Công nghệ
            </h2>
          </div>
          <Link
            to={ROUTES.ARTICLES}
            className="text-xs font-semibold text-gray-500 hover:text-blue-600 flex items-center gap-1 group"
          >
            <span>Xem tất cả bài viết</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-500">
            Đang cập nhật các bài viết công nghệ mới nhất...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/articles/${article.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  {article.thumbnail ? (
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <Newspaper size={32} />
                    </div>
                  )}
                  {article.category && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm">
                      {article.category}
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-2">
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
                        {article.summary}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                    <span>
                      {article.createdAt
                        ? new Date(article.createdAt).toLocaleDateString('vi-VN')
                        : 'Mới đăng'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {article.views || 0} lượt xem
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 8. HỆ THỐNG SHOWROOM TRẢI NGHIỆM (Store Locator Banner) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-14 sm:mb-20">
        <Link
          to={ROUTES.STORES}
          className="block group relative overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
          title="Trải nghiệm sản phẩm thực tế tại showroom NEXOR"
        >
          <img
            src="/images/banner-showroom-flagship.png"
            alt="Trải nghiệm sản phẩm thực tế tại showroom NEXOR - Hệ thống bán lẻ công nghệ hàng đầu"
            className="w-full h-auto object-cover rounded-3xl block transition-transform duration-500 group-hover:scale-[1.01]"
          />
        </Link>
      </section>

      {/* 9. CAM KẾT VÀNG TỪ NEXOR (Core Service Pillars - Dark Cyber Luxury Theme) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-14 sm:mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="group bg-[#121620]/90 hover:bg-[#161c2b] rounded-2xl p-5 border border-gray-800/80 hover:border-blue-500/50 flex items-start gap-3.5 shadow-lg shadow-black/20 hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
                100% Hàng chính hãng
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Phân phối ủy quyền, đầy đủ hóa đơn VAT điện tử và bảo hành chính hãng toàn quốc.
              </p>
            </div>
          </div>

          <div className="group bg-[#121620]/90 hover:bg-[#161c2b] rounded-2xl p-5 border border-gray-800/80 hover:border-emerald-500/50 flex items-start gap-3.5 shadow-lg shadow-black/20 hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Truck size={22} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                Giao hàng 2 Giờ
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Giao siêu tốc nội thành trong 120 phút, bao bọc cẩn thận chuẩn chống va đập.
              </p>
            </div>
          </div>

          <div className="group bg-[#121620]/90 hover:bg-[#161c2b] rounded-2xl p-5 border border-gray-800/80 hover:border-purple-500/50 flex items-start gap-3.5 shadow-lg shadow-black/20 hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <RotateCcw size={22} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                Đổi mới trong 30 ngày
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Lỗi do nhà sản xuất là đổi mới ngay 1-1, thủ tục tiếp nhận kiểm tra nhanh chóng.
              </p>
            </div>
          </div>

          <div className="group bg-[#121620]/90 hover:bg-[#161c2b] rounded-2xl p-5 border border-gray-800/80 hover:border-amber-500/50 flex items-start gap-3.5 shadow-lg shadow-black/20 hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles size={22} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                Trợ lý AI tư vấn 24/7
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Chatbot RAG thông minh giải đáp cấu hình máy và tư vấn sản phẩm tối ưu mọi lúc.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. ĐĂNG KÝ NHẬN BẢN TIN & VOUCHER 100K (Dark Cyber Luxury Newsletter) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-14 sm:mb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1220] via-[#101728] to-[#0a0f1a] border border-blue-500/25 p-8 sm:p-12 text-white shadow-2xl shadow-blue-950/40">
          {/* Ambient background glow orbs */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 right-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3 backdrop-blur-md">
              <Gift size={14} className="text-yellow-400" />
              <span>Ưu đãi thành viên mới</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2.5 text-white">
              Nhận Voucher <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500">100.000₫</span> cho đơn hàng đầu tiên
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6 max-w-lg mx-auto">
              Đăng ký để không bỏ lỡ đợt Flash Sale bí mật, mã giảm giá độc quyền và cập nhật công nghệ mới nhất từ NEXOR.
            </p>

            {newsletterSubscribed ? (
              <div className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm font-bold backdrop-blur-md animate-fade-in shadow-lg shadow-emerald-950/40">
                <CheckCircle2 size={18} className="text-emerald-300" />
                <span>Đăng ký thành công! Mã giảm giá <strong>NEXOR100K</strong> đã sẵn sàng cho bạn.</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail.trim()) {
                    setNewsletterSubscribed(true);
                  }
                }}
                className="flex flex-col sm:flex-row items-center gap-2.5 max-w-md mx-auto"
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email của bạn..."
                  className="w-full px-4.5 py-3.5 rounded-xl bg-[#171f33]/90 border border-gray-700/80 text-white text-xs sm:text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 font-medium shadow-inner transition-all"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto flex-shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 text-xs sm:text-sm font-black shadow-lg shadow-yellow-500/25 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  Nhận mã ngay
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
