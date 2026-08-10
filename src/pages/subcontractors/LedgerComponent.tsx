import React, { useState, useEffect } from 'react';
import { SAPSelect } from '../../components/SAPSelect';
import { Printer, Building, Users, Building2, Calendar } from 'lucide-react';
import { Project, Subcontractor, SubcontractorLedger } from '../../types';

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
  setLoading
}) => {
  const [ledgerData, setLedgerData] = useState<SubcontractorLedger | null>(null);
  const [ledgerFilters, setLedgerFilters] = useState({
    projectId: 'all',
    startDate: '',
    endDate: ''
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
        throw new Error(data.error || "Failed to compile book ledger.");
      }
      setLedgerData(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Ledger compilation error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoadLedger();
  }, [selectedSubcontractorId, ledgerFilters]);

  const handlePrintLedger = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;
    
    const subName = ledgerData?.subcontractor?.name || '';
    const subFirm = ledgerData?.subcontractor?.firmName || 'N/A';
    const subId = ledgerData?.subcontractor?.id || '';

    printWindow.document.write('<html><head><title>Subcontractor Ledger - ' + subName + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: monospace; font-size: 10px; margin: 20px; line-height: 1.3; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 15px; }');
    printWindow.document.write('th, td { border: 1px solid #777; padding: 4px; text-align: left; }');
    printWindow.document.write('th { background-color: #eee; }');
    printWindow.document.write('.text-right { text-align: right; }');
    printWindow.document.write('.header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }');
    printWindow.document.write('.summary { width: 300px; margin-left: auto; border: 1px solid #000; padding: 5px; margin-top: 15px; }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<h2>SN ENTERPRISES CONSTRUCTION ERP - SUBCONTRACTOR LEDGER</h2>');
    printWindow.document.write('<p><strong>Subcontractor ID:</strong> ' + subId + ' | <strong>Name:</strong> ' + subName + ' (' + subFirm + ')</p>');
    printWindow.document.write('<p><strong>Report Date:</strong> ' + new Date().toLocaleString() + '</p>');
    printWindow.document.write('</div>');

    printWindow.document.write('<table><thead><tr>');
    printWindow.document.write('<th>Date</th><th>Ref No</th><th>Project</th><th>Particulars</th><th class="text-right">Debit (Dr)</th><th class="text-right">Credit (Cr)</th><th class="text-right">Balance</th>');
    printWindow.document.write('</tr></thead><tbody>');

    ledgerData?.ledger?.forEach(l => {
      printWindow.document.write('<tr>');
      printWindow.document.write('<td>' + l.date + '</td>');
      printWindow.document.write('<td>' + l.referenceNo + '</td>');
      printWindow.document.write('<td>' + l.projectName + '</td>');
      printWindow.document.write('<td>' + l.particulars + '</td>');
      printWindow.document.write('<td class="text-right">' + (l.debit > 0 ? l.debit.toLocaleString() : '-') + '</td>');
      printWindow.document.write('<td class="text-right">' + (l.credit > 0 ? l.credit.toLocaleString() : '-') + '</td>');
      printWindow.document.write('<td class="text-right">' + l.balance.toLocaleString() + '</td>');
      printWindow.document.write('</tr>');
    });

    printWindow.document.write('</tbody></table>');

    printWindow.document.write('<div class="summary">');
    printWindow.document.write('<strong>Reconciliation Summary</strong><hr/>');
    printWindow.document.write('<div>Total Gross Bills: ₹' + ledgerData?.summary?.totalBills.toLocaleString() + '</div>');
    printWindow.document.write('<div>Total GST Accrual: ₹' + ledgerData?.summary?.totalGst.toLocaleString() + '</div>');
    printWindow.document.write('<div>Total Taxes (TDS): ₹' + ledgerData?.summary?.totalTds.toLocaleString() + '</div>');
    printWindow.document.write('<div>Total Retention Deducted: ₹' + ledgerData?.summary?.totalRetention.toLocaleString() + '</div>');
    printWindow.document.write('<div>Total Recovery Deducted: ₹' + ledgerData?.summary?.totalRecovery.toLocaleString() + '</div>');
    printWindow.document.write('<div>Total Payments Released: ₹' + ledgerData?.summary?.totalPayments.toLocaleString() + '</div>');
    printWindow.document.write('<hr/><strong>Outstanding Owed: ₹' + ledgerData?.summary?.outstandingBalance.toLocaleString() + '</strong>');
    printWindow.document.write('</div>');

    printWindow.document.write('<script>window.print(); window.close();</script>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
  };

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
            onChange={(e) => {
              setSelectedSubcontractorId(e.target.value);
              setErrorMessage(null);
            }}
            className="border border-gray-300 rounded font-semibold p-1 text-[10px] bg-white outline-none focus:border-amber-500"
          >
            <option value="">-- Choose master cred partner --</option>
            {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.firmName || 'Personal'})</option>)}
          </SAPSelect>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-gray-500 font-bold uppercase flex items-center gap-1">
            <Building2 size={12} className="text-amber-500" />
            <span>Site Filter</span>
          </span>
          <SAPSelect 
            value={ledgerFilters.projectId}
            onChange={(e) => setLedgerFilters(prev => ({ ...prev, projectId: e.target.value }))}
            className="border border-gray-300 rounded p-1 text-[10px] bg-white outline-none focus:border-amber-500"
          >
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              onChange={(e) => setLedgerFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="border border-gray-300 rounded font-mono p-0.5 text-[10px] outline-none focus:border-amber-500"
            />
            <span className="text-gray-400 font-bold">-</span>
            <input 
              type="date" 
              value={ledgerFilters.endDate}
              onChange={(e) => setLedgerFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="border border-gray-300 rounded font-mono p-0.5 text-[10px] outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex-1"></div>

        <button 
          onClick={handlePrintLedger}
          disabled={!selectedSubcontractorId || !ledgerData}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-350 text-gray-850 font-bold px-3 py-1.5 rounded flex items-center space-x-1 text-xs transition disabled:opacity-50 hover:scale-105 shadow-sm"
        >
          <Printer size={12} />
          <span>Print Ledger Book</span>
        </button>
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
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">{ledgerData.subcontractor?.name} Ledger</h3>
                <p className="text-[9px] text-gray-500 font-bold">Firm: {ledgerData.subcontractor?.firmName || 'Personal'} | Category: {ledgerData.subcontractor?.workCategory || 'Civil Work'}</p>
              </div>
              <span className="bg-[#1e293b] text-amber-400 px-3 py-1 text-xs font-mono font-bold border rounded border-gray-800">
                Ledger Out Balance: ₹{ledgerData.summary?.outstandingBalance.toLocaleString()}
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
                    <th className="p-2 text-right">Debit (Dr Deduction)</th>
                    <th className="p-2 text-right">Credit (Cr Certified)</th>
                    <th className="p-2 text-right">Running Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono">
                  {!ledgerData.ledger || ledgerData.ledger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400">No approved bills or payment records registered in date ranges.</td>
                    </tr>
                  ) : (
                    ledgerData.ledger.map((line, idx) => {
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="p-2 text-gray-500 text-center font-bold">{line.date}</td>
                          <td className="p-2 font-bold text-[var(--color-sap-blue-val)]">{line.referenceNo}</td>
                          <td className="p-2 font-medium text-gray-800">{line.particulars}</td>
                          <td className="p-2 text-gray-400 text-[9px] font-bold">{line.projectName}</td>
                          <td className="p-2 text-right text-rose-600 font-bold">
                            {line.debit > 0 ? `₹${line.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2 text-right text-emerald-600 font-bold">
                            {line.credit > 0 ? `₹${line.credit.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2 text-right text-gray-900 font-extrabold font-mono">
                            ₹{line.balance.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Summary panel */}
          <div className="space-y-3">
            <div className="bg-white border border-[#8c9ba8] p-4 rounded shadow-sm text-[10px]">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b pb-1.5 mb-2.5 flex items-center space-x-1">
                <Building size={12} className="text-amber-500" />
                <span>Ledger Balances Summary</span>
              </h3>
              
              <div className="space-y-2 font-sans">
                <div className="flex justify-between border-b pb-1 text-gray-700">
                  <span>1. Gross Certified Work:</span>
                  <strong className="font-mono text-gray-950">₹{ledgerData.summary?.totalBills.toLocaleString()}</strong>
                </div>

                <div className="flex justify-between border-b pb-1 text-gray-700">
                  <span>2. Associated GST Accrual:</span>
                  <strong className="font-mono text-gray-950">₹{ledgerData.summary?.totalGst.toLocaleString()}</strong>
                </div>

                <div className="flex justify-between border-b pb-1 text-orange-950">
                  <span>3. Retention Reserves Held:</span>
                  <strong className="font-mono text-orange-650">-₹{ledgerData.summary?.totalRetention.toLocaleString()}</strong>
                </div>

                <div className="flex justify-between border-b pb-1 text-emerald-950">
                  <span>4. TDS Compliances Held:</span>
                  <strong className="font-mono text-emerald-600">-₹{ledgerData.summary?.totalTds.toLocaleString()}</strong>
                </div>

                <div className="flex justify-between border-b pb-1 text-pink-950 font-bold">
                  <span>5. Backcharges / Recovery:</span>
                  <strong className="font-mono text-pink-700">-₹{ledgerData.summary?.totalRecovery.toLocaleString()}</strong>
                </div>

                <div className="flex justify-between border-b pb-1 text-blue-950">
                  <span>6. Direct Liquid Payouts:</span>
                  <strong className="font-mono text-blue-700">-₹{ledgerData.summary?.totalPayments.toLocaleString()}</strong>
                </div>

                <div className="bg-[#1e293b] text-amber-400 p-2 border border-[#334155] rounded text-center">
                  <span className="text-[8px] uppercase font-bold">creditor ledger outstanding liability</span>
                  <div className="text-sm font-extrabold font-mono mt-1">₹{ledgerData.summary?.outstandingBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Static compliance card */}
            <div className="bg-white border border-[#8c9ba8] p-3 rounded shadow-sm text-[9px] space-y-1.5">
              <h4 className="font-bold text-gray-700 uppercase border-b pb-1">Master Compliance & Bank details</h4>
              <div><strong>Entity Name:</strong> {ledgerData.subcontractor?.name}</div>
              <div><strong>Firm Name:</strong> {ledgerData.subcontractor?.firmName || 'Personal'}</div>
              <div><strong>Bank Name:</strong> {ledgerData.subcontractor?.bankName || 'N/A'}</div>
              <div><strong>Bank Account ID:</strong> {ledgerData.subcontractor?.accountNumber || 'N/A'}</div>
              <div><strong>Bank IFSC Code:</strong> {ledgerData.subcontractor?.ifscCode || 'N/A'}</div>
              <div><strong>Branch Location:</strong> {ledgerData.subcontractor?.branch || 'N/A'}</div>
              <div><strong>Compliance PAN:</strong> {ledgerData.subcontractor?.panNumber || 'N/A'}</div>
              <div><strong>Compliance GSTIN:</strong> {ledgerData.subcontractor?.gstin || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
