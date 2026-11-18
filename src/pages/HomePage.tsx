import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Headphones,
  CheckCircle2,
  CreditCard,
  Star,
  Mail,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Product } from '../types/ecommerce';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/product/ProductCard';
import { SafeImage } from '../components/common/SafeImage';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

interface HomeReview {
  id: string;
  productId: string;
  productName: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

const POPULAR_CATEGORIES = [
  { name: 'Smartphones', slug: 'smartphones', image: '/src/assets/images/cat_smartphones_1794983289053.jpg' },
  { name: 'Laptops', slug: 'laptops', image: '/src/assets/images/cat_laptops_1794983289786.jpg' },
  { name: 'Tablets', slug: 'tablets', image: '/src/assets/images/cat_tablets_ipads_1794983289786.jpg' },
  { name: 'Smartwatches', slug: 'smartwatches', image: '/src/assets/images/cat_smartwatches_1794983290592.jpg' },
  { name: 'Earphones', slug: 'earpieces', image: '/src/assets/images/cat_audio_airpods_1794983288924.jpg' },
  { name: 'Accessories', slug: 'accessories', image: '/src/assets/images/cat_tripods_speakers_1794983291055.jpg' },
  { name: 'Power Banks', slug: 'power-banks', image: '/src/assets/images/cat_power_banks_1794983289457.jpg' },
  { name: 'Tripods', slug: 'tripods', image: '/src/assets/images/cat_tripods_speakers_1794983291055.jpg' },
];

type ShowcaseTab = 'new_arrivals' | 'best_sellers' | 'featured' | 'trending' | 'recommended';

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { showToast } = useStore();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('featured');
  const [tabProducts, setTabProducts] = useState<Product[]>([]);
  const [dealsProducts, setDealsProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<HomeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [newRes, dealsRes, revRes] = await Promise.all([
          apiRequest<{ items: Product[] }>('/products?sort=newest&limit=4'),
          apiRequest<{ items: Product[] }>('/products?section=deals&limit=4'),
          apiRequest<HomeReview[]>('/reviews/recent'),
        ]);
        if (!active) return;
        setNewArrivals(newRes.items);
        setDealsProducts(dealsRes.items);
        setReviews(revRes);
      } catch {
        // handled cleanly
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const query =
          activeTab === 'new_arrivals'
            ? '/products?sort=newest&limit=8'
            : `/products?section=${activeTab}&limit=8`;
        const res = await apiRequest<{ items: Product[] }>(query);
        if (active) setTabProducts(res.items);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [activeTab]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail }),
      });
      showToast(res.message, 'success');
      setNewsletterEmail('');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <div className="bg-white">
      {/* A. HERO SECTION */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50/60 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wide text-orange-600 mb-3">
              Special Launch Offer · Use code ZURIVOLT5 for 5% off via Paystack
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.1] text-balance">
              Authentic Gadgets Built for Work and Everyday Life.
            </h1>
            <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-xl">
              Shop factory-sealed smartphones, MacBooks, iPads, ITEL PowerGo stations, and audio accessories anywhere in Nigeria with verified Paystack checkout and instant WhatsApp order confirmation.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onNavigate('/category/all')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm transition-colors whitespace-nowrap"
              >
                Shop Now
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/deals')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-blue-800 bg-white border border-blue-200 hover:border-blue-400 hover:bg-sky-50 rounded-xl transition-colors whitespace-nowrap"
              >
                Explore Products
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-left">
              <div>
                <p className="text-lg font-bold text-slate-900 tabular-nums">100%</p>
                <p className="text-xs text-slate-500">Original Warranty</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 tabular-nums">24h</p>
                <p className="text-xs text-slate-500">Lagos Dispatch</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 tabular-nums">36 States</p>
                <p className="text-xs text-slate-500">Insured Delivery</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="h-full min-h-[300px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
              <SafeImage
                src="/src/assets/images/hero_gadgets_showcase_1794983287261.jpg"
                alt="Flagship smartphone, laptop, wireless headphones, and smartwatch showcase"
                loading="eager"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* B. POPULAR CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Popular Categories
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Explore verified electronics organized by device and accessory type.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/category/all')}
            className="text-sm font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
          >
            View all products
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {POPULAR_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onNavigate(`/category/${cat.slug}`)}
              className="group text-left bg-white border border-slate-200 hover:border-blue-400 rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-slate-50 overflow-hidden">
                <SafeImage
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                  {cat.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* C/D/E/G/H. CURATED COLLECTIONS: FEATURED, BEST SELLERS, NEW ARRIVALS, TRENDING, RECOMMENDED */}
      <section className="bg-slate-50/70 border-y border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Curated Storefront Picks
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Switch collections to browse featured devices, best sellers, trending tech, and recommended gear.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
              {(
                [
                  { id: 'featured', label: 'Featured' },
                  { id: 'best_sellers', label: 'Best Sellers' },
                  { id: 'new_arrivals', label: 'New Arrivals' },
                  { id: 'trending', label: 'Trending' },
                  { id: 'recommended', label: 'Recommended' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 rounded-xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tabProducts.map((product) => (
                <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* F. SPECIAL OFFERS & NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-14">
        <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-sky-700 text-white p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8">
            <p className="text-xs font-semibold text-orange-300 mb-2">
              Limited-Time Naira Markdowns
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-balance">
              Save Up to 18% on Power Stations, Laptops & Audio Bundles
            </h2>
            <p className="mt-2 text-sm text-sky-100 max-w-2xl">
              Every discounted gadget ships with full official warranty, verified Paystack checkout, and instant WhatsApp support.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <button
              type="button"
              onClick={() => onNavigate('/deals')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors whitespace-nowrap"
            >
              Shop Special Offers
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-900">Special Offers</h3>
              <p className="text-sm text-slate-500 mt-1">
                Verified price reductions with transparent original pricing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/deals')}
              className="text-sm font-semibold text-blue-700 hover:underline whitespace-nowrap"
            >
              All deals
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dealsProducts.map((product) => (
              <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-900">Just Landed · New Arrivals</h3>
              <p className="text-sm text-slate-500 mt-1">
                Recently stocked inventory synced live from our Lagos warehouse.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/category/new-arrivals')}
              className="text-sm font-semibold text-blue-700 hover:underline whitespace-nowrap"
            >
              View new arrivals
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </section>

      {/* I. VERIFIED CUSTOMER REVIEWS */}
      {reviews.length > 0 && (
        <section className="bg-slate-50 border-y border-slate-200 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Verified Customer Reviews
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Reviews submitted exclusively by customers with completed, verified orders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rev.rating
                                ? 'fill-orange-400 text-orange-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    {rev.title && (
                      <h4 className="text-sm font-semibold text-slate-900 mb-1.5">{rev.title}</h4>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed">"{rev.comment}"</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{rev.authorName}</span>
                    <span className="truncate">{rev.productName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* J. TRUST SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            {
              icon: CreditCard,
              title: 'Secure Paystack Payments',
              desc: 'Bank-grade encrypted card, transfer, and USSD checkout verified server-side.',
            },
            {
              icon: ShieldCheck,
              title: 'Quality Gadgets',
              desc: '100% factory-sealed authentic hardware with manufacturer warranty.',
            },
            {
              icon: Headphones,
              title: 'Customer Support',
              desc: 'Direct post-checkout WhatsApp confirmation and responsive Nigerian support.',
            },
            {
              icon: Truck,
              title: 'Reliable Delivery',
              desc: 'Same-day Lagos dispatch and tracked nationwide delivery to all 36 states.',
            },
            {
              icon: CheckCircle2,
              title: 'Easy Ordering',
              desc: 'Guest checkout or saved customer account with real-time order tracking.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="p-5 rounded-xl border border-slate-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-blue-700 flex items-center justify-center mb-3.5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* K. NEWSLETTER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-800 mb-2">
              <Mail className="w-4 h-4" />
              Restock Alerts & Exclusive Deals
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Get Naira Price Drops & New Arrival Alerts
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Join Nigerian tech shoppers receiving early access to flagship launches and coupon drops.
            </p>
          </div>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="px-4 py-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[260px]"
            />
            <button
              type="submit"
              disabled={newsletterSubmitting}
              className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {newsletterSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
