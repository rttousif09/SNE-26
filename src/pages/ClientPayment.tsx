import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight, Landmark, Printer, FileSpreadsheet, Download } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const ClientPayment: React.FC = () => {
  const { user, clientPayments, billings, projects, addClientPayment, updateClientPayment, deleteClientPayment } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    projectId: '', amountReceived: '', date: '', remarks: '', status: 'Received'
  });

  // Cashflow Adjustment Mode selection (either Gross Work Amount or Net Bill Amount with deductions, excluding GST)
  const [adjustmentMode, setAdjustmentMode] = useState<'net' | 'gross'>('net');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const handleEdit = (payment: any) => {
    setFormData({
      projectId: payment.projectId,
      amountReceived: payment.amountReceived.toString(),
      date: payment.date,
      remarks: payment.remarks || '',
      status: payment.status || 'Received'
    });
    setEditingId(payment.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ projectId: '', amountReceived: '', date: '', remarks: '', status: 'Received' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClientPayment(editingId, {
        ...formData,
        amountReceived: Number(formData.amountReceived)
      });
    } else {
      addClientPayment({
        ...formData,
        amountReceived: Number(formData.amountReceived)
      });
    }
    handleCancel();
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const { projectSummary, overallTotals } = useMemo(() => {
    let portfolioGrossWork = 0;
    let portfolioTds = 0;
    let portfolioRetention = 0;
    let portfolioReceived = 0;

    const summary = projects.map(p => {
      const projectBillings = billings.filter(b => b.projectId === p.id);

      const grossWork = projectBillings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const tds = projectBillings.reduce((sum, b) => sum + (b.tds ?? 0), 0);
      const retention = projectBillings.reduce((sum, b) => sum + (b.retention ?? 0), 0);
      
      const netBillExclGst = grossWork - tds - retention;
      const received = clientPayments
        .filter(cp => cp.projectId === p.id && cp.status !== 'Bounced')
        .reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);

      portfolioGrossWork += grossWork;
      portfolioTds += tds;
      portfolioRetention += retention;
      portfolioReceived += received;

      // Calculate base differences
      // grossBalance: positive = remaining, negative = advance
      const grossBalance = grossWork - received;
      // netBalance: positive = remaining, negative = advance
      const netBalance = netBillExclGst - received;

      return {
        id: p.id,
        name: p.name,
        grossWork,
        tds,
        retention,
        netBillExclGst,
        received,
        grossBalance,
        netBalance
      };
    });

    const portfolioNetBillExclGst = portfolioGrossWork - portfolioTds - portfolioRetention;

    return {
      projectSummary: summary,
      overallTotals: {
        grossWork: portfolioGrossWork,
        tds: portfolioTds,
        retention: portfolioRetention,
        netBillExclGst: portfolioNetBillExclGst,
        received: portfolioReceived,
        grossBalance: portfolioGrossWork - portfolioReceived,
        netBalance: portfolioNetBillExclGst - portfolioReceived
      }
    };
  }, [projects, billings, clientPayments]);

  const filteredProjectSummary = useMemo(() => {
    if (selectedProjectId === 'all') return projectSummary;
    return projectSummary.filter(p => p.id === selectedProjectId);
  }, [projectSummary, selectedProjectId]);

  const filteredClientPayments = useMemo(() => {
    const list = selectedProjectId === 'all'
      ? [...clientPayments]
      : clientPayments.filter(cp => cp.projectId === selectedProjectId);
    
    return list.sort((a, b) => {
      const dateA = new Date(a.date || '').getTime() || 0;
      const dateB = new Date(b.date || '').getTime() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [clientPayments, selectedProjectId, sortOrder]);

  const selectedProjectName = useMemo(() => {
    if (selectedProjectId === 'all') return 'All Active Sites';
    return projects.find(p => p.id === selectedProjectId)?.name || 'Unknown Project';
  }, [projects, selectedProjectId]);

  const displayTotals = useMemo(() => {
    if (selectedProjectId === 'all') {
      return overallTotals;
    }
    const selected = projectSummary.find(p => p.id === selectedProjectId);
    if (!selected) {
      return {
        grossWork: 0,
        tds: 0,
        retention: 0,
        netBillExclGst: 0,
        received: 0,
        grossBalance: 0,
        netBalance: 0
      };
    }
    return {
      grossWork: selected.grossWork,
      tds: selected.tds,
      retention: selected.retention,
      netBillExclGst: selected.netBillExclGst,
      received: selected.received,
      grossBalance: selected.grossBalance,
      netBalance: selected.netBalance
    };
  }, [overallTotals, projectSummary, selectedProjectId]);

  const exportToCSV = (forceAllProjectExport: boolean = false) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    const isAll = forceAllProjectExport || selectedProjectId === 'all';
    const projSummaryToExport = isAll ? projectSummary : filteredProjectSummary;
    const clientPaymentsToExport = isAll ? clientPayments : filteredClientPayments;
    const projNameToExport = isAll ? 'All Active Projects' : selectedProjectName;
    const displayTotalsToExport = isAll ? overallTotals : displayTotals;

    // Add header metadata
    csvContent += "SN ENTERPRISE - CASHFLOW RECONCILIATION LEDGER\r\n";
    csvContent += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\r\n`;
    csvContent += `Project Scope: ${projNameToExport}\r\n`;
    csvContent += `Adjustment Mode: ${adjustmentMode === 'net' ? 'Net Adjusted Bill Basis' : 'Gross Work Basis'}\r\n\r\n`;
    
    // Ledger Table
    csvContent += "Ledger Summary Table\r\n";
    csvContent += "Site Name,Gross Work (A),TDS Deducted (B),Retention (C),Net Work Bill (D = A-B-C),Received Payments (E),Settlement Balance\r\n";
    
    projSummaryToExport.forEach(row => {
      const balance = adjustmentMode === 'net' ? row.netBalance : row.grossBalance;
      const statusText = balance === 0 ? "Settled" : (balance < 0 ? "ADVANCE" : "REMAINING");
      const balVal = Math.abs(balance);
      
      csvContent += `"${row.name.replace(/"/g, '""')}",${row.grossWork},${row.tds},${row.retention},${row.netBillExclGst},${row.received},"${statusText}: ${balVal}"\r\n`;
    });
    
    // Totals line
    const totalBalance = adjustmentMode === 'net' ? displayTotalsToExport.netBalance : displayTotalsToExport.grossBalance;
    const totalStatusText = totalBalance === 0 ? "Settled" : (totalBalance < 0 ? "ADVANCE" : "REMAINING");
    csvContent += `Aggregate Summary,${displayTotalsToExport.grossWork},${displayTotalsToExport.tds},${displayTotalsToExport.retention},${displayTotalsToExport.netBillExclGst},${displayTotalsToExport.received},"${totalStatusText}: ${Math.abs(totalBalance)}"\r\n\r\n`;
    
    // Payments history log
    csvContent += "Payment History Log\r\n";
    csvContent += "Date,Site Project,Remarks/Instrument,Status,Amount Received (INR)\r\n";
    
    // Sort clientPaymentsToExport based on current sortOrder
    const sortedPayments = [...clientPaymentsToExport].sort((a, b) => {
      const dateA = new Date(a.date || '').getTime() || 0;
      const dateB = new Date(b.date || '').getTime() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    sortedPayments.forEach(pay => {
      const projName = getProjectName(pay.projectId);
      csvContent += `"${pay.date}","${projName.replace(/"/g, '""')}","${(pay.remarks || '').replace(/"/g, '""')}","${pay.status || 'Received'}",${pay.amountReceived}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `Cashflow_Ledger_${projNameToExport.replace(/\s+/g, "_")}_${adjustmentMode}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="text-[11px] space-y-4">
      {/* Printable PDF Header */}
      <div className="hidden print:block mb-4 border-b border-gray-400 pb-3 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold uppercase text-gray-800 tracking-wider">SN ENTERPRISE</h1>
            <p className="text-[10px] text-gray-600">Site Work Cashflow Reconciliation Ledger Report</p>
            <p className="text-[8px] text-gray-400 mt-0.5">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} by fttousif38@gmail.com</p>
          </div>
          <div className="text-right border border-gray-300 p-1.5 bg-gray-50 rounded">
            <span className="text-[8px] font-bold text-gray-400 block uppercase font-sans">Context Filter Scope</span>
            <span className="text-[10px] font-bold text-[#0056b3] uppercase font-mono">{selectedProjectName}</span>
          </div>
        </div>
        
        {/* Printable Summary KPI row */}
        <div className="grid grid-cols-5 gap-2 mt-3 text-[9px] border-t border-gray-300 pt-2">
          <div>
            <span className="text-gray-505 block font-semibold">Gross Work Done:</span>
            <span className="font-bold text-black text-[10px] font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.grossWork)}</span>
          </div>
          <div>
            <span className="text-gray-550 block font-semibold">Withheld Taxes & Retention:</span>
            <span className="font-bold text-red-700 text-[10px] font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.tds + displayTotals.retention)}</span>
          </div>
          <div>
            <span className="text-gray-550 block font-semibold">Net Adjusted Receivable:</span>
            <span className="font-bold text-blue-900 text-[10px] font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.netBillExclGst)}</span>
          </div>
          <div>
            <span className="text-gray-500 block font-semibold">Total Cleared Receipts:</span>
            <span className="font-bold text-green-800 text-[10px] font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.received)}</span>
          </div>
          <div>
            <span className="text-gray-500 block font-semibold">Outstanding Cashflow Status:</span>
            <span className="font-bold text-orange-800 text-[10px] font-mono">
              {adjustmentMode === 'net' 
                ? (displayTotals.netBalance <= 0 ? `ADVANCE: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(displayTotals.netBalance))}` : `DUE: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.netBalance)}`)
                : (displayTotals.grossBalance <= 0 ? `ADVANCE: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(displayTotals.grossBalance))}` : `DUE: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.grossBalance)}`)
              }
            </span>
          </div>
        </div>
      </div>
      {/* Action panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#eef2f6] border border-[#8c9ba8] p-1.5 gap-2 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {!isReadOnly ? (
            <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1 font-semibold self-start md:self-auto cursor-pointer">
              {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
              <span>{isAdding ? 'Cancel' : 'Record Payment'}</span>
            </button>
          ) : (
            <span className="font-semibold text-gray-700 px-1 py-0.5">Payments Flow Ledger (Read Only)</span>
          )}
          
          <button onClick={() => exportToCSV(false)} className="sap-btn flex items-center space-x-1 font-semibold bg-[#107c41]/10 text-[#107c41] border-[#107c41]/50 hover:bg-[#107c41] hover:text-white transition cursor-pointer" title="Export current filtered view ledger and payment history data to Microsoft Excel CSV format">
            <FileSpreadsheet size={12} />
            <span>Export Excel (.CSV)</span>
          </button>

          <button onClick={() => window.print()} className="sap-btn flex items-center space-x-1 font-semibold bg-[#0369a1]/10 text-[#0369a1] border-[#0369a1]/50 hover:bg-[#0369a1] hover:text-white transition cursor-pointer" title="Save this view as PDF file or print physically">
            <Printer size={12} />
            <span>Save PDF / Print</span>
          </button>
        </div>

        {/* Dropdown project selector & Toggle option for Adjustment Base */}
        <div className="flex flex-wrap items-center justify-end gap-3 select-none">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="text-gray-700 font-bold">Select Site Project:</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="sap-input font-bold text-[#002f6c] w-52 py-0.5 border-[#8c9ba8]"
            >
              <option value="all">— All Active Projects —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedProjectId !== 'all' && (
              <button
                onClick={() => exportToCSV(true)}
                className="sap-btn flex items-center space-x-1 font-bold text-[10px] bg-[#107c41]/10 text-[#107c41] border-[#107c41]/40 hover:bg-[#107c41] hover:text-white transition py-0.5 px-2 cursor-pointer rounded shrink-0"
                title="Direct option to export ALL project ledger data to Excel, ignoring current dropdown filter"
              >
                <FileSpreadsheet size={11} />
                <span>Export All to Excel</span>
              </button>
            )}
          </div>
          
          <div className="hidden md:block h-4 w-px bg-[#8c9ba8]" />

          <div className="flex items-center space-x-1">
            <span className="text-gray-600 font-semibold mr-1">Cashflow Adjust Mode:</span>
            <div className="inline-flex bg-gray-200 p-0.5 rounded border border-[#8c9ba8] font-semibold text-[10px]">
              <button
                onClick={() => setAdjustmentMode('net')}
                className={`px-2 py-0.5 rounded-sm transition duration-150 cursor-pointer ${adjustmentMode === 'net' ? 'bg-[#0056b3] text-white font-bold' : 'text-gray-700 hover:bg-gray-300'}`}
                title="Work amount MINUS withholding taxes TDS & Retention (excluding GST)"
              >
                Net Bill Base
              </button>
              <button
                onClick={() => setAdjustmentMode('gross')}
                className={`px-2 py-0.5 rounded-sm transition duration-150 cursor-pointer ${adjustmentMode === 'gross' ? 'bg-[#0056b3] text-white font-bold' : 'text-gray-700 hover:bg-gray-300'}`}
                title="Full Work Amount (excluding GST)"
              >
                Gross Work Base
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="sap-panel p-2">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Payment Details' : 'New Payment Received'}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-2xl">
            <div className="flex items-center">
              <label className="w-32">Project:</label>
              <select required className="sap-input flex-1" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Amount Received:</label>
              <input required type="number" step="any" className="sap-input flex-1" value={formData.amountReceived} onChange={e => setFormData({...formData, amountReceived: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Remarks:</label>
              <input type="text" className="sap-input flex-1" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Status:</label>
              <select className="sap-input flex-1" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="Received">Received</option>
                <option value="Cleared">Cleared</option>
                <option value="Pending">Pending</option>
                <option value="Bounced">Bounced</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end pt-2 space-x-2">
              <button type="submit" className="sap-btn flex items-center space-x-1">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update' : 'Save'}</span>
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1">
                  <X size={12} className="text-red-600"/>
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Corporate Ledger KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-2 border border-[#8c9ba8]">
        <div className="sap-panel p-2 flex flex-col bg-white">
          <span className="font-semibold text-gray-500 leading-tight">Total Gross Work Amount</span>
          <span className="text-xs font-bold text-gray-900 mt-1">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.grossWork)}
          </span>
          <span className="text-[9px] text-gray-400 mt-0.5">Work Done Excl. GST {selectedProjectId !== 'all' ? '(Site)' : '(Portfolio)'}</span>
        </div>

        <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-red-500">
          <span className="font-semibold text-red-900 leading-tight">Total Witheld Taxes & Retention</span>
          <span className="text-xs font-bold text-red-600 mt-1">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.tds + displayTotals.retention)}
          </span>
          <span className="text-[9px] text-gray-400 mt-0.5">TDS: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.tds)} | Ret: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.retention)}</span>
        </div>

        <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-blue-500">
          <span className="font-semibold text-[#0056b3] leading-tight">Adjusted Bill Receivable</span>
          <span className="text-xs font-bold text-[#0056b3] mt-1">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.netBillExclGst)}
          </span>
          <span className="text-[9px] text-gray-400 mt-0.5">Net Work Bill Excl. GST</span>
        </div>

        <div className="sap-panel p-2 flex flex-col bg-green-50/50 border-l-4 border-l-green-600">
          <span className="font-semibold text-green-950 leading-tight">Total Received Payments</span>
          <span className="text-xs font-bold text-green-700 mt-1">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.received)}
          </span>
          <span className="text-[9px] text-gray-400 mt-0.5">Bank Credits (Cleared & Received)</span>
        </div>

        <div className={`sap-panel p-2 flex flex-col border-l-4 ${
          (adjustmentMode === 'net' ? displayTotals.netBalance : displayTotals.grossBalance) <= 0
            ? 'bg-green-50 border-l-teal-600 text-teal-950'
            : 'bg-orange-50 border-l-orange-400 text-orange-950'
        }`}>
          <span className="font-semibold leading-tight">
            {selectedProjectId === 'all' ? 'Portfolio Settlement Mode' : 'Site Settlement Mode'} ({adjustmentMode === 'net' ? 'Net' : 'Gross'})
          </span>
          {adjustmentMode === 'net' ? (
            displayTotals.netBalance <= 0 ? (
              <>
                <span className="text-xs font-bold text-teal-705 mt-1 flex items-center">
                  <ArrowDownRight size={12} className="mr-0.5" />
                  ADVANCE: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(displayTotals.netBalance))}
                </span>
                <span className="text-[9px] mt-0.5 text-teal-600">Client Overpayment {selectedProjectId !== 'all' ? '(Site)' : '(Aggregate)'}</span>
              </>
            ) : (
              <>
                <span className="text-xs font-bold text-orange-705 mt-1 flex items-center">
                  <ArrowUpRight size={12} className="mr-0.5" />
                  REMAINING: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.netBalance)}
                </span>
                <span className="text-[9px] mt-0.5 text-orange-600 font-semibold">Remaining Outstanding {selectedProjectId !== 'all' ? '(Site)' : '(Portfolio)'}</span>
              </>
            )
          ) : (
            displayTotals.grossBalance <= 0 ? (
              <>
                <span className="text-xs font-bold text-teal-705 mt-1 flex items-center">
                  <ArrowDownRight size={12} className="mr-0.5" />
                  ADVANCE: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(displayTotals.grossBalance))}
                </span>
                <span className="text-[9px] mt-0.5 text-teal-600">Client Overpayment {selectedProjectId !== 'all' ? '(Site)' : '(Aggregate)'}</span>
              </>
            ) : (
              <>
                <span className="text-xs font-bold text-orange-705 mt-1 flex items-center">
                  <ArrowUpRight size={12} className="mr-0.5" />
                  REMAINING: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.grossBalance)}
                </span>
                <span className="text-[9px] mt-0.5 text-orange-600 font-semibold">Remaining Outstanding {selectedProjectId !== 'all' ? '(Site)' : '(Portfolio)'}</span>
              </>
            )
          )}
        </div>
      </div>
      
      {/* Excel Formula Bar */}
      <div className="flex items-center bg-[#f3f4f6] border border-[#bcc5cf] text-[10px] py-1 px-1.5 font-mono shadow-inner select-none print:hidden rounded">
        <div className="text-[#107c41] font-bold px-1.5 border-r border-[#bcc5cf] flex items-center space-x-1 shrink-0">
          <span className="text-xs italic bg-gray-200 px-1 rounded border border-[#bcc5cf]">fx</span>
        </div>
        <div className="px-2 text-gray-500 font-semibold border-r border-[#bcc5cf] mr-2 shrink-0">
          {adjustmentMode === 'net' ? 'ADJUST_NET_BALANCE' : 'ADJUST_GROSS_BALANCE'}
        </div>
        <div className="flex-1 text-[#002f6c] truncate flex items-center space-x-1">
          <span className="text-[#107c41] font-semibold">=</span>
          <span className="font-bold">
            {adjustmentMode === 'net' 
              ? `SUM(E${filteredProjectSummary.length > 0 ? '3' : ''}:E${filteredProjectSummary.length + 2}) - SUM(F3:F${filteredProjectSummary.length + 2}) [Tax-deducted settlement balance = ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.netBalance)}]`
              : `SUM(B3:B${filteredProjectSummary.length + 2}) - SUM(F3:F${filteredProjectSummary.length + 2}) [Contract Gross work balance = ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.grossBalance)}]`
            }
          </span>
        </div>
        <div className="text-[9px] text-[#107c41] font-semibold bg-[#e1f3e7] px-1.5 py-0.5 border border-green-200 rounded self-center mr-1 shrink-0">
          READY / ACTIVE
        </div>
      </div>

      {/* Spreadsheet Tabs Sheet Row */}
      <div className="flex items-center bg-gray-100 border-b border-[#bcc5cf] text-[9.5px] font-semibold text-gray-650 px-1 select-none print:hidden">
        <div className="bg-white border-t-2 border-t-[#107c41] border-l border-r border-[#bcc5cf] px-3.5 py-1 text-[#107c41] font-bold flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#107c41]"></span>
          <span>📊 Site_Cashflow_Ledger</span>
        </div>
        <div className="border-l border-r border-transparent px-3 py-1 hover:bg-gray-200 text-gray-500 cursor-pointer flex items-center space-x-1.5">
          <span>🧾 Payments_Log_Source</span>
        </div>
        <div className="flex-1 text-right text-gray-400 pr-2">Sheet Index Ref: 001/A</div>
      </div>

      <div className="flex flex-col xl:flex-row space-y-4 xl:space-y-0 xl:space-x-4">
        {/* Cashflow Adjustment Ledger */}
        <div className="flex-1 overflow-x-auto">
          <div className="font-semibold mb-1 text-[#0056b3] uppercase tracking-wider select-none flex items-center space-x-1.5 print:mt-4">
            <Landmark size={14} className="text-[#0056b3] shrink-0" />
            <span>
              {selectedProjectId === 'all' ? 'Site Cashflow Reconciliation Ledger' : `Cashflow Reconciliation for ${selectedProjectName}`} ({adjustmentMode === 'net' ? 'Net Adjusted Bill Basis' : 'Gross Work Basis'})
            </span>
          </div>
          <table className="w-full border-collapse excel-grid bg-white text-[10px]">
            <thead className="bg-[#f3f4f6] text-[9.5px] font-mono border border-[#bcc5cf]">
              {/* Excel Letters Header Row */}
              <tr className="bg-gray-100/95 divide-x divide-gray-300">
                <th className="excel-col-letter w-7">#</th>
                <th className="excel-col-letter text-left px-2">Col A [Project Site]</th>
                <th className="excel-col-letter text-right px-2">Col B [Gross Work]</th>
                <th className="excel-col-letter text-right px-2">Col C [TDS Tax]</th>
                <th className="excel-col-letter text-right px-2">Col D [Retention]</th>
                <th className="excel-col-letter text-right px-2">Col E [Net Bill=B-C-D]</th>
                <th className="excel-col-letter text-right px-2">Col F [Amounts Received]</th>
                <th className="excel-col-letter text-right px-2 bg-blue-50/5 text-[#0056b3]">Col G [Settlement Balance]</th>
              </tr>
              {/* Table Column Labels */}
              <tr className="sap-header font-bold text-gray-800 divide-x divide-[#8c9ba8] border-b border-[#bcc5cf]">
                <th className="border border-[#bcc5cf] px-1 text-center font-bold"></th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-left font-semibold">Project Site</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold">Gross Work Done</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold">TDS Witheld</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold">Retention sum</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold">Net Adjusted Bill</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold bg-green-55 border-b-green-300 text-green-900 font-bold">Received (E)</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold bg-blue-50/20 text-[#002f6c] font-bold">Cashflow Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjectSummary.map((summary, idx) => {
                // Determine balance and style based on adjustmentMode
                const currentBalance = adjustmentMode === 'net' ? summary.netBalance : summary.grossBalance;
                const isAdvance = currentBalance <= 0;
                const balAbsolute = Math.abs(currentBalance);

                return (
                  <tr key={summary.id} className="hover:bg-[#e6f2ff] cursor-default text-[11px] divide-x divide-gray-200 border-b border-gray-150">
                    <td className="excel-row-num">{idx + 3}</td>
                    <td className="border border-[#bcc5cf] px-2 py-1.5 font-semibold text-[#002f6c]">{summary.name}</td>
                    <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.grossWork)}
                    </td>
                    <td className="border border-[#bcc5cf] px-2 py-1.5 text-right text-red-650 font-mono">
                      {summary.tds > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.tds) : '—'}
                    </td>
                    <td className="border border-[#bcc5cf] px-2 py-1.5 text-right text-orange-650 font-mono">
                      {summary.retention > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.retention) : '—'}
                    </td>
                    <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-semibold text-gray-800 font-mono">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.netBillExclGst)}
                    </td>
                    <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-semibold text-green-800 bg-green-50/5 font-mono">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.received)}
                    </td>
                    <td className={`border border-[#bcc5cf] px-2 py-1.5 text-right font-bold font-mono ${
                      isAdvance 
                        ? 'bg-[#eefcf4] text-teal-800' 
                        : 'bg-[#fff9ef] text-orange-705'
                    }`}>
                      <div className="flex items-center justify-end space-x-1.5">
                        {currentBalance === 0 ? (
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Settled</span>
                        ) : isAdvance ? (
                          <>
                            <span className="text-[8px] bg-teal-100 text-teal-800 border border-teal-300 px-1 rounded uppercase tracking-tight py-0.2 shrink-0 font-extrabold print:hidden">ADVANCE</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balAbsolute)}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[8px] bg-orange-100 text-orange-850 border border-orange-200 px-1 rounded uppercase tracking-tight py-0.2 shrink-0 font-extrabold print:hidden">DUE</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balAbsolute)}</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProjectSummary.length === 0 && (
                <tr>
                  <td className="excel-row-num">3</td>
                  <td colSpan={7} className="border border-[#bcc5cf] px-2 py-4 text-center text-gray-500 font-medium">No active site details found for the current selection.</td>
                </tr>
              )}
              {/* Double Line Excel Sum totals row */}
              {filteredProjectSummary.length > 0 && (
                <tr className="bg-gray-100 font-bold border-t-2 border-b-2 border-double border-gray-600 divide-x divide-gray-300 select-none">
                  <td className="excel-row-num">∑</td>
                  <td className="px-2 py-1.5 text-left font-bold text-gray-800 uppercase tracking-wider select-none font-sans">AGGREGATE SUM</td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.grossWork)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-red-700 font-mono font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.tds)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-orange-700 font-mono font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.retention)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-blue-900 font-mono font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.netBillExclGst)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-green-800 bg-green-50/15 font-mono font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.received)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[#002f6c] bg-blue-50/10 font-mono font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(adjustmentMode === 'net' ? displayTotals.netBalance : displayTotals.grossBalance))}
                    <span className="text-[8px] font-bold ml-1 text-gray-600">
                      {(adjustmentMode === 'net' ? displayTotals.netBalance : displayTotals.grossBalance) <= 0 ? '(ADV)' : '(DUE)'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-1.5 p-1.5 border border-blue-200 bg-blue-50/45 text-blue-900 rounded-sm flex items-start space-x-1 print:hidden">
            <AlertCircle size={12} className="text-blue-700 mt-0.5 shrink-0" />
            <p className="text-[9.5px]">
              <strong>Cashflow Accounting Note:</strong> Under GST laws & standard ledger accounting, GST sums are designated off-book liabilities. Both <strong>Net Bill Base</strong> and <strong>Gross Work Base</strong> correctly exclude GST sums, calculating client settlements purely using the work invoice value. Switch between modes using the controls at the top of the interface.
            </p>
          </div>
        </div>

        {/* Payment History Log */}
        <div className="w-full xl:w-[450px]">
          <div className="font-semibold mb-1 text-[#0056b3] uppercase tracking-wider select-none flex items-center space-x-1">
            <span>{selectedProjectId === 'all' ? 'Payment History Log' : `Payment History for ${selectedProjectName}`}</span>
          </div>
          <table className="w-full border-collapse excel-grid bg-white text-[10px]">
            <thead className="bg-[#f3f4f6] text-[9.5px] font-mono border border-[#bcc5cf]">
              {/* Excel Letters line columns */}
              <tr className="bg-gray-100 divide-x divide-gray-300">
                <th className="excel-col-letter w-7">#</th>
                <th className="excel-col-letter text-left px-2">Col A [Date]</th>
                <th className="excel-col-letter text-left px-2">Col B [Site Project]</th>
                <th className="excel-col-letter text-left px-2">Col C [Remarks]</th>
                <th className="excel-col-letter text-left px-2">Col D [Status]</th>
                <th className="excel-col-letter text-right px-2">Col E [Credit Amount]</th>
                {!isReadOnly && <th className="excel-col-letter text-center px-1 print:hidden">Actions</th>}
              </tr>
              {/* Actual column labels */}
              <tr className="sap-header font-bold text-gray-800 divide-x divide-[#8c9ba8] border-b border-[#bcc5cf]">
                <th className="border border-[#bcc5cf] px-1 text-center font-bold"></th>
                <th
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="border border-[#bcc5cf] px-2 py-1 text-left font-semibold cursor-pointer hover:bg-gray-200 hover:text-blue-900 transition select-none group"
                  title="Click to sort date-wise"
                >
                  <div className="flex items-center justify-between">
                    <span>Date</span>
                    <span className="text-[9px] text-[#0056b3] font-bold group-hover:scale-110 transition-transform">
                      {sortOrder === 'desc' ? '▼' : '▲'}
                    </span>
                  </div>
                </th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-left font-semibold">Site Project</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-left font-semibold">Remarks/Instrument</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-left font-semibold">Status</th>
                <th className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold text-green-900">Amount Received</th>
                {!isReadOnly && <th className="border border-[#bcc5cf] px-2 py-1 text-center font-semibold w-12 text-gray-750 print:hidden">Edit</th>}
              </tr>
            </thead>
            <tbody>
              {filteredClientPayments.map((payment, idx) => (
                <tr key={payment.id} className="hover:bg-[#e6f2ff] cursor-default text-[11px] divide-x divide-gray-200 border-b border-gray-150">
                  <td className="excel-row-num">{idx + 3}</td>
                  <td className="border border-[#bcc5cf] px-2 py-1 font-mono">{payment.date}</td>
                  <td className="border border-[#bcc5cf] px-2 py-1 font-semibold text-[#002f6c] truncate max-w-28" title={getProjectName(payment.projectId)}>
                    {getProjectName(payment.projectId)}
                  </td>
                  <td className="border border-[#bcc5cf] px-2 py-1 text-gray-500 truncate max-w-24" title={payment.remarks}>{payment.remarks || '—'}</td>
                  <td className="border border-[#bcc5cf] px-2 py-1">
                    <span className={`px-1 rounded-sm font-semibold text-[8px] border shrink-0 ${
                      payment.status === 'Cleared' ? 'bg-green-100 text-green-800 border-green-300' :
                      payment.status === 'Pending' ? 'bg-yellow-101 text-yellow-850 border-yellow-300' :
                      payment.status === 'Bounced' ? 'bg-red-100 text-red-800 border-red-300' :
                      'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {payment.status || 'Received'}
                    </span>
                  </td>
                  <td className="border border-[#bcc5cf] px-2 py-1 text-right font-semibold text-green-700 font-mono">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amountReceived)}
                  </td>
                  {!isReadOnly && (
                    <td className="border border-[#bcc5cf] px-2 py-1 text-center select-none print:hidden">
                      <button onClick={() => handleEdit(payment)} className="text-blue-600 hover:text-blue-800 transition cursor-pointer" title="Edit">
                        <Edit size={12} />
                      </button>
                      <button onClick={() => setDeleteId(payment.id)} className="text-red-600 hover:text-red-800 ml-2 transition cursor-pointer" title="Delete">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredClientPayments.length === 0 && (
                <tr>
                  <td className="excel-row-num">3</td>
                  <td colSpan={isReadOnly ? 5 : 6} className="border border-[#bcc5cf] px-2 py-4 text-center text-gray-500">No payment history found for selection.</td>
                </tr>
              )}
              {filteredClientPayments.length > 0 && (
                <tr className="bg-gray-100 font-bold border-t-2 border-b-2 border-double border-gray-600 divide-x divide-gray-300 select-none">
                  <td className="excel-row-num">∑</td>
                  <td colSpan={4} className="px-2 py-1.5 text-left font-bold text-gray-800 uppercase font-sans">TOTAL SUM OF CREDITS</td>
                  <td className="px-2 py-1.5 text-right text-green-800 font-mono font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayTotals.received)}
                  </td>
                  <td className="border border-[#bcc5cf] px-2 py-1 text-center print:hidden"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Report Approvals Section (stamp, prepares, signs) */}
      <div className="hidden print:block mt-20 font-sans">
        <div className="grid grid-cols-3 gap-6 text-[10px] text-gray-700">
          <div className="border-t border-gray-400 pt-2 text-center">
            <span className="block font-bold">PREPARED BY</span>
            <span className="block italic text-[9px] text-gray-500 mt-1">SN Enterprise Finance Desk</span>
          </div>
          <div className="border-t border-gray-400 pt-2 text-center">
            <span className="block font-bold">AUDITED BY</span>
            <span className="block italic text-[9px] text-gray-500 mt-1">External Accounts Comptroller</span>
          </div>
          <div className="border-t border-gray-400 pt-2 text-center">
            <span className="block font-bold">CLIENT AUTHORIZED STAMP</span>
            <span className="block italic text-[9px] text-gray-500 mt-1">Sign & Date of Clearance</span>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteClientPayment(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
