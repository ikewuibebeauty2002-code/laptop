import React from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatNaira } from '../utils/format';
import { SafeImage } from '../components/common/SafeImage';

interface CartPageProps {
  onNavigate: (path: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { cart, cartSubtotal, updateCartQty, removeFromCart, settings } = useStore();

  const estimatedDelivery =
    cartSubtotal === 0
      ? 0
      : cartSubtotal >= settings.freeDeliveryThresholdNgn
        ? 0
        : settings.lagosDeliveryFeeNgn;
  const total = cartSubtotal + estimatedDelivery;

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-blue-700" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Your Shopping Cart is Empty</h1>
        <p className="text-sm text-slate-600 mt-2">
          Add smartphones, laptops, power banks, or audio accessories to begin checkout.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/category/all')}
          className="mt-6 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
        >
          Explore Gadgets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-slate-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-4 sm:items-center"
            >
              <div className="w-24 h-24 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0">
                <SafeImage src={item.productImage} alt={item.productName} />
              </div>

              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onNavigate(`/product/${item.productSlug}`)}
                  className="text-base font-semibold text-slate-900 hover:text-blue-700 text-left"
                >
                  {item.productName}
                </button>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[item.brand, item.selectedVariantName, item.selectedColor].filter(Boolean).join(' · ')}
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1.5 tabular-nums">
                  {formatNaira(item.unitPriceNgn)} each
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="inline-flex items-center border border-slate-300 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.quantity - 1)}
                    className="p-2 text-slate-600 hover:text-blue-700"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm font-semibold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= item.stockAvailable}
                    onClick={() => updateCartQty(item.id, item.quantity + 1)}
                    className="p-2 text-slate-600 hover:text-blue-700 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right min-w-[100px]">
                  <p className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatNaira(item.unitPriceNgn * item.quantity)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-slate-400 hover:text-red-600"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="lg:col-span-4 p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Order Summary</h2>
          <div className="space-y-2.5 text-sm border-b border-slate-200 pb-4">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatNaira(cartSubtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Estimated Lagos Delivery</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {estimatedDelivery === 0 ? 'Free' : formatNaira(estimatedDelivery)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-base font-bold text-slate-900">Estimated Total</span>
            <span className="text-xl font-bold text-blue-700 tabular-nums">
              {formatNaira(total)}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Final total, state delivery rates, and coupon codes are verified on the backend at checkout.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/checkout')}
            className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
          >
            Proceed to Checkout
            <ArrowRight className="w-4 h-4" />
          </button>
        </aside>
      </div>
    </div>
  );
};
