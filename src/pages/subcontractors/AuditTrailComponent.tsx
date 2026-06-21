import React from 'react';
import { Activity } from 'lucide-react';
import { SubcontractorAuditTrail } from '../../types';

interface AuditTrailComponentProps {
  auditTrail: SubcontractorAuditTrail[];
}

export const AuditTrailComponent: React.FC<AuditTrailComponentProps> = ({ auditTrail }) => {
  return (
    <div className="space-y-4 text-[10px]">
      <div className="bg-white border rounded shadow-sm p-4 space-y-3">
        <div className="border-b pb-1.5 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 flex items-center space-x-1">
            <Activity size={12} className="text-amber-500" />
            <span>Core Subcontractor ERP Security Audit Trails Log</span>
          </h3>
          <span className="text-[9px] text-[#22c55e] font-bold font-mono">● Security Compliant</span>
        </div>

        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f3f4f6] text-gray-650 uppercase font-semibold border-b border-gray-300">
                <th className="p-2">Chronology Timestamp</th>
                <th className="p-2">User operator</th>
                <th className="p-2">Action</th>
                <th className="p-2">Target ID</th>
                <th className="p-2">Log details & descriptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono text-gray-800">
              {auditTrail.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">No security audit trial markers registered.</td>
                </tr>
              ) : (
                auditTrail.map(trail => {
                  const fDate = new Date(trail.timestamp).toLocaleString();
                  return (
                    <tr key={trail.id} className="hover:bg-gray-50 transition">
                      <td className="p-2 text-gray-500 font-bold">{fDate}</td>
                      <td className="p-2 font-bold text-gray-900">{trail.username}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.2 text-[8px] font-mono font-bold rounded uppercase ${
                          trail.actionType === 'CREATE' ? 'bg-green-100 text-green-800' :
                          trail.actionType === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          trail.actionType === 'DELETE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {trail.actionType}
                        </span>
                      </td>
                      <td className="p-2 text-[#002f6c] font-bold text-[9px]">{trail.recordId}</td>
                      <td className="p-2 text-gray-600 font-semibold">{trail.details}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
