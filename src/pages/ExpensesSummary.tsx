import React, { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { ExpenseEntry } from '../types';
import { 
  ArrowDownLeft, ArrowUpRight, Wallet, Calendar, PiggyBank, 
  TrendingUp, CreditCard, ShoppingBag, Truck, HardHat, PenTool, Layers, ExternalLink, ArrowRight, Printer, X
} from 'lucide-react';
import { motion } from 'motion/react';

export const ExpensesSummary: React.FC = () => {
  const { expensesLedger, projects } = useAppContext();
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string | null>(null);
  const [isPrintView, setIsPrintView] = useState(false);

  // Parse Ledger and compute chronological list
  const processedLedger = useMemo(() => {
    const sorted = [...expensesLedger].sort((a, b) => a.date.localeCompare(b.date));
    let runningBalance = 0;
    
    return sorted.map(item => {
      const totalSpent = 
        (item.kharchi || 0) + (item.mess || 0) + (item.workerAdvance || 0) + 
        (item.tiffin || 0) + (item.travel || 0) + (item.machineryMaterial || 0) + 
        (item.workerPayment || 0) + (item.stationery || 0) + (item.others || 0);

      runningBalance = runningBalance + (item.crBalance || 0) - totalSpent;

      return {
        ...item,
        totalSpent,
        avlBalance: runningBalance
      };
    });
  }, [expensesLedger]);

  // Aggregate Key Statistics
  const stats = useMemo(() => {
    let totalOwnerFunds = 0;
    let totalSpent = 0;

    const categoryTotals = {
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

    const ownerCreditsList: ExpenseEntry[] = [];
    const spentTransactions: ExpenseEntry[] = [];

    processedLedger.forEach(item => {
      if (item.crBalance > 0) {
        totalOwnerFunds += item.crBalance;
        ownerCreditsList.push(item);
      } else {
        const itemSpent = 
          (item.kharchi || 0) + (item.mess || 0) + (item.workerAdvance || 0) + 
          (item.tiffin || 0) + (item.travel || 0) + (item.machineryMaterial || 0) + 
          (item.workerPayment || 0) + (item.stationery || 0) + (item.others || 0);
        
        totalSpent += itemSpent;
        spentTransactions.push(item);

        categoryTotals.kharchi += item.kharchi || 0;
        categoryTotals.mess += item.mess || 0;
        categoryTotals.workerAdvance += item.workerAdvance || 0;
        categoryTotals.tiffin += item.tiffin || 0;
        categoryTotals.travel += item.travel || 0;
        categoryTotals.machineryMaterial += item.machineryMaterial || 0;
        categoryTotals.workerPayment += item.workerPayment || 0;
        categoryTotals.stationery += item.stationery || 0;
        categoryTotals.others += item.others || 0;
      }
    });

    const isCreditEmpty = processedLedger.length === 0;
    const finalBalance = isCreditEmpty ? 0 : processedLedger[processedLedger.length - 1].avlBalance;

    return {
      totalOwnerFunds,
      totalSpent,
      availableBalance: finalBalance,
      categoryTotals,
      ownerCreditsList: ownerCreditsList.reverse(), // latest credit first
      spentTransactions: spentTransactions.reverse() // latest spent first
    };
  }, [processedLedger]);

  // Project Helper
  const getProjectName = (id?: string) => {
    if (!id) return '';
    const proj = projects.find(p => p.id === id);
    return proj ? proj.name : id;
  };

  // Icon mapping for categories
  const categoryMeta: { [key: string]: { label: string; icon: any; color: string; desc: string } } = {
    kharchi: { label: 'Kharchi (Pocket Money)', icon: PocketMoneyIcon, color: 'bg-amber-500 text-white', desc: 'Site cash allowance' },
    mess: { label: 'Mess / Fooding', icon: PiggyBank, color: 'bg-purple-500 text-white', desc: 'Weekly mess & rations' },
    workerAdvance: { label: 'Worker Advance', icon: HardHat, color: 'bg-red-500 text-white', desc: 'Pre-work payments' },
    tiffin: { label: 'Tiffin / Snacks', icon: PocketMoneyIcon, color: 'bg-blue-500 text-white', desc: 'Daily workers tea & snacks' },
    travel: { label: 'Travel Expenses', icon: Truck, color: 'bg-cyan-500 text-white', desc: 'Tickets & conveyance' },
    machineryMaterial: { label: 'Machinery & Materials', icon: PenTool, color: 'bg-orange-500 text-white', desc: 'Tools, concrete or repairs' },
    workerPayment: { label: 'Worker Payment', icon: HardHat, color: 'bg-emerald-500 text-white', desc: 'Final worker wages' },
    stationery: { label: 'Stationery', icon: PenTool, color: 'bg-pink-500 text-white', desc: 'Bills printing, registers' },
    others: { label: 'Others', icon: Layers, color: 'bg-slate-500 text-white', desc: 'Uncategorized items' },
  };

  function PocketMoneyIcon(props: any) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        className={props.className || "w-5 h-5"}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="text-[11px] font-sans antialiased pb-10">
      
      {/* Dynamic Screen View Modifier Styles for Print View on screen */}
      {isPrintView && (
        <style>{`
          @media screen {
            aside,
            header,
            .bg-\[\#eef2f6\], /* Editor tabs parent */
            .border-t.border-\[\#8c9ba8\] /* Bottom panel & status bar */,
            .h-5.bg-\[\#d9e4f1\] /* Status bar */,
            nav {
              display: none !important;
            }
            main {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              z-index: 99999 !important;
              background: white !important;
              padding: 24px !important;
              overflow-y: auto !important;
            }
          }
        `}</style>
      )}

      {/* Floating Control Bar inside Print View Mode (Never Printed) */}
      {isPrintView && (
        <div className="bg-[var(--color-sap-blue-val)] text-white p-2 flex items-center justify-between mb-4 border border-[#8c9ba8] shadow-md sticky top-0 z-[100000] print:hidden rounded-sm">
          <div className="flex items-center space-x-2">
            <span className="animate-pulse bg-emerald-500 w-2 h-2 rounded-full block"></span>
            <span className="font-bold uppercase text-[9.5px] tracking-wider">🖨️ LANDSCAPE PRINT PREVIEW MODE (ACTIVE)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 border border-emerald-500 rounded text-[10px] flex items-center space-x-1 transition cursor-pointer"
            >
              <Printer size={12} />
              <span>Launch Print Dialog</span>
            </button>
            <button
              onClick={() => setIsPrintView(false)}
              className="bg-red-600 hover:bg-red-750 text-white font-bold py-1 px-3 border border-red-500 rounded text-[10px] flex items-center space-x-1 transition cursor-pointer"
            >
              <X size={12} />
              <span>Exit Print view</span>
            </button>
          </div>
        </div>
      )}

      {/* Standard Cockpit Page Title Header (Hidden when printing or in screen print mode) */}
      {!isPrintView && (
        <div className="mb-4 bg-white border border-[#8c9ba8] p-3 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm print:hidden">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5 font-sans">
              <TrendingUp size={16} className="text-[#0056b3]" />
              <span>Expenses & Owner Fund Cockpit</span>
            </h2>
            <p className="text-[10px] text-gray-400">Comprehensive real-time analysis of owner deposits, structural spending and dynamic liquid balance</p>
          </div>
          <div className="mt-2 md:mt-0 flex items-center space-x-2">
            <button 
              onClick={() => setIsPrintView(true)}
              className="sap-btn flex items-center space-x-1 bg-[#f3f4f6]"
              title="Switch to ledger layout with high contrast table ready for print/export"
            >
              <Printer size={12} className="text-[#0056b3]" />
              <span className="font-bold">Toggle Print View</span>
            </button>
            <div className="px-2 py-0.5 border border-dashed border-[#0056b3] bg-blue-50 text-[#0056b3] rounded font-bold uppercase tracking-wider text-[9px] select-none">
              SN ENTERPRISE OFFICIAL
            </div>
          </div>
        </div>
      )}

      {/* FORMAL ALL EXPENSES RECORD SHEET PRINTING HEADER (Visible only in print mode or screen-print layout) */}
      <div className={`${isPrintView ? 'block' : 'hidden print:block'} mb-6 border-b-2 border-double border-gray-400 pb-3 text-center`}>
        <h1 className="text-3xl font-black font-sans uppercase tracking-widest text-red-600 m-0 p-0 block select-none">
          SN ENTERPRISE
        </h1>
        <h3 className="text-xs font-bold font-sans uppercase tracking-[0.2em] text-gray-800 mt-1 mb-1 border-y border-gray-300 py-1 max-w-sm mx-auto">
          ALL EXPENSES RECORD SHEET
        </h3>
      </div>

      {/* COMPACT PRINT-FRIENDLY SUMMARY CARDS (High contrast borders, perfect for black & white paper / PDF printing) */}
      <div className={`${isPrintView ? 'grid' : 'hidden print:grid'} grid-cols-3 gap-3 mb-5`}>
        <div className="border border-gray-400 bg-white p-3 text-left">
          <span className="text-[8.5px] uppercase font-bold text-gray-500 block">Funds Received (Owner Deposit)</span>
          <span className="text-lg font-black font-mono text-emerald-800 block">
            ₹{stats.totalOwnerFunds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[8px] text-gray-400 block border-t border-dashed mt-1 pt-0.5">{stats.ownerCreditsList.length} Deposit Entries</span>
        </div>
        <div className="border border-gray-400 bg-white p-3 text-left">
          <span className="text-[8.5px] uppercase font-bold text-gray-500 block">Structural Expenditure (Spent)</span>
          <span className="text-lg font-black font-mono text-red-600 block">
            ₹{stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[8px] text-gray-400 block border-t border-dashed mt-1 pt-0.5">Across 9 Core Categories</span>
        </div>
        <div className="border border-gray-400 bg-gray-50 p-3 text-left">
          <span className="text-[8.5px] uppercase font-bold text-gray-800 block">Current Available Balance</span>
          <span className="text-lg font-black font-mono text-blue-900 block">
            ₹{stats.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[8px] text-emerald-800 block border-t border-dashed mt-1 pt-0.5 font-bold">Inflows - Outflows Pool</span>
        </div>
      </div>

      {/* INTERACTIVE FULL COCKPIT DASHBOARD (Rendered when standard interactive mode is active; Hidden inside print view or printing) */}
      {!isPrintView && (
        <div className="print:hidden">
          {/* Main Big Summary Numbers */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5"
          >
            {/* Money Given by Owner */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              className="border border-[#8c9ba8] bg-white p-4 shadow-sm relative overflow-hidden group hover:border-emerald-600 transition"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-8 -translate-y-8 flex items-center justify-center text-emerald-100 group-hover:scale-110 transition duration-500">
                <ArrowDownLeft size={44} className="text-emerald-100 opacity-60" />
              </div>
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Funded Inflows (Owner Cash/Bank)</span>
                  <h1 className="text-2xl font-black font-mono text-emerald-700 block">
                    ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.totalOwnerFunds)}
                  </h1>
                </div>
                <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-emerald-600 font-semibold">{stats.ownerCreditsList.length} Credit Transactions Injected</span>
                  <span className="text-[9px] text-gray-400">SBI Bank Streamed</span>
                </div>
              </div>
            </motion.div>

            {/* Where I Spent It */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              className="border border-[#8c9ba8] bg-white p-4 shadow-sm relative overflow-hidden group hover:border-red-500 transition"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-full translate-x-8 -translate-y-8 flex items-center justify-center text-red-100 group-hover:scale-110 transition duration-500">
                <ArrowUpRight size={44} className="text-red-100 opacity-60" />
              </div>
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Total Structural Outflows (Spent)</span>
                  <h1 className="text-2xl font-black font-mono text-[#ce2a2a] block">
                    ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.totalSpent)}
                  </h1>
                </div>
                <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-red-600 font-semibold">{stats.spentTransactions.length} Logged Spent Records</span>
                  <span className="text-[9px] text-gray-400">across 9 site categories</span>
                </div>
              </div>
            </motion.div>

            {/* Available Pool */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              className="border border-[#8c9ba8] bg-[var(--color-sap-blue-val)] p-4 text-white shadow-sm relative overflow-hidden group hover:bg-[#00224d] transition"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-900 rounded-full translate-x-8 -translate-y-8 flex items-center justify-center text-blue-800 group-hover:scale-110 transition duration-500">
                <Wallet size={44} className="text-blue-800 opacity-40" />
              </div>
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Current Net Cash Reserves (Avl. Balance)</span>
                  <h1 className="text-2xl font-black font-mono text-emerald-400 block animate-pulse">
                    ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.availableBalance)}
                  </h1>
                </div>
                <div className="mt-4 pt-2 border-t border-blue-800 flex items-center justify-between">
                  <span className="text-emerald-300 font-semibold font-medium">Ready to spend locally</span>
                  <span className="text-[9px] text-blue-100">Credit Inflows - Spent Outflows</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Graphical Split - Credit vs Category Spent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Card: Under "How Much Money Owner Gives Me" */}
            <div className="space-y-4">
              <div className="bg-white border-2 border-[#8c9ba8] shadow-sm p-4">
                <div className="flex justify-between items-center border-b border-[#8c9ba8] pb-1.5 mb-3">
                  <h3 className="font-bold text-[#006100] text-[11px] uppercase tracking-wider flex items-center space-x-1">
                    <ArrowDownLeft size={14} />
                    <span>HOW MUCH MONEY MY OWNER GIVE ME (CREDIT HISTORY)</span>
                  </h3>
                  <span className="bg-[#c6efce] text-[#006100] px-1.5 py-0.5 font-bold uppercase text-[9px] select-none">
                    Owner Deposits List
                  </span>
                </div>

                {/* Inflow Summary stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div className="p-2 border border-emerald-100 bg-emerald-50 text-emerald-950">
                    <div className="text-gray-500 text-[8px] uppercase font-bold">Total Injected Funds</div>
                    <div className="text-md font-bold font-mono">₹{stats.totalOwnerFunds.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-indigo-100 bg-indigo-50 text-indigo-950">
                    <div className="text-gray-500 text-[8px] uppercase font-bold">SBI Bank Share</div>
                    <div className="text-md font-bold font-mono">
                      ₹{stats.ownerCreditsList.filter(c => c.bank?.toUpperCase() === 'SBI').reduce((sum, c) => sum + c.crBalance, 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Credit Transaction Event Stream List */}
                <div className="overflow-y-auto max-h-[300px] border border-gray-300 divide-y divide-gray-200">
                  {stats.ownerCreditsList.map((credit) => (
                    <div key={credit.id} className="p-2.5 hover:bg-emerald-50/30 transition flex justify-between items-center text-[10.5px]">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-800 flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{credit.description}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 flex items-center space-x-2">
                          <span className="flex items-center"><Calendar size={10} className="mr-0.5" /> {credit.date.split('-').reverse().join('-')}</span>
                          {credit.bank && <span className="bg-blue-100 text-blue-800 font-bold px-1 rounded text-[8px] uppercase border border-blue-300">{credit.bank}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-700 font-black font-mono">
                          + ₹{credit.crBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-gray-400 block">Incremental Deposit</span>
                      </div>
                    </div>
                  ))}
                  {stats.ownerCreditsList.length === 0 && (
                    <div className="py-8 text-center text-gray-400 italic">No incoming owner funds logged yet.</div>
                  )}
                </div>
              </div>

              {/* Quick running balance sheet logic explanation box */}
              <div className="bg-[#eef2f6] border border-[#8c9ba8] p-3 text-gray-800 space-y-2">
                <h4 className="font-bold text-gray-900 border-b pb-1 flex items-center space-x-1.5 uppercase text-[10px]">
                  <TrendingUp size={12} className="text-[#0056b3]" />
                  <span>Available Balance Math Guide</span>
                </h4>
                <p className="text-[9.5px] leading-relaxed text-gray-600">
                  The sheet maintains a precise, sequential ledger of funds. When money is injected from the owner, the <strong>Avl. Balance</strong> increments. Every spent coin (mess, travel, salary, materials) decrements from the pool at that explicit chronological index.
                </p>
                <div className="flex justify-between text-[9px] text-gray-500 font-mono bg-white p-1 px-2 border">
                  <span>+ Credit received increases pool</span>
                  <span>- Category expense decreases pool</span>
                </div>
              </div>
            </div>

            {/* Right Card: Where i spent it (Categorized Analysis) */}
            <div className="space-y-4">
              <div className="bg-white border-2 border-[#8c9ba8] p-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-[#8c9ba8] pb-1.5 mb-3">
                  <h3 className="font-bold text-[#ac4a00] text-[11px] uppercase tracking-wider flex items-center space-x-1">
                    <ShoppingBag size={14} />
                    <span>WHERE I SPENT IT (EXPENDITURE DISSECTION)</span>
                  </h3>
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 font-bold uppercase text-[9px] select-none">
                    Spent breakdown details
                  </span>
                </div>

                {/* Click to filter indicator */}
                <div className="mb-3 text-gray-500 text-[9px] flex items-center space-x-1">
                  <span>Click any category tile below to view recent spent list:</span>
                  {selectedFilterCategory && (
                    <button 
                      onClick={() => setSelectedFilterCategory(null)} 
                      className="bg-red-105 bg-red-100 text-red-700 font-bold px-1 border border-red-300 ml-1 rounded hover:bg-red-200 text-[8px] cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Interactive category grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {(Object.entries(stats.categoryTotals) as [string, number][]).map(([catKey, totalValue]) => {
                    const meta = categoryMeta[catKey];
                    if (!meta) return null;
                    const pct = stats.totalSpent > 0 ? (totalValue / stats.totalSpent) * 100 : 0;
                    const isSelected = selectedFilterCategory === catKey;

                    return (
                      <motion.div
                        key={catKey}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setSelectedFilterCategory(isSelected ? null : catKey)}
                        className={`p-2.5 border rounded cursor-pointer transition select-none flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                            : 'bg-white border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1.5">
                          <div className={`p-1.5 rounded ${meta.color}`}>
                            <meta.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="leading-tight">
                            <span className="font-black text-gray-800 block text-[10.5px]">{meta.label}</span>
                            <span className="text-[8px] text-gray-400 block">{meta.desc}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-end font-mono">
                            <span className="text-[8px] text-gray-500 uppercase tracking-wider">Spent Total</span>
                            <span className="font-black text-gray-950 text-[11px]">
                              ₹{Number(totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {/* Spring Progress Bar */}
                          <div className="w-full h-1.5 bg-gray-100 border rounded overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8 }}
                              className={`h-full ${pct > 40 ? 'bg-red-500' : pct > 15 ? 'bg-amber-500' : 'bg-green-500'}`} 
                            />
                          </div>
                          <span className="text-[8px] text-right block font-bold text-gray-400 font-mono">
                            {pct.toFixed(1)}% of total spent
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Selected category records list drawer */}
                <div className="border border-[#8c9ba8] p-2 bg-[#f8fafc]">
                  <h4 className="font-bold text-gray-800 border-b pb-1 mb-2 uppercase text-[9.5px] flex justify-between items-center">
                    <span>
                      {selectedFilterCategory 
                        ? `Recent Items inside: ${categoryMeta[selectedFilterCategory]?.label}` 
                        : 'Latest Spent Material, Workers & Logistics (Overall)'}
                    </span>
                    <span className="text-[8px] text-gray-400 font-normal">Showing latest {selectedFilterCategory ? 'filtered' : 'unfiltered'}</span>
                  </h4>

                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {stats.spentTransactions
                      .filter(t => !selectedFilterCategory || Number(t[selectedFilterCategory as keyof ExpenseEntry]) > 0)
                      .map((t) => {
                        const categoryValues = Object.keys(categoryMeta)
                          .filter(metaKey => Number(t[metaKey as keyof ExpenseEntry]) > 0)
                          .map(metaKey => {
                            const val = t[metaKey as keyof ExpenseEntry] as number;
                            return { label: categoryMeta[metaKey].label, value: val };
                          });

                        return (
                          <div key={t.id} className="p-2 bg-white border border-gray-200 flex justify-between items-center text-[10px] hover:border-blue-400 transition">
                            <div className="space-y-0.5 text-left">
                              <span className="font-bold text-gray-900 block">{t.description}</span>
                              <div className="text-[8px] text-gray-400 flex items-center space-x-2">
                                <span>{t.date.split('-').reverse().join('-')}</span>
                                <span>•</span>
                                <span className="text-gray-500 uppercase font-semibold">{getProjectName(t.projectId) || 'General'}</span>
                              </div>
                              {categoryValues.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {categoryValues.map(cv => (
                                    <span key={cv.label} className="bg-gray-100 text-gray-600 px-1 py-0.2 text-[8px] uppercase rounded-sm border border-gray-200 font-medium font-mono">
                                      {cv.label.split('(')[0].trim()}: ₹{cv.value.toLocaleString()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-red-650 text-[#ce2a2a] font-mono block">
                                - ₹{((t.kharchi || 0) + (t.mess || 0) + (t.workerAdvance || 0) + (t.tiffin || 0) + (t.travel || 0) + (t.machineryMaterial || 0) + (t.workerPayment || 0) + (t.stationery || 0) + (t.others || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    {stats.spentTransactions.length === 0 && (
                      <div className="py-6 text-center text-gray-400 italic">No spent items logged yet.</div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Quick Screen Preview of the Ledger table (collapsed/clickable) */}
          <div className="mt-5 border border-[#8c9ba8] bg-white p-4 shadow-sm text-left">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-800 uppercase tracking-tight flex items-center space-x-1">
                  <span>ALL EXPENSES RECORD SHEET (EXCEL TABLE LOOK)</span>
                </h3>
                <p className="text-[10px] text-gray-405 text-gray-400 mt-0.5">Chronological audit ledger with running liquid balances</p>
              </div>
              <button
                onClick={() => setIsPrintView(true)}
                className="sap-btn font-bold text-[#0056b3] flex items-center space-x-1"
              >
                <ExternalLink size={12} />
                <span>Open Print Sheet View</span>
              </button>
            </div>
            
            <div className="text-gray-500 text-[10px] leading-relaxed mb-4">
              Below is an online preview of the official ledger sheet. Choose the <strong>"Toggle Print View"</strong> button at the top of the dashboard to switch to an ink-optimized printable layout featuring only this table and the key high-contrast summary cards, perfectly proportioned for Landscape paper.
            </div>

            <div className="overflow-x-auto max-w-full border border-gray-300">
              <div className="min-w-[1100px] overflow-hidden">
                <table className="w-full text-[9px] border-collapse border border-gray-400 font-sans excel-grid">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 text-center font-bold uppercase tracking-wider divide-x divide-gray-350">
                      <th className="border border-gray-300 p-1 text-center w-8 bg-gray-100">SR</th>
                      <th className="border border-gray-300 p-1 text-center w-20">DATE</th>
                      <th className="border border-gray-300 p-1 text-left">DESCRIPTION</th>
                      <th className="border border-gray-300 p-1 text-left w-24">PROJECT</th>
                      <th className="border border-gray-300 p-1 text-right w-16">Kharchi</th>
                      <th className="border border-gray-300 p-1 text-right w-16">Mess</th>
                      <th className="border border-gray-300 p-1 text-right w-20">Worker Adv.</th>
                      <th className="border border-gray-300 p-1 text-right w-14">Tiffin</th>
                      <th className="border border-gray-300 p-1 text-right w-14">Travel</th>
                      <th className="border border-gray-300 p-1 text-right w-24">Machinery & Mat.</th>
                      <th className="border border-gray-300 p-1 text-right w-20">Worker Pay</th>
                      <th className="border border-gray-300 p-1 text-right w-14">Stationery</th>
                      <th className="border border-gray-300 p-1 text-right w-14">Others</th>
                      <th className="border border-gray-300 p-1 text-center w-14">Bank</th>
                      <th className="border border-gray-300 p-1 text-right w-20 bg-emerald-50 text-emerald-950">Cr.Balance</th>
                      <th className="border border-gray-300 p-1 text-right w-24 bg-blue-50 text-blue-950">Avl. Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedLedger.map((row, idx) => {
                      const isCredit = (row.crBalance || 0) > 0;
                      return (
                        <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} 
                          key={row.id} 
                          className={`divide-x divide-gray-250 border-b border-gray-300 ${
                            isCredit ? 'bg-[#c6efce]/40 font-semibold text-emerald-950' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="border border-gray-300 p-1 text-center font-bold text-gray-505 text-gray-500 bg-gray-50/60 w-8">{idx + 1}</td>
                          <td className="border border-gray-300 p-1 text-center font-mono w-20">{row.date.split('-').reverse().join('-')}</td>
                          <td className="border border-gray-300 p-1 text-left font-medium">{row.description}</td>
                          <td className="border border-gray-300 p-1 text-left w-24 truncate">
                            {isCredit ? '' : (getProjectName(row.projectId) || '')}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.kharchi > 0 ? Number(row.kharchi).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.mess > 0 ? Number(row.mess).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.workerAdvance > 0 ? Number(row.workerAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.tiffin > 0 ? Number(row.tiffin).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.travel > 0 ? Number(row.travel).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.machineryMaterial > 0 ? Number(row.machineryMaterial).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.workerPayment > 0 ? Number(row.workerPayment).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.stationery > 0 ? Number(row.stationery).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono text-gray-800">
                            {row.others > 0 ? Number(row.others).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-center font-bold text-[#0056b3] uppercase text-[8px] w-14">
                            {row.bank || ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10 w-20">
                            {row.crBalance > 0 ? Number(row.crBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-mono font-bold text-blue-900 bg-blue-50/10 w-24">
                            ₹{Number(row.avlBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHRONOLOGICAL LEDGER RECORD SHEET (Rendered when isPrintView is true OR inside general browser print task) */}
      <div className={`${isPrintView ? 'block' : 'hidden print:block'} font-sans`}>
        <div className="mb-4 text-center mt-2 font-mono text-[9px] text-gray-500 border border-dashed border-gray-350 p-1 print:hidden select-none">
          ℹ️ Landscape orientation is strongly recommended for a perfect print fit.
        </div>

        <div className="overflow-x-auto w-full border border-gray-400">
          <table className="w-full text-[9px] border-collapse border border-gray-500 font-sans excel-grid">
            <thead>
              <tr className="bg-gray-100 text-gray-900 text-center font-bold uppercase tracking-wider divide-x divide-gray-400">
                <th className="border border-gray-400 p-1.5 text-center w-8 bg-gray-100">SR</th>
                <th className="border border-gray-400 p-1.5 text-center w-20">DATE</th>
                <th className="border border-gray-400 p-1.5 text-left">DESCRIPTION</th>
                <th className="border border-gray-400 p-1.5 text-left w-24">PROJECT</th>
                <th className="border border-gray-400 p-1.5 text-right w-16">Kharchi</th>
                <th className="border border-gray-400 p-1.5 text-right w-16">Mess</th>
                <th className="border border-gray-400 p-1.5 text-right w-20">Worker Advance</th>
                <th className="border border-gray-400 p-1.5 text-right w-14">Tiffin</th>
                <th className="border border-gray-400 p-1.5 text-right w-14">Travel</th>
                <th className="border border-gray-400 p-1.5 text-right w-24">Machinery & Mat.</th>
                <th className="border border-gray-400 p-1.5 text-right w-20">Worker Payment</th>
                <th className="border border-gray-400 p-1.5 text-right w-14">Stationery</th>
                <th className="border border-gray-400 p-1.5 text-right w-14">Others</th>
                <th className="border border-gray-400 p-1.5 text-center w-14">Bank</th>
                <th className="border border-gray-400 p-1.5 text-right w-20 bg-emerald-50/70 text-emerald-950 font-black">Cr.Balance</th>
                <th className="border border-gray-400 p-1.5 text-right w-24 bg-blue-50/70 text-blue-950 font-black">Avl. Balance</th>
              </tr>
            </thead>
            <tbody>
              {processedLedger.map((row, idx) => {
                const isCredit = (row.crBalance || 0) > 0;
                return (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} 
                    key={row.id} 
                    className={`divide-x divide-gray-350 border-b border-gray-400 ${
                      isCredit ? 'bg-[#c6efce]/45 text-emerald-950 font-bold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="border border-gray-400 p-1 font-bold text-center text-gray-600 bg-gray-100/40 w-8">{idx + 1}</td>
                    <td className="border border-gray-400 p-1 text-center font-mono w-20">{row.date.split('-').reverse().join('-')}</td>
                    <td className="border border-gray-400 p-1 text-left">{row.description}</td>
                    <td className="border border-gray-400 p-1 text-left w-24 truncate">
                      {isCredit ? '' : (getProjectName(row.projectId) || '')}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.kharchi > 0 ? Number(row.kharchi).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.mess > 0 ? Number(row.mess).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.workerAdvance > 0 ? Number(row.workerAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.tiffin > 0 ? Number(row.tiffin).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.travel > 0 ? Number(row.travel).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.machineryMaterial > 0 ? Number(row.machineryMaterial).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.workerPayment > 0 ? Number(row.workerPayment).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.stationery > 0 ? Number(row.stationery).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-semibold text-gray-900">
                      {row.others > 0 ? Number(row.others).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-center font-bold text-[#0056b3] uppercase text-[8px] w-14">
                      {row.bank || ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20 w-20">
                      {row.crBalance > 0 ? Number(row.crBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="border border-gray-400 p-1 text-right font-mono font-bold text-[var(--color-sap-blue-val)] bg-blue-50/20 w-24">
                      ₹{Number(row.avlBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic Footer for actual physical printing sheets */}
        <div className="print-signature-section">
          <div className="print-signature-box">
            <div className="print-signature-title">Approved by Director</div>
            <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-300 pt-4 flex items-center justify-between text-[8px] text-gray-400 font-mono select-none">
          <span>Printed on: {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}</span>
          <span>SYSTEM AUTO-GENERATED LEDGER REPORT (ERP_PRD)</span>
          <span>Page 1 of 1</span>
        </div>
      </div>

    </div>
  );
};
