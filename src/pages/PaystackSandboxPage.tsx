import React, { useEffect, useState } from 'react';
import { Lock, CreditCard, Landmark, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Order } from '../types/ecommerce';
import { formatNaira } from '../utils/format';

interface PaystackSandboxPageProps {
  reference: string;
  onNavigate: (path: string) => void;
}

export const PaystackSandboxPage: React.FC<PaystackSandboxPageProps> = ({ reference, onNavigate }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [channel, setChannel] = useState<'card' | 'bank_transfer' | 'ussd'>('card');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!reference) return;
    apiRequest<Order>(`/paystack/sandbox-order/${encodeURIComponent(reference)}`)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [reference]);

  const simulateOutcome = async (outcome: 'success' | 'failed' | 'abandoned') => {
    setProcessing(true);
    try {
      const res = await apiRequest<{ callbackUrl: string }>('/paystack/sandbox-complete', {
        method: 'POST',
        body: JSON.stringify({ reference, outcome, channel }),
      });
      if (res?.callbackUrl) {
        onNavigate(res.callbackUrl);
      } else {
        setProcessing(false);
      }
    } catch {
      setProcessing(false);
    }
  };

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-sm text-slate-600">Loading Paystack Test Checkout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-slate-100 py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-sky-300 font-semibold">PAYSTACK TEST SANDBOX MODE</p>
            <p className="text-sm font-medium mt-0.5 truncate">{order.customerEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Pay</p>
            <p className="text-lg font-bold text-green-400 tabular-nums">
              {formatNaira(order.totalNgn)}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-slate-700 leading-relaxed">
            <strong>Test Sandbox Notice:</strong> No live <code>PAYSTACK_SECRET_KEY</code> is set in environment variables yet. Choose an outcome below to test real backend verification, atomic stock deduction, and WhatsApp redirection.
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'card', label: 'Test Card', icon: CreditCard },
                { id: 'bank_transfer', label: 'Transfer', icon: Landmark },
                { id: 'ussd', label: 'USSD', icon: Lock },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChannel(m.id as 'card' | 'bank_transfer' | 'ussd')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                      channel === m.id
                        ? 'border-blue-700 bg-sky-50 text-blue-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p>Order: <strong className="font-mono text-slate-800">{order.orderNumber}</strong></p>
            <p>Ref: <strong className="font-mono text-slate-800">{reference}</strong></p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={processing}
              onClick={() => simulateOutcome('success')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Authorize Test Payment (Success)
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => simulateOutcome('failed')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Simulate Declined Transaction (Failed)
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => simulateOutcome('abandoned')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              Cancel & Return to Store (Abandoned)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
