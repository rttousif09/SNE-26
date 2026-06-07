import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Plus, Eye } from 'lucide-react';

export const PaymentRegister = ({ data, onAddPayment, onViewHistory }: { data: any[], onAddPayment: (billId: string) => void, onViewHistory: (billId: string) => void }) => {
  
  return (
    <div className="overflow-x-auto mt-4 bg-white border border-[#bcc5cf] shadow-sm">
      <table className="w-full border-collapse text-[10px]">
        <thead className="bg-[#f3f4f6]">
          <tr className="sap-header font-bold text-gray-800 divide-x divide-[#8c9ba8] border-b border-[#bcc5cf]">
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Bill No</th>
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Bill Date</th>
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Site/Client</th>
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Bill Type</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf]">Gross Amt</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf]">GST</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf]">TDS</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf]">Retention</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] text-[#0056b3]">Net Bill</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] text-green-700">Paid</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] text-orange-700">Outstanding</th>
            <th className="px-2 py-1.5 text-center border-r border-[#bcc5cf]">Status</th>
            <th className="px-2 py-1.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, idx) => (
            <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-blue-50/50">
              <td className="px-2 py-1.5 font-mono font-semibold text-[#002f6c] border-r border-[#bcc5cf]">{row.billNo}</td>
              <td className="px-2 py-1.5 border-r border-[#bcc5cf]">{row.date}</td>
              <td className="px-2 py-1.5 border-r border-[#bcc5cf]">
                <div className="font-semibold text-gray-900">{row.siteName}</div>
                <div className="text-[9px] text-gray-500">{row.clientName}</div>
              </td>
              <td className="px-2 py-1.5 border-r border-[#bcc5cf]">{row.billType}</td>
              <td className="px-2 py-1.5 text-right font-mono border-r border-[#bcc5cf]">{row.gross.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-right font-mono border-r border-[#bcc5cf]">{row.gst.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-right font-mono text-red-600 border-r border-[#bcc5cf]">{row.tds.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-right font-mono text-orange-600 border-r border-[#bcc5cf]">{row.retention.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-right font-mono font-bold text-[#0056b3] border-r border-[#bcc5cf] bg-blue-50/20">{row.netReceivable.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-right font-mono font-bold text-green-700 border-r border-[#bcc5cf] bg-green-50/30">{row.totalPaid.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-right font-mono font-bold text-orange-700 border-r border-[#bcc5cf] bg-orange-50/30">{row.outstanding.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-center border-r border-[#bcc5cf]">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  row.status === 'Fully Paid' ? 'bg-green-100 text-green-800' :
                  row.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="px-2 py-1.5 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <button onClick={() => onAddPayment(row.id)} className="p-1 hover:bg-gray-200 rounded text-blue-600 transition" title="Add Payment">
                    <Plus size={12} />
                  </button>
                  <button onClick={() => onViewHistory(row.id)} className="p-1 hover:bg-gray-200 rounded text-gray-600 transition" title="View History">
                    <Eye size={12} />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={13} className="text-center py-4 text-gray-500 font-semibold">No records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
