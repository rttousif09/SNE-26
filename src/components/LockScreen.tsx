import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ isLocked, onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Focus input when locked
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isLocked) {
      setPassword('');
      setError(false);
      timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    return () => clearTimeout(timeout);
  }, [isLocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123' || password === 'system') { // Some hardcoded or env based password
      setPassword('');
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-[var(--color-sap-blue-val)]/95 backdrop-blur-md flex items-center justify-center pointer-events-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10"
          >
            {/* Background design */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Lock size={120} />
            </div>

            <div className="flex justify-center mb-6 relative z-10">
              <div className="bg-blue-100 p-4 rounded-full">
                <Lock size={32} className="text-[#0056b3]" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-[var(--color-sap-blue-val)] mb-2 font-sans relative z-10">Terminal Locked</h2>
            <p className="text-gray-500 text-center text-[11px] mb-6 relative z-10">
              Please enter your system pin to resume session. <br/>
              <span className="font-mono text-[9px] bg-gray-100 px-1 py-0.5 rounded text-gray-400 mt-1 inline-block">(Default: admin123)</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  autoComplete="new-password"
                  placeholder="Enter Passcode..."
                  className={`w-full px-4 py-3 rounded-sm border text-center text-lg tracking-widest focus:outline-none focus:ring-2 bg-gray-50 ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'}`}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-red-500 text-[11px] text-center flex items-center justify-center space-x-1 font-semibold mt-2">
                      <AlertCircle size={14} />
                      <span>Incorrect Passcode</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full bg-[var(--btn-hover-top)] text-white py-3 rounded-sm font-bold hover:bg-[#004085] transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <span>Unlock Session</span>
                <Unlock size={16} />
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
