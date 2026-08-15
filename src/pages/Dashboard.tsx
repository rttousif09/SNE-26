import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { 
  Building2, Users, Receipt, CreditCard, Wallet, 
  Calendar, CheckCircle, Clock, Zap, Star, ArrowRight, Activity, Bell, FileText, ChevronRight, ChevronDown, X, UserPlus, FilePlus, PlayCircle, BarChart3, HelpCircle, HardHat, DollarSign, Shield, MoreVertical, MessageSquare, Settings, Sun, Eye, AlertCircle, ArrowUpRight, CheckSquare, Sparkles, Folder, TrendingUp, TrendingDown, RefreshCw, EyeOff, Moon, Check
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export interface DashboardProps {
  setCurrentTab?: (tab: string, title?: string, props?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab = () => {} }) => {
  const erpData = useAppContext();
  const { 
    user, projects, workers, billings, clientPayments, expensesLedger, 
    materialPurchases = [], workerPayments = [], attendance = [], approvals = [],
    subcontractors = [], subcontractorBills = [], activityLogs = []
  } = erpData as any;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sap-dark-mode') === 'true';
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.darkMode === 'boolean') {
        setDarkMode(customEvent.detail.darkMode);
      }
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  const handleSetTheme = (isDark: boolean) => {
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sap-dark-mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sap-dark-mode', 'false');
    }
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { darkMode: isDark } }));
  };

  // Date/Time
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [currentTime]);

  const fyString = "2026-27";
  const formattedDate = currentTime.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Formatting helpers
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatShortINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  // Dynamic Data Calculation
  const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
  const today = new Date().toISOString().split('T')[0];

  const activeProjectsCount = projects?.filter((p: any) => !p.status || p.status === 'Ongoing').length || 0;
  const activeWorkersCount = workers?.filter((w: any) => !w.exitDate).length || 0;
  const presentTodayCount = attendance?.filter((a: any) => a.date === today && (a.status === 'Present' || a.status === 'HalfDay')).length || 0;
  
  const billingThisMonth = billings?.filter((b: any) => b.month === currentMonth).reduce((sum: number, b: any) => {
    const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
    return sum + net;
  }, 0) || 0;
  const collectionThisMonth = clientPayments?.filter((cp: any) => cp.date?.startsWith(currentMonth)).reduce((sum: number, cp: any) => sum + (cp.amountReceived || 0), 0) || 0;
  
  const totalBilling = billings?.reduce((sum: number, b: any) => {
    const net = (b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0);
    return sum + net;
  }, 0) || 0;
  const totalCollection = clientPayments?.reduce((sum: number, cp: any) => sum + (cp.amountReceived || 0), 0) || 0;
  const totalOutstanding = Math.max(0, totalBilling - totalCollection);

  const { kharchiApprovals = [], advanceSheetApprovals = [], paymentSheetApprovals = [] } = erpData as any;
  const totalPendingApprovals = 
    (approvals?.filter((a: any) => a.status === 'Pending').length || 0) + 
    (kharchiApprovals?.filter((a: any) => a.status === 'Pending').length || 0) + 
    (advanceSheetApprovals?.filter((a: any) => a.status === 'Pending').length || 0) + 
    (paymentSheetApprovals?.filter((a: any) => a.status === 'Pending').length || 0);

  const dynamicKPIs = [
    { title: "Active Projects", value: activeProjectsCount.toString(), trend: "", isPositive: true, theme: "cyan", icon: Folder },
    { title: "Active Workers", value: activeWorkersCount.toString(), trend: "", isPositive: true, theme: "purple", icon: Users },
    { title: "Present Today", value: presentTodayCount.toString(), trend: "", isPositive: true, theme: "orange", icon: Clock },
    { title: "Billing This Month", value: formatINR(billingThisMonth), trend: "", isPositive: true, theme: "blue", icon: Receipt },
    { title: "Collection This Month", value: formatINR(collectionThisMonth), trend: "", isPositive: collectionThisMonth >= billingThisMonth, theme: "pink", icon: TrendingUp },
    { title: "Outstanding", value: formatINR(totalOutstanding), trend: "", isPositive: totalOutstanding === 0, theme: "emerald", icon: Wallet },
    { title: "Pending Approvals", value: totalPendingApprovals.toString(), trend: "", isPositive: totalPendingApprovals === 0, theme: "amber", icon: Shield }
  ];

  const quickActionsList = [
    { label: 'Add Attendance', icon: UserPlus, tab: 'workers', color: 'text-blue-600', bg: 'bg-blue-50/50 hover:bg-blue-100 border-blue-100' },
    { label: 'Worker Advance', icon: DollarSign, tab: 'advance', color: 'text-blue-600', bg: 'bg-blue-50/50 hover:bg-blue-100 border-blue-100' },
    { label: 'Kharchi (Pocket Money)', icon: Wallet, tab: 'kharchi', color: 'text-purple-600', bg: 'bg-purple-50/50 hover:bg-purple-100 border-purple-100' },
    { label: 'Worker Payment', icon: CreditCard, tab: 'worker-payment', color: 'text-blue-600', bg: 'bg-blue-50/50 hover:bg-blue-100 border-blue-100' },
    { label: 'Floor Abstract', icon: Building2, tab: 'floor-abstracts', color: 'text-blue-600', bg: 'bg-blue-50/50 hover:bg-blue-100 border-blue-100' },
    { label: 'Create Bill', icon: Receipt, tab: 'billing', color: 'text-blue-600', bg: 'bg-blue-50/50 hover:bg-blue-100 border-blue-100' },
    { label: 'Client Payment', icon: DollarSign, tab: 'client-payment', color: 'text-emerald-600', bg: 'bg-emerald-50/50 hover:bg-emerald-100 border-emerald-100' },
    { label: 'Add Expense', icon: Wallet, tab: 'expenses', color: 'text-purple-600', bg: 'bg-purple-50/50 hover:bg-purple-100 border-purple-100' },
    { label: 'Graphs & Analytics', icon: BarChart3, tab: 'analytics', color: 'text-indigo-600', bg: 'bg-indigo-50/50 hover:bg-indigo-100 border-indigo-100' }
  ];

  const dynamicProjectRows = (projects || []).slice(0, 5).map((p: any) => {
    const pBillings = billings?.filter((b: any) => b.projectId === p.id) || [];
    const pBillingAmount = pBillings.reduce((sum: number, b: any) => {
      return sum + ((b.amount || 0) - (b.tds ?? 0) - (b.retention ?? 0) + (b.gst ?? 0) - (b.debitAmount ?? 0) - (b.holdAmount ?? 0));
    }, 0);
    const pCollections = clientPayments?.filter((cp: any) => cp.projectId === p.id) || [];
    const pCollectionAmount = pCollections.reduce((sum: number, cp: any) => sum + (cp.amountReceived || 0), 0);
    const pWorkers = workers?.filter((w: any) => w.projectId === p.id && !w.exitDate).length || 0;
    
    return {
      name: p.name,
      client: p.clientName || "Unknown Client",
      status: p.status || "Ongoing",
      progress: pBillingAmount > 0 ? Math.min(100, Math.round((pCollectionAmount / pBillingAmount) * 100)) : 0,
      workers: pWorkers,
      billing: pBillingAmount,
      collection: pCollectionAmount,
      isOngoing: p.status !== 'Completed' && p.status !== 'Archived' && p.status !== 'Cancelled'
    };
  });

  const cashFlowSparkline = (clientPayments?.length > 0) ? clientPayments.slice(-10).map((cp: any) => ({ value: cp.amountReceived })) : [{ value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }];

  const aiInsights = [];
  if (totalOutstanding > 0) {
    aiInsights.push({ text: `Outstanding collection is ${formatINR(totalOutstanding)}.`, icon: TrendingDown, color: "text-amber-500 bg-amber-50" });
  }
  if (activeProjectsCount > 0) {
    aiInsights.push({ text: `${activeProjectsCount} ongoing projects currently active.`, icon: Star, color: "text-blue-500 bg-blue-50" });
  }
  if (collectionThisMonth > billingThisMonth) {
    aiInsights.push({ text: "Cash flow is positive this month.", icon: Sparkles, color: "text-emerald-500 bg-emerald-50" });
  }
  if (totalPendingApprovals > 0) {
    aiInsights.push({ text: `${totalPendingApprovals} pending approvals require your attention.`, icon: Shield, color: "text-purple-500 bg-purple-50" });
  }
  if (aiInsights.length === 0) {
    aiInsights.push({ text: "System is operating smoothly.", icon: CheckCircle, color: "text-emerald-500 bg-emerald-50" });
  }

  const pendingApprovalsList = [
    { label: "Worker Advances", count: approvals?.filter((a: any) => a.status === 'Pending').length || 0, amount: approvals?.filter((a: any) => a.status === 'Pending').reduce((s: number, a: any) => s + (a.requestAmount || a.amount), 0) || 0, tab: "approvals" },
    { label: "Kharchi", count: kharchiApprovals?.filter((a: any) => a.status === 'Pending').length || 0, amount: kharchiApprovals?.filter((a: any) => a.status === 'Pending').reduce((s: number, a: any) => s + (a.requestAmount || a.totalAmount), 0) || 0, tab: "approvals" },
    { label: "Worker Payments", count: paymentSheetApprovals?.filter((a: any) => a.status === 'Pending').length || 0, amount: paymentSheetApprovals?.filter((a: any) => a.status === 'Pending').reduce((s: number, a: any) => s + (a.requestAmount || a.totalAmount), 0) || 0, tab: "approvals" }
  ].filter(p => p.count > 0);
  
  if (pendingApprovalsList.length === 0) {
     pendingApprovalsList.push({ label: "No Pending Approvals", count: 0, amount: 0, tab: "approvals" });
  }

  // Notifications Sidebar matching the screenshot
  const screenshotNotifications = [];
  if (totalOutstanding > 0) {
    screenshotNotifications.push({ title: "Collections Due", desc: `Total ${formatINR(totalOutstanding)} pending`, time: "Action Required", theme: "red", icon: DollarSign });
  }
  if (totalPendingApprovals > 0) {
    screenshotNotifications.push({ title: "Pending Approvals", desc: `${totalPendingApprovals} Requests Pending`, time: "Needs Review", theme: "orange", icon: Shield });
  }
  if (billingThisMonth > 0) {
    screenshotNotifications.push({ title: "Monthly Billing", desc: `Billed ${formatINR(billingThisMonth)} this month`, time: "Ongoing", theme: "blue", icon: Receipt });
  }
  if (activeWorkersCount > 0) {
    screenshotNotifications.push({ title: "Active Workforce", desc: `${activeWorkersCount} workers currently active`, time: "Today", theme: "green", icon: Users });
  }
  if (screenshotNotifications.length === 0) {
    screenshotNotifications.push({ title: "All Good", desc: "No critical notifications", time: "Now", theme: "green", icon: CheckCircle });
  }

  // Recent system activities matching screenshot style
  const recentActivities = (activityLogs || []).slice(0, 5).map((log: any) => {
    // try to determine time ago
    const timeAgo = (dateStr: string) => {
      if (!dateStr) return "Just now";
      const diff = new Date().getTime() - new Date(dateStr).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    };
    return {
      action: log.action || "System Action",
      details: log.details || "Details not available",
      user: log.user || "System User",
      time: timeAgo(log.timestamp)
    };
  });
  
  if (recentActivities.length === 0) {
    recentActivities.push({
      action: "System Initialized",
      details: "No recent activities found.",
      user: "System",
      time: "Just now"
    });
  }

  const themeClasses: { [key: string]: { bg: string, text: string, border: string } } = {
    cyan: { bg: "bg-cyan-50", text: "text-cyan-500", border: "border-cyan-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-500", border: "border-purple-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-500", border: "border-blue-100" },
    pink: { bg: "bg-rose-50", text: "text-rose-500", border: "border-rose-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-500", border: "border-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-500", border: "border-amber-100" }
  };

  const notificationTheme: { [key: string]: { bg: string, text: string } } = {
    red: { bg: "bg-rose-50", text: "text-rose-500" },
    blue: { bg: "bg-blue-50", text: "text-blue-500" },
    green: { bg: "bg-emerald-50", text: "text-emerald-500" },
    yellow: { bg: "bg-amber-50", text: "text-amber-500" },
    orange: { bg: "bg-orange-50", text: "text-orange-500" }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden font-sans">
      
      {/* Scrollable Dashboard Frame */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12">

          {/* Top Greeting and Action Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {greeting}, {user?.name || 'Tousif Reja'} 👋
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {formattedDate} <span className="text-slate-300 mx-2">|</span> Financial Year: <span className="text-blue-600 font-semibold">{fyString}</span>
              </p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer">
              <Settings size={14} />
              <span>Customize Dashboard</span>
            </button>
          </div>

          {/* Row of 7 Modern KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {dynamicKPIs.map((kpi, idx) => {
              const theme = themeClasses[kpi.theme] || themeClasses.blue;
              const Icon = kpi.icon;
              return (
                <div key={idx} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-xl ${theme.bg} ${theme.text}`}>
                      <Icon size={18} strokeWidth={2.2} />
                    </div>
                    <button className="text-slate-300 hover:text-slate-500 transition-colors p-1 rounded">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">{kpi.value}</h3>
                  </div>

                  <div className="mt-3 flex items-center gap-1">
                    <span className={`text-[10px] font-bold ${kpi.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {kpi.trend}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-xs font-bold text-slate-800 tracking-wide shrink-0">Quick Actions</span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 w-full">
                {quickActionsList.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button 
                      key={idx}
                      onClick={() => setCurrentTab(action.tab)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer transition-all ${action.color}`}
                    >
                      <Icon size={14} strokeWidth={2.2} className="shrink-0" />
                      <span className="text-xs font-bold text-slate-700">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content Layout with Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            
            {/* Left Content Spanning 7 columns */}
            <div className="lg:col-span-7 space-y-6">

              {/* Active Projects Table Card */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Active Projects</h3>
                  <button onClick={() => setCurrentTab('projects')} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    View All Projects
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                        <th className="p-4 pl-6">Project Name</th>
                        <th className="p-4">Client Name</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Progress</th>
                        <th className="p-4 text-center">Workers</th>
                        <th className="p-4 text-right">Billing</th>
                        <th className="p-4 text-right">Collection</th>
                        <th className="p-4 text-center pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dynamicProjectRows.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4 pl-6 font-bold text-slate-800">{p.name}</td>
                          <td className="p-4 text-slate-500 font-medium">{p.client}</td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5 font-bold text-slate-700">
                              <span className={`w-1.5 h-1.5 rounded-full ${p.isOngoing ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 min-w-[90px]">
                              <span className="font-bold text-slate-700 font-mono text-[11px]">{p.progress}%</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${p.progress}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700">{p.workers}</td>
                          <td className="p-4 text-right font-bold text-slate-700 font-mono">{formatShortINR(p.billing)}</td>
                          <td className="p-4 text-right font-bold text-slate-700 font-mono">{formatShortINR(p.collection)}</td>
                          <td className="p-4 text-center pr-6">
                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setCurrentTab('projects')} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer" title="Preview Project">
                                <Eye size={13} />
                              </button>
                              <button onClick={() => setCurrentTab('projects')} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer" title="Go to Project details">
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row of 4 Cards: Project Health, Cash Flow Snapshot, Subcontractor Summary, Labour Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Project Health (Donut Chart) */}
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight">Project Health</h4>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5 cursor-pointer">
                      Overall Health <ChevronDown size={10} />
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 my-2">
                    {/* SVG Segmented Donut Chart */}
                    <div className="relative w-20 h-20 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        {/* Background grey circle */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                        {/* Green segment (Healthy: 56%) */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray="56 44" strokeDashoffset="0" />
                        {/* Orange segment (Warning: 28%) */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray="28 72" strokeDashoffset="-56" />
                        {/* Red segment (Critical: 16%) */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="16 84" strokeDashoffset="-84" />
                      </svg>
                      {/* Inner text labels */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-black text-slate-800 leading-none">18</span>
                        <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Total</span>
                      </div>
                    </div>

                    {/* Legends list */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Healthy</span>
                        </div>
                        <span className="text-slate-800 font-bold">10 (56%)</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Warning</span>
                        </div>
                        <span className="text-slate-800 font-bold">5 (28%)</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Critical</span>
                        </div>
                        <span className="text-slate-800 font-bold">3 (16%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Cash Flow Snapshot (This Month) with wave path */}
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-2">Cash Flow Snapshot <span className="text-[10px] text-slate-400 font-normal">(This Month)</span></h4>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Expected Collection</span>
                      <span className="text-xs font-extrabold text-emerald-600 font-mono">₹25,00,000</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Expected Payments</span>
                      <span className="text-xs font-extrabold text-rose-600 font-mono">₹18,00,000</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-3 gap-2">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Net Cash Position</span>
                      <span className="text-[13px] font-black text-blue-600 font-mono">₹7,00,000</span>
                    </div>
                    {/* Tiny Area Sparkline Chart */}
                    <div className="w-24 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cashFlowSparkline} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
                          <defs>
                            <linearGradient id="cfWaveGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.8} fillOpacity={1} fill="url(#cfWaveGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* 3. Subcontractor Summary */}
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-3">Subcontractor Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-semibold border-b border-slate-50 pb-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Total Subcontractors</span>
                      <span className="text-slate-800 font-black">28</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold border-b border-slate-50 pb-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Outstanding Amount</span>
                      <span className="text-slate-800 font-black font-mono">₹6,75,000</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold border-b border-slate-50 pb-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Retention Amount</span>
                      <span className="text-amber-600 font-black font-mono">₹1,25,000</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Pending Bills</span>
                      <span className="text-slate-800 font-black">7</span>
                    </div>
                  </div>
                </div>

                {/* 4. Labour Summary */}
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-3">Labour Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-semibold border-b border-slate-50 pb-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Active Workers</span>
                      <span className="text-slate-800 font-black">245</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold border-b border-slate-50 pb-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Present Today</span>
                      <span className="text-slate-800 font-black">220</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold border-b border-slate-50 pb-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Advance Outstanding</span>
                      <span className="text-amber-600 font-black font-mono">₹3,25,000</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Payment Due</span>
                      <span className="text-rose-600 font-black font-mono">₹5,50,000</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom 3 Grid Columns: Recent Activities, AI Insights, Pending Approvals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Recent Activities Card */}
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-4">Recent Activities</h4>
                    <div className="space-y-3.5">
                      {recentActivities.map((act, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 block leading-tight">{act.action}</span>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">{act.details}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-700 font-bold block">{act.user}</span>
                            <span className="text-[8px] text-slate-400 block font-semibold">{act.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button onClick={() => setCurrentTab('activity-log')} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors text-center w-full pt-4 mt-4 border-t border-slate-50">
                    View All Activities
                  </button>
                </div>

                {/* 2. AI Insights Card */}
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-4">AI Insights</h4>
                    <div className="space-y-3.5">
                      {aiInsights.map((ins, idx) => {
                        const Icon = ins.icon;
                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg shrink-0 ${ins.color}`}>
                              <Icon size={13} className="stroke-[2.5]" />
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed pt-0.5">
                              {ins.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors text-center w-full pt-4 mt-4 border-t border-slate-50 cursor-pointer">
                    View All Insights
                  </button>
                </div>

                {/* 3. Pending Approvals Card */}
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-4">Pending Approvals</h4>
                    <div className="space-y-4">
                      {pendingApprovalsList.map((app, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 block">{app.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold block mt-0.5">{app.count} Pending</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-slate-800 font-mono">{formatShortINR(app.amount)}</span>
                            <button onClick={() => setCurrentTab(app.tab)} className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setCurrentTab('approvals')} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors text-center w-full pt-4 mt-4 border-t border-slate-50">
                    View All Approvals
                  </button>
                </div>

              </div>

            </div>

            {/* Right Spanning Column (Theme Selector & Notifications) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Theme Settings Panel */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Sparkles size={14} className="text-blue-600 animate-pulse" />
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight">System Theme Settings</h4>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase font-mono">Options</span>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-4 leading-normal">
                    Calibrate the active theme. Switch between the classic SAP enterprise layout and our specialized dark mode.
                  </p>

                  <div className="space-y-3">
                    {/* SAP Classic Blue Light Option */}
                    <button
                      onClick={() => handleSetTheme(false)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer block ${
                        !darkMode 
                          ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-100' 
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-[var(--btn-hover-top)] border border-blue-400 shrink-0 flex items-center justify-center mt-0.5 shadow-sm">
                          {!darkMode && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">SAP Classic Blue</span>
                            <span className="bg-[#e6f2ff] text-[#0056b3] text-[8px] font-extrabold px-1 py-0.5 rounded uppercase border border-blue-200">Default</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1 leading-snug">
                            High-contrast corporate light. Recommended for standard daytime operations and standard office lighting.
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* High-Contrast Dark Option */}
                    <button
                      onClick={() => handleSetTheme(true)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer block ${
                        darkMode 
                          ? 'bg-blue-950/25 border-blue-800 shadow-sm ring-1 ring-blue-900/35' 
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-[#1c1e21] border border-slate-600 shrink-0 flex items-center justify-center mt-0.5 shadow-sm">
                          {darkMode && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5da5e1]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">High-Contrast Dark</span>
                            <span className="bg-slate-900 text-amber-400 text-[8px] font-extrabold px-1 py-0.5 rounded uppercase border border-slate-700 font-sans">Eye-Care</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1 leading-snug">
                            Calibrated low-light output. Specifically optimized to minimize optical fatigue and eye strain during long data-entry sessions.
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>ACTIVE RUNTIME: {darkMode ? 'DARK_EYE_CARE' : 'LIGHT_SAP_BLUE'}</span>
                  <span>CALIBRATED_STABLE</span>
                </div>
              </div>

              {/* Notifications Card */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-4">
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">Notifications</h4>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                      Mark all as read
                    </button>
                  </div>

                  <div className="space-y-4">
                    {screenshotNotifications.map((notif, idx) => {
                      const theme = notificationTheme[notif.theme] || notificationTheme.blue;
                      const Icon = notif.icon;
                      return (
                        <div key={idx} className="flex gap-3 group">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-50 shadow-xs ${theme.bg} ${theme.text}`}>
                            <Icon size={14} strokeWidth={2.2} />
                          </div>
                          <div className="flex-1 min-w-0 border-b border-slate-50 pb-3 group-last:border-0">
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-[11px] font-extrabold text-slate-800 leading-tight block">
                                {notif.title}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                                {notif.time}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block mt-1">
                              {notif.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors text-center w-full pt-4 mt-6 border-t border-slate-50 cursor-pointer">
                  View All Notifications
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
