import React from 'react';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { buildGeneralWhatsAppUrl } from '../../utils/whatsapp';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings } = useStore();
  const whatsappUrl = buildGeneralWhatsAppUrl(
    settings.whatsappNumber,
    `Hello ${settings.storeName}, I would like to inquire about a gadget.`
  );

  const linkBtn = (label: string, path: string) => (
    <button
      key={path}
      type="button"
      onClick={() => onNavigate(path)}
      className="text-sm text-slate-600 hover:text-blue-700 transition-colors text-left"
    >
      {label}
    </button>
  );

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
            <span className="text-blue-700">Zuri</span>Volt
          </span>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Authentic smartphones, laptops, tablets, power solutions, and audio accessories across Nigeria — backed by official warranties, Paystack security, and verified dispatch.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Chat on WhatsApp
          </a>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Quick Links</h4>
          <div className="flex flex-col gap-2.5">
            {linkBtn('Home', '/')}
            {linkBtn('New Arrivals', '/category/new-arrivals')}
            {linkBtn('Deals & Offers', '/deals')}
            {linkBtn('Track Your Order', '/track-order')}
            {linkBtn('About Us', '/about')}
            {linkBtn('Contact Us', '/contact')}
            {linkBtn('Admin Portal', '/admin')}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Categories</h4>
          <div className="flex flex-col gap-2.5">
            {linkBtn('Smartphones', '/category/smartphones')}
            {linkBtn('Laptops', '/category/laptops')}
            {linkBtn('Tablets & iPads', '/category/ipads')}
            {linkBtn('Power Banks & ITEL PowerGo', '/category/power-banks')}
            {linkBtn('AirPods & Headphones', '/category/airpods')}
            {linkBtn('Smartwatches', '/category/smartwatches')}
            {linkBtn('Tripods & Speakers', '/category/tripods')}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Contact & Policies</h4>
          <div className="space-y-3 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>{settings.storeAddress}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-700 shrink-0" />
              <span>{settings.supportPhone}</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-700 shrink-0" />
              <span>{settings.supportEmail}</span>
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            <a href={settings.instagramUrl || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">
              Instagram
            </a>
            <a href={settings.twitterUrl || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">
              X / Twitter
            </a>
            <a href={settings.facebookUrl || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">
              Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => onNavigate('/policy/privacy')} className="hover:text-blue-700">
              Privacy Policy
            </button>
            <button type="button" onClick={() => onNavigate('/policy/terms')} className="hover:text-blue-700">
              Terms & Conditions
            </button>
            <button type="button" onClick={() => onNavigate('/policy/shipping')} className="hover:text-blue-700">
              Shipping & Delivery
            </button>
            <button type="button" onClick={() => onNavigate('/policy/returns')} className="hover:text-blue-700">
              Return & Refund Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
