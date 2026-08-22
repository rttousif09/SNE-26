import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Users, Receipt, CreditCard, TrendingUp, TrendingDown, 
  BarChart3, PieChart, Layers, Calendar, Filter, RefreshCw, Printer, 
  Download, Maximize2, Minimize2, ChevronRight, CheckCircle2, 
  AlertCircle, DollarSign, Activity, FileSpreadsheet, FileText, 
  Briefcase, HardHat, Shield, Search, ArrowUpRight, ArrowDownRight,
  Info, Eye, Sparkles, SlidersHorizontal, UserCheck, X
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, 
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import { useAppContext } from '../../store';
import { SAPSelect } from '../../components/SAPSelect';
import { 
  AnalyticsFilterState, DEFAULT_ANALYTICS_FILTERS, 
  formatINR, formatCompactINR 
} from './analyticsTypes';
import { computeAnalyticsData, FilteredAnalyticsData } from './analyticsData';
import { AnalyticsDrillDownModal, DrillDownData } from './AnalyticsDrillDownModal';
import { 
  exportAnalyticsPDF, exportAnalyticsExcel, printAnalyticsReport, 
  ExportReportHeaderMeta 
} from './analyticsExport';

export interface AnalyticsReportsProps {
  initialReportType?: string;
  initialProjectId?: string;
  onNavigate?: (tab: string, title?: string, props?: any) => void;
}

