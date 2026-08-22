import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { X, FileText, Landmark, Users, Calculator, ShieldCheck, Download, AlertCircle, FileCheck, Eye } from 'lucide-react';
import { WorkerPayment, Kharchi, Advance, ExpenseEntry, Worker, Project } from '../types';
import { PDFExportButton } from './PDFExportButton';

interface SheetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'paymentSheet' | 'kharchiSheet' | 'advanceSheet' | 'expenseSheet';
  projectId: string;
  month?: string; // YYYY-MM
  expenseId?: string; // for expense record
  projectName: string;
  // context arrays
  workerPayments: WorkerPayment[];
  kharchis: Kharchi[];
  advances: Advance[];
  expensesLedger: ExpenseEntry[];
  workers: Worker[];
}

export const SheetPreviewModal = ({
  isOpen,
  onClose,
  type,
  projectId,
  month = '',
  expenseId = '',
  projectName,
  workerPayments,
  kharchis,
  advances,
  expensesLedger,
  workers,
}: SheetPreviewModalProps) => {
  if (!isOpen) return null;

  // Helper names
  const getWorkerInfo = (id: string) => {
    const worker = workers.find((w) => w.id === id);
    return worker
      ? { name: worker.name, idNo: worker.workerId, srNo: worker.serialNo, design: worker.designation }
      : { name: 'Unknown', idNo: '-', srNo: '-', design: '-' };
  };

  const getFormatMonth = (ym: string) => {
    if (!ym) return '';
    try {
      const [year, m] = ym.split('-');
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${months[parseInt(m, 10) - 1]} ${year}`;
    } catch {
      return ym;
    }
  };

  // ----------------------------------------------------
  // 1. Worker Payment Sheet Filtering & Computations
  // ----------------------------------------------------
  const sheetPayments = useMemo(() => {
    if (type !== 'paymentSheet') return [];
    return workerPayments.filter((p) => p.projectId === projectId && p.month === month);
  }, [type, workerPayments, projectId, month]);

  const paymentTotals = useMemo(() => {
    const sums = {
      gross: 0,
      supply: 0,
      mess: 0,
      kharchi: 0,
      advance: 0,
      recovery: 0,
      other: 0,
      net: 0,
    };
    sheetPayments.forEach((p) => {
      sums.gross += p.workAmount || 0;
      sums.supply += p.supplyAmount ? Number(p.supplyAmount) || 0 : 0;
      sums.mess += p.messDeduction || 0;
      sums.kharchi += p.kharchiDeduction || 0;
      sums.advance += p.advanceDeduction || 0;
      sums.recovery += p.recoveryAmount || 0;
      sums.other += p.otherDeduction || 0;
      sums.net += p.netPayment || 0;
    });
    return sums;
  }, [sheetPayments]);

  // ----------------------------------------------------
  // 2. Kharchi Sheet Filtering
  // ----------------------------------------------------
  const sheetKharchis = useMemo(() => {
    if (type !== 'kharchiSheet') return [];
    return kharchis.filter((k) => k.projectId === projectId && k.date.startsWith(month));
  }, [type, kharchis, projectId, month]);

  const kharchiTotal = useMemo(() => {
    return sheetKharchis.reduce((sum, k) => sum + (k.amount || 0), 0);
  }, [sheetKharchis]);

  // ----------------------------------------------------
  // 3. Advance Sheet Filtering
  // ----------------------------------------------------
  const sheetAdvances = useMemo(() => {
    if (type !== 'advanceSheet') return [];
    return advances.filter((a) => a.projectId === projectId && a.date.startsWith(month));
  }, [type, advances, projectId, month]);

  const advanceTotal = useMemo(() => {
    return sheetAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [sheetAdvances]);

  // ----------------------------------------------------
  // 4. Expense Entry Details
  // ----------------------------------------------------
  const expenseItem = useMemo(() => {
    if (type !== 'expenseSheet') return null;
    return expensesLedger.find((e) => e.id === expenseId);
  }, [type, expensesLedger, expenseId]);

  const expenseBreakdown = useMemo(() => {
    if (!expenseItem) return [];
    return [
      { category: 'Kharchi Outflow', amount: expenseItem.kharchi || 0, color: 'text-purple-700' },
      { category: 'Mess Expense', amount: expenseItem.mess || 0, color: 'text-indigo-700' },
      { category: 'Worker Advance Paid', amount: expenseItem.workerAdvance || 0, color: 'text-amber-700' },
      { category: 'Tiffin Expenses', amount: expenseItem.tiffin || 0, color: 'text-blue-700' },
      { category: 'Travel & Conveyance', amount: expenseItem.travel || 0, color: 'text-teal-700' },
      { category: 'Machinery & Materials', amount: expenseItem.machineryMaterial || 0, color: 'text-rose-700' },
      { category: 'Manual Worker Payment', amount: expenseItem.workerPayment || 0, color: 'text-emerald-700' },
      { category: 'Office Stationery', amount: expenseItem.stationery || 0, color: 'text-gray-700' },
      { category: 'Miscellaneous Outlay', amount: expenseItem.others || 0, color: 'text-pink-700' },
      { category: 'CR Balance / Cash Carryover', amount: expenseItem.crBalance || 0, color: 'text-cyan-700 font-bold' },
    ];
  }, [expenseItem]);

  const expenseTotal = useMemo(() => {
    if (!expenseItem) return 0;
    return (
      (expenseItem.kharchi || 0) +
      (expenseItem.mess || 0) +
      (expenseItem.workerAdvance || 0) +
      (expenseItem.tiffin || 0) +
      (expenseItem.travel || 0) +
      (expenseItem.machineryMaterial || 0) +
      (expenseItem.workerPayment || 0) +
      (expenseItem.stationery || 0) +
      (expenseItem.others || 0) +
      (expenseItem.crBalance || 0)
    );
  }, [expenseItem]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.98 }}
        className="sap-panel relative z-10 w-full max-w-6xl max-h-[90vh] flex flex-col bg-white rounded shadow-2xl border-t-4 border-t-[#0056b3] overflow-hidden text-[11px]"
      >
        {/* Header toolbar */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-[var(--color-sap-blue-val)] font-black text-sm flex items-center space-x-2">
              <FileText size={16} className="text-[#0056b3]" />
              <span>
                {type === 'paymentSheet' && 'Worker Monthly Payment Sheet Detail View'}
                {type === 'kharchiSheet' && 'Kharchi Sheet Detail View'}
                {type === 'advanceSheet' && 'Advance Sheet Detail View'}
                {type === 'expenseSheet' && 'Expense Record Breakdown View'}
              </span>
            </h2>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center space-x-2">
              <span className="font-bold text-[var(--color-sap-blue-val)]">{projectName}</span>
              {month && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-600 bg-slate-100 rounded px-1.5 py-0.2 font-bold select-none text-[9px]">
                    Period: {getFormatMonth(month)}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 hover:bg-gray-100 p-1.5 rounded transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Outer content container - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
          {/* Quick Metrics Header Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-slate-200 bg-blue-50/20 p-2.5 rounded-sm flex items-center justify-between">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Total Row Entries</p>
                <p className="text-lg font-black text-[var(--color-sap-blue-val)]">
                  {type === 'paymentSheet' && sheetPayments.length}
                  {type === 'kharchiSheet' && sheetKharchis.length}
                  {type === 'advanceSheet' && sheetAdvances.length}
                  {type === 'expenseSheet' && 'Breakdown Summary'}
                </p>
              </div>
              <Users size={20} className="text-[#0056b3] opacity-40" />
            </div>

            <div className="border border-slate-200 bg-green-50/20 p-2.5 rounded-sm flex items-center justify-between">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Target Total Valuation</p>
                <p className="text-lg font-black text-green-700">
                  ₹
                  {type === 'paymentSheet' && paymentTotals.gross.toLocaleString('en-IN')}
                  {type === 'kharchiSheet' && kharchiTotal.toLocaleString('en-IN')}
                  {type === 'advanceSheet' && advanceTotal.toLocaleString('en-IN')}
                  {type === 'expenseSheet' && expenseTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <Calculator size={20} className="text-green-700 opacity-40" />
            </div>

            <div className="border border-slate-200 bg-amber-50/20 p-2.5 rounded-sm flex items-center justify-between">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">
                  {type === 'paymentSheet' ? 'Net Paid Disbursement' : 'Integrity Checked'}
                </p>
                <p className="text-lg font-black text-amber-800">
                  {type === 'paymentSheet' ? `₹${paymentTotals.net.toLocaleString('en-IN')}` : 'Verified Ledger'}
                </p>
              </div>
              <ShieldCheck size={20} className="text-amber-805 opacity-40" />
            </div>
          </div>

          {/* Type-Specific Item Tables */}

          {/* 1. PAYMENT SHEET */}
          {type === 'paymentSheet' && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className="bg-[#eef2f6] border-b border-slate-200 px-3 py-1.5 flex justify-between items-center text-gray-800 font-sans font-bold">
                <span>Row Items ({sheetPayments.length})</span>
                <span className="text-[10px] text-gray-500">All prices in Indian Rupees (INR)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-gray-600 font-sans border-b border-slate-200">
                      <th className="px-2 py-1.5 font-bold w-12 text-center border-r border-slate-100">Sr</th>
                      <th className="px-2 py-1.5 font-bold w-16 border-r border-slate-100">ID No</th>
                      <th className="px-2 py-1.5 font-bold border-r border-slate-100">Worker</th>
                      <th className="px-2 py-1.5 font-bold border-r border-slate-100">Location</th>
                      <th className="px-2 py-1.5 font-bold text-right border-r border-slate-100">Gross Wages</th>
                      <th className="px-2 py-1.5 font-bold text-right border-r border-slate-100">Supply Amt</th>
                      <th className="px-2 py-1.5 font-bold text-right border-r border-slate-100 text-red-650">Mess Ded</th>
                      <th className="px-2 py-1.5 font-bold text-right border-r border-slate-100 text-red-650">Kharchi Ded</th>
                      <th className="px-2 py-1.5 font-bold text-right border-r border-slate-100 text-red-650">Adv Ded</th>
                      <th className="px-2 py-1.5 font-bold text-right border-r border-slate-100 text-amber-700">Recovery</th>
                      <th className="px-2 py-1.5 font-bold text-right border-r border-slate-100 text-red-700">Other Ded</th>
                      <th className="px-2 py-1.5 font-bold text-right text-green-700">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPayments.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-3 py-6 text-center text-gray-400 font-sans italic">
                          No matching payment details found for this sheet period.
                        </td>
                      </tr>
                    ) : (
                      sheetPayments.map((p, idx) => {
                        const winfo = getWorkerInfo(p.workerId);
                        return (
                          <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-2 py-1.5 text-center text-gray-500 border-r border-slate-100">{winfo.srNo || idx + 1}</td>
                            <td className="px-2 py-1.5 text-gray-500 font-bold border-r border-slate-100">{winfo.idNo}</td>
                            <td className="px-2 py-1.5 font-sans font-bold text-slate-800 border-r border-slate-100">
                              <div>{winfo.name}</div>
                              <span className="text-[9px] text-gray-400 font-normal">{winfo.design}</span>
                            </td>
                            <td className="px-2 py-1.5 font-sans text-gray-600 border-r border-slate-100">{p.level || <span className="text-slate-300 italic">None</span>}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-100 font-bold text-[var(--color-sap-blue-val)]">₹{(p.workAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-100 text-emerald-800 bg-emerald-50/10">₹{Number(p.supplyAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-100 text-red-600">₹{(p.messDeduction || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-100 text-red-600">₹{(p.kharchiDeduction || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-100 text-red-600">₹{(p.advanceDeduction || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-100 text-amber-700 bg-amber-50/10">₹{(p.recoveryAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-100 text-red-700 bg-red-50/10">₹{(p.otherDeduction || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right font-black text-green-700 bg-green-50/20">₹{(p.netPayment || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })
                    )}
                    {/* Sum Totals row */}
                    {sheetPayments.length > 0 && (
                      <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-gray-900">
                        <td colSpan={4} className="px-2 py-2 text-right uppercase text-[9px] font-sans">
                          Aggregate Sheet Totals:
                        </td>
                        <td className="px-2 py-2 text-right border-r border-slate-200">
                          ₹{paymentTotals.gross.toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-right border-r border-slate-200">
                          ₹{paymentTotals.supply.toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-right border-r border-slate-200 text-red-650">
                          ₹{paymentTotals.mess.toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-right border-r border-slate-200 text-red-650">
                          ₹{paymentTotals.kharchi.toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-right border-r border-slate-200 text-red-650">
                          ₹{paymentTotals.advance.toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-right border-r border-slate-200 text-amber-705">
                          ₹{paymentTotals.recovery.toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-right border-r border-slate-200 text-red-700">
                          ₹{paymentTotals.other.toLocaleString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-right text-green-800 bg-green-100 border-l border-green-300">
                          ₹{paymentTotals.net.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. KHARCHI SHEET */}
          {type === 'kharchiSheet' && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className="bg-[#eef2f6] border-b border-slate-200 px-3 py-1.5 flex justify-between items-center text-gray-800 font-sans font-bold">
                <span>Kharchi Disbursement Records ({sheetKharchis.length})</span>
                <span className="text-[10px] text-gray-500">Period: {getFormatMonth(month)}</span>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-gray-600 font-sans border-b border-slate-200">
                    <th className="px-3 py-2 font-bold w-16 text-center border-r border-slate-100">#</th>
                    <th className="px-3 py-2 font-bold w-24 border-r border-slate-100">ID No</th>
                    <th className="px-3 py-2 font-bold border-r border-slate-100">Worker Name</th>
                    <th className="px-3 py-2 font-bold border-r border-slate-100">Date Paid</th>
                    <th className="px-3 py-2 font-bold text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetKharchis.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-400 font-sans italic">
                        No matching kharchi records logged for this project and month.
                      </td>
                    </tr>
                  ) : (
                    sheetKharchis.map((k, idx) => {
                      const winfo = getWorkerInfo(k.workerId);
                      return (
                        <tr key={k.id} className="border-b border-slate-250 hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center text-gray-500 border-r border-slate-100">{idx + 1}</td>
                          <td className="px-3 py-1.5 text-gray-500 font-bold border-r border-slate-100">{winfo.idNo}</td>
                          <td className="px-3 py-1.5 font-sans font-bold text-slate-800 border-r border-slate-100">
                            {winfo.name}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-100">{k.date.split('-').reverse().join('-')}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-[var(--color-sap-blue-val)] bg-blue-50/10">
                            ₹{(k.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {sheetKharchis.length > 0 && (
                    <tr className="bg-slate-100 text-gray-900 border-t-2 border-slate-350 font-bold">
                      <td colSpan={4} className="px-3 py-2 text-right uppercase text-[9px] font-sans">
                        Cumulative Amount:
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--color-sap-blue-val)] bg-blue-50">
                        ₹{kharchiTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. ADVANCE SHEET */}
          {type === 'advanceSheet' && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className="bg-[#eef2f6] border-b border-slate-200 px-3 py-1.5 flex justify-between items-center text-gray-800 font-sans font-bold">
                <span>Advances Given Log ({sheetAdvances.length})</span>
                <span className="text-[10px] text-gray-500">Period: {getFormatMonth(month)}</span>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-gray-600 font-sans border-b border-slate-200">
                    <th className="px-3 py-2 font-bold w-12 text-center border-r border-slate-100">#</th>
                    <th className="px-3 py-2 font-bold w-20 border-r border-slate-100 font-sans">Worker ID</th>
                    <th className="px-3 py-2 font-bold border-r border-slate-100 font-sans">Name</th>
                    <th className="px-3 py-2 font-bold border-r border-slate-100 font-sans">Paid By / Mode</th>
                    <th className="px-3 py-2 font-bold border-r border-slate-100">Date Paid</th>
                    <th className="px-3 py-2 font-bold border-r border-slate-100 font-sans">Deduction Info / Month</th>
                    <th className="px-3 py-2 font-bold border-r border-slate-100 font-sans">Internal Remarks</th>
                    <th className="px-3 py-2 font-bold text-right font-sans">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-gray-400 font-sans italic">
                        No worker advance logs registered for this month period.
                      </td>
                    </tr>
                  ) : (
                    sheetAdvances.map((a, idx) => {
                      const winfo = getWorkerInfo(a.workerId);
                      return (
                        <tr key={a.id} className="border-b border-slate-150 hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-gray-550 border-r border-slate-100">{idx + 1}</td>
                          <td className="px-3 py-2 text-gray-500 font-bold border-r border-slate-100">{winfo.idNo}</td>
                          <td className="px-3 py-2 font-sans font-semibold text-slate-800 border-r border-slate-100">{winfo.name}</td>
                          <td className="px-3 py-2 font-sans border-r border-slate-100">
                            {a.paidBy} {a.paidByDetails ? `(${a.paidByDetails})` : ''}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100">{a.date.split('-').reverse().join('-')}</td>
                          <td className="px-3 py-2 font-sans border-r border-slate-100">
                            {a.isDeducted ? (
                              <span className="text-amber-800 font-semibold text-[10px]">
                                Yes ({a.deductionMonth}, ₹{(a.deductionAmount || 0).toLocaleString('en-IN')})
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">No deduction scheduled</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-sans text-gray-650 border-r border-slate-100 leading-normal">
                            {a.remarks || '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-[var(--color-sap-blue-val)] bg-amber-50/5">
                            ₹{(a.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {sheetAdvances.length > 0 && (
                    <tr className="bg-slate-100 text-gray-900 border-t-2 border-slate-400 font-bold">
                      <td colSpan={7} className="px-3 py-2.5 text-right uppercase text-[9px] font-sans">
                        Cumulative Sheet advances:
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--color-sap-blue-val)] bg-amber-100/40">
                        ₹{advanceTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. EXPENSE RECORD GRID */}
          {type === 'expenseSheet' && (
            <div className="space-y-3">
              {!expenseItem ? (
                <div className="text-center p-8 text-gray-400 border rounded font-sans">
                  Target Expense detail cannot be loaded or record not found.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Ledger Breakdown Panel */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="border border-slate-250 bg-slate-50/50 p-3 rounded-sm leading-relaxed">
                      <h4 className="font-bold text-gray-800 border-b pb-1 mb-1.5 flex items-center space-x-1 font-sans">
                        <Calculator size={13} className="text-[#0056b3]" />
                        <span>Expense Narrative and Submission Meta</span>
                      </h4>
                      <p className="text-[var(--color-sap-blue-val)] font-black text-xs leading-normal">
                        Description: <span className="text-gray-800 font-medium font-sans">{expenseItem.description}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 font-sans text-[10px] text-gray-600">
                        <div className="border border-slate-150 p-1.5 rounded-sm bg-white">
                          <span className="font-bold text-gray-500">Transaction Date: </span>
                          <span className="font-mono text-gray-800">{expenseItem.date.split('-').reverse().join('-')}</span>
                        </div>
                        <div className="border border-slate-150 p-1.5 rounded-sm bg-white">
                          <span className="font-bold text-gray-500">Bank Source: </span>
                          <span className="font-mono text-gray-800 font-bold">{expenseItem.bank || 'Main Sandbox Cash'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded overflow-hidden">
                      <div className="bg-[#eef2f6] border-b px-3 py-1.5 font-bold font-sans flex justify-between text-gray-800">
                        <span>Allocated Cost Centers Category List</span>
                        <span>Aggregate Value</span>
                      </div>
                      <div className="divide-y divide-slate-150 bg-white">
                        {expenseBreakdown.map((item, idx) => (
                          <div key={idx} className="px-3 py-2 flex justify-between items-center hover:bg-slate-50">
                            <span className="font-sans text-gray-700 font-medium">{item.category}</span>
                            <span className={`font-mono text-right font-bold ${item.color}`}>
                              ₹{item.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                        <div className="px-3 py-2.5 flex justify-between items-center bg-slate-100 font-extrabold border-t border-slate-300">
                          <span className="font-sans text-[var(--color-sap-blue-val)] uppercase text-[9px]">Sum Total Ledger Amount:</span>
                          <span className="font-mono text-lg text-green-800 font-black">
                            ₹{expenseTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attachment Preview Panel */}
                  <div className="lg:col-span-5 border border-slate-200 rounded p-3 flex flex-col justify-between space-y-4 bg-slate-50">
                    <div>
                      <h4 className="font-bold text-gray-800 border-b pb-1 mb-2 flex items-center space-x-1 font-sans">
                        <AlertCircle size={13} className="text-[#0056b3]" />
                        <span>Supporting Receipt/Bills Attachment</span>
                      </h4>
                      {expenseItem.receiptProof ? (
                        <div className="bg-white border rounded p-1 flex items-center justify-center max-h-[300px] overflow-hidden shadow-inner relative group select-none">
                          <img
                            src={expenseItem.receiptProof}
                            alt="Uploaded invoice support proof"
                            className="max-w-full max-h-[290px] object-contain rounded-sm"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 hidden group-hover:flex flex-col items-center justify-center p-3 text-white transition text-center">
                            <Eye size={20} className="mb-1" />
                            <p className="font-sans font-bold text-[10px]">Reference Copy</p>
                            <p className="font-mono text-[9px] text-gray-300 break-all">{expenseItem.receiptFileName || 'bill_photo_support.jpg'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="min-h-[160px] flex flex-col items-center justify-center bg-gray-100 border border-dashed rounded text-center p-4">
                          <AlertCircle size={32} className="text-gray-400 mb-2" />
                          <p className="font-bold text-gray-600 font-sans mb-1 text-[11px]">No PDF/Image Copied</p>
                          <p className="text-[9px] text-gray-400 font-sans max-w-[220px]">
                            MD or site architect didn't attach any digital receipt photo when submitting this ledger row.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border border-yellow-200 bg-yellow-50 p-2.5 rounded text-yellow-850 font-sans text-[10px] leading-relaxed">
                      <p className="font-black mb-1 flex items-center space-x-1 text-gray-700">
                        <FileCheck size={11} className="text-amber-700" />
                        <span>Internal Audit Advice:</span>
                      </p>
                      Match categories listed in the Cost Centers with any visible item values on the invoice file support. If they differ, the MD should reject and state correction parameters.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-250 px-4 py-3 bg-gray-50 flex justify-between items-center shrink-0">
          <div>
            {type === 'paymentSheet' && (
              <PDFExportButton
                title={`Worker Payment Sheet - ${projectName}`}
                subtitle={`Monthly Disbursement Cycle: ${getFormatMonth(month)}`}
                tcode="WKR-PAY-01"
                projectName={projectName}
                financialYear={month ? `FY ${month.substring(0, 4)}` : undefined}
                headers={[
                  { header: 'Sr', type: 'number' },
                  { header: 'ID', type: 'code' },
                  { header: 'Worker Name', type: 'text' },
                  { header: 'Designation', type: 'text' },
                  { header: 'Gross Wage', type: 'currency' },
                  { header: 'Supply Amt', type: 'currency' },
                  { header: 'Mess Ded', type: 'currency' },
                  { header: 'Kharchi', type: 'currency' },
                  { header: 'Advance', type: 'currency' },
                  { header: 'Recovery', type: 'currency' },
                  { header: 'Net Payable', type: 'currency' }
                ]}
                data={sheetPayments.map(p => {
                  const w = getWorkerInfo(p.workerId);
                  return [
                    w.srNo,
                    w.idNo,
                    w.name,
                    w.design,
                    p.workAmount || 0,
                    p.supplyAmount ? Number(p.supplyAmount) || 0 : 0,
                    p.messDeduction || 0,
                    p.kharchiDeduction || 0,
                    p.advanceDeduction || 0,
                    p.recoveryAmount || 0,
                    p.netPayment || 0
                  ];
                })}
                totals={[
                  'TOTALS', '', '', '',
                  paymentTotals.gross,
                  paymentTotals.supply,
                  paymentTotals.mess,
                  paymentTotals.kharchi,
                  paymentTotals.advance,
                  paymentTotals.recovery,
                  paymentTotals.net
                ]}
                buttonLabel="Export / Print Sheet"
                variant="primary"
                showDropdown
              />
            )}
            {type === 'kharchiSheet' && (
              <PDFExportButton
                title={`Kharchi Disbursement Sheet - ${projectName}`}
                subtitle={`Month: ${getFormatMonth(month)}`}
                tcode="WKR-KHC-01"
                projectName={projectName}
                headers={[
                  { header: 'Sr No', type: 'number' },
                  { header: 'Worker ID', type: 'code' },
                  { header: 'Worker Name', type: 'text' },
                  { header: 'Date', type: 'date' },
                  { header: 'Kharchi Amount (INR)', type: 'currency' },
                  { header: 'Reason / Remarks', type: 'text' }
                ]}
                data={sheetKharchis.map((k, idx) => {
                  const w = getWorkerInfo(k.workerId);
                  return [
                    idx + 1,
                    w.idNo,
                    w.name,
                    k.date,
                    k.amount || 0,
                    'Daily pocket allowance'
                  ];
                })}
                totals={['TOTALS', '', '', '', kharchiTotal, '']}
                buttonLabel="Export Kharchi Sheet"
                variant="primary"
                showDropdown
              />
            )}
            {type === 'advanceSheet' && (
              <PDFExportButton
                title={`Worker Advance Ledger Sheet - ${projectName}`}
                subtitle={`Month: ${getFormatMonth(month)}`}
                tcode="WKR-ADV-01"
                projectName={projectName}
                headers={[
                  { header: 'Sr No', type: 'number' },
                  { header: 'Worker ID', type: 'code' },
                  { header: 'Worker Name', type: 'text' },
                  { header: 'Date Disbursed', type: 'date' },
                  { header: 'Advance Amount (INR)', type: 'currency' },
                  { header: 'Reason / Notes', type: 'text' }
                ]}
                data={sheetAdvances.map((a, idx) => {
                  const w = getWorkerInfo(a.workerId);
                  return [
                    idx + 1,
                    w.idNo,
                    w.name,
                    a.date,
                    a.amount || 0,
                    a.remarks || 'Personal loan/advance'
                  ];
                })}
                totals={['TOTALS', '', '', '', advanceTotal, '']}
                buttonLabel="Export Advance Sheet"
                variant="primary"
                showDropdown
              />
            )}
            {type === 'expenseSheet' && expenseItem && (
              <PDFExportButton
                title={`Site Expense Voucher Breakdown - ${projectName}`}
                subtitle={`Voucher Date: ${expenseItem.date} | Cost Code: ${expenseItem.id}`}
                tcode="EXP-VCH-01"
                projectName={projectName}
                headers={[
                  { header: 'Cost Category / Expense Head', type: 'text' },
                  { header: 'Disbursed Amount (INR)', type: 'currency' }
                ]}
                data={expenseBreakdown.map(b => [b.category, b.amount])}
                totals={['TOTAL VOUCHER OUTLAY', expenseTotal]}
                buttonLabel="Export Expense Voucher"
                variant="primary"
                showDropdown
              />
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sap-btn bg-[var(--color-sap-blue-val)] text-white hover:bg-[#001d44] px-4 font-bold rounded flex items-center space-x-1 cursor-pointer transition font-sans text-xs h-8"
          >
            <span>Close Workspace Screen</span>
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
