import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  User,
  ShoppingBag,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatNaira } from '../../utils/format';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
}

const ACCESSORIES_LINKS = [
  { label: 'Tripods', path: '/category/tripods' },
  { label: 'Earpieces', path: '/category/earpieces' },
  { label: 'AirPods', path: '/category/airpods' },
  { label: 'Headphones', path: '/category/headphones' },
  { label: 'Chargers', path: '/category/chargers' },
  { label: 'Power Banks', path: '/category/power-banks' },
  { label: 'Smartwatches', path: '/category/smartwatches' },
  { label: 'Bluetooth Speakers', path: '/category/bluetooth-speakers' },
  { label: 'Phone Accessories', path: '/category/phone-accessories' },
  { label: 'Computer Accessories', path: '/category/computer-accessories' },
  { label: 'ITEL PowerGo', path: '/category/itel-powergo' },
  { label: 'Gadgets', path: '/category/other-electronic-gadgets' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate, onOpenSearch }) => {
  const { user, cartCount, setIsCartOpen, settings } = useStore();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccOpen, setMobileAccOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLink = (path: string) => {
    setAccOpen(false);
    setMobileOpen(false);
    onNavigate(path);
  };

  const navLinkClass = (path: string) =>
    `text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
      currentPath === path
        ? 'text-blue-700 border-blue-700'
        : 'text-slate-700 border-transparent hover:text-blue-700'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {!bannerDismissed && (
        <div className="bg-blue-950 text-white text-xs py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="truncate">
              Free Lagos delivery on orders over {formatNaira(settings.freeDeliveryThresholdNgn)} · Nationwide Paystack verified checkout
            </p>
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => handleLink('/track-order')}
                className="hidden sm:inline-flex items-center gap-1 text-sky-300 hover:text-white transition-colors whitespace-nowrap"
              >
                <Package className="w-3.5 h-3.5" />
                Track Order
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-slate-300 hover:text-white"
                aria-label="Dismiss announcement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 -ml-2 text-slate-700 hover:text-blue-700 rounded-lg"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/');
            }}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span className="text-blue-700">Zuri</span>Volt
          </a>
        </div>

        {/* Zone 2: Desktop Single-Line Navigation */}
        <nav className="hidden lg:flex items-center gap-5">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/');
            }}
            className={navLinkClass('/')}
          >
            Home
          </a>
          <a
            href="/category/new-arrivals"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/category/new-arrivals');
            }}
            className={navLinkClass('/category/new-arrivals')}
          >
            New Arrivals
          </a>
          <a
            href="/category/smartphones"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/category/smartphones');
            }}
            className={navLinkClass('/category/smartphones')}
          >
            Phones
          </a>
          <a
            href="/category/laptops"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/category/laptops')}
            }
            className={navLinkClass('/category/laptops')}
          >
            Laptops
          </a>
          <a
            href="/category/tablets"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/category/tablets');
            }}
            className={navLinkClass('/category/tablets')}
          >
            Tablets
          </a>

          {/* Accessories Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setAccOpen((prev) => !prev)}
              aria-expanded={accOpen}
              className={`inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                accOpen || currentPath.startsWith('/category/accessories')
                  ? 'text-blue-700 border-blue-700'
                  : 'text-slate-700 border-transparent hover:text-blue-700'
              }`}
            >
              Accessories
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${accOpen ? 'rotate-180' : ''}`} />
            </button>

            {accOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-2">
                  <span className="text-xs font-semibold text-slate-500">All Accessories</span>
                  <button
                    type="button"
                    onClick={() => handleLink('/category/accessories')}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {ACCESSORIES_LINKS.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleLink(item.path)}
                      className="text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-blue-700 rounded-lg transition-colors whitespace-nowrap truncate"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <a
            href="/deals"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/deals');
            }}
            className={navLinkClass('/deals')}
          >
            Deals & Offers
          </a>
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/about');
            }}
            className={navLinkClass('/about')}
          >
            About Us
          </a>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/contact');
            }}
            className={navLinkClass('/contact')}
          >
            Contact Us
          </a>
        </nav>

        {/* Zone 3: Functional Icons (Search, Account, Cart) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2.5 text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Search gadgets"
          >
            <Search className="w-5 h-5" />
          </button>

          {user && (user.role === 'admin' || user.role === 'super_admin') && (
            <button
              type="button"
              onClick={() => handleLink('/admin')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              Admin
            </button>
          )}

          <button
            type="button"
            onClick={() => handleLink(user ? '/account' : '/login')}
            className="p-2.5 text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1.5"
            aria-label={user ? 'Customer account' : 'Sign in'}
          >
            <User className="w-5 h-5" />
            {user && (
              <span className="hidden xl:inline text-xs font-medium text-slate-700 max-w-[90px] truncate">
                {user.fullName.split(' ')[0]}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Open shopping cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white max-h-[80vh] overflow-y-auto px-4 py-4 space-y-1">
          {[
            { label: 'Home', path: '/' },
            { label: 'New Arrivals', path: '/category/new-arrivals' },
            { label: 'Phones', path: '/category/smartphones' },
            { label: 'Laptops', path: '/category/laptops' },
            { label: 'Tablets', path: '/category/tablets' },
            { label: 'iPads', path: '/category/ipads' },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleLink(item.path)}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              {item.label}
            </button>
          ))}

          <div>
            <button
              type="button"
              onClick={() => setMobileAccOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              <span>Accessories</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileAccOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileAccOpen && (
              <div className="pl-4 py-1 space-y-1 border-l border-slate-200 ml-3">
                <button
                  type="button"
                  onClick={() => handleLink('/category/accessories')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-sky-50 rounded-lg"
                >
                  All Accessories
                </button>
                {ACCESSORIES_LINKS.map((sub) => (
                  <button
                    key={sub.path}
                    type="button"
                    onClick={() => handleLink(sub.path)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {[
            { label: 'Deals & Offers', path: '/deals' },
            { label: 'Track Order', path: '/track-order' },
            { label: 'About Us', path: '/about' },
            { label: 'Contact Us', path: '/contact' },
            ...(user && (user.role === 'admin' || user.role === 'super_admin')
              ? [{ label: 'Admin Dashboard', path: '/admin' }]
              : []),
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleLink(item.path)}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
