import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { Save, Edit, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Advance: React.FC = () => {
  const { user, advances, projects, workers, addAdvance, updateAdvance, deleteAdvance, advanceSheetApprovals, addAdvanceSheetApproval } = useAppContext();
  const isReadOnly = user?.username === 'saddamsne';
  const [selectedProject, setSelectedProject] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sheetMonth, setSheetMonth] = useState('');
  const [sheetRemarks, setSheetRemarks] = useState('');
  const [formData, setFormData] = useState({
    workerId: '', amount: '', paidBy: 'Saddam Hussain', paidByDetails: '', remarks: '', date: '',
    isDeducted: false, deductionMonth: '', deductionAmount: '',
    receiptProof: '', receiptFileName: '', receiptFileType: ''
  });

  const handleEdit = (advance: any) => {
    setFormData({
      workerId: advance.workerId,
      amount: advance.amount.toString(),
      paidBy: advance.paidBy || 'Saddam Hussain',
      paidByDetails: advance.paidByDetails || '',
      remarks: advance.remarks || '',
      date: advance.date,
      isDeducted: advance.isDeducted || false,
      deductionMonth: advance.deductionMonth || '',
      deductionAmount: advance.deductionAmount?.toString() || '',
      receiptProof: advance.receiptProof || '',
      receiptFileName: advance.receiptFileName || '',
      receiptFileType: advance.receiptFileType || ''
    });
    setEditingId(advance.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ 
      workerId: '', amount: '', paidBy: 'Saddam Hussain', paidByDetails: '', remarks: '', date: '',
      isDeducted: false, deductionMonth: '', deductionAmount: '',
      receiptProof: '', receiptFileName: '', receiptFileType: '' 
    });
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
          receiptProof: reader.result as string,
          receiptFileName: file.name,
          receiptFileType: file.type
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    const payload = {
      projectId: selectedProject,
      workerId: formData.workerId,
      amount: Number(formData.amount),
      paidBy: formData.paidBy,
      paidByDetails: formData.paidBy === 'Other' ? formData.paidByDetails : undefined,
      remarks: formData.remarks,
      date: formData.date,
      isDeducted: formData.isDeducted,
      deductionMonth: formData.isDeducted ? formData.deductionMonth : undefined,
      deductionAmount: formData.isDeducted && formData.deductionAmount ? Number(formData.deductionAmount) : undefined,
      receiptProof: formData.receiptProof,
      receiptFileName: formData.receiptFileName,
      receiptFileType: formData.receiptFileType
    };

    if (editingId) {
      updateAdvance(editingId, payload);
    } else {
      addAdvance(payload);
    }
    
    handleCancel();
  };

  const getWorkerDetails = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker ? { name: worker.name, idNo: worker.workerId, srNo: worker.serialNo } : { name: 'Unknown', idNo: '-', srNo: '-' };
  };

  const handleSendForApproval = () => {
    if (!selectedProject || !sheetMonth) return;
    addAdvanceSheetApproval({
      projectId: selectedProject,
      month: sheetMonth,
      totalAmount: totalAdvance,
      remarks: sheetRemarks,
      date: new Date().toISOString().split('T')[0]
    });
    setSheetMonth('');
    setSheetRemarks('');
    alert('Advance Sheet pending approval request submitted to owner.');
  };

  const projectSheetApprovals = useMemo(() => {
    if (!selectedProject) return [];
    return advanceSheetApprovals.filter(a => a.projectId === selectedProject);
  }, [selectedProject, advanceSheetApprovals]);

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

      {selectedProject && !isReadOnly && (
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
              <select required className="sap-input flex-1" value={formData.paidBy} onChange={e => setFormData({...formData, paidBy: e.target.value})}>
                <option value="Saddam Hussain">Saddam Hussain</option>
                <option value="Tousif Reja">Tousif Reja</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {formData.paidBy === 'Other' && (
              <div className="flex items-center col-span-2">
                <label className="w-32 text-gray-600">Specify Paid By:</label>
                <input required type="text" className="sap-input flex-1" value={formData.paidByDetails} onChange={e => setFormData({...formData, paidByDetails: e.target.value})} placeholder="Specify name" />
              </div>
            )}
            
            <div className="flex items-center col-span-2">
              <label className="w-32">Is Deducted?</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input type="radio" name="isDeducted" checked={formData.isDeducted === true} onChange={() => setFormData({...formData, isDeducted: true})} />
                  <span>Yes</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input type="radio" name="isDeducted" checked={formData.isDeducted === false} onChange={() => setFormData({...formData, isDeducted: false, deductionMonth: '', deductionAmount: ''})} />
                  <span>No</span>
                </label>
              </div>
            </div>

            {formData.isDeducted && (
              <>
                <div className="flex items-center">
                  <label className="w-32 text-gray-700">Deduction Month:</label>
                  <input required type="month" className="sap-input flex-1" value={formData.deductionMonth} onChange={e => setFormData({...formData, deductionMonth: e.target.value})} />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-gray-700">Deduct Amount:</label>
                  <input required type="number" className="sap-input flex-1" value={formData.deductionAmount} onChange={e => setFormData({...formData, deductionAmount: e.target.value})} />
                </div>
              </>
            )}

            <div className="flex items-center col-span-2">
              <label className="w-32">Payment Proof:</label>
              <input type="file" accept="image/*,application/pdf" className="text-xs flex-1" onChange={handleFileUpload} />
            </div>
            {formData.receiptFileName && (
              <div className="col-span-2 pl-32 text-xs text-green-700 italic">
                Attached: {formData.receiptFileName}
              </div>
            )}

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
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Deduction Info</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Receipt</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Amount</th>
                {!isReadOnly && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAdvances.map((advance, idx) => {
                const worker = getWorkerDetails(advance.workerId);
                const deductionText = advance.isDeducted 
                  ? `Yes (${advance.deductionMonth}, ₹${advance.deductionAmount})`
                  : 'No';
                return (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={advance.id} className="hover:bg-[#e6f2ff] cursor-default">
                    <td className="border border-[#8c9ba8] px-2 py-1">{worker.srNo}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{worker.idNo}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{worker.name}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{advance.date}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{advance.paidBy === 'Other' ? advance.paidByDetails : advance.paidBy}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{advance.remarks}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-xs">{deductionText}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      {advance.receiptProof && (
                        <a href={advance.receiptProof} download={advance.receiptFileName} className="text-blue-600 hover:underline text-xs" title={advance.receiptFileName}>
                          View
                        </a>
                      )}
                    </td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(advance.amount)}
                    </td>
                    {!isReadOnly && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                        <button onClick={() => handleEdit(advance)} className="text-blue-600 hover:text-blue-800" title="Edit">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => setDeleteId(advance.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
              {filteredAdvances.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isReadOnly ? 7 : 8} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No advance records found for this project.</td>
                </motion.tr>
              )}
            </tbody>
          </table>

          {/* Advance Sheet Approval Section */}
          <div className="mt-8 bg-blue-50 p-4 border border-blue-200">
            <h3 className="text-sm font-bold text-blue-900 mb-2">Advance Sheet Approval</h3>
            
            {/* Sheet Submission */}
            {!isReadOnly && (
              <div className="flex items-center space-x-2 mb-4 bg-white p-2 border border-blue-100">
                <label className="font-semibold text-blue-800">Select Month to Send For Approval:</label>
                <input type="month" className="sap-input" value={sheetMonth} onChange={e => setSheetMonth(e.target.value)} />
                <input type="text" className="sap-input flex-1" placeholder="Remarks (optional)" value={sheetRemarks} onChange={e => setSheetRemarks(e.target.value)} />
                <button 
                  onClick={handleSendForApproval}
                  disabled={!sheetMonth || filteredAdvances.length === 0}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-medium"
                >
                  Send for Owner Approval
                </button>
              </div>
            )}

            {/* Approval Status */}
            {projectSheetApprovals.length > 0 ? (
              <div className="bg-white border border-blue-100">
                <table className="w-full text-[11px] border-collapse">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Date Submitted</th>
                      <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Month</th>
                      <th className="border border-blue-200 px-2 py-1 text-right font-semibold">Total Amount</th>
                      <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Remarks</th>
                      <th className="border border-blue-200 px-2 py-1 text-center font-semibold">Status</th>
                      <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Owner Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSheetApprovals.map(sa => (
                      <tr key={sa.id} className="hover:bg-blue-50">
                        <td className="border border-blue-200 px-2 py-1">{sa.date}</td>
                        <td className="border border-blue-200 px-2 py-1 font-semibold">{sa.month}</td>
                        <td className="border border-blue-200 px-2 py-1 text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(sa.totalAmount)}</td>
                        <td className="border border-blue-200 px-2 py-1">{sa.remarks}</td>
                        <td className="border border-blue-200 px-2 py-1 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            sa.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            sa.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sa.status}
                          </span>
                        </td>
                        <td className="border border-blue-200 px-2 py-1 text-gray-700 italic">{sa.approvalNotes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic mt-2">No advance sheets have been submitted for approval yet.</p>
            )}
          </div>
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
