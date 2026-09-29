import React from 'react';
import { User, MapPin, Calendar, Briefcase, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft, ShieldAlert } from 'lucide-react';

export interface WorkerSummaryData {
  workerId: string;
  id: string;
  workerName: string;
  designation: string;
  currentProject: string;
  currentProjectId?: string;
  workerStatus: string;
  joiningDate: string;
  totalEarnings: number;
  totalAdvances: number;
  totalKharchi: number;
  totalMess: number;
  totalRecovery: number;
  totalHolds: number;
  totalPayments: number;
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  balanceType: 'Cr' | 'Dr';
  formattedBalance: string;
  transactionCount?: number;
}

interface Props {
  summary: WorkerSummaryData | null;
  loading: boolean;
  onSync: () => void;
  syncing: boolean;
  onOpenAdjustment: () => void;
  onOpenOpeningBalance: () => void;
  onOpenHold: () => void;
}

export const WorkerAccountSummary: React.FC<Props> = ({
  summary,
  loading,
  onSync,
  syncing,
  onOpenAdjustment,
  onOpenOpeningBalance,
  onOpenHold
}) => {
  if (!summary) {
    return (
      <div className="bg-white border border-gray-300 rounded p-4 text-center text-gray-500 text-xs">
        No worker selected. Please select a worker from the directory.
      </div>
    );
  }

  const isPositive = summary.currentBalance >= 0;

  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-sm mb-3 text-[11px] overflow-hidden">
      {/* Top Header Row with Worker Profile and Action Toolbar */}
      <div className="bg-[#f0f4f8] px-3.5 py-2.5 border-b border-gray-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#0a6ed1] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {summary.workerName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 text-xs">{summary.workerName}</span>
              <span className="bg-white px-1.5 py-0.2 rounded border border-gray-300 font-mono text-[10px] text-gray-700">
                {summary.workerId}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                summary.workerStatus === 'Active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}>
                {summary.workerStatus}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] text-gray-500 mt-0.5">
              <span className="flex items-center space-x-1">
                <Briefcase className="w-3 h-3 text-gray-400" />
                <span>{summary.designation || 'Worker'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-[#0a6ed1]" />
                <span className="font-semibold text-gray-700">{summary.currentProject}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Joined: {summary.joiningDate}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-1.5 print:hidden">
          <button
            onClick={onSync}
            disabled={syncing}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded text-[10px] font-medium flex items-center space-x-1 shadow-xs transition disabled:opacity-50"
            title="Synchronize all sub-ledger records from WFT01, KHA01, PAY01, Mess and Floor Abstracts"
          >
            <RefreshCw className={`w-3 h-3 text-[#0a6ed1] ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Sub-Ledger'}</span>
          </button>
          <button
            onClick={onOpenAdjustment}
            className="px-2.5 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-[10px] font-medium flex items-center space-x-1 shadow-xs transition"
          >
            <Plus className="w-3 h-3" />
            <span>Adjustment Entry</span>
          </button>
          <button
            onClick={onOpenOpeningBalance}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded text-[10px] font-medium flex items-center space-x-1 shadow-xs transition"
          >
            <span>Opening Balance</span>
          </button>
          <button
            onClick={onOpenHold}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-amber-700 border border-amber-300 rounded text-[10px] font-medium flex items-center space-x-1 shadow-xs transition"
          >
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            <span>Wage Hold</span>
          </button>
        </div>
      </div>

      {/* Financial Matrix Summary Ribbon (Classic SAP Sub-Ledger Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 divide-x divide-gray-200 border-b border-gray-200 bg-white">
        
        {/* Total Earnings */}
        <div className="p-2 text-center bg-blue-50/20">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold block">Total Earnings</span>
          <span className="font-mono font-bold text-gray-900 text-xs text-blue-700 mt-0.5 block">
            ₹{Math.round(summary.totalEarnings).toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-gray-400">Certified Cr</span>
        </div>

        {/* Total Advances */}
        <div className="p-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold block">Total Advances</span>
          <span className="font-mono font-bold text-gray-900 text-xs text-rose-700 mt-0.5 block">
            ₹{Math.round(summary.totalAdvances).toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-gray-400">Disbursed Dr</span>
        </div>

        {/* Total Kharchi */}
        <div className="p-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold block">Total Kharchi</span>
          <span className="font-mono font-bold text-gray-900 text-xs text-amber-700 mt-0.5 block">
            ₹{Math.round(summary.totalKharchi).toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-gray-400">Weekly Dr</span>
        </div>

        {/* Total Mess */}
        <div className="p-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold block">Total Mess</span>
          <span className="font-mono font-bold text-gray-900 text-xs text-purple-700 mt-0.5 block">
            ₹{Math.round(summary.totalMess).toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-gray-400">Boarding Dr</span>
        </div>

        {/* Total Recovery */}
        <div className="p-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold block">Total Recovery</span>
          <span className="font-mono font-bold text-gray-900 text-xs text-indigo-700 mt-0.5 block">
            ₹{Math.round(summary.totalRecovery).toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-gray-400">Deducted Dr</span>
        </div>

        {/* Total Holds */}
        <div className="p-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold block">Total Holds</span>
          <span className="font-mono font-bold text-gray-900 text-xs text-orange-700 mt-0.5 block">
            ₹{Math.round(summary.totalHolds).toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-gray-400">Active Retained</span>
        </div>

        {/* Total Payments */}
        <div className="p-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold block">Total Payments</span>
          <span className="font-mono font-bold text-gray-900 text-xs text-emerald-700 mt-0.5 block">
            ₹{Math.round(summary.totalPayments).toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-gray-400">Net Settled Dr</span>
        </div>

        {/* Current Balance */}
        <div className={`p-2 text-center ${isPositive ? 'bg-emerald-50/60' : 'bg-rose-50/60'}`}>
          <span className="text-[9px] uppercase tracking-wider font-bold block text-gray-700">Current Balance</span>
          <span className={`font-mono font-black text-sm mt-0.5 block ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {summary.formattedBalance}
          </span>
          <span className="text-[8px] font-semibold text-gray-600">
            {isPositive ? 'Payable to Worker (Cr)' : 'Worker Owes Company (Dr)'}
          </span>
        </div>

      </div>
    </div>
  );
};
