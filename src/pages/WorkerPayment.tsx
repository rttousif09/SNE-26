import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Save, Edit, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const WorkerPayment: React.FC = () => {
  const { workerPayments, projects, workers, kharchis, advances, addWorkerPayment, updateWorkerPayment, deleteWorkerPayment } = useAppContext();
  const [selectedProject, setSelectedProject] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    workerId: '', month: '', workAmount: '', messDeduction: '', date: ''
  });

  const handleEdit = (payment: any) => {
    setFormData({
      workerId: payment.workerId,
      month: payment.month,
      workAmount: payment.workAmount.toString(),
      messDeduction: payment.messDeduction.toString(),
      date: payment.date
    });
    setEditingId(payment.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ workerId: '', month: '', workAmount: '', messDeduction: '', date: '' });
  };

  const projectWorkers = useMemo(() => {
    if (!selectedProject) return [];
    return workers.filter(w => w.projectId === selectedProject);
  }, [selectedProject, workers]);

  const filteredPayments = useMemo(() => {
    if (!selectedProject) return [];
    return workerPayments.filter(p => p.projectId === selectedProject);
  }, [selectedProject, workerPayments]);

  // Auto-calculate deductions based on selected worker and month
  const autoCalculations = useMemo(() => {
    if (!formData.workerId || !formData.month) return { kharchi: 0, advance: 0 };
    
    // Kharchi for the selected month
    const kharchiTotal = kharchis
      .filter(k => k.workerId === formData.workerId && k.date.startsWith(formData.month))
      .reduce((sum, k) => sum + k.amount, 0);
      
    // Advance for the selected month (or total unrecovered advance, but let's do month-based for simplicity)
    const advanceTotal = advances
      .filter(a => a.workerId === formData.workerId && a.date.startsWith(formData.month))
      .reduce((sum, a) => sum + a.amount, 0);
      
    return { kharchi: kharchiTotal, advance: advanceTotal };
  }, [formData.workerId, formData.month, kharchis, advances]);

  const netPayment = useMemo(() => {
    const workAmount = Number(formData.workAmount) || 0;
    const messDeduction = Number(formData.messDeduction) || 0;
    return workAmount - messDeduction - autoCalculations.kharchi - autoCalculations.advance;
  }, [formData.workAmount, formData.messDeduction, autoCalculations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    const paymentData = {
      projectId: selectedProject,
      workerId: formData.workerId,
      month: formData.month,
      workAmount: Number(formData.workAmount),
      messDeduction: Number(formData.messDeduction),
      kharchiDeduction: autoCalculations.kharchi,
      advanceDeduction: autoCalculations.advance,
      netPayment: netPayment,
      date: formData.date
    };

    if (editingId) {
      updateWorkerPayment(editingId, paymentData);
    } else {
      addWorkerPayment(paymentData);
    }
    
    handleCancel();
  };

  const getWorkerDetails = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker ? { name: worker.name, idNo: worker.workerId, srNo: worker.serialNo } : { name: 'Unknown', idNo: '-', srNo: '-' };
  };

  return (
    <div className="text-[11px]">
      <div className="mb-4 sap-panel p-2 flex items-center space-x-2">
        <label className="font-semibold">Select Project:</label>
        <select 
          className="sap-input w-64" 
          value={selectedProject} 
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="">-- Select Project --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProject && (
        <div className="sap-panel p-2 mb-4">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Payment Details' : 'Record Worker Payment'}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-x-4 gap-y-2 max-w-4xl">
            <div className="flex items-center">
              <label className="w-32">Worker:</label>
              <select required className="sap-input flex-1" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}>
                <option value="">Select Worker</option>
                {projectWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Payment Month:</label>
              <input required type="month" className="sap-input flex-1" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Payment Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Work Amount (Gross):</label>
              <input required type="number" className="sap-input flex-1" value={formData.workAmount} onChange={e => setFormData({...formData, workAmount: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Mess Deduction:</label>
              <input required type="number" className="sap-input flex-1" value={formData.messDeduction} onChange={e => setFormData({...formData, messDeduction: e.target.value})} />
            </div>
            
            <div className="col-span-3 grid grid-cols-3 gap-4 bg-[#e6f2ff] p-2 border border-[#8c9ba8] mt-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold">Auto Kharchi Deduction:</label>
                <span className="font-mono text-red-600">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(autoCalculations.kharchi)}</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">Auto Advance Deduction:</label>
                <span className="font-mono text-red-600">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(autoCalculations.advance)}</span>
              </div>
              <div className="flex items-center justify-between bg-[#cce5ff] p-1 border border-[#99ccff]">
                <label className="font-bold text-[#0056b3]">Net Payment:</label>
                <span className="font-bold font-mono text-[#0056b3]">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netPayment)}</span>
              </div>
            </div>

            <div className="col-span-3 flex justify-end pt-2 space-x-2">
              <button type="submit" className="sap-btn flex items-center space-x-1">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update' : 'Record Payment'}</span>
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

      {selectedProject && (
        <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
          <thead className="sap-header">
            <tr>
              <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Sr No</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">ID No</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Name</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Month</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Gross</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-red-600">Mess</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-red-600">Kharchi</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-red-600">Advance</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-green-700">Net Pay</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => {
              const worker = getWorkerDetails(payment.workerId);
              return (
                <tr key={payment.id} className="hover:bg-[#e6f2ff] cursor-default">
                  <td className="border border-[#8c9ba8] px-2 py-1">{worker.srNo}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{worker.idNo}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{worker.name}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{payment.month}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right">{payment.workAmount}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600">{payment.messDeduction}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600">{payment.kharchiDeduction}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600">{payment.advanceDeduction}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-green-700">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.netPayment)}
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
              );
            })}
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={10} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No payment records found for this project.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Worker Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteWorkerPayment(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
