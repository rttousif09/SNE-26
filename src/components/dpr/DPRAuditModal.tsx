import React, { useState, useEffect } from 'react';
import { History, X, Clock, User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DPRAuditLog } from '../../types/dpr';

interface DPRAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dprId: string;
  reportNo: string;
}

export const DPRAuditModal: React.FC<DPRAuditModalProps> = ({ isOpen, onClose, dprId, reportNo }) => {
  const [logs, setLogs] = useState<DPRAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !dprId) return;
    setLoading(true);
    fetch(`/api/dpr/${dprId}/audit`)
      .then(res => res.json())
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, dprId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-xs">
      <div className="bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[11px] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#303B44] text-white px-3.5 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-300" />
            <h3 className="font-bold text-xs uppercase tracking-wider">
              DPR Audit Trail & Governance Log — {reportNo}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 font-bold text-lg leading-none p-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 italic">No audit records found for this report.</div>
          ) : (
            <div className="border border-gray-300 rounded bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                    <th className="p-2 border-r border-gray-300 w-36">Timestamp</th>
                    <th className="p-2 border-r border-gray-300 w-24">Action</th>
                    <th className="p-2 border-r border-gray-300 w-28">User</th>
                    <th className="p-2">Governance / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map(log => {
                    const isLock = log.action === 'Locked' || log.action === 'Approved';
                    const isOverride = log.action === 'Overridden' || log.action === 'Unlocked';

                    return (
                      <tr key={log.id} className="hover:bg-gray-50 text-[10.5px]">
                        <td className="p-2 border-r border-gray-200 font-mono text-gray-600 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-2 border-r border-gray-200">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isLock ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            isOverride ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2 border-r border-gray-200 font-semibold text-gray-800">
                          {log.performedBy}
                        </td>
                        <td className="p-2 text-gray-700">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#f8f9fa] border-t border-gray-300 px-3 py-1.5 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold text-[10.5px]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
