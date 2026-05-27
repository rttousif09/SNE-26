import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { ExpenseEntry } from '../types';
import { 
  Plus, X, Edit, Trash2, Calendar, FileText, Check, Save,
  ArrowDownCircle, ArrowUpCircle, Wallet, Download, Printer, Filter, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Expenses: React.FC = () => {
  const { 
    user, 
    projects, 
    expensesLedger, 
    addExpenseEntry, 
    updateExpenseEntry, 
    deleteExpenseEntry 
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  // State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectIdFilter, setProjectIdFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form State
  const [transactionType, setTransactionType] = useState<'credit' | 'spent'>('spent');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    projectId: '',
    category: 'mess', // defaults to mess
    amount: '',
    bank: '',
  });

  // Reset form
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setTransactionType('spent');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      projectId: '',
      category: 'mess',
      amount: '',
      bank: '',
    });
  };

  const handleEdit = (entry: ExpenseEntry) => {
    const isCredit = entry.crBalance > 0;
    setTransactionType(isCredit ? 'credit' : 'spent');
    
    // Find category and amount for spent entries
    let category = 'kharchi';
    let amount = 0;
    if (!isCredit) {
      if (entry.kharchi > 0) { category = 'kharchi'; amount = entry.kharchi; }
      else if (entry.mess > 0) { category = 'mess'; amount = entry.mess; }
      else if (entry.workerAdvance > 0) { category = 'workerAdvance'; amount = entry.workerAdvance; }
      else if (entry.tiffin > 0) { category = 'tiffin'; amount = entry.tiffin; }
      else if (entry.travel > 0) { category = 'travel'; amount = entry.travel; }
      else if (entry.machineryMaterial > 0) { category = 'machineryMaterial'; amount = entry.machineryMaterial; }
      else if (entry.workerPayment > 0) { category = 'workerPayment'; amount = entry.workerPayment; }
      else if (entry.stationery > 0) { category = 'stationery'; amount = entry.stationery; }
      else if (entry.others > 0) { category = 'others'; amount = entry.others; }
    } else {
      amount = entry.crBalance;
    }

    setFormData({
      date: entry.date,
      description: entry.description,
      projectId: entry.projectId || '',
      category,
      amount: amount.toString(),
      bank: entry.bank || '',
    });
    setEditingId(entry.id);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return;
    const isCredit = transactionType === 'credit';
    const amountVal = parseFloat(formData.amount) || 0;

    // Build categories object
    const categoriesData = {
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

    if (!isCredit) {
      // @ts-ignore
      categoriesData[formData.category] = amountVal;
    }

    const payload = {
      date: formData.date,
      description: formData.description,
      projectId: formData.projectId || undefined,
      bank: isCredit ? formData.bank : undefined,
      crBalance: isCredit ? amountVal : 0,
      ...categoriesData
    };

    if (editingId) {
      updateExpenseEntry(editingId, payload);
    } else {
      addExpenseEntry(payload);
    }
    
    handleCancel();
  };

  const handleDelete = (id: string) => {
    deleteExpenseEntry(id);
    setDeleteId(null);
  };

  // Helper names
  const getProjectName = (id?: string) => {
    if (!id) return '';
    const proj = projects.find(p => p.id === id);
    return proj ? proj.name : id;
  };

  // Process ledger: Sort chronologically to properly calculate sequential available running balance
  const processedLedger = useMemo(() => {
    // Clone and sort by date ascending (oldest first)
    const sorted = [...expensesLedger].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id); // secondary stable tie-breaker
    });

    let runningBalance = 0;
    return sorted.map(item => {
      const totalSpent = 
        item.kharchi + item.mess + item.workerAdvance + item.tiffin + 
        item.travel + item.machineryMaterial + item.workerPayment + 
        item.stationery + item.others;

      runningBalance = runningBalance + item.crBalance - totalSpent;

      return {
        ...item,
        totalSpent,
        avlBalance: runningBalance
      };
    });
  }, [expensesLedger]);

  // Apply filters on the calculated ledger (preserving dynamic calculation indices)
  const filteredLedger = useMemo(() => {
    return processedLedger.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.bank && item.bank.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesProject = !projectIdFilter || item.projectId === projectIdFilter;
      
      let matchesCat = true;
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'credit') {
          matchesCat = item.crBalance > 0;
        } else {
          // @ts-ignore
          matchesCat = item[categoryFilter] > 0;
        }
      }

      return matchesSearch && matchesProject && matchesCat;
    });
  }, [processedLedger, searchQuery, projectIdFilter, categoryFilter]);

  // Aggregate Stats (based on filtered ledger, but raw totals overall)
  const stats = useMemo(() => {
    let totalCredit = 0;
    let totalSpent = 0;
    
    // Calculate off 전체 ledger to avoid subset balance distortion
    processedLedger.forEach(item => {
      totalCredit += item.crBalance;
      totalSpent += item.totalSpent;
    });

    const isCreditEmpty = processedLedger.length === 0;
    const finalBalance = isCreditEmpty ? 0 : processedLedger[processedLedger.length - 1].avlBalance;

    // Category breakdown
    const categoriesBreakdown = {
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

    processedLedger.forEach(item => {
      categoriesBreakdown.kharchi += item.kharchi;
      categoriesBreakdown.mess += item.mess;
      categoriesBreakdown.workerAdvance += item.workerAdvance;
      categoriesBreakdown.tiffin += item.tiffin;
      categoriesBreakdown.travel += item.travel;
      categoriesBreakdown.machineryMaterial += item.machineryMaterial;
      categoriesBreakdown.workerPayment += item.workerPayment;
      categoriesBreakdown.stationery += item.stationery;
      categoriesBreakdown.others += item.others;
    });

    return {
      totalCredit,
      totalSpent,
      currentBalance: finalBalance,
      breakdown: categoriesBreakdown
    };
  }, [processedLedger]);

  const exportToCSV = () => {
    const headers = [
      'SR', 'DATE', 'DESCRIPTION', 'PROJECT', 'Kharchi', 'Mess', 
      'Worker Advance', 'Tiffin', 'Travel', 'Machinery & Material', 
      'Worker Payment', 'Stationery', 'Others', 'Bank', 'Cr.Balance', 'Avl. Balance'
    ];
    
    const rows = filteredLedger.map((item, index) => [
      index + 1,
      item.date,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${getProjectName(item.projectId)}"`,
      item.kharchi || '',
      item.mess || '',
      item.workerAdvance || '',
      item.tiffin || '',
      item.travel || '',
      item.machineryMaterial || '',
      item.workerPayment || '',
      item.stationery || '',
      item.others || '',
      item.bank || '',
      item.crBalance || '',
      item.avlBalance
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SN_ENTERPRISE_Expenses_Record_Sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="text-[11px] font-sans antialiased">
      {/* Dynamic Summary Cards with beautiful motion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 print:hidden">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border border-[#8c9ba8] bg-white p-3 shadow-sm flex items-center justify-between group hover:border-[#0056b3] transition duration-200"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Total Money Credited (Owner)</span>
            <div className="text-lg font-black font-mono text-green-700">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.totalCredit)}
            </div>
            <p className="text-[9px] text-gray-400">Total fund injected by owner into layout</p>
          </div>
          <div className="p-2 border border-green-200 bg-green-50 text-green-700 rounded-full group-hover:scale-110 transition duration-300">
            <ArrowDownCircle size={20} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="border border-[#8c9ba8] bg-white p-3 shadow-sm flex items-center justify-between group hover:border-red-555 transition duration-200"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Total Funds Spent</span>
            <div className="text-lg font-black font-mono text-red-600">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.totalSpent)}
            </div>
            <p className="text-[9px] text-gray-400">Sum of travel, tiffin, mess, materials & labor</p>
          </div>
          <div className="p-2 border border-red-200 bg-red-50 text-red-600 rounded-full group-hover:scale-110 transition duration-300">
            <ArrowUpCircle size={20} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="border border-[#8c9ba8] bg-[#002f6c] p-3 shadow-sm flex items-center justify-between text-white group hover:bg-[#00224d] transition duration-200"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Available Balance</span>
            <div className="text-lg font-black font-mono text-emerald-400">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(stats.currentBalance)}
            </div>
            <p className="text-[9px] text-blue-100">Remaining cash reserve balance</p>
          </div>
          <div className="p-2 bg-blue-900 border border-blue-700 text-emerald-400 rounded-full group-hover:scale-110 transition duration-300">
            <Wallet size={20} />
          </div>
        </motion.div>
      </div>

      {/* Visual Category Expenditure Breakdown meter bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mb-4 p-2.5 bg-white border border-[#8c9ba8] shadow-sm print:hidden"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 block mb-2">Category Wise Spent Expense Proportion</span>
        <div className="w-full flex h-5 rounded overflow-hidden bg-gray-100 border divide-x border-gray-200">
          {(Object.entries(stats.breakdown) as [string, number][]).map(([cat, val], idx) => {
            if (val <= 0 || stats.totalSpent <= 0) return null;
            const percentage = (val / stats.totalSpent) * 100;
            const colors = [
              'bg-[#0056b3]', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600', 
              'bg-cyan-600', 'bg-pink-600', 'bg-teal-600', 'bg-orange-600', 'bg-slate-600'
            ];
            const catLabel = cat === 'machineryMaterial' ? 'Machinery & Material' : cat.charAt(0).toUpperCase() + cat.slice(1);
            return (
              <div 
                key={cat} 
                style={{ width: `${percentage}%` }} 
                className={`${colors[idx % colors.length]} flex items-center justify-center text-[8px] font-bold text-white transition-all`}
                title={`${catLabel}: ₹${Number(val).toLocaleString('en-IN')} (${percentage.toFixed(1)}%)`}
              >
                {percentage > 10 ? `${catLabel} (${percentage.toFixed(0)}%)` : ''}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {(Object.entries(stats.breakdown) as [string, number][]).map(([cat, val], idx) => {
            const colors = [
              'bg-[#0056b3]', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600', 
              'bg-cyan-600', 'bg-pink-600', 'bg-teal-600', 'bg-orange-600', 'bg-slate-600'
            ];
            const catLabel = cat === 'machineryMaterial' ? 'Machinery & Material' : cat.charAt(0).toUpperCase() + cat.slice(1);
            return (
              <div key={cat} className="flex items-center space-x-1">
                <span className={`w-2 h-2 ${colors[idx % colors.length]} rounded-fullInline block`}></span>
                <span className="text-[9px] text-gray-600">{catLabel}: <strong className="text-gray-900 font-mono">₹{Number(val).toLocaleString('en-IN')}</strong></span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Control panel and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#eef2f6] border border-[#8c9ba8] p-1.5 gap-2 shadow-sm print:hidden mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {!isReadOnly ? (
            <button 
              onClick={isAdding ? handleCancel : () => setIsAdding(true)} 
              className="sap-btn flex items-center space-x-1 font-semibold self-start md:self-auto cursor-pointer"
            >
              {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
              <span>{isAdding ? 'Cancel' : 'Record Transaction'}</span>
            </button>
          ) : (
            <span className="font-semibold text-gray-700 px-1 py-0.5 max-sm:text-[10px]">All Expenses Summary List (Read Only)</span>
          )}
          
          <button 
            onClick={exportToCSV} 
            className="sap-btn flex items-center space-x-1 font-semibold bg-[#107c41]/10 text-[#107c41] border-[#107c41]/50 hover:bg-[#107c41] hover:text-white transition cursor-pointer" 
            title="Export filtered records sheet list to Microsoft Excel CSV format"
          >
            <Download size={12} />
            <span>Excel Export</span>
          </button>
          
          <button 
            onClick={() => window.print()} 
            className="sap-btn flex items-center space-x-1 font-semibold bg-[#0369a1]/10 text-[#0369a1] border-[#0369a1]/50 hover:bg-[#0369a1] hover:text-white transition cursor-pointer" 
            title="Save this ledger view as PDF or print physically"
          >
            <Printer size={12} />
            <span>Print Sheet</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 md:self-stretch">
          <div className="flex items-center space-x-1 bg-white border border-[#8c9ba8] px-1 py-0.5 rounded shadow-inner">
            <Filter size={10} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Search memo..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-24 bg-transparent outline-none py-0.5"
            />
          </div>

          <select 
            value={projectIdFilter} 
            onChange={(e) => setProjectIdFilter(e.target.value)}
            className="border border-[#8c9ba8] bg-white p-0.5 rounded shadow-sm outline-none"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-[#8c9ba8] bg-white p-0.5 rounded shadow-sm outline-none"
          >
            <option value="all">All Categories</option>
            <option value="credit">Credits received from Owner</option>
            <option value="kharchi">Kharchi</option>
            <option value="mess">Mess</option>
            <option value="workerAdvance">Worker Advance</option>
            <option value="tiffin">Tiffin</option>
            <option value="travel">Travel</option>
            <option value="machineryMaterial">Machinery & Material</option>
            <option value="workerPayment">Worker Payment</option>
            <option value="stationery">Stationery</option>
            <option value="others">Others</option>
          </select>
        </div>
      </div>

      {/* Transaction recording form with elegant layout animations */}
      <AnimatePresence>
        {isAdding && !isReadOnly && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sap-panel p-3 mb-4 overflow-hidden shadow-md print:hidden bg-[#fbfcfd]"
          >
            <div className="font-bold border-b border-[#8c9ba8] pb-1.5 mb-3 text-[#0056b3] uppercase tracking-wider text-[11px] flex justify-between items-center">
              <span>{editingId ? 'Edit Ledger Record' : 'Record New Fund Flow / spent expense'}</span>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {/* Transaction Type Choice Selector */}
              <div className="md:col-span-2">
                <label className="block text-[10px] text-gray-500 font-bold mb-1">FLOW DIRECTION</label>
                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setTransactionType('spent')}
                    className={`flex-1 py-1 text-center font-bold border rounded outline-none transition cursor-pointer ${
                      transactionType === 'spent'
                        ? 'bg-red-50 text-red-700 border-red-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    💸 SPENT EXPENSE INFLOW
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType('credit')}
                    className={`flex-1 py-1 text-center font-bold border rounded outline-none transition cursor-pointer ${
                      transactionType === 'credit'
                        ? 'bg-green-50 text-green-700 border-green-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    📥 OWNER CREDIT INJECT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-bold mb-1">DATE</label>
                <input 
                  type="date"
                  required 
                  value={formData.date}
                  onChange={(e) => setFormData(e.target.value)}
                  className="w-full border border-gray-300 p-1 bg-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] text-gray-500 font-bold mb-1">TRANSACTION DESCRIPTION / MEMO</label>
                <input 
                  type="text" 
                  required
                  placeholder={transactionType === 'credit' ? 'e.g., Amount Credit from Owner' : 'e.g., Mess bills, travel tickets, etc.'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 p-1 bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-bold mb-1">PROJECT LINK (OPTIONAL)</label>
                <select 
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full border border-gray-300 p-1 bg-white outline-none h-[23px]"
                >
                  <option value="">General (None)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {transactionType === 'spent' ? (
                <>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">EXPENSE CATEGORY</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none h-[23px]"
                    >
                      <option value="kharchi">Kharchi (Pocket Money)</option>
                      <option value="mess">Mess</option>
                      <option value="workerAdvance">Worker Advance</option>
                      <option value="tiffin">Tiffin</option>
                      <option value="travel">Travel</option>
                      <option value="machineryMaterial">Machinery & Material</option>
                      <option value="workerPayment">Worker Payment</option>
                      <option value="stationery">Stationery</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">SPENT AMOUNT (₹)</label>
                    <input 
                      type="number" 
                      required
                      min="0.01"
                      step="any"
                      placeholder="e.g., 5000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">BANK (E.G., SBI)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g., SBI"
                      value={formData.bank}
                      onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">CREDIT AMOUNT (₹)</label>
                    <input 
                      type="number" 
                      required
                      min="0.01"
                      step="any"
                      placeholder="e.g., 15000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 p-1 bg-white outline-none font-mono"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-6 flex justify-end space-x-1.5 pt-1.5 border-t border-gray-200 mt-1">
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  className="sap-btn bg-gray-100 border-gray-300 hover:bg-gray-200 flex items-center space-x-1 cursor-pointer"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>
                <button 
                  type="submit" 
                  className="sap-btn flex items-center space-x-1 cursor-pointer"
                >
                  <Save size={12} className="text-green-600"/>
                  <span>{editingId ? 'Update Record' : 'Record to Ledger'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Ledger visual workspace (designed exactly as requested in the image) */}
      <div className="bg-white border-2 border-[#8c9ba8] shadow-lg p-4 overflow-x-auto print:border-0 print:shadow-none print:p-0">
        
        {/* Printable/Exportable header identical to the Excel document attached */}
        <div className="text-center mb-4 flex flex-col items-center">
          <h1 className="text-red-750 font-black tracking-widest text-[#d91e18] uppercase text-2xl" id="excel-company-header">
            SN ENTERPRISE
          </h1>
          <div className="border border-black font-extrabold uppercase px-6 py-1 tracking-wider text-[11px] bg-white border-t-0 -mt-1 subpixel-antialiased" id="excel-sheet-subtitle">
            ALL EXPENSES RECORD SHEET
          </div>
          <div className="text-[9px] text-gray-500 mt-1 print:hidden flex items-center space-x-1">
            <Info size={9} className="text-[#0056b3]" />
            <span>Green rows represent Credits received from the Owner. White rows represent direct Spent Expenses.</span>
          </div>
        </div>

        {/* Excel style worksheet table */}
        <table className="w-full border-collapse border border-black text-[10px] divide-y divide-black min-w-[1000px]">
          <thead>
            {/* Main Worksheet columns header */}
            <tr className="bg-gray-50 divide-x divide-black border-b-2 border-black text-center font-bold text-gray-800">
              <th className="border border-black py-1.5 px-1 font-bold w-10">SR</th>
              <th className="border border-black py-1.5 px-2 font-bold w-16">DATE</th>
              <th className="border border-black py-1.5 px-2 font-bold text-left w-48">DESCRIPTION</th>
              <th className="border border-black py-1.5 px-2 font-bold text-left w-24">PROJECT</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-amber-50/20 text-yellow-900 w-16">Kharchi</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-purple-50/20 text-purple-900 w-16">Mess</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-red-50/20 text-red-900 w-20 text-center leading-tight">Worker<br/>Advance</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-blue-50/20 text-indigo-900 w-14">Tiffin</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-sky-50/20 text-cyan-900 w-16">Travel</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-orange-50/20 text-[#a34e00] w-24 text-center leading-tight">Machinery<br/>&Material</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-emerald-50/20 text-emerald-900 w-20 text-center leading-tight">Worker<br/>Payment</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-pink-50/20 text-pink-900 w-18">Stationery</th>
              <th className="border border-black py-1.5 px-1 font-bold bg-slate-100 text-gray-905 w-18">Others</th>
              <th className="border border-black py-1.5 px-1.5 font-bold w-14 text-center">Bank</th>
              <th className="border border-black py-1.5 px-2 font-bold bg-green-50 text-green-950 w-24 text-right">Cr.Balance</th>
              <th className="border border-black py-1.5 px-2 font-bold bg-[#edf2f7] text-[#002f6c] w-28 text-right">Avl. Balance</th>
              {!isReadOnly && <th className="border border-black py-1.5 px-1 font-normal w-16 print:hidden">Actions</th>}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filteredLedger.map((item, index) => {
                const isCredit = item.crBalance > 0;
                
                return (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`divide-x divide-black border-b border-black text-[10.5px] group hover:bg-[#f8fafc]/50 transition ${
                      isCredit ? 'bg-[#c6efce]/80 text-[#006100] font-semibold' : 'bg-white'
                    }`}
                  >
                    {/* SR */}
                    <td className="border border-black py-1.5 text-center font-bold font-mono text-gray-600 select-none">
                      {index + 1}
                    </td>
                    
                    {/* Date */}
                    <td className="border border-black py-1.5 text-center font-mono select-none">
                      {item.date.split('-').reverse().join('-')}
                    </td>

                    {/* Description */}
                    <td className="border border-black py-1.5 px-2 text-left truncate max-w-xs font-semibold">
                      {item.description}
                    </td>

                    {/* Project */}
                    <td className="border border-black py-1.5 px-2 text-left text-gray-800 select-none">
                      {getProjectName(item.projectId)}
                    </td>

                    {/* Kharchi */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-yellow-50/5 text-yellow-950">
                      {item.kharchi > 0 ? (
                        <span>{item.kharchi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Mess */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-purple-50/5 text-purple-950">
                      {item.mess > 0 ? (
                        <span>{item.mess.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Worker Advance */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-red-50/5 text-red-950">
                      {item.workerAdvance > 0 ? (
                        <span>{item.workerAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Tiffin */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-blue-50/5 text-indigo-950">
                      {item.tiffin > 0 ? (
                        <span>{item.tiffin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Travel */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-[#f0f9ff]/20 text-[#004e7c]">
                      {item.travel > 0 ? (
                        <span>{item.travel.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Machinery & Material */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-orange-50/5 text-[#a34e00]">
                      {item.machineryMaterial > 0 ? (
                        <span>{item.machineryMaterial.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Worker Payment */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-emerald-50/5 text-emerald-950">
                      {item.workerPayment > 0 ? (
                        <span>{item.workerPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Stationery */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-pink-50/5 text-pink-955">
                      {item.stationery > 0 ? (
                        <span>{item.stationery.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Others */}
                    <td className="border border-black py-1.5 px-1 text-right font-mono bg-slate-100/50 text-slate-900">
                      {item.others > 0 ? (
                        <span>{item.others.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Bank */}
                    <td className="border border-black py-1.5 text-center font-bold text-slate-800 uppercase select-none">
                      {item.bank || ''}
                    </td>

                    {/* Cr.Balance */}
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-black bg-green-50/30">
                      {item.crBalance > 0 ? (
                        <span>{item.crBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : ''}
                    </td>

                    {/* Dynamic Avl Balance with elegant design */}
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-black bg-[#edf2f7]/50 text-[#002f6c]">
                      ₹{item.avlBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    {!isReadOnly && (
                      <td className="border border-black py-1.5 text-center print:hidden select-none">
                        <button 
                          onClick={() => handleEdit(item)} 
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                          title="Edit transaction detail"
                        >
                          <Edit size={11} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(item.id)} 
                          className="text-red-600 hover:text-red-800 ml-2 cursor-pointer"
                          title="Delete transaction record"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredLedger.length === 0 && (
              <tr>
                <td colSpan={isReadOnly ? 16 : 17} className="border border-black py-10 text-center text-gray-500 font-semibold italic bg-amber-50/10">
                  No fund flow transactions matched selected options.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Warning/Confirmation Delete Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 font-sans animate-fade-in print:hidden">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-2 border-red-600 p-4 max-w-sm w-full shadow-2xl rounded text-gray-800"
            >
              <div className="flex items-center space-x-2 text-red-600 border-b pb-2 mb-3 font-bold uppercase text-[12px]">
                <Trash2 size={16} />
                <span>Delete Ledger Transaction</span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-700 mb-4">
                Are you absolutely sure you want to permanently delete this transaction record from the Expenses Ledger? This action recalculates the Available Balance sequence dynamically.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="sap-btn bg-gray-100 border-gray-300 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="sap-btn bg-red-600 text-white border-red-700 hover:bg-red-700 cursor-pointer"
                >
                  Yes, Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
