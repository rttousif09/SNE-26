import React from 'react';
import { Activity } from 'lucide-react';
import { SubcontractorAuditTrail } from '../../types';
import { ERPTable, ERPColumn } from '../../components/ERPTable';

interface AuditTrailComponentProps {
  auditTrail: SubcontractorAuditTrail[];
}

export const AuditTrailComponent: React.FC<AuditTrailComponentProps> = ({ auditTrail }) => {
  // ERP Columns for Security Audit Trails
  const erpColumns: ERPColumn<SubcontractorAuditTrail>[] = [
    { key: 'timestamp', header: 'Chronology Timestamp', sortable: true, filterable: true, frozen: true, render: (val) => <span className="text-gray-500 font-mono font-bold">{new Date(val).toLocaleString()}</span> },
    { key: 'username', header: 'User Operator', sortable: true, filterable: true, render: (val) => <span className="font-bold text-gray-900 font-mono">{val}</span> },
    { key: 'actionType', header: 'Action', sortable: true, filterable: true, render: (val) => (
      <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded uppercase ${
        val === 'CREATE' ? 'bg-green-100 text-green-800' :
        val === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
        val === 'DELETE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
      }`}>
        {val}
      </span>
    )},
    { key: 'recordId', header: 'Target ID', sortable: true, filterable: true, render: (val) => <span className="text-[#002f6c] font-bold text-[9px] font-mono">{val}</span> },
    { key: 'details', header: 'Log Details & Descriptions', sortable: true, filterable: true, render: (val) => <span className="text-gray-600 font-mono font-semibold">{val}</span> }
  ];

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

        <div className="bg-white overflow-hidden p-2">
          <ERPTable
            id="subcontractor-audit-trail-table"
            data={auditTrail}
            columns={erpColumns}
            idKey="id"
            searchPlaceholder="Search audit trails..."
            exportFilename="subcontractor_erp_audit_logs"
          />
        </div>
      </div>
    </div>
  );
};
