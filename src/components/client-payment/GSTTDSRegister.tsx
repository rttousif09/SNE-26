import React from 'react';
import { motion } from 'motion/react';

export const GSTTDSRegister = ({ data }: { data: any[] }) => {
  return (
    <div className="overflow-x-auto bg-white border border-[#bcc5cf] shadow-sm">
      <table className="w-full border-collapse text-[10px]">
        <thead className="bg-[#f0e6fa]">
          <tr className="sap-header font-bold text-gray-800 divide-x divide-purple-200 border-b border-[#bcc5cf]">
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Bill No</th>
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Site Name</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf]">Bill Amt</th>
            
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] bg-purple-100 text-purple-900 border-b border-b-purple-300">GST on Bill</th>
            <th className="px-2 py-1.5 text-center border-r border-[#bcc5cf] bg-purple-100 text-purple-900 border-b border-b-purple-300">GST Status</th>
            
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] bg-red-100 text-red-900 border-b border-b-red-300">TDS Deducted</th>
            <th className="px-2 py-1.5 text-center bg-red-100 text-red-900 border-b border-b-red-300">TDS Certificate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.filter(d => d.gst > 0 || d.tds > 0).map((row, idx) => (
            <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-purple-50/30">
              <td className="px-2 py-1.5 font-mono font-semibold text-[var(--color-sap-blue-val)] border-r border-[#bcc5cf]">{row.billNo}</td>
              <td className="px-2 py-1.5 border-r border-[#bcc5cf] font-semibold">{row.siteName}</td>
              <td className="px-2 py-1.5 text-right font-mono border-r border-[#bcc5cf]">{row.gross.toLocaleString('en-IN')}</td>
              
              <td className="px-2 py-1.5 text-right font-mono font-bold text-purple-800 border-r border-[#bcc5cf] bg-purple-50/50">{row.gst.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-center border-r border-[#bcc5cf]">
                 <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-800">Pending</span>
              </td>

              <td className="px-2 py-1.5 text-right font-mono font-bold text-red-800 border-r border-[#bcc5cf] bg-red-50/50">{row.tds.toLocaleString('en-IN')}</td>
              <td className="px-2 py-1.5 text-center border-[#bcc5cf]">
                 <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800">Pending</span>
              </td>
            </motion.tr>
          ))}
          {data.filter(d => d.gst > 0 || d.tds > 0).length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-6 text-gray-500 font-semibold">
                No GST or TDS records found for current selection.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
