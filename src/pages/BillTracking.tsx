import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { FileText, Save, Plus, Trash2, Settings } from 'lucide-react';
import { ClientFloorBill } from '../types';

export const BillTracking: React.FC = () => {
  const { projects, clientFloorBills, addClientFloorBill, updateClientFloorBill, deleteClientFloorBill } = useAppContext();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const currentProject = projects.find(p => p.id === selectedProjectId);
  
  const projectBills = useMemo(() => {
    return clientFloorBills?.filter(b => b.projectId === selectedProjectId) || [];
  }, [clientFloorBills, selectedProjectId]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClientFloorBill>>({});

  const handleEdit = (bill: ClientFloorBill) => {
    setEditingId(bill.id);
    setEditForm({ ...bill });
  };

  const handleSave = async (id: string) => {
    await updateClientFloorBill(id, editForm);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!selectedProjectId) return;
    const newBill: Omit<ClientFloorBill, 'id'> = {
      projectId: selectedProjectId,
      srNo: (projectBills.length + 1).toString(),
      floor: '',
      unit: 'Sqft',
      builtUpArea: 0,
      workdoneArea: 0,
      raBills: {},
      totalArea: 0,
      totalAmount: 0,
      rate: 0
    };
    await addClientFloorBill(newBill);
  };

  const totalBuiltUpArea = projectBills.reduce((acc, curr) => acc + (Number(curr.builtUpArea) || 0), 0);
  const totalWorkdoneArea = projectBills.reduce((acc, curr) => acc + (Number(curr.workdoneArea) || 0), 0);
  
  // Calculate RA totals
  const allRaKeys = Array.from(new Set(projectBills.flatMap(b => Object.keys(b.raBills || {}))));
  const raKeys = allRaKeys.length > 0 ? allRaKeys.sort() : ['RA-01']; // default at least one
  
  const handleAddRAColumn = async () => {
    const nextRaNumber = raKeys.length > 0 ? parseInt(raKeys[raKeys.length - 1].replace('RA-', '')) + 1 : 1;
    const newRaKey = `RA-${nextRaNumber.toString().padStart(2, '0')}`;
    
    // Add this RA column to all existing rows with 0
    for (const bill of projectBills) {
        const updatedRaBills = { ...bill.raBills, [newRaKey]: 0 };
        await updateClientFloorBill(bill.id, { raBills: updatedRaBills });
    }
    if (projectBills.length === 0) {
        // Just force a re-render or let it be handled later
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-sap-blue-val)] flex items-center">
          <FileText className="mr-2" /> Floor Abstract (Client Bill Tracking)
        </h1>
        <div className="flex space-x-4">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="sap-input"
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProjectId && currentProject && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="sap-panel p-4 mb-6">
            <h2 className="text-xl font-bold text-center mb-2">SN ENTERPRISE</h2>
            <h3 className="text-md font-semibold text-center mb-4 border-b border-gray-300 pb-2">Floor Abstract</h3>
            <div className="flex justify-between text-sm mb-4">
              <div><span className="font-semibold">Project-</span> {currentProject.name}</div>
              <div><span className="font-semibold">Location-</span> {currentProject.address}</div>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <div><span className="font-semibold">Client-</span> {currentProject.clientName || 'N/A'}</div>
              <div><span className="font-semibold">WO.NO-</span> {currentProject.workOrderNo || 'N/A'}</div>
            </div>

            <div className="overflow-x-auto mb-8">
              <div className="flex justify-between items-center mb-2">
                 <h4 className="font-bold">As Built-up Work order</h4>
                 <button onClick={handleAddRAColumn} className="sap-btn flex items-center text-xs"><Plus size={14} className="mr-1" /> Add RA Column</button>
              </div>
              <table className="sap-table min-w-full text-sm border-collapse border border-gray-300 text-center">
                <thead className="bg-[var(--color-sap-bg-val)]">
                  <tr>
                    <th className="border border-gray-300 p-2">Sr.No</th>
                    <th className="border border-gray-300 p-2 text-left">Floor</th>
                    <th className="border border-gray-300 p-2">Unit</th>
                    <th className="border border-gray-300 p-2">Built-Up Area</th>
                    <th className="border border-gray-300 p-2">Workdone Area</th>
                    {raKeys.map(ra => (
                      <th key={ra} className="border border-gray-300 p-2">{ra}</th>
                    ))}
                    <th className="border border-gray-300 p-2 bg-gray-200">Total Billed</th>
                    <th className="border border-gray-300 p-2 bg-gray-200">Balance</th>
                    <th className="border border-gray-300 p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectBills.map((bill) => {
                    const isEditing = editingId === bill.id;
                    const b = isEditing ? editForm : bill;
                    const totalBilled = raKeys.reduce((sum, key) => sum + (Number(b.raBills?.[key]) || 0), 0);
                    const balance = (Number(b.builtUpArea) || 0) - totalBilled;
                    
                    return (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">
                          {isEditing ? <input type="text" className="w-full sap-input p-1" value={b.srNo || ''} onChange={e => setEditForm({...b, srNo: e.target.value})} /> : bill.srNo}
                        </td>
                        <td className="border border-gray-300 p-2 text-left">
                          {isEditing ? <input type="text" className="w-full sap-input p-1" value={b.floor || ''} onChange={e => setEditForm({...b, floor: e.target.value})} /> : bill.floor}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {isEditing ? <input type="text" className="w-full sap-input p-1" value={b.unit || ''} onChange={e => setEditForm({...b, unit: e.target.value})} /> : bill.unit}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {isEditing ? <input type="number" className="w-full sap-input p-1" value={b.builtUpArea || ''} onChange={e => setEditForm({...b, builtUpArea: Number(e.target.value)})} /> : bill.builtUpArea}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {isEditing ? <input type="number" className="w-full sap-input p-1" value={b.workdoneArea || ''} onChange={e => setEditForm({...b, workdoneArea: Number(e.target.value)})} /> : bill.workdoneArea}
                        </td>
                        {raKeys.map(ra => (
                          <td key={ra} className="border border-gray-300 p-2">
                            {isEditing ? (
                              <input type="number" className="w-full sap-input p-1" value={b.raBills?.[ra] || ''} onChange={e => setEditForm({...b, raBills: {...(b.raBills || {}), [ra]: Number(e.target.value)}})} />
                            ) : bill.raBills?.[ra] || ''}
                          </td>
                        ))}
                        <td className="border border-gray-300 p-2 font-semibold bg-gray-50">{totalBilled.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2 font-semibold bg-gray-50">{balance.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2">
                          {isEditing ? (
                            <button onClick={() => handleSave(bill.id)} className="text-green-600"><Save size={16} /></button>
                          ) : (
                            <div className="flex space-x-2 justify-center">
                              <button onClick={() => handleEdit(bill)} className="text-blue-600">Edit</button>
                              <button onClick={() => deleteClientFloorBill(bill.id)} className="text-red-600"><Trash2 size={16} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-100">
                    <td colSpan={3} className="border border-gray-300 p-2 text-right">Total</td>
                    <td className="border border-gray-300 p-2">{totalBuiltUpArea.toFixed(3)}</td>
                    <td className="border border-gray-300 p-2">{totalWorkdoneArea.toFixed(3)}</td>
                    <td colSpan={raKeys.length + 3} className="border border-gray-300 p-2"></td>
                  </tr>
                </tfoot>
              </table>
              <button onClick={handleAdd} className="mt-4 sap-btn flex items-center text-xs"><Plus size={14} className="mr-1" /> Add Floor</button>
            </div>

            <div className="overflow-x-auto mt-8 border-t border-gray-300 pt-8">
              <h4 className="font-bold mb-2">Financial Abstract</h4>
              <table className="sap-table min-w-full text-sm border-collapse border border-gray-300 text-center">
                <thead className="bg-[var(--color-sap-bg-val)]">
                  <tr>
                    <th className="border border-gray-300 p-2">Sr.No</th>
                    <th className="border border-gray-300 p-2 text-left">Floor</th>
                    <th className="border border-gray-300 p-2">Rate (₹)</th>
                    <th className="border border-gray-300 p-2">Total Area (Sqft)</th>
                    <th className="border border-gray-300 p-2">Total Amount</th>
                    <th className="border border-gray-300 p-2">Billed Area</th>
                    <th className="border border-gray-300 p-2">Paid Amount</th>
                    <th className="border border-gray-300 p-2">Balance Area</th>
                    <th className="border border-gray-300 p-2">Balance Amount</th>
                    <th className="border border-gray-300 p-2">Percentage(%)</th>
                  </tr>
                </thead>
                <tbody>
                  {projectBills.map(bill => {
                    const isEditing = editingId === bill.id;
                    const b = isEditing ? editForm : bill;
                    const totalArea = Number(b.builtUpArea) || 0;
                    const rate = Number(b.rate) || 0;
                    const totalAmount = totalArea * rate;
                    const billedArea = raKeys.reduce((sum, key) => sum + (Number(b.raBills?.[key]) || 0), 0);
                    const paidAmount = billedArea * rate;
                    const balanceArea = totalArea - billedArea;
                    const balanceAmount = balanceArea * rate;
                    const percentage = totalArea > 0 ? (billedArea / totalArea) * 100 : 0;

                    return (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">{bill.srNo}</td>
                        <td className="border border-gray-300 p-2 text-left">{bill.floor}</td>
                        <td className="border border-gray-300 p-2">
                          {isEditing ? <input type="number" className="w-full sap-input p-1" value={b.rate || ''} onChange={e => setEditForm({...b, rate: Number(e.target.value)})} /> : bill.rate || 0}
                        </td>
                        <td className="border border-gray-300 p-2">{totalArea.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2">{totalAmount.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2">{billedArea.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2">{paidAmount.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2">{balanceArea.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2">{balanceAmount.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2">{Math.round(percentage)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
          </div>
        </motion.div>
      )}
      {!selectedProjectId && (
        <div className="text-center text-gray-500 mt-10">
          Please select a project to view the Floor Abstract Client Billing Tracking.
        </div>
      )}
    </div>
  );
};
