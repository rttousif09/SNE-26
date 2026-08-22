import React from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, XCircle, Lock, 
  FileEdit, AlertCircle, ShieldCheck, ArrowUpRight
} from 'lucide-react';

export type StatusVariant = 
  | 'Approved' | 'Paid' | 'Active' | 'Completed' | 'Healthy'
  | 'Posted' | 'Ongoing' | 'In Progress' | 'Open' | 'Submitted'
  | 'Pending' | 'Warning' | 'Under Review'
  | 'Draft' | 'Hold' | 'Partial'
  | 'Rejected' | 'Critical' | 'Overdue' | 'Outstanding' | 'Cancelled'
  | 'Locked' | 'Archived' | 'Closed';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  size = 'sm',
  className = '',
  showIcon = true
}) => {
  const normStatus = (variant || status || 'Pending').trim();
  const lower = normStatus.toLowerCase();

  let style = {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500',
    icon: <Clock size={size === 'lg' ? 14 : 11} className="shrink-0" />
  };

  // 1. Success / Green (Approved, Paid, Completed, Active, Healthy)
  if (
    lower === 'approved' || lower === 'paid' || lower === 'completed' || 
    lower === 'active' || lower === 'healthy' || lower === 'fully paid' || lower === 'settled'
  ) {
    style = {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      icon: <CheckCircle2 size={size === 'lg' ? 14 : 11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
    };
  }
  // 2. Info / Primary Action / Blue (Posted, Ongoing, In Progress, Submitted, Open)
  else if (
    lower === 'posted' || lower === 'ongoing' || lower === 'in progress' || 
    lower === 'submitted' || lower === 'open' || lower === 'verified' || lower === 'certified'
  ) {
    style = {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-800',
      dot: 'bg-blue-500',
      icon: <ShieldCheck size={size === 'lg' ? 14 : 11} className="shrink-0 text-blue-600 dark:text-blue-400" />
    };
  }
  // 3. Warning / Amber (Pending, Under Review, Warning, Partial, Hold)
  else if (
    lower === 'pending' || lower === 'under review' || lower === 'warning' || 
    lower === 'partial' || lower === 'partially paid' || lower === 'awaiting approval'
  ) {
    style = {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      dot: 'bg-amber-500',
      icon: <Clock size={size === 'lg' ? 14 : 11} className="shrink-0 text-amber-600 dark:text-amber-400" />
    };
  }
  // 4. Draft / Neutral Yellow
  else if (lower === 'draft' || lower === 'hold' || lower === 'unposted') {
    style = {
      bg: 'bg-yellow-50 dark:bg-yellow-950/40',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-800',
      dot: 'bg-yellow-500',
      icon: <FileEdit size={size === 'lg' ? 14 : 11} className="shrink-0 text-yellow-600 dark:text-yellow-400" />
    };
  }
  // 5. Error / Critical / Red (Rejected, Overdue, Outstanding, Critical, Cancelled)
  else if (
    lower === 'rejected' || lower === 'overdue' || lower === 'outstanding' || 
    lower === 'critical' || lower === 'cancelled' || lower === 'failed' || lower === 'mismatch'
  ) {
    style = {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-800',
      dot: 'bg-rose-500',
      icon: <XCircle size={size === 'lg' ? 14 : 11} className="shrink-0 text-rose-600 dark:text-rose-400" />
    };
  }
  // 6. Locked / Dark Grey (Locked, Archived, Closed)
  else if (lower === 'locked' || lower === 'archived' || lower === 'closed') {
    style = {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-800 dark:text-slate-200',
      border: 'border-slate-400 dark:border-slate-600',
      dot: 'bg-slate-600',
      icon: <Lock size={size === 'lg' ? 14 : 11} className="shrink-0 text-slate-700 dark:text-slate-300" />
    };
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    lg: 'text-xs px-2.5 py-1 gap-2 font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md font-sans border font-medium whitespace-nowrap tracking-tight select-none shadow-2xs ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
    >
      {showIcon && style.icon}
      <span>{normStatus}</span>
    </span>
  );
};
