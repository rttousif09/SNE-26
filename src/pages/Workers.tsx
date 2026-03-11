import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Workers: React.FC = () => {
  const { workers, projects, addWorker, updateWorker, deleteWorker } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    serialNo: '', workerId: '', name: '', projectId: '', designation: '', joiningDate: ''
  });

  const handleEdit = (worker: any) => {
    setFormData({
      serialNo: worker.serialNo,
      workerId: worker.workerId,
      name: worker.name,
      projectId: worker.projectId,
      designation: worker.designation,
      joiningDate: worker.joiningDate
    });
    setEditingId(worker.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ serialNo: '', workerId: '', name: '', projectId: '', designation: '', joiningDate: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateWorker(editingId, { ...formData });
    } else {
      addWorker({ ...formData });
    }
    handleCancel();
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const workersPerSite = projects.map(p => ({
    name: p.name,
    count: workers.filter(w => w.projectId === p.id).length
  }));

  return (
    <div className="text-[11px]">
      <div className="flex items-center space-x-2 mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1">
        <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1">
          {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
          <span>{isAdding ? 'Cancel' : 'New Worker'}</span>
        </button>
      </div>

      <div className="flex space-x-2 mb-4">
        {workersPerSite.map((site, idx) => (
          <div key={idx} className="sap-panel px-2 py-1 flex space-x-2">
            <span className="font-semibold">{site.name}:</span>
            <span>{site.count}</span>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="sap-panel p-2 mb-4">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Worker' : 'Create New Worker'}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-2xl">
            <div className="flex items-center">
              <label className="w-32">Serial No:</label>
              <input required type="text" className="sap-input flex-1" value={formData.serialNo} onChange={e => setFormData({...formData, serialNo: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Worker ID:</label>
              <input required type="text" className="sap-input flex-1" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Name:</label>
              <input required type="text" className="sap-input flex-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Project:</label>
              <select required className="sap-input flex-1" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Designation:</label>
              <input required type="text" className="sap-input flex-1" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Joining Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
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
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Worker ID</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Name</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Designation</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Joining Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((worker) => (
            <tr key={worker.id} className="hover:bg-[#e6f2ff] cursor-default">
              <td className="border border-[#8c9ba8] px-2 py-1">{worker.serialNo}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{worker.workerId}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{worker.name}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{getProjectName(worker.projectId)}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{worker.designation}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{worker.joiningDate}</td>
              <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                <button onClick={() => handleEdit(worker)} className="text-blue-600 hover:text-blue-800" title="Edit">
                  <Edit size={14} />
                </button>
                <button onClick={() => setDeleteId(worker.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {workers.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No workers found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Worker"
        message="Are you sure you want to delete this worker? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteWorker(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
