import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, CreditCard, Users, Building2, Calendar, Banknote } from 'lucide-react';
import { Project, Subcontractor, SubcontractorPayment } from '../../types';

interface PaymentsComponentProps {
  user: any;
  projects: Project[];
  subcontractors: Subcontractor[];
  payments: SubcontractorPayment[];
  selectedSubcontractorId: string;
  setSelectedSubcontractorId: (id: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  loadAllData: () => Promise<void>;
  setErrorMessage: (msg: string | null) => void;
  setLoading: (l: boolean) => void;
}

export const PaymentsComponent: React.FC<PaymentsComponentProps> = ({
  user,
  projects,
  subcontractors,
  payments,
  selectedSubcontractorId,
  setSelectedSubcontractorId,
  selectedProjectId,
  setSelectedProjectId,
  loadAllData,
  setErrorMessage,
  setLoading
}) => {
  const [paymentsGrid, setPaymentsGrid] = useState<Array<{
    id?: string;
    date: string;
    amount: string;
    paymentMode: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other';
    remarks: string;
    delete?: boolean;
    isNew?: boolean;
  }>>([]);

  const handleLoadPaymentsGrid = () => {
    if (!selectedSubcontractorId || !selectedProjectId) {
      setPaymentsGrid([]);
      return;
    }
    const filtered = payments
      .filter(p => p.subcontractorId === selectedSubcontractorId && p.projectId === selectedProjectId)
      .map(p => ({
        id: p.id,
        date: p.date,
        amount: p.amount.toString(),
        paymentMode: p.paymentMode as any,
        remarks: p.remarks || ''
      }));

    setPaymentsGrid(filtered);
  };

  useEffect(() => {
    handleLoadPaymentsGrid();
  }, [selectedSubcontractorId, selectedProjectId, payments]);

  const handleAddPaymentRow = () => {
    setPaymentsGrid(prev => [
      ...prev,
      {
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMode: 'Bank Transfer',
        remarks: '',
        isNew: true
      }
    ]);
  };

  const handleGridCellChange = (index: number, field: string, value: any) => {
    setPaymentsGrid(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      return { ...row, [field]: value };
    }));
  };

  const handleToggleDeletePaymentRow = (index: number) => {
    setPaymentsGrid(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      if (row.isNew) {
         return null as any;
      }
      return { ...row, delete: !row.delete };
    }).filter(Boolean));
  };

  const handleSyncPayments = async () => {
    if (!selectedSubcontractorId || !selectedProjectId) {
      alert("Please select Subcontractor and Project first.");
      return;
    }

    setErrorMessage(null);
    const payloadPayments = paymentsGrid.map(row => {
      if (row.delete) {
        return { id: row.id, delete: true };
      }
      return {
        id: row.id || null,
        date: row.date,
        amount: parseFloat(row.amount) || 0,
        paymentMode: row.paymentMode,
        remarks: row.remarks
      };
    });

    const invalid = payloadPayments.some(p => !p.delete && (!p.date || !p.amount));
    if (invalid) {
      setErrorMessage("Payment rows must have valid dates and amounts to synchronize.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/subcontractor-payments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcontractorId: selectedSubcontractorId,
          projectId: selectedProjectId,
          payments: payloadPayments,
          username: user?.username || 'Admin'
        })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to synchronize payments.");
      }

      loadAllData();
      const event = new CustomEvent('show-success-toast', { detail: { message: "Payments grid successfully integrated." } });
      window.dispatchEvent(event);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to synchronize grid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-3 border rounded shadow-sm flex flex-wrap gap-3 items-center text-[10px]">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 font-bold uppercase flex items-center gap-1">
            <Users size={12} className="text-amber-500" />
            <span>1. Subcontractor Target *</span>
          </span>
          <select 
            value={selectedSubcontractorId}
            onChange={(e) => {
              setSelectedSubcontractorId(e.target.value);
              setErrorMessage(null);
            }}
            className="border border-gray-300 rounded font-semibold p-1 text-[10px] bg-white outline-none focus:border-amber-500"
          >
            <option value="">-- Choose Contractor partner --</option>
            {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.firmName || 'Personal'})</option>)}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-500 font-bold uppercase flex items-center gap-1">
            <Building2 size={12} className="text-amber-500" />
            <span>2. Assign Project *</span>
          </span>
          <select 
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setErrorMessage(null);
            }}
            className="border border-gray-300 rounded font-semibold p-1 text-[10px] bg-white outline-none focus:border-amber-500"
          >
            <option value="">-- Choose Site Location --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex-1"></div>

        <button 
          type="button"
          onClick={handleAddPaymentRow}
          disabled={!selectedSubcontractorId || !selectedProjectId}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded flex items-center space-x-1 transition disabled:opacity-50 text-xs shadow-sm hover:scale-105"
        >
          <Plus size={11} />
          <span>Insert Payment Row</span>
        </button>

        <button 
          type="button"
          onClick={handleSyncPayments}
          disabled={!selectedSubcontractorId || !selectedProjectId || paymentsGrid.length === 0}
          className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-4 py-1.5 rounded flex items-center space-x-1 transition disabled:opacity-50 text-xs shadow-sm hover:scale-105"
        >
          <Save size={11} />
          <span>Sync Direct Payments</span>
        </button>
      </div>

      {/* Interactive Inline Spreadsheet Grid */}
      <div className="bg-white border rounded shadow-sm p-4 space-y-2">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest border-b pb-1.5 flex items-center space-x-1">
          <CreditCard size={12} className="text-amber-500" />
          <span>Direct Contractor Payments registry spreadsheet</span>
        </h3>

        {!selectedSubcontractorId || !selectedProjectId ? (
          <div className="p-8 text-center text-gray-400 font-semibold">
            Please establish subcontractor partner and site location boundaries above to mount interactive payments ledger.
          </div>
        ) : (
          <div className="overflow-x-auto text-[10px] max-h-[400px]">
            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr className="bg-[#f3f4f6] text-gray-600 uppercase font-semibold border-b border-gray-350">
                  <th className="p-2 border border-gray-300">Index</th>
                  <th className="p-2 border border-gray-300">Payment ID / Status</th>
                  <th className="p-2 border border-gray-300">Disbursement Date *</th>
                  <th className="p-2 border border-gray-300">Disbursed Liquid Amount *</th>
                  <th className="p-2 border border-gray-300">Payment Mode *</th>
                  <th className="p-2 border border-gray-300">Remarks & Reference Details</th>
                  <th className="p-2 border border-gray-300 text-center">Trash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentsGrid.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-400">No payment records logged. Click 'Insert Payment Row' to allocate payouts.</td>
                  </tr>
                ) : (
                  paymentsGrid.map((row, idx) => {
                    return (
                      <tr key={idx} className={`hover:bg-gray-50/50 ${row.delete ? 'bg-red-50/50 line-through text-gray-400' : ''}`}>
                        <td className="p-2 border border-gray-300 font-bold font-mono text-center text-gray-600 w-10">{idx + 1}</td>
                        <td className="p-2 border border-gray-300 font-bold font-mono text-gray-800 w-32">
                          {row.id ? (
                            <span className="text-green-700">{row.id}</span>
                          ) : (
                            <span className="text-amber-600">[NEW ROW]</span>
                          )}
                        </td>
                        <td className="p-1 border border-gray-300 w-36">
                          <input 
                            type="date" 
                            value={row.date}
                            disabled={!!row.delete}
                            onChange={(e) => handleGridCellChange(idx, 'date', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded p-1 font-mono outline-none focus:border-amber-500 text-[10px]"
                          />
                        </td>
                        <td className="p-1 border border-gray-300 w-44">
                          <div className="relative">
                            <span className="absolute left-1 top-2 font-bold text-gray-400">₹</span>
                            <input 
                              type="number" 
                              placeholder="0.00"
                              value={row.amount}
                              disabled={!!row.delete}
                              onChange={(e) => handleGridCellChange(idx, 'amount', e.target.value)}
                              className="w-full bg-white border border-gray-300 py-1 pl-4 pr-1 rounded font-bold font-mono outline-none text-gray-800 focus:border-amber-500 text-[10px]"
                            />
                          </div>
                        </td>
                        <td className="p-1 border border-gray-300 w-44">
                          <select 
                            value={row.paymentMode}
                            disabled={!!row.delete}
                            onChange={(e) => handleGridCellChange(idx, 'paymentMode', e.target.value)}
                            className="w-full bg-white border border-gray-300 p-1 rounded font-bold outline-none focus:border-amber-500 text-[10px]"
                          >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash Outflow</option>
                            <option value="Cheque">Cheque Draft</option>
                            <option value="Other">Other Mode</option>
                          </select>
                        </td>
                        <td className="p-1 border border-gray-300">
                          <input 
                            type="text" 
                            placeholder="Provide voucher numbers, bank reference receipts or ledger comments..."
                            value={row.remarks}
                            disabled={!!row.delete}
                            onChange={(e) => handleGridCellChange(idx, 'remarks', e.target.value)}
                            className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                          />
                        </td>
                        <td className="p-1 border border-gray-300 text-center w-14">
                          <button 
                            type="button"
                            onClick={() => handleToggleDeletePaymentRow(idx)}
                            className={`p-1 rounded ${row.delete ? 'bg-amber-100 text-amber-700' : 'bg-red-50 hover:bg-red-100 text-red-650'}`}
                            title={row.delete ? "Revert Trash" : "Stash For Erase Selection"}
                          >
                            <Trash2 size={11} className="mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
