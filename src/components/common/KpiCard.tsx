import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, LucideIcon } from 'lucide-react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  isPositive?: boolean;
  subtitle?: string;
  icon?: LucideIcon | React.ReactNode;
  iconColor?: string;
  onClick?: () => void;
  className?: string;
  size?: 'default' | 'compact';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  trend,
  trendDirection,
  isPositive = true,
  subtitle,
  icon,
  iconColor = 'text-[#0F4C81]',
  onClick,
  className = '',
  size = 'default'
}) => {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-xs transition-all duration-200 flex flex-col justify-between relative group ${
        isClickable ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Header with Label and optional Icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans truncate">
          {label}
        </span>
        {icon && (
          <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 shrink-0">
            {typeof icon === 'function' ? React.createElement(icon as LucideIcon, { size: 15, className: iconColor }) : icon}
          </div>
        )}
      </div>

      {/* Main Large Value */}
      <div className="my-2">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-sans">
          {value}
        </div>
      </div>

      {/* Bottom Subtitle / Trend Comparison */}
      {(trend || subtitle) && (
        <div className="flex items-center justify-between gap-2 mt-0.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
          {trend ? (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                trendDirection === 'up'
                  ? isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  : trendDirection === 'down'
                  ? isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {trendDirection === 'up' && <TrendingUp size={12} className="shrink-0" />}
              {trendDirection === 'down' && <TrendingDown size={12} className="shrink-0" />}
              {trendDirection === 'neutral' && <Minus size={12} className="shrink-0" />}
              <span>{trend}</span>
            </span>
          ) : null}

          {subtitle && (
            <span className="text-slate-400 dark:text-slate-500 truncate text-[10px]">
              {subtitle}
            </span>
          )}

          {isClickable && (
            <ArrowUpRight size={12} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ml-auto shrink-0" />
          )}
        </div>
      )}
    </div>
  );
};
