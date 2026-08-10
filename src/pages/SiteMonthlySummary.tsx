import React, { useState, useMemo, useEffect } from 'react';
import { SAPSelect } from '../components/SAPSelect';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { Printer, Edit, RotateCcw, Undo, Check } from 'lucide-react';

export const SiteMonthlySummary: React.FC = () => {
  const { expensesLedger, projects, kharchis, advances, workerPayments } = useAppContext();
  
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [billNo, setBillNo] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('Director');
  const [isEditing, setIsEditing] = useState(false);

  const storageKey = `${selectedProject}_${selectedMonth}`;

  // Load from localStorage on storageKey change
  useEffect(() => {
    if (!selectedProject || !selectedMonth) return;
    try {
      const savedBill = localStorage.getItem(`sn_bill_no_${storageKey}`) || '';
      const savedPrep = localStorage.getItem(`sn_prep_by_${storageKey}`) || '';
      const savedAppr = localStorage.getItem(`sn_appr_by_${storageKey}`) || 'Director';
      setBillNo(savedBill);
      setPreparedBy(savedPrep);
      setApprovedBy(savedAppr);
    } catch (e) {
      console.error(e);
    }
  }, [selectedProject, selectedMonth, storageKey]);

  // Propagate key updates to storage
  const handleBillNoChange = (val: string) => {
    setBillNo(val);
    try {
      localStorage.setItem(`sn_bill_no_${storageKey}`, val);
    } catch (e) {}
  };

  const handlePreparedByChange = (val: string) => {
    setPreparedBy(val);
    try {
      localStorage.setItem(`sn_prep_by_${storageKey}`, val);
    } catch (e) {}
  };

  const handleApprovedByChange = (val: string) => {
    setApprovedBy(val);
    try {
      localStorage.setItem(`sn_appr_by_${storageKey}`, val);
    } catch (e) {}
  };

  // Load manual overrides from localStorage
  const [overrides, setOverrides] = useState<Record<string, Record<number, { desc?: string; amount?: number; remarks?: string }>>>(() => {
    try {
      const saved = localStorage.getItem('sn_monthly_summary_overrides_v1');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const saveOverrides = (newOverrides: typeof overrides) => {
    setOverrides(newOverrides);
    try {
      localStorage.setItem('sn_monthly_summary_overrides_v1', JSON.stringify(newOverrides));
    } catch (e) {
      console.error('Failed to save monthly summary overrides', e);
    }
  };

  const handleUpdateCell = (rowId: number, field: 'desc' | 'amount' | 'remarks', value: any) => {
    const currentProjectOverrides = overrides[storageKey] || {};
    const currentRowOverrides = currentProjectOverrides[rowId] || {};
    
    let parsedValue = value;
    if (field === 'amount') {
      parsedValue = value === '' ? 0 : parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
    }

    const updatedRow = {
      ...currentRowOverrides,
      [field]: parsedValue,
    };

    const updatedOverrides = {
      ...overrides,
      [storageKey]: {
        ...currentProjectOverrides,
        [rowId]: updatedRow,
      },
    };

    saveOverrides(updatedOverrides);
  };

  const handleResetRow = (rowId: number) => {
    const currentProjectOverrides = { ...(overrides[storageKey] || {}) };
    delete currentProjectOverrides[rowId];

    const updatedOverrides = {
      ...overrides,
      [storageKey]: currentProjectOverrides,
    };

    // Clean up key if empty
    if (Object.keys(currentProjectOverrides).length === 0) {
      delete updatedOverrides[storageKey];
    }

    saveOverrides(updatedOverrides);
  };

  const handleResetCurrent = () => {
    if (window.confirm('Are you sure you want to reset all manual additions/edits for this project and month to dynamic backend values?')) {
      const updatedOverrides = { ...overrides };
      delete updatedOverrides[storageKey];
      saveOverrides(updatedOverrides);
    }
  };

  const hasCurrentOverrides = useMemo(() => {
    const currentProjectOverrides = overrides[storageKey];
    return currentProjectOverrides && Object.keys(currentProjectOverrides).length > 0;
  }, [overrides, storageKey]);

  const filteredExpenses = useMemo(() => {
    if (!selectedProject || !selectedMonth) return [];
    
    return expensesLedger.filter(entry => {
      const isProjectMatch = entry.projectId === selectedProject;
      const isMonthMatch = entry.date.startsWith(selectedMonth);
      return isProjectMatch && isMonthMatch;
    });
  }, [expensesLedger, selectedProject, selectedMonth]);

  const summaryData = useMemo(() => {
    let totalKharchi = 0;
    let totalMess = 0;
    let totalWorkerAdvance = 0;
    let totalWorkerPayment = 0;
    let totalTiffin = 0;
    let totalTravel = 0;
    let totalMachinery = 0;
    let totalStationery = 0;
    let totalOthers = 0;
    
    // 1. Sum from petty cash / expense ledger
    filteredExpenses.forEach(entry => {
      totalKharchi += entry.kharchi || 0;
      totalMess += entry.mess || 0;
      totalWorkerAdvance += entry.workerAdvance || 0;
      totalWorkerPayment += entry.workerPayment || 0;
      totalTiffin += entry.tiffin || 0;
      totalTravel += entry.travel || 0;
      totalMachinery += entry.machineryMaterial || 0;
      totalStationery += entry.stationery || 0;
      totalOthers += entry.others || 0;
    });

    // 2. Sum from dedicated pocket kharchis
    kharchis.forEach(k => {
      if (k.projectId === selectedProject && k.date && k.date.startsWith(selectedMonth)) {
        totalKharchi += k.amount || 0;
      }
    });

    // 3. Sum from dedicated worker advances
    advances.forEach(a => {
      if (a.projectId === selectedProject && a.date && a.date.startsWith(selectedMonth)) {
        totalWorkerAdvance += a.amount || 0;
      }
    });

    // 4. Sum from worker payment records (Payroll net paychecks)
    workerPayments.forEach(wp => {
      if (wp.projectId === selectedProject && wp.month === selectedMonth) {
        totalWorkerPayment += wp.netPayment || 0;
      }
    });
    
    const defaultData = [
      { id: 1, desc: 'Weekly Kharchi', amount: totalKharchi, remarks: 'All Staff & Workers' },
      { id: 2, desc: 'Mess & Food', amount: totalMess, remarks: 'Approximately' },
      { id: 3, desc: 'Worker Advance', amount: totalWorkerAdvance, remarks: 'All Staff & Workers' },
      { id: 4, desc: 'Worker Payment', amount: totalWorkerPayment, remarks: 'Net After Deduction' },
      { id: 5, desc: 'Tiffin Expenses', amount: totalTiffin, remarks: '' },
      { id: 6, desc: 'Travel Expenses', amount: totalTravel, remarks: '' },
      { id: 7, desc: 'Machinery & Tools', amount: totalMachinery, remarks: '' },
      { id: 8, desc: 'Stationery & Bills', amount: totalStationery, remarks: '' },
      { id: 9, desc: 'Other Expenses', amount: totalOthers, remarks: 'Sundry' },
    ];

    // Merge manually edited values
    const currentProjectOverrides = overrides[storageKey] || {};
    return defaultData.map(item => {
      const rowOverride = currentProjectOverrides[item.id];
      if (rowOverride) {
        return {
          ...item,
          desc: rowOverride.desc !== undefined ? rowOverride.desc : item.desc,
          amount: rowOverride.amount !== undefined ? rowOverride.amount : item.amount,
          remarks: rowOverride.remarks !== undefined ? rowOverride.remarks : item.remarks,
        };
      }
      return item;
    });
  }, [filteredExpenses, kharchis, advances, workerPayments, selectedProject, selectedMonth, overrides, storageKey]);

  const totalAmount = summaryData.reduce((sum, item) => sum + item.amount, 0);

  const currentProjectName = projects.find(p => p.id === selectedProject)?.name || '';

  const formatMonthName = (yyyy_mm: string) => {
    if (!yyyy_mm) return '';
    const [y, m] = yyyy_mm.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const month = date.toLocaleString('default', { month: 'long' });
    return `${month}/${y.substring(2)}`;
  };

  return (
    <div className="text-[11px] h-full flex flex-col pb-32 overflow-hidden print:bg-white print:overflow-visible">
      {/* Controls */}
      <div className="mb-4 sap-panel p-2 flex flex-wrap gap-4 items-center print:hidden shrink-0">
        <div className="flex items-center space-x-2">
          <label className="font-semibold text-gray-700">Select Project:</label>
          <SAPSelect 
            className="sap-input w-64 text-[#0056b3] font-bold" 
            value={selectedProject} 
            onChange={e => {
              setSelectedProject(e.target.value);
              setIsEditing(false);
            }}
          >
            <option value="">-- Select Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SAPSelect>
        </div>
        
        {selectedProject && (
          <>
            <div className="flex items-center space-x-2">
              <label className="font-semibold text-gray-700">Month:</label>
              <input 
                type="month" 
                className="sap-input font-bold"
                value={selectedMonth}
                onChange={e => {
                  setSelectedMonth(e.target.value);
                  setIsEditing(false);
                }}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="font-semibold text-gray-700">Bill No:</label>
              <input 
                type="text" 
                className="sap-input font-bold w-48"
                value={billNo}
                onChange={e => handleBillNoChange(e.target.value)}
                placeholder="Bill Number"
              />
            </div>

            <div className="flex-1"></div>

            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`sap-btn flex items-center space-x-1 font-bold ${isEditing ? 'bg-amber-100 text-amber-900 border-amber-400' : 'bg-indigo-50 text-indigo-900 border-indigo-200'}`}
              title={isEditing ? "Disable Editing" : "Enable Editing"}
            >
              {isEditing ? (
                <>
                  <Check size={14} className="text-emerald-700" />
                  <span>Done Editing</span>
                </>
              ) : (
                <>
                  <Edit size={14} className="text-indigo-700" />
                  <span>Edit Values</span>
                </>
              )}
            </button>

            {hasCurrentOverrides && (
              <button 
                onClick={handleResetCurrent} 
                className="sap-btn flex items-center space-x-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                title="Reset manual adjustments to live backend values"
              >
                <RotateCcw size={14} />
                <span>Reset to Auto</span>
              </button>
            )}
            
            <button title="Print view" onClick={() => window.print()} className="sap-btn flex items-center space-x-1">
              <Printer size={14} className="text-gray-700" />
              <span>Print</span>
            </button>
          </>
        )}
      </div>

      {selectedProject && (
        <div className="flex-1 overflow-auto bg-white border border-[#8c9ba8] print:border-none print:overflow-visible relative max-w-4xl mx-auto w-full">
          {isEditing && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-[11px] text-amber-800 font-medium print:hidden">
              <span className="flex items-center space-x-1">
                <span>⚠️</span>
                <span><strong>Manual Override Active:</strong> Double check modified values. Changes are saved automatically.</span>
              </span>
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-amber-900 underline hover:no-underline text-[10px]"
              >
                Close Editor
              </button>
            </div>
          )}
          
          <div className="min-w-max p-4 md:p-8">
            <table className="sap-table w-full mb-8">
              <thead>
                <tr>
                  <th colSpan={4} className="text-center text-3xl font-black bg-white border-none py-3 pb-0 uppercase tracking-wide">
                    SN ENTERPRISE
                  </th>
                </tr>
                <tr>
                  <th colSpan={4} className="text-center text-sm font-bold italic bg-white border-none pb-3 underline border-b-2 border-black">
                    Monthly Summary
                  </th>
                </tr>
                <tr className="bg-white">
                  <th colSpan={2} className="text-left font-bold py-2 px-3 border border-[#444] print:border-black text-[13px] italic">
                    Site- {currentProjectName}
                  </th>
                  <th colSpan={2} className="text-right font-bold py-2 px-3 border border-[#444] print:border-black text-[13px] italic">
                    Month- {formatMonthName(selectedMonth)}
                  </th>
                </tr>
                <tr className="bg-white">
                  <th colSpan={4} className="text-right font-bold py-2 px-3 border border-r-[#444] border-l-[#444] border-t-0 border-b-0 print:border-black text-[13px] italic">
                    Bill No- {billNo}
                  </th>
                </tr>
                <tr className="bg-[#eef2f6]">
                  <th className="border border-[#444] px-2 py-2 text-center font-bold w-12 text-[12px] uppercase">SR</th>
                  <th className="border border-[#444] px-3 py-2 text-center font-bold text-[12px] uppercase">Description</th>
                  <th className="border border-[#444] px-3 py-2 text-center font-bold text-[12px] uppercase w-48">Amount</th>
                  <th className="border border-[#444] px-3 py-2 text-center font-bold text-[12px] uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((row) => {
                  const hasRowOverride = !!(overrides[storageKey]?.[row.id]);
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/50">
                      <td className="border border-[#444] px-2 py-2 text-center font-mono">{row.id}</td>
                      <td className="border border-[#444] px-3 py-1 text-center w-80">
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full text-center bg-indigo-50/30 font-semibold focus:bg-white border rounded border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 px-1 py-1"
                            value={row.desc}
                            onChange={e => handleUpdateCell(row.id, 'desc', e.target.value)}
                          />
                        ) : (
                          <span className={`${hasRowOverride ? 'text-indigo-900 font-semibold' : 'text-gray-800'}`}>
                            {row.desc}
                          </span>
                        )}
                      </td>
                      <td className="border border-[#444] px-3 py-1 text-center font-mono font-bold w-52 bg-slate-50/50">
                        {isEditing ? (
                          <input 
                            type="number"
                            step="any"
                            placeholder="0.00"
                            className="w-full text-center bg-indigo-50/30 focus:bg-white border rounded border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 px-1 py-1 font-mono font-bold text-gray-800"
                            value={row.amount === 0 ? '' : row.amount}
                            onChange={e => handleUpdateCell(row.id, 'amount', e.target.value)}
                          />
                        ) : (
                          <span className={`font-mono text-gray-900 ${hasRowOverride ? 'text-indigo-900 underline decoration-indigo-400 decoration-dotted underline-offset-2' : ''}`}>
                            {row.amount > 0 ? row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </span>
                        )}
                      </td>
                      <td className="border border-[#444] px-3 py-1 text-center text-gray-600 relative group min-w-[200px]">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <input 
                              type="text" 
                              placeholder="No remarks"
                              className="flex-1 text-center bg-indigo-50/30 focus:bg-white border rounded border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 px-1 py-1 text-gray-700"
                              value={row.remarks || ''}
                              onChange={e => handleUpdateCell(row.id, 'remarks', e.target.value)}
                            />
                            {hasRowOverride && (
                              <button
                                onClick={() => handleResetRow(row.id)}
                                className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors duration-150 flex items-center justify-center animate-fade-in"
                                title="Reset this row to live system calculated values"
                              >
                                <Undo size={11} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1.5">
                            <span>{row.remarks || '—'}</span>
                            {hasRowOverride && (
                              <span 
                                className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 print:hidden shrink-0" 
                                title="Manually overwritten value"
                              ></span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                
                <tr className="bg-gray-100 font-bold text-[14px]">
                  <td colSpan={2} className="border border-[#444] px-3 py-3 text-center italic font-black uppercase tracking-wider">
                    Cumulative Amount
                  </td>
                  <td className="border border-[#444] px-3 py-3 text-center font-black text-[var(--color-sap-blue-val)] bg-gray-200 font-mono border-double border-b-4">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-[#444] px-3 py-3"></td>
                </tr>
              </tbody>
            </table>
            
            <div className="mt-16 flex justify-between items-end pt-8 px-4 print:mt-24 print:pt-12 print:flex print:justify-between">
              {/* Prepared By Section */}
              <div className="text-center w-64 max-w-xs flex flex-col items-center">
                <div className="w-full border-b border-gray-400 pb-1 mb-2 print:border-black">
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full text-center bg-indigo-50/50 focus:bg-white border rounded border-indigo-200 focus:border-indigo-500 font-bold px-2 py-1 text-[11px]"
                      placeholder="Enter Preparer Name"
                      value={preparedBy}
                      onChange={(e) => handlePreparedByChange(e.target.value)}
                    />
                  ) : (
                    <span className="font-extrabold text-gray-800 text-[12px] block h-5">
                      {preparedBy || '_____________________'}
                    </span>
                  )}
                </div>
                <div className="font-bold text-[10px] text-gray-600 uppercase tracking-widest">
                  Prepared By
                </div>
              </div>

              {/* Approved By Section */}
              <div className="text-center w-64 max-w-xs flex flex-col items-center">
                <div className="w-full border-b border-gray-400 pb-1 mb-2 print:border-black">
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full text-center bg-indigo-50/50 focus:bg-white border rounded border-indigo-200 focus:border-indigo-500 font-bold px-2 py-1 text-[11px]"
                      placeholder="Enter Approver Title"
                      value={approvedBy}
                      onChange={(e) => handleApprovedByChange(e.target.value)}
                    />
                  ) : (
                    <span className="font-extrabold text-gray-800 text-[12px] block h-5">
                      {approvedBy || 'Director'}
                    </span>
                  )}
                </div>
                <div className="font-bold text-[10px] text-gray-600 uppercase tracking-widest">
                  Approved By
                </div>
                <div className="text-[10px] text-gray-500 mt-1 italic font-mono print:text-black">
                  Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
