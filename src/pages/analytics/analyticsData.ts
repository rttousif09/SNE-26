import { 
  Project, Worker, Billing, ClientPayment, ExpenseEntry, WorkerPayment, 
  DailyLabourReport, Attendance, FloorAbstract, BOQ, Subcontractor, 
  SubcontractorBill, SubcontractorPayment, TrackedBill
} from '../../types';
import { AnalyticsFilterState, matchesDateFilters, isDateInFY } from './analyticsTypes';

export interface FilteredAnalyticsData {
  kpis: {
    totalWorkAmount: number;
    totalBillingAmount: number;
    totalAmountReceived: number;
    totalExpenses: number;
    totalWorkerPayments: number;
    totalSubcontractorPayments: number;
    outstanding: number;
    activeProjectsCount: number;
    activeWorkersCount: number;
  };
  
  // 1. Financial Overview
  incomeVsExpense: {
    month: string;
    clientReceived: number;
    workerPayments: number;
    subcontractorPayments: number;
    expenses: number;
    netCashflow: number;
  }[];

  // 2. Billing Analytics
  monthlyBillingTrend: {
    month: string;
    workAmount: number;
    billingAmount: number;
    gst: number;
    tds: number;
    retention: number;
  }[];
  projectWiseBilling: {
    projectId: string;
    projectName: string;
    clientName: string;
    billingAmount: number;
    workAmount: number;
  }[];
  billStatusDistribution: {
    name: string;
    value: number;
    color: string;
  }[];

  // 3. Client Collection Analytics
  billingVsCollection: {
    month: string;
    totalBilling: number;
    amountReceived: number;
    outstanding: number;
  }[];
  clientOutstanding: {
    clientName: string;
    totalBilling: number;
    amountReceived: number;
    outstanding: number;
  }[];
  collectionTrend: {
    month: string;
    amountReceived: number;
  }[];

  // 4. Expense Analytics
  monthlyExpenseTrend: {
    month: string;
    totalExpense: number;
  }[];
  expenseCategoryDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
  projectWiseExpenses: {
    projectId: string;
    projectName: string;
    totalExpense: number;
  }[];

  // 5. Worker Analytics
  workerStatusDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
  workerStrengthTrend: {
    month: string;
    workerCount: number;
  }[];
  workerPaymentTrend: {
    month: string;
    totalPayment: number;
    messDeduction: number;
    advanceDeduction: number;
    kharchiDeduction: number;
  }[];
  topPaidWorkers: {
    workerId: string;
    workerName: string;
    designation: string;
    totalPaid: number;
  }[];

  // 6. Attendance Analytics
  attendanceTrend: {
    dateOrMonth: string;
    present: number;
    absent: number;
    leave: number;
    halfDay: number;
  }[];
  overtimeAnalysis: {
    month: string;
    overtimeHours: number;
  }[];
  projectAttendance: {
    projectName: string;
    presentCount: number;
  }[];

  // 7. Floor Abstract Analytics
  floorProgress: {
    totalFlats: number;
    completedFlats: number;
    pendingFlats: number;
    percentage: number;
  };
  hajiraByFloor: {
    level: string;
    totalHajira: number;
  }[];
  payableAmountByFloor: {
    level: string;
    payableAmount: number;
  }[];
  floorAbstractRaw: FloorAbstract[];

  // 8. Subcontractor Analytics
  subcontractorBillingVsPayment: {
    subcontractorId: string;
    subcontractorName: string;
    contractValue: number;
    totalBills: number;
    totalPayments: number;
    outstanding: number;
  }[];
  subcontractorOutstandingList: {
    subcontractorName: string;
    firmName: string;
    outstanding: number;
  }[];
  monthlySubcontractorPayments: {
    month: string;
    amount: number;
  }[];

  // 9. BOQ & Project Progress Analytics
  boqVsExecuted: {
    itemCode: string;
    description: string;
    boqQty: number;
    executedQty: number;
    remainingQty: number;
    unit: string;
  }[];
  boqVsBillingSummary: {
    boqAmount: number;
    executedAmount: number;
    billedAmount: number;
  };
  projectProgressList: {
    projectId: string;
    projectName: string;
    progressPercentage: number;
    budget: number;
    billed: number;
    received: number;
  }[];

