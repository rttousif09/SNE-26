import React, { useState, useMemo } from 'react';
import type { Advance as AdvanceType } from '../types';
import { SAPSelect } from '../components/SAPSelect';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { 
  Save, Edit, X, Trash2, FileSpreadsheet, Eye, Filter, Calendar, 
  DollarSign, CheckCircle2, Clock, AlertCircle, ArrowUpRight, ArrowDownRight,
  User, Building2, Tag, RefreshCw
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { checkWorkerAdvanceDuplicate, addOverrideLog } from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { PDFExportButton } from '../components/PDFExportButton';
import * as XLSX from 'xlsx';

export const Advance: React.FC = () => {
  const { 
    user, advances, projects, workers, addAdvance, updateAdvance, deleteAdvance, 
    advanceSheetApprovals, addAdvanceSheetApproval, workerPayments 
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
  const [showCompleted, setShowCompleted] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDetailsAdvance, setViewDetailsAdvance] = useState<any | null>(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Duplicate verification states
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupData, setDupData] = useState<any[]>([]);
  const [pendingSaveFn, setPendingSaveFn] = useState<((overrideReason?: string) => void) | null>(null);

  // Sheet Approval State
  const [sheetMonth, setSheetMonth] = useState('');
  const [sheetRemarks, setSheetRemarks] = useState('');

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Available Workers for the selected Project in the Entry Form
  const formProjectWorkers = useMemo(() => {
    if (!formData.projectId) return [];
    return workers.filter(w => w.projectId === formData.projectId);
  }, [formData.projectId, workers]);

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      alert("Please select a project.");
      return;
    }
    if (!formData.workerId) {
      alert("Please select a worker.");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert("Please enter a valid advance amount.");
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

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [advances, filterProject, filterWorker, filterStartDate, filterEndDate, filterPaymentType, filterStatus, searchQuery, workers]);

  // Register Summary Calculations
  const summary = useMemo(() => {
    let totalAdv = 0;
    let totalAdj = 0;
    let totalOut = 0;
    let totalOverBal = 0;

    filteredAdvances.forEach(a => {
      const amt = Number(a.amount) || 0;
      totalAdv += amt;

      const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
      const adjAmt = a.adjustedAmount !== undefined ? Number(a.adjustedAmount) : (isAdj ? amt : (Number(a.deductionAmount) || 0));
      totalAdj += adjAmt;

      const outAmt = a.outstandingAmount !== undefined ? Number(a.outstandingAmount) : (isAdj ? 0 : Math.max(0, amt - adjAmt));
      totalOut += outAmt;

      if (a.paymentType === 'Previously Over Balance') {
        totalOverBal += amt;
      }
    });

    return {
      totalAdvance: totalAdv,
      totalAdjusted: totalAdj,
      totalOutstanding: totalOut,
      previouslyOverBalance: totalOverBal
    };
  }, [filteredAdvances]);

  const getWorkerInfo = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker 
      ? { name: worker.name, idNo: worker.workerId, serialNo: worker.serialNo, designation: worker.designation || 'Worker' }
      : { name: 'Unknown', idNo: '-', serialNo: '-', designation: '-' };
  };

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || 'Unknown Project';
  };

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

    // Summary Row
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
    XLSX.utils.book_append_sheet(wb, ws, "Advance Register");
    XLSX.writeFile(wb, `Advance_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="text-[11px] space-y-4">
      {/* 1. TOP TITLE & PROJECT STATUS BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#8c9ba8] pb-2">
        <div>
          <h1 className="text-base font-bold text-[#0056b3] flex items-center space-x-2">
            <span>Worker Advance Management & Register</span>
          </h1>
          <p className="text-[10px] text-gray-500">
            Record employee advances, track outstanding balances across months, and synchronize directly with Worker Payment & Ledger.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isReadOnly && (
            <button 
              onClick={() => setIsExcelImportOpen(true)}
              className="sap-btn flex items-center space-x-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
            >
              <FileSpreadsheet size={12} className="text-green-600" />
              <span>Import Excel</span>
            </button>
          )}
          <button
            onClick={exportRegisterToExcel}
            className="sap-btn flex items-center space-x-1 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
          >
            <FileSpreadsheet size={12} className="text-emerald-700" />
            <span>Export Register Excel</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sap-panel p-3 border-l-4 border-l-[#0056b3] bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Advance</span>
            <DollarSign size={14} className="text-[#0056b3]" />
          </div>
          <div className="text-base font-bold font-mono text-gray-900 mt-1">
            ₹{(summary.totalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-400">Total advances disbursed</span>
        </div>

        <div className="sap-panel p-3 border-l-4 border-l-green-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Adjusted</span>
            <CheckCircle2 size={14} className="text-green-600" />
          </div>
          <div className="text-base font-bold font-mono text-green-700 mt-1">
            ₹{(summary.totalAdjusted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-400">Recovered via payments</span>
        </div>

        <div className="sap-panel p-3 border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Outstanding</span>
            <Clock size={14} className="text-amber-600" />
          </div>
          <div className="text-base font-bold font-mono text-amber-700 mt-1">
            ₹{(summary.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-400">Awaiting deduction</span>
        </div>

        <div className="sap-panel p-3 border-l-4 border-l-purple-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Previously Over Balance</span>
            <RefreshCw size={14} className="text-purple-600" />
          </div>
          <div className="text-base font-bold font-mono text-purple-700 mt-1">
            ₹{(summary.previouslyOverBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-400">Carry-forward balances</span>
        </div>
      </div>

      {/* 3. WORKER ADVANCE ENTRY FORM */}
      {!isReadOnly && (
        <div className="sap-panel p-3 bg-white border border-[#8c9ba8]">
          <div className="flex items-center justify-between border-b border-[#8c9ba8] pb-1.5 mb-3">
            <div className="font-bold text-xs text-[#0056b3] flex items-center space-x-1.5">
              <span>{editingId ? 'Edit Worker Advance' : 'Worker Advance Entry'}</span>
              <span className="text-[9px] text-gray-500 font-normal">
                (Project → Date → Worker → Amount → Payment Type → Remarks → Save)
              </span>
            </div>
            {editingId && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                Editing Mode Active
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Transaction No Preview */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Transaction No.:
                </label>
                <input 
                  type="text" 
                  readOnly 
                  className="sap-input bg-gray-100 font-mono text-gray-600 cursor-not-allowed" 
                  value={editingId ? (advances.find(a => a.id === editingId)?.transactionNo || `ADV-${editingId.slice(0, 6).toUpperCase()}`) : 'Auto-generated on Save'}
                />
              </div>

              {/* Project Dropdown */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Project <span className="text-red-500">*</span>:
                </label>
                <SAPSelect
                  required
                  className="sap-input"
                  value={formData.projectId}
                  onChange={e => {
                    const newProj = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      projectId: newProj,
                      workerId: '' // reset worker when project changes
                    }));
                  }}
                >
                  <option value="">-- Select Project --</option>
                  {projects.filter(p => showCompleted ? true : (!p.status || p.status === 'Ongoing')).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </SAPSelect>
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>:
                </label>
                <input 
                  required
                  type="date"
                  className="sap-input"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {/* Worker Dropdown (filtered by selected project) */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Worker <span className="text-red-500">*</span>:
                </label>
                <SAPSelect
                  required
                  className="sap-input"
                  value={formData.workerId}
                  onChange={e => setFormData({ ...formData, workerId: e.target.value })}
                  disabled={!formData.projectId}
                >
                  <option value="">
                    {!formData.projectId ? '-- First select project --' : '-- Select Worker --'}
                  </option>
                  {formProjectWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.workerId})
                    </option>
                  ))}
                </SAPSelect>
              </div>

              {/* Amount */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>:
                </label>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-gray-500">₹</span>
                  <input 
                    required
                    type="number"
                    step="any"
                    placeholder="Enter advance amount"
                    className="sap-input font-bold text-red-650 flex-1"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Payment Type Dropdown */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Payment Type <span className="text-red-500">*</span>:
                </label>
                <SAPSelect
                  required
                  className="sap-input font-semibold"
                  value={formData.paymentType}
                  onChange={e => setFormData({ ...formData, paymentType: e.target.value })}
                >
                  <option value="Site Advance">Site Advance</option>
                  <option value="Payment">Payment</option>
                  <option value="Travel Advance">Travel Advance</option>
                  <option value="Other Advance">Other Advance</option>
                  {editingId && formData.paymentType === 'Previously Over Balance' && (
                    <option value="Previously Over Balance">Previously Over Balance</option>
                  )}
                </SAPSelect>
              </div>

              {/* If Other Advance: Specify Other Advance */}
              {formData.paymentType === 'Other Advance' && (
                <div className="flex flex-col col-span-1 sm:col-span-2">
                  <label className="font-semibold text-amber-800 mb-1">
                    Specify Other Advance <span className="text-red-500">*</span>:
                  </label>
                  <input 
                    required
                    type="text"
                    placeholder="Provide specific reason (e.g. medical, emergency, family)"
                    className="sap-input border-amber-400 bg-amber-50/40"
                    value={formData.specifyOtherAdvance}
                    onChange={e => setFormData({ ...formData, specifyOtherAdvance: e.target.value })}
                  />
                </div>
              )}

              {/* Status (Outstanding / Adjusted) */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Status:
                </label>
                <SAPSelect
                  className="sap-input"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="Outstanding">Outstanding</option>
                  <option value="Adjusted">Adjusted</option>
                </SAPSelect>
              </div>

              {/* Paid By */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">
                  Disbursed By:
                </label>
                <SAPSelect
                  className="sap-input"
                  value={formData.paidBy}
                  onChange={e => setFormData({ ...formData, paidBy: e.target.value })}
                >
                  <option value="Saddam Hussain">Saddam Hussain</option>
                  <option value="Tousif Reja">Tousif Reja</option>
                  <option value="Other">Other</option>
                </SAPSelect>
              </div>

              {formData.paidBy === 'Other' && (
                <div className="flex flex-col">
                  <label className="font-semibold text-gray-700 mb-1">Specify Disbursed By:</label>
                  <input 
                    type="text"
                    className="sap-input"
                    placeholder="Enter supervisor name"
                    value={formData.paidByDetails}
                    onChange={e => setFormData({ ...formData, paidByDetails: e.target.value })}
                  />
                </div>
              )}

              {/* Receipt File */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">Receipt / Voucher Proof:</label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="text-xs" 
                  onChange={handleFileUpload} 
                />
                {formData.receiptFileName && (
                  <span className="text-[10px] text-green-700 font-semibold truncate mt-0.5">
                    Attached: {formData.receiptFileName}
                  </span>
                )}
              </div>

              {/* Remarks */}
              <div className="flex flex-col col-span-1 sm:col-span-2 lg:col-span-3">
                <label className="font-semibold text-gray-700 mb-1">Remarks (Optional):</label>
                <input 
                  type="text"
                  placeholder="Enter remarks or voucher details"
                  className="sap-input"
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end items-center space-x-2 pt-2 border-t border-gray-200">
              <button type="submit" className="sap-btn flex items-center space-x-1 bg-[#0056b3] text-white hover:bg-blue-700 px-4 py-1.5">
                <Save size={12} className="text-white" />
                <span>{editingId ? 'Update Advance' : 'Save Advance'}</span>
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1 px-3 py-1.5">
                  <X size={12} className="text-red-600" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 4. ADVANCE REGISTER TABLE & FILTERS */}
      <div className="sap-panel p-3 bg-white border border-[#8c9ba8] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#8c9ba8] pb-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs text-[#0056b3] uppercase tracking-wider">
              Advance Register Table
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              {filteredAdvances.length} Records
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <PDFExportButton
              title="Worker Advance Register Report"
              subtitle={`Filtered advances as on ${new Date().toLocaleDateString('en-IN')}`}
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
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-[#f8fafc] p-2.5 rounded border border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Project Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 mb-0.5">Filter Project:</label>
            <SAPSelect
              className="sap-input text-[11px]"
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
            </SAPSelect>
          </div>

          {/* Worker Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 mb-0.5">Filter Worker:</label>
            <SAPSelect
              className="sap-input text-[11px]"
              value={filterWorker}
              onChange={e => setFilterWorker(e.target.value)}
            >
              <option value="">All Workers</option>
              {filterProjectWorkers.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>
              ))}
            </SAPSelect>
          </div>

          {/* From Date */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 mb-0.5">From Date:</label>
            <input 
              type="date"
              className="sap-input text-[11px]"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 mb-0.5">To Date:</label>
            <input 
              type="date"
              className="sap-input text-[11px]"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
            />
          </div>

          {/* Payment Type */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 mb-0.5">Payment Type:</label>
            <SAPSelect
              className="sap-input text-[11px]"
              value={filterPaymentType}
              onChange={e => setFilterPaymentType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Site Advance">Site Advance</option>
              <option value="Payment">Payment</option>
              <option value="Travel Advance">Travel Advance</option>
              <option value="Other Advance">Other Advance</option>
              <option value="Previously Over Balance">Previously Over Balance</option>
            </SAPSelect>
          </div>

          {/* Outstanding / Adjusted */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 mb-0.5">Status:</label>
            <SAPSelect
              className="sap-input text-[11px]"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Outstanding">Outstanding</option>
              <option value="Adjusted">Adjusted</option>
            </SAPSelect>
          </div>

          {/* Search box & reset */}
          <div className="flex flex-col col-span-1 sm:col-span-2 lg:col-span-4">
            <label className="text-[10px] font-bold text-gray-600 mb-0.5">Search:</label>
            <input 
              type="text"
              placeholder="Search by Txn No, Worker Name, ID, Remarks..."
              className="sap-input text-[11px]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-end space-x-2 col-span-1 sm:col-span-2">
            <button
              type="button"
              onClick={() => {
                setFilterProject('');
                setFilterWorker('');
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterPaymentType('All');
                setFilterStatus('All');
                setSearchQuery('');
              }}
              className="sap-btn w-full py-1 text-gray-600 hover:text-black font-semibold text-[10px]"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* 5. TABLE: Date | Transaction No | Project | Worker ID | Worker Name | Payment Type | Details | Amount | Adjusted Amount | Outstanding Amount | Status | Remarks | Actions */}
        <div className="overflow-x-auto border border-[#8c9ba8] rounded-xs shadow-xs">
          <table className="w-full border-collapse bg-white text-[11px]">
            <thead className="bg-[#eef2f6] text-slate-800 font-bold border-b border-[#8c9ba8]">
              <tr>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left w-24">Date</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left w-28">Txn No</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left w-36">Project</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left w-20">Worker ID</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left">Worker Name</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left w-28">Payment Type</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left max-w-xs">Details</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-right w-24">Amount</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-right w-24">Adjusted</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-right w-24">Outstanding</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-center w-24">Status</th>
                <th className="border-r border-[#8c9ba8] px-2 py-1.5 text-left">Remarks</th>
                <th className="px-2 py-1.5 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
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
                const isOverBalance = a.paymentType === 'Previously Over Balance';

                return (
                  <tr key={a.id} className={`hover:bg-blue-50/40 transition-colors ${isOverBalance ? 'bg-purple-50/30' : ''}`}>
                    <td className="border-r border-gray-200 px-2 py-1.5 font-mono text-gray-700 whitespace-nowrap">
                      {a.date}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 font-mono font-bold text-[#0056b3] whitespace-nowrap">
                      {a.transactionNo || `ADV-${a.id.slice(0, 6).toUpperCase()}`}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 font-medium text-gray-800 truncate max-w-[140px]" title={getProjectName(a.projectId)}>
                      {getProjectName(a.projectId)}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 font-mono text-gray-600 whitespace-nowrap">
                      {w.idNo}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 font-bold text-gray-900 whitespace-nowrap">
                      {w.name}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        a.paymentType === 'Travel Advance' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                        a.paymentType === 'Payment' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        a.paymentType === 'Other Advance' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        a.paymentType === 'Previously Over Balance' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        'bg-teal-50 text-teal-800 border-teal-200'
                      }`}>
                        {a.paymentType || 'Site Advance'}
                      </span>
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-gray-600 truncate max-w-[150px]" title={a.specifyOtherAdvance || a.remarks || '-'}>
                      {a.specifyOtherAdvance ? a.specifyOtherAdvance : (isOverBalance ? 'Carry Forward Over Balance' : '-')}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-right font-mono font-bold text-red-650">
                      ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-right font-mono font-medium text-green-700">
                      ₹{adjAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-right font-mono font-bold text-amber-700">
                      ₹{outAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        statusVal === 'Adjusted' 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {statusVal}
                      </span>
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-gray-600 truncate max-w-[160px]" title={a.remarks}>
                      {a.remarks || '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setViewDetailsAdvance(a)}
                          className="text-[#0056b3] hover:text-blue-800 p-1"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {!isReadOnly && !isOverBalance && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(a)}
                              className="text-amber-600 hover:text-amber-800 p-1"
                              title="Edit Advance"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(a.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete Advance"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAdvances.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-gray-400 italic">
                    No worker advances found matching the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredAdvances.length > 0 && (
              <tfoot className="bg-[#f1f5f9] font-bold border-t-2 border-[#8c9ba8] text-gray-800">
                <tr>
                  <td colSpan={7} className="px-2 py-2 text-right uppercase tracking-wider text-[10px]">
                    Register Totals:
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-red-700 text-xs">
                    ₹{(summary.totalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-green-700 text-xs">
                    ₹{(summary.totalAdjusted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-amber-800 text-xs">
                    ₹{(summary.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="px-2 py-2 text-gray-500 text-[10px] font-normal">
                    Previously Over Balance: ₹{(summary.previouslyOverBalance || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 6. ADVANCE VIEW DETAILS MODAL */}
      <AnimatePresence>
        {viewDetailsAdvance && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="sap-panel bg-white border-2 border-[#8c9ba8] w-full max-w-xl rounded shadow-2xl overflow-hidden text-[11px]"
            >
              <div className="bg-[#0056b3] text-white px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye size={14} className="text-blue-200" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Advance Transaction Details
                  </span>
                </div>
                <button 
                  onClick={() => setViewDetailsAdvance(null)}
                  className="text-white hover:text-gray-300 font-bold text-base leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 space-y-3">
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
                      <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Transaction No</span>
                          <span className="font-mono font-bold text-blue-900 text-xs">
                            {a.transactionNo || `ADV-${a.id.slice(0, 6).toUpperCase()}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Status</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${
                            (a.status || 'Outstanding') === 'Adjusted' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            {a.status || 'Outstanding'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Worker</span>
                          <span className="font-bold text-gray-800">{w.name}</span>
                          <span className="text-gray-500 font-mono text-[10px] block">ID: {w.idNo} ({w.designation})</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Project</span>
                          <span className="font-semibold text-gray-800">{getProjectName(a.projectId)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Date</span>
                          <span className="font-mono font-medium text-gray-800">{a.date}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Payment Type</span>
                          <span className="font-bold text-[#0056b3]">{a.paymentType || 'Site Advance'}</span>
                          {a.specifyOtherAdvance && (
                            <span className="block text-[10px] text-amber-800 italic">"{a.specifyOtherAdvance}"</span>
                          )}
                        </div>
                      </div>

                      {/* Amounts Breakdown */}
                      <div className="grid grid-cols-3 gap-2 bg-blue-50/50 p-2.5 rounded border border-blue-200 text-center">
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase font-bold">Total Amount</span>
                          <span className="font-mono font-bold text-red-650 text-xs">₹{amt.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase font-bold">Adjusted Amount</span>
                          <span className="font-mono font-bold text-green-700 text-xs">₹{adjAmt.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase font-bold">Outstanding</span>
                          <span className="font-mono font-bold text-amber-700 text-xs">₹{outAmt.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Linked Payment Details (if adjusted) */}
                      {a.adjustedInPaymentId && (
                        <div className="bg-green-50 p-2.5 rounded border border-green-200">
                          <span className="font-bold text-green-800 block text-[10px] uppercase">
                            Adjusted in Worker Payment:
                          </span>
                          <span className="text-gray-700 text-[10px]">
                            Payment Month: <strong>{linkedPayment?.month || 'Recorded'}</strong> | Date: <strong>{linkedPayment?.date || '-'}</strong> | Payment ID: <span className="font-mono">{a.adjustedInPaymentId}</span>
                          </span>
                        </div>
                      )}

                      {/* Metadata Audit Info */}
                      <div className="text-[10px] text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded border border-gray-200">
                        <div>Disbursed By: <strong>{a.paidBy || 'Saddam Hussain'} {a.paidByDetails ? `(${a.paidByDetails})` : ''}</strong></div>
                        <div>Created By: <strong>{a.createdBy || 'Admin'}</strong> on {a.createdDate ? new Date(a.createdDate).toLocaleString('en-IN') : '-'}</div>
                        {a.modifiedBy && (
                          <div>Last Modified By: <strong>{a.modifiedBy}</strong> on {a.modifiedDate ? new Date(a.modifiedDate).toLocaleString('en-IN') : '-'}</div>
                        )}
                        <div>Remarks: <em>{a.remarks || 'No remarks provided'}</em></div>
                      </div>

                      {/* Receipt Preview */}
                      {a.receiptProof && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="font-bold text-gray-700 block mb-1">Attached Receipt:</span>
                          <a 
                            href={a.receiptProof} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-[#0056b3] hover:underline font-bold text-[10px]"
                          >
                            <span>Open Attachment ({a.receiptFileName || 'Document'})</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-gray-100 px-4 py-2 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewDetailsAdvance(null)}
                  className="sap-btn px-4 py-1 font-bold text-[11px]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Worker Advance"
        message="Are you sure you want to delete this advance record? This will also automatically reverse and remove the corresponding Worker Ledger entry according to audit rules."
        onConfirm={() => {
          if (deleteId) {
            deleteAdvance(deleteId);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['projectId', 'workerId', 'date', 'amount', 'paymentType', 'remarks', 'paidBy']}
        entityName="Worker Advance"
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

      {/* Duplicate Verification Modal */}
      <DuplicateWarningModal
        isOpen={dupModalOpen}
        moduleName="Worker Advance"
        warningText="An advance with the same Worker, Date, and Amount was detected. Would you like to proceed anyway?"
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
