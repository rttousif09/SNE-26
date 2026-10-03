import React, { useState } from 'react';
import { X, AlertTriangle, FileText, CheckCircle2, History, RotateCcw } from 'lucide-react';

export const KharchiCancelModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
}> = ({ isOpen, onClose, transaction, onConfirm, loading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded shadow-xl border border-gray-400 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        
        <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="font-bold text-xs">Cancel Kharchi Voucher [{transaction.voucherNo}]</span>
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
            <strong>Accounting Control:</strong> Posted financial transactions cannot be silently deleted.
            Cancelling this transaction will update its status to <strong>Cancelled</strong> and generate a linked 
            reversal credit entry in <strong>WKL01 – Worker Ledger</strong> with an immutable audit trail.
          </div>

          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-[10.5px] space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Voucher No:</span>
              <span className="font-mono font-bold text-gray-900">{transaction.voucherNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Worker:</span>
              <span className="font-semibold text-gray-800">{transaction.workerName} ({transaction.workerEmployeeId || transaction.workerId})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-mono font-bold text-rose-700">₹{parseFloat(transaction.amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">
              Cancellation Justification / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Voucher created in duplicate, Cash not disbursed, Disbursed by contractor directly..."
              value={reason}
              onChange={e => setReason(e.target.value)}
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
              Close
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] disabled:opacity-50"
            >
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export const KharchiDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onCancelClick?: (tx: any) => void;
}> = ({ isOpen, onClose, transaction, onCancelClick }) => {
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (transaction?.id) {
      setLoading(true);
      fetch(`/api/worker-kharchi/audit-trails?kharchiId=${transaction.id}`)
        .then(res => res.json())
        .then(data => setRecoveries(data.recoveryLogs || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const amt = parseFloat(transaction.amount || 0);
  const rec = parseFloat(transaction.recoveredAmount || 0);
  const os = parseFloat(transaction.outstandingAmount != null ? transaction.outstandingAmount : (amt - rec));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded shadow-xl border border-gray-400 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="bg-[#f0f4f8] px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#0a6ed1]" />
            <span className="font-bold text-gray-900 text-xs">
              Kharchi Voucher Details [{transaction.voucherNo}]
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded border border-gray-200">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Voucher No</span>
              <span className="font-mono font-bold text-gray-900 text-xs">{transaction.voucherNo}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Disbursement Date</span>
              <span className="font-semibold text-gray-800">{transaction.date}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Worker</span>
              <span className="font-bold text-gray-800">{transaction.workerName}</span>
              <span className="text-[9px] font-mono text-gray-500 block">ID: {transaction.workerEmployeeId || transaction.workerId}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Project / Site</span>
              <span className="font-semibold text-gray-800">{transaction.projectName || transaction.projectId}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Kharchi Type</span>
              <span className="font-semibold text-blue-700">{transaction.kharchiType}</span>
              {transaction.specifyOtherKharchi && (
                <span className="text-[9.5px] text-gray-600 block">({transaction.specifyOtherKharchi})</span>
              )}
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Status</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border inline-block ${
                transaction.status === 'Recovered' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                transaction.status === 'Partially Recovered' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                transaction.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                'bg-blue-50 text-blue-700 border-blue-300'
              }`}>
                {transaction.status}
              </span>
            </div>
          </div>

          {/* Amount and Balance Bar */}
          <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-white border border-gray-200 rounded">
            <div>
              <span className="text-[9px] uppercase text-gray-500 font-semibold block">Total Amount</span>
              <span className="font-mono font-bold text-gray-900 text-xs">₹{amt.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-gray-500 font-semibold block">Recovered in PAY01</span>
              <span className="font-mono font-bold text-emerald-700 text-xs">₹{rec.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-gray-500 font-semibold block">Remaining Outstanding</span>
              <span className="font-mono font-bold text-rose-700 text-xs">₹{os.toLocaleString('en-IN')} Dr</span>
            </div>
          </div>

          {/* Payment & Remarks Details */}
          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1">
            <div><strong>Payment Mode:</strong> {transaction.paymentMode || 'Cash'} | <strong>Disbursed By:</strong> {transaction.paidBy || 'Site Supervisor'}</div>
            <div><strong>Remarks:</strong> {transaction.remarks || 'No notes specified.'}</div>
            {transaction.cancellationReason && (
              <div className="text-rose-700 font-semibold">
                <strong>Cancellation Reason:</strong> {transaction.cancellationReason}
              </div>
            )}
          </div>

          {/* Recovery History Table */}
          <div className="border border-gray-200 rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-1.5 font-bold text-gray-800 text-[10.5px]">
              Recovery & Settlement History (PAY01 Wage Deductions)
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f4f8] text-gray-600 font-bold text-[9.5px] uppercase border-b border-gray-300">
                  <th className="py-1.5 px-2.5">Date</th>
                  <th className="py-1.5 px-2">PAY01 Voucher</th>
                  <th className="py-1.5 px-2 text-right">Deducted Amount</th>
                  <th className="py-1.5 px-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                {recoveries.map((r, i) => (
                  <tr key={r.id || i}>
                    <td className="py-1 px-2.5 text-gray-700">{r.recoveryDate}</td>
                    <td className="py-1 px-2 font-bold text-blue-700">{r.voucherNo || `PAY-${r.paymentId}`}</td>
                    <td className="py-1 px-2 text-right font-bold text-emerald-700">₹{parseFloat(r.amount).toLocaleString('en-IN')}</td>
                    <td className="py-1 px-2 font-sans text-gray-600">{r.remarks || 'Settlement'}</td>
                  </tr>
                ))}
                {recoveries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-gray-400 font-sans italic">
                      No recoveries deducted yet for this voucher.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Stamps */}
          <div className="text-[9.5px] text-gray-500 font-mono space-y-0.5 bg-gray-50 p-2 rounded border border-gray-200">
            <div>Created: {transaction.createdBy || 'System'} at {transaction.createdDate || '—'}</div>
            {transaction.postedBy && <div>Posted By: {transaction.postedBy} at {transaction.postedDate || '—'}</div>}
            {transaction.cancelledBy && (
              <div className="text-rose-600 font-semibold">Cancelled By: {transaction.cancelledBy} at {transaction.cancelledDate || '—'}</div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-300 flex items-center justify-between">
          <div>
            {transaction.status !== 'Cancelled' && transaction.recoveredAmount === 0 && onCancelClick && (
              <button
                onClick={() => {
                  onClose();
                  onCancelClick(transaction);
                }}
                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 rounded font-semibold text-[10px] transition"
              >
                Cancel Voucher
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
