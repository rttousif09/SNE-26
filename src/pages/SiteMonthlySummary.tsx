import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { Printer } from 'lucide-react';

export const SiteMonthlySummary: React.FC = () => {
  const { expensesLedger, projects } = useAppContext();
  
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [billNo, setBillNo] = useState('');

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
    
    filteredExpenses.forEach(entry => {
      totalKharchi += entry.kharchi || 0;
      totalMess += entry.mess || 0;
      totalWorkerAdvance += entry.workerAdvance || 0;
      totalWorkerPayment += entry.workerPayment || 0;
      totalTiffin += entry.tiffin || 0;
      totalTravel += entry.travel || 0;
      totalMachinery += entry.machineryMaterial || 0;
    });
    
    return [
      { id: 1, desc: 'Weekly Kharchi', amount: totalKharchi, remarks: 'All Staff& Workers' },
      { id: 2, desc: 'Mess& Food', amount: totalMess, remarks: 'Approximately' },
      { id: 3, desc: 'Worker Advance', amount: totalWorkerAdvance, remarks: 'All Staff& Workers' },
      { id: 4, desc: 'Worker Payment', amount: totalWorkerPayment, remarks: 'Net After Deduction' },
      { id: 5, desc: 'Tiffin Expenses', amount: totalTiffin, remarks: '' },
      { id: 6, desc: 'Travel Expenses', amount: totalTravel, remarks: '' },
      { id: 7, desc: 'Machinery& Tools', amount: totalMachinery, remarks: '' },
    ];
  }, [filteredExpenses]);

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
          <select 
            className="sap-input w-64 text-[#0056b3] font-bold" 
            value={selectedProject} 
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="">-- Select Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        
        {selectedProject && (
          <>
            <div className="flex items-center space-x-2">
              <label className="font-semibold text-gray-700">Month:</label>
              <input 
                type="month" 
                className="sap-input font-bold"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="font-semibold text-gray-700">Bill No:</label>
              <input 
                type="text" 
                className="sap-input font-bold w-48"
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                placeholder="Bill Number"
              />
            </div>

            <div className="flex-1"></div>
            
            <button title="Print view" onClick={() => window.print()} className="sap-btn flex items-center space-x-1">
              <Printer size={14} className="text-gray-700" />
              <span>Print</span>
            </button>
          </>
        )}
      </div>

      {selectedProject && (
        <div className="flex-1 overflow-auto bg-white border border-[#8c9ba8] print:border-none print:overflow-visible relative max-w-4xl mx-auto w-full">
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
                {summaryData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50">
                    <td className="border border-[#444] px-2 py-2 text-center font-mono">{row.id}</td>
                    <td className="border border-[#444] px-3 py-2 text-center">{row.desc}</td>
                    <td className="border border-[#444] px-3 py-2 text-center font-mono font-bold text-gray-800">
                      {row.amount > 0 ? row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td className="border border-[#444] px-3 py-2 text-center text-gray-600">{row.remarks}</td>
                  </tr>
                ))}
                
                <tr className="bg-gray-100 font-bold text-[14px]">
                  <td colSpan={2} className="border border-[#444] px-3 py-3 text-center italic font-black uppercase">
                    Cummulative Amount
                  </td>
                  <td className="border border-[#444] px-3 py-3 text-center font-black text-[#002f6c] bg-gray-200">
                    {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-[#444] px-3 py-3"></td>
                </tr>
              </tbody>
            </table>
            
            <div className="print-signature-section">
              <div className="print-signature-box">
                <div className="print-signature-title">Approved by Director</div>
                <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
