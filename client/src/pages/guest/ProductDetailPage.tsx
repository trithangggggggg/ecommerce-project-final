import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Package,
  Truck,
  Shield,
  RefreshCw,
  Check,
  Heart,
  ChevronRight,
  MapPin,
  Gift,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import type { Product } from '../../models/product.model';
import { useCartStore } from '../../store/useCartStore';
import ProductCard from '../../components/common/Card/ProductCard';
import { formatPrice } from '../../utils/format';

const MEMORY_OPTIONS = ['128GB', '256GB', '512GB', '1TB'];
const COLOR_OPTIONS = [
  { name: 'Titan Tự Nhiên', hex: '#9e9689' },
  { name: 'Titan Sa Mạc', hex: '#c5a782' },
  { name: 'Titan Trắng', hex: '#f0f0ee' },
  { name: 'Titan Đen', hex: '#373639' },
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedMemory, setSelectedMemory] = useState('256GB');
  const [selectedColor, setSelectedColor] = useState('Titan Tự Nhiên');
  const [liked, setLiked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const data = await productService.getProductById(id!);
        setProduct(data);
        setSelectedImage(data.imageUrl);

        if (data.categoryId) {
          productService
            .getRelatedProducts(data.categoryId, data.id, 4)
            .then(setRelatedProducts)
            .catch(() => {});
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải sản phẩm.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function handleBuyNow() {
    if (!product) return;
    addItem(product, 1);
    navigate('/cart');
  }

  function handleAddToCart() {
    if (!product) return;
    addItem(product, 1);
    triggerToast(`Đã thêm "${product.name}" vào giỏ hàng thành công!`);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-200 animate-pulse rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-8 w-4/5 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-10 w-1/2 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-32 w-full bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-12 w-full bg-gray-200 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error ?? 'Không tìm thấy sản phẩm'}</h2>
        <Link
          to="/products"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-4"
        >
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  const discount = product.discountPercent ?? (
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0
  );

  return (
    <div className="pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check size={18} className="text-green-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 text-xs text-gray-500 flex items-center gap-2">
          <Link to="/" className="hover:text-blue-600">Trang chủ</Link>
          <ChevronRight size={14} />
          <Link to="/products" className="hover:text-blue-600">Sản phẩm</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image Showcase */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center">
              <div className="relative w-full aspect-square flex items-center justify-center mb-4">
                <img
                  src={selectedImage || product.imageUrl}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80';
                  }}
                />
                {discount > 0 && (
                  <span className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                    -{discount}%
                  </span>
                )}
                <button
                  onClick={() => setLiked(!liked)}
                  className={`absolute top-0 right-0 w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                    liked
                      ? 'bg-red-50 text-red-500 border-red-200'
                      : 'bg-white text-gray-400 border-gray-200 hover:text-red-500'
                  }`}
                  aria-label="Yêu thích"
                >
                  <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 justify-center">
                {[product.imageUrl, ...(product.images || [])].slice(0, 4).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-14 h-14 rounded-lg border-2 p-1 overflow-hidden transition-all ${
                      selectedImage === img ? 'border-blue-600 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>

              {/* Guarantee badges */}
              <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-6 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-600 shrink-0" />
                  <span>Bảo hành chính hãng 12-24 tháng</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-blue-600 shrink-0" />
                  <span>1 đổi 1 trong 30 ngày</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-blue-600 shrink-0" />
                  <span>Miễn phí giao hàng toàn quốc</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-blue-600 shrink-0" />
                  <span>Nguyên seal, đầy đủ phụ kiện</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="lg:col-span-7 flex flex-col">
            <h1 className="text-2xl font-black text-gray-900 mb-2 leading-snug">
              {product.name}
            </h1>

            {/* Rating and Reviews */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={15} fill="currentColor" />
                <span className="font-bold text-gray-900">{product.rating || '4.9'}</span>
              </div>
              <span>·</span>
              <span>{product.reviewCount || 120} đánh giá</span>
              <span>·</span>
              <span className="text-green-600 font-semibold flex items-center gap-1">
                <Check size={14} /> Còn hàng ({product.stock ?? 15} sản phẩm)
              </span>
            </div>

            {/* Price section */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-red-600">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-base text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                    Tiết kiệm {formatPrice(product.originalPrice! - product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Memory options */}
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Dung lượng: {selectedMemory}
              </div>
              <div className="flex flex-wrap gap-2">
                {MEMORY_OPTIONS.map((mem) => (
                  <button
                    key={mem}
                    onClick={() => setSelectedMemory(mem)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedMemory === mem
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {mem}
                  </button>
                ))}
              </div>
            </div>

            {/* Color options */}
            <div className="mb-6">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Màu sắc: {selectedColor}
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => setSelectedColor(col.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all ${
                      selectedColor === col.name
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-300"
                      style={{ backgroundColor: col.hex }}
                    />
                    {col.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Promo Box */}
            <div className="border border-blue-200 rounded-xl overflow-hidden mb-6 bg-blue-50/50">
              <div className="bg-blue-600 text-white px-3.5 py-2 text-xs font-bold flex items-center gap-2">
                <Gift size={16} /> ƯU ĐÃI ĐẶC QUYỀN E-SHOPTECH
              </div>
              <div className="p-3.5 space-y-2 text-xs text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">•</span>
                  <span><strong>Giảm thêm 500.000₫</strong> khi thanh toán qua ví VNPAY hoặc QR Ngân Hàng.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">•</span>
                  <span><strong>Thu cũ đổi mới:</strong> Trợ giá lên tới 2.000.000₫ khi lên đời máy mới.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">•</span>
                  <span><strong>Tặng gói bảo hành VIP:</strong> 12 tháng 1 đổi 1 tận nơi.</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={handleBuyNow}
                className="flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg text-center"
              >
                <div className="text-sm">MUA NGAY</div>
                <div className="text-[11px] font-normal opacity-90">Giao hàng tận nơi miễn phí</div>
              </button>

              <button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 px-6 bg-[#16191f] hover:bg-gray-800 text-white font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg text-center flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                <div className="text-left">
                  <div className="text-sm">THÊM VÀO GIỎ</div>
                  <div className="text-[11px] font-normal opacity-90">Lưu sản phẩm chờ thanh toán</div>
                </div>
              </button>
            </div>

            {/* Store availability */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600 shrink-0" />
                <span>Có sẵn tại <strong>48 showroom</strong> E-ShopTECH trên toàn quốc</span>
              </div>
              <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                Tìm chi nhánh gần nhất
              </span>
            </div>
          </div>
        </div>

        {/* Specifications & Description */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-black text-gray-900 mb-4 uppercase">
              Mô tả & Đặc điểm nổi bật
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {product.description ||
                'Sản phẩm công nghệ tiên tiến với hiệu năng đỉnh cao, thiết kế sang trọng, thời lượng pin ấn tượng và đáp ứng mọi nhu cầu làm việc, học tập và giải trí cao cấp.'}
            </p>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-black text-gray-900 mb-4 uppercase">
              Thông số kỹ thuật
            </h2>
            {product.specifications ? (
              <div className="divide-y divide-gray-100 text-xs">
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="py-2.5 flex justify-between gap-4">
                    <span className="font-semibold text-gray-500">{k}</span>
                    <span className="text-gray-900 text-right">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">Đang cập nhật thông số...</div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-black text-gray-900 mb-4 uppercase">
              Sản phẩm tương tự bạn có thể thích
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
