import React, { useState } from 'react';
import { Lock, Mail, User, Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { UserProfile } from '../types/ecommerce';

interface AuthPagesProps {
  mode: 'login' | 'register' | 'forgot-password' | 'reset-password';
  resetTokenParam?: string;
  onNavigate: (path: string) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  mode,
  resetTokenParam = '',
  onNavigate,
}) => {
  const { setUser, refreshAuth, showToast } = useStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(resetTokenParam);
  const [issuedResetToken, setIssuedResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<{ user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(res.user);
      await refreshAuth();
      showToast(`Welcome back, ${res.user.fullName.split(' ')[0]}!`, 'success');
      if (res.user.role === 'admin' || res.user.role === 'super_admin') {
        onNavigate('/admin');
      } else {
        onNavigate('/account');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<{ user: UserProfile }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, phone, whatsappNumber, password }),
      });
      setUser(res.user);
      showToast('Account created successfully!', 'success');
      onNavigate('/account');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showToast(res.message, 'info');
      if (res.resetToken) {
        setIssuedResetToken(res.resetToken);
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      showToast('Password updated. You can now sign in.', 'success');
      onNavigate('/login');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-xs">
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-900">Sign In to ZuriVolt</h1>
              <p className="text-xs text-slate-500 mt-1">
                Access your orders, saved addresses, and wishlist.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => onNavigate('/forgot-password')}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Quick Evaluation Logins:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('chidinma@example.ng');
                    setPassword('Customer@123');
                  }}
                  className="p-2 text-left bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded-lg"
                >
                  <span className="font-semibold text-slate-900 block">Customer Demo</span>
                  <span className="text-[11px] text-slate-500 truncate block">chidinma@example.ng</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@zurivolt.ng');
                    setPassword('Admin@1234');
                  }}
                  className="p-2 text-left bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded-lg"
                >
                  <span className="font-semibold text-blue-800 block">Admin Demo</span>
                  <span className="text-[11px] text-slate-500 truncate block">admin@zurivolt.ng</span>
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-slate-600 pt-2">
              New to ZuriVolt?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/register')}
                className="font-semibold text-blue-700 hover:underline"
              >
                Create an account
              </button>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-900">Create Account</h1>
              <p className="text-xs text-slate-500 mt-1">
                Track orders, manage delivery addresses, and post verified reviews.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp</label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+234..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 6 chars)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
            >
              {loading ? 'Creating Account...' : 'Create Customer Account'}
            </button>

            <p className="text-center text-xs text-slate-600 pt-2">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="font-semibold text-blue-700 hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot-password' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-900">Forgot Password</h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your email to generate a secure password reset token.
              </p>
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
            >
              {loading ? 'Sending...' : 'Request Password Reset'}
            </button>

            {issuedResetToken && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-2">
                <p className="font-semibold text-slate-900">Password Reset Link Ready:</p>
                <button
                  type="button"
                  onClick={() => onNavigate(`/reset-password?token=${issuedResetToken}`)}
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                >
                  Continue to Reset Password
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="w-full text-center text-xs font-semibold text-slate-600 hover:text-blue-700"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {mode === 'reset-password' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-900">Set New Password</h1>
              <p className="text-xs text-slate-500 mt-1">
                Choose a new password for your ZuriVolt account.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
