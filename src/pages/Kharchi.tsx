import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Save, Edit, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Kharchi: React.FC = () => {
  const { kharchis, projects, workers, addKharchi, updateKharchi, deleteKharchi } = useAppContext();
  const [selectedProject, setSelectedProject] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    workerId: '', date: '', amount: ''
  });

  const handleEdit = (kharchi: any) => {
    setFormData({
      workerId: kharchi.workerId,
      date: kharchi.date,
      amount: kharchi.amount.toString()
    });
    setEditingId(kharchi.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ workerId: '', date: '', amount: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    if (editingId) {
      updateKharchi(editingId, {
        projectId: selectedProject,
        workerId: formData.workerId,
        date: formData.date,
        amount: Number(formData.amount)
      });
    } else {
      addKharchi({
        projectId: selectedProject,
        workerId: formData.workerId,
        date: formData.date,
        amount: Number(formData.amount)
      });
    }
    
    handleCancel();
  };

  const projectWorkers = useMemo(() => {
    if (!selectedProject) return [];
    return workers.filter(w => w.projectId === selectedProject);
  }, [selectedProject, workers]);

  const filteredKharchis = useMemo(() => {
    if (!selectedProject) return [];
    return kharchis.filter(k => k.projectId === selectedProject);
  }, [selectedProject, kharchis]);

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
            {editingId ? 'Edit Kharchi Details' : 'Record Kharchi (Pocket Money)'}
          </div>
          <form onSubmit={handleSubmit} className="flex items-end space-x-4">
            <div className="flex flex-col">
              <label className="mb-1">Worker:</label>
              <select required className="sap-input w-48" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}>
                <option value="">Select Worker</option>
                {projectWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Date (Sunday):</label>
              <input required type="date" className="sap-input w-32" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Amount:</label>
              <input required type="number" className="sap-input w-24" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="sap-btn flex items-center space-x-1 h-[22px]">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update' : 'Save'}</span>
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1 h-[22px]">
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
              <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Date</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Amount</th>
              <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredKharchis.map((kharchi) => {
              const worker = getWorkerDetails(kharchi.workerId);
              return (
                <tr key={kharchi.id} className="hover:bg-[#e6f2ff] cursor-default">
                  <td className="border border-[#8c9ba8] px-2 py-1">{worker.srNo}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{worker.idNo}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{worker.name}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{kharchi.date}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(kharchi.amount)}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                    <button onClick={() => handleEdit(kharchi)} className="text-blue-600 hover:text-blue-800" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setDeleteId(kharchi.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredKharchis.length === 0 && (
              <tr>
                <td colSpan={6} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No kharchi records found for this project.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Kharchi"
        message="Are you sure you want to delete this kharchi record? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteKharchi(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
