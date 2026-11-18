import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  MessageCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { Order } from '../types/ecommerce';
import { formatNaira } from '../utils/format';
import { buildOrderWhatsAppUrl } from '../utils/whatsapp';

interface CheckoutCallbackPageProps {
  reference: string;
  onNavigate: (path: string) => void;
}

export const CheckoutCallbackPage: React.FC<CheckoutCallbackPageProps> = ({ reference, onNavigate }) => {
  const { clearCart, settings } = useStore();
  const [status, setStatus] = useState<'verifying' | 'paid' | 'failed' | 'abandoned' | 'error'>('verifying');
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [popupBlocked, setPopupBlocked] = useState(false);
  const verifiedOnce = useRef(false);

  const verifyTransaction = async () => {
    if (!reference) {
      setStatus('error');
      setErrorMsg('No transaction reference was provided in the callback URL.');
      return;
    }
    setStatus('verifying');
    try {
      const res = await apiRequest<{
        verified: boolean;
        status?: string;
        order?: Order;
        error?: string;
      }>('/paystack/verify', {
        method: 'POST',
        body: JSON.stringify({ reference }),
      });

      if (res.order) setOrder(res.order);

      if (res.verified && res.order) {
        setStatus('paid');
        clearCart();

        // Automatically open WhatsApp conversation ONLY after backend confirms payment
        const waUrl = buildOrderWhatsAppUrl(settings.whatsappNumber, res.order);
        const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          setPopupBlocked(true);
        }
      } else if (res.status === 'abandoned') {
        setStatus('abandoned');
      } else {
        setStatus('failed');
        setErrorMsg(res.error || 'Payment verification failed or was declined.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message);
    }
  };

  useEffect(() => {
    if (verifiedOnce.current) return;
    verifiedOnce.current = true;
    verifyTransaction();
  }, [reference]);

  if (status === 'verifying') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 animate-spin mx-auto" />
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Verifying Paystack Payment...
        </h1>
        <p className="text-sm text-slate-600">
          Confirming transaction reference <span className="font-mono font-semibold">{reference}</span> directly with Paystack servers. Do not close this page.
        </p>
      </div>
    );
  }

  if (status === 'paid' && order) {
    const whatsappUrl = buildOrderWhatsAppUrl(settings.whatsappNumber, order);

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-green-600 text-white px-6 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Payment Verified & Order Confirmed
            </h1>
            <p className="text-sm text-green-100 mt-1">
              Order <strong className="font-mono">{order.orderNumber}</strong> has been saved and inventory reserved.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Prominent WhatsApp Confirmation Box */}
            <div className="p-5 rounded-xl bg-green-50 border border-green-200 space-y-3">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-green-700 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Final Step: Confirm Delivery on WhatsApp
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {popupBlocked
                      ? 'Your browser blocked automatic redirection to WhatsApp. Click the button below to open your pre-filled order message and tap Send inside WhatsApp.'
                      : 'We opened WhatsApp with your verified order details. Please tap Send inside WhatsApp so our dispatch team can confirm your delivery schedule.'}
                  </p>
                </div>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                CONTINUE TO WHATSAPP
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Verified Order Receipt */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
                <span>
                  Order Number: <strong className="font-mono text-slate-900">{order.orderNumber}</strong>
                </span>
                <span>
                  Paystack Ref: <strong className="font-mono text-slate-900">{order.paystackReference}</strong>
                </span>
              </div>

              <div className="space-y-2.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      {item.productName}{' '}
                      {item.selectedVariant || item.selectedColor
                        ? `(${[item.selectedVariant, item.selectedColor].filter(Boolean).join(', ')})`
                        : ''}{' '}
                      × <strong className="tabular-nums">{item.quantity}</strong>
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatNaira(item.lineTotalNgn)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatNaira(order.subtotalNgn)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span className="tabular-nums">
                    {order.deliveryFeeNgn === 0 ? 'Free' : formatNaira(order.deliveryFeeNgn)}
                  </span>
                </div>
                {order.discountNgn > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatNaira(order.discountNgn)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-slate-900 text-base">
                  <span>Total Paid</span>
                  <span className="text-green-700 tabular-nums">{formatNaira(order.totalNgn)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/account')}
                className="flex-1 py-2.5 text-sm font-semibold text-blue-700 border border-blue-200 hover:bg-sky-50 rounded-xl"
              >
                View Order History
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
        {status === 'abandoned' ? (
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto" />
        ) : (
          <XCircle className="w-12 h-12 text-red-600 mx-auto" />
        )}
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {status === 'abandoned' ? 'Payment Cancelled' : 'Payment Verification Failed'}
        </h1>
        <p className="text-sm text-slate-600">
          {errorMsg ||
            'Your transaction was not completed. Your shopping cart items have been preserved so you can retry payment anytime.'}
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => onNavigate('/checkout')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Checkout
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/cart')}
            className="px-6 py-3 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl"
          >
            Return to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
