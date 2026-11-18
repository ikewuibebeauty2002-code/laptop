import React, { useEffect, useState, useCallback } from 'react';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { SearchModal } from './components/search/SearchModal';
import { ToastContainer } from './components/common/ToastContainer';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaystackSandboxPage } from './pages/PaystackSandboxPage';
import { CheckoutCallbackPage } from './pages/CheckoutCallbackPage';
import { AuthPages } from './pages/AuthPages';
import { AccountPage } from './pages/AccountPage';
import {
  AboutPage,
  ContactPage,
  TrackOrderPage,
  PolicyPage,
  NotFoundPage,
} from './pages/InfoPages';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const RouterApp: React.FC = () => {
  const [locationUrl, setLocationUrl] = useState(() => window.location.pathname + window.location.search);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setLocationUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', path);
    setLocationUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [pathname, searchString = ''] = locationUrl.split('?');
  const searchParams = new URLSearchParams(searchString);
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  const renderPage = () => {
    if (pathname === '/' || pathname === '') {
      return <HomePage onNavigate={navigate} />;
    }
    if (pathname === '/deals') {
      return <CatalogPage mode="deals" onNavigate={navigate} />;
    }
    if (pathname === '/search') {
      return <CatalogPage mode="search" searchQuery={searchParams.get('q') || ''} onNavigate={navigate} />;
    }
    if (pathname.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '').split('/')[0] || 'all';
      return <CatalogPage mode="category" categorySlug={slug} onNavigate={navigate} />;
    }
    if (pathname.startsWith('/product/')) {
      const slug = pathname.replace('/product/', '').split('/')[0];
      return <ProductDetailsPage slug={slug} onNavigate={navigate} />;
    }
    if (pathname === '/cart') {
      return <CartPage onNavigate={navigate} />;
    }
    if (pathname === '/checkout') {
      return <CheckoutPage onNavigate={navigate} />;
    }
    if (pathname === '/paystack-sandbox') {
      return (
        <PaystackSandboxPage
          reference={searchParams.get('reference') || ''}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/checkout/callback') {
      return (
        <CheckoutCallbackPage
          reference={searchParams.get('reference') || searchParams.get('trxref') || ''}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/login') {
      return <AuthPages mode="login" onNavigate={navigate} />;
    }
    if (pathname === '/register') {
      return <AuthPages mode="register" onNavigate={navigate} />;
    }
    if (pathname === '/forgot-password') {
      return <AuthPages mode="forgot-password" onNavigate={navigate} />;
    }
    if (pathname === '/reset-password') {
      return (
        <AuthPages
          mode="reset-password"
          resetTokenParam={searchParams.get('token') || ''}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/account') {
      return <AccountPage onNavigate={navigate} />;
    }
    if (pathname === '/about') {
      return <AboutPage onNavigate={navigate} />;
    }
    if (pathname === '/contact') {
      return <ContactPage />;
    }
    if (pathname === '/track-order') {
      return <TrackOrderPage />;
    }
    if (pathname.startsWith('/policy/')) {
      const type = pathname.replace('/policy/', '');
      return <PolicyPage type={type} />;
    }
    if (isAdminRoute) {
      return <AdminDashboardPage onNavigate={navigate} />;
    }
    return <NotFoundPage onNavigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {!isAdminRoute && (
        <Navbar
          currentPath={pathname}
          onNavigate={navigate}
          onOpenSearch={() => setSearchModalOpen(true)}
        />
      )}

      <main className="flex-1">{renderPage()}</main>

      {!isAdminRoute && <Footer onNavigate={navigate} />}

      <CartDrawer onNavigate={navigate} />
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigate={navigate}
      />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <StoreProvider>
      <RouterApp />
    </StoreProvider>
  );
}

export default App;
