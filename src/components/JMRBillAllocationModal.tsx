import React, { useState, useMemo } from 'react';
import { X, CheckCircle, Calculator, Info, Check, Plus, AlertCircle } from 'lucide-react';
import { JMR, JMRItem, MeasurementItem } from '../types';

interface JMRBillAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  jmrs: JMR[];
  onImportItems: (items: Partial<MeasurementItem>[], jmrNo: string, jmrId: string) => void;
}

export const JMRBillAllocationModal: React.FC<JMRBillAllocationModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  jmrs,
  onImportItems
}) => {
  // Filter approved or partially billed JMRs for this project
  const eligibleJmrs = useMemo(() => {
    return jmrs.filter(j => 
      j.projectId === projectId && 
      (j.status === 'Approved' || j.status === 'Partially Billed')
    );
  }, [jmrs, projectId]);

  const [selectedJmrId, setSelectedJmrId] = useState<string>(eligibleJmrs[0]?.id || '');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  // Active selected JMR
  const activeJmr = useMemo(() => {
    return eligibleJmrs.find(j => j.id === selectedJmrId) || eligibleJmrs[0] || null;
  }, [eligibleJmrs, selectedJmrId]);

  // When active JMR changes, select all items with available quantities
  React.useEffect(() => {
    if (activeJmr) {
      const allIds = new Set<string>();
      const initQtys: Record<string, number> = {};

      (activeJmr.items || []).forEach(it => {
        const net = it.netQuantity || 0;
        const billed = it.previouslyBilledQuantity || 0;
        const available = Math.max(0, net - billed);
        if (available > 0) {
          allIds.add(it.id);
          initQtys[it.id] = available;
        }
      });

      setSelectedItemIds(allIds);
      setCustomQuantities(initQtys);
    } else {
      setSelectedItemIds(new Set());
      setCustomQuantities({});
    }
  }, [activeJmr]);

  if (!isOpen) return null;

  const handleToggleSelectAll = (select: boolean) => {
    if (!activeJmr) return;
    if (select) {
      const all = new Set<string>();
      activeJmr.items.forEach(it => all.add(it.id));
      setSelectedItemIds(all);
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const handleToggleItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const handleCommit = () => {
    if (!activeJmr) return;

    const itemsToImport: Partial<MeasurementItem>[] = [];

    (activeJmr.items || []).forEach(it => {
      if (selectedItemIds.has(it.id)) {
        const billedQty = customQuantities[it.id] !== undefined ? customQuantities[it.id] : (it.netQuantity - (it.previouslyBilledQuantity || 0));
        const rate = it.rate || 0;
        const prevQty = it.previouslyBilledQuantity || 0;
        const boqQty = it.contractQuantity || 0;
        const amount = parseFloat((billedQty * rate).toFixed(2));
        const cumQty = parseFloat((prevQty + billedQty).toFixed(3));
        const balanceQty = parseFloat((boqQty - cumQty).toFixed(3));

        itemsToImport.push({
          id: `mi_jmr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          boqItemId: it.boqItemId,
          itemCode: it.itemCode || it.itemNumber,
          description: it.description,
          unit: it.unit,
          boqQuantity: boqQty,
          boqRate: rate,
          rate: rate,
          prevQty: prevQty,
          qtyExecuted: billedQty,
          amount: amount,
          cumulativeQty: cumQty,
          cumulativeAmount: parseFloat((cumQty * rate).toFixed(2)),
          balanceQty: balanceQty,
          remarks: `Certified via JMR: ${activeJmr.jmrNo}`
        });
      }
    });

    if (itemsToImport.length === 0) {
      alert('Please select at least one item from the JMR to import into the bill.');
      return;
    }

    onImportItems(itemsToImport, activeJmr.jmrNo, activeJmr.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#f0f2f5] border border-[#718baf] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col rounded-none overflow-hidden font-sans text-xs">
        
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#0f233a] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Calculator size={16} className="text-[#a5c7f9]" />
            <span className="font-bold tracking-wide">
              PULL MEASUREMENTS FROM APPROVED JMR (JMR01 → BIL01)
            </span>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          
          {eligibleJmrs.length === 0 ? (
            <div className="p-8 text-center bg-white border border-gray-200">
              <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
              <p className="font-bold text-gray-800 text-sm">No Approved JMRs Available for {projectName || projectId}</p>
              <p className="text-gray-500 text-xs mt-1 max-w-md mx-auto">
                Only Joint Measurement Records with status <strong>Approved</strong> or <strong>Partially Billed</strong> can be pulled into an RA Bill.
                Please ensure site measurements are verified and approved in JMR01.
              </p>
            </div>
          ) : (
            <>
              {/* JMR Selector Ribbon */}
              <div className="bg-white border border-[#b6c7db] p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1e3a5f]">Select Approved JMR:</span>
                  <select
                    value={selectedJmrId}
                    onChange={(e) => setSelectedJmrId(e.target.value)}
                    className="h-7 px-2 border border-gray-300 rounded-none bg-white font-mono font-bold text-[#1e3a5f]"
                  >
                    {eligibleJmrs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.jmrNo} — Period: {j.startDate} to {j.endDate} ({j.status})
                      </option>
                    ))}
                  </select>
                </div>

                {activeJmr && (
                  <div className="text-[11px] text-gray-600 font-mono">
                    Date: <strong>{activeJmr.date}</strong> | Client: <strong>{activeJmr.clientName}</strong>
                  </div>
                )}
              </div>

              {/* Items in Active JMR */}
              {activeJmr && (
                <div className="bg-white border border-[#b6c7db] shadow-2xs">
                  <div className="bg-[#e4ebf3] px-3 py-1.5 border-b border-[#b6c7db] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1e3a5f]">Certified Items in {activeJmr.jmrNo}:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(true)}
                        className="text-blue-700 hover:underline text-[11px]"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(false)}
                        className="text-blue-700 hover:underline text-[11px]"
                      >
                        Clear Selection
                      </button>
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {selectedItemIds.size} of {activeJmr.items.length} items selected
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 text-[10px] uppercase font-semibold">
                          <th className="p-1.5 text-center w-8">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.size === activeJmr.items.length && activeJmr.items.length > 0}
                              onChange={(e) => handleToggleSelectAll(e.target.checked)}
                              className="cursor-pointer"
                            />
                          </th>
                          <th className="p-1.5 w-12 text-center">Item #</th>
                          <th className="p-1.5">Description</th>
                          <th className="p-1.5 w-12 text-center">Unit</th>
                          <th className="p-1.5 text-right w-20">Rate (₹)</th>
                          <th className="p-1.5 text-right w-24">JMR Net Qty</th>
                          <th className="p-1.5 text-right w-24">Prev Billed</th>
                          <th className="p-1.5 text-right w-28 font-bold text-[#1e3a5f]">Bill Qty</th>
                          <th className="p-1.5 text-right w-28 font-bold text-[#1e3a5f]">Bill Amt (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {(activeJmr.items || []).map(it => {
                          const isSelected = selectedItemIds.has(it.id);
                          const net = it.netQuantity || 0;
                          const prevBilled = it.previouslyBilledQuantity || 0;
                          const available = Math.max(0, net - prevBilled);
                          const currentQty = customQuantities[it.id] !== undefined ? customQuantities[it.id] : available;
                          const currentAmt = parseFloat((currentQty * (it.rate || 0)).toFixed(2));

                          return (
                            <tr key={it.id} className={isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}>
                              <td className="p-1.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleItem(it.id)}
                                  className="cursor-pointer"
                                />
                              </td>
                              <td className="p-1.5 text-center font-bold text-[#1e3a5f]">{it.itemNumber}</td>
                              <td className="p-1.5 font-sans font-medium text-gray-900 truncate max-w-xs" title={it.description}>
                                {it.description}
                              </td>
                              <td className="p-1.5 text-center">{it.unit}</td>
                              <td className="p-1.5 text-right">₹{(it.rate || 0).toLocaleString('en-IN')}</td>
                              <td className="p-1.5 text-right font-bold text-emerald-800">{net.toLocaleString('en-IN')}</td>
                              <td className="p-1.5 text-right text-gray-500">{prevBilled.toLocaleString('en-IN')}</td>
                              <td className="p-1 text-right">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  max={net}
                                  value={currentQty}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCustomQuantities(prev => ({ ...prev, [it.id]: val }));
                                  }}
                                  className="w-24 h-6 px-1.5 border border-gray-300 text-right font-mono font-bold text-blue-900"
                                />
                              </td>
                              <td className="p-1.5 text-right font-bold text-[#1e3a5f]">
                                ₹{currentAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#f8fafc] border-t border-[#cbd5e1] p-3 flex items-center justify-between flex-shrink-0">
          <div className="text-gray-600 text-xs">
            {eligibleJmrs.length > 0 && (
              <span>Ready to pull <strong>{selectedItemIds.size}</strong> certified measurement items into RA Bill.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-1.5 text-xs font-semibold border border-gray-400 shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={eligibleJmrs.length === 0 || selectedItemIds.size === 0}
              onClick={handleCommit}
              className={`px-5 py-1.5 text-xs font-bold border shadow-2xs flex items-center gap-1.5 ${eligibleJmrs.length > 0 && selectedItemIds.size > 0 ? 'bg-[#1e3a5f] hover:bg-[#152840] text-white border-[#0f233a]' : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'}`}
            >
              <CheckCircle size={14} className={eligibleJmrs.length > 0 && selectedItemIds.size > 0 ? 'text-emerald-400' : 'text-gray-400'} />
              Import Into RA Bill
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
