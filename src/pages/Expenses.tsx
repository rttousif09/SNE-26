import React, { useState, useMemo } from 'react';
import { SAPSelect } from '../components/SAPSelect';
import { useAppContext } from '../store';
import { ExpenseEntry } from '../types';
import { 
  Plus, X, Edit, Trash2, Calendar, FileText, Check, Save,
  ArrowDownCircle, ArrowUpCircle, Wallet, Download, Printer, Filter, Info, FileSpreadsheet,
  Building2, Tag, Landmark, Upload, DollarSign
} from 'lucide-react';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { checkExpenseDuplicate, addOverrideLog } from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { PDFExportButton } from '../components/PDFExportButton';

export const Expenses: React.FC = () => {
  const { 
    user, 
    projects, 
    expensesLedger, 
    addExpenseEntry, 
    updateExpenseEntry, 
    deleteExpenseEntry 
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  // Duplicate verification states
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupData, setDupData] = useState<any[]>([]);
  const [pendingSaveFn, setPendingSaveFn] = useState<((overrideReason?: string) => void) | null>(null);

  // State
  const [isAdding, setIsAdding] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectIdFilter, setProjectIdFilter] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form State
  const [transactionType, setTransactionType] = useState<'credit' | 'spent'>('spent');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    projectId: '',
    category: 'mess', // defaults to mess
    amount: '',
    bank: '',
    receiptProof: '',
    receiptFileName: '',
    receiptFileType: ''
  });

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

  // Reset form
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setTransactionType('spent');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      projectId: '',
      category: 'mess',
      amount: '',
      bank: '',
      receiptProof: '',
      receiptFileName: '',
      receiptFileType: ''
    });
  };

  const handleEdit = (entry: ExpenseEntry) => {
    const isCredit = entry.crBalance > 0;
    setTransactionType(isCredit ? 'credit' : 'spent');
    
    // Find category and amount for spent entries
    let category = 'kharchi';
    let amount = 0;
    if (!isCredit) {
      if (entry.kharchi > 0) { category = 'kharchi'; amount = entry.kharchi; }
      else if (entry.mess > 0) { category = 'mess'; amount = entry.mess; }
      else if (entry.workerAdvance > 0) { category = 'workerAdvance'; amount = entry.workerAdvance; }
      else if (entry.tiffin > 0) { category = 'tiffin'; amount = entry.tiffin; }
      else if (entry.travel > 0) { category = 'travel'; amount = entry.travel; }
      else if (entry.machineryMaterial > 0) { category = 'machineryMaterial'; amount = entry.machineryMaterial; }
      else if (entry.workerPayment > 0) { category = 'workerPayment'; amount = entry.workerPayment; }
      else if (entry.stationery > 0) { category = 'stationery'; amount = entry.stationery; }
      else if (entry.others > 0) { category = 'others'; amount = entry.others; }
    } else {
      amount = entry.crBalance;
    }

    setFormData({
      date: entry.date,
      description: entry.description,
      projectId: entry.projectId || '',
      category,
      amount: amount.toString(),
      bank: entry.bank || '',
      receiptProof: entry.receiptProof || '',
      receiptFileName: entry.receiptFileName || '',
      receiptFileType: entry.receiptFileType || ''
    });
    setEditingId(entry.id);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent, shouldExit: boolean = true) => {
    e.preventDefault();
    if (!formData.description) return;

    if (formData.projectId) {
      const targetProjectObj = projects.find(p => p.id === formData.projectId);
      if (targetProjectObj?.status === 'Completed') {
        alert("This project is marked as Completed. New entries are not allowed.");
        return;
      }
    }

    const isCredit = transactionType === 'credit';
    const amountVal = parseFloat(formData.amount) || 0;

    // Build categories object
    const categoriesData = {
      kharchi: 0,
      mess: 0,
      workerAdvance: 0,
      tiffin: 0,
      travel: 0,
      machineryMaterial: 0,
      workerPayment: 0,
      stationery: 0,
      others: 0,
    };

    if (!isCredit) {
      // @ts-ignore
      categoriesData[formData.category] = amountVal;
    }

    const payload = {
      date: formData.date,
      description: formData.description,
      projectId: formData.projectId || undefined,
      bank: isCredit ? formData.bank : undefined,
      crBalance: isCredit ? amountVal : 0,
      receiptProof: formData.receiptProof,
      receiptFileName: formData.receiptFileName,
      receiptFileType: formData.receiptFileType,
      status: 'Submitted' as 'Submitted',
      ...categoriesData
    };

    const onProceedSave = (bypassCheck: boolean = false, overrideReason: string = '') => {
      if (editingId) {
        updateExpenseEntry(editingId, payload);
      } else {
        addExpenseEntry(payload);
      }
      
      if (bypassCheck && overrideReason) {
        addOverrideLog(
          user?.username || 'Unknown',
          'Expenses Ledger',
          `Desc: ${formData.description}, Date: ${formData.date}, Amount: Rs ${amountVal.toLocaleString()}, Site: ${getProjectName(formData.projectId)}`,
          overrideReason
        );
      }
      
      if (shouldExit) {
        handleCancel();
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          projectId: '',
          category: 'kharchi',
          amount: '',
          bank: '',
          receiptProof: '',
          receiptFileName: '',
          receiptFileType: ''
        });
        setTransactionType('spent');
      }
    };

    const countMatches = checkExpenseDuplicate(
      expensesLedger,
      {
        date: formData.date,
        description: formData.description,
        projectId: formData.projectId || '',
        amount: amountVal,
        category: isCredit ? 'crBalance' : formData.category
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

  const handleDelete = (id: string) => {
    deleteExpenseEntry(id);
    setDeleteId(null);
  };

  // Helper names
  const getProjectName = (id?: string) => {
    if (!id) return '';
    const proj = projects.find(p => p.id === id);
    return proj ? proj.name : id;
  };

  // Process ledger: Sort chronologically to properly calculate sequential available running balance
  const processedLedger = useMemo(() => {
    // Clone and sort by date ascending (oldest first)
    const sorted = [...expensesLedger].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id); // secondary stable tie-breaker
    });

    let runningBalance = 0;
    return sorted.map(item => {
      const totalSpent = 
        item.kharchi + item.mess + item.workerAdvance + item.tiffin + 
        item.travel + item.machineryMaterial + item.workerPayment + 
        item.stationery + item.others;

      runningBalance = runningBalance + item.crBalance - totalSpent;

      return {
        ...item,
        totalSpent,
        avlBalance: runningBalance
      };
    });
  }, [expensesLedger]);

  // Apply filters on the calculated ledger (preserving dynamic calculation indices)
  const filteredLedger = useMemo(() => {
    return processedLedger.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.bank && item.bank.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesProject = !projectIdFilter || item.projectId === projectIdFilter;
      
      let matchesCat = true;
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'credit') {
          matchesCat = item.crBalance > 0;
        } else {
          // @ts-ignore
          matchesCat = item[categoryFilter] > 0;
        }
      }

      return matchesSearch && matchesProject && matchesCat;
    });
  }, [processedLedger, searchQuery, projectIdFilter, categoryFilter]);

  // Aggregate Stats (based on filtered ledger, but raw totals overall)
  const stats = useMemo(() => {
    let totalCredit = 0;
    let totalSpent = 0;
    
    // Calculate off 전체 ledger to avoid subset balance distortion
    processedLedger.forEach(item => {
      totalCredit += item.crBalance;
      totalSpent += item.totalSpent;
    });

    const isCreditEmpty = processedLedger.length === 0;
    const finalBalance = isCreditEmpty ? 0 : processedLedger[processedLedger.length - 1].avlBalance;

    // Category breakdown
    const categoriesBreakdown = {
      kharchi: 0,
      mess: 0,
      workerAdvance: 0,
      tiffin: 0,
      travel: 0,
      machineryMaterial: 0,
      workerPayment: 0,
      stationery: 0,
      others: 0,
    };

    processedLedger.forEach(item => {
      categoriesBreakdown.kharchi += item.kharchi;
      categoriesBreakdown.mess += item.mess;
      categoriesBreakdown.workerAdvance += item.workerAdvance;
      categoriesBreakdown.tiffin += item.tiffin;
      categoriesBreakdown.travel += item.travel;
      categoriesBreakdown.machineryMaterial += item.machineryMaterial;
      categoriesBreakdown.workerPayment += item.workerPayment;
      categoriesBreakdown.stationery += item.stationery;
      categoriesBreakdown.others += item.others;
    });

    return {
      totalCredit,
      totalSpent,
      currentBalance: finalBalance,
      breakdown: categoriesBreakdown
    };
  }, [processedLedger]);

  const exportToCSV = () => {
    const headers = [
      'SR', 'DATE', 'DESCRIPTION', 'PROJECT', 'Kharchi', 'Mess', 
      'Worker Advance', 'Tiffin', 'Travel', 'Machinery & Material', 
      'Worker Payment', 'Stationery', 'Others', 'Bank', 'Cr.Balance', 'Avl. Balance'
    ];
    
    const rows = filteredLedger.map((item, index) => [
      index + 1,
      item.date,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${getProjectName(item.projectId)}"`,
      item.kharchi || '',
      item.mess || '',
      item.workerAdvance || '',
      item.tiffin || '',
      item.travel || '',
      item.machineryMaterial || '',
      item.workerPayment || '',
      item.stationery || '',
      item.others || '',
      item.bank || '',
      item.crBalance || '',
      item.avlBalance
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SN_ENTERPRISE_Expenses_Record_Sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMonthLabel = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const getCategoryLabel = (item: ExpenseEntry) => {
    if (item.crBalance > 0) return 'Credit Inflow';
    if (item.kharchi > 0) return 'Kharchi';
    if (item.mess > 0) return 'Mess / Fooding';
    if (item.workerAdvance > 0) return 'Worker Advance';
    if (item.tiffin > 0) return 'Tiffin / Snacks';
    if (item.travel > 0) return 'Travel Expenses';
    if (item.machineryMaterial > 0) return 'Machinery/Mat';
    if (item.workerPayment > 0) return 'Worker Payment';
    if (item.stationery > 0) return 'Stationery';
    if (item.others > 0) return 'Others';
    return '-';
  };

  const exportToPDF = (targetMonth: string) => {
    if (!targetMonth) return;
    
    // Determine opening balance (balance before month starts)
    const beforeItems = processedLedger.filter(item => item.date < `${targetMonth}-01`);
    const openingBalance = beforeItems.length > 0 ? beforeItems[beforeItems.length - 1].avlBalance : 0;

    const monthItems = processedLedger.filter(item => item.date.startsWith(targetMonth));
    
    const totalCredits = monthItems.reduce((sum, item) => sum + item.crBalance, 0);
    const totalSpent = monthItems.reduce((sum, item) => sum + item.totalSpent, 0);
    const closingBalance = monthItems.length > 0 ? monthItems[monthItems.length - 1].avlBalance : openingBalance;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const monthLabel = getMonthLabel(targetMonth);

    const drawPageHeader = (page: number) => {
      // Draw professional double-frame borders
      doc.setDrawColor(0, 47, 108); // Corporate Navy Blue
      doc.setLineWidth(0.5);
      doc.rect(8, 8, 281, 194);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.rect(9, 9, 279, 192);

      // Main header titles
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(217, 30, 18); // Accent red
      doc.text("SN ENTERPRISE", 148.5, 18, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("MONTHLY EXPENSES LEDGER REPORT | STATEMENT OF ACCOUNTS", 148.5, 23, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 47, 108);
      doc.text(`WAGE MONTH: ${monthLabel.toUpperCase()}`, 12, 33);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(110, 110, 110);
      doc.text(`Exported On: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 285, 33, { align: "right" });

      // Dividing corporate bar
      doc.setDrawColor(0, 47, 108);
      doc.setLineWidth(0.5);
      doc.line(12, 35, 285, 35);
    };

    const drawFooter = (page: number, totalPages: number) => {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text("SYSTEM AUTO-GENERATED STATEMENT OF LEDGERS (SN_ERP_PRD)", 12, 198);
      doc.text(`Page ${page} of ${totalPages}`, 285, 198, { align: "right" });
    };

    // PAGE 1
    drawPageHeader(1);

    // Draw KPI statistics cards
    const drawKPIBox = (x: number, y: number, w: number, h: number, title: string, amount: number, colorText: [number, number, number]) => {
      doc.setDrawColor(180, 180, 180);
      doc.setFillColor(252, 253, 255);
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(title, x + 3, y + 4.5);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(colorText[0], colorText[1], colorText[2]);
      doc.text("INR " + amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x + 3, y + 10);
    };

    drawKPIBox(12, 38, 64, 13, "PREVIOUS OPENING BALANCE", openingBalance, [0, 47, 108]);
    drawKPIBox(80, 38, 64, 13, "TOTAL INFLOWS (OWNER CREDIT)", totalCredits, [0, 110, 0]);
    drawKPIBox(148, 38, 64, 13, "TOTAL STRUCTURED SPENT (-)", totalSpent, [206, 42, 42]);
    drawKPIBox(216, 38, 69, 13, "CLOSING RESERVE BALANCE", closingBalance, [0, 30, 80]);

    // Table Column Header rendering
    const tableHeaderY = 56;
    doc.setFillColor(238, 242, 246);
    doc.rect(12, tableHeaderY, 273, 8, "F");
    
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.rect(12, tableHeaderY, 273, 8, "D");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);

    doc.text("SR", 16, tableHeaderY + 5.5, { align: "center" });
    doc.text("DATE", 31, tableHeaderY + 5.5, { align: "center" });
    doc.text("DESCRIPTION / TRANSACTION MEMO", 44, tableHeaderY + 5.5);
    doc.text("PROJECT LINK", 119, tableHeaderY + 5.5);
    doc.text("CATEGORY", 154, tableHeaderY + 5.5);
    doc.text("SPENT (OUT)", 217, tableHeaderY + 5.5, { align: "right" });
    doc.text("CREDIT (IN)", 249, tableHeaderY + 5.5, { align: "right" });
    doc.text("AVL BALANCE", 283, tableHeaderY + 5.5, { align: "right" });

    let currentY = 64;
    const pageHeightLimit = 188;
    let pageNumber = 1;

    if (monthItems.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("No transactions recorded for this month.", 148.5, 90, { align: "center" });
    } else {
      monthItems.forEach((row, idx) => {
        if (currentY > pageHeightLimit) {
          doc.addPage();
          pageNumber++;
          drawPageHeader(pageNumber);

          // Draw table header again
          doc.setFillColor(238, 242, 246);
          doc.rect(12, 38, 273, 8, "F");
          doc.setDrawColor(120, 120, 120);
          doc.setLineWidth(0.3);
          doc.rect(12, 38, 273, 8, "D");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(40, 40, 40);
          doc.text("SR", 16, 43.5, { align: "center" });
          doc.text("DATE", 31, 43.5, { align: "center" });
          doc.text("DESCRIPTION / TRANSACTION MEMO", 44, 43.5);
          doc.text("PROJECT LINK", 119, 43.5);
          doc.text("CATEGORY", 154, 43.5);
          doc.text("SPENT (OUT)", 217, 43.5, { align: "right" });
          doc.text("CREDIT (IN)", 249, 43.5, { align: "right" });
          doc.text("AVL BALANCE", 283, 43.5, { align: "right" });

          currentY = 46;
        }

        const isCredit = row.crBalance > 0;
        
        // Background row highlight
        if (isCredit) {
          doc.setFillColor(236, 248, 238); // Soft green for credits
          doc.rect(12, currentY, 273, 6.5, "F");
        } else if (idx % 2 === 1) {
          doc.setFillColor(250, 251, 252); // Alt striping
          doc.rect(12, currentY, 273, 6.5, "F");
        }

        doc.setDrawColor(215, 218, 224);
        doc.setLineWidth(0.15);
        doc.line(12, currentY + 6.5, 285, currentY + 6.5);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(50, 50, 50);

        // SR
        doc.text((idx + 1).toString(), 16, currentY + 4.5, { align: "center" });

        // Date
        doc.text(row.date.split('-').reverse().join('-'), 31, currentY + 4.5, { align: "center" });

        // Memo Description (truncated gracefully to prevent margins bleed)
        let desc = row.description;
        if (desc.length > 50) desc = desc.substring(0, 47) + "...";
        doc.text(desc, 44, currentY + 4.5);

        // Project
        let proj = getProjectName(row.projectId) || "General";
        if (proj.length > 22) proj = proj.substring(0, 19) + "...";
        doc.text(proj, 119, currentY + 4.5);

        // Category
        doc.text(getCategoryLabel(row), 154, currentY + 4.5);

        // Spent (Out)
        if (row.totalSpent > 0) {
          doc.setTextColor(180, 20, 20);
          doc.text(row.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 217, currentY + 4.5, { align: "right" });
        }

        // Credit (In)
        doc.setTextColor(50, 50, 50);
        if (row.crBalance > 0) {
          doc.setTextColor(0, 100, 0);
          doc.text(row.crBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 249, currentY + 4.5, { align: "right" });
        }

        // Running balance
        doc.setTextColor(0, 47, 108);
        doc.setFont("Helvetica", "bold");
        doc.text(row.avlBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 283, currentY + 4.5, { align: "right" });

        currentY += 6.5;
      });

      // Subtotals Row
      if (currentY > pageHeightLimit - 8) {
        doc.addPage();
        pageNumber++;
        drawPageHeader(pageNumber);
        currentY = 38;
      }

      doc.setFillColor(242, 245, 249);
      doc.rect(12, currentY, 273, 7.5, "F");
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.3);
      doc.line(12, currentY, 285, currentY);
      doc.line(12, currentY + 7.5, 285, currentY + 7.5);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      doc.text("MONTHLY TRANSACTION SUMS", 44, currentY + 5);

      doc.setTextColor(180, 20, 20);
      doc.text(totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 217, currentY + 5, { align: "right" });

      doc.setTextColor(0, 100, 0);
      doc.text(totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 249, currentY + 5, { align: "right" });

      doc.setTextColor(0, 30, 80);
      doc.text(closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 283, currentY + 5, { align: "right" });

      currentY += 14;
    }

    // Signatures blocks
    if (currentY > pageHeightLimit - 15) {
      doc.addPage();
      pageNumber++;
      drawPageHeader(pageNumber);
      currentY = 50;
    } else {
      currentY = Math.max(currentY, 155);
    }

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(15, currentY + 15, 80, currentY + 15);
    doc.line(220, currentY + 15, 280, currentY + 15);
    doc.setLineDashPattern([], 0);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Prepared & Accounted By: Site Incharge", 15, currentY + 20);
    doc.text("Approved By Owner: Saddam Hussain", 280, currentY + 20, { align: "right" });

    const totalPagesCount = pageNumber;
    for (let p = 1; p <= totalPagesCount; p++) {
      doc.setPage(p);
      drawFooter(p, totalPagesCount);
    }

    doc.save(`SN_ENTERPRISE_Expense_Report_${targetMonth}.pdf`);
  };

  return (
    <div className="text-[11px] font-sans antialiased">
      {/* Dynamic Summary Cards with beautiful motion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 print:hidden">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border border-[#8c9ba8] bg-white p-3 shadow-sm flex items-center justify-between group hover:border-[#0056b3] transition duration-200"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Total Money Credited (Owner)</span>
            <div className="text-lg font-black font-mono text-green-700">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.totalCredit)}
            </div>
            <p className="text-[9px] text-gray-400">Total fund injected by owner into layout</p>
          </div>
          <div className="p-2 border border-green-200 bg-green-50 text-green-700 rounded-full group-hover:scale-110 transition duration-300">
            <ArrowDownCircle size={20} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="border border-[#8c9ba8] bg-white p-3 shadow-sm flex items-center justify-between group hover:border-red-555 transition duration-200"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Total Funds Spent</span>
            <div className="text-lg font-black font-mono text-red-600">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.totalSpent)}
            </div>
            <p className="text-[9px] text-gray-400">Sum of travel, tiffin, mess, materials & labor</p>
          </div>
          <div className="p-2 border border-red-200 bg-red-50 text-red-600 rounded-full group-hover:scale-110 transition duration-300">
            <ArrowUpCircle size={20} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="border border-[#8c9ba8] bg-[var(--color-sap-blue-val)] p-3 shadow-sm flex items-center justify-between text-white group hover:bg-[#00224d] transition duration-200"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Available Balance</span>
            <div className="text-lg font-black font-mono text-emerald-400">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.currentBalance)}
            </div>
            <p className="text-[9px] text-blue-100">Remaining cash reserve balance</p>
          </div>
          <div className="p-2 bg-blue-900 border border-blue-700 text-emerald-400 rounded-full group-hover:scale-110 transition duration-300">
            <Wallet size={20} />
          </div>
        </motion.div>
      </div>

      {/* Visual Category Expenditure Breakdown meter bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mb-4 p-2.5 bg-white border border-[#8c9ba8] shadow-sm print:hidden"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 block mb-2">Category Wise Spent Expense Proportion</span>
        <div className="w-full flex h-5 rounded overflow-hidden bg-gray-100 border divide-x border-gray-200">
          {(Object.entries(stats.breakdown) as [string, number][]).map(([cat, val], idx) => {
            if (val <= 0 || stats.totalSpent <= 0) return null;
            const percentage = (val / stats.totalSpent) * 100;
            const colors = [
              'bg-[var(--btn-hover-top)]', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600', 
              'bg-cyan-600', 'bg-pink-600', 'bg-teal-600', 'bg-orange-600', 'bg-slate-600'
            ];
            const catLabel = cat === 'machineryMaterial' ? 'Machinery & Material' : cat.charAt(0).toUpperCase() + cat.slice(1);
            return (
              <div 
                key={cat} 
                style={{ width: `${percentage}%` }} 
                className={`${colors[idx % colors.length]} flex items-center justify-center text-[8px] font-bold text-white transition-all`}
                title={`${catLabel}: ₹${Number(val).toLocaleString('en-IN')} (${percentage.toFixed(1)}%)`}
              >
                {percentage > 10 ? `${catLabel} (${percentage.toFixed(0)}%)` : ''}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {(Object.entries(stats.breakdown) as [string, number][]).map(([cat, val], idx) => {
            const colors = [
              'bg-[var(--btn-hover-top)]', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600', 
              'bg-cyan-600', 'bg-pink-600', 'bg-teal-600', 'bg-orange-600', 'bg-slate-600'
            ];
            const catLabel = cat === 'machineryMaterial' ? 'Machinery & Material' : cat.charAt(0).toUpperCase() + cat.slice(1);
            return (
              <div key={cat} className="flex items-center space-x-1">
                <span className={`w-2 h-2 ${colors[idx % colors.length]} rounded-fullInline block`}></span>
                <span className="text-[9px] text-gray-600">{catLabel}: <strong className="text-gray-900 font-mono">₹{Number(val).toLocaleString('en-IN')}</strong></span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Control panel and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#eef2f6] border border-[#8c9ba8] p-1.5 gap-2 shadow-sm print:hidden mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {!isReadOnly ? (
            <>
              <button 
                onClick={isAdding ? handleCancel : () => setIsAdding(true)} 
                className="sap-btn flex items-center space-x-1 font-semibold self-start md:self-auto cursor-pointer"
              >
                {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
                <span>{isAdding ? 'Cancel' : 'Record Transaction'}</span>
              </button>
              <button 
                onClick={() => setIsExcelImportOpen(true)} 
                className="sap-btn flex items-center space-x-1 font-semibold bg-green-50 text-green-700 border-green-300 hover:bg-green-100 transition cursor-pointer"
              >
                <FileSpreadsheet size={12} className="text-green-600" />
                <span>Import Excel</span>
              </button>
            </>
          ) : (
            <span className="font-semibold text-gray-700 px-1 py-0.5 max-sm:text-[10px]">All Expenses Summary List (Read Only)</span>
          )}
          
          <button 
            onClick={exportToCSV} 
            className="sap-btn flex items-center space-x-1 font-semibold bg-[#107c41]/10 text-[#107c41] border-[#107c41]/50 hover:bg-[#107c41] hover:text-white transition cursor-pointer" 
            title="Export filtered records sheet list to Microsoft Excel CSV format"
          >
            <Download size={12} />
            <span>Excel Export</span>
          </button>
          
          <PDFExportButton
            title="Expenses & Cashflow Ledger"
            siteName={projectIdFilter ? projects.find(p => p.id === projectIdFilter)?.name : 'All Projects'}
            headers={['Date', 'Category', 'Description', 'Link Ref / Project', 'Spent (DR)', 'Credits Given (CR)', 'Net Avl Balance']}
            data={filteredLedger.map(e => [
              e.date.split('-').reverse().join('-'),
              getCategoryLabel(e),
              e.description,
              getProjectName(e.projectId) || '-',
              e.totalSpent > 0 ? `Rs. ${e.totalSpent.toLocaleString('en-IN')}` : '-',
              e.crBalance > 0 ? `Rs. ${e.crBalance.toLocaleString('en-IN')}` : '-',
              `Rs. ${e.avlBalance.toLocaleString('en-IN')}`
            ])}
            totals={[
              '', '', '', 'Totals:',
              `Rs. ${filteredLedger.reduce((sum, item) => sum + item.totalSpent, 0).toLocaleString('en-IN')}`,
              `Rs. ${filteredLedger.reduce((sum, item) => sum + item.crBalance, 0).toLocaleString('en-IN')}`,
              `Rs. ${filteredLedger.length > 0 ? filteredLedger[filteredLedger.length - 1].avlBalance.toLocaleString('en-IN') : 0}`
            ]}
          />

          <div className="flex items-center space-x-1 border border-[#8c9ba8] bg-white p-0.5 rounded shadow-sm text-[10px]">
            <span className="text-[9.5px] text-gray-500 font-bold px-1 select-none">Month Report:</span>
            <input 
              type="month" 
              value={exportMonth} 
              onChange={(e) => setExportMonth(e.target.value)}
              className="bg-transparent outline-none text-[10px] font-semibold w-24 h-[18px] border-r border-[#8c9ba8] pr-1 font-mono"
            />
            <button 
              onClick={() => exportToPDF(exportMonth)}
              disabled={!exportMonth}
              className="flex items-center space-x-0.5 font-bold text-red-700 hover:bg-red-50 px-1.5 py-0.5 rounded transition disabled:opacity-50 cursor-pointer"
              title="Export specific month's expenses ledger as a beautiful corporate PDF file"
            >
              <FileText size={11} className="text-red-600" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 md:self-stretch">
          <div className="flex items-center space-x-1 bg-white border border-[#8c9ba8] px-1 py-0.5 rounded shadow-inner">
            <Filter size={10} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Search memo..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-24 bg-transparent outline-none py-0.5"
            />
          </div>

          <SAPSelect 
            value={projectIdFilter} 
            onChange={(e) => setProjectIdFilter(e.target.value)}
            className="border border-[#8c9ba8] bg-white p-0.5 rounded shadow-sm outline-none"
          >
            <option value="">All Projects</option>
            {projects.filter(p => showCompleted ? true : (!p.status || p.status === 'Ongoing')).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SAPSelect>

          <label className="flex items-center space-x-1 cursor-pointer text-gray-600 text-[10px] font-semibold">
            <input 
              type="checkbox" 
              checked={showCompleted} 
              onChange={e => setShowCompleted(e.target.checked)} 
              className="rounded"
            />
            <span>Show Completed</span>
          </label>

          <SAPSelect 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-[#8c9ba8] bg-white p-0.5 rounded shadow-sm outline-none"
          >
            <option value="all">All Categories</option>
            <option value="credit">Credits received from Owner</option>
            <option value="kharchi">Kharchi</option>
            <option value="mess">Mess</option>
            <option value="workerAdvance">Worker Advance</option>
            <option value="tiffin">Tiffin</option>
            <option value="travel">Travel</option>
            <option value="machineryMaterial">Machinery & Material</option>
            <option value="workerPayment">Worker Payment</option>
            <option value="stationery">Stationery</option>
            <option value="others">Others</option>
          </SAPSelect>
        </div>
      </div>

      {/* Transaction recording form with elegant layout animations */}
      <AnimatePresence>
        {isAdding && !isReadOnly && (
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
              className="sap-panel relative z-10 w-full max-w-max max-h-[95vh] overflow-y-auto p-4 shadow-[0_10px_40px_rgb(0,0,0,0.2)] print:hidden bg-[#fcfdfe] rounded-md border-b-4 border-b-[#0056b3]"
            >
            <div className="font-bold border-b border-[#8c9ba8] pb-1.5 mb-3 text-[#0056b3] uppercase tracking-wider text-[11px] flex justify-between items-center">
              <span>{editingId ? 'Edit Ledger Record' : 'Record New Fund Flow / spent expense'}</span>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {/* Transaction Type Choice Selector */}
              <div className="md:col-span-2">
                <label className="block text-[10px] text-gray-500 font-bold mb-1">FLOW DIRECTION</label>
                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setTransactionType('spent')}
                    className={`flex-1 py-1 text-center font-bold border rounded outline-none transition cursor-pointer ${
                      transactionType === 'spent'
                        ? 'bg-red-50 text-red-700 border-red-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    💸 SPENT EXPENSE INFLOW
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType('credit')}
                    className={`flex-1 py-1 text-center font-bold border rounded outline-none transition cursor-pointer ${
                      transactionType === 'credit'
                        ? 'bg-green-50 text-green-700 border-green-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    📥 OWNER CREDIT INJECT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                  <Calendar size={11} className="text-blue-500" />
                  <span>DATE</span>
                </label>
                <input 
                  type="date"
                  required 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full border border-gray-300 p-1 bg-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                  <FileText size={11} className="text-blue-500" />
                  <span>TRANSACTION DESCRIPTION / MEMO</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={transactionType === 'credit' ? 'e.g., Amount Credit from Owner' : 'e.g., Mess bills, travel tickets, etc.'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 p-1 bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                  <Building2 size={11} className="text-blue-500" />
                  <span>PROJECT LINK (OPTIONAL)</span>
                </label>
                <SAPSelect 
                  value={formData.projectId}
                  onChange={(e) => {
                    const selectedPr = e.target.value;
                    if (selectedPr) {
                      const pObj = projects.find(p => p.id === selectedPr);
                      if (pObj?.status === 'Completed') {
                        alert("This project is marked as Completed. New entries are not allowed.");
                        return;
                      }
                    }
                    setFormData({ ...formData, projectId: selectedPr });
                  }}
                  className="w-full border border-gray-300 p-1 bg-white outline-none h-[23px]"
                >
                  <option value="">General (None)</option>
                  {projects.filter(p => showCompleted ? true : (!p.status || p.status === 'Ongoing')).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </SAPSelect>
              </div>

              {transactionType === 'spent' ? (
                <>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                      <Tag size={11} className="text-blue-500" />
                      <span>EXPENSE CATEGORY</span>
                    </label>
                    <SAPSelect 
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none h-[23px]"
                    >
                      <option value="kharchi">Kharchi (Pocket Money)</option>
                      <option value="mess">Mess</option>
                      <option value="workerAdvance">Worker Advance</option>
                      <option value="tiffin">Tiffin</option>
                      <option value="travel">Travel</option>
                      <option value="machineryMaterial">Machinery & Material</option>
                      <option value="workerPayment">Worker Payment</option>
                      <option value="stationery">Stationery</option>
                      <option value="others">Others</option>
                    </SAPSelect>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                      <DollarSign size={11} className="text-blue-500" />
                      <span>SPENT AMOUNT (₹)</span>
                    </label>
                    <input 
                      type="number" 
                      required
                      min="0.01"
                      step="any"
                      placeholder="Spent Amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                      <Landmark size={11} className="text-blue-500" />
                      <span>BANK (E.G., SBI)</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Bank name"
                      value={formData.bank}
                      onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                      <DollarSign size={11} className="text-blue-500" />
                      <span>CREDIT AMOUNT (₹)</span>
                    </label>
                    <input 
                      type="number" 
                      required
                      min="0.01"
                      step="any"
                      placeholder="Credit Amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none font-mono"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                  <Upload size={11} className="text-blue-500" />
                  <span>BILL / RECEIPT PROOF (OPTIONAL)</span>
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="w-full text-xs p-1"
                />
                {formData.receiptFileName && (
                  <div className="text-[10px] text-green-700 italic mt-0.5 truncate">
                    Attached: {formData.receiptFileName}
                  </div>
                )}
              </div>

              <div className="md:col-span-6 flex justify-end space-x-1.5 pt-1.5 border-t border-gray-200 mt-1">
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  className="sap-btn bg-gray-100 border-gray-300 hover:bg-gray-200 flex items-center space-x-1 cursor-pointer"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>

                {!editingId && (
                  <button 
                    type="button" 
                    onClick={(e) => handleSave(e as any, false)}
                    className="sap-btn bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100 flex items-center space-x-1 cursor-pointer"
                  >
                    <Save size={12} className="text-blue-600"/>
                    <span>Record & Continue</span>
                  </button>
                )}

                <button 
                  type="submit" 
                  className="sap-btn flex items-center space-x-1 cursor-pointer"
                >
                  <Save size={12} className="text-green-600"/>
                  <span>{editingId ? 'Update & Exit Record' : 'Record & Exit'}</span>
                </button>
              </div>
            </form>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Ledger visual workspace (designed exactly as requested in the image) */}
      <div className="bg-white border-2 border-[#8c9ba8] shadow-lg p-4 overflow-x-auto print:border-0 print:shadow-none print:p-0">
        
        {/* Printable/Exportable header identical to the Excel document attached */}
        <div className="text-center mb-4 flex flex-col items-center">
          <h1 className="text-red-750 font-black tracking-widest text-[#d91e18] uppercase text-2xl" id="excel-company-header">
            SN ENTERPRISE
          </h1>
          <div className="border border-black font-extrabold uppercase px-6 py-1 tracking-wider text-[11px] bg-white border-t-0 -mt-1 subpixel-antialiased" id="excel-sheet-subtitle">
            ALL EXPENSES RECORD SHEET
          </div>
          <div className="text-[9px] text-gray-500 mt-1 print:hidden flex items-center space-x-1">
            <Info size={9} className="text-[#0056b3]" />
            <span>Green rows represent Credits received from the Owner. White rows represent direct Spent Expenses.</span>
          </div>
        </div>

        {/* Excel style worksheet table */}
        <table className="w-full border-collapse border border-black text-[10px] divide-y divide-black min-w-[1000px]">
          <thead>
            {/* Main Worksheet columns header */}
            <tr className="bg-gray-50 divide-x divide-black border-b-2 border-black text-center font-bold text-gray-800">
              <th className="border border-black py-1.5 px-1 font-bold w-10">SR</th>
              <th className="border border-black py-1.5 px-2 font-bold w-16">DATE</th>
              <th className="border border-black py-1.5 px-2 font-bold text-left w-48">DESCRIPTION</th>
              <th className="border border-black py-1.5 px-2 font-bold text-left w-24">PROJECT</th>
              <th className="border border-black py-1.5 px-2 font-bold text-center w-12">RECEIPT</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-amber-50/20 text-yellow-900 w-16">Kharchi</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-purple-50/20 text-purple-900 w-16">Mess</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-red-50/20 text-red-900 w-20 text-center leading-tight">Worker<br/>Advance</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-blue-50/20 text-indigo-900 w-14">Tiffin</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-sky-50/20 text-cyan-900 w-16">Travel</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-orange-50/20 text-[#a34e00] w-24 text-center leading-tight">Machinery<br/>&Material</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-emerald-50/20 text-emerald-900 w-20 text-center leading-tight">Worker<br/>Payment</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-pink-50/20 text-pink-900 w-18">Stationery</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-slate-100 text-gray-905 w-18">Others</th>
              <th className="border border-black py-1.5 px-1.5 font-bold w-14 text-center">Bank</th>
              <th className="border border-black py-1.5 px-2 font-bold bg-green-50 text-green-950 w-24 text-right">Cr.Balance</th>
              <th className="border border-black py-1.5 px-2 font-bold bg-[#edf2f7] text-[var(--color-sap-blue-val)] w-28 text-right">Avl. Balance</th>
              {!isReadOnly && <th className="border border-black py-1.5 px-1 font-normal w-16 print:hidden">Actions</th>}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredLedger.map((item, index) => {
                const isCredit = item.crBalance > 0;
                
                return (
                  <motion.tr 
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 38,
                      opacity: { duration: 0.15 }
                    }}
                    className={`divide-x divide-black border-b border-black text-[10.5px] group hover:bg-[#f8fafc]/50 transition ${
                      isCredit ? 'bg-[#c6efce]/80 text-[#006100] font-semibold' : 'bg-white'
                    }`}
                  >
                    {/* SR */}
                    <td className="border border-black py-1.5 text-center font-bold font-mono text-gray-600 select-none">
                      {index + 1}
                    </td>
                    
                    {/* Date */}
                    <td className="border border-black py-1.5 text-center font-mono select-none">
                      {item.date.split('-').reverse().join('-')}
                    </td>

                    {/* Description */}
                    <td className="border border-black py-1.5 px-2 text-left truncate max-w-xs font-semibold">
                      {item.description}
                    </td>

                    {/* Project */}
                    <td className="border border-black py-1.5 px-2 text-left text-gray-800 select-none">
                      {getProjectName(item.projectId)}
                    </td>

                    {/* Receipt */}
                    <td className="border border-black py-1.5 px-2 text-center text-gray-800 select-none">
                      {item.receiptProof && (
                        <a href={item.receiptProof} download={item.receiptFileName} className="text-blue-600 hover:underline text-[9px]">
                          View
                        </a>
                      )}
                    </td>

                    {/* Kharchi */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-yellow-50/5 text-yellow-950">
                      {item.kharchi > 0 ? (
                        <span>{item.kharchi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Mess */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-purple-50/5 text-purple-950">
                      {item.mess > 0 ? (
                        <span>{item.mess.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Worker Advance */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-red-50/5 text-red-950">
                      {item.workerAdvance > 0 ? (
                        <span>{item.workerAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Tiffin */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-blue-50/5 text-indigo-950">
                      {item.tiffin > 0 ? (
                        <span>{item.tiffin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Travel */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-[#f0f9ff]/20 text-[#004e7c]">
                      {item.travel > 0 ? (
                        <span>{item.travel.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Machinery & Material */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-orange-50/5 text-[#a34e00]">
                      {item.machineryMaterial > 0 ? (
                        <span>{item.machineryMaterial.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Worker Payment */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-emerald-50/5 text-emerald-950">
                      {item.workerPayment > 0 ? (
                        <span>{item.workerPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Stationery */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-pink-50/5 text-pink-955">
                      {item.stationery > 0 ? (
                        <span>{item.stationery.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Others */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-slate-100/50 text-slate-900">
                      {item.others > 0 ? (
                        <span>{item.others.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Bank */}
                    <td className="border border-black py-1.5 text-center font-bold text-slate-800 uppercase select-none">
                      {item.bank || ''}
                    </td>

                    {/* Cr.Balance */}
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-black bg-green-50/30">
                      {item.crBalance > 0 ? (
                        <span>{item.crBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Dynamic Avl Balance with elegant design */}
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-black bg-[#edf2f7]/50 text-[var(--color-sap-blue-val)]">
                      ₹{item.avlBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    {!isReadOnly && (
                      <td className="border border-black py-1.5 text-center print:hidden select-none">
                        <button 
                          onClick={() => handleEdit(item)} 
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                          title="Edit transaction detail"
                        >
                          <Edit size={11} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(item.id)} 
                          className="text-red-600 hover:text-red-800 ml-2 cursor-pointer"
                          title="Delete transaction record"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredLedger.length === 0 && (
              <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <td colSpan={isReadOnly ? 17 : 18} className="border border-black py-10 text-center text-gray-500 font-semibold italic bg-amber-50/10">
                  No fund flow transactions matched selected options.
                </td>
              </motion.tr>
            )}
          </tbody>
        </table>
        <div className="print-signature-section">
          <div className="print-signature-box">
            <div className="print-signature-title">Approved by Director</div>
            <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Warning/Confirmation Delete Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 font-sans animate-fade-in print:hidden">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-sm rounded-xs shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px]"
            >
              <div className="flex items-center space-x-2 text-red-600 border-b pb-2 mb-3 font-bold uppercase text-[12px]">
                <Trash2 size={16} />
                <span>Delete Ledger Transaction</span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-700 mb-4">
                Are you absolutely sure you want to permanently delete this transaction record from the Expenses Ledger? This action recalculates the Available Balance sequence dynamically.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="sap-btn bg-gray-100 border-gray-300 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="sap-btn bg-red-600 text-white border-red-700 hover:bg-red-700 cursor-pointer"
                >
                  Yes, Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DuplicateWarningModal
        isOpen={dupModalOpen}
        moduleName="Expenses Ledger"
        warningText="Warning: An expense with the same Date, Category, Site and Amount already exists. Please verify details before proceeding."
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

      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['date', 'description', 'projectId', 'kharchi', 'mess', 'workerAdvance', 'tiffin', 'travel', 'machineryMaterial', 'workerPayment', 'stationery', 'others', 'bank', 'crBalance']}
        entityName="Expenses Ledger"
        projectsContext={projects}
        onUpload={async (data) => {
          for (const item of data) {
            await addExpenseEntry({
              date: item.date || new Date().toISOString().split('T')[0],
              description: item.description || 'Spreadsheet Import Entry',
              projectId: item.projectId || '',
              kharchi: Number(item.kharchi) || 0,
              mess: Number(item.mess) || 0,
              workerAdvance: Number(item.workerAdvance) || 0,
              tiffin: Number(item.tiffin) || 0,
              travel: Number(item.travel) || 0,
              machineryMaterial: Number(item.machineryMaterial) || 0,
              workerPayment: Number(item.workerPayment) || 0,
              stationery: Number(item.stationery) || 0,
              others: Number(item.others) || 0,
              bank: item.bank || '',
              crBalance: Number(item.crBalance) || 0
            });
          }
        }}
      />
    </div>
  );
};
