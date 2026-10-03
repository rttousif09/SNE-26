import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Calendar, User, DollarSign, CreditCard } from 'lucide-react';
import { SAPSelect } from '../SAPSelect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string; workerId?: string; projectId?: string; serialNo?: string }>;
  onSave: (data: any) => Promise<void>;
  loading: boolean;
  editingTransaction?: any | null;
}

export const KharchiEntryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projects,
  workers,
  onSave,
  loading,
  editingTransaction
}) => {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [workerId, setWorkerId] = useState('');
  const [kharchiType, setKharchiType] = useState('Weekly Kharchi');
  const [specifyOtherKharchi, setSpecifyOtherKharchi] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidBy, setPaidBy] = useState('Site Supervisor');
  const [remarks, setRemarks] = useState('');
  const [filterWorkerByProject, setFilterWorkerByProject] = useState(true);

  // Initialize or reset form
  useEffect(() => {
    if (editingTransaction) {
      setProjectId(editingTransaction.projectId || '');
      setDate(editingTransaction.date || new Date().toISOString().substring(0, 10));
      setWorkerId(editingTransaction.workerId || '');
      setKharchiType(editingTransaction.kharchiType || 'Weekly Kharchi');
      setSpecifyOtherKharchi(editingTransaction.specifyOtherKharchi || '');
      setAmount(String(editingTransaction.amount || ''));
      setPaymentMode(editingTransaction.paymentMode || 'Cash');
      setPaidBy(editingTransaction.paidBy || 'Site Supervisor');
      setRemarks(editingTransaction.remarks || '');
    } else {
      setProjectId(projects[0]?.id || '');
      setDate(new Date().toISOString().substring(0, 10));
      setWorkerId('');
      setKharchiType('Weekly Kharchi');
      setSpecifyOtherKharchi('');
      setAmount('');
      setPaymentMode('Cash');
      setPaidBy('Site Supervisor');
      setRemarks('');
    }
  }, [editingTransaction, projects, isOpen]);

  // Project workers filtering
  const availableWorkers = workers.filter(w => {
    if (!filterWorkerByProject) return true;
    if (!projectId) return true;
    return w.projectId === projectId;
  });

  const selectedWorker = workers.find(w => w.id === workerId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert("Amount must be positive and greater than zero");
      return;
    }
    if (!workerId) {
      alert("Please select a worker");
      return;
    }
    if (!projectId) {
      alert("Please select a project");
      return;
    }

    await onSave({
      id: editingTransaction?.id,
      projectId,
      workerId,
      date,
      kharchiType,
      specifyOtherKharchi: kharchiType === 'Other Kharchi' ? specifyOtherKharchi : null,
      amount: numAmt,
      paymentMode,
      paidBy,
      remarks
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded shadow-xl border border-gray-400 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="bg-[#f0f4f8] px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-[#0a6ed1]" />
            <span className="font-bold text-gray-900 text-xs">
              {editingTransaction ? `Edit Kharchi Voucher [${editingTransaction.voucherNo}]` : 'Create Kharchi Transaction (KHAR01)'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          {/* Row 1: Project & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Project / Site <span className="text-red-500">*</span>
              </label>
              <SAPSelect
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </SAPSelect>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Disbursement Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
              />
            </div>
          </div>

          {/* Row 2: Worker Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-gray-700 font-bold">
                Worker <span className="text-red-500">*</span>
              </label>
              <label className="flex items-center space-x-1 text-[10px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterWorkerByProject}
                  onChange={e => setFilterWorkerByProject(e.target.checked)}
                  className="rounded text-[#0a6ed1]"
                />
                <span>Filter workers by selected project</span>
              </label>
            </div>
            
            <SAPSelect
              value={workerId}
              onChange={e => setWorkerId(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
            >
              <option value="">-- Select Worker --</option>
              {availableWorkers.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.workerId || w.id}) {w.serialNo ? `[SR: ${w.serialNo}]` : ''}
                </option>
              ))}
            </SAPSelect>

            {selectedWorker && (
              <div className="mt-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200 flex items-center justify-between">
                <span>Worker ID: <strong className="text-gray-800 font-mono">{selectedWorker.workerId || selectedWorker.id}</strong></span>
                <span>Name: <strong className="text-gray-800">{selectedWorker.name}</strong></span>
              </div>
            )}
          </div>

          {/* Row 3: Kharchi Type & Specify Other */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Kharchi Type <span className="text-red-500">*</span>
              </label>
              <SAPSelect
                value={kharchiType}
                onChange={e => setKharchiType(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
              >
                <option value="Weekly Kharchi">Weekly Kharchi</option>
                <option value="Sunday Kharchi">Sunday Kharchi</option>
                <option value="Emergency Kharchi">Emergency Kharchi</option>
                <option value="Travel Kharchi">Travel Kharchi</option>
                <option value="Other Kharchi">Other Kharchi</option>
              </SAPSelect>
            </div>

            <div>
              {kharchiType === 'Other Kharchi' ? (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Specify Other Kharchi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Festival Pocket Allowance"
                    value={specifyOtherKharchi}
                    onChange={e => setSpecifyOtherKharchi(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Payment Mode
                  </label>
                  <SAPSelect
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
                  >
                    <option value="Cash">Cash Distribution</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Cheque">Cheque</option>
                  </SAPSelect>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Amount & Paid By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Kharchi Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="₹ 0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] font-mono font-bold text-gray-900 focus:outline-none focus:border-[#0a6ed1]"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Disbursed By (Paid By) <span className="text-red-500">*</span>
              </label>
              <SAPSelect
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
              >
                <option value="Site Supervisor">Site Supervisor</option>
                <option value="Project Incharge">Project Incharge</option>
                <option value="Site Accountant">Site Accountant</option>
                <option value="Company Cashier">Company Cashier</option>
              </SAPSelect>
            </div>
          </div>

          {/* Row 5: Remarks */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">Remarks & Audit Purpose</label>
            <textarea
              rows={2}
              placeholder="e.g. Regular Sunday pocket allowance for weekly expenses..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
            />
          </div>

          {/* Footer note */}
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-[10px] text-blue-900">
            <strong>Sub-Ledger Integration:</strong> This transaction will generate a database-sequenced voucher 
            (e.g. <span className="font-mono font-bold">KHAR/2026-27/XXXX</span>) and post a linked debit entry in 
            <strong> WKL01 Worker Sub-Ledger</strong>. It will remain recoverable in <strong>PAY01</strong> until fully settled.
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-[10px] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10px] shadow-xs disabled:opacity-50"
            >
              {loading ? 'Posting...' : editingTransaction ? 'Update Kharchi' : 'Post Kharchi Transaction'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
