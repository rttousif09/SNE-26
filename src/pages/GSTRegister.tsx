import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Eye,
  Trash2,
  Edit,
  History,
  ShieldCheck,
  Building,
  ArrowRight,
  Upload,
  X,
  ChevronDown,
  Download,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { SAPSelect } from '../components/SAPSelect';
import { PDFExportButton } from '../components/PDFExportButton';
import { exportToExcelEnterprise } from '../lib/exportEngine';

export interface GSTPayment {
  id: string;
  gstLiabilityId: string;
  paymentAmount: number;
  paymentDate: string;
  paidBy: 'SN ENTERPRISE' | 'Client';
  paymentMode: string;
  challanNumber?: string;
  referenceNumber?: string;
  remarks?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdBy?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GSTAuditTrail {
  id: string;
  gstLiabilityId: string;
  gstPaymentId?: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  user: string;
  timestamp: string;
  remarks?: string;
}

export interface GSTLiability {
  id: string;
  billingId?: string;
  projectId: string;
  projectName?: string;
  clientName?: string;
  billNo?: string;
  period: string;
  financialYear: string;
  taxableAmount: number;
  gstAmount: number;
  gstPaid: number;
  gstBalance: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  filingStatus: 'Not Filed' | 'Filed';
  returnType: 'GSTR-1' | 'GSTR-3B';
  dueDate?: string;
  filingDate?: string;
  filingArn?: string;
  filingChallanDoc?: string;
  notes?: string;
  payments?: GSTPayment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GSTSummary {
  totalLiability: number;
  totalPaid: number;
  totalOutstanding: number;
  unpaidCount: number;
  unpaidAmount: number;
  partiallyPaidCount: number;
  partiallyPaidAmount: number;
  paidCount: number;
  paidAmount: number;
  dueThisMonth: number;
  totalRecords: number;
}

interface GSTRegisterProps {
  initialProjectId?: string;
  embedded?: boolean;
}

export const GSTRegister: React.FC<GSTRegisterProps> = ({ initialProjectId, embedded = false }) => {
  const { projects = [], billings = [] } = useAppContext();

  // Data states
  const [liabilities, setLiabilities] = useState<GSTLiability[]>([]);
  const [summary, setSummary] = useState<GSTSummary>({
    totalLiability: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
    partiallyPaidCount: 0,
    partiallyPaidAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    dueThisMonth: 0,
    totalRecords: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedFy, setSelectedFy] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId || 'all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedFilingStatus, setSelectedFilingStatus] = useState<string>('all');
  const [selectedPaidBy, setSelectedPaidBy] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals & Drawers
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [filingModalOpen, setFilingModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [createLiabModalOpen, setCreateLiabModalOpen] = useState(false);

  // Selected item for modals
  const [activeLiability, setActiveLiability] = useState<GSTLiability | null>(null);
  const [activeAuditTrails, setActiveAuditTrails] = useState<GSTAuditTrail[]>([]);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [paidBy, setPaidBy] = useState<'SN ENTERPRISE' | 'Client'>('SN ENTERPRISE');
  const [paymentMode, setPaymentMode] = useState<string>('Net Banking');
  const [challanNumber, setChallanNumber] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Filing Form State
  const [filingReturnType, setFilingReturnType] = useState<'GSTR-1' | 'GSTR-3B'>('GSTR-3B');
  const [filingStatus, setFilingStatus] = useState<'Not Filed' | 'Filed'>('Filed');
  const [filingDate, setFilingDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [filingArn, setFilingArn] = useState<string>('');
  const [filingChallanDoc, setFilingChallanDoc] = useState<string>('');
  const [filingNotes, setFilingNotes] = useState<string>('');
  const [savingFiling, setSavingFiling] = useState(false);

  // Manual Liability Form State
  const [newLiabProjectId, setNewLiabProjectId] = useState<string>(projects[0]?.id || '');
  const [newLiabClient, setNewLiabClient] = useState<string>('');
  const [newLiabBillNo, setNewLiabBillNo] = useState<string>('');
  const [newLiabPeriod, setNewLiabPeriod] = useState<string>(new Date().toISOString().substring(0, 7));
  const [newLiabTaxable, setNewLiabTaxable] = useState<string>('');
  const [newLiabGst, setNewLiabGst] = useState<string>('');
  const [newLiabDueDate, setNewLiabDueDate] = useState<string>('');
  const [newLiabNotes, setNewLiabNotes] = useState<string>('');
  const [savingLiab, setSavingLiab] = useState(false);

  // Attachment Preview Modal
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string } | null>(null);

  // Fetch liabilities and summary
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [liabRes, sumRes] = await Promise.all([
        fetch('/api/gst-liabilities').then(r => r.json()),
        fetch('/api/gst-summary').then(r => r.json())
      ]);
      setLiabilities(Array.isArray(liabRes) ? liabRes : []);
      if (sumRes && !sumRes.error) {
        setSummary(sumRes);
      }
    } catch (err: any) {
      console.error('Failed to load GST data:', err);
      setError('Unable to load GST records. Please verify server connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync initialProjectId if passed
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProject(initialProjectId);
    }
  }, [initialProjectId]);

  // Unique financial years and periods from liabilities
  const financialYears = useMemo(() => {
    const list = Array.from(new Set(liabilities.map(l => l.financialYear).filter(Boolean)));
    if (!list.includes('2025-2026')) list.push('2025-2026');
    if (!list.includes('2026-2027')) list.push('2026-2027');
    return list.sort().reverse();
  }, [liabilities]);

  const periods = useMemo(() => {
    const list = Array.from(new Set(liabilities.map(l => l.period).filter(Boolean)));
    return list.sort().reverse();
  }, [liabilities]);

  const clients = useMemo(() => {
    const list = Array.from(new Set(liabilities.map(l => l.clientName).filter(Boolean))) as string[];
    return list.sort();
  }, [liabilities]);

  // Filtered Liabilities
  const filteredLiabilities = useMemo(() => {
    return liabilities.filter(item => {
      if (selectedFy !== 'all' && item.financialYear !== selectedFy) return false;
      if (selectedPeriod !== 'all' && item.period !== selectedPeriod) return false;
      if (selectedProject !== 'all' && item.projectId !== selectedProject) return false;
      if (selectedClient !== 'all' && item.clientName !== selectedClient) return false;
      if (selectedPaymentStatus !== 'all' && item.paymentStatus !== selectedPaymentStatus) return false;
      if (selectedFilingStatus !== 'all' && item.filingStatus !== selectedFilingStatus) return false;

      // Paid By filter
      if (selectedPaidBy !== 'all') {
        const hasPaidBy = (item.payments || []).some(p => p.paidBy === selectedPaidBy);
        if (!hasPaidBy) return false;
      }

      // Date Range Filter (against due date or created date)
      if (fromDate) {
        const itemDate = item.dueDate || item.createdAt?.substring(0, 10) || '';
        if (itemDate < fromDate) return false;
      }
      if (toDate) {
        const itemDate = item.dueDate || item.createdAt?.substring(0, 10) || '';
        if (itemDate > toDate) return false;
      }

      // Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchBill = item.billNo?.toLowerCase().includes(term);
        const matchProj = item.projectName?.toLowerCase().includes(term);
        const matchClient = item.clientName?.toLowerCase().includes(term);
        const matchNotes = item.notes?.toLowerCase().includes(term);
        const matchChallan = (item.payments || []).some(
          p => p.challanNumber?.toLowerCase().includes(term) || p.referenceNumber?.toLowerCase().includes(term)
        );
        if (!matchBill && !matchProj && !matchClient && !matchNotes && !matchChallan) {
          return false;
        }
      }

      return true;
    });
  }, [
    liabilities,
    selectedFy,
    selectedPeriod,
    selectedProject,
    selectedClient,
    selectedPaymentStatus,
    selectedFilingStatus,
    selectedPaidBy,
    fromDate,
    toDate,
    searchTerm
  ]);

