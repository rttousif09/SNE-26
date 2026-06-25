import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ERPDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const ERPDrawer: React.FC<ERPDrawerProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
}) => {
  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end print:hidden" id="erp-drawer-container">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px]"
            onClick={onClose}
            id="erp-drawer-overlay"
          />

          {/* Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
            className={`relative z-10 w-full ${sizeClasses[size]} h-full bg-white shadow-2xl flex flex-col border-l border-slate-200`}
            id="erp-drawer-body"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#002f6c] to-[#004b93] text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-amber-400 inline-block rounded-sm"></span>
                <span>{title}</span>
              </h3>
              <button
                onClick={onClose}
                className="text-slate-100 hover:text-white hover:bg-white/10 p-1 rounded-full transition cursor-pointer"
                aria-label="Close drawer"
                id="erp-drawer-close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 text-[11px] font-sans text-slate-800 bg-slate-50/50">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
