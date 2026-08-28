import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { SNLogo } from './SNLogo';

interface LoginProps {
  onLoginSuccess: (user: { username: string; name: string; role?: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('erp_remembered_username') || '';
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('erp_remember_me') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter your User ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('erp_remembered_username', trimmedUsername);
        localStorage.setItem('erp_remember_me', 'true');
      } else {
        localStorage.removeItem('erp_remembered_username');
        localStorage.removeItem('erp_remember_me');
      }

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: trimmedUsername, 
          password,
          client: '745'
        })
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Invalid User ID or Password.');
      }
    } catch (err) {
      setError('Network error: Unable to reach authentication service. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100 text-slate-800 font-sans selection:bg-[#0056b3] selection:text-white">
      
      {/* Top Header Bar */}
      <header className="bg-[#0056b3] text-white px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-1 bg-white/10 rounded-sm">
            <SNLogo size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider font-mono text-white leading-none">
              SN ENTERPRISE
            </h1>
            <p className="text-[10px] text-blue-100 mt-0.5 uppercase tracking-wider font-medium">
              Construction & Infrastructure ERP
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-blue-100">
          <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20">Client 745</span>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Card Header */}
          <div className="p-6 pb-4 border-b border-slate-100 text-center">
            <div className="inline-flex p-2.5 bg-blue-50 rounded-full mb-3 text-[#0056b3]">
              <SNLogo size={42} className="text-[#0056b3]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your ERP account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start space-x-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* User ID */}
            <div className="space-y-1.5">
              <label htmlFor="login_userid" className="block text-xs font-semibold text-slate-700">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  required
                  id="login_userid"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your user ID"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login_password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={15} />
                </div>
                <input
                  required
                  id="login_password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Caps Lock Alert */}
              {capsLockActive && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium pt-1">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>Caps Lock is ON</span>
                </div>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="remember_me_checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#0056b3] rounded border-slate-300 focus:ring-[#0056b3] cursor-pointer"
                />
                <span>Remember User ID</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="submit_logon_btn"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#0056b3] hover:bg-[#004494] text-white font-semibold text-sm rounded-md shadow-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Authorized access only • Encrypted connection</span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-xs text-slate-500 font-sans">
        © {new Date().getFullYear()} SN ENTERPRISE. All rights reserved.
      </footer>

    </div>
  );
};
