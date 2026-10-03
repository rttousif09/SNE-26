import React from 'react';
import { DollarSign, ArrowDownLeft, CheckCircle2, AlertTriangle, Clock, RefreshCw, Plus, Printer, FileSpreadsheet } from 'lucide-react';

export interface KharchiSummaryData {
  totalKharchi: number;
  totalRecovered: number;
  totalOutstanding: number;
  currentMonthKharchi: number;
  previousOutstanding: number;
  workerSummary: Array<{
    workerId: string;
    workerName: string;
    workerEmployeeId: string;
    currentProject: string;
    totalKharchi: number;
    totalRecovered: number;
    totalOutstanding: number;
    count: number;
  }>;
  reconciliation: {
    totalPosted: number;
    totalRecovered: number;
    calculatedOutstanding: number;
    sumIndividualOutstanding: number;
    difference: number;
    status: 'Reconciled' | 'Reconciliation Error – Review Required';
  };
}

interface Props {
  summary: KharchiSummaryData | null;
  loading: boolean;
  onRefresh: () => void;
  onCreateNew: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
}

export const KharchiSummaryRibbon: React.FC<Props> = ({
  summary,
  loading,
  onRefresh,
  onCreateNew,
  onExportExcel,
  onPrint
}) => {
  const isReconciled = summary?.reconciliation.status === 'Reconciled';

  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-xs mb-3 text-[11px] overflow-hidden">
      
      {/* Top Action Ribbon */}
      <div className="bg-[#f0f4f8] px-3.5 py-2 border-b border-gray-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-800 text-xs">Worker Kharchi Financial Sub-Ledger</span>
          <span className="text-gray-400">|</span>
          <span className="text-[10px] text-gray-500 font-medium">Continuous Worker Financial Liability</span>
          {summary && (
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center space-x-1 ${
              isReconciled 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}>
              {isReconciled ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-rose-600" />}
              <span>{isReconciled ? 'Reconciled (Diff: ₹0.00)' : 'Reconciliation Discrepancy'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 print:hidden">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded text-[10px] font-semibold flex items-center space-x-1 shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[#0a6ed1] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onPrint}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded text-[10px] font-semibold flex items-center space-x-1 shadow-xs transition"
          >
            <Printer className="w-3 h-3 text-gray-500" />
            <span>Print</span>
          </button>
          <button
            onClick={onExportExcel}
            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[10px] font-semibold flex items-center space-x-1 shadow-xs transition"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-[10px] font-bold flex items-center space-x-1 shadow-xs transition"
          >
            <Plus className="w-3 h-3" />
            <span>+ Create Kharchi</span>
          </button>
        </div>
      </div>

      {/* 5 Financial Metric Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-gray-200 bg-white">
        
        {/* 1. Total Kharchi */}
        <div className="p-2.5 text-center">
          <span className="text-[9.5px] uppercase tracking-wider text-gray-500 font-bold block">Total Kharchi</span>
          <span className="font-mono font-bold text-gray-900 text-sm mt-0.5 block">
            ₹{summary ? Math.round(summary.totalKharchi).toLocaleString('en-IN') : '0'}
          </span>
          <span className="text-[8.5px] text-gray-400">Total Posted (Debit)</span>
        </div>

        {/* 2. Total Recovered */}
        <div className="p-2.5 text-center">
          <span className="text-[9.5px] uppercase tracking-wider text-gray-500 font-bold block">Total Recovered</span>
          <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">
            ₹{summary ? Math.round(summary.totalRecovered).toLocaleString('en-IN') : '0'}
          </span>
          <span className="text-[8.5px] text-gray-400">Settled via PAY01</span>
        </div>

        {/* 3. Total Outstanding */}
        <div className="p-2.5 text-center bg-rose-50/30">
          <span className="text-[9.5px] uppercase tracking-wider text-rose-800 font-black block">Total Outstanding</span>
          <span className="font-mono font-black text-rose-700 text-sm mt-0.5 block">
            ₹{summary ? Math.round(summary.totalOutstanding).toLocaleString('en-IN') : '0'} Dr
          </span>
          <span className="text-[8.5px] text-rose-600 font-medium">Pending Worker Recovery</span>
        </div>

        {/* 4. Current Month Kharchi */}
        <div className="p-2.5 text-center">
          <span className="text-[9.5px] uppercase tracking-wider text-gray-500 font-bold block">Current Month Kharchi</span>
          <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">
            ₹{summary ? Math.round(summary.currentMonthKharchi).toLocaleString('en-IN') : '0'}
          </span>
          <span className="text-[8.5px] text-gray-400">Disbursed This Month</span>
        </div>

        {/* 5. Previous Outstanding */}
        <div className="p-2.5 text-center bg-amber-50/30">
          <span className="text-[9.5px] uppercase tracking-wider text-amber-900 font-bold block">Previous Outstanding</span>
          <span className="font-mono font-bold text-amber-800 text-sm mt-0.5 block">
            ₹{summary ? Math.round(summary.previousOutstanding).toLocaleString('en-IN') : '0'}
          </span>
          <span className="text-[8.5px] text-amber-700 font-medium">Carried Forward Past Dues</span>
        </div>

      </div>

    </div>
  );
};
