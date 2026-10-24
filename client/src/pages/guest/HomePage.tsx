import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import type { Product } from '../../models/product.model';
import ProductCard from '../../components/common/Card/ProductCard';
import ProductCardSkeleton from '../../components/common/Card/ProductCardSkeleton';
import { useCartStore } from '../../store/useCartStore';
import { formatPrice } from '../../utils/format';
import HeroBannerSlider from '../../components/home/HeroBannerSlider';

// 1. Category Sidebar Menu (10 items matching the reference image)
const SIDEBAR_CATEGORIES = [
  { name: 'Điện thoại', slug: 'dien-thoai', icon: Smartphone, active: true },
  { name: 'Laptop', slug: 'laptop', icon: Laptop },
  { name: 'Máy tính bảng', slug: 'may-tinh-bang', icon: Tablet },
  { name: 'Phụ kiện', slug: 'phu-kien', icon: Headphones },
  { name: 'Đồng hồ thông minh', slug: 'dong-ho', icon: Watch },
  { name: 'Thiết bị âm thanh', slug: 'am-thanh', icon: Tv },
  { name: 'Máy tính & linh kiện', slug: 'linh-kien', icon: Cpu },
  { name: 'Điện gia dụng', slug: 'gia-dung', icon: Home },
  { name: 'Gaming', slug: 'gaming', icon: Gamepad2 },
  { name: 'Khác', slug: 'khac', icon: LayoutGrid },
];

// 3. Quick 6 Categories below Hero (Minimalist line icons without box background)
const QUICK_CATEGORIES = [
  { name: 'Điện thoại', desc: 'Đa dạng thương hiệu', icon: Smartphone, slug: 'dien-thoai' },
  { name: 'Laptop', desc: 'Hiệu năng vượt trội', icon: Laptop, slug: 'laptop' },
  { name: 'Máy tính bảng', desc: 'Linh hoạt, tiện lợi', icon: Tablet, slug: 'may-tinh-bang' },
  { name: 'Tai nghe', desc: 'Âm thanh sống động', icon: Headphones, slug: 'tai-nghe' },
  { name: 'Đồng hồ thông minh', desc: 'Theo dõi sức khỏe', icon: Watch, slug: 'dong-ho-thong-minh' },
  { name: 'Phụ kiện', desc: 'Chính hãng, bền bỉ', icon: Cpu, slug: 'phu-kien-cong-nghe' },
];

// 4. Fallback Flash Sale products (matching the 4 cards in the image)
const DEFAULT_FLASH_SALE_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'iPhone 16 Pro Max 256GB',
    slug: 'iphone-16-pro-max-256gb',
    description: 'iPhone 16 Pro Max với khung viền titan sa mạc, chip A18 Pro mạnh mẽ.',
    price: 27990000,
    originalPrice: 32990000,
    discountPercent: 15,
    rating: 4.9,
    reviewCount: 120,
    imageUrl: '/images/iphone-16-pro-max.jpg',
    categoryId: 1,
    stock: 25,
    brand: 'Apple',
    isFlashSale: true,
  },
  {
    id: 4,
    name: 'MacBook Air M3 13" 256GB',
    slug: 'macbook-air-m3-13-256gb',
    description: 'MacBook Air M3 siêu mỏng nhẹ, pin 18 giờ, chip M3 đỉnh cao.',
    price: 21590000,
    originalPrice: 26990000,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 98,
    imageUrl: '/images/macbook-air-m3-card.jpg',
    categoryId: 2,
    stock: 15,
    brand: 'Apple',
    isFlashSale: true,
  },
  {
    id: 2,
    name: 'Samsung Galaxy S24 Ultra 256GB',
    slug: 'samsung-galaxy-s24-ultra-256gb',
    description: 'Galaxy S24 Ultra tích hợp bút S-Pen, camera 200MP và Galaxy AI.',
    price: 25390000,
    originalPrice: 26990000,
    discountPercent: 18,
    rating: 4.8,
    reviewCount: 76,
    imageUrl: '/images/samsung-s24-ultra.jpg',
    categoryId: 1,
    stock: 18,
    brand: 'Samsung',
    isFlashSale: true,
  },
  {
    id: 5,
    name: 'ASUS ROG Strix G16',
    slug: 'asus-rog-strix-g16',
    description: 'Laptop gaming đỉnh cao vi xử lý Intel Gen 14, RTX 40 series.',
    price: 30790000,
    originalPrice: 34990000,
    discountPercent: 12,
    rating: 4.8,
    reviewCount: 54,
    imageUrl: '/images/asus-rog-strix.jpg',
    categoryId: 2,
    stock: 10,
    brand: 'ASUS',
    isFlashSale: true,
  },
];

