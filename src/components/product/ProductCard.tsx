import React from 'react';
import { Heart, ShoppingCart, Star, ArrowUpRight } from 'lucide-react';
import { Product } from '../../types/ecommerce';
import { formatNaira, calcDiscountPercent } from '../../utils/format';
import { useStore } from '../../context/StoreContext';
import { SafeImage } from '../common/SafeImage';

interface ProductCardProps {
  product: Product;
  onNavigate: (path: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigate }) => {
  const { addToCart, wishlistIds, toggleWishlist } = useStore();
  const primaryImage =
    product.images.find((i) => i.isPrimary)?.imageUrl || product.images[0]?.imageUrl || '';
  const discount = calcDiscountPercent(product.priceNgn, product.compareAtPriceNgn);
  const inStock = product.stockAvailable > 0;
  const isLowStock = inStock && product.stockAvailable <= product.lowStockThreshold;
  const isWishlisted = wishlistIds.includes(product.id);

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-sky-200">
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        <button
          type="button"
          onClick={() => onNavigate(`/product/${product.slug}`)}
          className="w-full h-full block text-left"
        >
          <SafeImage
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>

        {discount > 0 && (
          <span className="absolute top-3 left-3 px-2 py-1 text-[11px] font-bold bg-orange-500 text-white rounded-md tabular-nums">
            -{discount}%
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-3 right-3 p-2 rounded-lg border transition-colors ${
            isWishlisted
              ? 'bg-orange-50 border-orange-200 text-orange-600'
              : 'bg-white/90 border-slate-200 text-slate-600 hover:text-blue-700'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-orange-500' : ''}`} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
          <span className="font-medium text-blue-700 truncate">{product.brand}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{product.subcategoryName || product.categoryName || 'Gadgets'}</span>
        </div>

        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2 min-h-[2.75rem]">
          <button
            type="button"
            onClick={() => onNavigate(`/product/${product.slug}`)}
            className="text-left hover:text-blue-700 transition-colors"
          >
            {product.name}
          </button>
        </h3>

        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-600 tabular-nums">
            <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
            <span className="font-semibold text-slate-800">{product.ratingAvg.toFixed(1)}</span>
            <span className="text-slate-400">({product.ratingCount})</span>
          </div>
          <span
            className={`font-medium ${
              !inStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-700'
            }`}
          >
            {!inStock
              ? 'Out of stock'
              : isLowStock
                ? `Only ${product.stockAvailable} left`
                : 'In stock'}
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatNaira(product.priceNgn)}
            </span>
            {product.compareAtPriceNgn && product.compareAtPriceNgn > product.priceNgn && (
              <span className="text-xs text-slate-400 line-through tabular-nums">
                {formatNaira(product.compareAtPriceNgn)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            <button
              type="button"
              disabled={!inStock}
              onClick={() => addToCart(product, 1)}
              className="col-span-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {inStock ? 'Add to Cart' : 'Sold Out'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate(`/product/${product.slug}`)}
              className="col-span-2 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors whitespace-nowrap"
            >
              View
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
