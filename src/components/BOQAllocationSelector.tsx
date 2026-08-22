import React, { useState } from 'react';
import { BOQ, BOQItem, BOQFloor, MeasurementItem } from '../types';
import { X, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BOQAllocationSelectorProps {
  projectId: string;
  boqs: BOQ[];
  onSelect: (item: MeasurementItem) => void;
  onClose: () => void;
}

export const BOQAllocationSelector: React.FC<BOQAllocationSelectorProps> = ({ projectId, boqs, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  
  const activeBoqs = boqs.filter(b => b.projectId === projectId && b.status === 'Approved');
  const items = activeBoqs.flatMap(b => b.items || []);
  const filteredItems = items.filter(i => 
    i.itemCode.toLowerCase().includes(search.toLowerCase()) || 
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[11px] relative z-10">
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800">📋 Allocate BOQ Item to Bill</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">×</button>
        </div>
        
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
             <Search size={14} className="absolute left-2 top-2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search BOQ items..." 
               value={search} 
               onChange={e => setSearch(e.target.value)}
               className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:border-blue-500 outline-none"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 italic">No approved BOQ items found for this project.</div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                <div className="bg-blue-50/50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 mr-2">{item.itemCode}</span>
                    <span className="text-slate-600 font-medium">{item.description}</span>
                  </div>
                  <div className="font-bold text-blue-700">₹{item.boqRate.toLocaleString('en-IN')} / {item.unit}</div>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[9px] font-semibold">
                    <tr>
                      <th className="px-3 py-2">Floor / Level</th>
                      <th className="px-3 py-2 text-right">Executed</th>
                      <th className="px-3 py-2 text-right">Prev Billed</th>
                      <th className="px-3 py-2 text-right">Available for Bill</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!item.floors || item.floors.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-slate-400 italic text-[10px]">
                          No floor-wise breakdown defined for this item. Please define floors in BOQ Manager first.
                        </td>
                      </tr>
                    ) : (
                      item.floors.map(floor => {
                        const available = floor.executedQuantity - floor.billedQuantity;
                        return (
                          <tr key={floor.id} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-bold text-slate-700">{floor.floorName}</td>
                            <td className="px-3 py-1.5 font-mono text-right text-emerald-600">{floor.executedQuantity.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-1.5 font-mono text-right text-purple-600">{floor.billedQuantity.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-1.5 font-mono text-right text-amber-600 font-bold">{available.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-1.5 text-right">
                              <button 
                                disabled={available <= 0}
                                onClick={() => {
                                  onSelect({
                                    id: uuidv4(),
                                    boqItemId: item.id,
                                    floorId: floor.id,
                                    description: `${item.itemCode}: ${item.description} - ${floor.floorName}`,
                                    qtyExecuted: available > 0 ? available : 0, // default to max available
                                    unit: item.unit,
                                    rate: item.boqRate,
                                    amount: (available > 0 ? available : 0) * item.boqRate,
                                    prevQty: floor.billedQuantity,
                                    cumulativeQty: floor.billedQuantity + (available > 0 ? available : 0),
                                    prevAmount: floor.billedQuantity * item.boqRate,
                                    cumulativeAmount: (floor.billedQuantity + (available > 0 ? available : 0)) * item.boqRate
                                  });
                                  onClose();
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${available > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
