import React, { useState } from 'react';
import { useAppContext } from '../store';
import { 
  Building2, Users, Receipt, CreditCard, Wallet, 
  Clock, Shield, FileText, ChevronRight,
  TrendingUp, TrendingDown, RefreshCw, BarChart3,
  Calendar, CheckSquare, Plus, ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { SAPTransactionHeader } from '../components/common/SAPTransactionHeader';

export interface DashboardProps {
  setCurrentTab?: (tab: string, title?: string, props?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab = () => {} }) => {
  const erpData = useAppContext();
  const { 
    user, projects = [], workers = [], billings = [], clientPayments = [], expensesLedger = [], 
    workerPayments = [], attendance = [], approvals = [],
    kharchiApprovals = [], advanceSheetApprovals = [], paymentSheetApprovals = [],
    activityLogs = []
  } = erpData as any;

  // Date/Time
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  // Formatting helpers
  const formatINR = (val: number) => {
    return `₹${Math.round(val || 0).toLocaleString('en-IN')}`;
  };

  const formatShortINR = (val: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // 1. KPI Calculations
  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter((p: any) => !p.status || p.status === 'Ongoing').length;
  const activeWorkersCount = workers.filter((w: any) => !w.exitDate).length;

  // Billings & Collections
  const totalBilling = billings.reduce((sum: number, b: any) => {
    const net = (Number(b.amount) || 0) - (Number(b.tds) || 0) - (Number(b.retention) || 0) + (Number(b.gst) || 0) - (Number(b.debitAmount) || 0) - (Number(b.holdAmount) || 0);
    return sum + net;
  }, 0);
  const totalCollection = clientPayments.reduce((sum: number, cp: any) => sum + (Number(cp.amountReceived) || 0), 0);
  const totalOutstanding = Math.max(0, totalBilling - totalCollection);

  // Retention Outstanding
  const totalRetentionOutstanding = billings.reduce((sum: number, b: any) => sum + (Number(b.retention) || 0), 0);

  // Current Month Expenses
  const currentMonthExpenses = expensesLedger
    .filter((e: any) => e.date?.startsWith(currentMonth) && e.status !== 'Rejected')
    .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  // Worker Payable (Settlement payments pending or due)
  const workerPayable = workerPayments
    .filter((wp: any) => wp.status === 'Draft' || wp.status === 'Pending')
    .reduce((sum: number, wp: any) => sum + (Number(wp.netPayable) || Number(wp.amount) || 0), 0);

  // Pending Approvals
  const totalPendingApprovals = 
    (approvals?.filter((a: any) => a.status === 'Pending').length || 0) + 
    (kharchiApprovals?.filter((a: any) => a.status === 'Pending').length || 0) + 
    (advanceSheetApprovals?.filter((a: any) => a.status === 'Pending').length || 0) + 
    (paymentSheetApprovals?.filter((a: any) => a.status === 'Pending').length || 0);

  // 7 Classic SAP KPI Tiles
  const kpiTiles = [
    {
      title: 'Total Projects',
      value: `${activeProjectsCount} / ${totalProjectsCount}`,
      subtext: `${activeProjectsCount} Ongoing Sites`,
      tab: 'projects',
      tcode: 'PRJ01',
      color: 'border-l-[#0A6ED1]'
    },
    {
      title: 'Active Workers',
      value: activeWorkersCount.toString(),
      subtext: 'Master Enrolled',
      tab: 'workers',
      tcode: 'WRK01',
      color: 'border-l-[#188918]'
    },
    {
      title: 'Outstanding Client',
      value: formatShortINR(totalOutstanding),
      subtext: `Total Due from Clients`,
      tab: 'billing',
      tcode: 'BIL01',
      color: 'border-l-[#BB0000]',
      highlightText: 'text-[#BB0000]'
    },
    {
      title: 'Worker Payable',
      value: formatShortINR(workerPayable),
      subtext: 'Pending Settlement',
      tab: 'worker-payment',
      tcode: 'PAY01',
      color: 'border-l-[#E9730C]',
      highlightText: 'text-[#E9730C]'
    },
    {
      title: 'Current Month Expenses',
      value: formatShortINR(currentMonthExpenses),
      subtext: `${currentMonth} Site Outflow`,
      tab: 'expenses',
      tcode: 'EXP01',
      color: 'border-l-[#5F6B75]'
    },
    {
      title: 'Retention Outstanding',
      value: formatShortINR(totalRetentionOutstanding),
      subtext: 'Held by Clients',
      tab: 'billing',
      tcode: 'BIL01',
      color: 'border-l-[#0A6ED1]'
    },
    {
      title: 'Pending Approvals',
      value: totalPendingApprovals.toString(),
      subtext: totalPendingApprovals > 0 ? 'Requires Director Signoff' : 'All Clear',
      tab: 'approvals',
      tcode: 'APR01',
      color: totalPendingApprovals > 0 ? 'border-l-[#E9730C]' : 'border-l-[#188918]',
      highlightText: totalPendingApprovals > 0 ? 'text-[#E9730C]' : 'text-[#188918]'
    }
  ];

  // Quick T-Code Shortcuts
  const quickTCodes = [
    { code: 'WFT01', name: 'Worker Financial Txns', tab: 'advance' },
    { code: 'WRK01', name: 'Worker Master', tab: 'workers' },
    { code: 'PAY01', name: 'Worker Payment', tab: 'worker-payment' },
    { code: 'BIL01', name: 'RA Billing', tab: 'billing' },
    { code: 'BOQ01', name: 'BOQ Master', tab: 'boqs' },
    { code: 'PRJ01', name: 'Project Management', tab: 'projects' },
    { code: 'DLR01', name: 'Daily Attendance', tab: 'dlr' },
    { code: 'SC01', name: 'Subcontractors', tab: 'subcontractors' },
    { code: 'EXP01', name: 'Expenses Ledger', tab: 'expenses' },
    { code: 'BI01', name: 'BI Reports', tab: 'analytics' }
  ];

  // Cashflow monthly trend data
  const chartData = [
    { month: 'May', billing: 420000, collection: 380000 },
    { month: 'Jun', billing: 580000, collection: 510000 },
    { month: 'Jul', billing: 640000, collection: 620000 },
    { month: 'Aug', billing: 710000, collection: 690000 },
    { month: 'Sep', billing: 830000, collection: 760000 },
    { month: 'Oct', billing: 690000, collection: 710000 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F4F6F7] text-[#2F3B45] text-[12px] font-sans overflow-y-auto">
      {/* 1. SAP Transaction Header */}
      <SAPTransactionHeader
        tcode="DASH01"
        title="Enterprise Management Cockpit"
        subtitle={`Active Session: ${user?.name || 'Administrator'} | FY 2026-27`}
        onRefresh={() => window.location.reload()}
        onPrint={() => window.print()}
        canSave={false}
        canEdit={false}
        canDelete={false}
      >
        <span className="text-[11px] font-mono text-[#5F6B75] bg-[#FFFFFF] border border-[#B8C3CC] px-2 py-0.5 rounded-[2px]">
          {today}
        </span>
      </SAPTransactionHeader>

      <div className="p-3 space-y-3">
        {/* 2. Compact SAP KPI Tiles (7 Tiles in responsive grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {kpiTiles.map((kpi, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentTab(kpi.tab)}
              className={`bg-white border border-[#B8C3CC] border-l-4 ${kpi.color} p-2 rounded-[2px] cursor-pointer hover:bg-[#F4F6F7] transition shadow-2xs select-none`}
              title={`Click to open ${kpi.tcode}`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#5F6B75]">
                <span className="truncate">{kpi.title}</span>
                <span className="font-mono text-[9px] bg-[#E7EEF3] px-1 rounded-[1px] text-[#2F3B45] shrink-0">
                  {kpi.tcode}
                </span>
              </div>
              <div className={`text-[15px] font-bold font-mono tracking-tight mt-1 truncate ${kpi.highlightText || 'text-[#2F3B45]'}`}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-[#5F6B75] truncate mt-0.5">
                {kpi.subtext}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Quick T-Code Bar */}
        <div className="bg-white border border-[#B8C3CC] p-2 rounded-[2px] shadow-2xs flex items-center space-x-2 overflow-x-auto text-[11px]">
          <span className="font-bold text-[#5F6B75] uppercase text-[10px] shrink-0 flex items-center space-x-1">
            <span>Direct T-Codes:</span>
          </span>
          <div className="flex items-center space-x-1.5 shrink-0">
            {quickTCodes.map(t => (
              <button
                key={t.code}
                onClick={() => setCurrentTab(t.tab)}
                className="sap-btn h-[24px] px-2 text-[11px] font-mono hover:border-[#0A6ED1]"
                title={`Open ${t.name} (${t.code})`}
              >
                <span className="font-bold text-[#0A6ED1]">{t.code}</span>
                <span className="text-[#5F6B75] text-[10px] hidden md:inline ml-1">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Middle Section: Small Chart & Summary Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          
          {/* Left 2 Cols: Active Projects Monitoring Table */}
          <div className="lg:col-span-2 bg-white border border-[#B8C3CC] rounded-[2px] shadow-2xs overflow-hidden flex flex-col">
            <div className="bg-[#E7EEF3] px-3 py-1.5 border-b border-[#B8C3CC] flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#2F3B45] uppercase tracking-wide flex items-center space-x-1.5">
                <Building2 size={13} className="text-[#0A6ED1]" />
                <span>Active Project Cost & Billing Monitoring</span>
              </span>
              <button
                onClick={() => setCurrentTab('projects')}
                className="sap-btn h-[22px] px-1.5 text-[10px]"
              >
                <span>View PRJ01</span>
                <ChevronRight size={10} />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[260px]">
              <table className="sap-dense-table">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>Project Name</th>
                    <th>Client</th>
                    <th className="w-20 text-center">Status</th>
                    <th className="w-20 text-center">Workers</th>
                    <th className="text-right w-24">Billed (Net)</th>
                    <th className="text-right w-24">Collected</th>
                    <th className="text-right w-24">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {(projects || []).slice(0, 7).map((p: any) => {
                    const pBillings = billings?.filter((b: any) => b.projectId === p.id) || [];
                    const pBilled = pBillings.reduce((sum: number, b: any) => {
                      return sum + ((Number(b.amount) || 0) - (Number(b.tds) || 0) - (Number(b.retention) || 0) + (Number(b.gst) || 0) - (Number(b.debitAmount) || 0) - (Number(b.holdAmount) || 0));
                    }, 0);
                    const pCollections = clientPayments?.filter((cp: any) => cp.projectId === p.id) || [];
                    const pCollected = pCollections.reduce((sum: number, cp: any) => sum + (Number(cp.amountReceived) || 0), 0);
                    const pBalance = Math.max(0, pBilled - pCollected);
                    const pWorkers = workers?.filter((w: any) => w.projectId === p.id && !w.exitDate).length || 0;

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => setCurrentTab('projects')}
                        className="cursor-pointer hover:bg-[#D9EBF7]"
                      >
                        <td className="font-bold text-[#0A6ED1] truncate max-w-[150px]">
                          {p.name}
                        </td>
                        <td className="text-[#5F6B75] truncate max-w-[120px]">{p.clientName || 'General'}</td>
                        <td className="text-center">
                          <span className={`px-1.5 py-0.2 rounded-[1px] text-[10px] font-bold border ${
                            p.status === 'Completed' ? 'bg-[#EBF7ED] text-[#188918] border-[#188918]/30' : 'bg-[#E7EEF3] text-[#0A6ED1] border-[#0A6ED1]/30'
                          }`}>
                            {p.status || 'Ongoing'}
                          </span>
                        </td>
                        <td className="text-center font-mono">{pWorkers}</td>
                        <td className="text-right font-mono font-medium text-[#2F3B45]">
                          ₹{(pBilled || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-right font-mono font-bold text-[#188918]">
                          ₹{(pCollected || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-right font-mono font-bold text-[#BB0000]">
                          ₹{(pBalance || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-[#5F6B75] italic">
                        No projects recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Col: Small Cashflow AreaChart */}
          <div className="bg-white border border-[#B8C3CC] rounded-[2px] shadow-2xs overflow-hidden flex flex-col">
            <div className="bg-[#E7EEF3] px-3 py-1.5 border-b border-[#B8C3CC] flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#2F3B45] uppercase tracking-wide flex items-center space-x-1.5">
                <BarChart3 size={13} className="text-[#0A6ED1]" />
                <span>Monthly Billing vs Collections</span>
              </span>
              <span className="text-[10px] text-[#5F6B75] font-mono">INR Trend</span>
            </div>

            <div className="p-2 flex-1 flex flex-col justify-center">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sapBlueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0A6ED1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0A6ED1" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="sapGreenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#188918" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#188918" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#B8C3CC" />
                    <XAxis dataKey="month" stroke="#5F6B75" fontSize={10} tickLine={false} />
                    <YAxis stroke="#5F6B75" fontSize={9} tickFormatter={(val) => `₹${val / 1000}k`} tickLine={false} />
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#B8C3CC', fontSize: '11px', borderRadius: '2px' }}
                    />
                    <Area type="monotone" dataKey="billing" name="Billed" stroke="#0A6ED1" fillOpacity={1} fill="url(#sapBlueGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="collection" name="Collected" stroke="#188918" fillOpacity={1} fill="url(#sapGreenGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center space-x-4 text-[10px] pt-1 border-t border-[#B8C3CC]">
                <div className="flex items-center space-x-1">
                  <div className="w-2.5 h-2.5 bg-[#0A6ED1] rounded-[1px]"></div>
                  <span>Net Billed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2.5 h-2.5 bg-[#188918] rounded-[1px]"></div>
                  <span>Received</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Bottom Section: Pending Approvals & Recent Audit Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* Pending Approvals Table */}
          <div className="bg-white border border-[#B8C3CC] rounded-[2px] shadow-2xs overflow-hidden flex flex-col">
            <div className="bg-[#E7EEF3] px-3 py-1.5 border-b border-[#B8C3CC] flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#2F3B45] uppercase tracking-wide flex items-center space-x-1.5">
                <Shield size={13} className="text-[#E9730C]" />
                <span>Pending Approvals & Verification</span>
              </span>
              <button
                onClick={() => setCurrentTab('approvals')}
                className="sap-btn h-[22px] px-1.5 text-[10px]"
              >
                <span>APR01 ({totalPendingApprovals})</span>
                <ChevronRight size={10} />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[220px]">
              <table className="sap-dense-table">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>Type</th>
                    <th>Details</th>
                    <th className="text-right">Amount</th>
                    <th className="w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(approvals || []).filter((a: any) => a.status === 'Pending').slice(0, 5).map((a: any) => (
                    <tr key={a.id}>
                      <td className="font-bold text-[#0A6ED1]">Advance Request</td>
                      <td className="truncate max-w-[140px]">{a.reason || 'Worker advance request'}</td>
                      <td className="text-right font-mono font-bold text-[#BB0000]">₹{Number(a.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="text-center">
                        <button onClick={() => setCurrentTab('approvals')} className="sap-btn h-[20px] px-1 text-[10px]">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(kharchiApprovals || []).filter((k: any) => k.status === 'Pending').slice(0, 5).map((k: any) => (
                    <tr key={k.id}>
                      <td className="font-bold text-purple-700">Weekly Kharchi</td>
                      <td className="truncate max-w-[140px]">Month: {k.month}</td>
                      <td className="text-right font-mono font-bold text-[#BB0000]">₹{Number(k.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="text-center">
                        <button onClick={() => setCurrentTab('approvals')} className="sap-btn h-[20px] px-1 text-[10px]">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                  {totalPendingApprovals === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#188918] font-semibold">
                        ✓ All transactions & sheets approved. No pending items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Audit Activity Logs */}
          <div className="bg-white border border-[#B8C3CC] rounded-[2px] shadow-2xs overflow-hidden flex flex-col">
            <div className="bg-[#E7EEF3] px-3 py-1.5 border-b border-[#B8C3CC] flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#2F3B45] uppercase tracking-wide flex items-center space-x-1.5">
                <Clock size={13} className="text-[#0A6ED1]" />
                <span>System Security Audit Trail (AUD01)</span>
              </span>
              <button
                onClick={() => setCurrentTab('activity-log')}
                className="sap-btn h-[22px] px-1.5 text-[10px]"
              >
                <span>View Log</span>
                <ChevronRight size={10} />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[220px]">
              <table className="sap-dense-table">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-24">Action</th>
                    <th>Log Details</th>
                    <th className="w-20">User</th>
                    <th className="w-24 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(activityLogs || []).slice(0, 6).map((log: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-bold text-[#2F3B45] truncate">{log.action}</td>
                      <td className="text-[#5F6B75] truncate max-w-[150px]">{log.details}</td>
                      <td className="font-mono text-[11px]">{log.user || 'Admin'}</td>
                      <td className="text-right font-mono text-[10px] text-[#5F6B75]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                  {(!activityLogs || activityLogs.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#5F6B75] italic">
                        No recent activity events recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
