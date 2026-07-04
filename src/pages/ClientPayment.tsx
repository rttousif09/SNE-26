import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { ClientPayment as ClientPaymentType, Billing, Project } from '../types';
import { 
  Landmark, 
  Plus, 
  FileSpreadsheet, 
  Search, 
  Upload, 
  Trash2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  DollarSign, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Wallet, 
  X, 
  Percent, 
  ShieldCheck, 
  Tag,
  ArrowRightLeft,
  Briefcase,
  Users,
  Layers,
  Sparkles
} from 'lucide-react';
import { BulkUploadModal } from '../components/BulkUploadModal';
import * as XLSX from 'xlsx';

export const ClientPayment = () => {
  const { 
    user, 
    projects, 
    billings, 
    clientPayments, 
    addClientPayment, 
    deleteClientPayment 
  } = useAppContext();

  // Basic Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterBillNo, setFilterBillNo] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'payments'>('bills');

  // Selected Bill Pre-fill for Modal
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);

  // -----------------------------------------------------------------
  // 1. Dynamic Calculations & Data Processing (Real-time recalculations)
  // -----------------------------------------------------------------
  
  // All processed bills mapping
  const processedBills = useMemo(() => {
    // Group payments by projectId and calculate total payment received for each project
    const projectPaymentsMap: Record<string, number> = {};
    clientPayments.forEach((p) => {
      const pid = p.projectId;
      projectPaymentsMap[pid] = (projectPaymentsMap[pid] || 0) + (p.amountReceived || 0);
    });

    // Group bills by projectId so we can sort them chronologically and allocate payments
    const billsByProject: Record<string, Billing[]> = {};
    billings.forEach((b) => {
      const pid = b.projectId;
      if (!billsByProject[pid]) {
        billsByProject[pid] = [];
      }
      billsByProject[pid].push(b);
    });

    // For each project, sort bills chronologically and allocate payments to determine status
    const billStatusMap: Record<string, 'Paid' | 'Partially Paid' | 'Pending'> = {};
    
    Object.keys(billsByProject).forEach((pid) => {
      // Sort bills by certifyDate first, then billNo
      const projectBills = [...billsByProject[pid]].sort((a, b) => {
        const dateA = a.certifyDate || a.month || '';
        const dateB = b.certifyDate || b.month || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.billNo.localeCompare(b.billNo);
      });

      let remainingPayment = projectPaymentsMap[pid] || 0;

      projectBills.forEach((bill) => {
        const gross = bill.amount || 0;
        const gst = bill.gst || 0;
        const tds = bill.tds || 0;
        const retention = bill.retention || 0;
        const billingAmount = (gross - tds - retention) + gst;

        if (remainingPayment <= 0) {
          billStatusMap[bill.id] = 'Pending';
        } else if (remainingPayment >= billingAmount) {
          billStatusMap[bill.id] = 'Paid';
          remainingPayment -= billingAmount;
        } else {
          billStatusMap[bill.id] = 'Partially Paid';
          remainingPayment = 0;
        }
      });
    });

    return billings.map((bill) => {
      const project = projects.find((p) => p.id === bill.projectId);
      const gross = bill.amount || 0;
      const gst = bill.gst || 0;
      const tds = bill.tds || 0;
      const retention = bill.retention || 0;
      const netReceivable = (gross - tds - retention) + gst;
      const status = billStatusMap[bill.id] || 'Pending';

      return {
        ...bill,
        projectName: project?.name || 'Unknown Project',
        clientName: project?.clientName || 'Unknown Client',
        gross,
        gst,
        tds,
        retention,
        netReceivable,
        status,
      };
    });
  }, [billings, clientPayments, projects]);

  // Processed Payments with associated project details
  const processedPayments = useMemo(() => {
    return clientPayments.map((cp) => {
      const project = projects.find((p) => p.id === cp.projectId);
      const category = cp.category || 'Against RA Bill';

      return {
        ...cp,
        projectName: project?.name || 'Unknown Project',
        clientName: project?.clientName || 'Unknown Client',
        category,
        paymentMode: cp.paymentMode || 'NEFT',
        enteredBy: (cp as any).enteredBy || user?.name || 'Administrator'
      };
    });
  }, [clientPayments, projects, user]);

  // -----------------------------------------------------------------
  // 2. Application of Search & Sidebar Filters
  // -----------------------------------------------------------------
  const filteredBills = useMemo(() => {
    return processedBills.filter((b) => {
      // 1. Project Filter
      if (selectedProjectId !== 'all' && b.projectId !== selectedProjectId) return false;
      
      // 2. Date Filter
      if (startDate && b.certifyDate && b.certifyDate < startDate) return false;
      if (endDate && b.certifyDate && b.certifyDate > endDate) return false;

      // 3. Bill No Filter
      if (filterBillNo && !b.billNo.toLowerCase().includes(filterBillNo.toLowerCase())) return false;

      // 4. Global Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchProject = b.projectName.toLowerCase().includes(query);
        const matchClient = b.clientName.toLowerCase().includes(query);
        const matchBillNo = b.billNo.toLowerCase().includes(query);
        const matchDesc = (b.workNature || '').toLowerCase().includes(query);
        if (!matchProject && !matchClient && !matchBillNo && !matchDesc) return false;
      }

      return true;
    });
  }, [processedBills, selectedProjectId, startDate, endDate, filterBillNo, searchQuery]);

  const filteredPayments = useMemo(() => {
    return processedPayments.filter((cp) => {
      // 1. Project Filter
      if (selectedProjectId !== 'all' && cp.projectId !== selectedProjectId) return false;

      // 2. Date Filter
      if (startDate && cp.date < startDate) return false;
      if (endDate && cp.date > endDate) return false;

      // 3. Category Filter
      if (filterCategory !== 'all' && cp.category !== filterCategory) return false;

      // 4. Global Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchProject = cp.projectName.toLowerCase().includes(query);
        const matchClient = cp.clientName.toLowerCase().includes(query);
        const matchRef = (cp.paymentReference || cp.utrChequeNo || '').toLowerCase().includes(query);
        const matchRemarks = (cp.remarks || '').toLowerCase().includes(query);
        if (!matchProject && !matchClient && !matchRef && !matchRemarks) return false;
      }

      return true;
    });
  }, [processedPayments, selectedProjectId, startDate, endDate, filterCategory, searchQuery]);

  // -----------------------------------------------------------------
  // 3. Project Summary & KPI Metrics
  // -----------------------------------------------------------------
  const metrics = useMemo(() => {
    const scopeBills = processedBills.filter(b => selectedProjectId === 'all' || b.projectId === selectedProjectId);
    const scopePayments = processedPayments.filter(p => selectedProjectId === 'all' || p.projectId === selectedProjectId);

    const totalWorkAmount = scopeBills.reduce((acc, b) => acc + b.gross, 0);
    const totalGST = scopeBills.reduce((acc, b) => acc + b.gst, 0);
    const totalTDS = scopeBills.reduce((acc, b) => acc + b.tds, 0);
    const totalRetention = scopeBills.reduce((acc, b) => acc + b.retention, 0);
    const totalBillingAmount = scopeBills.reduce((acc, b) => acc + b.netReceivable, 0);
    
    const totalAmountReceived = scopePayments.reduce((acc, p) => acc + (p.amountReceived || 0), 0);
    const balanceAmount = totalBillingAmount - totalAmountReceived;

    return {
      totalWorkAmount,
      totalBillingAmount,
      totalGST,
      totalTDS,
      totalRetention,
      totalAmountReceived,
      balanceAmount,
      totalBills: scopeBills.length,
      totalPaymentEntries: scopePayments.length
    };
  }, [processedBills, processedPayments, selectedProjectId]);

  // -----------------------------------------------------------------
  // 4. Action Handlers
  // -----------------------------------------------------------------
  const handleOpenRecordPayment = () => {
    setIsRecordModalOpen(true);
  };

  const handleSavePayment = (formData: any) => {
    addClientPayment({
      projectId: formData.projectId,
      amountReceived: Number(formData.amountReceived),
      date: formData.date,
      remarks: formData.remarks,
      status: 'Received',
      paymentMode: formData.paymentMode,
      bankName: formData.bankName,
      utrChequeNo: formData.utrChequeNo,
      paymentReference: formData.paymentReference,
      isRetentionPayment: formData.category === 'Retention' ? 1 : 0,
      category: formData.category,
      attachment: formData.attachmentName || undefined
    });
    
    setIsRecordModalOpen(false);
  };

  const handleDeleteReceipt = (id: string) => {
    if (confirm('Are you sure you want to delete this client payment receipt? This will permanently reverse the balance deduction.')) {
      deleteClientPayment(id);
    }
  };

  const exportARLedgerToExcel = () => {
    const dataToExport = filteredBills.map(b => ({
      'Bill No.': b.billNo,
      'Bill Date': b.certifyDate || b.month,
      'Project / Site': b.projectName,
      'Client Name': b.clientName,
      'Work Nature / Description': b.workNature,
      'Gross Amount (INR)': b.gross,
      'GST Amount (INR)': b.gst,
      'TDS Amount (INR)': b.tds,
      'Retention Amount (INR)': b.retention,
      'Net Bill Amount (INR)': b.netReceivable
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Set widths
    const max_lens = Object.keys(dataToExport[0] || {}).map(key => Math.max(key.length, 12));
    worksheet['!cols'] = max_lens.map(w => ({ wch: w }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AR Ledger Summary');
    XLSX.writeFile(workbook, `Client_Accounts_Receivable_${selectedProjectId === 'all' ? 'All_Sites' : 'Site_Specific'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Helper formatting currency
  const fmt = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="text-[11px] space-y-3 font-sans antialiased">
      
      {/* -----------------------------------------------------------------
          A. Unified Tab Selectors (Matching Billing.tsx and other modules)
         ----------------------------------------------------------------- */}
      <div className="flex flex-wrap border-b border-[#8c9ba8] gap-1 print:hidden bg-[#eef2f6]/50 p-1 rounded-t">
        <button
          type="button"
          onClick={() => setActiveTab('bills')}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'bills'
              ? 'bg-white text-[#0056b3] translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-500 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          📁 Certified Bills Ledger ({filteredBills.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-white text-green-700 translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-500 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          💸 Receipt & Payment History ({filteredPayments.length})
        </button>
      </div>

      {/* -----------------------------------------------------------------
          B. Toolbar / Action Controls Bar
         ----------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#eef2f6] border border-[#8c9ba8] p-1 gap-1.5 shadow-sm print:hidden mb-2">
        <div className="flex flex-wrap items-center gap-1">
          <button 
            onClick={() => handleOpenRecordPayment()} 
            className="sap-btn flex items-center space-x-1"
          >
            <Plus size={12} className="text-green-600" />
            <span>Record Client Payment</span>
          </button>
          
          <button 
            onClick={() => setIsExcelImportOpen(true)} 
            className="sap-btn flex items-center space-x-1 bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition"
          >
            <FileSpreadsheet size={12} className="text-green-600" />
            <span>Import Excel</span>
          </button>

          <button 
            onClick={exportARLedgerToExcel}
            className="sap-btn flex items-center space-x-1 bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition"
          >
            <FileSpreadsheet size={12} className="text-blue-600" />
            <span>Export AR Ledger</span>
          </button>

          <div className="h-4 w-px bg-[#8c9ba8] mx-1 hidden md:block"></div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`sap-btn flex items-center space-x-1 ${showFilters ? 'bg-amber-100 border-amber-400' : ''}`}
          >
            <Sliders size={12} />
            <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
          </button>
        </div>

        {/* Quick select project filter right on the toolbar */}
        <div className="flex items-center space-x-1.5">
          <span className="font-bold text-[#002f6c] uppercase tracking-wide text-[8px]">Active Project:</span>
          <select 
            value={selectedProjectId} 
            onChange={e => setSelectedProjectId(e.target.value)}
            className="sap-input font-bold text-[#002f6c] py-0.5 text-[11px] w-48"
          >
            <option value="all">— All Accounts —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* -----------------------------------------------------------------
          C. Compact KPI Bento Dashboard (Unified with Billing / Expenses)
         ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-3 bg-gray-50 p-2 border border-[#8c9ba8] print:hidden">
        {/* Total Work Amount */}
        <div className="sap-panel p-2 flex flex-col bg-white border-l-2 border-l-gray-500 shadow-sm">
          <span className="font-semibold text-gray-500 uppercase tracking-tight text-[8px] leading-none">Total Work Amount</span>
          <span className="text-sm font-black text-gray-800 mt-1 font-mono">{fmt(metrics.totalWorkAmount)}</span>
          <span className="text-[8px] text-gray-400 mt-0.5">Base Value Executed</span>
        </div>

        {/* Total Billing Amount */}
        <div className="sap-panel p-2 flex flex-col bg-white border-l-2 border-l-blue-500 shadow-sm">
          <span className="font-semibold text-blue-900 uppercase tracking-tight text-[8px] leading-none">Total Billing Amount</span>
          <span className="text-sm font-black text-blue-800 mt-1 font-mono">{fmt(metrics.totalBillingAmount)}</span>
          <span className="text-[8px] text-blue-400 mt-0.5">Payable by Client</span>
        </div>

        {/* Total GST Amount */}
        <div className="sap-panel p-2 flex flex-col bg-white border-l-2 border-l-purple-500 shadow-sm">
          <span className="font-semibold text-purple-900 uppercase tracking-tight text-[8px] leading-none">Total GST Amount</span>
          <span className="text-sm font-black text-purple-800 mt-1 font-mono">{fmt(metrics.totalGST)}</span>
          <span className="text-[8px] text-purple-400 mt-0.5">Tax Invoiced</span>
        </div>

        {/* Total TDS Amount */}
        <div className="sap-panel p-2 flex flex-col bg-white border-l-2 border-l-red-500 shadow-sm">
          <span className="font-semibold text-red-900 uppercase tracking-tight text-[8px] leading-none">Total TDS Amount</span>
          <span className="text-sm font-black text-red-800 mt-1 font-mono">{fmt(metrics.totalTDS)}</span>
          <span className="text-[8px] text-red-400 mt-0.5">Tax Deducted</span>
        </div>

        {/* Total Retention Amount */}
        <div className="sap-panel p-2 flex flex-col bg-white border-l-2 border-l-amber-500 shadow-sm">
          <span className="font-semibold text-amber-900 uppercase tracking-tight text-[8px] leading-none">Total Retention Amount</span>
          <span className="text-sm font-black text-amber-800 mt-1 font-mono">{fmt(metrics.totalRetention)}</span>
          <span className="text-[8px] text-amber-500 mt-0.5">Withheld Capital</span>
        </div>

        {/* Total Amount Received */}
        <div className="sap-panel p-2 flex flex-col bg-white border-l-2 border-l-green-500 shadow-sm">
          <span className="font-semibold text-green-800 uppercase tracking-tight text-[8px] leading-none">Total Amount Received</span>
          <span className="text-sm font-black text-green-700 mt-1 font-mono">{fmt(metrics.totalAmountReceived)}</span>
          <span className="text-[8px] text-green-500 mt-0.5">Payments Cleared</span>
        </div>

        {/* Balance Amount with Dynamic Status */}
        <div className={`sap-panel p-2 flex flex-col bg-white border-l-2 shadow-sm ${
          metrics.balanceAmount > 0 
            ? 'border-l-red-500' 
            : metrics.balanceAmount === 0 
            ? 'border-l-green-600' 
            : 'border-l-teal-600'
        }`}>
          <span className="font-semibold text-gray-600 uppercase tracking-tight text-[8px] leading-none">Balance Amount</span>
          <span className={`text-sm font-black mt-1 font-mono ${
            metrics.balanceAmount > 0 
              ? 'text-red-700' 
              : metrics.balanceAmount === 0 
              ? 'text-green-700' 
              : 'text-teal-700'
          }`}>{fmt(metrics.balanceAmount)}</span>
          <span className={`text-[8px] font-bold mt-0.5 ${
            metrics.balanceAmount > 0 
              ? 'text-red-600' 
              : metrics.balanceAmount === 0 
              ? 'text-green-600' 
              : 'text-teal-600'
          }`}>
            {metrics.balanceAmount > 0 
              ? 'Outstanding' 
              : metrics.balanceAmount === 0 
              ? 'Fully Paid' 
              : 'Advance / Excess Amount Received'}
          </span>
        </div>
      </div>

      {/* -----------------------------------------------------------------
          D. SAP Advanced Filter Bar
         ----------------------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="bg-[#f8f9fa] border border-[#8c9ba8] p-3 rounded-sm shadow-xs grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
              {/* Project Selection */}
              <div className="flex flex-col space-y-1">
                <label className="font-bold text-[#002f6c] uppercase tracking-wide text-[9px] flex items-center gap-1">
                  <Briefcase size={10} className="text-[#0056b3]" />
                  <span>Project / Site</span>
                </label>
                <select 
                  value={selectedProjectId} 
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="sap-input w-full py-1 text-[11px]"
                >
                  <option value="all">— All Accounts —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Date range from */}
              <div className="flex flex-col space-y-1">
                <label className="font-bold text-gray-600 uppercase tracking-wide text-[9px] flex items-center gap-1">
                  <Calendar size={10} className="text-gray-400" />
                  <span>Start Date</span>
                </label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="sap-input w-full py-1 text-[11px]"
                />
              </div>

              {/* Date range to */}
              <div className="flex flex-col space-y-1">
                <label className="font-bold text-gray-600 uppercase tracking-wide text-[9px] flex items-center gap-1">
                  <Calendar size={10} className="text-gray-400" />
                  <span>End Date</span>
                </label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="sap-input w-full py-1 text-[11px]"
                />
              </div>

              {/* Bill Number Search */}
              <div className="flex flex-col space-y-1">
                <label className="font-bold text-gray-600 uppercase tracking-wide text-[9px] flex items-center gap-1">
                  <FileText size={10} className="text-gray-400" />
                  <span>Bill Number</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. RA-05" 
                  value={filterBillNo} 
                  onChange={e => setFilterBillNo(e.target.value)}
                  className="sap-input font-mono uppercase w-full py-1 text-[11px]"
                />
              </div>

              {/* Payment Category filter */}
              <div className="flex flex-col space-y-1">
                <label className="font-bold text-gray-600 uppercase tracking-wide text-[9px] flex items-center gap-1">
                  <Tag size={10} className="text-gray-400" />
                  <span>Category</span>
                </label>
                <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                  className="sap-input w-full py-1 text-[11px]"
                >
                  <option value="all">-- All Categories --</option>
                  <option value="Advance">Advance</option>
                  <option value="Against RA Bill">Against RA Bill</option>
                  <option value="Bill + GST">Bill + GST</option>
                </select>
              </div>

              {/* Search Query bar */}
              <div className="col-span-2 sm:col-span-3 md:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-gray-200 mt-1 gap-2">
                <div className="relative w-full max-w-md">
                  <Search size={13} className="absolute left-2 top-2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Global search description, client, project, reference..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="sap-input pl-7 w-full py-1 text-[11px]"
                  />
                </div>
                
                <button
                  onClick={() => {
                    setSelectedProjectId('all');
                    setStartDate('');
                    setEndDate('');
                    setFilterBillNo('');
                    setFilterCategory('all');
                    setSearchQuery('');
                  }}
                  className="sap-btn flex items-center space-x-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-bold"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -----------------------------------------------------------------
          E. SAP Worksheets & Data Tables Panel
         ----------------------------------------------------------------- */}
      <div className="border border-[#8c9ba8] bg-white overflow-hidden">


        {/* -----------------------------------------------------------------
            E1. Worksheet Tab 1: Certified Bills List
           ----------------------------------------------------------------- */}
        {activeTab === 'bills' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10px] md:text-[11px] relative">
              <thead className="bg-[#f1f3f5] text-[#002f6c] uppercase font-bold sticky top-0 z-20 border-b border-gray-300 text-[9px]">
                <tr>
                  <th className="p-2 border-r border-gray-200 text-center">No.</th>
                  <th className="p-2 border-r border-gray-200">Bill No.</th>
                  <th className="p-2 border-r border-gray-200">Bill Date</th>
                  <th className="p-2 border-r border-gray-200">Work Description</th>
                  <th className="p-2 border-r border-gray-200 text-right">Work Amount</th>
                  <th className="p-2 border-r border-gray-200 text-right">GST Amount</th>
                  <th className="p-2 border-r border-gray-200 text-right">TDS Amount</th>
                  <th className="p-2 border-r border-gray-200 text-right">Retention Amount</th>
                  <th className="p-2 border-r border-gray-200 text-right font-black text-[#002f6c]">Billing Amount</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400 font-sans italic">
                      No certified billing entries match the selected filters or project.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b, idx) => {
                    return (
                      <tr key={b.id} className="hover:bg-[#f0f4f8] transition-colors even:bg-gray-50/50">
                        <td className="p-2 border-r border-gray-200 text-center text-gray-400 font-sans">{idx + 1}</td>
                        <td className="p-2 border-r border-gray-200 font-bold text-[#0056b3] uppercase tracking-tight">{b.billNo}</td>
                        <td className="p-2 border-r border-gray-200 text-gray-600">{b.certifyDate || b.month}</td>
                        <td className="p-2 border-r border-gray-200 font-sans text-gray-600 truncate max-w-[200px]" title={b.workNature}>
                          {b.workNature}
                        </td>
                        <td className="p-2 border-r border-gray-200 text-right">{b.gross.toLocaleString('en-IN')}</td>
                        <td className="p-2 border-r border-gray-200 text-right text-purple-600">{b.gst.toLocaleString('en-IN')}</td>
                        <td className="p-2 border-r border-gray-200 text-right text-red-600">({b.tds.toLocaleString('en-IN')})</td>
                        <td className="p-2 border-r border-gray-200 text-right text-teal-700">({b.retention.toLocaleString('en-IN')})</td>
                        <td className="p-2 border-r border-gray-200 text-right font-black text-[#002f6c] bg-gray-50/50">
                          {b.netReceivable.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center font-sans">
                          {b.status === 'Paid' ? (
                            <span className="bg-green-100 text-green-800 border border-green-200 px-1.5 py-0.5 rounded-sm font-bold text-[8px] uppercase tracking-wider">
                              Paid
                            </span>
                          ) : b.status === 'Partially Paid' ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-sm font-bold text-[8px] uppercase tracking-wider">
                              Partial
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded-sm font-bold text-[8px] uppercase tracking-wider">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Totals row */}
                {filteredBills.length > 0 && (
                  <tr className="bg-[#eef2f6] text-gray-800 font-extrabold text-right border-t-2 border-b-4 border-double border-gray-400 text-[10px]">
                    <td colSpan={4} className="p-2.5 text-center font-sans uppercase tracking-wider text-slate-800 font-black">
                      Summary Total ({filteredBills.length} Bills)
                    </td>
                    <td className="p-2.5 border-r border-gray-300">
                      {filteredBills.reduce((acc, b) => acc + b.gross, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 border-r border-gray-300 text-purple-700">
                      {filteredBills.reduce((acc, b) => acc + b.gst, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 border-r border-gray-300 text-red-700">
                      ({filteredBills.reduce((acc, b) => acc + b.tds, 0).toLocaleString('en-IN')})
                    </td>
                    <td className="p-2.5 border-r border-gray-300 text-teal-800">
                      ({filteredBills.reduce((acc, b) => acc + b.retention, 0).toLocaleString('en-IN')})
                    </td>
                    <td className="p-2.5 border-r border-gray-300 text-[#002f6c] font-black bg-gray-200">
                      {filteredBills.reduce((acc, b) => acc + b.netReceivable, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 bg-white"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* -----------------------------------------------------------------
            E2. Worksheet Tab 2: Payment Receipt History
           ----------------------------------------------------------------- */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10px] md:text-[11px]">
              <thead className="bg-[#f1f3f5] text-[#002f6c] uppercase font-bold sticky top-0 z-20 border-b border-gray-300">
                <tr>
                  <th className="p-2 border-r border-gray-200 text-center">No.</th>
                  <th className="p-2 border-r border-gray-200">Payment Date</th>
                  <th className="p-2 border-r border-gray-200">Payment Category</th>
                  <th className="p-2 border-r border-gray-200 text-right font-black text-[#002f6c]">Amount Received</th>
                  <th className="p-2 border-r border-gray-200">Payment Mode</th>
                  <th className="p-2 border-r border-gray-200">Reference Number</th>
                  <th className="p-2 border-r border-gray-200">Remarks</th>
                  <th className="p-2 border-r border-gray-200">Entered By</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400 font-sans italic">
                      No client receipts match the selected filters or project.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p, idx) => {
                    let catStyle = "bg-gray-100 text-gray-700";
                    if (p.category === 'Advance') catStyle = "bg-blue-100 text-blue-800 border-blue-200";
                    else if (p.category === 'Against RA Bill') catStyle = "bg-green-100 text-green-800 border-green-200";
                    else if (p.category === 'Bill + GST') catStyle = "bg-purple-100 text-purple-800 border-purple-200";

                    return (
                      <tr key={p.id} className="hover:bg-[#f0f4f8] transition-colors even:bg-gray-50/50">
                        <td className="p-2 border-r border-gray-200 text-center text-gray-400 font-sans">{idx + 1}</td>
                        <td className="p-2 border-r border-gray-200 text-gray-600">{p.date}</td>
                        <td className="p-2 border-r border-gray-200 font-sans text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded-sm font-bold text-[8px] uppercase tracking-wider border ${catStyle}`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="p-2 border-r border-gray-200 text-right text-green-700 font-black bg-green-50/30">
                          ₹{p.amountReceived.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 border-r border-gray-200 font-sans text-gray-600">{p.paymentMode}</td>
                        <td className="p-2 border-r border-gray-200 max-w-[120px] truncate" title={p.paymentReference || p.utrChequeNo || 'N/A'}>
                          {p.paymentReference || p.utrChequeNo || 'N/A'}
                        </td>
                        <td className="p-2 border-r border-gray-200 font-sans text-gray-600 max-w-[200px] truncate" title={p.remarks}>
                          {p.remarks}
                        </td>
                        <td className="p-2 border-r border-gray-200 font-sans text-gray-500 max-w-[100px] truncate">{p.enteredBy}</td>
                        <td className="p-1 text-center">
                          <button 
                            onClick={() => handleDeleteReceipt(p.id)}
                            title="Delete receipt voucher entry"
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-sm cursor-pointer transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Summary totals for payments */}
                {filteredPayments.length > 0 && (
                  <tr className="bg-[#eef2f6] text-gray-800 font-extrabold text-right border-t-2 border-b-4 border-double border-gray-400">
                    <td colSpan={3} className="p-2.5 text-center font-sans uppercase tracking-wider text-slate-800 font-black">
                      Total Amount Received ({filteredPayments.length} Vouchers)
                    </td>
                    <td className="p-2.5 border-r border-gray-300 text-green-700 font-black text-[11px] bg-[#e6f4ea]">
                      ₹{filteredPayments.reduce((acc, p) => acc + p.amountReceived, 0).toLocaleString('en-IN')}
                    </td>
                    <td colSpan={5} className="p-2.5 bg-white text-center font-sans text-[9px] text-gray-500">
                      Sum of all running collections matching parameters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -----------------------------------------------------------------
          F. MODAL DIALOG: Record Client Payment (SAP Form Interface)
         ----------------------------------------------------------------- */}
      <AnimatePresence>
        {isRecordModalOpen && (
          <PaymentEntryFormModal 
            isOpen={isRecordModalOpen}
            onClose={() => setIsRecordModalOpen(false)}
            onSave={handleSavePayment}
            projects={projects}
          />
        )}
      </AnimatePresence>

      {/* -----------------------------------------------------------------
          G. BULK EXCEL UPLOADER DIALOG
         ----------------------------------------------------------------- */}
      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['projectId', 'amountReceived', 'date', 'remarks', 'paymentReference', 'paymentMode', 'bankName', 'utrChequeNo', 'category']}
        entityName="Client Payments"
        projectsContext={projects}
        onUpload={async (importedData) => {
          let count = 0;
          for (const item of importedData) {
            if (!item.projectId || !item.amountReceived) continue;
            await addClientPayment({
              projectId: item.projectId,
              amountReceived: Number(item.amountReceived) || 0,
              date: item.date || new Date().toISOString().split('T')[0],
              remarks: item.remarks || '',
              paymentReference: item.paymentReference || '',
              paymentMode: item.paymentMode || 'NEFT',
              bankName: item.bankName || '',
              utrChequeNo: item.utrChequeNo || '',
              category: item.category || 'Running Bill',
              isRetentionPayment: item.category === 'Retention' ? 1 : 0
            });
            count++;
          }
          alert(`Successfully imported ${count} Client Payment vouchers!`);
          window.location.reload();
        }}
      />
    </div>
  );
};

// -----------------------------------------------------------------
// Sub-Component: PaymentEntryFormModal (Typesafe & Elegant Form)
// -----------------------------------------------------------------
interface PaymentEntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  projects: Project[];
}

const PaymentEntryFormModal = ({
  isOpen,
  onClose,
  onSave,
  projects
}: PaymentEntryFormModalProps) => {

  const [projectId, setProjectId] = useState<string>('');
  const [category, setCategory] = useState<string>('Against RA Bill');
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('NEFT');
  const [bankName, setBankName] = useState<string>('');
  const [utrChequeNo, setUtrChequeNo] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      alert('Error: Please select an active Project first.');
      return;
    }
    if (!amountReceived || Number(amountReceived) <= 0) {
      alert('Error: Please enter a valid Payment Amount greater than 0.');
      return;
    }

    onSave({
      projectId,
      category,
      date,
      amountReceived: Number(amountReceived),
      paymentMode,
      bankName,
      utrChequeNo,
      paymentReference,
      remarks: remarks || `Payment received under category: ${category}`,
      attachmentName
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/45 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        className="sap-panel relative z-10 w-full max-w-2xl bg-white rounded-sm shadow-2xl border-t-4 border-t-[#0056b3] overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-gray-200 bg-[#f8f9fa] px-4 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-[#002f6c] font-bold text-sm flex items-center space-x-1.5">
              <Landmark size={14} className="text-[#0056b3]" />
              <span>Record Client Receipt Voucher</span>
            </h2>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              Secure Ledger Entry • Double-entry validation on current receivables
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="text-xs">
          <div className="wbs-form-grid m-2">
            
            <label>
              Project / Site Name: <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="sap-input font-semibold text-[#002f6c] w-full"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">-- Choose Project Context --</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.clientName || 'No Client Specified'})
                </option>
              ))}
            </select>

            <label>
              Payment Category: <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="sap-input font-semibold text-[#002f6c] w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Against RA Bill">Against RA Bill</option>
              <option value="Advance">Advance</option>
              <option value="Bill + GST">Bill + GST</option>
            </select>

            <label>
              Payment Date: <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              className="sap-input w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <label>
              Amount Received (INR): <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="any"
              min="0.01"
              placeholder="0.00"
              className="sap-input font-mono font-bold w-full bg-[#fffbce]"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
            />

            <label>
              Payment Mode:
            </label>
            <select
              className="sap-input w-full"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="NEFT">NEFT / RTGS</option>
              <option value="IMPS">IMPS / Fast Bank Transfer</option>
              <option value="Cheque">Demand Draft / Cheque</option>
              <option value="Cash">Cash Receipt</option>
              <option value="Adjusted">Adjusted / Credit Note</option>
            </select>

            <label>
              Clearing Bank Name:
            </label>
            <input
              type="text"
              placeholder="e.g. ICICI, HDFC, SBI"
              className="sap-input w-full"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />

            <label>
              UTR / Cheque Serial Number:
            </label>
            <input
              type="text"
              placeholder="e.g. UTIB0001239842"
              className="sap-input font-mono uppercase w-full"
              value={utrChequeNo}
              onChange={(e) => setUtrChequeNo(e.target.value)}
            />

            <label>
              Client Advice Reference Code:
            </label>
            <input
              type="text"
              placeholder="e.g. ADVICE/2026/08"
              className="sap-input w-full"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />

            <label>
              Internal Bookkeeping Remarks:
            </label>
            <input
              type="text"
              placeholder="Write adjustment logs here..."
              className="sap-input w-full"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-200 pt-4 flex justify-end space-x-2 bg-[#f8f9fa] p-3">
            <button
              type="button"
              onClick={onClose}
              className="sap-btn bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-4 py-1.5 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sap-btn bg-[#0056b3] text-white hover:bg-[#004494] px-5 py-1.5 font-bold cursor-pointer"
            >
              Post Client Voucher
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
