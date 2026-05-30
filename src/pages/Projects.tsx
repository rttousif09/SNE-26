import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2, Search, FileText } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Projects: React.FC = () => {
  const { user, projects, addProject, updateProject, deleteProject, billings, clientPayments } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', clientName: '', startDate: '', completionDate: '', address: '', budget: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter(project => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      project.name.toLowerCase().includes(query) ||
      project.id.toLowerCase().includes(query)
    );
  });

  const handleEdit = (project: any) => {
    setFormData({
      name: project.name,
      clientName: project.clientName || '',
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
    setFormData({ name: '', clientName: '', startDate: '', completionDate: '', address: '', budget: '' });
  };

  const handleDownloadReport = (project: any) => {
    const doc = new jsPDF();
    
    // Calculate totals
    const projectBillings = billings.filter(b => b.projectId === project.id);
    const totalBillings = projectBillings.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const projectPayments = clientPayments.filter(p => p.projectId === project.id);
    const totalPayments = projectPayments.reduce((sum, p) => sum + Number(p.amountReceived || 0), 0);

    const outstandingBalance = totalBillings - totalPayments;

    doc.setFontSize(18);
    doc.text('Project Health Report', 14, 22);

    doc.setFontSize(11);
    doc.text(`Project Name: ${project.name}`, 14, 32);
    doc.text(`Client Name: ${project.clientName || 'N/A'}`, 14, 38);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 44);

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Amount (INR)']],
      body: [
        ['Total Billings', `Rs. ${totalBillings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Payments Received', `Rs. ${totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Outstanding Balance', `Rs. ${outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 86, 179] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 50;
    
    if (projectBillings.length > 0) {
      doc.setFontSize(14);
      doc.text('Billings Breakdown', 14, finalY + 15);
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Bill No', 'Date / Month', 'Nature of Work', 'Amount']],
        body: projectBillings.map(b => [b.billNo, b.month, b.workNature, `Rs. ${Number(b.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]),
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100] }
      });
    }
    
    const finalY2 = (doc as any).lastAutoTable.finalY || finalY + 20;

    if (projectPayments.length > 0) {
      doc.setFontSize(14);
      doc.text('Payments Breakdown', 14, finalY2 + 15);
      autoTable(doc, {
        startY: finalY2 + 20,
        head: [['Date', 'Remarks', 'Amount Received']],
        body: projectPayments.map(p => [p.date, p.remarks || '-', `Rs. ${Number(p.amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]),
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100] }
      });
    }

    doc.save(`${project.name.replace(/\s+/g, '_')}_Health_Report.pdf`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProject(editingId, {
        name: formData.name, clientName: formData.clientName, startDate: formData.startDate, completionDate: formData.completionDate, address: formData.address, budget: Number(formData.budget)
      });
    } else {
      addProject({
        name: formData.name, clientName: formData.clientName, startDate: formData.startDate, completionDate: formData.completionDate, address: formData.address, budget: Number(formData.budget)
      });
    }
    handleCancel();
  };

  return (
    <div className="text-[11px]">
      <div className="flex items-center justify-between mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1">
        {!isReadOnly ? (
          <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1">
            {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
            <span>{isAdding ? 'Cancel' : 'New Project'}</span>
          </button>
        ) : (
          <div className="font-semibold text-gray-700 px-1 py-0.5">Projects List (Read Only)</div>
        )}
        <div className="flex items-center space-x-1.5 pr-1">
          <Search size={12} className="text-gray-600" />
          <span className="font-semibold text-gray-700">Search:</span>
          <input
            type="text"
            className="sap-input w-48 text-[11px]"
            placeholder="Filter by Name or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="hover:bg-gray-300 p-0.5 rounded text-gray-500 cursor-pointer flex items-center"
              title="Clear Search"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
          onClick={handleCancel}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="sap-panel relative z-10 w-full max-w-max max-h-[95vh] overflow-y-auto p-4 shadow-[0_10px_40px_rgb(0,0,0,0.2)] bg-[#fcfdfe] rounded-md border-b-4 border-b-[#0056b3]"
        >
          <div className="font-extrabold mb-3 border-b border-[#0056b3]/30 pb-1.5 text-[#0056b3] uppercase tracking-wider text-xs flex justify-between items-center">
            <span>{editingId ? 'Edit Project' : 'Create New Project'}</span>
            <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col space-y-2 max-w-md">
            <div className="flex items-center">
              <label className="w-32">Project Name:</label>
              <input required type="text" className="sap-input flex-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Client Name:</label>
              <input type="text" className="sap-input flex-1" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
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
              <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1">
                <X size={12} className="text-red-600"/>
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </motion.div>
        </div>
      )}
      </AnimatePresence>

      <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
        <thead className="sap-header">
          <tr>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-8"></th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project Name</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Client Name</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Start Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Completion Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Address</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Budget</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProjects.map((project, idx) => (
            <motion.tr 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.2 }}
              key={project.id} 
              className="hover:bg-[#e6f2ff] cursor-default"
            >
              <td className="border border-[#8c9ba8] px-2 py-1 text-center text-gray-500 bg-[#eef2f6] w-8">{idx + 1}</td>
              <td className="border border-[#8c9ba8] px-2 py-1 font-semibold">{project.name}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.clientName || '-'}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.startDate}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.completionDate || '-'}</td>
              <td className="border border-[#8c9ba8] px-2 py-1">{project.address}</td>
              <td className="border border-[#8c9ba8] px-2 py-1 text-right">{project.budget.toLocaleString()}</td>
              <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                <div className="flex border border-gray-300 rounded shadow-sm overflow-hidden inline-flex bg-white">
                  <button onClick={() => handleDownloadReport(project)} className="p-1 text-green-700 hover:bg-green-50 border-r border-gray-300" title="Project Health Report PDF">
                    <FileText size={13} />
                  </button>
                  {!isReadOnly && (
                    <>
                      <button onClick={() => handleEdit(project)} className="p-1 text-blue-600 hover:bg-blue-50 border-r border-gray-300" title="Edit">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => setDeleteId(project.id)} className="p-1 text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </motion.tr>
          ))}
          {filteredProjects.length === 0 && (
            <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <td colSpan={8} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No projects found.</td>
            </motion.tr>
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
