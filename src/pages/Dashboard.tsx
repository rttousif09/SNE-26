import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { 
  Building2, Users, Receipt, CreditCard, Wallet, 
  AlertTriangle, AlertCircle, Calendar, LineChart, Banknote
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AnimatedCounter } from '../components/AnimatedERP';


export const Dashboard: React.FC = () => {
  const { 
    user, projects, workers, billings, clientPayments, expensesLedger, 
    labourPlannings, assets = [], trackedBills, materialPurchases,
    workerPayments, kharchis, advances, attendance
  } = useAppContext();

  const isAdmin = (user as any)?.role === 'admin' || user?.username === 'saddamsne' || user?.username === 'rejatousifsne' || user?.username === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <AlertTriangle size={48} className="text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
        <p className="text-gray-600 mt-2">Only Owner and Super Admin can view the Executive Dashboard.</p>
      </div>
    );
  }

  // Calculate Metrics
  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonthStr = todayStr.substring(0, 7);

  // 1. Projects
  const activeProjectsCount = projects.length;
  const completedProjectsCount = 0; // TBD if we have status locally, assuming all active for now.

  // 2. Workers
  const activeWorkersCount = workers.filter(w => !w.exitDate || w.exitDate >= todayStr).length;
  const workersPresentToday = attendance.filter(a => a.date === todayStr && a.status === 'Present').length;
  const workersOnLeave = attendance.filter(a => a.date === todayStr && (a.status === 'Absent' || a.status === 'Leave')).length;

  // 3. Billing & Receipts (Monthly)
  const monthlyBilling = billings.filter(b => b.month === currentMonthStr || b.certifyDate?.startsWith(currentMonthStr)).reduce((s, b) => s + b.amount, 0);
  const monthlyReceipts = clientPayments.filter(cp => cp.date.startsWith(currentMonthStr)).reduce((sum, cp) => sum + cp.amountReceived, 0);

  // Financial Summary (Total)
  const totalBilled = billings.reduce((sum, b) => sum + b.amount, 0);
  const totalReceived = clientPayments.reduce((sum, cp) => sum + cp.amountReceived, 0);
  const totalOutstandingReceivable = totalBilled - totalReceived;

  // Expenses & Labour Cost
  const totalExpenses = expensesLedger.reduce((sum, el) => {
    return sum + (el.kharchi || 0) + (el.mess || 0) + (el.workerAdvance || 0) + (el.tiffin || 0) + (el.travel || 0) + (el.machineryMaterial || 0) + (el.workerPayment || 0) + (el.stationery || 0) + (el.others || 0);
  }, 0);
  const totalWorkerPayments = workerPayments.reduce((s, wp) => s + wp.netPayment, 0);
  const totalKharchi = kharchis.reduce((s, k) => s + k.amount, 0);
  const totalMaterialPurchases = materialPurchases.reduce((s, m) => s + m.totalAmount, 0);

  const totalCalculatedExpenses = totalWorkerPayments + totalKharchi + totalMaterialPurchases + totalExpenses;
  const netProfit = totalBilled - totalCalculatedExpenses;

  const currentCash = totalReceived - totalCalculatedExpenses; // basic proxy for cash

  // Advances
  const totalAdvanceGiven = advances.reduce((s, a) => s + a.amount, 0);
  const totalAdvanceRecovered = advances.filter(a => a.isDeducted).reduce((s, a) => s + (a.deductionAmount || 0), 0);
  const outstandingAdvance = totalAdvanceGiven - totalAdvanceRecovered;

  // Equipment & Inventory Value
  const equipmentValue = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);

  // This Week Labour Payment (Proxy: approx upcoming planning count or unresolved worker payments)
  const upcomingWorkerPayments = 0; // TBD logic for weekly

  // Trend Data for Charts
  // We'll create last 6 months data
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().substring(0, 7));
  }

  const trendData = months.map(m => {
    const billing = billings.filter(b => b.month === m || b.certifyDate?.startsWith(m)).reduce((s, b) => s + b.amount, 0);
    const receipt = clientPayments.filter(cp => cp.date.startsWith(m)).reduce((sum, cp) => sum + cp.amountReceived, 0);
    const labCost = 
      workerPayments.filter(wp => wp.month === m || wp.date.startsWith(m)).reduce((s, w) => s + w.netPayment, 0) +
      kharchis.filter(k => k.date.startsWith(m)).reduce((s, k) => s + k.amount, 0);
    const exp = 
      expensesLedger.filter(e => e.date.startsWith(m)).reduce((s, el) => s + (el.tiffin || 0) + (el.travel || 0) + (el.machineryMaterial || 0) + (el.stationery || 0) + (el.others || 0), 0) +
      materialPurchases.filter(mp => mp.purchaseDate.startsWith(m)).reduce((s, x) => s + x.totalAmount, 0);
    
    return {
      name: m,
      Billing: billing,
      Receipts: receipt,
      Cost: labCost + exp,
      Profit: billing - (labCost + exp)
    };
  });

  const SectionHeader = ({ title, icon }: { title: string, icon?: React.ReactNode }) => (
    <div className="sap-header px-2 py-1 font-semibold text-[#000000] text-[11px] mb-2 flex justify-between border border-[#8c9ba8] items-center">
      <div className="flex items-center gap-1.5">
        {icon}
        <span>{title}</span>
      </div>
    </div>
  );

  const KeyValue = ({ label, value, important = false }: { label: string, value: React.ReactNode, important?: boolean }) => (
    <div className="flex mb-1.5 items-center justify-between">
      <div className={`${important ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{label}:</div>
      <div className={`text-right font-mono ${important ? 'font-bold text-gray-900' : 'text-gray-800'}`}>{value}</div>
    </div>
  );

  const formatIN = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <motion.div 
      initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      className="text-[11px] flex flex-col space-y-3 h-full overflow-y-auto pb-6 pr-2"
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-black text-[#002f6c] tracking-tight">Executive Business Health Dashboard</h2>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <button className="sap-btn text-[#0056b3]">Record Worker Payment</button>
          <button className="sap-btn text-rose-700">Add Expense</button>
          <button className="sap-btn">View Outstanding Receivables</button>
          <button className="sap-btn">Add Billing</button>
          <button className="sap-btn bg-emerald-600 text-white border-emerald-700">Record Client Payment</button>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <div className="border border-[#8c9ba8] border-t-3 border-t-[#002f6c] bg-white p-2.5 flex flex-col shadow-sm">
          <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Active Projects</span>
          <span className="text-xl font-black text-blue-900 mt-1">
            <AnimatedCounter value={activeProjectsCount} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-indigo-700 bg-white p-2.5 flex flex-col shadow-sm">
          <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Active Workers</span>
          <span className="text-xl font-black text-indigo-900 mt-1">
            <AnimatedCounter value={activeWorkersCount} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-emerald-600 bg-white p-2.5 flex flex-col shadow-sm bg-emerald-50/40">
          <span className="text-emerald-800 font-bold uppercase text-[9px] tracking-wider">Current Cash Pos.</span>
          <span className="text-xl font-black text-emerald-900 mt-1">
            <AnimatedCounter value={currentCash} formatter={formatIN} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-blue-500 bg-white p-2.5 flex flex-col shadow-sm bg-blue-50/40">
          <span className="text-blue-800 font-bold uppercase text-[9px] tracking-wider">Monthly Billing</span>
          <span className="text-xl font-black text-blue-900 mt-1">
            <AnimatedCounter value={monthlyBilling} formatter={formatIN} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-teal-600 bg-white p-2.5 flex flex-col shadow-sm bg-teal-50/40">
          <span className="text-teal-800 font-bold uppercase text-[9px] tracking-wider">Monthly Receipts</span>
          <span className="text-xl font-black text-teal-900 mt-1">
            <AnimatedCounter value={monthlyReceipts} formatter={formatIN} />
          </span>
        </div>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <div className="border border-[#8c9ba8] border-t-3 border-t-amber-500 bg-white p-2.5 flex flex-col shadow-sm bg-amber-50/40">
          <span className="text-amber-800 font-bold uppercase text-[9px] tracking-wider">Out. Receivables</span>
          <span className="text-xl font-black text-amber-900 mt-1">
            <AnimatedCounter value={totalOutstandingReceivable} formatter={formatIN} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-red-500 bg-white p-2.5 flex flex-col shadow-sm bg-red-50/40">
          <span className="text-red-800 font-bold uppercase text-[9px] tracking-wider">Worker Adv. Out.</span>
          <span className="text-xl font-black text-red-900 mt-1">
            <AnimatedCounter value={outstandingAdvance} formatter={formatIN} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-rose-500 bg-white p-2.5 flex flex-col shadow-sm bg-rose-50/40">
          <span className="text-rose-800 font-bold uppercase text-[9px] tracking-wider">Monthly Profit</span>
          <span className={`text-xl font-black mt-1 ${trendData[trendData.length-1].Profit >= 0 ? 'text-emerald-700' : 'text-rose-900'}`}>
            <AnimatedCounter value={trendData[trendData.length-1].Profit} formatter={formatIN} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-slate-500 bg-white p-2.5 flex flex-col shadow-sm">
          <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Equipment Value</span>
          <span className="text-xl font-black text-gray-900 mt-1">
            <AnimatedCounter value={equipmentValue} formatter={formatIN} />
          </span>
        </div>
        <div className="border border-[#8c9ba8] border-t-3 border-t-purple-600 bg-white p-2.5 flex flex-col shadow-sm">
          <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Total Expenses (All Time)</span>
          <span className="text-xl font-black text-gray-900 mt-1">
            <AnimatedCounter value={totalCalculatedExpenses} formatter={formatIN} />
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column: Summaries */}
        <div className="flex flex-col space-y-3 lg:col-span-1">
          {/* Financial Summary */}
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <SectionHeader title="Financial Summary" icon={<Wallet size={12}/>} />
            <div className="px-2 pb-2 bg-white border border-[#8c9ba8] pt-2 shadow-sm">
              <KeyValue label="Total Billing" value={formatIN(totalBilled)} />
              <KeyValue label="Total Received" value={<span className="text-emerald-700">{formatIN(totalReceived)}</span>} />
              <div className="my-1 border-b border-dashed border-gray-300"></div>
              <KeyValue label="Outstanding Receivable" value={<span className="text-amber-600">{formatIN(totalOutstandingReceivable)}</span>} />
              <KeyValue label="Total Core Expenses" value={<span className="text-red-700">{formatIN(totalCalculatedExpenses)}</span>} />
              <div className="my-1 border-b border-gray-300"></div>
              <KeyValue label="Net Profit (All Time)" important value={<span className={netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatIN(netProfit)}</span>} />
            </div>
          </motion.div>

          {/* Labour Summary */}
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <SectionHeader title="Labour Summary" icon={<Users size={12}/>} />
            <div className="px-2 pb-2 bg-white border border-[#8c9ba8] pt-2 shadow-sm">
              <KeyValue label="Total Workers" value={activeWorkersCount} />
              <KeyValue label="Present Today" value={<span className="text-emerald-700">{workersPresentToday}</span>} />
              <KeyValue label="On Leave/Absent" value={<span className="text-rose-600">{workersOnLeave}</span>} />
              <div className="my-1 border-b border-dashed border-gray-300"></div>
              <KeyValue label="Total Advance Balance" value={<span className="text-amber-700 font-bold">{formatIN(outstandingAdvance)}</span>} />
            </div>
          </motion.div>

          {/* Payment Summary */}
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <SectionHeader title="Payment Action Required" icon={<Banknote size={12}/>} />
            <div className="px-2 pb-2 bg-white border border-[#8c9ba8] pt-2 shadow-sm">
              <KeyValue label="Client Payments Due" value={<span className="text-rose-600 font-bold">1 Alert</span>} />
              <KeyValue label="Supplier Payments Due" value="Check Ledger" />
              <KeyValue label="Upcoming Labour Payments" value="Check Worker Ledger" />
            </div>
          </motion.div>
        </div>

        {/* Middle Column: Charts & Projects */}
        <div className="flex flex-col space-y-3 lg:col-span-2">
          {/* Charts */}
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <SectionHeader title="Trend Analytics (Last 6 Months)" icon={<LineChart size={12}/>} />
            <div className="bg-white border border-[#8c9ba8] shadow-sm p-3 h-64 flex flex-col">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={trendData} margin={{ top: 5, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 9}} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{fontSize: '11px', padding: '5px'}} 
                    formatter={(val: number) => formatIN(val)}
                  />
                  <Bar dataKey="Billing" fill="#002f6c" name="Billing" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Receipts" fill="#10b981" name="Receipts" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Cost" fill="#f43f5e" name="Expenses+Labor" radius={[2, 2, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Project Summary */}
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <SectionHeader title="Project-wise Health" icon={<Building2 size={12}/>} />
            <div className="bg-white border border-[#8c9ba8] shadow-sm overflow-x-auto">
              <table className="sap-table w-full text-left">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b">
                    <th className="p-2">Project Name</th>
                    <th className="p-2 text-right">Billed Amount</th>
                    <th className="p-2 text-right">Received</th>
                    <th className="p-2 text-right">Outstanding</th>
                    <th className="p-2 text-center">Collection %</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => {
                    const pb = billings.filter(b => b.projectId === p.id).reduce((s, b) => s + b.amount, 0);
                    const pr = clientPayments.filter(cp => cp.projectId === p.id).reduce((s, cp) => s + cp.amountReceived, 0);
                    const out = pb - pr;
                    const ratio = pb > 0 ? (pr / pb) * 100 : 0;
                    return (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-bold text-gray-800">{p.name}</td>
                        <td className="p-2 text-right font-mono">{formatIN(pb)}</td>
                        <td className="p-2 text-right font-mono text-emerald-700">{formatIN(pr)}</td>
                        <td className="p-2 text-right font-mono text-amber-700">{formatIN(out)}</td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ratio >= 90 ? 'bg-emerald-100 text-emerald-800' : ratio >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                            {ratio.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Alerts Section */}
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <SectionHeader title="Critical Action Alerts" icon={<AlertCircle size={12}/>} />
            <div className="bg-white border border-red-200 bg-red-50 p-2 shadow-sm space-y-2">
              {totalOutstandingReceivable > 1000000 && (
                <div className="flex items-start text-red-800">
                  <span className="w-3.5 h-3.5 bg-red-600 text-white text-[9px] flex items-center justify-center font-bold mr-2 mt-0.5 rounded-sm shrink-0">!</span> 
                  <div>
                    <span className="font-bold">High Outstanding Client Receivables:</span> Collect {formatIN(totalOutstandingReceivable)} across all projects immediately to maintain cash flow.
                  </div>
                </div>
              )}
              {outstandingAdvance > 500000 && (
                <div className="flex items-start text-amber-800">
                  <span className="w-3.5 h-3.5 bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold mr-2 mt-0.5 rounded-sm shrink-0">!</span> 
                  <div>
                    <span className="font-bold">High Worker Advance Balance:</span> Total outstanding advances are {formatIN(outstandingAdvance)}. Accelerate deductions from upcoming payrolls.
                  </div>
                </div>
              )}
              {currentCash < 100000 && (
                <div className="flex items-start text-rose-800">
                  <span className="w-3.5 h-3.5 bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold mr-2 mt-0.5 rounded-sm shrink-0">!</span> 
                  <div>
                    <span className="font-bold">Low Cash Position Warning:</span> Operating cash flow balance is critically low at {formatIN(currentCash)}. Review immediate outgoing liabilities.
                  </div>
                </div>
              )}
              <div className="flex items-start text-blue-800">
                <span className="w-3.5 h-3.5 bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold mr-2 mt-0.5 rounded-sm shrink-0">i</span> 
                <div>
                  <span className="font-bold">Pending Bill Certifications:</span> Ensure tracking of RA bills pending client approval.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

