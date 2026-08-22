import React, { useState } from 'react';
import { 
  Bell, AlertTriangle, ShieldCheck, DollarSign, Clock, 
  Users, Receipt, X, ArrowRight, CheckCircle2, AlertCircle,
  TrendingDown, FileText, Check
} from 'lucide-react';
import { useAppContext } from '../../store';
import { StatusBadge } from './StatusBadge';

interface AlertCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string, title?: string, extraProps?: any) => void;
}

export const AlertCenterModal: React.FC<AlertCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const { 
    approvals = [], advanceSheetApprovals = [], kharchiApprovals = [], 
    paymentSheetApprovals = [], billings = [], clientPayments = [],
    workers = [], projects = []
  } = useAppContext() as any;

  const [filter, setFilter] = useState<'all' | 'approvals' | 'collections' | 'operations'>('all');

  if (!isOpen) return null;

  // Calculate Alerts
  const alerts: {
    id: string;
    type: 'approvals' | 'collections' | 'operations';
    title: string;
    desc: string;
    severity: 'critical' | 'warning' | 'info';
    tab: string;
    actionLabel: string;
    amount?: number;
    time: string;
  }[] = [];

  // 1. Pending Approvals
  const pendingGeneral = approvals.filter((a: any) => a.status === 'Pending');
  if (pendingGeneral.length > 0) {
    alerts.push({
      id: 'alert-appr-gen',
      type: 'approvals',
      title: `${pendingGeneral.length} General Authorization Requests`,
      desc: 'Worker advances and requisition approvals awaiting manager sign-off.',
      severity: 'warning',
      tab: 'approvals',
      actionLabel: 'Review Approvals',
      time: 'Immediate'
    });
  }

  const pendingKharchi = kharchiApprovals.filter((k: any) => k.status === 'Pending');
  if (pendingKharchi.length > 0) {
    alerts.push({
      id: 'alert-appr-khar',
      type: 'approvals',
      title: `${pendingKharchi.length} Kharchi (Pocket Money) Sheets Pending`,
      desc: 'Weekly pocket money sheets submitted by site supervisors require audit.',
      severity: 'warning',
      tab: 'kharchi',
      actionLabel: 'Audit Kharchi',
      time: 'Urgent'
    });
  }

  const pendingPay = paymentSheetApprovals.filter((p: any) => p.status === 'Pending');
  if (pendingPay.length > 0) {
    alerts.push({
      id: 'alert-appr-pay',
      type: 'approvals',
      title: `${pendingPay.length} Worker Payment Sheets Pending`,
      desc: 'Fortnightly wage settlement registers ready for final verification.',
      severity: 'critical',
      tab: 'worker-payment',
      actionLabel: 'Authorize Payments',
      time: 'Action Needed'
    });
  }

  // 2. Collections & Outstanding
  const totalBilled = billings.reduce((sum: number, b: any) => {
    return sum + ((b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0));
  }, 0);
  const totalCollected = clientPayments.reduce((sum: number, cp: any) => sum + (cp.amountReceived || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalCollected);

  if (totalOutstanding > 0) {
    alerts.push({
      id: 'alert-col-out',
      type: 'collections',
      title: `Client Collections Outstanding: ₹${(totalOutstanding / 100000).toFixed(2)} Lakhs`,
      desc: 'Cumulative unpaid client balance across active project contracts.',
      severity: 'critical',
      tab: 'client-payment',
      actionLabel: 'Record Payment',
      time: 'Ongoing'
    });
  }

  // 3. Operational Alerts
  const activeWorkers = workers.filter((w: any) => !w.exitDate);
  if (activeWorkers.length > 0) {
    alerts.push({
      id: 'alert-op-wrk',
      type: 'operations',
      title: `${activeWorkers.length} Active Field Workers`,
      desc: 'Ensure daily labour attendance (DLR) is locked and reconciled for all sites.',
      severity: 'info',
      tab: 'dlr',
      actionLabel: 'Open DLR',
      time: 'Daily'
    });
  }

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.type === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0F4C81] dark:bg-[#0A2540] text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20">
              <Bell size={18} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Alert & Notification Center
              </h2>
              <p className="text-xs text-blue-100 dark:text-slate-300 mt-0.5">
                Real-time exception logs, pending approvals, and collection reminders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: `All Alerts (${alerts.length})` },
            { id: 'approvals', label: 'Approvals' },
            { id: 'collections', label: 'Collections' },
            { id: 'operations', label: 'Operations' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filter === t.id
                  ? 'bg-white dark:bg-[#1E2228] text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[460px] scrollbar-thin">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">All Clear</p>
              <p className="text-xs text-slate-500 mt-0.5">No critical exceptions or unhandled items found.</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isCritical = alert.severity === 'critical';
              const isWarning = alert.severity === 'warning';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isCritical
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                      : isWarning
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                        isCritical
                          ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400'
                          : isWarning
                          ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                      }`}>
                        {isCritical ? <AlertTriangle size={15} /> : isWarning ? <Clock size={15} /> : <AlertCircle size={15} />}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {alert.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {alert.desc}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                      {alert.time}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab(alert.tab);
                      }}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <span>{alert.actionLabel}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Enterprise Real-time Monitoring</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
