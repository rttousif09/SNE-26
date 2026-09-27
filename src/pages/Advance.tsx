import React, { useState, useMemo } from 'react';
import type { Advance as AdvanceType } from '../types';
import { SAPSelect } from '../components/SAPSelect';
import { useAppContext } from '../store';
import { 
  Save, Edit, X, Trash2, FileSpreadsheet, Eye, 
  RefreshCw, Search, CheckSquare, Square,
  Clock, CheckCircle2, History, ChevronRight
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { checkWorkerAdvanceDuplicate, addOverrideLog } from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { PDFExportButton } from '../components/PDFExportButton';
import { SAPTransactionHeader } from '../components/common/SAPTransactionHeader';
import { SAPTabs } from '../components/common/SAPTabs';
import * as XLSX from 'xlsx';

export const Advance: React.FC = () => {
  const { 
    user, advances, projects, workers, addAdvance, updateAdvance, deleteAdvance, 
    workerPayments, activityLogs = [] 
  } = useAppContext();
  
  const isReadOnly = user?.username === 'saddamsne';

  // Filters State
  const [filterProject, setFilterProject] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDetailsAdvance, setViewDetailsAdvance] = useState<any | null>(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [activeSapTab, setActiveSapTab] = useState<string>('entry');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Duplicate verification states
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupData, setDupData] = useState<any[]>([]);
  const [pendingSaveFn, setPendingSaveFn] = useState<((overrideReason?: string) => void) | null>(null);

  // Advance Form Data
  const [formData, setFormData] = useState({
    projectId: '',
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentType: 'Site Advance',
    specifyOtherAdvance: '',
    status: 'Outstanding' as 'Outstanding' | 'Adjusted',
    remarks: '',
    paidBy: 'Saddam Hussain',
    paidByDetails: '',
    receiptProof: '',
    receiptFileName: '',
    receiptFileType: ''
  });

  // Reset / Cancel Form
  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      projectId: filterProject || '',
      workerId: '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      paymentType: 'Site Advance',
      specifyOtherAdvance: '',
      status: 'Outstanding',
      remarks: '',
      paidBy: 'Saddam Hussain',
      paidByDetails: '',
      receiptProof: '',
      receiptFileName: '',
      receiptFileType: ''
    });
  };

  // Populate Form on Edit
  const handleEdit = (advance: any) => {
    setFormData({
      projectId: advance.projectId,
      workerId: advance.workerId,
      date: advance.date,
      amount: advance.amount.toString(),
      paymentType: advance.paymentType || 'Site Advance',
      specifyOtherAdvance: advance.specifyOtherAdvance || '',
      status: advance.status || (advance.isDeducted ? 'Adjusted' : 'Outstanding'),
      remarks: advance.remarks || '',
      paidBy: advance.paidBy || 'Saddam Hussain',
      paidByDetails: advance.paidByDetails || '',
      receiptProof: advance.receiptProof || '',
      receiptFileName: advance.receiptFileName || '',
      receiptFileType: advance.receiptFileType || ''
    });
    setEditingId(advance.id);
    setActiveSapTab('entry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Available Workers for selected Project in Entry Form
  const formProjectWorkers = useMemo(() => {
    if (!formData.projectId) return workers;
    return workers.filter(w => w.projectId === formData.projectId);
  }, [formData.projectId, workers]);

  // Selected Worker object for rapid display
  const selectedWorkerObj = useMemo(() => {
    return workers.find(w => w.id === formData.workerId);
  }, [formData.workerId, workers]);

  // Available Workers for the filter bar
  const filterProjectWorkers = useMemo(() => {
    if (!filterProject) return workers;
    return workers.filter(w => w.projectId === filterProject);
  }, [filterProject, workers]);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          receiptProof: reader.result as string,
          receiptFileName: file.name,
          receiptFileType: file.type
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Advance Submission
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.projectId) {
      alert("Please select a project.");
      return;
    }
    if (!formData.workerId) {
      alert("Please select a worker.");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (formData.paymentType === 'Other Advance' && !formData.specifyOtherAdvance.trim()) {
      alert("Please specify the details for Other Advance.");
      return;
    }

    const targetProjectObj = projects.find(p => p.id === formData.projectId);
    if (targetProjectObj?.status === 'Completed') {
      alert("This project is marked as Completed. New entries are not allowed.");
      return;
    }

    const amountNum = Number(formData.amount);
    const payload = {
      projectId: formData.projectId,
      workerId: formData.workerId,
      date: formData.date,
      amount: amountNum,
      paymentType: formData.paymentType as AdvanceType['paymentType'],
      specifyOtherAdvance: formData.paymentType === 'Other Advance' ? formData.specifyOtherAdvance.trim() : undefined,
      status: formData.status as AdvanceType['status'],
      adjustedAmount: formData.status === 'Adjusted' ? amountNum : 0,
      outstandingAmount: formData.status === 'Adjusted' ? 0 : amountNum,
      remarks: formData.remarks,
      paidBy: formData.paidBy,
      paidByDetails: formData.paidBy === 'Other' ? formData.paidByDetails : undefined,
      receiptProof: formData.receiptProof,
      receiptFileName: formData.receiptFileName,
      receiptFileType: formData.receiptFileType,
      createdBy: user?.username || 'Admin',
      createdDate: new Date().toISOString()
    };

    const onProceedSave = (bypassCheck: boolean = false, overrideReason: string = '') => {
      if (editingId) {
        updateAdvance(editingId, payload);
      } else {
        addAdvance(payload);
      }

      if (bypassCheck && overrideReason) {
        const workerName = workers.find(w => w.id === formData.workerId)?.name || 'Unknown';
        addOverrideLog(
          user?.username || 'Unknown',
          'Worker Advance',
          `Worker: ${workerName} (ID: ${formData.workerId}), Date: ${formData.date}, Amount: ₹${amountNum.toLocaleString()}`,
          overrideReason
        );
      }
      handleCancel();
    };

    const countMatches = checkWorkerAdvanceDuplicate(
      advances,
      {
        workerId: formData.workerId,
        date: formData.date,
        amount: amountNum
      },
      editingId || undefined
    );

    if (countMatches.length > 0) {
      setDupData(countMatches);
      setPendingSaveFn(() => (reason?: string) => onProceedSave(true, reason || 'No details'));
      setDupModalOpen(true);
      return;
    }

    onProceedSave();
  };

  // Filtered Advances for Register
  const filteredAdvances = useMemo(() => {
    let list = [...advances];

    if (filterProject) {
      list = list.filter(a => a.projectId === filterProject);
    }
    if (filterWorker) {
      list = list.filter(a => a.workerId === filterWorker);
    }
    if (filterStartDate) {
      list = list.filter(a => a.date >= filterStartDate);
    }
    if (filterEndDate) {
      list = list.filter(a => a.date <= filterEndDate);
    }
    if (filterPaymentType !== 'All') {
      list = list.filter(a => a.paymentType === filterPaymentType);
    }
    if (filterStatus !== 'All') {
      list = list.filter(a => (a.status || 'Outstanding') === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => {
        const worker = workers.find(w => w.id === a.workerId);
        const name = worker?.name.toLowerCase() || '';
        const idNo = worker?.workerId.toLowerCase() || '';
        const txNo = a.transactionNo?.toLowerCase() || '';
        const remarks = a.remarks?.toLowerCase() || '';
        const otherDetails = a.specifyOtherAdvance?.toLowerCase() || '';
        return name.includes(q) || idNo.includes(q) || txNo.includes(q) || remarks.includes(q) || otherDetails.includes(q);
      });
    }

    // Secondary filter based on active tab
    if (activeSapTab === 'outstanding') {
      list = list.filter(a => (a.status || (a.isDeducted ? 'Adjusted' : 'Outstanding')) === 'Outstanding');
    } else if (activeSapTab === 'adjusted') {
      list = list.filter(a => (a.status || (a.isDeducted ? 'Adjusted' : 'Outstanding')) === 'Adjusted');
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [advances, filterProject, filterWorker, filterStartDate, filterEndDate, filterPaymentType, filterStatus, searchQuery, activeSapTab, workers]);

  // Register Summary Calculations
  const summary = useMemo(() => {
    let totalAdv = 0;
    let totalAdj = 0;
    let totalOut = 0;
    let totalOverBal = 0;
    let totalOutCount = 0;
    let totalAdjCount = 0;

    advances.forEach(a => {
      const amt = Number(a.amount) || 0;
      totalAdv += amt;

      const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
      const adjAmt = a.adjustedAmount !== undefined ? Number(a.adjustedAmount) : (isAdj ? amt : (Number(a.deductionAmount) || 0));
      totalAdj += adjAmt;

      const outAmt = a.outstandingAmount !== undefined ? Number(a.outstandingAmount) : (isAdj ? 0 : Math.max(0, amt - adjAmt));
      totalOut += outAmt;

      if (isAdj) totalAdjCount++;
      else totalOutCount++;

      if (a.paymentType === 'Previously Over Balance') {
        totalOverBal += amt;
      }
    });

    return {
      totalAdvance: totalAdv,
      totalAdjusted: totalAdj,
      totalOutstanding: totalOut,
      previouslyOverBalance: totalOverBal,
      totalOutstandingCount: totalOutCount,
      totalAdjustedCount: totalAdjCount
    };
  }, [advances]);

  const getWorkerInfo = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker 
      ? { name: worker.name, idNo: worker.workerId, designation: worker.designation || 'Worker' }
      : { name: 'Unknown', idNo: '-', designation: '-' };
  };

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || 'Unknown Project';
  };

  // Row selection toggle
  const toggleSelectRow = (id: string) => {
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === filteredAdvances.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredAdvances.map(a => a.id));
    }
  };

  // Worker Ledger summary for the Worker Ledger tab
  const workerLedgerSummary = useMemo(() => {
    const map = new Map<string, { worker: any; totalAdv: number; totalAdj: number; balance: number; count: number }>();
    advances.forEach(a => {
      const w = workers.find(x => x.id === a.workerId);
      if (!w) return;
      if (filterProject && a.projectId !== filterProject) return;

      const amt = Number(a.amount) || 0;
      const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
      const adjAmt = a.adjustedAmount !== undefined ? Number(a.adjustedAmount) : (isAdj ? amt : (Number(a.deductionAmount) || 0));
      const outAmt = Math.max(0, amt - adjAmt);

      const existing = map.get(w.id) || { worker: w, totalAdv: 0, totalAdj: 0, balance: 0, count: 0 };
      existing.totalAdv += amt;
      existing.totalAdj += adjAmt;
      existing.balance += outAmt;
      existing.count += 1;
      map.set(w.id, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.balance - a.balance);
  }, [advances, workers, filterProject]);

  // Export to Excel
  const exportRegisterToExcel = () => {
    const data: Record<string, any>[] = filteredAdvances.map(a => {
      const w = getWorkerInfo(a.workerId);
      const amt = Number(a.amount) || 0;
      const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
      const adjAmt = (a.adjustedAmount !== undefined && a.adjustedAmount !== null)
        ? Number(a.adjustedAmount)
        : (isAdj ? amt : (Number(a.deductionAmount) || 0));
      const outAmt = (a.outstandingAmount !== undefined && a.outstandingAmount !== null)
        ? Number(a.outstandingAmount)
        : (isAdj ? 0 : Math.max(0, amt - adjAmt));

      return {
        'Date': a.date,
        'Transaction No': a.transactionNo || `ADV-${a.id.slice(0, 6).toUpperCase()}`,
        'Project': getProjectName(a.projectId),
        'Worker ID': w.idNo,
        'Worker Name': w.name,
        'Payment Type': a.paymentType || 'Site Advance',
        'Details': a.paymentType === 'Other Advance' ? (a.specifyOtherAdvance || '-') : (a.paymentType === 'Previously Over Balance' ? 'Carry Forward Over Balance' : '-'),
        'Amount (INR)': amt,
        'Adjusted Amount (INR)': adjAmt,
        'Outstanding Amount (INR)': outAmt,
        'Status': a.status || (isAdj ? 'Adjusted' : 'Outstanding'),
        'Remarks': a.remarks || ''
      };
    });

    data.push({
      'Date': 'TOTALS',
      'Transaction No': '',
      'Project': '',
      'Worker ID': '',
      'Worker Name': '',
      'Payment Type': '',
      'Details': '',
      'Amount (INR)': summary.totalAdvance || 0,
      'Adjusted Amount (INR)': summary.totalAdjusted || 0,
      'Outstanding Amount (INR)': summary.totalOutstanding || 0,
      'Status': '',
      'Remarks': `Previously Over Balance: ₹${(summary.previouslyOverBalance || 0).toLocaleString('en-IN')}`
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Worker Transactions");
    XLSX.writeFile(wb, `WFT01_Worker_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F6F7] text-[#2F3B45] text-[12px] font-sans pb-16">
      {/* 1. SAP TRANSACTION HEADER & TOOLBAR */}
      <SAPTransactionHeader
        tcode="WFT01"
        title="Worker Financial Transactions"
        subtitle="Record Advances, Travel Claims, and Settled Balances"
        onNew={handleCancel}
        onSave={() => handleSubmit()}
        onEdit={selectedRowIds.length === 1 ? () => {
          const rec = advances.find(a => a.id === selectedRowIds[0]);
          if (rec) handleEdit(rec);
        } : undefined}
        onDelete={selectedRowIds.length === 1 ? () => setDeleteId(selectedRowIds[0]) : undefined}
        onPrint={() => window.print()}
        onExport={exportRegisterToExcel}
        onRefresh={() => window.location.reload()}
        canSave={!isReadOnly}
        canEdit={!isReadOnly && selectedRowIds.length === 1}
        canDelete={!isReadOnly && selectedRowIds.length === 1}
      >
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setIsExcelImportOpen(true)}
            className="sap-btn h-[24px] px-2 text-[11px] text-emerald-800"
            title="Import Excel Advance Register"
          >
            <FileSpreadsheet size={12} className="text-emerald-700" />
            <span>Import</span>
          </button>
        )}
        <PDFExportButton
          title="Worker Advance Register Report"
          subtitle={`Generated on ${new Date().toLocaleDateString('en-IN')}`}
          siteName={filterProject ? getProjectName(filterProject) : 'All Projects'}
          headers={['Date', 'Txn No', 'Project', 'Worker', 'Payment Type', 'Details', 'Amount', 'Adjusted', 'Outstanding', 'Status', 'Remarks']}
          data={filteredAdvances.map(a => {
            const w = getWorkerInfo(a.workerId);
            const amt = Number(a.amount) || 0;
            const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
            const adjAmt = (a.adjustedAmount !== undefined && a.adjustedAmount !== null)
              ? Number(a.adjustedAmount)
              : (isAdj ? amt : (Number(a.deductionAmount) || 0));
            const outAmt = (a.outstandingAmount !== undefined && a.outstandingAmount !== null)
              ? Number(a.outstandingAmount)
              : (isAdj ? 0 : Math.max(0, amt - adjAmt));
            return [
              a.date,
              a.transactionNo || `ADV-${a.id.slice(0, 6).toUpperCase()}`,
              getProjectName(a.projectId),
              `${w.name} (${w.idNo})`,
              a.paymentType || 'Site Advance',
              a.specifyOtherAdvance || '-',
              `Rs. ${amt.toLocaleString('en-IN')}`,
              `Rs. ${adjAmt.toLocaleString('en-IN')}`,
              `Rs. ${outAmt.toLocaleString('en-IN')}`,
              a.status || (isAdj ? 'Adjusted' : 'Outstanding'),
              a.remarks || '-'
            ];
          })}
          totals={[
            '', '', '', '', '', 'Totals:',
            `Rs. ${(summary.totalAdvance || 0).toLocaleString('en-IN')}`,
            `Rs. ${(summary.totalAdjusted || 0).toLocaleString('en-IN')}`,
            `Rs. ${(summary.totalOutstanding || 0).toLocaleString('en-IN')}`,
            '', ''
          ]}
        />
      </SAPTransactionHeader>

      {/* 2. SAP ALIGNED FORM WORK AREA (Header Section) */}
      {!isReadOnly && activeSapTab === 'entry' && (
        <div className="bg-[#FFFFFF] border border-[#B8C3CC] p-3 mb-2 rounded-[2px] shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#B8C3CC] pb-1.5 mb-2.5">
            <span className="font-bold text-[12px] text-[#2F3B45] uppercase tracking-wide flex items-center space-x-1.5">
              <span>{editingId ? 'Edit Transaction Details' : 'Transaction Entry Details'}</span>
              <span className="text-[10px] text-[#5F6B75] font-normal">
                (Standard SAP Input Grid)
              </span>
            </span>
            {editingId && (
              <span className="bg-[#FFFDE7] text-[#E9730C] border border-[#E9730C]/40 text-[10px] font-bold px-2 py-0.5 rounded-[2px]">
                Editing Active: {editingId}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Aligned 2-column or 3-column SAP form grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-[12px]">
              
              {/* Row 1 Left: Project */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Project <span className="text-red-600">*</span>:
                </label>
                <div className="flex-1 min-w-0">
                  <SAPSelect
                    required
                    className="w-full h-[28px] text-[12px] bg-white border border-[#8c9ba8] rounded-[2px] px-2"
                    value={formData.projectId}
                    onChange={e => {
                      const newProj = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        projectId: newProj,
                        workerId: ''
                      }));
                    }}
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </SAPSelect>
                </div>
              </div>

              {/* Row 1 Right: Transaction No */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#5F6B75]">
                  Transaction No:
                </label>
                <div className="flex-1 min-w-0">
                  <input 
                    type="text" 
                    readOnly 
                    className="w-full h-[28px] px-2 text-[12px] bg-[#F4F6F7] border border-[#B8C3CC] rounded-[2px] font-mono text-[#5F6B75] cursor-not-allowed" 
                    value={editingId ? (advances.find(a => a.id === editingId)?.transactionNo || `WFT/${editingId.slice(0, 6).toUpperCase()}`) : 'WFT/AUTO'}
                  />
                </div>
              </div>

              {/* Row 1 Col 3: Date */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Date <span className="text-red-600">*</span>:
                </label>
                <div className="flex-1 min-w-0">
                  <input 
                    required
                    type="date"
                    className="w-full h-[28px] px-2 text-[12px] bg-white border border-[#8c9ba8] rounded-[2px]"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 2 Left: Worker ID & Name */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Worker <span className="text-red-600">*</span>:
                </label>
                <div className="flex-1 min-w-0 relative flex items-center">
                  <SAPSelect
                    required
                    className="w-full h-[28px] text-[12px] bg-white border border-[#8c9ba8] rounded-[2px] px-2"
                    value={formData.workerId}
                    onChange={e => setFormData({ ...formData, workerId: e.target.value })}
                  >
                    <option value="">
                      {!formData.projectId ? '-- Select Worker (All Sites) --' : '-- Select Worker --'}
                    </option>
                    {formProjectWorkers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.workerId} - {w.name} ({w.designation || 'Worker'})
                      </option>
                    ))}
                  </SAPSelect>
                </div>
              </div>

              {/* Row 2 Center: Amount */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Amount <span className="text-red-600">*</span>:
                </label>
                <div className="flex-1 min-w-0 relative flex items-center">
                  <span className="absolute left-2 text-[#5F6B75] font-bold text-[12px]">₹</span>
                  <input 
                    required
                    type="number"
                    step="any"
                    placeholder="0.00"
                    className="w-full h-[28px] pl-6 pr-2 text-[12px] font-mono font-bold text-[#BB0000] bg-white border border-[#8c9ba8] rounded-[2px] focus:bg-[#FFFDE7]"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 2 Right: Transaction Type */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Transaction <span className="text-red-600">*</span>:
                </label>
                <div className="flex-1 min-w-0">
                  <SAPSelect
                    required
                    className="w-full h-[28px] text-[12px] font-semibold bg-white border border-[#8c9ba8] rounded-[2px] px-2"
                    value={formData.paymentType}
                    onChange={e => setFormData({ ...formData, paymentType: e.target.value })}
                  >
                    <option value="Site Advance">Site Advance</option>
                    <option value="Travel Advance">Travel Advance</option>
                    <option value="Payment">Payment</option>
                    <option value="Other Advance">Other Advance</option>
                    {editingId && formData.paymentType === 'Previously Over Balance' && (
                      <option value="Previously Over Balance">Previously Over Balance</option>
                    )}
                  </SAPSelect>
                </div>
              </div>

              {/* If Other Advance: Specify details */}
              {formData.paymentType === 'Other Advance' && (
                <div className="flex items-center space-x-2 md:col-span-2">
                  <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#E9730C]">
                    Specify Other <span className="text-red-600">*</span>:
                  </label>
                  <div className="flex-1 min-w-0">
                    <input 
                      required
                      type="text"
                      placeholder="Specify advance reason (medical, travel, emergency, etc.)"
                      className="w-full h-[28px] px-2 text-[12px] bg-[#FFFDE7] border border-[#E9730C] rounded-[2px]"
                      value={formData.specifyOtherAdvance}
                      onChange={e => setFormData({ ...formData, specifyOtherAdvance: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Row 3 Left: Status */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Status:
                </label>
                <div className="flex-1 min-w-0">
                  <SAPSelect
                    className="w-full h-[28px] text-[12px] bg-white border border-[#8c9ba8] rounded-[2px] px-2"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="Outstanding">Outstanding</option>
                    <option value="Adjusted">Adjusted</option>
                  </SAPSelect>
                </div>
              </div>

              {/* Row 3 Center: Disbursed By */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Disbursed By:
                </label>
                <div className="flex-1 min-w-0">
                  <SAPSelect
                    className="w-full h-[28px] text-[12px] bg-white border border-[#8c9ba8] rounded-[2px] px-2"
                    value={formData.paidBy}
                    onChange={e => setFormData({ ...formData, paidBy: e.target.value })}
                  >
                    <option value="Saddam Hussain">Saddam Hussain</option>
                    <option value="Tousif Reja">Tousif Reja</option>
                    <option value="Other">Other</option>
                  </SAPSelect>
                </div>
              </div>

              {/* Row 3 Right: Receipt attachment */}
              <div className="flex items-center space-x-2">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#5F6B75]">
                  Voucher Proof:
                </label>
                <div className="flex-1 min-w-0 flex items-center space-x-1">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="text-[11px] file:mr-2 file:py-0.5 file:px-2 file:rounded-[2px] file:border file:border-[#B8C3CC] file:text-[11px] file:bg-[#F4F6F7]" 
                    onChange={handleFileUpload} 
                  />
                  {formData.receiptFileName && (
                    <span className="text-[10px] text-emerald-700 font-mono truncate">
                      ✓ {formData.receiptFileName}
                    </span>
                  )}
                </div>
              </div>

              {/* Full Width: Remarks */}
              <div className="flex items-center space-x-2 md:col-span-2 lg:col-span-3">
                <label className="w-28 shrink-0 text-right text-[12px] font-medium text-[#2F3B45]">
                  Remarks:
                </label>
                <div className="flex-1 min-w-0">
                  <input 
                    type="text"
                    placeholder="Enter transaction narrative or voucher reference..."
                    className="w-full h-[28px] px-2 text-[12px] bg-white border border-[#8c9ba8] rounded-[2px]"
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 3. SAP HORIZONTAL TABS */}
      <SAPTabs
        tabs={[
          { id: 'entry', label: 'Entry' },
          { id: 'outstanding', label: 'Outstanding Transactions', count: summary.totalOutstandingCount },
          { id: 'adjusted', label: 'Adjustment History', count: summary.totalAdjustedCount },
          { id: 'ledger', label: 'Worker Ledger' },
          { id: 'audit', label: 'Audit Trail' },
        ]}
        activeTab={activeSapTab}
        onChange={setActiveSapTab}
        className="mb-2"
      />

      {/* TAB CONTENT 1: ENTRY & OUTSTANDING & ADJUSTED TAB (DENSE SPREADSHEET TABLE) */}
      {(activeSapTab === 'entry' || activeSapTab === 'outstanding' || activeSapTab === 'adjusted') && (
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#B8C3CC] rounded-[2px] shadow-2xs overflow-hidden">
          
          {/* Table Control & Filter Header */}
          <div className="bg-[#E7EEF3] px-3 py-1.5 border-b border-[#B8C3CC] flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#2F3B45] uppercase tracking-wide text-[11px]">
                {activeSapTab === 'outstanding' ? 'Outstanding Advances Register' : activeSapTab === 'adjusted' ? 'Adjusted / Settled Records' : 'All Worker Financial Transactions'}
              </span>
              <span className="bg-[#D9EBF7] text-[#0A6ED1] text-[10px] font-mono font-bold px-2 py-0.5 rounded-[1px] border border-[#0A6ED1]/30">
                {filteredAdvances.length} Records
              </span>
              {selectedRowIds.length > 0 && (
                <span className="bg-[#FFFDE7] text-[#2F3B45] text-[10px] font-bold px-2 py-0.5 rounded-[1px] border border-[#B8C3CC]">
                  {selectedRowIds.length} Selected
                </span>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex items-center space-x-2 flex-wrap text-[11px]">
              <select
                className="h-[24px] px-1 bg-white border border-[#B8C3CC] rounded-[2px] text-[11px]"
                value={filterProject}
                onChange={e => {
                  setFilterProject(e.target.value);
                  setFilterWorker('');
                }}
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                className="h-[24px] px-1 bg-white border border-[#B8C3CC] rounded-[2px] text-[11px]"
                value={filterPaymentType}
                onChange={e => setFilterPaymentType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Site Advance">Site Advance</option>
                <option value="Travel Advance">Travel Advance</option>
                <option value="Payment">Payment</option>
                <option value="Other Advance">Other Advance</option>
              </select>

              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-[24px] w-36 px-2 pr-6 text-[11px] bg-white border border-[#B8C3CC] rounded-[2px]"
                />
                <Search size={11} className="absolute right-1.5 text-[#5F6B75]" />
              </div>

              {(filterProject || filterPaymentType !== 'All' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterProject('');
                    setFilterPaymentType('All');
                    setSearchQuery('');
                  }}
                  className="sap-btn h-[24px] px-1.5 text-[10px]"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* DENSE SPREADSHEET-LIKE TABLE */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[480px]">
            <table className="sap-dense-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-8 text-center px-1">
                    <button type="button" onClick={toggleSelectAll} className="cursor-pointer">
                      {selectedRowIds.length === filteredAdvances.length && filteredAdvances.length > 0 ? (
                        <CheckSquare size={13} className="text-[#0A6ED1]" />
                      ) : (
                        <Square size={13} className="text-[#5F6B75]" />
                      )}
                    </button>
                  </th>
                  <th className="w-24">Date</th>
                  <th className="w-28">Txn No</th>
                  <th className="w-32">Project</th>
                  <th className="w-24">Worker ID</th>
                  <th>Worker Name</th>
                  <th className="w-28">Type</th>
                  <th className="text-right w-24">Debit (INR)</th>
                  <th className="text-right w-24">Credit (INR)</th>
                  <th className="text-right w-24">Balance (INR)</th>
                  <th className="w-24 text-center">Status</th>
                  <th>Remarks</th>
                  <th className="w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvances.map(a => {
                  const w = getWorkerInfo(a.workerId);
                  const amt = Number(a.amount) || 0;
                  const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
                  const adjAmt = (a.adjustedAmount !== undefined && a.adjustedAmount !== null)
                    ? Number(a.adjustedAmount)
                    : (isAdj ? amt : (Number(a.deductionAmount) || 0));
                  const outAmt = (a.outstandingAmount !== undefined && a.outstandingAmount !== null)
                    ? Number(a.outstandingAmount)
                    : (isAdj ? 0 : Math.max(0, amt - adjAmt));
                  const statusVal = a.status || (isAdj ? 'Adjusted' : 'Outstanding');
                  const isSelected = selectedRowIds.includes(a.id);

                  return (
                    <tr 
                      key={a.id} 
                      className={`cursor-pointer transition-colors ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleSelectRow(a.id)}
                    >
                      <td className="text-center px-1" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => toggleSelectRow(a.id)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare size={13} className="text-[#0A6ED1]" />
                          ) : (
                            <Square size={13} className="text-[#8C9BA8]" />
                          )}
                        </button>
                      </td>
                      <td className="font-mono">{a.date}</td>
                      <td className="font-mono font-bold text-[#0A6ED1]">
                        {a.transactionNo || `WFT/${a.id.slice(0, 6).toUpperCase()}`}
                      </td>
                      <td className="truncate max-w-[130px]" title={getProjectName(a.projectId)}>
                        {getProjectName(a.projectId)}
                      </td>
                      <td className="font-mono">{w.idNo}</td>
                      <td className="font-semibold text-[#2F3B45]">{w.name}</td>
                      <td>
                        <span className="font-medium text-[#2F3B45]">
                          {a.paymentType || 'Site Advance'}
                        </span>
                        {a.specifyOtherAdvance && (
                          <span className="text-[10px] text-[#5F6B75] block truncate">
                            ({a.specifyOtherAdvance})
                          </span>
                        )}
                      </td>
                      <td className="text-right font-mono font-bold text-[#BB0000]">
                        ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono text-[#188918]">
                        ₹{adjAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono font-bold text-[#E9730C]">
                        ₹{outAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-center">
                        <span className={`px-1.5 py-0.5 rounded-[1px] text-[10px] font-bold border ${
                          statusVal === 'Adjusted' 
                            ? 'bg-[#EBF7ED] text-[#188918] border-[#188918]/30' 
                            : 'bg-[#FFF8E6] text-[#E9730C] border-[#E9730C]/40'
                        }`}>
                          {statusVal}
                        </span>
                      </td>
                      <td className="truncate max-w-[140px]" title={a.remarks}>
                        {a.remarks || '-'}
                      </td>
                      <td className="text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setViewDetailsAdvance(a)}
                            className="p-1 hover:bg-[#D9EBF7] rounded-[1px] text-[#0A6ED1]"
                            title="View Details"
                          >
                            <Eye size={12} />
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleEdit(a)}
                              className="p-1 hover:bg-[#FFFDE7] rounded-[1px] text-[#E9730C]"
                              title="Edit Record"
                            >
                              <Edit size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAdvances.length === 0 && (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-[#5F6B75] italic">
                      No worker transactions found matching the specified parameters.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredAdvances.length > 0 && (
                <tfoot className="sticky bottom-0 bg-[#E7EEF3] font-bold border-t border-[#B8C3CC] text-[#2F3B45]">
                  <tr>
                    <td colSpan={7} className="px-2 py-1.5 text-right uppercase tracking-wider text-[11px]">
                      Totals:
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-[#BB0000] text-[12px]">
                      ₹{(summary.totalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-[#188918] text-[12px]">
                      ₹{(summary.totalAdjusted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-[#E9730C] text-[12px]">
                      ₹{(summary.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={3} className="px-2 py-1.5 text-[#5F6B75] text-[11px]">
                      Carry Forward: ₹{(summary.previouslyOverBalance || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: WORKER LEDGER AGGREGATE */}
      {activeSapTab === 'ledger' && (
        <div className="flex-1 bg-white border border-[#B8C3CC] rounded-[2px] shadow-2xs overflow-hidden flex flex-col">
          <div className="bg-[#E7EEF3] px-3 py-1.5 border-b border-[#B8C3CC] flex items-center justify-between text-[12px]">
            <span className="font-bold text-[#2F3B45] uppercase tracking-wide">
              Worker Account Ledger & Recovery Balances (Aggregated)
            </span>
            <span className="text-[11px] text-[#5F6B75]">
              {workerLedgerSummary.length} Active Accounts
            </span>
          </div>
          <div className="flex-1 overflow-auto max-h-[500px]">
            <table className="sap-dense-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-24">Worker ID</th>
                  <th>Worker Name</th>
                  <th className="w-32">Designation</th>
                  <th className="w-24 text-center">Txn Count</th>
                  <th className="text-right w-28">Total Advanced</th>
                  <th className="text-right w-28">Total Recovered</th>
                  <th className="text-right w-28">Net Balance Due</th>
                  <th className="w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {workerLedgerSummary.map(row => (
                  <tr key={row.worker.id}>
                    <td className="font-mono">{row.worker.workerId}</td>
                    <td className="font-bold text-[#2F3B45]">{row.worker.name}</td>
                    <td className="text-[#5F6B75]">{row.worker.designation || 'Worker'}</td>
                    <td className="text-center font-mono">{row.count}</td>
                    <td className="text-right font-mono font-bold text-[#BB0000]">
                      ₹{(Number(row.totalAdv) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-mono text-[#188918]">
                      ₹{(Number(row.totalAdj) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-mono font-bold text-[#E9730C]">
                      ₹{(Number(row.balance) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="text-center">
                      <span className={`px-1.5 py-0.5 rounded-[1px] text-[10px] font-bold border ${
                        row.balance === 0 ? 'bg-[#EBF7ED] text-[#188918] border-[#188918]/30' : 'bg-[#FFF8E6] text-[#E9730C] border-[#E9730C]/40'
                      }`}>
                        {row.balance === 0 ? 'Settled' : 'Has Balance'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: AUDIT TRAIL */}
      {activeSapTab === 'audit' && (
        <div className="flex-1 bg-white border border-[#B8C3CC] rounded-[2px] shadow-2xs overflow-hidden flex flex-col">
          <div className="bg-[#E7EEF3] px-3 py-1.5 border-b border-[#B8C3CC] flex items-center justify-between text-[12px]">
            <span className="font-bold text-[#2F3B45] uppercase tracking-wide">
              Transaction Audit Trail & Override Security Logs
            </span>
          </div>
          <div className="p-3 overflow-y-auto max-h-[500px] space-y-2 text-[12px]">
            {activityLogs.filter((l: any) => l.action?.toLowerCase().includes('advance') || l.details?.toLowerCase().includes('advance')).length === 0 ? (
              <div className="text-center py-8 text-[#5F6B75] italic">
                No recent security audit logs registered for Worker Financial Transactions.
              </div>
            ) : (
              activityLogs
                .filter((l: any) => l.action?.toLowerCase().includes('advance') || l.details?.toLowerCase().includes('advance'))
                .slice(0, 30)
                .map((log: any, idx: number) => (
                  <div key={idx} className="p-2 border border-[#B8C3CC] bg-[#F4F6F7] rounded-[2px] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#0A6ED1] mr-2">[{log.action}]</span>
                      <span className="text-[#2F3B45]">{log.details}</span>
                      <span className="text-[10px] text-[#5F6B75] block mt-0.5 font-mono">By: {log.user || 'System'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#5F6B75] shrink-0 ml-4">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '-'}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* 4. BOTTOM ACTION FOOTER (Classic SAP Right-Aligned Save / Cancel) */}
      {!isReadOnly && activeSapTab === 'entry' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#DCEAF5] border-t border-[#B8C3CC] px-4 py-2 flex items-center justify-between shadow-md print:hidden">
          <div className="text-[11px] text-[#5F6B75] flex items-center space-x-2">
            <span className="font-semibold text-[#2F3B45]">T-Code: WFT01</span>
            <span>|</span>
            <span>Status: Ready</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              className="sap-btn h-[28px] px-4 text-[12px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="sap-btn sap-btn-primary h-[28px] px-5 text-[12px] font-bold"
            >
              <Save size={13} />
              <span>{editingId ? 'Update Record' : 'Save'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. VIEW DETAILS MODAL */}
      {viewDetailsAdvance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#B8C3CC] w-full max-w-lg rounded-[2px] shadow-xl overflow-hidden text-[12px]">
            <div className="bg-[#B7D3E8] text-[#2F3B45] px-3.5 py-2 flex items-center justify-between border-b border-[#B8C3CC]">
              <span className="font-bold text-[13px]">
                WFT01 - Transaction Detail View
              </span>
              <button 
                type="button"
                onClick={() => setViewDetailsAdvance(null)}
                className="hover:bg-red-600 hover:text-white px-1.5 rounded-[1px] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 bg-[#FFFFFF]">
              {(() => {
                const a = viewDetailsAdvance;
                const w = getWorkerInfo(a.workerId);
                const amt = Number(a.amount) || 0;
                const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
                const adjAmt = (a.adjustedAmount !== undefined && a.adjustedAmount !== null)
                  ? Number(a.adjustedAmount)
                  : (isAdj ? amt : (Number(a.deductionAmount) || 0));
                const outAmt = (a.outstandingAmount !== undefined && a.outstandingAmount !== null)
                  ? Number(a.outstandingAmount)
                  : (isAdj ? 0 : Math.max(0, amt - adjAmt));
                const linkedPayment = a.adjustedInPaymentId ? workerPayments.find(p => p.id === a.adjustedInPaymentId) : null;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 bg-[#F4F6F7] p-2.5 border border-[#B8C3CC] rounded-[2px]">
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Txn No</span>
                        <span className="font-mono font-bold text-[#0A6ED1]">
                          {a.transactionNo || `WFT/${a.id.slice(0, 6).toUpperCase()}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Date</span>
                        <span className="font-mono">{a.date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Worker</span>
                        <span className="font-bold text-[#2F3B45]">{w.name} ({w.idNo})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Project</span>
                        <span>{getProjectName(a.projectId)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Type</span>
                        <span className="font-semibold">{a.paymentType || 'Site Advance'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Status</span>
                        <span className="font-bold">{a.status || 'Outstanding'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#E7EEF3] p-2 border border-[#B8C3CC] text-center rounded-[2px]">
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Amount</span>
                        <span className="font-mono font-bold text-[#BB0000]">₹{amt.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Recovered</span>
                        <span className="font-mono font-bold text-[#188918]">₹{adjAmt.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F6B75] uppercase font-bold block">Outstanding</span>
                        <span className="font-mono font-bold text-[#E9730C]">₹{outAmt.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {linkedPayment && (
                      <div className="p-2 bg-[#EBF7ED] border border-[#188918]/30 rounded-[2px] text-[11px]">
                        <span className="font-bold text-[#188918] block">Settled in Worker Payment:</span>
                        <span>Month: {linkedPayment.month} | Date: {linkedPayment.date}</span>
                      </div>
                    )}

                    <div className="text-[11px] text-[#5F6B75] space-y-0.5 border-t border-[#B8C3CC] pt-2">
                      <div>Disbursed By: <strong>{a.paidBy || 'Saddam Hussain'}</strong></div>
                      <div>Remarks: {a.remarks || '-'}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-[#E7EEF3] px-3 py-1.5 border-t border-[#B8C3CC] flex justify-end">
              <button
                type="button"
                onClick={() => setViewDetailsAdvance(null)}
                className="sap-btn px-4 py-0.5 text-[11px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Worker Financial Transaction"
        message="Are you sure you want to delete this record? This action will reverse all linked ledger records."
        onConfirm={() => {
          if (deleteId) {
            deleteAdvance(deleteId);
            setDeleteId(null);
            setSelectedRowIds([]);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['projectId', 'workerId', 'date', 'amount', 'paymentType', 'remarks', 'paidBy']}
        entityName="Worker Financial Transaction"
        projectsContext={projects}
        workersContext={workers}
        onUpload={async (data) => {
          for (const item of data) {
            const pId = item.projectId || filterProject || (projects[0]?.id || '');
            if (!pId || !item.workerId) continue;
            await addAdvance({
              projectId: pId,
              workerId: item.workerId,
              date: item.date || new Date().toISOString().split('T')[0],
              amount: Number(item.amount) || 0,
              paymentType: (item.paymentType || 'Site Advance') as any,
              paidBy: item.paidBy || 'Company Account',
              remarks: item.remarks || '',
              status: 'Outstanding',
              outstandingAmount: Number(item.amount) || 0,
              adjustedAmount: 0
            });
          }
        }}
      />

      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        isOpen={dupModalOpen}
        moduleName="Worker Financial Transaction"
        warningText="A transaction with the identical Worker, Date, and Amount was found. Proceed?"
        duplicates={dupData}
        currentUser={user ? { username: user.username, name: user.username } : null}
        onCancel={() => {
          setDupModalOpen(false);
          setPendingSaveFn(null);
        }}
        onSaveAnyway={(reason) => {
          setDupModalOpen(false);
          if (pendingSaveFn) {
            pendingSaveFn(reason);
            setPendingSaveFn(null);
          }
        }}
        onViewExisting={(record) => {
          setDupModalOpen(false);
          handleEdit(record);
        }}
      />
    </div>
  );
};