export const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({
  initialReportType,
  initialProjectId,
  onNavigate
}) => {
  const erp = useAppContext();
  const {
    user,
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
    trackedBills = []
  } = erp as any;

  // Subcontractor State
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [subcontractorBills, setSubcontractorBills] = useState<any[]>([]);
  const [subcontractorPayments, setSubcontractorPayments] = useState<any[]>([]);

  useEffect(() => {
    // Fetch subcontractor data from backend or fallback to empty
    Promise.all([
      fetch('/api/subcontractors').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/subcontractor-bills').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/subcontractor-payments').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([subs, bills, pmts]) => {
      setSubcontractors(Array.isArray(subs) ? subs : []);
      setSubcontractorBills(Array.isArray(bills) ? bills : []);
      setSubcontractorPayments(Array.isArray(pmts) ? pmts : []);
    });
  }, []);

  // Filter State
  const [filters, setFilters] = useState<AnalyticsFilterState>(() => ({
    ...DEFAULT_ANALYTICS_FILTERS,
    reportType: initialReportType || 'all',
    projectId: initialProjectId || 'All'
  }));

  // Update when initial prop changes
  useEffect(() => {
    if (initialReportType) {
      setFilters(prev => ({ ...prev, reportType: initialReportType }));
    }
  }, [initialReportType]);

  // Fullscreen Graph Modal state
  const [fullscreenChartKey, setFullscreenChartKey] = useState<string | null>(null);

  // Drilldown Modal state
  const [drilldownData, setDrilldownData] = useState<DrillDownData | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  // Active bottom table tab
  const [activeTableTab, setActiveTableTab] = useState<'kpi' | 'billings' | 'payments' | 'expenses' | 'workers' | 'subcontractors'>('kpi');
  const [tableSearch, setTableSearch] = useState('');

  // Extract distinct client names
  const clientNames = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p: any) => {
      if (p.clientName) set.add(p.clientName);
    });
    return Array.from(set).sort();
  }, [projects]);

  // Extract distinct financial years from data
  const financialYears = ['All', '2026-27', '2025-26', '2024-25', '2023-24'];

  // Current Generated Metadata
  const reportMeta: ExportReportHeaderMeta = useMemo(() => {
    const proj = projects.find((p: any) => p.id === filters.projectId);
    const reportTypeNames: Record<string, string> = {
      all: 'Complete Graphs & Analytics Overview (RPT06)',
      financial: 'Financial Analytics & Cashflow (RPT07)',
      project: 'Project Performance Graphs (RPT08)',
      billing: 'Billing & Invoice Analytics (RPT09)',
      collection: 'Client Collection & Outstanding (RPT10)',
      expense: 'Operational Expense Analytics (RPT11)',
      worker: 'Worker & Wage Analytics (RPT12)',
      attendance: 'Labour Attendance & DLR (RPT13)',
      subcontractor: 'Subcontractor Reconciliation (RPT14)',
      boq: 'BOQ & Progress Analytics (RPT15)',
      floor: 'Floor Abstract Analytics'
    };

    return {
      companyName: 'SN ENTERPRISES',
      reportName: reportTypeNames[filters.reportType] || 'Executive Graphs & Analytics Report',
      projectName: proj ? proj.name : (filters.projectId === 'All' ? 'All Projects (Consolidated)' : filters.projectId),
      clientName: filters.clientId === 'All' ? 'All Clients' : filters.clientId,
      financialYear: filters.financialYear,
      dateRange: filters.dateFrom && filters.dateTo ? `${filters.dateFrom} to ${filters.dateTo}` : (filters.month !== 'All' ? `Month: ${filters.month}` : 'All Periods'),
      generatedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      generatedBy: user?.name || user?.username || 'ERP Administrator'
    };
  }, [filters, projects, user]);

  // Compute Aggregated Analytics
  const analytics: FilteredAnalyticsData = useMemo(() => {
    return computeAnalyticsData(filters, {
      projects,
      workers,
      billings,
      clientPayments,
      expensesLedger,
      workerPayments,
      dlrs,
      attendance,
      floorAbstracts,
      boqs,
      subcontractors,
      subcontractorBills,
      subcontractorPayments,
      trackedBills
    });
  }, [
    filters, projects, workers, billings, clientPayments, 
    expensesLedger, workerPayments, dlrs, attendance, 
    floorAbstracts, boqs, subcontractors, subcontractorBills, 
    subcontractorPayments, trackedBills
  ]);

  // Handlers for Filters
  const handleResetFilters = () => {
    setFilters(DEFAULT_ANALYTICS_FILTERS);
  };

  const handleOpenDrilldown = (data: DrillDownData) => {
    setDrilldownData(data);
    setIsDrilldownOpen(true);
  };

  // Custom Chart Tooltip Formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#002f6c] text-white p-2.5 rounded shadow-xl border border-blue-400/30 text-[11px] min-w-[160px] z-50">
          <div className="font-bold border-b border-white/20 pb-1 mb-1.5 text-blue-200">
            {label}
          </div>
          {payload.map((entry: any, index: number) => {
            const isCount = entry.name.toLowerCase().includes('count') || 
                            entry.name.toLowerCase().includes('worker') || 
                            entry.name.toLowerCase().includes('flats') || 
                            entry.name.toLowerCase().includes('hours') || 
                            entry.name.toLowerCase().includes('qty');
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-white">
                  {isCount ? entry.value : formatINR(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Visibility checks based on active report type
  const showSection = (type: string) => {
    if (filters.reportType === 'all') return true;
    return filters.reportType === type;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-sap-bg)] text-slate-800 pb-16 font-sans">
      
      {/* 1. SAP REPORT HEADER (Print & Screen Compliant) */}
      <div className="bg-white border-b border-slate-300 shadow-sm p-4 print:p-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Company Branding & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#002f6c] text-amber-400 rounded flex items-center justify-center font-bold text-lg shadow-sm border border-blue-900">
              SN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-bold tracking-tight text-slate-900">SN ENTERPRISES</h1>
                <span className="bg-[#002f6c] text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase">
                  {filters.reportType === 'all' ? 'RPT06' : 
                   filters.reportType === 'financial' ? 'RPT07' :
                   filters.reportType === 'project' ? 'RPT08' :
                   filters.reportType === 'billing' ? 'RPT09' :
                   filters.reportType === 'collection' ? 'RPT10' :
                   filters.reportType === 'expense' ? 'RPT11' :
                   filters.reportType === 'worker' ? 'RPT12' :
                   filters.reportType === 'attendance' ? 'RPT13' :
                   filters.reportType === 'subcontractor' ? 'RPT14' :
                   filters.reportType === 'boq' ? 'RPT15' : 'RPT06'}
                </span>
              </div>
              <p className="text-[12px] font-semibold text-[#0056b3]">
                {reportMeta.reportName}
              </p>
            </div>
          </div>

          {/* Report Meta Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px]">Project:</span>
              <span className="font-semibold text-slate-800 truncate block max-w-[120px]">{reportMeta.projectName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Client:</span>
              <span className="font-semibold text-slate-800 truncate block max-w-[120px]">{reportMeta.clientName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">FY / Date:</span>
              <span className="font-semibold text-slate-800">{reportMeta.financialYear} &bull; {reportMeta.dateRange}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Generated By:</span>
              <span className="font-semibold text-slate-800">{reportMeta.generatedBy}</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => exportAnalyticsPDF(analytics, filters, reportMeta)}
              className="px-3 py-1.5 bg-[#0056b3] hover:bg-[#004085] text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Export Report to PDF"
            >
              <Download size={13} />
              Export PDF
            </button>
            <button
              onClick={() => exportAnalyticsExcel(analytics, filters, reportMeta)}
              className="px-3 py-1.5 bg-[#107c41] hover:bg-[#0b5c30] text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Export Multi-Sheet Excel"
            >
              <FileSpreadsheet size={13} />
              Excel (XLSX)
            </button>
            <button
              onClick={() => printAnalyticsReport(analytics, filters, reportMeta)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Print Report"
            >
              <Printer size={13} />
              Print
            </button>
          </div>

        </div>
      </div>

      {/* 2. GLOBAL FILTERS BAR (Print Hidden) */}
      <div className="bg-slate-100 border-b border-slate-300 p-3 print:hidden shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[12px]">
              <Filter size={14} className="text-[#0056b3]" />
              <span>Global Analytics Filters</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium rounded border border-slate-300 transition-colors flex items-center gap-1 shadow-sm"
              >
                <RefreshCw size={11} />
                Reset Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            
            {/* Report Type Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Report Section</label>
              <SAPSelect
                value={filters.reportType}
                onChange={e => setFilters(prev => ({ ...prev, reportType: e.target.value }))}
              >
                <option value="all">All Graphs (RPT06)</option>
                <option value="financial">Financial (RPT07)</option>
                <option value="project">Project (RPT08)</option>
                <option value="billing">Billing (RPT09)</option>
                <option value="collection">Collection (RPT10)</option>
                <option value="expense">Expenses (RPT11)</option>
                <option value="worker">Workers (RPT12)</option>
                <option value="attendance">Attendance (RPT13)</option>
                <option value="subcontractor">Subcontractor (RPT14)</option>
                <option value="boq">BOQ / Progress (RPT15)</option>
                <option value="floor">Floor Abstracts</option>
              </SAPSelect>
            </div>

            {/* Project Filter */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Project</label>
              <SAPSelect
                value={filters.projectId}
                onChange={e => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
              >
                <option value="All">All Projects</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </SAPSelect>
            </div>

            {/* Client Filter */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Client</label>
              <SAPSelect
                value={filters.clientId}
                onChange={e => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
              >
                <option value="All">All Clients</option>
                {clientNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </SAPSelect>
            </div>

            {/* Financial Year */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Financial Year</label>
              <SAPSelect
                value={filters.financialYear}
                onChange={e => setFilters(prev => ({ ...prev, financialYear: e.target.value }))}
              >
                {financialYears.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </SAPSelect>
            </div>

            {/* Month Filter */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Month</label>
              <input
                type="month"
                value={filters.month === 'All' ? '' : filters.month}
                onChange={e => setFilters(prev => ({ ...prev, month: e.target.value || 'All' }))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#0056b3]"
              />
            </div>

            {/* Date From */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#0056b3]"
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#0056b3]"
              />
            </div>

            {/* Worker Filter */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5">Worker</label>
              <SAPSelect
                value={filters.workerId}
                onChange={e => setFilters(prev => ({ ...prev, workerId: e.target.value }))}
              >
                <option value="All">All Workers</option>
                {workers.map((w: any) => (
                  <option key={w.id} value={w.id}>{`${w.name} (${w.workerId || 'N/A'})`}</option>
                ))}
              </SAPSelect>
            </div>

          </div>
        </div>
      </div>

      {/* 3. KPI SUMMARY CARDS */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div 
            onClick={() => handleOpenDrilldown({
              title: 'Work Amount & Billings Breakdown',
              subtitle: 'Detailed list of certified measurements and project work bills',
              category: 'Billing',
              columns: [
                { key: 'billNo', label: 'Bill No' },
                { key: 'workNature', label: 'Work Nature' },
                { key: 'certifyDate', label: 'Date', format: 'date' },
                { key: 'amount', label: 'Gross Work Amt', format: 'currency' }
              ],
              rows: analytics.filteredRecords.billings
            })}
            className="bg-white p-3 rounded border border-slate-200 shadow-sm hover:border-[#0056b3] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Work Amt</span>
              <Receipt size={14} className="text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[15px] font-bold font-mono text-slate-900">
              {formatCompactINR(analytics.kpis.totalWorkAmount)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Billed: {formatCompactINR(analytics.kpis.totalBillingAmount)}</span>
              <ArrowUpRight size={10} className="text-blue-500" />
            </div>
          </div>

          <div 
            onClick={() => handleOpenDrilldown({
              title: 'Client Collections & Receipts',
              subtitle: 'Historical bank remittances received from clients',
              category: 'Collection',
              columns: [
                { key: 'id', label: 'Payment ID' },
                { key: 'date', label: 'Date', format: 'date' },
                { key: 'amountReceived', label: 'Amount Received', format: 'currency' },
                { key: 'remarks', label: 'Remarks' }
              ],
              rows: analytics.filteredRecords.clientPayments
            })}
            className="bg-white p-3 rounded border border-slate-200 shadow-sm hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Client Received</span>
              <CreditCard size={14} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[15px] font-bold font-mono text-emerald-700">
              {formatCompactINR(analytics.kpis.totalAmountReceived)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Receipts count: {analytics.filteredRecords.clientPayments.length}</span>
              <ArrowUpRight size={10} className="text-emerald-500" />
            </div>
          </div>

          <div 
            onClick={() => handleOpenDrilldown({
              title: 'Client Outstanding Balance Position',
              subtitle: 'Balance calculated strictly as Total Billing Amount - Total Received',
              category: 'Collection',
              columns: [
                { key: 'clientName', label: 'Client Name' },
                { key: 'totalBilling', label: 'Total Billed', format: 'currency' },
                { key: 'amountReceived', label: 'Received', format: 'currency' },
                { key: 'outstanding', label: 'Outstanding Balance', format: 'currency' }
              ],
              rows: analytics.clientOutstanding
            })}
            className="bg-white p-3 rounded border border-slate-200 shadow-sm hover:border-rose-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Outstanding</span>
              <AlertCircle size={14} className="text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[15px] font-bold font-mono text-rose-700">
              {formatCompactINR(analytics.kpis.outstanding)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{analytics.clientOutstanding.length} Active Clients</span>
              <ArrowUpRight size={10} className="text-rose-500" />
            </div>
          </div>

          <div 
            onClick={() => handleOpenDrilldown({
              title: 'Site Expenses Ledger',
              subtitle: 'Consolidated petty cash, mess, tools, travel and site expenditures',
              category: 'Expense',
              columns: [
                { key: 'date', label: 'Date', format: 'date' },
                { key: 'description', label: 'Description' },
                { key: 'kharchi', label: 'Kharchi', format: 'currency' },
                { key: 'mess', label: 'Mess', format: 'currency' },
                { key: 'travel', label: 'Travel', format: 'currency' },
                { key: 'machineryMaterial', label: 'Tools/Material', format: 'currency' }
              ],
              rows: analytics.filteredRecords.expenses
            })}
            className="bg-white p-3 rounded border border-slate-200 shadow-sm hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Expenses</span>
              <TrendingDown size={14} className="text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[15px] font-bold font-mono text-amber-700">
              {formatCompactINR(analytics.kpis.totalExpenses)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Vouchers: {analytics.filteredRecords.expenses.length}</span>
              <ArrowUpRight size={10} className="text-amber-500" />
            </div>
          </div>

          <div 
            onClick={() => handleOpenDrilldown({
              title: 'Worker Wage Disbursements',
              subtitle: 'Labour wages, salary sheets, and net payouts',
              category: 'Worker',
              columns: [
                { key: 'workerId', label: 'Worker ID' },
                { key: 'month', label: 'Month' },
                { key: 'workAmount', label: 'Gross Work', format: 'currency' },
                { key: 'netPayment', label: 'Net Paid', format: 'currency' }
              ],
              rows: analytics.filteredRecords.workerPayments
            })}
            className="bg-white p-3 rounded border border-slate-200 shadow-sm hover:border-indigo-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Worker Payouts</span>
              <Users size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[15px] font-bold font-mono text-indigo-700">
              {formatCompactINR(analytics.kpis.totalWorkerPayments)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{analytics.kpis.activeWorkersCount} Active Workers</span>
              <ArrowUpRight size={10} className="text-indigo-500" />
            </div>
          </div>

          <div 
            onClick={() => handleOpenDrilldown({
              title: 'Subcontractor Payouts & Contract Balances',
              subtitle: 'Certified contractor invoices and bank disbursements',
              category: 'Subcontractor',
              columns: [
                { key: 'subcontractorName', label: 'Subcontractor' },
                { key: 'totalBills', label: 'Total Bills', format: 'currency' },
                { key: 'totalPayments', label: 'Payments Released', format: 'currency' },
                { key: 'outstanding', label: 'Pending Dues', format: 'currency' }
              ],
              rows: analytics.subcontractorBillingVsPayment
            })}
            className="bg-white p-3 rounded border border-slate-200 shadow-sm hover:border-teal-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Subcontractor Payouts</span>
              <Briefcase size={14} className="text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[15px] font-bold font-mono text-teal-700">
              {formatCompactINR(analytics.kpis.totalSubcontractorPayments)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{analytics.subcontractorBillingVsPayment.length} Contractors</span>
              <ArrowUpRight size={10} className="text-teal-500" />
            </div>
          </div>

        </div>
      </div>

      {/* 4. MAIN GRAPHS CONTAINER */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 flex flex-col gap-6">

        {/* ========================================================================= */}
        {/* SECTION 1: FINANCIAL OVERVIEW (RPT07) */}
        {/* ========================================================================= */}
        {showSection('financial') && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 1: Financial Overview & Cashflow Analysis (RPT07)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Income vs Expenditure
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Income vs Expense Monthly Composed Chart */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-bold text-slate-700">
                    Monthly Cash Inflow vs Outflow Trend
                  </h3>
                  <span className="text-[10px] text-slate-400">Client Received vs Labour/Sub/Expense</span>
                </div>

                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.incomeVsExpense}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar dataKey="clientReceived" name="Client Inflow" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="workerPayments" name="Worker Wages" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="subcontractorPayments" name="Subcontractor" fill="#0d9488" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expenses" name="Site Expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="netCashflow" name="Net Cashflow" stroke="#002f6c" strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Financial Breakdown Table / Gauge */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
                    Executive Cashflow Summary
                  </h4>
                  
                  <div className="flex flex-col gap-2 text-[11px]">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-600">Total Billed Volume:</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(analytics.kpis.totalBillingAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-600 text-emerald-700 font-medium">(+) Client Receipts:</span>
                      <span className="font-mono font-bold text-emerald-700">{formatINR(analytics.kpis.totalAmountReceived)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-600 text-rose-700 font-medium">(-) Total Disbursements:</span>
                      <span className="font-mono font-bold text-rose-700">
                        {formatINR(analytics.kpis.totalWorkerPayments + analytics.kpis.totalSubcontractorPayments + analytics.kpis.totalExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 bg-blue-50/50 px-2 rounded">
                      <span className="font-bold text-[#0056b3]">Net Cash Surplus:</span>
                      <span className="font-mono font-bold text-[#0056b3]">
                        {formatINR(analytics.kpis.totalAmountReceived - (analytics.kpis.totalWorkerPayments + analytics.kpis.totalSubcontractorPayments + analytics.kpis.totalExpenses))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <p>&bull; Live calculations from verified ERP ledger records.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: BILLING ANALYTICS (RPT09) */}
        {/* ========================================================================= */}
        {showSection('billing') && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 2: Billing Analytics & Invoicing Trends (RPT09)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                TDS &bull; Retention &bull; GST &bull; Net Billing
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Monthly Billing Trend Line Chart */}
              <div className="lg:col-span-2">
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Monthly Billing Components Trend (Work Amount, Net Billing, GST, TDS, Retention)
                </h3>
                <div className="h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.monthlyBillingTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Line type="monotone" dataKey="workAmount" name="Gross Work Amt" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="billingAmount" name="Net Certified Bill" stroke="#002f6c" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="gst" name="GST Added" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="tds" name="TDS Deducted" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="retention" name="Retention Withheld" stroke="#e11d48" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bill Status Distribution Donut */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col items-center justify-center">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 w-full text-center">
                  Bill Status Distribution
                </h4>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={analytics.billStatusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {analytics.billStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-[10px] mt-1">
                  {analytics.billStatusDistribution.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-600">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Project-wise Billing Comparison Bar Chart */}
            <div className="p-4 pt-0 border-t border-slate-200 mt-2">
              <h3 className="text-[12px] font-bold text-slate-700 my-2">
                Project-wise Billing Volume Comparison
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.projectWiseBilling}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="projectName" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="billingAmount" name="Net Billing Amount" fill="#0056b3" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="workAmount" name="Gross Work Value" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: CLIENT COLLECTION ANALYTICS (RPT10) */}
        {/* ========================================================================= */}
        {showSection('collection') && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 3: Client Collection & Outstanding Position (RPT10)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Rule: Balance = Total Billed - Total Received
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Billing vs Collection Comparison */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Billing vs Realized Collection Trend
                </h3>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.billingVsCollection}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="totalBilling" name="Billed Amount" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="amountReceived" name="Amount Received" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="outstanding" name="Outstanding Balance" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Client-wise Outstanding Horizontal Bar Chart */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Client-wise Outstanding Balances (Top Balances Due)
                </h3>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={analytics.clientOutstanding.slice(0, 8)} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis dataKey="clientName" type="category" width={100} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="outstanding" name="Outstanding Due" fill="#e11d48" radius={[0, 3, 3, 0]} />
                      <Bar dataKey="amountReceived" name="Collected" fill="#10b981" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: EXPENSE ANALYTICS (RPT11) */}
        {/* ========================================================================= */}
        {showSection('expense') && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 4: Operational Expense Analytics & Breakdown (RPT11)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Labour Welfare &bull; Travel &bull; Food &bull; Tools & Machinery
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Monthly Expense Trend */}
              <div className="lg:col-span-2">
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Monthly Site Operational Expenditure Trend
                </h3>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.monthlyExpenseTrend}>
                      <defs>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="totalExpense" name="Site Expenses" stroke="#d97706" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Category Distribution Donut */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col items-center justify-center">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 w-full text-center">
                  Expense Category Distribution
                </h4>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={analytics.expenseCategoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {analytics.expenseCategoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatINR(Number(value))} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center text-[10px] mt-1">
                  {analytics.expenseCategoryDistribution.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-600">{entry.name}: {formatCompactINR(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Project-wise Expense Comparison */}
            <div className="p-4 pt-0 border-t border-slate-200 mt-2">
              <h3 className="text-[12px] font-bold text-slate-700 my-2">
                Project-wise Expenditure Distribution
              </h3>
              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.projectWiseExpenses}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="projectName" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="totalExpense" name="Project Site Expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: WORKER & WAGE ANALYTICS (RPT12) */}
        {/* ========================================================================= */}
        {showSection('worker') && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 5: Worker Strength & Wage Analytics (RPT12)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Strength &bull; Disbursements &bull; Top Earners
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Worker Payment & Deduction Trend */}
              <div className="lg:col-span-2">
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Monthly Worker Wage Disbursements & Deductions
                </h3>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.workerPaymentTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="totalPayment" name="Net Wage Payout" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="messDeduction" name="Mess Deduction" fill="#ec4899" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="advanceDeduction" name="Advance Recovery" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="kharchiDeduction" name="Kharchi Deduction" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Worker Status Distribution */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col items-center justify-center">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 w-full text-center">
                  Worker Force Status
                </h4>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={analytics.workerStatusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {analytics.workerStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-[10px] mt-1">
                  {analytics.workerStatusDistribution.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-600">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Top Paid Workers Bar Chart */}
            <div className="p-4 pt-0 border-t border-slate-200 mt-2">
              <h3 className="text-[12px] font-bold text-slate-700 my-2">
                Top Paid Workers (Cumulative Actual Payments)
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={analytics.topPaidWorkers}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis dataKey="workerName" type="category" width={110} tick={{ fontSize: 10 }} stroke="#64748b" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="totalPaid" name="Total Wages Disbursed" fill="#4f46e5" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 6: ATTENDANCE & LABOUR ANALYTICS (RPT13) */}
        {/* ========================================================================= */}
        {showSection('attendance') && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 6: Attendance, DLR & Overtime Analysis (RPT13)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Present &bull; Absent &bull; Leave &bull; Overtime Hours
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Attendance Trend Line */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Daily & Monthly Attendance Trend
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="dateOrMonth" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="present" name="Present Count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="leave" name="On Leave" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Overtime Analysis */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Monthly Overtime (OT) Hours Distribution
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.overtimeAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#64748b" label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="overtimeHours" name="OT Hours" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 7: SUBCONTRACTOR RECONCILIATION (RPT14) */}
        {/* ========================================================================= */}
        {showSection('subcontractor') && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 7: Subcontractor Billing & Outstanding Reconciliation (RPT14)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Contract Bills &bull; Disbursements &bull; Dues
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Subcontractor Bills vs Payments */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Subcontractor Billed Volume vs Payments Released
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.subcontractorBillingVsPayment}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="subcontractorName" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="totalBills" name="Total Invoiced" fill="#0284c7" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="totalPayments" name="Payments Released" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="outstanding" name="Pending Dues" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Subcontractor Payments Trend */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Monthly Subcontractor Remittance Trend
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.monthlySubcontractorPayments}>
                      <defs>
                        <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tickFormatter={formatCompactINR} tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="amount" name="Subcontractor Payments" stroke="#0f766e" fillOpacity={1} fill="url(#colorSub)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 8: BOQ & PROJECT PROGRESS ANALYTICS (RPT15) */}
        {/* ========================================================================= */}
        {(showSection('boq') || showSection('project')) && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 8: BOQ Scheduled vs Executed & Project Progress (RPT15 / RPT08)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                BOQ Quantities &bull; Execution &bull; Budget Utilization
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* BOQ vs Executed Quantities Bar */}
              <div className="lg:col-span-2">
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  BOQ Scheduled Quantities vs Executed Work Items
                </h3>
                {analytics.boqVsExecuted.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                    <p className="text-[12px]">No BOQ measurement records available for this project filter.</p>
                  </div>
                ) : (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.boqVsExecuted}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="itemCode" tick={{ fontSize: 10 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="boqQty" name="BOQ Qty" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="executedQty" name="Executed Qty" fill="#10b981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="remainingQty" name="Remaining Qty" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Project Progress Gauge & List */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    Project Completion Progress (%)
                  </h4>
                  <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {analytics.projectProgressList.map((p, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-semibold text-slate-800 truncate max-w-[140px]">{p.projectName}</span>
                          <span className="font-mono font-bold text-[#0056b3]">{p.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-[#0056b3] h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, p.progressPercentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1">
                          <span>Billed: {formatCompactINR(p.billed)}</span>
                          <span>Budget: {formatCompactINR(p.budget)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 9: FLOOR ABSTRACT ANALYTICS */}
        {/* ========================================================================= */}
        {(showSection('floor') || showSection('all')) && (
          <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#0056b3]" />
                <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
                  Section 9: Floor Abstract & Hajira Analysis
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Floor Progress &bull; Level-wise Hajira &bull; Payable Amount
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Floor Hajira Analysis Bar */}
              <div className="lg:col-span-2">
                <h3 className="text-[12px] font-bold text-slate-700 mb-2">
                  Level-wise Total Hajira Distribution
                </h3>
                {analytics.hajiraByFloor.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                    <p className="text-[12px]">No floor abstract entries logged for this project filter.</p>
                  </div>
                ) : (
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.hajiraByFloor}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="level" tick={{ fontSize: 10 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="totalHajira" name="Total Floor Hajira" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Floor Flats Progress Card */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    Flat Completion Statistics
                  </h4>
                  <div className="flex flex-col gap-2 text-[11px]">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-600">Total Flat Records:</span>
                      <span className="font-bold text-slate-900">{analytics.floorProgress.totalFlats}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-emerald-700 font-medium">Completed / Measured:</span>
                      <span className="font-bold text-emerald-700">{analytics.floorProgress.completedFlats}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-amber-700 font-medium">Pending Measurements:</span>
                      <span className="font-bold text-amber-700">{analytics.floorProgress.pendingFlats}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-200">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span>Overall Completion:</span>
                    <span className="text-[#0056b3]">{analytics.floorProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-[#0056b3] h-full rounded-full" 
                      style={{ width: `${analytics.floorProgress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. DATA TABLE SECTION (Searchable, Exportable) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden mt-2">
          
          {/* Table Header & Tab Bar */}
          <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'kpi', label: 'KPIs & Summary' },
                { id: 'billings', label: `Billings (${analytics.filteredRecords.billings.length})` },
                { id: 'payments', label: `Client Receipts (${analytics.filteredRecords.clientPayments.length})` },
                { id: 'expenses', label: `Expenses (${analytics.filteredRecords.expenses.length})` },
                { id: 'workers', label: `Workers (${analytics.filteredRecords.workerPayments.length})` },
                { id: 'subcontractors', label: `Subcontractors (${analytics.subcontractorBillingVsPayment.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTableTab(tab.id as any)}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                    activeTableTab === tab.id
                      ? 'bg-[#0056b3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200 bg-white border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table Search */}
            <div className="relative max-w-xs w-full">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search table rows..."
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:border-[#0056b3]"
              />
            </div>

          </div>

          {/* Table Content */}
          <div className="overflow-x-auto max-h-[350px]">
            {activeTableTab === 'kpi' && (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Report Metric</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Aggregate Total (INR)</th>
                    <th className="py-2 px-3">Calculation Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">Total Work Amount</td>
                    <td className="py-2 px-3 text-slate-500">Billing / Executed</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatINR(analytics.kpis.totalWorkAmount)}</td>
                    <td className="py-2 px-3 text-slate-500">Sum of gross bill amounts certified</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">Total Net Billing</td>
                    <td className="py-2 px-3 text-slate-500">Invoicing</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatINR(analytics.kpis.totalBillingAmount)}</td>
                    <td className="py-2 px-3 text-slate-500">Gross Work + GST - TDS - Retention - Debit</td>
                  </tr>
                  <tr className="bg-emerald-50/40">
                    <td className="py-2 px-3 font-semibold text-emerald-800">Total Client Payments Received</td>
                    <td className="py-2 px-3 text-emerald-600">Cash Inflow</td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-800 text-right">{formatINR(analytics.kpis.totalAmountReceived)}</td>
                    <td className="py-2 px-3 text-emerald-600">Sum of client bank remittances</td>
                  </tr>
                  <tr className="bg-rose-50/40">
                    <td className="py-2 px-3 font-semibold text-rose-800">Net Outstanding Receivables</td>
                    <td className="py-2 px-3 text-rose-600">Balance Position</td>
                    <td className="py-2 px-3 font-mono font-bold text-rose-800 text-right">{formatINR(analytics.kpis.outstanding)}</td>
                    <td className="py-2 px-3 text-rose-600">Total Net Billing - Total Amount Received</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">Total Site Operational Expenses</td>
                    <td className="py-2 px-3 text-slate-500">Operational Cost</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatINR(analytics.kpis.totalExpenses)}</td>
                    <td className="py-2 px-3 text-slate-500">Mess, tools, travel, petty cash, food</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">Total Worker Wages Paid</td>
                    <td className="py-2 px-3 text-slate-500">Labour Payout</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatINR(analytics.kpis.totalWorkerPayments)}</td>
                    <td className="py-2 px-3 text-slate-500">Net worker payouts after mess & advance recoveries</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">Total Subcontractor Payouts</td>
                    <td className="py-2 px-3 text-slate-500">Subcontracts</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatINR(analytics.kpis.totalSubcontractorPayments)}</td>
                    <td className="py-2 px-3 text-slate-500">Contract milestone payouts released</td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTableTab === 'billings' && (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Bill No</th>
                    <th className="py-2 px-3">Project</th>
                    <th className="py-2 px-3">Work Nature</th>
                    <th className="py-2 px-3">Certify Date</th>
                    <th className="py-2 px-3 text-right">Gross Work</th>
                    <th className="py-2 px-3 text-right">GST</th>
                    <th className="py-2 px-3 text-right">TDS</th>
                    <th className="py-2 px-3 text-right">Retention</th>
                    <th className="py-2 px-3 text-right">Net Billed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analytics.filteredRecords.billings.map((b, idx) => {
                    const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-800">{b.billNo}</td>
                        <td className="py-2 px-3 text-slate-600">{b.projectId}</td>
                        <td className="py-2 px-3 text-slate-700">{b.workNature}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{b.certifyDate || b.month}</td>
                        <td className="py-2 px-3 font-mono text-right">{formatINR(b.amount || 0)}</td>
                        <td className="py-2 px-3 font-mono text-right text-emerald-600">+{formatINR(b.gst || 0)}</td>
                        <td className="py-2 px-3 font-mono text-right text-amber-600">-{formatINR(b.tds || 0)}</td>
                        <td className="py-2 px-3 font-mono text-right text-rose-600">-{formatINR(b.retention || 0)}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatINR(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTableTab === 'payments' && (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Receipt ID</th>
                    <th className="py-2 px-3">Project</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Amount Received</th>
                    <th className="py-2 px-3">Remarks / Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analytics.filteredRecords.clientPayments.map((cp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-500">{cp.id}</td>
                      <td className="py-2 px-3 text-slate-700">{cp.projectId}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{cp.date}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700 text-right">{formatINR(cp.amountReceived || 0)}</td>
                      <td className="py-2 px-3 text-slate-600">{cp.remarks || 'Direct Bank Credit'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTableTab === 'expenses' && (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Project</th>
                    <th className="py-2 px-3 text-right">Kharchi</th>
                    <th className="py-2 px-3 text-right">Mess</th>
                    <th className="py-2 px-3 text-right">Travel</th>
                    <th className="py-2 px-3 text-right">Tools/Machinery</th>
                    <th className="py-2 px-3 text-right">Other</th>
                    <th className="py-2 px-3 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analytics.filteredRecords.expenses.map((e, idx) => {
                    const tot = (e.kharchi || 0) + (e.mess || 0) + (e.workerAdvance || 0) + (e.tiffin || 0) +
                      (e.travel || 0) + (e.machineryMaterial || 0) + (e.workerPayment || 0) + (e.stationery || 0) + (e.others || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-600">{e.date}</td>
                        <td className="py-2 px-3 text-slate-800">{e.description}</td>
                        <td className="py-2 px-3 text-slate-600">{e.projectId || 'General'}</td>
                        <td className="py-2 px-3 font-mono text-right">{formatINR(e.kharchi || 0)}</td>
                        <td className="py-2 px-3 font-mono text-right">{formatINR(e.mess || 0)}</td>
                        <td className="py-2 px-3 font-mono text-right">{formatINR(e.travel || 0)}</td>
                        <td className="py-2 px-3 font-mono text-right">{formatINR(e.machineryMaterial || 0)}</td>
                        <td className="py-2 px-3 font-mono text-right">{formatINR((e.others || 0) + (e.workerPayment || 0))}</td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-700 text-right">{formatINR(tot)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTableTab === 'workers' && (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Worker ID</th>
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3 text-right">Work Days</th>
                    <th className="py-2 px-3 text-right">Gross Work</th>
                    <th className="py-2 px-3 text-right">Mess Deduct</th>
                    <th className="py-2 px-3 text-right">Advance Deduct</th>
                    <th className="py-2 px-3 text-right">Net Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analytics.filteredRecords.workerPayments.map((wp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-800">{wp.workerId}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{wp.month}</td>
                      <td className="py-2 px-3 text-right">{wp.workDays || '-'}</td>
                      <td className="py-2 px-3 font-mono text-right">{formatINR(wp.workAmount || 0)}</td>
                      <td className="py-2 px-3 font-mono text-right text-rose-600">-{formatINR(wp.messDeduction || 0)}</td>
                      <td className="py-2 px-3 font-mono text-right text-amber-600">-{formatINR(wp.advanceDeduction || 0)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700 text-right">{formatINR(wp.netPayment || wp.workAmount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTableTab === 'subcontractors' && (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Subcontractor</th>
                    <th className="py-2 px-3 text-right">Total Invoiced</th>
                    <th className="py-2 px-3 text-right">Payments Released</th>
                    <th className="py-2 px-3 text-right">Outstanding Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analytics.subcontractorBillingVsPayment.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-800">{s.subcontractorName}</td>
                      <td className="py-2 px-3 font-mono text-right">{formatINR(s.totalBills)}</td>
                      <td className="py-2 px-3 font-mono text-emerald-700 text-right">{formatINR(s.totalPayments)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-rose-700 text-right">{formatINR(s.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

      </div>

      {/* 6. DRILLDOWN MODAL */}
      <AnalyticsDrillDownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        data={drilldownData}
      />

    </div>
  );
};
