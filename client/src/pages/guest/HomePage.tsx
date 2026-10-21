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
  ChevronLeft,
  ArrowRight,
  Zap,
  Truck,
  ShieldCheck,
  Tag,
  Star,
  Heart,
  ShoppingCart,
  BatteryCharging,
  Feather,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import type { Product } from '../../models/product.model';
import ProductCard from '../../components/common/Card/ProductCard';
import ProductCardSkeleton from '../../components/common/Card/ProductCardSkeleton';
import { useCartStore } from '../../store/useCartStore';
import { formatPrice } from '../../utils/format';

// 1. Category Sidebar Menu (10 items matching the reference image)
const SIDEBAR_CATEGORIES = [
  { name: 'Điện thoại', slug: 'dien-thoai', icon: Smartphone },
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

// 2. Hero Center Slides (Featured flagship devices)
const HERO_SLIDES = [
  {
    id: 1,
    tag: 'SẢN PHẨM BÁN CHẠY',
    title: 'MacBook Air M3',
    subtitle: 'Hiệu năng mạnh mẽ. Thiết kế mỏng nhẹ.',
    pills: [
      { icon: Cpu, label: 'Chip M3', sub: 'siêu mạnh mẽ' },
      { icon: BatteryCharging, label: 'Lên đến 18 giờ', sub: 'sử dụng' },
      { icon: Feather, label: 'Chỉ 1.24 kg', sub: 'siêu nhẹ' },
    ],
    buttonText: 'Mua ngay',
    link: '/products/4',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    tag: 'MỞ BÁN ĐẶC QUYỀN',
    title: 'iPhone 16 Pro Max',
    subtitle: 'Khung viền Titan sa mạc đẳng cấp. Camera 48MP.',
    pills: [
      { icon: Cpu, label: 'Chip A18 Pro', sub: 'dẫn đầu sức mạnh' },
      { icon: BatteryCharging, label: 'Pin trâu 33h', sub: 'xem video liên tục' },
      { icon: Feather, label: 'Titan Cấp 5', sub: 'bền bỉ vượt trội' },
    ],
    buttonText: 'Mua ngay',
    link: '/products/1',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=900&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    tag: 'SIÊU PHẨM AI',
    title: 'Galaxy S24 Ultra',
    subtitle: 'Quyền năng Galaxy AI. Zoom quang học 100x.',
    pills: [
      { icon: Cpu, label: 'Snapdragon 8 Gen 3', sub: 'tối ưu cho AI' },
      { icon: BatteryCharging, label: 'Pin 5000 mAh', sub: 'sạc nhanh 45W' },
      { icon: Feather, label: 'Bút S-Pen', sub: 'tích hợp sẵn' },
    ],
    buttonText: 'Mua ngay',
    link: '/products/2',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=900&auto=format&fit=crop&q=80',
  },
];

// 3. Quick 6 Categories below Hero
const QUICK_CATEGORIES = [
  { name: 'Laptop', desc: 'Hiệu năng vượt trội', icon: Laptop, slug: 'laptop' },
  { name: 'Điện thoại', desc: 'Đa dạng thương hiệu', icon: Smartphone, slug: 'dien-thoai' },
  { name: 'Máy tính bảng', desc: 'Linh hoạt, tiện lợi', icon: Tablet, slug: 'may-tinh-bang' },
  { name: 'Phụ kiện', desc: 'Chính hãng, chất lượng', icon: Headphones, slug: 'phu-kien' },
  { name: 'Gaming', desc: 'Trải nghiệm đỉnh cao', icon: Gamepad2, slug: 'gaming' },
  { name: 'Đồng hồ thông minh', desc: 'Theo dõi sức khỏe', icon: Watch, slug: 'dong-ho' },
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
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&auto=format&fit=crop&q=80',
    categoryId: 2,
    stock: 10,
    brand: 'ASUS',
    isFlashSale: true,
  },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>(DEFAULT_FLASH_SALE_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string | number, boolean>>({});

  const { addItem } = useCartStore();

  // Countdown timer: 01:23:45
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

  // Auto carousel slide every 6 seconds
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, []);

  // Fetch real data from backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await productService.getProducts({ limit: 8, sortBy: 'newest' });
        if (isMounted && res.data && res.data.length > 0) {
          setLatestProducts(res.data);
          // If backend has flash sale products, use them, otherwise keep the 4 reference products
          const fs = res.data.filter((p) => p.isFlashSale);
          if (fs.length >= 4) {
            setFlashSaleProducts(fs.slice(0, 4));
          }
        }
      } catch (err) {
        console.warn('Failed to load products from API, using fallback data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  const toggleWishlist = (id: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-[#f5f6fa] text-gray-800 font-sans pb-16">
      {/* 1. HERO 3-COLUMN SECTION */}
      <section className="max-w-[1360px] mx-auto px-4 pt-5 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* COLUMN 1: Category Sidebar (Left, 3 cols) */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-2 shadow-sm h-full flex flex-col justify-between">
              <div className="space-y-0.5">
                {SIDEBAR_CATEGORIES.map(({ name, slug, icon: Icon }) => (
                  <Link
                    key={slug}
                    to={`/products?category=${slug}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={17} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                      <span>{name}</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2: Main Banner (Center, 6 cols) */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#161920] via-[#1a1d26] to-[#252a36] text-white p-7 md:p-8 flex-1 flex flex-col justify-between min-h-[380px] shadow-sm">
              
              {/* Top Badge */}
              <div>
                <span className="inline-block bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider px-3 py-1 rounded-full text-gray-200 mb-3 border border-white/10">
                  {slide.tag}
                </span>

                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                  {slide.title}
                </h2>
                <p className="text-xs md:text-sm text-gray-300 max-w-sm mb-6">
                  {slide.subtitle}
                </p>

                {/* 3 Pills Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md mb-6">
                  {slide.pills.map((pill, i) => {
                    const PIcon = pill.icon;
                    return (
                      <div
                        key={i}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-2.5 flex items-center gap-2"
                      >
                        <PIcon size={18} className="text-blue-400 shrink-0" />
                        <div className="text-left leading-tight">
                          <div className="text-[11px] font-bold text-white">{pill.label}</div>
                          <div className="text-[10px] text-gray-400">{pill.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <Link
                  to={slide.link}
                  className="inline-flex items-center gap-2 bg-white text-gray-950 font-bold px-5 py-2.5 rounded-full text-xs hover:bg-gray-100 transition-transform active:scale-95 shadow-md"
                >
                  <span>{slide.buttonText}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Angled Laptop Product Image on the Right */}
              <div className="absolute -bottom-2 -right-6 w-[56%] md:w-[52%] pointer-events-none drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)]">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-auto object-contain transform -rotate-3 hover:rotate-0 transition-transform duration-500"
                />
              </div>

              {/* Slider Controls: Dots & Arrows */}
              <div className="flex items-center justify-between pt-4 mt-auto relative z-10">
                <div className="flex items-center gap-1.5">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlide === i ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
                    }
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Right 3 Promo Cards (Right, 3 cols) */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-3">
            
            {/* Promo Card 1: Ưu đãi hôm nay */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
                  <Tag size={13} className="text-blue-600" />
                  <span>Ưu đãi hôm nay</span>
                </div>
                <div className="text-xl font-black text-gray-900 leading-tight">
                  Giảm đến 50%
                </div>
                <p className="text-[11px] text-gray-500 mt-1 max-w-[140px]">
                  Cho các sản phẩm laptop, điện thoại
                </p>
                <Link
                  to="/products"
                  className="mt-3 inline-flex items-center gap-1.5 bg-[#161920] text-white text-[11px] font-bold px-3 py-1.5 rounded-full hover:bg-gray-800 transition-colors"
                >
                  <span>Xem ngay</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
              <div className="absolute right-2 bottom-2 w-24 h-24 pointer-events-none">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80"
                  alt="Ưu đãi headphone"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>
            </div>

            {/* Promo Card 2: Miễn phí vận chuyển */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-0.5">
                  <Truck size={13} className="text-blue-600" />
                  <span>Miễn phí vận chuyển</span>
                </div>
                <div className="text-base font-black text-gray-900">
                  Đơn từ 500.000đ
                </div>
                <p className="text-[11px] text-gray-500">Áp dụng toàn quốc</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-center text-blue-600">
                <Truck size={24} />
              </div>
            </div>

            {/* Promo Card 3: Bảo hành chính hãng */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-0.5">
                  <ShieldCheck size={13} className="text-blue-600" />
                  <span>Bảo hành chính hãng</span>
                </div>
                <div className="text-base font-black text-gray-900">
                  12 - 24 tháng
                </div>
                <p className="text-[11px] text-gray-500">Tùy sản phẩm</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-center text-blue-600">
                <ShieldCheck size={26} />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. QUICK CATEGORIES BAR (6 Items) */}
      <section className="max-w-[1360px] mx-auto px-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_CATEGORIES.map(({ name, desc, icon: Icon, slug }) => (
            <Link
              key={name}
              to={`/products?category=${slug}`}
              className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-blue-50 text-gray-700 group-hover:text-blue-600 flex items-center justify-center transition-colors mb-2.5">
                <Icon size={24} strokeWidth={1.75} />
              </div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {name}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FLASH SALE + RIGHT VERTICAL BANNER */}
      <section className="max-w-[1360px] mx-auto px-4 mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Flash Sale Block (Left, 9 cols) */}
          <div className="lg:col-span-9 bg-[#1b1e26] rounded-2xl p-4 sm:p-5 shadow-sm text-white flex flex-col justify-between">
            {/* Flash Sale Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <Zap size={22} className="fill-amber-400" />
                </div>
                <div>
                  <div className="text-lg font-black tracking-wider text-white">FLASH SALE</div>
                  <div className="text-[11px] text-gray-400">Sản phẩm hot - Giá cực tốt</div>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="text-center">
                    <div className="bg-[#2a2e39] text-white font-mono font-bold text-sm px-2.5 py-1 rounded-md border border-gray-700">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <span className="text-[9px] text-gray-400 uppercase font-semibold">Giờ</span>
                  </div>
                  <span className="text-white font-bold text-sm -mt-3">:</span>
                  <div className="text-center">
                    <div className="bg-[#2a2e39] text-white font-mono font-bold text-sm px-2.5 py-1 rounded-md border border-gray-700">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <span className="text-[9px] text-gray-400 uppercase font-semibold">Phút</span>
                  </div>
                  <span className="text-white font-bold text-sm -mt-3">:</span>
                  <div className="text-center">
                    <div className="bg-[#2a2e39] text-white font-mono font-bold text-sm px-2.5 py-1 rounded-md border border-gray-700">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <span className="text-[9px] text-gray-400 uppercase font-semibold">Giây</span>
                  </div>
                </div>

                <Link
                  to="/products"
                  className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1 ml-4 group"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* 4 Flash Sale Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-4">
              {flashSaleProducts.slice(0, 4).map((p) => {
                const discount = p.discountPercent || 15;
                const isLiked = likedMap[p.id];
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-3.5 flex flex-col justify-between text-gray-800 shadow-sm hover:shadow-md transition-shadow relative group"
                  >
                    {/* Top Row: Discount Pill & Wishlist */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-[#1b1e26] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                        -{discount}%
                      </span>
                      <button
                        onClick={(e) => toggleWishlist(p.id, e)}
                        className={`p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer ${
                          isLiked ? 'text-red-500' : ''
                        }`}
                        aria-label="Yêu thích"
                      >
                        <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* Product Image */}
                    <Link
                      to={`/products/${p.id}`}
                      className="w-full aspect-[4/3] flex items-center justify-center p-2 mb-2 overflow-hidden"
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
                      className="text-xs font-bold text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors mb-1.5"
                      title={p.name}
                    >
                      {p.name}
                    </Link>

                    {/* Rating */}
                    <div className="flex items-center gap-1 text-[11px] text-amber-500 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </div>
                      <span className="text-gray-400 font-normal">({p.reviewCount || 120})</span>
                    </div>

                    {/* Price Row */}
                    <div className="flex items-baseline gap-2 mb-3">
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
          <div className="lg:col-span-3 bg-gradient-to-br from-[#13151b] via-[#1a1d26] to-[#111318] rounded-2xl p-6 text-white flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <h3 className="text-2xl font-black tracking-tight leading-tight mb-2">
                Công nghệ<br />dẫn lối tương lai
              </h3>
              <p className="text-xs text-gray-400 max-w-[200px] mb-5">
                Laptop - Điện thoại - Phụ kiện chính hãng
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 bg-white text-gray-950 text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-100 transition-transform active:scale-95 shadow-md"
              >
                <span>Khám phá ngay</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Showcase Tech Devices Graphic */}
            <div className="mt-6 -mb-4 -mr-4 flex justify-end">
              <img
                src="https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80"
                alt="Tech Ecosystem"
                className="w-full h-48 object-cover rounded-tl-2xl shadow-2xl opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

        </div>
      </section>

      {/* 4. SẢN PHẨM MỚI NHẤT (Latest Products from Backend) */}
      <section className="max-w-[1360px] mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-600" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
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
