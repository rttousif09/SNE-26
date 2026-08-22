import React, { useState } from 'react';
import { AlertTriangle, Lock, Trash2, X, Check, ShieldAlert, ArrowLeftRight } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'lock' | 'reverse' | 'primary';
  confirmLabel?: string;
  cancelLabel?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  recordSummary?: { label: string; value: string | number }[];
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'primary',
  confirmLabel,
  cancelLabel = 'Cancel',
  requireReason = false,
  reasonPlaceholder = 'Please enter reason for this action...',
  recordSummary = []
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Reason is mandatory for this operation.');
      return;
    }
    setError('');
    onConfirm(reason);
    setReason('');
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900',
          icon: <Trash2 size={20} />,
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
          defaultConfirm: 'Delete Record'
        };
      case 'lock':
        return {
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700',
          icon: <Lock size={20} />,
          btnClass: 'bg-slate-900 hover:bg-black text-white dark:bg-slate-700 dark:hover:bg-slate-600',
          defaultConfirm: 'Post & Lock'
        };
      case 'reverse':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
          icon: <ArrowLeftRight size={20} />,
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          defaultConfirm: 'Reverse Transaction'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
          icon: <AlertTriangle size={20} />,
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          defaultConfirm: 'Proceed'
        };
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900',
          icon: <ShieldAlert size={20} />,
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          defaultConfirm: 'Confirm'
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start space-x-3.5">
            <div className={`p-2.5 rounded-lg shrink-0 ${style.iconBg}`}>
              {style.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Record Summary Table if provided */}
          {recordSummary.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1.5 font-sans">
              {recordSummary.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{item.label}:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reason Input */}
          {requireReason && (
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                rows={2}
                placeholder={reasonPlaceholder}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {error && <p className="text-[11px] text-rose-600 mt-1 font-semibold">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer ${style.btnClass}`}
          >
            {confirmLabel || style.defaultConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};
