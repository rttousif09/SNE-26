import React, { useMemo } from 'react';
import { Users, FileText, CreditCard, AlertCircle, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Subcontractor, SubcontractorBill, SubcontractorPayment } from '../../types';

interface DashboardComponentProps {
  subcontractors: Subcontractor[];
  bills: SubcontractorBill[];
  payments: SubcontractorPayment[];
}

export const DashboardComponent: React.FC<DashboardComponentProps> = ({
  subcontractors,
  bills,
  payments
}) => {
  // Calculations for KPI Dashboard
  const stats = useMemo(() => {
    const totalBillsCount = bills.length;
    const activeContractors = subcontractors.filter(s => s.status === 'Active').length;
    
    let totalBilled = 0;
    let totalPaid = 0;
    let totalRetention = 0;
    let totalTds = 0;
    let totalRecovery = 0;

    bills.forEach(b => {
      // Billed gross & additions
      totalBilled += b.grossAmount + b.gstAmount;
      totalRetention += b.retentionAmount;
      totalTds += b.tdsAmount;
      totalRecovery += b.recoveryAmount;
    });

    payments.forEach(p => {
      totalPaid += p.amount;
    });

    const netOwings = totalBilled - (totalRetention + totalTds + totalRecovery + totalPaid);

    return {
      activeContractors,
      totalBillsCount,
      totalBilled,
      totalPaid,
      outstanding: netOwings,
      totalRetention,
      totalTds,
      totalRecovery
    };
  }, [subcontractors, bills, payments]);

  // Recharts Chart Details: Billed vs Paid per Subcontractor
  const chartData = useMemo(() => {
    return subcontractors.map(s => {
      const subBills = bills.filter(b => b.subcontractorId === s.id);
      const subPmts = payments.filter(p => p.subcontractorId === s.id);

      const billedAmount = subBills.reduce((acc, b) => acc + b.grossAmount + b.gstAmount, 0);
      const deductions = subBills.reduce((acc, b) => acc + b.retentionAmount + b.tdsAmount + b.recoveryAmount, 0);
      const paidAmount = subPmts.reduce((acc, p) => acc + p.amount, 0);

      return {
        name: s.name.substring(0, 10) + (s.name.length > 10 ? '...' : ''),
        Billed: billedAmount,
        Deducted: deductions,
        Paid: paidAmount,
        Outstanding: billedAmount - deductions - paidAmount
      };
    }).filter(d => d.Billed > 0 || d.Paid > 0);
  }, [subcontractors, bills, payments]);

  return (
    <div className="space-y-4">
      {/* KPI Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border-b-2 border-amber-500 p-3 rounded shadow-sm">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Active Contract Partners</span>
            <Users size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-bold text-gray-800 mt-1">{stats.activeContractors}</div>
          <span className="text-[9px] text-[#22c55e]">● Database Synced</span>
        </div>

        <div className="bg-white border-b-2 border-amber-500 p-3 rounded shadow-sm">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Gross Work Billed (with GST)</span>
            <FileText size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-bold text-gray-800 mt-1">₹{stats.totalBilled.toLocaleString()}</div>
          <span className="text-[9px] text-gray-500">From {stats.totalBillsCount} records posted</span>
        </div>

        <div className="bg-white border-b-2 border-emerald-500 p-3 rounded shadow-sm">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Disbursed Cash Outflow</span>
            <CreditCard size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-gray-800 mt-1">₹{stats.totalPaid.toLocaleString()}</div>
          <span className="text-[9px] text-emerald-500">Released via Cash / Bank</span>
        </div>

        <div className="bg-white border-b-2 border-rose-500 p-3 rounded shadow-sm">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Net Outstanding Balance</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-xl font-bold text-gray-800 mt-1">₹{stats.outstanding.toLocaleString()}</div>
          <span className="text-[9px] text-rose-500">Net Liability to Creditors</span>
        </div>
      </div>

      {/* Deduction Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#eff6ff] p-2.5 rounded flex justify-between items-center border border-blue-200">
          <div>
            <div className="text-gray-600 text-[10px] font-bold">Total Retention Held (5%)</div>
            <div className="text-md font-bold text-blue-900 mt-0.5">₹{stats.totalRetention.toLocaleString()}</div>
          </div>
          <span className="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-bold">Asset Reserves</span>
        </div>

        <div className="bg-[#f0fdf4] p-2.5 rounded flex justify-between items-center border border-green-200">
          <div>
            <div className="text-gray-650 text-[10px] font-bold">Total TDS Provisioned (1%)</div>
            <div className="text-md font-bold text-green-900 mt-0.5">₹{stats.totalTds.toLocaleString()}</div>
          </div>
          <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-bold">Tax Asset</span>
        </div>

        <div className="bg-[#fdf2f8] p-2.5 rounded flex justify-between items-center border border-pink-200">
          <div>
            <div className="text-gray-650 text-[10px] font-bold">Materials Backcharges / Deductions</div>
            <div className="text-md font-bold text-pink-900 mt-0.5">₹{stats.totalRecovery.toLocaleString()}</div>
          </div>
          <span className="text-xs text-pink-700 bg-pink-100 px-1.5 py-0.5 rounded font-bold">Debit Recoupments</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="bg-white border p-4 rounded shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 ml-2 flex items-center space-x-1">
          <Activity size={12} className="text-amber-500" />
          <span>Subcontractor certified billing vs liquid payments overview</span>
        </h3>
        <div className="w-full h-72">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              No published contractor transactions registered to generate visual reports.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Legend />
                <Bar dataKey="Billed" fill="#f59e0b" name="Gross + GST" />
                <Bar dataKey="Deducted" fill="#ef4444" name="Deductions" />
                <Bar dataKey="Paid" fill="#10b981" name="Liquid Disbursed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
