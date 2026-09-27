import React, { useState, useMemo, useEffect } from 'react';
import { SAPSelect } from '../components/SAPSelect';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { F4Help } from '../components/F4Help';
import { Save, Edit, X, Trash2, Send, Lock, AlertCircle, CheckCircle2, RefreshCw, FileSpreadsheet, FolderOpen, Calendar, CheckSquare, Square, Eye, Plus, ChevronRight } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { checkWorkerPaymentDuplicate, addOverrideLog } from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { PDFExportButton } from '../components/PDFExportButton';
import { SAPTransactionHeader } from '../components/common/SAPTransactionHeader';
import { SAPTabs } from '../components/common/SAPTabs';
import { SapSection, SapFieldGrid, SapField, SapLookupField } from '../components/common/SapComponents';
import * as XLSX from 'xlsx';

export interface WorkerPaymentProps {
  initialWorkerId?: string;
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}

export const WorkerPayment: React.FC<WorkerPaymentProps> = ({ initialWorkerId, onUnsavedChange }) => {
  const { 
    user, 
    workerPayments, 
    projects, 
    workers, 
    kharchis, 
    advances, 
    paymentSheetApprovals = [],
    workerLedger = [],
    floorAbstracts = [],
    addWorkerPayment, 
    updateWorkerPayment, 
    deleteWorkerPayment,
    addPaymentSheetApproval
  } = useAppContext();
  
  const isReadOnly = user?.username === 'saddamsne';
  const [selectedProject, setSelectedProject] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Duplicate verification state
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupData, setDupData] = useState<any[]>([]);
  const [pendingSaveFn, setPendingSaveFn] = useState<((overrideReason?: string) => void) | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCategory, setSelectedCategory] = useState('Monthly work');
  const [selectedTower, setSelectedTower] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'earnings' | 'deductions' | 'abstract' | 'ledger'>('details');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitRemarks, setSubmitRemarks] = useState('');
  const [isSubmittingSheet, setIsSubmittingSheet] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showSupplyReport, setShowSupplyReport] = useState(false);
  const [showPaymentSheetReport, setShowPaymentSheetReport] = useState(false);
  const [supplyEntry, setSupplyEntry] = useState({ description: '', hours: '', rate: '' });

  // Floor Abstract state
  const [showFloorAbstractPopup, setShowFloorAbstractPopup] = useState(false);
  const [floorFilterLevel, setFloorFilterLevel] = useState('');
  const [tempFloorSelections, setTempFloorSelections] = useState<Array<{ floorAbstractId: string; level: string; flatNo: string; hajira: number; amount: number }>>([]);

  // Kharchi & Advance Date-by-date Selection state
  const [showKharchiModal, setShowKharchiModal] = useState(false);
  const [tempKharchiSelections, setTempKharchiSelections] = useState<string[]>([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [tempAdvanceSelections, setTempAdvanceSelections] = useState<string[]>([]);
  const [advanceFilterMode, setAdvanceFilterMode] = useState<'month' | 'all'>('month');

  const [formData, setFormData] = useState({
    workerId: '', 
    month: selectedMonth, 
    workAmount: '', 
    workDays: '',
    ratePerDay: '',
    overtimeHours: '',
    allowance: '',
    manualKharchi: '',
    selectedKharchiIds: [] as string[],
    manualAdvance: '',
    selectedAdvanceIds: [] as string[],
    messDeduction: '', 
    level: '',
    towerName: '',
    supplyAmount: '',
    date: new Date().toISOString().split('T')[0],
    supplyDetails: [] as import('../types').SupplyDetail[],
    recoveryAmount: '',
    otherDeduction: '',
    otherDeductionDetails: '',
    paymentStatus: 'Pending',
    selectedFloorAbstracts: [] as Array<{ floorAbstractId: string; level: string; flatNo: string; hajira: number; amount: number }>
  });

  useEffect(() => {
    if (initialWorkerId && workers) {
      const targetWorker = workers.find(w => w.id === initialWorkerId);
      if (targetWorker) {
        setSearchQuery(targetWorker.name);
      }
    }
  }, [initialWorkerId, workers]);

  const hasUnsaved = editingId !== null || formData.workerId !== '';
  useEffect(() => {
    if (onUnsavedChange) {
      onUnsavedChange(hasUnsaved);
    }
  }, [hasUnsaved, onUnsavedChange]);

  // Keep month field updated with month selector unless editing a different month
  useEffect(() => {
    if (!editingId) {
      setFormData(prev => {
        if (prev.month === selectedMonth) return prev;
        return { 
          ...prev, 
          month: selectedMonth,
          manualKharchi: '',
          selectedKharchiIds: [],
          manualAdvance: '',
          selectedAdvanceIds: []
        };
      });
    }
  }, [selectedMonth, editingId]);

  const handleEdit = (payment: any) => {
    setFormData({
      workerId: payment.workerId,
      month: payment.month,
      workAmount: payment.workAmount.toString(),
      workDays: payment.workDays ? payment.workDays.toString() : '',
      ratePerDay: payment.ratePerDay ? payment.ratePerDay.toString() : '',
      overtimeHours: payment.overtimeHours ? payment.overtimeHours.toString() : '',
      allowance: payment.allowance ? payment.allowance.toString() : '',
      manualKharchi: payment.kharchiDeduction !== undefined && payment.kharchiDeduction !== null ? payment.kharchiDeduction.toString() : '',
      selectedKharchiIds: payment.kharchiDetailsJson ? JSON.parse(payment.kharchiDetailsJson) : [],
      manualAdvance: payment.advanceDeduction !== undefined && payment.advanceDeduction !== null ? payment.advanceDeduction.toString() : '',
      selectedAdvanceIds: payment.advanceDetailsJson ? JSON.parse(payment.advanceDetailsJson) : [],
      messDeduction: payment.messDeduction.toString(),
      level: payment.level || '',
      towerName: payment.towerName || '',
      supplyAmount: (payment.supplyAmount || 0).toString(),
      date: payment.date,
      supplyDetails: payment.supplyDetails ? JSON.parse(payment.supplyDetails) : [],
      recoveryAmount: payment.recoveryAmount ? payment.recoveryAmount.toString() : '',
      otherDeduction: payment.otherDeduction ? payment.otherDeduction.toString() : '',
      otherDeductionDetails: payment.otherDeductionDetails || '',
      paymentStatus: payment.paymentStatus || 'Pending',
      selectedFloorAbstracts: payment.floorAbstractsJson ? JSON.parse(payment.floorAbstractsJson) : []
    });
    setEditingId(payment.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ 
      workerId: '', 
      month: selectedMonth, 
      workAmount: '', 
      workDays: '',
      ratePerDay: '',
      overtimeHours: '',
      allowance: '',
      manualKharchi: '',
      selectedKharchiIds: [],
      manualAdvance: '',
      selectedAdvanceIds: [],
      messDeduction: '', 
      level: '',
      towerName: '',
      supplyAmount: '',
      date: new Date().toISOString().split('T')[0],
      supplyDetails: [],
      recoveryAmount: '',
      otherDeduction: '',
      otherDeductionDetails: '',
      paymentStatus: 'Pending',
      selectedFloorAbstracts: []
    });
  };

  const selectedProjectObj = useMemo(() => {
    return projects.find(p => p.id === selectedProject);
  }, [selectedProject, projects]);

  const availableTowers = useMemo(() => {
    return selectedProjectObj?.towerNames || [];
  }, [selectedProjectObj]);

  const projectWorkers = useMemo(() => {
    if (!selectedProject) return [];
    return workers.filter(w => w.projectId === selectedProject);
  }, [selectedProject, workers]);

  // Filter payments by BOTH selected project and selected month
  const filteredPayments = useMemo(() => {
    if (!selectedProject || !selectedMonth) return [];
    return workerPayments.filter(p => 
      p.projectId === selectedProject && 
      p.month === selectedMonth && 
      (p.workCategory || 'Monthly work') === selectedCategory &&
      (!selectedTower || p.towerName === selectedTower)
    );
  }, [selectedProject, selectedMonth, selectedCategory, selectedTower, workerPayments]);

  const searchFilteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return filteredPayments;
    const q = searchQuery.toLowerCase();
    return filteredPayments.filter(p => {
      const worker = workers.find(w => w.id === p.workerId);
      const name = worker?.name.toLowerCase() || '';
      const idNo = worker?.workerId.toLowerCase() || '';
      const tower = p.towerName?.toLowerCase() || '';
      const level = p.level?.toLowerCase() || '';
      return name.includes(q) || idNo.includes(q) || tower.includes(q) || level.includes(q);
    });
  }, [filteredPayments, searchQuery, workers]);

  // Find the approval status of this project for this specific month
  const currentApproval = useMemo(() => {
    if (!selectedProject || !selectedMonth) return null;
    return paymentSheetApprovals.find(
      psa => psa.projectId === selectedProject && psa.month === selectedMonth
    );
  }, [paymentSheetApprovals, selectedProject, selectedMonth]);

  // Is editing completely locked because of Pending/Approved status?
  const isLocked = useMemo(() => {
    if (isReadOnly) return true;
    if (!currentApproval) return false;
    return currentApproval.status === 'Pending' || currentApproval.status === 'Approved';
  }, [currentApproval, isReadOnly]);

  // Helper date formatter: DD-MM-YYYY (Day)
  const formatDateWithDay = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year} (${dayName})`;
    } catch {
      return dateStr;
    }
  };

  // Worker Kharchis for the selected month
  const workerMonthKharchis = useMemo(() => {
    if (!formData.workerId || !formData.month) return [];
    return kharchis
      .filter(k => k.workerId === formData.workerId && k.date.startsWith(formData.month))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [kharchis, formData.workerId, formData.month]);

  // Worker Advances for the selected month (for optional monthly view)
  const workerMonthAdvances = useMemo(() => {
    if (!formData.workerId || !formData.month) return [];
    return advances
      .filter(a => a.workerId === formData.workerId && a.date.startsWith(formData.month))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [advances, formData.workerId, formData.month]);

  // Requirement 2: Worker advances must NOT be filtered only by the selected worker payment month.
  // During Worker Payment preparation, fetch all outstanding/unadjusted advance transactions for the selected worker
  // up to the worker payment date, irrespective of the month in which the advance was entered.
  const workerAllOutstandingAdvances = useMemo(() => {
    if (!formData.workerId) return [];
    const paymentDate = formData.date || new Date().toISOString().split('T')[0];
    return advances
      .filter(a => {
        if (a.workerId !== formData.workerId) return false;
        if (a.date > paymentDate) return false;
        if (editingId && a.adjustedInPaymentId === editingId) return true;
        const isAdj = a.status === 'Adjusted' || a.isDeducted === true;
        const amt = Number(a.amount) || 0;
        const outAmt = (a.outstandingAmount !== undefined && a.outstandingAmount !== null)
          ? Number(a.outstandingAmount)
          : (isAdj ? 0 : amt);
        return !isAdj && outAmt > 0;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [advances, formData.workerId, formData.date, editingId]);

  // Separate regular advances vs Previously Over Balance carry forwards
  const regularOutstandingAdvances = useMemo(() => {
    return workerAllOutstandingAdvances.filter(a => a.paymentType !== 'Previously Over Balance');
  }, [workerAllOutstandingAdvances]);

  const previouslyOverBalanceAdvances = useMemo(() => {
    return workerAllOutstandingAdvances.filter(a => a.paymentType === 'Previously Over Balance');
  }, [workerAllOutstandingAdvances]);

  const totalRegularOutstandingAdvance = useMemo(() => {
    return regularOutstandingAdvances.reduce((sum, a) => {
      const val = (a.outstandingAmount !== undefined && a.outstandingAmount !== null) ? Number(a.outstandingAmount) : (Number(a.amount) || 0);
      return sum + val;
    }, 0);
  }, [regularOutstandingAdvances]);

  const totalPreviouslyOverBalance = useMemo(() => {
    return previouslyOverBalanceAdvances.reduce((sum, a) => {
      const val = (a.outstandingAmount !== undefined && a.outstandingAmount !== null) ? Number(a.outstandingAmount) : (Number(a.amount) || 0);
      return sum + val;
    }, 0);
  }, [previouslyOverBalanceAdvances]);

  // Open & apply Kharchi Modal
  const handleOpenKharchiModal = () => {
    if (!formData.workerId) {
      alert("Please select a worker first to view and select their weekly kharchis.");
      return;
    }
    if (formData.selectedKharchiIds && formData.selectedKharchiIds.length > 0) {
      setTempKharchiSelections([...formData.selectedKharchiIds]);
    } else if (formData.manualKharchi === '' || Number(formData.manualKharchi) === autoCalculations.kharchi) {
      setTempKharchiSelections(workerMonthKharchis.map(k => k.id));
    } else {
      setTempKharchiSelections([]);
    }
    setShowKharchiModal(true);
  };

  const handleApplyKharchiSelection = () => {
    const selected = workerMonthKharchis.filter(k => tempKharchiSelections.includes(k.id));
    const total = selected.reduce((sum, k) => sum + k.amount, 0);
    setFormData(prev => ({
      ...prev,
      manualKharchi: total.toString(),
      selectedKharchiIds: tempKharchiSelections
    }));
    setShowKharchiModal(false);
  };

  // Open & apply Advance Modal
  const handleOpenAdvanceModal = () => {
    if (!formData.workerId) {
      alert("Please select a worker first to view and select their advances.");
      return;
    }
    if (formData.selectedAdvanceIds && formData.selectedAdvanceIds.length > 0) {
      setTempAdvanceSelections([...formData.selectedAdvanceIds]);
    } else {
      setTempAdvanceSelections(workerAllOutstandingAdvances.map(a => a.id));
    }
    setAdvanceFilterMode('all');
    setShowAdvanceModal(true);
  };

  const handleApplyAdvanceSelection = () => {
    const selected = workerAllOutstandingAdvances.filter(a => tempAdvanceSelections.includes(a.id));
    const regularSum = selected
      .filter(a => a.paymentType !== 'Previously Over Balance')
      .reduce((sum, a) => {
        const val = (a.outstandingAmount !== undefined && a.outstandingAmount !== null) ? Number(a.outstandingAmount) : (Number(a.amount) || 0);
        return sum + val;
      }, 0);
    setFormData(prev => ({
      ...prev,
      manualAdvance: regularSum.toString(),
      selectedAdvanceIds: tempAdvanceSelections
    }));
    setShowAdvanceModal(false);
  };

  // Auto-calculate deductions based on selected worker and month
  const autoCalculations = useMemo(() => {
    if (!formData.workerId || !formData.month) return { kharchi: 0, advance: 0 };
    
    // Kharchi for the selected month
    const kharchiTotal = kharchis
      .filter(k => k.workerId === formData.workerId && k.date.startsWith(formData.month))
      .reduce((sum, k) => sum + k.amount, 0);
      
    // Advance for the selected month
    const advanceTotal = advances
      .filter(a => a.workerId === formData.workerId && a.date.startsWith(formData.month))
      .reduce((sum, a) => sum + a.amount, 0);
      
    return { kharchi: kharchiTotal, advance: advanceTotal };
  }, [formData.workerId, formData.month, kharchis, advances]);

  // Calculate historical total outstanding advance for selected worker
  const workerOutstandingAdvance = useMemo(() => {
    if (!formData.workerId) return 0;
    return totalRegularOutstandingAdvance + totalPreviouslyOverBalance;
  }, [formData.workerId, totalRegularOutstandingAdvance, totalPreviouslyOverBalance]);

  const calculatedValues = useMemo(() => {
    let finalWorkAmount = Number(formData.workAmount) || 0;
    
    let finalKharchi = 0;
    if (formData.selectedKharchiIds && formData.selectedKharchiIds.length > 0) {
      finalKharchi = kharchis
        .filter(k => formData.selectedKharchiIds.includes(k.id))
        .reduce((sum, k) => sum + k.amount, 0);
    } else if (formData.manualKharchi !== '') {
      finalKharchi = Number(formData.manualKharchi);
    } else {
      finalKharchi = autoCalculations.kharchi;
    }

    // Advance deductions calculation
    let finalAdvance = 0;
    let finalPreviouslyOverBalance = 0;

    if (formData.selectedAdvanceIds && formData.selectedAdvanceIds.length > 0) {
      const selected = workerAllOutstandingAdvances.filter(a => formData.selectedAdvanceIds.includes(a.id));
      finalAdvance = selected
        .filter(a => a.paymentType !== 'Previously Over Balance')
        .reduce((sum, a) => {
          const val = (a.outstandingAmount !== undefined && a.outstandingAmount !== null) ? Number(a.outstandingAmount) : (Number(a.amount) || 0);
          return sum + val;
        }, 0);
      finalPreviouslyOverBalance = selected
        .filter(a => a.paymentType === 'Previously Over Balance')
        .reduce((sum, a) => {
          const val = (a.outstandingAmount !== undefined && a.outstandingAmount !== null) ? Number(a.outstandingAmount) : (Number(a.amount) || 0);
          return sum + val;
        }, 0);
    } else if (formData.manualAdvance !== '') {
      finalAdvance = Number(formData.manualAdvance);
      finalPreviouslyOverBalance = totalPreviouslyOverBalance;
    } else {
      finalAdvance = totalRegularOutstandingAdvance;
      finalPreviouslyOverBalance = totalPreviouslyOverBalance;
    }

    const totalAdvanceDeduction = finalAdvance + finalPreviouslyOverBalance;

    if (selectedCategory === 'Monthly work') {
      const days = Number(formData.workDays) || 0;
      const rate = Number(formData.ratePerDay) || 0;
      const otHours = Number(formData.overtimeHours) || 0;
      const otRate = rate / 12;
      const allow = Number(formData.allowance) || 0;
      
      const abstractAmount = formData.selectedFloorAbstracts?.reduce((sum, fa) => sum + (fa.amount || 0), 0) || 0;
      
      finalWorkAmount = (days * rate) + (otHours * otRate) + allow + abstractAmount;
    }

    const messDeduction = Number(formData.messDeduction) || 0;
    const supplyAmount = Number(formData.supplyAmount) || 0;
    const recoveryAmount = Number(formData.recoveryAmount) || 0;
    const otherDeductionAmount = Number(formData.otherDeduction) || 0;
    
    const grossPayable = finalWorkAmount + supplyAmount;
    const totalDeductions = messDeduction + finalKharchi + totalAdvanceDeduction + recoveryAmount + otherDeductionAmount;
    
    // Negative Payment / Over Balance Logic (Requirement 4)
    // Calculated Net = Gross Payable - Total Deductions
    // If Calculated Net >= 0:
    //   Net Payment = Calculated Net
    //   Previously Over Balance = 0 (new carry forward)
    // If Calculated Net < 0:
    //   Net Payment = 0
    //   New Carry Forward Balance = ABS(Calculated Net)
    const calculatedNet = grossPayable - totalDeductions;
    const netPayment = calculatedNet >= 0 ? calculatedNet : 0;
    const newCarryForwardOverBalance = calculatedNet < 0 ? Math.abs(calculatedNet) : 0;

    return {
      workAmount: finalWorkAmount,
      kharchi: finalKharchi,
      advance: finalAdvance,
      previouslyOverBalance: finalPreviouslyOverBalance,
      totalAdvanceDeduction,
      recoveryAmount,
      otherDeduction: otherDeductionAmount,
      grossPayable,
      totalDeductions,
      calculatedNet,
      netPayment,
      newCarryForwardOverBalance
    };
  }, [formData, autoCalculations, selectedCategory, kharchis, workerAllOutstandingAdvances, totalRegularOutstandingAdvance, totalPreviouslyOverBalance]);

  const netPayment = calculatedValues.netPayment;

  // Calculate table column aggregations (matching Excel style)
  const totals = useMemo(() => {
    return searchFilteredPayments.reduce((acc, p) => {
      acc.gross += p.workAmount;
      acc.supply += p.supplyAmount || 0;
      acc.mess += p.messDeduction;
      acc.kharchi += p.kharchiDeduction;
      acc.advance += p.advanceDeduction;
      acc.recovery += p.recoveryAmount || 0;
      acc.otherDeduction += p.otherDeduction || 0;
      acc.net += p.netPayment;
      return acc;
    }, { gross: 0, supply: 0, mess: 0, kharchi: 0, advance: 0, recovery: 0, otherDeduction: 0, net: 0 });
  }, [searchFilteredPayments]);

  const allSupplyWorksInfo = useMemo(() => {
    return searchFilteredPayments.flatMap(payment => {
      try {
        const details = payment.supplyDetails ? JSON.parse(payment.supplyDetails) : [];
        return details.map((d: any) => ({
          ...d,
          workerName: workers.find(w => w.id === payment.workerId)?.name || 'Unknown',
          paymentId: payment.id,
        }));
      } catch (e) { return []; }
    });
  }, [searchFilteredPayments, workers]);

  // Floor Abstract Memos
  const matchingFloorAbstractsForWorker = useMemo(() => {
    if (!selectedProject || !formData.workerId) return [];
    const targetWorker = workers.find(w => w.id === formData.workerId);
    const targetWorkerDbId = targetWorker?.id;
    const targetWorkerIdNo = targetWorker?.workerId;
    
    return floorAbstracts.filter(fa => {
      if (fa.projectId !== selectedProject) return false;
      return fa.workers && fa.workers.some(w => w.workerId === targetWorkerDbId || w.workerId === targetWorkerIdNo);
    });
  }, [selectedProject, formData.workerId, floorAbstracts, workers]);

  const filteredMatchingFloorAbstracts = useMemo(() => {
    if (!floorFilterLevel) return matchingFloorAbstractsForWorker;
    return matchingFloorAbstractsForWorker.filter(fa => fa.level === floorFilterLevel);
  }, [matchingFloorAbstractsForWorker, floorFilterLevel]);

  const uniqueLevelsForWorker = useMemo(() => {
    const levels = matchingFloorAbstractsForWorker.map(fa => fa.level).filter(Boolean);
    return Array.from(new Set(levels)).sort();
  }, [matchingFloorAbstractsForWorker]);

  const popupSummary = useMemo(() => {
    const selectedFloorsSet = new Set(tempFloorSelections.map(x => x.level));
    const totalHajira = tempFloorSelections.reduce((sum, x) => sum + (x.hajira || 0), 0);
    const totalAmount = tempFloorSelections.reduce((sum, x) => sum + (x.amount || 0), 0);
    return {
      floors: Array.from(selectedFloorsSet).join(', ') || 'None',
      totalHajira,
      totalAmount
    };
  }, [tempFloorSelections]);

  const exportToExcel = () => {
    if (!selectedProject) return;

    const project = projects.find(p => p.id === selectedProject);
    const projectName = project ? project.name : 'Unknown Project';

    const tableData: any[] = searchFilteredPayments.map(p => {
      const w = getWorkerDetails(p.workerId);
      const totalDed = p.messDeduction + p.kharchiDeduction + p.advanceDeduction + (p.recoveryAmount || 0) + (p.otherDeduction || 0);
      return {
        'Sr No': w.srNo || '',
        'ID No': w.idNo || '',
        'Worker Name': w.name,
        'Tower/Block': p.towerName || '-',
        'Work Area': p.level ? p.level : (p.floorAbstractsJson ? Array.from(new Set(JSON.parse(p.floorAbstractsJson).map((x: any) => x.level))).join(', ') : '-'),
        'Month': p.month,
        'Gross Wages (INR)': p.workAmount,
        'Supply Amt (INR)': p.supplyAmount || 0,
        'Mess Deduction (INR)': p.messDeduction,
        'Kharchi Deduction (INR)': p.kharchiDeduction,
        'Advance Deduction (INR)': p.advanceDeduction,
        'Recovery (Adv) (INR)': p.recoveryAmount || 0,
        'Other Deduction (INR)': p.otherDeduction || 0,
        'Net Payable (INR)': p.netPayment,
        'Status': p.paymentStatus || 'Pending'
      };
    });

    // Append total row
    tableData.push({
      'Sr No': 'Totals',
      'ID No': '',
      'Worker Name': '',
      'Tower/Block': '',
      'Work Area': '',
      'Month': '',
      'Gross Wages (INR)': totals.gross,
      'Supply Amt (INR)': totals.supply,
      'Mess Deduction (INR)': totals.mess,
      'Kharchi Deduction (INR)': totals.kharchi,
      'Advance Deduction (INR)': totals.advance,
      'Recovery (Adv) (INR)': totals.recovery,
      'Other Deduction (INR)': totals.otherDeduction,
      'Net Payable (INR)': totals.net,
      'Status': ''
    });

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Wage Ledger");
    XLSX.writeFile(wb, `Wage_Ledger_${projectName.replace(/\s+/g, '_')}_${selectedMonth}_${selectedCategory.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || isLocked) return;

    const targetProjectObj = projects.find(p => p.id === selectedProject);
    if (targetProjectObj?.status === 'Completed') {
      alert("This project is marked as Completed. New entries are not allowed.");
      return;
    }
    
    const consumedAdvanceIds = (formData.selectedAdvanceIds && formData.selectedAdvanceIds.length > 0)
      ? formData.selectedAdvanceIds
      : workerAllOutstandingAdvances.map(a => a.id);

    const paymentData = {
      projectId: selectedProject,
      workerId: formData.workerId,
      month: formData.month,
      workAmount: calculatedValues.workAmount,
      workDays: selectedCategory === 'Monthly work' ? Number(formData.workDays) || 0 : undefined,
      ratePerDay: selectedCategory === 'Monthly work' ? Number(formData.ratePerDay) || 0 : undefined,
      overtimeHours: selectedCategory === 'Monthly work' ? Number(formData.overtimeHours) || 0 : undefined,
      allowance: selectedCategory === 'Monthly work' ? Number(formData.allowance) || 0 : undefined,
      messDeduction: Number(formData.messDeduction),
      kharchiDeduction: calculatedValues.kharchi,
      advanceDeduction: calculatedValues.totalAdvanceDeduction,
      previouslyOverBalance: calculatedValues.previouslyOverBalance,
      newCarryForwardOverBalance: calculatedValues.newCarryForwardOverBalance,
      consumedAdvanceIds: consumedAdvanceIds,
      netPayment: netPayment,
      date: formData.date,
      level: formData.level || undefined,
      workCategory: selectedCategory,
      supplyAmount: Number(formData.supplyAmount || 0),
      supplyDetails: formData.supplyDetails.length > 0 ? JSON.stringify(formData.supplyDetails) : undefined,
      recoveryAmount: Number(formData.recoveryAmount || 0),
      otherDeduction: Number(formData.otherDeduction || 0),
      otherDeductionDetails: formData.otherDeductionDetails,
      paymentStatus: (formData.paymentStatus || 'Pending') as 'Pending' | 'Paid',
      floorAbstractsJson: formData.selectedFloorAbstracts && formData.selectedFloorAbstracts.length > 0 ? JSON.stringify(formData.selectedFloorAbstracts) : undefined,
      towerName: formData.towerName || undefined,
      kharchiDetailsJson: formData.selectedKharchiIds.length > 0 ? JSON.stringify(formData.selectedKharchiIds) : undefined,
      advanceDetailsJson: consumedAdvanceIds.length > 0 ? JSON.stringify(consumedAdvanceIds) : undefined
    };

    const onProceedSave = (bypassCheck: boolean = false, overrideReason: string = '') => {
      if (editingId) {
        updateWorkerPayment(editingId, paymentData);
      } else {
        addWorkerPayment(paymentData);
      }
      
      if (bypassCheck && overrideReason) {
        addOverrideLog(
          user?.username || 'Unknown',
          'Worker Payment',
          `Worker: ${workers.find(w => w.id === formData.workerId)?.name || 'Unknown'} (ID: ${formData.workerId}), Period: ${formData.month}, Date: ${formData.date}, Net Amount: Rs ${netPayment.toLocaleString()}`,
          overrideReason
        );
      }
      handleCancel();
    };

    const countMatches = checkWorkerPaymentDuplicate(
      workerPayments,
      {
         workerId: formData.workerId,
         month: formData.month,
         date: formData.date,
         amount: netPayment
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

  const handleSendToApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || filteredPayments.length === 0 || isLocked) return;

    addPaymentSheetApproval({
      projectId: selectedProject,
      month: selectedMonth,
      totalAmount: totals.net,
      remarks: submitRemarks || `Monthly payment sheet generated for ${selectedMonth}`,
      date: new Date().toISOString().split('T')[0]
    });

    setSubmitRemarks('');
    setIsSubmittingSheet(false);
  };

  const handleAddSupplyWork = () => {
    if (!supplyEntry.description || !supplyEntry.hours || !supplyEntry.rate) return;
    const hours = Number(supplyEntry.hours) || 0;
    const rate = Number(supplyEntry.rate) || 0;
    const total = hours * rate;
    
    setFormData(prev => {
      const newDetails = [...prev.supplyDetails, { id: crypto.randomUUID(), description: supplyEntry.description, hours, rate, total }];
      const newSupplyAmount = newDetails.reduce((sum, d) => sum + d.total, 0);
      return { ...prev, supplyDetails: newDetails, supplyAmount: newSupplyAmount.toString() };
    });
    setSupplyEntry({ description: '', hours: '', rate: '' });
  };

  const handleRemoveSupplyWork = (id: string) => {
    setFormData(prev => {
      const newDetails = prev.supplyDetails.filter(d => d.id !== id);
      const newSupplyAmount = newDetails.reduce((sum, d) => sum + d.total, 0);
      return { ...prev, supplyDetails: newDetails, supplyAmount: newSupplyAmount.toString() };
    });
  };

  const getWorkerDetails = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker ? { name: worker.name, idNo: worker.workerId, srNo: worker.serialNo } : { name: 'Unknown', idNo: '-', srNo: '-' };
  };

  return (
    <div className="text-[12px] space-y-2 font-sans text-[#303b44] pb-12">
      {/* SAP Screen Header: PAY01 */}
      <SAPTransactionHeader
        tcode="PAY01"
        title="Worker Payment Settlement"
        subtitle="Monthly Payroll Postings, Kharchi/Advance Deductions & Floor Abstract Sync"
        onNew={handleCancel}
        onSave={() => handleSubmit({ preventDefault: () => {} } as any)}
        onRefresh={() => window.location.reload()}
        onPrint={() => window.print()}
        onExport={exportToExcel}
        canSave={!isLocked && !isReadOnly && !!formData.workerId}
        canEdit={false}
        canDelete={false}
      />

      {/* 1. SELECTION PARAMETERS (Classic SAP Selection screen header) */}
      <div className="bg-[#f4f7f8] border border-[#bcc8d0] p-2 text-[12px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 items-center">
          {/* Project Site */}
          <div className="flex items-center space-x-2">
            <label className="w-24 shrink-0 text-right text-[#303b44] font-normal">Project:</label>
            <SAPSelect 
              className="sap-input flex-1 min-w-0 font-medium" 
              value={selectedProject} 
              onChange={e => {
                setSelectedProject(e.target.value);
                setSelectedTower('');
                handleCancel();
              }}
            >
              <option value="">-- Choose Project --</option>
              {projects.filter(p => showCompleted ? true : (!p.status || p.status === 'Ongoing')).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SAPSelect>
          </div>

          {/* Wage Month */}
          <div className="flex items-center space-x-2">
            <label className="w-24 shrink-0 text-right text-[#303b44] font-normal">Wage Month:</label>
            <input 
              type="month" 
              className="sap-input flex-1 min-w-0 font-medium" 
              value={selectedMonth} 
              onChange={e => {
                setSelectedMonth(e.target.value);
                handleCancel();
              }}
            />
          </div>

          {/* Work Type */}
          <div className="flex items-center space-x-2">
            <label className="w-24 shrink-0 text-right text-[#303b44] font-normal">Work Type:</label>
            <SAPSelect 
              className="sap-input flex-1 min-w-0 font-medium" 
              value={selectedCategory} 
              onChange={e => {
                setSelectedCategory(e.target.value);
                handleCancel();
              }}
            >
              <option value="Monthly work">Monthly work</option>
              <option value="Contract work">Contract work</option>
            </SAPSelect>
          </div>

          {/* Tower / Block */}
          <div className="flex items-center space-x-2">
            <label className="w-24 shrink-0 text-right text-[#303b44] font-normal">Tower/Block:</label>
            <SAPSelect 
              className="sap-input flex-1 min-w-0 font-medium" 
              value={selectedTower} 
              onChange={e => {
                setSelectedTower(e.target.value);
                handleCancel();
              }}
            >
              <option value="">All Towers</option>
              {availableTowers.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SAPSelect>
          </div>

          {/* Search Worker with attached [+] */}
          <div className="flex items-center space-x-2">
            <label className="w-24 shrink-0 text-right text-[#303b44] font-normal">Search Worker:</label>
            <div className="flex-1 min-w-0 flex items-center">
              <input
                type="text"
                className="sap-input flex-1 min-w-0"
                placeholder="Name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {}}
                className="sap-lookup-btn"
                title="Add / Filter Worker"
              >
                <Plus size={11} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Show completed projects */}
          <div className="flex items-center space-x-2 pl-2">
            <label className="flex items-center space-x-1.5 cursor-pointer text-[#63717b] text-[11px]">
              <input 
                type="checkbox" 
                checked={showCompleted} 
                onChange={e => setShowCompleted(e.target.checked)} 
                className="rounded-none border-[#bcc8d0]"
              />
              <span>Show Completed Projects</span>
            </label>
          </div>
        </div>
      </div>

      {/* Lock and Approval Workflows Indicators (Flat, minimal) */}
      {selectedProject && currentApproval && (
        <div className="bg-[#f4f7f8] border border-[#bcc8d0] px-3 py-1 flex items-center justify-between text-[11px] text-[#303b44]">
          <div className="flex items-center space-x-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${currentApproval.status === 'Approved' ? 'bg-emerald-600' : currentApproval.status === 'Rejected' ? 'bg-red-600' : 'bg-amber-500'}`}></span>
            <span className="font-semibold">Sheet Status: {currentApproval.status}</span>
            <span className="text-[#63717b] truncate">| Submitted: {currentApproval.date}</span>
            {currentApproval.remarks && (
              <span className="text-[#63717b] italic font-mono text-[10px] truncate">("{currentApproval.remarks}")</span>
            )}
          </div>
          {isLocked && <span className="text-amber-800 font-mono text-[10px] shrink-0 font-medium ml-2">🔒 Records Locked</span>}
        </div>
      )}

      {selectedProject && projects.find(p => p.id === selectedProject)?.status === 'Completed' && (
        <div className="bg-[#fffde7] border border-[#bcc8d0] text-amber-900 px-3 py-1 text-[11px] font-semibold">
          This project is marked as Completed. New entries and updates are read-only.
        </div>
      )}

      {/* 2. TRANSACTION SUB-TABS (Classic SAP Tab Bar: Flat, thin underline, no pills) */}
      {selectedProject && (
        <SAPTabs
          tabs={[
            { id: 'details', label: 'Payment Details' },
            { id: 'earnings', label: 'Earnings' },
            { id: 'deductions', label: 'Deductions' },
            { id: 'abstract', label: 'Abstract', count: formData.selectedFloorAbstracts?.length || 0 },
            { id: 'ledger', label: 'Ledger', count: searchFilteredPayments.length },
          ]}
          activeTab={activeTab}
          onChange={(tabId: any) => setActiveTab(tabId)}
          className="my-1"
        />
      )}

      {!selectedProject ? (
        <div className="bg-white border border-[#bcc8d0] p-8 text-center text-[#63717b]">
          <p className="font-semibold text-[13px] text-[#303b44]">Please select a Project Site above to enter PAY01 Worker Payment Settlement.</p>
          <p className="text-[11px] mt-1">Select project site and wage month to post payroll settlements, manage deductions, or generate wage register.</p>
        </div>
      ) : (
        <>
          {/* TAB 1: PAYMENT DETAILS (Classic SAP Transaction Screen) */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              {!isLocked && projects.find(p => p.id === selectedProject)?.status !== 'Completed' && (
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div className="bg-white border border-[#bcc8d0] p-3">
                    {/* Header Group: Worker Payment Details */}
                    <div className="sap-section-header">
                      <span>Worker Payment Details</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-[12px] mb-2">
                      {/* Worker Selection with attached [+] */}
                      <div className="flex items-center space-x-2">
                        <label className="w-28 shrink-0 text-right text-[#303b44]">
                          Worker<span className="text-red-600 ml-0.5">*</span>:
                        </label>
                        <div className="flex-1 min-w-0">
                          <SAPSelect 
                            required 
                            className="sap-input w-full" 
                            value={formData.workerId} 
                            onChange={e => setFormData({
                              ...formData, 
                              workerId: e.target.value,
                              manualKharchi: '',
                              selectedKharchiIds: [],
                              manualAdvance: '',
                              selectedAdvanceIds: [],
                              selectedFloorAbstracts: []
                            })}
                          >
                            <option value="">-- Choose Worker --</option>
                            {projectWorkers.map(w => (
                              <option key={w.id} value={w.id}>{w.workerId} - {w.name}</option>
                            ))}
                          </SAPSelect>
                        </div>
                      </div>

                      {/* Issue Date */}
                      <div className="flex items-center space-x-2">
                        <label className="w-28 shrink-0 text-right text-[#303b44]">
                          Issue Date<span className="text-red-600 ml-0.5">*</span>:
                        </label>
                        <div className="flex-1 min-w-0">
                          <input 
                            required 
                            type="date" 
                            className="sap-input w-full" 
                            value={formData.date} 
                            onChange={e => setFormData({...formData, date: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Earnings Fields (Work Days, Rate/Day, OT Hours, Allowance) */}
                    {selectedCategory === 'Monthly work' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[12px] mb-2 p-2 bg-[#f4f7f8] border border-[#bcc8d0]/60">
                        <div className="flex items-center space-x-1.5">
                          <label className="w-20 shrink-0 text-right text-[#303b44]">Work Days:</label>
                          <input
                            required
                            type="number"
                            step="any"
                            className="sap-input flex-1 min-w-0 font-medium"
                            value={formData.workDays}
                            onChange={e => setFormData({...formData, workDays: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <label className="w-20 shrink-0 text-right text-[#303b44]">Rate/Day:</label>
                          <input
                            required
                            type="number"
                            step="any"
                            className="sap-input flex-1 min-w-0 font-medium"
                            value={formData.ratePerDay}
                            onChange={e => setFormData({...formData, ratePerDay: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <label className="w-20 shrink-0 text-right text-[#303b44]">OT Hours:</label>
                          <input
                            type="number"
                            step="any"
                            className="sap-input flex-1 min-w-0 font-medium"
                            value={formData.overtimeHours}
                            onChange={e => setFormData({...formData, overtimeHours: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <label className="w-20 shrink-0 text-right text-[#303b44]">Allowance:</label>
                          <input
                            type="number"
                            step="any"
                            className="sap-input flex-1 min-w-0 font-medium"
                            value={formData.allowance}
                            onChange={e => setFormData({...formData, allowance: e.target.value})}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-[12px] mb-2 p-2 bg-[#f4f7f8] border border-[#bcc8d0]/60">
                        <div className="flex items-center space-x-2">
                          <label className="w-28 shrink-0 text-right text-[#303b44]">Gross Amount:</label>
                          <div className="flex-1 min-w-0 flex items-center">
                            <span className="text-[#63717b] mr-1">₹</span>
                            <input 
                              required 
                              type="number" 
                              step="any"
                              className="sap-input flex-1 min-w-0 font-medium" 
                              placeholder="0.00"
                              value={formData.workAmount} 
                              onChange={e => setFormData({...formData, workAmount: e.target.value})} 
                            />
                          </div>
                        </div>
                        {formData.workerId && (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTempFloorSelections(formData.selectedFloorAbstracts || []);
                                setFloorFilterLevel('');
                                setShowFloorAbstractPopup(true);
                              }}
                              className="sap-btn"
                            >
                              Import From Floor Abstract
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tower, Location & Supply Work */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[12px] mb-1">
                      <div className="flex items-center space-x-1.5">
                        <label className="w-24 shrink-0 text-right text-[#303b44]">Tower/Block:</label>
                        <SAPSelect 
                          className="sap-input flex-1 min-w-0" 
                          value={formData.towerName} 
                          onChange={e => setFormData({...formData, towerName: e.target.value})}
                          disabled={availableTowers.length === 0}
                        >
                          <option value="">{availableTowers.length === 0 ? 'No Towers' : '-- Select --'}</option>
                          {availableTowers.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </SAPSelect>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <label className="w-20 shrink-0 text-right text-[#303b44]">Work Area:</label>
                        <input 
                          type="text" 
                          className="sap-input flex-1 min-w-0"
                          placeholder="Level / Area"
                          value={formData.level}
                          onChange={e => setFormData({...formData, level: e.target.value})}
                        />
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <label className="w-24 shrink-0 text-right text-[#303b44]">Supply Amt:</label>
                        <div className="flex-1 min-w-0 flex items-center">
                          <span className="text-[#63717b] mr-1">₹</span>
                          <input 
                            type="number" 
                            step="any"
                            readOnly
                            className="sap-input flex-1 min-w-0 bg-[#edf2f5]" 
                            value={formData.supplyAmount} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowSupplyModal(true)} 
                            className="sap-btn ml-1"
                            title="Add / Edit Supply Work Details"
                          >
                            + Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Linked floor abstracts indicator */}
                    {formData.selectedFloorAbstracts && formData.selectedFloorAbstracts.length > 0 && (
                      <div className="flex items-center justify-between text-[11px] bg-[#edf3f7] px-2 py-1 mt-1 border border-[#bcc8d0]/60">
                        <span className="text-[#303b44]">
                          Linked Floor Abstracts: <strong>{formData.selectedFloorAbstracts.length} item(s)</strong> (Floors: {formData.selectedFloorAbstracts.map(x => x.level).join(', ')})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTempFloorSelections(formData.selectedFloorAbstracts || []);
                            setFloorFilterLevel('');
                            setShowFloorAbstractPopup(true);
                          }}
                          className="text-[#2d6f91] hover:underline font-semibold"
                        >
                          Manage Abstract Links
                        </button>
                      </div>
                    )}

                    {/* Group: Deductions (Compact SAP-style form/table as specified in requirement 7) */}
                    <div className="sap-section-header mt-4">
                      <span>Deductions</span>
                    </div>

                    <div className="border border-[#bcc8d0] bg-white divide-y divide-[#bcc8d0]/60 text-[12px]">
                      {/* Weekly Kharchi */}
                      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-[#f7f9fa]">
                        <span className="w-48 text-[#303b44] font-normal">Weekly Kharchi</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[#63717b]">₹</span>
                          <input 
                            type="number" 
                            step="any"
                            className="sap-input w-36 text-right font-medium" 
                            placeholder={autoCalculations.kharchi > 0 ? autoCalculations.kharchi.toString() : "0.00"}
                            value={formData.manualKharchi} 
                            onChange={e => setFormData({...formData, manualKharchi: e.target.value, selectedKharchiIds: []})} 
                          />
                          <button
                            type="button"
                            onClick={handleOpenKharchiModal}
                            className="sap-btn"
                            title="Select Specific Kharchi Dates"
                          >
                            Select ({formData.selectedKharchiIds.length > 0 ? formData.selectedKharchiIds.length : workerMonthKharchis.length})
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenKharchiModal}
                            className="sap-btn"
                            title="View Date-by-Date Kharchi List"
                          >
                            Details
                          </button>
                        </div>
                      </div>

                      {/* Outstanding Advances */}
                      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-[#f7f9fa]">
                        <span className="w-48 text-[#303b44] font-normal">Outstanding Advances</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[#63717b]">₹</span>
                          <input 
                            type="number" 
                            step="any"
                            className="sap-input w-36 text-right font-medium" 
                            placeholder={totalRegularOutstandingAdvance > 0 ? totalRegularOutstandingAdvance.toString() : "0.00"}
                            value={formData.manualAdvance !== '' ? formData.manualAdvance : ''} 
                            onChange={e => setFormData({...formData, manualAdvance: e.target.value, selectedAdvanceIds: []})} 
                          />
                          <button
                            type="button"
                            onClick={handleOpenAdvanceModal}
                            className="sap-btn"
                            title="Select Specific Advances"
                          >
                            Select ({formData.selectedAdvanceIds.length > 0 ? formData.selectedAdvanceIds.length : workerAllOutstandingAdvances.length})
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenAdvanceModal}
                            className="sap-btn"
                            title="View Outstanding Advance Breakdown"
                          >
                            Details
                          </button>
                        </div>
                      </div>

                      {/* Previously Over Balance */}
                      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-[#f7f9fa]">
                        <div className="flex items-center space-x-2">
                          <span className="text-[#303b44] font-normal">Previously Over Balance</span>
                          {calculatedValues.previouslyOverBalance > 0 && (
                            <span className="text-[10px] bg-[#dcecf6] text-[#2d6f91] px-1 font-mono">
                              Carry Forward Deficit
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[#63717b]">₹</span>
                          <input 
                            type="text" 
                            readOnly
                            className="sap-input w-36 text-right font-medium bg-[#edf2f5]" 
                            value={calculatedValues.previouslyOverBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          />
                          <div className="w-[66px]"></div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('deductions')}
                            className="sap-btn"
                            title="View Over Balance History"
                          >
                            Details
                          </button>
                        </div>
                      </div>

                      {/* Mess Deduction */}
                      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-[#f7f9fa]">
                        <span className="w-48 text-[#303b44] font-normal">Mess Deduction</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[#63717b]">₹</span>
                          <input 
                            required 
                            type="number" 
                            step="any"
                            className="sap-input w-36 text-right font-medium" 
                            placeholder="0.00"
                            value={formData.messDeduction} 
                            onChange={e => setFormData({...formData, messDeduction: e.target.value})} 
                          />
                          <div className="w-[136px]"></div>
                        </div>
                      </div>

                      {/* Other Deduction */}
                      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-[#f7f9fa]">
                        <div className="flex items-center space-x-2 flex-1 mr-4">
                          <span className="w-36 shrink-0 text-[#303b44] font-normal">Other Deduction</span>
                          <input 
                            type="text" 
                            className="sap-input flex-1 min-w-0"
                            placeholder="Reason / Details for other deduction..."
                            value={formData.otherDeductionDetails}
                            onChange={e => setFormData({...formData, otherDeductionDetails: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[#63717b]">₹</span>
                          <input 
                            type="number" 
                            step="any"
                            className="sap-input w-36 text-right font-medium" 
                            placeholder="0.00"
                            value={formData.otherDeduction}
                            onChange={e => setFormData({...formData, otherDeduction: e.target.value})}
                          />
                          <div className="w-[136px]"></div>
                        </div>
                      </div>

                      {/* Total Deduction Row */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#edf3f7] font-semibold">
                        <span className="text-[#303b44]">Total Deduction</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[#63717b]">₹</span>
                          <input 
                            type="text" 
                            readOnly
                            className="sap-input w-36 text-right font-bold bg-white" 
                            value={(calculatedValues.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          />
                          <div className="w-[136px]"></div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Settlement Summary */}
                    <div className="sap-section-header mt-4">
                      <span>Settlement Summary</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#f4f7f8] border border-[#bcc8d0] p-2.5 text-[12px]">
                      <div className="flex items-center space-x-2">
                        <label className="w-28 shrink-0 text-right text-[#303b44]">Gross Earnings:</label>
                        <span className="font-mono font-bold text-[#303b44] text-[13px]">
                          ₹{(calculatedValues.grossPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="w-28 shrink-0 text-right text-[#303b44]">Total Deduction:</label>
                        <span className="font-mono font-bold text-red-700 text-[13px]">
                          ₹{(calculatedValues.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="w-24 shrink-0 text-right text-[#2d6f91] font-bold">Net Payment:</label>
                        <span className="font-mono font-bold text-[#2d6f91] text-[14px]">
                          ₹{(calculatedValues.netPayment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="w-20 shrink-0 text-right text-[#303b44]">Status:</label>
                        <SAPSelect 
                          className="sap-input flex-1 min-w-0 font-semibold text-[#2d6f91]"
                          value={formData.paymentStatus}
                          onChange={e => setFormData({...formData, paymentStatus: e.target.value})}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </SAPSelect>
                      </div>
                    </div>

                    {/* Negative Net Deficit Carry Forward Notice */}
                    {calculatedValues.calculatedNet < 0 && (
                      <div className="bg-[#fffde7] border border-[#d97706] text-[#303b44] px-3 py-1.5 mt-2 text-[11px] flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <AlertCircle size={13} className="text-[#d97706] shrink-0" />
                          <span>
                            <strong>Negative Net (-₹{(calculatedValues.newCarryForwardOverBalance || 0).toLocaleString('en-IN')}):</strong> Cash payout is set to ₹0.00. The remaining balance of <strong>₹{(calculatedValues.newCarryForwardOverBalance || 0).toLocaleString('en-IN')}</strong> will automatically carry forward to next month as <strong>Previously Over Balance</strong>.
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[#d97706] text-[11px] shrink-0 ml-2">
                          Carry Fwd: ₹{(calculatedValues.newCarryForwardOverBalance || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="sap-action-bar mt-3">
                      {editingId && (
                        <button 
                          type="button" 
                          onClick={handleCancel} 
                          className="sap-btn"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type="submit" 
                        disabled={isLocked || isReadOnly} 
                        className="sap-btn sap-btn-save disabled:opacity-50"
                      >
                        <Save size={11} />
                        <span>{editingId ? 'Update Settlement' : 'Save Settlement'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Quick Settled Workers Register (ALV table underneath form) */}
              <div className="bg-white border border-[#bcc8d0] p-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#bcc8d0] mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-[12px] text-[#303b44]">
                      Settled Workers for {selectedMonth} ({searchFilteredPayments.length})
                    </span>
                    <span className="text-[11px] text-[#63717b]">| Net Total: ₹{(totals.net || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="text-[#2d6f91] hover:underline text-[11px] font-semibold flex items-center space-x-1"
                  >
                    <span>Open Full Wage Ledger View</span>
                    <ChevronRight size={12} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="sap-alv-table w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left w-12">Sr</th>
                        <th className="px-2 py-1 text-left w-20">ID</th>
                        <th className="px-2 py-1 text-left">Worker Name</th>
                        <th className="px-2 py-1 text-left w-24">Tower</th>
                        <th className="px-2 py-1 text-right w-24">Gross</th>
                        <th className="px-2 py-1 text-right w-20">Supply</th>
                        <th className="px-2 py-1 text-right w-20">Kharchi</th>
                        <th className="px-2 py-1 text-right w-20">Advance</th>
                        <th className="px-2 py-1 text-right w-24 font-bold text-[#2d6f91]">Net Payable</th>
                        <th className="px-2 py-1 text-center w-16">Status</th>
                        {!isLocked && <th className="px-2 py-1 text-center w-20">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {searchFilteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={isLocked ? 10 : 11} className="px-3 py-4 text-center text-[#63717b] italic">
                            No settled payment records found for {selectedMonth}. Fill out the form above to record settlements.
                          </td>
                        </tr>
                      ) : (
                        searchFilteredPayments.map(p => {
                          const w = getWorkerDetails(p.workerId);
                          const isCurrentEdit = editingId === p.id;
                          return (
                            <tr
                              key={p.id}
                              onClick={() => handleEdit(p)}
                              className={`cursor-pointer transition-colors ${
                                isCurrentEdit ? 'bg-[#dcecf6] font-semibold text-[#2d6f91]' : 'hover:bg-[#eef6fb]'
                              }`}
                            >
                              <td className="px-2 py-1 text-gray-500 font-mono text-[11px]">{w.srNo || '-'}</td>
                              <td className="px-2 py-1 font-mono text-[11px] text-[#2d6f91]">{w.idNo}</td>
                              <td className="px-2 py-1 font-medium text-[#303b44]">{w.name}</td>
                              <td className="px-2 py-1 text-gray-600">{p.towerName || '-'}</td>
                              <td className="px-2 py-1 text-right font-mono">₹{(Number(p.workAmount) || 0).toLocaleString('en-IN')}</td>
                              <td className="px-2 py-1 text-right font-mono text-green-700">₹{(Number(p.supplyAmount) || 0).toLocaleString('en-IN')}</td>
                              <td className="px-2 py-1 text-right font-mono text-red-650">₹{(Number(p.kharchiDeduction) || 0).toLocaleString('en-IN')}</td>
                              <td className="px-2 py-1 text-right font-mono text-red-650">₹{(Number(p.advanceDeduction) || 0).toLocaleString('en-IN')}</td>
                              <td className="px-2 py-1 text-right font-mono font-bold text-[#2d6f91]">
                                ₹{(Number(p.netPayment) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-2 py-1 text-center">
                                <span className={`px-1 py-0.2 text-[9px] uppercase font-mono ${
                                  p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.paymentStatus || 'Pending'}
                                </span>
                              </td>
                              {!isLocked && (
                                <td className="px-2 py-1 text-center" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-center space-x-1.5">
                                    <button 
                                      type="button" 
                                      onClick={() => handleEdit(p)} 
                                      className="text-[#2d6f91] hover:text-[#1a496b]" 
                                      title="Edit Record"
                                    >
                                      <Edit size={11} />
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => setDeleteId(p.id)} 
                                      className="text-red-600 hover:text-red-800" 
                                      title="Delete Record"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EARNINGS BREAKDOWN */}
          {activeTab === 'earnings' && (
            <div className="bg-white border border-[#bcc8d0] p-3 space-y-3">
              <div className="sap-section-header">
                <span>Earnings Details: {selectedCategory} ({selectedMonth})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                {/* Base Work Formula */}
                <div className="border border-[#bcc8d0] p-2.5 bg-[#f4f7f8]">
                  <h4 className="font-semibold text-[#303b44] mb-2 border-b border-[#bcc8d0] pb-1">
                    Base Wage Computation
                  </h4>
                  {selectedCategory === 'Monthly work' ? (
                    <div className="space-y-1.5 text-[11.5px]">
                      <div className="flex justify-between">
                        <span className="text-[#63717b]">Work Days Logged:</span>
                        <span className="font-mono font-bold">{formData.workDays || 0} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#63717b]">Daily Rate:</span>
                        <span className="font-mono font-bold">₹{Number(formData.ratePerDay || 0).toLocaleString('en-IN')} / day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#63717b]">Overtime Hours:</span>
                        <span className="font-mono">{formData.overtimeHours || 0} hrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#63717b]">Allowance:</span>
                        <span className="font-mono font-bold text-green-700">₹{Number(formData.allowance || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-t border-[#bcc8d0] pt-1.5 flex justify-between font-bold text-[#303b44]">
                        <span>Calculated Gross Wages:</span>
                        <span className="font-mono text-[13px]">₹{(calculatedValues.workAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[11.5px]">
                      <div className="flex justify-between">
                        <span className="text-[#63717b]">Contract Gross Work Amount:</span>
                        <span className="font-mono font-bold text-[13px]">₹{Number(formData.workAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-[10px] text-[#63717b] mt-1">
                        Contract work is valued as a fixed lumpsum certified amount per bill or floor abstract schedule.
                      </p>
                    </div>
                  )}
                </div>

                {/* Supply Work Summary */}
                <div className="border border-[#bcc8d0] p-2.5 bg-[#f4f7f8]">
                  <div className="flex items-center justify-between mb-2 border-b border-[#bcc8d0] pb-1">
                    <h4 className="font-semibold text-[#303b44]">Supply Work Items ({formData.supplyDetails?.length || 0})</h4>
                    <button 
                      type="button" 
                      onClick={() => setShowSupplyModal(true)} 
                      className="sap-btn"
                    >
                      <Plus size={11} />
                      <span>Add Supply Item</span>
                    </button>
                  </div>

                  {formData.supplyDetails && formData.supplyDetails.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {formData.supplyDetails.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white border border-[#bcc8d0] p-1.5 text-[11px]">
                          <div>
                            <div className="font-medium text-[#303b44]">{item.description}</div>
                            <div className="text-[10px] text-[#63717b] font-mono">{item.hours} hrs @ ₹{item.rate}/hr</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-green-700">₹{item.total.toLocaleString('en-IN')}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSupplyWork(item.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#63717b] italic py-3 text-center">
                      No additional supply work items attached to this worker's settlement. Click "+ Add Supply Item" to register extra tasks.
                    </p>
                  )}
                  <div className="border-t border-[#bcc8d0] mt-2 pt-1.5 flex justify-between font-bold text-[#303b44] text-[11.5px]">
                    <span>Total Supply Earnings:</span>
                    <span className="font-mono text-green-700">₹{Number(formData.supplyAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEDUCTIONS MANAGEMENT */}
          {activeTab === 'deductions' && (
            <div className="bg-white border border-[#bcc8d0] p-3 space-y-3">
              <div className="sap-section-header">
                <span>Deductions Register & Historical Balances</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                {/* Kharchi Deductions Detail */}
                <div className="border border-[#bcc8d0] p-2.5 bg-[#f4f7f8]">
                  <div className="flex items-center justify-between mb-2 border-b border-[#bcc8d0] pb-1">
                    <span className="font-semibold text-[#303b44]">
                      Weekly Kharchi for {formData.month} ({workerMonthKharchis.length} total)
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenKharchiModal}
                      className="sap-btn"
                    >
                      Date Selection
                    </button>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#63717b]">Month Kharchi Sum:</span>
                      <span className="font-mono font-bold text-red-650">₹{autoCalculations.kharchi.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#63717b]">Selected Kharchi Dates:</span>
                      <span className="font-mono">{formData.selectedKharchiIds.length > 0 ? `${formData.selectedKharchiIds.length} dates selected` : 'All month dates applied'}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-[#bcc8d0] pt-1">
                      <span>Applied Kharchi Deduction:</span>
                      <span className="font-mono text-red-700">₹{(calculatedValues.kharchi || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Outstanding Advances Detail */}
                <div className="border border-[#bcc8d0] p-2.5 bg-[#f4f7f8]">
                  <div className="flex items-center justify-between mb-2 border-b border-[#bcc8d0] pb-1">
                    <span className="font-semibold text-[#303b44]">
                      Outstanding Advances ({workerAllOutstandingAdvances.length} records)
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenAdvanceModal}
                      className="sap-btn"
                    >
                      Select Advances
                    </button>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#63717b]">Unadjusted Advances Total:</span>
                      <span className="font-mono font-bold text-amber-800">₹{totalRegularOutstandingAdvance.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#63717b]">Selected Advances:</span>
                      <span className="font-mono">{formData.selectedAdvanceIds.length > 0 ? `${formData.selectedAdvanceIds.length} advance(s)` : 'Auto-deduct all up to gross'}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-[#bcc8d0] pt-1">
                      <span>Applied Advance Deduction:</span>
                      <span className="font-mono text-red-700">₹{(calculatedValues.totalAdvanceDeduction || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Over Balance Carry Forward */}
                <div className="border border-[#bcc8d0] p-2.5 bg-[#f4f7f8]">
                  <h4 className="font-semibold text-[#303b44] mb-2 border-b border-[#bcc8d0] pb-1">
                    Previously Over Balance (Historical Deficit)
                  </h4>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#63717b]">Carried Over Balance:</span>
                      <span className="font-mono font-bold text-purple-900">
                        ₹{(calculatedValues.previouslyOverBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#63717b]">
                      When deductions exceed gross pay in previous settlements, the remaining deficit is absorbed and carried forward as Previously Over Balance.
                    </p>
                  </div>
                </div>

                {/* Mess & Other Deductions */}
                <div className="border border-[#bcc8d0] p-2.5 bg-[#f4f7f8]">
                  <h4 className="font-semibold text-[#303b44] mb-2 border-b border-[#bcc8d0] pb-1">
                    Mess & Sundry Deductions
                  </h4>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#63717b]">Mess Bill Deduction:</span>
                      <span className="font-mono font-bold">₹{Number(formData.messDeduction || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#63717b]">Other Deduction:</span>
                      <span className="font-mono font-bold">₹{Number(formData.otherDeduction || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {formData.otherDeductionDetails && (
                      <div className="text-[10px] text-[#63717b] italic font-sans">
                        Reason: {formData.otherDeductionDetails}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FLOOR ABSTRACT */}
          {activeTab === 'abstract' && (
            <div className="bg-white border border-[#bcc8d0] p-3 space-y-3">
              <div className="sap-section-header">
                <span>Linked Floor Abstract Quantity Schedules</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#bcc8d0]">
                <p className="text-[11px] text-[#63717b]">
                  Sync labour hajira and flat task completion directly from FLR01 Floor Abstracts.
                </p>
                {formData.workerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempFloorSelections(formData.selectedFloorAbstracts || []);
                      setFloorFilterLevel('');
                      setShowFloorAbstractPopup(true);
                    }}
                    className="sap-btn"
                  >
                    + Add / Sync Floor Abstracts
                  </button>
                )}
              </div>

              {formData.selectedFloorAbstracts && formData.selectedFloorAbstracts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="sap-alv-table w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left">Level / Floor</th>
                        <th className="px-2 py-1 text-left">Flat / Unit No</th>
                        <th className="px-2 py-1 text-right">Hajira / Days</th>
                        <th className="px-2 py-1 text-right">Computed Amount (INR)</th>
                        <th className="px-2 py-1 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.selectedFloorAbstracts.map(item => (
                        <tr key={item.floorAbstractId} className="hover:bg-[#f7f9fa]">
                          <td className="px-2 py-1 font-medium">{item.level}</td>
                          <td className="px-2 py-1">{item.flatNo}</td>
                          <td className="px-2 py-1 text-right font-mono">{item.hajira}</td>
                          <td className="px-2 py-1 text-right font-mono font-bold text-green-700">₹{item.amount.toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formData.selectedFloorAbstracts.filter(x => x.floorAbstractId !== item.floorAbstractId);
                                const totalAmt = updated.reduce((sum, x) => sum + x.amount, 0);
                                setFormData({
                                  ...formData,
                                  selectedFloorAbstracts: updated,
                                  workAmount: selectedCategory === 'Contract work' ? totalAmt.toString() : formData.workAmount
                                });
                              }}
                              className="text-red-600 hover:text-red-800 font-bold"
                              title="Unlink"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-[#63717b] italic py-6">
                  No Floor Abstracts linked to this payment entry. Click "+ Add / Sync Floor Abstracts" to associate task abstracts with this worker.
                </p>
              )}
            </div>
          )}

          {/* TAB 5: WAGE LEDGER (Full Classic SAP ALV Table) */}
          {activeTab === 'ledger' && (
            <div className="bg-white border border-[#bcc8d0] p-2.5 space-y-2">
              {/* ALV Toolbar Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#bcc8d0] bg-[#edf3f7] px-2 py-1">
                <span className="font-semibold text-[12px] text-[#303b44]">
                  Wage Ledger Table: {selectedMonth} | {selectedCategory} ({searchFilteredPayments.length} records)
                </span>

                <div className="flex items-center space-x-1.5">
                  <PDFExportButton
                    title={`${selectedCategory} Payment Sheet`}
                    subtitle={`Month: ${selectedMonth}`}
                    siteName={projects.find(p => p.id === selectedProject)?.name}
                    headers={['Sr No', 'ID No', 'Worker Name', 'Tower / Block', 'Work Area', 'Gross Wages', 'Total Deductions', 'Net Payable', 'Status']}
                    data={searchFilteredPayments.map(p => {
                      const w = getWorkerDetails(p.workerId);
                      const totalDed = (Number(p.messDeduction) || 0) + (Number(p.kharchiDeduction) || 0) + (Number(p.advanceDeduction) || 0) + (Number(p.recoveryAmount) || 0) + (Number(p.otherDeduction) || 0);
                      return [
                        w.srNo,
                        w.idNo,
                        w.name,
                        p.towerName || '-',
                        p.level ? p.level : (p.floorAbstractsJson ? Array.from(new Set(JSON.parse(p.floorAbstractsJson).map((x: any) => x.level))).join(', ') : '-'),
                        `Rs. ${(Number(p.workAmount) || 0).toLocaleString('en-IN')}`,
                        `Rs. ${(totalDed || 0).toLocaleString('en-IN')}`,
                        `Rs. ${(Number(p.netPayment) || 0).toLocaleString('en-IN')}`,
                        p.paymentStatus || 'Pending'
                      ];
                    })}
                    totals={[
                      '', '', '', '', 'Totals:', 
                      `Rs. ${(totals.gross || 0).toLocaleString('en-IN')}`, 
                      `Rs. ${(((totals.mess || 0) + (totals.kharchi || 0) + (totals.advance || 0) + (totals.recovery || 0) + (totals.otherDeduction || 0)) || 0).toLocaleString('en-IN')}`, 
                      `Rs. ${(totals.net || 0).toLocaleString('en-IN')}`, 
                      ''
                    ]}
                  />
                  <button
                    onClick={exportToExcel}
                    disabled={searchFilteredPayments.length === 0}
                    className="sap-btn disabled:opacity-50"
                    title="Export this wage ledger sheet to Excel"
                  >
                    <FileSpreadsheet size={11} className="text-emerald-700" />
                    <span>Export Excel</span>
                  </button>
                  {searchFilteredPayments.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowPaymentSheetReport(true)}
                        className="sap-btn"
                        title="Print Monthly Sheet"
                      >
                        Print Sheet
                      </button>
                      <button
                        onClick={() => setShowSupplyReport(true)}
                        className="sap-btn"
                        title="Supply Work Report"
                      >
                        Supply Work
                      </button>
                    </>
                  )}

                  {!isLocked && searchFilteredPayments.length > 0 && (
                    <div>
                      {!isSubmittingSheet ? (
                        <button
                          onClick={() => setIsSubmittingSheet(true)}
                          className="sap-btn sap-btn-save"
                        >
                          <Send size={11} />
                          <span>Submit Sheet to Owner</span>
                        </button>
                      ) : (
                        <form onSubmit={handleSendToApproval} className="flex items-center space-x-1.5 bg-white border border-[#bcc8d0] p-1">
                          <input
                            type="text"
                            className="sap-input w-48 text-[11px]"
                            placeholder="Remarks for owner..."
                            value={submitRemarks}
                            onChange={e => setSubmitRemarks(e.target.value)}
                          />
                          <button type="submit" className="sap-btn sap-btn-save">
                            Confirm
                          </button>
                          <button type="button" onClick={() => setIsSubmittingSheet(false)} className="sap-btn text-red-600">
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Full Classic SAP ALV Table */}
              <div className="overflow-x-auto border border-[#bcc8d0]">
                <table className="sap-alv-table w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left w-10">Sr</th>
                      <th className="px-2 py-1 text-left w-16">ID No</th>
                      <th className="px-2 py-1 text-left">Worker Name</th>
                      <th className="px-2 py-1 text-left w-20">Tower</th>
                      <th className="px-2 py-1 text-left w-24">Work Area</th>
                      <th className="px-2 py-1 text-left w-16">Month</th>
                      <th className="px-2 py-1 text-right w-20">Gross wages</th>
                      <th className="px-2 py-1 text-right w-18">Supply</th>
                      <th className="px-2 py-1 text-right w-16">Mess Ded.</th>
                      <th className="px-2 py-1 text-right w-18">Kharchi</th>
                      <th className="px-2 py-1 text-right w-18">Advance</th>
                      <th className="px-2 py-1 text-right w-18">Recovery</th>
                      <th className="px-2 py-1 text-right w-16">Other</th>
                      <th className="px-2 py-1 text-right w-24 font-bold text-[#2d6f91]">Net Payable</th>
                      <th className="px-2 py-1 text-center w-16">Status</th>
                      {!isLocked && <th className="px-2 py-1 text-center w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {searchFilteredPayments.map(payment => {
                      const worker = getWorkerDetails(payment.workerId);
                      const isCurrentEdit = editingId === payment.id;
                      return (
                        <tr 
                          key={payment.id} 
                          onClick={() => {
                            handleEdit(payment);
                            setActiveTab('details');
                          }}
                          className={`cursor-pointer transition-colors ${
                            isCurrentEdit ? 'bg-[#dcecf6] font-semibold text-[#2d6f91]' : 'hover:bg-[#eef6fb]'
                          }`}
                        >
                          <td className="px-2 py-1 font-mono text-gray-500">{worker.srNo || '-'}</td>
                          <td className="px-2 py-1 font-mono text-[#2d6f91]">{worker.idNo}</td>
                          <td className="px-2 py-1 font-medium text-[#303b44]">{worker.name}</td>
                          <td className="px-2 py-1 text-gray-600">{payment.towerName || '-'}</td>
                          <td className="px-2 py-1 text-gray-600">
                            {payment.level ? payment.level : (payment.floorAbstractsJson ? Array.from(new Set(JSON.parse(payment.floorAbstractsJson).map((x: any) => x.level))).join(', ') : '-')}
                          </td>
                          <td className="px-2 py-1 font-mono">{payment.month}</td>
                          <td className="px-2 py-1 text-right font-mono">₹{(Number(payment.workAmount) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-right font-mono text-green-700">₹{(Number(payment.supplyAmount) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-right font-mono text-red-650">₹{(Number(payment.messDeduction) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-right font-mono text-red-650">₹{(Number(payment.kharchiDeduction) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-right font-mono text-red-650">₹{(Number(payment.advanceDeduction) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-right font-mono text-amber-800">₹{(Number(payment.recoveryAmount) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-right font-mono text-red-700">₹{(Number(payment.otherDeduction) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1 text-right font-mono font-bold text-[#2d6f91]">
                            ₹{(Number(payment.netPayment) || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-2 py-1 text-center">
                            <span className={`px-1 py-0.2 text-[9px] uppercase font-mono ${
                              payment.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {payment.paymentStatus || 'Pending'}
                            </span>
                          </td>
                          {!isLocked && (
                            <td className="px-2 py-1 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center space-x-1.5">
                                <button 
                                  onClick={() => {
                                    handleEdit(payment);
                                    setActiveTab('details');
                                  }} 
                                  className="text-[#2d6f91] hover:text-[#1a496b]" 
                                  title="Edit"
                                >
                                  <Edit size={11} />
                                </button>
                                <button 
                                  onClick={() => setDeleteId(payment.id)} 
                                  className="text-red-600 hover:text-red-800" 
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    
                    {/* ALV Summary Row */}
                    {searchFilteredPayments.length > 0 && (
                      <tr className="bg-[#edf3f7] font-bold text-[#303b44] border-t-2 border-[#bcc8d0]">
                        <td colSpan={6} className="px-2 py-1.5 text-right uppercase text-[10px]">
                          Total Month Summary:
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          ₹{(totals.gross || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-green-700">
                          ₹{(totals.supply || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-red-650">
                          ₹{(totals.mess || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-red-650">
                          ₹{(totals.kharchi || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-red-650">
                          ₹{(totals.advance || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-amber-800">
                          ₹{(totals.recovery || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-red-700">
                          ₹{(totals.otherDeduction || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono font-bold text-[#2d6f91] text-[12.5px]">
                          ₹{(totals.net || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-1.5"></td>
                        {!isLocked && <td className="px-2 py-1.5"></td>}
                      </tr>
                    )}

                    {searchFilteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={isLocked ? 15 : 16} className="px-2 py-6 text-center text-[#63717b] italic">
                          No payment records found for {selectedMonth} in this project. Use "Payment Details" tab to record worker settlements.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Worker Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteWorkerPayment(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* Supply Work Details Modal */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
            <div className="bg-[#eef2f6] px-4 py-3 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-sm">Add Supply Work Details</h3>
              <button 
                onClick={() => setShowSupplyModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto bg-gray-50 flex-1">
              {/* Add form */}
              <div className="grid grid-cols-12 gap-3 bg-white p-3 rounded border border-gray-200">
                <div className="col-span-12 sm:col-span-5 flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Work Description</label>
                  <input
                    type="text"
                    className="sap-input font-medium"
                    placeholder="E.g. Cleaning, Extra Shift..."
                    value={supplyEntry.description}
                    onChange={e => setSupplyEntry(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Hours</label>
                  <input
                    type="number"
                    step="any"
                    className="sap-input font-mono font-medium"
                    placeholder="Hrs"
                    value={supplyEntry.hours}
                    onChange={e => setSupplyEntry(prev => ({ ...prev, hours: e.target.value }))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Rate / Hr</label>
                  <input
                    type="number"
                    step="any"
                    className="sap-input font-mono font-bold text-green-700"
                    placeholder="₹ Rate"
                    value={supplyEntry.rate}
                    onChange={e => setSupplyEntry(prev => ({ ...prev, rate: e.target.value }))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3 flex items-end">
                  <button 
                    onClick={handleAddSupplyWork}
                    disabled={!supplyEntry.description || !supplyEntry.hours || !supplyEntry.rate}
                    className="sap-btn w-full disabled:opacity-50"
                  >
                    + Add Entry
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border rounded overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-[#f4f7f9] text-gray-600">
                    <tr>
                      <th className="border-b px-3 py-2 text-left font-medium">Description</th>
                      <th className="border-b px-3 py-2 text-right font-medium">Hours</th>
                      <th className="border-b px-3 py-2 text-right font-medium">Rate/Hr</th>
                      <th className="border-b px-3 py-2 text-right font-medium">Total</th>
                      <th className="border-b px-3 py-2 text-center w-12 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.supplyDetails.map((detail, idx) => (
                      <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={detail.id} className="hover:bg-gray-50 group border-b">
                        <td className="px-3 py-2 font-semibold text-gray-800">{detail.description}</td>
                        <td className="px-3 py-2 text-right font-mono">{detail.hours}</td>
                        <td className="px-3 py-2 text-right font-mono text-green-700">₹{detail.rate.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-800">
                          ₹{detail.total.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button 
                            onClick={() => handleRemoveSupplyWork(detail.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    {formData.supplyDetails.length === 0 && (
                      <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-400 italic">
                          No supply work entries added yet.
                        </td>
                      </motion.tr>
                    )}
                  </tbody>
                  {formData.supplyDetails.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-600">Total Supply Amount:</td>
                        <td className="px-3 py-2 text-right font-black text-green-700">₹{Number(formData.supplyAmount).toLocaleString('en-IN')}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            
            <div className="bg-white p-3 border-t flex justify-end">
              <button 
                onClick={() => setShowSupplyModal(false)}
                className="sap-btn bg-gray-800 text-white hover:bg-gray-900 px-6"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Sheet General Report Modal */}
      {showPaymentSheetReport && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-8 min-h-screen">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-sap-blue-val)] uppercase tracking-wider">Wage Ledger Report</h2>
                <p className="text-sm font-semibold text-gray-600">Month: {selectedMonth} | {selectedCategory}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => window.print()} className="sap-btn bg-gray-800 hover:bg-gray-900 border-gray-900 text-white flex items-center space-x-1 px-4 py-1.5">
                  <span>Print Excel Report</span>
                </button>
                <button onClick={() => setShowPaymentSheetReport(false)} className="sap-btn border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center px-4 py-1.5">
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-2">Wage Ledger Report ({selectedCategory})</h1>
              <div className="flex justify-between text-sm font-bold">
                <span>Month: {selectedMonth}</span>
                <span>Project: {projects.find(p => p.id === selectedProject)?.name}</span>
              </div>
            </div>

            <div className="border border-black print:border-gray-800 bg-white shadow-sm print:shadow-none">
              <table className="w-full border-collapse text-[10px] print:text-[10px]">
                <thead className="bg-[#eef2f6] print:bg-gray-100 font-bold border-b-2 border-black text-gray-900">
                  <tr>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-10 text-center">Sr No</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-14">ID No</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left">Worker Name</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-24">Work Area / Location</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-14">Month</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-20">Gross wages</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-16">Supply Amt</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-600 w-16">Mess Ded.</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-600 w-16">Kharchi Ded.</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-600 w-16">Advance Ded.</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-green-700 w-24">Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {searchFilteredPayments.map((payment, idx) => {
                    const worker = getWorkerDetails(payment.workerId);
                    return (
                      <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={payment.id} className="hover:bg-gray-50 border-b print:border-gray-800 font-mono">
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-gray-700 font-bold text-center">{worker.srNo || '-'}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-gray-700 font-bold">{worker.idNo}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 font-sans font-semibold text-gray-900">{worker.name}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 font-sans text-gray-800">
                          {payment.level ? payment.level : (payment.floorAbstractsJson ? Array.from(new Set(JSON.parse(payment.floorAbstractsJson).map((x: any) => x.level))).join(', ') : <span className="text-gray-400 italic">None</span>)}
                        </td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5">{payment.month}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right font-medium">₹{(Number(payment.workAmount) || 0).toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-green-800 font-semibold">₹{(Number(payment.supplyAmount) || 0).toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-red-700">₹{(Number(payment.messDeduction) || 0).toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-red-700">₹{(Number(payment.kharchiDeduction) || 0).toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-red-700">₹{(Number(payment.advanceDeduction) || 0).toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right font-bold text-green-900">
                          ₹{(Number(payment.netPayment) || 0).toLocaleString('en-IN')}
                        </td>
                      </motion.tr>
                    );
                  })}
                  {searchFilteredPayments.length === 0 && (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <td colSpan={11} className="border border-gray-300 print:border-gray-800 px-2 py-6 text-center text-gray-500 italic">
                        No payment records found for {selectedMonth}.
                      </td>
                    </motion.tr>
                  )}
                </tbody>
                {searchFilteredPayments.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold border-t-2 border-black">
                    <tr>
                      <td colSpan={5} className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right uppercase text-[10px]">
                        Total Month Summary:
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right">
                        ₹{(totals.gross || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-green-700">
                        ₹{(totals.supply || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-700">
                        ₹{(totals.mess || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-700">
                        ₹{(totals.kharchi || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-700">
                        ₹{(totals.advance || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right font-black text-[11px] text-green-900 print:text-black bg-gray-200 print:bg-transparent">
                        ₹{(totals.net || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <div className="print-signature-section">
                <div className="print-signature-box">
                  <div className="print-signature-title">Approved by Director</div>
                  <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supply Work General Report Modal */}
      {showSupplyReport && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-8 min-h-screen">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-sap-blue-val)] uppercase tracking-wider">Project Supply Work Report</h2>
                <p className="text-sm font-semibold text-gray-600">Month: {selectedMonth}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => window.print()} className="sap-btn bg-gray-800 hover:bg-gray-900 border-gray-900 text-white flex items-center space-x-1 px-4 py-1.5">
                  <span>Print Excel Report</span>
                </button>
                <button onClick={() => setShowSupplyReport(false)} className="sap-btn border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center px-4 py-1.5">
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-2">Supply Work Details Report ({selectedCategory})</h1>
              <div className="flex justify-between text-sm font-bold">
                <span>Month: {selectedMonth}</span>
                <span>Project: {projects.find(p => p.id === selectedProject)?.name}</span>
              </div>
            </div>

            <div className="border border-black print:border-gray-800 bg-white shadow-sm print:shadow-none">
              <table className="w-full border-collapse text-xs print:text-[10px]">
                <thead className="bg-[#eef2f6] print:bg-gray-100 font-bold border-b-2 border-black text-gray-900">
                  <tr>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-10 text-center">Sr</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-48">Worker Name</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left">Description of Work</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-20">Hours</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-24">Rate/Hr</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-24">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allSupplyWorksInfo.map((work, idx) => (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={`${work.paymentId}-${work.id}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 font-semibold">{work.workerName}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1">{work.description}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-right font-mono">{work.hours}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-right font-mono">₹{(Number(work.rate) || 0).toLocaleString('en-IN')}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-right font-bold text-gray-900">
                        ₹{(Number(work.total) || 0).toLocaleString('en-IN')}
                      </td>
                    </motion.tr>
                  ))}
                  {allSupplyWorksInfo.length === 0 && (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <td colSpan={6} className="border border-gray-300 px-2 py-6 text-center text-gray-500 italic">
                        No supply work records found in {selectedMonth}.
                      </td>
                    </motion.tr>
                  )}
                </tbody>
                {allSupplyWorksInfo.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold border-t-2 border-black">
                    <tr>
                      <td colSpan={3} className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right uppercase text-[10px]">Grand Total Supply Amount:</td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right font-mono text-[11px]">{allSupplyWorksInfo.reduce((a, b) => a + b.hours, 0)} hr</td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right bg-gray-200"></td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right font-black text-[13px] text-green-800 print:text-black">
                        ₹{allSupplyWorksInfo.reduce((a, b) => a + (Number(b.total) || 0), 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <div className="print-signature-section">
                <div className="print-signature-box">
                  <div className="print-signature-title">Approved by Director</div>
                  <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Verification Warning Modal */}
      <DuplicateWarningModal
        isOpen={dupModalOpen}
        moduleName="Worker Payment"
        warningText="Warning: A payment record for this worker may already exist. Please review before saving."
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
          setEditingId(record.id);
          // Load that record's data into formData
          setFormData({
            workerId: record.workerId,
            month: record.month,
            workAmount: String(record.workAmount || ''),
            workDays: String(record.workDays || ''),
            ratePerDay: String(record.ratePerDay || ''),
            overtimeHours: String(record.overtimeHours || ''),
            allowance: String(record.allowance || ''),
            manualKharchi: record.kharchiDeduction !== undefined && record.kharchiDeduction !== null ? String(record.kharchiDeduction) : '',
            selectedKharchiIds: record.kharchiDetailsJson ? JSON.parse(record.kharchiDetailsJson) : [],
            manualAdvance: record.advanceDeduction !== undefined && record.advanceDeduction !== null ? String(record.advanceDeduction) : '',
            selectedAdvanceIds: record.advanceDetailsJson ? JSON.parse(record.advanceDetailsJson) : [],
            messDeduction: String(record.messDeduction || ''),
            level: record.level || '',
            towerName: record.towerName || '',
            supplyAmount: String(record.supplyAmount || ''),
            date: record.date || new Date().toISOString().split('T')[0],
            supplyDetails: record.supplyDetails ? JSON.parse(record.supplyDetails) : [],
            recoveryAmount: String(record.recoveryAmount || ''),
            otherDeduction: String(record.otherDeduction || ''),
            otherDeductionDetails: record.otherDeductionDetails || '',
            paymentStatus: record.paymentStatus || 'Pending',
            selectedFloorAbstracts: record.floorAbstractsJson ? JSON.parse(record.floorAbstractsJson) : []
          });
        }}
      />

      {/* Floor Abstract Selection Popup */}
      {showFloorAbstractPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
            {/* Header */}
            <div className="bg-[var(--color-sap-blue-val)] text-white px-3.5 py-2 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-xs uppercase tracking-wider">Import Flat/Floor Abstract Records</h3>
              <button 
                type="button" 
                onClick={() => setShowFloorAbstractPopup(false)}
                className="text-white hover:text-gray-300 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Filter and Details section */}
            <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-700">Filter Level:</span>
                <SAPSelect
                  className="sap-input w-44 bg-white font-normal"
                  value={floorFilterLevel}
                  onChange={e => setFloorFilterLevel(e.target.value)}
                >
                  <option value="">-- All Levels --</option>
                  {uniqueLevelsForWorker.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </SAPSelect>
              </div>

              <div className="text-[10px] text-gray-600 font-bold font-mono">
                Worker: <span className="text-[#0056b3]">{workers.find(w => w.id === formData.workerId)?.name}</span> ({workers.find(w => w.id === formData.workerId)?.workerId})
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-y-auto p-3 flex-1">
              {filteredMatchingFloorAbstracts.length === 0 ? (
                <div className="text-center py-10 text-gray-500 font-sans italic">
                  No matching Floor Abstract records found for this worker in the selected Project.
                </div>
              ) : (
                <div className="border border-[#8c9ba8] rounded-sm overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#eef2f6] text-[var(--color-sap-blue-val)] font-bold border-b border-[#8c9ba8] text-[10px]">
                        <th className="p-2 border-r border-[#8c9ba8] w-12 text-center">Select</th>
                        <th className="p-2 border-r border-[#8c9ba8]">Level / Floor</th>
                        <th className="p-2 border-r border-[#8c9ba8]">Flat No</th>
                        <th className="p-2 border-r border-[#8c9ba8]">Worker Name</th>
                        <th className="p-2 border-r border-[#8c9ba8]">Worker ID</th>
                        <th className="p-2 border-r border-[#8c9ba8] text-right">Hajira</th>
                        <th className="p-2 border-r border-[#8c9ba8] text-right">Payable Amount</th>
                        <th className="p-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredMatchingFloorAbstracts.map(fa => {
                        const workerDetail = workers.find(w => w.id === formData.workerId);
                        const wRow = fa.workers?.find(w => w.workerId === workerDetail?.id || w.workerId === workerDetail?.workerId);
                        const hajiraVal = wRow?.hajiraPerWorker ?? wRow?.workerHajira ?? 0;
                        const payAmount = wRow?.payableAmount ?? 0;
                        const isSelected = tempFloorSelections.some(item => item.floorAbstractId === fa.id);

                        return (
                          <tr 
                            key={fa.id} 
                            className={`hover:bg-gray-50 text-[10px] ${isSelected ? 'bg-blue-50/70' : ''}`}
                          >
                            <td className="p-2 border-r border-gray-200 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTempFloorSelections(prev => [
                                      ...prev,
                                      {
                                        floorAbstractId: fa.id,
                                        level: fa.level,
                                        flatNo: fa.flatNo,
                                        hajira: Number(hajiraVal) || 0,
                                        amount: Number(payAmount) || 0
                                      }
                                    ]);
                                  } else {
                                    setTempFloorSelections(prev => prev.filter(item => item.floorAbstractId !== fa.id));
                                  }
                                }}
                                className="rounded cursor-pointer"
                              />
                            </td>
                            <td className="p-2 border-r border-gray-200 font-mono font-bold text-gray-700">{fa.level}</td>
                            <td className="p-2 border-r border-gray-200 font-mono font-medium">{fa.flatNo}</td>
                            <td className="p-2 border-r border-gray-200">{workerDetail?.name}</td>
                            <td className="p-2 border-r border-gray-200 font-mono text-gray-500">{workerDetail?.workerId}</td>
                            <td className="p-2 border-r border-gray-200 text-right font-mono font-semibold">{hajiraVal}</td>
                            <td className="p-2 border-r border-gray-200 text-right font-mono font-bold text-blue-900">₹{(Number(payAmount) || 0).toLocaleString('en-IN')}</td>
                            <td className="p-2 text-gray-500 italic max-w-xs truncate" title={fa.remarks}>{fa.remarks || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary & Buttons footer */}
            <div className="bg-[#f8f9fa] border-t border-[#8c9ba8] p-3 flex flex-wrap items-center justify-between gap-3 text-[10px]">
              <div className="flex flex-wrap gap-4 text-gray-800 bg-white px-3 py-2 rounded border border-[#8c9ba8]">
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase">Selected Floors:</span>
                  <span className="font-bold text-blue-900 font-mono truncate max-w-xs block">{popupSummary.floors}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase">Total Hajira:</span>
                  <span className="font-bold font-mono text-gray-900">{popupSummary.totalHajira}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase">Total Amount:</span>
                  <span className="font-black font-mono text-[#0056b3]">₹{(Number(popupSummary.totalAmount) || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const isMonthly = selectedCategory === 'Monthly work';
                    setFormData({
                      ...formData,
                      selectedFloorAbstracts: tempFloorSelections,
                      workAmount: popupSummary.totalAmount.toString(),
                      ...(isMonthly && { workDays: popupSummary.totalHajira.toString() })
                    });
                    setShowFloorAbstractPopup(false);
                  }}
                  disabled={tempFloorSelections.length === 0}
                  className="sap-btn sap-btn-blue text-[10px] font-bold py-1.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Selected (₹{(Number(popupSummary.totalAmount) || 0).toLocaleString('en-IN')})
                </button>
                <button
                  type="button"
                  onClick={() => setShowFloorAbstractPopup(false)}
                  className="sap-btn bg-gray-600 hover:bg-gray-700 border-gray-700 text-white font-bold py-1.5 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kharchi Selection Popup (Date by Date) */}
      {showKharchiModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[11px] relative z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[var(--color-sap-blue-val)] text-white px-3.5 py-2.5 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-blue-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Select Kharchi Deduction — Date by Date
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowKharchiModal(false)}
                className="text-white hover:text-gray-300 font-bold text-lg leading-none p-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Sub-header info bar */}
            <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-3 text-gray-800">
                <div>
                  <span className="text-gray-500 font-bold block text-[9px] uppercase">Worker:</span>
                  <span className="font-bold text-[#0056b3] text-xs">
                    {workers.find(w => w.id === formData.workerId)?.name || 'Unknown'}
                  </span>
                  <span className="text-gray-500 font-mono text-[10px] ml-1">
                    ({workers.find(w => w.id === formData.workerId)?.workerId || 'Sr ' + workers.find(w => w.id === formData.workerId)?.serialNo})
                  </span>
                </div>
                <div className="h-6 border-r border-gray-300 mx-1"></div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px] uppercase">Selected Month:</span>
                  <span className="font-mono font-bold text-gray-800">{formData.month}</span>
                </div>
                <div className="h-6 border-r border-gray-300 mx-1"></div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px] uppercase">Site / Project:</span>
                  <span className="font-semibold text-gray-700 truncate max-w-[150px] block">
                    {projects.find(p => p.id === selectedProject)?.name || '-'}
                  </span>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setTempKharchiSelections(workerMonthKharchis.map(k => k.id))}
                  className="sap-btn bg-blue-100 hover:bg-blue-200 border-blue-300 text-[#0056b3] text-[10px] font-bold py-1 px-2.5 rounded flex items-center space-x-1"
                >
                  <CheckSquare size={12} />
                  <span>Select All ({workerMonthKharchis.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTempKharchiSelections([])}
                  className="sap-btn bg-gray-200 hover:bg-gray-300 border-gray-400 text-gray-700 text-[10px] font-bold py-1 px-2 rounded flex items-center space-x-1"
                >
                  <Square size={12} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-y-auto p-3 flex-1">
              {workerMonthKharchis.length === 0 ? (
                <div className="text-center py-12 bg-white rounded border border-gray-200 p-6 space-y-2">
                  <AlertCircle size={28} className="mx-auto text-amber-500" />
                  <p className="font-bold text-gray-700 text-xs">
                    No weekly kharchi records found for this worker in {formData.month}.
                  </p>
                  <p className="text-gray-500 text-[10px] max-w-sm mx-auto">
                    Weekly kharchi can be recorded in the <strong className="text-gray-700">Weekly Kharchi</strong> module (PR04) or entered directly as a manual deduction amount.
                  </p>
                </div>
              ) : (
                <div className="border border-[#8c9ba8] rounded-sm overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#eef2f6] text-[var(--color-sap-blue-val)] font-bold border-b border-[#8c9ba8] text-[10px]">
                        <th className="p-2 border-r border-[#8c9ba8] w-12 text-center">
                          <input
                            type="checkbox"
                            checked={workerMonthKharchis.length > 0 && tempKharchiSelections.length === workerMonthKharchis.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempKharchiSelections(workerMonthKharchis.map(k => k.id));
                              } else {
                                setTempKharchiSelections([]);
                              }
                            }}
                            className="rounded cursor-pointer"
                            title="Toggle Select All"
                          />
                        </th>
                        <th className="p-2 border-r border-[#8c9ba8] w-14 text-center">Sr No</th>
                        <th className="p-2 border-r border-[#8c9ba8]">Kharchi Date</th>
                        <th className="p-2 border-r border-[#8c9ba8]">Day of Week</th>
                        <th className="p-2 border-r border-[#8c9ba8] text-right">Kharchi Amount (INR)</th>
                        <th className="p-2 text-center w-24">Deduction Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {workerMonthKharchis.map((k, idx) => {
                        const isChecked = tempKharchiSelections.includes(k.id);
                        const dateObj = new Date(k.date + 'T00:00:00');
                        const dayName = isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
                        const isSunday = dayName === 'Sunday';

                        return (
                          <tr 
                            key={k.id} 
                            onClick={() => {
                              if (isChecked) {
                                setTempKharchiSelections(prev => prev.filter(id => id !== k.id));
                              } else {
                                setTempKharchiSelections(prev => [...prev, k.id]);
                              }
                            }}
                            className={`hover:bg-blue-50/50 cursor-pointer text-[11px] transition-colors ${isChecked ? 'bg-blue-50/70 font-semibold' : ''}`}
                          >
                            <td className="p-2 border-r border-gray-200 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTempKharchiSelections(prev => [...prev, k.id]);
                                  } else {
                                    setTempKharchiSelections(prev => prev.filter(id => id !== k.id));
                                  }
                                }}
                                className="rounded cursor-pointer"
                              />
                            </td>
                            <td className="p-2 border-r border-gray-200 text-center font-mono text-gray-600">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-r border-gray-200 font-mono font-bold text-gray-800">
                              {formatDateWithDay(k.date)}
                            </td>
                            <td className="p-2 border-r border-gray-200">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isSunday ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                                {dayName}
                              </span>
                            </td>
                            <td className="p-2 border-r border-gray-200 text-right font-mono font-bold text-red-650 text-xs">
                              ₹{(Number(k.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-center">
                              {isChecked ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-800 border border-green-300">
                                  ✓ Deduct
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic">Excluded</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary & Buttons footer */}
            <div className="bg-[#f8f9fa] border-t border-[#8c9ba8] p-3 flex flex-wrap items-center justify-between gap-3 text-[10px] shrink-0">
              <div className="flex flex-wrap gap-4 text-gray-800 bg-white px-3 py-1.5 rounded border border-[#8c9ba8] shadow-xs">
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase">Month Records:</span>
                  <span className="font-bold text-gray-700 font-mono">{workerMonthKharchis.length} dates</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase">Selected Dates:</span>
                  <span className="font-bold text-blue-900 font-mono">{tempKharchiSelections.length} of {workerMonthKharchis.length}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase">Total Kharchi Deducted:</span>
                  <span className="font-black font-mono text-red-650 text-xs">
                    ₹{workerMonthKharchis.filter(k => tempKharchiSelections.includes(k.id)).reduce((sum, k) => sum + (Number(k.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleApplyKharchiSelection}
                  className="sap-btn sap-btn-blue text-[11px] font-bold py-1.5 px-4 flex items-center space-x-1.5 shadow-sm"
                >
                  <CheckCircle2 size={13} />
                  <span>
                    Apply Kharchi Deduction (₹{workerMonthKharchis.filter(k => tempKharchiSelections.includes(k.id)).reduce((sum, k) => sum + (Number(k.amount) || 0), 0).toLocaleString('en-IN')})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowKharchiModal(false)}
                  className="sap-btn bg-gray-600 hover:bg-gray-700 border-gray-700 text-white font-bold py-1.5 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advance Selection Popup (Date by Date & Outstanding Advances) */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[11px] relative z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-amber-800 text-white px-3.5 py-2.5 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-amber-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Select Outstanding Advances — Date by Date
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAdvanceModal(false)}
                className="text-white hover:text-gray-300 font-bold text-lg leading-none p-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Sub-header info bar */}
            <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-3 text-gray-800">
                <div>
                  <span className="text-gray-500 font-bold block text-[9px] uppercase">Worker:</span>
                  <span className="font-bold text-amber-900 text-xs">
                    {workers.find(w => w.id === formData.workerId)?.name || 'Unknown'}
                  </span>
                  <span className="text-gray-500 font-mono text-[10px] ml-1">
                    ({workers.find(w => w.id === formData.workerId)?.workerId || 'Sr ' + workers.find(w => w.id === formData.workerId)?.serialNo})
                  </span>
                </div>
                <div className="h-6 border-r border-gray-300 mx-1"></div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px] uppercase">Payment Month & Date:</span>
                  <span className="font-mono font-bold text-gray-800">{formData.month} ({formData.date})</span>
                </div>
              </div>

              {/* View Toggle (All Outstanding vs This Month) */}
              <div className="flex items-center space-x-1 bg-white p-0.5 rounded border border-gray-300 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAdvanceFilterMode('all')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${advanceFilterMode === 'all' ? 'bg-amber-700 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  All Outstanding Advances ({workerAllOutstandingAdvances.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdvanceFilterMode('month')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${advanceFilterMode === 'month' ? 'bg-amber-700 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  This Month Only ({workerMonthAdvances.length})
                </button>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const pool = advanceFilterMode === 'month' ? workerMonthAdvances : workerAllOutstandingAdvances;
                    setTempAdvanceSelections(pool.map(a => a.id));
                  }}
                  className="sap-btn bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-900 text-[10px] font-bold py-1 px-2.5 rounded flex items-center space-x-1"
                >
                  <CheckSquare size={12} />
                  <span>Select All</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTempAdvanceSelections([])}
                  className="sap-btn bg-gray-200 hover:bg-gray-300 border-gray-400 text-gray-700 text-[10px] font-bold py-1 px-2 rounded flex items-center space-x-1"
                >
                  <Square size={12} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-y-auto p-3 flex-1">
              {(() => {
                const currentPool = advanceFilterMode === 'month' ? workerMonthAdvances : workerAllOutstandingAdvances;
                if (currentPool.length === 0) {
                  return (
                    <div className="text-center py-12 bg-white rounded border border-gray-200 p-6 space-y-2">
                      <AlertCircle size={28} className="mx-auto text-amber-500" />
                      <p className="font-bold text-gray-700 text-xs">
                        No outstanding advance records found for this worker {advanceFilterMode === 'month' ? `in ${formData.month}` : 'up to payment date'}.
                      </p>
                      <p className="text-gray-500 text-[10px] max-w-sm mx-auto">
                        Advances can be recorded in the <strong className="text-gray-700">Advance</strong> module or entered directly as a manual deduction amount.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="border border-[#8c9ba8] rounded-sm overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#eef2f6] text-gray-800 font-bold border-b border-[#8c9ba8] text-[10px]">
                          <th className="p-2 border-r border-[#8c9ba8] w-10 text-center">
                            <input
                              type="checkbox"
                              checked={currentPool.length > 0 && tempAdvanceSelections.length === currentPool.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTempAdvanceSelections(currentPool.map(a => a.id));
                                } else {
                                  setTempAdvanceSelections([]);
                                }
                              }}
                              className="rounded cursor-pointer"
                              title="Toggle Select All"
                            />
                          </th>
                          <th className="p-2 border-r border-[#8c9ba8] w-12 text-center">Sr No</th>
                          <th className="p-2 border-r border-[#8c9ba8] w-24">Date</th>
                          <th className="p-2 border-r border-[#8c9ba8] w-28">Txn No</th>
                          <th className="p-2 border-r border-[#8c9ba8] w-28">Payment Type</th>
                          <th className="p-2 border-r border-[#8c9ba8]">Details / Reason</th>
                          <th className="p-2 border-r border-[#8c9ba8] text-right w-24">Amount (INR)</th>
                          <th className="p-2 border-r border-[#8c9ba8] text-right w-24">Outstanding</th>
                          <th className="p-2 border-r border-[#8c9ba8] w-28">Disbursed By</th>
                          <th className="p-2 text-center w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentPool.map((a, idx) => {
                          const isChecked = tempAdvanceSelections.includes(a.id);
                          const isOverBalance = a.paymentType === 'Previously Over Balance';
                          const amt = Number(a.amount) || 0;
                          const outAmt = (a.outstandingAmount !== undefined && a.outstandingAmount !== null)
                            ? Number(a.outstandingAmount)
                            : amt;

                          return (
                            <tr 
                              key={a.id} 
                              onClick={() => {
                                if (isChecked) {
                                  setTempAdvanceSelections(prev => prev.filter(id => id !== a.id));
                                } else {
                                  setTempAdvanceSelections(prev => [...prev, a.id]);
                                }
                              }}
                              className={`hover:bg-amber-50/50 cursor-pointer text-[11px] transition-colors ${
                                isChecked ? (isOverBalance ? 'bg-purple-50/70 font-semibold' : 'bg-amber-50/70 font-semibold') : ''
                              }`}
                            >
                              <td className="p-2 border-r border-gray-200 text-center" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTempAdvanceSelections(prev => [...prev, a.id]);
                                    } else {
                                      setTempAdvanceSelections(prev => prev.filter(id => id !== a.id));
                                    }
                                  }}
                                  className="rounded cursor-pointer"
                                />
                              </td>
                              <td className="p-2 border-r border-gray-200 text-center font-mono text-gray-600">
                                {idx + 1}
                              </td>
                              <td className="p-2 border-r border-gray-200 font-mono text-gray-800 whitespace-nowrap">
                                {formatDateWithDay(a.date)}
                              </td>
                              <td className="p-2 border-r border-gray-200 font-mono font-bold text-[#0056b3] whitespace-nowrap">
                                {a.transactionNo || `ADV-${a.id.slice(0, 6).toUpperCase()}`}
                              </td>
                              <td className="p-2 border-r border-gray-200 whitespace-nowrap">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  isOverBalance ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                  a.paymentType === 'Travel Advance' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                                  a.paymentType === 'Payment' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                  a.paymentType === 'Other Advance' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  'bg-teal-50 text-teal-800 border-teal-200'
                                }`}>
                                  {a.paymentType || 'Site Advance'}
                                </span>
                              </td>
                              <td className="p-2 border-r border-gray-200 text-gray-700 max-w-xs truncate" title={a.specifyOtherAdvance || a.remarks || '-'}>
                                {a.specifyOtherAdvance || a.remarks || (isOverBalance ? 'Carry Forward Deficit' : '-')}
                              </td>
                              <td className="p-2 border-r border-gray-200 text-right font-mono font-bold text-red-650">
                                ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 border-r border-gray-200 text-right font-mono font-bold text-amber-800">
                                ₹{outAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 border-r border-gray-200 text-gray-700 whitespace-nowrap truncate max-w-[100px]">
                                {a.paidBy || '-'}
                              </td>
                              <td className="p-2 text-center">
                                {isChecked ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-800 border border-green-300">
                                    ✓ Deduct
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-400 italic">Excluded</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Summary & Buttons footer */}
            <div className="bg-[#f8f9fa] border-t border-[#8c9ba8] p-3 flex flex-wrap items-center justify-between gap-3 text-[10px] shrink-0">
              {(() => {
                const currentPool = advanceFilterMode === 'month' ? workerMonthAdvances : workerAllOutstandingAdvances;
                const selectedPool = currentPool.filter(a => tempAdvanceSelections.includes(a.id));
                const selectedRegular = selectedPool
                  .filter(a => a.paymentType !== 'Previously Over Balance')
                  .reduce((sum, a) => {
                    const val = (a.outstandingAmount !== undefined && a.outstandingAmount !== null) ? Number(a.outstandingAmount) : (Number(a.amount) || 0);
                    return sum + val;
                  }, 0);
                const selectedOverBal = selectedPool
                  .filter(a => a.paymentType === 'Previously Over Balance')
                  .reduce((sum, a) => {
                    const val = (a.outstandingAmount !== undefined && a.outstandingAmount !== null) ? Number(a.outstandingAmount) : (Number(a.amount) || 0);
                    return sum + val;
                  }, 0);
                const totalSelectedAmount = selectedRegular + selectedOverBal;

                return (
                  <>
                    <div className="flex flex-wrap gap-4 text-gray-800 bg-white px-3 py-1.5 rounded border border-[#8c9ba8] shadow-xs">
                      <div>
                        <span className="text-gray-400 font-bold block text-[8px] uppercase">Selected:</span>
                        <span className="font-bold text-amber-900 font-mono">{tempAdvanceSelections.length} of {currentPool.length} records</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block text-[8px] uppercase">Regular Advance:</span>
                        <span className="font-bold text-red-650 font-mono">₹{(selectedRegular || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {selectedOverBal > 0 && (
                        <div>
                          <span className="text-purple-600 font-bold block text-[8px] uppercase">Prev Over Bal:</span>
                          <span className="font-bold text-purple-800 font-mono">₹{(selectedOverBal || 0).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 font-bold block text-[8px] uppercase">Total Advance Deduction:</span>
                        <span className="font-black font-mono text-red-650 text-xs">
                          ₹{(totalSelectedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleApplyAdvanceSelection}
                        className="sap-btn bg-amber-700 hover:bg-amber-800 border-amber-800 text-white text-[11px] font-bold py-1.5 px-4 flex items-center space-x-1.5 shadow-sm"
                      >
                        <CheckCircle2 size={13} />
                        <span>
                          Apply Advance Deduction (₹{(totalSelectedAmount || 0).toLocaleString('en-IN')})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAdvanceModal(false)}
                        className="sap-btn bg-gray-600 hover:bg-gray-700 border-gray-700 text-white font-bold py-1.5 px-4"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
