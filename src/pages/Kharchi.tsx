import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { Save, Edit, X, Trash2, Table as TableIcon, List as ListIcon, Printer } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { KharchiApproval } from '../types';

export const Kharchi: React.FC = () => {
  const { user, kharchis, projects, workers, kharchiApprovals, addKharchi, updateKharchi, deleteKharchi, addKharchiApproval } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'pivot' | 'list'>('pivot');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    workerId: '', date: new Date().toISOString().split('T')[0], amount: ''
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
    setFormData({ workerId: '', date: new Date().toISOString().split('T')[0], amount: '' });
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

  const allFilteredKharchis = useMemo(() => {
    if (!selectedProject) return [];
    return kharchis.filter(k => k.projectId === selectedProject);
  }, [selectedProject, kharchis]);

  const currentMonthKharchis = useMemo(() => {
    return allFilteredKharchis.filter(k => k.date.startsWith(selectedMonth));
  }, [allFilteredKharchis, selectedMonth]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(currentMonthKharchis.map(k => k.date))).sort();
  }, [currentMonthKharchis]);

  const pivotRows = useMemo(() => {
    const relevantWorkers = projectWorkers.filter(w => currentMonthKharchis.some(k => k.workerId === w.id));
    relevantWorkers.sort((a, b) => (parseInt(a.serialNo) || 0) - (parseInt(b.serialNo) || 0));
    
    return relevantWorkers.map(w => {
      const wKharchis = currentMonthKharchis.filter(k => k.workerId === w.id);
      let total = 0;
      const amountsByDate = uniqueDates.map(date => {
        const amt = wKharchis.filter(k => k.date === date).reduce((sum, k) => sum + k.amount, 0);
        total += amt;
        return amt;
      });
      return { worker: w, amountsByDate, total };
    });
  }, [projectWorkers, currentMonthKharchis, uniqueDates]);

  const grandTotal = pivotRows.reduce((sum, row) => sum + row.total, 0);

  const getWorkerDetails = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker ? { name: worker.name, idNo: worker.workerId, srNo: worker.serialNo } : { name: 'Unknown', idNo: '-', srNo: '-' };
  };

  const currentProjectName = projects.find(p => p.id === selectedProject)?.name || '';

  const formatMonthName = (yyyy_mm: string) => {
    if (!yyyy_mm) return '';
    const [y, m] = yyyy_mm.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const month = date.toLocaleString('default', { month: 'long' });
    return `${month}/${y.substring(2)}`;
  };

  const formatDisplayDate = (yyyy_mm_dd: string) => {
    if (!yyyy_mm_dd) return '';
    const [y, m, d] = yyyy_mm_dd.split('-');
    return `${d}-${m}-${y}`;
  };

  const currentApproval = useMemo(() => {
    return kharchiApprovals?.find(a => a.projectId === selectedProject && a.month === selectedMonth);
  }, [kharchiApprovals, selectedProject, selectedMonth]);

  const handleSendToApproval = () => {
    if (grandTotal <= 0) {
      alert("Amount is 0. Cannot send to approval.");
      return;
    }
    if (confirm(`Send Kharchi Rs. ${grandTotal} to Director for approval?`)) {
      addKharchiApproval({
        projectId: selectedProject,
        month: selectedMonth,
        totalAmount: grandTotal,
        remarks: `Kharchi for ${formatMonthName(selectedMonth)}`,
        date: new Date().toISOString()
      });
    }
  };

  return (
    <div className="text-[11px] h-full flex flex-col pb-32 overflow-hidden print:bg-white print:overflow-visible">
      <div className="mb-4 sap-panel p-2 flex items-center justify-between print:hidden shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="font-semibold text-gray-700">Select Project:</label>
            <select 
              className="sap-input w-64 text-[#0056b3] font-bold" 
              value={selectedProject} 
              onChange={e => setSelectedProject(e.target.value)}
            >
              <option value="">-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          {selectedProject && (
            <div className="flex items-center space-x-2">
              <label className="font-semibold text-gray-700">Kharchi Month:</label>
              <input 
                type="month" 
                className="sap-input font-bold"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>
          )}
        </div>

        {selectedProject && (
          <div className="flex space-x-2">
            <button 
              onClick={() => setViewMode('pivot')} 
              className={`sap-btn flex items-center space-x-1 ${viewMode === 'pivot' ? 'bg-[#0056b3] text-white' : ''}`}
            >
              <TableIcon size={14} className={viewMode === 'pivot' ? 'text-white' : 'text-[#0056b3]'}/>
              <span>Report View</span>
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`sap-btn flex items-center space-x-1 ${viewMode === 'list' ? 'bg-[#0056b3] text-white' : ''}`}
            >
              <ListIcon size={14} className={viewMode === 'list' ? 'text-white' : 'text-[#0056b3]'}/>
              <span>Entry List</span>
            </button>
            <button title="Print view" onClick={() => window.print()} className="sap-btn flex items-center space-x-1 ml-2">
              <Printer size={14} className="text-gray-700" />
              <span>Print</span>
            </button>
            {!isReadOnly && !currentApproval && (
              <button 
                onClick={handleSendToApproval}
                disabled={grandTotal <= 0}
                className={`sap-btn flex items-center space-x-1 ml-2 ${grandTotal > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600' : 'opacity-50 cursor-not-allowed'}`}
              >
                <Save size={14} className={grandTotal > 0 ? "text-white" : "text-gray-500"} />
                <span className="font-bold">Send for Approval</span>
              </button>
            )}
            {currentApproval && (
              <div className={`flex items-center px-2 py-1 ml-2 rounded border font-bold text-[10px] uppercase
                ${currentApproval.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-300' : 
                  currentApproval.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-300' : 
                  'bg-yellow-100 text-yellow-800 border-yellow-300'}`}>
                {currentApproval.status === 'Approved' ? '✅ Approved' : currentApproval.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedProject && !isReadOnly && (
        <div className="sap-panel p-2 mb-4 print:hidden shrink-0">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Kharchi Details' : 'Record Kharchi (Pocket Money)'}
          </div>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col">
              <label className="mb-1 text-gray-700">Worker:</label>
              <select required className="sap-input w-48" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}>
                <option value="">Select Worker...</option>
                {projectWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-gray-700">Date (Sunday):</label>
              <input required type="date" className="sap-input w-36" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-gray-700">Amount:</label>
              <input required type="number" min="0" step="0.01" className="sap-input w-28" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="flex space-x-2 mb-[1px]">
              <button type="submit" className="sap-btn flex items-center space-x-1 h-[24px]">
                <Save size={14} className="text-[#0056b3]"/>
                <span className="font-bold">{editingId ? 'Update' : 'Save Entry'}</span>
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1 h-[24px]">
                  <X size={14} className="text-red-600"/>
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {selectedProject && (
        <div className="flex-1 overflow-auto bg-white border border-[#8c9ba8] print:border-none print:overflow-visible relative">
          
          {viewMode === 'pivot' && (
            <div className="min-w-max">
              <table className="sap-table w-full">
                <thead>
                  {/* Title Headers */}
                  <tr>
                    <th colSpan={uniqueDates.length + 3} className="text-center text-3xl font-black bg-white border-none py-3 pb-0 uppercase tracking-wide">
                      SN ENTERPRISE
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={uniqueDates.length + 3} className="text-center text-sm font-bold italic bg-white border-none pb-3 underline border-b-2 border-black">
                      Weekly Kharchi Summary
                    </th>
                  </tr>
                  {/* Info Header */}
                  <tr className="bg-gray-100">
                    <th colSpan={2} className="text-left font-bold py-2 px-3 border border-[#444] print:border-black text-[13px]">
                      Site- {currentProjectName}
                    </th>
                    <th colSpan={uniqueDates.length + 1} className="text-right font-bold py-2 px-3 border border-[#444] print:border-black text-[13px]">
                      Month-{formatMonthName(selectedMonth)}
                    </th>
                  </tr>
                  {/* Column Headers */}
                  <tr className="bg-gray-200">
                    <th className="border border-[#444] px-2 py-1.5 text-center font-bold w-12 text-[12px]">Sr</th>
                    <th className="border border-[#444] px-3 py-1.5 text-left font-bold text-[12px]">Worker Name</th>
                    {uniqueDates.map(date => (
                      <th key={date} className="border border-[#444] px-2 py-1.5 text-center font-bold text-[12px]">
                        {formatDisplayDate(date)}
                      </th>
                    ))}
                    <th className="border border-[#444] px-3 py-1.5 text-center font-bold text-[12px] bg-gray-300">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pivotRows.map((row) => (
                    <tr key={row.worker.id} className="hover:bg-blue-50">
                      <td className="border border-[#444] px-2 py-1 text-center font-mono">{row.worker.serialNo}</td>
                      <td className="border border-[#444] px-3 py-1 font-semibold">{row.worker.name}</td>
                      {row.amountsByDate.map((amt, idx) => (
                        <td key={idx} className="border border-[#444] px-2 py-1 text-right font-mono text-gray-800">
                          {amt > 0 ? amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        </td>
                      ))}
                      <td className="border border-[#444] px-3 py-1 text-right font-bold text-[#0056b3] bg-blue-50/30">
                        {row.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  
                  {pivotRows.length === 0 && (
                    <tr>
                      <td colSpan={uniqueDates.length + 3} className="border border-[#444] px-2 py-8 text-center text-gray-500 italic">
                        No kharchi recorded for {formatMonthName(selectedMonth)}
                      </td>
                    </tr>
                  )}
                  
                  {pivotRows.length > 0 && (
                    <tr className="bg-gray-100 font-bold text-[13px]">
                      <td colSpan={2 + (uniqueDates.length > 0 ? uniqueDates.length - 1 : 0)} className="border border-[#444] px-3 py-2 text-right italic font-black">
                        Cummulative Amount-
                      </td>
                      {uniqueDates.length > 0 && (
                        <td className="border border-[#444]"></td>
                      )}
                      <td className="border border-[#444] px-3 py-2 text-right font-black text-[#002f6c] bg-gray-200">
                        {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="print-signature-section">
                <div className="print-signature-box">
                  <div className="print-signature-title">Approved by Director</div>
                  <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="w-full">
              <table className="sap-table w-full">
                <thead className="sap-header sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-1.5 text-center font-medium w-12">Sr No</th>
                  <th className="px-2 py-1.5 text-left font-medium w-24">ID No</th>
                  <th className="px-2 py-1.5 text-left font-medium">Name</th>
                  <th className="px-2 py-1.5 text-left font-medium">Date</th>
                  <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                  {!isReadOnly && <th className="px-2 py-1.5 text-center font-medium w-16">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentMonthKharchis.map((kharchi, idx) => {
                  const worker = getWorkerDetails(kharchi.workerId);
                  return (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.03 || 0 }} key={kharchi.id} className="hover:bg-[#e6f2ff] cursor-default border-b border-gray-200">
                      <td className="px-2 py-1.5 text-center font-mono text-gray-500">{worker.srNo}</td>
                      <td className="px-2 py-1.5 font-mono text-blue-900">{worker.idNo}</td>
                      <td className="px-2 py-1.5 font-semibold">{worker.name}</td>
                      <td className="px-2 py-1.5 font-mono">{kharchi.date}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-[#0056b3]">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(kharchi.amount)}
                      </td>
                      {!isReadOnly && (
                        <td className="px-2 py-1.5 text-center flex justify-center space-x-2">
                          <button onClick={() => handleEdit(kharchi)} className="text-blue-600 hover:text-blue-800" title="Edit">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setDeleteId(kharchi.id)} className="text-red-600 hover:text-red-800" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
                {currentMonthKharchis.length === 0 && (
                  <tr>
                    <td colSpan={isReadOnly ? 5 : 6} className="px-2 py-6 text-center text-gray-500 italic">
                      No kharchi records found for {formatMonthName(selectedMonth)}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="print-signature-section">
              <div className="print-signature-box">
                <div className="print-signature-title">Approved by Director</div>
                <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
          )}
        </div>
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

