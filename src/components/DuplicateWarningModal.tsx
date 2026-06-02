import React, { useState } from 'react';
import { AlertTriangle, Eye, ShieldAlert } from 'lucide-react';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  moduleName: string;
  warningText?: string;
  duplicates: any[];
  currentUser: { username: string; name: string } | null;
  onCancel: () => void;
  onSaveAnyway?: (reason: string) => void;
  onViewExisting?: (existingRecord: any) => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  moduleName,
  warningText = 'Warning: A duplicate record may already exist. Please review before saving.',
  duplicates,
  currentUser,
  onCancel,
  onSaveAnyway,
  onViewExisting
}) => {
  const [reason, setReason] = useState('');
  const [errorText, setErrorText] = useState('');

  if (!isOpen) return null;

  const isAdmin = currentUser?.username === 'rejatousifsne';

  const handleOverrideSave = () => {
    if (!isAdmin) {
      setErrorText('Override permission denied. Only Administrators can authorize override saves.');
      return;
    }
    if (!reason.trim()) {
      setErrorText('You must specify a valid business justification / reason to authorize this override.');
      return;
    }
    setErrorText('');
    if (onSaveAnyway) {
      onSaveAnyway(reason.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in font-sans">
      <div className="bg-[#f0f4f8] border-2 border-red-700 rounded-xs shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Urgent Warning Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-4 py-3 flex items-center space-x-2 border-b border-red-900 shadow">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <span className="text-xs font-black tracking-wider uppercase font-mono">
            {moduleName} — Duplicate Match Warning
          </span>
        </div>

        {/* Modal Contents */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[75vh]">
          
          <div className="bg-red-50 border-l-4 border-red-600 p-2 text-[11px] text-red-900 leading-relaxed font-semibold">
            {warningText}
          </div>

          {/* Section: Conflicting Entries */}
          <div>
            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-600 mb-1 border-b pb-0.5 font-mono">
              Conflicting Records Found ({duplicates.length})
            </h4>
            
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {duplicates.map((dup, idx) => {
                // Determine display representations dynamically
                const desc = dup.description || dup.remarks || dup.workNature || dup.itemLabel || dup.remarks || 'No remarks';
                const date = dup.date || dup.paymentDate || dup.purchaseDate || dup.issueDate || dup.certifyDate || 'N/A';
                const amount = dup.amount || dup.netPayment || dup.workAmount || dup.amountReceived || dup.amountPaid || dup.cost || 0;
                const ref = dup.billNo || dup.invoiceNumber || dup.voucherNo || dup.receiptNumber || dup.id || '-';

                return (
                  <div key={dup.id || idx} className="bg-white border rounded p-2 flex items-start justify-between space-x-2 text-[10px] text-gray-700 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between font-bold text-gray-900">
                        <span>Date: {date}</span>
                        {amount > 0 && <span className="text-red-700 font-mono font-black">Rs {Number(amount).toLocaleString()}</span>}
                      </div>
                      <div className="mt-1 flex items-center space-x-2 text-gray-500 text-[9px] font-mono">
                        {ref !== '-' && <span>Ref/No: <strong className="text-slate-800">{ref}</strong></span>}
                        {dup.workerId && <span>Emp ID: <strong className="text-slate-800">{dup.workerId}</strong></span>}
                        {dup.supplierName && <span>Supplier: <strong className="text-slate-800">{dup.supplierName}</strong></span>}
                      </div>
                      <p className="mt-0.5 text-gray-600 truncate italic">"{desc}"</p>
                    </div>

                    {onViewExisting && (
                      <button 
                        type="button"
                        onClick={() => onViewExisting(dup)}
                        className="sap-btn-sub shrink-0 flex items-center space-x-1 py-0.5 px-1.5 bg-slate-100 hover:bg-sky-50 text-sky-800 font-bold border border-slate-300 rounded"
                        title="View details of this record"
                      >
                        <Eye size={10} />
                        <span>View</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Admin Audit and Permission */}
          <div className="border bg-yellow-50/50 rounded p-3 text-[10px] text-slate-700 space-y-2">
            <div className="flex items-center space-x-1">
              <ShieldAlert size={12} className={isAdmin ? "text-green-600" : "text-red-600"} />
              <span className="font-bold">
                Logged in User: <span className="text-indigo-900 uppercase font-mono">{currentUser?.name || '(Nobody)'}</span>
              </span>
              <span className={`px-1 py-0.2 ml-1 text-[8px] font-bold rounded uppercase ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isAdmin ? 'ADMIN AUTHORIZED' : 'STANDARD USER'}
              </span>
            </div>

            {isAdmin ? (
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase text-slate-600 tracking-wider">
                  Override Justification / Reason For Saving <span className="text-red-600 font-black">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this database record is valid and not a duplicate entry..."
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (errorText) setErrorText('');
                  }}
                  className="w-full p-2 border rounded font-semibold text-[10px] bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-600 border-gray-300"
                />
              </div>
            ) : (
              <p className="text-[9px] text-red-700 leading-relaxed font-semibold">
                🚫 Standard users are prohibited from overriding duplicate MATCH alerts. Only the Corporate System Administrator (Reja Tousif) can bypass this block. Contact them to request an override.
              </p>
            )}

            {errorText && (
              <p className="text-[9px] text-red-600 bg-red-100 border border-red-200 px-2 py-1 rounded font-bold">
                {errorText}
              </p>
            )}
          </div>

        </div>

        {/* Buttons footer */}
        <div className="bg-[#cbd8e6] border-t border-slate-300 px-4 py-2.5 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-xs font-bold text-[10px] uppercase shadow-xs transition-colors cursor-pointer"
          >
            Cancel / Review Form
          </button>
          
          {isAdmin && onSaveAnyway && (
            <button
              type="button"
              onClick={handleOverrideSave}
              className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-xs font-bold text-[10px] uppercase shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <ShieldAlert size={11} />
              <span>Save Anyway (Override Block)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
