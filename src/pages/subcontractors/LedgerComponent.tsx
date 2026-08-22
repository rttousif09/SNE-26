import React, { useState, useEffect } from 'react';
import { SAPSelect } from '../../components/SAPSelect';
import { Building2, Calendar, Users } from 'lucide-react';
import { Project, Subcontractor, SubcontractorLedger } from '../../types';
import { PDFExportButton } from '../../components/PDFExportButton';

interface LedgerComponentProps {
  user: any;
  projects: Project[];
  subcontractors: Subcontractor[];
  selectedSubcontractorId: string;
  setSelectedSubcontractorId: (id: string) => void;
  setErrorMessage: (msg: string | null) => void;
  setLoading: (l: boolean) => void;
}

export const LedgerComponent: React.FC<LedgerComponentProps> = ({
  user,
  projects,
  subcontractors,
  selectedSubcontractorId,
  setSelectedSubcontractorId,
  setErrorMessage,
  setLoading,
}) => {
  const [ledgerData, setLedgerData] = useState<SubcontractorLedger | null>(null);
  const [ledgerFilters, setLedgerFilters] = useState({
    projectId: 'all',
    startDate: '',
    endDate: '',
  });

  const handleLoadLedger = async () => {
    if (!selectedSubcontractorId) {
      setLedgerData(null);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    const { projectId, startDate, endDate } = ledgerFilters;
    try {
      let url = `/api/subcontractors/${selectedSubcontractorId}/ledger?projectId=${projectId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to compile book ledger.');
      }
      setLedgerData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ledger compilation error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoadLedger();
  }, [selectedSubcontractorId, ledgerFilters]);

  const activeSubcontractor = subcontractors.find(s => s.id === selectedSubcontractorId);
  const activeProjectObj = projects.find(p => p.id === ledgerFilters.projectId);

  // Prepare export structures
  const exportHeaders = [
    { header: 'Date', type: 'date' as const },
    { header: 'Reference Voucher', type: 'code' as const },
    { header: 'Particulars & Description', type: 'text' as const },
    { header: 'Project Site', type: 'text' as const },
    { header: 'Debit / Payments (INR)', type: 'currency' as const },
    { header: 'Credit / Certified (INR)', type: 'currency' as const },
    { header: 'Running Balance (INR)', type: 'currency' as const },
  ];

  const exportData = (ledgerData?.ledger || []).map(entry => [
    entry.date,
    entry.referenceNo || 'VOUCHER',
    entry.particulars,
    entry.projectName,
    entry.debit,
    entry.credit,
    entry.balance,
  ]);

  const totalDebit = (ledgerData?.ledger || []).reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = (ledgerData?.ledger || []).reduce((s, e) => s + (e.credit || 0), 0);

  const exportTotals = [
    'CUMULATIVE TOTALS',
    '',
    '',
    '',
    totalDebit,
    totalCredit,
    ledgerData?.summary?.outstandingBalance || (totalCredit - totalDebit),
  ];

  const summaryBlocks = ledgerData?.summary ? [
    { title: 'Total Certified Bills', value: ledgerData.summary.totalBills, isCurrency: true, color: 'blue' as const },
    { title: 'Total Payments Paid', value: ledgerData.summary.totalPayments, isCurrency: true, color: 'green' as const },
    { title: 'Total Retention Held', value: ledgerData.summary.totalRetention, isCurrency: true, color: 'orange' as const },
    { title: 'Total TDS Deducted', value: ledgerData.summary.totalTds, isCurrency: true, color: 'red' as const },
    { title: 'Outstanding Balance', value: ledgerData.summary.outstandingBalance, isCurrency: true, color: 'purple' as const },
  ] : undefined;

  return (
    <div className="space-y-4">
      {/* Selection & Filters row */}
      <div className="bg-white p-3 border rounded shadow-sm flex flex-wrap gap-3 items-center text-[10px]">
        <div className="flex items-center space-x-1.5">
          <span className="text-gray-500 font-bold uppercase flex items-center gap-1">
            <Users size={12} className="text-amber-500" />
            <span>Subcontractor Master *</span>
          </span>
          <SAPSelect
            value={selectedSubcontractorId}
            onChange={e => {
              setSelectedSubcontractorId(e.target.value);
              setErrorMessage(null);
            }}
            className="border border-gray-300 rounded font-semibold p-1 text-[10px] bg-white outline-none focus:border-amber-500"
          >
            <option value="">-- Choose master cred partner --</option>
            {subcontractors.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.firmName || 'Personal'})
              </option>
            ))}
          </SAPSelect>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-gray-500 font-bold uppercase flex items-center gap-1">
            <Building2 size={12} className="text-amber-500" />
            <span>Site Filter</span>
          </span>
          <SAPSelect
            value={ledgerFilters.projectId}
            onChange={e => setLedgerFilters(prev => ({ ...prev, projectId: e.target.value }))}
            className="border border-gray-300 rounded p-1 text-[10px] bg-white outline-none focus:border-amber-500"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SAPSelect>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-gray-500 font-bold uppercase flex items-center gap-1">
            <Calendar size={12} className="text-amber-500" />
            <span>Date Boundaries</span>
          </span>
          <div className="inline-flex space-x-1 items-center">
            <input
              type="date"
              value={ledgerFilters.startDate}
              onChange={e => setLedgerFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="border border-gray-300 rounded font-mono p-0.5 text-[10px] outline-none focus:border-amber-500"
            />
            <span className="text-gray-400 font-bold">-</span>
            <input
              type="date"
              value={ledgerFilters.endDate}
              onChange={e => setLedgerFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="border border-gray-300 rounded font-mono p-0.5 text-[10px] outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex-1" />

        {selectedSubcontractorId && ledgerData && (
          <PDFExportButton
            title={`Subcontractor Ledger - ${activeSubcontractor?.name || 'Statement'}`}
            subtitle={`Firm: ${activeSubcontractor?.firmName || 'N/A'} | Trade: ${activeSubcontractor?.workCategory || 'General Civil'}`}
            tcode="SUB-LDG-01"
            projectName={activeProjectObj?.name || 'All Sites'}
            dateRange={ledgerFilters.startDate && ledgerFilters.endDate ? `${ledgerFilters.startDate} to ${ledgerFilters.endDate}` : undefined}
            headers={exportHeaders}
            data={exportData}
            totals={exportTotals}
            summaryBlocks={summaryBlocks}
            buttonLabel="Export Ledger Book"
            variant="primary"
            showDropdown
          />
        )}
      </div>

      {/* Complete double-entry reconciliation sheet */}
      {!selectedSubcontractorId || !ledgerData ? (
        <div className="bg-white border p-8 rounded shadow-sm text-center text-gray-400 font-semibold">
          Please select a subcontractor master above to load their double-entry reconciliation ledger book.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start text-[10px]">
          {/* Ledger details table */}
          <div className="bg-white border rounded shadow-sm p-4 lg:col-span-3 space-y-3">
            <div className="border-b pb-2 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                  {ledgerData.subcontractor?.name} Ledger
                </h3>
                <p className="text-[9px] text-gray-500 font-bold">
                  Firm: {ledgerData.subcontractor?.firmName || 'Personal'} | Category:{' '}
                  {ledgerData.subcontractor?.workCategory || 'Civil Work'}
                </p>
              </div>
              <span className="bg-[#1e293b] text-amber-400 px-3 py-1 text-xs font-mono font-bold border rounded border-gray-800">
                Ledger Out Balance: ₹{ledgerData.summary?.outstandingBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto text-[10px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f3f4f6] text-gray-600 uppercase font-bold border-b border-gray-300">
                    <th className="p-2 text-center">Date</th>
                    <th className="p-2">Reference</th>
                    <th className="p-2">Particulars Segment</th>
                    <th className="p-2">Project</th>
                    <th className="p-2 text-right">Debit (Dr Paid)</th>
                    <th className="p-2 text-right">Credit (Cr Certified)</th>
                    <th className="p-2 text-right">Running Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ledgerData.ledger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-400 italic">
                        No financial events recorded within selected parameters.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.ledger.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/40 transition">
                        <td className="p-2 font-mono text-center text-gray-500">{entry.date}</td>
                        <td className="p-2 font-mono font-bold text-blue-600">
                          {entry.referenceNo || 'VOUCHER'}
                        </td>
                        <td className="p-2 text-gray-800">{entry.particulars}</td>
                        <td className="p-2 font-semibold text-gray-600">{entry.projectName}</td>
                        <td className="p-2 font-mono text-right text-emerald-600 font-bold">
                          {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2 font-mono text-right text-blue-600 font-bold">
                          {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td
                          className={`p-2 font-mono text-right font-black ${
                            entry.balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{entry.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h4 className="font-bold text-gray-800 border-b pb-1 text-xs">Financial Summary</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Gross Work Certified:</span>
                <span className="font-bold text-blue-600">
                  ₹{ledgerData.summary.totalBills.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payments Disbursed:</span>
                <span className="font-bold text-emerald-600">
                  ₹{ledgerData.summary.totalPayments.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Retention Retained:</span>
                <span className="font-bold text-amber-600">
                  ₹{ledgerData.summary.totalRetention.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TDS Withheld:</span>
                <span className="font-bold text-rose-600">
                  ₹{ledgerData.summary.totalTds.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-sm">
                <span>Net Outstanding:</span>
                <span className="text-amber-600">
                  ₹{ledgerData.summary.outstandingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
