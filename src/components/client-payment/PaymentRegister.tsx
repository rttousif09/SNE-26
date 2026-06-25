import React from 'react';
import { FileText, Plus, Eye } from 'lucide-react';
import { ERPTable, ERPColumn, ERPRowAction } from '../ERPTable';

export const PaymentRegister = ({ 
  data, 
  onAddPayment, 
  onViewHistory 
}: { 
  data: any[], 
  onAddPayment: (billId: string) => void, 
  onViewHistory: (billId: string) => void 
}) => {
  
  const columns: ERPColumn<any>[] = [
    { key: 'billNo', header: 'Bill No', sortable: true, filterable: true, frozen: true },
    { key: 'date', header: 'Bill Date', sortable: true, filterable: true },
    { key: 'siteClient', header: 'Site / Client', sortable: true, filterable: true, render: (_, row) => (
      <div>
        <div className="font-semibold text-gray-900">{row.siteName}</div>
        <div className="text-[9px] text-gray-500">{row.clientName}</div>
      </div>
    )},
    { key: 'billType', header: 'Bill Type', sortable: true, filterable: true },
    { key: 'gross', header: 'Gross Amt', sortable: true, filterable: true, isNumeric: true },
    { key: 'gst', header: 'GST', sortable: true, filterable: true, isNumeric: true },
    { key: 'tds', header: 'TDS', sortable: true, filterable: true, isNumeric: true },
    { key: 'retention', header: 'Retention', sortable: true, filterable: true, isNumeric: true },
    { key: 'netReceivable', header: 'Net Bill', sortable: true, filterable: true, isNumeric: true },
    { key: 'totalPaid', header: 'Paid', sortable: true, filterable: true, isNumeric: true },
    { key: 'outstanding', header: 'Outstanding', sortable: true, filterable: true, isNumeric: true },
    { key: 'status', header: 'Status', sortable: true, filterable: true }
  ];

  const rowActions: ERPRowAction<any>[] = [
    {
      label: 'Add Payment',
      icon: <Plus size={12} />,
      onClick: (row) => onAddPayment(row.id),
      tooltip: 'Record Client Receipt'
    },
    {
      label: 'View History',
      icon: <Eye size={12} />,
      onClick: (row) => onViewHistory(row.id),
      tooltip: 'View Payment History'
    }
  ];

  const summaryFooter = (filtered: any[]) => {
    const totalBilling = filtered.reduce((acc, d) => acc + d.netReceivable, 0);
    const totalCollection = filtered.reduce((acc, d) => acc + d.totalPaid, 0);
    const outstanding = filtered.reduce((acc, d) => acc + d.outstanding, 0);

    return (
      <div className="flex flex-wrap gap-4 justify-between text-[11px] font-extrabold text-slate-800 bg-slate-100 p-2.5 rounded border border-slate-300 uppercase tracking-wide">
        <div>Total Net Billing: <span className="font-mono text-[#0056b3] font-black">₹{totalBilling.toLocaleString('en-IN')}</span></div>
        <div>Total Collection: <span className="font-mono text-emerald-700 font-black">₹{totalCollection.toLocaleString('en-IN')}</span></div>
        <div className="border-l pl-4 border-slate-300">Outstanding Balance: <span className="font-mono text-rose-700 font-black">₹{outstanding.toLocaleString('en-IN')}</span></div>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <ERPTable
        id="client-payment-register-table"
        data={data}
        columns={columns}
        idKey="id"
        searchPlaceholder="Search payment registry..."
        rowActions={rowActions}
        summaryFooter={summaryFooter}
        exportFilename="client_payment_registry"
      />
    </div>
  );
};

