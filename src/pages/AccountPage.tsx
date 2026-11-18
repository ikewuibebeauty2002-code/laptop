import React, { useEffect, useState } from 'react';
import {
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { CustomerAddress, Order, Product } from '../types/ecommerce';
import { formatNaira, formatDateShort, NIGERIAN_STATES } from '../utils/format';
import { ProductCard } from '../components/product/ProductCard';

interface AccountPageProps {
  onNavigate: (path: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigate }) => {
  const { user, authLoading, logout, refreshAuth, showToast } = useStore();
  const [tab, setTab] = useState<'orders' | 'profile' | 'addresses' | 'wishlist'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    whatsappNumber: '',
    streetAddress: '',
    city: '',
    state: 'Lagos',
    additionalInfo: '',
    isDefault: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      onNavigate('/login');
      return;
    }
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone);
      setWhatsappNumber(user.whatsappNumber);
      setNewAddr((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName,
        phone: prev.phone || user.phone,
        whatsappNumber: prev.whatsappNumber || user.whatsappNumber,
      }));

      Promise.all([
        apiRequest<Order[]>('/orders/my').catch(() => []),
        apiRequest<CustomerAddress[]>('/addresses').catch(() => []),
        apiRequest<Product[]>('/wishlist').catch(() => []),
      ]).then(([ords, addrs, wish]) => {
        setOrders(ords);
        setAddresses(addrs);
        setWishlist(wish);
      });
    }
  }, [user, authLoading]);

  if (authLoading || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        Loading account...
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone, whatsappNumber }),
      });
      await refreshAuth();
      showToast('Personal details updated.', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/addresses', {
        method: 'POST',
        body: JSON.stringify(newAddr),
      });
      const updated = await apiRequest<CustomerAddress[]>('/addresses');
      setAddresses(updated);
      setNewAddr({
        label: 'Home',
        fullName: user.fullName,
        phone: user.phone,
        whatsappNumber: user.whatsappNumber,
        streetAddress: '',
        city: '',
        state: 'Lagos',
        additionalInfo: '',
        isDefault: false,
      });
      showToast('Delivery address saved.', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await apiRequest(`/addresses/${id}`, { method: 'DELETE' });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast('Address removed.', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">My Account</h1>
          <p className="text-sm text-slate-600 mt-1">
            {user.fullName} · {user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(user.role === 'admin' || user.role === 'super_admin') && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              onNavigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 space-y-1 bg-white border border-slate-200 rounded-xl p-2">
          {[
            { id: 'orders', label: 'Order History', icon: Package },
            { id: 'profile', label: 'Personal Information', icon: User },
            { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
            { id: 'wishlist', label: 'Saved Wishlist', icon: Heart },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === item.id
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </aside>

        <main className="lg:col-span-9">
          {tab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900">Order History</h2>
              {orders.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-600">You haven't placed any orders yet.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('/category/all')}
                    className="mt-4 px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                orders.map((ord) => {
                  const isOpen = expandedOrderId === ord.id;
                  return (
                    <div key={ord.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-mono text-sm font-bold text-slate-900">{ord.orderNumber}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Placed on {formatDateShort(ord.createdAt)} · {ord.items.length} item(s)
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">Payment</span>
                            <span
                              className={`font-semibold uppercase ${
                                ord.paymentStatus === 'paid' ? 'text-green-700' : 'text-orange-600'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Delivery Status</span>
                            <span className="font-semibold text-blue-700 capitalize">
                              {ord.orderStatus.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 block">Total</span>
                            <span className="text-sm font-bold text-slate-900 tabular-nums">
                              {formatNaira(ord.totalNgn)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isOpen ? null : ord.id)}
                            className="px-3 py-1.5 font-semibold text-blue-700 border border-blue-200 rounded-lg hover:bg-sky-50"
                          >
                            {isOpen ? 'Hide' : 'Details'}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                            <p>
                              <strong>Ship to:</strong> {ord.deliveryAddress}, {ord.deliveryCity}, {ord.deliveryState}
                            </p>
                            <p>
                              <strong>Paystack Ref:</strong>{' '}
                              <span className="font-mono">{ord.paystackReference || 'N/A'}</span>
                            </p>
                          </div>
                          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                            {ord.items.map((it) => (
                              <div key={it.id} className="px-3.5 py-2.5 flex justify-between">
                                <span>
                                  {it.productName} × {it.quantity}
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {formatNaira(it.lineTotalNgn)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 max-w-xl"
            >
              <h2 className="font-display text-xl font-bold text-slate-900">Personal Information</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
              >
                Save Settings
              </button>
            </form>
          )}

          {tab === 'addresses' && (
            <div className="space-y-6">
              <h2 className="font-display text-xl font-bold text-slate-900">Saved Delivery Addresses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="p-4 border border-slate-200 rounded-xl bg-white flex justify-between gap-3">
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">
                        {addr.label} {addr.isDefault && '· Default'}
                      </p>
                      <p className="text-slate-700">{addr.fullName}</p>
                      <p className="text-slate-600">{addr.streetAddress}</p>
                      <p className="text-slate-600">{addr.city}, {addr.state}</p>
                      <p className="text-slate-500">Phone: {addr.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-slate-400 hover:text-red-600 h-fit p-1"
                      aria-label="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddAddress} className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-700" />
                  Add New Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Label (Home, Office)"
                    value={newAddr.label}
                    onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Recipient Full Name"
                    value={newAddr.fullName}
                    onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={newAddr.phone}
                    onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="WhatsApp Number"
                    value={newAddr.whatsappNumber}
                    onChange={(e) => setNewAddr({ ...newAddr, whatsappNumber: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Street Address"
                  value={newAddr.streetAddress}
                  onChange={(e) => setNewAddr({ ...newAddr, streetAddress: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={newAddr.state}
                    onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  Save Delivery Address
                </button>
              </form>
            </div>
          )}

          {tab === 'wishlist' && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900">Saved Wishlist</h2>
              {wishlist.length === 0 ? (
                <p className="text-sm text-slate-500 p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  You haven't saved any gadgets to your wishlist yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlist.map((prod) => (
                    <ProductCard key={prod.id} product={prod} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
