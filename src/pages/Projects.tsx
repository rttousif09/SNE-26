import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Projects: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', startDate: '', completionDate: '', address: '', budget: ''
  });

  const handleEdit = (project: any) => {
    setFormData({
      name: project.name,
      startDate: project.startDate,
      completionDate: project.completionDate || '',
      address: project.address,
      budget: project.budget.toString()
    });
    setEditingId(project.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', startDate: '', completionDate: '', address: '', budget: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProject(editingId, {
        name: formData.name, startDate: formData.startDate, completionDate: formData.completionDate, address: formData.address, budget: Number(formData.budget)
      });
    } else {
      addProject({
        name: formData.name, startDate: formData.startDate, completionDate: formData.completionDate, address: formData.address, budget: Number(formData.budget)
      });
    }
    handleCancel();
  };

  return (
    <div className="text-[11px]">
      <div className="flex items-center space-x-2 mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1">
        <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1">
          {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
          <span>{isAdding ? 'Cancel' : 'New Project'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="sap-panel p-2 mb-4">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Project' : 'Create New Project'}
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col space-y-2 max-w-md">
            <div className="flex items-center">
              <label className="w-32">Project Name:</label>
              <input required type="text" className="sap-input flex-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Start Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Completion Date:</label>
              <input type="date" className="sap-input flex-1" value={formData.completionDate} onChange={e => setFormData({...formData, completionDate: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Address:</label>
              <input required type="text" className="sap-input flex-1" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Budget (INR):</label>
              <input required type="number" className="sap-input flex-1" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
            </div>
            <div className="flex justify-end pt-2 space-x-2">
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
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-8"></th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project Name</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Start Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Completion Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Address</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Budget</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, idx) => (
            <tr key={project.id} className="hover:bg-[#e6f2ff] cursor-default">
              <td className="border border-[#8c9ba8] px-2 py-1 text-center text-gray-500 bg-[#eef2f6] w-8">{idx + 1}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.name}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.startDate}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.completionDate || '-'}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.address}</td>
              <td className="border border-[#8c9ba8] px-2 py-1 text-right">{project.budget.toLocaleString()}</td>
              <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                <button onClick={() => handleEdit(project)} className="text-blue-600 hover:text-blue-800" title="Edit">
                  <Edit size={14} />
                </button>
                <button onClick={() => setDeleteId(project.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No projects found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteProject(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
