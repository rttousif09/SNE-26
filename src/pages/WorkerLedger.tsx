import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../store';
import { SAPTransactionHeader } from '../components/common/SAPTransactionHeader';
import { PDFExportButton } from '../components/PDFExportButton';
import { 
  User, Search, Filter, RefreshCw, FileSpreadsheet, MapPin, Printer, AlertCircle, ShieldAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { WorkerAccountSummary, WorkerSummaryData } from '../components/worker-ledger/WorkerAccountSummary';
import { LedgerTableTab } from '../components/worker-ledger/LedgerTableTab';
import { ReconciliationTab } from '../components/worker-ledger/ReconciliationTab';
import { AuditTrailTab } from '../components/worker-ledger/AuditTrailTab';
import { 
  EarningsTab, AdvancesTab, KharchiTab, DeductionsTab, PaymentsTab, 
  RecoveryHoldsTab, ProjectHistoryTab 
} from '../components/worker-ledger/SubTabs';
import { 
  LedgerItem, TransactionDetailModal, ReversalModal, ManualAdjustmentModal, OpeningBalanceModal 
} from '../components/worker-ledger/Modals';
import { PlaceHoldModal, ReleaseHoldModal } from '../components/worker-ledger/HoldModals';

type TabKey = 
  | 'ledger' 
  | 'earnings' 
  | 'advances' 
  | 'kharchi' 
  | 'deductions' 
  | 'payments' 
  | 'recovery_holds' 
  | 'project_history' 
  | 'reconciliation' 
  | 'audit_trail';

export const WorkerLedger: React.FC = () => {
  const {
    workers = [],
    projects = [],
    advances = [],
    kharchis = [],
    workerPayments = [],
    workerHolds = [],
    workerLedger = [],
    user
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  // Selection & Filters
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('All');
  const [activeTab, setActiveTab] = useState<TabKey>('ledger');

  // Ledger Live Data from Server
  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>([]);
  const [summaryData, setSummaryData] = useState<WorkerSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Modals state
  const [inspectEntry, setInspectEntry] = useState<LedgerItem | null>(null);
  const [reversingEntry, setReversingEntry] = useState<LedgerItem | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [releasingHold, setReleasingHold] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Project map
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = workers;
    if (q) {
      list = workers.filter(w => 
        w.name.toLowerCase().includes(q) || 
        (w.workerId && w.workerId.toLowerCase().includes(q)) || 
        (w.mobileNo && w.mobileNo.includes(q))
      );
    }
    return [...list].sort((a, b) => (parseInt(a.serialNo) || 0) - (parseInt(b.serialNo) || 0));
  }, [searchQuery, workers]);

  // Active selected worker
  const activeWorker = useMemo(() => {
    if (selectedWorkerId) {
      return workers.find(w => w.id === selectedWorkerId || w.workerId === selectedWorkerId);
    }
    return filteredWorkers[0] || null;
  }, [selectedWorkerId, filteredWorkers, workers]);

  const activeId = activeWorker?.id || '';

  // Fetch Live Ledger Data and Summary from API
  const fetchLedgerAndSummary = async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      // 1. Fetch Summary
      const sumUrl = `/api/worker-ledger/summary/${activeId}${filterProject !== 'All' ? `?projectId=${filterProject}` : ''}`;
      const sumRes = await fetch(sumUrl);
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        setSummaryData(sumJson);
      }

      // 2. Fetch Ledger items
      const ledUrl = `/api/worker-ledger?workerId=${activeId}${filterProject !== 'All' ? `&projectId=${filterProject}` : ''}`;
      const ledRes = await fetch(ledUrl);
      if (ledRes.ok) {
        const ledJson = await ledRes.json();
        setLedgerEntries(ledJson);
      }
    } catch (err) {
      console.error('Error fetching worker ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeId) {
      fetchLedgerAndSummary();
    }
  }, [activeId, filterProject]);

  // Synchronize All Sub-Ledger Entries from modules
  const handleSyncLedger = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/worker-ledger/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setSyncMessage(`Sub-Ledger synchronized (${json.count} entries updated)`);
        await fetchLedgerAndSummary();
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (e: any) {
      setSyncMessage(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Reversal Execution
  const handleConfirmReversal = async (reason: string) => {
    if (!reversingEntry || isReadOnly) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/worker-ledger/reversal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-username': user?.username || 'Admin'
        },
        body: JSON.stringify({
          ledgerId: reversingEntry.id,
          reason
        })
      });
      if (res.ok) {
        setReversingEntry(null);
        await fetchLedgerAndSummary();
      } else {
        const err = await res.json();
        alert(err.error || 'Reversal failed');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Adjustment Execution
  const handleSaveAdjustment = async (formData: any) => {
    if (isReadOnly) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/worker-ledger/adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-username': user?.username || 'Admin'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAdjustmentModal(false);
        await fetchLedgerAndSummary();
      } else {
        const err = await res.json();
        alert(err.error || 'Adjustment failed');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Opening Balance Execution
  const handleSaveOpeningBalance = async (formData: any) => {
    if (isReadOnly) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/worker-ledger/opening-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-username': user?.username || 'Admin'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowOpeningBalanceModal(false);
        await fetchLedgerAndSummary();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to set opening balance');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Place Hold Execution
  const handleSaveHold = async (formData: any) => {
    if (isReadOnly) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/worker-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          releasedAmount: 0,
          remainingHold: formData.holdAmount,
          status: 'Held'
        })
      });
      if (res.ok) {
        setShowHoldModal(false);
        await handleSyncLedger();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Release Hold Execution
  const handleReleaseHold = async (holdId: string, amount: number, remarks: string) => {
    if (isReadOnly) return;
    setActionLoading(true);
    try {
      const hold = workerHolds.find(h => h.id === holdId);
      if (!hold) return;
      const currentReleased = parseFloat(String(hold.releasedAmount || 0));
      const totalReleased = currentReleased + amount;
      const holdAmt = parseFloat(String(hold.holdAmount || 0));
      const fully = totalReleased >= holdAmt;

      await fetch(`/api/worker-holds/${holdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...hold,
          releasedAmount: totalReleased,
          remainingHold: Math.max(0, holdAmt - totalReleased),
          status: fully ? 'Released' : 'Partially Released',
          releaseDate: new Date().toISOString().substring(0, 10),
          remarks: `${hold.remarks ? hold.remarks + ' | ' : ''}Released ₹${amount}: ${remarks}`
        })
      });

      setReleasingHold(null);
      await handleSyncLedger();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to open settlement breakdown when clicking payment row in payments tab
  const handleInspectPayment = (p: any) => {
    // Look up corresponding ledger entry or construct drilldown
    const match = ledgerEntries.find(l => l.paymentId === p.id || l.sourceTransactionId === p.id);
    if (match) {
      setInspectEntry(match);
    } else {
      const settlement = {
        month: p.month,
        workEarnings: parseFloat(p.grossPayable || p.workAmount || p.totalEarnings || 0),
        weeklyKharchi: parseFloat(p.totalKharchi || 0),
        messDeduction: parseFloat(p.messDeduction || 0),
        outstandingAdvance: parseFloat(p.advanceDeduction || p.recoveryAmount || 0),
        previousOverBalance: parseFloat(p.previousOverBalance || 0),
        recovery: parseFloat(p.recoveryDeduction || 0),
        otherDeduction: parseFloat(p.otherDeduction || 0),
        netPayment: parseFloat(p.netPayment || 0)
      };

      setInspectEntry({
        id: `pay-${p.id}`,
        workerId: p.workerId,
        projectId: p.projectId,
        date: p.date || `${p.month}-28`,
        voucherNo: p.voucherNo || `PAY-${p.month}`,
        description: `Disbursed Wage Settlement for ${p.month}`,
        particulars: `Wage Settlement (${p.month})`,
        entryType: 'Payment',
        debit: parseFloat(p.netPayment || 0),
        credit: 0,
        runningBalance: 0,
        balanceType: 'Cr',
        formattedBalance: '—',
        sourceModule: 'PAY01',
        sourceTransactionId: p.id,
        sourceVoucherNo: p.voucherNo || `PAY-${p.month}`,
        breakdownJson: JSON.stringify(settlement),
        status: 'Posted',
        remarks: p.remarks || 'Wage settlement voucher',
        createdBy: p.level || 'System',
        createdDate: p.date
      });
    }
  };

  // Export to Excel Redirection
  const exportFullStatementExcel = () => {
    if (!activeWorker) return;
    const data = ledgerEntries.map(e => ({
      'Date': e.date,
      'Voucher No': e.voucherNo,
      'Project': projectMap[e.projectId] || e.projectId,
      'Particulars': e.particulars || e.description,
      'Transaction Type': e.entryType,
      'Debit (Dr)': e.debit,
      'Credit (Cr)': e.credit,
      'Running Balance': e.formattedBalance || e.runningBalance,
      'Source Module': e.sourceModule,
      'Source Ref': e.sourceVoucherNo || e.sourceTransactionId,
      'Status': e.status || 'Posted',
      'Remarks': e.remarks || ''
    }));

    if (summaryData) {
      data.push({
        'Date': 'TOTALS',
        'Voucher No': '',
        'Project': '',
        'Particulars': 'Sub-Ledger Total Balance',
        'Transaction Type': '',
        'Debit (Dr)': summaryData.totalDebits,
        'Credit (Cr)': summaryData.totalCredits,
        'Running Balance': summaryData.formattedBalance,
        'Source Module': '',
        'Source Ref': '',
        'Status': '',
        'Remarks': ''
      } as any);
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Worker Financial Sub-Ledger");
    XLSX.writeFile(wb, `SN_Worker_SubLedger_${activeWorker.name.replace(/\s+/g, '_')}_${activeWorker.workerId}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F7] text-[#2F3B45] font-sans space-y-2 print:bg-white print:p-0 text-[12px]">
      
      {/* SAP Screen Header: WKL01 */}
      <SAPTransactionHeader
        tcode="WKL01"
        title="Worker Financial Sub-Ledger & Recovery"
        subtitle="Centralized Worker Financial Source of Truth, Automatic Synchronized Ledger, Breakup & Reconciliations"
        onRefresh={fetchLedgerAndSummary}
        onPrint={() => window.print()}
        canSave={false}
        canEdit={false}
        canDelete={false}
      />

      {syncMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded text-[11px] font-bold flex items-center justify-between">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Main Grid: Left Worker Directory + Right Sub-Ledger Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        
        {/* PANEL 1: Left Worker Directory (xl:col-span-3) */}
        <div className="xl:col-span-3 bg-white rounded-md shadow-sm border border-gray-300 flex flex-col h-[750px] print:hidden">
          
          <div className="p-2.5 border-b border-gray-200 bg-[#f0f4f8]">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-[#0a6ed1]" />
              <span>Worker Master Directory</span>
            </h2>
            <p className="text-[9px] text-gray-500 mt-0.5">{workers.length} active registered workers in SQLite</p>
          </div>

          {/* Search Box */}
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search ID, name, mobile..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded pl-8 pr-2 py-1 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
              />
            </div>
          </div>

          {/* Worker List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-[#f8fafc]">
            {filteredWorkers.map(w => {
              const isSelected = activeWorker?.id === w.id;
              const isActive = (w as any).status === 'Active' || !w.exitDate;
              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`p-2 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-[#0a6ed1] shadow-xs'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-[11px] flex items-center space-x-1.5">
                        <span>{w.name}</span>
                        <span className={`text-[8px] px-1 rounded font-semibold border ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isActive ? 'Active' : 'Left'}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                        ID: <strong className="text-gray-700">{w.workerId || w.id}</strong> | SR: {w.serialNo || '-'}
                      </div>
                      <div className="text-[9px] text-gray-500 font-medium mt-0.5 flex items-center space-x-1">
                        <MapPin className="w-2.5 h-2.5 text-[#0a6ed1]" />
                        <span className="truncate max-w-[130px]">{projectMap[w.projectId] || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredWorkers.length === 0 && (
              <div className="p-4 text-center text-gray-400 italic text-[11px]">No workers match search</div>
            )}
          </div>
        </div>

        {/* PANEL 2: Right Sub-Ledger Workspace (xl:col-span-9) */}
        <div className="xl:col-span-9 space-y-3">
          
          {/* Top Project Filter Ribbon & Global Tools */}
          <div className="bg-white border border-gray-300 rounded-md p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] uppercase font-bold text-gray-500 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-[#0a6ed1]" />
                <span>Sub-Ledger Project Scope:</span>
              </span>
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2.5 py-1 text-[11px] font-semibold text-gray-800 focus:outline-none focus:border-[#0a6ed1]"
              >
                <option value="All">All Projects (Complete Multi-Site Financial History)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <PDFExportButton
                title="SN ENTERPRISES - Worker Sub-Ledger Statement"
                subtitle={`Worker: ${activeWorker?.name} (${activeWorker?.workerId}) | Scope: ${filterProject === 'All' ? 'All Projects' : projectMap[filterProject]}`}
                headers={['Date', 'Voucher', 'Project', 'Particulars', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance', 'Source Ref']}
                data={ledgerEntries.map(e => [
                  e.date,
                  e.voucherNo,
                  projectMap[e.projectId] || e.projectId,
                  e.particulars || e.description,
                  e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '-',
                  e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '-',
                  e.formattedBalance || `₹${e.runningBalance}`,
                  `${e.sourceModule} / ${e.sourceVoucherNo || e.sourceTransactionId}`
                ])}
                buttonLabel="PDF Statement"
                variant="secondary"
              />
              <button
                onClick={exportFullStatementExcel}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[10px] font-bold flex items-center space-x-1 shadow-xs transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel Statement</span>
              </button>
            </div>
          </div>

          {/* 1. Worker Account Summary Header */}
          <WorkerAccountSummary
            summary={summaryData}
            loading={loading}
            onSync={handleSyncLedger}
            syncing={syncing}
            onOpenAdjustment={() => setShowAdjustmentModal(true)}
            onOpenOpeningBalance={() => setShowOpeningBalanceModal(true)}
            onOpenHold={() => setShowHoldModal(true)}
          />

          {/* 2. 10 Navigation Tabs */}
          <div className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">
            
            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 bg-[#f0f4f8] overflow-x-auto text-[11px] font-bold tracking-tight">
              {[
                { id: 'ledger', label: 'Ledger' },
                { id: 'earnings', label: 'Earnings' },
                { id: 'advances', label: 'Advances' },
                { id: 'kharchi', label: 'Kharchi' },
                { id: 'deductions', label: 'Deductions' },
                { id: 'payments', label: 'Payments' },
                { id: 'recovery_holds', label: 'Recovery & Holds' },
                { id: 'project_history', label: 'Project History' },
                { id: 'reconciliation', label: 'Reconciliation' },
                { id: 'audit_trail', label: 'Audit Trail' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#0a6ed1] text-[#0a6ed1] bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-3">
              {activeTab === 'ledger' && (
                <LedgerTableTab
                  entries={ledgerEntries}
                  loading={loading}
                  workerName={activeWorker?.name || ''}
                  workerId={activeWorker?.workerId || ''}
                  projectMap={projectMap}
                  onInspect={item => setInspectEntry(item)}
                  onReverse={item => setReversingEntry(item)}
                />
              )}

              {activeTab === 'earnings' && (
                <EarningsTab
                  workerPayments={workerPayments}
                  workerId={activeId}
                  projectId={filterProject}
                  projectMap={projectMap}
                  onInspectPayment={handleInspectPayment}
                />
              )}

              {activeTab === 'advances' && (
                <AdvancesTab
                  advances={advances}
                  workerId={activeId}
                  projectId={filterProject}
                  projectMap={projectMap}
                />
              )}

              {activeTab === 'kharchi' && (
                <KharchiTab
                  kharchis={kharchis}
                  workerId={activeId}
                  projectId={filterProject}
                  projectMap={projectMap}
                />
              )}

              {activeTab === 'deductions' && (
                <DeductionsTab
                  workerPayments={workerPayments}
                  workerLedger={ledgerEntries}
                  workerId={activeId}
                  projectId={filterProject}
                  projectMap={projectMap}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentsTab
                  workerPayments={workerPayments}
                  workerId={activeId}
                  projectId={filterProject}
                  projectMap={projectMap}
                  onInspectPayment={handleInspectPayment}
                />
              )}

              {activeTab === 'recovery_holds' && (
                <RecoveryHoldsTab
                  workerHolds={workerHolds}
                  workerId={activeId}
                  projectId={filterProject}
                  projectMap={projectMap}
                  onPlaceHold={() => setShowHoldModal(true)}
                  onReleaseHold={h => setReleasingHold(h)}
                />
              )}

              {activeTab === 'project_history' && (
                <ProjectHistoryTab
                  workerId={activeId}
                  workerPayments={workerPayments}
                  advances={advances}
                  kharchis={kharchis}
                  workerLedger={ledgerEntries}
                  projects={projects}
                  projectMap={projectMap}
                />
              )}

              {activeTab === 'reconciliation' && (
                <ReconciliationTab
                  workerId={activeId}
                  workerName={activeWorker?.name || ''}
                  projectId={filterProject}
                  projects={projects}
                />
              )}

              {activeTab === 'audit_trail' && (
                <AuditTrailTab workerId={activeId} />
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Modals */}
      <TransactionDetailModal
        isOpen={!!inspectEntry}
        onClose={() => setInspectEntry(null)}
        entry={inspectEntry}
        onReverse={item => setReversingEntry(item)}
      />

      <ReversalModal
        isOpen={!!reversingEntry}
        onClose={() => setReversingEntry(null)}
        entry={reversingEntry}
        onConfirm={handleConfirmReversal}
        loading={actionLoading}
      />

      <ManualAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        workerId={activeId}
        projectId={activeWorker?.projectId || ''}
        projects={projects}
        onSave={handleSaveAdjustment}
        loading={actionLoading}
      />

      <OpeningBalanceModal
        isOpen={showOpeningBalanceModal}
        onClose={() => setShowOpeningBalanceModal(false)}
        workerId={activeId}
        projectId={activeWorker?.projectId || ''}
        onSave={handleSaveOpeningBalance}
        loading={actionLoading}
      />

      <PlaceHoldModal
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        workerId={activeId}
        projectId={activeWorker?.projectId || ''}
        projects={projects}
        onSave={handleSaveHold}
        loading={actionLoading}
      />

      <ReleaseHoldModal
        isOpen={!!releasingHold}
        onClose={() => setReleasingHold(null)}
        hold={releasingHold}
        onRelease={handleReleaseHold}
        loading={actionLoading}
      />

    </div>
  );
};
