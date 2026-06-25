import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { 
  Building2, Users, Receipt, CreditCard, Wallet, 
  AlertTriangle, AlertCircle, Calendar, LineChart, Banknote,
  Search, CheckCircle, Clock, Zap, Star, ArrowRight, Activity, Bell, FileText, ChevronRight, X, UserPlus, FilePlus, PlayCircle, BarChart3, HelpCircle, HardHat, DollarSign, Shield
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export interface DashboardProps {
  setCurrentTab?: (tab: string, title?: string, props?: any) => void;
}

const KPICard = ({ title, value, icon: Icon, trend, trendUp, theme }: any) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col relative overflow-hidden group`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 ${theme.bg}`}></div>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{title}</p>
          <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${theme.bg} ${theme.text}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          {trendUp === true && <span className="text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded"><ArrowRight size={12} className="-rotate-45 mr-0.5" />{trend}</span>}
          {trendUp === false && <span className="text-rose-600 flex items-center bg-rose-50 px-1.5 py-0.5 rounded"><ArrowRight size={12} className="rotate-45 mr-0.5" />{trend}</span>}
          {trendUp === null && <span className="text-slate-500 flex items-center bg-slate-50 px-1.5 py-0.5 rounded">{trend}</span>}
        </div>
      )}
    </motion.div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab = () => {} }) => {
  const erpData = useAppContext();
  const { 
    user, projects, workers, billings, clientPayments, expensesLedger, 
    assets = [], materialPurchases, workerPayments, kharchis, advances, attendance,
    approvals = [], kharchiApprovals = [], advanceSheetApprovals = [], paymentSheetApprovals = [],
    subcontractors = [], subcontractorBills = [], subcontractorPayments = [], activityLogs = [], dmsDocuments = []
  } = erpData as any;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Time & Date calculations
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [currentTime]);

  const todayStr = currentTime.toISOString().substring(0, 10);
  const currentMonthStr = todayStr.substring(0, 7);
  
  // Financial Year Calculation
  const currentMonth = currentTime.getMonth() + 1;
  const currentYear = currentTime.getFullYear();
  const fyStart = currentMonth < 4 ? currentYear - 1 : currentYear;
  const fyString = `FY ${fyStart}-${(fyStart + 1).toString().substring(2)}`;

  // --- KPI Calculations ---
  const activeProjects = projects.filter((p: any) => p.status === 'Ongoing');
  const activeWorkers = workers.filter((w: any) => !w.exitDate || w.exitDate >= todayStr);
  const presentToday = attendance.filter((a: any) => a.date === todayStr && a.status === 'Present').length;
  
  const monthlyBilling = billings.filter((b: any) => b.month === currentMonthStr || b.certifyDate?.startsWith(currentMonthStr)).reduce((sum: number, b: any) => sum + b.amount, 0);
  const monthlyCollection = clientPayments.filter((cp: any) => cp.date.startsWith(currentMonthStr)).reduce((sum: number, cp: any) => sum + cp.amountReceived, 0);
  
  const totalBilled = billings.reduce((sum: number, b: any) => sum + b.amount, 0);
  const totalReceived = clientPayments.reduce((sum: number, cp: any) => sum + cp.amountReceived, 0);
  const outstandingCollection = totalBilled - totalReceived;

  const totalMonthlyExpenses = expensesLedger.filter((e: any) => e.date.startsWith(currentMonthStr)).reduce((sum: number, el: any) => {
    return sum + (el.kharchi || 0) + (el.mess || 0) + (el.workerAdvance || 0) + (el.tiffin || 0) + (el.travel || 0) + (el.machineryMaterial || 0) + (el.workerPayment || 0) + (el.stationery || 0) + (el.others || 0);
  }, 0) + materialPurchases.filter((mp: any) => mp.purchaseDate.startsWith(currentMonthStr)).reduce((s: number, m: any) => s + m.totalAmount, 0);

  const pendingApprovalsCount = 
    (approvals?.filter((a: any) => a.status === 'Pending').length || 0) +
    (kharchiApprovals?.filter((a: any) => a.status === 'Pending').length || 0) +
    (advanceSheetApprovals?.filter((a: any) => a.status === 'Pending').length || 0) +
    (paymentSheetApprovals?.filter((a: any) => a.status === 'Pending').length || 0) +
    (subcontractorBills?.filter((b: any) => b.status === 'Pending').length || 0);

  // Formatting helpers
  const formatIN = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const formatShort = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  // Cash Flow
  const expectedPayments = pendingApprovalsCount * 50000; // Mock calculation for expected payments
  const netCashPosition = outstandingCollection - expectedPayments;

  // Project Health
  const projectsHealth = activeProjects.map((p: any) => {
    const pb = billings.filter((b: any) => b.projectId === p.id).reduce((s: number, b: any) => s + b.amount, 0);
    const pr = clientPayments.filter((cp: any) => cp.projectId === p.id).reduce((s: number, cp: any) => s + cp.amountReceived, 0);
    const colRatio = pb > 0 ? pr / pb : 1;
    let health = 'Healthy';
    if (colRatio < 0.5) health = 'Critical';
    else if (colRatio < 0.8) health = 'Warning';
    return { ...p, health, billed: pb, collected: pr, ratio: colRatio };
  });
  
  const healthyCount = projectsHealth.filter((p:any) => p.health === 'Healthy').length;
  const warningCount = projectsHealth.filter((p:any) => p.health === 'Warning').length;
  const criticalCount = projectsHealth.filter((p:any) => p.health === 'Critical').length;

  // AI Insights
  const profitableProject = [...projectsHealth].sort((a:any, b:any) => b.collected - a.collected)[0];
  const highExpenseProject = [...activeProjects][0]; // mock
  const topOutstanding = [...projectsHealth].sort((a:any, b:any) => (b.billed - b.collected) - (a.billed - a.collected))[0];

  return (
    <div className="flex flex-col h-full bg-[#f4f7f9] overflow-hidden font-sans">
      
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            <span className="text-slate-400 font-medium">{greeting},</span> {user?.name || user?.username || 'Tousif Reja'}
          </h1>
          <div className="text-sm text-slate-500 flex items-center gap-2 mt-1 font-medium">
            <Calendar size={14} className="text-blue-600" />
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <span className="text-slate-300">|</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">{fyString}</span>
          </div>
        </div>
        
        <div className="w-full md:w-96 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-inner"
            placeholder="Search projects, workers, bills, reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12">

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <KPICard title="Active Projects" value={activeProjects.length} icon={Building2} trend="2 Starting Soon" trendUp={null} theme={{ bg: 'bg-blue-100', text: 'text-blue-600' }} />
            <KPICard title="Active Workers" value={activeWorkers.length} icon={HardHat} trend={`${presentToday} Present`} trendUp={true} theme={{ bg: 'bg-teal-100', text: 'text-teal-600' }} />
            <KPICard title="Pending Approvals" value={pendingApprovalsCount} icon={CheckCircle} trend="Requires Action" trendUp={null} theme={{ bg: 'bg-rose-100', text: 'text-rose-600' }} />
            <KPICard title="Billing (Month)" value={formatShort(monthlyBilling)} icon={Receipt} trend="+12% from last" trendUp={true} theme={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} />
            <KPICard title="Collection (Month)" value={formatShort(monthlyCollection)} icon={Wallet} trend="On target" trendUp={true} theme={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }} />
            <KPICard title="Outstanding" value={formatShort(outstandingCollection)} icon={AlertTriangle} trend="High priority" trendUp={false} theme={{ bg: 'bg-amber-100', text: 'text-amber-600' }} />
            <KPICard title="Expenses (Month)" value={formatShort(totalMonthlyExpenses)} icon={CreditCard} trend="-4% budget" trendUp={true} theme={{ bg: 'bg-purple-100', text: 'text-purple-600' }} />
            <KPICard title="Subcontractors" value={subcontractors.length} icon={Users} trend="Active Contracts" trendUp={null} theme={{ bg: 'bg-cyan-100', text: 'text-cyan-600' }} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN (Wider) */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* Quick Actions */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500 fill-amber-500" /> Quick Actions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Add Attendance', icon: UserPlus, tab: 'workers', color: 'text-teal-600', bg: 'bg-teal-50 hover:bg-teal-100 border-teal-100', dot: 'bg-teal-400' },
                    { label: 'Worker Advance', icon: Banknote, tab: 'advance', color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-100', dot: 'bg-rose-400' },
                    { label: 'Worker Payment', icon: CreditCard, tab: 'worker-payment', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100', dot: 'bg-blue-400' },
                    { label: 'Floor Abstract', icon: Building2, tab: 'floor-abstracts', color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100', dot: 'bg-indigo-400' },
                    { label: 'Create Bill', icon: Receipt, tab: 'billing', color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-100', dot: 'bg-purple-400' },
                    { label: 'Client Payment', icon: DollarSign, tab: 'client-payment', color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100', dot: 'bg-emerald-400' },
                    { label: 'Add Expense', icon: Wallet, tab: 'expenses', color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100', dot: 'bg-amber-400' },
                    { label: 'Material Issue', icon: FilePlus, tab: 'materials', color: 'text-cyan-600', bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-100', dot: 'bg-cyan-400' },
                    { label: 'Subcontractor Bill', icon: FileText, tab: 'subcontractors-billing', color: 'text-slate-600', bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
                  ].map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentTab(action.tab)}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${action.bg} group`}
                    >
                      <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${action.dot} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                      <div className={`p-2.5 rounded-full bg-white shadow-sm mb-3 group-hover:scale-110 transition-transform`}>
                        <action.icon size={20} className={action.color} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 text-center leading-tight">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Continue Working & Favorites (Row) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Continue Working */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <PlayCircle size={14} className="text-blue-500 fill-blue-100" /> Continue Working
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: 'Floor Abstract - Tower A', type: 'floor-abstracts', time: '10 mins ago', desc: 'S3 Eco City' },
                      { name: 'Worker Payment - June 2026', type: 'worker-payment', time: '1 hour ago', desc: 'Draft Payment Sheet' },
                      { name: `Client Payment - ${activeProjects[0]?.name || 'Project A'}`, type: 'client-payment', time: '3 hours ago', desc: 'Pending verification' },
                    ].map((item, idx) => (
                      <div key={idx} onClick={() => setCurrentTab(item.type)} className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors group">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                            <FileText size={16} className="text-slate-500 group-hover:text-blue-600" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-700 group-hover:text-blue-800 block leading-none">{item.name}</span>
                            <span className="text-[10px] font-medium text-slate-400 mt-1 block">{item.desc}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Favorites */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Star size={14} className="text-amber-400 fill-amber-400" /> Pinned Favorites
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    {[
                      { name: activeProjects[0]?.name || 'S3 Eco City', icon: Building2, tab: 'projects' },
                      { name: 'Subcontractor Audit', icon: Shield, tab: 'subcontractors-audit' },
                      { name: 'Expenses Ledger', icon: Wallet, tab: 'expenses' },
                      { name: 'Daily Site Summary', icon: BarChart3, tab: 'daily-site-summary' },
                      { name: 'Worker Directory', icon: Users, tab: 'workers' },
                      { name: 'Document Center', icon: FileText, tab: 'dms' },
                    ].map((fav, idx) => (
                      <button key={idx} onClick={() => setCurrentTab(fav.tab)} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-amber-200 hover:shadow-sm text-left transition-all">
                        <div className="p-1.5 bg-white rounded-md shadow-sm">
                          <fav.icon size={14} className="text-amber-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate">{fav.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Projects Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} className="text-indigo-500" /> Active Projects Overview
                  </h3>
                  <button onClick={() => setCurrentTab('projects')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                    View All <ChevronRight size={14} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                        <th className="p-4 pl-6">Project Name</th>
                        <th className="p-4">Health</th>
                        <th className="p-4 text-right">Progress</th>
                        <th className="p-4 text-center">Workers</th>
                        <th className="p-4 text-right">Billed</th>
                        <th className="p-4 text-right">Collected</th>
                        <th className="p-4 text-center pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projectsHealth.slice(0, 5).map((p: any) => {
                        const progress = p.budget ? Math.min(100, Math.round((p.billed / p.budget) * 100)) : 0;
                        const pWorkers = workers.filter((w:any) => w.projectId === p.id && (!w.exitDate || w.exitDate >= todayStr)).length;
                        return (
                          <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="p-4 pl-6 font-bold text-slate-800">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100">
                                  {p.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  {p.name}
                                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{p.clientName || 'SN Enterprises'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                p.health === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                p.health === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {p.health}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-mono text-xs font-bold text-slate-700">{progress}%</span>
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center font-mono font-bold text-slate-600">{pWorkers}</td>
                            <td className="p-4 text-right font-mono font-bold text-slate-700">{formatShort(p.billed)}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-600">{formatShort(p.collected)}</td>
                            <td className="p-4 text-center pr-6">
                              <button onClick={() => setCurrentTab('site-monthly-summary', `Summary: ${p.name}`, { projectId: p.id })} className="text-xs font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 bg-blue-50 border border-blue-100">
                                Dashboard
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (Narrower) */}
            <div className="space-y-6">
              
              {/* AI Insights Section */}
              <div className="bg-gradient-to-br from-slate-900 via-[#0a192f] to-indigo-950 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 opacity-20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-2xl -ml-10 -mb-10"></div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest mb-5 flex items-center gap-2 text-indigo-200">
                  <Star size={14} className="text-amber-400 fill-amber-400" /> AI Business Insights
                </h3>
                <div className="space-y-3 relative z-10">
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 backdrop-blur-md">
                    <p className="text-[9px] text-indigo-300 uppercase font-black tracking-widest mb-1.5">Most Profitable Project</p>
                    <p className="text-sm font-bold text-white">{profitableProject?.name || 'N/A'}</p>
                    <p className="text-[11px] text-indigo-200 mt-1 font-medium">{formatIN(profitableProject?.collected || 0)} collected to date.</p>
                  </div>
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 backdrop-blur-md">
                    <p className="text-[9px] text-amber-300 uppercase font-black tracking-widest mb-1.5">Highest Outstanding</p>
                    <p className="text-sm font-bold text-white">{topOutstanding?.name || 'N/A'}</p>
                    <p className="text-[11px] text-amber-100 mt-1 font-medium">{formatIN((topOutstanding?.billed || 0) - (topOutstanding?.collected || 0))} pending collection.</p>
                  </div>
                  <div className="bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20 backdrop-blur-md flex items-start gap-3">
                    <div className="p-1.5 bg-rose-500/20 rounded-lg">
                      <AlertCircle size={16} className="text-rose-300" />
                    </div>
                    <div>
                      <p className="text-[9px] text-rose-300 uppercase font-black tracking-widest mb-1.5">Cash Flow Warning</p>
                      <p className="text-[11px] text-rose-100 leading-relaxed font-medium">Expected payouts ({formatShort(expectedPayments)}) are approaching net cash availability. Accelerate receivables.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" /> Pending Approvals
                  </h3>
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">{pendingApprovalsCount}</span>
                </div>
                <div className="space-y-2.5">
                  {approvals.slice(0,2).map((a:any) => (
                    <div key={a.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Worker Payment Auth</p>
                        <p className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">{formatIN(a.amount)}</p>
                      </div>
                      <button onClick={() => setCurrentTab('approvals')} className="text-[10px] font-bold text-blue-600 border border-blue-200 bg-white px-2.5 py-1 rounded shadow-sm hover:bg-blue-50 transition-colors">Review</button>
                    </div>
                  ))}
                  {subcontractorBills.filter((b:any)=>b.status==='Pending').slice(0,2).map((b:any) => (
                    <div key={b.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Subcontractor Bill</p>
                        <p className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">{formatIN(b.totalAmount)}</p>
                      </div>
                      <button onClick={() => setCurrentTab('subcontractors-billing')} className="text-[10px] font-bold text-blue-600 border border-blue-200 bg-white px-2.5 py-1 rounded shadow-sm hover:bg-blue-50 transition-colors">Review</button>
                    </div>
                  ))}
                  {pendingApprovalsCount === 0 && (
                    <div className="text-center p-6 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-lg bg-slate-50">
                      All caught up! No pending approvals.
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Center */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Bell size={14} className="text-rose-500 fill-rose-100" /> Notifications
                </h3>
                <div className="space-y-4 relative">
                  <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200"></div>
                  {[
                    { text: 'Retention release due for Project City Center', type: 'warning', time: 'Today' },
                    { text: 'Worker payments for 42 workers are pending', type: 'info', time: 'Yesterday' },
                    { text: 'Client payment of ₹25L received for S3 Eco City', type: 'success', time: '2 days ago' },
                  ].map((notif, idx) => (
                    <div key={idx} className="flex gap-4 relative z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${
                        notif.type === 'warning' ? 'bg-amber-100 text-amber-600' : notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {notif.type === 'warning' ? <AlertCircle size={12} strokeWidth={3} /> : notif.type === 'success' ? <CheckCircle size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={3} />}
                      </div>
                      <div className="pt-1.5">
                        <p className="text-xs font-bold text-slate-700 leading-tight">{notif.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">{notif.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Flow Snapshot */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Wallet size={14} className="text-emerald-500" /> Cash Flow Snapshot
                </h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Expected Collection</span>
                    <span className="font-mono font-black text-sm text-emerald-600">{formatIN(outstandingCollection)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Expected Payments</span>
                    <span className="font-mono font-black text-sm text-rose-600">{formatIN(expectedPayments)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-slate-800 font-black text-xs uppercase tracking-widest">Net Position</span>
                    <span className={`font-mono font-black text-xl ${netCashPosition >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatIN(netCashPosition)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Labour & Subcontractor Summary (Combined Mini Cards) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group" onClick={() => setCurrentTab('subcontractors-master')}>
                  <div className="w-10 h-10 mx-auto bg-cyan-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-cyan-100 transition-colors">
                    <Users size={18} className="text-cyan-600" />
                  </div>
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Subcontractors</h4>
                  <p className="text-2xl font-black font-mono text-slate-800 mt-1">{subcontractors.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group" onClick={() => setCurrentTab('workers')}>
                  <div className="w-10 h-10 mx-auto bg-teal-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                    <HardHat size={18} className="text-teal-600" />
                  </div>
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Labour Force</h4>
                  <p className="text-2xl font-black font-mono text-slate-800 mt-1">{activeWorkers.length}</p>
                </div>
              </div>

            </div>
          </div>
          
          {/* Recent System Activities */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-6">
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Activity size={14} className="text-blue-500" /> Recent System Activities
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {activityLogs.slice(0, 5).map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 py-3 w-12 pl-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 border border-slate-200">
                          {log.userName?.substring(0, 2).toUpperCase() || 'AD'}
                        </div>
                      </td>
                      <td className="p-3 py-3">
                        <p className="text-xs font-bold text-slate-800">{log.action}</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-1">{log.details}</p>
                      </td>
                      <td className="p-3 py-3 text-right whitespace-nowrap pr-0">
                        <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded inline-block border border-slate-100">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activityLogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-lg">No recent activities logged in the system.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-center mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => setCurrentTab('activity-log')} className="text-xs font-black uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 mx-auto bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100">
                View Full Audit Trail <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Workspace Footer */}
          <footer className="mt-12 py-8 border-t border-slate-200 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-center gap-5 text-xs font-black text-slate-500 tracking-wider">
              <span className="text-indigo-900">SN ENTERPRISES ERP</span>
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
              <span>VERSION 2.0.0 ENTERPRISE</span>
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
              <span>LOGGED IN AS: {user?.name || user?.username || 'ADMIN'}</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">
              <span>FINANCIAL YEAR: {fyString}</span>
              <span>•</span>
              <span>DATABASE LAST BACKUP: {new Date().toLocaleDateString()} 02:00 AM</span>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
};
