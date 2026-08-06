import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, CalendarRange, CheckCircle } from 'lucide-react';

export const RetentionRegister = ({ data, onAddRetentionPayment }: { data: any[], onAddRetentionPayment: (billId: string) => void }) => {
  return (
    <div className="overflow-x-auto bg-white border border-[#bcc5cf] shadow-sm">
      <table className="w-full border-collapse text-[10px]">
        <thead className="bg-orange-50">
          <tr className="sap-header font-bold text-gray-800 divide-x divide-orange-200 border-b border-[#bcc5cf]">
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Bill No</th>
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Site Name</th>
            <th className="px-2 py-1.5 text-left border-r border-[#bcc5cf]">Bill Date</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf]">Gross Amt</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf]">Retention %</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] text-orange-800">Retention Amount</th>
            <th className="px-2 py-1.5 text-center border-r border-[#bcc5cf]">Release Due Date</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] text-green-700">Released</th>
            <th className="px-2 py-1.5 text-right border-r border-[#bcc5cf] text-red-600">Balance</th>
            <th className="px-2 py-1.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.filter(d => d.retention > 0).map((row, idx) => {
            const retentionReleased = row.payments?.filter((p: any) => p.isRetentionPayment === 1).reduce((sum: number, p: any) => sum + (p.amountReceived || 0), 0) || 0;
            const retentionBalance = row.retention - retentionReleased;
            const retentionPercent = row.gross > 0 ? ((row.retention / row.gross) * 100).toFixed(1) : 0;
            
            return (
              <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-orange-50/30">
                <td className="px-2 py-1.5 font-mono font-semibold text-[var(--color-sap-blue-val)] border-r border-[#bcc5cf]">{row.billNo}</td>
                <td className="px-2 py-1.5 border-r border-[#bcc5cf] font-semibold">{row.siteName}</td>
                <td className="px-2 py-1.5 border-r border-[#bcc5cf]">{row.date}</td>
                <td className="px-2 py-1.5 text-right font-mono border-r border-[#bcc5cf]">{row.gross.toLocaleString('en-IN')}</td>
                <td className="px-2 py-1.5 text-right font-mono border-r border-[#bcc5cf]">{retentionPercent}%</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-orange-800 border-r border-[#bcc5cf] bg-orange-50/50">{row.retention.toLocaleString('en-IN')}</td>
                <td className="px-2 py-1.5 text-center border-r border-[#bcc5cf] text-gray-500 italic">Not set</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-green-700 border-r border-[#bcc5cf] bg-green-50/20">{retentionReleased.toLocaleString('en-IN')}</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-red-600 border-r border-[#bcc5cf] bg-red-50/20">{retentionBalance.toLocaleString('en-IN')}</td>
                <td className="px-2 py-1.5 text-center">
                  <button onClick={() => onAddRetentionPayment(row.id)} className="sap-btn-sm bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200">
                    Recover
                  </button>
                </td>
              </motion.tr>
            );
          })}
          {data.filter(d => d.retention > 0).length === 0 && (
            <tr>
              <td colSpan={10} className="text-center py-6 text-gray-500 font-semibold flex items-center justify-center space-x-2">
                <ShieldCheck size={16} className="text-gray-400" />
                <span>No retention held for current selection.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
