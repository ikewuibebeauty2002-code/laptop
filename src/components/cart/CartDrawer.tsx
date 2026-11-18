import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatNaira } from '../../utils/format';
import { SafeImage } from '../common/SafeImage';

interface CartDrawerProps {
  onNavigate: (path: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const {
    cart,
    cartCount,
    cartSubtotal,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
    settings,
  } = useStore();

  if (!isCartOpen) return null;

  const remainingForFree = Math.max(0, settings.freeDeliveryThresholdNgn - cartSubtotal);
  const freeProgress = Math.min(100, (cartSubtotal / settings.freeDeliveryThresholdNgn) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={() => setIsCartOpen(false)}
      />
      <aside className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-blue-700" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Shopping Cart ({cartCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="px-6 py-3 bg-sky-50/70 border-b border-sky-100">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 mb-1.5">
              <Truck className="w-4 h-4 text-blue-700 shrink-0" />
              {remainingForFree === 0 ? (
                <span className="text-green-700 font-semibold">
                  You unlocked free Lagos delivery!
                </span>
              ) : (
                <span>
                  Add <strong className="tabular-nums">{formatNaira(remainingForFree)}</strong> more for free Lagos delivery
                </span>
              )}
            </div>
            <div className="h-1.5 w-full bg-sky-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  remainingForFree === 0 ? 'bg-green-600' : 'bg-blue-700'
                }`}
                style={{ width: `${freeProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-blue-700" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Your cart is empty</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Explore authentic smartphones, laptops, power banks, and audio gadgets ready for nationwide delivery.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  onNavigate('/category/all');
                }}
                className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                Browse Gadgets
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-3.5 pb-4 border-b border-slate-100 last:border-0"
              >
                <div className="w-20 h-20 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0">
                  <SafeImage src={item.productImage} alt={item.productName} />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      onNavigate(`/product/${item.productSlug}`);
                    }}
                    className="text-sm font-semibold text-slate-900 hover:text-blue-700 text-left line-clamp-2"
                  >
                    {item.productName}
                  </button>
                  {(item.selectedVariantName || item.selectedColor) && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {[item.selectedVariantName, item.selectedColor].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums">
                    {formatNaira(item.unitPriceNgn)}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, item.quantity - 1)}
                        className="p-1.5 text-slate-600 hover:text-blue-700"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.stockAvailable}
                        onClick={() => updateCartQty(item.id, item.quantity + 1)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {formatNaira(cartSubtotal)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Delivery fees & coupon discounts are calculated at checkout.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  onNavigate('/cart');
                }}
                className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:border-blue-400 rounded-lg transition-colors"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  onNavigate('/checkout');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
              >
                Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
