import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Check } from 'lucide-react';
import type { Product } from '../../../models/product.model';
import { useCartStore } from '../../../store/useCartStore';
import { formatPrice } from '../../../utils/format';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);

  const discount = product.discountPercent ?? (
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    onAddToCart?.(product);
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
  };

  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-xs hover:shadow-md hover:border-gray-200 transition-all duration-200 p-3.5 flex flex-col justify-between h-full relative">
      <div>
        {/* Top badges: Discount & Heart */}
        <div className="flex items-center justify-between mb-2">
          {discount > 0 ? (
            <span className="bg-[#1c2029] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">
              -{discount}%
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleToggleLike}
            aria-label="Yêu thích"
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
          >
            <Heart
              className={`w-4 h-4 transition ${
                liked ? 'fill-red-500 text-red-500' : 'text-gray-400'
              }`}
            />
          </button>
        </div>

        {/* Product Image */}
        <Link to={`/products/${product.id}`} className="block overflow-hidden rounded-lg mb-3">
          <div className="w-full h-38 sm:h-44 flex items-center justify-center bg-gray-50/50 p-2 group-hover:scale-105 transition-transform duration-300">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          </div>
        </Link>

        {/* Product Name */}
        <Link to={`/products/${product.id}`} className="block">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-2 hover:text-blue-600 transition mb-1 leading-snug h-9">
            {product.name}
          </h3>
        </Link>

        {/* Category / Variant indicator */}
        <div className="flex items-center gap-1.5 mb-2 text-[11px] text-gray-500">
          <span className="font-semibold text-blue-600">{product.category?.name || 'Chính hãng'}</span>
          {product.variants && product.variants.length > 1 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400 font-medium">{product.variants.length} phiên bản</span>
            </>
          )}
        </div>

        {/* Price Area */}
        <div className="mb-3">
          {product.originalPrice && product.originalPrice > product.price && (
            <div className="text-[11px] text-gray-400 line-through">
              {formatPrice(product.originalPrice)}
            </div>
          )}
          <div className="text-sm sm:text-base font-bold text-gray-900">
            {formatPrice(product.price)}
          </div>
        </div>
      </div>

      {/* Add to cart CTA */}
      <button
        type="button"
        onClick={handleAddToCart}
        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
          added
            ? 'bg-emerald-600 text-white'
            : 'bg-[#1c2029] hover:bg-black text-white hover:shadow-sm'
        }`}
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Đã thêm</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Thêm vào giỏ</span>
          </>
        )}
      </button>
    </div>
  );
};

export default ProductCard;
