import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Save, Edit, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Advance: React.FC = () => {
  const { advances, projects, workers, addAdvance, updateAdvance, deleteAdvance } = useAppContext();
  const [selectedProject, setSelectedProject] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    workerId: '', amount: '', paidBy: '', remarks: '', date: ''
  });

  const handleEdit = (advance: any) => {
    setFormData({
      workerId: advance.workerId,
      amount: advance.amount.toString(),
      paidBy: advance.paidBy,
      remarks: advance.remarks || '',
      date: advance.date
    });
    setEditingId(advance.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ workerId: '', amount: '', paidBy: '', remarks: '', date: '' });
  };

  const projectWorkers = useMemo(() => {
    if (!selectedProject) return [];
    return workers.filter(w => w.projectId === selectedProject);
  }, [selectedProject, workers]);

  const filteredAdvances = useMemo(() => {
    if (!selectedProject) return [];
    return advances.filter(a => a.projectId === selectedProject);
  }, [selectedProject, advances]);

  const totalAdvance = useMemo(() => {
    return filteredAdvances.reduce((sum, a) => sum + a.amount, 0);
  }, [filteredAdvances]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    if (editingId) {
      updateAdvance(editingId, {
        projectId: selectedProject,
        workerId: formData.workerId,
        amount: Number(formData.amount),
        paidBy: formData.paidBy,
        remarks: formData.remarks,
        date: formData.date
      });
    } else {
      addAdvance({
        projectId: selectedProject,
        workerId: formData.workerId,
        amount: Number(formData.amount),
        paidBy: formData.paidBy,
        remarks: formData.remarks,
        date: formData.date
      });
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
            {editingId ? 'Edit Advance Details' : 'Record Advance'}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-2xl">
            <div className="flex items-center">
              <label className="w-32">Worker:</label>
              <select required className="sap-input flex-1" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}>
                <option value="">Select Worker</option>
                {projectWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Amount:</label>
              <input required type="number" className="sap-input flex-1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Paid By:</label>
              <input required type="text" className="sap-input flex-1" value={formData.paidBy} onChange={e => setFormData({...formData, paidBy: e.target.value})} />
            </div>
            <div className="flex items-center col-span-2">
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

      {selectedProject && (
        <>
          <div className="mb-2 sap-panel p-1 inline-flex space-x-2">
            <span className="font-semibold">Total Project Advance:</span>
            <span className="font-bold text-red-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalAdvance)}</span>
          </div>

          <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
            <thead className="sap-header">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Sr No</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">ID No</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Name</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Date</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Paid By</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Remarks</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Amount</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvances.map((advance) => {
                const worker = getWorkerDetails(advance.workerId);
                return (
                  <tr key={advance.id} className="hover:bg-[#e6f2ff] cursor-default">
                    <td className="border border-[#8c9ba8] px-2 py-1">{worker.srNo}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{worker.idNo}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{worker.name}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{advance.date}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{advance.paidBy}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{advance.remarks}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(advance.amount)}
                    </td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      <button onClick={() => handleEdit(advance)} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setDeleteId(advance.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAdvances.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No advance records found for this project.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Advance"
        message="Are you sure you want to delete this advance record? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteAdvance(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
