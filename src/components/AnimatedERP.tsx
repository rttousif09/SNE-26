import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader, Shovel } from 'lucide-react';

// 1. Fade-in page transition wrapper
export const AnimatePage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

// 2. Slide-up and fade-in modal animations
interface AnimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const AnimateModal: React.FC<AnimateModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-md'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
            className={`relative bg-white border border-[#8c9ba8] shadow-xl w-full ${maxWidthClass} rounded-sm overflow-hidden z-20 flex flex-col`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// 3. Animated KPI counters that update from 0/previous smoothly
interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  formatter?: (val: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  formatter
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 400; // ms
    const startTime = performance.now();

    let animationFrameId: number;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const current = Math.round(start + (end - start) * easeProgress);
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  const outputText = formatter ? formatter(displayValue) : `${prefix}${displayValue.toLocaleString('en-IN')}${suffix}`;
  
  return (
    <motion.span
      key={value}
      initial={{ scale: 0.95, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="font-mono"
    >
      {outputText}
    </motion.span>
  );
};

// 4. Skeleton loaders for tables/grids with a professional enterprise feel
export const SkeletonLoader: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full border border-slate-200 bg-white rounded-sm overflow-hidden animate-fade-in p-2">
      {/* Table Header Shimmer */}
      <div className="flex bg-slate-50 border-b border-slate-200 py-2 px-3 space-x-4 mb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3.5 bg-slate-200 animate-pulse rounded-xs flex-1" />
        ))}
      </div>
      {/* Table Rows Shimmer */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rIndex) => (
          <div key={rIndex} className="flex py-2 px-3 space-x-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
            {Array.from({ length: cols }).map((_, cIndex) => (
              <div
                key={cIndex}
                className="h-3 bg-slate-100 animate-pulse rounded-xs flex-1"
                style={{
                  animationDelay: `${rIndex * 50 + cIndex * 30}ms`,
                  opacity: 1 - rIndex * 0.1
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. Card level Shimmer loader
export const SkeletonCard: React.FC = () => {
  return (
    <div className="border border-slate-200 rounded p-4 bg-white space-y-3 shadow-xs">
      <div className="flex justify-between items-center bg-slate-50 p-1.5 border border-slate-200 last:mb-1">
        <div className="h-3 bg-slate-200 animate-pulse rounded-xs w-1/3" />
        <div className="h-3 bg-slate-200 animate-pulse rounded-xs w-8" />
      </div>
      <div className="space-y-2">
        <div className="h-2.5 bg-slate-100 animate-pulse rounded w-3/4" />
        <div className="h-2.5 bg-slate-100 animate-pulse rounded w-1/2" />
        <div className="h-2.5 bg-slate-100 animate-pulse rounded w-5/6" />
      </div>
    </div>
  );
};

// 6. Expandable section with height transition
interface ExpandableSectionProps {
  isOpen: boolean;
  children: React.ReactNode;
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({ isOpen, children }) => {
  return (
    <motion.div
      initial={false}
      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
};

// 7. Status badge micro-transition
interface AnimateBadgeProps {
  status: string;
  className?: string;
  children: React.ReactNode;
}

export const AnimateBadge: React.FC<AnimateBadgeProps> = ({ status, className = '', children }) => {
  return (
    <motion.span
      key={status}
      initial={{ scale: 0.9, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0.7 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${className}`}
    >
      {children}
    </motion.span>
  );
};

// 8. Progress Indicator Animation for Uploading/Actions
interface UploadProgressProps {
  progressCount: number;
  isCompleted?: boolean;
}

export const UploadProgressBar: React.FC<UploadProgressProps> = ({ progressCount, isCompleted = false }) => {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200 relative">
      <motion.div
        className={`h-full ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-sky-500 to-blue-600'}`}
        initial={{ width: '0%' }}
        animate={{ width: `${progressCount}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
      {!isCompleted && progressCount < 100 && (
        <motion.div
          className="absolute inset-0 bg-white/30"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: '30%', filter: 'blur(4px)' }}
        />
      )}
    </div>
  );
};

// 9. Success Action Toast overlay with enterprise aesthetic 
interface SuccessToastProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ message, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 2800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 bg-[#edfbf3] border border-[#a2e9bc] text-[#125d30] px-3.5 py-2.5 rounded shadow-lg flex items-center space-x-2 w-max max-w-sm font-sans"
        >
          <div className="bg-[#125d30] text-white p-1 rounded-full flex items-center justify-center shrink-0">
            <Check size={12} className="stroke-[3]" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[11px] uppercase tracking-wider text-green-900">Success</div>
            <div className="text-[10px] text-gray-700 leading-tight">{message}</div>
          </div>
          <button onClick={onClose} className="text-emerald-800 hover:text-emerald-950 font-bold px-1.5 focus:outline-none">
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const triggerSuccessToast = (message: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-success-toast', { detail: { message } }));
  }
};

