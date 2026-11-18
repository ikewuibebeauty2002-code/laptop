import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Upload,
  Download,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useStore } from '../context/StoreContext';
import {
  Category,
  Coupon,
  Order,
  OrderStatus,
  PaymentRecord,
  Product,
  Review,
} from '../types/ecommerce';
import { formatNaira, formatDateShort } from '../utils/format';
import { SafeImage } from '../components/common/SafeImage';

interface AdminDashboardPageProps {
  onNavigate: (path: string) => void;
}

interface AdminOverview {
  stats: {
    totalSalesNgn: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalCustomers: number;
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  recentOrders: Order[];
  salesByCategory: Array<{ category: string; revenue: number; units: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    priceNgn: number;
    salesCount: number;
    stockAvailable: number;
  }>;
  dailySales: Array<{ date: string; revenue: number; orders: number }>;
}

interface AdminCustomer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  createdAt: string;
  orderCount: number;
  totalSpentNgn: number;
}

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'payments'
  | 'customers'
  | 'reviews_coupons'
  | 'reports_settings';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, authLoading, settings, refreshSettings, refreshCategories, showToast } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Order & Customer search/filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<{
    customer: AdminCustomer;
    orders: Order[];
  } | null>(null);

  // Product Form Modal State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [prodForm, setProdForm] = useState({
    name: '',
    brand: 'ZuriVolt',
    sku: '',
    categoryId: '',
    subcategoryId: '',
    priceNgn: '',
    compareAtPriceNgn: '',
    stockAvailable: '10',
    lowStockThreshold: '5',
    shortDescription: '',
    description: '',
    colorsText: '',
    images: [] as string[],
    specsText: 'Display: \nBattery: \nWarranty: 1 Year',
    variants: [] as Array<{ name: string; color: string; priceNgn: number; stockQty: number }>,
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isRecommended: false,
    isPublished: true,
  });
  const [uploadingImg, setUploadingImg] = useState(false);

  // Category Form
  const [catForm, setCatForm] = useState({
    id: '',
    name: '',
    description: '',
    imageUrl: '',
    parentId: '',
  });

  // Coupon Form
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '10',
    minOrderNgn: '50000',
  });

  // Settings Form
  const [settingsForm, setSettingsForm] = useState(settings);
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const isAuthorizedAdmin = Boolean(user && (user.role === 'admin' || user.role === 'super_admin'));

  const loadAllAdminData = async () => {
    try {
      const [ov, prods, cats, ords, pays, custs, revs, coups] = await Promise.all([
        apiRequest<AdminOverview>('/admin/overview'),
        apiRequest<Product[]>('/admin/products'),
        apiRequest<Category[]>('/admin/categories'),
        apiRequest<Order[]>('/admin/orders'),
        apiRequest<PaymentRecord[]>('/admin/payments'),
        apiRequest<AdminCustomer[]>('/admin/customers'),
        apiRequest<Review[]>('/admin/reviews'),
        apiRequest<Coupon[]>('/admin/coupons'),
      ]);
      setOverview(ov);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      setPayments(pays);
      setCustomers(custs);
      setReviews(revs);
      setCoupons(coups);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadAllAdminData();
    }
  }, [isAuthorizedAdmin]);

  if (authLoading) {
    return (
      <div className="p-16 text-center text-sm text-slate-500">
        Verifying administrator session...
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Administrator Access Required
        </h1>
        <p className="text-sm text-slate-600">
          This area is protected by server-side role verification. Please sign in with an authorized administrator account.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            Sign In as Admin
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (files: FileList | null, target: 'product' | 'category') => {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await apiRequest<{ url: string }>('/admin/upload', {
          method: 'POST',
          body: fd,
        });
        if (target === 'product') {
          setProdForm((prev) => ({ ...prev, images: [...prev.images, res.url] }));
        } else {
          setCatForm((prev) => ({ ...prev, imageUrl: res.url }));
        }
      }
      showToast('Image uploaded successfully.', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  const openAddProduct = () => {
    setEditingProductId(null);
    setProdForm({
      name: '',
      brand: 'Apple',
      sku: '',
      categoryId: categories.find((c) => !c.parentId)?.id || '',
      subcategoryId: '',
      priceNgn: '',
      compareAtPriceNgn: '',
      stockAvailable: '10',
      lowStockThreshold: '5',
      shortDescription: '',
      description: '',
      colorsText: 'Black, Silver',
      images: ['/src/assets/images/cat_smartphones_1794983289053.jpg'],
      specsText: 'Warranty: 1 Year Official Warranty\nCondition: Factory Sealed New',
      variants: [],
      isFeatured: false,
      isBestSeller: false,
      isTrending: false,
      isRecommended: false,
      isPublished: true,
    });
    setShowProductForm(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProdForm({
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      categoryId: p.categoryId || '',
      subcategoryId: p.subcategoryId || '',
      priceNgn: String(p.priceNgn),
      compareAtPriceNgn: p.compareAtPriceNgn ? String(p.compareAtPriceNgn) : '',
      stockAvailable: String(p.stockAvailable),
      lowStockThreshold: String(p.lowStockThreshold),
      shortDescription: p.shortDescription,
      description: p.description,
      colorsText: p.availableColors.join(', '),
      images: p.images.map((i) => i.imageUrl),
      specsText: Object.entries(p.specifications)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
      variants: p.variants.map((v) => ({
        name: v.name,
        color: v.color,
        priceNgn: v.priceNgn,
        stockQty: v.stockQty,
      })),
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isTrending: p.isTrending,
      isRecommended: p.isRecommended,
      isPublished: p.isPublished,
    });
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const specifications: Record<string, string> = {};
    prodForm.specsText.split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        specifications[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });

    const payload = {
      name: prodForm.name,
      brand: prodForm.brand,
      sku: prodForm.sku,
      categoryId: prodForm.categoryId || null,
      subcategoryId: prodForm.subcategoryId || null,
      priceNgn: Number(prodForm.priceNgn),
      compareAtPriceNgn: prodForm.compareAtPriceNgn ? Number(prodForm.compareAtPriceNgn) : null,
      stockAvailable: Number(prodForm.stockAvailable),
      lowStockThreshold: Number(prodForm.lowStockThreshold),
      shortDescription: prodForm.shortDescription,
      description: prodForm.description,
      availableColors: prodForm.colorsText
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      images: prodForm.images,
      specifications,
      variants: prodForm.variants,
      isFeatured: prodForm.isFeatured,
      isBestSeller: prodForm.isBestSeller,
      isTrending: prodForm.isTrending,
      isRecommended: prodForm.isRecommended,
      isPublished: prodForm.isPublished,
    };

    try {
      if (editingProductId) {
        await apiRequest(`/admin/products/${editingProductId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Product updated.', 'success');
      } else {
        await apiRequest('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Product created and published to catalog.', 'success');
      }
      setShowProductForm(false);
      await loadAllAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
    showToast('Product deleted.', 'info');
    loadAllAdminData();
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        await apiRequest(`/admin/categories/${catForm.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...catForm, parentId: catForm.parentId || null, isActive: true }),
        });
        showToast('Category updated.', 'success');
      } else {
        await apiRequest('/admin/categories', {
          method: 'POST',
          body: JSON.stringify({ ...catForm, parentId: catForm.parentId || null }),
        });
        showToast('Category created.', 'success');
      }
      setCatForm({ id: '', name: '', description: '', imageUrl: '', parentId: '' });
      await Promise.all([loadAllAdminData(), refreshCategories()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
    showToast('Category deleted.', 'info');
    await Promise.all([loadAllAdminData(), refreshCategories()]);
  };

  const handleUpdateOrderStatus = async (orderId: string, orderStatus: OrderStatus) => {
    try {
      await apiRequest(`/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ orderStatus }),
      });
      showToast(`Order status updated to ${orderStatus.replace(/_/g, ' ')}.`, 'success');
      await loadAllAdminData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus } : null));
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const exportSalesCsv = () => {
    const header = ['Order Number', 'Date', 'Customer', 'Email', 'State', 'Total NGN', 'Payment Status', 'Order Status', 'Paystack Ref'];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.createdAt,
      `"${o.customerName}"`,
      o.customerEmail,
      o.deliveryState,
      o.totalNgn,
      o.paymentStatus,
      o.orderStatus,
      o.paystackReference || '',
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zurivolt-orders-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
    const q = orderSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      (o.paystackReference || '').toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    return !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => Boolean(c.parentId));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-200 shrink-0 p-4 flex flex-col">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <p className="font-display text-lg font-bold text-white">ZuriVolt Admin</p>
            <p className="text-[11px] text-sky-300 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
            title="Back to Storefront"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {(
            [
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'products', label: 'Products & Stock', icon: Package },
              { id: 'categories', label: 'Categories', icon: FolderTree },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'reviews_coupons', label: 'Reviews & Coupons', icon: MessageSquare },
              { id: 'reports_settings', label: 'Reports & Settings', icon: BarChart3 },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  tab === item.id
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block mt-auto pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full py-2 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 rounded-lg"
          >
            View Live Storefront
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full overflow-x-hidden">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && overview && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">Store Overview</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time sales, order fulfilment, and warehouse inventory health.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddProduct}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Verified Sales', value: formatNaira(overview.stats.totalSalesNgn), accent: 'text-green-700' },
                { label: 'Total Orders', value: overview.stats.totalOrders, accent: 'text-slate-900' },
                { label: 'Pending Fulfilment', value: overview.stats.pendingOrders, accent: 'text-orange-600' },
                { label: 'Completed Orders', value: overview.stats.completedOrders, accent: 'text-blue-700' },
                { label: 'Registered Customers', value: overview.stats.totalCustomers, accent: 'text-slate-900' },
                { label: 'Total Products', value: overview.stats.totalProducts, accent: 'text-slate-900' },
                { label: 'Low Stock Alerts', value: overview.stats.lowStockProducts, accent: 'text-orange-600' },
                { label: 'Out of Stock', value: overview.stats.outOfStockProducts, accent: 'text-red-600' },
              ].map((stat) => (
                <div key={stat.label} className="p-4 bg-white border border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1.5 tabular-nums ${stat.accent}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
                  <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Manage all
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Order</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Payment</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.recentOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">{ord.orderNumber}</td>
                          <td className="px-4 py-3 text-slate-700">{ord.customerName}</td>
                          <td className="px-4 py-3 font-semibold uppercase text-green-700">{ord.paymentStatus}</td>
                          <td className="px-4 py-3 capitalize text-slate-700">{ord.orderStatus.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">{formatNaira(ord.totalNgn)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Best-Selling Products</h2>
                <div className="space-y-3">
                  {overview.topProducts.map((tp) => (
                    <div key={tp.id} className="flex items-center justify-between gap-2 text-xs pb-2.5 border-b border-slate-100 last:border-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{tp.name}</p>
                        <p className="text-slate-500 tabular-nums">
                          {tp.salesCount} sold · {tp.stockAvailable} in stock
                        </p>
                      </div>
                      <span className="font-bold text-blue-700 tabular-nums shrink-0">
                        {formatNaira(tp.priceNgn)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS & INVENTORY TAB */}
        {tab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">Product & Inventory Management</h1>
                <p className="text-xs text-slate-500">Add, edit, publish/unpublish products, upload photos, and track stock alerts.</p>
              </div>
              <button
                type="button"
                onClick={openAddProduct}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Add New Product
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={handleSaveProduct} className="p-6 bg-white border border-slate-200 rounded-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    {editingProductId ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowProductForm(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={prodForm.name}
                      onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Brand *</label>
                    <input
                      type="text"
                      required
                      value={prodForm.brand}
                      onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">SKU (auto if blank)</label>
                    <input
                      type="text"
                      value={prodForm.sku}
                      onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Main Category</label>
                    <select
                      value={prodForm.categoryId}
                      onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="">Select category</option>
                      {mainCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategory</label>
                    <select
                      value={prodForm.subcategoryId}
                      onChange={(e) => setProdForm({ ...prodForm, subcategoryId: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="">None</option>
                      {subCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₦) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={prodForm.priceNgn}
                      onChange={(e) => setProdForm({ ...prodForm, priceNgn: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Original Price (₦ if discounted)</label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.compareAtPriceNgn}
                      onChange={(e) => setProdForm({ ...prodForm, compareAtPriceNgn: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Available *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={prodForm.stockAvailable}
                      onChange={(e) => setProdForm({ ...prodForm, stockAvailable: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.lowStockThreshold}
                      onChange={(e) => setProdForm({ ...prodForm, lowStockThreshold: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Colours (comma-separated)</label>
                    <input
                      type="text"
                      value={prodForm.colorsText}
                      onChange={(e) => setProdForm({ ...prodForm, colorsText: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description</label>
                  <input
                    type="text"
                    value={prodForm.shortDescription}
                    onChange={(e) => setProdForm({ ...prodForm, shortDescription: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Description</label>
                    <textarea
                      rows={4}
                      value={prodForm.description}
                      onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Specifications (Key: Value per line)</label>
                    <textarea
                      rows={4}
                      value={prodForm.specsText}
                      onChange={(e) => setProdForm({ ...prodForm, specsText: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Image Uploader */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Product Images</label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-sky-50 border border-sky-200 rounded-lg cursor-pointer hover:bg-sky-100">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImg ? 'Uploading...' : 'Upload Image(s)'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files, 'product')}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {prodForm.images.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                        <SafeImage src={url} alt={`Product ${idx + 1}`} />
                        <button
                          type="button"
                          onClick={() =>
                            setProdForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute top-1 right-1 bg-white/90 text-red-600 rounded p-0.5 text-[10px] font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-5 pt-2">
                  {[
                    { key: 'isPublished', label: 'Published (Live)' },
                    { key: 'isFeatured', label: 'Featured' },
                    { key: 'isBestSeller', label: 'Best Seller' },
                    { key: 'isTrending', label: 'Trending' },
                    { key: 'isRecommended', label: 'Recommended' },
                  ].map((flag) => (
                    <label key={flag.key} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(prodForm[flag.key as keyof typeof prodForm])}
                        onChange={(e) =>
                          setProdForm({ ...prodForm, [flag.key]: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-700"
                      />
                      {flag.label}
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProductForm(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                  >
                    {editingProductId ? 'Save Product Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Price (₦)</th>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const img = p.images.find((i) => i.isPrimary)?.imageUrl || p.images[0]?.imageUrl;
                      const isLow = p.stockAvailable > 0 && p.stockAvailable <= p.lowStockThreshold;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                <SafeImage src={img} alt={p.name} />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{p.name}</p>
                                <p className="text-[11px] font-mono text-slate-500">{p.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.subcategoryName || p.categoryName || 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums">{formatNaira(p.priceNgn)}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {p.stockAvailable === 0 ? (
                              <span className="text-red-600 font-semibold">Out of Stock (0)</span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {p.stockAvailable} (Low)
                              </span>
                            ) : (
                              <span className="text-green-700 font-semibold">{p.stockAvailable} units</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={p.isPublished ? 'text-green-700 font-semibold' : 'text-slate-400'}>
                              {p.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditProduct(p)}
                              className="p-1.5 text-blue-700 hover:bg-sky-50 rounded"
                              aria-label="Edit product"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              aria-label="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {tab === 'categories' && (
          <div className="space-y-6">
            <h1 className="font-display text-2xl font-bold text-slate-900">Categories & Subcategories</h1>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form onSubmit={handleSaveCategory} className="lg:col-span-4 p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                <h2 className="font-display text-base font-bold text-slate-900">
                  {catForm.id ? 'Edit Category' : 'Create Category / Subcategory'}
                </h2>
                <input
                  type="text"
                  required
                  placeholder="Category Name"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <select
                  value={catForm.parentId}
                  onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">Main Category (No Parent)</option>
                  {mainCategories.map((mc) => (
                    <option key={mc.id} value={mc.id}>Subcategory under: {mc.name}</option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  placeholder="Short description"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-sky-50 border border-sky-200 rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Category Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files, 'category')}
                    />
                  </label>
                  {catForm.imageUrl && (
                    <span className="text-xs text-green-700 font-medium truncate">Image ready</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                  >
                    {catForm.id ? 'Update Category' : 'Save Category'}
                  </button>
                  {catForm.id && (
                    <button
                      type="button"
                      onClick={() => setCatForm({ id: '', name: '', description: '', imageUrl: '', parentId: '' })}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Slug</th>
                      <th className="px-4 py-3 font-semibold">Products</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {cat.parentId ? `↳ ${cat.name}` : cat.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">{cat.slug}</td>
                        <td className="px-4 py-3 tabular-nums">{cat.productCount ?? 0}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCatForm({
                                id: cat.id,
                                name: cat.name,
                                description: cat.description,
                                imageUrl: cat.imageUrl,
                                parentId: cat.parentId || '',
                              })
                            }
                            className="text-blue-700 hover:underline font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-red-600 hover:underline font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-display text-2xl font-bold text-slate-900">Order & Fulfilment Management</h1>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search order #, customer, ref..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="all">All Statuses</option>
                  {['pending_payment', 'paid', 'processing', 'ready_for_delivery', 'shipped', 'delivered', 'cancelled', 'refunded'].map(
                    (st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Order #</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Location</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                      <th className="px-4 py-3 font-semibold">Fulfilment Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                      <th className="px-4 py-3 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{ord.customerName}</p>
                          <p className="text-slate-500">{ord.customerWhatsapp}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{ord.deliveryCity}, {ord.deliveryState}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold uppercase ${ord.paymentStatus === 'paid' ? 'text-green-700' : 'text-orange-600'}`}>
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={ord.orderStatus}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                          >
                            {['pending_payment', 'paid', 'processing', 'ready_for_delivery', 'shipped', 'delivered', 'cancelled', 'refunded'].map(
                              (st) => (
                                <option key={st} value={st}>
                                  {st.replace(/_/g, ' ')}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">{formatNaira(ord.totalNgn)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="text-blue-700 font-semibold hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedOrder && (
              <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Order {selectedOrder.orderNumber}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Paystack Ref: {selectedOrder.paystackReference || 'N/A'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs font-semibold text-slate-500"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                    <p><strong>Email:</strong> {selectedOrder.customerEmail}</p>
                    <p><strong>Phone:</strong> {selectedOrder.customerPhone} · <strong>WhatsApp:</strong> {selectedOrder.customerWhatsapp}</p>
                  </div>
                  <div>
                    <p><strong>Address:</strong> {selectedOrder.deliveryAddress}</p>
                    <p><strong>City / State:</strong> {selectedOrder.deliveryCity}, {selectedOrder.deliveryState}</p>
                    {selectedOrder.deliveryNotes && <p><strong>Notes:</strong> {selectedOrder.deliveryNotes}</p>}
                  </div>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="px-4 py-2.5 flex justify-between">
                      <span>{it.productName} × {it.quantity}</span>
                      <span className="font-bold tabular-nums">{formatNaira(it.lineTotalNgn)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {tab === 'payments' && (
          <div className="space-y-6">
            <h1 className="font-display text-2xl font-bold text-slate-900">Verified Payment Records</h1>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Paystack Reference</th>
                      <th className="px-4 py-3 font-semibold">Order #</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((py) => (
                      <tr key={py.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-900">{py.paystackReference}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{py.orderNumber}</td>
                        <td className="px-4 py-3">{py.customerName}</td>
                        <td className="px-4 py-3 uppercase text-slate-600">{py.channel}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold uppercase ${py.status === 'success' ? 'text-green-700' : 'text-orange-600'}`}>
                            {py.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDateShort(py.verifiedAt || py.createdAt)}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatNaira(py.amountKobo / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {tab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-display text-2xl font-bold text-slate-900">Customer Directory</h1>
              <input
                type="text"
                placeholder="Search customer name or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone / WhatsApp</th>
                    <th className="px-4 py-3 font-semibold">Orders</th>
                    <th className="px-4 py-3 font-semibold text-right">Total Spend</th>
                    <th className="px-4 py-3 font-semibold text-right">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{c.email}</td>
                      <td className="px-4 py-3 text-slate-600">{c.phone || c.whatsappNumber || '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{c.orderCount}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{formatNaira(c.totalSpentNgn)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            const ords = await apiRequest<Order[]>(`/admin/customers/${c.id}/orders`);
                            setSelectedCustomerOrders({ customer: c, orders: ords });
                          }}
                          className="text-blue-700 font-semibold hover:underline"
                        >
                          View Orders
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedCustomerOrders && (
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-900">
                    Orders for {selectedCustomerOrders.customer.fullName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerOrders(null)}
                    className="text-xs text-slate-500"
                  >
                    Close
                  </button>
                </div>
                {selectedCustomerOrders.orders.length === 0 ? (
                  <p className="text-xs text-slate-500">No orders placed by this customer yet.</p>
                ) : (
                  selectedCustomerOrders.orders.map((o) => (
                    <div key={o.id} className="p-3 bg-slate-50 rounded-lg flex justify-between text-xs">
                      <span className="font-mono font-semibold">{o.orderNumber}</span>
                      <span>{o.orderStatus}</span>
                      <span className="font-bold tabular-nums">{formatNaira(o.totalNgn)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* REVIEWS & COUPONS TAB */}
        {tab === 'reviews_coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900">Review Moderation</h2>
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">
                        {rev.authorName} · {rev.productName} ({rev.rating}★)
                      </span>
                      <span className="uppercase font-semibold text-blue-700">{rev.status}</span>
                    </div>
                    <p className="text-slate-600">{rev.comment}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await apiRequest(`/admin/reviews/${rev.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: 'approved' }),
                          });
                          loadAllAdminData();
                        }}
                        className="px-2.5 py-1 font-semibold bg-green-50 text-green-700 border border-green-200 rounded"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiRequest(`/admin/reviews/${rev.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: 'rejected' }),
                          });
                          loadAllAdminData();
                        }}
                        className="px-2.5 py-1 font-semibold bg-red-50 text-red-700 border border-red-200 rounded"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900">Discount Coupons</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiRequest('/admin/coupons', {
                    method: 'POST',
                    body: JSON.stringify(couponForm),
                  });
                  setCouponForm({ code: '', discountType: 'percent', discountValue: '10', minOrderNgn: '50000' });
                  showToast('Coupon created.', 'success');
                  loadAllAdminData();
                }}
                className="p-4 bg-white border border-slate-200 rounded-xl space-y-3"
              >
                <input
                  type="text"
                  required
                  placeholder="Coupon Code (e.g. NAIJA10)"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as 'percent' | 'fixed' })}
                    className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (₦)</option>
                  </select>
                  <input
                    type="number"
                    required
                    placeholder="Value"
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg"
                >
                  Create Coupon
                </button>
              </form>

              <div className="space-y-2">
                {coupons.map((cp) => (
                  <div key={cp.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-mono font-bold text-slate-900">{cp.code}</p>
                      <p className="text-slate-500">
                        {cp.discountType === 'percent' ? `${cp.discountValue}% off` : `${formatNaira(cp.discountValue)} off`} · Used {cp.usedCount} times
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiRequest(`/admin/coupons/${cp.id}`, { method: 'DELETE' });
                        loadAllAdminData();
                      }}
                      className="text-red-600 font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REPORTS & SETTINGS TAB */}
        {tab === 'reports_settings' && overview && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-display text-2xl font-bold text-slate-900">Sales Reports & Store Settings</h1>
              <button
                type="button"
                onClick={exportSalesCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                <Download className="w-4 h-4" />
                Export Orders CSV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Sales by Category</h2>
                {overview.salesByCategory.length === 0 ? (
                  <p className="text-xs text-slate-500">No verified sales recorded yet.</p>
                ) : (
                  overview.salesByCategory.map((row) => (
                    <div key={row.category} className="flex justify-between text-xs py-2 border-b border-slate-100">
                      <span className="font-medium text-slate-800">
                        {row.category} ({row.units} units)
                      </span>
                      <span className="font-bold tabular-nums text-blue-700">{formatNaira(row.revenue)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Daily Revenue Breakdown</h2>
                {overview.dailySales.length === 0 ? (
                  <p className="text-xs text-slate-500">No daily revenue entries yet.</p>
                ) : (
                  overview.dailySales.map((day) => (
                    <div key={day.date} className="flex justify-between text-xs py-2 border-b border-slate-100">
                      <span className="font-mono text-slate-700">{day.date} ({day.orders} orders)</span>
                      <span className="font-bold tabular-nums text-green-700">{formatNaira(day.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Store Configuration Settings */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiRequest('/admin/settings', {
                  method: 'PUT',
                  body: JSON.stringify(settingsForm),
                });
                await refreshSettings();
                showToast('Store & WhatsApp settings saved.', 'success');
              }}
              className="p-6 bg-white border border-slate-200 rounded-xl space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Settings className="w-4 h-4 text-blue-700" />
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Business, WhatsApp & Delivery Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={settingsForm.storeName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp Business Number (International format, e.g. 2348091234567)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Support Email</label>
                  <input
                    type="email"
                    value={settingsForm.supportEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Support Phone Number</label>
                  <input
                    type="text"
                    value={settingsForm.supportPhone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Business Address</label>
                  <input
                    type="text"
                    value={settingsForm.storeAddress}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lagos Delivery Fee (₦)</label>
                  <input
                    type="number"
                    value={settingsForm.lagosDeliveryFeeNgn}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lagosDeliveryFeeNgn: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nationwide Delivery Fee (₦)</label>
                  <input
                    type="number"
                    value={settingsForm.nationwideDeliveryFeeNgn}
                    onChange={(e) => setSettingsForm({ ...settingsForm, nationwideDeliveryFeeNgn: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Paystack Public Key (pk_live_... or pk_test_...)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.paystackPublicKey || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, paystackPublicKey: e.target.value })}
                    placeholder="pk_live_..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gateway mode: <strong className="text-slate-800 uppercase">{settingsForm.paystackMode.replace(/_/g, ' ')}</strong> · To enable real live Paystack charges, also set your matching <code>PAYSTACK_SECRET_KEY</code> in server environment secrets.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Save Store Configuration
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
