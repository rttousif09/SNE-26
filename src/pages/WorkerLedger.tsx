import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { PDFExportButton } from '../components/PDFExportButton';
import { 
  User, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Lock, 
  Unlock, 
  History, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  TrendingUp, 
  Save, 
  X, 
  ShieldAlert,
  Sliders,
  Sparkles
} from 'lucide-react';

export const WorkerLedger: React.FC = () => {
  const {
    workers = [],
    projects = [],
    advances = [],
    workerPayments = [],
    workerLedger = [],
    workerHolds = [],
    workerRecoveryAuditTrail = [],
    addWorkerLedgerEntry,
    updateWorkerLedgerEntry,
    deleteWorkerLedgerEntry,
    addWorkerHold,
    updateWorkerHold,
    deleteWorkerHold,
    addWorkerRecoveryAudit,
    user
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  // Search and Filter States
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Form States
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);

  // Manual Ledger Entry state
  const [ledgerForm, setLedgerForm] = useState({
    date: new Date().toISOString().split('T')[0],
    voucherNo: '',
    description: 'Manual Advance Recovery',
    type: 'Credit' as 'Debit' | 'Credit',
    amount: '',
    remarks: ''
  });

  // Hold Form state
  const [holdForm, setHoldForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    remarks: ''
  });

  // Release Held State
  const [releasingHoldId, setReleasingHoldId] = useState<string | null>(null);
  const [releaseAmount, setReleaseAmount] = useState('');
  const [releaseRemarks, setReleaseRemarks] = useState('');

  // Editing Manual Ledger Entry State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Active Selected Worker
  const activeWorker = useMemo(() => {
    return workers.find(w => w.id === selectedWorkerId);
  }, [selectedWorkerId, workers]);

  // Project site name maps
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  // Filtered list of workers based on search
  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workers;
    const query = searchQuery.toLowerCase();
    return workers.filter(w => 
      w.name.toLowerCase().includes(query) || 
      w.workerId.toLowerCase().includes(query) || 
      (w.mobileNo && w.mobileNo.includes(query))
    );
  }, [searchQuery, workers]);

  // Single Chronological Unified Ledger Builder
  const ledgerEntries = useMemo(() => {
    if (!selectedWorkerId) return [];

    const entries: Array<{
      id: string;
      date: string;
      voucherNo: string;
      description: string;
      debit: number;   // Company gave (Worker owes more)
      credit: number;  // Company recovered / payroll deduction (Worker owes less)
      source: 'Advance' | 'Payment' | 'Manual' | 'Hold' | 'Release' | 'Opening';
    }> = [];

    // 1. Worker opening balance (constructed as a debit if they already started with outstanding advance)
    if (activeWorker) {
      const openingAdv = activeWorker.openingAdvance || 0;
      if (openingAdv > 0) {
        entries.push({
          id: `opening-${activeWorker.id}`,
          date: activeWorker.joiningDate || '2026-01-01',
          voucherNo: 'OP-001',
          description: 'Opening Advance Balance',
          debit: openingAdv,
          credit: 0,
          source: 'Opening'
        });
      }
    }

    // 2. Advances Given (Debit)
    advances
      .filter(a => a.workerId === selectedWorkerId)
      .forEach(a => {
        entries.push({
          id: a.id,
          date: a.date,
          voucherNo: `ADV-${a.id.substring(0,6).toUpperCase()}`,
          description: `Capital Advance Given${a.remarks ? ` (${a.remarks})` : ''}`,
          debit: a.amount,
          credit: 0,
          source: 'Advance'
        });
      });

    // 3. Worker Payments (Credit / Deductions)
    workerPayments
      .filter(p => p.workerId === selectedWorkerId)
      .forEach(p => {
        // Recovery Amount represents repayment credit
        if (p.recoveryAmount && p.recoveryAmount > 0) {
          entries.push({
            id: `pay-recov-${p.id}`,
            date: p.date,
            voucherNo: `PAY-${p.id.substring(0,6).toUpperCase()}`,
            description: `Advance Automated Recovery [${p.month}]`,
            debit: 0,
            credit: p.recoveryAmount,
            source: 'Payment'
          });
        }
        // General Advance monthly deduction matching (for compatibility)
        if (p.advanceDeduction && p.advanceDeduction > 0) {
          entries.push({
            id: `pay-adv-ded-${p.id}`,
            date: p.date,
            voucherNo: `PAY-${p.id.substring(0,6).toUpperCase()}`,
            description: `Wage Advance Deduction [${p.month}]`,
            debit: 0,
            credit: p.advanceDeduction,
            source: 'Payment'
          });
        }
      });

    // 4. Custom Manual Ledger Entries
    workerLedger
      .filter(l => l.workerId === selectedWorkerId)
      .forEach(l => {
        entries.push({
          id: l.id,
          date: l.date,
          voucherNo: l.voucherNo || `VOU-${l.id.substring(0,6).toUpperCase()}`,
          description: `${l.description}${l.remarks ? ` - ${l.remarks}` : ''}`,
          debit: l.debit || 0,
          credit: l.credit || 0,
          source: 'Manual'
        });
      });

    // Sort chronologically by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate Running Balance dynamically
    let balance = 0;
    return entries.map(entry => {
      balance += (entry.debit - entry.credit);
      return {
        ...entry,
        runningBalance: balance
      };
    });
  }, [selectedWorkerId, activeWorker, advances, workerPayments, workerLedger]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    if (!selectedWorkerId) return { totalDebits: 0, totalCredits: 0, balance: 0, totalHeld: 0, totalReleased: 0, outstandingHeld: 0 };

    let totalDebits = 0;
    let totalCredits = 0;

    ledgerEntries.forEach(e => {
      totalDebits += e.debit;
      totalCredits += e.credit;
    });

    const activeHolds = workerHolds.filter(h => h.workerId === selectedWorkerId);
    let totalHeld = 0;
    let totalReleased = 0;

    activeHolds.forEach(h => {
      totalHeld += h.holdAmount;
      totalReleased += h.releasedAmount || 0;
    });

    const outstandingHeld = totalHeld - totalReleased;

    return {
      totalDebits,
      totalCredits,
      balance: totalDebits - totalCredits,
      totalHeld,
      totalReleased,
      outstandingHeld
    };
  }, [ledgerEntries, workerHolds, selectedWorkerId]);

  // Audits Trail Filtered
  const recoveryAudits = useMemo(() => {
    return workerRecoveryAuditTrail.filter(a => a.workerId === selectedWorkerId);
  }, [selectedWorkerId, workerRecoveryAuditTrail]);

  // Add Manual Ledger Entry
  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || isReadOnly) return;

    const amountNum = Number(ledgerForm.amount) || 0;
    const isDebit = ledgerForm.type === 'Debit';

    const entryData = {
      workerId: selectedWorkerId,
      projectId: activeWorker?.projectId || '',
      date: ledgerForm.date,
      voucherNo: ledgerForm.voucherNo || `MAN-${Math.floor(1000 + Math.random() * 9000)}`,
      description: ledgerForm.description,
      entryType: (isDebit ? 'Advance Given' : 'Advance Recovery') as any,
      debit: isDebit ? amountNum : 0,
      credit: isDebit ? 0 : amountNum,
      runningBalance: 0,
      remarks: ledgerForm.remarks
    };

    if (editingEntryId) {
      updateWorkerLedgerEntry(editingEntryId, entryData);
      setEditingEntryId(null);
    } else {
      addWorkerLedgerEntry(entryData);

      // Save an audit log of manual advance/recovery adjustment
      addWorkerRecoveryAudit({
        paymentId: entryData.voucherNo || 'Manual',
        workerId: selectedWorkerId,
        prevValue: 0,
        newValue: amountNum,
        modifiedBy: user?.name || 'Administrator',
        modifiedDate: ledgerForm.date || new Date().toISOString().split('T')[0]
      });
    }

    setLedgerForm({
      date: new Date().toISOString().split('T')[0],
      voucherNo: '',
      description: 'Manual Advance Recovery',
      type: 'Credit',
      amount: '',
      remarks: ''
    });
    setShowManualEntryModal(false);
  };

  // Add Hold Entry
  const handleSaveHold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || isReadOnly) return;

    const holdAmount = Number(holdForm.amount) || 0;
    if (holdAmount <= 0) return;

    addWorkerHold({
      workerId: selectedWorkerId,
      projectId: activeWorker?.projectId || '',
      holdDate: holdForm.date,
      holdAmount: holdAmount,
      releasedAmount: 0,
      remainingHold: holdAmount,
      status: 'Held',
      remarks: holdForm.remarks
    });

    setHoldForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      remarks: ''
    });
    setShowHoldModal(false);
  };

  // Process releasing a hold partially or fully
  const handleReleaseHold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingHoldId || isReadOnly) return;

    const relAmountNum = Number(releaseAmount) || 0;
    if (relAmountNum <= 0) return;

    const targetHold = workerHolds.find(h => h.id === releasingHoldId);
    if (!targetHold) return;

    const currentReleased = targetHold.releasedAmount || 0;
    const newReleased = currentReleased + relAmountNum;
    const isFullyReleased = newReleased >= targetHold.holdAmount;

    updateWorkerHold(releasingHoldId, {
      releasedAmount: newReleased,
      remainingHold: Math.max(0, targetHold.holdAmount - newReleased),
      status: isFullyReleased ? 'Released' : 'Partially Released'
    });

    // Enter a manual ledger entry credit so the worker's ledger reflects this released payment
    addWorkerLedgerEntry({
      workerId: targetHold.workerId,
      projectId: targetHold.projectId || '',
      date: new Date().toISOString().split('T')[0],
      voucherNo: `REL-${targetHold.id.substring(0,4).toUpperCase()}`,
      description: `Release Payment Hold (${releaseRemarks || 'Released by supervisor'})`,
      entryType: 'Other',
      debit: 0,
      credit: relAmountNum,
      runningBalance: 0,
      remarks: `Associated Hold Code ID: ${targetHold.id.substring(0,6)}`
    });

    addWorkerRecoveryAudit({
      paymentId: `REL-${targetHold.id.substring(0,4).toUpperCase()}`,
      workerId: targetHold.workerId,
      prevValue: currentReleased,
      newValue: newReleased,
      modifiedBy: user?.name || 'Administrator',
      modifiedDate: new Date().toISOString().split('T')[0]
    });

    setReleasingHoldId(null);
    setReleaseAmount('');
    setReleaseRemarks('');
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setLedgerForm({
      date: entry.date,
      voucherNo: entry.voucherNo,
      description: entry.description,
      type: entry.debit > 0 ? 'Debit' : 'Credit',
      amount: (entry.debit || entry.credit).toString(),
      remarks: entry.remarks || ''
    });
    setShowManualEntryModal(true);
  };

  return (
    <div className="space-y-4 text-[11px] p-1 select-none">
      
      {/* Upper Navigation Grid & search block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Workers List Explorer Sidebar */}
        <div className="md:col-span-1 border border-[#8c9ba8] bg-white rounded-sm flex flex-col h-[550px]">
          <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-2.5 flex items-center justify-between">
            <span className="font-bold text-gray-800 uppercase tracking-tight flex items-center space-x-1">
              <User size={13} className="text-[#0056b3]" />
              <span>Select Worker Profile</span>
            </span>
            <span className="bg-blue-150 text-[#0056b3] font-bold text-[9px] px-1.5 py-0.5 rounded-sm">
              COUNT: {workers.length}
            </span>
          </div>

          <div className="p-2 border-b border-[#8c9ba8] bg-[#f8f9fa] flex items-center space-x-1.5">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input 
              type="text"
              placeholder="Search ID, name, mobile..."
              className="sap-input py-0.5 w-full font-sans"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-1 space-y-1">
            {filteredWorkers.map(w => {
              const outstanding = advances
                .filter(a => a.workerId === w.id)
                .reduce((sum, a) => sum + a.amount, 0) -
                workerPayments
                .filter(p => p.workerId === w.id)
                .reduce((sum, p) => sum + (p.recoveryAmount || 0) + (p.advanceDeduction || 0), 0) +
                workerLedger
                .filter(l => l.workerId === w.id)
                .reduce((sum, l) => sum + l.debit - l.credit, 0) +
                (w.openingAdvance || 0);

              const isSelected = w.id === selectedWorkerId;
              const hasAdvanceOverdue = outstanding > 4000;

              return (
                <div 
                  key={w.id}
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`p-2 border rounded-sm cursor-pointer transition-all flex items-start justify-between ${
                    isSelected 
                      ? 'bg-[#cce8ff] border-[#80c2ff]' 
                      : 'bg-white hover:bg-[#e6f2ff] border-gray-200'
                  }`}
                >
                  <div className="space-y-0.5 font-sans">
                    <div className="font-bold text-gray-900 leading-tight">{w.name}</div>
                    <div className="text-[9px] text-gray-500 font-mono">
                      SR: {w.serialNo || '-'} | ID: {w.workerId}
                    </div>
                    {w.projectId && (
                      <div className="text-[9px] font-medium text-[#0056b3]">
                        {projectMap[w.projectId] || 'Transferred Site'}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`font-mono text-[10px] font-bold ${hasAdvanceOverdue ? 'text-red-650' : 'text-gray-700'}`}>
                      ₹{outstanding.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[8px] uppercase font-semibold text-gray-400">O/S ADV</span>
                  </div>
                </div>
              );
            })}
            {filteredWorkers.length === 0 && (
              <div className="p-4 text-center text-gray-400 italic font-sans">
                No workers match search criteria.
              </div>
            )}
          </div>
        </div>

        {/* Worker Ledger Screen Content Area */}
        <div className="md:col-span-3 h-[550px] overflow-y-auto border border-[#8c9ba8] bg-[#f8f9fa] rounded-sm p-3 space-y-4">
          
          {activeWorker ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              
              {/* Header profile details panel */}
              <div className="bg-white border border-[#8c9ba8] p-3 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-l-4 border-l-[#0056b3]">
                <div className="space-y-1 font-sans">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-[13px] font-black text-gray-900 uppercase">{activeWorker.name}</h2>
                    <span className="bg-gray-100 text-gray-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border border-gray-300">
                      ID: {activeWorker.workerId}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-500 text-[10px]">
                    <div>Joining Date: <strong className="text-gray-700">{activeWorker.joiningDate || 'Unknown'}</strong></div>
                    <div>Mobile: <strong className="text-gray-700 font-mono">{activeWorker.mobileNo || 'None'}</strong></div>
                    <div>Active Project Site: <strong className="text-[#0056b3] font-bold">{projectMap[activeWorker.projectId] || 'Transferred Site'}</strong></div>
                    <div>Serial Registry No: <strong className="text-gray-751 font-mono font-bold">SR-{activeWorker.serialNo || '-'}</strong></div>
                  </div>
                </div>

                {/* Quick actions controls */}
                {!isReadOnly && (
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => {
                        setEditingEntryId(null);
                        setShowManualEntryModal(true);
                      }}
                      className="sap-btn bg-white hover:bg-gray-50 flex items-center space-x-1 py-1"
                    >
                      <Plus size={11} className="text-[#0056b3]" />
                      <span>Post Ledger Entry</span>
                    </button>
                    <button 
                      onClick={() => setShowHoldModal(true)}
                      className="sap-btn bg-amber-51 hover:bg-amber-100/50 flex items-center space-x-1 py-1 text-amber-800 border-amber-300"
                    >
                      <Lock size={11} className="text-amber-800" />
                      <span>Hold Wages</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Stats Summary Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-[#8c9ba8] p-2.5 rounded-sm shadow-xs flex flex-col justify-between">
                  <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold flex items-center space-x-1">
                    <TrendingUp size={10} className="text-[#0056b3]" />
                    <span>Total Advance Debt</span>
                  </div>
                  <div className="font-mono text-xs font-black text-gray-900 mt-1">
                    ₹{summaryMetrics.totalDebits.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[8px] text-gray-400 mt-0.5 font-sans leading-[1]">Opening + Capital Advances Given</span>
                </div>

                <div className="bg-white border border-[#8c9ba8] p-2.5 rounded-sm shadow-xs flex flex-col justify-between">
                  <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold flex items-center space-x-1">
                    <TrendingUp size={10} className="text-green-700" />
                    <span>Total Recovery Sum</span>
                  </div>
                  <div className="font-mono text-xs font-black text-green-700 mt-1">
                    ₹{summaryMetrics.totalCredits.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[8px] text-gray-400 mt-0.5 font-sans leading-[1]">Payroll deductions + adjustments</span>
                </div>

                <div className="bg-white border border-[#8c9ba8] p-2.5 rounded-sm shadow-xs flex flex-col justify-between">
                  <div className="text-[9px] uppercase tracking-wider text-amber-850 font-bold flex items-center space-x-1">
                    <ShieldAlert size={10} className="text-amber-800" />
                    <span>Active Hold Cash</span>
                  </div>
                  <div className="font-mono text-xs font-black text-amber-800 mt-1">
                    ₹{summaryMetrics.outstandingHeld.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[8px] text-gray-400 mt-0.5 font-sans leading-[1]">Held amount (Unavailable for wage release)</span>
                </div>

                <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-sm shadow-xs flex flex-col justify-between border-l-4 border-l-amber-500">
                  <div className="text-[9px] uppercase tracking-wider text-red-800 font-bold flex items-center space-x-1">
                    <AlertCircle size={10} className="text-amber-800" />
                    <span>Net Advance O/S</span>
                  </div>
                  <div className="font-mono text-sm font-black text-amber-900 mt-1 leading-none">
                    ₹{summaryMetrics.balance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[8px] text-amber-700 mt-0.5 font-sans font-bold leading-[1]">Net outstanding balance worker owes SN Enterprise</span>
                </div>
              </div>

              {/* Single Chronological Unified Ledger Table */}
              <div className="bg-white border border-[#8c9ba8] rounded-sm shadow-sm overflow-hidden">
                <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-2 flex items-center justify-between">
                  <span className="font-bold text-gray-800 uppercase tracking-tight flex items-center space-x-1">
                    <History size={12} className="text-[#0056b3]" />
                    <span>Chronological Transaction Ledger</span>
                  </span>
                  <div className="flex flex-row items-center gap-2">
                    <span className="font-mono text-[9px] text-gray-500 font-bold">
                      ENTRIES: {ledgerEntries.length}
                    </span>
                    <PDFExportButton
                      title="Worker Ledger Report"
                      subtitle={`Worker: ${activeWorker?.name} (${activeWorker?.workerId})`}
                      headers={['Date', 'Voucher No', 'Description', 'Debit (Adv Given)', 'Credit (Adjusted)', 'Running Balance']}
                      data={ledgerEntries.map(e => [
                        e.date,
                        e.voucherNo,
                        e.description,
                        e.debit ? e.debit.toString() : '-',
                        e.credit ? e.credit.toString() : '-',
                        e.runningBalance.toString()
                      ])}
                    />
                  </div>
                </div>

                <table className="w-full border-collapse bg-white text-[10px]">
                  <thead className="sap-header bg-[#f8f9fa] border-b border-[#8c9ba8]">
                    <tr>
                      <th className="border-r border-[#cbd5e1] px-2 py-1 text-left font-normal w-24">Date</th>
                      <th className="border-r border-[#cbd5e1] px-2 py-1 text-left font-normal w-28">Voucher No</th>
                      <th className="border-r border-[#cbd5e1] px-2 py-1 text-left font-normal">Description</th>
                      <th className="border-r border-[#cbd5e1] px-2 py-1 text-right font-normal bg-gray-50 text-red-700 w-24">Debit (Adv Given)</th>
                      <th className="border-r border-[#cbd5e1] px-2 py-1 text-right font-normal bg-gray-50 text-green-700 w-24">Credit (Adjusted/Paid)</th>
                      <th className="border-r border-[#cbd5e1] px-2 py-1 text-right font-bold bg-[#f1f5f9] text-gray-800 w-28">Running Balance</th>
                      {!isReadOnly && <th className="px-2 py-1 text-center font-normal w-16">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry, idx) => {
                      const isOpening = entry.source === 'Opening';
                      const isAdvance = entry.source === 'Advance';
                      const isPayment = entry.source === 'Payment';
                      const isHold = entry.source === 'Hold';
                      const isManual = entry.source === 'Manual';

                      return (
                        <tr 
                          key={entry.id}
                          className={`hover:bg-[#e6f2ff] border-b border-[#e2e8f0] font-mono ${
                            isOpening ? 'bg-gray-50 font-semibold' : ''
                          }`}
                        >
                          <td className="border-r border-gray-200 px-2 py-1 text-gray-600">{entry.date}</td>
                          <td className="border-r border-gray-200 px-2 py-1 text-[#0056b3] font-bold font-mono">{entry.voucherNo}</td>
                          <td className="border-r border-gray-200 px-2 py-1 text-gray-850 font-sans flex items-center space-x-1">
                            {isAdvance && <ArrowUpRight size={10} className="text-red-500 shrink-0" />}
                            {isPayment && <ArrowDownLeft size={10} className="text-green-500 shrink-0" />}
                            {isManual && <Sliders size={10} className="text-[#0056b3] shrink-0" />}
                            <span>{entry.description}</span>
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 text-right text-red-650">
                            {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 text-right text-green-750">
                            {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 text-right font-bold text-gray-900 bg-[#f8fafc]">
                            ₹{entry.runningBalance.toLocaleString('en-IN')}
                          </td>
                          {!isReadOnly && (
                            <td className="px-2 py-1 text-center font-sans">
                              {isManual ? (
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button onClick={() => handleEditEntry(entry)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                    <Edit2 size={10} />
                                  </button>
                                  <button onClick={() => deleteWorkerLedgerEntry(entry.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[8px] text-gray-400 italic">System Auto</div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {ledgerEntries.length === 0 && (
                      <tr>
                        <td colSpan={isReadOnly ? 6 : 7} className="px-2 py-6 text-center text-gray-400 italic font-sans bg-gray-50">
                          No transactions are currently logged inside this worker ledger. Take actions above to post balances.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Double-Column Section: Active Payment Holds and Audit Trail Log */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Active Payment Holds Section */}
                <div className="bg-white border border-[#8c9ba8] rounded-sm overflow-hidden flex flex-col h-[300px]">
                  <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-2 flex items-center justify-between">
                    <span className="font-bold text-gray-800 uppercase tracking-tight flex items-center space-x-1">
                      <Lock size={12} className="text-amber-800" />
                      <span>Payment Holds Register</span>
                    </span>
                    <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1.5 py-0.5 rounded-sm">
                      OUTSTANDING HELD: ₹{summaryMetrics.outstandingHeld.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-1 space-y-1.5 bg-[#f8fafc]">
                    {workerHolds.filter(h => h.workerId === selectedWorkerId).map(hold => {
                      const outstandingHeld = hold.holdAmount - (hold.releasedAmount || 0);
                      const isFullyReleased = outstandingHeld <= 0;

                      return (
                        <div key={hold.id} className="p-2 border border-gray-250 bg-white rounded-sm space-y-1 font-sans">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] text-[#0056b3] font-bold">
                              CODE: HLD-{hold.id.substring(0,4).toUpperCase()}
                            </span>
                            <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 border rounded-sm ${
                              isFullyReleased 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-250'
                            }`}>
                              {hold.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 font-mono text-[9.5px]">
                            <div>
                              Date Hold: <strong className="text-gray-700">{hold.holdDate}</strong>
                            </div>
                            <div>
                              Held Amt: <strong className="text-red-700">₹{hold.holdAmount.toLocaleString('en-IN')}</strong>
                            </div>
                            <div>
                              Remaining Held: <strong className="text-amber-800">₹{outstandingHeld.toLocaleString('en-IN')}</strong>
                            </div>
                          </div>

                          {hold.remarks && (
                            <p className="text-[9px] text-gray-500 italic mt-0.5 leading-relaxed bg-[#f8f9fa] p-1 border border-slate-100 rounded-sm">
                              Remarks: "{hold.remarks}"
                            </p>
                          )}

                          {!isFullyReleased && !isReadOnly && (
                            <div className="flex items-center justify-end space-x-2 pt-1 border-t border-dashed border-gray-250">
                              <button 
                                onClick={() => {
                                  setReleasingHoldId(hold.id);
                                  setReleaseAmount(outstandingHeld.toString());
                                }}
                                className="sap-btn bg-[#f8f9fa] hover:bg-green-50 text-green-700 hover:text-green-800 border-green-200 py-0.5 px-2 flex items-center space-x-0.5"
                              >
                                <Unlock size={10} />
                                <span>Release payment hold</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {workerHolds.filter(h => h.workerId === selectedWorkerId).length === 0 && (
                      <div className="p-8 text-center text-gray-400 italic bg-white border border-dashed border-gray-250 rounded-sm">
                        No unpaid holds are logged on this worker's paycheck index.
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Trail Log Section */}
                <div className="bg-white border border-[#8c9ba8] rounded-sm overflow-hidden flex flex-col h-[300px]">
                  <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-2 flex items-center justify-between">
                    <span className="font-bold text-gray-800 uppercase tracking-tight flex items-center space-x-1">
                      <FileText size={12} className="text-indigo-600" />
                      <span>Ledger Recovery Audit Trail</span>
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold">
                      LOGS: {recoveryAudits.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 bg-[#f4f7f9] font-mono text-[9px]">
                    {recoveryAudits.map((audit) => (
                      <div key={audit.id} className="p-2 border border-slate-200 bg-white shadow-xs rounded-sm space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-gray-950">
                          <span>Modification log</span>
                          <span className="text-indigo-600">₹{audit.newValue.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[8.5px] text-gray-500 font-sans">
                          <div>Voucher: <strong className="font-mono text-gray-850">{audit.paymentId}</strong></div>
                          <div>Date: <strong className="font-mono text-gray-850">{audit.modifiedDate}</strong></div>
                          <div>Authorized By: <strong className="text-gray-850 font-bold">{audit.modifiedBy}</strong></div>
                        </div>
                        <div className="text-[8px] bg-slate-50 text-slate-650 italic p-1 border-l border-slate-300 mt-0.5 leading-snug font-sans">
                          Previous value state: ₹{audit.prevValue.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}

                    {recoveryAudits.length === 0 && (
                      <div className="p-8 text-center text-gray-400 italic bg-white border border-dashed border-slate-200 rounded-sm font-sans mt-1">
                        No authorization audit logs printed. Payroll adjustments produce real-time entries.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 font-sans h-full bg-white border border-[#cbd5e1]">
              <History size={40} className="text-gray-300 animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-bold text-gray-800 text-[12px] uppercase">No Worker Ledger Loaded</h3>
                <p className="text-gray-500 max-w-sm text-[10px] leading-relaxed">
                  Select a worker from the sidebar index list on the left to review their unified financial ledger, capital advances, recovery logs, and payment holds.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 print:hidden font-sans">
          <div className="bg-white border-2 border-slate-800 shadow-xl w-96 rounded-sm">
            <div className="bg-[#eef2f6] p-2.5 border-b border-[#8c9ba8] flex items-center justify-between">
              <span className="font-bold font-sans uppercase text-[10px] text-[#0056b3]">
                {editingEntryId ? 'Modify Ledger Entry' : 'Post Manual Ledger Entry'}
              </span>
              <button onClick={() => setShowManualEntryModal(false)} className="p-0.5 text-gray-500 hover:text-red-600">
                <X size={12} />
              </button>
            </div>
            <form onSubmit={handleSaveManualEntry} className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Date:</label>
                  <input 
                    type="date"
                    required
                    className="sap-input font-bold"
                    value={ledgerForm.date}
                    onChange={e => setLedgerForm({...ledgerForm, date: e.target.value})}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Voucher ID:</label>
                  <input 
                    type="text"
                    placeholder="e.g. ADJ-401"
                    className="sap-input font-bold font-mono"
                    value={ledgerForm.voucherNo}
                    onChange={e => setLedgerForm({...ledgerForm, voucherNo: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Deduction / Addition Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setLedgerForm({...ledgerForm, type: 'Debit', description: 'Manual Advance Given'})}
                    className={`p-1.5 border text-center font-bold text-[10px] ${
                      ledgerForm.type === 'Debit' 
                        ? 'bg-red-50 text-red-800 border-red-500' 
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    Debit (Advance Given)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLedgerForm({...ledgerForm, type: 'Credit', description: 'Manual Advance Recovery'})}
                    className={`p-1.5 border text-center font-bold text-[10px] ${
                      ledgerForm.type === 'Credit' 
                        ? 'bg-green-50 text-green-800 border-green-500' 
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    Credit (Repayment / Recovery)
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Amount (INR):</label>
                <input 
                  type="number"
                  required
                  step="any"
                  placeholder="₹ E.g. 5000"
                  className="sap-input font-bold text-right"
                  value={ledgerForm.amount}
                  onChange={e => setLedgerForm({...ledgerForm, amount: e.target.value})}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Description Label:</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Manual Recovery Adjustment"
                  className="sap-input font-semibold"
                  value={ledgerForm.description}
                  onChange={e => setLedgerForm({...ledgerForm, description: e.target.value})}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Remarks Context:</label>
                <textarea 
                  rows={2}
                  placeholder="Provide audit notes..."
                  className="sap-input text-[10px]"
                  value={ledgerForm.remarks}
                  onChange={e => setLedgerForm({...ledgerForm, remarks: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button type="submit" className="sap-btn bg-[#eef2f6] text-blue-750 font-bold flex items-center space-x-1 px-3">
                  <Save size={11} />
                  <span>{editingEntryId ? 'Update Entry' : 'Post Balance'}</span>
                </button>
                <button type="button" onClick={() => setShowManualEntryModal(false)} className="sap-btn hover:bg-gray-100 flex items-center space-x-1 px-3">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wage Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 print:hidden font-sans">
          <div className="bg-white border-2 border-slate-800 shadow-xl w-96 rounded-sm">
            <div className="bg-amber-50 p-2.5 border-b border-amber-300 flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1 uppercase text-[10px] text-amber-900">
                <Lock size={12} className="text-amber-800 animate-pulse" />
                <span>Place Worker Wages On Hold</span>
              </span>
              <button onClick={() => setShowHoldModal(false)} className="p-0.5 text-gray-500 hover:text-red-650">
                <X size={12} />
              </button>
            </div>
            <form onSubmit={handleSaveHold} className="p-3 space-y-3">
              <div className="flex flex-col bg-amber-50/20 p-2 border border-dashed border-amber-300 rounded text-amber-900 text-[10px] flex items-start space-x-1">
                <ShieldAlert size={14} className="text-amber-800 shrink-0 mt-0.5" />
                <div>
                  Placing wages on hold flags a specified amount of this worker's payroll ledger as unavailable for final dispersion until manually released.
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Hold Date:</label>
                <input 
                  type="date"
                  required
                  className="sap-input font-bold"
                  value={holdForm.date}
                  onChange={e => setHoldForm({...holdForm, date: e.target.value})}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Hold Amount (INR):</label>
                <input 
                  type="number"
                  required
                  step="any"
                  placeholder="₹ E.g. 10000"
                  className="sap-input font-black text-right text-amber-900"
                  value={holdForm.amount}
                  onChange={e => setHoldForm({...holdForm, amount: e.target.value})}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Hold Description/Remarks:</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Provide details on why payment is held..."
                  className="sap-input text-[10px]"
                  value={holdForm.remarks}
                  onChange={e => setHoldForm({...holdForm, remarks: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                <button type="submit" className="sap-btn bg-[#fffbeb] text-amber-850 hover:bg-amber-100/50 hover:text-amber-900 border-amber-300 font-bold flex items-center space-x-1 px-3">
                  <Lock size={11} />
                  <span>Execute Wage Hold</span>
                </button>
                <button type="button" onClick={() => setShowHoldModal(false)} className="sap-btn hover:bg-gray-100 flex items-center space-x-1 px-3">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release Hold Confirmation Modal */}
      {releasingHoldId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 print:hidden font-sans">
          <div className="bg-white border-2 border-slate-800 shadow-xl w-96 rounded-sm">
            <div className="bg-green-50 p-2.5 border-b border-green-300 flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1 uppercase text-[10px] text-green-900">
                <Unlock size={12} className="text-green-700 animate-pulse" />
                <span>Confirm Wage Release Authorization</span>
              </span>
              <button onClick={() => setReleasingHoldId(null)} className="p-0.5 text-gray-500 hover:text-red-650">
                <X size={12} />
              </button>
            </div>
            <form onSubmit={handleReleaseHold} className="p-3 space-y-3">
              <div className="flex flex-col bg-green-50/20 p-2 border border-dashed border-green-300 rounded text-green-900 text-[10px] flex items-start space-x-1">
                <CheckCircle size={14} className="text-green-700 shrink-0 mt-0.5" />
                <div>
                  This action will release held wages back to active ledger payroll credit, reducing outstanding wage hold status dynamically.
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Amount to Release (INR):</label>
                <input 
                  type="number"
                  required
                  step="any"
                  placeholder="₹ Entire outstanding or partial amount"
                  className="sap-input font-bold text-right text-green-800"
                  value={releaseAmount}
                  onChange={e => setReleaseAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 mb-1">Release Remarks Context:</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="E.g. Approved release by Saddam Hussain"
                  className="sap-input text-[10px]"
                  value={releaseRemarks}
                  onChange={e => setReleaseRemarks(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                <button type="submit" className="sap-btn bg-[#f0fdf4] text-green-800 hover:bg-green-100 border-green-300 font-bold flex items-center space-x-1 px-3">
                  <Unlock size={11} />
                  <span>Authorize Cash Release</span>
                </button>
                <button type="button" onClick={() => setReleasingHoldId(null)} className="sap-btn hover:bg-gray-100 flex items-center space-x-1 px-3">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
