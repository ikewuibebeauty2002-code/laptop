import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Product } from '../types/ecommerce';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/product/ProductCard';

interface CatalogPageProps {
  mode: 'category' | 'deals' | 'search';
  categorySlug?: string;
  searchQuery?: string;
  onNavigate: (path: string) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  mode,
  categorySlug = 'all',
  searchQuery = '',
  onNavigate,
}) => {
  const { categories } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(categorySlug);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory(categorySlug);
    setPage(1);
  }, [categorySlug, mode, searchQuery]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (mode === 'deals') params.set('section', 'deals');
        if (mode === 'search' && searchQuery) params.set('search', searchQuery);
        if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
        if (selectedBrand !== 'all') params.set('brand', selectedBrand);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (inStockOnly) params.set('inStock', 'true');
        params.set('sort', sort);
        params.set('page', String(page));
        params.set('limit', '12');

        const res = await apiRequest<{
          items: Product[];
          total: number;
          totalPages: number;
          brands: string[];
        }>(`/products?${params.toString()}`);

        if (!active) return;
        setProducts(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setBrands(res.brands);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [mode, searchQuery, selectedCategory, selectedBrand, minPrice, maxPrice, inStockOnly, sort, page]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const title =
    mode === 'deals'
      ? 'Deals & Special Offers'
      : mode === 'search'
        ? `Search Results for "${searchQuery}"`
        : activeCategoryObj?.name || (selectedCategory === 'all' ? 'All Electronics & Gadgets' : selectedCategory);

  const description =
    mode === 'deals'
      ? 'Exclusive price reductions across smartphones, laptops, power banks, and audio accessories.'
      : mode === 'search'
        ? `${total} product(s) matched your search across names, brands, and specifications.`
        : activeCategoryObj?.description ||
          'Browse our complete catalog of verified gadgets available for nationwide delivery in Nigeria.';

  const resetFilters = () => {
    setSelectedCategory(mode === 'category' ? categorySlug : 'all');
    setSelectedBrand('all');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSort('newest');
    setPage(1);
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-slate-900 mb-2.5">Category</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setPage(1);
            }}
            className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-700 text-white font-semibold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.slug);
                setPage(1);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                selectedCategory === cat.slug
                  ? 'bg-blue-700 text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">{cat.parentId ? `— ${cat.name}` : cat.name}</span>
              {typeof cat.productCount === 'number' && (
                <span className="text-[11px] opacity-75 tabular-nums">{cat.productCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-900 mb-2.5">Brand</h3>
        <select
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-900 mb-2.5">Price Range (NGN ₦)</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min ₦"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums"
          />
          <input
            type="number"
            min="0"
            placeholder="Max ₦"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
          />
          In stock only
        </label>
      </div>

      <button
        type="button"
        onClick={resetFilters}
        className="w-full py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">{description}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort products"
            className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="newest">Newest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="best_selling">Best Selling</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 p-5 bg-white border border-slate-200 rounded-xl">
            {filterPanel}
          </div>
        </aside>

        <main className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 border border-slate-200 rounded-xl text-center bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">No matching products found</h3>
              <p className="text-sm text-slate-600 mt-1">
                Try clearing your price range, brand filter, or search keywords.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-medium text-slate-600 px-3 tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Filter Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative w-80 max-w-full bg-white h-full p-5 overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h2 className="font-display font-bold text-slate-900">Filter Products</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
};
