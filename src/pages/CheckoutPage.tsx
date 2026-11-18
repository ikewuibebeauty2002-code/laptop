import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Tag, CheckCircle2, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import { CustomerAddress } from '../types/ecommerce';
import { formatNaira, NIGERIAN_STATES } from '../utils/format';
import { SafeImage } from '../components/common/SafeImage';

declare global {
  interface Window {
    PaystackPop?: new () => {
      resumeTransaction: (
        accessCode: string,
        callbacks?: {
          onSuccess?: (transaction: { reference?: string }) => void;
          onCancel?: () => void;
          onError?: (error: { message?: string }) => void;
        }
      ) => void;
    };
  }
}

async function loadPaystackInline(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.PaystackPop) return true;
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.paystack.co/v2/inline.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.PaystackPop)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(Boolean(window.PaystackPop)), 2500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.PaystackPop));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

interface CheckoutPageProps {
  onNavigate: (path: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { user, cart, cartSubtotal, settings, showToast } = useStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsappNumber || '');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Lagos');
  const [city, setCity] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountNgn: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [reviewStep, setReviewStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [hostedCheckoutUrl, setHostedCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.fullName);
      setEmail((prev) => prev || user.email);
      setPhone((prev) => prev || user.phone);
      setWhatsappNumber((prev) => prev || user.whatsappNumber || user.phone);

      apiRequest<CustomerAddress[]>('/addresses')
        .then((addrs) => {
          setSavedAddresses(addrs);
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          if (def && !address) {
            setFullName(def.fullName);
            setPhone(def.phone);
            setWhatsappNumber(def.whatsappNumber);
            setAddress(def.streetAddress);
            setCity(def.city);
            setState(def.state);
            setAdditionalInfo(def.additionalInfo);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">Your Cart is Empty</h1>
        <p className="text-sm text-slate-600 mt-2">
          Add gadgets to your cart before proceeding to checkout.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/category/all')}
          className="mt-6 px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl"
        >
          Browse Gadgets
        </button>
      </div>
    );
  }

  const deliveryFee =
    cartSubtotal >= settings.freeDeliveryThresholdNgn
      ? 0
      : state.toLowerCase().includes('lagos')
        ? settings.lagosDeliveryFeeNgn
        : settings.nationwideDeliveryFeeNgn;

  const discountNgn = appliedCoupon?.discountNgn || 0;
  const totalPayable = Math.max(0, cartSubtotal + deliveryFee - discountNgn);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await apiRequest<{ code: string; discountNgn: number }>('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput, subtotalNgn: cartSubtotal }),
      });
      setAppliedCoupon({ code: res.code, discountNgn: res.discountNgn });
      showToast(`Coupon ${res.code} applied (-${formatNaira(res.discountNgn)})`, 'success');
    } catch (err) {
      setAppliedCoupon(null);
      showToast((err as Error).message, 'error');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleValidateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !whatsappNumber.trim() || !email.trim() || !address.trim() || !city.trim() || !state.trim()) {
      showToast('Please fill in all required delivery fields.', 'error');
      return;
    }
    setReviewStep(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePayWithPaystack = async () => {
    setSubmitting(true);
    setPaymentError(null);
    setHostedCheckoutUrl(null);
    try {
      const callbackUrl = `${window.location.origin}/checkout/callback`;
      const res = await apiRequest<{
        mode?: string;
        orderId?: string;
        orderNumber?: string;
        reference?: string;
        accessCode?: string;
        authorizationUrl?: string;
      }>('/checkout/initialize', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            selectedColor: i.selectedColor,
            selectedVariantName: i.selectedVariantName,
            quantity: i.quantity,
          })),
          customer: {
            fullName,
            phone,
            whatsappNumber,
            email,
            address,
            state,
            city,
            additionalInfo,
          },
          couponCode: appliedCoupon?.code || '',
          callbackUrl,
        }),
      });

      const authUrl = typeof res?.authorizationUrl === 'string' ? res.authorizationUrl.trim() : '';
      const accessCode = typeof res?.accessCode === 'string' ? res.accessCode.trim() : '';
      const reference = typeof res?.reference === 'string' ? res.reference.trim() : '';

      if (!authUrl && !accessCode) {
        throw new Error('Paystack checkout URL was not returned by the server. Please verify your Paystack gateway settings.');
      }

      if (res?.mode === 'sandbox' || (authUrl && !authUrl.startsWith('http'))) {
        onNavigate(authUrl);
        return;
      }

      if (accessCode) {
        const inlineReady = await loadPaystackInline();
        if (inlineReady && window.PaystackPop) {
          setHostedCheckoutUrl(authUrl || null);
          const popup = new window.PaystackPop();
          popup.resumeTransaction(accessCode, {
            onSuccess: (tx) => {
              const verifiedRef = tx?.reference || reference;
              onNavigate(`/checkout/callback?reference=${encodeURIComponent(verifiedRef)}`);
            },
            onCancel: () => {
              setSubmitting(false);
              setPaymentError('Paystack payment window was closed before completion. Click Pay again to retry.');
            },
            onError: () => {
              if (authUrl) {
                setHostedCheckoutUrl(authUrl);
                setPaymentError('Unable to open the embedded Paystack modal. Use the direct Paystack Checkout button below.');
              } else {
                setPaymentError('Unable to open Paystack payment window. Please try again.');
              }
              setSubmitting(false);
            },
          });
          return;
        }
      }

      if (authUrl.startsWith('http')) {
        setHostedCheckoutUrl(authUrl);
        window.location.href = authUrl;
      } else if (authUrl) {
        onNavigate(authUrl);
      }
    } catch (err) {
      const message = (err as Error).message || 'Unable to initialize Paystack payment.';
      setPaymentError(message);
      showToast(message, 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-slate-200 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Secure Checkout</h1>
          <p className="text-sm text-slate-600 mt-1">
            {user ? `Signed in as ${user.email}` : 'Checking out as Guest — no account registration required'}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
          <Lock className="w-4 h-4" />
          Paystack Verified Checkout
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Delivery Details or Review Step */}
        <div className="lg:col-span-7">
          {!reviewStep ? (
            <form onSubmit={handleValidateForm} className="p-6 bg-white border border-slate-200 rounded-xl space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  1. Contact & Delivery Details
                </h2>
                {!user && (
                  <button
                    type="button"
                    onClick={() => onNavigate('/login')}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Have an account? Sign in
                  </button>
                )}
              </div>

              {savedAddresses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Use Saved Address</p>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((sa) => (
                      <button
                        key={sa.id}
                        type="button"
                        onClick={() => {
                          setFullName(sa.fullName);
                          setPhone(sa.phone);
                          setWhatsappNumber(sa.whatsappNumber);
                          setAddress(sa.streetAddress);
                          setCity(sa.city);
                          setState(sa.state);
                          setAdditionalInfo(sa.additionalInfo);
                        }}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 hover:border-blue-400 rounded-lg bg-slate-50"
                      >
                        {sa.label}: {sa.city}, {sa.state}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chinedu Okeke"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 000 0000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+234 803 000 0000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House number, street name, estate or landmark"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City / LGA <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Lekki, Ikeja, Wuse II"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Delivery Information (Optional)
                </label>
                <textarea
                  rows={2}
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Gate instructions, preferred delivery window, or landmark"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
              >
                Review Order Details
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  2. Review & Pay via Paystack
                </h2>
                <button
                  type="button"
                  onClick={() => setReviewStep(false)}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Edit Information
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Customer</p>
                  <p className="font-semibold text-slate-900">{fullName}</p>
                  <p className="text-slate-600">{email}</p>
                  <p className="text-slate-600">Call: {phone}</p>
                  <p className="text-slate-600">WhatsApp: {whatsappNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Delivery Address</p>
                  <p className="font-semibold text-slate-900">{address}</p>
                  <p className="text-slate-600">{city}, {state}</p>
                  {additionalInfo && <p className="text-xs text-slate-500 mt-1">Note: {additionalInfo}</p>}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3 text-xs text-slate-700">
                <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">How Payment & WhatsApp Confirmation Works</p>
                  <p className="mt-1 leading-relaxed">
                    You will be redirected to Paystack to pay{' '}
                    <strong className="tabular-nums">{formatNaira(totalPayable)}</strong>. Once our backend verifies your Paystack transaction, your order is marked PAID and you will be redirected to our WhatsApp DM with your pre-filled order receipt.
                  </p>
                </div>
              </div>

              {paymentError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-800">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-red-900">Paystack Gateway Notice</p>
                    <p className="leading-relaxed">{paymentError}</p>
                    {paymentError.toLowerCase().includes('deactivated') && (
                      <p className="text-[11px] text-red-700 leading-relaxed">
                        Paystack rejected the live secret key because this merchant integration is currently deactivated or awaiting live compliance activation in the Paystack Dashboard. Activate the business in Paystack or update <code>PAYSTACK_SECRET_KEY</code> in AI Studio Secrets with an active key.
                      </p>
                    )}
                    {hostedCheckoutUrl && (
                      <a
                        href={hostedCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                      >
                        Open Paystack Checkout Page
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={handlePayWithPaystack}
                className="w-full inline-flex items-center justify-center gap-2 py-4 text-base font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm transition-colors disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                {submitting ? 'Initializing Paystack...' : `Pay ${formatNaira(totalPayable)} with Paystack`}
              </button>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
          <h2 className="font-display text-lg font-bold text-slate-900">Order Summary</h2>

          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                  <SafeImage src={item.productImage} alt={item.productName} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[item.selectedVariantName, item.selectedColor, `Qty: ${item.quantity}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                  {formatNaira(item.unitPriceNgn * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Coupon Input */}
          <div className="pt-4 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Promo / Coupon Code (Try: ZURIVOLT5)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter code"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg uppercase"
                />
              </div>
              <button
                type="button"
                disabled={applyingCoupon}
                onClick={handleApplyCoupon}
                className="px-4 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-sky-50 rounded-lg"
              >
                Apply
              </button>
            </div>
            {appliedCoupon && (
              <p className="mt-1.5 text-xs font-semibold text-green-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {appliedCoupon.code} applied (-{formatNaira(appliedCoupon.discountNgn)})
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatNaira(cartSubtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Delivery ({state})</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}
              </span>
            </div>
            {discountNgn > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span className="font-semibold tabular-nums">-{formatNaira(discountNgn)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-slate-200 items-baseline">
              <span className="text-base font-bold text-slate-900">Total Payable</span>
              <span className="text-xl font-bold text-blue-700 tabular-nums">
                {formatNaira(totalPayable)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
