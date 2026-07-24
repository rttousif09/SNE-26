import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { PDFExportButton } from '../components/PDFExportButton';
import { 
  User, Search, Plus, Trash2, Edit2, Lock, Unlock, History, AlertCircle, 
  CheckCircle, FileText, ArrowUpRight, ArrowDownLeft, DollarSign, TrendingUp, 
  Save, X, ShieldAlert, Sliders, FileSpreadsheet, Calendar, ChevronDown, ChevronUp, 
  MapPin, Award, Phone, Activity, Briefcase, Calculator, Printer, Clock, ArrowRight,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const WorkerLedger: React.FC = () => {
  const {
    workers = [],
    projects = [],
    advances = [],
    workerPayments = [],
    workerLedger = [],
    workerHolds = [],
    workerRecoveryAuditTrail = [],
    addWorkerLedgerEntry,
    updateWorkerLedgerEntry,
    deleteWorkerLedgerEntry,
    addWorkerHold,
    updateWorkerHold,
    addWorkerRecoveryAudit,
    kharchis = [],
    user
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  // State Management
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filters
  const [filterProject, setFilterProject] = useState('All');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterTxType, setFilterTxType] = useState('All');
  const [filterFinYear, setFilterFinYear] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  // Interactive UI state
  const [activeHistoryTab, setActiveHistoryTab] = useState<'transactions' | 'payments' | 'advances' | 'kharchis' | 'mess'>('transactions');
  const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});

  const toggleSiteExpand = (id: string) => {
    setExpandedSites(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Modals & Form states
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [releasingHoldId, setReleasingHoldId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [ledgerForm, setLedgerForm] = useState({
    date: new Date().toISOString().split('T')[0],
    voucherNo: '',
    description: 'Manual Advance Recovery',
    type: 'Credit' as 'Debit' | 'Credit',
    amount: '',
    remarks: ''
  });

  const [holdForm, setHoldForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    remarks: ''
  });

  const [releaseAmount, setReleaseAmount] = useState('');
  const [releaseRemarks, setReleaseRemarks] = useState('');

  // Project map helper
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  // Helper for Indian Financial Year calculation (Apr - Mar)
  const getFinancialYear = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  };

  // List of active workers with search filter
  const filteredWorkersList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = workers;
    if (q) {
      list = workers.filter(w => 
        w.name.toLowerCase().includes(q) || 
        w.workerId.toLowerCase().includes(q) || 
        (w.mobileNo && w.mobileNo.includes(q))
      );
    }
    return [...list].sort((a, b) => (parseInt(a.serialNo) || 0) - (parseInt(b.serialNo) || 0));
  }, [searchQuery, workers]);

  // Selected Worker Match
  const activeWorker = useMemo(() => {
    if (selectedWorkerId) return workers.find(w => w.id === selectedWorkerId);
    return filteredWorkersList[0] || null;
  }, [selectedWorkerId, filteredWorkersList, workers]);

  const activeWorkerId = activeWorker?.id || '';

  // Apply filters on base datasets
  const filteredPayments = useMemo(() => {
    return workerPayments.filter(p => {
      if (p.workerId !== activeWorkerId) return false;
      if (filterProject !== 'All' && p.projectId !== filterProject) return false;
      const d = p.date || `${p.month}-28`;
      if (filterDateStart && d < filterDateStart) return false;
      if (filterDateEnd && d > filterDateEnd) return false;
      if (filterFinYear !== 'All' && getFinancialYear(d) !== filterFinYear) return false;
      if (filterMonth !== 'All' && d.split('-')[1] !== filterMonth) return false;
      return true;
    });
  }, [workerPayments, activeWorkerId, filterProject, filterDateStart, filterDateEnd, filterFinYear, filterMonth]);

  const filteredAdvances = useMemo(() => {
    return advances.filter(a => {
      if (a.workerId !== activeWorkerId) return false;
      if (filterProject !== 'All' && a.projectId !== filterProject) return false;
      if (filterDateStart && a.date < filterDateStart) return false;
      if (filterDateEnd && a.date > filterDateEnd) return false;
      if (filterFinYear !== 'All' && getFinancialYear(a.date) !== filterFinYear) return false;
      if (filterMonth !== 'All' && a.date.split('-')[1] !== filterMonth) return false;
      return true;
    });
  }, [advances, activeWorkerId, filterProject, filterDateStart, filterDateEnd, filterFinYear, filterMonth]);

  const filteredKharchis = useMemo(() => {
    return kharchis.filter(k => {
      if (k.workerId !== activeWorkerId) return false;
      if (filterProject !== 'All' && k.projectId !== filterProject) return false;
      if (filterDateStart && k.date < filterDateStart) return false;
      if (filterDateEnd && k.date > filterDateEnd) return false;
      if (filterFinYear !== 'All' && getFinancialYear(k.date) !== filterFinYear) return false;
      if (filterMonth !== 'All' && k.date.split('-')[1] !== filterMonth) return false;
      return true;
    });
  }, [kharchis, activeWorkerId, filterProject, filterDateStart, filterDateEnd, filterFinYear, filterMonth]);

  const filteredManualLedger = useMemo(() => {
    return workerLedger.filter(l => {
      if (l.workerId !== activeWorkerId) return false;
      if (filterProject !== 'All' && l.projectId !== filterProject) return false;
      if (filterDateStart && l.date < filterDateStart) return false;
      if (filterDateEnd && l.date > filterDateEnd) return false;
      if (filterFinYear !== 'All' && getFinancialYear(l.date) !== filterFinYear) return false;
      if (filterMonth !== 'All' && l.date.split('-')[1] !== filterMonth) return false;
      return true;
    });
  }, [workerLedger, activeWorkerId, filterProject, filterDateStart, filterDateEnd, filterFinYear, filterMonth]);

  // Chronological Unified Ledger Construction
  const chronologicalLedger = useMemo(() => {
    if (!activeWorkerId) return [];
    const entries: Array<{
      id: string;
      date: string;
      type: 'Work Entry' | 'Advance' | 'Kharchi' | 'Mess Deduction' | 'Worker Payment' | 'Adjustment' | 'Opening Balance';
      project: string;
      description: string;
      workAmount: number;
      advance: number;
      kharchi: number;
      messDeduction: number;
      otherDeduction: number;
      payment: number;
      enteredBy: string;
    }> = [];

    // Opening Balance
    if (activeWorker && activeWorker.openingAdvance) {
      const d = activeWorker.joiningDate || '2026-01-01';
      const match = (!filterDateStart || d >= filterDateStart) &&
                    (!filterDateEnd || d <= filterDateEnd) &&
                    (filterProject === 'All' || activeWorker.projectId === filterProject) &&
                    (filterFinYear === 'All' || getFinancialYear(d) === filterFinYear) &&
                    (filterMonth === 'All' || d.split('-')[1] === filterMonth);
      if (match) {
        entries.push({
          id: `opening-${activeWorker.id}`,
          date: d,
          type: 'Opening Balance',
          project: projectMap[activeWorker.projectId] || 'Initial Site',
          description: 'Opening Advance Balance registered on joining',
          workAmount: 0,
          advance: activeWorker.openingAdvance,
          kharchi: 0,
          messDeduction: 0,
          otherDeduction: 0,
          payment: 0,
          enteredBy: 'System'
        });
      }
    }

    // Advances
    filteredAdvances.forEach(a => {
      entries.push({
        id: a.id,
        date: a.date,
        type: 'Advance',
        project: projectMap[a.projectId] || 'Unregistered Site',
        description: `Advance Loan: "${a.remarks || 'No remarks detail'}"`,
        workAmount: 0,
        advance: a.amount,
        kharchi: 0,
        messDeduction: 0,
        otherDeduction: 0,
        payment: 0,
        enteredBy: a.paidBy || 'Supervisor'
      });
    });

    // Kharchi
    filteredKharchis.forEach(k => {
      entries.push({
        id: k.id,
        date: k.date,
        type: 'Kharchi',
        project: projectMap[k.projectId] || 'Unregistered Site',
        description: 'Pocket money weekly kharchi distribution',
        workAmount: 0,
        advance: 0,
        kharchi: k.amount,
        messDeduction: 0,
        otherDeduction: 0,
        payment: 0,
        enteredBy: 'System'
      });
    });

    // Payments / Work payroll
    filteredPayments.forEach(p => {
      // Work entry
      entries.push({
        id: `work-${p.id}`,
        date: p.date || `${p.month}-28`,
        type: 'Work Entry',
        project: projectMap[p.projectId] || 'Unregistered Site',
        description: p.workCategory ? `Work payroll: ${p.workCategory} (${p.workDays || 0} days @ ₹${p.ratePerDay || 0}/day)${p.supplyAmount ? ' + Material Supply' : ''}` : `Payroll wage execution for ${p.month}`,
        workAmount: (p.workAmount || 0) + (Number(p.supplyAmount) || 0),
        advance: 0,
        kharchi: 0,
        messDeduction: 0,
        otherDeduction: 0,
        payment: 0,
        enteredBy: p.level || 'System'
      });

      // Mess
      if (p.messDeduction > 0) {
        entries.push({
          id: `mess-${p.id}`,
          date: p.date || `${p.month}-28`,
          type: 'Mess Deduction',
          project: projectMap[p.projectId] || 'Unregistered Site',
          description: `Mess charges boarding deduction for ${p.month}`,
          workAmount: 0,
          advance: 0,
          kharchi: 0,
          messDeduction: p.messDeduction,
          otherDeduction: 0,
          payment: 0,
          enteredBy: p.level || 'System'
        });
      }

      // Other Deductions
      if (p.otherDeduction > 0) {
        entries.push({
          id: `ded-${p.id}`,
          date: p.date || `${p.month}-28`,
          type: 'Adjustment',
          project: projectMap[p.projectId] || 'Unregistered Site',
          description: p.otherDeductionDetails || `Other deduction adjustment for ${p.month}`,
          workAmount: 0,
          advance: 0,
          kharchi: 0,
          messDeduction: 0,
          otherDeduction: p.otherDeduction,
          payment: 0,
          enteredBy: p.level || 'System'
        });
      }

      // Actual cash paid (net payment)
      if (p.netPayment > 0) {
        entries.push({
          id: `pay-${p.id}`,
          date: p.date || `${p.month}-28`,
          type: 'Worker Payment',
          project: projectMap[p.projectId] || 'Unregistered Site',
          description: `Disbursed Net Paycheck Settlement for ${p.month}`,
          workAmount: 0,
          advance: 0,
          kharchi: 0,
          messDeduction: 0,
          otherDeduction: 0,
          payment: p.netPayment,
          enteredBy: p.level || 'System'
        });
      }
    });

    // Manual Entries
    filteredManualLedger.forEach(l => {
      entries.push({
        id: l.id,
        date: l.date,
        type: 'Adjustment',
        project: projectMap[l.projectId] || 'Unregistered Site',
        description: `${l.description}${l.remarks ? ` (${l.remarks})` : ''}`,
        workAmount: 0,
        advance: l.debit || 0,
        kharchi: 0,
        messDeduction: 0,
        otherDeduction: l.credit || 0,
        payment: 0,
        enteredBy: l.createdBy || 'Administrator'
      });
    });

    // Apply Transaction Type Filter
    const txFiltered = entries.filter(e => {
      if (filterTxType === 'All') return true;
      if (filterTxType === 'Work Entry') return e.type === 'Work Entry';
      if (filterTxType === 'Advance') return e.type === 'Advance' || e.type === 'Opening Balance';
      if (filterTxType === 'Kharchi') return e.type === 'Kharchi';
      if (filterTxType === 'Mess Deduction') return e.type === 'Mess Deduction';
      if (filterTxType === 'Worker Payment') return e.type === 'Worker Payment';
      if (filterTxType === 'Adjustment') return e.type === 'Adjustment';
      return true;
    });

    // Chronological oldest first sort
    const sorted = [...txFiltered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate rolling running balance
    let balance = 0;
    return sorted.map(e => {
      // Net Effect = earnings - advances given - kharchis given - mess deduction - other deduction - net paycheck paid
      const effect = e.workAmount - e.advance - e.kharchi - e.messDeduction - e.otherDeduction - e.payment;
      balance += effect;
      return {
        ...e,
        runningBalance: balance
      };
    });
  }, [activeWorker, filteredAdvances, filteredKharchis, filteredPayments, filteredManualLedger, filterTxType, filterProject, filterDateStart, filterDateEnd, filterFinYear, filterMonth, projectMap]);

  // KPI Calculations
  const totalGrossEarned = useMemo(() => filteredPayments.reduce((s, p) => s + (p.workAmount || 0) + (Number(p.supplyAmount) || 0), 0), [filteredPayments]);
  const totalAdvanceTaken = useMemo(() => {
    let sum = filteredAdvances.reduce((s, a) => s + (a.amount || 0), 0) + filteredManualLedger.reduce((s, l) => s + (l.debit || 0), 0);
    // Add opening if included in filters
    if (activeWorker?.openingAdvance) {
      const d = activeWorker.joiningDate || '2026-01-01';
      const match = (!filterDateStart || d >= filterDateStart) &&
                    (!filterDateEnd || d <= filterDateEnd) &&
                    (filterProject === 'All' || activeWorker.projectId === filterProject) &&
                    (filterFinYear === 'All' || getFinancialYear(d) === filterFinYear) &&
                    (filterMonth === 'All' || d.split('-')[1] === filterMonth);
      if (match) sum += activeWorker.openingAdvance;
    }
    return sum;
  }, [filteredAdvances, filteredManualLedger, activeWorker, filterProject, filterDateStart, filterDateEnd, filterFinYear, filterMonth]);

  const totalKharchi = useMemo(() => filteredKharchis.reduce((s, k) => s + (k.amount || 0), 0), [filteredKharchis]);
  const totalMess = useMemo(() => filteredPayments.reduce((s, p) => s + (p.messDeduction || 0), 0), [filteredPayments]);
  const totalOther = useMemo(() => filteredPayments.reduce((s, p) => s + (p.otherDeduction || 0), 0) + filteredManualLedger.reduce((s, l) => s + (l.credit || 0), 0), [filteredPayments, filteredManualLedger]);
  const totalPayment = useMemo(() => filteredPayments.reduce((s, p) => s + (p.netPayment || 0), 0), [filteredPayments]);
  
  // Math Alignment Formula
  const netEarned = totalGrossEarned - (totalAdvanceTaken + totalKharchi + totalMess + totalOther);
  const currentBalance = netEarned - totalPayment;

  // Active Wage Holds Outstanding
  const outstandingHeldVal = useMemo(() => {
    const holds = workerHolds.filter(h => h.workerId === activeWorkerId);
    return holds.reduce((s, h) => s + (h.holdAmount - (h.releasedAmount || 0)), 0);
  }, [workerHolds, activeWorkerId]);

  // Site-wise Earnings Table Aggregation
  const siteSummaries = useMemo(() => {
    if (!activeWorkerId) return [];
    const groups: Record<string, {
      projectId: string;
      projectName: string;
      workAmount: number;
      advance: number;
      kharchi: number;
      mess: number;
      other: number;
      payment: number;
      workingDays: number;
    }> = {};

    const getGroup = (pid: string) => {
      const id = pid || 'unregistered';
      if (!groups[id]) {
        groups[id] = {
          projectId: id,
          projectName: projectMap[id] || 'Unregistered Site',
          workAmount: 0, advance: 0, kharchi: 0, mess: 0, other: 0, payment: 0, workingDays: 0
        };
      }
      return groups[id];
    };

    // Include Opening Advance
    if (activeWorker?.openingAdvance) {
      const g = getGroup(activeWorker.projectId);
      g.advance += activeWorker.openingAdvance;
    }

    filteredPayments.forEach(p => {
      const g = getGroup(p.projectId);
      g.workAmount += p.workAmount || 0;
      g.mess += p.messDeduction || 0;
      g.other += p.otherDeduction || 0;
      g.payment += p.netPayment || 0;
      g.workingDays += p.workDays || 0;
    });

    filteredAdvances.forEach(a => {
      const g = getGroup(a.projectId);
      g.advance += a.amount || 0;
    });

    filteredKharchis.forEach(k => {
      const g = getGroup(k.projectId);
      g.kharchi += k.amount || 0;
    });

    filteredManualLedger.forEach(l => {
      const g = getGroup(l.projectId);
      g.advance += l.debit || 0;
      g.other += l.credit || 0;
    });

    return Object.values(groups);
  }, [activeWorker, filteredPayments, filteredAdvances, filteredKharchis, filteredManualLedger, activeWorkerId, projectMap]);

  // Site Sorting
  const [siteSortField, setSiteSortField] = useState('projectName');
  const [siteSortOrder, setSiteSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedSiteSummaries = useMemo(() => {
    return [...siteSummaries].sort((a, b) => {
      let valA: any = a[siteSortField as keyof typeof a];
      let valB: any = b[siteSortField as keyof typeof b];
      if (siteSortField === 'netEarned') {
        valA = a.workAmount - (a.advance + a.kharchi + a.mess + a.other);
        valB = b.workAmount - (b.advance + b.kharchi + b.mess + b.other);
      }
      if (typeof valA === 'string') {
        return siteSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return siteSortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      }
    });
  }, [siteSummaries, siteSortField, siteSortOrder]);

  const handleSiteSort = (field: string) => {
    if (siteSortField === field) {
      setSiteSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSiteSortField(field);
      setSiteSortOrder('asc');
    }
  };

  // Quick Statistics
  const totalSitesWorked = useMemo(() => {
    const set = new Set<string>();
    if (activeWorker?.projectId) set.add(activeWorker.projectId);
    workerPayments.filter(p => p.workerId === activeWorkerId).forEach(p => set.add(p.projectId));
    advances.filter(a => a.workerId === activeWorkerId).forEach(a => set.add(a.projectId));
    kharchis.filter(k => k.workerId === activeWorkerId).forEach(k => set.add(k.projectId));
    return set.size;
  }, [workerPayments, advances, kharchis, activeWorkerId, activeWorker]);

  const totalWorkingDaysCount = useMemo(() => filteredPayments.reduce((s, p) => s + (p.workDays || 0), 0), [filteredPayments]);
  const avgDailyEarnings = useMemo(() => totalWorkingDaysCount > 0 ? parseFloat((totalGrossEarned / totalWorkingDaysCount).toFixed(2)) : 0, [totalGrossEarned, totalWorkingDaysCount]);
  const highestMonthlyEarnings = useMemo(() => {
    const pays = workerPayments.filter(p => p.workerId === activeWorkerId);
    return pays.length > 0 ? Math.max(...pays.map(p => p.workAmount || 0)) : 0;
  }, [workerPayments, activeWorkerId]);

  const lastPaymentDate = useMemo(() => {
    const pays = workerPayments.filter(p => p.workerId === activeWorkerId && p.netPayment > 0);
    return pays.length > 0 ? [...pays].sort((a,b) => new Date(b.date || `${b.month}-28`).getTime() - new Date(a.date || `${a.month}-28`).getTime())[0].date || '' : '—';
  }, [workerPayments, activeWorkerId]);

  const lastAdvanceDate = useMemo(() => {
    const advs = advances.filter(a => a.workerId === activeWorkerId);
    return advs.length > 0 ? [...advs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : '—';
  }, [advances, activeWorkerId]);

  // Chronological Milestone Timeline Data
  const tenureTimeline = useMemo(() => {
    if (!activeWorker) return [];
    const events: Array<{ date: string; title: string; description: string; type: string }> = [];
    
    if (activeWorker.joiningDate) {
      events.push({
        date: activeWorker.joiningDate,
        title: 'Joined Company',
        description: `Inducted at site: ${projectMap[activeWorker.projectId] || 'Initial project'} as ${activeWorker.designation || 'Worker'}`,
        type: 'joining'
      });
    }

    // Site Transfers (whenever workerPayments project is different or registered)
    const seenSites = new Set<string>();
    if (activeWorker.projectId) seenSites.add(activeWorker.projectId);
    const sortedPayments = [...workerPayments.filter(p => p.workerId === activeWorkerId)].sort((a,b) => new Date(a.date || `${a.month}-28`).getTime() - new Date(b.date || `${b.month}-28`).getTime());
    sortedPayments.forEach(p => {
      if (!seenSites.has(p.projectId)) {
        seenSites.add(p.projectId);
        events.push({
          date: p.date || `${p.month}-01`,
          title: 'Transferred to Site',
          description: `Assigned duties at: ${projectMap[p.projectId] || 'New project'}`,
          type: 'transfer'
        });
      }
    });

    advances.filter(a => a.workerId === activeWorkerId).forEach(a => {
      events.push({
        date: a.date,
        title: 'Advance Issued',
        description: `Personal loan ₹${a.amount.toLocaleString('en-IN')} issued. Purpose: ${a.remarks || 'General'}`,
        type: 'advance'
      });
    });

    kharchis.filter(k => k.workerId === activeWorkerId).forEach(k => {
      events.push({
        date: k.date,
        title: 'Pocket money (Kharchi)',
        description: `Received weekly pocket money allowance: ₹${k.amount.toLocaleString('en-IN')}`,
        type: 'kharchi'
      });
    });

    workerPayments.filter(p => p.workerId === activeWorkerId && p.netPayment > 0).forEach(p => {
      events.push({
        date: p.date || `${p.month}-28`,
        title: 'Payment Done',
        description: `Wage settlement ₹${p.netPayment.toLocaleString('en-IN')} disbursed for ${p.month}`,
        type: 'payment'
      });
    });

    if (activeWorker.exitDate) {
      events.push({
        date: activeWorker.exitDate,
        title: 'Project Completed / Exited',
        description: 'Successfully completed tenure and marked exit from Sn Enterprises registry',
        type: 'exit'
      });
    }

    return events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [activeWorker, workerPayments, advances, kharchis, activeWorkerId, projectMap]);

  // Export to Excel Redirection
  const exportToExcel = () => {
    if (!activeWorker) return;
    const data: any[] = chronologicalLedger.map(e => ({
      'Date': e.date,
      'Transaction Type': e.type as string,
      'Project Site': e.project,
      'Description': e.description,
      'Work Earnings (INR)': e.workAmount || 0,
      'Advance Debit (INR)': e.advance || 0,
      'Kharchi Debit (INR)': e.kharchi || 0,
      'Mess Boarding (INR)': e.messDeduction || 0,
      'Other Deduction (INR)': e.otherDeduction || 0,
      'Net Payment Made (INR)': e.payment || 0,
      'Account Balance (INR)': e.runningBalance,
      'Entered By': e.enteredBy
    }));

    // Summary bottom row
    data.push({
      'Date': 'Totals',
      'Transaction Type': '',
      'Project Site': '',
      'Description': 'Cumulative Aggregated Financial Summary',
      'Work Earnings (INR)': totalGrossEarned,
      'Advance Debit (INR)': totalAdvanceTaken,
      'Kharchi Debit (INR)': totalKharchi,
      'Mess Boarding (INR)': totalMess,
      'Other Deduction (INR)': totalOther,
      'Net Payment Made (INR)': totalPayment,
      'Account Balance (INR)': currentBalance,
      'Entered By': ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Statement");
    XLSX.writeFile(wb, `SN_Worker_Ledger_${activeWorker.name.replace(/\s+/g, '_')}_${activeWorker.workerId}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Manual Posting Actions
  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkerId || isReadOnly) return;
    const amt = Number(ledgerForm.amount) || 0;
    const isDebit = ledgerForm.type === 'Debit';

    const payload = {
      workerId: activeWorkerId,
      projectId: activeWorker?.projectId || '',
      date: ledgerForm.date,
      voucherNo: ledgerForm.voucherNo || `MAN-${Math.floor(1000 + Math.random() * 9000)}`,
      description: ledgerForm.description,
      entryType: (isDebit ? 'Advance Given' : 'Advance Recovery') as any,
      debit: isDebit ? amt : 0,
      credit: isDebit ? 0 : amt,
      runningBalance: 0,
      remarks: ledgerForm.remarks
    };

    if (editingEntryId) {
      updateWorkerLedgerEntry(editingEntryId, payload);
      setEditingEntryId(null);
    } else {
      addWorkerLedgerEntry(payload);
      addWorkerRecoveryAudit({
        paymentId: payload.voucherNo,
        workerId: activeWorkerId,
        prevValue: 0,
        newValue: amt,
        modifiedBy: user?.name || 'Administrator',
        modifiedDate: ledgerForm.date
      });
    }

    setLedgerForm({
      date: new Date().toISOString().split('T')[0],
      voucherNo: '',
      description: 'Manual Advance Recovery',
      type: 'Credit',
      amount: '',
      remarks: ''
    });
    setShowManualEntryModal(false);
  };

  const handleSaveHold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkerId || isReadOnly) return;
    const amt = Number(holdForm.amount) || 0;
    if (amt <= 0) return;

    addWorkerHold({
      workerId: activeWorkerId,
      projectId: activeWorker?.projectId || '',
      holdDate: holdForm.date,
      holdAmount: amt,
      releasedAmount: 0,
      remainingHold: amt,
      status: 'Held',
      remarks: holdForm.remarks
    });

    setHoldForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      remarks: ''
    });
    setShowHoldModal(false);
  };

  const handleReleaseHold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingHoldId || isReadOnly) return;
    const relAmt = Number(releaseAmount) || 0;
    if (relAmt <= 0) return;

    const target = workerHolds.find(h => h.id === releasingHoldId);
    if (!target) return;

    const currentReleased = target.releasedAmount || 0;
    const totalReleased = currentReleased + relAmt;
    const fullyReleased = totalReleased >= target.holdAmount;

    updateWorkerHold(releasingHoldId, {
      releasedAmount: totalReleased,
      remainingHold: Math.max(0, target.holdAmount - totalReleased),
      status: fullyReleased ? 'Released' : 'Partially Released'
    });

    addWorkerLedgerEntry({
      workerId: target.workerId,
      projectId: target.projectId || '',
      date: new Date().toISOString().split('T')[0],
      voucherNo: `REL-${target.id.substring(0,4).toUpperCase()}`,
      description: `Release Payment Hold: "${releaseRemarks || 'Released by supervisor'}"`,
      entryType: 'Other',
      debit: 0,
      credit: relAmt,
      runningBalance: 0,
      remarks: `Associated Hold ID: ${target.id.substring(0,6)}`
    });

    addWorkerRecoveryAudit({
      paymentId: `REL-${target.id.substring(0,4).toUpperCase()}`,
      workerId: target.workerId,
      prevValue: currentReleased,
      newValue: totalReleased,
      modifiedBy: user?.name || 'Administrator',
      modifiedDate: new Date().toISOString().split('T')[0]
    });

    setReleasingHoldId(null);
    setReleaseAmount('');
    setReleaseRemarks('');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-gray-800 font-sans p-4 space-y-4 print:bg-white print:p-0">
      
      {/* Title & Organization Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-300 pb-3 gap-2 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0a6ed1] flex items-center space-x-2">
            <Calculator className="w-5 h-5 shrink-0" />
            <span>SN ENTERPRISES Construction ERP</span>
          </h1>
          <p className="text-[11px] text-gray-500 font-medium">Worker Ledger Statement & Centralized Account Book (SAP Fiori Style)</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="bg-white border border-gray-300 text-gray-700 font-mono text-[10px] px-2.5 py-1 rounded-[4px] shadow-sm">
            UTC Time: <strong className="font-bold">2026-07-02 06:03:24</strong>
          </span>
          <span className="bg-blue-50 border border-blue-200 text-[#0a6ed1] text-[10px] font-bold px-2.5 py-1 rounded-[4px] shadow-sm">
            Active System Session
          </span>
        </div>
      </div>

      {/* Main Grid: Three-Panel Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        {/* PANEL 1: Left Sidebar - Worker search & Selector (xl:col-span-3) */}
        <div className="xl:col-span-3 bg-white rounded-[8px] shadow-sm border border-gray-300 flex flex-col h-[750px] print:hidden">
          
          <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-[8px]">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-[#0a6ed1]" />
              <span>Worker Profiles Directory</span>
            </h2>
            <p className="text-[9px] text-gray-400 mt-0.5">Total registered workers: {workers.length}</p>
          </div>

          {/* Search Box */}
          <div className="p-2.5 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search ID, name, mobile..."
                className="w-full bg-white border border-gray-300 rounded-[4px] pl-8 pr-3 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1] transition"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Worker Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#f8fafc]">
            {filteredWorkersList.map(w => {
              const isActive = !w.exitDate;
              const isSelected = activeWorker?.id === w.id;
              
              // Count total outstanding advance for badge
              const os = advances.filter(a => a.workerId === w.id).reduce((s, a) => s + a.amount, 0) -
                         workerPayments.filter(p => p.workerId === w.id).reduce((s, p) => s + (p.recoveryAmount || 0) + (p.advanceDeduction || 0), 0) +
                         workerLedger.filter(l => l.workerId === w.id).reduce((s, l) => s + l.debit - l.credit, 0) +
                         (w.openingAdvance || 0);

              return (
                <div 
                  key={w.id}
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`p-2.5 rounded-[6px] border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-50/70 border-[#0a6ed1] shadow-sm' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-[11px] leading-tight flex items-center space-x-1.5">
                        <span>{w.name}</span>
                        <span className={`text-[8px] px-1 rounded-[2px] border font-semibold ${
                          isActive 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-650 border-red-200'
                        }`}>
                          {isActive ? 'Active' : 'Left'}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                        SR-{w.serialNo || '-'} | ID: <span className="font-bold">{w.workerId}</span>
                      </div>
                      <div className="text-[9px] text-gray-400 font-medium mt-1 flex items-center space-x-1">
                        <MapPin className="w-2.5 h-2.5 text-[#0a6ed1]" />
                        <span className="truncate max-w-[120px]">{projectMap[w.projectId] || 'Transferred/Archive'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-mono font-bold block ${os > 4000 ? 'text-red-650' : 'text-gray-700'}`}>
                        ₹{os.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[7.5px] font-bold text-gray-400 uppercase tracking-tight block mt-0.5">O/S ADV</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredWorkersList.length === 0 && (
              <div className="p-6 text-center text-gray-400 italic text-[11px] font-medium">No matches found.</div>
            )}
          </div>
        </div>

        {/* PANEL 2: Center Panel - Profile, Filters, KPIs, Summaries (xl:col-span-6) */}
        <div className="xl:col-span-6 space-y-4">
          
          {activeWorker ? (
            <div className="space-y-4">
              
              {/* Profile Block */}
              <div className="bg-white rounded-[8px] p-3.5 border border-gray-300 shadow-sm border-l-[4px] border-l-[#0a6ed1]">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  
                  {/* Photo / Avatar & Info */}
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-[#0a6ed1] font-bold text-base shadow-inner border border-blue-200">
                      {activeWorker.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-[14px] font-bold text-gray-900 leading-none">{activeWorker.name}</h2>
                        <span className="bg-gray-100 text-gray-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-gray-250">
                          ID: {activeWorker.workerId}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-gray-500 mt-2">
                        <div>Designation: <strong className="text-gray-800 font-semibold">{activeWorker.designation || 'General Worker'}</strong></div>
                        <div>Mobile: <strong className="text-gray-800 font-mono">{activeWorker.mobileNo || 'None'}</strong></div>
                        <div>Joined: <strong className="text-gray-800">{activeWorker.joiningDate || '—'}</strong></div>
                        <div className="md:col-span-2">Registered Site: <strong className="text-[#0a6ed1] font-bold">{projectMap[activeWorker.projectId] || 'None'}</strong></div>
                        <div>Total Sites Worked: <strong className="text-gray-800">{totalSitesWorked}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Top Right Action Tools */}
                  <div className="flex items-center space-x-1.5 shrink-0 print:hidden">
                    <button 
                      onClick={handlePrint}
                      className="px-2.5 py-1 bg-white border border-gray-300 rounded-[4px] text-gray-700 hover:bg-gray-50 text-[10px] font-bold flex items-center space-x-1 shadow-xs transition"
                      title="Print Ledger Report"
                    >
                      <Printer className="w-3 h-3 text-gray-500" />
                      <span>Print</span>
                    </button>
                    <PDFExportButton
                      title="Worker Ledger Report"
                      subtitle={`Worker: ${activeWorker.name} (${activeWorker.workerId}) - ${projectMap[activeWorker.projectId]}`}
                      headers={['Date', 'Voucher No', 'Description', 'Work Earnings', 'Deduction/Adjustment', 'Running Balance']}
                      data={chronologicalLedger.map(e => [
                        e.date,
                        e.type,
                        e.description,
                        e.workAmount ? `₹${e.workAmount}` : '-',
                        (e.advance || e.kharchi || e.messDeduction || e.otherDeduction) ? `₹${(e.advance + e.kharchi + e.messDeduction + e.otherDeduction)}` : '-',
                        `₹${e.runningBalance}`
                      ])}
                    />
                    <button
                      onClick={exportToExcel}
                      className="px-2.5 py-1 bg-white border border-green-300 hover:bg-green-50 text-green-700 text-[10px] font-bold flex items-center space-x-1 shadow-xs transition"
                      title="Export Statement to Excel"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-green-600" />
                      <span>Excel</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Advanced Filter Block */}
              <div className="bg-white rounded-[8px] p-3 border border-gray-300 shadow-sm space-y-2.5 print:hidden">
                <div className="flex items-center justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-gray-500" />
                    <span>Advanced Statement Filters</span>
                  </span>
                  <button 
                    onClick={() => {
                      setFilterProject('All');
                      setFilterDateStart('');
                      setFilterDateEnd('');
                      setFilterTxType('All');
                      setFilterFinYear('All');
                      setFilterMonth('All');
                    }}
                    className="text-[9px] font-bold text-red-650 hover:underline"
                  >
                    Clear All Filters
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[10px]">
                  
                  {/* Project site */}
                  <div className="flex flex-col">
                    <label className="text-gray-500 font-bold mb-1">Site / Project</label>
                    <select 
                      className="bg-white border border-gray-300 rounded-[4px] px-1.5 py-1 focus:outline-none focus:border-[#0a6ed1]"
                      value={filterProject}
                      onChange={e => setFilterProject(e.target.value)}
                    >
                      <option value="All">All Sites</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {/* Date range start */}
                  <div className="flex flex-col">
                    <label className="text-gray-500 font-bold mb-1">From Date</label>
                    <input 
                      type="date"
                      className="bg-white border border-gray-300 rounded-[4px] px-1.5 py-1 focus:outline-none focus:border-[#0a6ed1]"
                      value={filterDateStart}
                      onChange={e => setFilterDateStart(e.target.value)}
                    />
                  </div>

                  {/* Date range end */}
                  <div className="flex flex-col">
                    <label className="text-gray-500 font-bold mb-1">To Date</label>
                    <input 
                      type="date"
                      className="bg-white border border-gray-300 rounded-[4px] px-1.5 py-1 focus:outline-none focus:border-[#0a6ed1]"
                      value={filterDateEnd}
                      onChange={e => setFilterDateEnd(e.target.value)}
                    />
                  </div>

                  {/* Transaction Type */}
                  <div className="flex flex-col">
                    <label className="text-gray-500 font-bold mb-1">Tx Type</label>
                    <select 
                      className="bg-white border border-gray-300 rounded-[4px] px-1.5 py-1 focus:outline-none focus:border-[#0a6ed1]"
                      value={filterTxType}
                      onChange={e => setFilterTxType(e.target.value)}
                    >
                      <option value="All">All Transactions</option>
                      <option value="Work Entry">Work Entry</option>
                      <option value="Advance">Advance</option>
                      <option value="Kharchi">Kharchi</option>
                      <option value="Mess Deduction">Mess Deduction</option>
                      <option value="Worker Payment">Worker Payment</option>
                      <option value="Adjustment">Adjustment</option>
                    </select>
                  </div>

                  {/* Fin Year */}
                  <div className="flex flex-col">
                    <label className="text-gray-500 font-bold mb-1">Fin Year</label>
                    <select 
                      className="bg-white border border-gray-300 rounded-[4px] px-1.5 py-1 focus:outline-none focus:border-[#0a6ed1]"
                      value={filterFinYear}
                      onChange={e => setFilterFinYear(e.target.value)}
                    >
                      <option value="All">All Years</option>
                      <option value="2026-27">2026-27</option>
                      <option value="2025-26">2025-26</option>
                      <option value="2024-25">2024-25</option>
                    </select>
                  </div>

                  {/* Month */}
                  <div className="flex flex-col">
                    <label className="text-gray-500 font-bold mb-1">Month</label>
                    <select 
                      className="bg-white border border-gray-300 rounded-[4px] px-1.5 py-1 focus:outline-none focus:border-[#0a6ed1]"
                      value={filterMonth}
                      onChange={e => setFilterMonth(e.target.value)}
                    >
                      <option value="All">All Months</option>
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* KPI Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                {/* Gross Earned */}
                <div className="bg-white border border-gray-300 rounded-[6px] p-2.5 shadow-xs border-t-[3px] border-t-[#0a6ed1]">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Gross Earned</span>
                    <TrendingUp className="w-3.5 h-3.5 text-[#0a6ed1]" />
                  </div>
                  <div className="text-[13px] font-mono font-bold text-gray-900 mt-1">₹{totalGrossEarned.toLocaleString('en-IN')}</div>
                  <div className="text-[7.5px] text-gray-400 mt-0.5">Aggregated wage credit</div>
                </div>

                {/* Advance Taken */}
                <div className="bg-white border border-gray-300 rounded-[6px] p-2.5 shadow-xs border-t-[3px] border-t-amber-500">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Advance Taken</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-[13px] font-mono font-bold text-gray-950 mt-1">₹{totalAdvanceTaken.toLocaleString('en-IN')}</div>
                  <div className="text-[7.5px] text-gray-400 mt-0.5">Opening + regular loans</div>
                </div>

                {/* Kharchi */}
                <div className="bg-white border border-gray-300 rounded-[6px] p-2.5 shadow-xs border-t-[3px] border-t-yellow-500">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Kharchi</span>
                    <DollarSign className="w-3.5 h-3.5 text-yellow-500" />
                  </div>
                  <div className="text-[13px] font-mono font-bold text-gray-900 mt-1">₹{totalKharchi.toLocaleString('en-IN')}</div>
                  <div className="text-[7.5px] text-gray-400 mt-0.5">Pocket money allowance</div>
                </div>

                {/* Mess Deduction */}
                <div className="bg-white border border-gray-300 rounded-[6px] p-2.5 shadow-xs border-t-[3px] border-t-red-400">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Mess Deduct</span>
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="text-[13px] font-mono font-bold text-gray-900 mt-1">₹{totalMess.toLocaleString('en-IN')}</div>
                  <div className="text-[7.5px] text-gray-400 mt-0.5">Boarding & food deductions</div>
                </div>

                {/* Other Deduction */}
                <div className="bg-white border border-gray-300 rounded-[6px] p-2.5 shadow-xs border-t-[3px] border-t-red-650">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Other Deduct</span>
                    <Sliders className="w-3.5 h-3.5 text-red-650" />
                  </div>
                  <div className="text-[13px] font-mono font-bold text-gray-900 mt-1">₹{totalOther.toLocaleString('en-IN')}</div>
                  <div className="text-[7.5px] text-gray-400 mt-0.5">Manual ledger & safety charge</div>
                </div>

                {/* Total Payment Given */}
                <div className="bg-white border border-gray-300 rounded-[6px] p-2.5 shadow-xs border-t-[3px] border-t-green-500">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Disbursed net</span>
                    <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div className="text-[13px] font-mono font-bold text-green-700 mt-1">₹{totalPayment.toLocaleString('en-IN')}</div>
                  <div className="text-[7.5px] text-gray-400 mt-0.5">Payroll actual cash payments</div>
                </div>

                {/* Net Earned */}
                <div className="bg-white border border-gray-300 rounded-[6px] p-2.5 shadow-xs border-t-[3px] border-t-teal-500">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Net Earned</span>
                    <Award className="w-3.5 h-3.5 text-teal-500" />
                  </div>
                  <div className="text-[13px] font-mono font-bold text-[#0a6ed1] mt-1">₹{netEarned.toLocaleString('en-IN')}</div>
                  <div className="text-[7.5px] text-gray-400 mt-0.5">Gross less advances/deductions</div>
                </div>

                {/* Current Balance */}
                <div className={`border rounded-[6px] p-2.5 shadow-xs border-t-[3px] ${
                  currentBalance >= 0 
                    ? 'bg-green-50/50 border-green-300 border-t-green-600' 
                    : 'bg-red-50/50 border-red-300 border-t-red-650'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Current Balance</span>
                    <Activity className={`w-3.5 h-3.5 ${currentBalance >= 0 ? 'text-green-600' : 'text-red-500'}`} />
                  </div>
                  <div className={`text-[13px] font-mono font-bold mt-1 ${currentBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ₹{currentBalance.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[7.5px] text-gray-500 mt-0.5">
                    {currentBalance >= 0 ? 'Company has to pay' : 'Worker has advance debt'}
                  </div>
                </div>

              </div>

              {/* Site-wise Earnings Summary Section */}
              <div className="bg-white rounded-[8px] border border-gray-300 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-white px-3.5 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase text-gray-700 flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#0a6ed1]" />
                    <span>Site-wise Cumulative Earnings Summary</span>
                  </h3>
                  <span className="text-[9px] text-gray-400 font-mono font-bold">RECORDS: {siteSummaries.length}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-[#f8fafc] border-b border-gray-200 sticky top-0 text-gray-600">
                      <tr className="divide-x divide-gray-150">
                        <th className="p-2 cursor-pointer hover:bg-gray-100 font-semibold" onClick={() => handleSiteSort('projectName')}>Project Site</th>
                        <th className="p-2 cursor-pointer hover:bg-gray-100 text-right font-semibold" onClick={() => handleSiteSort('workAmount')}>Work Amount</th>
                        <th className="p-2 cursor-pointer hover:bg-gray-100 text-right font-semibold" onClick={() => handleSiteSort('advance')}>Advance</th>
                        <th className="p-2 cursor-pointer hover:bg-gray-100 text-right font-semibold" onClick={() => handleSiteSort('kharchi')}>Kharchi</th>
                        <th className="p-2 cursor-pointer hover:bg-gray-100 text-right font-semibold" onClick={() => handleSiteSort('mess')}>Mess</th>
                        <th className="p-2 cursor-pointer hover:bg-gray-100 text-right font-semibold" onClick={() => handleSiteSort('other')}>Other</th>
                        <th className="p-2 cursor-pointer hover:bg-gray-100 text-right font-semibold" onClick={() => handleSiteSort('payment')}>Total Paid</th>
                        <th className="p-2 cursor-pointer hover:bg-gray-100 text-right font-bold text-[#0a6ed1]" onClick={() => handleSiteSort('netEarned')}>Net Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {sortedSiteSummaries.map((s, i) => {
                        const netBal = s.workAmount - (s.advance + s.kharchi + s.mess + s.other) - s.payment;
                        return (
                          <tr key={s.projectId} className={`hover:bg-blue-50/20 divide-x divide-gray-150 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            <td className="p-2 font-bold text-gray-850 truncate max-w-[150px]" title={s.projectName}>{s.projectName}</td>
                            <td className="p-2 text-right font-mono">₹{s.workAmount.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right font-mono text-red-650">₹{s.advance.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right font-mono text-amber-800">₹{s.kharchi.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right font-mono text-red-500">₹{s.mess.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right font-mono text-red-650">₹{s.other.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right font-mono text-green-700 font-medium">₹{s.payment.toLocaleString('en-IN')}</td>
                            <td className={`p-2 text-right font-mono font-bold ${netBal >= 0 ? 'text-green-700 bg-green-50/20' : 'text-red-700 bg-red-50/20'}`}>
                              ₹{netBal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                      {siteSummaries.length > 0 && (
                        <tr className="bg-[#f1f5f9] font-bold border-t border-gray-300 divide-x divide-gray-200">
                          <td className="p-2 text-gray-700 font-bold">Cumulative Totals</td>
                          <td className="p-2 text-right font-mono">₹{totalGrossEarned.toLocaleString('en-IN')}</td>
                          <td className="p-2 text-right font-mono text-red-650">₹{totalAdvanceTaken.toLocaleString('en-IN')}</td>
                          <td className="p-2 text-right font-mono text-amber-800">₹{totalKharchi.toLocaleString('en-IN')}</td>
                          <td className="p-2 text-right font-mono text-red-500">₹{totalMess.toLocaleString('en-IN')}</td>
                          <td className="p-2 text-right font-mono text-red-650">₹{totalOther.toLocaleString('en-IN')}</td>
                          <td className="p-2 text-right font-mono text-green-700">₹{totalPayment.toLocaleString('en-IN')}</td>
                          <td className={`p-2 text-right font-mono font-extrabold ${currentBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            ₹{currentBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                      {siteSummaries.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-gray-400 italic bg-white">No site records matching filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Site Performance expandable Cards (Accordion style) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Site-wise performance index cards</span>
                  <span className="text-[8.5px] text-gray-400">Click headers to expand performance metrics</span>
                </div>

                {siteSummaries.map(s => {
                  const pStatus = projects.find(p => p.id === s.projectId)?.status || 'Ongoing';
                  const isExpanded = expandedSites[s.projectId];
                  const sNetEarned = s.workAmount - (s.advance + s.kharchi + s.mess + s.other);
                  
                  return (
                    <div key={s.projectId} className="bg-white border border-gray-300 rounded-[6px] overflow-hidden shadow-xs">
                      
                      {/* Header bar click triggers collapse */}
                      <div 
                        onClick={() => toggleSiteExpand(s.projectId)}
                        className="p-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-gray-200"
                      >
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-[#0a6ed1]" />
                          <span className="text-[11px] font-bold text-gray-800">{s.projectName}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            pStatus === 'Completed' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                            {pStatus}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-[10.5px] font-mono font-bold text-[#0a6ed1]">Net: ₹{sNetEarned.toLocaleString('en-IN')}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>

                      {/* Expandable details content */}
                      {isExpanded && (
                        <div className="p-3 bg-white grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-100 text-[10px] text-gray-600 font-medium">
                          <div className="space-y-0.5 border-r border-gray-100 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Gross Work Earned</span>
                            <span className="text-[11px] font-mono font-bold text-gray-900">₹{s.workAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="space-y-0.5 border-r border-gray-100 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Capital Advances</span>
                            <span className="text-[11px] font-mono font-bold text-red-650">₹{s.advance.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="space-y-0.5 border-r border-gray-100 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Pocket Allowance (Kharchi)</span>
                            <span className="text-[11px] font-mono font-bold text-amber-800">₹{s.kharchi.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="space-y-0.5 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Mess deductions</span>
                            <span className="text-[11px] font-mono font-bold text-red-500">₹{s.mess.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="space-y-0.5 border-r border-gray-100 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Other deductions</span>
                            <span className="text-[11px] font-mono font-bold text-red-650">₹{s.other.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="space-y-0.5 border-r border-gray-100 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Total Hand-to-Hand payments</span>
                            <span className="text-[11px] font-mono font-bold text-green-700">₹{s.payment.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="space-y-0.5 border-r border-gray-100 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Net Earned After Debt</span>
                            <span className="text-[11px] font-mono font-bold text-teal-650">₹{sNetEarned.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="space-y-0.5 p-1">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px] tracking-wider">Working Days Count</span>
                            <span className="text-[11px] font-bold text-gray-950 font-mono">{s.workingDays} days</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Financial History Tabs container */}
              <div className="bg-white rounded-[8px] border border-gray-300 shadow-sm overflow-hidden flex flex-col">
                
                {/* SAP Fiori Tabstrip headers */}
                <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <button 
                      onClick={() => setActiveHistoryTab('transactions')}
                      className={`px-3 py-1.5 rounded-[4px] text-[10.5px] font-bold transition flex items-center space-x-1 ${
                        activeHistoryTab === 'transactions' 
                          ? 'bg-[#0a6ed1] text-white' 
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-250'
                      }`}
                    >
                      <History className="w-3 h-3" />
                      <span>Ledger Statement</span>
                    </button>
                    <button 
                      onClick={() => setActiveHistoryTab('payments')}
                      className={`px-3 py-1.5 rounded-[4px] text-[10.5px] font-bold transition flex items-center space-x-1 ${
                        activeHistoryTab === 'payments' 
                          ? 'bg-[#0a6ed1] text-white' 
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-250'
                      }`}
                    >
                      <ArrowDownLeft className="w-3 h-3" />
                      <span>Payments History</span>
                    </button>
                    <button 
                      onClick={() => setActiveHistoryTab('advances')}
                      className={`px-3 py-1.5 rounded-[4px] text-[10.5px] font-bold transition flex items-center space-x-1 ${
                        activeHistoryTab === 'advances' 
                          ? 'bg-[#0a6ed1] text-white' 
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-250'
                      }`}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Advances Book</span>
                    </button>
                    <button 
                      onClick={() => setActiveHistoryTab('kharchis')}
                      className={`px-3 py-1.5 rounded-[4px] text-[10.5px] font-bold transition flex items-center space-x-1 ${
                        activeHistoryTab === 'kharchis' 
                          ? 'bg-[#0a6ed1] text-white' 
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-250'
                      }`}
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>Kharchi Record</span>
                    </button>
                    <button 
                      onClick={() => setActiveHistoryTab('mess')}
                      className={`px-3 py-1.5 rounded-[4px] text-[10.5px] font-bold transition flex items-center space-x-1 ${
                        activeHistoryTab === 'mess' 
                          ? 'bg-[#0a6ed1] text-white' 
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-250'
                      }`}
                    >
                      <X className="w-3 h-3" />
                      <span>Mess Deductions</span>
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono font-bold pr-1">ENTRIES: {chronologicalLedger.length}</span>
                </div>

                {/* Tab content area */}
                <div className="p-1">
                  
                  {/* TAB 1: Main Chronological Ledger */}
                  {activeHistoryTab === 'transactions' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] border-collapse bg-white">
                        <thead className="bg-[#f8fafc] border-b border-gray-250 sticky top-0 text-gray-600">
                          <tr className="divide-x divide-gray-150">
                            <th className="p-2 font-semibold w-24">Date</th>
                            <th className="p-2 font-semibold w-20">Type</th>
                            <th className="p-2 font-semibold">Description</th>
                            <th className="p-2 text-right font-semibold text-green-700 bg-green-50/10 w-24">Work Credit</th>
                            <th className="p-2 text-right font-semibold text-red-650 bg-red-50/10 w-24">Debt Debit</th>
                            <th className="p-2 text-right font-bold text-gray-900 bg-[#f1f5f9] w-28">Running Bal</th>
                            {!isReadOnly && <th className="p-2 text-center font-semibold w-16">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {chronologicalLedger.map(e => {
                            const isManual = e.id.startsWith('MAN-') || !e.id.includes('-') && e.id.length > 20; // Check manual id format
                            return (
                              <tr key={e.id} className="hover:bg-blue-50/25 divide-x divide-gray-150">
                                <td className="p-2 font-mono text-gray-500">{e.date}</td>
                                <td className="p-2 font-semibold">
                                  <span className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-bold block text-center uppercase tracking-tight border ${
                                    e.type === 'Work Entry' ? 'bg-green-50 text-green-800 border-green-200' :
                                    e.type === 'Advance' ? 'bg-amber-50 text-amber-800 border-amber-250' :
                                    e.type === 'Kharchi' ? 'bg-yellow-50 text-yellow-850 border-yellow-200' :
                                    e.type === 'Worker Payment' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                    e.type === 'Opening Balance' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                    'bg-gray-50 text-gray-700 border-gray-300'
                                  }`}>
                                    {e.type === 'Opening Balance' ? 'Opening' : e.type}
                                  </span>
                                </td>
                                <td className="p-2 text-gray-800 font-sans" title={e.description}>
                                  <div className="font-medium leading-normal">{e.description}</div>
                                  <div className="text-[8.5px] text-gray-400 font-semibold font-mono mt-0.5">SITE: {e.project}</div>
                                </td>
                                <td className="p-2 text-right font-mono text-green-700 font-bold">
                                  {e.workAmount > 0 ? `₹${e.workAmount.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="p-2 text-right font-mono text-red-650 font-bold">
                                  {(e.advance + e.kharchi + e.messDeduction + e.otherDeduction + e.payment) > 0 ? `₹${(e.advance + e.kharchi + e.messDeduction + e.otherDeduction + e.payment).toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="p-2 text-right font-mono font-bold bg-[#fcfdfe] text-gray-900">
                                  ₹{e.runningBalance.toLocaleString('en-IN')}
                                </td>
                                {!isReadOnly && (
                                  <td className="p-2 text-center font-sans">
                                    {isManual ? (
                                      <div className="flex items-center justify-center space-x-1.5">
                                        <button 
                                          onClick={() => {
                                            setEditingEntryId(e.id);
                                            setLedgerForm({
                                              date: e.date,
                                              voucherNo: e.id,
                                              description: e.description,
                                              type: e.advance > 0 ? 'Debit' : 'Credit',
                                              amount: (e.advance || e.otherDeduction).toString(),
                                              remarks: ''
                                            });
                                            setShowManualEntryModal(true);
                                          }} 
                                          className="text-blue-600 hover:text-blue-800" 
                                          title="Edit Entry"
                                        >
                                          <Edit2 size={11} />
                                        </button>
                                        <button 
                                          onClick={() => deleteWorkerLedgerEntry(e.id)} 
                                          className="text-red-500 hover:text-red-700" 
                                          title="Delete Entry"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[8px] text-gray-400 italic">System Auto</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          {chronologicalLedger.length === 0 && (
                            <tr>
                              <td colSpan={!isReadOnly ? 7 : 6} className="p-6 text-center text-gray-400 italic bg-gray-50 text-[11px] font-semibold">
                                No records fit the selected criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 2: Payment History */}
                  {activeHistoryTab === 'payments' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] border-collapse bg-white">
                        <thead className="bg-[#f8fafc] border-b border-gray-250 text-gray-600">
                          <tr className="divide-x divide-gray-150">
                            <th className="p-2 font-semibold">Date</th>
                            <th className="p-2 font-semibold">Voucher No</th>
                            <th className="p-2 font-semibold">Project Site</th>
                            <th className="p-2 font-semibold">Approval / Mode</th>
                            <th className="p-2 text-right font-bold text-green-700 bg-green-50/10">Amount</th>
                            <th className="p-2 font-semibold">Entered By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {filteredPayments.map(p => (
                            <tr key={p.id} className="hover:bg-blue-50/20 divide-x divide-gray-150">
                              <td className="p-2 font-mono text-gray-500">{p.date || `${p.month}-28`}</td>
                              <td className="p-2 font-mono text-[#0a6ed1] font-bold">PAY-{p.id.substring(0,6).toUpperCase()}</td>
                              <td className="p-2 font-bold text-gray-700">{projectMap[p.projectId] || 'Unregistered'}</td>
                              <td className="p-2 font-medium text-gray-500">{p.paymentStatus || 'Disbursed Payroll'}</td>
                              <td className="p-2 text-right font-mono text-green-700 font-bold bg-green-50/5">₹{p.netPayment.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-gray-500 font-medium">{p.level || 'System'}</td>
                            </tr>
                          ))}
                          {filteredPayments.length > 0 && (
                            <tr className="bg-gray-100 font-bold border-t border-gray-300">
                              <td colSpan={4} className="p-2 uppercase text-gray-700">Total Payments Given</td>
                              <td className="p-2 text-right font-mono text-green-700 text-[11px] font-extrabold">₹{totalPayment.toLocaleString('en-IN')}</td>
                              <td></td>
                            </tr>
                          )}
                          {filteredPayments.length === 0 && (
                            <tr><td colSpan={6} className="p-6 text-center text-gray-400 italic bg-gray-50">No payments registered under these filters.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 3: Advance History */}
                  {activeHistoryTab === 'advances' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] border-collapse bg-white">
                        <thead className="bg-[#f8fafc] border-b border-gray-250 text-gray-600">
                          <tr className="divide-x divide-gray-150">
                            <th className="p-2 font-semibold">Date</th>
                            <th className="p-2 font-semibold">Project Site</th>
                            <th className="p-2 font-semibold">Remarks / Purpose</th>
                            <th className="p-2 text-right font-bold text-red-650 bg-red-50/10">Advance Amount</th>
                            <th className="p-2 font-semibold">Approved By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {filteredAdvances.map(a => (
                            <tr key={a.id} className="hover:bg-blue-50/20 divide-x divide-gray-150">
                              <td className="p-2 font-mono text-gray-500">{a.date}</td>
                              <td className="p-2 font-bold text-gray-700">{projectMap[a.projectId] || 'Unregistered'}</td>
                              <td className="p-2 text-gray-500 font-medium italic">{a.remarks || 'General Cash Advance'}</td>
                              <td className="p-2 text-right font-mono text-red-650 font-bold">₹{a.amount.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-[#0a6ed1] font-bold">{a.paidBy || 'System'}</td>
                            </tr>
                          ))}
                          {filteredAdvances.length > 0 && (
                            <tr className="bg-gray-100 font-bold border-t border-gray-300">
                              <td colSpan={3} className="p-2 uppercase text-gray-700">Total Advances Taken</td>
                              <td className="p-2 text-right font-mono text-red-650 text-[11px] font-extrabold">₹{filteredAdvances.reduce((s,a)=> s+a.amount, 0).toLocaleString('en-IN')}</td>
                              <td></td>
                            </tr>
                          )}
                          {filteredAdvances.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-gray-400 italic bg-gray-50">No advance loan disbursements.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 4: Kharchi History */}
                  {activeHistoryTab === 'kharchis' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] border-collapse bg-white">
                        <thead className="bg-[#f8fafc] border-b border-gray-250 text-gray-600">
                          <tr className="divide-x divide-gray-150">
                            <th className="p-2 font-semibold">Date</th>
                            <th className="p-2 font-semibold">Project Site</th>
                            <th className="p-2 font-semibold">Allowance Type</th>
                            <th className="p-2 text-right font-bold text-amber-800 bg-amber-50/5">Amount</th>
                            <th className="p-2 font-semibold">Authorized By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {filteredKharchis.map(k => (
                            <tr key={k.id} className="hover:bg-blue-50/20 divide-x divide-gray-150">
                              <td className="p-2 font-mono text-gray-500">{k.date}</td>
                              <td className="p-2 font-bold text-gray-700">{projectMap[k.projectId] || 'Unregistered'}</td>
                              <td className="p-2 text-gray-400 italic font-medium">Weekly pocket cash allowance</td>
                              <td className="p-2 text-right font-mono text-amber-850 font-bold">₹{k.amount.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-gray-500 font-semibold">Supervisor</td>
                            </tr>
                          ))}
                          {filteredKharchis.length > 0 && (
                            <tr className="bg-gray-100 font-bold border-t border-gray-300">
                              <td colSpan={3} className="p-2 uppercase text-gray-700">Total Kharchi Issued</td>
                              <td className="p-2 text-right font-mono text-amber-800 text-[11px] font-extrabold">₹{totalKharchi.toLocaleString('en-IN')}</td>
                              <td></td>
                            </tr>
                          )}
                          {filteredKharchis.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-gray-400 italic bg-gray-50">No pocket money kharchis logged.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 5: Mess Deductions */}
                  {activeHistoryTab === 'mess' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] border-collapse bg-white">
                        <thead className="bg-[#f8fafc] border-b border-gray-250 text-gray-600">
                          <tr className="divide-x divide-gray-150">
                            <th className="p-2 font-semibold">Month / Date</th>
                            <th className="p-2 font-semibold">Project Site</th>
                            <th className="p-2 font-semibold">Deduction Remarks</th>
                            <th className="p-2 text-right font-bold text-red-500 bg-red-50/10">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {filteredPayments.filter(p => p.messDeduction > 0).map(p => (
                            <tr key={p.id} className="hover:bg-blue-50/20 divide-x divide-gray-150">
                              <td className="p-2 font-mono text-gray-500">{p.date || p.month}</td>
                              <td className="p-2 font-bold text-gray-700">{projectMap[p.projectId] || 'Unregistered'}</td>
                              <td className="p-2 text-gray-400 italic font-medium">Automatic mess boarding charges</td>
                              <td className="p-2 text-right font-mono text-red-500 font-bold">₹{p.messDeduction.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                          {filteredPayments.filter(p => p.messDeduction > 0).length > 0 && (
                            <tr className="bg-gray-100 font-bold border-t border-gray-300">
                              <td colSpan={3} className="p-2 uppercase text-gray-700">Total Mess Deduct</td>
                              <td className="p-2 text-right font-mono text-red-500 text-[11px] font-extrabold">₹{totalMess.toLocaleString('en-IN')}</td>
                            </tr>
                          )}
                          {filteredPayments.filter(p => p.messDeduction > 0).length === 0 && (
                            <tr><td colSpan={4} className="p-6 text-center text-gray-400 italic bg-gray-50">No mess deductions logs found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-[8px] p-12 text-center border border-gray-300 shadow-sm flex flex-col items-center justify-center space-y-3.5 h-[500px]">
              <Clock className="w-10 h-10 text-gray-300 animate-pulse" />
              <div>
                <h3 className="font-bold text-gray-800 text-[13px] uppercase">No Worker Profile Selected</h3>
                <p className="text-gray-400 text-[10px] max-w-sm mt-1 leading-normal">
                  Select an active worker profile from the sidebar list on the left to load site-wise financial audits, advances ledger, payment holds, and transaction timeline.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* PANEL 3: Right Panel - Financial Summary, Statistics, Actions, Timeline (xl:col-span-3) */}
        <div className="xl:col-span-3 space-y-4">
          
          {activeWorker ? (
            <div className="space-y-4">
              
              {/* Financial Statement Formula card */}
              <div className="bg-[#002f6c] rounded-[8px] p-3.5 text-white shadow-md border border-[#001f4c]">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-200 border-b border-blue-800 pb-1.5 flex items-center space-x-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-300" />
                  <span>Financial Summary Panel</span>
                </h3>

                <div className="space-y-2 mt-2.5 text-[10.5px]">
                  
                  {/* Gross Earned */}
                  <div className="flex justify-between items-center text-blue-100">
                    <span>Gross Work Earned</span>
                    <span className="font-mono font-bold text-white">₹{totalGrossEarned.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="text-[8px] text-blue-300 font-extrabold uppercase border-t border-blue-900 pt-1.5 pb-0.5">DEDUCTIONS & DEBTS (LESS)</div>
                  
                  {/* Advance Taken */}
                  <div className="flex justify-between items-center pl-1 text-blue-200">
                    <span className="flex items-center"><ArrowRight className="w-2.5 h-2.5 mr-1" /> Advances Pushed</span>
                    <span className="font-mono text-white">₹{totalAdvanceTaken.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Kharchi */}
                  <div className="flex justify-between items-center pl-1 text-blue-200">
                    <span className="flex items-center"><ArrowRight className="w-2.5 h-2.5 mr-1" /> Kharchi Issued</span>
                    <span className="font-mono text-white">₹{totalKharchi.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Mess */}
                  <div className="flex justify-between items-center pl-1 text-blue-200">
                    <span className="flex items-center"><ArrowRight className="w-2.5 h-2.5 mr-1" /> Mess Boarding</span>
                    <span className="font-mono text-white">₹{totalMess.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Other */}
                  <div className="flex justify-between items-center pl-1 text-blue-200">
                    <span className="flex items-center"><ArrowRight className="w-2.5 h-2.5 mr-1" /> Other Adjustments</span>
                    <span className="font-mono text-white">₹{totalOther.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Equals Net Earned */}
                  <div className="flex justify-between items-center border-t border-blue-800 pt-1.5 font-bold text-teal-300">
                    <span>Net Earned Wages</span>
                    <span className="font-mono text-[11px]">₹{netEarned.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="text-[8px] text-blue-300 font-extrabold uppercase border-t border-blue-900 pt-1.5 pb-0.5">DISBURSEMENTS</div>
                  
                  {/* Total Payment given */}
                  <div className="flex justify-between items-center pl-1 text-blue-200">
                    <span className="flex items-center"><ArrowRight className="w-2.5 h-2.5 mr-1" /> Payments Disbursed</span>
                    <span className="font-mono text-white">₹{totalPayment.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Current Balance box */}
                  <div className={`mt-3 p-2 rounded border text-center ${
                    currentBalance >= 0 
                      ? 'bg-green-900/40 border-green-600 text-green-300' 
                      : 'bg-red-950/40 border-red-700 text-red-300'
                  }`}>
                    <div className="text-[8.5px] uppercase font-bold tracking-wider">Statement Current Balance</div>
                    <div className="text-sm font-mono font-black mt-0.5">₹{currentBalance.toLocaleString('en-IN')}</div>
                    <div className="text-[7.5px] font-semibold mt-0.5">
                      {currentBalance >= 0 ? 'Company must pay worker' : 'Worker in excess advance debt'}
                    </div>
                  </div>

                </div>
              </div>

              {/* Statistics Panel */}
              <div className="bg-white rounded-[8px] p-3 border border-gray-300 shadow-sm space-y-2.5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-150 pb-1.5 flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#0a6ed1]" />
                  <span>Performance & Stats Index</span>
                </h3>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-gray-600">
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Sites Worked</span>
                    <strong className="text-gray-900 font-mono text-[11px]">{totalSitesWorked}</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Working Days</span>
                    <strong className="text-gray-900 font-mono text-[11px]">{totalWorkingDaysCount} days</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Avg Daily Wage</span>
                    <strong className="text-[#0a6ed1] font-mono text-[11px]">₹{avgDailyEarnings}/day</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Peak Earnings</span>
                    <strong className="text-green-700 font-mono text-[11px]">₹{highestMonthlyEarnings.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-200 col-span-2">
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Last Payment Disbursed</span>
                    <strong className="text-gray-900 font-mono text-[10px]">{lastPaymentDate}</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-200 col-span-2">
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Last Advance Loan Issued</span>
                    <strong className="text-gray-900 font-mono text-[10px]">{lastAdvanceDate}</strong>
                  </div>
                </div>
              </div>

              {/* Quick Actions (Modal triggers) */}
              {!isReadOnly && (
                <div className="bg-white rounded-[8px] p-3 border border-gray-300 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-150 pb-1.5 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#0a6ed1]" />
                    <span>Quick Ledger Operations</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button 
                      onClick={() => {
                        setEditingEntryId(null);
                        setLedgerForm({
                          date: new Date().toISOString().split('T')[0],
                          voucherNo: '',
                          description: 'Manual Advance Recovery',
                          type: 'Credit',
                          amount: '',
                          remarks: ''
                        });
                        setShowManualEntryModal(true);
                      }}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-[#0a6ed1] font-bold border border-blue-200 rounded flex items-center justify-center space-x-1 shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post Entry</span>
                    </button>
                    <button 
                      onClick={() => setShowHoldModal(true)}
                      className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-250 rounded flex items-center justify-center space-x-1 shadow-xs transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Hold Wages</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Wage Holds Register widget in Right Panel */}
              <div className="bg-white rounded-[8px] border border-gray-300 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-white px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-800" />
                    <span>Wage Holds Registry</span>
                  </span>
                  <span className="bg-amber-100 text-amber-900 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-200">
                    O/S Held: ₹{outstandingHeldVal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-2 space-y-1.5 max-h-[180px] overflow-y-auto bg-gray-50/50">
                  {workerHolds.filter(h => h.workerId === activeWorkerId).map(hold => {
                    const heldOS = hold.holdAmount - (hold.releasedAmount || 0);
                    const released = heldOS <= 0;
                    return (
                      <div key={hold.id} className="bg-white p-2 border border-gray-250 rounded shadow-xs text-[10px] text-gray-600 font-medium space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] font-bold text-[#0a6ed1]">HLD-{hold.id.substring(0,4).toUpperCase()}</span>
                          <span className={`text-[7.5px] font-bold px-1 rounded uppercase ${
                            released ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {hold.status}
                          </span>
                        </div>
                        <div className="flex justify-between font-mono text-[9.5px]">
                          <span>Held: ₹{hold.holdAmount}</span>
                          <span className="text-amber-800 font-bold">O/S: ₹{heldOS}</span>
                        </div>
                        {hold.remarks && <p className="text-[8.5px] text-gray-400 italic font-sans truncate" title={hold.remarks}>Reason: "{hold.remarks}"</p>}
                        {!released && !isReadOnly && (
                          <button 
                            onClick={() => {
                              setReleasingHoldId(hold.id);
                              setReleaseAmount(heldOS.toString());
                            }}
                            className="w-full mt-1.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded font-bold text-[8.5px] flex items-center justify-center space-x-0.5 transition"
                          >
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Authorize Hold Release</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {workerHolds.filter(h => h.workerId === activeWorkerId).length === 0 && (
                    <div className="p-4 text-center text-gray-400 italic text-[9.5px]">No active payment holds.</div>
                  )}
                </div>
              </div>

              {/* Tenury Chronicle Timeline */}
              <div className="bg-white rounded-[8px] p-3 border border-gray-300 shadow-sm space-y-2.5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-150 pb-1.5 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0a6ed1]" />
                  <span>Tenure Activity Timeline</span>
                </h3>

                <div className="relative pl-3.5 border-l border-gray-250 ml-1.5 space-y-3.5">
                  {tenureTimeline.map((e, idx) => (
                    <div key={idx} className="relative text-[10px]">
                      
                      {/* Timeline dot */}
                      <span className={`absolute -left-[19.5px] top-0.5 w-2 h-2 rounded-full border border-white ring-2 ${
                        e.type === 'joining' ? 'bg-green-600 ring-green-100' :
                        e.type === 'exit' ? 'bg-red-600 ring-red-100' :
                        e.type === 'advance' ? 'bg-amber-500 ring-amber-100' :
                        e.type === 'kharchi' ? 'bg-yellow-500 ring-yellow-100' :
                        e.type === 'transfer' ? 'bg-purple-500 ring-purple-100' :
                        'bg-[#0a6ed1] ring-blue-100'
                      }`} />

                      <div className="flex justify-between items-start">
                        <strong className="text-gray-800 font-bold leading-tight block">{e.title}</strong>
                        <span className="font-mono text-[8.5px] text-gray-400 font-semibold">{e.date}</span>
                      </div>
                      <p className="text-gray-500 text-[9px] mt-0.5 leading-snug">{e.description}</p>
                    </div>
                  ))}
                  {tenureTimeline.length === 0 && (
                    <div className="text-center text-gray-400 italic text-[9.5px]">No timeline events logged.</div>
                  )}
                </div>
              </div>

            </div>
          ) : null}

        </div>

      </div>

      {/* MODAL 1: Manual Ledger Entry Posting */}
      {showManualEntryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white border border-gray-300 shadow-xl w-full max-w-sm rounded-[8px]">
            <div className="bg-gray-150 p-3 rounded-t-[8px] border-b border-gray-200 flex items-center justify-between">
              <span className="font-bold uppercase text-[10.5px] text-[#0a6ed1] flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>{editingEntryId ? 'Modify Ledger Entry' : 'Post Manual Ledger Entry'}</span>
              </span>
              <button onClick={() => setShowManualEntryModal(false)} className="p-0.5 text-gray-400 hover:text-red-650 transition">
                <X size={14} />
              </button>
            </div>
            
            <form onSubmit={handleSaveManualEntry} className="p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col text-[10px]">
                  <label className="font-bold text-gray-500 mb-1">Date:</label>
                  <input 
                    type="date"
                    required
                    className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1] font-semibold"
                    value={ledgerForm.date}
                    onChange={e => setLedgerForm({...ledgerForm, date: e.target.value})}
                  />
                </div>
                <div className="flex flex-col text-[10px]">
                  <label className="font-bold text-gray-500 mb-1">Voucher ID (Optional):</label>
                  <input 
                    type="text"
                    placeholder="E.g. MAN-8491"
                    className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1] font-mono"
                    value={ledgerForm.voucherNo}
                    onChange={e => setLedgerForm({...ledgerForm, voucherNo: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-500 mb-1.5">Posting Category:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setLedgerForm({...ledgerForm, type: 'Debit', description: 'Manual Advance Given'})}
                    className={`p-1.5 border text-center font-bold text-[9.5px] rounded transition ${
                      ledgerForm.type === 'Debit' 
                        ? 'bg-red-50 text-red-800 border-red-500' 
                        : 'bg-white text-gray-650 border-gray-300'
                    }`}
                  >
                    Debit (Advance Given)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLedgerForm({...ledgerForm, type: 'Credit', description: 'Manual Advance Recovery'})}
                    className={`p-1.5 border text-center font-bold text-[9.5px] rounded transition ${
                      ledgerForm.type === 'Credit' 
                        ? 'bg-green-50 text-green-800 border-green-500' 
                        : 'bg-white text-gray-650 border-gray-300'
                    }`}
                  >
                    Credit (Repay / Recovery)
                  </button>
                </div>
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-500 mb-1">Amount (INR):</label>
                <input 
                  type="number"
                  required
                  step="any"
                  placeholder="₹ E.g. 5000"
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1] font-bold text-right"
                  value={ledgerForm.amount}
                  onChange={e => setLedgerForm({...ledgerForm, amount: e.target.value})}
                />
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-500 mb-1">Description Label:</label>
                <input 
                  type="text"
                  required
                  placeholder="E.g. Safety vest recovery adjustment"
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1] font-medium"
                  value={ledgerForm.description}
                  onChange={e => setLedgerForm({...ledgerForm, description: e.target.value})}
                />
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-500 mb-1">Audit Notes / Remarks:</label>
                <textarea 
                  rows={2}
                  placeholder="Provide audit reference notes..."
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1]"
                  value={ledgerForm.remarks}
                  onChange={e => setLedgerForm({...ledgerForm, remarks: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-150 text-[10px]">
                <button 
                  type="button" 
                  onClick={() => setShowManualEntryModal(false)} 
                  className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-[#0a6ed1] hover:bg-[#0056b3] text-white font-bold rounded shadow-xs flex items-center space-x-1"
                >
                  <Save size={11} />
                  <span>{editingEntryId ? 'Update Posting' : 'Post Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Execute Wage Holds */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white border border-gray-300 shadow-xl w-full max-w-sm rounded-[8px]">
            <div className="bg-amber-50 p-3 rounded-t-[8px] border-b border-amber-250 flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1 uppercase text-[10.5px] text-amber-900">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Place Wage Payment On Hold</span>
              </span>
              <button onClick={() => setShowHoldModal(false)} className="p-0.5 text-gray-400 hover:text-red-650 transition">
                <X size={14} />
              </button>
            </div>
            
            <form onSubmit={handleSaveHold} className="p-3.5 space-y-3.5">
              <div className="bg-amber-50/35 p-2.5 border border-dashed border-amber-300 rounded text-amber-950 text-[9.5px] leading-relaxed flex items-start space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>Wage holds flag a specific sum of this worker's net paycheck as restricted. They remain reserved and unavailable for payroll release until authorized by supervisors.</span>
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-600 mb-1">Hold Date:</label>
                <input 
                  type="date"
                  required
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1] font-semibold"
                  value={holdForm.date}
                  onChange={e => setHoldForm({...holdForm, date: e.target.value})}
                />
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-600 mb-1">Hold Amount (INR):</label>
                <input 
                  type="number"
                  required
                  step="any"
                  placeholder="₹ E.g. 10000"
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1] font-bold text-amber-900 text-right"
                  value={holdForm.amount}
                  onChange={e => setHoldForm({...holdForm, amount: e.target.value})}
                />
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-600 mb-1">Deduction Reason / Description:</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Provide explicit reasons for paycheck restriction..."
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1]"
                  value={holdForm.remarks}
                  onChange={e => setHoldForm({...holdForm, remarks: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-150 text-[10px]">
                <button 
                  type="button" 
                  onClick={() => setShowHoldModal(false)} 
                  className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs flex items-center space-x-1"
                >
                  <Lock size={11} />
                  <span>Execute Wage Hold</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Release Wage Holds Authorization */}
      {releasingHoldId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white border border-gray-300 shadow-xl w-full max-w-sm rounded-[8px]">
            <div className="bg-green-50 p-3 rounded-t-[8px] border-b border-green-250 flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1 uppercase text-[10.5px] text-green-900">
                <Unlock className="w-3.5 h-3.5 text-green-700" />
                <span>Confirm Wage Release Authorization</span>
              </span>
              <button onClick={() => setReleasingHoldId(null)} className="p-0.5 text-gray-400 hover:text-red-650 transition">
                <X size={14} />
              </button>
            </div>
            
            <form onSubmit={handleReleaseHold} className="p-3.5 space-y-3.5">
              <div className="bg-green-50/35 p-2.5 border border-dashed border-green-300 rounded text-green-950 text-[9.5px] leading-relaxed flex items-start space-x-1.5">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span>Authorizing a hold release transfers the selected sum back to active credits inside the chronological transaction ledger.</span>
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-600 mb-1">Amount to Release (INR):</label>
                <input 
                  type="number"
                  required
                  step="any"
                  placeholder="₹ E.g. 5000"
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1] font-bold text-green-800 text-right"
                  value={releaseAmount}
                  onChange={e => setReleaseAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col text-[10px]">
                <label className="font-bold text-gray-600 mb-1">Remarks & Release Context:</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="E.g. Rectified documentation, approved release"
                  className="bg-white border border-gray-300 rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-[#0a6ed1]"
                  value={releaseRemarks}
                  onChange={e => setReleaseRemarks(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-150 text-[10px]">
                <button 
                  type="button" 
                  onClick={() => setReleasingHoldId(null)} 
                  className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow-xs flex items-center space-x-1"
                >
                  <Unlock size={11} />
                  <span>Authorize Cash Release</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
