import React from 'react';
import { Eye, ShieldAlert, CheckCircle2, AlertCircle, FileSpreadsheet, MapPin } from 'lucide-react';
import { LedgerItem } from './Modals';

// ==========================================
// 1. EARNINGS TAB
// ==========================================
export const EarningsTab: React.FC<{
  workerPayments: any[];
  workerId: string;
  projectId: string;
  projectMap: Record<string, string>;
  onInspectPayment: (payment: any) => void;
}> = ({ workerPayments, workerId, projectId, projectMap, onInspectPayment }) => {
  const filtered = workerPayments.filter(p => {
    if (p.workerId !== workerId) return false;
    if (projectId !== 'All' && p.projectId !== projectId) return false;
    return true;
  });

  const totalEarnings = filtered.reduce((s, p) => s + (parseFloat(p.workAmount || p.grossPayable || p.totalEarnings) || 0) + (parseFloat(p.supplyAmount) || 0), 0);
  const totalDays = filtered.reduce((s, p) => s + (parseInt(p.workDays) || 0), 0);

  return (
    <div className="space-y-3 text-[11px]">
      <div className="bg-[#f0f4f8] p-2.5 rounded border border-gray-300 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-xs">Work Payroll Certified Earnings & Floor Abstracts</span>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span>Total Work Days: <strong>{totalDays}</strong></span>
          <span className="text-emerald-700 font-bold">Total Gross Earnings: ₹{Math.round(totalEarnings).toLocaleString('en-IN')} Cr</span>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Date / Month</th>
              <th className="py-2 px-3">Voucher No</th>
              <th className="py-2 px-3">Project</th>
              <th className="py-2 px-3">Category & Level</th>
              <th className="py-2 px-3 text-right">Work Days</th>
              <th className="py-2 px-3 text-right">Rate / Day</th>
              <th className="py-2 px-3 text-right">Supply Amt</th>
              <th className="py-2 px-3 text-right font-bold text-emerald-700">Gross Payable</th>
              <th className="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {filtered.map((p, idx) => {
              const gross = (parseFloat(p.workAmount || p.grossPayable || p.totalEarnings) || 0) + (parseFloat(p.supplyAmount) || 0);
              return (
                <tr key={p.id || idx} className="hover:bg-blue-50/40">
                  <td className="py-1.5 px-3 whitespace-nowrap text-gray-700">{p.date || p.month}</td>
                  <td className="py-1.5 px-3 font-bold text-gray-900">{p.voucherNo || `PAY-${p.month}`}</td>
                  <td className="py-1.5 px-3 font-sans text-gray-700">{projectMap[p.projectId] || p.projectId}</td>
                  <td className="py-1.5 px-3 font-sans text-gray-800">{p.workCategory || 'General Work'} ({p.level || 'Site'})</td>
                  <td className="py-1.5 px-3 text-right">{p.workDays || '—'}</td>
                  <td className="py-1.5 px-3 text-right">{p.ratePerDay ? `₹${p.ratePerDay}` : '—'}</td>
                  <td className="py-1.5 px-3 text-right">{p.supplyAmount ? `₹${p.supplyAmount}` : '—'}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-emerald-700">₹{Math.round(gross).toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 text-center font-sans">
                    <button
                      onClick={() => onInspectPayment(p)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#0a6ed1] border border-blue-200 rounded font-semibold text-[10px]"
                    >
                      View Breakdown
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-gray-400 font-sans italic">
                  No earnings records registered for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 2. ADVANCES TAB (WFT01)
// ==========================================
export const AdvancesTab: React.FC<{
  advances: any[];
  workerId: string;
  projectId: string;
  projectMap: Record<string, string>;
}> = ({ advances, workerId, projectId, projectMap }) => {
  const filtered = advances.filter(a => {
    if (a.workerId !== workerId) return false;
    if (projectId !== 'All' && a.projectId !== projectId) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const totalAdjusted = filtered.reduce((s, a) => s + (parseFloat(a.adjustedAmount || a.deductionAmount) || 0), 0);
  const totalOutstanding = Math.max(0, totalAmount - totalAdjusted);

  return (
    <div className="space-y-3 text-[11px]">
      <div className="bg-[#f0f4f8] p-2.5 rounded border border-gray-300 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-xs">Worker Financial Advances (Site, Travel, Emergency)</span>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span>Total Disbursed: <strong>₹{Math.round(totalAmount).toLocaleString('en-IN')}</strong></span>
          <span className="text-emerald-700">Recovered: <strong>₹{Math.round(totalAdjusted).toLocaleString('en-IN')}</strong></span>
          <span className="text-rose-700 font-bold">Outstanding: ₹{Math.round(totalOutstanding).toLocaleString('en-IN')} Dr</span>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Transaction No</th>
              <th className="py-2 px-3">Project</th>
              <th className="py-2 px-3">Advance Type</th>
              <th className="py-2 px-3 text-right">Amount</th>
              <th className="py-2 px-3 text-right">Recovered</th>
              <th className="py-2 px-3 text-right">Outstanding</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Paid By</th>
              <th className="py-2 px-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {filtered.map((a, idx) => {
              const amt = parseFloat(a.amount) || 0;
              const rec = parseFloat(a.adjustedAmount || a.deductionAmount) || 0;
              const os = Math.max(0, amt - rec);
              const status = os === 0 ? 'Recovered' : rec > 0 ? 'Partially Recovered' : 'Outstanding';
              return (
                <tr key={a.id || idx} className="hover:bg-blue-50/40">
                  <td className="py-1.5 px-3 whitespace-nowrap text-gray-700">{a.date}</td>
                  <td className="py-1.5 px-3 font-bold text-gray-900">{a.transactionNo || `ADV-${a.id.substring(0, 6)}`}</td>
                  <td className="py-1.5 px-3 font-sans text-gray-700">{projectMap[a.projectId] || a.projectId}</td>
                  <td className="py-1.5 px-3 font-sans text-gray-800">{a.paymentType || 'Site Advance'}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-rose-700">₹{Math.round(amt).toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 text-right text-emerald-700">₹{Math.round(rec).toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-gray-900">₹{Math.round(os).toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 font-sans">
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                      status === 'Recovered' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      status === 'Partially Recovered' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                      'bg-rose-50 text-rose-700 border-rose-300'
                    }`}>
                      {status}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 font-sans text-gray-700">{a.paidBy || 'Supervisor'}</td>
                  <td className="py-1.5 px-3 font-sans text-gray-500 text-[10px]">{a.remarks || '—'}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-gray-400 font-sans italic">
                  No advance disbursement records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 3. KHARCHI TAB (KHA01)
// ==========================================
export const KharchiTab: React.FC<{
  kharchis: any[];
  workerId: string;
  projectId: string;
  projectMap: Record<string, string>;
}> = ({ kharchis, workerId, projectId, projectMap }) => {
  const filtered = kharchis.filter(k => {
    if (k.workerId !== workerId) return false;
    if (projectId !== 'All' && k.projectId !== projectId) return false;
    return true;
  });

  const totalKharchi = filtered.reduce((s, k) => s + (parseFloat(k.amount) || 0), 0);

  return (
    <div className="space-y-3 text-[11px]">
      <div className="bg-[#f0f4f8] p-2.5 rounded border border-gray-300 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-xs">Weekly Pocket Money (Kharchi) Distribution History</span>
        <div className="text-xs font-mono font-bold text-amber-800">
          Total Kharchi Disbursed: ₹{Math.round(totalKharchi).toLocaleString('en-IN')} Dr ({filtered.length} disbursements)
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Voucher Ref</th>
              <th className="py-2 px-3">Project</th>
              <th className="py-2 px-3 text-right">Kharchi Amount</th>
              <th className="py-2 px-3">Payment Mode</th>
              <th className="py-2 px-3">Distributed By</th>
              <th className="py-2 px-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {filtered.map((k, idx) => (
              <tr key={k.id || idx} className="hover:bg-blue-50/40">
                <td className="py-1.5 px-3 whitespace-nowrap text-gray-700">{k.date}</td>
                <td className="py-1.5 px-3 font-bold text-gray-900">{`KHA-${(k.id || '').substring(0, 6).toUpperCase()}`}</td>
                <td className="py-1.5 px-3 font-sans text-gray-700">{projectMap[k.projectId] || k.projectId}</td>
                <td className="py-1.5 px-3 text-right font-bold text-amber-700">₹{parseFloat(k.amount || 0).toLocaleString('en-IN')}</td>
                <td className="py-1.5 px-3 font-sans text-gray-700">{k.mode || 'Cash'}</td>
                <td className="py-1.5 px-3 font-sans text-gray-700">{k.givenBy || 'Site Supervisor'}</td>
                <td className="py-1.5 px-3 font-sans text-gray-500 text-[10px]">{k.remarks || 'Weekly allowance'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400 font-sans italic">
                  No kharchi distributions recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 4. DEDUCTIONS TAB
// ==========================================
export const DeductionsTab: React.FC<{
  workerPayments: any[];
  workerLedger: any[];
  workerId: string;
  projectId: string;
  projectMap: Record<string, string>;
}> = ({ workerPayments, workerLedger, workerId, projectId, projectMap }) => {
  const pays = workerPayments.filter(p => p.workerId === workerId && (projectId === 'All' || p.projectId === projectId));
  const ledgerDeds = workerLedger.filter(l => l.workerId === workerId && (projectId === 'All' || l.projectId === projectId) && l.debit > 0 && l.entryType !== 'Payment' && l.entryType !== 'Advance' && l.entryType !== 'Kharchi');

  let totalMess = 0;
  let totalAdvanceDeducted = 0;
  let totalOverBalanceDeducted = 0;
  let totalOtherDeducted = 0;

  const rows: any[] = [];

  pays.forEach(p => {
    if (parseFloat(p.messDeduction) > 0) {
      totalMess += parseFloat(p.messDeduction);
      rows.push({
        date: p.date || `${p.month}-28`,
        voucher: p.voucherNo || `PAY-${p.month}`,
        project: projectMap[p.projectId] || p.projectId,
        category: 'Mess / Boarding Charges',
        amount: parseFloat(p.messDeduction),
        details: `Canteen boarding deductions for ${p.month}`
      });
    }
    if (parseFloat(p.advanceDeduction || p.recoveryAmount) > 0) {
      totalAdvanceDeducted += parseFloat(p.advanceDeduction || p.recoveryAmount);
      rows.push({
        date: p.date || `${p.month}-28`,
        voucher: p.voucherNo || `PAY-${p.month}`,
        project: projectMap[p.projectId] || p.projectId,
        category: 'Advance Recovery',
        amount: parseFloat(p.advanceDeduction || p.recoveryAmount),
        details: `Advance deducted against wages for ${p.month}`
      });
    }
    if (parseFloat(p.previousOverBalance) > 0) {
      totalOverBalanceDeducted += parseFloat(p.previousOverBalance);
      rows.push({
        date: p.date || `${p.month}-28`,
        voucher: p.voucherNo || `PAY-${p.month}`,
        project: projectMap[p.projectId] || p.projectId,
        category: 'Previous Over Balance Recovery',
        amount: parseFloat(p.previousOverBalance),
        details: `Prior payroll deficit recovered in ${p.month}`
      });
    }
    if (parseFloat(p.otherDeduction) > 0) {
      totalOtherDeducted += parseFloat(p.otherDeduction);
      rows.push({
        date: p.date || `${p.month}-28`,
        voucher: p.voucherNo || `PAY-${p.month}`,
        project: projectMap[p.projectId] || p.projectId,
        category: 'Other Deductions',
        amount: parseFloat(p.otherDeduction),
        details: p.otherDeductionDetails || `Other payroll deduction for ${p.month}`
      });
    }
  });

  ledgerDeds.forEach(l => {
    totalOtherDeducted += l.debit;
    rows.push({
      date: l.date,
      voucher: l.voucherNo,
      project: projectMap[l.projectId] || l.projectId,
      category: l.particulars || l.description || 'Manual Adjustment',
      amount: l.debit,
      details: l.remarks || 'Authorized ledger deduction'
    });
  });

  return (
    <div className="space-y-3 text-[11px]">
      <div className="bg-[#f0f4f8] p-2.5 rounded border border-gray-300 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-xs">Payroll & Ledger Deductions Summary</span>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span>Mess: <strong>₹{Math.round(totalMess).toLocaleString('en-IN')}</strong></span>
          <span>Adv Recovery: <strong>₹{Math.round(totalAdvanceDeducted).toLocaleString('en-IN')}</strong></span>
          <span>Over Balance: <strong>₹{Math.round(totalOverBalanceDeducted).toLocaleString('en-IN')}</strong></span>
          <span className="text-rose-700 font-bold">Total: ₹{Math.round(totalMess + totalAdvanceDeducted + totalOverBalanceDeducted + totalOtherDeducted).toLocaleString('en-IN')} Dr</span>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Voucher Ref</th>
              <th className="py-2 px-3">Project</th>
              <th className="py-2 px-3">Deduction Category</th>
              <th className="py-2 px-3 text-right">Deduction Amount</th>
              <th className="py-2 px-3">Details & Audit Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-blue-50/40">
                <td className="py-1.5 px-3 whitespace-nowrap text-gray-700">{r.date}</td>
                <td className="py-1.5 px-3 font-bold text-gray-900">{r.voucher}</td>
                <td className="py-1.5 px-3 font-sans text-gray-700">{r.project}</td>
                <td className="py-1.5 px-3 font-sans font-semibold text-gray-800">{r.category}</td>
                <td className="py-1.5 px-3 text-right font-bold text-rose-700">₹{Math.round(r.amount).toLocaleString('en-IN')}</td>
                <td className="py-1.5 px-3 font-sans text-gray-600 text-[10px]">{r.details}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400 font-sans italic">
                  No deductions recorded for this worker.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 5. PAYMENTS TAB (PAY01)
// ==========================================
export const PaymentsTab: React.FC<{
  workerPayments: any[];
  workerId: string;
  projectId: string;
  projectMap: Record<string, string>;
  onInspectPayment: (payment: any) => void;
}> = ({ workerPayments, workerId, projectId, projectMap, onInspectPayment }) => {
  const filtered = workerPayments.filter(p => {
    if (p.workerId !== workerId) return false;
    if (projectId !== 'All' && p.projectId !== projectId) return false;
    return true;
  });

  const totalNet = filtered.reduce((s, p) => s + (parseFloat(p.netPayment) || 0), 0);

  return (
    <div className="space-y-3 text-[11px]">
      <div className="bg-[#f0f4f8] p-2.5 rounded border border-gray-300 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-xs">Worker Wage Payment Settlements (PAY01)</span>
        <div className="text-xs font-mono font-bold text-emerald-800">
          Total Net Disbursed: ₹{Math.round(totalNet).toLocaleString('en-IN')} Dr
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Month</th>
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Voucher No</th>
              <th className="py-2 px-3">Project</th>
              <th className="py-2 px-3 text-right">Gross Earned</th>
              <th className="py-2 px-3 text-right">Kharchi Ded</th>
              <th className="py-2 px-3 text-right">Mess Ded</th>
              <th className="py-2 px-3 text-right">Adv Ded</th>
              <th className="py-2 px-3 text-right">Over Balance</th>
              <th className="py-2 px-3 text-right font-bold text-emerald-700">Net Payment</th>
              <th className="py-2 px-3 text-center">Settlement Breakup</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {filtered.map((p, idx) => (
              <tr key={p.id || idx} className="hover:bg-blue-50/40">
                <td className="py-1.5 px-3 font-bold text-gray-900">{p.month}</td>
                <td className="py-1.5 px-3 whitespace-nowrap text-gray-700">{p.date || '—'}</td>
                <td className="py-1.5 px-3 font-bold text-[#0a6ed1]">{p.voucherNo || `PAY-${p.month}`}</td>
                <td className="py-1.5 px-3 font-sans text-gray-700">{projectMap[p.projectId] || p.projectId}</td>
                <td className="py-1.5 px-3 text-right text-emerald-700 font-semibold">₹{Math.round(parseFloat(p.grossPayable || p.workAmount || 0)).toLocaleString('en-IN')}</td>
                <td className="py-1.5 px-3 text-right text-rose-600">{p.totalKharchi > 0 ? `-₹${Math.round(p.totalKharchi)}` : '—'}</td>
                <td className="py-1.5 px-3 text-right text-purple-600">{p.messDeduction > 0 ? `-₹${Math.round(p.messDeduction)}` : '—'}</td>
                <td className="py-1.5 px-3 text-right text-rose-700">{p.advanceDeduction > 0 ? `-₹${Math.round(p.advanceDeduction)}` : '—'}</td>
                <td className="py-1.5 px-3 text-right text-amber-700">{p.previousOverBalance > 0 ? `-₹${Math.round(p.previousOverBalance)}` : '—'}</td>
                <td className="py-1.5 px-3 text-right font-bold text-emerald-800">
                  {p.netPayment > 0 ? `₹${Math.round(p.netPayment).toLocaleString('en-IN')}` : '₹0.00 (Over Bal)'}
                </td>
                <td className="py-1.5 px-3 text-center font-sans">
                  <button
                    onClick={() => onInspectPayment(p)}
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#0a6ed1] border border-blue-200 rounded font-semibold text-[10px]"
                  >
                    View Breakup
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-6 text-center text-gray-400 font-sans italic">
                  No payment settlements recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 6. RECOVERY & HOLDS TAB
// ==========================================
export const RecoveryHoldsTab: React.FC<{
  workerHolds: any[];
  workerId: string;
  projectId: string;
  projectMap: Record<string, string>;
  onPlaceHold: () => void;
  onReleaseHold: (hold: any) => void;
}> = ({ workerHolds, workerId, projectId, projectMap, onPlaceHold, onReleaseHold }) => {
  const filtered = workerHolds.filter(h => {
    if (h.workerId !== workerId) return false;
    if (projectId !== 'All' && h.projectId !== projectId) return false;
    return true;
  });

  const totalHeld = filtered.reduce((s, h) => s + (parseFloat(h.holdAmount) || 0), 0);
  const totalReleased = filtered.reduce((s, h) => s + (parseFloat(h.releasedAmount) || 0), 0);
  const activeHeld = Math.max(0, totalHeld - totalReleased);

  return (
    <div className="space-y-3 text-[11px]">
      <div className="bg-[#f0f4f8] p-2.5 rounded border border-gray-300 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-xs">Wage Retention & Disciplinary Holds</span>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span>Total Holds: <strong>₹{Math.round(totalHeld).toLocaleString('en-IN')}</strong></span>
          <span className="text-emerald-700">Released: <strong>₹{Math.round(totalReleased).toLocaleString('en-IN')}</strong></span>
          <span className="text-orange-700 font-bold">Active Hold: ₹{Math.round(activeHeld).toLocaleString('en-IN')}</span>
          <button
            onClick={onPlaceHold}
            className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold font-sans ml-2"
          >
            + New Wage Hold
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Hold Date</th>
              <th className="py-2 px-3">Hold Ref</th>
              <th className="py-2 px-3">Project</th>
              <th className="py-2 px-3 text-right">Hold Amount</th>
              <th className="py-2 px-3 text-right">Released Amount</th>
              <th className="py-2 px-3 text-right">Remaining Held</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Reason / Remarks</th>
              <th className="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {filtered.map((h, idx) => {
              const rem = h.remainingHold ?? (h.holdAmount - (h.releasedAmount || 0));
              const canRelease = rem > 0;
              return (
                <tr key={h.id || idx} className="hover:bg-blue-50/40">
                  <td className="py-1.5 px-3 whitespace-nowrap text-gray-700">{h.holdDate}</td>
                  <td className="py-1.5 px-3 font-bold text-gray-900">{`HOLD-${h.id.substring(0, 6).toUpperCase()}`}</td>
                  <td className="py-1.5 px-3 font-sans text-gray-700">{projectMap[h.projectId] || h.projectId}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-orange-700">₹{Math.round(h.holdAmount).toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 text-right text-emerald-700">₹{Math.round(h.releasedAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-rose-700">₹{Math.round(rem).toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 font-sans">
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                      h.status === 'Released' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      rem === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      h.releasedAmount > 0 ? 'bg-amber-50 text-amber-700 border-amber-300' :
                      'bg-rose-50 text-rose-700 border-rose-300'
                    }`}>
                      {rem === 0 ? 'Released' : h.status || 'Held'}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 font-sans text-gray-700 text-[10px]">
                    <strong>{h.reason}:</strong> {h.remarks || 'No notes'}
                  </td>
                  <td className="py-1.5 px-3 text-center font-sans">
                    {canRelease && (
                      <button
                        onClick={() => onReleaseHold(h)}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded font-semibold text-[10px]"
                      >
                        Release Hold
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-gray-400 font-sans italic">
                  No wage holds recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 7. PROJECT HISTORY TAB
// ==========================================
export const ProjectHistoryTab: React.FC<{
  workerId: string;
  workerPayments: any[];
  advances: any[];
  kharchis: any[];
  workerLedger: any[];
  projects: any[];
  projectMap: Record<string, string>;
}> = ({ workerId, workerPayments, advances, kharchis, workerLedger, projects, projectMap }) => {
  // Aggregate stats per project for this worker
  const projectStats: Record<string, {
    projectId: string;
    projectName: string;
    earnings: number;
    advances: number;
    kharchi: number;
    mess: number;
    payments: number;
    otherDebits: number;
    netBalance: number;
    firstDate?: string;
    lastDate?: string;
  }> = {};

  const getP = (pid: string) => {
    const id = pid || 'unassigned';
    if (!projectStats[id]) {
      projectStats[id] = {
        projectId: id,
        projectName: projectMap[id] || 'Other Site',
        earnings: 0,
        advances: 0,
        kharchi: 0,
        mess: 0,
        payments: 0,
        otherDebits: 0,
        netBalance: 0
      };
    }
    return projectStats[id];
  };

  workerPayments.filter(p => p.workerId === workerId).forEach(p => {
    const st = getP(p.projectId);
    const gross = (parseFloat(p.workAmount || p.grossPayable || p.totalEarnings) || 0) + (parseFloat(p.supplyAmount) || 0);
    st.earnings += gross;
    st.mess += parseFloat(p.messDeduction) || 0;
    st.payments += parseFloat(p.netPayment) || 0;
    if (!st.firstDate || (p.date && p.date < st.firstDate)) st.firstDate = p.date;
    if (!st.lastDate || (p.date && p.date > st.lastDate)) st.lastDate = p.date;
  });

  advances.filter(a => a.workerId === workerId).forEach(a => {
    const st = getP(a.projectId);
    st.advances += parseFloat(a.amount) || 0;
    if (!st.firstDate || a.date < st.firstDate) st.firstDate = a.date;
    if (!st.lastDate || a.date > st.lastDate) st.lastDate = a.date;
  });

  kharchis.filter(k => k.workerId === workerId).forEach(k => {
    const st = getP(k.projectId);
    st.kharchi += parseFloat(k.amount) || 0;
    if (!st.firstDate || k.date < st.firstDate) st.firstDate = k.date;
    if (!st.lastDate || k.date > st.lastDate) st.lastDate = k.date;
  });

  workerLedger.filter(l => l.workerId === workerId && l.status !== 'Reversed').forEach(l => {
    const st = getP(l.projectId);
    if (l.credit > 0 && l.entryType !== 'Earnings') {
      st.earnings += l.credit;
    }
    if (l.debit > 0 && l.entryType === 'Adjustment') {
      st.otherDebits += l.debit;
    }
  });

  const list = Object.values(projectStats).map(st => {
    const net = st.earnings - (st.advances + st.kharchi + st.mess + st.payments + st.otherDebits);
    return { ...st, netBalance: net };
  });

  return (
    <div className="space-y-4 text-[11px]">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[11px] text-blue-900 flex items-start space-x-2">
        <MapPin className="w-4 h-4 text-[#0a6ed1] shrink-0 mt-0.5" />
        <div>
          <strong>Worker Mobility & Unified Financial Identity Architecture:</strong> A worker retains their persistent Worker ID across transfers between project sites (e.g. S3 Eco City, Seawoods, Mulund). 
          Historical ledger balances and liabilities are seamlessly preserved, ensuring no loss of financial identity or duplicate debit postings.
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Project / Site Name</th>
              <th className="py-2 px-3">Tenure / Period</th>
              <th className="py-2 px-3 text-right">Total Earnings</th>
              <th className="py-2 px-3 text-right">Total Advances</th>
              <th className="py-2 px-3 text-right">Total Kharchi</th>
              <th className="py-2 px-3 text-right">Total Mess</th>
              <th className="py-2 px-3 text-right">Total Payments</th>
              <th className="py-2 px-3 text-right font-bold">Site Net Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {list.map((st, idx) => (
              <tr key={idx} className="hover:bg-blue-50/40">
                <td className="py-2 px-3 font-sans font-bold text-gray-900 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0a6ed1]" />
                  <span>{st.projectName}</span>
                </td>
                <td className="py-2 px-3 text-gray-600">{st.firstDate ? `${st.firstDate} to ${st.lastDate || 'Present'}` : 'All Time'}</td>
                <td className="py-2 px-3 text-right text-emerald-700 font-semibold">₹{Math.round(st.earnings).toLocaleString('en-IN')} Cr</td>
                <td className="py-2 px-3 text-right text-rose-700">₹{Math.round(st.advances).toLocaleString('en-IN')} Dr</td>
                <td className="py-2 px-3 text-right text-amber-700">₹{Math.round(st.kharchi).toLocaleString('en-IN')} Dr</td>
                <td className="py-2 px-3 text-right text-purple-700">₹{Math.round(st.mess).toLocaleString('en-IN')} Dr</td>
                <td className="py-2 px-3 text-right text-emerald-800">₹{Math.round(st.payments).toLocaleString('en-IN')} Dr</td>
                <td className={`py-2 px-3 text-right font-bold ${st.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ₹{Math.abs(Math.round(st.netBalance)).toLocaleString('en-IN')} {st.netBalance >= 0 ? 'Cr' : 'Dr'}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400 font-sans italic">
                  No multi-project history recorded for this worker.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
