import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { ROUTES } from '../../constants/routes';
import { formatPrice } from '../../utils/format';
import Button from '../../components/common/Button/Button';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } =
    useCartStore();

  const handleClearCart = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng?')) {
      clearCart();
    }
  };

  const handleCheckoutRedirect = () => {
    navigate(ROUTES.CHECKOUT);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#f5f6fa] py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn đang trống</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Bạn chưa chọn sản phẩm công nghệ nào. Hãy khám phá hàng ngàn siêu phẩm điện thoại, laptop, phụ kiện chính hãng tại NEXOR nhé!
          </p>
          <div className="space-y-3">
            <Button
              variant="dark"
              size="md"
              fullWidth
              onClick={() => navigate(ROUTES.PRODUCTS)}
              leftIcon={<Sparkles className="w-4 h-4 text-amber-400" />}
            >
              Khám phá sản phẩm ngay
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => navigate(ROUTES.HOME)}
            >
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1360px] mx-auto space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link to={ROUTES.HOME} className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">Giỏ hàng ({totalItems})</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <span>Giỏ hàng của bạn</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {totalItems} sản phẩm
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Kiểm tra lại danh sách sản phẩm và số lượng trước khi đặt hàng
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearCart}
            className="text-xs text-red-600 hover:text-red-700 hover:underline flex items-center gap-1.5 self-start sm:self-auto cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>
        </div>

        {/* Cart Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Products List (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const product = item.product;
                  const itemTotal = (product.price || 0) * item.quantity;
                  const maxStock = product.stock !== undefined && product.stock > 0 ? product.stock : 999;
                  const isMaxStock = item.quantity >= maxStock;

                  return (
                    <div
                      key={product.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition"
                    >
                      {/* Product Thumbnail & Basic Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <Link
                          to={`/products/${product.id}`}
                          className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 p-2 shrink-0 flex items-center justify-center overflow-hidden hover:opacity-90 transition"
                        >
                          <img
                            src={
                              product.imageUrl ||
                              'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200'
                            }
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200';
                            }}
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/products/${product.id}`}
                            className="text-sm font-bold text-gray-900 hover:text-blue-600 transition line-clamp-2 leading-snug"
                          >
                            {product.name}
                          </Link>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                            {product.category?.name && (
                              <span className="font-medium text-gray-600">
                                {product.category.name}
                              </span>
                            )}
                            {product.brand && (
                              <>
                                <span>•</span>
                                <span>{product.brand}</span>
                              </>
                            )}
                          </div>

                          {/* Unit Price */}
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xs font-bold text-gray-900">
                              {formatPrice(product.price)}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-[11px] text-gray-400 line-through">
                                {formatPrice(product.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Modifier & Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black transition cursor-pointer disabled:opacity-40"
                            disabled={item.quantity <= 1}
                            title="Giảm số lượng"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={maxStock}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                updateQuantity(product.id, Math.max(1, Math.min(val, maxStock)));
                              }
                            }}
                            className="w-12 h-8 text-center text-xs font-bold text-gray-900 border-x border-gray-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black transition cursor-pointer disabled:opacity-40"
                            disabled={isMaxStock}
                            title={isMaxStock ? 'Đã đạt giới hạn tồn kho' : 'Tăng số lượng'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Item Total Price */}
                        <div className="text-right sm:min-w-28">
                          <span className="text-sm font-black text-red-600 block">
                            {formatPrice(itemTotal)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {item.quantity} × {formatPrice(product.price)}
                          </span>
                        </div>

                        {/* Delete single button */}
                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Xóa khỏi giỏ hàng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back to shopping link */}
            <div className="pt-2">
              <Link
                to={ROUTES.PRODUCTS}
                className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tiếp tục chọn thêm sản phẩm khác</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-5">
              <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100">
                Tóm tắt đơn hàng
              </h2>

              {/* Price details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({totalItems} sản phẩm)</span>
                  <span className="font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span>Phí giao hàng</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                      Miễn phí
                    </span>
                  </span>
                  <span className="font-semibold text-emerald-600">0₫</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Giảm giá khuyến mại</span>
                  <span className="font-semibold text-gray-900">-0₫</span>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Tổng tiền thanh toán</span>
                    <span className="text-[10px] text-gray-400">(Đã bao gồm thuế VAT)</span>
                  </div>
                  <span className="text-xl font-black text-red-600">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Checkout CTA Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCheckoutRedirect}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="font-bold shadow-md hover:shadow-lg"
                >
                  Tiến hành thanh toán
                </Button>
              </div>

              <div className="text-[11px] text-gray-500 text-center">
                Hỗ trợ thanh toán nhận hàng (COD) tận nơi tiện lợi
              </div>
            </div>

            {/* Shopping Guarantees */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-3 text-xs text-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-[11px]">Giao hàng toàn quốc</h4>
                  <p className="text-[10px] text-gray-500">Miễn phí giao hàng cho mọi đơn công nghệ</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-[11px]">Cam kết chính hãng</h4>
                  <p className="text-[10px] text-gray-500">Bảo hành 12 - 24 tháng tại trung tâm ủy quyền</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-[11px]">Đổi trả linh hoạt</h4>
                  <p className="text-[10px] text-gray-500">1 đổi 1 trong vòng 30 ngày nếu có lỗi NSX</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
