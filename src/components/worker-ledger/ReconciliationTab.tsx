import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, AlertTriangle, Calendar, RefreshCw, ArrowRight } from 'lucide-react';
import { SAPSelect } from '../SAPSelect';

interface ReconciliationData {
  workerId: string;
  month: string;
  openingBalance: number;
  monthEarnings: number;
  monthAdvances: number;
  monthKharchi: number;
  monthMess: number;
  monthRecovery: number;
  monthPayments: number;
  monthAdjustments: number;
  monthOtherDebits: number;
  expectedClosingBalance: number;
  ledgerClosingBalance: number;
  difference: number;
  status: 'Reconciled' | 'Attention Required';
}

interface Props {
  workerId: string;
  workerName: string;
  projectId: string;
  projects: Array<{ id: string; name: string }>;
}

export const ReconciliationTab: React.FC<Props> = ({
  workerId,
  workerName,
  projectId,
  projects
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [selectedProject, setSelectedProject] = useState(projectId || 'All');
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReconciliation = async () => {
    if (!workerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/worker-ledger/reconciliation?workerId=${workerId}&month=${selectedMonth}&projectId=${selectedProject}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, [workerId, selectedMonth, selectedProject]);

  const isReconciled = data?.status === 'Reconciled';

  return (
    <div className="space-y-4 text-[11px]">
      
      {/* Control Bar */}
      <div className="bg-[#f0f4f8] p-3 rounded border border-gray-300 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#0a6ed1]" />
            <label className="font-bold text-gray-700">Reconciliation Period:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-mono font-semibold"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <label className="font-bold text-gray-700">Project / Site:</label>
            <SAPSelect
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
            >
              <option value="All">All Projects Consolidated</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SAPSelect>
          </div>
        </div>

        <button
          onClick={fetchReconciliation}
          disabled={loading}
          className="px-3 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded font-medium text-[10px] flex items-center space-x-1 shadow-xs"
        >
          <RefreshCw className={`w-3 h-3 text-[#0a6ed1] ${loading ? 'animate-spin' : ''}`} />
          <span>Recalculate Verification</span>
        </button>
      </div>

      {/* Main Reconciliation Audit Card */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Formula Breakup Box (Left 7 Cols) */}
          <div className="md:col-span-7 bg-white border border-gray-300 rounded-lg p-4 shadow-xs space-y-3">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="font-bold text-gray-900 text-xs flex items-center space-x-1.5">
                <Calculator className="w-4 h-4 text-[#0a6ed1]" />
                <span>Sub-Ledger Mathematical Equation for {selectedMonth}</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Worker: <strong>{workerName}</strong> | Audited Period: <strong>{selectedMonth}</strong>
              </p>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              
              <div className="flex justify-between items-center py-1 border-b border-gray-150">
                <span className="font-sans text-gray-700">Opening Balance (brought forward prior to {selectedMonth}-01):</span>
                <span className={`font-bold ${data.openingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ₹{Math.abs(Math.round(data.openingBalance)).toLocaleString('en-IN')} {data.openingBalance >= 0 ? 'Cr' : 'Dr'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-150 text-emerald-700 font-semibold">
                <span className="font-sans">(+) Certified Work Earnings / Floor Abstract:</span>
                <span>+ ₹{Math.round(data.monthEarnings).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-150 text-rose-700">
                <span className="font-sans">(-) Site, Travel & Other Advances Disbursed:</span>
                <span>- ₹{Math.round(data.monthAdvances).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-150 text-amber-700">
                <span className="font-sans">(-) Weekly Pocket Money (Kharchi) Given:</span>
                <span>- ₹{Math.round(data.monthKharchi).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-150 text-purple-700">
                <span className="font-sans">(-) Mess & Boarding Deductions:</span>
                <span>- ₹{Math.round(data.monthMess).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-150 text-indigo-700">
                <span className="font-sans">(-) Tool / Material / Safety Recovery Deductions:</span>
                <span>- ₹{Math.round(data.monthRecovery).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-150 text-gray-700">
                <span className="font-sans">(±) Authorized Manual Adjustments:</span>
                <span>{data.monthAdjustments >= 0 ? '+' : '-'} ₹{Math.abs(Math.round(data.monthAdjustments)).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-150 text-emerald-800 font-semibold">
                <span className="font-sans">(-) Net Wage Cash / Bank Payments Settled:</span>
                <span>- ₹{Math.round(data.monthPayments).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-2 bg-blue-50/60 px-2 rounded font-bold text-xs border border-blue-200">
                <span className="font-sans text-blue-900">(=) Expected Closing Balance:</span>
                <span className={data.expectedClosingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  ₹{Math.abs(Math.round(data.expectedClosingBalance)).toLocaleString('en-IN')} {data.expectedClosingBalance >= 0 ? 'Cr' : 'Dr'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Verification Result & Difference (Right 5 Cols) */}
          <div className="md:col-span-5 bg-white border border-gray-300 rounded-lg p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-b border-gray-200 pb-2 mb-3">
                <h3 className="font-bold text-gray-900 text-xs">Closing Balance Verification</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Automated Comparison against Running Sub-Ledger</p>
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-sans block uppercase">Expected Closing Balance</span>
                  <span className="text-base font-bold text-gray-900 mt-0.5 block">
                    ₹{Math.abs(Math.round(data.expectedClosingBalance)).toLocaleString('en-IN')} {data.expectedClosingBalance >= 0 ? 'Cr' : 'Dr'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-sans block uppercase">Actual Ledger Closing Balance</span>
                  <span className="text-base font-bold text-gray-900 mt-0.5 block">
                    ₹{Math.abs(Math.round(data.ledgerClosingBalance)).toLocaleString('en-IN')} {data.ledgerClosingBalance >= 0 ? 'Cr' : 'Dr'}
                  </span>
                </div>

                <div className={`p-3 rounded border ${
                  isReconciled ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
                }`}>
                  <span className="text-[10px] font-sans block uppercase font-bold text-gray-700">Variance / Difference</span>
                  <span className={`text-lg font-black mt-0.5 block ${isReconciled ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ₹{Math.abs(data.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Reconciliation Status Badge */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className={`p-3 rounded-lg border flex items-center space-x-2.5 ${
                isReconciled 
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-900' 
                  : 'bg-rose-100/70 border-rose-400 text-rose-900'
              }`}>
                {isReconciled ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-xs uppercase tracking-wide">
                    Status: {data.status}
                  </div>
                  <div className="text-[10px] font-medium mt-0.5">
                    {isReconciled
                      ? 'All debits and credits mathematically balance with zero discrepancy.'
                      : 'Attention Required: A financial mismatch was detected between transaction postings and running balances.'}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
