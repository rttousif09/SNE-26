import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { MessBooking, ExpenseEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Calendar, Users, Wallet, CheckSquare, Search, Info, HelpCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { BulkUploadModal } from '../components/BulkUploadModal';

export const Mess: React.FC = () => {
  const {
    projects,
    workers,
    messBookings,
    addMessBooking,
    updateMessBooking,
    deleteMessBooking,
    addExpenseEntry,
    deleteExpenseEntry,
    expensesLedger
  } = useAppContext();

  // Form states
  const [projectId, setProjectId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [workerCount, setWorkerCount] = useState<number>(1);
  const [ratePerWeek, setRatePerWeek] = useState<number>(1400); // Default ₹1400 per labour per week
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paidTo, setPaidTo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [postToLedger, setPostToLedger] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Search/Filter list states
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [workerSuggestions, setWorkerSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Calculation states
  const [days, setDays] = useState<number>(0);
  const [weeks, setWeeks] = useState<number>(0);
  const [totalComputed, setTotalComputed] = useState<number>(0);
  const [amountDue, setAmountDue] = useState<number>(0);

  // Sync selected entries when messBookings change
  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => {
      const b = messBookings.find(x => x.id === id);
      return b !== undefined && b.amountDue > 0;
    }));
  }, [messBookings]);

  // Initialize dates
  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    setPaymentDate(todayStr);
  }, [projects]);

  // Handle live calculation
  useEffect(() => {
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffTime = to.getTime() - from.getTime();
      const calculatedDays = diffTime >= 0 ? Math.floor(diffTime / (1000 * 3600 * 24)) + 1 : 0;
      setDays(calculatedDays);

      const calculatedWeeks = parseFloat((calculatedDays / 7).toFixed(3));
      setWeeks(calculatedWeeks);

      const computed = workerCount * (calculatedDays / 7) * ratePerWeek;
      const computedRounded = Math.round(computed * 100) / 100;
      setTotalComputed(computedRounded);

      const due = computedRounded - amountPaid;
      setAmountDue(Math.max(0, Math.round(due * 100) / 100));
    } else {
      setDays(0);
      setWeeks(0);
      setTotalComputed(0);
      setAmountDue(0);
    }
  }, [fromDate, toDate, workerCount, ratePerWeek, amountPaid]);

  // Set default paid amount equal to computed when computed changes (if they haven't explicitly typed different amount)
  const [userEditedPaid, setUserEditedPaid] = useState<boolean>(false);
  useEffect(() => {
    if (!userEditedPaid && totalComputed > 0) {
      setAmountPaid(totalComputed);
    }
  }, [totalComputed, userEditedPaid]);

  // Update suggestions based on selected project and previous mess bookings
  useEffect(() => {
    let baseList: string[] = [];
    if (projectId) {
      const projectWorkers = workers
        .filter(w => w.projectId === projectId)
        .map(w => w.name);
      
      const previousPaidTo = messBookings
        .filter(b => b.projectId === projectId && b.paidTo && b.paidTo.trim() !== '' && b.paidTo !== 'N/A')
        .map(b => b.paidTo);

      baseList = [...projectWorkers, ...previousPaidTo];
    } else {
      const allWorkers = workers.map(w => w.name);
      const previousPaidTo = messBookings
        .filter(b => b.paidTo && b.paidTo.trim() !== '' && b.paidTo !== 'N/A')
        .map(b => b.paidTo);

      baseList = [...allWorkers, ...previousPaidTo];
    }

    // De-duplicate suggestions and trim any extra spaces
    const cleanUnique = Array.from(new Set(
      baseList
        .map(name => name.trim())
        .filter(name => name !== '')
    ));

    setWorkerSuggestions(cleanUnique);
  }, [projectId, workers, messBookings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !fromDate || !toDate || days <= 0 || workerCount <= 0 || ratePerWeek <= 0) {
      alert("Please fill out all required fields with non-zero values.");
      return;
    }

    // Prepare ledger posting if enabled
    let postedExpenseId = undefined;
    if (postToLedger) {
      postedExpenseId = crypto.randomUUID();
      const projectObj = projects.find(p => p.id === projectId);
      const projectName = projectObj ? projectObj.name : "Selected Project";
      
      const desc = `Mess Charge (${fromDate} to ${toDate}) | ${days} Days (~${weeks} Weeks) for ${workerCount} Workers @ ₹${ratePerWeek}/wk. Paid to: ${paidTo || "N/A"}. Due: ₹${amountDue}`;
      
      const newExpense: ExpenseEntry = {
        id: postedExpenseId,
        date: paymentDate || toDate,
        description: desc,
        projectId: projectId,
        kharchi: 0,
        mess: amountPaid, // The cash actually distributed/paid from the fund
        workerAdvance: 0,
        tiffin: 0,
        travel: 0,
        machineryMaterial: 0,
        workerPayment: 0,
        stationery: 0,
        others: 0,
        crBalance: 0
      };
      
      addExpenseEntry(newExpense);
    }

    // Save mess booking calculation
    const newBooking: Omit<MessBooking, 'id'> = {
      projectId,
      fromDate,
      toDate,
      workerCount,
      ratePerWeek,
      totalComputed,
      amountPaid,
      amountDue,
      paidTo: paidTo || "N/A",
      paymentDate: paymentDate || toDate,
      remarks,
      postedExpenseId
    };

    addMessBooking(newBooking);

    // Reset Form
    setFromDate('');
    setToDate('');
    setRemarks('');
    setPaidTo('');
    setUserEditedPaid(false);
    setAmountPaid(0);
  };

  const handleDelete = (booking: MessBooking) => {
    if (confirm("Are you sure you want to delete this Mess calculations history record?")) {
      // Delete associated expense entry if existed
      if (booking.postedExpenseId) {
        deleteExpenseEntry(booking.postedExpenseId);
      }
      deleteMessBooking(booking.id);
    }
  };

  // Filter mess list
  const filteredBookings = messBookings.filter(booking => {
    const matchesProject = projectFilter === 'all' || booking.projectId === projectFilter;
    const matchesOverdue = !showOnlyOverdue || booking.amountDue > 0;
    
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      matchesSearch = (booking.paidTo && booking.paidTo.toLowerCase().includes(q)) ||
                      (booking.remarks && booking.remarks.toLowerCase().includes(q));
    }
    
    return matchesProject && matchesOverdue && matchesSearch;
  });

  // Overdue and Selection Helpers
  const overdueBookings = filteredBookings.filter(b => b.amountDue > 0);
  const isAllSelected = overdueBookings.length > 0 && overdueBookings.every(b => selectedIds.includes(b.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(overdueBookings.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleBatchPostToLedger = async () => {
    const selectedOverdue = messBookings.filter(b => selectedIds.includes(b.id) && b.amountDue > 0);
    if (selectedOverdue.length === 0) {
      alert("No overdue mess entries are selected.");
      return;
    }

    const totalDue = Math.round(selectedOverdue.reduce((sum, b) => sum + b.amountDue, 0) * 100) / 100;
    const confirmPost = confirm(`Are you sure you want to batch-post the outstanding due amount of ₹${totalDue.toLocaleString('en-IN')} for ${selectedOverdue.length} selected mess records to the Expenses Ledger in a single combined transaction? This will also update and clear their pending dues.`);
    
    if (!confirmPost) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Update each selected overdue mess booking to clear the outstanding balance
    for (const b of selectedOverdue) {
      const newPaid = Math.round((b.amountPaid + b.amountDue) * 100) / 100;
      const updatedRemarks = `${b.remarks ? b.remarks + ' | ' : ''}Dues cleared via Batch Ledger Post on ${todayStr}`;
      await updateMessBooking(b.id, {
        amountPaid: newPaid,
        amountDue: 0,
        paymentDate: todayStr,
        remarks: updatedRemarks
      });
    }

    // 2. Identify corresponding project IDs to determine ledger project grouping
    const uniqueProjectIds = Array.from(new Set<string>(selectedOverdue.map(b => b.projectId)));
    const targetProjectId = uniqueProjectIds.length === 1 ? uniqueProjectIds[0] : "";
    
    const firstProjectObj = projects.find(p => p.id === selectedOverdue[0].projectId);
    const firstProjectName = firstProjectObj ? firstProjectObj.name : "N/A";
    let ledgerDescription = "";
    if (uniqueProjectIds.length === 1) {
      ledgerDescription = `Batch Mess Due Settlement for ${firstProjectName} | ${selectedOverdue.length} periods cleared`;
    } else {
      ledgerDescription = `Batch Mess Due Settlement for Multi-Projects | ${selectedOverdue.length} periods cleared`;
    }

    // 3. Post a single combined payment entry as a single transaction in Expenses Ledger
    const newExpense: Omit<ExpenseEntry, 'id'> = {
      date: todayStr,
      description: ledgerDescription,
      projectId: targetProjectId,
      kharchi: 0,
      mess: totalDue, // Amount recorded in the mess column
      workerAdvance: 0,
      tiffin: 0,
      travel: 0,
      machineryMaterial: 0,
      workerPayment: 0,
      stationery: 0,
      others: 0,
      crBalance: 0
    };

    await addExpenseEntry(newExpense);

    // 4. Reset selection list
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="bg-[#eef2f6] border border-[#8c9ba8] p-3 rounded-sm flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-[#0056b3] uppercase tracking-wide">Mess Ledger & Calculator</h2>
          <p className="text-[10px] text-gray-600 mt-1">
            Compute week-wise mess bills for site workforces, make payment allocations, monitor pending dues, and auto-post directly to the main expenses ledger.
          </p>
        </div>
        <div className="bg-white border border-[#8c9ba8] px-3 py-1 text-xs font-mono font-bold text-gray-700">
          Total Recorded Mess Periods: {messBookings.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="lg:col-span-1 bg-white border border-[#8c9ba8] p-3 rounded-sm shadow-2xs"
        >
          <div className="bg-[#d9e4f1] border-b border-[#8c9ba8] -mx-3 -mt-3 p-1.5 mb-3 font-semibold text-gray-800 flex items-center space-x-1">
            <Calendar size={13} className="text-[#0056b3]" />
            <span>Enter Mess Calculations</span>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Target Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full border border-[#8c9ba8] p-1 text-[11px] focus:outline-none focus:border-[#0056b3]"
              >
                <option value="">-- Choose Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  className="w-full border border-[#8c9ba8] p-1 text-[11px] focus:outline-none focus:border-[#0056b3]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  className="w-full border border-[#8c9ba8] p-1 text-[11px] focus:outline-none focus:border-[#0056b3]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">No. of On-site Workers</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={workerCount}
                    onChange={(e) => setWorkerCount(Math.max(1, parseInt(e.target.value) || 0))}
                    required
                    className="w-full border border-[#8c9ba8] p-1 pr-5 text-[11px] focus:outline-none"
                  />
                  <Users size={11} className="absolute right-1.5 top-2 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Rate / Labour / Week</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ratePerWeek}
                    onChange={(e) => setRatePerWeek(Math.max(0, parseFloat(e.target.value) || 0))}
                    required
                    className="w-full border border-[#8c9ba8] p-1 pl-4 text-[11px] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* LIVE COMPUTATION MATH PREVIEW PANEL */}
            <div className="bg-[#fcf8e3] border border-[#fbeed5] p-2 text-gray-700 rounded-sm">
              <span className="font-semibold block text-[#c09853] mb-1">Auto Calculation Preview</span>
              <div className="space-y-1 text-[10px] font-mono">
                <div>Days count: <span className="font-bold">{days} days</span> {days > 0 && `(~${weeks} weeks)`}</div>
                <div>Formula: {workerCount} Workers × {weeks} Weeks × ₹{ratePerWeek}</div>
                <div className="text-xs font-bold text-gray-900 border-t border-dashed border-yellow-200 pt-1 mt-1 flex justify-between">
                  <span>Calculated Cost:</span>
                  <span>₹{totalComputed}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#8c9ba8] pt-2 mt-2 space-y-3">
              <div className="bg-[#eef2f6] p-1 rounded-xs font-semibold text-gray-700 text-[10px]">&gt; Payment Ledger Information</div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Amount Paid (Debit)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => {
                      setUserEditedPaid(true);
                      setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0));
                    }}
                    className="w-full border border-[#8c9ba8] p-1 text-[11px] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-red-700">Calculated Due (Outstanding)</label>
                  <div className="w-full border border-red-200 bg-red-50 text-red-800 p-1 font-mono font-bold text-center">
                    ₹{amountDue}
                  </div>
                </div>
              </div>

              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Whom did you hand money? (Paid To)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => {
                      setPaidTo(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Enter worker description or name"
                    className="w-full border border-[#8c9ba8] p-1 pr-6 text-[11px] focus:outline-none"
                  />
                  <Search size={11} className="absolute right-1.5 top-2 text-gray-400" />
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggestions && paidTo && workerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 max-h-32 overflow-y-auto bg-white border border-[#8c9ba8] z-50 shadow-md">
                    {workerSuggestions
                      .filter(name => name.toLowerCase().includes(paidTo.toLowerCase()))
                      .map((name, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setPaidTo(name);
                            setShowSuggestions(false);
                          }}
                          className="px-2 py-1 hover:bg-[#cce8ff] cursor-pointer"
                        >
                          {name}
                        </div>
                      ))}
                    <div 
                      onClick={() => setShowSuggestions(false)}
                      className="px-2 py-0.5 bg-gray-100 text-[9px] text-gray-500 font-bold text-center border-t cursor-pointer"
                    >
                      Close Suggestions
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Date Paid</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full border border-[#8c9ba8] p-1 text-[11px] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Payment comments / reference"
                    className="w-full border border-[#8c9ba8] p-1 text-[11px] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="chk-post"
                  checked={postToLedger}
                  onChange={(e) => setPostToLedger(e.target.checked)}
                  className="rounded-sm outline-none cursor-pointer focus:ring-0 w-3 h-3 text-blue-600 border-[#8c9ba8]"
                />
                <label htmlFor="chk-post" className="text-gray-700 font-semibold cursor-pointer select-none">
                  Automatically POST debit amount to Expenses Ledger
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full sap-btn flex items-center justify-center space-x-1 p-2 bg-[#eef2f6]"
            >
              <Plus size={14} className="text-[#0056b3]" />
              <span className="font-semibold text-[#0056b3]">Record Calculation & Ledger</span>
            </button>
          </form>
        </motion.div>

        {/* List table panel */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="lg:col-span-2 bg-white border border-[#8c9ba8] p-3 rounded-sm shadow-2xs flex flex-col min-h-[480px]"
        >
          <div className="bg-[#d9e4f1] border-b border-[#8c9ba8] -mx-3 -mt-3 p-1.5 mb-3 font-semibold text-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <CheckSquare size={13} className="text-[#0056b3]" />
              <span>Mess Calculations & Due Tracker Logs</span>
            </div>
            <div className="flex items-center space-x-2 text-[10px]">
              <div className="relative mr-2">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-gray-400 p-0.5 text-[10px] font-normal w-36 pr-4"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black font-bold">×</button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowOnlyOverdue(!showOnlyOverdue)}
                className={`px-1.5 py-0.5 rounded-xs border font-semibold flex items-center space-x-1 select-none cursor-pointer transition-colors duration-150 ${
                  showOnlyOverdue
                    ? 'bg-red-100 text-red-800 border-red-400'
                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-50'
                }`}
              >
                <AlertTriangle size={11} className={showOnlyOverdue ? 'text-red-700' : 'text-gray-400'} />
                <span>Overdue Only</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExcelImportOpen(true)}
                className="bg-green-50 text-green-800 hover:bg-green-100 px-1.5 py-0.5 rounded-xs border border-green-450 font-semibold flex items-center space-x-1 select-none cursor-pointer"
              >
                <FileSpreadsheet size={11} className="text-green-700" />
                <span>Import Excel</span>
              </button>

              <span>Filter Project:</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-white border border-gray-400 p-0.5 text-[10px] font-normal"
              >
                <option value="all">-- All Projects --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch Action Bar */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="bg-[#fff9e6] border border-[#ffebad] p-2 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-2 overflow-hidden"
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle size={14} className="text-[#b58900]" />
                  <span className="text-[11px] font-semibold text-[#856404]">
                    {selectedIds.length} overdue mess entries selected (Total Due: ₹{messBookings.filter(b => selectedIds.includes(b.id)).reduce((sum, b) => sum + b.amountDue, 0).toLocaleString('en-IN')})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded-sm hover:bg-gray-100 transition duration-150 cursor-pointer text-gray-700"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchPostToLedger}
                    className="px-2.5 py-1 text-[10px] bg-[var(--btn-hover-top)] text-white rounded-sm font-semibold hover:bg-[#004085] transition duration-150 flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckSquare size={12} />
                    <span>Batch Post Dues to Ledger</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filteredBookings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 italic p-8 border border-dashed border-gray-300">
              <Info size={24} className="mb-2 text-gray-300" />
              <span>No mess calculation records logged for the current project filter. Use the input form to create one.</span>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse border border-[#8c9ba8] text-[10px]">
                <thead className="sap-header text-[10px]">
                  <tr>
                    <th className="border border-[#8c9ba8] p-1 text-center w-8">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="cursor-pointer"
                        disabled={overdueBookings.length === 0}
                        title="Select all overdue items on this page"
                      />
                    </th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold">Project</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold">Dates Range</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold text-center">Labor Count</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold text-right">Weekly Rate</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold text-right">Computed Cost</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold text-right">Paid (Debit)</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold text-right text-red-700">Due (Short)</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold">Whom Given / Notes</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold text-center">Ledger Sync</th>
                    <th className="border border-[#8c9ba8] p-1 font-semibold text-center w-8">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filteredBookings.map((b) => {
                      const proj = projects.find(p => p.id === b.projectId);
                      const isLedgerSynced = !!b.postedExpenseId;
                      const hasDue = b.amountDue > 0;
                      
                      return (
                        <motion.tr
                          key={b.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.18 }}
                          className="hover:bg-[#e6f2ff] cursor-default text-gray-800"
                        >
                          <td className="border border-[#8c9ba8] p-1 text-center select-none">
                            {hasDue ? (
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(b.id)}
                                onChange={(e) => handleSelectOne(b.id, e.target.checked)}
                                className="cursor-pointer"
                              />
                            ) : (
                              <span className="text-gray-300 font-bold text-center">-</span>
                            )}
                          </td>
                          <td className="border border-[#8c9ba8] p-1 font-medium max-w-[80px] truncate" title={proj ? proj.name : "N/A"}>
                            {proj ? proj.name : "N/A"}
                          </td>
                          <td className="border border-[#8c9ba8] p-1 font-mono">
                            <span className="text-gray-500">{b.fromDate}</span>
                            <span className="mx-0.5 text-gray-400">→</span>
                            <span className="text-gray-900">{b.toDate}</span>
                          </td>
                          <td className="border border-[#8c9ba8] p-1 text-center font-bold">
                            {b.workerCount}
                          </td>
                          <td className="border border-[#8c9ba8] p-1 text-right font-mono">
                            ₹{b.ratePerWeek}
                          </td>
                          <td className="border border-[#8c9ba8] p-1 text-right font-mono font-semibold">
                            ₹{b.totalComputed}
                          </td>
                          <td className="border border-[#8c9ba8] p-1 text-right font-mono text-green-700 font-semibold bg-green-50/20">
                            ₹{b.amountPaid}
                          </td>
                          <td className={`border border-[#8c9ba8] p-1 font-mono font-bold ${hasDue ? 'text-red-600 bg-red-50/50' : 'text-gray-400'}`}>
                            <div className="flex items-center justify-end space-x-1">
                              {hasDue && <span title="Amount Due Pending!"><AlertTriangle size={11} className="text-red-600 fill-red-100" /></span>}
                              <span>₹{b.amountDue}</span>
                            </div>
                          </td>
                          <td className="border border-[#8c9ba8] p-1 max-w-[140px] truncate" title={`${b.paidTo}. Remarks: ${b.remarks || 'None'}`}>
                            <span className="font-semibold block">{b.paidTo}</span>
                            <span className="text-[9px] text-gray-500">{b.remarks || 'No remarks'}</span>
                          </td>
                          <td className="border border-[#8c9ba8] p-1 text-center font-bold">
                            {isLedgerSynced ? (
                              <span className="inline-block px-1 rounded-sm bg-green-100 text-green-800 border border-green-300 text-[8px] uppercase">
                                POSTED (₹{b.amountPaid})
                              </span>
                            ) : (
                              <span className="inline-block px-1 rounded-sm bg-gray-100 text-gray-600 border border-gray-300 text-[8px] uppercase">
                                Local Only
                              </span>
                            )}
                          </td>
                          <td className="border border-[#8c9ba8] p-1 text-center select-none">
                            <button
                              onClick={() => handleDelete(b)}
                              className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xs cursor-pointer inline-flex items-center justify-center"
                              title="Delete mess record"
                            >
                              <Trash2 size={11} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {/* Aggregate Stats Bar */}
          {filteredBookings.length > 0 && (
            <div className="bg-[#f2f5f8] border border-[#ffb2a0] border-t-0 p-2 mt-2 rounded-b-sm grid grid-cols-3 gap-2 text-center text-[10px]">
              <div>
                <span className="text-gray-500">Total Calculated Cost:</span>
                <span className="block font-bold text-gray-900 font-mono text-xs">
                  ₹{filteredBookings.reduce((sum, b) => sum + b.totalComputed, 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border-x border-gray-300">
                <span className="text-gray-500">Total Paid (Debited):</span>
                <span className="block font-bold text-green-700 font-mono text-xs">
                  ₹{filteredBookings.reduce((sum, b) => sum + b.amountPaid, 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-red-700">Total Outstanding (Due):</span>
                <span className="block font-bold text-red-600 font-mono text-xs">
                  ₹{filteredBookings.reduce((sum, b) => sum + b.amountDue, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['projectId', 'fromDate', 'toDate', 'workerCount', 'ratePerWeek', 'totalComputed', 'amountPaid', 'amountDue', 'paidTo', 'paymentDate', 'remarks']}
        entityName="Mess Calculations"
        projectsContext={projects}
        onUpload={async (data) => {
          for (const item of data) {
            if (!item.projectId) continue;
            await addMessBooking({
              projectId: item.projectId,
              fromDate: item.fromDate || new Date().toISOString().split('T')[0],
              toDate: item.toDate || new Date().toISOString().split('T')[0],
              workerCount: Number(item.workerCount) || 1,
              ratePerWeek: Number(item.ratePerWeek) || 1400,
              totalComputed: Number(item.totalComputed) || 0,
              amountPaid: Number(item.amountPaid) || 0,
              amountDue: Number(item.amountDue) || 0,
              paidTo: item.paidTo || '',
              paymentDate: item.paymentDate || '',
              remarks: item.remarks || '',
              postedExpenseId: ''
            });
          }
        }}
      />
    </div>
  );
};
