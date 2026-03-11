import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const ClientPayment: React.FC = () => {
  const { clientPayments, billings, projects, addClientPayment, updateClientPayment, deleteClientPayment } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    projectId: '', amountReceived: '', date: '', remarks: ''
  });

  const handleEdit = (payment: any) => {
    setFormData({
      projectId: payment.projectId,
      amountReceived: payment.amountReceived.toString(),
      date: payment.date,
      remarks: payment.remarks || ''
    });
    setEditingId(payment.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ projectId: '', amountReceived: '', date: '', remarks: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClientPayment(editingId, {
        ...formData,
        amountReceived: Number(formData.amountReceived)
      });
    } else {
      addClientPayment({
        ...formData,
        amountReceived: Number(formData.amountReceived)
      });
    }
    handleCancel();
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const projectSummary = useMemo(() => {
    return projects.map(p => {
      const totalBilled = billings.filter(b => b.projectId === p.id).reduce((sum, b) => sum + b.amount, 0);
      const totalReceived = clientPayments.filter(cp => cp.projectId === p.id).reduce((sum, cp) => sum + cp.amountReceived, 0);
      const balance = totalBilled - totalReceived;
      return { id: p.id, name: p.name, totalBilled, totalReceived, balance };
    });
  }, [projects, billings, clientPayments]);

  return (
    <div className="text-[11px]">
      <div className="flex items-center space-x-2 mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1">
        <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1">
          {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
          <span>{isAdding ? 'Cancel' : 'Record Payment'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="sap-panel p-2 mb-4">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Payment Details' : 'New Payment Received'}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-2xl">
            <div className="flex items-center">
              <label className="w-32">Project:</label>
              <select required className="sap-input flex-1" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Amount Received:</label>
              <input required type="number" className="sap-input flex-1" value={formData.amountReceived} onChange={e => setFormData({...formData, amountReceived: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Remarks:</label>
              <input type="text" className="sap-input flex-1" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
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

      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="font-semibold mb-1 text-[#0056b3]">Project Payment Summary</div>
          <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
            <thead className="sap-header">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Total Billed</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Total Received</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {projectSummary.map((summary) => (
                <tr key={summary.id} className="hover:bg-[#e6f2ff] cursor-default">
                  <td className="border border-[#8c9ba8] px-2 py-1">{summary.name}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.totalBilled)}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.totalReceived)}
                  </td>
                  <td className={`border border-[#8c9ba8] px-2 py-1 text-right ${summary.balance > 0 ? 'text-red-700' : ''}`}>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1">
          <div className="font-semibold mb-1 text-[#0056b3]">Payment History</div>
          <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
            <thead className="sap-header">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Date</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Remarks</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Amount Received</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clientPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#e6f2ff] cursor-default">
                  <td className="border border-[#8c9ba8] px-2 py-1">{payment.date}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{getProjectName(payment.projectId)}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{payment.remarks}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amountReceived)}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                    <button onClick={() => handleEdit(payment)} className="text-blue-600 hover:text-blue-800" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setDeleteId(payment.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {clientPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No payment history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteClientPayment(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
