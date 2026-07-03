import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2, Upload, Download, Paperclip, Printer, FileSpreadsheet, Eye, RefreshCw, History } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { checkBillingDuplicate, addOverrideLog } from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { PDFExportButton } from '../components/PDFExportButton';
import { exportIndividualBillToPDF, downloadPDF } from '../lib/pdfGenerator';
import { MeasurementItem, Billing as BillingType } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const Billing: React.FC = () => {
  const { user, billings, projects, clientPayments = [], addBilling, updateBilling, deleteBilling, numberingSettings = [], previewNextNumber, consumeNextNumber } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  const billingConfig = numberingSettings?.find((s: any) => s.moduleKey === 'billing');
  const isAutoBillingActive = false; // Turned off as per user request so bill numbers are entered manually

  const [activeTab, setActiveTab] = useState<'records' | 'retention' | 'tds' | 'debit' | 'hold' | 'gst'>('records');
  const [summaryProjectId, setSummaryProjectId] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recordsProjectId, setRecordsProjectId] = useState('');
  const [printingBill, setPrintingBill] = useState<BillingType | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);

  React.useEffect(() => {
    if (projects.length > 0 && !summaryProjectId) {
      setSummaryProjectId('all');
    }
  }, [projects, summaryProjectId]);
  
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
    prevAmount: '' as string | number,
    amount: '',
    extraWorkAmount: '',
    cumulativeAmount: '' as string | number,
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
    holdAmount: '',
    holdReason: '',
    retentionStatus: 'Pending',
    holdStatus: 'Pending',
    billType: 'Running Account',
    measurementItems: [] as MeasurementItem[],
    hardCopyFile: '',
    hardCopyFileName: '',
    hardCopyFileType: '',
    taxInvoiceFile: '',
    taxInvoiceFileName: '',
    taxInvoiceFileType: '',
    gstr3bFile: '',
    gstr3bFileName: '',
    gstr3bFileType: ''
  });

  React.useEffect(() => {
    if (isAutoBillingActive && !editingId && previewNextNumber && isAdding) {
      previewNextNumber('billing', { projectId: formData.projectId }).then(res => {
        if (res && res.active && res.docNumber) {
          setFormData(prev => ({ ...prev, billNo: res.docNumber }));
        }
      });
    }
  }, [formData.projectId, isAutoBillingActive, editingId, isAdding]);

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
    const hldAmt = bill.holdAmount ?? 0;

    setFormData({
      srNo: bill.srNo,
      projectId: bill.projectId,
      billNo: bill.billNo,
      workNature: bill.workNature,
      prevAmount: bill.prevAmount || '',
      amount: billAmt.toString(),
      extraWorkAmount: bill.extraWorkAmount ? bill.extraWorkAmount.toString() : '',
      cumulativeAmount: bill.cumulativeAmount || '',
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
      holdAmount: hldAmt > 0 ? hldAmt.toString() : '',
      holdReason: bill.holdReason || '',
      retentionStatus: bill.retentionStatus || 'Pending',
      holdStatus: bill.holdStatus || 'Pending',
      billType: bill.billType || 'Running Account',
      measurementItems: bill.measurementItems || [],
      hardCopyFile: bill.hardCopyFile || '',
      hardCopyFileName: bill.hardCopyFileName || '',
      hardCopyFileType: bill.hardCopyFileType || '',
      taxInvoiceFile: bill.taxInvoiceFile || '',
      taxInvoiceFileName: bill.taxInvoiceFileName || '',
      taxInvoiceFileType: bill.taxInvoiceFileType || '',
      gstr3bFile: bill.gstr3bFile || '',
      gstr3bFileName: bill.gstr3bFileName || '',
      gstr3bFileType: bill.gstr3bFileType || ''
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
      prevAmount: '',
      amount: '',
      extraWorkAmount: '',
      cumulativeAmount: '',
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
      holdAmount: '',
      holdReason: '',
      retentionStatus: 'Pending',
      holdStatus: 'Pending',
      billType: 'Running Account',
      measurementItems: [],
      hardCopyFile: '',
      hardCopyFileName: '',
      hardCopyFileType: '',
      taxInvoiceFile: '',
      taxInvoiceFileName: '',
      taxInvoiceFileType: '',
      gstr3bFile: '',
      gstr3bFileName: '',
      gstr3bFileType: ''
    });
  };

  const calculateTotalsFromMeasurements = (items: MeasurementItem[]) => {
    return items.reduce((totals, item) => {
      const rt = Number(item.rate || 0);
      const pr = Number(item.prevQty || 0);
      const qty = Number(item.qtyExecuted || 0);
      return {
        prevAmount: totals.prevAmount + (pr * rt),
        amount: totals.amount + (qty * rt),
        cumulativeAmount: totals.cumulativeAmount + ((pr + qty) * rt)
      };
    }, { prevAmount: 0, amount: 0, cumulativeAmount: 0 });
  };

  const handleProjectOrTypeChange = (field: 'projectId' | 'billType', value: string) => {
    setFormData(prev => {
      const nextFormData = { ...prev, [field]: value };
      
      if (isAdding && nextFormData.projectId && (nextFormData.billType || 'Running Account') === 'Running Account') {
        const projectBills = billings
          .filter(b => b.projectId === nextFormData.projectId && (b.billType || 'Running Account') === 'Running Account')
          .sort((a, b) => {
             const srA = String(a.srNo || '').trim();
             const srB = String(b.srNo || '').trim();
             return srA.localeCompare(srB, undefined, { numeric: true, sensitivity: 'base' });
          });
          
        if (projectBills.length > 0) {
          const lastBill = projectBills[projectBills.length - 1];
          let cumulativeAmt = 0;
          let newMeasurementItems = [] as MeasurementItem[];
          
          if (lastBill.measurementItems && lastBill.measurementItems.length > 0) {
            newMeasurementItems = lastBill.measurementItems.map(item => {
               const prevQ = Number(item.cumulativeQty || 0);
               const prevA = Number(item.cumulativeAmount || (prevQ * (item.rate || 0)));
               return {
                  ...item,
                  id: Math.random().toString(36).substring(2, 9),
                  qtyExecuted: 0,
                  amount: 0,
                  prevQty: prevQ,
                  prevAmount: prevA,
                  cumulativeQty: prevQ,
                  cumulativeAmount: prevA
               };
            });
            cumulativeAmt = newMeasurementItems.reduce((s, i) => s + (i.cumulativeAmount || 0), 0);
          } else {
            cumulativeAmt = Number(lastBill.cumulativeAmount || ((Number(lastBill.prevAmount) || 0) + (Number(lastBill.amount) || 0)));
          }
          
          return {
             ...nextFormData,
             measurementItems: newMeasurementItems,
             prevAmount: cumulativeAmt,
             cumulativeAmount: cumulativeAmt,
             amount: ''
          };
        } else {
          return {
             ...nextFormData,
             prevAmount: 0,
             cumulativeAmount: Number(nextFormData.amount) || 0,
             measurementItems: nextFormData.measurementItems.map(item => ({
                ...item,
                prevQty: 0,
                prevAmount: 0,
                cumulativeQty: Number(item.qtyExecuted) || 0,
                cumulativeAmount: Number(item.amount) || 0
             }))
          };
        }
      }
      return nextFormData;
    });
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
      cumulativeQty: 0,
      prevAmount: 0,
      cumulativeAmount: 0
    };
    const updatedItems = [...formData.measurementItems, newItem];
    const totals = calculateTotalsFromMeasurements(updatedItems);
    
    setFormData(prev => {
      const amtStr = totals.amount > 0 ? parseFloat(totals.amount.toFixed(2)).toString() : prev.amount;
      const prevAmtStr = totals.prevAmount > 0 ? parseFloat(totals.prevAmount.toFixed(2)).toString() : prev.prevAmount;
      const cumulAmtStr = totals.cumulativeAmount > 0 ? parseFloat(totals.cumulativeAmount.toFixed(2)).toString() : prev.cumulativeAmount;
      
      const amtNum = parseFloat(amtStr) || 0;
      const tPct = parseFloat(prev.tdsPercent) || 0;
      const rPct = parseFloat(prev.retentionPercent) || 0;
      const gPct = parseFloat(prev.gstPercent) || 0;

      return {
        ...prev,
        measurementItems: updatedItems,
        amount: amtStr,
        prevAmount: prevAmtStr,
        cumulativeAmount: cumulAmtStr,
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
        merged.prevAmount = Number((pr * rt).toFixed(2));
        merged.cumulativeAmount = Number((merged.cumulativeQty * rt).toFixed(2));
        return merged;
      }
      return item;
    });

    const totals = calculateTotalsFromMeasurements(updatedItems);
    setFormData(prev => {
      const amtStr = totals.amount > 0 ? parseFloat(totals.amount.toFixed(2)).toString() : prev.amount;
      const prevAmtStr = totals.prevAmount > 0 ? parseFloat(totals.prevAmount.toFixed(2)).toString() : prev.prevAmount;
      const cumulAmtStr = totals.cumulativeAmount > 0 ? parseFloat(totals.cumulativeAmount.toFixed(2)).toString() : prev.cumulativeAmount;
      
      const amtNum = parseFloat(amtStr) || 0;
      const tPct = parseFloat(prev.tdsPercent) || 0;
      const rPct = parseFloat(prev.retentionPercent) || 0;
      const gPct = parseFloat(prev.gstPercent) || 0;

      return {
        ...prev,
        measurementItems: updatedItems,
        amount: amtStr,
        prevAmount: prevAmtStr,
        cumulativeAmount: cumulAmtStr,
        tds: tPct > 0 ? parseFloat((amtNum * tPct / 100).toFixed(2)).toString() : prev.tds,
        retention: rPct > 0 ? parseFloat((amtNum * rPct / 100).toFixed(2)).toString() : prev.retention,
        gst: gPct > 0 ? parseFloat((amtNum * gPct / 100).toFixed(2)).toString() : prev.gst
      };
    });
  };

  const handleDeleteMeasurementItem = (index: number) => {
    const updatedItems = formData.measurementItems.filter((_, idx) => idx !== index);
    const totals = calculateTotalsFromMeasurements(updatedItems);
    setFormData(prev => {
      const amtStr = totals.amount > 0 ? parseFloat(totals.amount.toFixed(2)).toString() : (updatedItems.length === 0 ? '' : prev.amount);
      const prevAmtStr = totals.prevAmount > 0 ? parseFloat(totals.prevAmount.toFixed(2)).toString() : (updatedItems.length === 0 ? '' : prev.prevAmount);
      const cumulAmtStr = totals.cumulativeAmount > 0 ? parseFloat(totals.cumulativeAmount.toFixed(2)).toString() : (updatedItems.length === 0 ? '' : prev.cumulativeAmount);
      
      const amtNum = parseFloat(amtStr) || 0;
      const tPct = parseFloat(prev.tdsPercent) || 0;
      const rPct = parseFloat(prev.retentionPercent) || 0;
      const gPct = parseFloat(prev.gstPercent) || 0;

      return {
        ...prev,
        measurementItems: updatedItems,
        amount: amtStr,
        prevAmount: prevAmtStr,
        cumulativeAmount: cumulAmtStr,
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

  const handleTaxInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        taxInvoiceFile: base64String,
        taxInvoiceFileName: file.name,
        taxInvoiceFileType: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeTaxInvoice = () => {
    setFormData(prev => ({
      ...prev,
      taxInvoiceFile: '',
      taxInvoiceFileName: '',
      taxInvoiceFileType: ''
    }));
  };

  const handleGstr3bChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        gstr3bFile: base64String,
        gstr3bFileName: file.name,
        gstr3bFileType: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeGstr3b = () => {
    setFormData(prev => ({
      ...prev,
      gstr3bFile: '',
      gstr3bFileName: '',
      gstr3bFileType: ''
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
      prevAmount: Number(formData.prevAmount || 0),
      amount: Number(formData.amount),
      extraWorkAmount: Number(formData.extraWorkAmount || 0),
      cumulativeAmount: Number(formData.cumulativeAmount || 0),
      tds: Number(formData.tds || 0),
      retention: Number(formData.retention || 0),
      gst: Number(formData.gst || 0),
      debitAmount: Number(formData.debitAmount || 0),
      debitReason: formData.debitReason || '',
      holdAmount: Number(formData.holdAmount || 0),
      holdReason: formData.holdReason || '',
      retentionStatus: (formData.retentionStatus || 'Pending') as 'Pending' | 'Partially Cleared' | 'Fully Resolved',
      holdStatus: (formData.holdStatus || 'Pending') as 'Pending' | 'Partially Cleared' | 'Fully Resolved',
      billType: formData.billType || 'Running Account',
      measurementItems: formData.measurementItems || [],
      hardCopyFile: formData.hardCopyFile || undefined,
      hardCopyFileName: formData.hardCopyFileName || undefined,
      hardCopyFileType: formData.hardCopyFileType || undefined,
      taxInvoiceFile: formData.taxInvoiceFile || undefined,
      taxInvoiceFileName: formData.taxInvoiceFileName || undefined,
      taxInvoiceFileType: formData.taxInvoiceFileType || undefined,
      gstr3bFile: formData.gstr3bFile || undefined,
      gstr3bFileName: formData.gstr3bFileName || undefined,
      gstr3bFileType: formData.gstr3bFileType || undefined
    };

    const onProceedSave = async (bypassCheck: boolean = false, overrideReason: string = '') => {
      let finalBillNo = billingData.billNo;
      
      if (!editingId && isAutoBillingActive) {
        const consumeResult = await consumeNextNumber('billing', { projectId: billingData.projectId });
        if (consumeResult && consumeResult.active && consumeResult.docNumber) {
          finalBillNo = consumeResult.docNumber;
        }
      }

      const finalBillingData = { ...billingData, billNo: finalBillNo };

      if (editingId) {
        updateBilling(editingId, finalBillingData);
      } else {
        addBilling(finalBillingData);
      }
      
      if (bypassCheck && overrideReason) {
        addOverrideLog(
          user?.username || 'Unknown',
          'Billing Management',
          `Bill No: ${finalBillNo}, Site: ${getProjectName(formData.projectId)}, Month/Period: ${formData.month}, Amount: Rs ${Number(formData.amount).toLocaleString()}`,
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
    let hold = 0;
    let net = 0;
    
    billings.forEach(b => {
      const extraWork = b.extraWorkAmount || 0;
      if (b.month === currentMonth) monthly += (b.amount + extraWork);
      if (b.month.startsWith(currentYear)) yearly += (b.amount + extraWork);
      
      const bGross = b.amount + extraWork;
      const bTds = b.tds ?? 0;
      const bRetention = b.retention ?? 0;
      const bGst = b.gst ?? 0;
      const bDebit = b.debitAmount ?? 0;
      const bHold = b.holdAmount ?? 0;
      
      gross += bGross;
      tds += bTds;
      retention += bRetention;
      gst += bGst;
      debit += bDebit;
      hold += bHold;
      net += (bGross - bTds - bRetention + bGst - bDebit - bHold);
    });
    
    return { 
      totalMonthly: monthly, 
      totalYearly: yearly,
      overallTotals: { gross, tds, retention, gst, debit, hold, net }
    };
  }, [billings]);

  const summaryProject = useMemo(() => projects.find(p => p.id === summaryProjectId), [projects, summaryProjectId]);

  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const toggleRowExpand = (recordProjectId: string, recordBillNo: string) => {
    const compositeId = `${recordProjectId}_${recordBillNo}`;
    setExpandedBillId(prev => (prev === compositeId ? null : compositeId));
  };

  const renderDrillDownDetails = (recordProjectId: string, recordBillNo: string) => {
    const bill = billings.find(b => b.projectId === recordProjectId && b.billNo === recordBillNo);
    if (!bill) return null;
    
    const tdsVal = bill.tds ?? 0;
    const retVal = bill.retention ?? 0;
    const gstVal = bill.gst ?? 0;
    const debitVal = bill.debitAmount ?? 0;
    const holdVal = bill.holdAmount ?? 0;
    const netAmount = bill.amount - tdsVal - retVal + gstVal - debitVal - holdVal;

    return (
      <div className="p-4 bg-[#f8fafc] border-t border-[#8c9ba8] border-b font-sans text-xs select-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Bill Reference */}
          <div className="space-y-2 border-r border-slate-200 pr-4">
            <h4 className="text-[10px] uppercase font-bold text-[#002f6c] tracking-wider font-sans">📁 Entry Details</h4>
            <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-slate-700 font-sans">
              <span className="text-slate-400">Site / Project:</span>
              <span className="font-bold text-slate-900 truncate" title={getProjectName(bill.projectId)}>{getProjectName(bill.projectId)}</span>

              <span className="text-slate-400">Bill Number:</span>
              <span className="font-bold font-mono text-[#002f6c]">{bill.billNo}</span>

              <span className="text-slate-400">Nature of Work:</span>
              <span className="font-semibold text-slate-900 truncate" title={bill.workNature}>{bill.workNature}</span>

              <span className="text-slate-400">Month / Period:</span>
              <span className="font-semibold text-slate-800">{bill.month}</span>

              <span className="text-slate-400">Certify Date:</span>
              <span className="font-semibold text-slate-800">{bill.certifyDate}</span>

              {bill.billType && (
                <>
                  <span className="text-slate-400">Bill Type:</span>
                  <span className="font-semibold text-indigo-700 font-sans capitalize">{bill.billType}</span>
                </>
              )}
            </div>
          </div>

          {/* Column 2: Financial Contribution Breakdown */}
          <div className="space-y-2 border-r border-slate-200 pr-5">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans">📊 Breakdown of Contribution</h4>
            <div className="space-y-1.5 text-[11px] font-sans">
              <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Gross Bill Amount:</span>
                <span className="font-bold text-slate-800">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.amount)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200">
                <span className="text-slate-500">TDS Deduction (-):</span>
                <span className="font-bold text-red-600">
                  {tdsVal > 0 ? `- ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tdsVal)}` : '₹0.00'}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Retention Money (-):</span>
                <span className="font-bold text-orange-600">
                  {retVal > 0 ? `- ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(retVal)}` : '₹0.00'}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200">
                <span className="text-slate-500">GST Component (+):</span>
                <span className="font-bold text-emerald-600">
                  {gstVal > 0 ? `+ ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gstVal)}` : '₹0.00'}
                </span>
              </div>
              {debitVal > 0 && (
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200 bg-purple-50/30 px-1">
                  <span className="text-purple-800 font-medium">Debit Adjustments (-):</span>
                  <span className="font-bold text-purple-700">
                    - {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(debitVal)}
                  </span>
                </div>
              )}
              {holdVal > 0 && (
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200 bg-amber-50/50 px-1">
                  <span className="text-amber-800 font-medium">Hold Penalties (-):</span>
                  <span className="font-bold text-amber-700">
                    - {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(holdVal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t border-slate-300 font-extrabold text-[#0056b3] bg-blue-50/50 px-1.5 rounded-sm">
                <span>Net Certified Payment:</span>
                <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netAmount)}</span>
              </div>
            </div>
          </div>

          {/* Column 3: Actions & Supporting Documents */}
          <div className="space-y-3 flex flex-col justify-between h-full">
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans">📝 Remarks & Auditing</h4>
              {bill.debitReason && (
                <div className="p-1 px-2 text-[10px] bg-purple-50 border border-purple-100 rounded text-purple-900">
                  <strong className="block text-[9px] uppercase tracking-wide">Debit Remark:</strong>
                  <span>{bill.debitReason}</span>
                </div>
              )}
              {bill.holdReason && (
                <div className="p-1 px-2 text-[10px] bg-amber-50 border border-amber-200 rounded text-amber-950">
                  <strong className="block text-[9px] uppercase tracking-wide">Hold Reason:</strong>
                  <span>{bill.holdReason}</span>
                </div>
              )}
              {bill.hardCopyFileName && (
                <div className="p-1.5 px-2 text-[10px] bg-[#e6f4ea] border border-[#d4edda] rounded text-emerald-900 flex items-center justify-between gap-1">
                  <div className="truncate min-w-0">
                    <strong className="block text-[9px] uppercase tracking-wide">Attachment:</strong>
                    <span className="truncate block font-medium" title={bill.hardCopyFileName}>📎 {bill.hardCopyFileName}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {bill.hardCopyFile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile({ url: bill.hardCopyFile!, name: bill.hardCopyFileName || 'bill-copy', type: bill.hardCopyFileType || 'application/octet-stream' });
                        }}
                        className="p-1 text-emerald-800 hover:bg-emerald-100/50 rounded cursor-pointer"
                        title="Preview Hard Copy"
                      >
                        <Eye size={11} />
                      </button>
                    )}
                    {bill.hardCopyFile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(bill.hardCopyFile!, bill.hardCopyFileName || 'bill-copy', bill.hardCopyFileType || 'application/octet-stream');
                        }}
                        className="p-1 text-emerald-800 hover:bg-emerald-100/50 rounded cursor-pointer"
                        title="Download Hard Copy"
                      >
                        <Download size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!bill.debitReason && !bill.holdReason && !bill.hardCopyFileName && (
                <span className="text-[10px] text-gray-400 italic font-sans block">No special remarks or duplicate over-ride records found.</span>
              )}

              {/* GST Supporting Documents Section */}
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">📁 GST Compliance Files</h5>
                
                {/* Tax Invoice */}
                <div className="flex items-center justify-between p-1.5 px-2 bg-emerald-50/50 border border-emerald-100 rounded text-slate-700">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-emerald-700 font-bold text-[9px]">📄 Invoice:</span>
                    {bill.taxInvoiceFileName ? (
                      <span className="truncate max-w-[120px] font-medium text-slate-800 text-[10px]" title={bill.taxInvoiceFileName}>
                        {bill.taxInvoiceFileName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">Not attached</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {bill.taxInvoiceFile ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile({ url: bill.taxInvoiceFile!, name: bill.taxInvoiceFileName || 'tax-invoice', type: bill.taxInvoiceFileType || 'application/octet-stream' });
                          }}
                          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                          title="Preview Tax Invoice"
                        >
                          <Eye size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(bill.taxInvoiceFile!, bill.taxInvoiceFileName || 'tax-invoice', bill.taxInvoiceFileType || 'application/octet-stream');
                          }}
                          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                          title="Download Tax Invoice"
                        >
                          <Download size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if(confirm("Are you sure you want to remove the Tax Invoice attachment?")) {
                              updateBilling(bill.id, {
                                ...bill,
                                taxInvoiceFile: undefined,
                                taxInvoiceFileName: undefined,
                                taxInvoiceFileType: undefined
                              });
                            }
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Remove Tax Invoice"
                        >
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <label className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-3xs">
                        Attach
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf,image/png,image/jpeg,image/jpg"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64String = event.target?.result as string;
                              updateBilling(bill.id, {
                                ...bill,
                                taxInvoiceFile: base64String,
                                taxInvoiceFileName: file.name,
                                taxInvoiceFileType: file.type
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* GSTR-3B */}
                <div className="flex items-center justify-between p-1.5 px-2 bg-teal-50/50 border border-teal-100 rounded text-slate-700">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-teal-700 font-bold text-[9px]">📊 GSTR-3B:</span>
                    {bill.gstr3bFileName ? (
                      <span className="truncate max-w-[120px] font-medium text-slate-800 text-[10px]" title={bill.gstr3bFileName}>
                        {bill.gstr3bFileName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">Not attached</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {bill.gstr3bFile ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile({ url: bill.gstr3bFile!, name: bill.gstr3bFileName || 'gstr3b', type: bill.gstr3bFileType || 'application/octet-stream' });
                          }}
                          className="p-1 text-teal-700 hover:bg-teal-100 rounded cursor-pointer"
                          title="Preview GSTR-3B"
                        >
                          <Eye size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(bill.gstr3bFile!, bill.gstr3bFileName || 'gstr3b', bill.gstr3bFileType || 'application/octet-stream');
                          }}
                          className="p-1 text-teal-700 hover:bg-teal-100 rounded cursor-pointer"
                          title="Download GSTR-3B"
                        >
                          <Download size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if(confirm("Are you sure you want to remove the GSTR-3B attachment?")) {
                              updateBilling(bill.id, {
                                ...bill,
                                gstr3bFile: undefined,
                                gstr3bFileName: undefined,
                                gstr3bFileType: undefined
                              });
                            }
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Remove GSTR-3B"
                        >
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <label className="text-[9px] bg-teal-600 hover:bg-teal-700 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-3xs">
                        Attach
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf,image/png,image/jpeg,image/jpg"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64String = event.target?.result as string;
                              updateBilling(bill.id, {
                                ...bill,
                                gstr3bFile: base64String,
                                gstr3bFileName: file.name,
                                gstr3bFileType: file.type
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full text-[10px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPrintingBill(bill);
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-1 px-2.5 bg-[#0056b3] text-white hover:bg-blue-800 rounded shadow-3xs cursor-pointer font-bold uppercase transition-colors text-center font-sans"
              >
                <span>🔍 Open Invoice Preview</span>
              </button>
              {bill.hardCopyFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(bill.hardCopyFile!, bill.hardCopyFileName || 'bill-copy', bill.hardCopyFileType || 'application/octet-stream');
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 py-1 px-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-3xs cursor-pointer font-bold uppercase transition-colors text-center font-sans"
                >
                  <span>📁 Download Attachment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDrillDown = (billNo: string, pId: string) => {
    const matchedBill = billings.find(b => b.billNo === billNo && b.projectId === pId);
    if (matchedBill) {
      setPrintingBill(matchedBill);
    }
  };

  const getRetentionStatus = (billId: string, totalHeld: number, savedStatus?: 'Pending' | 'Partially Cleared' | 'Fully Resolved') => {
    const matchingPayments = clientPayments.filter(
      cp => cp.billId === billId && cp.isRetentionPayment === 1 && cp.status !== 'Bounced'
    );
    const totalReleased = matchingPayments.reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);
    
    if (totalReleased >= totalHeld && totalHeld > 0) {
      return 'Fully Resolved';
    } else if (totalReleased > 0 && totalReleased < totalHeld) {
      return 'Partially Cleared';
    }
    return savedStatus || 'Pending';
  };

  const getHoldStatus = (billId: string, totalHeld: number, savedStatus?: 'Pending' | 'Partially Cleared' | 'Fully Resolved') => {
    const matchingPayments = clientPayments.filter(
      cp => cp.billId === billId && (cp.category === 'Hold Release' || cp.remarks?.toLowerCase().includes('hold') || cp.remarks?.toLowerCase().includes('penalty')) && cp.status !== 'Bounced'
    );
    const totalReleased = matchingPayments.reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);
    
    if (totalReleased >= totalHeld && totalHeld > 0) {
      return 'Fully Resolved';
    } else if (totalReleased > 0 && totalReleased < totalHeld) {
      return 'Partially Cleared';
    }
    return savedStatus || 'Pending';
  };

  // 1) Retention Summary Data
  const retentionBills = useMemo(() => {
    return billings
      .filter(b => (summaryProjectId === 'all' || b.projectId === summaryProjectId) && (b.retention ?? 0) > 0)
      .map((b, idx) => ({
        id: b.id,
        srNo: idx + 1,
        projectId: b.projectId,
        retentionAmount: b.retention ?? 0,
        billNo: b.billNo,
        certifyDate: b.certifyDate,
        savedStatus: b.retentionStatus,
      }));
  }, [billings, summaryProjectId]);

  const cumulativeRetention = useMemo(() => {
    return retentionBills.reduce((sum, b) => sum + b.retentionAmount, 0);
  }, [retentionBills]);

  const retentionAmountPaid = useMemo(() => {
    return clientPayments
      .filter(cp => (summaryProjectId === 'all' || cp.projectId === summaryProjectId) && cp.isRetentionPayment === 1 && cp.status !== 'Bounced')
      .reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);
  }, [clientPayments, summaryProjectId]);

  const retentionBalance = cumulativeRetention - retentionAmountPaid;

  // 2) TDS Summary Data
  const tdsBills = useMemo(() => {
    return billings
      .filter(b => (summaryProjectId === 'all' || b.projectId === summaryProjectId) && (b.tds ?? 0) > 0)
      .map((b, idx) => ({
        srNo: idx + 1,
        projectId: b.projectId,
        amount: b.tds ?? 0,
        billNo: b.billNo,
        certifyDate: b.certifyDate,
      }));
  }, [billings, summaryProjectId]);

  const cumulativeTds = useMemo(() => {
    return tdsBills.reduce((sum, b) => sum + b.amount, 0);
  }, [tdsBills]);

  // 3) Debit Summary Data
  const debitBills = useMemo(() => {
    return billings
      .filter(b => (summaryProjectId === 'all' || b.projectId === summaryProjectId) && (b.debitAmount ?? 0) > 0)
      .map((b, idx) => ({
        srNo: idx + 1,
        projectId: b.projectId,
        amount: b.debitAmount ?? 0,
        billNo: b.billNo,
        remarks: b.debitReason || 'No Reason Stated',
        certifyDate: b.certifyDate,
      }));
  }, [billings, summaryProjectId]);

  const totalDebit = useMemo(() => {
    return debitBills.reduce((sum, b) => sum + b.amount, 0);
  }, [debitBills]);

  // 4) Hold Summary Data
  const holdBills = useMemo(() => {
    return billings
      .filter(b => (summaryProjectId === 'all' || b.projectId === summaryProjectId) && (b.holdAmount ?? 0) > 0)
      .map((b, idx) => ({
        id: b.id,
        srNo: idx + 1,
        projectId: b.projectId,
        amount: b.holdAmount ?? 0,
        billNo: b.billNo,
        remarks: b.holdReason || 'No Reason Stated',
        certifyDate: b.certifyDate,
        savedStatus: b.holdStatus,
      }));
  }, [billings, summaryProjectId]);

  const totalHold = useMemo(() => {
    return holdBills.reduce((sum, b) => sum + b.amount, 0);
  }, [holdBills]);

  // 5) GST Summary Data
  const gstBills = useMemo(() => {
    return billings
      .filter(b => (summaryProjectId === 'all' || b.projectId === summaryProjectId) && (b.gst ?? 0) > 0)
      .map((b, idx) => ({
        srNo: idx + 1,
        projectId: b.projectId,
        amount: b.gst ?? 0,
        billNo: b.billNo,
        certifyDate: b.certifyDate,
        gstStatus: b.gstStatus || 'Unpaid'
      }));
  }, [billings, summaryProjectId]);

  const totalGst = useMemo(() => {
    return gstBills.reduce((sum, b) => sum + b.amount, 0);
  }, [gstBills]);

  const filteredBillings = useMemo(() => {
    let result = billings;
    
    if (activeTab === 'records') {
      if (!recordsProjectId) {
        return [];
      }
      result = result.filter(b => b.projectId === recordsProjectId);
      
      // Sort serial wise (by srNo naturally)
      result = [...result].sort((a, b) => {
        const srA = String(a.srNo || '').trim();
        const srB = String(b.srNo || '').trim();
        return srA.localeCompare(srB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.billNo.toLowerCase().includes(query) ||
        getProjectName(b.projectId).toLowerCase().includes(query) ||
        b.workNature.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [billings, searchQuery, projects, recordsProjectId, activeTab]);

  React.useEffect(() => {
    console.log('[Billing Category State Update]', {
      activeTab,
      recordsProjectId,
      searchQuery,
      totalBillings: billings.length,
      filteredBillings: filteredBillings.length,
      billingsList: billings.map(b => ({ id: b.id, billNo: b.billNo, billType: b.billType, projectId: b.projectId }))
    });
  }, [activeTab, recordsProjectId, searchQuery, billings, filteredBillings]);

  const displayedTotals = useMemo(() => {
    let gross = 0;
    let tds = 0;
    let retention = 0;
    let gst = 0;
    let debit = 0;
    let hold = 0;
    let net = 0;

    filteredBillings.forEach(b => {
      const g = b.amount || 0;
      const ex = b.extraWorkAmount || 0;
      const t = b.tds ?? 0;
      const r = b.retention ?? 0;
      const gs = b.gst ?? 0;
      const d = b.debitAmount ?? 0;
      const h = b.holdAmount ?? 0;

      gross += (g + ex);
      tds += t;
      retention += r;
      gst += gs;
      debit += d;
      hold += h;
      net += (g + ex - t - r + gs - d - h);
    });

    return { gross, tds, retention, gst, debit, hold, net };
  }, [filteredBillings]);

  // Historical trend data aggregator for Retention, TDS, Debit, and Hold amounts
  const chartData = useMemo(() => {
    const groups: Record<string, { month: string; Retention: number; TDS: number; Debit: number; Hold: number }> = {};
    
    filteredBillings.forEach(b => {
      const m = b.month || 'Unknown';
      if (!groups[m]) {
        groups[m] = { month: m, Retention: 0, TDS: 0, Debit: 0, Hold: 0 };
      }
      groups[m].Retention += (b.retention ?? 0);
      groups[m].TDS += (b.tds ?? 0);
      groups[m].Debit += (b.debitAmount ?? 0);
      groups[m].Hold += (b.holdAmount ?? 0);
    });

    return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredBillings]);

  const [visibleLines, setVisibleLines] = useState({
    Retention: true,
    TDS: true,
    Debit: true,
    Hold: true
  });

  const formatMonthLabel = (monthStr: any) => {
    const str = String(monthStr || '');
    if (!str || str === 'Unknown') return str;
    const parts = str.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthNum >= 1 && monthNum <= 12) {
        return `${months[monthNum - 1]} ${year}`;
      }
    }
    return str;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="text-[11px]">
      {/* Tab Selectors */}
      <div className="flex flex-wrap border-b border-[#8c9ba8] gap-1 mb-3 print:hidden bg-[#eef2f6]/50 p-1 rounded-t">
        <button
          type="button"
          onClick={() => {
            console.log('[Tab Selection Changed] -> records');
            setActiveTab('records');
          }}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'records'
              ? 'bg-white text-[#0056b3] translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-505 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          📁 Billing Directory
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('[Tab Selection Changed] -> retention');
            setActiveTab('retention');
          }}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'retention'
              ? 'bg-white text-orange-600 translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-505 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          🔒 Retention Register
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('[Tab Selection Changed] -> tds');
            setActiveTab('tds');
          }}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'tds'
              ? 'bg-white text-red-600 translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-505 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          📝 TDS Register
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('[Tab Selection Changed] -> debit');
            setActiveTab('debit');
          }}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'debit'
              ? 'bg-white text-purple-600 translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-505 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          ⚖️ Debit Register
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('[Tab Selection Changed] -> hold');
            setActiveTab('hold');
          }}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'hold'
              ? 'bg-white text-amber-600 translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-505 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          📌 Hold Register
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('[Tab Selection Changed] -> gst');
            setActiveTab('gst');
          }}
          className={`px-2.5 py-1 text-[10px] uppercase font-sans tracking-wide transition-all duration-150 border border-[#8c9ba8] border-b-0 rounded-t cursor-pointer ${
            activeTab === 'gst'
              ? 'bg-white text-emerald-600 translate-y-[1px] z-10 font-extrabold'
              : 'bg-transparent text-gray-505 hover:text-black hover:bg-gray-200/50'
          }`}
        >
          🟢 GST Register
        </button>
      </div>

      {activeTab === 'records' ? (
        <>
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
          <div className="flex items-center space-x-2">
            <select
              className="sap-input text-[11px] w-48"
              value={recordsProjectId}
              onChange={e => {
                console.log('[Records Project Selection Changed] ->', e.target.value);
                setRecordsProjectId(e.target.value);
              }}
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <input
            type="text"
            className="sap-input w-48 text-[11px]"
            placeholder="Search by Bill No..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-black font-bold">×</button>
          )}

          <PDFExportButton
            title="Billing List Report"
            headers={['Bill No', 'Project', 'Work Nature', 'Month', 'Certify Date', 'Gross', 'TDS (-)', 'Retention (-)', 'GST (+)', 'Debit (-)', 'Hold (-)', 'Net Amount']}
            data={filteredBillings.map(b => {
              const netAmount = b.amount + (b.extraWorkAmount ?? 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
              return [
                b.billNo,
                getProjectName(b.projectId),
                b.workNature,
                b.month,
                b.certifyDate,
                `Rs. ${(b.amount + (b.extraWorkAmount ?? 0)).toLocaleString('en-IN')}`,
                `Rs. ${(b.tds ?? 0).toLocaleString('en-IN')}`,
                `Rs. ${(b.retention ?? 0).toLocaleString('en-IN')}`,
                `Rs. ${(b.gst ?? 0).toLocaleString('en-IN')}`,
                `Rs. ${(b.debitAmount ?? 0).toLocaleString('en-IN')}${b.debitReason ? ` (${b.debitReason})` : ''}`,
                `Rs. ${(b.holdAmount ?? 0).toLocaleString('en-IN')}${b.holdReason ? ` (${b.holdReason})` : ''}`,
                `Rs. ${netAmount.toLocaleString('en-IN')}`
              ];
            })}
            totals={[
              '', '', '', '', 'Totals:', 
              `Rs. ${displayedTotals.gross.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.tds.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.retention.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.gst.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.debit.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.hold.toLocaleString('en-IN')}`,
              `Rs. ${displayedTotals.net.toLocaleString('en-IN')}`
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-1.5 mb-4 bg-gray-50 p-2 border border-[#8c9ba8]">
        <div className="sap-panel p-1.5 flex flex-col bg-white">
          <span className="font-semibold text-gray-600 leading-tight">Current Month Billing</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMonthly)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-white">
          <span className="font-semibold text-gray-600 leading-tight">Current Year Billing</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalYearly)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-white border-l-4 border-l-blue-500">
          <span className="font-semibold text-blue-900 leading-tight">Total Work Gross</span>
          <span className="text-xs font-bold text-blue-900 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.gross)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-red-50/45 border-l-4 border-l-red-500">
          <span className="font-semibold text-red-950 leading-tight">Total TDS Deducted</span>
          <span className="text-xs font-bold text-red-600 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.tds)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-orange-50/45 border-l-4 border-l-orange-400">
          <span className="font-semibold text-orange-950 leading-tight">Total Retention</span>
          <span className="text-xs font-bold text-orange-600 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.retention)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-green-50/45 border-l-4 border-l-green-500">
          <span className="font-semibold text-green-950 leading-tight">Total GST Amount</span>
          <span className="text-xs font-bold text-green-700 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.gst)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-purple-50/45 border-l-4 border-l-purple-500">
          <span className="font-semibold text-purple-950 leading-tight">Total Debit Adjust.</span>
          <span className="text-xs font-bold text-purple-750 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.debit)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-amber-50/45 border-l-4 border-l-amber-500">
          <span className="font-semibold text-amber-955 leading-tight">Total Hold Amount</span>
          <span className="text-xs font-bold text-amber-750 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.hold)}
          </span>
        </div>
        <div className="sap-panel p-1.5 flex flex-col bg-green-50/70 border-l-4 border-l-teal-600">
          <span className="font-semibold text-[#0056b3] leading-tight font-black">Net Receivable</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5 font-sans">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.net)}
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
              <select required className="sap-input flex-1" value={formData.projectId} onChange={e => handleProjectOrTypeChange('projectId', e.target.value)}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill No:</label>
              {isAutoBillingActive && !editingId ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <input
                    required
                    readOnly
                    type="text"
                    className="sap-input flex-1 bg-indigo-50 border-indigo-200 text-indigo-800 font-mono text-xs font-semibold cursor-not-allowed"
                    value={formData.billNo || '(Generating...)'}
                  />
                  <span className="bg-indigo-500 text-[9px] text-white font-mono px-1.5 py-0.5 rounded font-bold uppercase" title="Automated sequence based on numbering settings rules.">
                    Auto
                  </span>
                </div>
              ) : (
                <input required type="text" className="sap-input flex-1" value={formData.billNo} onChange={e => setFormData({...formData, billNo: e.target.value})} />
              )}
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill Type:</label>
              <select required className="sap-input flex-1" value={formData.billType} onChange={e => handleProjectOrTypeChange('billType', e.target.value)}>
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
              <label className="w-32">Previous Amount:</label>
              <input type="number" step="any" className="sap-input flex-1" value={formData.prevAmount || ''} onChange={e => setFormData({...formData, prevAmount: parseFloat(e.target.value) || 0, cumulativeAmount: (parseFloat(e.target.value) || 0) + (Number(formData.amount) || 0)})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">This Bill Amount:</label>
              <input required type="number" step="any" className="sap-input flex-1" value={formData.amount} onChange={e => { handleAmountChange(e.target.value); setFormData(prev => ({...prev, cumulativeAmount: Number(prev.prevAmount || 0) + (parseFloat(e.target.value) || 0)})); }} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Extra Work Amount:</label>
              <input type="number" step="any" className="sap-input flex-1" value={formData.extraWorkAmount} onChange={e => setFormData(prev => ({...prev, extraWorkAmount: e.target.value}))} placeholder="Amount not subject to TDS/GST" />
            </div>
            <div className="flex items-center">
              <label className="w-32">Cumulative Amount:</label>
              <input readOnly type="number" step="any" className="sap-input flex-1 bg-gray-50 text-gray-500" value={formData.cumulativeAmount || ''} />
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
              <label className="w-32">Hold Amount:</label>
              <div className="relative flex-1">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                <input
                  type="number"
                  step="any"
                  className="sap-input w-full pl-4.5"
                  value={formData.holdAmount}
                  placeholder="Hold Amount"
                  onChange={e => setFormData({...formData, holdAmount: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">Hold Reason:</label>
              <input
                type="text"
                className="sap-input flex-1"
                value={formData.holdReason}
                placeholder="Reason for hold/penalty"
                onChange={e => setFormData({...formData, holdReason: e.target.value})}
              />
            </div>
            <div className="flex items-center">
              <label className="w-32">Retention Status:</label>
              <select
                className="sap-input flex-1"
                value={formData.retentionStatus}
                onChange={e => setFormData({...formData, retentionStatus: e.target.value})}
              >
                <option value="Pending">Pending</option>
                <option value="Partially Cleared">Partially Cleared</option>
                <option value="Fully Resolved">Fully Resolved</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Hold Status:</label>
              <select
                className="sap-input flex-1"
                value={formData.holdStatus}
                onChange={e => setFormData({...formData, holdStatus: e.target.value})}
              >
                <option value="Pending">Pending</option>
                <option value="Partially Cleared">Partially Cleared</option>
                <option value="Fully Resolved">Fully Resolved</option>
              </select>
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
                        <th className="p-1 w-20 text-right">Rate</th>
                        <th className="p-1 w-16 text-right">Qty Executed</th>
                        <th className="p-1 w-20 text-right">Amount</th>
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
                              value={item.rate || ''}
                              placeholder="0"
                              onChange={e => handleUpdateMeasurementItem(idx, { rate: parseFloat(e.target.value) || 0 })}
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
                          <td className="p-1 text-right font-mono text-gray-900 pr-1 select-none text-[10px]">
                            {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(item.amount || 0)}
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
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculateTotalsFromMeasurements(formData.measurementItems).amount)}
                        </td>
                        <td colSpan={1}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="col-span-2 border border-dashed border-gray-300 rounded-sm p-3 bg-gray-50 flex flex-col mt-2">
              <span className="font-semibold text-gray-700 mb-1 text-[11px]">Upload Bill Hard Copy (Optional):</span>
              <input
                id="hard-copy-upload"
                type="file"
                className="hidden"
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
              />
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
                      onClick={() => setPreviewFile({ url: formData.hardCopyFile, name: formData.hardCopyFileName || 'uploaded-bill', type: formData.hardCopyFileType || 'application/octet-stream' })}
                      className="p-1 text-slate-700 hover:bg-slate-100 rounded-sm cursor-pointer"
                      title="Preview Attachment"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('hard-copy-upload')?.click()}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-sm cursor-pointer"
                      title="Replace Attachment"
                    >
                      <RefreshCw size={12} />
                    </button>
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

            {/* GST-Specific Supporting Documents (Tax Invoice, GSTR-3B) */}
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 border-t border-dashed border-gray-200 pt-3">
              {/* Tax Invoice Upload */}
              <div className="border border-dashed border-emerald-300 rounded p-3 bg-emerald-50/20 flex flex-col">
                <span className="font-semibold text-emerald-800 mb-1 text-[11px] flex items-center gap-1">
                  📄 Attach GST Tax Invoice:
                </span>
                <input
                  id="tax-invoice-upload"
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleTaxInvoiceChange}
                />
                {!formData.taxInvoiceFile ? (
                  <div
                    className="w-full py-3 border border-dashed border-emerald-200 hover:border-emerald-400 rounded flex flex-col items-center justify-center cursor-pointer transition-all bg-white"
                    onClick={() => document.getElementById('tax-invoice-upload')?.click()}
                  >
                    <Upload size={14} className="text-emerald-500 mb-1" />
                    <p className="text-gray-600 text-[10px] font-medium text-center">Click to browse Tax Invoice</p>
                    <p className="text-gray-400 text-[8px] mt-0.5 text-center">PDF, PNG, JPEG (Max 10MB)</p>
                  </div>
                ) : (
                  <div className="w-full bg-white border border-emerald-200 rounded p-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip size={13} className="text-emerald-600 animate-pulse" />
                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-gray-700 text-[10px] truncate" title={formData.taxInvoiceFileName}>{formData.taxInvoiceFileName}</span>
                        <span className="text-[9px] text-emerald-600 font-semibold">Invoice Attached</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ url: formData.taxInvoiceFile, name: formData.taxInvoiceFileName || 'tax-invoice', type: formData.taxInvoiceFileType || 'application/octet-stream' })}
                        className="p-1 text-slate-700 hover:bg-slate-50 rounded cursor-pointer"
                        title="Preview Invoice"
                      >
                        <Eye size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('tax-invoice-upload')?.click()}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                        title="Replace Invoice"
                      >
                        <RefreshCw size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFile(formData.taxInvoiceFile, formData.taxInvoiceFileName || 'tax-invoice', formData.taxInvoiceFileType || 'application/octet-stream')}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer animate-none"
                        title="Download Invoice"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={removeTaxInvoice}
                        className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Remove Invoice"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* GSTR-3B Upload */}
              <div className="border border-dashed border-teal-300 rounded p-3 bg-teal-50/20 flex flex-col">
                <span className="font-semibold text-teal-800 mb-1 text-[11px] flex items-center gap-1">
                  📊 Attach GSTR-3B Filing Copy:
                </span>
                <input
                  id="gstr3b-upload"
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleGstr3bChange}
                />
                {!formData.gstr3bFile ? (
                  <div
                    className="w-full py-3 border border-dashed border-teal-200 hover:border-teal-400 rounded flex flex-col items-center justify-center cursor-pointer transition-all bg-white"
                    onClick={() => document.getElementById('gstr3b-upload')?.click()}
                  >
                    <Upload size={14} className="text-teal-500 mb-1" />
                    <p className="text-gray-600 text-[10px] font-medium text-center">Click to browse GSTR-3B</p>
                    <p className="text-gray-400 text-[8px] mt-0.5 text-center">PDF, PNG, JPEG (Max 10MB)</p>
                  </div>
                ) : (
                  <div className="w-full bg-white border border-teal-200 rounded p-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip size={13} className="text-teal-600 animate-pulse" />
                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-gray-700 text-[10px] truncate" title={formData.gstr3bFileName}>{formData.gstr3bFileName}</span>
                        <span className="text-[9px] text-teal-600 font-semibold">GSTR-3B Attached</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ url: formData.gstr3bFile, name: formData.gstr3bFileName || 'gstr3b', type: formData.gstr3bFileType || 'application/octet-stream' })}
                        className="p-1 text-slate-700 hover:bg-slate-50 rounded cursor-pointer"
                        title="Preview GSTR-3B"
                      >
                        <Eye size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('gstr3b-upload')?.click()}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                        title="Replace GSTR-3B"
                      >
                        <RefreshCw size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFile(formData.gstr3bFile, formData.gstr3bFileName || 'gstr3b', formData.gstr3bFileType || 'application/octet-stream')}
                        className="p-1 text-teal-600 hover:bg-teal-50 rounded cursor-pointer animate-none"
                        title="Download GSTR-3B"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={removeGstr3b}
                        className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Remove GSTR-3B"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

          {formData.projectId && formData.billType === 'Running Account' && (
            <details className="mt-4 border border-gray-200 rounded group bg-white shadow-sm">
              <summary className="p-2 bg-gray-50 text-[10px] font-bold text-gray-700 cursor-pointer flex justify-between items-center group-open:border-b border-gray-200 uppercase tracking-wider select-none hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1.5">
                  <History size={13} className="text-indigo-600" />
                  Previous RA Bills History
                </div>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-2 max-h-[150px] overflow-y-auto">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10 text-[9px] uppercase tracking-wider text-gray-600 font-bold">
                    <tr>
                      <th className="p-1.5">Certify Date</th>
                      <th className="p-1.5">Bill No</th>
                      <th className="p-1.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billings
                      .filter(b => b.projectId === formData.projectId && (b.billType || 'Running Account') === 'Running Account' && b.id !== editingId)
                      .sort((a, b) => {
                        const srA = String(a.srNo || '').trim();
                        const srB = String(b.srNo || '').trim();
                        return srB.localeCompare(srA, undefined, { numeric: true, sensitivity: 'base' });
                      })
                      .map(b => (
                        <tr key={b.id} className="border-b border-gray-50 hover:bg-blue-50/30">
                          <td className="p-1.5">{b.certifyDate ? new Date(b.certifyDate).toLocaleDateString('en-IN') : b.month}</td>
                          <td className="p-1.5 font-mono">{b.billNo}</td>
                          <td className="p-1.5 text-right font-mono text-gray-900 font-semibold">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(b.amount || 0)}
                          </td>
                        </tr>
                      ))
                    }
                    {billings.filter(b => b.projectId === formData.projectId && (b.billType || 'Running Account') === 'Running Account' && b.id !== editingId).length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-gray-400 italic">No previous RA bills found for this project.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          )}

        </motion.div>
        </div>
      )}
      </AnimatePresence>
      
      {/* Historical Deductions Trend Analysis Chart */}
      {filteredBillings.length > 0 && (
        <div className="mb-4 bg-white border border-[#8c9ba8] p-3 text-sans shadow-3xs rounded print:hidden">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 mb-3 gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                📊 EXECUTIVE MONTHLY DEDUCTIONS TREND ANALYSIS
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                Real-time monthly aggregate timeline tracking of critical project-level withholdings and debit adjustments.
              </p>
            </div>

            {/* Line Toggles */}
            <div className="flex items-center space-x-3 text-[10px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded shadow-3xs">
              <span className="font-semibold text-slate-500">Toggle Metrics:</span>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleLines.TDS}
                  onChange={() => setVisibleLines(prev => ({ ...prev, TDS: !prev.TDS }))}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-450 w-3.5 h-3.5 cursor-pointer accent-red-650"
                />
                <span className="text-red-750 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 block" /> TDS
                </span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleLines.Retention}
                  onChange={() => setVisibleLines(prev => ({ ...prev, Retention: !prev.Retention }))}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-450 w-3.5 h-3.5 cursor-pointer accent-orange-650"
                />
                <span className="text-orange-750 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-650 block" /> Retention
                </span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleLines.Debit}
                  onChange={() => setVisibleLines(prev => ({ ...prev, Debit: !prev.Debit }))}
                  className="rounded border-gray-300 text-purple-650 focus:ring-purple-400 w-3.5 h-3.5 cursor-pointer accent-purple-650"
                />
                <span className="text-purple-750 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-650 block" /> Debit
                </span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleLines.Hold}
                  onChange={() => setVisibleLines(prev => ({ ...prev, Hold: !prev.Hold }))}
                  className="rounded border-gray-300 text-amber-650 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer accent-amber-655"
                />
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-650 block" /> Hold
                </span>
              </label>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="py-8 text-center text-slate-400 italic font-sans text-xs bg-slate-50 border border-dashed border-slate-200">
              No historical data points available to plot.
            </div>
          ) : (
            <div className="w-full h-56 select-none bg-slate-50/25 border border-dashed border-slate-200 p-2 rounded">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: 25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthLabel}
                    stroke="#475569"
                    tick={{ fontSize: 9, fontFamily: 'sans-serif' }}
                  />
                  <YAxis
                    stroke="#475569"
                    tickFormatter={(val) => {
                      if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
                      return `₹${val}`;
                    }}
                    tick={{ fontSize: 9, fontFamily: 'sans-serif' }}
                  />
                  <Tooltip
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-xs border border-slate-300 shadow-md p-2 rounded text-[10px] font-sans">
                            <p className="font-extrabold text-slate-800 mb-1 border-b border-slate-200 pb-0.5">
                              📅 {formatMonthLabel(String(label))}
                            </p>
                            <div className="space-y-1 font-mono">
                              {payload.map((item: any) => (
                                <p key={item.name} style={{ color: item.color }} className="flex justify-between gap-4 font-semibold">
                                  <span>{item.name}:</span>
                                  <span>{formatCurrency(item.value)}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend content={() => null} />
                  {visibleLines.TDS && (
                    <Line
                      type="monotone"
                      dataKey="TDS"
                      stroke="#ef4444"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      name="TDS"
                    />
                  )}
                  {visibleLines.Retention && (
                    <Line
                      type="monotone"
                      dataKey="Retention"
                      stroke="#f97316"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      name="Retention"
                    />
                  )}
                  {visibleLines.Debit && (
                    <Line
                      type="monotone"
                      dataKey="Debit"
                      stroke="#9333ea"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      name="Debit"
                    />
                  )}
                  {visibleLines.Hold && (
                    <Line
                      type="monotone"
                      dataKey="Hold"
                      stroke="#d97706"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      name="Hold"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

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
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-amber-900 bg-amber-50/45">Hold (-)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-semibold bg-green-50">Net Amount</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Hard Copy</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBillings.length === 0 ? (
            <tr>
              <td colSpan={15} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">
                {!recordsProjectId ? 'Please select a Project to view billing records.' : 'No billing records found.'}
              </td>
            </tr>
          ) : (
            filteredBillings.map((bill, idx) => {
              const tdsVal = bill.tds ?? 0;
              const retVal = bill.retention ?? 0;
              const gstVal = bill.gst ?? 0;
              const debitVal = bill.debitAmount ?? 0;
              const holdVal = bill.holdAmount ?? 0;
              const extraWorkVal = bill.extraWorkAmount ?? 0;
              const netAmount = bill.amount + extraWorkVal - tdsVal - retVal + gstVal - debitVal - holdVal;
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
                <td className="border border-[#8c9ba8] px-2 py-1 text-right font-sans">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.amount + extraWorkVal)}
                  {extraWorkVal > 0 && <span className="block text-[8px] text-gray-500 italic mt-0.5">Includes {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(extraWorkVal)} Extra</span>}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600 font-sans">
                  {tdsVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tdsVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-orange-600 font-sans">
                  {retVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(retVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700 font-sans">
                  {gstVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gstVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-purple-700 bg-purple-50/15 font-sans">
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
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-amber-700 bg-amber-50/15 font-sans">
                  {holdVal > 0 ? (
                    <div>
                      <span className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(holdVal)}</span>
                      {bill.holdReason && (
                        <span className="block text-[9px] text-amber-900 italic leading-tight truncate max-w-[150px] mx-auto" title={bill.holdReason}>
                          {bill.holdReason}
                        </span>
                      )}
                    </div>
                  ) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold bg-green-50/50 text-[#0056b3] font-sans">
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
        <tfoot>
          <tr className="sticky bottom-0 bg-[#eef2f6] border-t-2 border-[#8c9ba8] font-bold text-gray-900 shadow-[0_-3px_6px_rgba(0,0,0,0.06)] select-none">
            <td colSpan={6} className="border border-[#8c9ba8] px-2 py-2 text-right font-bold uppercase text-[10px] text-slate-600 bg-[#eef2f6]">
              Total Displayed Sum:
            </td>
            <td className="border border-[#8c9ba8] px-2 py-2 text-right text-slate-800 font-extrabold font-sans bg-[#eef2f6]">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.gross)}
            </td>
            <td className="border border-[#8c9ba8] px-2 py-2 text-right text-red-700 font-extrabold font-sans bg-[#eef2f6]">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.tds)}
            </td>
            <td className="border border-[#8c9ba8] px-2 py-2 text-right text-orange-600 font-extrabold font-sans bg-[#eef2f6]">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.retention)}
            </td>
            <td className="border border-[#8c9ba8] px-2 py-2 text-right text-green-700 font-extrabold font-sans bg-[#eef2f6]">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.gst)}
            </td>
            <td className="border border-[#8c9ba8] px-2 py-2 text-right text-purple-750 font-extrabold font-sans bg-[#eef2f6] bg-purple-50/15">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.debit)}
            </td>
            <td className="border border-[#8c9ba8] px-2 py-2 text-right text-amber-700 font-extrabold font-sans bg-[#eef2f6] bg-amber-50/15">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.hold)}
            </td>
            <td className="border border-[#8c9ba8] px-2 py-2 text-right text-[#0056b3] font-black font-sans bg-green-50/50">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayedTotals.net)}
            </td>
            <td colSpan={2} className="border border-[#8c9ba8] px-2 py-2 bg-[#eef2f6]"></td>
          </tr>
        </tfoot>
      </table>
        </>
      ) : activeTab === 'retention' ? (
        <div className="space-y-4 print:space-y-0">
          {/* Site-wise Retention Header / Project Selector */}
          <div className="bg-[#f0f4f8] border border-[#8c9ba8] p-2.5 rounded shadow-xs mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Select Site / Project:</span>
              <select
                className="sap-input font-bold text-[#0056b3] text-xs bg-white border-slate-400 focus:bg-white pr-6 py-1 cursor-pointer"
                value={summaryProjectId}
                onChange={e => setSummaryProjectId(e.target.value)}
              >
                <option value="all">🌐 All Projects (Consolidated)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    🏗️ {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <PDFExportButton
              title="Retention Money Register Report"
              headers={['Sr No', 'Project', 'Bill No', 'Certify Date', 'Retention Deducted']}
              data={retentionBills.map(b => [
                b.srNo.toString(),
                getProjectName(b.projectId),
                b.billNo,
                b.certifyDate,
                `Rs. ${b.retentionAmount.toLocaleString('en-IN')}`
              ])}
              totals={[
                '', '', 'Totals:', '', `Rs. ${cumulativeRetention.toLocaleString('en-IN')}`
              ]}
            />
          </div>

          {/* Retention Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-blue-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Cumulative Retention Deducted</span>
              <span className="text-sm font-black text-[#0056b3] mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(cumulativeRetention)}
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">{retentionBills.length} deductions</span>
            </div>
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-emerald-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Amount Released & Paid</span>
              <span className="text-sm font-black text-emerald-600 mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(retentionAmountPaid)}
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">from release payments</span>
            </div>
            <div className="sap-panel p-2.5 flex flex-col bg-amber-50/70 border-l-4 border-l-amber-500 shadow-xs">
              <span className="font-bold text-amber-950 text-[10px] uppercase tracking-wider leading-tight">Net Outstanding Balance</span>
              <span className="text-sm font-black text-amber-700 mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(retentionBalance)}
              </span>
              <span className="text-[9px] text-amber-900/60 font-mono mt-0.5">receivable from clients</span>
            </div>
          </div>

          {/* Retention Table */}
          <div className="bg-white border border-[#8c9ba8] rounded overflow-hidden shadow-xs">
            <div className="bg-[#e6f2ff] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
              <span className="font-bold text-[#002f6c] text-[11px] uppercase tracking-wider flex items-center">
                🔒 Retention Money Register List
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-[#8c9ba8] text-[9px] uppercase font-bold text-slate-700">
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-center w-12 font-semibold">Sr No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold">Project / Site Name</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Bill No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Certify Date</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-right font-semibold pr-4 w-44">Retention Deducted Amount</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-center w-36 font-semibold">Status</th>
                    <th className="p-1.5 px-3 text-center font-semibold w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                  {retentionBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic font-sans text-xs">
                        No retention deductions recorded for the selected search filter.
                      </td>
                    </tr>
                  ) : (
                    retentionBills.map(b => {
                      const isExpanded = expandedBillId === `${b.projectId}_${b.billNo}`;
                      const rectStatus = getRetentionStatus(b.id, b.retentionAmount, b.savedStatus);
                      return (
                        <React.Fragment key={`${b.projectId}_${b.billNo}`}>
                          <tr 
                            className={`hover:bg-blue-50/70 hover:text-blue-900 cursor-pointer transition-all duration-150 group ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                            title="Click to toggle details for this bill"
                            onClick={() => toggleRowExpand(b.projectId, b.billNo)}
                          >
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans">
                              <span className="inline-flex items-center gap-1">
                                <span className={`text-[8px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                {b.srNo}
                              </span>
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{getProjectName(b.projectId)}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans font-semibold text-[#0056b3] group-hover:underline">{b.billNo}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans text-slate-600">{b.certifyDate}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-right text-orange-600 font-extrabold pr-4">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(b.retentionAmount)}
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans">
                              {rectStatus === 'Fully Resolved' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Fully Resolved
                                </span>
                              ) : rectStatus === 'Partially Cleared' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Partially Cleared
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-1.5 px-3 text-center">
                              <span className={`text-[10px] font-sans font-bold inline-flex items-center gap-1 border rounded px-1.5 py-0.5 shadow-3xs transition-colors ${
                                isExpanded 
                                  ? 'bg-[#0056b3] text-white border-[#0056b3]' 
                                  : 'text-[#0056b3] bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-800'
                              }`}>
                                {isExpanded ? 'Collapse' : '🔍 Drill Down'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 border-b border-slate-200">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden bg-[#f8fafc]"
                                >
                                  {renderDrillDownDetails(b.projectId, b.billNo)}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {retentionBills.length > 0 && (
                    <tr className="bg-slate-50/85 border-t border-slate-300 font-bold text-gray-900">
                      <td colSpan={4} className="p-2 px-3 text-right font-sans uppercase font-extrabold text-[9px] text-slate-500">Cumulative Register Total:</td>
                      <td className="p-2 px-3 text-right font-mono text-orange-700 font-black pr-4 text-xs border-r border-slate-200">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(cumulativeRetention)}
                      </td>
                      <td className="border-r border-slate-200"></td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'tds' ? (
        <div className="space-y-4 print:space-y-0">
          {/* Site-wise TDS Header / Project Selector */}
          <div className="bg-[#f0f4f8] border border-[#8c9ba8] p-2.5 rounded shadow-xs mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Select Site / Project:</span>
              <select
                className="sap-input font-bold text-[#0056b3] text-xs bg-white border-slate-400 focus:bg-white pr-6 py-1 cursor-pointer"
                value={summaryProjectId}
                onChange={e => setSummaryProjectId(e.target.value)}
              >
                <option value="all">🌐 All Projects (Consolidated)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    🏗️ {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <PDFExportButton
              title="TDS Deduction Register Report"
              headers={['Sr No', 'Project', 'Bill No', 'Certify Date', 'TDS Amount']}
              data={tdsBills.map(b => [
                b.srNo.toString(),
                getProjectName(b.projectId),
                b.billNo,
                b.certifyDate,
                `Rs. ${b.amount.toLocaleString('en-IN')}`
              ])}
              totals={[
                '', '', 'Totals:', '', `Rs. ${cumulativeTds.toLocaleString('en-IN')}`
              ]}
            />
          </div>

          {/* TDS Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-red-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Cumulative TDS Amount</span>
              <span className="text-sm font-black text-red-650 mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(cumulativeTds)}
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">deducted total amount</span>
            </div>
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-rose-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Total Bill Deductions</span>
              <span className="text-sm font-black text-rose-800 mt-1">
                {tdsBills.length} Bills
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">recorded entries with TDS</span>
            </div>
          </div>

          {/* TDS Table */}
          <div className="bg-white border border-[#8c9ba8] rounded overflow-hidden shadow-xs">
            <div className="bg-[#fcf3f3] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
              <span className="font-bold text-[#9c1b1b] text-[11px] uppercase tracking-wider flex items-center">
                📝 TDS Register List
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-[#8c9ba8] text-[9px] uppercase font-bold text-slate-700">
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-center w-12 font-semibold">SR No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold">Project / Site Name</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Bill No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Certify Date</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-right font-semibold pr-4 w-44">TDS Amount</th>
                    <th className="p-1.5 px-3 text-center font-semibold w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                  {tdsBills.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic font-sans text-xs">
                        No TDS deductions recorded for the selected search filter.
                      </td>
                    </tr>
                  ) : (
                    tdsBills.map(b => {
                      const isExpanded = expandedBillId === `${b.projectId}_${b.billNo}`;
                      return (
                        <React.Fragment key={`${b.projectId}_${b.billNo}`}>
                          <tr 
                            className={`hover:bg-red-50/20 hover:text-red-955 cursor-pointer transition-all duration-150 group ${isExpanded ? 'bg-red-50/10 font-semibold' : ''}`}
                            title="Click to toggle details for this bill"
                            onClick={() => toggleRowExpand(b.projectId, b.billNo)}
                          >
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans">
                              <span className="inline-flex items-center gap-1">
                                <span className={`text-[8px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                {b.srNo}
                              </span>
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{getProjectName(b.projectId)}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans font-semibold text-[#0056b3] group-hover:underline">{b.billNo}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans text-slate-600">{b.certifyDate}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-right text-red-650 font-extrabold pr-4">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(b.amount)}
                            </td>
                            <td className="p-1.5 px-3 text-center">
                              <span className={`text-[10px] font-sans font-bold inline-flex items-center gap-1 border rounded px-1.5 py-0.5 shadow-3xs transition-colors ${
                                isExpanded 
                                  ? 'bg-red-700 text-white border-red-700' 
                                  : 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-950'
                              }`}>
                                {isExpanded ? 'Collapse' : '🔍 Drill Down'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="p-0 border-b border-slate-200">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden bg-[#f8fafc]"
                                >
                                  {renderDrillDownDetails(b.projectId, b.billNo)}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {tdsBills.length > 0 && (
                    <tr className="bg-slate-50/85 border-t border-slate-300 font-bold text-gray-900">
                      <td colSpan={4} className="p-2 px-3 text-right font-sans uppercase font-extrabold text-[9px] text-slate-500">Cumulative TDS Total:</td>
                      <td className="p-2 px-3 text-right font-mono text-red-705 font-black pr-4 text-xs border-r border-slate-200">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(cumulativeTds)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'debit' ? (
        <div className="space-y-4 print:space-y-0">
          {/* Site-wise Debit Header / Project Selector */}
          <div className="bg-[#f0f4f8] border border-[#8c9ba8] p-2.5 rounded shadow-xs mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Select Site / Project:</span>
              <select
                className="sap-input font-bold text-[#0056b3] text-xs bg-white border-slate-400 focus:bg-white pr-6 py-1 cursor-pointer"
                value={summaryProjectId}
                onChange={e => setSummaryProjectId(e.target.value)}
              >
                <option value="all">🌐 All Projects (Consolidated)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    🏗️ {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <PDFExportButton
              title="Debit Deduction Register Report"
              headers={['Sr No', 'Project', 'Bill No', 'Certify Date', 'Debit Amount', 'Deduction Reason / Remarks']}
              data={debitBills.map(b => [
                b.srNo.toString(),
                getProjectName(b.projectId),
                b.billNo,
                b.certifyDate,
                `Rs. ${b.amount.toLocaleString('en-IN')}`,
                b.remarks
              ])}
              totals={[
                '', '', 'Totals:', '', `Rs. ${totalDebit.toLocaleString('en-IN')}`, ''
              ]}
            />
          </div>

          {/* Debit Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-purple-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Total Debit Adjustments</span>
              <span className="text-sm font-black text-purple-700 mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalDebit)}
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">recovered debit amounts</span>
            </div>
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-indigo-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Debit Transaction Count</span>
              <span className="text-sm font-black text-indigo-800 mt-1">
                {debitBills.length} Items
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">debit deductions noted</span>
            </div>
          </div>

          {/* Debit Table */}
          <div className="bg-white border border-[#8c9ba8] rounded overflow-hidden shadow-xs">
            <div className="bg-[#f7edf9] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
              <span className="font-bold text-[#6c287a] text-[11px] uppercase tracking-wider flex items-center">
                ⚖️ Debit Deduction Register List
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-[#8c9ba8] text-[9px] uppercase font-bold text-slate-700">
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-center w-12 font-semibold">SR</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold">Project / Site Name</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Bill No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Certify Date</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-right pr-4 w-40">Debit Amt</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-left">Deduction Reason / Special Remarks</th>
                    <th className="p-1.5 px-3 text-center font-semibold w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                  {debitBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic font-sans text-xs">
                        No debit adjustments recorded for the selected search filter.
                      </td>
                    </tr>
                  ) : (
                    debitBills.map(b => {
                      const isExpanded = expandedBillId === `${b.projectId}_${b.billNo}`;
                      return (
                        <React.Fragment key={`${b.projectId}_${b.billNo}`}>
                          <tr 
                            className={`hover:bg-purple-50/40 hover:text-purple-950 cursor-pointer transition-all duration-150 group ${isExpanded ? 'bg-purple-50/20 font-semibold' : ''}`}
                            title="Click to toggle details for this bill"
                            onClick={() => toggleRowExpand(b.projectId, b.billNo)}
                          >
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans">
                              <span className="inline-flex items-center gap-1">
                                <span className={`text-[8px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                {b.srNo}
                              </span>
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{getProjectName(b.projectId)}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans font-semibold text-[#0056b3] group-hover:underline">{b.billNo}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans text-slate-650">{b.certifyDate}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-right text-purple-700 font-bold pr-4">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(b.amount)}
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-700 font-medium text-left break-words">{b.remarks}</td>
                            <td className="p-1.5 px-3 text-center font-sans">
                              <span className={`text-[10px] font-bold inline-flex items-center gap-1 border rounded px-1.5 py-0.5 shadow-3xs transition-colors ${
                                isExpanded 
                                  ? 'bg-purple-700 text-white border-purple-705' 
                                  : 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:text-purple-950'
                              }`}>
                                {isExpanded ? 'Collapse' : '🔍 Drill Down'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 border-b border-purple-100">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden bg-[#f8fafc]"
                                >
                                  {renderDrillDownDetails(b.projectId, b.billNo)}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {debitBills.length > 0 && (
                    <tr className="bg-slate-50/85 border-t border-slate-300 font-bold text-gray-900">
                      <td colSpan={4} className="p-2 px-3 text-right font-sans uppercase font-extrabold text-[9px] text-slate-500">Overall Debit Total:</td>
                      <td className="p-2 px-3 text-right font-mono text-purple-700 font-black pr-4 text-xs border-r border-slate-200">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalDebit)}
                      </td>
                      <td className="border-r border-slate-200"></td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'hold' ? (
        <div className="space-y-4 print:space-y-0">
          {/* Site-wise Hold Header / Project Selector */}
          <div className="bg-[#f0f4f8] border border-[#8c9ba8] p-2.5 rounded shadow-xs mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Select Site / Project:</span>
              <select
                className="sap-input font-bold text-[#0056b3] text-xs bg-white border-slate-400 focus:bg-white pr-6 py-1 cursor-pointer"
                value={summaryProjectId}
                onChange={e => setSummaryProjectId(e.target.value)}
              >
                <option value="all">🌐 All Projects (Consolidated)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    🏗️ {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <PDFExportButton
              title="Hold Deduction Register Report"
              headers={['Sr No', 'Project', 'Bill No', 'Certify Date', 'Hold Amount', 'Hold Reason / Remarks']}
              data={holdBills.map(b => [
                b.srNo.toString(),
                getProjectName(b.projectId),
                b.billNo,
                b.certifyDate,
                `Rs. ${b.amount.toLocaleString('en-IN')}`,
                b.remarks
              ])}
              totals={[
                '', '', 'Totals:', '', `Rs. ${totalHold.toLocaleString('en-IN')}`, ''
              ]}
            />
          </div>

          {/* Hold Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-amber-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Total Hold Deductions</span>
              <span className="text-sm font-black text-amber-750 mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalHold)}
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">held amount total</span>
            </div>
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-orange-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Held Items Count</span>
              <span className="text-sm font-black text-orange-800 mt-1">
                {holdBills.length} Items
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">active hold entries</span>
            </div>
          </div>

          {/* Hold Table */}
          <div className="bg-white border border-[#8c9ba8] rounded overflow-hidden shadow-xs">
            <div className="bg-[#fef9eb] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
              <span className="font-bold text-[#855e10] text-[11px] uppercase tracking-wider flex items-center">
                📌 Hold Deduction Register List
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-[#8c9ba8] text-[9px] uppercase font-bold text-slate-700">
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-center w-12 font-semibold">SR</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold">Project / Site Name</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Bill No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Certify Date</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-right pr-4 w-40">Hold Amt</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-left">Hold Reason / Remarks</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-center w-36 font-semibold">Status</th>
                    <th className="p-1.5 px-3 text-center font-semibold w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                  {holdBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic font-sans text-xs">
                        No hold deductions recorded for the selected search filter.
                      </td>
                    </tr>
                  ) : (
                    holdBills.map(b => {
                      const isExpanded = expandedBillId === `${b.projectId}_${b.billNo}`;
                      const hldStatus = getHoldStatus(b.id, b.amount, b.savedStatus);
                      return (
                        <React.Fragment key={`${b.projectId}_${b.billNo}`}>
                          <tr 
                            className={`hover:bg-amber-50/40 hover:text-amber-955 cursor-pointer transition-all duration-150 group ${isExpanded ? 'bg-amber-50/20 font-semibold' : ''}`}
                            title="Click to toggle details for this bill"
                            onClick={() => toggleRowExpand(b.projectId, b.billNo)}
                          >
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans">
                              <span className="inline-flex items-center gap-1">
                                <span className={`text-[8px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                {b.srNo}
                              </span>
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{getProjectName(b.projectId)}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans font-semibold text-[#0056b3] group-hover:underline">{b.billNo}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans text-slate-650">{b.certifyDate}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-right text-amber-700 font-bold pr-4">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(b.amount)}
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-700 font-medium text-left break-words">{b.remarks}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans">
                              {hldStatus === 'Fully Resolved' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Fully Resolved
                                </span>
                              ) : hldStatus === 'Partially Cleared' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Partially Cleared
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-1.5 px-3 text-center font-sans">
                              <span className={`text-[10px] font-bold inline-flex items-center gap-1 border rounded px-1.5 py-0.5 shadow-3xs transition-colors ${
                                isExpanded 
                                  ? 'bg-amber-700 text-white border-amber-705' 
                                  : 'text-amber-800 bg-amber-50 border-amber-250 hover:bg-amber-100 hover:text-amber-950'
                              }`}>
                                {isExpanded ? 'Collapse' : '🔍 Drill Down'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-0 border-b border-amber-100">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden bg-[#f8fafc]"
                                >
                                  {renderDrillDownDetails(b.projectId, b.billNo)}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {holdBills.length > 0 && (
                    <tr className="bg-slate-50/85 border-t border-slate-300 font-bold text-gray-900">
                      <td colSpan={4} className="p-2 px-3 text-right font-sans uppercase font-extrabold text-[9px] text-slate-500">Overall Holds Total:</td>
                      <td className="p-2 px-3 text-right font-mono text-amber-700 font-black pr-4 text-xs border-r border-[#8c9ba8]">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalHold)}
                      </td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'gst' ? (
        <div className="space-y-4 print:space-y-0">
          {/* Site-wise GST Header / Project Selector */}
          <div className="bg-[#f0f4f8] border border-[#8c9ba8] p-2.5 rounded shadow-xs mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Select Site / Project:</span>
              <select
                className="sap-input font-bold text-[#0056b3] text-xs bg-white border-slate-400 focus:bg-white pr-6 py-1 cursor-pointer"
                value={summaryProjectId}
                onChange={e => setSummaryProjectId(e.target.value)}
              >
                <option value="all">🌐 All Projects (Consolidated)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    🏗️ {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <PDFExportButton
              title="GST Deduction Register Report"
              headers={['Sr No', 'Project', 'Bill No', 'Certify Date', 'GST Amount', 'GST Status']}
              data={gstBills.map(b => [
                b.srNo.toString(),
                getProjectName(b.projectId),
                b.billNo,
                b.certifyDate,
                `Rs. ${b.amount.toLocaleString('en-IN')}`,
                b.gstStatus
              ])}
              totals={[
                '', '', 'Totals:', '', `Rs. ${totalGst.toLocaleString('en-IN')}`, ''
              ]}
            />
          </div>

          {/* GST Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-emerald-500 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">Total GST Amount</span>
              <span className="text-sm font-black text-emerald-750 mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalGst)}
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">cumulative GST collected</span>
            </div>
            <div className="sap-panel p-2.5 flex flex-col bg-white border-l-4 border-l-teal-600 shadow-xs">
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider leading-tight">GST Bills Count</span>
              <span className="text-sm font-black text-teal-800 mt-1">
                {gstBills.length} Items
              </span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">recorded entries with GST</span>
            </div>
          </div>

          {/* GST Table */}
          <div className="bg-white border border-[#8c9ba8] rounded overflow-hidden shadow-xs">
            <div className="bg-[#eafaf1] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
              <span className="font-bold text-[#0f5132] text-[11px] uppercase tracking-wider flex items-center">
                🟢 GST Register List
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-[#8c9ba8] text-[9px] uppercase font-bold text-slate-700">
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] text-center w-12 font-semibold">SR No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold">Project / Site Name</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Bill No</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-center w-28">Certify Date</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-right pr-4 w-40">GST Amt</th>
                    <th className="p-1.5 px-3 border-r border-[#8c9ba8] font-semibold text-left">GST Status / Remarks</th>
                    <th className="p-1.5 px-3 text-center font-semibold w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                  {gstBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic font-sans text-xs">
                        No GST recorded for the selected search filter.
                      </td>
                    </tr>
                  ) : (
                    gstBills.map(b => {
                      const isExpanded = expandedBillId === `${b.projectId}_${b.billNo}`;
                      const originalBill = billings.find(ob => ob.projectId === b.projectId && ob.billNo === b.billNo);
                      return (
                        <React.Fragment key={`${b.projectId}_${b.billNo}`}>
                          <tr 
                            className={`hover:bg-emerald-50/45 hover:text-emerald-950 cursor-pointer transition-all duration-150 group ${isExpanded ? 'bg-emerald-50/20 font-semibold' : ''}`}
                            title="Click to toggle details for this bill"
                            onClick={() => toggleRowExpand(b.projectId, b.billNo)}
                          >
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans">
                              <span className="inline-flex items-center gap-1">
                                <span className={`text-[8px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                {b.srNo}
                              </span>
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{getProjectName(b.projectId)}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans font-semibold text-[#0056b3] group-hover:underline">{b.billNo}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-center font-sans text-slate-600">{b.certifyDate}</td>
                            <td className="p-1.5 px-3 border-r border-slate-200 text-right text-emerald-700 font-bold pr-4">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(b.amount)}
                            </td>
                            <td className="p-1.5 px-3 border-r border-slate-200 font-sans text-slate-700 font-medium text-left">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  b.gstStatus === 'Deposited' || b.gstStatus === 'Paid'
                                    ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100/80 text-amber-800 border border-amber-200'
                                }`}>
                                  {b.gstStatus}
                                </span>
                                {originalBill?.taxInvoiceFile && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-semibold tracking-wide font-sans shadow-3xs" title="GST Tax Invoice Attached">
                                    📎 Invoice
                                  </span>
                                )}
                                {originalBill?.gstr3bFile && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[8px] font-semibold tracking-wide font-sans shadow-3xs" title="GSTR-3B Filing Copy Attached">
                                    📊 GSTR-3B
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 px-3 text-center font-sans">
                              <span className={`text-[10px] font-bold inline-flex items-center gap-1 border rounded px-1.5 py-0.5 shadow-3xs transition-colors ${
                                isExpanded 
                                  ? 'bg-emerald-700 text-white border-emerald-700' 
                                  : 'text-emerald-700 bg-emerald-50 border-emerald-250 hover:bg-emerald-100 hover:text-emerald-950'
                              }`}>
                                {isExpanded ? 'Collapse' : '🔍 Drill Down'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 border-b border-emerald-100">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden bg-[#f8fafc]"
                                >
                                  {renderDrillDownDetails(b.projectId, b.billNo)}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {gstBills.length > 0 && (
                    <tr className="bg-slate-50/85 border-t border-slate-300 font-bold text-gray-900">
                      <td colSpan={4} className="p-2 px-3 text-right font-sans uppercase font-extrabold text-[9px] text-slate-500">Overall GST Total:</td>
                      <td className="p-2 px-3 text-right font-mono text-emerald-700 font-black pr-4 text-xs border-r border-slate-200">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalGst)}
                      </td>
                      <td className="border-r border-slate-200"></td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

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
              body {
                background: white !important;
                color: black !important;
                font-family: 'Inter', -apple-system, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
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
                padding: 15mm 10mm !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print, .no-print-backdrop {
                display: none !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
              th, td {
                border: 1px solid #cbd5e1 !important;
                padding: 6px 8px !important;
                font-size: 10pt !important;
              }
              th {
                background-color: #f1f5f9 !important;
                font-weight: bold !important;
                color: #000 !important;
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
                    {printingBill.extraWorkAmount ? (
                      <div className="col-span-2 flex justify-between py-0.5 border-b border-gray-200/50">
                        <span className="text-blue-700">Extra Work Amount (No Deductions) (+):</span>
                        <span className="font-mono text-blue-700 font-medium">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.extraWorkAmount)}
                        </span>
                      </div>
                    ) : null}
                    {printingBill.debitAmount ? (
                      <div className="col-span-2 flex justify-between py-0.5 border-b border-gray-200/50">
                        <span className="text-purple-700">Debit Deduction ({printingBill.debitReason || 'No Reason Specified'}) (-):</span>
                        <span className="font-mono text-purple-600 font-medium">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.debitAmount)}
                        </span>
                      </div>
                    ) : null}
                    {printingBill.holdAmount ? (
                      <div className="col-span-2 flex justify-between py-0.5 border-b border-gray-200/50">
                        <span className="text-amber-800">Hold Amount Deduction ({printingBill.holdReason || 'No Reason Specified'}) (-):</span>
                        <span className="font-mono text-amber-700 font-medium">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(printingBill.holdAmount)}
                        </span>
                      </div>
                    ) : null}
                    <div className="col-span-2 flex justify-between py-1 bg-green-50/70 border-t border-green-300 font-bold px-1.5 mt-1 rounded-sm text-green-950">
                      <span>Total Net Receivable Amount:</span>
                      <span className="font-mono text-green-800">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                          printingBill.amount + (printingBill.extraWorkAmount || 0) - (printingBill.tds || 0) - (printingBill.retention || 0) + (printingBill.gst || 0) - (printingBill.debitAmount || 0) - (printingBill.holdAmount || 0)
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
                            <th className="p-1 border border-gray-300 w-16 text-right">Rate (₹)</th>
                            <th className="p-1 border border-gray-300 w-16 text-right">Qty Executed</th>
                            <th className="p-1 border border-gray-300 w-20 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printingBill.measurementItems.map((item: any, imIdx: number) => (
                            <tr key={item.id || imIdx} className="border-b border-gray-200 even:bg-gray-50/30">
                              <td className="p-1 border border-gray-300 text-center font-mono text-gray-500 text-[9px]">{imIdx + 1}</td>
                              <td className="p-1 border border-gray-300 font-medium text-gray-900">{item.description}</td>
                              <td className="p-1 border border-gray-300 text-center text-gray-600">{item.unit}</td>
                              <td className="p-1 border border-gray-300 text-right font-mono text-gray-900">
                                {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1 }).format(item.rate)}
                              </td>
                              <td className="p-1 border border-gray-300 text-right font-mono text-gray-950">{item.qtyExecuted}</td>
                              <td className="p-1 border border-gray-300 text-right font-mono font-semibold text-gray-950">
                                {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(item.amount)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100/50 font-bold text-gray-900 border-t-2 border-gray-350">
                            <td colSpan={5} className="p-1 border border-gray-300 text-right uppercase text-[9px] tracking-wider text-gray-650">Total Measured Amount:</td>
                            <td className="p-1 border border-gray-300 text-right font-extrabold text-[#0056b3] font-mono">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                                printingBill.measurementItems.reduce((s: number, i: any) => s + (i.amount || 0), 0)
                              )}
                            </td>
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
                onClick={() => {
                  const url = exportIndividualBillToPDF(
                    printingBill,
                    getProjectName(printingBill.projectId),
                    user?.name || user?.username || 'Admin'
                  );
                  downloadPDF(url, `Bill_${printingBill.billNo || 'Certificate'}.pdf`);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-sm flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
              >
                <Download size={12} />
                <span>Export Pristine PDF</span>
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

      {/* Document Preview Lightbox Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs no-print">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-4xl mx-4 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <Paperclip size={16} className="text-blue-600 shrink-0" />
                <h3 className="font-bold text-slate-800 text-[13px] truncate" title={previewFile.name}>
                  Preview: {previewFile.name}
                </h3>
                <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-mono shrink-0 hidden sm:inline-block">
                  {previewFile.type}
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => downloadFile(previewFile.url, previewFile.name, previewFile.type)}
                  className="bg-[#eef2f6] hover:bg-[#e2e8f0] text-slate-700 font-bold text-[11px] px-2.5 py-1.5 rounded-sm flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Download File"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="p-4 flex-1 overflow-auto bg-slate-100 flex items-center justify-center min-h-[300px]">
              {previewFile.type.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[65vh] max-w-full object-contain rounded border border-slate-200 shadow-sm"
                />
              ) : previewFile.type === 'application/pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[65vh] border border-slate-200 rounded shadow-inner bg-white"
                />
              ) : (
                <div className="text-center py-10 bg-white rounded-sm p-8 border border-slate-200 max-w-md shadow-sm">
                  <Paperclip size={40} className="mx-auto text-slate-350 mb-3" />
                  <h4 className="font-bold text-slate-700 text-sm mb-1">Preview Unavailable</h4>
                  <p className="text-slate-500 text-xs mb-4">
                    This file format ({previewFile.type}) cannot be direct-previewed in the browser. You can download the file to view it on your device.
                  </p>
                  <button
                    onClick={() => downloadFile(previewFile.url, previewFile.name, previewFile.type)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-sm inline-flex items-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <Download size={12} />
                    <span>Download & Open File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 flex justify-end">
              <button
                onClick={() => setPreviewFile(null)}
                className="sap-btn-secondary py-1 px-3 cursor-pointer text-[11px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
