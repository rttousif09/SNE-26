import React from 'react';
import { useAppContext } from '../../store';
import { ArrowUpRight, ArrowDownRight, Landmark, FileSpreadsheet } from 'lucide-react';

export const Dashboard = ({ metrics }: { metrics: any }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-2 border border-[#8c9ba8]">
      <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-blue-500">
        <span className="font-semibold text-gray-500 leading-tight text-[10px]">Total Gross Billing</span>
        <span className="text-sm font-bold text-gray-900 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.totalGross)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-purple-500">
        <span className="font-semibold text-gray-500 leading-tight text-[10px]">Total GST Amount</span>
        <span className="text-sm font-bold text-gray-900 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.totalGST)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-red-500">
        <span className="font-semibold text-gray-500 leading-tight text-[10px]">Total TDS Deducted</span>
        <span className="text-sm font-bold text-red-600 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.totalTDS)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-orange-500">
        <span className="font-semibold text-gray-500 leading-tight text-[10px]">Total Retention Held</span>
        <span className="text-sm font-bold text-orange-600 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.totalRetentionHeld)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-[#0056b3]">
        <span className="font-semibold text-[#0056b3] leading-tight text-[10px]">Net Receivable Amount</span>
        <span className="text-sm font-bold text-[#0056b3] mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.netReceivable)}
        </span>
      </div>
      
      <div className="sap-panel p-2 flex flex-col bg-green-50 border-l-4 border-l-green-600">
        <span className="font-semibold text-green-950 leading-tight text-[10px]">Client Payments Received</span>
        <span className="text-sm font-bold text-green-700 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.totalPayments)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-teal-500">
        <span className="font-semibold text-gray-500 leading-tight text-[10px]">Retention Received</span>
        <span className="text-sm font-bold text-teal-700 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.retentionReceived)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-orange-50 border-l-4 border-l-orange-400">
        <span className="font-semibold text-orange-950 leading-tight text-[10px]">Outstanding Balance</span>
        <span className="text-sm font-bold text-orange-700 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.outstandingBalance)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-red-50 border-l-4 border-l-red-500">
        <span className="font-semibold text-red-950 leading-tight text-[10px]">Retention Outstanding</span>
        <span className="text-sm font-bold text-red-700 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.retentionOutstanding)}
        </span>
      </div>
      <div className="sap-panel p-2 flex flex-col bg-gray-100 border-l-4 border-l-gray-500">
        <span className="font-semibold text-gray-700 leading-tight text-[10px]">Overdue Amount</span>
        <span className="text-sm font-bold text-gray-900 mt-1">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.overdueAmount)}
        </span>
      </div>
    </div>
  );
};
