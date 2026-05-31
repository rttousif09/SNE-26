import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2, Search, Printer, FileSpreadsheet, Briefcase, User, Calendar, CreditCard, DollarSign, ArrowRight } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export const Workers: React.FC = () => {
  const { 
    user,
    workers, 
    projects, 
    workerPayments, 
    kharchis, 
    advances, 
    addWorker, 
    updateWorker, 
    deleteWorker 
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  const [activeView, setActiveView] = useState<'directory' | 'ledger'>('directory');
  
  // Directory Tab States
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    serialNo: '', workerId: '', name: '', projectId: '', designation: '', joiningDate: '', exitDate: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterProject, setSelectedFilterProject] = useState<string>('all');

  // Ledger Tab States
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [ledgerWorkbookTab, setLedgerWorkbookTab] = useState<'statement' | 'payments' | 'kharchi' | 'advance'>('statement');

  // Directory filter
  const filteredWorkers = workers.filter(worker => {
    if (selectedFilterProject !== 'all' && worker.projectId !== selectedFilterProject) return false;
    
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      worker.name.toLowerCase().includes(query) ||
      worker.workerId.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    const sA = parseInt(a.serialNo) || 0;
    const sB = parseInt(b.serialNo) || 0;
    return sA - sB;
  });

  const handleEdit = (worker: any) => {
    setFormData({
      serialNo: worker.serialNo,
      workerId: worker.workerId,
      name: worker.name,
      projectId: worker.projectId,
      designation: worker.designation,
      joiningDate: worker.joiningDate,
      exitDate: worker.exitDate || ''
    });
    setEditingId(worker.id);
    setIsAdding(true);
    setActiveView('directory');
  };

  const generateNextWorkerId = () => {
    const sneIds = workers
      .map(w => w.workerId)
      .filter(id => id.startsWith('SNE'))
      .map(id => parseInt(id.replace('SNE', ''), 10))
      .filter(num => !isNaN(num));

    let nextNum = 1;
    if (sneIds.length > 0) {
      nextNum = Math.max(...sneIds) + 1;
    }
    
    return `SNE${nextNum.toString().padStart(3, '0')}`;
  };

  const generateNextSerialNo = () => {
    const sNos = workers
      .map(w => parseInt(w.serialNo, 10))
      .filter(num => !isNaN(num));

    let nextNum = 1;
    if (sNos.length > 0) {
      nextNum = Math.max(...sNos) + 1;
    }
    return nextNum.toString();
  };

  const handleAddNewWorkerClick = () => {
    if (isAdding) {
      handleCancel();
    } else {
      setIsAdding(true);
      setFormData({ 
        serialNo: generateNextSerialNo(), 
        workerId: generateNextWorkerId(), 
        name: '', 
        projectId: selectedFilterProject !== 'all' ? selectedFilterProject : '', 
        designation: '', 
        joiningDate: new Date().toISOString().split('T')[0], 
        exitDate: '' 
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ serialNo: '', workerId: '', name: '', projectId: '', designation: '', joiningDate: '', exitDate: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if workerId already exists
    const existingWorker = workers.find(w => w.workerId === formData.workerId);
    if (existingWorker && existingWorker.id !== editingId) {
      alert(`Worker ID "${formData.workerId}" is already registered to ${existingWorker.name}! Please use a unique ID.`);
      return;
    }

    // Check if serialNo already exists
    const existingSerial = workers.find(w => w.serialNo === formData.serialNo);
    if (existingSerial && existingSerial.id !== editingId) {
      alert(`Serial Number "${formData.serialNo}" is already in use by ${existingSerial.name}! Please use a unique Serial Number.`);
      return;
    }
    
    if (editingId) {
      updateWorker(editingId, { ...formData });
    } else {
      addWorker({ ...formData });
    }
    handleCancel();
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const workersPerSite = projects.map(p => ({
    name: p.name,
    count: workers.filter(w => w.projectId === p.id).length
  }));

  // Ledger Filtered Workers for Sidebar Scroll Area
  const filteredLedgerWorkers = useMemo(() => {
    let list = workers;
    const q = ledgerSearch.toLowerCase().trim();
    if (q) {
      list = workers.filter(w => 
        w.name.toLowerCase().includes(q) || 
        w.workerId.toLowerCase().includes(q) ||
        w.designation.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const sA = parseInt(a.serialNo) || 0;
      const sB = parseInt(b.serialNo) || 0;
      return sA - sB;
    });
  }, [workers, ledgerSearch]);

  // Handle active worker matching
  const activeWorker = useMemo(() => {
    if (selectedWorkerId) {
      const match = workers.find(w => w.id === selectedWorkerId);
      if (match) return match;
    }
    // Fallback to first filtered worker if none or stale selected
    return filteredLedgerWorkers.length > 0 ? filteredLedgerWorkers[0] : null;
  }, [workers, selectedWorkerId, filteredLedgerWorkers]);

  // Deep financial analysis of the active worker
  const workerLedgerData = useMemo(() => {
    if (!activeWorker) return null;

    const wPayments = workerPayments.filter(wp => wp.workerId === activeWorker.id);
    const wKharchis = kharchis.filter(k => k.workerId === activeWorker.id);
    const wAdvances = advances.filter(a => a.workerId === activeWorker.id);

    // Identify all projects this worker has interacted with
    const projectsWorkedOnSet = new Set<string>();
    if (activeWorker.projectId) {
      projectsWorkedOnSet.add(activeWorker.projectId);
    }
    wPayments.forEach(p => projectsWorkedOnSet.add(p.projectId));
    wKharchis.forEach(k => projectsWorkedOnSet.add(k.projectId));
    wAdvances.forEach(a => projectsWorkedOnSet.add(a.projectId));

    const sitesWithHistory = Array.from(projectsWorkedOnSet).map(pid => {
      const project = projects.find(p => p.id === pid);
      return {
        id: pid,
        name: project ? project.name : 'Unregistered Site',
        paymentsCount: wPayments.filter(p => p.projectId === pid).length,
        kharchisCount: wKharchis.filter(k => k.projectId === pid).length,
        advancesCount: wAdvances.filter(a => a.projectId === pid).length,
      };
    });

    // Sum calculations
    const totalWorkExecuted = wPayments.reduce((sum, wp) => sum + (wp.workAmount || 0), 0);
    const totalMessDeduction = wPayments.reduce((sum, wp) => sum + (wp.messDeduction || 0), 0);
    const totalNetPaycheckSettlements = wPayments.reduce((sum, wp) => sum + (wp.netPayment || 0), 0);
    
    // Direct cash flow allowances paid
    const totalKharchiCashReceived = wKharchis.reduce((sum, k) => sum + (k.amount || 0), 0);
    const totalAdvancesLoanReceived = wAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Total Cash disbursements received in hand so far:
    // This is the combination of monthly paycheck settlements plus advances and pocket kharchi
    const totalCashDisbursed = totalNetPaycheckSettlements + totalKharchiCashReceived + totalAdvancesLoanReceived;
    const netEarningCredit = totalWorkExecuted - totalMessDeduction;
    const overallBalanceStatus = netEarningCredit - totalCashDisbursed; // Positive means Company owes Worker, Negative means Worker has taken advance/excess cash

    // Build the beautiful chronological rolling balance general ledger timeline
    const ledgerTimeline: Array<{
      date: string;
      type: 'Billing' | 'Kharchi' | 'Advance';
      site: string;
      description: string;
      chargeCredit: number; // earn (+)
      chargeDebit: number; // mess charge (-)
      cashPaidOut: number; // cash disbursed (-)
    }> = [];

    // 1. Earned months
    wPayments.forEach(wp => {
      ledgerTimeline.push({
        date: wp.date || `${wp.month}-28`,
        type: 'Billing',
        site: getProjectName(wp.projectId),
        description: `Monthly Payroll Post: ${wp.month} (Net paycheck settled: ₹${wp.netPayment})`,
        chargeCredit: wp.workAmount,
        chargeDebit: wp.messDeduction,
        cashPaidOut: wp.netPayment
      });
    });

    // 2. Weekly Kharchi pocket money sums
    wKharchis.forEach(k => {
      ledgerTimeline.push({
        date: k.date,
        type: 'Kharchi',
        site: getProjectName(k.projectId),
        description: `Pocket Cash disbursement`,
        chargeCredit: 0,
        chargeDebit: 0,
        cashPaidOut: k.amount
      });
    });

    // 3. Advance cash loans
    wAdvances.forEach(a => {
      ledgerTimeline.push({
        date: a.date,
        type: 'Advance',
        site: getProjectName(a.projectId),
        description: `Advance Loan: "${a.remarks || 'No remarks details'}" (Authorized by: ${a.paidBy})`,
        chargeCredit: 0,
        chargeDebit: 0,
        cashPaidOut: a.amount
      });
    });

    // Sort chronological: oldest to newest
    const chronologicalLedger = ledgerTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Inject rolling balances
    let currentBal = 0;
    const rollingChronologicalLedger = chronologicalLedger.map((item, index) => {
      const effect = item.chargeCredit - item.chargeDebit - item.cashPaidOut;
      currentBal += effect;
      return {
        ...item,
        rowId: index + 3,
        balanceChange: effect,
        runningBalance: currentBal
      };
    });

    return {
      wPayments,
      wKharchis,
      wAdvances,
      sitesWithHistory,
      totalWorkExecuted,
      totalMessDeduction,
      totalNetPaycheckSettlements,
      totalKharchiCashReceived,
      totalAdvancesLoanReceived,
      totalCashDisbursed,
      netEarningCredit,
      overallBalanceStatus,
      rollingChronologicalLedger
    };
  }, [activeWorker, workerPayments, kharchis, advances, projects]);

  const handlePrint = () => {
    window.print();
  };

  const currencyFormat = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div className="text-[11px] h-full flex flex-col">
      
      {/* Printable PDF Header - hidden at runtime */}
      {activeWorker && workerLedgerData && (
        <div className="hidden print:block mb-6 font-sans border-b-2 border-gray-400 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black uppercase text-gray-800 tracking-wider">SN ENTERPRISE</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Site Civil Work Audit Command Desk</p>
              <div className="text-[8px] text-gray-400 mt-2">
                <span>Date Ref: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
                <span className="mx-2">|</span>
                <span>Audit Authority: fttousif38@gmail.com</span>
              </div>
            </div>
            <div className="text-right border border-gray-300 p-2 bg-gray-50 rounded">
              <span className="text-[8px] font-bold text-gray-400 block uppercase font-mono mb-1">Target Account Profile</span>
              <span className="text-[11px] font-black text-[#0056b3] uppercase tracking-wide block">
                {activeWorker.name}
              </span>
              <span className="text-[9px] font-mono font-bold text-gray-600">
                ID NO: {activeWorker.workerId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 text-[9px] bg-slate-50 border border-gray-300 p-2 rounded">
            <div>
              <span className="text-gray-500 block font-semibold uppercase text-[8px]">Worker Role:</span>
              <span className="font-bold text-black font-sans">{activeWorker.designation}</span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold uppercase text-[8px]">Operational Sites:</span>
              <span className="font-bold text-blue-900 font-sans truncate block">
                {workerLedgerData.sitesWithHistory.map(s => s.name).join(', ') || 'Primary Registration Site'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold uppercase text-[8px]">Cumulative Earned Credits:</span>
              <span className="font-bold text-slate-800 font-mono tracking-tight text-[10px]">
                {currencyFormat(workerLedgerData.netEarningCredit)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold uppercase text-[8px]">Current Balance Status:</span>
              <span className={`font-black font-mono text-[10px] ${workerLedgerData.overallBalanceStatus >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                {workerLedgerData.overallBalanceStatus >= 0 
                  ? `DUE TO WORKER: ${currencyFormat(workerLedgerData.overallBalanceStatus)}` 
                  : `CASH ADVANCE: ${currencyFormat(Math.abs(workerLedgerData.overallBalanceStatus))}`
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SAP / Excel style main navigation tabs */}
      <div className="flex items-center space-x-1 border-b border-[#8c9ba8] bg-[#eef2f6] p-1 pb-0 select-none print:hidden">
        <button
          onClick={() => setActiveView('directory')}
          className={`px-4 py-1 text-xs font-bold rounded-t-sm border border-b-transparent transition-all flex items-center space-x-1.5 ${activeView === 'directory' ? 'bg-white border-[#8c9ba8] text-[#0056b3]' : 'bg-[#d9e4f1] text-gray-600 hover:bg-white border-transparent cursor-pointer'}`}
          id="tab-workers-directory"
        >
          <span>📊 Workers Directory Directory</span>
        </button>
        <button
          onClick={() => {
            setActiveView('ledger');
            if (workers.length > 0 && !selectedWorkerId) {
              setSelectedWorkerId(workers[0].id);
            }
          }}
          className={`px-4 py-1 text-xs font-bold rounded-t-sm border border-b-transparent transition-all flex items-center space-x-1.5 ${activeView === 'ledger' ? 'bg-white border-[#8c9ba8] text-[#0056b3]' : 'bg-[#d9e4f1] text-gray-600 hover:bg-white border-transparent cursor-pointer'}`}
          id="tab-workers-ledger"
        >
          <span>🔍 Worker deep Inquiry Ledger (Live Excel Account)</span>
        </button>
      </div>

      {activeView === 'directory' ? (
        <div className="flex-1 overflow-y-auto pt-2 print:hidden">
          {/* Action and Search Panel */}
          <div className="flex items-center justify-between mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1.5">
            {!isReadOnly ? (
              <button onClick={handleAddNewWorkerClick} className="sap-btn flex items-center space-x-1">
                {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
                <span>{isAdding ? 'Cancel' : 'New Worker'}</span>
              </button>
            ) : (
              <div className="font-semibold text-gray-700 px-1 py-0.5">Workers Directory (Read Only)</div>
            )}
            <div className="flex items-center space-x-1.5 pr-1">
              <span className="font-semibold text-gray-700">Project:</span>
              <select
                className="sap-input w-40 text-[11px]"
                value={selectedFilterProject}
                onChange={e => setSelectedFilterProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                <option value="unassigned">Unassigned / General</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <Search size={12} className="text-gray-600" />
              <span className="font-semibold text-gray-700">Filter Search:</span>
              <input
                type="text"
                className="sap-input w-52 text-[11px]"
                placeholder="Find by Name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:bg-gray-300 p-0.5 rounded text-gray-500 cursor-pointer flex items-center"
                  title="Clear Search"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* KPI Dashboard - Workers per Project site */}
          <div className="flex flex-wrap gap-2 mb-4 select-none">
            {workersPerSite.map((site, idx) => (
              <div key={idx} className="sap-panel px-3 py-1.5 flex items-center space-x-2 bg-gradient-to-r from-gray-50 to-white hover:shadow-xs transition border border-[#bcc5cf]">
                <span className="font-bold text-gray-500 text-[10px] uppercase font-mono">Site:</span>
                <span className="font-semibold text-[#002f6c]">{site.name}</span>
                <span className="px-1.5 py-0.2 text-[10px] bg-blue-100 text-blue-800 font-extrabold rounded-full">{site.count}</span>
              </div>
            ))}
          </div>

          {/* Add / Edit Worker Form */}
          <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
              onClick={handleCancel}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="sap-panel relative z-10 w-full max-w-max max-h-[95vh] overflow-y-auto p-4 shadow-[0_10px_40px_rgb(0,0,0,0.2)] bg-[#fcfdfe] rounded-md border-b-4 border-b-[#0056b3]"
            >
              <div className="font-extrabold mb-3 border-b border-[#0056b3]/30 pb-1.5 text-[#0056b3] uppercase tracking-wider text-xs flex justify-between items-center">
                <span>{editingId ? 'Edit Selected Worker' : 'Register New Worker'}</span>
                <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <div className="flex items-center">
                  <label className="w-28 font-semibold text-gray-700">Serial No:</label>
                  <input required type="text" className="sap-input flex-1" value={formData.serialNo} onChange={e => setFormData({...formData, serialNo: e.target.value})} />
                </div>
                <div className="flex items-center">
                  <label className="w-28 font-semibold text-gray-700">Worker ID (Unique):</label>
                  <input required type="text" className="sap-input flex-1 font-mono font-bold text-blue-900" placeholder="e.g. EMP001" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})} />
                </div>
                <div className="flex items-center">
                  <label className="w-28 font-semibold text-gray-700">Full Name:</label>
                  <input required type="text" className="sap-input flex-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="flex items-center">
                  <label className="w-28 font-semibold text-gray-700">Project / Site:</label>
                  <select required className="sap-input flex-1 text-[11px]" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                    <option value="">Select Site Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-28 font-semibold text-gray-700">Designation / Role:</label>
                  <select required className="sap-input flex-1 font-sans" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})}>
                    <option value="">Select Role...</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Semi Carpenter">Semi Carpenter</option>
                    <option value="Carpenter Helper">Carpenter Helper</option>
                    <option value="Fitter">Fitter</option>
                    <option value="Fitter Helper">Fitter Helper</option>
                    <option value="Rigger">Rigger</option>
                    <option value="Mason">Mason</option>
                    <option value="Foreman">Foreman</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Sr. Engineer">Sr. Engineer</option>
                    <option value="Cook">Cook</option>
                    <option value="Storeman">Storeman</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-28 font-semibold text-gray-700">Joining Date:</label>
                  <input required type="date" className="sap-input flex-1" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>
                <div className="flex items-center">
                  <label className="w-28 font-semibold text-gray-700">Exit Date (Optional):</label>
                  <input type="date" className="sap-input flex-1" value={formData.exitDate} onChange={e => setFormData({...formData, exitDate: e.target.value})} />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end pt-2 space-x-2 border-t border-gray-200 mt-2">
                  <button type="submit" className="sap-btn flex items-center space-x-1.5 bg-[#0056b3]/10 text-[#0056b3] border-[#0056b3]/40 hover:bg-[#0056b3] hover:text-white transition">
                    <Save size={12} />
                    <strong>{editingId ? 'Update Record' : 'Save Record'}</strong>
                  </button>
                  <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-700 hover:text-white transition">
                    <X size={12} />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
          )}
          </AnimatePresence>

          {/* Master Spreadsheet Table */}
          <table className="w-full border-collapse border border-[#8c9ba8] bg-white shadow-sm">
            <thead className="sap-header select-none">
              <tr className="divide-x divide-[#8c9ba8]">
                <th className="border border-[#8c9ba8] px-2 py-1.5 text-center font-bold w-12 bg-[#bcc5cf]/40">Sr No</th>
                <th className="border border-[#8c9ba8] px-3 py-1.5 text-left font-bold w-28">Worker ID</th>
                <th className="border border-[#8c9ba8] px-3 py-1.5 text-left font-bold">Worker Name</th>
                <th className="border border-[#8c9ba8] px-3 py-1.5 text-left font-bold">Primary Site Location</th>
                <th className="border border-[#8c9ba8] px-3 py-1.5 text-left font-bold">Designation/Role</th>
                <th className="border border-[#8c9ba8] px-3 py-1.5 text-left font-bold w-24">Joining Date</th>
                <th className="border border-[#8c9ba8] px-3 py-1.5 text-left font-bold w-24">Exit Date</th>
                <th className="border border-[#8c9ba8] px-2 py-1.5 text-center font-bold w-24">Deep Ledger</th>
                {!isReadOnly && <th className="border border-[#8c9ba8] px-2 py-1.5 text-center font-bold w-16">Editor</th>}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
              {Object.entries(
                filteredWorkers.reduce((acc, worker) => {
                  const pId = worker.projectId || 'unassigned';
                  if (!acc[pId]) acc[pId] = [];
                  acc[pId].push(worker);
                  return acc;
                }, {} as Record<string, typeof filteredWorkers>)
              ).flatMap(([pId, projectWorkers]) => [
                  <motion.tr 
                    layout="position"
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    key={`header-${pId}`}
                    className="bg-[#cbd4df] font-bold border-t border-b border-[#8c9ba8]">
                    <td colSpan={isReadOnly ? 8 : 9} className="px-3 py-1.5 border border-[#bcc5cf] text-[#002f6c] uppercase tracking-wider text-[10.5px]">
                      🏗️ {pId === 'unassigned' ? 'Unassigned Site / General Working Setup' : getProjectName(pId)} ({projectWorkers.length} Worker{projectWorkers.length !== 1 && 's'})
                    </td>
                  </motion.tr>,
                  ...projectWorkers.map((worker, idx) => (
                    <motion.tr 
                      layout="position"
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }} 
                      key={worker.id} 
                      className="hover:bg-[#e6f2ff] cursor-default border-b border-gray-150 divide-x divide-gray-150"
                    >
                      <td className="border border-[#bcc5cf] px-2 py-1.5 text-center font-mono text-gray-500 font-semibold">{worker.serialNo}</td>
                      <td className="border border-[#bcc5cf] px-3 py-1.5 font-mono text-blue-900 font-bold">{worker.workerId}</td>
                      <td className="border border-[#bcc5cf] px-3 py-1.5 font-bold text-gray-800">{worker.name}</td>
                      <td className="border border-[#bcc5cf] px-3 py-1.5 text-gray-700">{getProjectName(worker.projectId)}</td>
                      <td className="border border-[#bcc5cf] px-3 py-1.5 font-sans"><span className="text-xs bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded-sm font-semibold">{worker.designation}</span></td>
                      <td className="border border-[#bcc5cf] px-3 py-1.5 font-mono">{worker.joiningDate}</td>
                      <td className="border border-[#bcc5cf] px-3 py-1.5 font-mono">{worker.exitDate || <span className="text-gray-400 italic">Active</span>}</td>
                      <td className="border border-[#bcc5cf] px-2 py-1 text-center select-none">
                        <button
                          onClick={() => {
                            setSelectedWorkerId(worker.id);
                            setActiveView('ledger');
                          }}
                          className="text-[#0056b3] bg-blue-50 border border-blue-200 hover:bg-[#002f6c] hover:text-white transition px-2 py-0.5 rounded flex items-center mx-auto text-[9.5px] font-bold"
                        >
                          <span>Ledger Account</span>
                          <ArrowRight size={10} className="ml-1" />
                        </button>
                      </td>
                      {!isReadOnly && (
                        <td className="border border-[#bcc5cf] px-2 py-1 text-center select-none">
                          <div className="flex items-center justify-center space-x-2">
                            <button onClick={() => handleEdit(worker)} className="text-blue-600 hover:text-blue-800 p-0.5 border border-transparent hover:border-blue-300 rounded" title="Edit Profile Details">
                              <Edit size={12} />
                            </button>
                            <button onClick={() => setDeleteId(worker.id)} className="text-red-600 hover:text-red-800 p-0.5 border border-transparent hover:border-red-300 rounded" title="Delete Worker Registration">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))
                ])}
              {filteredWorkers.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isReadOnly ? 8 : 9} className="border border-[#8c9ba8] px-3 py-8 text-center text-gray-500 font-semibold italic bg-amber-50/10">No workers registered matching search query terms.</td>
                </motion.tr>
              )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-3 pt-2 h-full overflow-hidden">
          
          {/* LEFT Sidebar: Autocomplete Search list */}
          <div className="w-full md:w-[280px] bg-[#f8fafc] border border-[#8c9ba8] flex flex-col p-2 select-none print:hidden h-full flex-shrink-0">
            <div className="relative mb-2">
              <span className="font-extrabold text-[#002f6c] block mb-1 text-[10px] uppercase font-mono tracking-wider">Worker Directory Scope</span>
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2 text-gray-400" />
                <input
                  type="text"
                  className="sap-input w-full pl-6 text-[10.5px]"
                  placeholder="ID Employee, Name, Designation..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                />
                {ledgerSearch && (
                  <button onClick={() => setLedgerSearch('')} className="absolute right-2 text-gray-400 hover:text-black">
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable list frame */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-200 border border-[#bcc5cf] bg-white rounded-sm">
              {filteredLedgerWorkers.map((worker) => {
                const isActive = activeWorker?.id === worker.id;
                return (
                  <div
                    key={worker.id}
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`p-2 cursor-pointer transition text-[10.5px] ${isActive ? 'bg-[#cce8ff] border-l-4 border-l-[#0056b3] font-bold text-[#002f6c]' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-extrabold font-mono text-cyan-800">{worker.workerId}</span>
                      <span className="text-[9px] text-gray-400 bg-gray-100 border border-gray-200 px-1 py-0.2 rounded font-sans uppercase">{worker.serialNo}</span>
                    </div>
                    <div className="font-semibold text-black truncate w-full">{worker.name}</div>
                    <div className="flex items-center text-[9px] text-gray-400 font-sans mt-1">
                      <Briefcase size={8} className="mr-1" />
                      <span className="truncate flex-1 font-medium">{worker.designation}</span>
                      <span className="text-[8.5px] bg-[#eefcf4] text-teal-800 rounded font-bold px-1 py-0.2 border border-teal-200 ml-1 truncate max-w-[110px]" title={getProjectName(worker.projectId)}>
                        {getProjectName(worker.projectId)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredLedgerWorkers.length === 0 && (
                <div className="text-center py-8 text-gray-400 italic">No workers found.</div>
              )}
            </div>
            
            <div className="text-[9.5px] text-center bg-[#eef2f6] border border-[#bcc5cf] p-1.5 rounded-sm mt-2 text-gray-550 border-dashed">
              Select any worker card to generate a comprehensive operational audit worksheet instantly.
            </div>
          </div>

          {/* RIGHT Workspace: Core Statements & Ledger Workbooks */}
          <div className="flex-1 bg-white border border-[#8c9ba8] p-2 flex flex-col h-full overflow-y-auto">
            {activeWorker && workerLedgerData ? (
              <div className="flex flex-col h-full">
                
                {/* Actions & PDF Header */}
                <div className="flex justify-between items-center border-b border-[#bcc5cf] pb-2 mb-2 select-none print:hidden flex-wrap gap-2">
                  <div className="flex items-center space-x-1.5">
                    <User size={13} className="text-[#0056b3]" />
                    <span className="text-[12px] font-black text-[#002f6c]">
                      ACCOUNT STATEMENT LEDGER FILE: {activeWorker.name}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#eef2f6] text-[#002f6c] border border-[#bcc5cf] rounded-sm">
                      ID: {activeWorker.workerId}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <button
                      onClick={handlePrint}
                      className="sap-btn flex items-center space-x-1 font-bold bg-[#0056b3]/10 text-[#0056b3] border-[#0056b3]/50 hover:bg-[#0056b3] hover:text-white transition py-1 px-3 cursor-pointer rounded"
                      title="Generate beautiful PDF Statement Report representation for saving"
                    >
                      <Printer size={12} />
                      <span>Print / Save PDF</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        let csvContent = "data:text/csv;charset=utf-8,";
                        csvContent += `SN ENTERPRISE - WORKER AUDIT COMPREHENSIVE LEDGER SHEET\r\n`;
                        csvContent += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\r\n`;
                        csvContent += `Worker Profile: ${activeWorker.name} (${activeWorker.workerId} - ${activeWorker.designation})\r\n`;
                        csvContent += `Registration Site: ${getProjectName(activeWorker.projectId)}\r\n\r\n`;
                        
                        csvContent += `Summary Core Totals Metrics\r\n`;
                        csvContent += `Gross Work Accumulated,${workerLedgerData.totalWorkExecuted}\r\n`;
                        csvContent += `Mess Deductions applied,${workerLedgerData.totalMessDeduction}\r\n`;
                        csvContent += `Net Earnings Credits,${workerLedgerData.netEarningCredit}\r\n`;
                        csvContent += `Pocket Cash (Kharchi) Disbursed,${workerLedgerData.totalKharchiCashReceived}\r\n`;
                        csvContent += `Advances Loans Disbursed,${workerLedgerData.totalAdvancesLoanReceived}\r\n`;
                        csvContent += `Monthly settled Paychecks,${workerLedgerData.totalNetPaycheckSettlements}\r\n`;
                        csvContent += `Aggregate Paid Disbursements (Total Paid),${workerLedgerData.totalCashDisbursed}\r\n`;
                        csvContent += `Current Outstanding Balance,${workerLedgerData.overallBalanceStatus}\r\n\r\n`;

                        csvContent += `CHRONOLOGICAL TRANSACTION STATEMENT HISTORY LOG\r\n`;
                        csvContent += `Date,Type,Operating Site,Reference description,Credit Earned (+),Debit Mess Charge (-),Cash Disbursed Paid Out (-),Running balance\r\n`;
                        
                        workerLedgerData.rollingChronologicalLedger.forEach(row => {
                          csvContent += `"${row.date}","${row.type}","${row.site.replace(/"/g, '""')}","${row.description.replace(/"/g, '""')}",${row.chargeCredit},${row.chargeDebit},${row.cashPaidOut},${row.runningBalance}\r\n`;
                        });

                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `Worker_Reconciliation_Ledger_${activeWorker.name.replace(/\s+/g, '_')}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="sap-btn flex items-center space-x-1 font-bold bg-[#107c41]/10 text-[#107c41] border-[#107c41]/50 hover:bg-[#107c41] hover:text-white transition py-1 px-3 cursor-pointer rounded"
                      title="Export this specific workers comprehensive account history to Excel"
                    >
                      <FileSpreadsheet size={12} />
                      <span>Export Worker Excel</span>
                    </button>
                  </div>
                </div>

                {/* Profile Meta Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-3 bg-slate-50 border border-[#bcc5cf] p-2 rounded-sm select-none">
                  <div className="flex items-center space-x-2 border-r border-[#bcc5cf]/40 pr-2">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[8.5px] uppercase font-mono block text-gray-400">Worker Profile Detail</span>
                      <span className="font-extrabold text-black block truncate">{activeWorker.name}</span>
                      <span className="text-[9px] text-gray-500 font-mono italic block truncate">{activeWorker.designation}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 border-r border-[#bcc5cf]/40 pr-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[8.5px] uppercase font-mono block text-gray-400">Timelines joining</span>
                      <span className="font-semibold block text-[10px]">{activeWorker.joiningDate}</span>
                      <span className="text-[8.5px] block text-gray-500">Exit: {activeWorker.exitDate || 'Active in register'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 border-r border-[#bcc5cf]/40 pr-2">
                    <Briefcase size={14} className="text-slate-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[8.5px] uppercase font-mono block text-gray-400">Sites of operation ({workerLedgerData.sitesWithHistory.length})</span>
                      <span className="font-semibold text-blue-900 block truncate" title={workerLedgerData.sitesWithHistory.map(s => s.name).join(', ')}>
                        {workerLedgerData.sitesWithHistory.length > 0
                          ? workerLedgerData.sitesWithHistory.map(s => s.name).join(', ')
                          : 'No recorded operations'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pl-1 bg-[#fff8ef] rounded p-1 border border-amber-250">
                    <DollarSign size={14} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[8.5px] uppercase font-extrabold block text-amber-700">Account status</span>
                      <span className={`font-extrabold text-[10px] block ${workerLedgerData.overallBalanceStatus >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {workerLedgerData.overallBalanceStatus >= 0 ? 'DUE TO WORKER' : 'ADVANCE TAKEN'}
                      </span>
                      <span className="font-mono text-[10px] font-black">{currencyFormat(Math.abs(workerLedgerData.overallBalanceStatus))}</span>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Dashboard Row - Excel Formula Summary */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
                  <div className="border border-[#bcc5cf] bg-[#fdfdfd] p-1.5 rounded text-center select-none shadow-xs">
                    <span className="text-[8.5px] text-gray-500 font-semibold block uppercase">1. Gross Earned (A)</span>
                    <span className="font-mono font-bold text-[11px] text-[#002f6c] tracking-tight">{currencyFormat(workerLedgerData.totalWorkExecuted)}</span>
                    <span className="text-[7.5px] block text-gray-400 font-mono mt-0.5">Sum(Work_Amount)</span>
                  </div>
                  <div className="border border-[#bcc5cf] bg-[#fdfdfd] p-1.5 rounded text-center select-none shadow-xs">
                    <span className="text-[8.5px] text-red-600 block uppercase font-semibold">2. Mess Cost (B)</span>
                    <span className="font-mono font-bold text-[11px] text-red-700 tracking-tight">{currencyFormat(workerLedgerData.totalMessDeduction)}</span>
                    <span className="text-[7.5px] block text-gray-400 font-mono mt-0.5">Sum(Mess_Charges)</span>
                  </div>
                  <div className="border border-[#bcc5cf] bg-[#fdfdfd] p-1.5 rounded text-center select-none shadow-xs">
                    <span className="text-[8.5px] text-purple-700 block uppercase font-semibold">3. Net Earned (C=A-B)</span>
                    <span className="font-mono font-extrabold text-[11px] text-purple-800 tracking-tight">{currencyFormat(workerLedgerData.netEarningCredit)}</span>
                    <span className="text-[7.5px] block text-gray-400 font-mono mt-0.5">Earnings credit</span>
                  </div>
                  <div className="border border-[#bcc5cf] bg-[#fdfdfd] p-1.5 rounded text-center select-none shadow-xs">
                    <span className="text-[8.5px] text-cyan-700 block uppercase font-semibold font-sans">4. Pocket Kharchi (D)</span>
                    <span className="font-mono font-bold text-[11px] text-cyan-800 tracking-tight">{currencyFormat(workerLedgerData.totalKharchiCashReceived)}</span>
                    <span className="text-[7.5px] block text-gray-400 font-mono mt-0.5">Pocket allowances</span>
                  </div>
                  <div className="border border-[#bcc5cf] bg-[#fdfdfd] p-1.5 rounded text-center select-none shadow-xs">
                    <span className="text-[8.5px] text-amber-700 block uppercase font-semibold font-sans">5. Advances/Loans (E)</span>
                    <span className="font-mono font-bold text-[11px] text-amber-800 tracking-tight">{currencyFormat(workerLedgerData.totalAdvancesLoanReceived)}</span>
                    <span className="text-[7.5px] block text-gray-400 font-mono mt-0.5">Total cash advance</span>
                  </div>
                  <div className="border border-green-300 bg-[#f4faf6] p-1.5 rounded text-center select-none shadow-2xs">
                    <span className="text-[8.5px] text-green-700 block uppercase font-black font-sans">6. Final Balance Due</span>
                    <span className={`font-mono text-[11.5px] font-black block tracking-tight ${workerLedgerData.overallBalanceStatus >= 0 ? 'text-[#107c41]' : 'text-orange-700'}`}>
                      {currencyFormat(workerLedgerData.overallBalanceStatus)}
                    </span>
                    <span className="text-[7.5px] block text-gray-500 font-semibold uppercase mt-0.5 font-sans">
                      {workerLedgerData.overallBalanceStatus >= 0 ? 'OWED (C - PAID)' : 'Worker Advance'}
                    </span>
                  </div>
                </div>

                {/* Micro formula bar */}
                <div className="flex items-center bg-gray-50 border border-[#bcc5cf] text-[9.5px] py-0.5 px-2 font-mono shadow-inner select-none print:hidden rounded mb-3">
                  <div className="text-[#107c41] font-bold px-1 py-0.2 border-r border-[#bcc5cf] flex items-center space-x-1 shrink-0">
                    <span className="italic bg-gray-200 px-1 rounded border border-[#bcc5cf]">fx</span>
                  </div>
                  <div className="px-2 text-gray-500 font-semibold border-r border-[#bcc5cf] shrink-0">
                    RECONCILE_WORKER_CASHFLOW
                  </div>
                  <div className="flex-1 text-[#002f6c] truncate flex items-center ml-2 space-x-1">
                    <span className="text-[#107c41] font-bold">=</span>
                    <span className="font-bold">
                      NET_CREDIT({workerLedgerData.netEarningCredit}) - CASH_DISBURSED_POCKET({workerLedgerData.totalKharchiCashReceived}) - DIRECT_LOANS({workerLedgerData.totalAdvancesLoanReceived}) - MONTHLY_PAYMENTS({workerLedgerData.totalNetPaycheckSettlements})
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#107c41] font-bold bg-[#e1f3e7] px-1 px-1.5 py-0.2 border border-green-200 rounded shrink-0">
                    Ledger Status: Balanced / Ready
                  </div>
                </div>

                {/* Sub Workbook Tabs Row */}
                <div className="flex items-center bg-gray-100 border-b border-[#bcc5cf] text-[9 px] font-bold text-gray-600 px-1 select-none print:hidden mb-2">
                  <button
                    onClick={() => setLedgerWorkbookTab('statement')}
                    className={`border-t-2 px-3 py-1 text-[10px] transition-all flex items-center space-x-1 ${ledgerWorkbookTab === 'statement' ? 'bg-white border-t-[#107c41] border-l border-r border-[#bcc5cf] text-[#107c41] font-extrabold' : 'bg-transparent border-transparent hover:bg-gray-200 text-gray-500 border-l border-r border-transparent cursor-pointer'}`}
                  >
                    <FileSpreadsheet size={11} className="text-[#107c41]" />
                    <span>Sheet1: Consolidated Accounts Ledger ({workerLedgerData.rollingChronologicalLedger.length})</span>
                  </button>
                  <button
                    onClick={() => setLedgerWorkbookTab('payments')}
                    className={`border-t-2 px-3 py-1 text-[10px] transition-all flex items-center space-x-1 ${ledgerWorkbookTab === 'payments' ? 'bg-white border-t-[#107c41] border-l border-r border-[#bcc5cf] text-[#107c41] font-extrabold' : 'bg-transparent border-transparent hover:bg-gray-200 text-gray-500 border-l border-r border-transparent cursor-pointer'}`}
                  >
                    <FileSpreadsheet size={11} className="text-gray-500" />
                    <span>Sheet2: Month Paychecks Log ({workerLedgerData.wPayments.length})</span>
                  </button>
                  <button
                    onClick={() => setLedgerWorkbookTab('kharchi')}
                    className={`border-t-2 px-3 py-1 text-[10px] transition-all flex items-center space-x-1 ${ledgerWorkbookTab === 'kharchi' ? 'bg-white border-t-[#107c41] border-l border-r border-[#bcc5cf] text-[#107c41] font-extrabold' : 'bg-transparent border-transparent hover:bg-gray-200 text-gray-500 border-l border-r border-transparent cursor-pointer'}`}
                  >
                    <FileSpreadsheet size={11} className="text-gray-500" />
                    <span>Sheet3: Pocket Cash Kharchi ({workerLedgerData.wKharchis.length})</span>
                  </button>
                  <button
                    onClick={() => setLedgerWorkbookTab('advance')}
                    className={`border-t-2 px-3 py-1 text-[10px] transition-all flex items-center space-x-1 ${ledgerWorkbookTab === 'advance' ? 'bg-white border-t-[#107c41] border-l border-r border-[#bcc5cf] text-[#107c41] font-extrabold' : 'bg-transparent border-transparent hover:bg-gray-200 text-gray-500 border-l border-r border-transparent cursor-pointer'}`}
                  >
                    <FileSpreadsheet size={11} className="text-gray-500" />
                    <span>Sheet4: Personal Advances Loans ({workerLedgerData.wAdvances.length})</span>
                  </button>
                  <div className="flex-1 text-right text-gray-400 font-normal pr-1 flex items-center justify-end space-x-1 font-mono text-[8.5px]">
                    <span>Account Workbook Ref: {activeWorker.workerId}-RECON-001</span>
                  </div>
                </div>

                {/* ACTIVE SHEET FRAMEWORK */}
                <div className="flex-1 min-h-[250px] overflow-x-auto">
                  {ledgerWorkbookTab === 'statement' && (
                    <table className="w-full border-collapse border border-[#bcc5cf] bg-white text-[10 px] excel-grid">
                      <thead className="bg-[#f3f4f6]">
                        {/* Excel coordinate labels */}
                        <tr className="bg-gray-100/90 divide-x divide-gray-300 font-mono text-[9px] text-gray-500 border-b border-[#bcc5cf]">
                          <th className="excel-col-letter w-7 font-bold text-center">#</th>
                          <th className="excel-col-letter text-left px-2">Col A [Date]</th>
                          <th className="excel-col-letter text-left px-2">Col B [Transaction Category]</th>
                          <th className="excel-col-letter text-left px-2">Col C [Site location]</th>
                          <th className="excel-col-letter text-left px-2">Col D [Audit Reference reference]</th>
                          <th className="excel-col-letter text-right px-2 font-bold text-blue-800">Col E [Work Credit (+)]</th>
                          <th className="excel-col-letter text-right px-2 font-bold text-red-800">Col F [Deductions (-)]</th>
                          <th className="excel-col-letter text-right px-2 font-bold text-[#107c41]">Col G [Cash Payout (-)]</th>
                          <th className="excel-col-letter text-right px-2 font-black text-rose-900 bg-amber-50/5">Col H [Rolling Balance Status]</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerLedgerData.rollingChronologicalLedger.map((row, idx) => {
                          const isPositiveBal = row.runningBalance >= 0;
                          return (
                            <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={idx} className="hover:bg-[#e6f2ff] cursor-default border-b border-gray-150 divide-x divide-gray-150 text-[10.5px]">
                              <td className="excel-row-num">{row.rowId}</td>
                              <td className="border border-[#bcc5cf] px-2 py-1 font-mono text-gray-700">{row.date}</td>
                              <td className="border border-[#bcc5cf] px-2 py-1 font-bold">
                                <span className={`px-1.5 py-0.2 text-[8px] rounded uppercase border font-extrabold ${
                                  row.type === 'Billing' ? 'bg-[#e6f2ff] text-blue-800 border-blue-200' :
                                  row.type === 'Kharchi' ? 'bg-cyan-50 text-cyan-850 border-cyan-200' :
                                  'bg-amber-50 text-amber-850 border-amber-200'
                                }`}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="border border-[#bcc5cf] px-2 py-1 select-all font-semibold text-gray-700">{row.site}</td>
                              <td className="border border-[#bcc5cf] px-2 py-1 text-gray-500 truncate max-w-72" title={row.description}>{row.description}</td>
                              <td className="border border-[#bcc5cf] px-2 py-1 text-right font-mono text-[#002f6c] font-semibold">
                                {row.chargeCredit > 0 ? currencyFormat(row.chargeCredit) : '—'}
                              </td>
                              <td className="border border-[#bcc5cf] px-2 py-1 text-right font-mono text-red-600">
                                {row.chargeDebit > 0 ? currencyFormat(row.chargeDebit) : '—'}
                              </td>
                              <td className="border border-[#bcc5cf] px-2 py-1 text-right font-mono text-emerald-700 font-bold">
                                {row.cashPaidOut > 0 ? currencyFormat(row.cashPaidOut) : '—'}
                              </td>
                              <td className={`border border-[#bcc5cf] px-2 py-1 text-right font-mono font-extrabold ${isPositiveBal ? 'text-green-800 bg-emerald-50/10' : 'text-red-700 bg-red-50/10'}`}>
                                <div className="flex items-center justify-end space-x-1.5">
                                  <span className={`text-[7px] font-black border uppercase px-1 rounded-xs print:hidden ${
                                    isPositiveBal ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'
                                  }`}>
                                    {isPositiveBal ? 'DUE_CREDIT' : 'CASH_ADV'}
                                  </span>
                                  <span>{currencyFormat(row.runningBalance)}</span>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                        {workerLedgerData.rollingChronologicalLedger.length === 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <td className="excel-row-num">3</td>
                            <td colSpan={8} className="border border-[#bcc5cf] px-3 py-6 text-center text-gray-400 italic">No account transactions registered yet. This worker ledger is currently empty.</td>
                          </motion.tr>
                        )}
                        {/* Double outline bottom Aggregate totals */}
                        {workerLedgerData.rollingChronologicalLedger.length > 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-[#f8fafc] font-bold border-t-2 border-b-2 border-double border-gray-500 divide-x divide-gray-200 select-none text-[10.5px]">
                            <td className="excel-row-num">∑</td>
                            <td className="px-2 py-1.5 text-left text-gray-700 uppercase font-bold tracking-wide">AGGREGATE FORMULA TOTALS</td>
                            <td colSpan={3} className="text-center font-normal italic text-gray-400 text-[9px]">(Work credits, mess bills, and cash pay clearances aggregated)</td>
                            <td className="px-2 py-1.5 text-right font-mono font-bold text-blue-900">{currencyFormat(workerLedgerData.totalWorkExecuted)}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-bold text-red-650">{currencyFormat(workerLedgerData.totalMessDeduction)}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-extrabold text-emerald-800 bg-[#eefcf4]">{currencyFormat(workerLedgerData.totalCashDisbursed)}</td>
                            <td className={`px-2 py-1.5 text-right font-mono font-black border-l border-[#bcc5cf] ${workerLedgerData.overallBalanceStatus >= 0 ? 'text-[#107c41] bg-emerald-50/15' : 'text-orange-700 bg-amber-50/10'}`}>
                              {currencyFormat(workerLedgerData.overallBalanceStatus)}
                            </td>
                          </motion.tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {ledgerWorkbookTab === 'payments' && (
                    <table className="w-full border-collapse border border-[#bcc5cf] bg-white text-[10px] excel-grid">
                      <thead className="bg-[#f3f4f6]">
                        <tr className="bg-gray-100 border-b border-[#bcc5cf] divide-x divide-gray-300 font-mono text-[9px]">
                          <th className="excel-col-letter w-7">#</th>
                          <th className="excel-col-letter text-left px-2">Col A [Month]</th>
                          <th className="excel-col-letter text-left px-2">Col B [Payment Date]</th>
                          <th className="excel-col-letter text-left px-2">Col C [Executed Site]</th>
                          <th className="excel-col-letter text-right px-2">Col D [Gross Work sum]</th>
                          <th className="excel-col-letter text-right px-2 text-red-600">Col E [Mess food charge]</th>
                          <th className="excel-col-letter text-right px-2 text-red-650">Col F [Kharchi Deducted]</th>
                          <th className="excel-col-letter text-right px-2 text-red-650">Col G [Advance Deducted]</th>
                          <th className="excel-col-letter text-right px-2 font-bold text-green-800">Col H [Net Settled pay]</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerLedgerData.wPayments.map((pay, idx) => (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.03 || 0 }} key={pay.id} className="hover:bg-[#e6f2ff] cursor-default border-b border-gray-150 divide-x divide-gray-150 text-[10.5px]">
                            <td className="excel-row-num">{idx + 3}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-bold text-cyan-900 font-mono">{pay.month}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-mono">{pay.date}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-semibold text-gray-750">{getProjectName(pay.projectId)}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono">{currencyFormat(pay.workAmount)}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono text-red-600">{currencyFormat(pay.messDeduction)}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono text-red-500">{currencyFormat(pay.kharchiDeduction)}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono text-red-500">{currencyFormat(pay.advanceDeduction)}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono text-emerald-800 font-extrabold bg-[#eefcf4]">{currencyFormat(pay.netPayment)}</td>
                          </motion.tr>
                        ))}
                        {workerLedgerData.wPayments.length === 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <td className="excel-row-num">3</td>
                            <td colSpan={8} className="border border-[#bcc5cf] px-3 py-6 text-center text-gray-400 italic">No monthly payroll sheets recorded for this worker.</td>
                          </motion.tr>
                        )}
                        {workerLedgerData.wPayments.length > 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-gray-100 font-bold border-t border-b border-[#bcc5cf] text-[10.5px]">
                            <td className="excel-row-num">∑</td>
                            <td className="px-2 py-1.5 text-left text-gray-800 font-bold uppercase">PAYMENTS ACCUMULATION</td>
                            <td colSpan={2}></td>
                            <td className="px-2 py-1.5 text-right font-mono">{currencyFormat(workerLedgerData.totalWorkExecuted)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-red-600">{currencyFormat(workerLedgerData.totalMessDeduction)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-red-650">{currencyFormat(workerLedgerData.wPayments.reduce((s, wp)=> s + (wp.kharchiDeduction || 0), 0))}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-red-650">{currencyFormat(workerLedgerData.wPayments.reduce((s, wp)=> s + (wp.advanceDeduction || 0), 0))}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-green-800 bg-[#eefcf4]">{currencyFormat(workerLedgerData.totalNetPaycheckSettlements)}</td>
                          </motion.tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {ledgerWorkbookTab === 'kharchi' && (
                    <table className="w-full border-collapse border border-[#bcc5cf] bg-white text-[10px] excel-grid">
                      <thead className="bg-[#f3f4f6]">
                        <tr className="bg-gray-100 border-b border-[#bcc5cf] divide-x divide-gray-300 font-mono text-[9px]">
                          <th className="excel-col-letter w-7">#</th>
                          <th className="excel-col-letter text-left px-2">Col A [Disbursement Date]</th>
                          <th className="excel-col-letter text-left px-2">Col B [Source Operating Project Site]</th>
                          <th className="excel-col-letter text-left px-2">Col C [Reference Remarks]</th>
                          <th className="excel-col-letter text-right px-2 font-bold text-red-800">Col D [Pocket Allowance Amount]</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerLedgerData.wKharchis.map((kharchi, i) => (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={kharchi.id} className="hover:bg-[#e6f2ff] cursor-default border-b border-gray-150 divide-x divide-gray-150 text-[10.5px]">
                            <td className="excel-row-num">{i + 3}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-mono text-gray-700">{kharchi.date}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-semibold text-gray-800">{getProjectName(kharchi.projectId)}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-gray-400 italic">Pocket kharchi allowance distribution</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono font-bold text-red-650">{currencyFormat(kharchi.amount)}</td>
                          </motion.tr>
                        ))}
                        {workerLedgerData.wKharchis.length === 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <td className="excel-row-num">3</td>
                            <td colSpan={4} className="border border-[#bcc5cf] px-3 py-6 text-center text-gray-400 italic">No pocket money (kharchi) entries registered for this worker in the database logs.</td>
                          </motion.tr>
                        )}
                        {workerLedgerData.wKharchis.length > 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-gray-100 font-bold border-t border-b border-[#bcc5cf] text-[10.5px]">
                            <td className="excel-row-num">∑</td>
                            <td className="px-2 py-1.5 text-left text-gray-800 font-bold uppercase">CUMULATIVE KHARCHI PUSHED</td>
                            <td colSpan={2}></td>
                            <td className="px-2 py-1.5 text-right font-mono text-red-700">{currencyFormat(workerLedgerData.totalKharchiCashReceived)}</td>
                          </motion.tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {ledgerWorkbookTab === 'advance' && (
                    <table className="w-full border-collapse border border-[#bcc5cf] bg-white text-[10px] excel-grid">
                      <thead className="bg-[#f3f4f6]">
                        <tr className="bg-gray-100 border-b border-[#bcc5cf] divide-x divide-gray-300 font-mono text-[9px]">
                          <th className="excel-col-letter w-7">#</th>
                          <th className="excel-col-letter text-left px-2">Col A [Disbursement Date]</th>
                          <th className="excel-col-letter text-left px-2">Col B [Source Operating Project Site]</th>
                          <th className="excel-col-letter text-left px-2">Col C [Issued / Paid By Executive]</th>
                          <th className="excel-col-letter text-left px-2">Col D [Reference Reason Remarks]</th>
                          <th className="excel-col-letter text-right px-2 font-bold text-red-800">Col E [Advance loan cash]</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerLedgerData.wAdvances.map((adv, i) => (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={adv.id} className="hover:bg-[#e6f2ff] cursor-default border-b border-gray-150 divide-x divide-gray-150 text-[10.5px]">
                            <td className="excel-row-num">{i + 3}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-mono text-gray-700">{adv.date}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-semibold text-gray-800">{getProjectName(adv.projectId)}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 font-bold text-[#002f6c]">{adv.paidBy}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-gray-500 max-w-72 truncate" title={adv.remarks}>{adv.remarks || '—'}</td>
                            <td className="border border-[#bcc5cf] px-2 py-1.5 text-right font-mono font-bold text-red-700 bg-red-50/5">{currencyFormat(adv.amount)}</td>
                          </motion.tr>
                        ))}
                        {workerLedgerData.wAdvances.length === 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <td className="excel-row-num">3</td>
                            <td colSpan={5} className="border border-[#bcc5cf] px-3 py-6 text-center text-gray-400 italic">No advance personal loans recorded for this worker.</td>
                          </motion.tr>
                        )}
                        {workerLedgerData.wAdvances.length > 0 && (
                          <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-gray-100 font-bold border-t border-b border-[#bcc5cf] text-[10.5px]">
                            <td className="excel-row-num">∑</td>
                            <td className="px-2 py-1.5 text-left text-gray-800 font-bold uppercase">TOTAL ADVANCES DISBURSED</td>
                            <td colSpan={3}></td>
                            <td className="px-2 py-1.5 text-right font-mono text-red-700">{currencyFormat(workerLedgerData.totalAdvancesLoanReceived)}</td>
                          </motion.tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Printable Approvals Section Block (stamp, prepares, signs) */}
                <div className="print-signature-section">
                  <div className="print-signature-box">
                    <div className="print-signature-title">Approved by Director</div>
                    <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-400 text-center select-none border border-dashed border-[#bcc5cf]">
                <User size={36} className="text-gray-300 mb-2" />
                <span className="font-extrabold text-[12px] text-[#002f6c] mb-1">Worker Account Card Console</span>
                <p className="max-w-md text-[10.5px] leading-relaxed text-gray-500">
                  Please select a worker name or employee ID card on the left directory navigation panel to generate their comprehensive 360° audit statement in chronological view instantly!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roster delete validation modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Worker Registration"
        message="Are you sure you want to delete this worker registration profile? All nested payroll items, kharchis, and advances for this worker will remain recorded in database accounts but the directory index entry will be permanently removed. This action is irreversible."
        onConfirm={() => {
          if (deleteId) deleteWorker(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