export default function HomePage() {
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [flashSaleProducts] = useState<Product[]>(DEFAULT_FLASH_SALE_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string | number, boolean>>({});

  const { addItem } = useCartStore();

  // Countdown timer: 01:23:45 matching reference
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 23, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real data from backend for latest products
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await productService.getProducts({ limit: 10, sortBy: 'newest' });
        if (isMounted && res.data && res.data.length > 0) {
          setLatestProducts(res.data);
        }
      } catch {
        // Fallback to static initial state if API fails
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleWishlist = (id: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-[#f2f4f7] text-gray-800 font-sans pb-16">
      {/* 1. HERO 3-COLUMN SECTION (Sidebar trái và phải thu gọn, Banner trung tâm mở rộng tối đa) */}
      <section className="max-w-[1360px] mx-auto px-4 pt-4 pb-5">
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_260px] gap-3.5 items-stretch">
          
          {/* COLUMN 1: Category Sidebar (Left: Thu gọn 210px) */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl border border-gray-200/70 p-2 shadow-sm h-full flex flex-col justify-between">
              <div className="space-y-0.5">
                {SIDEBAR_CATEGORIES.map(({ name, slug, icon: Icon, active }) => (
                  <Link
                    key={slug}
                    to={`/products?category=${slug}`}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors group ${
                      active
                        ? 'bg-[#edf2f7] text-gray-900'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        size={15}
                        className={active ? 'text-gray-900' : 'text-gray-400 group-hover:text-blue-600 transition-colors'}
                      />
                      <span>{name}</span>
                    </div>
                    <ChevronRight
                      size={13}
                      className={active ? 'text-gray-700' : 'text-gray-300 group-hover:text-blue-600 transition-colors'}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2: Main Hero Banner Slider (Center: Mở rộng tối đa 1fr) */}
          <HeroBannerSlider />

          {/* COLUMN 3: Right 3 Promo Cards (Right: Thu gọn 260px) */}
          <div className="flex flex-col justify-between gap-3 shrink-0">
            {/* Promo Banner 1: Ưu đãi hôm nay */}
            <Link
              to="/products"
              className="block relative rounded-2xl overflow-hidden shadow-sm group border border-gray-200/70 hover:shadow-md transition-all shrink-0 bg-white"
              title="Ưu đãi hôm nay - Giảm đến 50%"
            >
              <img
                src="/images/promo-discount-50.jpg"
                alt="Ưu đãi hôm nay - Giảm đến 50%"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </Link>

            {/* Promo Banner 2: Miễn phí vận chuyển */}
            <Link
              to="/products"
              className="block relative rounded-2xl overflow-hidden shadow-sm group border border-gray-200/70 hover:shadow-md transition-all shrink-0 bg-white"
              title="Miễn phí vận chuyển - Đơn từ 500.000đ"
            >
              <img
                src="/images/promo-free-shipping.jpg"
                alt="Miễn phí vận chuyển - Đơn từ 500.000đ"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </Link>

            {/* Promo Banner 3: Bảo hành chính hãng */}
            <Link
              to="/products"
              className="block relative rounded-2xl overflow-hidden shadow-sm group border border-gray-200/70 hover:shadow-md transition-all shrink-0 bg-white"
              title="Bảo hành chính hãng - 12 đến 24 tháng"
            >
              <img
                src="/images/promo-warranty.jpg"
                alt="Bảo hành chính hãng - 12 đến 24 tháng"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. QUICK CATEGORIES BAR (6 Items - Minimalist line icons without box background) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {QUICK_CATEGORIES.map(({ name, desc, icon: Icon, slug }) => (
            <Link
              key={name}
              to={`/products?category=${slug}`}
              className="bg-white rounded-2xl border border-gray-200/70 py-4 px-3 shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center group"
            >
              <div className="text-gray-700 group-hover:text-blue-600 transition-colors mb-2">
                <Icon size={28} strokeWidth={1.5} />
              </div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {name}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-normal">{desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FLASH SALE + RIGHT VERTICAL TECH BANNER */}
      <section className="max-w-[1360px] mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Flash Sale Block (Left, 9 cols) */}
          <div className="lg:col-span-9 bg-[#1b1e26] rounded-2xl p-4 sm:p-5 shadow-sm text-white flex flex-col justify-between">
            {/* Flash Sale Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="text-white">
                  <Zap size={24} className="fill-white text-white" />
                </div>
                <div>
                  <div className="text-lg font-black tracking-wider text-white">FLASH SALE</div>
                  <div className="text-[11px] text-gray-400">Sản phẩm hot - Giá cực tốt</div>
                </div>
              </div>

              {/* Countdown Timer: [ 01 ] : [ 23 ] : [ 45 ] */}
              <div className="flex items-center gap-4">
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

                <Link
                  to="/products"
                  className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1 ml-2 group"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* 4 Flash Sale Product Cards Grid matching Image 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-3.5">
              {flashSaleProducts.slice(0, 4).map((p) => {
                const discount = p.discountPercent || 15;
                const isLiked = likedMap[p.id];
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-3 flex flex-col justify-between text-gray-800 shadow-sm hover:shadow-md transition-shadow relative group"
                  >
                    {/* Top Row: Discount Pill & Wishlist */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="bg-[#1b1e26] text-white text-[11px] font-bold px-2 py-0.5 rounded">
                        -{discount}%
                      </span>
                      <button
                        onClick={(e) => toggleWishlist(p.id, e)}
                        className={`p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer ${
                          isLiked ? 'text-red-500' : ''
                        }`}
                        aria-label="Yêu thích"
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* Product Image */}
                    <Link
                      to={`/products/${p.id}`}
                      className="w-full aspect-[4/3] flex items-center justify-center p-1.5 mb-2 overflow-hidden"
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80';
                        }}
                      />
                    </Link>

                    {/* Name */}
                    <Link
                      to={`/products/${p.id}`}
                      className="text-xs font-bold text-gray-900 truncate hover:text-blue-600 transition-colors mb-1 block"
                      title={p.name}
                    >
                      {p.name}
                    </Link>

                    {/* Brand / Category Meta */}
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                      {p.brand && (
                        <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                          {p.brand}
                        </span>
                      )}
                      <span className="text-gray-400 truncate">{p.category?.name || 'Công nghệ'}</span>
                    </div>

                    {/* Price Row */}
                    <div className="flex items-baseline gap-2 mb-2.5">
                      {p.originalPrice && (
                        <span className="text-[11px] text-gray-400 line-through">
                          {formatPrice(p.originalPrice)}
                        </span>
                      )}
                      <span className="text-sm font-black text-gray-950">
                        {formatPrice(p.price)}
                      </span>
                    </div>

                    {/* Cart CTA Button */}
                    <button
                      onClick={() => addItem(p, 1)}
                      className="w-full py-2 bg-[#232733] hover:bg-[#161920] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShoppingCart size={13} />
                      <span>Thêm vào giỏ</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Vertical Tech Banner (Right, 3 cols) */}
          <div className="lg:col-span-3 flex flex-col">
            <Link
              to="/products"
              className="block relative rounded-2xl overflow-hidden shadow-sm group h-full bg-[#12141a] hover:shadow-md transition-all"
              title="Công nghệ dẫn lối tương lai - Khám phá ngay"
            >
              <img
                src="/images/tech-future-banner.jpg"
                alt="Công nghệ dẫn lối tương lai - Laptop, Điện thoại, Phụ kiện chính hãng"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </Link>
          </div>

        </div>
      </section>

      {/* 4. SẢN PHẨM MỚI NHẤT (Latest Products from Backend) */}
      <section className="max-w-[1360px] mx-auto px-4">
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {(latestProducts.length > 0 ? latestProducts : DEFAULT_FLASH_SALE_PRODUCTS)
              .slice(0, 10)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
