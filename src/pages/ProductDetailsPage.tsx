import React, { useEffect, useState } from 'react';
import {
  Star,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Product, Review } from '../types/ecommerce';
import { useStore } from '../context/StoreContext';
import { formatNaira, calcDiscountPercent, formatDateShort } from '../utils/format';
import { SafeImage } from '../components/common/SafeImage';
import { ProductCard } from '../components/product/ProductCard';

interface ProductDetailsPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({ slug, onNavigate }) => {
  const {
    user,
    addToCart,
    wishlistIds,
    toggleWishlist,
    recentlyViewed,
    recordRecentlyViewed,
    showToast,
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{
        product: Product;
        reviews: Review[];
        related: Product[];
      }>(`/products/${encodeURIComponent(slug)}`);

      setProduct(data.product);
      setReviews(data.reviews);
      setRelated(data.related);
      setActiveImgIdx(0);
      setSelectedColor(data.product.availableColors[0] || '');
      setSelectedVariantId(data.product.variants[0]?.id || null);
      setQuantity(1);
      recordRecentlyViewed(data.product);
      document.title = `${data.product.name} | ZuriVolt Gadgets`;
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 aspect-[4/3] bg-slate-100 rounded-2xl animate-pulse" />
        <div className="lg:col-span-6 space-y-4">
          <div className="h-8 bg-slate-100 rounded w-3/4 animate-pulse" />
          <div className="h-6 bg-slate-100 rounded w-1/3 animate-pulse" />
          <div className="h-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">Product Not Found</h1>
        <p className="text-sm text-slate-600 mt-2">
          This gadget may have been removed or unpublished.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/category/all')}
          className="mt-6 px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg"
        >
          Browse All Gadgets
        </button>
      </div>
    );
  }

  const activeVariant = product.variants.find((v) => v.id === selectedVariantId) || null;
  const activePrice = activeVariant ? activeVariant.priceNgn : product.priceNgn;
  const activeStock = activeVariant ? activeVariant.stockQty : product.stockAvailable;
  const discount = calcDiscountPercent(activePrice, product.compareAtPriceNgn);
  const inStock = activeStock > 0;
  const isWishlisted = wishlistIds.includes(product.id);
  const currentImg = product.images[activeImgIdx]?.imageUrl || product.images[0]?.imageUrl || '';

  const handleBuyNow = () => {
    if (!inStock) return;
    addToCart(product, quantity, selectedColor, selectedVariantId);
    onNavigate('/checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNavigate('/login');
      return;
    }
    setSubmittingReview(true);
    try {
      await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
        }),
      });
      showToast('Thank you! Your verified review has been published.', 'success');
      setReviewTitle('');
      setReviewComment('');
      loadProduct();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const recentOther = recentlyViewed.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 flex-wrap">
        <button type="button" onClick={() => onNavigate('/')} className="hover:text-blue-700">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        {product.categorySlug && (
          <>
            <button
              type="button"
              onClick={() => onNavigate(`/category/${product.categorySlug}`)}
              className="hover:text-blue-700"
            >
              {product.categoryName}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
        <span className="text-slate-900 font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-3">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
            <SafeImage src={currentImg} alt={product.name} loading="eager" />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2.5">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImgIdx(idx)}
                  className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === activeImgIdx ? 'border-blue-700' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <SafeImage src={img.imageUrl} alt={img.altText || product.name} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Purchase Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-semibold text-blue-700">{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>SKU: {activeVariant?.sku || product.sku}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-slate-700 tabular-nums">
                <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                {product.ratingAvg.toFixed(1)} ({product.ratingCount} reviews)
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {product.shortDescription || product.description}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-bold text-slate-900 tabular-nums">
                  {formatNaira(activePrice)}
                </span>
                {product.compareAtPriceNgn && product.compareAtPriceNgn > activePrice && (
                  <span className="text-base text-slate-400 line-through tabular-nums">
                    {formatNaira(product.compareAtPriceNgn)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-xs font-semibold text-orange-600 mt-0.5 tabular-nums">
                  Save {discount}% ({formatNaira((product.compareAtPriceNgn || 0) - activePrice)})
                </p>
              )}
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                  !inStock
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : activeStock <= product.lowStockThreshold
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {!inStock
                  ? 'OUT OF STOCK'
                  : activeStock <= product.lowStockThreshold
                    ? `Low Stock · Only ${activeStock} remaining`
                    : `In Stock · ${activeStock} available`}
              </span>
            </div>
          </div>

          {/* Colours */}
          {product.availableColors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Colour: <span className="text-slate-900">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      selectedColor === color
                        ? 'border-blue-700 bg-sky-50 text-blue-800 font-semibold'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variations */}
          {product.variants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Select Variation</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      if (v.color) setSelectedColor(v.color);
                      setQuantity(1);
                    }}
                    className={`p-3 text-left rounded-xl border transition-colors ${
                      selectedVariantId === v.id
                        ? 'border-blue-700 bg-sky-50/70'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900">{v.name}</p>
                    <p className="text-xs font-bold text-blue-700 mt-0.5 tabular-nums">
                      {formatNaira(v.priceNgn)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Primary Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center border border-slate-300 rounded-xl bg-white">
                <button
                  type="button"
                  disabled={!inStock || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 text-slate-600 hover:text-blue-700 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  disabled={!inStock || quantity >= activeStock}
                  onClick={() => setQuantity((q) => Math.min(activeStock, q + 1))}
                  className="p-3 text-slate-600 hover:text-blue-700 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`p-3 rounded-xl border transition-colors ${
                  isWishlisted
                    ? 'border-orange-300 bg-orange-50 text-orange-600'
                    : 'border-slate-300 text-slate-600 hover:text-blue-700'
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-orange-500' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!inStock}
                onClick={() => addToCart(product, quantity, selectedColor, selectedVariantId)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-500 rounded-xl transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                {inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
              </button>
              <button
                type="button"
                disabled={!inStock}
                onClick={handleBuyNow}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-500 rounded-xl transition-colors"
              >
                <Zap className="w-4 h-4" />
                BUY NOW
              </button>
            </div>
          </div>

          {/* Delivery & Authenticity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
              <Truck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-slate-900">Nationwide Nigeria Delivery</p>
                <p className="text-slate-500 mt-0.5">
                  Same-day dispatch in Lagos · 1–3 business days to Abuja, PH & other states.
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-slate-900">Verified Authentic Warranty</p>
                <p className="text-slate-500 mt-0.5">
                  Factory sealed, Paystack protected & direct WhatsApp order confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Technical Specifications */}
      <div className="mt-14 pt-10 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-3">
            Product Overview
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>

        <div className="lg:col-span-6">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-3">
            Technical Specifications
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
            {Object.entries(product.specifications).length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Standard manufacturer specifications apply.</p>
            ) : (
              Object.entries(product.specifications).map(([key, val]) => (
                <div key={key} className="grid grid-cols-3 px-4 py-3 text-xs bg-white">
                  <span className="font-semibold text-slate-700">{key.replace(/_/g, ' ')}</span>
                  <span className="col-span-2 text-slate-600">{val}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Customer Reviews & Verified Purchase Submission */}
      <div className="mt-14 pt-10 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Customer Reviews ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500 p-6 bg-slate-50 border border-slate-200 rounded-xl">
              No reviews yet for this product. Verified buyers can share their experience on the right.
            </p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-5 border border-slate-200 rounded-xl bg-white">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= rev.rating ? 'fill-orange-400 text-orange-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  {rev.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                {rev.title && <h4 className="text-sm font-semibold text-slate-900">{rev.title}</h4>}
                <p className="text-sm text-slate-600 mt-1">{rev.comment}</p>
                <p className="text-xs text-slate-400 mt-3">
                  {rev.authorName} · {formatDateShort(rev.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-5">
          <form
            onSubmit={handleReviewSubmit}
            className="p-6 border border-slate-200 rounded-xl bg-slate-50 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-slate-900">
              Write a Verified Review
            </h3>
            <p className="text-xs text-slate-500">
              Only signed-in customers with a completed purchase of this gadget can post a verified-purchase review.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= reviewRating ? 'fill-orange-400 text-orange-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headline</label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review</label>
              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How is the build quality, battery life, and delivery?"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60"
            >
              {user ? (submittingReview ? 'Submitting...' : 'Submit Verified Review') : 'Sign In to Review'}
            </button>
          </form>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-14 pt-10 border-t border-slate-200">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">
            Related Gadgets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recentOther.length > 0 && (
        <div className="mt-14 pt-10 border-t border-slate-200">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentOther.map((item) => (
              <ProductCard key={item.id} product={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
