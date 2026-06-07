import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2, Upload, Download, Paperclip, Printer, FileSpreadsheet } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { checkBillingDuplicate, addOverrideLog } from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { PDFExportButton } from '../components/PDFExportButton';
import { MeasurementItem, Billing as BillingType } from '../types';

export const Billing: React.FC = () => {
  const { user, billings, projects, addBilling, updateBilling, deleteBilling } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  const [isAdding, setIsAdding] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [printingBill, setPrintingBill] = useState<BillingType | null>(null);
  
  // Duplicate verification states
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupData, setDupData] = useState<any[]>([]);
  const [pendingSaveFn, setPendingSaveFn] = useState<((overrideReason?: string) => void) | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    srNo: '',
    projectId: '',
    billNo: '',
    workNature: '',
    amount: '',
    month: '',
    certifyDate: '',
    tds: '',
    tdsPercent: '',
    retention: '',
    retentionPercent: '',
    gst: '',
    gstPercent: '',
    debitAmount: '',
    debitReason: '',
    billType: 'Running Account',
    measurementItems: [] as MeasurementItem[],
    hardCopyFile: '',
    hardCopyFileName: '',
    hardCopyFileType: ''
  });

  const getPercentStr = (val: number, total: number) => {
    if (total <= 0 || val <= 0) return '';
    const pct = (val / total) * 100;
    return parseFloat(pct.toFixed(2)).toString();
  };

  const handleEdit = (bill: any) => {
    const billAmt = bill.amount || 0;
    const tdsVal = bill.tds ?? 0;
    const retVal = bill.retention ?? 0;
    const gstVal = bill.gst ?? 0;
    const debAmt = bill.debitAmount ?? 0;

    setFormData({
      srNo: bill.srNo,
      projectId: bill.projectId,
      billNo: bill.billNo,
      workNature: bill.workNature,
      amount: billAmt.toString(),
      month: bill.month,
      certifyDate: bill.certifyDate,
      tds: tdsVal.toString(),
      tdsPercent: getPercentStr(tdsVal, billAmt),
      retention: retVal.toString(),
      retentionPercent: getPercentStr(retVal, billAmt),
      gst: gstVal.toString(),
      gstPercent: getPercentStr(gstVal, billAmt),
      debitAmount: debAmt > 0 ? debAmt.toString() : '',
      debitReason: bill.debitReason || '',
      billType: bill.billType || 'Running Account',
      measurementItems: bill.measurementItems || [],
      hardCopyFile: bill.hardCopyFile || '',
      hardCopyFileName: bill.hardCopyFileName || '',
      hardCopyFileType: bill.hardCopyFileType || ''
    });
    setEditingId(bill.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      srNo: '',
      projectId: '',
      billNo: '',
      workNature: '',
      amount: '',
      month: '',
      certifyDate: '',
      tds: '',
      tdsPercent: '',
      retention: '',
      retentionPercent: '',
      gst: '',
      gstPercent: '',
      debitAmount: '',
      debitReason: '',
      billType: 'Running Account',
      measurementItems: [],
      hardCopyFile: '',
      hardCopyFileName: '',
      hardCopyFileType: ''
    });
  };

  const calculateTotalFromMeasurements = (items: MeasurementItem[]) => {
    return items.reduce((sum, item) => sum + (Number(item.qtyExecuted || 0) * Number(item.rate || 0)), 0);
  };

  const handleAddMeasurementItem = () => {
    const newItem: MeasurementItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: '',
      qtyExecuted: 0,
      unit: 'Sqm',
      rate: 0,
      amount: 0,
      prevQty: 0,
      cumulativeQty: 0
    };
    const updatedItems = [...formData.measurementItems, newItem];
    const newAmount = calculateTotalFromMeasurements(updatedItems);
    
    setFormData(prev => {
      const amtStr = newAmount > 0 ? parseFloat(newAmount.toFixed(2)).toString() : prev.amount;
      const amtNum = parseFloat(amtStr) || 0;
      const tPct = parseFloat(prev.tdsPercent) || 0;
      const rPct = parseFloat(prev.retentionPercent) || 0;
      const gPct = parseFloat(prev.gstPercent) || 0;

      return {
        ...prev,
        measurementItems: updatedItems,
        amount: amtStr,
        tds: tPct > 0 ? parseFloat((amtNum * tPct / 100).toFixed(2)).toString() : prev.tds,
        retention: rPct > 0 ? parseFloat((amtNum * rPct / 100).toFixed(2)).toString() : prev.retention,
        gst: gPct > 0 ? parseFloat((amtNum * gPct / 100).toFixed(2)).toString() : prev.gst
      };
    });
  };

  const handleUpdateMeasurementItem = (index: number, fields: Partial<MeasurementItem>) => {
    const updatedItems = formData.measurementItems.map((item, idx) => {
      if (idx === index) {
        const merged = { ...item, ...fields };
        const qty = Number(merged.qtyExecuted || 0);
        const rt = Number(merged.rate || 0);
        const pr = Number(merged.prevQty || 0);
        merged.amount = Number((qty * rt).toFixed(2));
        merged.cumulativeQty = Number((pr + qty).toFixed(2));
        return merged;
      }
      return item;
    });

    const newAmount = calculateTotalFromMeasurements(updatedItems);
    setFormData(prev => {
      const amtStr = newAmount > 0 ? parseFloat(newAmount.toFixed(2)).toString() : prev.amount;
      const amtNum = parseFloat(amtStr) || 0;
      const tPct = parseFloat(prev.tdsPercent) || 0;
      const rPct = parseFloat(prev.retentionPercent) || 0;
      const gPct = parseFloat(prev.gstPercent) || 0;

      return {
        ...prev,
        measurementItems: updatedItems,
        amount: amtStr,
        tds: tPct > 0 ? parseFloat((amtNum * tPct / 100).toFixed(2)).toString() : prev.tds,
        retention: rPct > 0 ? parseFloat((amtNum * rPct / 100).toFixed(2)).toString() : prev.retention,
        gst: gPct > 0 ? parseFloat((amtNum * gPct / 100).toFixed(2)).toString() : prev.gst
      };
    });
  };

  const handleDeleteMeasurementItem = (index: number) => {
    const updatedItems = formData.measurementItems.filter((_, idx) => idx !== index);
    const newAmount = calculateTotalFromMeasurements(updatedItems);
    setFormData(prev => {
      const amtStr = newAmount > 0 ? parseFloat(newAmount.toFixed(2)).toString() : (updatedItems.length === 0 ? '' : prev.amount);
      const amtNum = parseFloat(amtStr) || 0;
      const tPct = parseFloat(prev.tdsPercent) || 0;
      const rPct = parseFloat(prev.retentionPercent) || 0;
      const gPct = parseFloat(prev.gstPercent) || 0;

      return {
        ...prev,
        measurementItems: updatedItems,
        amount: amtStr,
        tds: tPct > 0 ? parseFloat((amtNum * tPct / 100).toFixed(2)).toString() : prev.tds,
        retention: rPct > 0 ? parseFloat((amtNum * rPct / 100).toFixed(2)).toString() : prev.retention,
        gst: gPct > 0 ? parseFloat((amtNum * gPct / 100).toFixed(2)).toString() : prev.gst
      };
    });
  };

  const handleAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const tPct = parseFloat(formData.tdsPercent) || 0;
    const rPct = parseFloat(formData.retentionPercent) || 0;
    const gPct = parseFloat(formData.gstPercent) || 0;

    setFormData(prev => ({
      ...prev,
      amount: amtVal,
      tds: tPct > 0 ? parseFloat((amt * tPct / 100).toFixed(2)).toString() : prev.tds,
      retention: rPct > 0 ? parseFloat((amt * rPct / 100).toFixed(2)).toString() : prev.retention,
      gst: gPct > 0 ? parseFloat((amt * gPct / 100).toFixed(2)).toString() : prev.gst
    }));
  };

  const handleTdsPercentChange = (pctVal: string) => {
    const pct = parseFloat(pctVal) || 0;
    const amt = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      tdsPercent: pctVal,
      tds: pctVal !== '' ? parseFloat((amt * pct / 100).toFixed(2)).toString() : ''
    }));
  };

  const handleTdsAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const total = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      tds: amtVal,
      tdsPercent: total > 0 && amtVal !== '' ? parseFloat(((amt / total) * 100).toFixed(2)).toString() : ''
    }));
  };

  const handleRetentionPercentChange = (pctVal: string) => {
    const pct = parseFloat(pctVal) || 0;
    const amt = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      retentionPercent: pctVal,
      retention: pctVal !== '' ? parseFloat((amt * pct / 100).toFixed(2)).toString() : ''
    }));
  };

  const handleRetentionAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const total = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      retention: amtVal,
      retentionPercent: total > 0 && amtVal !== '' ? parseFloat(((amt / total) * 100).toFixed(2)).toString() : ''
    }));
  };

  const handleGstPercentChange = (pctVal: string) => {
    const pct = parseFloat(pctVal) || 0;
    const amt = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      gstPercent: pctVal,
      gst: pctVal !== '' ? parseFloat((amt * pct / 100).toFixed(2)).toString() : ''
    }));
  };

  const handleGstAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const total = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      gst: amtVal,
      gstPercent: total > 0 && amtVal !== '' ? parseFloat(((amt / total) * 100).toFixed(2)).toString() : ''
    }));
  };

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        hardCopyFile: base64String,
        hardCopyFileName: file.name,
        hardCopyFileType: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        hardCopyFile: base64String,
        hardCopyFileName: file.name,
        hardCopyFileType: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFormData(prev => ({
      ...prev,
      hardCopyFile: '',
      hardCopyFileName: '',
      hardCopyFileType: ''
    }));
  };

  const downloadFile = (fileDataStr: string, fileName: string, fileType: string) => {
    try {
      const link = document.createElement('a');
      link.href = fileDataStr;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error downloading file", e);
      alert("Failed to download file.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billingData = {
      ...formData,
      amount: Number(formData.amount),
      tds: Number(formData.tds || 0),
      retention: Number(formData.retention || 0),
      gst: Number(formData.gst || 0),
      debitAmount: Number(formData.debitAmount || 0),
      debitReason: formData.debitReason || '',
      billType: formData.billType || 'Running Account',
      measurementItems: formData.measurementItems || [],
      hardCopyFile: formData.hardCopyFile || undefined,
      hardCopyFileName: formData.hardCopyFileName || undefined,
      hardCopyFileType: formData.hardCopyFileType || undefined
    };

    const onProceedSave = (bypassCheck: boolean = false, overrideReason: string = '') => {
      if (editingId) {
        updateBilling(editingId, billingData);
      } else {
        addBilling(billingData);
      }
      
      if (bypassCheck && overrideReason) {
        addOverrideLog(
          user?.username || 'Unknown',
          'Billing Management',
          `Bill No: ${formData.billNo}, Site: ${getProjectName(formData.projectId)}, Month/Period: ${formData.month}, Amount: Rs ${Number(formData.amount).toLocaleString()}`,
          overrideReason
        );
      }
      handleCancel();
    };

    const countMatches = checkBillingDuplicate(
      billings,
      {
        billNo: formData.billNo,
        projectId: formData.projectId,
        month: formData.month
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

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const { totalMonthly, totalYearly, overallTotals } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentYear = new Date().getFullYear().toString();
    
    let monthly = 0;
    let yearly = 0;
    
    let gross = 0;
    let tds = 0;
    let retention = 0;
    let gst = 0;
    let debit = 0;
    let net = 0;
    
    billings.forEach(b => {
      if (b.month === currentMonth) monthly += b.amount;
      if (b.month.startsWith(currentYear)) yearly += b.amount;
      
      const bGross = b.amount || 0;
      const bTds = b.tds ?? 0;
      const bRetention = b.retention ?? 0;
      const bGst = b.gst ?? 0;
      const bDebit = b.debitAmount ?? 0;
      
      gross += bGross;
      tds += bTds;
      retention += bRetention;
      gst += bGst;
      debit += bDebit;
      net += (bGross - bTds - bRetention + bGst - bDebit);
    });
    
    return { 
      totalMonthly: monthly, 
      totalYearly: yearly,
      overallTotals: { gross, tds, retention, gst, debit, net }
    };
  }, [billings]);

  const filteredBillings = useMemo(() => {
    if (!searchQuery.trim()) return billings;
    const query = searchQuery.toLowerCase();
    
    return billings.filter(b => 
      b.billNo.toLowerCase().includes(query) ||
      getProjectName(b.projectId).toLowerCase().includes(query) ||
      b.workNature.toLowerCase().includes(query)
    );
  }, [billings, searchQuery, projects]);

  return (
    <div className="text-[11px]">
      <div className="flex items-center space-x-2 mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1 justify-between">
        <div className="flex items-center space-x-2">
          {!isReadOnly ? (
            <>
              <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1">
                {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
                <span>{isAdding ? 'Cancel' : 'New Bill'}</span>
              </button>
              <button onClick={() => setIsExcelImportOpen(true)} className="sap-btn flex items-center space-x-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100">
                <FileSpreadsheet size={12} className="text-green-600"/>
                <span>Import Excel</span>
              </button>
            </>
          ) : (
            <div className="font-semibold text-gray-700 px-1 py-0.5">Billing Directory (Read Only)</div>
          )}
          
          <input
            type="text"
            className="sap-input w-48 text-[11px]"
            placeholder="Filter by Bill No, Project, Nature..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-black font-bold">×</button>
          )}

          <PDFExportButton
            title="Billing List Report"
            headers={['Bill No', 'Project', 'Work Nature', 'Month', 'Certify Date', 'Gross', 'TDS (-)', 'Retention (-)', 'GST (+)', 'Debit (-)', 'Net Amount']}
            data={filteredBillings.map(b => {
              const netAmount = b.amount - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0);
              return [
                b.billNo,
                getProjectName(b.projectId),
                b.workNature,
                b.month,
                b.certifyDate,
                `Rs. ${b.amount.toLocaleString('en-IN')}`,
                `Rs. ${(b.tds ?? 0).toLocaleString('en-IN')}`,
                `Rs. ${(b.retention ?? 0).toLocaleString('en-IN')}`,
                `Rs. ${(b.gst ?? 0).toLocaleString('en-IN')}`,
                `Rs. ${(b.debitAmount ?? 0).toLocaleString('en-IN')}${b.debitReason ? ` (${b.debitReason})` : ''}`,
                `Rs. ${netAmount.toLocaleString('en-IN')}`
              ];
            })}
            totals={[
              '', '', '', '', 'Totals:', 
              `Rs. ${overallTotals.gross.toLocaleString('en-IN')}`,
              `Rs. ${overallTotals.tds.toLocaleString('en-IN')}`,
              `Rs. ${overallTotals.retention.toLocaleString('en-IN')}`,
              `Rs. ${overallTotals.gst.toLocaleString('en-IN')}`,
              `Rs. ${overallTotals.debit.toLocaleString('en-IN')}`,
              `Rs. ${overallTotals.net.toLocaleString('en-IN')}`
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4 bg-gray-50 p-2 border border-[#8c9ba8]">
        <div className="sap-panel p-2 flex flex-col bg-white">
          <span className="font-semibold text-gray-600 leading-tight">Current Month Billing</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMonthly)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-white">
          <span className="font-semibold text-gray-600 leading-tight">Current Year Billing</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalYearly)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-blue-500">
          <span className="font-semibold text-blue-900 leading-tight">Total Work Amount</span>
          <span className="text-xs font-bold text-blue-900 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.gross)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-red-50/45 border-l-4 border-l-red-500">
          <span className="font-semibold text-red-950 leading-tight">Total TDS Deducted</span>
          <span className="text-xs font-bold text-red-600 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.tds)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-orange-50/45 border-l-4 border-l-orange-400">
          <span className="font-semibold text-orange-950 leading-tight">Total Retention</span>
          <span className="text-xs font-bold text-orange-600 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.retention)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-green-50/45 border-l-4 border-l-green-500">
          <span className="font-semibold text-green-950 leading-tight">Total GST Amount</span>
          <span className="text-xs font-bold text-green-700 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.gst)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-purple-50/45 border-l-4 border-l-purple-500">
          <span className="font-semibold text-purple-950 leading-tight">Total Debit Adjust.</span>
          <span className="text-xs font-bold text-purple-750 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.debit)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-green-50/70 border-l-4 border-l-teal-600">
          <span className="font-semibold text-[#0056b3] leading-tight">Total Net Amount</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.net)}
          </span>
        </div>
      </div>

      <AnimatePresence>
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
          onClick={handleCancel}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="sap-panel relative z-10 w-full max-w-max max-h-[95vh] overflow-y-auto p-4 shadow-[0_10px_40px_rgb(0,0,0,0.2)] bg-[#fcfdfe] rounded-md border-b-4 border-b-[#0056b3]"
        >
          <div className="font-extrabold mb-3 border-b border-[#0056b3]/30 pb-1.5 text-[#0056b3] uppercase tracking-wider text-xs flex justify-between items-center">
            <span>{editingId ? 'Edit Bill Details' : 'New Bill Details'}</span>
            <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-2xl">
            <div className="flex items-center">
              <label className="w-32">Sr No:</label>
              <input required type="text" className="sap-input flex-1" value={formData.srNo} onChange={e => setFormData({...formData, srNo: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Project:</label>
              <select required className="sap-input flex-1" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill No:</label>
              <input required type="text" className="sap-input flex-1" value={formData.billNo} onChange={e => setFormData({...formData, billNo: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill Type:</label>
              <select required className="sap-input flex-1" value={formData.billType} onChange={e => setFormData({...formData, billType: e.target.value})}>
                <option value="Running Account">Running Account</option>
                <option value="Final Bill">Final Bill</option>
                <option value="Extra Item Bill">Extra Item Bill</option>
                <option value="Additional Work Bill">Additional Work Bill</option>
                <option value="Manpower Supply Bill">Manpower Supply Bill</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Work Nature:</label>
              <input required type="text" className="sap-input flex-1" value={formData.workNature} onChange={e => setFormData({...formData, workNature: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Billing Amount:</label>
              <input required type="number" step="any" className="sap-input flex-1" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} />
            </div>
            <div className="flex items-center">
              <label className="w-32">TDS Deducted:</label>
              <div className="flex flex-1 items-center space-x-1">
                <div className="relative w-16">
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pr-4 text-right"
                    value={formData.tdsPercent}
                    placeholder="%"
                    onChange={e => handleTdsPercentChange(e.target.value)}
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">%</span>
                </div>
                <span className="text-gray-400 text-[10px]">or</span>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pl-4.5"
                    value={formData.tds}
                    placeholder="Amount"
                    onChange={e => handleTdsAmountChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">Retention Money:</label>
              <div className="flex flex-1 items-center space-x-1">
                <div className="relative w-16">
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pr-4 text-right"
                    value={formData.retentionPercent}
                    placeholder="%"
                    onChange={e => handleRetentionPercentChange(e.target.value)}
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">%</span>
                </div>
                <span className="text-gray-400 text-[10px]">or</span>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pl-4.5"
                    value={formData.retention}
                    placeholder="Amount"
                    onChange={e => handleRetentionAmountChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">GST Amount:</label>
              <div className="flex flex-1 items-center space-x-1">
                <div className="relative w-16">
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pr-4 text-right"
                    value={formData.gstPercent}
                    placeholder="%"
                    onChange={e => handleGstPercentChange(e.target.value)}
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">%</span>
                </div>
                <span className="text-gray-400 text-[10px]">or</span>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pl-4.5"
                    value={formData.gst}
                    placeholder="Amount"
                    onChange={e => handleGstAmountChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">Debit Amount:</label>
              <div className="relative flex-1">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                <input
                  type="number"
                  step="any"
                  className="sap-input w-full pl-4.5"
                  value={formData.debitAmount}
                  placeholder="Debit Amount"
                  onChange={e => setFormData({...formData, debitAmount: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">Debit Reason:</label>
              <input
                type="text"
                className="sap-input flex-1"
                value={formData.debitReason}
                placeholder="Reason for debit deduction"
                onChange={e => setFormData({...formData, debitReason: e.target.value})}
              />
            </div>
            <div className="flex items-center">
              <label className="w-32">Billing Month:</label>
              <input required type="month" className="sap-input flex-1" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill Certify Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.certifyDate} onChange={e => setFormData({...formData, certifyDate: e.target.value})} />
            </div>

            {/* Measurement Sheet Subform */}
            <div className="col-span-2 border-t border-gray-200 pt-3 mt-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-[#0056b3] text-[11px] uppercase tracking-wider">
                  Bill Measurement Sheet
                </span>
                <button
                  type="button"
                  onClick={handleAddMeasurementItem}
                  className="bg-blue-600 hover:bg-blue-750 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-700 shadow-sm transition-colors cursor-pointer"
                >
                  + Add Item Row
                </button>
              </div>

              {formData.measurementItems.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 border border-dashed border-gray-200 rounded text-gray-400 text-[10px]">
                  No measurement items added. Adding a measurement item will compute bill amount automatically.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded max-h-[220px] overflow-y-auto mb-2">
                  <table className="w-full text-left text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10 text-[9px] uppercase tracking-wider text-gray-600 font-bold">
                        <th className="p-1 w-6 text-center">#</th>
                        <th className="p-1 min-w-[200px]">Description</th>
                        <th className="p-1 w-12 text-center">Unit</th>
                        <th className="p-1 w-16 text-right">Qty Exec</th>
                        <th className="p-1 w-20 text-right">Rate</th>
                        <th className="p-1 w-20 text-right">Amount</th>
                        <th className="p-1 w-14 text-right">Prev Qty</th>
                        <th className="p-1 w-14 text-right">Cumul Qty</th>
                        <th className="p-1 w-6 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.measurementItems.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="p-1 text-center text-gray-400 font-mono text-[9px]">{idx + 1}</td>
                          <td className="p-1">
                            <input
                              type="text"
                              required
                              className="sap-input w-full py-0.5 text-[10px]"
                              value={item.description}
                              placeholder="e.g. Brickwork in superstructure"
                              onChange={e => handleUpdateMeasurementItem(idx, { description: e.target.value })}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              required
                              className="sap-input w-full py-0.5 text-center text-[10px]"
                              value={item.unit}
                              placeholder="Sqm"
                              onChange={e => handleUpdateMeasurementItem(idx, { unit: e.target.value })}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="any"
                              required
                              className="sap-input w-full py-0.5 text-right text-[10px]"
                              value={item.qtyExecuted || ''}
                              placeholder="0"
                              onChange={e => handleUpdateMeasurementItem(idx, { qtyExecuted: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="any"
                              required
                              className="sap-input w-full py-0.5 text-right text-[10px]"
                              value={item.rate || ''}
                              placeholder="0"
                              onChange={e => handleUpdateMeasurementItem(idx, { rate: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-1 text-right font-mono text-gray-600 pr-1 select-none text-[10px]">
                            {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(item.amount || 0)}
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="any"
                              className="sap-input w-full py-0.5 text-right text-[10px]"
                              value={item.prevQty || ''}
                              placeholder="0"
                              onChange={e => handleUpdateMeasurementItem(idx, { prevQty: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-1 text-right font-bold font-mono text-blue-900 pr-1 select-none text-[10px]">
                            {item.cumulativeQty}
                          </td>
                          <td className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteMeasurementItem(idx)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                              title="Delete Item"
                            >
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50/70 font-semibold border-t border-gray-200 text-[10px]">
                        <td colSpan={5} className="p-1 text-right text-gray-500 pr-2">Subtotal Amount:</td>
                        <td className="p-1 text-right font-extrabold text-blue-950 font-mono pr-1 select-none text-[10px]">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculateTotalFromMeasurements(formData.measurementItems))}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="col-span-2 border border-dashed border-gray-300 rounded-sm p-3 bg-gray-50 flex flex-col mt-2">
              <span className="font-semibold text-gray-700 mb-1 text-[11px]">Upload Bill Hard Copy (Optional):</span>
              {!formData.hardCopyFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full py-4 border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-[#0056b3] bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => document.getElementById('hard-copy-upload')?.click()}
                >
                  <Upload size={18} className="text-gray-400 mb-1" />
                  <p className="text-gray-600 font-medium text-center">Drag and drop hard copy here, or <span className="text-[#0056b3] underline">browse file</span></p>
                  <p className="text-gray-400 text-[9px] mt-0.5 text-center">Supports PDF, JPEG, PNG (Max 10MB)</p>
                  <input
                    id="hard-copy-upload"
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="w-full bg-white border border-[#ffebad] rounded-sm p-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <Paperclip size={13} className="text-[#b58900]" />
                    <div className="flex flex-col truncate">
                      <span className="font-semibold text-gray-700 text-[10px] truncate" title={formData.hardCopyFileName}>{formData.hardCopyFileName}</span>
                      <span className="text-[9px] text-[#28a745] font-semibold">Attached & Ready</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadFile(formData.hardCopyFile, formData.hardCopyFileName || 'uploaded-bill', formData.hardCopyFileType || 'application/octet-stream')}
                      className="p-1 text-[#0056b3] hover:bg-blue-50 rounded-sm cursor-pointer"
                      title="Download uploaded file to verify"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer"
                      title="Remove uploaded copy"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-2 flex justify-end pt-2 space-x-2">
              <button type="submit" className="sap-btn flex items-center space-x-1">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update' : 'Save'}</span>
              </button>
              <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1">
                <X size={12} className="text-red-600"/>
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </motion.div>
        </div>
      )}
      </AnimatePresence>

      <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
        <thead className="sap-header">
          <tr>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Sr No</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Bill No</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Work Nature</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Month</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Certify Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Gross Amount</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">TDS (-)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Retention (-)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">GST (+)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-purple-900 bg-purple-50/45">Debit (-)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-semibold bg-green-50">Net Amount</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Hard Copy</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBillings.length === 0 ? (
            <tr>
              <td colSpan={14} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">
                No billing records found.
              </td>
            </tr>
          ) : (
            filteredBillings.map((bill, idx) => {
              const tdsVal = bill.tds ?? 0;
              const retVal = bill.retention ?? 0;
              const gstVal = bill.gst ?? 0;
              const debitVal = bill.debitAmount ?? 0;
              const netAmount = bill.amount - tdsVal - retVal + gstVal - debitVal;

              return (
              <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={bill.id} className="hover:bg-[#e6f2ff] cursor-default">
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.srNo}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{getProjectName(bill.projectId)}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">
                  <div>
                    <span className="font-semibold block">{bill.billNo}</span>
                    {bill.billType && (
                      <span className="inline-block text-[9px] px-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-sm font-semibold leading-normal capitalize mt-0.5 whitespace-nowrap">
                        {bill.billType}
                      </span>
                    )}
                  </div>
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.workNature}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.month}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.certifyDate}</td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.amount)}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600">
                  {tdsVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tdsVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-orange-600">
                  {retVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(retVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700">
                  {gstVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gstVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-purple-700 bg-purple-50/15">
                  {debitVal > 0 ? (
                    <div>
                      <span className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(debitVal)}</span>
                      {bill.debitReason && (
                        <span className="block text-[9px] text-[#4a2e80] italic leading-tight truncate max-w-[150px] mx-auto" title={bill.debitReason}>
                          {bill.debitReason}
                        </span>
                      )}
                    </div>
                  ) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right font-semibold bg-green-50/50 text-[#0056b3]">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netAmount)}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-center font-medium">
                  {bill.hardCopyFile ? (
                    <button
                      onClick={() => downloadFile(bill.hardCopyFile!, bill.hardCopyFileName || 'bill-copy', bill.hardCopyFileType || 'application/octet-stream')}
                      className="text-[#0056b3] hover:text-[#003d80] inline-flex items-center space-x-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded-xs"
                      title={`Download copy: ${bill.hardCopyFileName}`}
                    >
                      <Download size={10} />
                      <span className="text-[9px] font-normal truncate max-w-[70px]" title={bill.hardCopyFileName}>
                        {bill.hardCopyFileName}
                      </span>
                    </button>
                  ) : (
                    <span className="text-gray-400 font-normal italic">None</span>
                  )}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-center font-medium">
                  <button
                    onClick={() => setPrintingBill(bill)}
                    className="text-indigo-600 hover:text-indigo-800 focus:outline-none cursor-pointer"
                    title="Print Bill Certificate & Measurement Sheet"
                  >
                    <Printer size={14} />
                  </button>
                  {!isReadOnly && (
                    <>
                      <button onClick={() => handleEdit(bill)} className="text-blue-600 hover:text-blue-800 ml-2 cursor-pointer inline-block" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setDeleteId(bill.id)} className="text-red-600 hover:text-red-800 ml-2 cursor-pointer inline-block" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </td>
              </motion.tr>
              );
            })
          )}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Bill"
        message="Are you sure you want to delete this bill? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteBilling(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />

      <DuplicateWarningModal
        isOpen={dupModalOpen}
        moduleName="Billing Management"
        warningText="Warning: A billing entry already exists in the database for this Site, Billing Period and Bill Number. Overlap is prohibited."
        duplicates={dupData}
        currentUser={user}
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

      {/* Bill & Measurement Sheet Print Preview Modal */}
      {printingBill && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto no-print-backdrop">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-bill-invoice, #printable-bill-invoice * {
                visibility: visible !important;
              }
              #printable-bill-invoice {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 10px !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          <div className="bg-white rounded-md max-w-4xl w-full p-4.5 shadow-2.5xl relative flex flex-col no-print max-h-[92vh]">
            <div className="flex justify-between items-center pb-2.5 border-b mb-3">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center">
                <Printer size={13} className="mr-2 text-[#0056b3]" />
                Bill Certificate & Measurement Sheet Preview
              </h3>
              <button
                onClick={() => setPrintingBill(null)}
                className="text-gray-400 hover:text-gray-650 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1" id="printable-bill-invoice">
              <div className="p-4 border border-gray-300 bg-white text-gray-800 font-sans rounded-xs">
                {/* Header Title */}
                <div className="text-center mb-5">
                  <h2 className="text-base font-bold uppercase tracking-wider text-[#0056b3] border-b pb-1">
                    BILL CERTIFICATE & MEASUREMENT SHEET
                  </h2>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    Ref No: {printingBill.billNo} — Generated: {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>

                {/* Info block */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] bg-gray-50 p-2.5 border border-gray-200 rounded-sm mb-4">
                  <div>
                    <p className="mb-0.5"><span className="text-gray-500 font-medium select-none">Project Name:</span> <span className="font-bold text-gray-950">{getProjectName(printingBill.projectId)}</span></p>
                    <p className="mb-0.5"><span className="text-gray-500 font-medium select-none">Bill Number:</span> <span className="font-bold text-blue-900">{printingBill.billNo}</span></p>
                    <p className="mb-0.5"><span className="text-gray-500 font-medium select-none">Bill Type:</span> <span className="font-bold text-indigo-950 px-1 bg-indigo-50 border border-indigo-100 rounded text-[10px] capitalize ml-1">{printingBill.billType || 'Running Account'}</span></p>
                  </div>
                  <div>
                    <p className="mb-0.5"><span className="text-gray-500 font-medium select-none">Period/Month:</span> <span className="font-medium text-gray-950">{printingBill.month}</span></p>
                    <p className="mb-0.5"><span className="text-gray-500 font-medium select-none">Certify Date:</span> <span className="font-medium text-gray-950">{printingBill.certifyDate}</span></p>
                    <p className="mb-0.5"><span className="text-gray-500 font-medium select-none">Work Nature:</span> <span className="font-semibold text-gray-900 border-b border-dotted border-gray-300">{printingBill.workNature}</span></p>
                  </div>
                </div>

                {/* Financial overview */}
                <div className="mb-4 text-[11px]">
                  <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider mb-1.5 pb-0.5 border-b-2 border-[#0056b3]">
                    Financial Summary Statement
                  </h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 bg-gray-50/50 p-2 border rounded-sm">
                    <div className="flex justify-between py-0.5 border-b border-gray-200/50">
                      <span className="text-gray-600">Gross Billing Amount:</span>
                      <span className="font-mono font-bold text-blue-900">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-gray-200/50">
                      <span className="text-red-700">TDS Deducted (-):</span>
                      <span className="font-mono text-red-655 font-medium">
                        {printingBill.tds ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.tds) : '₹0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-gray-200/50">
                      <span className="text-orange-700">Retention Deducted (-):</span>
                      <span className="font-mono text-orange-655 font-medium">
                        {printingBill.retention ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.retention) : '₹0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-gray-200/50">
                      <span className="text-green-700">GST Added (+):</span>
                      <span className="font-mono text-green-700 font-medium">
                        {printingBill.gst ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.gst) : '₹0.00'}
                      </span>
                    </div>
                    {printingBill.debitAmount ? (
                      <div className="col-span-2 flex justify-between py-0.5 border-b border-gray-200/50">
                        <span className="text-purple-700">Debit Deduction ({printingBill.debitReason || 'No Reason Specified'}) (-):</span>
                        <span className="font-mono text-purple-600 font-medium">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.debitAmount)}
                        </span>
                      </div>
                    ) : null}
                    <div className="col-span-2 flex justify-between py-1 bg-green-50/70 border-t border-green-300 font-bold px-1.5 mt-1 rounded-sm text-green-950">
                      <span>Total Net Receivable Amount:</span>
                      <span className="font-mono text-green-800">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                          printingBill.amount - (printingBill.tds || 0) - (printingBill.retention || 0) + (printingBill.gst || 0) - (printingBill.debitAmount || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Measurement Annexure Table */}
                <div className="text-[11px]">
                  <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider mb-1.5 pb-0.5 border-b-2 border-indigo-700">
                    Measurement Sheet Schedule
                  </h4>
                  {!printingBill.measurementItems || printingBill.measurementItems.length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic py-3 text-center border border-dashed rounded bg-gray-50">
                      No matching measurement items sheet recorded for this bill.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] border-collapse border border-gray-300/80">
                        <thead>
                          <tr className="bg-gray-100/80 font-bold border-b border-gray-300 text-gray-700">
                            <th className="p-1 border border-gray-300 w-6 text-center">#</th>
                            <th className="p-1 border border-gray-300 min-w-[150px]">Description of Item</th>
                            <th className="p-1 border border-gray-300 w-12 text-center">Unit</th>
                            <th className="p-1 border border-gray-300 w-16 text-right">Qty Executed</th>
                            <th className="p-1 border border-gray-300 w-16 text-right">Rate (₹)</th>
                            <th className="p-1 border border-gray-300 w-20 text-right">Amount (₹)</th>
                            <th className="p-1 border border-gray-300 w-16 text-right">Prev Qty</th>
                            <th className="p-1 border border-gray-300 w-16 text-right">Cumul Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printingBill.measurementItems.map((item: any, imIdx: number) => (
                            <tr key={item.id || imIdx} className="border-b border-gray-200 even:bg-gray-50/30">
                              <td className="p-1 border border-gray-300 text-center font-mono text-gray-500 text-[9px]">{imIdx + 1}</td>
                              <td className="p-1 border border-gray-300 font-medium text-gray-900">{item.description}</td>
                              <td className="p-1 border border-gray-300 text-center text-gray-600">{item.unit}</td>
                              <td className="p-1 border border-gray-300 text-right font-mono text-gray-950">{item.qtyExecuted}</td>
                              <td className="p-1 border border-gray-300 text-right font-mono text-gray-900">
                                {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1 }).format(item.rate)}
                              </td>
                              <td className="p-1 border border-gray-300 text-right font-mono font-semibold text-gray-950">
                                {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(item.amount)}
                              </td>
                              <td className="p-1 border border-gray-300 text-right font-mono text-gray-500">{item.prevQty}</td>
                              <td className="p-1 border border-gray-300 text-right font-mono font-bold text-indigo-900">{item.cumulativeQty}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100/50 font-bold text-gray-900 border-t-2 border-gray-350">
                            <td colSpan={5} className="p-1 border border-gray-300 text-right uppercase text-[9px] tracking-wider text-gray-650">Total Measured Amount:</td>
                            <td className="p-1 border border-gray-300 text-right font-extrabold text-[#0056b3] font-mono">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                                printingBill.measurementItems.reduce((s: number, i: any) => s + (i.amount || 0), 0)
                              )}
                            </td>
                            <td colSpan={2} className="border border-gray-300"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sig blocks */}
                <div className="mt-12 grid grid-cols-2 gap-10 text-center text-[9px] text-gray-500 font-medium">
                  <div className="border-t border-gray-350 border-dashed pt-1">
                    Prepared By: Billing Engineer
                  </div>
                  <div className="border-t border-gray-350 border-dashed pt-1">
                    Checked & Approved By: Authorized signatory
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2.5 border-t mt-3 no-print">
              <button
                onClick={() => setPrintingBill(null)}
                className="sap-btn-secondary py-1 px-3 cursor-pointer text-[11px]"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-sm flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
              >
                <Printer size={12} />
                <span>Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['billNo', 'projectId', 'workNature', 'amount', 'month', 'certifyDate', 'billType']}
        entityName="Contracts Billing"
        projectsContext={projects}
        onUpload={async (data) => {
          for (const item of data) {
            if (!item.projectId || !item.billNo) continue;
            await addBilling({
              srNo: item.srNo || `SR-${Math.floor(1000 + Math.random() * 9000)}`,
              billNo: item.billNo,
              projectId: item.projectId,
              workNature: item.workNature || 'General Civil Work',
              amount: Number(item.amount) || 0,
              month: item.month || new Date().toISOString().substring(0, 7),
              certifyDate: item.certifyDate || new Date().toISOString().split('T')[0],
              billType: item.billType || 'Contractor',
              tds: 0,
              retention: 0,
              gst: 0,
              debitAmount: 0,
              debitReason: '',
              measurementItems: []
            });
          }
        }}
      />
    </div>
  );
};
