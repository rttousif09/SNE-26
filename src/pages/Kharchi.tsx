import React, { useState, useMemo, useEffect } from 'react';
import { SAPSelect } from '../components/SAPSelect';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { F4Help } from '../components/F4Help';
import { 
  Save, 
  Edit, 
  X, 
  Trash2, 
  Table as TableIcon, 
  List as ListIcon, 
  Printer, 
  FileSpreadsheet, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Calendar, 
  Search, 
  Download,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { exportToExcelEnterprise } from '../lib/exportEngine';

export const Kharchi: React.FC = () => {
  const { user, kharchis, projects, workers, kharchiApprovals, addKharchi, updateKharchi, deleteKharchi, addKharchiApproval } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'pivot' | 'list'>('pivot');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    workerId: '', 
    date: new Date().toISOString().split('T')[0], 
    amount: ''
  });

  // Handle ESC key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Compute all Sundays in the selected month for quick entry
  const sundaysInSelectedMonth = useMemo(() => {
    if (!selectedMonth) return [];
    try {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const sundays: string[] = [];
      const date = new Date(year, month, 1);
      while (date.getMonth() === month) {
        if (date.getDay() === 0) { // Sunday
          sundays.push(date.toISOString().split('T')[0]);
        }
        date.setDate(date.getDate() + 1);
      }
      return sundays;
    } catch {
      return [];
    }
  }, [selectedMonth]);

  const handleEdit = (kharchi: any) => {
    setFormData({
      workerId: kharchi.workerId,
      date: kharchi.date,
      amount: kharchi.amount.toString()
    });
    setEditingId(kharchi.id);
    setIsEntryFormOpen(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ workerId: '', date: new Date().toISOString().split('T')[0], amount: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const targetProjectObj = projects.find(p => p.id === selectedProject);
    if (targetProjectObj?.status === 'Completed') {
      alert("This project is marked as Completed. New entries are not allowed.");
      return;
    }
    
    if (editingId) {
      updateKharchi(editingId, {
        projectId: selectedProject,
        workerId: formData.workerId,
        date: formData.date,
        amount: Number(formData.amount)
      });
    } else {
      addKharchi({
        projectId: selectedProject,
        workerId: formData.workerId,
        date: formData.date,
        amount: Number(formData.amount)
      });
    }
    
    handleCancel();
  };

  const projectWorkers = useMemo(() => {
    if (!selectedProject) return [];
    return workers.filter(w => w.projectId === selectedProject);
  }, [selectedProject, workers]);

  const allFilteredKharchis = useMemo(() => {
    if (!selectedProject) return [];
    return kharchis.filter(k => k.projectId === selectedProject);
  }, [selectedProject, kharchis]);

  const currentMonthKharchis = useMemo(() => {
    return allFilteredKharchis.filter(k => k.date.startsWith(selectedMonth));
  }, [allFilteredKharchis, selectedMonth]);

  const filteredCurrentMonthKharchis = useMemo(() => {
    if (!searchQuery.trim()) return currentMonthKharchis;
    const q = searchQuery.toLowerCase();
    return currentMonthKharchis.filter(k => {
      const worker = workers.find(w => w.id === k.workerId);
      const workerName = worker?.name?.toLowerCase() || '';
      const workerIdNo = worker?.workerId?.toLowerCase() || '';
      const serialNo = worker?.serialNo?.toString() || '';
      return workerName.includes(q) || workerIdNo.includes(q) || serialNo.includes(q);
    });
  }, [currentMonthKharchis, searchQuery, workers]);

  // Unique payment dates recorded in this month
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(currentMonthKharchis.map(k => k.date))).sort();
    return dates;
  }, [currentMonthKharchis]);

  // Pivot rows for matrix display
  const pivotRows = useMemo(() => {
    const relevantWorkers = projectWorkers.filter(w => currentMonthKharchis.some(k => k.workerId === w.id));
    relevantWorkers.sort((a, b) => (parseInt(a.serialNo) || 0) - (parseInt(b.serialNo) || 0));
    
    let rows = relevantWorkers.map(w => {
      const wKharchis = currentMonthKharchis.filter(k => k.workerId === w.id);
      let total = 0;
      const amountsByDate = uniqueDates.map(date => {
        const amt = wKharchis.filter(k => k.date === date).reduce((sum, k) => sum + k.amount, 0);
        total += amt;
        return amt;
      });
      return { worker: w, amountsByDate, total };
    });
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => 
        r.worker.name.toLowerCase().includes(q) || 
        (r.worker.workerId && r.worker.workerId.toLowerCase().includes(q)) ||
        (r.worker.serialNo && r.worker.serialNo.toString().includes(q))
      );
    }
    return rows;
  }, [projectWorkers, currentMonthKharchis, uniqueDates, searchQuery]);

  const grandTotal = useMemo(() => {
    return pivotRows.reduce((sum, row) => sum + row.total, 0);
  }, [pivotRows]);

  const dateTotals = useMemo(() => {
    return uniqueDates.map(date => {
      const dateIndex = uniqueDates.indexOf(date);
      return pivotRows.reduce((sum, row) => sum + (row.amountsByDate[dateIndex] || 0), 0);
    });
  }, [uniqueDates, pivotRows]);

  const getWorkerDetails = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker ? { name: worker.name, idNo: worker.workerId, srNo: worker.serialNo } : { name: 'Unknown', idNo: '-', srNo: '-' };
  };

  const currentProjectName = projects.find(p => p.id === selectedProject)?.name || '';

  const formatMonthName = (yyyy_mm: string) => {
    if (!yyyy_mm) return '';
    const [y, m] = yyyy_mm.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const month = date.toLocaleString('default', { month: 'long' });
    return `${month} ${y}`;
  };

  const formatDisplayDate = (yyyy_mm_dd: string) => {
    if (!yyyy_mm_dd) return '';
    const parts = yyyy_mm_dd.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}-${m}-${y.substring(2)}`;
    }
    return yyyy_mm_dd;
  };

  const currentApproval = useMemo(() => {
    return kharchiApprovals?.find(a => a.projectId === selectedProject && a.month === selectedMonth);
  }, [kharchiApprovals, selectedProject, selectedMonth]);

  const handleSendToApproval = () => {
    if (grandTotal <= 0) {
      alert("Amount is 0. Cannot send to approval.");
      return;
    }
    if (confirm(`Send Weekly Kharchi ₹ ${grandTotal.toLocaleString('en-IN')} for ${formatMonthName(selectedMonth)} to Director for approval?`)) {
      addKharchiApproval({
        projectId: selectedProject,
        month: selectedMonth,
        totalAmount: grandTotal,
        remarks: `Weekly Kharchi for ${formatMonthName(selectedMonth)}`,
        date: new Date().toISOString()
      });
    }
  };

  // Export to Excel Enterprise
  const handleExportExcel = () => {
    if (!selectedProject || pivotRows.length === 0) {
      alert("No kharchi data available to export for the selected project and month.");
      return;
    }

    const headers = [
      { key: 'srNo', header: 'Sr No', type: 'sr' as const },
      { key: 'workerId', header: 'Worker ID', type: 'code' as const },
      { key: 'workerName', header: 'Worker Name', type: 'text' as const },
      ...uniqueDates.map(d => ({ key: `date_${d}`, header: formatDisplayDate(d), type: 'currency' as const })),
      { key: 'total', header: 'Total Kharchi (₹)', type: 'currency' as const }
    ];

    const dataRows: (string | number)[][] = pivotRows.map(r => {
      const row: (string | number)[] = [
        r.worker.serialNo || '-',
        r.worker.workerId || '-',
        r.worker.name
      ];
      uniqueDates.forEach((_, idx) => {
        row.push(r.amountsByDate[idx] || 0);
      });
      row.push(r.total);
      return row;
    });

    const totalsRow: (string | number)[] = [
      '',
      '',
      'CUMULATIVE TOTAL'
    ];
    uniqueDates.forEach((_, idx) => {
      totalsRow.push(dateTotals[idx] || 0);
    });
    totalsRow.push(grandTotal);

    exportToExcelEnterprise({
      title: `WEEKLY KHARCHI DISBURSEMENT REPORT - ${formatMonthName(selectedMonth).toUpperCase()}`,
      tcode: 'PR04',
      projectName: currentProjectName,
      financialYear: '2026-2027',
      dateRange: formatMonthName(selectedMonth),
      headers,
      data: dataRows,
      totals: totalsRow,
      summaryBlocks: [
        { title: 'Total Kharchi Disbursed', value: grandTotal, isCurrency: true, color: 'blue' },
        { title: 'Total Workers Paid', value: pivotRows.length, color: 'green' },
        { title: 'Weekly Payment Dates', value: uniqueDates.length, color: 'purple' }
      ]
    }, `Weekly_Kharchi_${currentProjectName.replace(/\s+/g, '_')}_${selectedMonth}.xlsx`);
  };

  // Report table JSX shared between normal and full screen mode
  const renderPivotReportTable = () => (
    <div className="w-full h-full flex flex-col overflow-auto bg-white">
      <div className="min-w-max p-4 print:p-0">
        <table className="sap-table w-full border-collapse border border-[#8c9ba8]">
          <thead>
            {/* Enterprise Letterhead */}
            <tr>
              <th colSpan={uniqueDates.length + 4} className="text-center text-2xl font-black bg-white border-none py-3 pb-1 uppercase tracking-wider text-slate-800">
                SN ENTERPRISES
              </th>
            </tr>
            <tr>
              <th colSpan={uniqueDates.length + 4} className="text-center text-xs font-bold italic bg-white border-none pb-3 underline border-b-2 border-slate-800 text-slate-600">
                Weekly Kharchi (Pocket Money) Summary Report
              </th>
            </tr>

            {/* Site & Month Metadata Bar */}
            <tr className="bg-[#eef2f6]">
              <th colSpan={2} className="text-left font-bold py-2 px-3 border border-[#8c9ba8] text-[12px] text-[#0056b3]">
                Site: {currentProjectName || '-'}
              </th>
              <th colSpan={2} className="text-left font-bold py-2 px-3 border border-[#8c9ba8] text-[12px] text-slate-700">
                Month: {formatMonthName(selectedMonth)}
              </th>
              <th colSpan={Math.max(1, uniqueDates.length)} className="text-right font-bold py-2 px-3 border border-[#8c9ba8] text-[12px] text-emerald-700">
                Total Disbursed: ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </th>
            </tr>

            {/* Column Headers with Sticky Top */}
            <tr className="bg-[#d9e4f1] sticky top-0 z-30 shadow-sm text-slate-800">
              <th className="border border-[#8c9ba8] px-2 py-2 text-center font-bold w-12 text-[11px] sticky left-0 z-40 bg-[#d9e4f1]">
                Sr No
              </th>
              <th className="border border-[#8c9ba8] px-2 py-2 text-center font-bold w-20 text-[11px] sticky left-12 z-40 bg-[#d9e4f1]">
                ID No
              </th>
              <th className="border border-[#8c9ba8] px-3 py-2 text-left font-bold min-w-[180px] text-[11px] sticky left-32 z-40 bg-[#d9e4f1] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">
                Worker Name
              </th>
              {uniqueDates.map(date => (
                <th key={date} className="border border-[#8c9ba8] px-3 py-2 text-center font-bold min-w-[100px] text-[11px]">
                  <div>{formatDisplayDate(date)}</div>
                  <div className="text-[9px] font-normal text-slate-500">
                    {new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                </th>
              ))}
              <th className="border border-[#8c9ba8] px-3 py-2 text-center font-bold min-w-[110px] text-[11px] bg-[#c5d7ea]">
                Total (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {pivotRows.map((row, idx) => (
              <tr key={row.worker.id} className={`hover:bg-blue-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfdfe]'}`}>
                <td className="border border-[#8c9ba8] px-2 py-1.5 text-center font-mono text-slate-600 sticky left-0 bg-inherit z-20">
                  {row.worker.serialNo || idx + 1}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1.5 text-center font-mono text-blue-900 font-medium sticky left-12 bg-inherit z-20">
                  {row.worker.workerId || '-'}
                </td>
                <td className="border border-[#8c9ba8] px-3 py-1.5 font-semibold text-slate-800 sticky left-32 bg-inherit z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  {row.worker.name}
                </td>
                {row.amountsByDate.map((amt, dateIdx) => (
                  <td key={dateIdx} className="border border-[#8c9ba8] px-3 py-1.5 text-right font-mono text-slate-700">
                    {amt > 0 ? amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                ))}
                <td className="border border-[#8c9ba8] px-3 py-1.5 text-right font-bold font-mono text-[#0056b3] bg-blue-50/40">
                  {row.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            
            {pivotRows.length === 0 && (
              <tr>
                <td colSpan={uniqueDates.length + 4} className="border border-[#8c9ba8] px-4 py-12 text-center text-gray-500 italic bg-gray-50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Calendar size={28} className="text-gray-300" />
                    <span>No weekly kharchi records found for {formatMonthName(selectedMonth)}.</span>
                    <button
                      onClick={() => setIsEntryFormOpen(true)}
                      className="sap-btn flex items-center space-x-1 mt-2 text-[#0056b3]"
                    >
                      <Plus size={13} />
                      <span>Record First Kharchi Entry</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
            
            {pivotRows.length > 0 && (
              <tr className="bg-[#eef2f6] font-bold text-[12px] sticky bottom-0 z-30 shadow-[0_-2px_4px_-1px_rgba(0,0,0,0.1)]">
                <td colSpan={3} className="border border-[#8c9ba8] px-3 py-2 text-right uppercase tracking-wider font-black text-slate-800 sticky left-0 bg-[#eef2f6] z-40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">
                  CUMULATIVE TOTAL:
                </td>
                {dateTotals.map((tot, idx) => (
                  <td key={idx} className="border border-[#8c9ba8] px-3 py-2 text-right font-mono font-bold text-slate-800">
                    {tot > 0 ? tot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </td>
                ))}
                <td className="border border-[#8c9ba8] px-3 py-2 text-right font-black font-mono text-[var(--color-sap-blue-val)] bg-[#c5d7ea] text-[13px]">
                  ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Printable Signature Section */}
        <div className="print-signature-section mt-8 flex justify-between items-end px-4">
          <div className="text-left text-[10px] text-gray-500">
            <div>Printed on: {new Date().toLocaleString('en-IN')}</div>
            <div>SN Enterprises ERP System - Module: PR04 Weekly Kharchi</div>
          </div>
          <div className="print-signature-box border-t-2 border-slate-700 pt-2 text-center min-w-[200px]">
            <div className="print-signature-title font-bold text-slate-800 text-[11px]">Approved by Director / Site Incharge</div>
            <div className="print-signature-date text-[10px] text-slate-500">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="text-[11px] h-full flex flex-col overflow-hidden pb-1 print:bg-white print:overflow-visible">
      {/* Top Filter and Command Bar */}
      <div className="sap-panel p-2 mb-2 flex flex-wrap items-center justify-between gap-2 print:hidden shrink-0 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <label className="font-semibold text-gray-700">Project:</label>
            <SAPSelect 
              className="sap-input w-64 text-[#0056b3] font-bold" 
              value={selectedProject} 
              onChange={e => setSelectedProject(e.target.value)}
              labelTitle="Select Project"
            >
              <option value="">-- Select Project --</option>
              {projects.filter(p => showCompleted ? true : p.status !== 'Completed').map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </SAPSelect>
          </div>
          
          <label className="flex items-center space-x-1 cursor-pointer text-gray-600 print:hidden text-[10px]">
            <input 
              type="checkbox" 
              checked={showCompleted} 
              onChange={e => setShowCompleted(e.target.checked)} 
              className="rounded"
            />
            <span>Show Completed</span>
          </label>
          
          {selectedProject && (
            <>
              <div className="h-4 w-px bg-gray-300 mx-1"></div>
              <div className="flex items-center space-x-2">
                <label className="font-semibold text-gray-700">Month:</label>
                <input 
                  type="month" 
                  className="sap-input font-bold"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  className="sap-input font-bold pl-6 w-44"
                  placeholder="Search workers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">×</button>
                )}
              </div>
            </>
          )}
        </div>

        {selectedProject && (
          <div className="flex items-center flex-wrap gap-1.5">
            {/* View Mode Toggle */}
            <div className="flex bg-[#d9e4f1] p-0.5 rounded border border-[#8c9ba8]">
              <button 
                onClick={() => setViewMode('pivot')} 
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${viewMode === 'pivot' ? 'bg-[var(--btn-hover-top)] text-white shadow-xs' : 'text-slate-700 hover:bg-white/50'}`}
                title="Weekly Matrix / Pivot View"
              >
                <TableIcon size={13} className={viewMode === 'pivot' ? 'text-white' : 'text-[#0056b3]'}/>
                <span>Report View</span>
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${viewMode === 'list' ? 'bg-[var(--btn-hover-top)] text-white shadow-xs' : 'text-slate-700 hover:bg-white/50'}`}
                title="Chronological Entry List View"
              >
                <ListIcon size={13} className={viewMode === 'list' ? 'text-white' : 'text-[#0056b3]'}/>
                <span>Entry List</span>
              </button>
            </div>

            {/* FULL SCREEN TOGGLE BUTTON */}
            <button 
              onClick={() => setIsFullScreen(true)}
              className="sap-btn flex items-center space-x-1 bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100 font-bold px-2.5 py-1"
              title="Expand Report to Full Screen Mode"
            >
              <Maximize2 size={13} className="text-indigo-600" />
              <span>Full Screen</span>
            </button>

            {/* Export to Excel */}
            <button 
              onClick={handleExportExcel}
              disabled={pivotRows.length === 0}
              className="sap-btn flex items-center space-x-1 bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-bold px-2.5 py-1 disabled:opacity-50"
              title="Export Report to Excel"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* Print View */}
            <button 
              title="Print report" 
              onClick={() => window.print()} 
              className="sap-btn flex items-center space-x-1 px-2.5 py-1"
            >
              <Printer size={13} className="text-gray-700" />
              <span>Print</span>
            </button>

            {/* Import Excel */}
            {!isReadOnly && !currentApproval && (
              <button 
                onClick={() => setIsExcelImportOpen(true)}
                className="sap-btn flex items-center space-x-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100 px-2 py-1"
                title="Bulk Upload Kharchi from Excel"
              >
                <Download size={13} className="text-green-600" />
                <span>Import</span>
              </button>
            )}

            {/* Record Kharchi Form Toggle */}
            {!isReadOnly && projects.find(p => p.id === selectedProject)?.status !== 'Completed' && (
              <button
                onClick={() => setIsEntryFormOpen(!isEntryFormOpen)}
                className={`sap-btn flex items-center space-x-1 px-2.5 py-1 ${isEntryFormOpen ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-50 text-blue-800 border-blue-300'}`}
              >
                {isEntryFormOpen ? <ChevronUp size={13} /> : <Plus size={13} />}
                <span>{isEntryFormOpen ? 'Hide Entry Form' : 'New Entry'}</span>
              </button>
            )}

            {/* Send for Approval */}
            {!isReadOnly && !currentApproval && (
              <button 
                onClick={handleSendToApproval}
                disabled={grandTotal <= 0}
                className={`sap-btn flex items-center space-x-1.5 px-3 py-1 ${grandTotal > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600 font-bold' : 'opacity-50 cursor-not-allowed'}`}
                title="Send current kharchi total for Director Approval"
              >
                <Save size={13} className="text-white" />
                <span>Approval</span>
              </button>
            )}

            {/* Approval Status Badge */}
            {currentApproval && (
              <div className={`flex items-center space-x-1 px-2.5 py-1 rounded border font-bold text-[10px] uppercase
                ${currentApproval.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-300' : 
                  currentApproval.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-300' : 
                  'bg-yellow-100 text-yellow-800 border-yellow-300'}`}>
                {currentApproval.status === 'Approved' ? <CheckCircle size={12} className="text-green-600" /> : 
                 currentApproval.status === 'Rejected' ? <AlertCircle size={12} className="text-red-600" /> : 
                 <Clock size={12} className="text-yellow-600" />}
                <span>{currentApproval.status}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Status Alerts */}
      {selectedProject && projects.find(p => p.id === selectedProject)?.status === 'Completed' && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-2 rounded mb-2 text-[11px] font-bold flex items-center space-x-2 print:hidden shrink-0">
          <AlertCircle size={14} className="text-red-600" />
          <span>This project is marked as Completed. New entries and updates are locked.</span>
        </div>
      )}

      {/* KPI Summary Bar (When Project Selected) */}
      {selectedProject && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 print:hidden shrink-0">
          <div className="bg-white border border-[#8c9ba8] rounded p-2 flex items-center space-x-3 shadow-2xs">
            <div className="p-2 bg-blue-50 text-blue-600 rounded">
              <DollarSign size={16} />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Kharchi</div>
              <div className="text-[14px] font-black text-[#0056b3]">
                ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-[#8c9ba8] rounded p-2 flex items-center space-x-3 shadow-2xs">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
              <Users size={16} />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Workers Paid</div>
              <div className="text-[14px] font-black text-slate-800">
                {pivotRows.length} <span className="text-[10px] font-normal text-slate-500">/ {projectWorkers.length} total</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#8c9ba8] rounded p-2 flex items-center space-x-3 shadow-2xs">
            <div className="p-2 bg-purple-50 text-purple-600 rounded">
              <Calendar size={16} />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Weekly Dates</div>
              <div className="text-[14px] font-black text-slate-800">
                {uniqueDates.length} <span className="text-[10px] font-normal text-slate-500">Payment Days</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#8c9ba8] rounded p-2 flex items-center space-x-3 shadow-2xs">
            <div className="p-2 bg-amber-50 text-amber-600 rounded">
              <TableIcon size={16} />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Avg / Worker</div>
              <div className="text-[14px] font-black text-amber-700">
                ₹ {pivotRows.length > 0 ? Math.round(grandTotal / pivotRows.length).toLocaleString('en-IN') : '0'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Record Kharchi Form */}
      <AnimatePresence>
        {selectedProject && isEntryFormOpen && !isReadOnly && projects.find(p => p.id === selectedProject)?.status !== 'Completed' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            transition={{ duration: 0.2 }}
            className="sap-panel p-2.5 mb-2 print:hidden shrink-0 overflow-hidden shadow-xs border-blue-300"
          >
            <div className="flex items-center justify-between font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
              <span className="flex items-center space-x-1.5">
                <Plus size={14} />
                <span>{editingId ? 'Edit Kharchi Record' : 'Record Weekly Kharchi (Pocket Money)'}</span>
              </span>
              <button onClick={() => { handleCancel(); setIsEntryFormOpen(false); }} className="text-gray-400 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <label className="text-gray-700 font-semibold mb-1">Worker (F4 Search):</label>
                <F4Help
                  value={formData.workerId}
                  onChange={val => setFormData({ ...formData, workerId: val })}
                  options={projectWorkers}
                  displayKey="name"
                  title="Select Worker"
                  placeholder="Select or Search Worker..."
                  columns={[
                    { key: 'serialNo', header: 'Sr No' },
                    { key: 'workerId', header: 'ID No' },
                    { key: 'name', header: 'Worker Name' },
                    { key: 'designation', header: 'Designation' }
                  ]}
                  className="w-64"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-gray-700 font-semibold">Payment Date:</label>
                <input 
                  required 
                  type="date" 
                  className="sap-input w-36 font-bold" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>

              {/* Sunday Shortcuts */}
              {sundaysInSelectedMonth.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 mb-1 font-semibold">Sundays in {formatMonthName(selectedMonth)}:</span>
                  <div className="flex items-center space-x-1">
                    {sundaysInSelectedMonth.map((sunDate, sIdx) => (
                      <button
                        key={sunDate}
                        type="button"
                        onClick={() => setFormData({ ...formData, date: sunDate })}
                        className={`text-[9px] px-1.5 py-0.5 border rounded cursor-pointer transition-colors ${formData.date === sunDate ? 'bg-[#0056b3] text-white border-[#0056b3] font-bold' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700'}`}
                        title={`Select Sunday: ${sunDate}`}
                      >
                        W{sIdx + 1} ({sunDate.split('-')[2]})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                <label className="mb-1 text-gray-700 font-semibold">Amount (₹):</label>
                <input 
                  required 
                  type="number" 
                  min="1" 
                  step="1" 
                  placeholder="e.g. 500" 
                  className="sap-input w-28 font-bold text-blue-900" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                />
              </div>

              <div className="flex space-x-2 mb-[1px]">
                <button type="submit" className="sap-btn flex items-center space-x-1 h-[26px] bg-[#0056b3] text-white hover:bg-blue-700">
                  <Save size={13} className="text-white"/>
                  <span className="font-bold">{editingId ? 'Update Record' : 'Save Kharchi'}</span>
                </button>
                {editingId && (
                  <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1 h-[26px]">
                    <X size={13} className="text-red-600"/>
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {!selectedProject ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-[#8c9ba8] rounded p-8 text-gray-500 shadow-xs">
          <Calendar size={48} className="text-slate-300 mb-3" />
          <div className="text-base font-bold text-slate-700">No Project Selected</div>
          <div className="text-xs text-slate-500 max-w-sm text-center mt-1">
            Please choose an active project from the dropdown above to view and manage Weekly Kharchi pocket money disbursements.
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-white border border-[#8c9ba8] rounded flex flex-col shadow-xs relative print:border-none">
          {viewMode === 'pivot' ? (
            renderPivotReportTable()
          ) : (
            /* Entry List Mode */
            <div className="w-full h-full flex flex-col overflow-auto">
              <table className="sap-table w-full border-collapse">
                <thead className="sap-header sticky top-0 z-20 shadow-xs">
                  <tr>
                    <th className="border border-[#8c9ba8] px-2 py-2 text-center font-bold w-14">Sr No</th>
                    <th className="border border-[#8c9ba8] px-2 py-2 text-left font-bold w-28">Worker ID</th>
                    <th className="border border-[#8c9ba8] px-3 py-2 text-left font-bold">Worker Name</th>
                    <th className="border border-[#8c9ba8] px-3 py-2 text-left font-bold w-36">Disbursal Date</th>
                    <th className="border border-[#8c9ba8] px-3 py-2 text-right font-bold w-32">Amount</th>
                    {!isReadOnly && <th className="border border-[#8c9ba8] px-2 py-2 text-center font-bold w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCurrentMonthKharchis.map((kharchi, idx) => {
                    const worker = getWorkerDetails(kharchi.workerId);
                    return (
                      <tr 
                        key={kharchi.id} 
                        className={`hover:bg-[#e6f2ff] transition-colors border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfdfe]'}`}
                      >
                        <td className="border border-[#8c9ba8] px-2 py-1.5 text-center font-mono text-gray-600">{worker.srNo || idx + 1}</td>
                        <td className="border border-[#8c9ba8] px-2 py-1.5 font-mono text-blue-900 font-semibold">{worker.idNo}</td>
                        <td className="border border-[#8c9ba8] px-3 py-1.5 font-semibold text-slate-800">{worker.name}</td>
                        <td className="border border-[#8c9ba8] px-3 py-1.5 font-mono">
                          {formatDisplayDate(kharchi.date)}
                          <span className="text-[9px] text-gray-400 ml-1.5">
                            ({new Date(kharchi.date).toLocaleDateString('en-IN', { weekday: 'short' })})
                          </span>
                        </td>
                        <td className="border border-[#8c9ba8] px-3 py-1.5 text-right font-mono font-bold text-[#0056b3]">
                          ₹ {kharchi.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {!isReadOnly && (
                          <td className="border border-[#8c9ba8] px-2 py-1.5 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button 
                                onClick={() => handleEdit(kharchi)} 
                                className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-100" 
                                title="Edit Kharchi"
                              >
                                <Edit size={13} />
                              </button>
                              <button 
                                onClick={() => setDeleteId(kharchi.id)} 
                                className="text-red-600 hover:text-red-800 p-0.5 rounded hover:bg-red-100" 
                                title="Delete Kharchi"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  
                  {filteredCurrentMonthKharchis.length === 0 && (
                    <tr>
                      <td colSpan={isReadOnly ? 5 : 6} className="px-4 py-12 text-center text-gray-500 italic bg-gray-50">
                        No individual kharchi records found for {formatMonthName(selectedMonth)}.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredCurrentMonthKharchis.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 bg-[#eef2f6] font-bold border-t-2 border-[#8c9ba8]">
                    <tr>
                      <td colSpan={4} className="border border-[#8c9ba8] px-3 py-2 text-right uppercase tracking-wider font-black text-slate-800">
                        Total Amount ({filteredCurrentMonthKharchis.length} Records):
                      </td>
                      <td className="border border-[#8c9ba8] px-3 py-2 text-right font-black font-mono text-[#0056b3] text-[12px]">
                        ₹ {filteredCurrentMonthKharchis.reduce((s, k) => s + k.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {!isReadOnly && <td className="border border-[#8c9ba8]"></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* FULL SCREEN MODAL VIEW FOR KHARCHI REPORT */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-[#eef2f6] flex flex-col p-3 text-[11px] shadow-2xl overflow-hidden"
          >
            {/* Fullscreen Header Control Bar */}
            <div className="bg-white border border-[#8c9ba8] rounded p-2.5 mb-2 flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center space-x-4">
                <div>
                  <div className="font-extrabold text-[14px] text-[#0056b3] tracking-wide flex items-center space-x-2">
                    <span>SN ENTERPRISES — WEEKLY KHARCHI FULL SCREEN REPORT</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                      FULL SCREEN
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                    Project: <span className="text-slate-800 font-bold">{currentProjectName}</span> | Month: <span className="text-slate-800 font-bold">{formatMonthName(selectedMonth)}</span>
                  </div>
                </div>

                {/* Filter Search Input */}
                <div className="relative ml-4">
                  <input
                    type="text"
                    className="sap-input font-bold pl-6 w-52"
                    placeholder="Search worker / Sr No..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">×</button>
                  )}
                </div>
              </div>

              {/* Fullscreen Right Action Controls */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleExportExcel}
                  className="sap-btn flex items-center space-x-1 bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-bold px-3 py-1"
                  title="Export to Excel"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>Export Excel</span>
                </button>

                <button 
                  onClick={() => window.print()}
                  className="sap-btn flex items-center space-x-1 px-3 py-1"
                  title="Print Report"
                >
                  <Printer size={13} className="text-gray-700" />
                  <span>Print</span>
                </button>

                {/* EXIT FULL SCREEN BUTTON */}
                <button 
                  onClick={() => setIsFullScreen(false)}
                  className="sap-btn flex items-center space-x-1 bg-red-50 border-red-300 text-red-700 hover:bg-red-100 font-bold px-3 py-1 cursor-pointer"
                  title="Exit Full Screen (ESC)"
                >
                  <Minimize2 size={14} className="text-red-600" />
                  <span>Exit Full Screen (ESC)</span>
                </button>
              </div>
            </div>

            {/* Fullscreen Table Viewport */}
            <div className="flex-1 bg-white border border-[#8c9ba8] rounded shadow-xs overflow-hidden flex flex-col">
              {renderPivotReportTable()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Kharchi Record"
        message="Are you sure you want to delete this weekly kharchi record? The weekly matrix will be recalculated immediately."
        onConfirm={() => {
          if (deleteId) deleteKharchi(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['projectId', 'workerId', 'date', 'amount']}
        entityName="Weekly Kharchi"
        projectsContext={projects}
        workersContext={workers}
        onUpload={async (data) => {
          for (const item of data) {
            const pId = item.projectId || selectedProject;
            if (!pId || !item.workerId) continue;
            await addKharchi({
              projectId: pId,
              workerId: item.workerId,
              date: item.date || new Date().toISOString().split('T')[0],
              amount: Number(item.amount) || 0
            });
          }
        }}
      />
    </div>
  );
};
