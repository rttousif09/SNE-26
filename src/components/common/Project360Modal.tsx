import React, { useState } from 'react';
import { 
  Building2, DollarSign, Receipt, CreditCard, Users, 
  Layers, Package, TrendingDown, FileText, GitFork, 
  ShieldCheck, BarChart3, Activity, X, Download, Printer, 
  Calendar, MapPin, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  TrendingUp, Wallet
} from 'lucide-react';
import { useAppContext } from '../../store';
import { StatusBadge } from './StatusBadge';
import { KpiCard } from './KpiCard';
import { DataTable } from './DataTable';

interface Project360ModalProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string, title?: string, extraProps?: any) => void;
}

export const Project360Modal: React.FC<Project360ModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const { 
    projects = [], billings = [], clientPayments = [], workers = [], 
    subcontractors = [], subcontractorBills = [], boqs = [], 
    floorAbstracts = [], expensesLedger = [], materialPurchases = [],
    approvals = [], activityLogs = []
  } = useAppContext() as any;

  const [activeTab, setActiveTab] = useState<
    'overview' | 'financials' | 'billing' | 'payments' | 'labour' | 'subcontractors' | 'boq' | 'expenses' | 'materials' | 'audit'
  >('overview');

  if (!isOpen || !projectId) return null;

  const project = projects.find((p: any) => p.id === projectId) || projects[0];
  if (!project) return null;

  // Project-specific metrics
  const pBillings = billings.filter((b: any) => b.projectId === project.id);
  const pBillingTotal = pBillings.reduce((sum: number, b: any) => {
    return sum + ((b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0));
  }, 0);

  const pPayments = clientPayments.filter((cp: any) => cp.projectId === project.id);
  const pCollectionTotal = pPayments.reduce((sum: number, cp: any) => sum + (cp.amountReceived || 0), 0);
  const pOutstanding = Math.max(0, pBillingTotal - pCollectionTotal);

  const pWorkers = workers.filter((w: any) => w.projectId === project.id && !w.exitDate);
  const pSubBills = subcontractorBills.filter((sb: any) => sb.projectId === project.id);
  const pSubTotal = pSubBills.reduce((sum: number, sb: any) => sum + (sb.netPayable || sb.totalAmount || 0), 0);

  const pExpenses = expensesLedger.filter((e: any) => e.projectId === project.id);
  const pExpensesTotal = pExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const pBOQs = boqs.filter((b: any) => b.projectId === project.id);
  const pMaterials = materialPurchases.filter((m: any) => m.projectId === project.id);
  const pApprovals = approvals.filter((a: any) => a.projectId === project.id);
  const pLogs = activityLogs.filter((l: any) => l.projectId === project.id || (l.details && l.details.includes(project.name)));

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const tabs = [
    { id: 'overview', label: '360° Overview', icon: Building2 },
    { id: 'financials', label: 'Financials & P&L', icon: DollarSign },
    { id: 'billing', label: `Client Bills (${pBillings.length})`, icon: Receipt },
    { id: 'payments', label: `Receipts (${pPayments.length})`, icon: CreditCard },
    { id: 'labour', label: `Labour (${pWorkers.length})`, icon: Users },
    { id: 'subcontractors', label: `Subcontractors (${pSubBills.length})`, icon: Building2 },
    { id: 'boq', label: `BOQ (${pBOQs.length})`, icon: FileText },
    { id: 'expenses', label: `Expenses (${pExpenses.length})`, icon: TrendingDown },
    { id: 'materials', label: `Materials (${pMaterials.length})`, icon: Package },
    { id: 'audit', label: 'Audit Trail', icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div 
        className="w-full max-w-6xl bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-[#0F4C81] dark:bg-[#0A2540] text-white px-5 py-4 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20 shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  {project.name}
                </h2>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white border border-white/30 shrink-0">
                  {project.projectCode || 'PRJ-360'}
                </span>
                <StatusBadge status={project.status || 'Ongoing'} size="sm" />
              </div>
              <p className="text-xs text-blue-100 dark:text-slate-300 truncate mt-0.5">
                Client: <span className="font-semibold text-white">{project.clientName || 'N/A'}</span> • Location: {project.location || 'Site'} • Start Date: {project.startDate || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                onClose();
                onNavigateTab('document-flow', 'Document Flow', { projectId: project.id });
              }}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition-colors cursor-pointer"
              title="Open SAP Document Flow (DF01)"
            >
              <GitFork size={13} />
              <span>Doc Flow</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center overflow-x-auto gap-1 text-xs shrink-0 select-none scrollbar-thin">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-2.5 font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-[#1E2228] rounded-t-md font-bold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#181B20] scrollbar-thin">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top 4 Financial KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Total Billed"
                  value={formatINR(pBillingTotal)}
                  subtitle={`${pBillings.length} RA Bills Submitted`}
                  icon={Receipt}
                  iconColor="text-blue-600"
                />
                <KpiCard
                  label="Total Collected"
                  value={formatINR(pCollectionTotal)}
                  trend={pBillingTotal > 0 ? `${Math.round((pCollectionTotal / pBillingTotal) * 100)}% Realized` : '0%'}
                  trendDirection="up"
                  isPositive={true}
                  icon={CreditCard}
                  iconColor="text-emerald-600"
                />
                <KpiCard
                  label="Client Outstanding"
                  value={formatINR(pOutstanding)}
                  subtitle="Pending Recovery"
                  trendDirection={pOutstanding > 0 ? 'down' : 'neutral'}
                  isPositive={pOutstanding === 0}
                  icon={Wallet}
                  iconColor="text-rose-600"
                />
                <KpiCard
                  label="Active Workforce"
                  value={pWorkers.length.toString()}
                  subtitle="Assigned on Site"
                  icon={Users}
                  iconColor="text-purple-600"
                />
              </div>

              {/* Grid 2 Columns: Project Information & Execution Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Card: Core Project Meta */}
                <div className="bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center space-x-2">
                    <Building2 size={14} className="text-blue-600" />
                    <span>Project Specifications</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Client Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{project.clientName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Contract Value</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatINR(project.contractValue || project.budget || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Project Type</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{project.type || 'Residential / Commercial'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Site Location</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{project.location || 'Site'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Start Date</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{project.startDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Target Completion</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{project.targetDate || project.endDate || 'Ongoing'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Cost Breakdown */}
                <div className="bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center space-x-2">
                    <DollarSign size={14} className="text-emerald-600" />
                    <span>Cost & Expenditure Allocation</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Subcontractor Bills</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatINR(pSubTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Direct Site Expenses</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatINR(pExpensesTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Pending Authorization</span>
                      <span className="font-bold text-amber-600 font-mono">{pApprovals.length} Requests</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 font-bold text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Net Estimated Margin</span>
                      <span className="text-emerald-600 font-mono">
                        {formatINR(Math.max(0, pBillingTotal - pSubTotal - pExpensesTotal))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <DataTable
              data={pBillings}
              columns={[
                { key: 'billNumber', header: 'Bill #', sortable: true, sticky: 'left', className: 'font-mono font-bold text-blue-600' },
                { key: 'date', header: 'Date', sortable: true },
                { key: 'amount', header: 'Gross Amount', sortable: true, align: 'right', render: r => formatINR(r.amount || 0) },
                { key: 'gst', header: 'GST', align: 'right', render: r => formatINR(r.gst || 0) },
                { key: 'tds', header: 'TDS (2%)', align: 'right', render: r => formatINR(r.tds || 0) },
                { key: 'retention', header: 'Retention (5%)', align: 'right', render: r => formatINR(r.retention || 0) },
                { key: 'status', header: 'Status', align: 'center', render: r => <StatusBadge status={r.status || 'Approved'} /> },
              ]}
              emptyTitle="No RA Bills Found"
              emptyDescription="No bills have been raised for this project yet."
            />
          )}

          {activeTab === 'payments' && (
            <DataTable
              data={pPayments}
              columns={[
                { key: 'paymentId', header: 'Receipt #', sortable: true, sticky: 'left', className: 'font-mono font-bold text-emerald-600' },
                { key: 'date', header: 'Receipt Date', sortable: true },
                { key: 'mode', header: 'Payment Mode', sortable: true },
                { key: 'referenceNumber', header: 'Cheque/UTR Ref', sortable: true, className: 'font-mono' },
                { key: 'amountReceived', header: 'Amount Received', sortable: true, align: 'right', render: r => formatINR(r.amountReceived || 0) },
                { key: 'status', header: 'Status', align: 'center', render: r => <StatusBadge status={r.status || 'Posted'} /> },
              ]}
              emptyTitle="No Client Payments Found"
              emptyDescription="No inward receipts recorded for this project."
            />
          )}

          {activeTab === 'labour' && (
            <DataTable
              data={pWorkers}
              columns={[
                { key: 'workerCode', header: 'Worker ID', sortable: true, sticky: 'left', className: 'font-mono font-bold' },
                { key: 'name', header: 'Worker Name', sortable: true, className: 'font-bold' },
                { key: 'trade', header: 'Trade / Skill', sortable: true },
                { key: 'dailyRate', header: 'Daily Rate', sortable: true, align: 'right', render: r => `₹${r.dailyRate || 0}` },
                { key: 'phone', header: 'Mobile', sortable: true },
                { key: 'status', header: 'Status', align: 'center', render: r => <StatusBadge status={r.status || 'Active'} /> },
              ]}
              emptyTitle="No Workers Assigned"
              emptyDescription="Assign workers to this project from the Workers master."
            />
          )}

          {activeTab === 'subcontractors' && (
            <DataTable
              data={pSubBills}
              columns={[
                { key: 'billNo', header: 'Sub Bill #', sortable: true, sticky: 'left', className: 'font-mono font-bold text-amber-600' },
                { key: 'subcontractorName', header: 'Subcontractor', sortable: true, className: 'font-bold' },
                { key: 'trade', header: 'Trade / Scope', sortable: true },
                { key: 'totalAmount', header: 'Gross Bill', sortable: true, align: 'right', render: r => formatINR(r.totalAmount || 0) },
                { key: 'netPayable', header: 'Net Payable', sortable: true, align: 'right', render: r => formatINR(r.netPayable || r.totalAmount || 0) },
                { key: 'status', header: 'Status', align: 'center', render: r => <StatusBadge status={r.status || 'Pending'} /> },
              ]}
              emptyTitle="No Subcontractor Bills"
              emptyDescription="No subcontractor RA bills recorded for this project."
            />
          )}

          {activeTab === 'expenses' && (
            <DataTable
              data={pExpenses}
              columns={[
                { key: 'date', header: 'Date', sortable: true },
                { key: 'category', header: 'Expense Category', sortable: true, className: 'font-bold' },
                { key: 'description', header: 'Description', sortable: true },
                { key: 'paidTo', header: 'Paid To', sortable: true },
                { key: 'amount', header: 'Amount', sortable: true, align: 'right', render: r => formatINR(r.amount || 0) },
                { key: 'status', header: 'Status', align: 'center', render: r => <StatusBadge status={r.status || 'Approved'} /> },
              ]}
              emptyTitle="No Site Expenses"
              emptyDescription="No expenses recorded under this project ledger."
            />
          )}

          {activeTab === 'boq' && (
            <DataTable
              data={pBOQs}
              columns={[
                { key: 'itemCode', header: 'Item Code', sortable: true, sticky: 'left', className: 'font-mono font-bold' },
                { key: 'description', header: 'Description', sortable: true },
                { key: 'unit', header: 'Unit', sortable: true, align: 'center' },
                { key: 'rate', header: 'Contract Rate', sortable: true, align: 'right', render: r => `₹${r.rate || 0}` },
                { key: 'quantity', header: 'Tender Qty', sortable: true, align: 'right' },
                { key: 'total', header: 'Estimated Value', sortable: true, align: 'right', render: r => formatINR((r.rate || 0) * (r.quantity || 0)) },
              ]}
              emptyTitle="No BOQ Scheduled"
              emptyDescription="Upload or create BOQ line items for this project."
            />
          )}

          {activeTab === 'materials' && (
            <DataTable
              data={pMaterials}
              columns={[
                { key: 'materialName', header: 'Material / Item', sortable: true, className: 'font-bold' },
                { key: 'quantity', header: 'Received Qty', sortable: true, align: 'right' },
                { key: 'unit', header: 'Unit', align: 'center' },
                { key: 'supplier', header: 'Vendor / Supplier', sortable: true },
                { key: 'cost', header: 'Total Cost', sortable: true, align: 'right', render: r => formatINR(r.cost || 0) },
                { key: 'date', header: 'Delivery Date', sortable: true },
              ]}
              emptyTitle="No Material Inward Records"
              emptyDescription="No material purchases or deliveries logged."
            />
          )}

          {activeTab === 'audit' && (
            <DataTable
              data={pLogs}
              columns={[
                { key: 'timestamp', header: 'Timestamp', sortable: true, className: 'font-mono text-slate-500' },
                { key: 'user', header: 'User', sortable: true, className: 'font-bold' },
                { key: 'action', header: 'Action', sortable: true },
                { key: 'details', header: 'Details', sortable: true },
              ]}
              emptyTitle="No Audit Logs"
              emptyDescription="No system activities logged for this project."
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white dark:bg-[#1E2228] border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span className="font-mono text-[11px]">
            PROJECT_ID: <span className="font-bold text-slate-800 dark:text-slate-200">{project.id}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md font-bold transition-colors cursor-pointer"
          >
            Close 360° Cockpit
          </button>
        </div>
      </div>
    </div>
  );
};