  // Calculated displayed totals based on filtered records
  const displayedTotals = useMemo(() => {
    return filteredLiabilities.reduce(
      (acc, item) => {
        acc.taxable += item.taxableAmount || 0;
        acc.liability += item.gstAmount || 0;
        acc.paid += item.gstPaid || 0;
        acc.balance += item.gstBalance || 0;
        return acc;
      },
      { taxable: 0, liability: 0, paid: 0, balance: 0 }
    );
  }, [filteredLiabilities]);

  // Handlers for Opening Modals
  const openPaymentModal = (liability: GSTLiability) => {
    setActiveLiability(liability);
    setPaymentAmount(liability.gstBalance > 0 ? liability.gstBalance.toString() : '');
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setPaidBy('SN ENTERPRISE');
    setPaymentMode('Net Banking');
    setChallanNumber('');
    setReferenceNumber('');
    setRemarks('');
    setAttachmentUrl('');
    setAttachmentName('');
    setPaymentModalOpen(true);
  };

  const openHistoryModal = async (liability: GSTLiability) => {
    setActiveLiability(liability);
    setHistoryModalOpen(true);
    // Refresh single record to ensure latest payment history
    try {
      const res = await fetch(`/api/gst-liabilities/${liability.id}`).then(r => r.json());
      if (res && !res.error) {
        setActiveLiability(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openFilingModal = (liability: GSTLiability) => {
    setActiveLiability(liability);
    setFilingReturnType(liability.returnType || 'GSTR-3B');
    setFilingStatus(liability.filingStatus || 'Filed');
    setFilingDate(liability.filingDate || new Date().toISOString().substring(0, 10));
    setFilingArn(liability.filingArn || '');
    setFilingChallanDoc(liability.filingChallanDoc || '');
    setFilingNotes('');
    setFilingModalOpen(true);
  };

  const openDetailModal = async (liability: GSTLiability) => {
    setActiveLiability(liability);
    setDetailModalOpen(true);
    try {
      const res = await fetch(`/api/gst-liabilities/${liability.id}`).then(r => r.json());
      if (res && !res.error) {
        setActiveLiability(res);
        setActiveAuditTrails(res.auditTrails || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openAuditModal = async (liability: GSTLiability) => {
    setActiveLiability(liability);
    setAuditModalOpen(true);
    try {
      const res = await fetch(`/api/gst-audit-trails?gstLiabilityId=${liability.id}`).then(r => r.json());
      setActiveAuditTrails(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Recording Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLiability) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await fetch('/api/gst-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gstLiabilityId: activeLiability.id,
          paymentAmount: amt,
          paymentDate,
          paidBy,
          paymentMode,
          challanNumber: challanNumber.trim() || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          remarks: remarks.trim() || undefined,
          attachmentUrl: attachmentUrl || undefined,
          attachmentName: attachmentName || undefined,
          createdBy: 'Admin'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record GST payment');

      setPaymentModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  // Handle Updating Filing Status
  const handleSaveFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLiability) return;

    setSavingFiling(true);
    try {
      const res = await fetch(`/api/gst-liabilities/${activeLiability.id}/filing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filingStatus,
          returnType: filingReturnType,
          filingDate,
          filingArn: filingArn.trim() || undefined,
          filingChallanDoc: filingChallanDoc || undefined,
          notes: filingNotes.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update filing status');

      setFilingModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Error updating filing: ' + err.message);
    } finally {
      setSavingFiling(false);
    }
  };

  // Handle Creating Manual GST Liability
  const handleSaveLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    const gstVal = parseFloat(newLiabGst);
    if (isNaN(gstVal) || gstVal <= 0) {
      alert('Please enter a valid GST amount greater than 0.');
      return;
    }

    setSavingLiab(true);
    try {
      const proj = projects.find(p => p.id === newLiabProjectId);
      const res = await fetch('/api/gst-liabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: newLiabProjectId,
          clientName: newLiabClient || proj?.clientName || 'Client',
          billNo: newLiabBillNo.trim() || 'MANUAL-GST',
          period: newLiabPeriod,
          taxableAmount: parseFloat(newLiabTaxable || '0'),
          gstAmount: gstVal,
          dueDate: newLiabDueDate || undefined,
          notes: newLiabNotes.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create GST liability');

      setCreateLiabModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Error creating liability: ' + err.message);
    } finally {
      setSavingLiab(false);
    }
  };

  // Handle Cancelling a Payment
  const handleCancelPayment = async (paymentId: string) => {
    const reason = prompt('Please enter the reason for cancelling this payment:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/gst-payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason: reason })
      });
      if (!res.ok) throw new Error('Failed to cancel payment');

      if (activeLiability) {
        const refreshed = await fetch(`/api/gst-liabilities/${activeLiability.id}`).then(r => r.json());
        setActiveLiability(refreshed);
      }
      await loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // File Upload Helper (Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setterUrl: (url: string) => void, setterName: (name: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    setterName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      setterUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Excel Export
  const handleExcelExport = () => {
    const headers = [
      'Period',
      'Financial Year',
      'Project',
      'Client',
      'Bill No',
      'Taxable Amount',
      'GST Liability Amount',
      'GST Paid Amount',
      'GST Balance Amount',
      'Payment Status',
      'Filing Status',
      'Return Type',
      'Due Date',
      'Filing ARN',
      'Payments Count'
    ];

    const data = filteredLiabilities.map(l => [
      l.period,
      l.financialYear,
      l.projectName,
      l.clientName,
      l.billNo,
      l.taxableAmount,
      l.gstAmount,
      l.gstPaid,
      l.gstBalance,
      l.paymentStatus,
      l.filingStatus,
      l.returnType,
      l.dueDate || '',
      l.filingArn || '',
      l.payments?.length || 0
    ]);

    const totals = [
      '',
      '',
      '',
      '',
      'Total:',
      displayedTotals.taxable,
      displayedTotals.liability,
      displayedTotals.paid,
      displayedTotals.balance,
      '',
      '',
      '',
      '',
      '',
      ''
    ];

    exportToExcelEnterprise({
      filename: `SN_Enterprise_GST_Register_${new Date().toISOString().substring(0, 10)}`,
      title: 'SN ENTERPRISE - GST Payment & Filing Register',
      subtitle: `Report Generated on ${new Date().toLocaleDateString('en-IN')}`,
      headers: headers.map(h => ({ header: h })),
      data,
      totals
    });
  };

  // Helper for Payment Status Badge
  const renderPaymentBadge = (status: 'Unpaid' | 'Partially Paid' | 'Paid') => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={11} className="text-emerald-700 stroke-[2.5]" />
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock size={11} className="text-amber-700 stroke-[2.5]" />
            Partially Paid
          </span>
        );
      case 'Unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertCircle size={11} className="text-red-700 stroke-[2.5]" />
            Unpaid
          </span>
        );
    }
  };

  // Helper for Filing Status Badge
  const renderFilingBadge = (filing: 'Not Filed' | 'Filed', returnType?: string, arn?: string) => {
    if (filing === 'Filed') {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300"
          title={arn ? `Filed ARN: ${arn}` : 'Return Filed'}
        >
          <ShieldCheck size={11} className="text-teal-700 stroke-[2.5]" />
          Filed ({returnType || 'GSTR-3B'})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
        Not Filed
      </span>
    );
  };

  return (
    <div className={`space-y-3 font-sans text-xs ${embedded ? '' : 'p-3 max-w-[1600px] mx-auto'}`}>
      {/* Header bar when standalone */}
      {!embedded && (
        <div className="bg-[#f0f4f8] border border-[#8c9ba8] px-3 py-2 rounded shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="bg-[var(--color-sap-blue-val,#0056b3)] text-white p-1 rounded font-bold font-mono text-[11px]">
              GST01
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">
                GST Payment & Filing Register
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">
                Statutory Tax Settlement, Challan Reconciliation & Return Compliance Cockpit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateLiabModalOpen(true)}
              className="sap-btn-secondary text-xs flex items-center gap-1 px-2.5 py-1"
              title="Add Direct Tax Adjustment / Manual Liability"
            >
              <Plus size={13} className="text-blue-700" />
              Add Liability
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="sap-btn-secondary text-xs flex items-center gap-1 px-2.5 py-1"
              title="Refresh Data"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD SUMMARY FIGURES (Requirement 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* Total GST Liability */}
        <div className="bg-white border border-[#b7c2ca] border-l-4 border-l-blue-600 p-2 rounded shadow-3xs flex flex-col justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Total GST Liability
          </span>
          <span className="text-sm font-extrabold text-blue-900 mt-1">
            ₹{summary.totalLiability.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-slate-400 mt-0.5">{summary.totalRecords} bills recorded</span>
        </div>

        {/* Total GST Paid */}
        <div className="bg-white border border-[#b7c2ca] border-l-4 border-l-emerald-600 p-2 rounded shadow-3xs flex flex-col justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Total GST Paid
          </span>
          <span className="text-sm font-extrabold text-emerald-800 mt-1">
            ₹{summary.totalPaid.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-emerald-600 mt-0.5">settled with Govt/portal</span>
        </div>

        {/* Total GST Outstanding */}
        <div className="bg-white border border-[#b7c2ca] border-l-4 border-l-rose-600 p-2 rounded shadow-3xs flex flex-col justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            GST Outstanding
          </span>
          <span className="text-sm font-extrabold text-rose-700 mt-1">
            ₹{summary.totalOutstanding.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-rose-500 mt-0.5">pending settlement</span>
        </div>

        {/* Unpaid GST */}
        <div className="bg-white border border-[#b7c2ca] border-l-4 border-l-red-500 p-2 rounded shadow-3xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Unpaid GST</span>
            <span className="px-1 py-0.2 bg-red-100 text-red-800 rounded font-mono text-[9px] font-bold">
              {summary.unpaidCount}
            </span>
          </div>
          <span className="text-xs font-bold text-red-700 mt-1">
            ₹{summary.unpaidAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-slate-400 mt-0.5">0% settled</span>
        </div>

        {/* Partially Paid GST */}
        <div className="bg-white border border-[#b7c2ca] border-l-4 border-l-amber-500 p-2 rounded shadow-3xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Partially Paid
            </span>
            <span className="px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-mono text-[9px] font-bold">
              {summary.partiallyPaidCount}
            </span>
          </div>
          <span className="text-xs font-bold text-amber-800 mt-1">
            ₹{summary.partiallyPaidAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-slate-400 mt-0.5">balance remaining</span>
        </div>

        {/* Paid GST */}
        <div className="bg-white border border-[#b7c2ca] border-l-4 border-l-green-600 p-2 rounded shadow-3xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Paid GST</span>
            <span className="px-1 py-0.2 bg-green-100 text-green-800 rounded font-mono text-[9px] font-bold">
              {summary.paidCount}
            </span>
          </div>
          <span className="text-xs font-bold text-green-800 mt-1">
            ₹{summary.paidAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-emerald-600 mt-0.5">fully settled</span>
        </div>

        {/* Due This Month */}
        <div className="bg-white border border-[#b7c2ca] border-l-4 border-l-purple-600 p-2 rounded shadow-3xs flex flex-col justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Due This Month
          </span>
          <span className="text-xs font-extrabold text-purple-900 mt-1">
            ₹{summary.dueThisMonth.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] text-purple-600 mt-0.5">payable by 20th</span>
        </div>
      </div>

      {/* FILTER BAR (Requirement 5) */}
      <div className="bg-[#f8fafc] border border-[#b7c2ca] p-2 rounded shadow-3xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px]">
            <Filter size={13} className="text-slate-500" />
            <span>GST Selection & Search Criteria</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedFy('all');
                setSelectedPeriod('all');
                setSelectedProject('all');
                setSelectedClient('all');
                setSelectedPaymentStatus('all');
                setSelectedFilingStatus('all');
                setSelectedPaidBy('all');
                setFromDate('');
                setToDate('');
                setSearchTerm('');
              }}
              className="text-[10px] text-blue-700 hover:underline font-semibold"
            >
              Reset Filters
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Showing {filteredLiabilities.length} of {liabilities.length} records
            </span>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-[10px]">
          {/* Financial Year */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">FY</label>
            <select
              value={selectedFy}
              onChange={e => setSelectedFy(e.target.value)}
              className="sap-input w-full py-0.5 px-1 font-mono text-[10px] bg-white"
            >
              <option value="all">All Financial Years</option>
              {financialYears.map(fy => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>

          {/* GST Period */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">Period</label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="sap-input w-full py-0.5 px-1 font-mono text-[10px] bg-white"
            >
              <option value="all">All Periods</option>
              {periods.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">Project</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="sap-input w-full py-0.5 px-1 text-[10px] bg-white font-medium"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">Client</label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="sap-input w-full py-0.5 px-1 text-[10px] bg-white"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">Payment</label>
            <select
              value={selectedPaymentStatus}
              onChange={e => setSelectedPaymentStatus(e.target.value)}
              className="sap-input w-full py-0.5 px-1 text-[10px] font-bold bg-white"
            >
              <option value="all">All Payment Status</option>
              <option value="Unpaid">🔴 Unpaid</option>
              <option value="Partially Paid">🟡 Partially Paid</option>
              <option value="Paid">🟢 Paid</option>
            </select>
          </div>

          {/* Filing Status */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">Filing</label>
            <select
              value={selectedFilingStatus}
              onChange={e => setSelectedFilingStatus(e.target.value)}
              className="sap-input w-full py-0.5 px-1 text-[10px] font-bold bg-white"
            >
              <option value="all">All Filing Status</option>
              <option value="Not Filed">⚪ Not Filed</option>
              <option value="Filed">🔵 Filed</option>
            </select>
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">Paid By</label>
            <select
              value={selectedPaidBy}
              onChange={e => setSelectedPaidBy(e.target.value)}
              className="sap-input w-full py-0.5 px-1 text-[10px] bg-white"
            >
              <option value="all">All Payers</option>
              <option value="SN ENTERPRISE">SN ENTERPRISE</option>
              <option value="Client">Client</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-slate-500 font-bold uppercase text-[9px] mb-0.5">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Bill / CIN / Ref..."
                className="sap-input w-full py-0.5 px-1.5 pr-5 text-[10px] bg-white"
              />
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={10} />
                </button>
              ) : (
                <Search size={10} className="absolute right-1.5 top-1.5 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ACTION TOOLBAR & EXPORT BUTTONS */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f0f4f8] p-1.5 rounded border border-[#b7c2ca]">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
            <Receipt size={14} className="text-emerald-700" />
            GST Register & Settlement Ledger
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* PDF Export */}
          <PDFExportButton
            title="GST Liability & Payment Settlement Register"
            subtitle={`Consolidated Statutory Tax Register - SN ENTERPRISE`}
            tcode="GST01"
            headers={[
              'Period',
              'Project',
              'Client',
              'Bill No',
              'Taxable (₹)',
              'GST Liab (₹)',
              'GST Paid (₹)',
              'Balance (₹)',
              'Pay Status',
              'Filing Status',
              'Due Date'
            ]}
            data={filteredLiabilities.map(l => [
              l.period,
              l.projectName || '',
              l.clientName || '',
              l.billNo || '',
              l.taxableAmount.toLocaleString('en-IN'),
              l.gstAmount.toLocaleString('en-IN'),
              l.gstPaid.toLocaleString('en-IN'),
              l.gstBalance.toLocaleString('en-IN'),
              l.paymentStatus,
              `${l.filingStatus} (${l.returnType})`,
              l.dueDate || ''
            ])}
            totals={[
              '',
              '',
              '',
              'Total:',
              `Rs. ${displayedTotals.taxable.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.liability.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.paid.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.balance.toLocaleString('en-IN')}`,
              '',
              '',
              ''
            ]}
            filename={`GST_Register_${new Date().toISOString().substring(0, 10)}`}
            buttonLabel="PDF Report"
            className="sap-btn-secondary text-[11px] py-1 px-2.5 h-6"
          />

          {/* Excel Export */}
          <button
            onClick={handleExcelExport}
            className="sap-btn-secondary text-[11px] py-1 px-2.5 h-6 flex items-center gap-1"
            title="Export Register to Excel (.xlsx)"
          >
            <FileSpreadsheet size={12} className="text-emerald-700" />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* GST REGISTER TABLE (Requirement 4) */}
      <div className="bg-white border border-[#b7c2ca] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-[10px]">
            <thead className="bg-[#e4ebf2] text-slate-700 font-bold border-b border-[#b7c2ca]">
              <tr className="divide-x divide-[#b7c2ca]">
                <th className="py-1.5 px-2 text-center w-14">Period</th>
                <th className="py-1.5 px-2">Project</th>
                <th className="py-1.5 px-2">Client</th>
                <th className="py-1.5 px-2 text-center w-24">Bill No</th>
                <th className="py-1.5 px-2 text-right pr-3 w-28">Taxable Amount</th>
                <th className="py-1.5 px-2 text-right pr-3 w-28 bg-blue-50/70 text-blue-950">
                  GST Amount
                </th>
                <th className="py-1.5 px-2 text-right pr-3 w-28 bg-emerald-50/70 text-emerald-950">
                  GST Paid
                </th>
                <th className="py-1.5 px-2 text-right pr-3 w-28 bg-rose-50/70 text-rose-950">
                  GST Balance
                </th>
                <th className="py-1.5 px-2 text-center w-24">Payment Status</th>
                <th className="py-1.5 px-2 text-center w-28">Filing Status</th>
                <th className="py-1.5 px-2 text-center w-20">Due Date</th>
                <th className="py-1.5 px-2 text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLiabilities.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-slate-400 italic">
                    {loading ? 'Loading GST data...' : 'No GST records match the current filter selection.'}
                  </td>
                </tr>
              ) : (
                filteredLiabilities.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/30 transition-colors divide-x divide-slate-100"
                  >
                    {/* Period */}
                    <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-800">
                      {item.period}
                    </td>

                    {/* Project */}
                    <td className="py-1.5 px-2 font-medium text-slate-900 max-w-[180px] truncate" title={item.projectName}>
                      <span className="font-semibold">{item.projectName}</span>
                    </td>

                    {/* Client */}
                    <td className="py-1.5 px-2 text-slate-700 max-w-[140px] truncate" title={item.clientName}>
                      {item.clientName}
                    </td>

                    {/* Bill No */}
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-[var(--color-sap-blue-val,#0056b3)]">
                      {item.billNo}
                    </td>

                    {/* Taxable Amount */}
                    <td className="py-1.5 px-2 text-right font-mono text-slate-700 pr-3">
                      ₹{item.taxableAmount.toLocaleString('en-IN')}
                    </td>

                    {/* GST Amount (Liability) */}
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-blue-900 bg-blue-50/20 pr-3">
                      ₹{item.gstAmount.toLocaleString('en-IN')}
                    </td>

                    {/* GST Paid */}
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20 pr-3">
                      ₹{item.gstPaid.toLocaleString('en-IN')}
                    </td>

                    {/* GST Balance */}
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-700 bg-rose-50/20 pr-3">
                      ₹{item.gstBalance.toLocaleString('en-IN')}
                    </td>

                    {/* Payment Status (Requirement 1 & 4) */}
                    <td className="py-1.5 px-2 text-center">
                      {renderPaymentBadge(item.paymentStatus)}
                    </td>

                    {/* Filing Status (Requirement 7) */}
                    <td className="py-1.5 px-2 text-center">
                      {renderFilingBadge(item.filingStatus, item.returnType, item.filingArn)}
                    </td>

                    {/* Due Date */}
                    <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                      {item.dueDate || '—'}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {/* Record Payment Button */}
                        <button
                          onClick={() => openPaymentModal(item)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-3xs flex items-center gap-0.5"
                          title="Record GST Payment"
                        >
                          <CreditCard size={10} />
                          <span>Pay</span>
                        </button>

                        {/* History Button */}
                        <button
                          onClick={() => openHistoryModal(item)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-3xs flex items-center gap-0.5"
                          title="Payment History & Challans"
                        >
                          <History size={10} />
                          <span>History</span>
                        </button>

                        {/* Filing Status Update Button */}
                        <button
                          onClick={() => openFilingModal(item)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-3xs flex items-center gap-0.5"
                          title="Update Return Filing Status"
                        >
                          <FileText size={10} />
                          <span>File</span>
                        </button>

                        {/* Detail Modal Button */}
                        <button
                          onClick={() => openDetailModal(item)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 shadow-3xs"
                          title="View Full GST Detail"
                        >
                          <Eye size={10} />
                        </button>

                        {/* Audit Trail Button */}
                        <button
                          onClick={() => openAuditModal(item)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-300"
                          title="Audit Trail Logs"
                        >
                          <Clock size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer Totals */}
            {filteredLiabilities.length > 0 && (
              <tfoot className="bg-[#f1f5f9] font-bold text-slate-800 border-t-2 border-[#b7c2ca] divide-x divide-[#b7c2ca]">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right uppercase text-[9px] text-slate-600">
                    Consolidated Filter Totals:
                  </td>
                  <td className="py-2 px-2 text-right font-mono pr-3">
                    ₹{displayedTotals.taxable.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-blue-900 bg-blue-100/50 pr-3">
                    ₹{displayedTotals.liability.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-900 bg-emerald-100/50 pr-3">
                    ₹{displayedTotals.paid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-rose-900 bg-rose-100/50 pr-3">
                    ₹{displayedTotals.balance.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={4} className="py-2 px-2 text-left text-[9px] text-slate-500 pl-3">
                    {filteredLiabilities.length} active GST liability records
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RECORD GST PAYMENT MODAL (Requirement 2)                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {paymentModalOpen && activeLiability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-[#0056b3] rounded-none shadow-2xl max-w-2xl w-full overflow-hidden text-xs"
            >
              {/* SAP Header */}
              <div className="bg-[#0056b3] text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard size={15} />
                  <span className="font-bold text-[12px]">
                    Record GST Payment — {activeLiability.billNo || activeLiability.id}
                  </span>
                </div>
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSavePayment} className="p-4 space-y-3.5 max-h-[85vh] overflow-y-auto">
                {/* Read-Only Liability Context Box */}
                <div className="bg-[#f0f4f8] border border-[#b7c2ca] p-2.5 rounded">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    GST Liability Details (Read Only)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Period:</span>
                      <span className="font-bold font-mono text-slate-800">{activeLiability.period}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Project:</span>
                      <span className="font-semibold text-slate-800 truncate block" title={activeLiability.projectName}>
                        {activeLiability.projectName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Client:</span>
                      <span className="font-semibold text-slate-800 truncate block" title={activeLiability.clientName}>
                        {activeLiability.clientName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Bill / Inv No:</span>
                      <span className="font-bold font-mono text-[var(--color-sap-blue-val,#0056b3)]">
                        {activeLiability.billNo}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200">
                    <div className="bg-blue-50/70 p-1.5 rounded border border-blue-200">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">GST Liability:</span>
                      <span className="font-mono font-extrabold text-blue-900 text-xs">
                        ₹{activeLiability.gstAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-emerald-50/70 p-1.5 rounded border border-emerald-200">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Total Paid to Date:</span>
                      <span className="font-mono font-extrabold text-emerald-800 text-xs">
                        ₹{activeLiability.gstPaid.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-rose-50/70 p-1.5 rounded border border-rose-200">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Outstanding GST:</span>
                      <span className="font-mono font-extrabold text-rose-800 text-xs">
                        ₹{activeLiability.gstBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Entry Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Payment Amount */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Payment Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="sap-input w-full font-mono text-xs font-bold text-emerald-800"
                    />
                    {parseFloat(paymentAmount || '0') > activeLiability.gstBalance && (
                      <p className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> Note: Payment exceeds currently outstanding amount (₹
                        {activeLiability.gstBalance.toLocaleString('en-IN')})
                      </p>
                    )}
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="sap-input w-full font-mono text-xs"
                    />
                  </div>

                  {/* Paid By */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Paid By <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center space-x-4 h-7">
                      <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="paidBy"
                          checked={paidBy === 'SN ENTERPRISE'}
                          onChange={() => setPaidBy('SN ENTERPRISE')}
                          className="text-blue-600"
                        />
                        <span className="font-bold text-slate-800">SN ENTERPRISE</span>
                      </label>
                      <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="paidBy"
                          checked={paidBy === 'Client'}
                          onChange={() => setPaidBy('Client')}
                          className="text-blue-600"
                        />
                        <span className="font-bold text-slate-800">Client</span>
                      </label>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={e => setPaymentMode(e.target.value)}
                      className="sap-input w-full text-xs"
                    >
                      <option value="Net Banking">Net Banking</option>
                      <option value="Challan">GST Challan / PMT-06</option>
                      <option value="NEFT / RTGS">NEFT / RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Direct Portal">Direct GST Portal Debit</option>
                    </select>
                  </div>

                  {/* Challan / CIN */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      GST Challan / CIN / CPIN Number
                    </label>
                    <input
                      type="text"
                      value={challanNumber}
                      onChange={e => setChallanNumber(e.target.value)}
                      placeholder="e.g. CIN260320261234"
                      className="sap-input w-full font-mono text-xs uppercase"
                    />
                  </div>

                  {/* Bank Reference / UTR */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Bank Ref / UTR / Cheque No
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      placeholder="e.g. UTR12345678"
                      className="sap-input w-full font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Remarks / Note</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter any reference, batch, or settlement notes..."
                    className="sap-input w-full text-xs"
                  />
                </div>

                {/* Payment Proof / Challan Attachment */}
                <div className="border border-dashed border-[#b7c2ca] p-2.5 rounded bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      <Upload size={13} className="text-blue-700" />
                      Payment Proof / Challan Attachment
                    </label>
                    {attachmentUrl && (
                      <span className="text-[10px] text-emerald-700 font-semibold">Document Attached</span>
                    )}
                  </div>
                  {attachmentUrl ? (
                    <div className="flex items-center justify-between bg-white border border-slate-300 p-1.5 rounded">
                      <span className="font-mono text-[10px] text-slate-800 truncate max-w-xs">
                        {attachmentName || 'Attachment Proof'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment({ url: attachmentUrl, name: attachmentName })}
                          className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold hover:bg-blue-200"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentUrl('');
                            setAttachmentName('');
                          }}
                          className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-semibold hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={e => handleFileUpload(e, setAttachmentUrl, setAttachmentName)}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  )}
                </div>

                {/* Calculation Simulator Preview */}
                {parseFloat(paymentAmount || '0') > 0 && (
                  <div className="bg-emerald-50 border border-emerald-300 p-2 rounded text-[11px]">
                    <span className="font-bold text-emerald-900 block mb-0.5">
                      Payment Simulation & Status Preview:
                    </span>
                    <div className="flex flex-wrap gap-4 text-emerald-950 font-mono">
                      <span>New Paid: ₹{(activeLiability.gstPaid + parseFloat(paymentAmount)).toLocaleString('en-IN')}</span>
                      <span>
                        New Balance: ₹
                        {Math.max(
                          0,
                          activeLiability.gstAmount - (activeLiability.gstPaid + parseFloat(paymentAmount))
                        ).toLocaleString('en-IN')}
                      </span>
                      <span className="font-sans font-bold flex items-center gap-1">
                        Resulting Status:{' '}
                        {activeLiability.gstPaid + parseFloat(paymentAmount) >= activeLiability.gstAmount ? (
                          <span className="text-emerald-800 bg-emerald-200 px-1.5 py-0.2 rounded font-bold">
                            Paid
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded font-bold">
                            Partially Paid
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="sap-btn-secondary px-3 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="sap-btn-primary px-4 py-1 flex items-center gap-1"
                  >
                    {savingPayment ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={12} />
                        <span>Confirm GST Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. PAYMENT HISTORY MODAL (Requirement 3)                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {historyModalOpen && activeLiability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-600 rounded-none shadow-2xl max-w-4xl w-full overflow-hidden text-xs"
            >
              <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <History size={15} />
                  <span className="font-bold text-[12px]">
                    GST Payment History — Bill #{activeLiability.billNo} ({activeLiability.period})
                  </span>
                </div>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[85vh] overflow-y-auto">
                {/* Header Summary */}
                <div className="grid grid-cols-4 gap-2 bg-[#f0f4f8] p-2.5 rounded border border-[#b7c2ca]">
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">Liability</span>
                    <span className="font-mono font-extrabold text-blue-900 text-xs">
                      ₹{activeLiability.gstAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">Total Paid</span>
                    <span className="font-mono font-extrabold text-emerald-800 text-xs">
                      ₹{activeLiability.gstPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">Remaining</span>
                    <span className="font-mono font-extrabold text-rose-800 text-xs">
                      ₹{activeLiability.gstBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">Status</span>
                    <span className="mt-0.5 inline-block">{renderPaymentBadge(activeLiability.paymentStatus)}</span>
                  </div>
                </div>

                {/* Payments Table */}
                <div className="border border-[#b7c2ca] rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-[#b7c2ca]">
                      <tr className="divide-x divide-slate-200">
                        <th className="py-1.5 px-2">Date</th>
                        <th className="py-1.5 px-2 text-right pr-3">Payment Amount</th>
                        <th className="py-1.5 px-2">Paid By</th>
                        <th className="py-1.5 px-2">Mode</th>
                        <th className="py-1.5 px-2">Challan / CIN</th>
                        <th className="py-1.5 px-2">Reference</th>
                        <th className="py-1.5 px-2">Created By</th>
                        <th className="py-1.5 px-2">Remarks</th>
                        <th className="py-1.5 px-2 text-center w-16">Proof</th>
                        <th className="py-1.5 px-2 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!activeLiability.payments || activeLiability.payments.length === 0) ? (
                        <tr>
                          <td colSpan={10} className="text-center py-6 text-slate-400 italic font-sans">
                            No GST payments have been recorded against this liability yet.
                          </td>
                        </tr>
                      ) : (
                        activeLiability.payments.map((p, idx) => (
                          <tr key={p.id || idx} className="hover:bg-slate-50 divide-x divide-slate-100">
                            <td className="py-1.5 px-2 font-mono text-slate-800 font-semibold">{p.paymentDate}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800 pr-3">
                              ₹{p.paymentAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-1.5 px-2 font-semibold text-slate-800">{p.paidBy}</td>
                            <td className="py-1.5 px-2 text-slate-700">{p.paymentMode}</td>
                            <td className="py-1.5 px-2 font-mono uppercase text-blue-900">{p.challanNumber || '—'}</td>
                            <td className="py-1.5 px-2 font-mono uppercase text-slate-600">{p.referenceNumber || '—'}</td>
                            <td className="py-1.5 px-2 text-slate-600">{p.createdBy || 'Admin'}</td>
                            <td className="py-1.5 px-2 text-slate-600 truncate max-w-[140px]" title={p.remarks}>
                              {p.remarks || '—'}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {p.attachmentUrl ? (
                                <button
                                  onClick={() => setPreviewAttachment({ url: p.attachmentUrl!, name: p.attachmentName || 'Challan Receipt' })}
                                  className="text-blue-700 hover:underline flex items-center justify-center gap-0.5 text-[9px] font-bold mx-auto"
                                >
                                  <Eye size={10} />
                                  <span>View</span>
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                onClick={() => handleCancelPayment(p.id)}
                                className="text-red-600 hover:text-red-800 p-0.5 rounded hover:bg-red-50"
                                title="Cancel this payment record"
                              >
                                <Trash2 size={11} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => {
                      setHistoryModalOpen(false);
                      openPaymentModal(activeLiability);
                    }}
                    className="sap-btn-primary flex items-center gap-1 px-3 py-1"
                  >
                    <Plus size={12} />
                    <span>Record Another Payment</span>
                  </button>
                  <button
                    onClick={() => setHistoryModalOpen(false)}
                    className="sap-btn-secondary px-3 py-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. MARK FILED / GSTR RETURN MODAL (Requirement 7)                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {filingModalOpen && activeLiability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-teal-700 rounded-none shadow-2xl max-w-lg w-full overflow-hidden text-xs"
            >
              <div className="bg-teal-800 text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck size={15} />
                  <span className="font-bold text-[12px]">
                    Update GST Filing Status — {activeLiability.billNo}
                  </span>
                </div>
                <button
                  onClick={() => setFilingModalOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveFiling} className="p-4 space-y-3">
                <p className="text-[11px] text-slate-600 bg-teal-50 p-2 rounded border border-teal-200">
                  <strong>Notice:</strong> Payment status and filing status are tracked independently. A GST
                  record can be <em>Paid + Not Filed</em> or <em>Unpaid + Filed</em> according to statutory timelines.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Return Type</label>
                    <select
                      value={filingReturnType}
                      onChange={e => setFilingReturnType(e.target.value as any)}
                      className="sap-input w-full text-xs font-bold"
                    >
                      <option value="GSTR-3B">GSTR-3B (Monthly Summary)</option>
                      <option value="GSTR-1">GSTR-1 (Outward Supplies)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Filing Status</label>
                    <select
                      value={filingStatus}
                      onChange={e => setFilingStatus(e.target.value as any)}
                      className="sap-input w-full text-xs font-bold"
                    >
                      <option value="Filed">Filed</option>
                      <option value="Not Filed">Not Filed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Filing Date</label>
                    <input
                      type="date"
                      value={filingDate}
                      onChange={e => setFilingDate(e.target.value)}
                      className="sap-input w-full font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      ARN (Ack Reference No)
                    </label>
                    <input
                      type="text"
                      value={filingArn}
                      onChange={e => setFilingArn(e.target.value)}
                      placeholder="e.g. AA2703260012345"
                      className="sap-input w-full font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Filing Copy / Receipt</label>
                  {filingChallanDoc ? (
                    <div className="flex items-center justify-between bg-teal-50 border border-teal-200 p-1.5 rounded">
                      <span className="font-mono text-[10px] text-teal-900 truncate">Document Attached</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment({ url: filingChallanDoc, name: 'GSTR Filing Copy' })}
                          className="px-2 py-0.5 rounded bg-teal-200 text-teal-800 text-[10px] font-semibold"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilingChallanDoc('')}
                          className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={e => handleFileUpload(e, setFilingChallanDoc, () => {})}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-teal-50 file:text-teal-700 cursor-pointer"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Filing Notes</label>
                  <textarea
                    rows={2}
                    value={filingNotes}
                    onChange={e => setFilingNotes(e.target.value)}
                    placeholder="e.g. Filed on GST portal, late fee nil..."
                    className="sap-input w-full text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFilingModalOpen(false)}
                    className="sap-btn-secondary px-3 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFiling}
                    className="sap-btn-primary px-4 py-1"
                  >
                    {savingFiling ? 'Saving...' : 'Update Filing Status'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. SAP DETAIL SCREEN (Requirement 11)                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {detailModalOpen && activeLiability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-[#0056b3] rounded-none shadow-2xl max-w-3xl w-full overflow-hidden text-xs"
            >
              <div className="bg-[#0056b3] text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt size={15} />
                  <span className="font-bold text-[12px]">
                    GST Detail Screen — {activeLiability.billNo || activeLiability.id}
                  </span>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
                {/* SAP Detail Screen Header Block (Requirement 11) */}
                <div className="grid grid-cols-4 gap-2 bg-[#f0f4f8] p-3 rounded border border-[#b7c2ca]">
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">GST Liability</span>
                    <span className="text-base font-extrabold text-blue-900 font-mono">
                      ₹{activeLiability.gstAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Taxable: ₹{activeLiability.taxableAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Paid Amount</span>
                    <span className="text-base font-extrabold text-emerald-800 font-mono">
                      ₹{activeLiability.gstPaid.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{activeLiability.payments?.length || 0} payments made</span>
                  </div>

                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Outstanding</span>
                    <span className="text-base font-extrabold text-rose-700 font-mono">
                      ₹{activeLiability.gstBalance.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Balance to settle</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Status</span>
                    <div className="mt-1">{renderPaymentBadge(activeLiability.paymentStatus)}</div>
                    <span className="text-[9px] text-slate-400 block mt-1">Filing: {activeLiability.filingStatus}</span>
                  </div>
                </div>

                {/* Buttons Row (Requirement 11) */}
                <div className="flex flex-wrap items-center gap-2 border-y border-slate-200 py-2.5">
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openPaymentModal(activeLiability);
                    }}
                    className="sap-btn-primary px-3 py-1 flex items-center gap-1"
                  >
                    <CreditCard size={12} />
                    <span>Record Payment</span>
                  </button>

                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openHistoryModal(activeLiability);
                    }}
                    className="sap-btn-secondary px-3 py-1 flex items-center gap-1"
                  >
                    <History size={12} />
                    <span>Payment History</span>
                  </button>

                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openFilingModal(activeLiability);
                    }}
                    className="sap-btn-secondary px-3 py-1 flex items-center gap-1 text-teal-800"
                  >
                    <ShieldCheck size={12} />
                    <span>Mark Filed</span>
                  </button>

                  {activeLiability.payments?.[0]?.attachmentUrl && (
                    <button
                      onClick={() =>
                        setPreviewAttachment({
                          url: activeLiability.payments![0].attachmentUrl!,
                          name: activeLiability.payments![0].attachmentName || 'Challan'
                        })
                      }
                      className="sap-btn-secondary px-3 py-1 flex items-center gap-1 text-blue-800"
                    >
                      <Eye size={12} />
                      <span>View Challan</span>
                    </button>
                  )}

                  <button
                    onClick={() => window.print()}
                    className="sap-btn-secondary px-3 py-1 flex items-center gap-1"
                  >
                    <Printer size={12} />
                    <span>Print</span>
                  </button>
                </div>

                {/* Detailed Information Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Project Name</span>
                    <span className="font-semibold text-slate-800">{activeLiability.projectName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Client Name</span>
                    <span className="font-semibold text-slate-800">{activeLiability.clientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Bill Reference</span>
                    <span className="font-mono font-bold text-blue-700">{activeLiability.billNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Tax Period & FY</span>
                    <span className="font-mono text-slate-800">
                      {activeLiability.period} ({activeLiability.financialYear})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Statutory Due Date</span>
                    <span className="font-mono text-slate-800">{activeLiability.dueDate || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Filing Return Type</span>
                    <span className="font-bold text-teal-800">{activeLiability.returnType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Filing ARN</span>
                    <span className="font-mono text-slate-800">{activeLiability.filingArn || 'Not yet filed'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Filing Date</span>
                    <span className="font-mono text-slate-800">{activeLiability.filingDate || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase">Linked Billing ID</span>
                    <span className="font-mono text-slate-600">{activeLiability.billingId || 'Direct GST Entry'}</span>
                  </div>
                </div>

                {/* Audit Trail Section */}
                <div className="border border-[#b7c2ca] rounded overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 border-b border-[#b7c2ca] font-bold text-slate-700 flex items-center justify-between">
                    <span>Audit Trail Log</span>
                    <span className="text-[10px] text-slate-500">{activeAuditTrails.length} records</span>
                  </div>
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr className="divide-x divide-slate-200">
                        <th className="py-1 px-2 w-32">Timestamp</th>
                        <th className="py-1 px-2 w-28">Action</th>
                        <th className="py-1 px-2 w-20">User</th>
                        <th className="py-1 px-2">Previous Value</th>
                        <th className="py-1 px-2">New Value</th>
                        <th className="py-1 px-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeAuditTrails.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-slate-400 italic">
                            No audit trail entries for this record.
                          </td>
                        </tr>
                      ) : (
                        activeAuditTrails.map(aud => (
                          <tr key={aud.id} className="hover:bg-slate-50 divide-x divide-slate-100">
                            <td className="py-1 px-2 font-mono text-slate-600">{aud.timestamp.substring(0, 19).replace('T', ' ')}</td>
                            <td className="py-1 px-2 font-bold text-slate-800">{aud.action}</td>
                            <td className="py-1 px-2 text-slate-600">{aud.user}</td>
                            <td className="py-1 px-2 text-slate-600 font-mono text-[9px]">{aud.previousValue || '—'}</td>
                            <td className="py-1 px-2 text-emerald-800 font-mono text-[9px] font-semibold">{aud.newValue || '—'}</td>
                            <td className="py-1 px-2 text-slate-600">{aud.remarks || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="sap-btn-secondary px-3 py-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. AUDIT TRAIL LOG MODAL (Requirement 10)                                 */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {auditModalOpen && activeLiability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-700 rounded-none shadow-2xl max-w-4xl w-full overflow-hidden text-xs"
            >
              <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock size={15} />
                  <span className="font-bold text-[12px]">
                    GST Audit Trail — {activeLiability.billNo} ({activeLiability.id})
                  </span>
                </div>
                <button
                  onClick={() => setAuditModalOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[85vh] overflow-y-auto">
                <p className="text-[11px] text-slate-600">
                  Comprehensive audit trail logs tracking GST payment creation, payment edits, cancellations,
                  payment status transitions, and return filing status modifications.
                </p>

                <div className="border border-[#b7c2ca] rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr className="divide-x divide-slate-200">
                        <th className="py-1.5 px-2 w-36">Timestamp</th>
                        <th className="py-1.5 px-2 w-32">Action Event</th>
                        <th className="py-1.5 px-2 w-24">User</th>
                        <th className="py-1.5 px-2">Previous State</th>
                        <th className="py-1.5 px-2">New State</th>
                        <th className="py-1.5 px-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeAuditTrails.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-400 italic">
                            No audit trail entries found.
                          </td>
                        </tr>
                      ) : (
                        activeAuditTrails.map(aud => (
                          <tr key={aud.id} className="hover:bg-slate-50 divide-x divide-slate-100">
                            <td className="py-1.5 px-2 font-mono text-slate-600">{aud.timestamp.substring(0, 19).replace('T', ' ')}</td>
                            <td className="py-1.5 px-2 font-bold text-slate-800">{aud.action}</td>
                            <td className="py-1.5 px-2 text-slate-700">{aud.user}</td>
                            <td className="py-1.5 px-2 text-slate-600 font-mono text-[9px]">{aud.previousValue || '—'}</td>
                            <td className="py-1.5 px-2 text-emerald-800 font-mono text-[9px] font-semibold">{aud.newValue || '—'}</td>
                            <td className="py-1.5 px-2 text-slate-600">{aud.remarks || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setAuditModalOpen(false)}
                    className="sap-btn-secondary px-3 py-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 7. MANUAL CREATE GST LIABILITY MODAL                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {createLiabModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-blue-700 rounded-none shadow-2xl max-w-lg w-full overflow-hidden text-xs"
            >
              <div className="bg-[#0056b3] text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plus size={15} />
                  <span className="font-bold text-[12px]">Add Direct GST Liability Record</span>
                </div>
                <button
                  onClick={() => setCreateLiabModalOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveLiability} className="p-4 space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newLiabProjectId}
                    onChange={e => {
                      setNewLiabProjectId(e.target.value);
                      const p = projects.find(proj => proj.id === e.target.value);
                      if (p?.clientName) setNewLiabClient(p.clientName);
                    }}
                    required
                    className="sap-input w-full text-xs font-semibold"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Client Name</label>
                    <input
                      type="text"
                      value={newLiabClient}
                      onChange={e => setNewLiabClient(e.target.value)}
                      placeholder="e.g. Acme Infra"
                      className="sap-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Bill / Invoice No</label>
                    <input
                      type="text"
                      value={newLiabBillNo}
                      onChange={e => setNewLiabBillNo(e.target.value)}
                      placeholder="e.g. INV-2026-001"
                      className="sap-input w-full font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Period (YYYY-MM) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      required
                      value={newLiabPeriod}
                      onChange={e => setNewLiabPeriod(e.target.value)}
                      className="sap-input w-full font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Taxable Amt (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={newLiabTaxable}
                      onChange={e => {
                        setNewLiabTaxable(e.target.value);
                        if (!newLiabGst && e.target.value) {
                          setNewLiabGst((parseFloat(e.target.value) * 0.18).toFixed(2));
                        }
                      }}
                      placeholder="0.00"
                      className="sap-input w-full font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      GST Amt (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newLiabGst}
                      onChange={e => setNewLiabGst(e.target.value)}
                      placeholder="18000"
                      className="sap-input w-full font-mono text-xs font-bold text-blue-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Statutory Due Date</label>
                  <input
                    type="date"
                    value={newLiabDueDate}
                    onChange={e => setNewLiabDueDate(e.target.value)}
                    className="sap-input w-full font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Notes / Reason</label>
                  <textarea
                    rows={2}
                    value={newLiabNotes}
                    onChange={e => setNewLiabNotes(e.target.value)}
                    placeholder="e.g. Manual entry for subcontractor reverse charge or opening balance"
                    className="sap-input w-full text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCreateLiabModalOpen(false)}
                    className="sap-btn-secondary px-3 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingLiab}
                    className="sap-btn-primary px-4 py-1"
                  >
                    {savingLiab ? 'Creating...' : 'Create Liability'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. ATTACHMENT PREVIEW MODAL                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewAttachment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between">
                <span className="font-bold text-xs truncate">{previewAttachment.name}</span>
                <div className="flex items-center space-x-2">
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name || 'document'}
                    className="text-white/80 hover:text-white flex items-center gap-1 text-[10px] bg-slate-700 px-2 py-0.5 rounded"
                  >
                    <Download size={11} />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => setPreviewAttachment(null)}
                    className="text-white/80 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[300px]">
                {previewAttachment.url.startsWith('data:image/') ? (
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.name}
                    className="max-h-[70vh] object-contain border border-slate-300 shadow-sm"
                  />
                ) : (
                  <iframe
                    src={previewAttachment.url}
                    title={previewAttachment.name}
                    className="w-full h-[70vh] border border-slate-300"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
