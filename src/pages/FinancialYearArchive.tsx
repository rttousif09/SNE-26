import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { 
  Archive, Lock, Unlock, Plus, Calendar, DollarSign, 
  TrendingUp, Users, Package, AlertTriangle, FileText, CheckCircle
} from 'lucide-react';
import { FinancialYear, FinancialYearStatus } from '../types';

export const FinancialYearArchive: React.FC = () => {
  const { 
    user, 
    financialYears, 
    addFinancialYear, 
    updateFinancialYear,
    billings,
    clientPayments,
    workerPayments,
    kharchis,
    materialPurchases,
    expensesLedger
  } = useAppContext();

  const isAdmin = user?.username === 'admin' || user?.username === 'saddamsne';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'manage' | 'compare'>('dashboard');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const getComputedTotals = (start: string, end: string) => {
    // Helper to check if date is within range
    const inRange = (dateStr?: string) => {
      if (!dateStr) return false;
      return dateStr >= start && dateStr <= end;
    };

    const totalBilling = billings.filter(b => inRange(b.certifyDate)).reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalReceipts = clientPayments.filter(c => inRange(c.date)).reduce((sum, c) => sum + (c.amountReceived || 0), 0);
    
    const workerPaySum = workerPayments.filter(w => inRange(w.date)).reduce((sum, w) => sum + (w.netPayment || 0), 0);
    const kharchiSum = kharchis.filter(k => inRange(k.date)).reduce((sum, k) => sum + (k.amount || 0), 0);
    const labourCost = workerPaySum + kharchiSum;

    const materialCost = materialPurchases.filter(m => inRange(m.purchaseDate)).reduce((sum, m) => sum + (m.totalAmount || 0), 0);
    const expenses = expensesLedger.filter(e => inRange(e.date)).reduce((sum, e) => sum + (e.tiffin || 0) + (e.travel || 0) + (e.machineryMaterial || 0) + (e.stationery || 0) + (e.others || 0), 0);


    const profitLoss = totalBilling - (labourCost + materialCost + expenses);

    return { totalBilling, totalReceipts, labourCost, materialCost, expenses, profitLoss };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    await addFinancialYear({
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: 'Active',
      totalBilling: 0,
      totalReceipts: 0,
      labourCost: 0,
      materialCost: 0,
      expenses: 0,
      profitLoss: 0
    });

    setIsAdding(false);
    setFormData({ name: '', startDate: '', endDate: '' });
  };

  const handleCloseYear = async (fy: FinancialYear) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to CLOSE ${fy.name}? This will compute and freeze the year's totals.`)) return;

    const totals = getComputedTotals(fy.startDate, fy.endDate);
    
    await updateFinancialYear(fy.id, {
      status: 'Closed',
      ...totals,
      closedBy: user?.name || user?.username,
      closedDate: new Date().toISOString()
    });
  };

  const handleArchiveYear = async (fy: FinancialYear) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to ARCHIVE ${fy.name}? It will become read-only for reporting.`)) return;
    
    await updateFinancialYear(fy.id, { status: 'Archived' });
  };

  const handleReopenYear = async (fy: FinancialYear) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to REOPEN ${fy.name}? Totals will resume live calculation.`)) return;
    
    await updateFinancialYear(fy.id, { status: 'Active', closedBy: undefined, closedDate: undefined });
  };

  // Sort FYs by start date descending
  const sortedFys = [...financialYears].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const activeFy = sortedFys.find(f => f.status === 'Active');

  const getDisplayTotals = (fy: FinancialYear) => {
    if (fy.status === 'Active') {
      return getComputedTotals(fy.startDate, fy.endDate);
    }
    return {
      totalBilling: fy.totalBilling,
      totalReceipts: fy.totalReceipts,
      labourCost: fy.labourCost,
      materialCost: fy.materialCost,
      expenses: fy.expenses,
      profitLoss: fy.profitLoss
    };
  };

  return (
    <div className="h-full flex flex-col p-2 space-y-2 overflow-y-auto bg-gray-50 text-[11px]">
      <div className="flex items-center justify-between bg-white p-2 rounded shadow-sm border border-gray-200">
        <div className="flex flex-col">
          <h2 className="text-sm font-black text-[#002f6c] flex items-center gap-1.5">
            <Archive size={16} /> Financial Year Archive & Closing
          </h2>
          <span className="text-gray-500 font-medium">Manage, close, and archive financial records.</span>
        </div>
        <div className="flex space-x-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`sap-btn px-3 py-1 ${activeTab === 'dashboard' ? 'bg-[#002f6c] text-white' : 'bg-white text-gray-700'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`sap-btn px-3 py-1 ${activeTab === 'manage' ? 'bg-[#002f6c] text-white' : 'bg-white text-gray-700'}`}
          >
            Manage FYs
          </button>
          <button 
            onClick={() => setActiveTab('compare')}
            className={`sap-btn px-3 py-1 ${activeTab === 'compare' ? 'bg-[#002f6c] text-white' : 'bg-white text-gray-700'}`}
          >
            Comparison Reports
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-2">
          {sortedFys.map(fy => {
            const totals = getDisplayTotals(fy);
            const isLoss = totals.profitLoss < 0;
            return (
              <div key={fy.id} className="sap-panel bg-white p-3 shadow-xs flex flex-col space-y-3 border-l-4" style={{ borderColor: fy.status === 'Active' ? '#10b981' : fy.status === 'Closed' ? '#f59e0b' : '#64748b' }}>
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex flex-col">
                    <span className="font-black text-sm text-gray-800">{fy.name}</span>
                    <span className="text-gray-500 font-semibold">{fy.startDate} to {fy.endDate}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                      fy.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      fy.status === 'Closed' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {fy.status} Period
                    </span>
                    {fy.status === 'Archived' && <Lock size={12} className="text-gray-500" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                  <div className="bg-blue-50 p-2 rounded flex flex-col">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><FileText size={10}/> Total Billing</span>
                    <span className="text-sm font-black text-blue-800 mt-1">₹{totals.totalBilling.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded flex flex-col">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><DollarSign size={10}/> Total Receipts</span>
                    <span className="text-sm font-black text-emerald-800 mt-1">₹{totals.totalReceipts.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="bg-orange-50 p-2 rounded flex flex-col">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><Users size={10}/> Labour Cost</span>
                    <span className="text-sm font-black text-orange-800 mt-1">₹{totals.labourCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="bg-purple-50 p-2 rounded flex flex-col">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><Package size={10}/> Material Cost</span>
                    <span className="text-sm font-black text-purple-800 mt-1">₹{totals.materialCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="bg-rose-50 p-2 rounded flex flex-col">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><AlertTriangle size={10}/> Expenses</span>
                    <span className="text-sm font-black text-rose-800 mt-1">₹{totals.expenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className={`p-2 rounded flex flex-col ${isLoss ? 'bg-red-100' : 'bg-teal-50'}`}>
                    <span className="text-gray-700 font-black flex items-center gap-1"><TrendingUp size={10}/> Profit/Loss</span>
                    <span className={`text-sm font-black mt-1 ${isLoss ? 'text-red-700' : 'text-teal-700'}`}>
                      {isLoss ? '-' : ''}₹{Math.abs(totals.profitLoss).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {sortedFys.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded italic">
              No Financial Years have been created yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="flex flex-col gap-2">
          {isAdmin && (
            <div className="sap-panel bg-white p-2">
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="sap-btn bg-blue-600 text-white font-bold flex items-center gap-1 px-3 py-1"
              >
                <Plus size={12} /> Make New Financial Year
              </button>

              {isAdding && (
                <form onSubmit={handleCreate} className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">FY Name (e.g. FY 2025-26)</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="sap-input w-full" placeholder="FY 2026-27" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Start Date</label>
                    <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="sap-input w-full" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">End Date</label>
                    <input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="sap-input w-full" />
                  </div>
                  <div>
                    <button type="submit" className="sap-btn bg-emerald-600 text-white font-bold w-full">Save Financial Year</button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="sap-panel bg-white overflow-hidden shadow-xs">
            <table className="sap-table w-full text-left">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-1.5 font-black text-gray-700">Financial Year</th>
                  <th className="p-1.5 font-black text-gray-700">Duration Period</th>
                  <th className="p-1.5 font-black text-gray-700">Status</th>
                  <th className="p-1.5 font-black text-gray-700">Closed By/On</th>
                  <th className="p-1.5 font-black text-gray-700 text-center">Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFys.map(fy => (
                  <tr key={fy.id} className="border-b">
                    <td className="p-1.5 font-bold text-gray-800">{fy.name}</td>
                    <td className="p-1.5 text-gray-600">{fy.startDate} to {fy.endDate}</td>
                    <td className="p-1.5">
                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                        fy.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                        fy.status === 'Closed' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {fy.status}
                      </span>
                    </td>
                    <td className="p-1.5 text-gray-500 text-[10px]">
                      {fy.closedBy ? `${fy.closedBy} on ${new Date(fy.closedDate!).toLocaleDateString()}` : '—'}
                    </td>
                    <td className="p-1.5 text-center">
                      {!isAdmin ? (
                        <span className="text-gray-400 italic">No access</span>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          {fy.status === 'Active' && (
                            <button onClick={() => handleCloseYear(fy)} className="px-2 py-0.5 bg-orange-100 text-orange-700 font-bold rounded hover:bg-orange-200 border border-orange-200 flex items-center gap-1 text-[9px]">
                              <CheckCircle size={9}/> Close Year
                            </button>
                          )}
                          {fy.status === 'Closed' && (
                            <>
                              <button onClick={() => handleArchiveYear(fy)} className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded hover:bg-gray-200 border border-gray-300 flex items-center gap-1 text-[9px]">
                                <Archive size={9}/> Archive
                              </button>
                              <button onClick={() => handleReopenYear(fy)} className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 border border-blue-200 flex items-center gap-1 text-[9px]">
                                <Unlock size={9}/> Reopen
                              </button>
                            </>
                          )}
                          {fy.status === 'Archived' && (
                            <button onClick={() => handleReopenYear(fy)} className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 border border-blue-200 flex items-center gap-1 text-[9px]">
                              <Unlock size={9}/> Reopen
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="sap-panel bg-white p-3">
          <h3 className="font-black text-gray-700 mb-3 border-b pb-1">Periodical Comparison & Growth Report</h3>
          {sortedFys.length < 2 ? (
            <div className="text-gray-500 italic p-4 text-center bg-slate-50 rounded">
              Need at least 2 financial years to generate comparison reports.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="sap-table w-full text-left">
                <thead>
                  <tr className="bg-slate-100 text-gray-700 font-black">
                    <th className="p-2 border-r">Metric</th>
                    {sortedFys.map(fy => (
                      <th key={fy.id} className="p-2 text-right">{fy.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Total Billing', key: 'totalBilling' as const },
                    { label: 'Total Receipts', key: 'totalReceipts' as const },
                    { label: 'Labour Cost', key: 'labourCost' as const },
                    { label: 'Material Cost', key: 'materialCost' as const },
                    { label: 'Expenses', key: 'expenses' as const },
                    { label: 'Net Profit/Loss', key: 'profitLoss' as const }
                  ].map((metric, idx) => (
                    <tr key={metric.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 border-r font-bold text-gray-700">{metric.label}</td>
                      {sortedFys.map((fy, fIdx) => {
                        const vals = getDisplayTotals(fy);
                        const val = vals[metric.key];
                        
                        // Compare with previous FY (the next element in sorted array, since it's sorted descending)
                        let growthStr = '';
                        let isPositive = false;
                        if (fIdx < sortedFys.length - 1) {
                          const prevVals = getDisplayTotals(sortedFys[fIdx + 1]);
                          const prevVal = prevVals[metric.key];
                          if (prevVal > 0) {
                            const growth = ((val - prevVal) / prevVal) * 100;
                            isPositive = growth > 0;
                            growthStr = `${isPositive ? '+' : ''}${growth.toFixed(1)}%`;
                          }
                        }

                        return (
                          <td key={fy.id} className="p-2 text-right">
                            <div className="font-black text-gray-800">
                              ₹{val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            {growthStr && (
                              <div className={`text-[9px] font-bold ${metric.key === 'expenses' || metric.key === 'labourCost' || metric.key === 'materialCost' ? (isPositive ? 'text-red-600' : 'text-emerald-600') : (isPositive ? 'text-emerald-600' : 'text-red-600')}`}>
                                {growthStr} vs prv
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
