import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Billing: React.FC = () => {
  const { billings, projects, addBilling, updateBilling, deleteBilling } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    srNo: '', projectId: '', billNo: '', workNature: '', amount: '', month: '', certifyDate: ''
  });

  const handleEdit = (bill: any) => {
    setFormData({
      srNo: bill.srNo,
      projectId: bill.projectId,
      billNo: bill.billNo,
      workNature: bill.workNature,
      amount: bill.amount.toString(),
      month: bill.month,
      certifyDate: bill.certifyDate
    });
    setEditingId(bill.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ srNo: '', projectId: '', billNo: '', workNature: '', amount: '', month: '', certifyDate: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateBilling(editingId, {
        ...formData,
        amount: Number(formData.amount)
      });
    } else {
      addBilling({
        ...formData,
        amount: Number(formData.amount)
      });
    }
    handleCancel();
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const { totalMonthly, totalYearly } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentYear = new Date().getFullYear().toString();
    
    let monthly = 0;
    let yearly = 0;
    
    billings.forEach(b => {
      if (b.month === currentMonth) monthly += b.amount;
      if (b.month.startsWith(currentYear)) yearly += b.amount;
    });
    
    return { totalMonthly: monthly, totalYearly: yearly };
  }, [billings]);

  return (
    <div className="text-[11px]">
      <div className="flex items-center space-x-2 mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1">
        <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1">
          {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
          <span>{isAdding ? 'Cancel' : 'New Bill'}</span>
        </button>
      </div>

      <div className="flex space-x-4 mb-4">
        <div className="sap-panel px-3 py-1 flex flex-col">
          <span className="font-semibold text-gray-600">Current Month Billing</span>
          <span className="text-sm font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMonthly)}</span>
        </div>
        <div className="sap-panel px-3 py-1 flex flex-col">
          <span className="font-semibold text-gray-600">Current Year Billing</span>
          <span className="text-sm font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalYearly)}</span>
        </div>
      </div>

      {isAdding && (
        <div className="sap-panel p-2 mb-4">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Bill Details' : 'New Bill Details'}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-2xl">
            <div className="flex items-center">
              <label className="w-32">Sr No:</label>
              <input required type="text" className="sap-input flex-1" value={formData.srNo} onChange={e => setFormData({...formData, srNo: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Project:</label>
              <select required className="sap-input flex-1" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill No:</label>
              <input required type="text" className="sap-input flex-1" value={formData.billNo} onChange={e => setFormData({...formData, billNo: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Work Nature:</label>
              <input required type="text" className="sap-input flex-1" value={formData.workNature} onChange={e => setFormData({...formData, workNature: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Billing Amount:</label>
              <input required type="number" className="sap-input flex-1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Billing Month:</label>
              <input required type="month" className="sap-input flex-1" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill Certify Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.certifyDate} onChange={e => setFormData({...formData, certifyDate: e.target.value})} />
            </div>
            <div className="col-span-2 flex justify-end pt-2 space-x-2">
              <button type="submit" className="sap-btn flex items-center space-x-1">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update' : 'Save'}</span>
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1">
                  <X size={12} className="text-red-600"/>
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
        <thead className="sap-header">
          <tr>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Sr No</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Bill No</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Work Nature</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Month</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Certify Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Amount</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
          </tr>
        </thead>
        <tbody>
          {billings.map((bill) => (
            <tr key={bill.id} className="hover:bg-[#e6f2ff] cursor-default">
              <td className="border border-[#8c9ba8] px-2 py-1">{bill.srNo}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{getProjectName(bill.projectId)}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{bill.billNo}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{bill.workNature}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{bill.month}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{bill.certifyDate}</td>
              <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.amount)}
              </td>
              <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                <button onClick={() => handleEdit(bill)} className="text-blue-600 hover:text-blue-800" title="Edit">
                  <Edit size={14} />
                </button>
                <button onClick={() => setDeleteId(bill.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {billings.length === 0 && (
            <tr>
              <td colSpan={8} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No bills found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Bill"
        message="Are you sure you want to delete this bill? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteBilling(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
