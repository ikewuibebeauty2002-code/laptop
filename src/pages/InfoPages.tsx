import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  Award,
  Users,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { Order } from '../types/ecommerce';
import { formatNaira, formatDateShort } from '../utils/format';
import { buildGeneralWhatsAppUrl } from '../utils/whatsapp';
import { SafeImage } from '../components/common/SafeImage';

export const AboutPage: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { settings } = useStore();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-4">
          <p className="text-xs font-semibold text-blue-700">About {settings.storeName}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 text-balance">
            Nigeria's Trusted Destination for Authentic Electronics & Everyday Gadgets.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Founded in Lagos, {settings.storeName} bridges the trust gap in online electronics shopping across Nigeria. Every smartphone, laptop, iPad, smartwatch, and power station we stock is sourced directly through verified OEM channels with verifiable serial numbers.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/category/all')}
            className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            Browse Our Catalog
          </button>
        </div>
        <div className="lg:col-span-6 aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200">
          <SafeImage
            src="/src/assets/images/hero_gadgets_showcase_1794983287261.jpg"
            alt="ZuriVolt electronics showcase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border border-slate-200 rounded-xl bg-white">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">Our Story</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Started by engineers and hardware enthusiasts tired of refurbished units sold as new, we built a transparent store with clear Naira pricing, real-time stock tracking, and verifiable Paystack checkout.
          </p>
        </div>
        <div className="p-6 border border-slate-200 rounded-xl bg-white">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">Our Mission</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            To equip creators, professionals, students, and families across Nigeria with genuine, warrantied electronics backed by prompt dispatch and human WhatsApp support.
          </p>
        </div>
        <div className="p-6 border border-slate-200 rounded-xl bg-white">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">Our Vision</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            To become West Africa's benchmark electronics retailer where every online order is confirmed within minutes and delivered safely to your doorstep.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
        <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">Why Shop With Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheck, title: '100% Authentic Units', desc: 'Sealed boxes with verifiable manufacturer serial numbers.' },
            { icon: Award, title: 'Paystack Verified', desc: 'Server-verified Naira card, bank transfer, and USSD payments.' },
            { icon: Truck, title: 'Nationwide Logistics', desc: 'Same-day Lagos dispatch and tracked delivery across 36 states.' },
            { icon: Users, title: 'Customer Commitment', desc: 'Dedicated WhatsApp support immediately after order confirmation.' },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="space-y-2">
                <Icon className="w-6 h-6 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { settings, showToast } = useStore();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showToast(res.message, 'success');
      setSent(true);
      setForm({ fullName: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="text-sm text-slate-600 mt-2">
          Questions about device compatibility, bulk corporate orders, or delivery timelines? Reach our Lagos team directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 border border-slate-200 rounded-xl bg-white space-y-4 text-sm">
            <h2 className="font-display text-lg font-bold text-slate-900">Store Information</h2>
            <p className="flex items-start gap-3 text-slate-600">
              <MapPin className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <span>{settings.storeAddress}</span>
            </p>
            <p className="flex items-center gap-3 text-slate-600">
              <Phone className="w-5 h-5 text-blue-700 shrink-0" />
              <span>{settings.supportPhone}</span>
            </p>
            <p className="flex items-center gap-3 text-slate-600">
              <Mail className="w-5 h-5 text-blue-700 shrink-0" />
              <span>{settings.supportEmail}</span>
            </p>
            <a
              href={buildGeneralWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.storeName}, I need assistance.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className="lg:col-span-7">
          {sent ? (
            <div className="p-8 bg-green-50 border border-green-200 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
              <h2 className="font-display text-xl font-bold text-slate-900">Message Received</h2>
              <p className="text-sm text-slate-600">
                Thank you for reaching out. Our team has logged your inquiry and will reply via email or WhatsApp shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="px-5 py-2 text-xs font-semibold text-blue-700 border border-blue-200 bg-white rounded-lg"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const TrackOrderPage: React.FC = () => {
  const { showToast } = useStore();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiRequest<Order>(
        `/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`
      );
      setOrder(data);
    } catch (err) {
      setOrder(null);
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-14 space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-slate-900">Track Your Order</h1>
        <p className="text-sm text-slate-600 mt-1">
          Enter your Order Number (e.g. ZV-2026-1001) and checkout email address.
        </p>
      </div>

      <form onSubmit={handleTrack} className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            required
            placeholder="Order Number (e.g. ZV-2026-1001)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono"
          />
          <input
            type="email"
            required
            placeholder="Checkout Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Checking...' : 'Track Order Status'}
        </button>
      </form>

      {order && (
        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="flex flex-wrap justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <p className="font-mono text-base font-bold text-slate-900">{order.orderNumber}</p>
              <p className="text-xs text-slate-500">Placed {formatDateShort(order.createdAt)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase text-blue-700 block">
                {order.orderStatus.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-semibold text-green-700 uppercase">
                Payment: {order.paymentStatus}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>{it.productName} × {it.quantity}</span>
                <span className="font-semibold tabular-nums">{formatNaira(it.lineTotalNgn)}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between font-bold text-slate-900">
            <span>Total</span>
            <span className="tabular-nums">{formatNaira(order.totalNgn)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const PolicyPage: React.FC<{ type: string }> = ({ type }) => {
  const { settings } = useStore();
  const titles: Record<string, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms and Conditions',
    shipping: 'Shipping and Delivery Policy',
    returns: 'Return and Refund Policy',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-5">
      <h1 className="font-display text-3xl font-bold text-slate-900">
        {titles[type] || 'Store Policy'}
      </h1>
      <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 text-sm text-slate-600 leading-relaxed">
        {type === 'shipping' && (
          <>
            <p>Orders placed and verified via Paystack before 2:00 PM WAT within Lagos qualify for same-day dispatch.</p>
            <p>Orders above {formatNaira(settings.freeDeliveryThresholdNgn)} receive complimentary Lagos delivery. Standard Lagos delivery is {formatNaira(settings.lagosDeliveryFeeNgn)}, and insured interstate courier delivery across Nigeria is {formatNaira(settings.nationwideDeliveryFeeNgn)} (1–3 business days).</p>
          </>
        )}
        {type === 'returns' && (
          <>
            <p>Unopened, factory-sealed gadgets may be returned within 7 days of delivery for a full refund or exchange.</p>
            <p>Defective-on-arrival items are replaced immediately or refunded upon technical verification at our Lekki service desk.</p>
          </>
        )}
        {type === 'privacy' && (
          <>
            <p>{settings.storeName} collects only the contact and delivery information required to process your Paystack payment, coordinate courier delivery, and send order confirmation via WhatsApp.</p>
            <p>Card details are handled exclusively by Paystack's PCI-DSS certified servers and are never stored on our servers.</p>
          </>
        )}
        {type === 'terms' && (
          <>
            <p>All prices are displayed in Nigerian Naira (NGN ₦). Orders are confirmed only upon backend verification of your Paystack transaction.</p>
            <p>Manufacturer warranty terms apply to all smartphones, laptops, tablets, and accessories.</p>
          </>
        )}
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => (
  <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
    <p className="font-mono text-sm font-bold text-orange-600">404</p>
    <h1 className="font-display text-3xl font-bold text-slate-900">Page Not Found</h1>
    <p className="text-sm text-slate-600">
      The page or gadget URL you requested does not exist.
    </p>
    <button
      type="button"
      onClick={() => onNavigate('/')}
      className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
    >
      Back to Homepage
    </button>
  </div>
);
