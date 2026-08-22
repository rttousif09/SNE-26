import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Lock, 
  User, 
  AlertCircle, 
  Server, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  HelpCircle, 
  Globe, 
  Laptop, 
  Clock, 
  ArrowRight, 
  Info, 
  RefreshCw
} from 'lucide-react';
import { SNLogo } from './SNLogo';

interface LoginProps {
  onLoginSuccess: (user: { username: string; name: string; role?: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [clientNumber, setClientNumber] = useState('745');
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('erp_remembered_username') || '';
  });
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('EN');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('erp_remember_me') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [systemTime, setSystemTime] = useState<string>('');

  // Update real-time system clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) + ' ' + now.toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Caps Lock detection
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
      setError('Please provide your password.');
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
          client: clientNumber,
          language
        })
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Logon failed: Incorrect User ID or Password.');
      }
    } catch (err) {
      setError('Network error: Could not connect to authentication server. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setUsername('');
    setPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100/90 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. TOP SAP ENTERPRISE APPLICATION BAR */}
      <header className="bg-gradient-to-r from-[#003865] via-[#0056b3] to-[#004080] text-white px-5 py-2.5 flex flex-wrap items-center justify-between border-b-2 border-[#00284d] shadow-md z-10">
        <div className="flex items-center space-x-3.5">
          <div className="p-1 bg-white/10 rounded-sm border border-white/20 shadow-xs">
            <SNLogo size={36} className="text-white hover:scale-105 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wider font-mono text-white leading-none">
                SN ENTERPRISE
              </h1>
              <span className="bg-amber-400/90 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.2 rounded font-mono tracking-normal">
                S/4HANA ERP
              </span>
            </div>
            <p className="text-[10px] text-blue-100/90 mt-0.5 uppercase tracking-widest font-medium">
              Construction & Infrastructure Management System
            </p>
          </div>
        </div>

        {/* Live System Diagnostics Badges */}
        <div className="flex items-center gap-4 text-[11px] mt-2 sm:mt-0 font-mono">
          <div className="hidden md:flex items-center space-x-1.5 bg-black/20 border border-white/10 px-2.5 py-1 rounded">
            <Clock size={12} className="text-amber-300 animate-pulse" />
            <span className="text-slate-100 text-[10px]">{systemTime || 'Loading time...'}</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-400/30 px-2.5 py-1 rounded text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-[10px]">PRD_NODE01 (ONLINE)</span>
          </div>
          <button 
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="text-blue-100 hover:text-white flex items-center gap-1 cursor-pointer bg-white/10 hover:bg-white/20 px-2 py-1 rounded border border-white/20 transition-all text-[11px]"
            title="System Help & IT Support"
          >
            <HelpCircle size={13} />
            <span className="hidden sm:inline">Helpdesk</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN LOGON INTERFACE STAGE */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          
          {/* SAP LOGON WINDOW */}
          <div className="bg-white rounded-xs shadow-2xl border-2 border-[#8c9ba8] overflow-hidden">
            
            {/* Window Title Bar */}
            <div className="bg-gradient-to-r from-[#d9eaf7] to-[#e8f2fa] border-b border-[#8c9ba8] px-4 py-2.5 flex items-center justify-between text-slate-800">
              <div className="flex items-center space-x-2">
                <Laptop size={15} className="text-[#0056b3]" />
                <span className="font-bold text-xs uppercase tracking-wide text-slate-900 font-sans">
                  SAP GUI Logon — SN1 Production System [Client 745]
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              </div>
            </div>

            {/* Error Banner if any */}
            {error && (
              <div className="m-4 mb-0 p-3 border-l-4 border-red-600 bg-red-50 text-red-800 flex items-start justify-between text-xs rounded-r-xs shadow-xs animate-shake">
                <div className="flex items-start space-x-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <strong className="font-bold">Logon Error: </strong>
                    <span>{error}</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setError(null)} 
                  className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4">
              <div className="bg-[#f8fafc] border border-slate-200 p-4 sm:p-5 rounded-xs space-y-4 shadow-xs">
                
                {/* Client Field */}
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] items-center gap-2">
                  <label htmlFor="login_client" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Server size={13} className="text-[#0056b3]" />
                    Client Number:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="login_client"
                      type="text"
                      maxLength={3}
                      value={clientNumber}
                      onChange={(e) => setClientNumber(e.target.value)}
                      className="w-20 bg-[#dae8f5] border border-[#8baac7] px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none rounded-xs shadow-inner"
                      placeholder="745"
                    />
                    <span className="text-[11px] text-slate-500 font-mono">
                      (745 = Production DB)
                    </span>
                  </div>
                </div>

                {/* User ID Field */}
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] items-center gap-2">
                  <label htmlFor="login_userid" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User size={13} className="text-[#0056b3]" />
                    User / Login ID:<span className="text-red-600">*</span>
                  </label>
                  <div className="relative flex-1">
                    <input
                      required
                      type="text"
                      id="login_userid"
                      autoFocus
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter SAP Username"
                      className="w-full bg-[#dae8f5] border border-[#8baac7] px-3 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-xs shadow-inner transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] items-center gap-2">
                  <label htmlFor="login_password" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock size={13} className="text-[#0056b3]" />
                    Password:<span className="text-red-600">*</span>
                  </label>
                  <div className="relative flex-1">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      id="login_password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                      placeholder="Enter Password"
                      className="w-full bg-[#fceb8d]/50 border border-[#8baac7] px-3 py-1.5 pr-10 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-xs shadow-inner transition-colors"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer p-0.5"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Caps Lock Warning */}
                {capsLockActive && (
                  <div className="sm:ml-[140px] flex items-center gap-1.5 text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-300 px-2.5 py-1 rounded">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>Warning: Caps Lock is ON</span>
                  </div>
                )}

                {/* Logon Language */}
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] items-center gap-2">
                  <label htmlFor="login_language" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Globe size={13} className="text-[#0056b3]" />
                    Logon Language:
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="login_language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-white border border-[#8baac7] px-2.5 py-1 text-xs font-bold text-slate-800 rounded-xs focus:border-blue-600 focus:outline-none"
                    >
                      <option value="EN">EN (English - India/US)</option>
                      <option value="HI">HI (Hindi)</option>
                      <option value="BN">BN (Bengali)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono">
                      UTF-8 Unicode
                    </span>
                  </div>
                </div>

                {/* Remember Me Checkbox & Forgot Password */}
                <div className="sm:ml-[140px] flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      id="remember_me_checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Remember User ID</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs text-blue-700 hover:text-blue-900 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-slate-500 italic">
                  Press <kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-700 border border-slate-300">Enter</kbd> to logon
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-300 transition-colors cursor-pointer"
                  >
                    Clear (F12)
                  </button>

                  <button
                    type="submit"
                    id="submit_logon_btn"
                    disabled={isLoading}
                    className="px-6 py-1.5 bg-gradient-to-b from-[#0056b3] to-[#004080] hover:from-[#004494] hover:to-[#003366] text-white font-bold text-xs rounded shadow-md border border-[#002f6c] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-white" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={13} className="text-amber-300" />
                        <span>Logon (Enter)</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Bottom Security Notice Banner inside modal */}
            <div className="bg-[#f0f4f8] border-t border-slate-200 px-5 py-2.5 flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Protected by 256-bit TLS protocol. Authorized access only.</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">Kernel 7.93</span>
            </div>

          </div>
        </div>
      </main>

      {/* 3. FOOTER STATUS BAR */}
      <footer className="bg-[#cbd8e6] border-t border-[#8c9ba8] px-4 py-2 flex flex-wrap items-center justify-between text-[10px] text-slate-700 font-mono">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-slate-900">System: SN1</span>
          <span>|</span>
          <span>Client: 745</span>
          <span>|</span>
          <span>Server: ERP_PRD_NODE01</span>
          <span>|</span>
          <span>DB: S/4HANA</span>
        </div>
        <div className="mt-1 sm:mt-0 text-slate-600">
          © {new Date().getFullYear()} SN ENTERPRISE Construction & Infrastructure ERP. All rights reserved.
        </div>
      </footer>

      {/* 4. IT HELPDESK / FORGOT PASSWORD MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#8c9ba8] w-full max-w-md rounded shadow-2xl overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in duration-150">
            <div className="px-4 py-3 bg-[#0056b3] text-white flex justify-between items-center">
              <div className="flex items-center space-x-2 font-bold">
                <HelpCircle size={16} className="text-amber-300" />
                <span>IT Support & Logon Helpdesk</span>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-white hover:text-red-200 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-slate-700">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-900">
                <p className="font-bold text-xs mb-1">🔑 Account Credentials Policy</p>
                <p className="text-[11px] leading-relaxed">
                  Logon accounts and permissions for SN ENTERPRISE ERP are centrally provisioned by the System Administrator. Staff passwords cannot be reset self-service for security compliance.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Need Access or Password Reset?</h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5 font-mono text-[11px]">
                  <div><strong className="text-slate-900">IT Administrator:</strong> Tousif Reja</div>
                  <div><strong className="text-slate-900">Official Email:</strong> support@snenterprise.in</div>
                  <div><strong className="text-slate-900">Internal Ext:</strong> 402 / 108</div>
                  <div><strong className="text-slate-900">Working Hours:</strong> Mon - Sat (09:00 - 19:00 IST)</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-1.5 bg-[#0056b3] hover:bg-[#004080] text-white font-bold rounded cursor-pointer transition-colors"
                >
                  Close Helpdesk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