  // Underlying transaction records matching filters for table view and drilldown
  filteredRecords: {
    billings: Billing[];
    clientPayments: ClientPayment[];
    expenses: ExpenseEntry[];
    workerPayments: WorkerPayment[];
    subcontractorBills: SubcontractorBill[];
    subcontractorPayments: SubcontractorPayment[];
  };
}

export function computeAnalyticsData(
  filters: AnalyticsFilterState,
  raw: {
    projects: Project[];
    workers: Worker[];
    billings: Billing[];
    clientPayments: ClientPayment[];
    expensesLedger: ExpenseEntry[];
    workerPayments: WorkerPayment[];
    dlrs: DailyLabourReport[];
    attendance: Attendance[];
    floorAbstracts: FloorAbstract[];
    boqs: BOQ[];
    subcontractors: Subcontractor[];
    subcontractorBills: SubcontractorBill[];
    subcontractorPayments: SubcontractorPayment[];
    trackedBills?: TrackedBill[];
  }
): FilteredAnalyticsData {
  const {
    projects = [],
    workers = [],
    billings = [],
    clientPayments = [],
    expensesLedger = [],
    workerPayments = [],
    dlrs = [],
    attendance = [],
    floorAbstracts = [],
    boqs = [],
    subcontractors = [],
    subcontractorBills = [],
    subcontractorPayments = [],
    trackedBills = []
  } = raw;

  // Project map & Client map
  const projectMap = new Map<string, Project>();
  projects.forEach(p => projectMap.set(p.id, p));

  const workerMap = new Map<string, Worker>();
  workers.forEach(w => workerMap.set(w.id, w));

  const subMap = new Map<string, Subcontractor>();
  subcontractors.forEach(s => subMap.set(s.id, s));

  // 1. Filter Projects based on selected project/client
  const eligibleProjects = projects.filter(p => {
    if (filters.projectId !== 'All' && p.id !== filters.projectId) return false;
    if (filters.clientId !== 'All' && (p.clientName || 'General Client') !== filters.clientId) return false;
    return true;
  });
  const eligibleProjectIds = new Set(eligibleProjects.map(p => p.id));

  // Helper filter check for project/client eligibility
  const isProjectMatch = (projId?: string) => {
    if (filters.projectId === 'All' && filters.clientId === 'All') return true;
    if (!projId) return filters.projectId === 'All' && filters.clientId === 'All';
    return eligibleProjectIds.has(projId);
  };

  // 2. Filter Billings
  const filteredBillings = billings.filter(b => {
    if (!isProjectMatch(b.projectId)) return false;
    const date = b.certifyDate || (b.month ? `${b.month}-01` : '');
    return matchesDateFilters(date, filters);
  });

  // 3. Filter Client Payments
  const filteredClientPayments = clientPayments.filter(cp => {
    if (!isProjectMatch(cp.projectId)) return false;
    return matchesDateFilters(cp.date, filters);
  });

  // 4. Filter Expenses
  const filteredExpenses = expensesLedger.filter(e => {
    if (!isProjectMatch(e.projectId)) return false;
    return matchesDateFilters(e.date, filters);
  });

  // 5. Filter Worker Payments
  const filteredWorkerPayments = workerPayments.filter(wp => {
    if (!isProjectMatch(wp.projectId)) return false;
    if (filters.workerId !== 'All' && wp.workerId !== filters.workerId) return false;
    const date = wp.date || (wp.month ? `${wp.month}-01` : '');
    return matchesDateFilters(date, filters);
  });

  // 6. Filter Subcontractor Bills & Payments
  const filteredSubBills = subcontractorBills.filter(sb => {
    if (!isProjectMatch(sb.projectId)) return false;
    if (filters.subcontractorId !== 'All' && sb.subcontractorId !== filters.subcontractorId) return false;
    return matchesDateFilters(sb.billDate, filters);
  });

  const filteredSubPayments = subcontractorPayments.filter(sp => {
    if (!isProjectMatch(sp.projectId)) return false;
    if (filters.subcontractorId !== 'All' && sp.subcontractorId !== filters.subcontractorId) return false;
    return matchesDateFilters(sp.date, filters);
  });

  // 7. Filter Attendance & DLR
  const filteredAttendance = attendance.filter(a => {
    if (!isProjectMatch(a.projectId)) return false;
    if (filters.workerId !== 'All' && a.workerId !== filters.workerId) return false;
    return matchesDateFilters(a.date, filters);
  });

  const filteredDlrs = dlrs.filter(d => {
    if (!isProjectMatch(d.projectId)) return false;
    return matchesDateFilters(d.date, filters);
  });

  // 8. Filter Floor Abstracts
  const filteredFloorAbstracts = floorAbstracts.filter(fa => {
    return isProjectMatch(fa.projectId);
  });

  // 9. Filter BOQs
  const filteredBoqs = boqs.filter(b => {
    if (!isProjectMatch(b.projectId)) return false;
    if (filters.clientId !== 'All' && (b.clientName || '') !== filters.clientId) return false;
    return matchesDateFilters(b.date, filters);
  });

  // --- Compute Totals and KPIs ---
  let totalWorkAmount = 0;
  let totalBillingAmount = 0;
  filteredBillings.forEach(b => {
    const workAmt = b.amount || 0;
    const net = workAmt - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
    totalWorkAmount += workAmt;
    totalBillingAmount += net;
  });

  const totalAmountReceived = filteredClientPayments.reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);

  let totalExpenses = 0;
  filteredExpenses.forEach(e => {
    const sum = (e.kharchi || 0) + (e.mess || 0) + (e.workerAdvance || 0) + (e.tiffin || 0) +
      (e.travel || 0) + (e.machineryMaterial || 0) + (e.workerPayment || 0) + (e.stationery || 0) + (e.others || 0);
    totalExpenses += sum;
  });

  const totalWorkerPayments = filteredWorkerPayments.reduce((sum, wp) => sum + (wp.netPayment || wp.workAmount || 0), 0);
  const totalSubcontractorPayments = filteredSubPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0);

  // Client Balance Rule: Balance Amount = Total Billing Amount - Total Amount Received
  const outstanding = Math.max(0, totalBillingAmount - totalAmountReceived);

  const activeProjectsCount = eligibleProjects.filter(p => !p.status || p.status === 'Ongoing').length;
  const activeWorkersCount = workers.filter(w => !w.exitDate && (filters.workerId === 'All' || w.id === filters.workerId)).length;

  // --- Aggregation by Month for Monthly Trends ---
  // Helper to extract YYYY-MM
  const extractMonth = (dStr?: string): string => {
    if (!dStr) return '';
    return dStr.substring(0, 7);
  };

  const allMonthsSet = new Set<string>();

  filteredBillings.forEach(b => {
    const m = b.month || extractMonth(b.certifyDate);
    if (m) allMonthsSet.add(m);
  });
  filteredClientPayments.forEach(cp => {
    const m = extractMonth(cp.date);
    if (m) allMonthsSet.add(m);
  });
  filteredExpenses.forEach(e => {
    const m = extractMonth(e.date);
    if (m) allMonthsSet.add(m);
  });
  filteredWorkerPayments.forEach(wp => {
    const m = wp.month || extractMonth(wp.date);
    if (m) allMonthsSet.add(m);
  });
  filteredSubPayments.forEach(sp => {
    const m = extractMonth(sp.date);
    if (m) allMonthsSet.add(m);
  });

  // If no months found from transactions, provide past 6 months as default keys if empty
  if (allMonthsSet.size === 0) {
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      allMonthsSet.add(d.toISOString().substring(0, 7));
    }
  }

  const sortedMonths = Array.from(allMonthsSet).sort();

  // 1. Income vs Expense
  const incomeVsExpense = sortedMonths.map(m => {
    const clientReceived = filteredClientPayments
      .filter(cp => extractMonth(cp.date) === m)
      .reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);

    const workerPmts = filteredWorkerPayments
      .filter(wp => (wp.month === m || extractMonth(wp.date) === m))
      .reduce((sum, wp) => sum + (wp.netPayment || wp.workAmount || 0), 0);

    const subPmts = filteredSubPayments
      .filter(sp => extractMonth(sp.date) === m)
      .reduce((sum, sp) => sum + (sp.amount || 0), 0);

    const exps = filteredExpenses
      .filter(e => extractMonth(e.date) === m)
      .reduce((sum, e) => {
        return sum + (e.kharchi || 0) + (e.mess || 0) + (e.workerAdvance || 0) + (e.tiffin || 0) +
          (e.travel || 0) + (e.machineryMaterial || 0) + (e.workerPayment || 0) + (e.stationery || 0) + (e.others || 0);
      }, 0);

    return {
      month: m,
      clientReceived,
      workerPayments: workerPmts,
      subcontractorPayments: subPmts,
      expenses: exps,
      netCashflow: clientReceived - (workerPmts + subPmts + exps)
    };
  });

  // 2. Monthly Billing Trend
  const monthlyBillingTrend = sortedMonths.map(m => {
    let workAmount = 0;
    let billingAmount = 0;
    let gst = 0;
    let tds = 0;
    let retention = 0;

    filteredBillings
      .filter(b => b.month === m || extractMonth(b.certifyDate) === m)
      .forEach(b => {
        workAmount += b.amount || 0;
        gst += b.gst || 0;
        tds += b.tds || 0;
        retention += b.retention || 0;
        const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
        billingAmount += net;
      });

    return {
      month: m,
      workAmount,
      billingAmount,
      gst,
      tds,
      retention
    };
  });

  // Project-wise Billing
  const projectBillingMap = new Map<string, { billing: number; work: number }>();
  filteredBillings.forEach(b => {
    const cur = projectBillingMap.get(b.projectId) || { billing: 0, work: 0 };
    const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
    cur.billing += net;
    cur.work += (b.amount || 0);
    projectBillingMap.set(b.projectId, cur);
  });

  const projectWiseBilling = Array.from(projectBillingMap.entries()).map(([pId, val]) => {
    const proj = projectMap.get(pId);
    return {
      projectId: pId,
      projectName: proj?.name || `Project #${pId}`,
      clientName: proj?.clientName || 'General Client',
      billingAmount: val.billing,
      workAmount: val.work
    };
  }).sort((a, b) => b.billingAmount - a.billingAmount);

  // Bill Status Distribution (combining trackedBills and billings)
  const statusCounts: Record<string, number> = {
    'Draft': 0,
    'Pending Approval': 0,
    'Approved': 0,
    'Posted': 0,
    'Paid': 0,
    'Outstanding': 0
  };

  if (trackedBills.length > 0) {
    trackedBills.forEach(tb => {
      if (!isProjectMatch(tb.projectId)) return;
      if (tb.currentStatus === 'Draft') statusCounts['Draft']++;
      else if (tb.currentStatus === 'Submitted' || tb.currentStatus === 'Under Review') statusCounts['Pending Approval']++;
      else if (tb.currentStatus === 'Certified') statusCounts['Approved']++;
      else if (tb.currentStatus === 'Fully Paid') statusCounts['Paid']++;
      else if (tb.currentStatus === 'Partially Paid' || tb.currentStatus === 'Payment Expected') statusCounts['Outstanding']++;
      else statusCounts['Posted']++;
    });
  } else {
    // If no tracked bills, derive from billing status flags
    filteredBillings.forEach(b => {
      if (b.retentionStatus === 'Pending' || b.holdStatus === 'Pending') {
        statusCounts['Pending Approval']++;
      } else {
        statusCounts['Approved']++;
      }
    });
  }

  const billStatusColors: Record<string, string> = {
    'Draft': '#94a3b8',
    'Pending Approval': '#f59e0b',
    'Approved': '#0056b3',
    'Posted': '#6366f1',
    'Paid': '#10b981',
    'Outstanding': '#ef4444'
  };

  const billStatusDistribution = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: billStatusColors[name] || '#0056b3'
    }));

  // 3. Client Collection Analytics
  const billingVsCollection = sortedMonths.map(m => {
    const totalBilling = filteredBillings
      .filter(b => b.month === m || extractMonth(b.certifyDate) === m)
      .reduce((sum, b) => {
        const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
        return sum + net;
      }, 0);

    const amountReceived = filteredClientPayments
      .filter(cp => extractMonth(cp.date) === m)
      .reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);

    return {
      month: m,
      totalBilling,
      amountReceived,
      outstanding: Math.max(0, totalBilling - amountReceived)
    };
  });

  // Client Outstanding: Group by Client Name
  // Rule: Balance Amount = Total Billing Amount - Total Amount Received for that client
  const clientDataMap = new Map<string, { billing: number; received: number }>();

  // Process all projects and their clients
  projects.forEach(p => {
    if (!isProjectMatch(p.id)) return;
    const clientName = p.clientName || 'General Client';
    if (!clientDataMap.has(clientName)) {
      clientDataMap.set(clientName, { billing: 0, received: 0 });
    }
  });

  filteredBillings.forEach(b => {
    const proj = projectMap.get(b.projectId);
    const clientName = proj?.clientName || 'General Client';
    const cur = clientDataMap.get(clientName) || { billing: 0, received: 0 };
    const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
    cur.billing += net;
    clientDataMap.set(clientName, cur);
  });

  filteredClientPayments.forEach(cp => {
    const proj = projectMap.get(cp.projectId);
    const clientName = proj?.clientName || 'General Client';
    const cur = clientDataMap.get(clientName) || { billing: 0, received: 0 };
    cur.received += (cp.amountReceived || 0);
    clientDataMap.set(clientName, cur);
  });

  const clientOutstanding = Array.from(clientDataMap.entries()).map(([cName, data]) => {
    return {
      clientName: cName,
      totalBilling: data.billing,
      amountReceived: data.received,
      outstanding: Math.max(0, data.billing - data.received)
    };
  }).filter(c => c.totalBilling > 0 || c.amountReceived > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const collectionTrend = sortedMonths.map(m => {
    const amountReceived = filteredClientPayments
      .filter(cp => extractMonth(cp.date) === m)
      .reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);
    return { month: m, amountReceived };
  });

  // 4. Expense Analytics
  const monthlyExpenseTrend = sortedMonths.map(m => {
    const totalExpense = filteredExpenses
      .filter(e => extractMonth(e.date) === m)
      .reduce((sum, e) => {
        return sum + (e.kharchi || 0) + (e.mess || 0) + (e.workerAdvance || 0) + (e.tiffin || 0) +
          (e.travel || 0) + (e.machineryMaterial || 0) + (e.workerPayment || 0) + (e.stationery || 0) + (e.others || 0);
      }, 0);
    return { month: m, totalExpense };
  });

  // Categories in expenses
  let expLabourWelfare = 0; // kharchi + mess + workerAdvance
  let expTravel = 0; // travel
  let expFood = 0; // tiffin
  let expTools = 0; // machineryMaterial
  let expAccommodation = 0; // stationery/office
  let expConsumables = 0;
  let expOther = 0;

  filteredExpenses.forEach(e => {
    expLabourWelfare += (e.kharchi || 0) + (e.mess || 0) + (e.workerAdvance || 0);
    expTravel += (e.travel || 0);
    expFood += (e.tiffin || 0);
    expTools += (e.machineryMaterial || 0);
    expAccommodation += (e.stationery || 0);
    expOther += (e.others || 0) + (e.workerPayment || 0);
  });

  const expenseCategoryColors: Record<string, string> = {
    'Labour Welfare': '#0284c7',
    'Accommodation': '#0d9488',
    'Travel': '#f59e0b',
    'Fuel': '#e11d48',
    'Food': '#8b5cf6',
    'Tools': '#475569',
    'Consumables': '#d97706',
    'Other': '#64748b'
  };

  const expenseCategories = [
    { name: 'Labour Welfare', value: expLabourWelfare },
    { name: 'Travel', value: expTravel },
    { name: 'Food', value: expFood },
    { name: 'Tools & Machinery', value: expTools },
    { name: 'Office & Accommodation', value: expAccommodation },
    { name: 'Other Expenditures', value: expOther }
  ].filter(c => c.value > 0).map(c => ({
    name: c.name,
    value: c.value,
    color: expenseCategoryColors[c.name] || '#0056b3'
  }));

  const projectExpenseMap = new Map<string, number>();
  filteredExpenses.forEach(e => {
    const pId = e.projectId || 'General';
    const sum = (e.kharchi || 0) + (e.mess || 0) + (e.workerAdvance || 0) + (e.tiffin || 0) +
      (e.travel || 0) + (e.machineryMaterial || 0) + (e.workerPayment || 0) + (e.stationery || 0) + (e.others || 0);
    projectExpenseMap.set(pId, (projectExpenseMap.get(pId) || 0) + sum);
  });

  const projectWiseExpenses = Array.from(projectExpenseMap.entries()).map(([pId, totalExpense]) => {
    const proj = projectMap.get(pId);
    return {
      projectId: pId,
      projectName: proj?.name || (pId === 'General' ? 'Head Office / General' : `Project #${pId}`),
      totalExpense
    };
  }).sort((a, b) => b.totalExpense - a.totalExpense);

  // 5. Worker Analytics
  const workerStatusMap: Record<string, number> = {
    'Active': 0,
    'On Leave': 0,
    'Returned': 0,
    'Transferred': 0,
    'Left Job': 0
  };

  workers.forEach(w => {
    if (filters.workerId !== 'All' && w.id !== filters.workerId) return;
    if (w.exitDate) {
      workerStatusMap['Left Job']++;
    } else {
      workerStatusMap['Active']++;
    }
  });

  const workerStatusColors: Record<string, string> = {
    'Active': '#10b981',
    'On Leave': '#f59e0b',
    'Returned': '#3b82f6',
    'Transferred': '#8b5cf6',
    'Left Job': '#ef4444'
  };

  const workerStatusDistribution = Object.entries(workerStatusMap)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: workerStatusColors[name] || '#0056b3'
    }));

  const workerStrengthTrend = sortedMonths.map(m => {
    // Active workers in that month
    const count = workers.filter(w => {
      const joinMonth = extractMonth(w.joiningDate);
      const exitMonth = extractMonth(w.exitDate);
      if (joinMonth && joinMonth > m) return false;
      if (exitMonth && exitMonth < m) return false;
      return true;
    }).length;
    return { month: m, workerCount: count || activeWorkersCount };
  });

  const workerPaymentTrend = sortedMonths.map(m => {
    let totalPayment = 0;
    let messDeduction = 0;
    let advanceDeduction = 0;
    let kharchiDeduction = 0;

    filteredWorkerPayments
      .filter(wp => wp.month === m || extractMonth(wp.date) === m)
      .forEach(wp => {
        totalPayment += (wp.netPayment || wp.workAmount || 0);
        messDeduction += (wp.messDeduction || 0);
        advanceDeduction += (wp.advanceDeduction || 0);
        kharchiDeduction += (wp.kharchiDeduction || 0);
      });

    return {
      month: m,
      totalPayment,
      messDeduction,
      advanceDeduction,
      kharchiDeduction
    };
  });

  // Top Paid Workers
  const workerPaidTotals = new Map<string, number>();
  filteredWorkerPayments.forEach(wp => {
    const cur = workerPaidTotals.get(wp.workerId) || 0;
    workerPaidTotals.set(wp.workerId, cur + (wp.netPayment || wp.workAmount || 0));
  });

  const topPaidWorkers = Array.from(workerPaidTotals.entries()).map(([wId, totalPaid]) => {
    const w = workerMap.get(wId);
    return {
      workerId: w?.workerId || wId,
      workerName: w?.name || `Worker #${wId}`,
      designation: w?.designation || 'Worker',
      totalPaid
    };
  }).sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 10);

  // 6. Attendance Analytics
  const attendanceMap = new Map<string, { present: number; absent: number; leave: number; halfDay: number }>();
  filteredAttendance.forEach(a => {
    const key = extractMonth(a.date) || a.date;
    const cur = attendanceMap.get(key) || { present: 0, absent: 0, leave: 0, halfDay: 0 };
    if (a.status === 'Present') cur.present++;
    else if (a.status === 'Absent') cur.absent++;
    else if (a.status === 'Leave') cur.leave++;
    else if (a.status === 'HalfDay') cur.halfDay++;
    attendanceMap.set(key, cur);
  });

  // If no detailed attendance logs, synthesize from DLR
  if (attendanceMap.size === 0 && filteredDlrs.length > 0) {
    filteredDlrs.forEach(d => {
      const key = extractMonth(d.date) || d.date;
      const cur = attendanceMap.get(key) || { present: 0, absent: 0, leave: 0, halfDay: 0 };
      const totalWorkers = (d.carpenter || 0) + (d.fitter || 0) + (d.helper || 0) + (d.mason || 0) + (d.rigger || 0) + (d.staff || 0);
      cur.present += totalWorkers;
      attendanceMap.set(key, cur);
    });
  }

  const attendanceTrend = Array.from(attendanceMap.entries()).map(([dateOrMonth, counts]) => ({
    dateOrMonth,
    ...counts
  })).sort((a, b) => a.dateOrMonth.localeCompare(b.dateOrMonth));

  const overtimeAnalysis = sortedMonths.map(m => {
    const totalOT = filteredWorkerPayments
      .filter(wp => wp.month === m || extractMonth(wp.date) === m)
      .reduce((sum, wp) => sum + (wp.overtimeHours || 0), 0);
    return { month: m, overtimeHours: totalOT };
  });

  const projectAttendanceMap = new Map<string, number>();
  filteredAttendance.forEach(a => {
    if (a.status === 'Present' || a.status === 'HalfDay') {
      projectAttendanceMap.set(a.projectId, (projectAttendanceMap.get(a.projectId) || 0) + 1);
    }
  });
  if (projectAttendanceMap.size === 0) {
    filteredDlrs.forEach(d => {
      const sum = (d.carpenter || 0) + (d.fitter || 0) + (d.helper || 0) + (d.mason || 0) + (d.rigger || 0) + (d.staff || 0);
      projectAttendanceMap.set(d.projectId, (projectAttendanceMap.get(d.projectId) || 0) + sum);
    });
  }

  const projectAttendance = Array.from(projectAttendanceMap.entries()).map(([pId, count]) => {
    const proj = projectMap.get(pId);
    return {
      projectName: proj?.name || `Project #${pId}`,
      presentCount: count
    };
  }).sort((a, b) => b.presentCount - a.presentCount);

  // 7. Floor Abstract Analytics
  let totalFlats = 0;
  let completedFlats = 0;
  const hajiraByFloorMap = new Map<string, number>();
  const payableByFloorMap = new Map<string, number>();

  filteredFloorAbstracts.forEach(fa => {
    totalFlats++;
    const levelKey = fa.level || 'Ground / L1';
    const flatHajira = fa.totalHajira || fa.flatHajira || (fa.workers?.reduce((s, w) => s + (w.workerHajira || w.hajiraPerWorker || 0), 0) || 0);
    const flatAmount = fa.amount || (fa.workers?.reduce((s, w) => s + (w.payableAmount || 0), 0) || 0);

    if (flatHajira > 0 || flatAmount > 0) completedFlats++;

    hajiraByFloorMap.set(levelKey, (hajiraByFloorMap.get(levelKey) || 0) + flatHajira);
    payableByFloorMap.set(levelKey, (payableByFloorMap.get(levelKey) || 0) + flatAmount);
  });

  const floorProgress = {
    totalFlats: Math.max(totalFlats, completedFlats),
    completedFlats,
    pendingFlats: Math.max(0, totalFlats - completedFlats),
    percentage: totalFlats > 0 ? Math.round((completedFlats / totalFlats) * 100) : (completedFlats > 0 ? 100 : 0)
  };

  const hajiraByFloor = Array.from(hajiraByFloorMap.entries()).map(([level, totalHajira]) => ({
    level,
    totalHajira
  }));

  const payableAmountByFloor = Array.from(payableByFloorMap.entries()).map(([level, payableAmount]) => ({
    level,
    payableAmount
  }));

  // 8. Subcontractor Analytics
  const subBillingVsPayment = subcontractors.map(s => {
    if (filters.subcontractorId !== 'All' && s.id !== filters.subcontractorId) return null;
    const subBills = filteredSubBills.filter(b => b.subcontractorId === s.id);
    const subPmts = filteredSubPayments.filter(p => p.subcontractorId === s.id);

    const totalBills = subBills.reduce((acc, b) => acc + (b.grossAmount || 0) + (b.gstAmount || 0), 0);
    const totalPayments = subPmts.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalDeductions = subBills.reduce((acc, b) => acc + (b.retentionAmount || 0) + (b.tdsAmount || 0) + (b.recoveryAmount || 0), 0);
    const outstanding = Math.max(0, totalBills - (totalDeductions + totalPayments));

    return {
      subcontractorId: s.id,
      subcontractorName: s.name,
      contractValue: totalBills * 1.2, // estimated or sum
      totalBills,
      totalPayments,
      outstanding
    };
  }).filter(Boolean) as {
    subcontractorId: string;
    subcontractorName: string;
    contractValue: number;
    totalBills: number;
    totalPayments: number;
    outstanding: number;
  }[];

  const subcontractorOutstandingList = subcontractors.map(s => {
    const subBills = filteredSubBills.filter(b => b.subcontractorId === s.id);
    const subPmts = filteredSubPayments.filter(p => p.subcontractorId === s.id);
    const totalBills = subBills.reduce((acc, b) => acc + (b.grossAmount || 0) + (b.gstAmount || 0), 0);
    const totalPayments = subPmts.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalDeductions = subBills.reduce((acc, b) => acc + (b.retentionAmount || 0) + (b.tdsAmount || 0) + (b.recoveryAmount || 0), 0);
    const outstanding = Math.max(0, totalBills - (totalDeductions + totalPayments));

    return {
      subcontractorName: s.name,
      firmName: s.firmName || s.name,
      outstanding
    };
  }).filter(s => s.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);

  const monthlySubcontractorPayments = sortedMonths.map(m => {
    const amount = filteredSubPayments
      .filter(p => extractMonth(p.date) === m)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return { month: m, amount };
  });

  // 9. BOQ & Project Progress Analytics
  const boqVsExecuted: {
    itemCode: string;
    description: string;
    boqQty: number;
    executedQty: number;
    remainingQty: number;
    unit: string;
  }[] = [];

  let totalBoqAmount = 0;
  let totalExecutedAmount = 0;
  let totalBilledAmount = totalBillingAmount;

  filteredBoqs.forEach(boq => {
    (boq.items || []).forEach(item => {
      const boqQty = item.boqQuantity || 0;
      const executedQty = item.executedQuantity || 0;
      const remainingQty = Math.max(0, boqQty - executedQty);
      const boqAmt = item.boqAmount || (boqQty * (item.boqRate || 0));
      const execAmt = executedQty * (item.boqRate || 0);

      totalBoqAmount += boqAmt;
      totalExecutedAmount += execAmt;

      boqVsExecuted.push({
        itemCode: item.itemCode || `#${boqVsExecuted.length + 1}`,
        description: item.description || 'BOQ Item',
        boqQty,
        executedQty,
        remainingQty,
        unit: item.unit || 'nos'
      });
    });
  });

  const projectProgressList = eligibleProjects.map(p => {
    const pBillings = filteredBillings.filter(b => b.projectId === p.id);
    const pPayments = filteredClientPayments.filter(cp => cp.projectId === p.id);

    const billed = pBillings.reduce((sum, b) => {
      const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
      return sum + net;
    }, 0);
    const received = pPayments.reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);

    const budget = p.budget || (billed > 0 ? billed * 1.3 : 1000000);
    const progressPercentage = budget > 0 ? Math.min(100, Math.round((billed / budget) * 100)) : 0;

    return {
      projectId: p.id,
      projectName: p.name,
      progressPercentage,
      budget,
      billed,
      received
    };
  }).sort((a, b) => b.progressPercentage - a.progressPercentage);

  return {
    kpis: {
      totalWorkAmount,
      totalBillingAmount,
      totalAmountReceived,
      totalExpenses,
      totalWorkerPayments,
      totalSubcontractorPayments,
      outstanding,
      activeProjectsCount,
      activeWorkersCount
    },
    incomeVsExpense,
    monthlyBillingTrend,
    projectWiseBilling,
    billStatusDistribution,
    billingVsCollection,
    clientOutstanding,
    collectionTrend,
    monthlyExpenseTrend,
    expenseCategoryDistribution: expenseCategories,
    projectWiseExpenses,
    workerStatusDistribution,
    workerStrengthTrend,
    workerPaymentTrend,
    topPaidWorkers,
    attendanceTrend,
    overtimeAnalysis,
    projectAttendance,
    floorProgress,
    hajiraByFloor,
    payableAmountByFloor,
    floorAbstractRaw: filteredFloorAbstracts,
    subcontractorBillingVsPayment: subBillingVsPayment,
    subcontractorOutstandingList,
    monthlySubcontractorPayments,
    boqVsExecuted: boqVsExecuted.slice(0, 15),
    boqVsBillingSummary: {
      boqAmount: totalBoqAmount,
      executedAmount: totalExecutedAmount,
      billedAmount: totalBilledAmount
    },
    projectProgressList,
    filteredRecords: {
      billings: filteredBillings,
      clientPayments: filteredClientPayments,
      expenses: filteredExpenses,
      workerPayments: filteredWorkerPayments,
      subcontractorBills: filteredSubBills,
      subcontractorPayments: filteredSubPayments
    }
  };
}
