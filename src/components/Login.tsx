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
    <div className="min-h-screen flex flex-col justify-between bg-[#f2f6fa] font-sans text-[11px]">
      
      {/* Brand Header */}
      <header className="bg-[var(--color-sap-blue-val)] text-white px-6 py-2.5 flex items-center justify-between border-b-2 border-[#8c9ba8] shadow-md">
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
      <main className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full space-y-4">
        {error && (
          <div className="p-2 border border-red-500 bg-red-50 text-red-700 flex items-start space-x-2 text-[11px] font-bold shadow-sm">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border border-[#8baac7] bg-[#f9fbfd]">
            <div className="bg-[#d9eaf7] border-b border-[#8baac7] px-3 py-1.5 font-bold text-black text-[12px]">
              System Logon
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-[200px_1fr] items-center gap-y-3">
                <label className="font-bold text-black text-[12px]">
                  Enter User Id / Login Id:<span className="text-red-700">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    required
                    type="text"
                    id="login_userid"
                    className="border border-[#8baac7] bg-[#dae8f5] px-2 py-1 focus:outline-none focus:border-black focus:bg-white text-[12px] w-[250px]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <label className="font-bold text-black text-[12px]">
                  Provide Password:<span className="text-red-700">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    required
                    type="password"
                    id="login_password"
                    className="border border-[#8baac7] bg-[#fceb8d] px-2 py-1 focus:outline-none focus:border-black text-[12px] w-[250px]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="submit" className="sap-btn bg-gradient-to-b from-[#fbf8e8] to-[#f4e2a1] font-bold px-4 py-1 text-black">
                    Proceed
                  </button>
                </div>
                
                <div className="col-span-2 text-red-700 italic mt-2 text-[12px]">
                  Fields marked with an asterisk (*) are required
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Footer bar */}
      <footer className="bg-[#cbd8e6] border-t border-[#8c9ba8] px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-700">
        <span className="font-semibold">System: ERP_PRD Client: SN ENTERPRISE</span>
        <span>© 2026 SN ENTERPRISE. All rights reserved.</span>
      </footer>
    </div>
  );
};
