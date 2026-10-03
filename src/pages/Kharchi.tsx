import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../store';
import { SAPTransactionHeader } from '../components/common/SAPTransactionHeader';
import { PDFExportButton } from '../components/PDFExportButton';
import { SAPSelect } from '../components/SAPSelect';
import { 
  Filter, Plus, RefreshCw, Printer, FileSpreadsheet, Search, Calendar, 
  MapPin, User, CheckCircle2, AlertTriangle, ArrowUpDown, Eye, Edit2, RotateCcw, 
  ChevronLeft, MoreHorizontal, Save, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { KharchiSummaryRibbon, KharchiSummaryData } from '../components/worker-kharchi/KharchiSummaryRibbon';
import { KharchiEntryModal } from '../components/worker-kharchi/KharchiEntryModal';
import { KharchiDetailModal, KharchiCancelModal } from '../components/worker-kharchi/KharchiModals';
import { 
  KharchiLedgerTab, WorkerSummaryTab, WorkerDetailView, 
  KharchiReconciliationTab, KharchiAuditTab 
} from '../components/worker-kharchi/KharchiViews';

type MainTab = 'ledger' | 'workers' | 'reconciliation' | 'audit_trail';

export const Kharchi: React.FC = () => {
  const { user, projects = [], workers = [] } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';

  // State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<KharchiSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('ledger');

  // Filters
  const [selectedProject, setSelectedProject] = useState('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Selected Worker for Detail View
  const [detailWorkerId, setDetailWorkerId] = useState<string | null>(null);

  // Modals state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [inspectingTransaction, setInspectingTransaction] = useState<any | null>(null);
  const [cancellingTransaction, setCancellingTransaction] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Kharchi data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch transactions
      let txUrl = '/api/worker-kharchi?';
      const params = new URLSearchParams();
      if (selectedProject !== 'All') params.append('projectId', selectedProject);
      if (dateStart) params.append('dateStart', dateStart);
      if (dateEnd) params.append('dateEnd', dateEnd);

      const [txRes, sumRes] = await Promise.all([
        fetch(txUrl + params.toString()),
        fetch(`/api/worker-kharchi/summary?${selectedProject !== 'All' ? 'projectId=' + selectedProject : ''}`)
      ]);

      if (txRes.ok) {
        const txJson = await txRes.json();
        setTransactions(txJson);
      }
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        setSummaryData(sumJson);
      }
    } catch (err) {
      console.error("Error loading kharchi ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject, dateStart, dateEnd]);

  // Handle Save (Create / Update)
  const handleSaveKharchi = async (formData: any) => {
    if (isReadOnly) return;
    setActionLoading(true);
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/worker-kharchi/${formData.id}` : '/api/worker-kharchi';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-username': user?.username || 'Supervisor'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowEntryModal(false);
        setEditingTransaction(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save kharchi transaction');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel transaction (Reversal in WKL01)
  const handleConfirmCancel = async (reason: string) => {
    if (!cancellingTransaction || isReadOnly) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/worker-kharchi/${cancellingTransaction.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-username': user?.username || 'Supervisor'
        },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        setCancellingTransaction(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to cancel transaction');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Export full excel register
  const handleExportFullExcel = () => {
    const data = transactions.map(t => ({
      'Date': t.date,
      'Voucher No': t.voucherNo,
      'Project': t.projectName || t.projectId,
      'Worker ID': t.workerEmployeeId || t.workerId,
      'Worker Name': t.workerName,
      'Kharchi Type': t.kharchiType,
      'Amount (INR)': parseFloat(t.amount || 0),
      'Recovered (INR)': parseFloat(t.recoveredAmount || 0),
      'Outstanding (INR)': parseFloat(t.outstandingAmount || 0),
      'Status': t.status,
      'Payment Mode': t.paymentMode || 'Cash',
      'Paid By': t.paidBy || 'Site Supervisor',
      'Remarks': t.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KHAR01 Kharchi Ledger");
    XLSX.writeFile(wb, `SN_KHAR01_Worker_Kharchi_Ledger_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F7] text-[#2F3B45] font-sans space-y-2 print:bg-white print:p-0 text-[12px]">
      
      {/* SAP Screen Header: KHAR01 */}
      <SAPTransactionHeader
        tcode="KHAR01"
        title="Worker Kharchi Ledger"
        subtitle="Worker Pocket Money Sub-Ledger, Continuous Liability Tracking, Multi-Project Histories & PAY01 Integration"
        onRefresh={fetchData}
        onPrint={() => window.print()}
        canSave={false}
        canEdit={false}
        canDelete={false}
      />

      {/* SAP Toolbar Action Strip */}
      <div className="bg-white border border-gray-300 rounded px-3 py-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2 text-[11px] print:hidden">
        <div className="flex items-center space-x-1">
          {detailWorkerId && (
            <button
              onClick={() => setDetailWorkerId(null)}
              className="px-2 py-0.5 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold flex items-center space-x-1 mr-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={() => { setEditingTransaction(null); setShowEntryModal(true); }}
            className="px-2.5 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold flex items-center space-x-1 shadow-xs transition"
          >
            <Plus className="w-3 h-3" />
            <span>Create</span>
          </button>

          <button
            onClick={fetchData}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3 text-gray-500" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportFullExcel}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center space-x-1"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            <span>Export</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1"
          >
            <Printer className="w-3 h-3 text-gray-500" />
            <span>Print</span>
          </button>
        </div>

        {/* Filters in Toolbar */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-gray-500">Project:</span>
            <SAPSelect
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-0.5 text-[11px]"
            >
              <option value="All">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SAPSelect>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-gray-500">Date:</span>
            <input
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[10.5px]"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[10.5px]"
            />
            {(dateStart || dateEnd || selectedProject !== 'All') && (
              <button
                onClick={() => { setDateStart(''); setDateEnd(''); setSelectedProject('All'); }}
                className="text-[9.5px] font-bold text-rose-600 hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary Ribbon */}
      <KharchiSummaryRibbon
        summary={summaryData}
        loading={loading}
        onRefresh={fetchData}
        onCreateNew={() => { setEditingTransaction(null); setShowEntryModal(true); }}
        onExportExcel={handleExportFullExcel}
        onPrint={() => window.print()}
      />

      {/* Main Content Workspace */}
      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
        
        {/* Navigation Tabs (ALV Style) */}
        {!detailWorkerId && (
          <div className="flex border-b border-gray-200 bg-[#f0f4f8] overflow-x-auto text-[11px] font-bold">
            {[
              { id: 'ledger', label: 'Kharchi Sub-Ledger (ALV)' },
              { id: 'workers', label: 'Worker-wise Summary' },
              { id: 'reconciliation', label: 'Mathematical Reconciliation' },
              { id: 'audit_trail', label: 'Audit Trail & Operations' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MainTab)}
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
        )}

        {/* Tab Viewport */}
        <div className="p-3">
          {detailWorkerId ? (
            <WorkerDetailView
              workerId={detailWorkerId}
              workers={workers}
              projects={projects}
              allTransactions={transactions}
              onBack={() => setDetailWorkerId(null)}
              onInspect={tx => setInspectingTransaction(tx)}
            />
          ) : (
            <>
              {activeTab === 'ledger' && (
                <KharchiLedgerTab
                  transactions={transactions}
                  loading={loading}
                  onInspect={tx => setInspectingTransaction(tx)}
                  onEdit={tx => { setEditingTransaction(tx); setShowEntryModal(true); }}
                  onCancel={tx => setCancellingTransaction(tx)}
                  onSelectWorkerDetail={wId => setDetailWorkerId(wId)}
                />
              )}

              {activeTab === 'workers' && (
                <WorkerSummaryTab
                  workerSummary={summaryData?.workerSummary || []}
                  onSelectWorker={wId => setDetailWorkerId(wId)}
                />
              )}

              {activeTab === 'reconciliation' && (
                <KharchiReconciliationTab summary={summaryData} />
              )}

              {activeTab === 'audit_trail' && (
                <KharchiAuditTab />
              )}
            </>
          )}
        </div>

      </div>

      {/* Modals */}
      <KharchiEntryModal
        isOpen={showEntryModal}
        onClose={() => { setShowEntryModal(false); setEditingTransaction(null); }}
        projects={projects}
        workers={workers}
        onSave={handleSaveKharchi}
        loading={actionLoading}
        editingTransaction={editingTransaction}
      />

      <KharchiDetailModal
        isOpen={!!inspectingTransaction}
        onClose={() => setInspectingTransaction(null)}
        transaction={inspectingTransaction}
        onCancelClick={tx => setCancellingTransaction(tx)}
      />

      <KharchiCancelModal
        isOpen={!!cancellingTransaction}
        onClose={() => setCancellingTransaction(null)}
        transaction={cancellingTransaction}
        onConfirm={handleConfirmCancel}
        loading={actionLoading}
      />

    </div>
  );
};
