import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { Product } from '../../types/ecommerce';
import { formatNaira } from '../../utils/format';
import { SafeImage } from '../common/SafeImage';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiRequest<{ items: Product[] }>(
          `/products?search=${encodeURIComponent(trimmed)}&limit=6`
        );
        setResults(res.items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onClose();
    onNavigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10">
        <form onSubmit={submitSearch} className="flex items-center px-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-blue-700 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search iPhone, MacBook, ITEL PowerGo, AirPods, specs..."
            className="w-full px-3.5 py-4 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </form>

        <div className="max-h-96 overflow-y-auto p-4">
          {!query.trim() ? (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2.5">Popular Searches</p>
              <div className="flex flex-wrap gap-2">
                {['iPhone 16', 'MacBook', 'ITEL PowerGo', 'AirPods', 'Power Bank', 'Tripod', 'Smartwatch'].map(
                  (term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-sky-50 hover:text-blue-700 text-slate-700 rounded-lg transition-colors"
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Searching catalog...</p>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-slate-800">No gadgets found matching "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching by brand (Apple, Samsung, ITEL, Anker) or category.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((prod) => {
                const img = prod.images.find((i) => i.isPrimary)?.imageUrl || prod.images[0]?.imageUrl;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate(`/product/${prod.slug}`);
                    }}
                    className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      <SafeImage src={img} alt={prod.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-xs text-slate-500">
                        {prod.brand} · {prod.categoryName}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-blue-700 tabular-nums shrink-0">
                      {formatNaira(prod.priceNgn)}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={submitSearch}
                className="w-full mt-2 py-2.5 text-xs font-semibold text-blue-700 hover:bg-sky-50 rounded-lg inline-flex items-center justify-center gap-1"
              >
                See all results for "{query}"
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
