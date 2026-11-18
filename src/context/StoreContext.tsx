import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import {
  CartItem,
  Category,
  Product,
  StoreSettings,
  UserProfile,
} from '../types/ecommerce';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface StoreContextValue {
  user: UserProfile | null;
  authLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  settings: StoreSettings;
  refreshSettings: () => Promise<void>;
  categories: Category[];
  refreshCategories: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, selectedColor?: string, variantId?: string | null) => void;
  updateCartQty: (itemId: string, qty: number) => void;
  updateCartVariant: (itemId: string, newVariantId: string | null, newColor: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  recentlyViewed: Product[];
  recordRecentlyViewed: (product: Product) => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'ZuriVolt Gadgets',
  whatsappNumber: '2348091234567',
  supportEmail: 'support@zurivolt.ng',
  supportPhone: '+234 809 123 4567',
  storeAddress: '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  instagramUrl: 'https://instagram.com/zurivoltgadgets',
  twitterUrl: 'https://x.com/zurivoltgadgets',
  facebookUrl: 'https://facebook.com/zurivoltgadgets',
  freeDeliveryThresholdNgn: 350000,
  lagosDeliveryFeeNgn: 3500,
  nationwideDeliveryFeeNgn: 6500,
  paystackMode: 'sandbox',
  paystackPublicKey: 'pk_live_b866f4059b1a5d1b031eebd95a66cc9bfefe3853',
  paystackPublicKeyConfigured: true,
};

const CART_STORAGE_KEY = 'zurivolt_cart_v1';
const RECENT_STORAGE_KEY = 'zurivolt_recent_v1';

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Product[]) : [];
    } catch {
      return [];
    }
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await apiRequest<StoreSettings>('/store/settings');
      setSettings(data);
    } catch {
      // keep defaults
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const data = await apiRequest<Category[]>('/categories');
      setCategories(data);
    } catch {
      // ignore
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const data = await apiRequest<{ user: UserProfile | null }>('/auth/me');
      setUser(data.user);
      if (data.user) {
        const [wish, dbCart] = await Promise.all([
          apiRequest<Product[]>('/wishlist').catch(() => []),
          apiRequest<CartItem[]>('/cart').catch(() => []),
        ]);
        setWishlistIds(wish.map((p) => p.id));
        if (dbCart.length > 0 && cart.length === 0) {
          setCart(dbCart);
        }
      } else {
        setWishlistIds([]);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshCategories();
    refreshAuth();
  }, [refreshSettings, refreshCategories, refreshAuth]);

  // Persist cart to localStorage AND sync to DB when authenticated
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
    if (user) {
      apiRequest('/cart/sync', {
        method: 'PUT',
        body: JSON.stringify({ items: cart }),
      }).catch(() => {});
    }
  }, [cart, user]);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setWishlistIds([]);
    showToast('You have signed out.', 'info');
  }, [showToast]);

  const addToCart = useCallback(
    (product: Product, quantity = 1, selectedColor?: string, variantId: string | null = null) => {
      if (product.stockAvailable <= 0) {
        showToast('This product is currently out of stock.', 'error');
        return;
      }

      const chosenColor = selectedColor ?? product.availableColors[0] ?? '';
      const chosenVariant = variantId
        ? product.variants.find((v) => v.id === variantId)
        : product.variants[0] || null;
      const effectiveVariantId = variantId !== null ? variantId : chosenVariant?.id || null;
      const unitPrice = chosenVariant ? chosenVariant.priceNgn : product.priceNgn;
      const maxStock = chosenVariant ? chosenVariant.stockQty : product.stockAvailable;

      if (maxStock <= 0) {
        showToast('Selected variation is out of stock.', 'error');
        return;
      }

      setCart((prev) => {
        const existingIdx = prev.findIndex(
          (i) =>
            i.productId === product.id &&
            (i.variantId || null) === effectiveVariantId &&
            i.selectedColor === chosenColor
        );

        if (existingIdx >= 0) {
          const next = [...prev];
          const existing = next[existingIdx];
          const updatedQty = Math.min(maxStock, existing.quantity + quantity);
          if (existing.quantity + quantity > maxStock) {
            showToast(`Maximum available stock (${maxStock}) reached.`, 'info');
          } else {
            showToast(`Updated ${product.name} quantity in cart.`, 'success');
          }
          next[existingIdx] = { ...existing, quantity: updatedQty, stockAvailable: maxStock };
          return next;
        }

        const primaryImg =
          product.images.find((i) => i.isPrimary)?.imageUrl || product.images[0]?.imageUrl || '';

        showToast(`${product.name} added to cart.`, 'success');
        return [
          ...prev,
          {
            id: `${product.id}-${effectiveVariantId || 'base'}-${chosenColor}-${Date.now()}`,
            productId: product.id,
            variantId: effectiveVariantId,
            productName: product.name,
            productSlug: product.slug,
            productImage: primaryImg,
            brand: product.brand,
            selectedColor: chosenColor,
            selectedVariantName: chosenVariant?.name || '',
            unitPriceNgn: unitPrice,
            compareAtPriceNgn: product.compareAtPriceNgn,
            quantity: Math.min(maxStock, Math.max(1, quantity)),
            stockAvailable: maxStock,
          },
        ];
      });
    },
    [showToast]
  );

  const updateCartQty = useCallback((itemId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== itemId) return item;
          if (qty <= 0) return null;
          const clamped = Math.min(item.stockAvailable || 99, qty);
          return { ...item, quantity: clamped };
        })
        .filter((x): x is CartItem => x !== null)
    );
  }, []);

  const updateCartVariant = useCallback((itemId: string, newVariantId: string | null, newColor: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, variantId: newVariantId, selectedColor: newColor }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) {
        showToast('Please sign in to save gadgets to your wishlist.', 'info');
        return;
      }
      try {
        const res = await apiRequest<{ wishlisted: boolean }>(`/wishlist/${productId}`, {
          method: 'POST',
        });
        setWishlistIds((prev) =>
          res.wishlisted ? [...new Set([...prev, productId])] : prev.filter((id) => id !== productId)
        );
        showToast(res.wishlisted ? 'Saved to wishlist.' : 'Removed from wishlist.', 'success');
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [user, showToast]
  );

  const recordRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.unitPriceNgn * item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        setUser,
        refreshAuth,
        logout,
        settings,
        refreshSettings,
        categories,
        refreshCategories,
        cart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateCartQty,
        updateCartVariant,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        recentlyViewed,
        recordRecentlyViewed,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
