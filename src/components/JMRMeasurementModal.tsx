import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Minus, Trash2, Copy, Calculator, Info, 
  Calendar, MapPin, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, FileSpreadsheet, RotateCcw
} from 'lucide-react';
import { JMRItem, JMRMeasurementRow, JMRMeasurementMethod } from '../types';

interface JMRMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: JMRItem;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultLocation?: string;
  isReadOnly?: boolean;
  onSave: (updatedItem: JMRItem) => void;
  onOpenExcelUpload?: () => void;
}

export const JMRMeasurementModal: React.FC<JMRMeasurementModalProps> = ({
  isOpen,
  onClose,
  item,
  defaultStartDate = new Date().toISOString().split('T')[0],
  defaultEndDate = new Date().toISOString().split('T')[0],
  defaultLocation = '',
  isReadOnly = false,
  onSave,
  onOpenExcelUpload
}) => {
  const [rows, setRows] = useState<JMRMeasurementRow[]>([]);
  const [remarks, setRemarks] = useState<string>('');
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Add' | 'Subtract'>('All');

  // Initialize state when modal opens or item changes
  useEffect(() => {
    if (isOpen && item) {
      setRows(item.measurementRows ? JSON.parse(JSON.stringify(item.measurementRows)) : []);
      setRemarks(item.remarks || '');
    }
  }, [isOpen, item]);

  // Calculate row quantity based on method
  const calculateRowQty = (row: Partial<JMRMeasurementRow>): number => {
    const times = (row.numberOfTimes !== undefined && row.numberOfTimes !== null && row.numberOfTimes > 0) 
      ? Number(row.numberOfTimes) 
      : 1;

    switch (row.method) {
      case 'dimensions': {
        const l = Number(row.length) || 0;
        const w = Number(row.width) || 0;
        const h = Number(row.height) || 0;
        if (l === 0 && w === 0 && h === 0) return 0;
        const vol = (l || 1) * (w || 1) * (h || 1);
        return parseFloat((vol * times).toFixed(4));
      }
      case 'length_width': {
        const l = Number(row.length) || 0;
        const w = Number(row.width) || 0;
        return parseFloat(((l * w) * times).toFixed(4));
      }
      case 'multiplier': {
        const base = Number(row.baseQuantity) || 0;
        return parseFloat((base * times).toFixed(4));
      }
      case 'count': {
        const base = Number(row.baseQuantity) || 0;
        return parseFloat((base * times).toFixed(4));
      }
      case 'direct':
      default: {
        return parseFloat((Number(row.baseQuantity || 0) * times).toFixed(4));
      }
    }
  };

  // Add new measurement row
  const handleAddRow = (entryType: 'Add' | 'Subtract') => {
    const newRow: JMRMeasurementRow = {
      id: `meas_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      entryType,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      location: defaultLocation || '',
      equipmentNo: '',
      method: 'dimensions',
      length: 1,
      width: 1,
      height: 1,
      numberOfTimes: 1,
      baseQuantity: 1,
      calculatedQuantity: 1,
      remarks: '',
      description: ''
    };
    newRow.calculatedQuantity = calculateRowQty(newRow);
    setRows(prev => [...prev, newRow]);
  };

  // Update a row field
  const handleUpdateRow = (id: string, updates: Partial<JMRMeasurementRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      // If method or dimension properties changed, recalculate quantity
      if (
        updates.method !== undefined || 
        updates.length !== undefined || 
        updates.width !== undefined || 
        updates.height !== undefined || 
        updates.numberOfTimes !== undefined || 
        updates.baseQuantity !== undefined
      ) {
        updated.calculatedQuantity = calculateRowQty(updated);
      }
      return updated;
    }));
  };

  // Duplicate a row
  const handleDuplicateRow = (index: number) => {
    const source = rows[index];
    const duplicated: JMRMeasurementRow = {
      ...source,
      id: `meas_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      remarks: source.remarks ? `${source.remarks} (Copy)` : 'Copy'
    };
    setRows(prev => [
      ...prev.slice(0, index + 1),
      duplicated,
      ...prev.slice(index + 1)
    ]);
  };

  // Delete a row
  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Clear all rows
  const handleClearAll = () => {
    if (rows.length === 0) return;
    if (window.confirm('Are you sure you want to clear all measurement rows for this item?')) {
      setRows([]);
    }
  };

  // Computed totals
  const totals = useMemo(() => {
    let totalAdd = 0;
    let totalSubtract = 0;
    rows.forEach(r => {
      const q = Number(r.calculatedQuantity) || 0;
      if (r.entryType === 'Add') {
        totalAdd += q;
      } else {
        totalSubtract += q;
      }
    });

    const netQuantity = parseFloat((totalAdd - totalSubtract).toFixed(4));
    const currentClaimAmount = parseFloat((netQuantity * (item.rate || 0)).toFixed(2));
    const remainingContractAfterClaim = parseFloat(((item.availableContractQuantity || 0) - netQuantity).toFixed(4));

    return {
      totalAdd: parseFloat(totalAdd.toFixed(4)),
      totalSubtract: parseFloat(totalSubtract.toFixed(4)),
      netQuantity,
      currentClaimAmount,
      remainingContractAfterClaim,
      isExceeding: netQuantity > (item.availableContractQuantity || 0)
    };
  }, [rows, item]);

  // Handle Save
  const handleSave = () => {
    if (totals.netQuantity < 0) {
      if (!window.confirm('Warning: Net Claim Quantity is negative. Are you sure you want to save this measurement?')) {
        return;
      }
    }
    if (totals.isExceeding) {
      if (!window.confirm(`Notice: Net Claimed Quantity (${totals.netQuantity} ${item.unit}) exceeds Available Contract Quantity (${item.availableContractQuantity} ${item.unit}). Do you want to proceed?`)) {
        return;
      }
    }

    const updatedItem: JMRItem = {
      ...item,
      measurementRows: rows,
      netQuantity: totals.netQuantity,
      currentClaimAmount: totals.currentClaimAmount,
      remarks: remarks.trim()
    };

    onSave(updatedItem);
    onClose();
  };

  if (!isOpen) return null;

  const filteredRows = rows.filter(r => {
    if (activeFilter === 'Add') return r.entryType === 'Add';
    if (activeFilter === 'Subtract') return r.entryType === 'Subtract';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-2 sm:p-4">
      {/* Outer Modal Container - strictly capped at max-h-[90vh] with flex flex-col to pin header & footer */}
      <div className="bg-[#f0f2f5] border border-[#718baf] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col rounded-none overflow-hidden font-sans text-xs">
        
        {/* =========================================================================
            PINNED HEADER (flex-shrink-0)
           ========================================================================= */}
        <div className="bg-[#1e3a5f] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#0f233a] flex-shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <Calculator size={15} className="text-[#a5c7f9]" />
            <span className="font-bold tracking-wide text-sm">
              SERVICE DESCRIPTION & MEASUREMENT RECORD
            </span>
            <span className="bg-[#0f233a] text-blue-200 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-900/50">
              Item {item.itemNumber} {item.itemCode ? `(${item.itemCode})` : ''}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white hover:bg-white/10 p-1 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* =========================================================================
            ITEM METADATA RIBBON (flex-shrink-0)
           ========================================================================= */}
        <div className="bg-[#e4ebf3] border-b border-[#b6c7db] p-3 flex-shrink-0">
          {/* Top row: Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2 font-mono text-[11px]">
            <div className="bg-white border border-[#b6c7db] p-1.5 shadow-2xs">
              <span className="text-gray-500 text-[9px] uppercase block font-sans">Item No</span>
              <span className="font-bold text-[#1e3a5f] text-xs">{item.itemNumber}</span>
            </div>
            <div className="bg-white border border-[#b6c7db] p-1.5 shadow-2xs">
              <span className="text-gray-500 text-[9px] uppercase block font-sans">Unit of Measure</span>
              <span className="font-bold text-[#1e3a5f]">{item.unit || 'EA'}</span>
            </div>
            <div className="bg-white border border-[#b6c7db] p-1.5 shadow-2xs">
              <span className="text-gray-500 text-[9px] uppercase block font-sans">Base Rate</span>
              <span className="font-bold text-gray-900">₹{(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white border border-[#b6c7db] p-1.5 shadow-2xs">
              <span className="text-gray-500 text-[9px] uppercase block font-sans">Contract Qty</span>
              <span className="font-bold text-blue-700">{(item.contractQuantity || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white border border-[#b6c7db] p-1.5 shadow-2xs">
              <span className="text-gray-500 text-[9px] uppercase block font-sans">Prev Approved JMR</span>
              <span className="font-bold text-emerald-700">{(item.previouslyApprovedQuantity || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white border border-[#b6c7db] p-1.5 shadow-2xs">
              <span className="text-gray-500 text-[9px] uppercase block font-sans">Available Contract Qty</span>
              <span className={`font-bold ${item.availableContractQuantity <= 0 ? 'text-rose-600' : 'text-purple-700'}`}>
                {(item.availableContractQuantity || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Detailed Work Description - Expandable box ensuring complete text is accessible */}
          <div className="bg-white border border-[#b6c7db] p-2 relative text-gray-800 text-[11px] leading-relaxed">
            <div className="flex items-center justify-between text-gray-500 text-[10px] font-semibold mb-1 border-b pb-1 border-gray-100">
              <span className="flex items-center gap-1 text-[#1e3a5f]">
                <Info size={12} /> Detailed Service Description & Technical Specifications:
              </span>
              <button 
                type="button" 
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 underline text-[10px]"
              >
                {isDescExpanded ? (
                  <>Collapse <ChevronUp size={12} /></>
                ) : (
                  <>Expand full text <ChevronDown size={12} /></>
                )}
              </button>
            </div>
            <div className={`overflow-y-auto whitespace-pre-wrap ${isDescExpanded ? 'max-h-48' : 'max-h-14'} pr-1 font-sans`}>
              {item.description || 'No work description specified.'}
            </div>
          </div>
        </div>

        {/* =========================================================================
            ACTION TOOLBAR (flex-shrink-0)
           ========================================================================= */}
        <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => handleAddRow('Add')}
                  className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors border border-[#1b5e20]"
                >
                  <Plus size={13} /> Add Measurement
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRow('Subtract')}
                  className="bg-[#c62828] hover:bg-[#b71c1c] text-white px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors border border-[#b71c1c]"
                >
                  <Minus size={13} /> Subtract Measurement
                </button>
                {onOpenExcelUpload && (
                  <button
                    type="button"
                    onClick={onOpenExcelUpload}
                    className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-2 py-1 text-xs flex items-center gap-1 shadow-2xs border border-[#0369a1]"
                    title="Bulk upload measurements via Excel"
                  >
                    <FileSpreadsheet size={13} /> Import Excel
                  </button>
                )}
                {rows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="bg-white hover:bg-gray-100 text-gray-700 px-2 py-1 text-xs border border-gray-300 flex items-center gap-1"
                    title="Clear all rows"
                  >
                    <RotateCcw size={12} /> Clear All
                  </button>
                )}
              </>
            )}
          </div>

          {/* Filter tabs: All / Add / Subtract */}
          <div className="flex items-center gap-1 text-[11px] bg-gray-200 p-0.5 border border-gray-300">
            <button
              type="button"
              onClick={() => setActiveFilter('All')}
              className={`px-2 py-0.5 font-medium ${activeFilter === 'All' ? 'bg-[#1e3a5f] text-white font-bold' : 'text-gray-700 hover:bg-gray-300'}`}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('Add')}
              className={`px-2 py-0.5 font-medium ${activeFilter === 'Add' ? 'bg-emerald-700 text-white font-bold' : 'text-gray-700 hover:bg-gray-300'}`}
            >
              Add ({rows.filter(r => r.entryType === 'Add').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('Subtract')}
              className={`px-2 py-0.5 font-medium ${activeFilter === 'Subtract' ? 'bg-rose-700 text-white font-bold' : 'text-gray-700 hover:bg-gray-300'}`}
            >
              Subtract ({rows.filter(r => r.entryType === 'Subtract').length})
            </button>
          </div>
        </div>

        {/* =========================================================================
            MEASUREMENT ENTRIES TABLE (flex-1 min-h-0 overflow-y-auto)
           ========================================================================= */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white p-3">
          {rows.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 p-8 text-center bg-gray-50/50 my-4">
              <Calculator size={36} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 font-semibold text-sm">No measurement rows added yet.</p>
              <p className="text-gray-500 text-[11px] mt-1 max-w-md mx-auto">
                Click <strong>+ Add Measurement</strong> to record completed work, or <strong>− Subtract Measurement</strong> for voids, deductions, or corrections.
              </p>
              {!isReadOnly && (
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddRow('Add')}
                    className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <Plus size={13} /> Add Measurement
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRow('Subtract')}
                    className="bg-[#c62828] hover:bg-[#b71c1c] text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <Minus size={13} /> Subtract Measurement
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-[#b6c7db] overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#2f4f75] text-white text-[10px] uppercase font-semibold tracking-wider">
                    <th className="p-1.5 text-center w-8 border-r border-[#1e3a5f]">#</th>
                    <th className="p-1.5 text-center w-16 border-r border-[#1e3a5f]">Type</th>
                    <th className="p-1.5 w-24 border-r border-[#1e3a5f]">From Date</th>
                    <th className="p-1.5 w-24 border-r border-[#1e3a5f]">To Date</th>
                    <th className="p-1.5 w-28 border-r border-[#1e3a5f]">Location / Grid</th>
                    <th className="p-1.5 w-24 border-r border-[#1e3a5f]">Equipment / Tag</th>
                    <th className="p-1.5 w-24 border-r border-[#1e3a5f]">Method</th>
                    <th className="p-1.5 w-44 border-r border-[#1e3a5f]">Dimensions / Base</th>
                    <th className="p-1.5 text-center w-14 border-r border-[#1e3a5f]">Times</th>
                    <th className="p-1.5 text-right w-24 border-r border-[#1e3a5f]">Net Qty ({item.unit})</th>
                    <th className="p-1.5 border-r border-[#1e3a5f]">Remarks / Notes</th>
                    {!isReadOnly && <th className="p-1.5 text-center w-16">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRows.map((row, idx) => {
                    const isAdd = row.entryType === 'Add';
                    return (
                      <tr 
                        key={row.id} 
                        className={`transition-colors ${isAdd ? 'hover:bg-emerald-50/60 bg-emerald-50/20' : 'hover:bg-rose-50/60 bg-rose-50/25'}`}
                      >
                        {/* Row # */}
                        <td className="p-1 text-center font-mono text-[10px] text-gray-500 border-r border-gray-200">
                          {idx + 1}
                        </td>

                        {/* Entry Type Badge / Selector */}
                        <td className="p-1 text-center border-r border-gray-200">
                          {isReadOnly ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${isAdd ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                              {isAdd ? '+ ADD' : '− SUB'}
                            </span>
                          ) : (
                            <select
                              value={row.entryType}
                              onChange={(e) => handleUpdateRow(row.id, { entryType: e.target.value as 'Add' | 'Subtract' })}
                              className={`h-6 text-[10px] font-bold px-1 border rounded-none cursor-pointer ${isAdd ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'}`}
                            >
                              <option value="Add">+ Add</option>
                              <option value="Subtract">− Sub</option>
                            </select>
                          )}
                        </td>

                        {/* From Date */}
                        <td className="p-1 border-r border-gray-200">
                          {isReadOnly ? (
                            <span className="font-mono">{row.startDate}</span>
                          ) : (
                            <input
                              type="date"
                              value={row.startDate || ''}
                              onChange={(e) => handleUpdateRow(row.id, { startDate: e.target.value })}
                              className="w-full h-6 px-1 text-[10px] border border-gray-300 rounded-none bg-white font-mono"
                            />
                          )}
                        </td>

                        {/* To Date */}
                        <td className="p-1 border-r border-gray-200">
                          {isReadOnly ? (
                            <span className="font-mono">{row.endDate}</span>
                          ) : (
                            <input
                              type="date"
                              value={row.endDate || ''}
                              onChange={(e) => handleUpdateRow(row.id, { endDate: e.target.value })}
                              className="w-full h-6 px-1 text-[10px] border border-gray-300 rounded-none bg-white font-mono"
                            />
                          )}
                        </td>

                        {/* Location / Grid */}
                        <td className="p-1 border-r border-gray-200">
                          {isReadOnly ? (
                            <span>{row.location || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              value={row.location || ''}
                              placeholder="Grid/Floor/Axis"
                              onChange={(e) => handleUpdateRow(row.id, { location: e.target.value })}
                              className="w-full h-6 px-1.5 text-[10px] border border-gray-300 rounded-none bg-white"
                            />
                          )}
                        </td>

                        {/* Equipment / Tag */}
                        <td className="p-1 border-r border-gray-200">
                          {isReadOnly ? (
                            <span>{row.equipmentNo || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              value={row.equipmentNo || ''}
                              placeholder="Equip/Tag No"
                              onChange={(e) => handleUpdateRow(row.id, { equipmentNo: e.target.value })}
                              className="w-full h-6 px-1.5 text-[10px] border border-gray-300 rounded-none bg-white font-mono"
                            />
                          )}
                        </td>

                        {/* Method */}
                        <td className="p-1 border-r border-gray-200">
                          {isReadOnly ? (
                            <span className="uppercase text-[9px] font-mono">{row.method}</span>
                          ) : (
                            <select
                              value={row.method || 'dimensions'}
                              onChange={(e) => handleUpdateRow(row.id, { method: e.target.value as JMRMeasurementMethod })}
                              className="w-full h-6 px-1 text-[10px] border border-gray-300 rounded-none bg-white"
                            >
                              <option value="dimensions">Dimensions (L×W×H)</option>
                              <option value="length_width">Area (L×W)</option>
                              <option value="multiplier">Multiplier</option>
                              <option value="count">Count / Units</option>
                              <option value="direct">Direct Qty</option>
                            </select>
                          )}
                        </td>

                        {/* Dimensions / Base Input */}
                        <td className="p-1 border-r border-gray-200">
                          {row.method === 'dimensions' && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                placeholder="L"
                                disabled={isReadOnly}
                                value={row.length !== undefined ? row.length : ''}
                                onChange={(e) => handleUpdateRow(row.id, { length: parseFloat(e.target.value) || 0 })}
                                className="w-12 h-6 px-1 text-[10px] border border-gray-300 text-center font-mono"
                                title="Length"
                              />
                              <span className="text-gray-400 text-[10px]">×</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="W"
                                disabled={isReadOnly}
                                value={row.width !== undefined ? row.width : ''}
                                onChange={(e) => handleUpdateRow(row.id, { width: parseFloat(e.target.value) || 0 })}
                                className="w-12 h-6 px-1 text-[10px] border border-gray-300 text-center font-mono"
                                title="Width"
                              />
                              <span className="text-gray-400 text-[10px]">×</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="H"
                                disabled={isReadOnly}
                                value={row.height !== undefined ? row.height : ''}
                                onChange={(e) => handleUpdateRow(row.id, { height: parseFloat(e.target.value) || 0 })}
                                className="w-12 h-6 px-1 text-[10px] border border-gray-300 text-center font-mono"
                                title="Height/Depth"
                              />
                            </div>
                          )}

                          {row.method === 'length_width' && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                placeholder="L"
                                disabled={isReadOnly}
                                value={row.length !== undefined ? row.length : ''}
                                onChange={(e) => handleUpdateRow(row.id, { length: parseFloat(e.target.value) || 0 })}
                                className="w-16 h-6 px-1 text-[10px] border border-gray-300 text-center font-mono"
                                title="Length"
                              />
                              <span className="text-gray-400 text-[10px]">×</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="W"
                                disabled={isReadOnly}
                                value={row.width !== undefined ? row.width : ''}
                                onChange={(e) => handleUpdateRow(row.id, { width: parseFloat(e.target.value) || 0 })}
                                className="w-16 h-6 px-1 text-[10px] border border-gray-300 text-center font-mono"
                                title="Width"
                              />
                            </div>
                          )}

                          {(row.method === 'multiplier' || row.method === 'count' || row.method === 'direct') && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                placeholder="Base Qty"
                                disabled={isReadOnly}
                                value={row.baseQuantity !== undefined ? row.baseQuantity : ''}
                                onChange={(e) => handleUpdateRow(row.id, { baseQuantity: parseFloat(e.target.value) || 0 })}
                                className="w-full h-6 px-1 text-[10px] border border-gray-300 text-right font-mono"
                                title="Base Quantity"
                              />
                            </div>
                          )}
                        </td>

                        {/* Times Multiplier */}
                        <td className="p-1 text-center border-r border-gray-200">
                          {isReadOnly ? (
                            <span className="font-mono">{row.numberOfTimes || 1}</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={row.numberOfTimes !== undefined ? row.numberOfTimes : 1}
                              onChange={(e) => handleUpdateRow(row.id, { numberOfTimes: parseFloat(e.target.value) || 1 })}
                              className="w-12 h-6 px-1 text-[10px] border border-gray-300 text-center font-mono"
                              title="Number of Times / Multiplier"
                            />
                          )}
                        </td>

                        {/* Calculated Quantity */}
                        <td className={`p-1 text-right font-mono font-bold border-r border-gray-200 ${isAdd ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isAdd ? '+' : '−'}
                          {Number(row.calculatedQuantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>

                        {/* Remarks */}
                        <td className="p-1 border-r border-gray-200">
                          {isReadOnly ? (
                            <span className="text-gray-600 truncate block max-w-xs">{row.remarks || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              value={row.remarks || ''}
                              placeholder="Notes, specific element, joints..."
                              onChange={(e) => handleUpdateRow(row.id, { remarks: e.target.value })}
                              className="w-full h-6 px-1 text-[10px] border border-gray-300 rounded-none bg-white"
                            />
                          )}
                        </td>

                        {/* Actions */}
                        {!isReadOnly && (
                          <td className="p-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(idx)}
                                className="text-gray-500 hover:text-blue-700 p-1 transition-colors"
                                title="Duplicate Row"
                              >
                                <Copy size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                className="text-gray-500 hover:text-red-700 p-1 transition-colors"
                                title="Delete Row"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Item Overall Remarks Field */}
          <div className="mt-3">
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">
              Service Item Verification Remarks:
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter overall observations, site verification notes, or measurement sheet references..."
              className="w-full h-7 px-2 text-xs border border-gray-300 rounded-none bg-white"
            />
          </div>
        </div>

        {/* =========================================================================
            PINNED FOOTER (flex-shrink-0) - ALWAYS VISIBLE, NEVER HIDDEN
           ========================================================================= */}
        <div className="bg-[#f8fafc] border-t border-[#cbd5e1] p-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-inner">
          
          {/* Summary Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-emerald-800 rounded-none">
              <span className="text-[9px] uppercase block font-sans font-semibold">Total Additions</span>
              <span className="font-bold">+{totals.totalAdd.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {item.unit}</span>
            </div>
            <div className="bg-rose-50 border border-rose-300 px-2.5 py-1 text-rose-800 rounded-none">
              <span className="text-[9px] uppercase block font-sans font-semibold">Total Deductions</span>
              <span className="font-bold">−{totals.totalSubtract.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {item.unit}</span>
            </div>
            <div className="bg-[#1e3a5f] text-white px-3 py-1 rounded-none shadow-2xs">
              <span className="text-[9px] uppercase block text-blue-200 font-sans font-semibold">Net JMR Claim Qty</span>
              <span className="font-bold text-sm">{totals.netQuantity.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {item.unit}</span>
            </div>
            <div className="bg-amber-50 border border-amber-300 px-2.5 py-1 text-amber-900 rounded-none">
              <span className="text-[9px] uppercase block font-sans font-semibold">Claim Value (₹)</span>
              <span className="font-bold text-sm">₹{totals.currentClaimAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {totals.isExceeding && (
              <div className="flex items-center gap-1 text-amber-700 text-[11px] font-sans font-semibold bg-amber-100/70 border border-amber-400 px-2 py-1">
                <AlertTriangle size={13} />
                <span>Exceeds contract balance by {(totals.netQuantity - item.availableContractQuantity).toFixed(2)} {item.unit}</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Cancel, Save Draft, Done */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-1.5 text-xs font-semibold border border-gray-400 rounded-none transition-colors shadow-2xs"
            >
              Cancel
            </button>
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-[#2f4f75] hover:bg-[#1e3a5f] text-white px-4 py-1.5 text-xs font-semibold border border-[#1e3a5f] rounded-none transition-colors shadow-2xs"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-[#1e3a5f] hover:bg-[#152840] text-white px-6 py-1.5 text-xs font-bold border border-[#0f233a] rounded-none transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <CheckCircle size={14} className="text-emerald-400" /> Done
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
