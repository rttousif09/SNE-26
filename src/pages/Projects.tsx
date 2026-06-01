import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2, Search, FileText, Info } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Projects: React.FC = () => {
  const { user, projects, addProject, updateProject, deleteProject, billings, clientPayments, workerPayments, advances, expensesLedger } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', clientName: '', startDate: '', completionDate: '', address: '', budget: '',
    projectType: 'Residential' as 'Residential' | 'Commercial' | 'Government' | '',
    workOrderNo: '', scopeOfWork: '', rateType: 'Item Rate' as 'Supply' | 'Item Rate' | 'BUA Basis' | 'Lump-sum' | '',
    workOrderAttachment: '', workOrderFileName: '', workOrderFileType: '',
    projectManager: '', billingEngineer: '', siteIncharge: '', ourRepresentatives: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          workOrderAttachment: reader.result as string,
          workOrderFileName: file.name,
          workOrderFileType: file.type
        }));
      };
      reader.readAsDataURL(file);
    }
  };

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
      budget: project.budget.toString(),
      projectType: project.projectType || 'Residential',
      workOrderNo: project.workOrderNo || '',
      scopeOfWork: project.scopeOfWork || '',
      rateType: project.rateType || 'Item Rate',
      workOrderAttachment: project.workOrderAttachment || '',
      workOrderFileName: project.workOrderFileName || '',
      workOrderFileType: project.workOrderFileType || '',
      projectManager: project.projectManager || '',
      billingEngineer: project.billingEngineer || '',
      siteIncharge: project.siteIncharge || '',
      ourRepresentatives: project.ourRepresentatives || ''
    });
    setEditingId(project.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '', clientName: '', startDate: '', completionDate: '', address: '', budget: '',
      projectType: 'Residential', workOrderNo: '', scopeOfWork: '', rateType: 'Item Rate',
      workOrderAttachment: '', workOrderFileName: '', workOrderFileType: '',
      projectManager: '', billingEngineer: '', siteIncharge: '', ourRepresentatives: ''
    });
  };

  const handleDownloadReport = (project: any) => {
    const doc = new jsPDF();
    
    // Calculate totals
    const projectBillings = billings.filter(b => b.projectId === project.id);
    const totalBillings = projectBillings.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const projectPayments = clientPayments.filter(p => p.projectId === project.id);
    const totalPayments = projectPayments.reduce((sum, p) => sum + Number(p.amountReceived || 0), 0);

    const outstandingBalance = totalBillings - totalPayments;

    // Expenses & Outflows Calculations
    const projectWorkerPayments = workerPayments ? workerPayments.filter(w => w.projectId === project.id) : [];
    const totalWorkerPaymentsPaid = projectWorkerPayments
      .filter(p => p.paymentStatus === 'Paid')
      .reduce((sum, w) => sum + Number(w.netPayment || 0), 0);
    const totalMessDeduction = projectWorkerPayments.reduce((sum, w) => sum + Number(w.messDeduction || 0), 0);

    const projectAdvances = advances ? advances.filter(a => a.projectId === project.id) : [];
    const totalAdvancesPaid = projectAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const projectExpenses = expensesLedger ? expensesLedger.filter(e => e.projectId === project.id) : [];
    const totalKharchiExpense = projectExpenses.reduce((sum, e) => sum + Number(e.kharchi || 0), 0);
    const totalMessExpense = projectExpenses.reduce((sum, e) => sum + Number(e.mess || 0), 0);

    // Calculate generic total P&L estimates
    const totalOutflows = totalWorkerPaymentsPaid + totalAdvancesPaid + totalKharchiExpense + totalMessExpense;
    const profitAndLoss = totalPayments - totalOutflows;

    doc.setFontSize(18);
    doc.text('Project Health & P&L Report', 14, 22);

    doc.setFontSize(11);
    doc.text(`Project Name: ${project.name}`, 14, 32);
    doc.text(`Client Name: ${project.clientName || 'N/A'}`, 14, 38);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 44);

    autoTable(doc, {
      startY: 50,
      head: [['Client Inflows Metric', 'Amount (INR)']],
      body: [
        ['Total Billings', `Rs. ${totalBillings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Payments Received', `Rs. ${totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Outstanding Client Balance', `Rs. ${outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 86, 179] }
    });

    const inflowY = (doc as any).lastAutoTable.finalY || 50;

    autoTable(doc, {
      startY: inflowY + 10,
      head: [['Expense & Outflows Metric', 'Amount (INR)']],
      body: [
        ['Total Worker Wages Paid (Net)', `Rs. ${totalWorkerPaymentsPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Advances Paid', `Rs. ${totalAdvancesPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Kharchi (Pocket Money)', `Rs. ${totalKharchiExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Mess Expenses', `Rs. ${totalMessExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Measured Outflows', `Rs. ${totalOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [179, 40, 0] }
    });

    const outflowY = (doc as any).lastAutoTable.finalY || inflowY + 50;

    autoTable(doc, {
      startY: outflowY + 10,
      head: [['Profit & Loss (P&L)', 'Amount (INR)']],
      body: [
        ['Estimated Project Cashflow P&L', `Rs. ${profitAndLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: profitAndLoss >= 0 ? [34, 139, 34] : [220, 20, 60] },
      bodyStyles: { fontStyle: 'bold', textColor: profitAndLoss >= 0 ? [34, 139, 34] : [220, 20, 60] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || outflowY + 30;
    
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
    const payload = {
      name: formData.name, 
      clientName: formData.clientName, 
      startDate: formData.startDate, 
      completionDate: formData.completionDate, 
      address: formData.address, 
      budget: Number(formData.budget),
      projectType: formData.projectType as any,
      workOrderNo: formData.workOrderNo,
      scopeOfWork: formData.scopeOfWork,
      rateType: formData.rateType as any,
      workOrderAttachment: formData.workOrderAttachment,
      workOrderFileName: formData.workOrderFileName,
      workOrderFileType: formData.workOrderFileType,
      projectManager: formData.projectManager,
      billingEngineer: formData.billingEngineer,
      siteIncharge: formData.siteIncharge,
      ourRepresentatives: formData.ourRepresentatives
    };

    if (editingId) {
      updateProject(editingId, payload);
    } else {
      addProject(payload);
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
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-[600px] max-w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Group A: Basic Details */}
              <div className="sap-panel p-3">
                <div className="font-bold text-[#0056b3] border-b border-[#8c9ba8] pb-1 mb-2">A. Basic Details</div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">1. Project Name *</label>
                    <input required type="text" className="sap-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">2. Client Name</label>
                    <input type="text" className="sap-input" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">3. Address *</label>
                    <input required type="text" className="sap-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">4. Project Type</label>
                    <select className="sap-input" value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value as any})}>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Government">Government</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">5. Start Date *</label>
                    <input required type="date" className="sap-input" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">6. Completion Date</label>
                    <input type="date" className="sap-input" value={formData.completionDate} onChange={e => setFormData({...formData, completionDate: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">7. Expected Budget (INR) *</label>
                    <input required type="number" className="sap-input" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Group B: Contract Information */}
              <div className="sap-panel p-3">
                <div className="font-bold text-[#0056b3] border-b border-[#8c9ba8] pb-1 mb-2">B. Contract Info.</div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">1. Work Order No</label>
                    <input type="text" className="sap-input" value={formData.workOrderNo} onChange={e => setFormData({...formData, workOrderNo: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">2. Scope of Work</label>
                    <textarea className="sap-input h-[85px] resize-none" value={formData.scopeOfWork} onChange={e => setFormData({...formData, scopeOfWork: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">3. Rate Type</label>
                    <select className="sap-input" value={formData.rateType} onChange={e => setFormData({...formData, rateType: e.target.value as any})}>
                      <option value="Item Rate">Item Rate</option>
                      <option value="Supply">Supply</option>
                      <option value="BUA Basis">BUA Basis</option>
                      <option value="Lump-sum">Lump-sum</option>
                    </select>
                  </div>
                  <div className="flex flex-col pt-1">
                    <label className="font-semibold text-gray-700">4. Work Order Proof</label>
                    <input type="file" className="sap-input py-1" accept="application/pdf,image/*" onChange={handleFileUpload} />
                    {formData.workOrderFileName && (
                      <span className="text-[9px] text-green-700 mt-1 truncate font-mono">Attached: {formData.workOrderFileName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Group C: Site Contacts */}
              <div className="sap-panel p-3">
                <div className="font-bold text-[#0056b3] border-b border-[#8c9ba8] pb-1 mb-2">C. Site Contacts</div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">1. Project Manager</label>
                    <input type="text" className="sap-input" value={formData.projectManager} onChange={e => setFormData({...formData, projectManager: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">2. Billing Engineer</label>
                    <input type="text" className="sap-input" value={formData.billingEngineer} onChange={e => setFormData({...formData, billingEngineer: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">3. Site-Incharge</label>
                    <input type="text" className="sap-input" value={formData.siteIncharge} onChange={e => setFormData({...formData, siteIncharge: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700">4. Our Representatives</label>
                    <input type="text" className="sap-input" value={formData.ourRepresentatives} onChange={e => setFormData({...formData, ourRepresentatives: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#8c9ba8] space-x-2">
              <button type="submit" className="sap-btn flex items-center space-x-1">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update Detail' : 'Save Project'}</span>
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
                  <button onClick={() => setViewDetailsId(project.id)} className="p-1 text-[#0056b3] hover:bg-blue-50 border-r border-gray-300" title="View Project Details">
                    <Info size={13} />
                  </button>
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

      {viewDetailsId && projects.find(p => p.id === viewDetailsId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#0056b3] text-white px-4 py-2 flex justify-between items-center shrink-0">
              <h3 className="font-bold">Project Details</h3>
              <button
                onClick={() => setViewDetailsId(null)}
                className="text-white hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>
            
            {(() => {
              const project = projects.find(p => p.id === viewDetailsId)!;
              return (
                <div className="p-4 overflow-y-auto space-y-4">
                  
                  {/* Scope / Basic Details Mixed Area */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="sap-panel p-3 bg-slate-50">
                      <div className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">A. Basic Details</div>
                      <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                        <span className="font-semibold text-gray-500">Project Name:</span>
                        <span className="font-bold">{project.name}</span>
                        <span className="font-semibold text-gray-500">Client Name:</span>
                        <span>{project.clientName || '-'}</span>
                        <span className="font-semibold text-gray-500">Address:</span>
                        <span>{project.address}</span>
                        <span className="font-semibold text-gray-500">Project Type:</span>
                        <span>{project.projectType || '-'}</span>
                        <span className="font-semibold text-gray-500">Start Date:</span>
                        <span>{project.startDate}</span>
                        <span className="font-semibold text-gray-500">Completion Date:</span>
                        <span>{project.completionDate || '-'}</span>
                        <span className="font-semibold text-gray-500">Budget:</span>
                        <span className="font-bold text-green-700">₹{project.budget.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="sap-panel p-3 bg-slate-50">
                      <div className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">B. Contract Info.</div>
                      <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                        <span className="font-semibold text-gray-500">Work Order No:</span>
                        <span>{project.workOrderNo || '-'}</span>
                        <span className="font-semibold text-gray-500">Rate Type:</span>
                        <span>{project.rateType || '-'}</span>
                        
                        <div className="col-span-2 mt-1">
                          <span className="font-semibold text-gray-500 block mb-1">Scope of Work:</span>
                          <div className="bg-white border rounded p-1.5 min-h-[40px] text-gray-700">
                            {project.scopeOfWork || 'No scope details specified.'}
                          </div>
                        </div>

                        {project.workOrderAttachment && (
                          <div className="col-span-2 pt-2 flex items-center justify-between border-t border-gray-200 mt-2">
                            <span className="font-semibold text-gray-500">Work Order PDF/Image:</span>
                            <a 
                              href={project.workOrderAttachment} 
                              download={project.workOrderFileName || 'WorkOrder.pdf'}
                              className="text-blue-600 hover:underline flex items-center space-x-1"
                            >
                              <FileText size={12} />
                              <span>Download attached</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sap-panel p-3 bg-slate-50">
                    <div className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">C. Site Contacts</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-500 uppercase tracking-tight text-[9px]">Project Manager</span>
                        <span className="font-semibold mt-0.5">{project.projectManager || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-500 uppercase tracking-tight text-[9px]">Billing Engineer</span>
                        <span className="font-semibold mt-0.5">{project.billingEngineer || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-500 uppercase tracking-tight text-[9px]">Site-Incharge</span>
                        <span className="font-semibold mt-0.5">{project.siteIncharge || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-500 uppercase tracking-tight text-[9px]">Our Representatives</span>
                        <span className="font-semibold mt-0.5">{project.ourRepresentatives || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="p-3 bg-slate-100 border-t flex justify-end shrink-0">
              <button 
                onClick={() => setViewDetailsId(null)}
                className="px-4 py-1.5 bg-gray-500 text-white font-bold rounded-sm text-[11px] shadow-sm hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
