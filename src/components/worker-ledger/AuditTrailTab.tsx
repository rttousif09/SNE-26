import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, UserCheck, RefreshCw, Clock, ArrowRight } from 'lucide-react';

interface Props {
  workerId: string;
}

export const AuditTrailTab: React.FC<Props> = ({ workerId }) => {
  const [data, setData] = useState<{
    activityLogs: any[];
    recoveryAudits: any[];
    specialEntries: any[];
  }>({ activityLogs: [], recoveryAudits: [], specialEntries: [] });
  const [loading, setLoading] = useState(false);

  const fetchAudit = async () => {
    if (!workerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/worker-ledger/audit-trails?workerId=${workerId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [workerId]);

  return (
    <div className="space-y-4 text-[11px]">
      
      {/* Top Header */}
      <div className="bg-[#f0f4f8] p-3 rounded border border-gray-300 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-[#0a6ed1]" />
          <div>
            <span className="font-bold text-gray-900 text-xs">Immutable Worker Sub-Ledger Audit Trail</span>
            <p className="text-[10px] text-gray-500">Tracks transaction postings, reversals, manual adjustments, and user actions</p>
          </div>
        </div>

        <button
          onClick={fetchAudit}
          disabled={loading}
          className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded font-medium text-[10px] flex items-center space-x-1 shadow-xs"
        >
          <RefreshCw className={`w-3 h-3 text-[#0a6ed1] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Special Adjustments and Reversals Table */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 font-bold text-gray-800 text-[11px] flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Authorized Financial Modifications, Adjustments & Reversals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
                <th className="py-2 px-3">Date / Timestamp</th>
                <th className="py-2 px-3">Voucher</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Particulars & Reason</th>
                <th className="py-2 px-3 text-right">Debit</th>
                <th className="py-2 px-3 text-right">Credit</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
              {data.specialEntries.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-blue-50/40">
                  <td className="py-2 px-3 whitespace-nowrap text-gray-700">{row.date}</td>
                  <td className="py-2 px-3 font-bold text-gray-900">{row.voucherNo}</td>
                  <td className="py-2 px-3 font-sans">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-100 text-gray-800 border border-gray-300">
                      {row.entryType}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-sans text-gray-800">{row.particulars || row.description}</td>
                  <td className="py-2 px-3 text-right text-rose-700 font-bold">
                    {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                    {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                      row.status === 'Reversed' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}>
                      {row.status || 'Posted'}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-sans text-gray-700">
                    {row.postedBy || row.createdBy || 'System'}
                  </td>
                </tr>
              ))}
              {data.specialEntries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400 font-sans italic">
                    No adjustments or reversal records found for this worker.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Activity Log History */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 font-bold text-gray-800 text-[11px] flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-600" />
          <span>System Operation Log (Activity Log)</span>
        </div>
        <div className="overflow-x-auto max-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Module</th>
                <th className="py-2 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[10.5px]">
              {data.activityLogs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-gray-50">
                  <td className="py-1.5 px-3 whitespace-nowrap font-mono text-gray-600">{log.timestamp}</td>
                  <td className="py-1.5 px-3 font-semibold text-gray-900">{log.username}</td>
                  <td className="py-1.5 px-3">
                    <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {log.actionType}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 font-mono text-gray-700">{log.module}</td>
                  <td className="py-1.5 px-3 text-gray-800 font-mono text-[10px]">{log.details}</td>
                </tr>
              ))}
              {data.activityLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400 italic">
                    No activity logs recorded for this worker.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
