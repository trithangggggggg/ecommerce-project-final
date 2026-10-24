import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
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
  Layers,
  Sparkles,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import type { Product, ProductVariant } from '../../models/product.model';
import { useCartStore } from '../../store/useCartStore';
import ProductCard from '../../components/common/Card/ProductCard';
import { formatPrice } from '../../utils/format';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [liked, setLiked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic selected options map: e.g. { "Dung lượng": "256GB", "Màu sắc": "Titan Trắng" }
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const data = await productService.getProductById(id!);
        setProduct(data);
        setSelectedImage(data.imageUrl);

        // Initialize selected options with the first value of each option
        if (data.options && data.options.length > 0) {
          const initialOpts: Record<string, string> = {};
          data.options.forEach((opt) => {
            if (opt.values && opt.values.length > 0) {
              initialOpts[opt.name] = opt.values[0].value;
            }
          });
          setSelectedOptions(initialOpts);
        } else {
          setSelectedOptions({});
        }

        if (data.categoryId) {
          productService
            .getRelatedProducts(data.categoryId, data.id, 4)
            .then(setRelatedProducts)
            .catch(() => {});
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải thông tin sản phẩm.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Match current combination with backend variants
  const matchedVariant: ProductVariant | null = useMemo(() => {
    if (!product || !product.variants || product.variants.length === 0) {
      return null;
    }

    // If product has no options, return the first/default variant
    if (!product.options || product.options.length === 0) {
      return product.variants[0];
    }

    // Match all selected options
    const found = product.variants.find((variant) => {
      if (!variant.optionValues) return false;
      return Object.entries(selectedOptions).every(([optName, optVal]) => {
        const varVal = variant.optionValues?.[optName];
        return varVal && varVal.trim().toLowerCase() === optVal.trim().toLowerCase();
      });
    });

    return found || null;
  }, [product, selectedOptions]);

  // When variant changes and has image, update preview
  useEffect(() => {
    if (matchedVariant?.imageUrl) {
      setSelectedImage(matchedVariant.imageUrl);
    }
  }, [matchedVariant]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Current display values derived from matched variant or product fallback
  const currentPrice = matchedVariant ? matchedVariant.price : (product?.minPrice ?? product?.price ?? 0);
  const currentOriginalPrice = matchedVariant
    ? matchedVariant.originalPrice
    : (product?.originalPrice ?? undefined);
  const currentStock = matchedVariant
    ? (matchedVariant.stock ?? 0)
    : (product?.stock ?? 0);
  const isOutOfStock = !matchedVariant || currentStock <= 0 || matchedVariant.status === false;

  const currentDiscount = matchedVariant?.discountPercent ?? (
    currentOriginalPrice && currentOriginalPrice > currentPrice
      ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
      : (product?.discountPercent ?? 0)
  );

  function handleBuyNow() {
    if (!product || isOutOfStock) return;
    addItem(product, matchedVariant || undefined, 1);
    navigate('/cart');
  }

  function handleAddToCart() {
    if (!product || isOutOfStock) return;
    addItem(product, matchedVariant || undefined, 1);
    const variantLabel = matchedVariant?.title ? ` - ${matchedVariant.title}` : '';
    triggerToast(`Đã thêm "${product.name}${variantLabel}" vào giỏ hàng thành công!`);
  }

  // Handle option value selection
  function handleSelectOption(optionName: string, value: string) {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  }

  // Group specs by groupName
  const groupedSpecs = useMemo(() => {
    if (!product?.specs || product.specs.length === 0) return null;
    const groups: Record<string, { key: string; value: string }[]> = {};
    for (const spec of product.specs) {
      const gName = spec.groupName?.trim() || 'Thông số chung';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push({ key: spec.specKey, value: spec.specValue });
    }
    return groups;
  }, [product]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 font-sans">
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center font-sans">
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

  // Collect all gallery images
  const allImages = Array.from(
    new Set([
      product.imageUrl,
      ...(product.galleryImages?.map((i) => i.url) || []),
      ...(product.variants?.map((v) => v.imageUrl).filter(Boolean) as string[] || []),
      ...(product.images?.map((img: any) => typeof img === 'string' ? img : img?.url) || []),
    ].filter(Boolean))
  );

  return (
    <div className="pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce border border-gray-700">
          <Check size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 text-xs text-gray-500 flex items-center gap-2">
          <Link to="/" className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight size={14} />
          <Link to="/products" className="hover:text-blue-600 transition">
            Sản phẩm
          </Link>
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
                {currentDiscount > 0 && (
                  <span className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-xs">
                    -{currentDiscount}%
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setLiked(!liked)}
                  className={`absolute top-0 right-0 w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
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
              {allImages.length > 1 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {allImages.slice(0, 5).map((img, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-14 h-14 rounded-lg border-2 p-1 overflow-hidden transition-all cursor-pointer ${
                        selectedImage === img
                          ? 'border-blue-600 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

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

            {/* Product Meta / Stock status - NO mock reviews */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
              {product.brand && (
                <>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {product.brand}
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="font-bold text-slate-800">Chính hãng 100%</span>
              <span>•</span>
              <span className="text-slate-500">Danh mục: {product.category?.name || 'Công nghệ'}</span>
              <span>•</span>
              {matchedVariant && (
                <span className="font-mono text-slate-400">SKU: {matchedVariant.sku}</span>
              )}
              <span className="ml-auto">
                {!isOutOfStock ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Check size={14} /> Còn hàng ({currentStock} sản phẩm)
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle size={14} /> Tạm hết hàng
                  </span>
                )}
              </span>
            </div>

            {/* Price section */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-black text-red-600">
                  {formatPrice(currentPrice)}
                </span>
                {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                  <span className="text-base text-gray-400 line-through">
                    {formatPrice(currentOriginalPrice)}
                  </span>
                )}
                {currentDiscount > 0 && currentOriginalPrice && (
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                    Tiết kiệm {formatPrice(currentOriginalPrice - currentPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Options Rendering (Storage, Color, etc.) */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-4 mb-6">
                {product.options.map((opt) => {
                  const currentSelectedVal = selectedOptions[opt.name];

                  return (
                    <div key={opt.id || opt.name}>
                      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>{opt.name}:</span>
                        <span className="text-blue-600 font-extrabold normal-case text-xs">
                          {currentSelectedVal || 'Vui lòng chọn'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {opt.values.map((v) => {
                          const isSelected = currentSelectedVal === v.value;

                          return (
                            <button
                              type="button"
                              key={v.id || v.value}
                              onClick={() => handleSelectOption(opt.name, v.value)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-xs ring-1 ring-blue-600/20'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {v.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Special Promo Box */}
            <div className="border border-blue-200 rounded-xl overflow-hidden mb-6 bg-blue-50/50">
              <div className="bg-blue-600 text-white px-3.5 py-2 text-xs font-bold flex items-center gap-2">
                <Gift size={16} /> ƯU ĐÃI ĐẶC QUYỀN NEXOR
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
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg text-center cursor-pointer"
              >
                <div className="text-sm">
                  {!isOutOfStock ? 'MUA NGAY' : 'TẠM HẾT HÀNG'}
                </div>
                <div className="text-[11px] font-normal opacity-90">
                  {!isOutOfStock ? 'Giao hàng tận nơi miễn phí' : 'Liên hệ đặt trước'}
                </div>
              </button>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 py-3.5 px-6 bg-[#16191f] hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart size={18} />
                <div className="text-left">
                  <div className="text-sm">
                    {!isOutOfStock ? 'THÊM VÀO GIỎ' : 'HẾT HÀNG'}
                  </div>
                  <div className="text-[11px] font-normal opacity-90">Lưu sản phẩm chờ thanh toán</div>
                </div>
              </button>
            </div>

            {/* Store availability */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600 shrink-0" />
                <span>Có sẵn tại <strong>48 showroom</strong> NEXOR trên toàn quốc</span>
              </div>
              <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                Tìm chi nhánh gần nhất
              </span>
            </div>
          </div>
        </div>

        {/* Specifications & Description */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          {/* Description */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Mô tả & Đặc điểm nổi bật</span>
            </h2>
            <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line font-mono">
              {product.description ||
                'Sản phẩm công nghệ chính hãng cao cấp từ NEXOR. Thiết kế tinh xảo, hiệu năng vượt trội và chế độ bảo hành uy tín.'}
            </div>
          </div>

          {/* Specifications from product.specs */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Thông số kỹ thuật</span>
            </h2>

            {groupedSpecs ? (
              <div className="space-y-4 text-xs">
                {Object.entries(groupedSpecs).map(([groupTitle, specItems]) => (
                  <div key={groupTitle} className="space-y-1.5">
                    <span className="font-extrabold text-blue-700 uppercase tracking-wider text-[11px] block bg-blue-50/60 px-2.5 py-1 rounded-md">
                      {groupTitle}
                    </span>
                    <div className="divide-y divide-gray-100 pl-1">
                      {specItems.map((s, idx) => (
                        <div key={idx} className="py-2 flex justify-between gap-4">
                          <span className="font-semibold text-gray-500">{s.key}</span>
                          <span className="text-gray-900 font-medium text-right">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : product.specifications ? (
              <div className="divide-y divide-gray-100 text-xs">
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="py-2.5 flex justify-between gap-4">
                    <span className="font-semibold text-gray-500">{k}</span>
                    <span className="text-gray-900 text-right">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 py-4 text-center">
                Thông số kỹ thuật đang được cập nhật...
              </div>
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
