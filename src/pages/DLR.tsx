import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Save, Plus, Trash2, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const DLR: React.FC = () => {
  const { projects, dlrs, addDLR, updateDLR, deleteDLR } = useAppContext();
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterProject, setFilterProject] = useState('all');

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: new Date().toISOString().split('T')[0],
    projectId: projects[0]?.id || '',
    carpenter: 0,
    fitter: 0,
    helper: 0,
    mason: 0,
    rigger: 0,
    staff: 0,
    remarks: ''
  });

  const filteredDLRs = dlrs.filter(d => {
    let mDate = true;
    let mProj = true;
    if (filterDate) mDate = d.date === filterDate;
    if (filterProject !== 'all') mProj = d.projectId === filterProject;
    return mDate && mProj;
  });

  const handleSave = () => {
    if (!editForm.projectId) {
      alert("Please select a project.");
      return;
    }
    
    if (isEditing === 'new') {
      addDLR(editForm);
    } else if (isEditing) {
      updateDLR(isEditing, editForm);
    }
    setIsEditing(null);
  };

  const handleEdit = (dlr: any) => {
    setEditForm(dlr);
    setIsEditing(dlr.id);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this report?")) {
      deleteDLR(id);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Daily Labour Report (DLR) - ${filterDate}`, 14, 20);
    
    const tableData = filteredDLRs.map(d => {
      const proj = projects.find(p => p.id === d.projectId);
      const total = d.carpenter + d.fitter + d.helper + d.mason + d.rigger + d.staff;
      return [
        proj?.name || d.projectId,
        d.carpenter, d.fitter, d.helper, d.mason, d.rigger, d.staff,
        total,
        d.remarks
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Project Site', 'Carpenter', 'Fitter', 'Helper', 'Mason', 'Rigger', 'Staff', 'Total', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });

    const fileName = `DLR_${filterDate}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="flex flex-col h-full print:bg-white pb-32 overflow-hidden">
      <div className="sap-toolbar print:hidden flex justify-between items-center mb-2 px-2 pb-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700">Filter Date:</span>
            <input 
              type="date" 
              className="sap-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700">Filter Site:</span>
            <select
              className="sap-input"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="all">All Sites</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex space-x-2">
          {isEditing && (
            <button onClick={handleSave} className="sap-btn">
              <Save size={14} className="mr-1" /> Save
            </button>
          )}
          {!isEditing && (
            <>
              <button onClick={() => {
                setEditForm({
                  ...editForm,
                  date: filterDate || new Date().toISOString().split('T')[0],
                  projectId: filterProject !== 'all' ? filterProject : (projects[0]?.id || '')
                });
                setIsEditing('new');
              }} className="sap-btn">
                <Plus size={14} className="mr-1" /> Add New Site Report
              </button>
              <button onClick={exportPDF} className="sap-btn" disabled={filteredDLRs.length === 0}>
                <Printer size={14} className="mr-1" /> Export as PDF
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-[#8c9ba8]">
        <table className="sap-table w-full">
          <thead>
            <tr>
              <th className="w-10 text-center">Action</th>
              <th>Site Name</th>
              <th className="text-right">Carpenter</th>
              <th className="text-right">Fitter</th>
              <th className="text-right">Helper</th>
              <th className="text-right">Mason</th>
              <th className="text-right">Rigger</th>
              <th className="text-right">Staff</th>
              <th className="text-right font-bold text-[#0056b3]">Total</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {isEditing === 'new' && (
              <tr className="bg-yellow-50 align-top">
                <td className="text-center p-2">
                  <button onClick={() => setIsEditing(null)} className="text-red-500 hover:text-red-700">Cancel</button>
                </td>
                <td className="p-1">
                  <select className="sap-input w-full" value={editForm.projectId} onChange={e => setEditForm({...editForm, projectId: e.target.value})}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.carpenter} onChange={e => setEditForm({...editForm, carpenter: parseInt(e.target.value)||0})} /></td>
                <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.fitter} onChange={e => setEditForm({...editForm, fitter: parseInt(e.target.value)||0})} /></td>
                <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.helper} onChange={e => setEditForm({...editForm, helper: parseInt(e.target.value)||0})} /></td>
                <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.mason} onChange={e => setEditForm({...editForm, mason: parseInt(e.target.value)||0})} /></td>
                <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.rigger} onChange={e => setEditForm({...editForm, rigger: parseInt(e.target.value)||0})} /></td>
                <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.staff} onChange={e => setEditForm({...editForm, staff: parseInt(e.target.value)||0})} /></td>
                <td className="p-2 text-right font-bold text-[#0056b3]">
                  {editForm.carpenter + editForm.fitter + editForm.helper + editForm.mason + editForm.rigger + editForm.staff}
                </td>
                <td className="p-1"><input type="text" className="sap-input w-full" value={editForm.remarks} onChange={e => setEditForm({...editForm, remarks: e.target.value})} placeholder="Remarks..." /></td>
              </tr>
            )}

            {filteredDLRs.map(dlr => {
              const outTotal = dlr.carpenter + dlr.fitter + dlr.helper + dlr.mason + dlr.rigger + dlr.staff;
              if (isEditing === dlr.id) {
                return (
                  <tr key={dlr.id} className="bg-yellow-50 align-top">
                    <td className="text-center p-2">
                       <button onClick={() => setIsEditing(null)} className="text-red-500 hover:text-red-700">Cancel</button>
                    </td>
                    <td className="p-1">
                      <select className="sap-input w-full" value={editForm.projectId} onChange={e => setEditForm({...editForm, projectId: e.target.value})}>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.carpenter} onChange={e => setEditForm({...editForm, carpenter: parseInt(e.target.value)||0})} /></td>
                    <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.fitter} onChange={e => setEditForm({...editForm, fitter: parseInt(e.target.value)||0})} /></td>
                    <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.helper} onChange={e => setEditForm({...editForm, helper: parseInt(e.target.value)||0})} /></td>
                    <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.mason} onChange={e => setEditForm({...editForm, mason: parseInt(e.target.value)||0})} /></td>
                    <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.rigger} onChange={e => setEditForm({...editForm, rigger: parseInt(e.target.value)||0})} /></td>
                    <td className="p-1 text-right"><input type="number" min="0" className="sap-input w-16 text-right inline-block" value={editForm.staff} onChange={e => setEditForm({...editForm, staff: parseInt(e.target.value)||0})} /></td>
                    <td className="p-2 text-right font-bold text-[#0056b3]">
                      {editForm.carpenter + editForm.fitter + editForm.helper + editForm.mason + editForm.rigger + editForm.staff}
                    </td>
                    <td className="p-1"><input type="text" className="sap-input w-full" value={editForm.remarks || ''} onChange={e => setEditForm({...editForm, remarks: e.target.value})} placeholder="Remarks..." /></td>
                  </tr>
                );
              }
              const p = projects.find(p => p.id === dlr.projectId);
              return (
                <tr key={dlr.id} className="hover:bg-blue-50 cursor-pointer" onDoubleClick={() => handleEdit(dlr)}>
                  <td className="text-center p-1 print:hidden">
                     <button onClick={() => handleDelete(dlr.id)} className="text-red-500 hover:text-red-700 bg-transparent border-0"><Trash2 size={14} /></button>
                  </td>
                  <td className="font-semibold">{p?.name || "-"}</td>
                  <td className="text-right">{dlr.carpenter || 0}</td>
                  <td className="text-right">{dlr.fitter || 0}</td>
                  <td className="text-right">{dlr.helper || 0}</td>
                  <td className="text-right">{dlr.mason || 0}</td>
                  <td className="text-right">{dlr.rigger || 0}</td>
                  <td className="text-right">{dlr.staff || 0}</td>
                  <td className="text-right font-bold text-[#0056b3]">{outTotal}</td>
                  <td className="text-gray-600">{dlr.remarks}</td>
                </tr>
              )
            })}
            
            {filteredDLRs.length === 0 && isEditing !== 'new' && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-500">
                  No daily labour reports found for the selected date. Click "Add New Site Report" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
