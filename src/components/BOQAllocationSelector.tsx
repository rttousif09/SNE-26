import React, { useState, useMemo } from 'react';
import { BOQ, BOQItem, MeasurementItem, Billing as BillingType } from '../types';
import { X, Search, Check, CheckSquare, Square, AlertCircle, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BOQAllocationSelectorProps {
  projectId: string;
  projectName?: string;
  boqs: BOQ[];
  billings?: BillingType[];
  currentBillId?: string | null;
  alreadySelectedBoqItemIds?: string[];
  onSelect: (item: MeasurementItem) => void;
  onSelectMultiple?: (items: MeasurementItem[]) => void;
  onClose: () => void;
}

export const BOQAllocationSelector: React.FC<BOQAllocationSelectorProps> = ({
  projectId,
  projectName,
  boqs = [],
  billings = [],
  currentBillId,
  alreadySelectedBoqItemIds = [],
  onSelect,
  onSelectMultiple,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Helper to calculate previous cumulative quantity from previously approved/posted bills
  const calculatePreviousQty = (boqItem: BOQItem): number => {
    if (!projectId || !billings || billings.length === 0) {
      return Number(boqItem.billedQuantity || 0);
    }

    const projectBills = billings.filter(b =>
      b.projectId === projectId &&
      b.id !== currentBillId &&
      (b as any).status !== 'Draft' &&
      (b as any).status !== 'Rejected' &&
      (b as any).status !== 'Cancelled'
    );

    let totalBilled = 0;
    for (const b of projectBills) {
      if (!b.measurementItems || !Array.isArray(b.measurementItems)) continue;
      for (const m of b.measurementItems) {
        if (
          (m.boqItemId && m.boqItemId === boqItem.id) ||
          (m.itemCode && m.itemCode === boqItem.itemCode)
        ) {
          totalBilled += Number(m.qtyExecuted || 0);
        }
      }
    }

    // If no bills found in billings table, fallback to boqItem.billedQuantity
    if (totalBilled === 0 && boqItem.billedQuantity) {
      totalBilled = Number(boqItem.billedQuantity || 0);
    }

    return totalBilled;
  };

  // Find all BOQs for this project (include all status or approved)
  const projectBoqs = useMemo(() => {
    const list = boqs.filter(b => b.projectId === projectId);
    // If approved or revised exists, prioritize approved/revised, otherwise show any for the project
    const approved = list.filter(b => b.status === 'Approved' || b.status === 'Revised');
    return approved.length > 0 ? approved : list;
  }, [boqs, projectId]);

  // Flatten items with calculated previous and remaining quantities
  const allItems = useMemo(() => {
    const list: Array<{
      item: BOQItem;
      boq: BOQ;
      previousQty: number;
      remainingQty: number;
    }> = [];

    projectBoqs.forEach(boq => {
      (boq.items || []).forEach(item => {
        const prevQty = calculatePreviousQty(item);
        const boqQty = Number(item.boqQuantity || 0);
        const remainingQty = parseFloat((boqQty - prevQty).toFixed(3));
        list.push({
          item,
          boq,
          previousQty: prevQty,
          remainingQty
        });
      });
    });

    return list;
  }, [projectBoqs, billings, projectId, currentBillId]);

  // Categories available
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach(i => {
      if (i.item.category) cats.add(i.item.category);
    });
    return Array.from(cats);
  }, [allItems]);

  // Filtered items based on search and category
  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    return allItems.filter(({ item }) => {
      const matchSearch =
        !query ||
        item.itemCode.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.remarks && item.remarks.toLowerCase().includes(query));

      const matchCategory =
        filterCategory === 'all' || item.category === filterCategory;

      return matchSearch && matchCategory;
    });
  }, [allItems, search, filterCategory]);

  const toggleSelect = (itemId: string) => {
    const next = new Set(selectedIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const available = filteredItems.filter(
      i => !alreadySelectedBoqItemIds.includes(i.item.id)
    );
    if (selectedIds.size === available.length && available.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(available.map(i => i.item.id)));
    }
  };

  const createMeasurementItem = (
    item: BOQItem,
    prevQty: number
  ): MeasurementItem => {
    const boqQty = Number(item.boqQuantity || 0);
    const rate = Number(item.boqRate || 0);
    const thisBillQty = 0;
    const thisBillAmount = 0;
    const cumulativeQty = prevQty + thisBillQty;
    const cumulativeAmount = cumulativeQty * rate;
    const balanceQty = parseFloat((boqQty - cumulativeQty).toFixed(3));

    return {
      id: uuidv4(),
      boqItemId: item.id,
      itemCode: item.itemCode,
      description: item.description,
      unit: item.unit || 'sqft',
      boqQuantity: boqQty,
      boqRate: rate,
      rate: rate,
      prevQty: prevQty,
      prevAmount: parseFloat((prevQty * rate).toFixed(2)),
      qtyExecuted: thisBillQty,
      amount: thisBillAmount,
      cumulativeQty: cumulativeQty,
      cumulativeAmount: cumulativeAmount,
      balanceQty: balanceQty,
      remarks: item.remarks || ''
    };
  };

  const handleSelectSingle = (item: BOQItem, prevQty: number) => {
    const mItem = createMeasurementItem(item, prevQty);
    onSelect(mItem);
    onClose();
  };

  const handleAddSelected = () => {
    const selectedItems = allItems
      .filter(i => selectedIds.has(i.item.id))
      .map(i => createMeasurementItem(i.item, i.previousQty));

    if (selectedItems.length === 0) return;

    if (onSelectMultiple) {
      onSelectMultiple(selectedItems);
    } else {
      selectedItems.forEach(item => onSelect(item));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-5xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-[11px] relative z-10 font-sans">
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-[#1e3a5f] text-white flex justify-between items-center border-b border-[#0f243d] select-none">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold tracking-wide">📋 Select BOQ Items for Bill Entry</span>
            {projectName && (
              <span className="bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-400/30">
                {projectName}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded font-bold text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 border-b border-slate-300 bg-white flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by BOQ Item Code or Description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-[#8c9ba8] rounded text-xs bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              autoFocus
            />
          </div>

          {categories.length > 0 && (
            <div className="flex items-center space-x-1.5 text-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500">Category:</span>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-2 py-1 border border-[#8c9ba8] rounded text-xs bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div className="text-slate-600 text-[11px] ml-auto">
            Available: <strong className="text-slate-900">{filteredItems.length}</strong> item(s)
            {selectedIds.size > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-300">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
          {projectBoqs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded border border-dashed border-slate-300 text-slate-500">
              <AlertCircle size={28} className="mx-auto text-amber-500 mb-2" />
              <div className="font-bold text-sm text-slate-700">No BOQ Master Found for Selected Project</div>
              <div className="text-xs text-slate-400 mt-1">
                Please create and approve a BOQ in the BOQ Master module (BOQ01) first.
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-white rounded border border-dashed border-slate-300 text-slate-500">
              <Search size={28} className="mx-auto text-slate-400 mb-2" />
              <div className="font-bold text-sm text-slate-700">No Matching BOQ Items</div>
              <div className="text-xs text-slate-400 mt-1">Try refining your search keyword.</div>
            </div>
          ) : (
            <table className="w-full border-collapse border border-[#cbd5e1] text-[11px] bg-white">
              <thead className="bg-[#2c5282] text-white text-[10px] font-semibold sticky top-0 uppercase tracking-wider select-none shadow-sm z-10">
                <tr>
                  <th className="border border-blue-900 px-2 py-2 text-center w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="hover:text-blue-200 transition-colors"
                      title="Select / Deselect all"
                    >
                      {selectedIds.size > 0 &&
                      selectedIds.size ===
                        filteredItems.filter(
                          i => !alreadySelectedBoqItemIds.includes(i.item.id)
                        ).length ? (
                        <CheckSquare size={14} className="text-white" />
                      ) : (
                        <Square size={14} className="text-white/80" />
                      )}
                    </button>
                  </th>
                  <th className="border border-blue-900 px-2 py-2 text-left w-24">BOQ Item Code</th>
                  <th className="border border-blue-900 px-3 py-2 text-left">Item Description</th>
                  <th className="border border-blue-900 px-2 py-2 text-center w-16">Unit</th>
                  <th className="border border-blue-900 px-2 py-2 text-right w-24">BOQ Quantity</th>
                  <th className="border border-blue-900 px-2 py-2 text-right w-24">BOQ Rate</th>
                  <th className="border border-blue-900 px-2 py-2 text-right w-28">BOQ Amount</th>
                  <th className="border border-blue-900 px-2 py-2 text-right w-28">Previously Billed Qty</th>
                  <th className="border border-blue-900 px-2 py-2 text-right w-28">Remaining BOQ Qty</th>
                  <th className="border border-blue-900 px-2 py-2 text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredItems.map(({ item, previousQty, remainingQty }) => {
                  const isAlreadyAdded = alreadySelectedBoqItemIds.includes(item.id);
                  const isSelected = selectedIds.has(item.id);
                  const isExceeded = remainingQty < 0;
                  const boqQty = Number(item.boqQuantity || 0);
                  const boqRate = Number(item.boqRate || 0);
                  const boqAmount = parseFloat((boqQty * boqRate).toFixed(2));

                  return (
                    <tr
                      key={item.id}
                      onClick={() => !isAlreadyAdded && toggleSelect(item.id)}
                      className={`transition-colors cursor-pointer select-none ${
                        isAlreadyAdded
                          ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50/90 font-medium'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className="border border-[#cbd5e1] px-2 py-1.5 text-center"
                        onClick={e => e.stopPropagation()}
                      >
                        {isAlreadyAdded ? (
                          <span
                            className="text-[9px] text-slate-400 font-bold"
                            title="Already in bill"
                          >
                            Added
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                            className="cursor-pointer rounded text-blue-600 focus:ring-blue-500"
                          />
                        )}
                      </td>
                      <td className="border border-[#cbd5e1] px-2 py-1.5 font-bold font-mono text-blue-900">
                        {item.itemCode}
                      </td>
                      <td className="border border-[#cbd5e1] px-3 py-1.5 text-slate-800">
                        <div>{item.description}</div>
                        {item.category && (
                          <span className="inline-block mt-0.5 text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td className="border border-[#cbd5e1] px-2 py-1.5 text-center font-bold text-slate-700">
                        {item.unit}
                      </td>
                      <td className="border border-[#cbd5e1] px-2 py-1.5 text-right font-mono text-slate-900">
                        {boqQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="border border-[#cbd5e1] px-2 py-1.5 text-right font-mono text-blue-700 font-bold">
                        ₹{boqRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-[#cbd5e1] px-2 py-1.5 text-right font-mono text-slate-800">
                        ₹{boqAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-[#cbd5e1] px-2 py-1.5 text-right font-mono text-purple-700 font-semibold">
                        {previousQty > 0
                          ? previousQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })
                          : '-'}
                      </td>
                      <td
                        className={`border border-[#cbd5e1] px-2 py-1.5 text-right font-mono font-bold ${
                          isExceeded ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {remainingQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      </td>
                      <td
                        className="border border-[#cbd5e1] px-2 py-1.5 text-center"
                        onClick={e => e.stopPropagation()}
                      >
                        {isAlreadyAdded ? (
                          <span className="text-[10px] text-slate-400 italic">In Bill</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectSingle(item, previousQty)}
                            className="px-2 py-0.5 bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#e2e8f0] px-4 py-2.5 border-t border-[#cbd5e1] flex items-center justify-between">
          <div className="text-[10px] text-slate-600">
            Selected items will automatically populate: <strong className="text-slate-800">BOQ Item Code, Description, Unit, BOQ Qty, BOQ Rate, and Previous Cumulative Quantity</strong>.
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-[#8c9ba8] rounded text-xs bg-white text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleAddSelected}
              className={`px-4 py-1.5 rounded text-xs text-white font-bold flex items-center space-x-1.5 transition-colors shadow-xs ${
                selectedIds.size === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#2c5282] hover:bg-[#1e3a5f] cursor-pointer'
              }`}
            >
              <Check size={14} />
              <span>Add Selected ({selectedIds.size}) to Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
