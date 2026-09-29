import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, FileText, Upload, ShieldAlert, ArrowRight, CornerDownRight } from 'lucide-react';
import { SAPSelect } from '../SAPSelect';

export interface LedgerItem {
  id: string;
  workerId: string;
  projectId: string;
  projectName?: string;
  date: string;
  voucherNo: string;
  description: string;
  particulars?: string;
  entryType: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: 'Cr' | 'Dr';
  formattedBalance: string;
  sourceModule: string;
  sourceTransactionId: string;
  sourceVoucherNo?: string;
  paymentId?: string;
  breakdownJson?: string;
  status: 'Posted' | 'Reversed' | 'Draft';
  remarks?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdBy?: string;
  createdDate?: string;
  postedBy?: string;
  postedDate?: string;
  reversedBy?: string;
  reversedDate?: string;
  reversalOfId?: string;
}

// 1. Transaction Detail & Settlement Breakdown Modal
export const TransactionDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  entry: LedgerItem | null;
  onReverse?: (entry: LedgerItem) => void;
}> = ({ isOpen, onClose, entry, onReverse }) => {
  if (!isOpen || !entry) return null;

  let breakdown: any = null;
  if (entry.breakdownJson) {
    try {
      breakdown = typeof entry.breakdownJson === 'string' ? JSON.parse(entry.breakdownJson) : entry.breakdownJson;
    } catch (e) {
      breakdown = null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="bg-[#f0f4f8] px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#0a6ed1]" />
            <span className="font-bold text-gray-900 text-xs">
              Transaction Details & Settlement Breakdown
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2.5 bg-gray-50 p-2.5 rounded border border-gray-200">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Voucher No</span>
              <span className="font-mono font-bold text-gray-900 text-xs">{entry.voucherNo || entry.id}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Transaction Date</span>
              <span className="font-semibold text-gray-800">{entry.date}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Source Module / Ref</span>
              <span className="font-mono font-semibold text-blue-700">
                {entry.sourceModule || 'SYS'} / {entry.sourceVoucherNo || entry.sourceTransactionId || '-'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Status</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border inline-block ${
                entry.status === 'Posted' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : entry.status === 'Reversed'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-gray-50 text-gray-700 border-gray-300'
              }`}>
                {entry.status || 'Posted'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Particulars & Description</span>
              <span className="text-gray-800">{entry.particulars || entry.description}</span>
            </div>
          </div>

          {/* Amount and Effect */}
          <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-white border border-gray-200 rounded">
            <div>
              <span className="text-[9px] uppercase text-gray-500 font-semibold block">Debit (Dr)</span>
              <span className="font-mono font-bold text-rose-700 text-xs">
                {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-gray-500 font-semibold block">Credit (Cr)</span>
              <span className="font-mono font-bold text-emerald-700 text-xs">
                {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-gray-500 font-semibold block">Running Balance</span>
              <span className="font-mono font-bold text-gray-900 text-xs">
                {entry.formattedBalance || `₹${entry.runningBalance}`}
              </span>
            </div>
          </div>

          {/* Settlement Breakup (Special requirement for PAY01) */}
          {breakdown && (
            <div className="border border-blue-200 bg-blue-50/30 rounded p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
                <span className="font-bold text-blue-900 text-[11px] flex items-center space-x-1">
                  <CornerDownRight className="w-3.5 h-3.5 text-blue-600" />
                  <span>Settlement Breakup ({breakdown.month || 'Payroll Month'})</span>
                </span>
                <span className="text-[9px] font-mono text-blue-700">Source: Worker Payment (PAY01)</span>
              </div>
              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Work Earnings:</span>
                  <span>+₹{Math.round(breakdown.workEarnings || 0).toLocaleString('en-IN')}</span>
                </div>
                {breakdown.weeklyKharchi > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Weekly Kharchi Deduction:</span>
                    <span>-₹{Math.round(breakdown.weeklyKharchi).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {breakdown.messDeduction > 0 && (
                  <div className="flex justify-between text-purple-700">
                    <span>Mess Charges Deduction:</span>
                    <span>-₹{Math.round(breakdown.messDeduction).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {breakdown.outstandingAdvance > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Outstanding Advance Deduction:</span>
                    <span>-₹{Math.round(breakdown.outstandingAdvance).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {breakdown.previousOverBalance > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Previously Over Balance Deduction:</span>
                    <span>-₹{Math.round(breakdown.previousOverBalance).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {breakdown.recovery > 0 && (
                  <div className="flex justify-between text-indigo-700">
                    <span>Recovery / Retention:</span>
                    <span>-₹{Math.round(breakdown.recovery).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {breakdown.otherDeduction > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Other Deductions:</span>
                    <span>-₹{Math.round(breakdown.otherDeduction).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="border-t border-blue-300 pt-1 flex justify-between font-bold text-gray-900 text-xs">
                  <span>Net Disbursed Paycheck:</span>
                  <span className="text-emerald-800">₹{Math.round(breakdown.netPayment || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Audit stamps */}
          <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 space-y-0.5 font-mono">
            <div>Created: {entry.createdBy || 'System'} {entry.createdDate ? `at ${entry.createdDate}` : ''}</div>
            {entry.postedBy && <div>Posted By: {entry.postedBy} {entry.postedDate ? `at ${entry.postedDate}` : ''}</div>}
            {entry.reversedBy && (
              <div className="text-rose-600 font-semibold">
                Reversed By: {entry.reversedBy} {entry.reversedDate ? `at ${entry.reversedDate}` : ''}
              </div>
            )}
            {entry.reversalOfId && (
              <div className="text-rose-600">Reversal of original Entry ID: {entry.reversalOfId}</div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-300 flex items-center justify-between">
          <div>
            {entry.status === 'Posted' && onReverse && (
              <button
                onClick={() => {
                  onClose();
                  onReverse(entry);
                }}
                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 rounded font-semibold text-[10px] transition"
              >
                Reverse Transaction
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded font-medium text-[10px]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

// 2. Reversal Confirmation Modal
export const ReversalModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  entry: LedgerItem | null;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
}> = ({ isOpen, onClose, entry, onConfirm, loading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-md overflow-hidden">
        <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="font-bold text-xs">Confirm Financial Reversal</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!reason.trim()) return;
          await onConfirm(reason);
          onClose();
        }} className="p-4 space-y-3">
          
          <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[10.5px] text-amber-900">
            <strong>Audit Notice:</strong> In accordance with accounting controls, posted transactions are not deleted. 
            A linked reversal entry (inverting Debit and Credit) will be created, and the original transaction will be marked as <strong>Reversed</strong>.
          </div>

          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-[10.5px]">
            <div><strong>Voucher:</strong> {entry.voucherNo}</div>
            <div><strong>Particulars:</strong> {entry.particulars || entry.description}</div>
            <div><strong>Amount:</strong> {entry.debit > 0 ? `Debit ₹${entry.debit}` : `Credit ₹${entry.credit}`}</div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Reversal Reason / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="State reason (e.g. Duplicate entry, Wrong site charged, Incorrect payment voucher)..."
              className="w-full bg-white border border-gray-300 rounded p-2 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] disabled:opacity-50"
            >
              {loading ? 'Posting Reversal...' : 'Post Reversal Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Manual Adjustment Entry Modal
export const ManualAdjustmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  projectId: string;
  projects: Array<{ id: string; name: string }>;
  onSave: (data: any) => Promise<void>;
  loading: boolean;
}> = ({ isOpen, onClose, workerId, projectId, projects, onSave, loading }) => {
  const [formData, setFormData] = useState({
    projectId: projectId || (projects[0]?.id || ''),
    date: new Date().toISOString().substring(0, 10),
    type: 'Debit' as 'Debit' | 'Credit',
    amount: '',
    reason: 'Advance Adjustment',
    remarks: '',
    attachmentUrl: ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-md overflow-hidden">
        <div className="bg-[#f0f4f8] px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
          <span className="font-bold text-gray-900 text-xs">New Authorized Adjustment Entry</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!formData.amount || Number(formData.amount) <= 0) return;
          await onSave({
            workerId,
            ...formData,
            amount: parseFloat(formData.amount)
          });
          onClose();
        }} className="p-4 space-y-2.5">

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Project / Site</label>
              <SAPSelect
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </SAPSelect>
            </div>
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Entry Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Adjustment Type</label>
              <SAPSelect
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              >
                <option value="Debit">Debit (Deduct from Worker)</option>
                <option value="Credit">Credit (Pay to Worker)</option>
              </SAPSelect>
            </div>
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                placeholder="₹ 0.00"
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-0.5">Reason / Category</label>
            <SAPSelect
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
            >
              <option value="Advance Adjustment">Advance Adjustment</option>
              <option value="Tool / Material Recovery">Tool / Material Recovery</option>
              <option value="Safety Violation Fine">Safety Violation Fine</option>
              <option value="Special Allowance / Bonus">Special Allowance / Bonus</option>
              <option value="Travel Reimbursement">Travel Reimbursement</option>
              <option value="Wage Correction">Wage Correction</option>
              <option value="Other Authorized Correction">Other Authorized Correction</option>
            </SAPSelect>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-0.5">Remarks & Audit Notes</label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Additional details for supervisor audit..."
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10px] disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. Opening Balance Setup Modal
export const OpeningBalanceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  projectId: string;
  onSave: (data: any) => Promise<void>;
  loading: boolean;
}> = ({ isOpen, onClose, workerId, projectId, onSave, loading }) => {
  const [formData, setFormData] = useState({
    date: '2026-01-01',
    type: 'Debit' as 'Debit' | 'Credit',
    amount: '',
    remarks: 'Initial migration opening balance'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-md overflow-hidden">
        <div className="bg-[#f0f4f8] px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
          <span className="font-bold text-gray-900 text-xs">Set Worker Authorized Opening Balance</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!formData.amount || Number(formData.amount) < 0) return;
          await onSave({
            workerId,
            projectId,
            ...formData,
            amount: parseFloat(formData.amount)
          });
          onClose();
        }} className="p-4 space-y-2.5">

          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded text-[10.5px] text-blue-900">
            Setting an Opening Balance initializes this worker's financial sub-ledger history in SQLite.
            Debit means worker owes money to the company (e.g. past advance); Credit means company owes worker.
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Effective Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              />
            </div>
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Balance Type</label>
              <SAPSelect
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              >
                <option value="Debit">Debit (Dr - Worker owes company)</option>
                <option value="Credit">Credit (Cr - Company owes worker)</option>
              </SAPSelect>
            </div>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-0.5">Opening Balance Amount (₹)</label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              placeholder="₹ 0.00"
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-0.5">Audit Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Legacy register migration as of 01-Jan-2026"
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10px] disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Opening Balance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
