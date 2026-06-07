import React, { useState } from 'react';
import { Building2, Lock, User, AlertCircle, Server } from 'lucide-react';
import { SNLogo } from './SNLogo';

interface LoginProps {
  onLoginSuccess: (user: { username: string; name: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password })
      });
      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Logon failed: Incorrect User ID or Password.');
      }
    } catch (err) {
      setError('Network error: Could not connect to authentication server.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#f2f6fa] to-[#cbd8e6] font-sans text-xs">
      
      {/* Brand Header */}
      <header className="bg-[#002f6c] text-white px-6 py-2.5 flex items-center justify-between border-b-2 border-[#8c9ba8] shadow-md">
        <div className="flex items-center space-x-3">
          <SNLogo size={36} className="text-white hover:scale-105 transition-transform" />
          <div>
            <h1 className="text-lg font-black tracking-wider font-mono text-white leading-none">SN ENTERPRISE</h1>
            <p className="text-[9px] text-[#cbd8e6] mt-0.5 uppercase tracking-widest leading-none font-medium">Enterprise Resource Planning System</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-blue-200">
          <Server size={12} />
          <span className="font-mono text-xs">Server: ERP_PRD</span>
        </div>
      </header>

      {/* Main Login Window */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-[#eef2f6] border border-[#8c9ba8] p-1 shadow-2xl rounded-sm">
          {/* SAP Window Title Bar */}
          <div className="bg-gradient-to-r from-[#0056b3] to-[#002f6c] text-white px-2 py-1.5 flex items-center justify-between select-none">
            <span className="font-bold flex items-center space-x-1.5 text-[11px]">
              <Server size={12} className="text-blue-200" />
              <span>SN Enterprise - SAP Logon (ERP_PRD)</span>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-4 bg-white border border-[#8c9ba8] border-t-0 space-y-4">
            <div className="text-center pb-2 border-b border-gray-200">
              <span className="font-bold text-[#002f6c] text-sm uppercase tracking-wide">User Identification</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Please enter your system access credentials.</p>
            </div>

            {error && (
              <div className="p-2 border border-red-500 bg-red-50 text-red-700 flex items-start space-x-2 animate-pulse text-[11px]">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <div className="font-semibold">{error}</div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <label className="font-semibold text-[#002f6c]">User ID:</label>
                <div className="relative">
                  <User size={13} className="absolute left-2.5 top-2 text-gray-500" />
                  <input
                    required
                    type="text"
                    id="login_userid"
                    className="sap-input w-full pl-7.5 py-1 text-[11px] font-mono placeholder-gray-400"
                    placeholder="Enter User ID"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-semibold text-[#002f6c]">Password:</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-2.5 top-2 text-gray-500" />
                  <input
                    required
                    type="password"
                    id="login_password"
                    className="sap-input w-full pl-7.5 py-1 text-[11px] font-mono placeholder-gray-400"
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setUsername(''); setPassword(''); setError(null); }}
                className="sap-btn font-normal text-gray-700 hover:text-black py-1 px-4 text-[11px]"
              >
                Reset Fields
              </button>
              <button
                type="submit"
                className="sap-btn font-semibold text-[#002f6c] bg-blue-50 border-[#0056b3] hover:bg-blue-100 py-1 px-5 text-[11px]"
              >
                Logon
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="bg-[#cbd8e6] border-t border-[#8c9ba8] px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-700">
        <span className="font-semibold">System: ERP_PRD Client: SN ENTERPRISE</span>
        <span>© 2026 SN ENTERPRISE. All rights reserved.</span>
      </footer>
    </div>
  );
};
