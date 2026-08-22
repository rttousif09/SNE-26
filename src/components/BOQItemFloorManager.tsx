import React, { useState } from 'react';
import { BOQItem, BOQFloor, BOQBillingHistory } from '../types';
import { useAppContext } from '../store';
import { X, Plus, Trash2, Edit, Save, CheckCircle, Clock, FileText, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BOQItemFloorManagerProps {
  item: BOQItem;
  onClose: () => void;
  onUpdate: (updatedItem: BOQItem) => void;
  isReadOnly?: boolean;
}

export const BOQItemFloorManager: React.FC<BOQItemFloorManagerProps> = ({ item, onClose, onUpdate, isReadOnly }) => {
  const { billings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'details' | 'floors' | 'execution' | 'billing' | 'reports'>('floors');
  const [localItem, setLocalItem] = useState<BOQItem>({ ...item, floors: item.floors || [], billingHistory: item.billingHistory || [] });

  const [floorName, setFloorName] = useState('');
  const [actualQty, setActualQty] = useState(0);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);

  const handleSaveFloor = () => {
    if (!floorName.trim() || actualQty <= 0) return;
    let newFloors = [...(localItem.floors || [])];
    if (editingFloorId) {
      newFloors = newFloors.map(f => f.id === editingFloorId ? { ...f, floorName, actualQuantity: actualQty } : f);
    } else {
      newFloors.push({
        id: uuidv4(),
        floorName,
        actualQuantity: actualQty,
        executedQuantity: 0,
        billedQuantity: 0,
      });
    }
    const updated = { ...localItem, floors: newFloors };
    setLocalItem(updated);
    onUpdate(updated);
    setFloorName('');
    setActualQty(0);
    setEditingFloorId(null);
  };

  const handleDeleteFloor = (id: string) => {
    const f = localItem.floors?.find(x => x.id === id);
    if (f && (f.executedQuantity > 0 || f.billedQuantity > 0)) {
      alert('Cannot delete a floor that has already been executed or billed.');
      return;
    }
    const updated = { ...localItem, floors: localItem.floors?.filter(f => f.id !== id) };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const handleEditFloor = (f: BOQFloor) => {
    setFloorName(f.floorName);
    setActualQty(f.actualQuantity);
    setEditingFloorId(f.id);
  };

  const handleUpdateExecution = (floorId: string, newExecutedQty: number) => {
    const floor = localItem.floors?.find(f => f.id === floorId);
    if (!floor) return;
    if (newExecutedQty < floor.billedQuantity) {
      alert('Executed quantity cannot be less than already billed quantity.');
      return;
    }
    if (newExecutedQty > floor.actualQuantity) {
      alert('Executed quantity cannot exceed actual quantity. Use BOQ variations for extra work.');
      return;
    }
    const newFloors = localItem.floors?.map(f => f.id === floorId ? { ...f, executedQuantity: newExecutedQty } : f);
    
    // Total executed is the sum of all floors executed
    const totalExecuted = newFloors?.reduce((s, f) => s + (f.executedQuantity || 0), 0) || 0;
    
    const updated = { ...localItem, floors: newFloors, executedQuantity: totalExecuted };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const floors = localItem.floors || [];
  const billingHistory: BOQBillingHistory[] = billings.flatMap(b => (b.measurementItems || []).filter(mi => mi.boqItemId === item.id).map(mi => ({
    id: mi.id,
    billId: b.id,
    billNo: b.billNo,
    billDate: b.certifyDate,
    floorId: mi.floorId || '',
    floorName: localItem.floors?.find(f => f.id === mi.floorId)?.floorName || 'Unknown Floor',
    billedQty: mi.qtyExecuted || 0,
    rate: mi.rate,
    amount: mi.amount,
    status: 'Certified'
  })));

  const totalActual = floors.reduce((s, f) => s + (f.actualQuantity || 0), 0);
  const totalExecuted = floors.reduce((s, f) => s + (f.executedQuantity || 0), 0);
  const totalBilled = floors.reduce((s, f) => s + (f.billedQuantity || 0), 0);
  
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-5xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              🏗️ BOQ Item Management: {localItem.itemCode}
            </h2>
            <p className="text-slate-500 text-xs mt-1">{localItem.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">×</button>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('details')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${activeTab === 'details' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <FileText size={14} /> BOQ Details
          </button>
          <button onClick={() => setActiveTab('floors')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${activeTab === 'floors' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Plus size={14} /> Floor-Wise Definition
          </button>
          <button onClick={() => setActiveTab('execution')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${activeTab === 'execution' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <ArrowLeftRight size={14} /> Execution Tracking
          </button>
          <button onClick={() => setActiveTab('billing')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${activeTab === 'billing' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <CheckCircle size={14} /> Billing History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
           {activeTab === 'details' && (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
                 <div className="text-xs text-slate-500 uppercase font-semibold">BOQ Quantity</div>
                 <div className="text-lg font-bold text-slate-800">{localItem.boqQuantity.toLocaleString('en-IN')} {localItem.unit}</div>
               </div>
               <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
                 <div className="text-xs text-slate-500 uppercase font-semibold">BOQ Rate</div>
                 <div className="text-lg font-bold text-slate-800">₹{localItem.boqRate.toLocaleString('en-IN')}</div>
               </div>
               <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
                 <div className="text-xs text-slate-500 uppercase font-semibold">BOQ Amount</div>
                 <div className="text-lg font-bold text-slate-800">₹{localItem.boqAmount.toLocaleString('en-IN')}</div>
               </div>
               <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
                 <div className="text-xs text-slate-500 uppercase font-semibold">Total Floor Allocated</div>
                 <div className={`text-lg font-bold ${totalActual > localItem.boqQuantity ? 'text-red-600' : 'text-blue-600'}`}>{totalActual.toLocaleString('en-IN')} {localItem.unit}</div>
               </div>
             </div>
           )}

           {activeTab === 'floors' && (
             <div className="space-y-4">
               {!isReadOnly && (
                 <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex items-end gap-3">
                   <div className="flex-1">
                     <label className="block text-[10px] font-bold text-slate-600 mb-1">Floor / Level Name</label>
                     <input type="text" value={floorName} onChange={e => setFloorName(e.target.value)} className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none" placeholder="e.g. Ground Floor, 1st Floor" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-[10px] font-bold text-slate-600 mb-1">Actual Area / Quantity ({localItem.unit})</label>
                     <input type="number" value={actualQty || ''} onChange={e => setActualQty(Number(e.target.value))} className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none" placeholder="Quantity" />
                   </div>
                   <button onClick={handleSaveFloor} className="bg-blue-600 text-white font-bold px-4 py-1.5 rounded hover:bg-blue-700 flex items-center gap-1 transition-colors">
                     {editingFloorId ? <Save size={14} /> : <Plus size={14} />}
                     {editingFloorId ? 'Update' : 'Add Floor'}
                   </button>
                   {editingFloorId && (
                     <button onClick={() => { setEditingFloorId(null); setFloorName(''); setActualQty(0); }} className="bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded hover:bg-slate-300">Cancel</button>
                   )}
                 </div>
               )}

               <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                     <tr>
                       <th className="px-4 py-3">Floor / Level</th>
                       <th className="px-4 py-3 text-right">Actual Qty</th>
                       <th className="px-4 py-3 text-right">Executed</th>
                       <th className="px-4 py-3 text-right">Billed</th>
                       <th className="px-4 py-3 text-right">Bal to Bill</th>
                       <th className="px-4 py-3 text-right">Balance Amt</th>
                       {!isReadOnly && <th className="px-4 py-3 text-right">Actions</th>}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {floors.map(f => {
                       const balToBill = f.executedQuantity - f.billedQuantity;
                       const balAmt = balToBill * localItem.boqRate;
                       return (
                         <tr key={f.id} className="hover:bg-slate-50/50">
                           <td className="px-4 py-2 font-bold text-slate-800">{f.floorName}</td>
                           <td className="px-4 py-2 font-mono text-right text-blue-700 font-bold">{f.actualQuantity.toLocaleString('en-IN')}</td>
                           <td className="px-4 py-2 font-mono text-right text-emerald-600 font-bold">{f.executedQuantity.toLocaleString('en-IN')}</td>
                           <td className="px-4 py-2 font-mono text-right text-purple-600 font-bold">{f.billedQuantity.toLocaleString('en-IN')}</td>
                           <td className="px-4 py-2 font-mono text-right text-amber-600 font-bold">{balToBill.toLocaleString('en-IN')}</td>
                           <td className="px-4 py-2 font-mono text-right font-bold">₹{balAmt.toLocaleString('en-IN')}</td>
                           {!isReadOnly && (
                             <td className="px-4 py-2 text-right">
                               <div className="flex justify-end gap-1">
                                 <button onClick={() => handleEditFloor(f)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={12} /></button>
                                 <button onClick={() => handleDeleteFloor(f.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                               </div>
                             </td>
                           )}
                         </tr>
                       );
                     })}
                     {floors.length > 0 && (
                       <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                         <td className="px-4 py-3">TOTAL FLOOR ALLOCATION</td>
                         <td className="px-4 py-3 text-right text-blue-700">{totalActual.toLocaleString('en-IN')}</td>
                         <td className="px-4 py-3 text-right text-emerald-600">{totalExecuted.toLocaleString('en-IN')}</td>
                         <td className="px-4 py-3 text-right text-purple-600">{totalBilled.toLocaleString('en-IN')}</td>
                         <td className="px-4 py-3 text-right text-amber-600">{(totalExecuted - totalBilled).toLocaleString('en-IN')}</td>
                         <td className="px-4 py-3 text-right">₹{((totalExecuted - totalBilled) * localItem.boqRate).toLocaleString('en-IN')}</td>
                         {!isReadOnly && <td></td>}
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           )}

           {activeTab === 'execution' && (
             <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden p-4 space-y-4">
                <p className="text-xs text-slate-500 mb-2">Update executed quantities for each floor. This drives the actual site progress independent of billing.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="px-4 py-2">Floor / Level</th>
                        <th className="px-4 py-2 text-right">Actual Area</th>
                        <th className="px-4 py-2 text-right">Previously Billed</th>
                        <th className="px-4 py-2 text-right">Update Execution</th>
                        <th className="px-4 py-2 text-right">Execution %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {floors.map(f => {
                        const pct = f.actualQuantity > 0 ? (f.executedQuantity / f.actualQuantity) * 100 : 0;
                        return (
                          <tr key={f.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-800">{f.floorName}</td>
                            <td className="px-4 py-3 font-mono text-right text-slate-600">{f.actualQuantity.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 font-mono text-right text-slate-500">{f.billedQuantity.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-right">
                              {isReadOnly ? (
                                <span className="font-bold text-emerald-600">{f.executedQuantity.toLocaleString('en-IN')}</span>
                              ) : (
                                <input 
                                  type="number" 
                                  className="border border-slate-300 rounded px-2 py-1 w-24 text-right font-bold text-emerald-700 outline-none focus:border-emerald-500"
                                  value={f.executedQuantity || ''}
                                  onChange={e => handleUpdateExecution(f.id, Number(e.target.value))}
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pct === 100 ? 'bg-emerald-100 text-emerald-700' : pct > 100 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
           )}

           {activeTab === 'billing' && (
             <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="px-4 py-3">Bill No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Floor</th>
                      <th className="px-4 py-3 text-right">Billed Qty</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">No bills have been posted against this BOQ item.</td>
                      </tr>
                    ) : (
                      billingHistory.map(h => (
                        <tr key={h.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-bold text-blue-600">{h.billNo}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">{h.billDate}</td>
                          <td className="px-4 py-2 font-semibold text-slate-800">{h.floorName}</td>
                          <td className="px-4 py-2 font-mono text-right font-bold text-purple-700">{h.billedQty.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 font-mono text-right text-slate-600">₹{h.rate.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 font-mono text-right font-bold text-slate-900">₹{h.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-center">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{h.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
           )}

           {activeTab === 'reports' && (
             <div className="bg-white rounded shadow-sm border border-slate-200 p-8 space-y-4 text-center text-slate-500 italic">
               <TrendingUp size={32} className="mx-auto mb-2 text-slate-300" />
               <p>Advanced floor-wise analytics and PDF execution reports for this BOQ item will appear here.</p>
               <button onClick={() => alert('Printing floor-wise execution summary...')} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded text-xs not-italic cursor-pointer">
                 Print Floor-Wise Execution Summary
               </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
