import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SAPSelect } from '../SAPSelect';

export const PlaceHoldModal: React.FC<{
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
    holdDate: new Date().toISOString().substring(0, 10),
    holdAmount: '',
    reason: 'Security Deposit',
    remarks: ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-md overflow-hidden">
        <div className="bg-[#f0f4f8] px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-xs">Place Wage / Retention Hold</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!formData.holdAmount || Number(formData.holdAmount) <= 0) return;
          await onSave({
            workerId,
            ...formData,
            holdAmount: parseFloat(formData.holdAmount)
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
              <label className="block text-gray-600 font-bold mb-0.5">Hold Date</label>
              <input
                type="date"
                required
                value={formData.holdDate}
                onChange={e => setFormData({ ...formData, holdDate: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Hold Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={formData.holdAmount}
                onChange={e => setFormData({ ...formData, holdAmount: e.target.value })}
                placeholder="₹ 0.00"
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-gray-600 font-bold mb-0.5">Hold Reason</label>
              <SAPSelect
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              >
                <option value="Security Deposit">Security Deposit</option>
                <option value="Disciplinary Review">Disciplinary Review</option>
                <option value="Tool / Asset Non-Return">Tool / Asset Non-Return</option>
                <option value="Quality Rectification Hold">Quality Rectification Hold</option>
                <option value="Absconding Risk Retention">Absconding Risk Retention</option>
                <option value="Other Hold">Other Hold</option>
              </SAPSelect>
            </div>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-0.5">Remarks</label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Audit details for retaining wage funds..."
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
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Place Hold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ReleaseHoldModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  hold: any | null;
  onRelease: (holdId: string, amount: number, remarks: string) => Promise<void>;
  loading: boolean;
}> = ({ isOpen, onClose, hold, onRelease, loading }) => {
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  if (!isOpen || !hold) return null;

  const maxRelease = hold.remainingHold ?? (hold.holdAmount - (hold.releasedAmount || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 text-[11px]">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-md overflow-hidden">
        <div className="bg-[#f0f4f8] px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-xs">Release Wage Hold #{hold.id.substring(0, 6)}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          const num = parseFloat(amount);
          if (isNaN(num) || num <= 0 || num > maxRelease) return;
          await onRelease(hold.id, num, remarks);
          onClose();
        }} className="p-4 space-y-3">

          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Hold Amount:</span>
              <span className="font-mono font-bold">₹{hold.holdAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Already Released:</span>
              <span className="font-mono text-emerald-700 font-bold">₹{hold.releasedAmount || 0}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-900">
              <span>Remaining Held:</span>
              <span className="font-mono text-rose-700">₹{maxRelease}</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-0.5">
              Release Amount (₹) <span className="text-red-500">* (Max ₹{maxRelease})</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max={maxRelease}
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`₹ ${maxRelease}`}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-0.5">Release Remarks</label>
            <input
              type="text"
              required
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Tools returned in satisfactory condition"
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
              disabled={loading || !amount || Number(amount) <= 0 || Number(amount) > maxRelease}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] disabled:opacity-50"
            >
              {loading ? 'Releasing...' : 'Confirm Release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
