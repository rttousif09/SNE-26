import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Plus, Search, Edit, Trash2, Save, X, Upload, 
  Building2, FileKey, User, Phone, MapPin, CreditCard, ShieldCheck, Briefcase, Calendar, Code
} from 'lucide-react';
import { Subcontractor } from '../../types';
import { ERPTable, ERPColumn, ERPRowAction } from '../../components/ERPTable';

interface MasterComponentProps {
  user: any;
  subcontractors: Subcontractor[];
  numberingSettings: any[];
  previewNextNumber: (moduleKey: string, params: any) => Promise<any>;
  loadAllData: () => Promise<void>;
  setErrorMessage: (msg: string | null) => void;
  setLoading: (l: boolean) => void;
}

export const MasterComponent: React.FC<MasterComponentProps> = ({
  user,
  subcontractors,
  numberingSettings,
  previewNextNumber,
  loadAllData,
  setErrorMessage,
  setLoading
}) => {
  const [masterSearch, setMasterSearch] = useState<string>('');

  // ERP Columns for Subcontractor Master
  const erpColumns: ERPColumn<Subcontractor>[] = [
    { key: 'id', header: 'ID', sortable: true, filterable: true, frozen: true, render: (val) => <span className="font-bold text-gray-900 font-mono">{val}</span> },
    { key: 'name', header: 'Contractor Name', sortable: true, filterable: true, render: (val) => <span className="font-bold text-[var(--color-sap-blue-val)]">{val}</span> },
    { key: 'firmName', header: 'Firm Title', sortable: true, filterable: true },
    { key: 'contactPerson', header: 'Contact Person / No', sortable: true, filterable: true, render: (_, row) => (
      <div>
        <span className="font-medium text-gray-800">{row.contactPerson || '-'}</span>
        <div className="text-[9px] text-gray-500 font-mono">{row.contactNumber || '-'}</div>
      </div>
    )},
    { key: 'workCategory', header: 'Category', sortable: true, filterable: true, render: (val) => (
      <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold text-[9px]">{val || 'General'}</span>
    )},
    { key: 'bankDetails', header: 'Bank Details', sortable: true, filterable: true, render: (_, row) => {
      const bDetailsStr = row.bankName ? `${row.bankName} - A/C ${row.accountNumber?.substring(0, 4)}... IFSC: ${row.ifscCode}` : 'N/A';
      return <span className="text-gray-500 font-mono" title={bDetailsStr}>{bDetailsStr}</span>;
    }},
    { key: 'govDetails', header: 'Gov Identifiers', sortable: true, filterable: true, render: (_, row) => {
      const govStr = `PAN: ${row.panNumber || '-'} Aadhaar: ${row.aadhaarNumber || '-'}`;
      return <span className="text-gray-500 font-mono text-[9px]" title={govStr}>{govStr}</span>;
    }},
    { key: 'status', header: 'Status', sortable: true, filterable: true, render: (val) => (
      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${val === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
        {val}
      </span>
    )}
  ];

  // ERP Row Actions for Subcontractor Master
  const erpRowActions: ERPRowAction<Subcontractor>[] = [
    {
      label: 'Modify',
      icon: <Edit size={11} />,
      onClick: (row) => handleEditMasterClick(row),
      tooltip: 'Modify profile details'
    },
    ...(user?.role !== 'staff' ? [{
      label: 'Erase',
      icon: <Trash2 size={11} />,
      onClick: (row) => handleDeleteSubcontractor(row.id),
      tooltip: 'Erase profile',
      className: 'text-red-600 hover:bg-red-50'
    }] : [])
  ];

  const [isEditingMaster, setIsEditingMaster] = useState<boolean>(false);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);

  const [masterForm, setMasterForm] = useState({
    id: '',
    name: '',
    firmName: '',
    contactPerson: '',
    contactNumber: '',
    address: '',
    aadhaarNumber: '',
    panNumber: '',
    gstin: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    workCategory: '',
    agreementDate: '',
    startDate: '',
    status: 'Active' as 'Active' | 'Inactive',
    workOrderUpload: '',
    panCopy: '',
    aadhaarCopy: '',
    gstCertificate: '',
    otherDocuments: ''
  });

  // Document base64 helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setMasterForm(prev => ({ ...prev, [fieldName]: base64String }));
    };
    reader.readAsDataURL(file);
  };

  // Master Number Code Generation Preview
  useEffect(() => {
    const masterConfig = numberingSettings?.find((s: any) => s.moduleKey === 'subcontractor-master');
    if (masterConfig?.status === 'Active' && !editingMasterId && isEditingMaster && !masterForm.id) {
       previewNextNumber('subcontractor-master', {}).then(res => {
         if (res && res.active && res.docNumber) {
           setMasterForm(prev => ({ ...prev, id: res.docNumber }));
         }
       });
    }
  }, [numberingSettings, editingMasterId, isEditingMaster]);

  // Master Actions
  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!masterForm.name) {
      setErrorMessage("Subcontractor Name is mandatory.");
      return;
    }

    const payload = {
      ...masterForm,
      username: user?.name || user?.username || 'Admin'
    };

    setLoading(true);
    try {
      const url = editingMasterId ? `/api/subcontractors/${editingMasterId}` : '/api/subcontractors';
      const method = editingMasterId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to persist master profile.");
      }

      setIsEditingMaster(false);
      setEditingMasterId(null);
      loadAllData();
      
      const event = new CustomEvent('show-success-toast', { detail: { message: `Subcontractor master saved successfully.` } });
      window.dispatchEvent(event);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to commit subcontractor master.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMasterClick = (sub: Subcontractor) => {
    setEditingMasterId(sub.id);
    setMasterForm({
      id: sub.id,
      name: sub.name,
      firmName: sub.firmName || '',
      contactPerson: sub.contactPerson || '',
      contactNumber: sub.contactNumber || '',
      address: sub.address || '',
      aadhaarNumber: sub.aadhaarNumber || '',
      panNumber: sub.panNumber || '',
      gstin: sub.gstin || '',
      bankName: sub.bankName || '',
      accountNumber: sub.accountNumber || '',
      ifscCode: sub.ifscCode || '',
      branch: sub.branch || '',
      workCategory: sub.workCategory || '',
      agreementDate: sub.agreementDate || '',
      startDate: sub.startDate || '',
      status: sub.status,
      workOrderUpload: sub.workOrderUpload || '',
      panCopy: sub.panCopy || '',
      aadhaarCopy: sub.aadhaarCopy || '',
      gstCertificate: sub.gstCertificate || '',
      otherDocuments: sub.otherDocuments || ''
    });
    setIsEditingMaster(true);
  };

  const handleDeleteSubcontractor = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this subcontractor? It will fail if they have active bills or payments logged to them.")) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/subcontractors/${id}?username=${encodeURIComponent(user?.username || 'Admin')}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete subcontractor profile.");
      }

      loadAllData();
      const event = new CustomEvent('show-success-toast', { detail: { message: "Selected subcontractor profile deleted from records." } });
      window.dispatchEvent(event);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete.");
    } finally {
      setLoading(false);
    }
  };

  // Filter subcontractor master lists
  const filteredSubcontractors = useMemo(() => {
    return subcontractors.filter(s => {
      const query = masterSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        (s.firmName || '').toLowerCase().includes(query) ||
        (s.id || '').toLowerCase().includes(query) ||
        (s.workCategory || '').toLowerCase().includes(query)
      );
    });
  }, [subcontractors, masterSearch]);

  return (
    <div className="space-y-4">
      {/* Search Panel */}
      <div className="flex justify-end items-center bg-white p-3 border rounded shadow-sm">
        <button 
          onClick={() => {
            setEditingMasterId(null);
            setMasterForm({
              id: '',
              name: '',
              firmName: '',
              contactPerson: '',
              contactNumber: '',
              address: '',
              aadhaarNumber: '',
              panNumber: '',
              gstin: '',
              bankName: '',
              accountNumber: '',
              ifscCode: '',
              branch: '',
              workCategory: '',
              agreementDate: '',
              startDate: '',
              status: 'Active',
              workOrderUpload: '',
              panCopy: '',
              aadhaarCopy: '',
              gstCertificate: '',
              otherDocuments: ''
            });
            setIsEditingMaster(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-3 py-1.5 rounded flex items-center space-x-1 transition text-xs"
        >
          <Plus size={12} />
          <span>Register New Subcontractor</span>
        </button>
      </div>

      {/* Master Registration Screen Overlays */}
      {isEditingMaster && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-3xl rounded-xs shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="sap-title-banner">
              <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={14} className="text-[#002f6c]" />
                <span>{editingMasterId ? 'Edit Subcontractor Master Profile (MK02)' : 'Register New Subcontractor Profile (MK01)'}</span>
              </span>
              <button type="button" onClick={() => setIsEditingMaster(false)} className="text-[#002f6c] hover:bg-slate-300/50 p-0.5 rounded"><X size={16}/></button>
            </div>
            <form onSubmit={handleSaveMaster} className="sap-form p-3 space-y-3 overflow-y-auto flex-1 text-[11px]">
              {/* Section 1: Contractor Details */}
              <div className="border border-amber-300 bg-amber-50/20 p-3 rounded">
                <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2.5 border-b border-amber-200 pb-1 flex items-center gap-1.5">
                  <Briefcase size={12} className="text-amber-500" />
                  <span>1. Firm & Contractor Particulars</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <FileKey size={10} className="text-amber-500" />
                      <span>Auto/Manual Subcontractor ID</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. SUBC/001" 
                      value={masterForm.id}
                      onChange={(e) => setMasterForm({ ...masterForm, id: e.target.value })}
                      disabled={!!editingMasterId}
                      className="w-full bg-[#f3f4f6] border border-gray-300 p-1 rounded font-bold font-mono outline-none text-gray-800 focus:border-amber-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <User size={10} className="text-amber-500" />
                      <span>Contractor Name *</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Provide full human name" 
                      value={masterForm.name}
                      onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Building2 size={10} className="text-amber-500" />
                      <span>Firm Name</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Provide firm title eg Pvt Ltd" 
                      value={masterForm.firmName}
                      onChange={(e) => setMasterForm({ ...masterForm, firmName: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <User size={10} className="text-amber-500" />
                      <span>Contact Person</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Principal point of contact" 
                      value={masterForm.contactPerson}
                      onChange={(e) => setMasterForm({ ...masterForm, contactPerson: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Phone size={10} className="text-amber-500" />
                      <span>Contact Number</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="eg +91-XXXXXXXXXX" 
                      value={masterForm.contactNumber}
                      onChange={(e) => setMasterForm({ ...masterForm, contactNumber: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-mono outline-none focus:border-amber-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <ShieldCheck size={10} className="text-amber-500" />
                      <span>Status</span>
                    </label>
                    <select 
                      value={masterForm.status}
                      onChange={(e) => setMasterForm({ ...masterForm, status: e.target.value as any })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2.5">
                  <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                    <MapPin size={10} className="text-amber-500" />
                    <span>Address</span>
                  </label>
                  <textarea 
                    placeholder="Registered office address" 
                    rows={1}
                    value={masterForm.address}
                    onChange={(e) => setMasterForm({ ...masterForm, address: e.target.value })}
                    className="w-full bg-white border border-gray-300 p-1 rounded outline-none focus:border-amber-500 text-[10px]"
                  />
                </div>
              </div>

              {/* Section 2: Identity & Compliance Details */}
              <div className="border border-blue-300 bg-blue-50/20 p-3 rounded">
                <h4 className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2.5 border-b border-blue-200 pb-1 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-blue-500" />
                  <span>2. Compliance & Government Identifiers</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <CreditCard size={10} className="text-blue-500" />
                      <span>Aadhaar Number</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="12 digit identifier" 
                      value={masterForm.aadhaarNumber}
                      onChange={(e) => setMasterForm({ ...masterForm, aadhaarNumber: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-mono outline-none focus:border-blue-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <CreditCard size={10} className="text-blue-500" />
                      <span>PAN Number</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="10 digit alphanumeric card" 
                      value={masterForm.panNumber}
                      onChange={(e) => setMasterForm({ ...masterForm, panNumber: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 uppercase font-mono outline-none focus:border-blue-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <CreditCard size={10} className="text-blue-500" />
                      <span>GSTIN (Optional)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="GSTIN Code eg 27AAAAA..." 
                      value={masterForm.gstin}
                      onChange={(e) => setMasterForm({ ...masterForm, gstin: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 uppercase font-mono outline-none focus:border-blue-500 text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Bank Details */}
              <div className="border border-green-300 bg-green-50/20 p-3 rounded">
                <h4 className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-2.5 border-b border-green-200 pb-1 flex items-center gap-1.5">
                  <Building2 size={12} className="text-green-500" />
                  <span>3. Bank Account Information</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Building2 size={10} className="text-green-500" />
                      <span>Bank Name</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="eg State Bank" 
                      value={masterForm.bankName}
                      onChange={(e) => setMasterForm({ ...masterForm, bankName: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded outline-none focus:border-green-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <CreditCard size={10} className="text-green-500" />
                      <span>Account Number</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Account identifier" 
                      value={masterForm.accountNumber}
                      onChange={(e) => setMasterForm({ ...masterForm, accountNumber: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-mono outline-none focus:border-green-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Code size={10} className="text-green-500" />
                      <span>IFSC Code</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="eg SBIN0000XXX" 
                      value={masterForm.ifscCode}
                      onChange={(e) => setMasterForm({ ...masterForm, ifscCode: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 uppercase font-mono outline-none focus:border-green-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <MapPin size={10} className="text-green-500" />
                      <span>Branch Name</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Branch location" 
                      value={masterForm.branch}
                      onChange={(e) => setMasterForm({ ...masterForm, branch: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded outline-none focus:border-green-500 text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Contract info and uploads */}
              <div className="border border-purple-300 bg-purple-50/20 p-3 rounded">
                <h4 className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-2.5 border-b border-purple-200 pb-1 flex items-center gap-1.5">
                  <Briefcase size={12} className="text-purple-500" />
                  <span>4. Contract Scope & Document Digital Archive</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Briefcase size={10} className="text-purple-500" />
                      <span>Work Category</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="eg RCC Work, Brickwork" 
                      value={masterForm.workCategory}
                      onChange={(e) => setMasterForm({ ...masterForm, workCategory: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded outline-none focus:border-purple-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Calendar size={10} className="text-purple-500" />
                      <span>Agreement Sign Date</span>
                    </label>
                    <input 
                      type="date" 
                      value={masterForm.agreementDate}
                      onChange={(e) => setMasterForm({ ...masterForm, agreementDate: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-mono outline-none focus:border-purple-500 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Calendar size={10} className="text-purple-500" />
                      <span>Site Commencement Date</span>
                    </label>
                    <input 
                      type="date" 
                      value={masterForm.startDate}
                      onChange={(e) => setMasterForm({ ...masterForm, startDate: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-mono outline-none focus:border-purple-500 text-[10px]"
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { f: 'workOrderUpload', l: 'Work Order Copy' },
                    { f: 'panCopy', l: 'PAN Copy' },
                    { f: 'aadhaarCopy', l: 'Aadhaar Copy' },
                    { f: 'gstCertificate', l: 'GST Cert' },
                    { f: 'otherDocuments', l: 'Other Agreem' }
                  ].map(doc => {
                    const fileVal = (masterForm as any)[doc.f];
                    return (
                      <div key={doc.f} className="bg-white border rounded p-1.5 text-center flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-gray-500 uppercase truncate" title={doc.l}>{doc.l}</span>
                        <div className="my-1 text-center font-mono">
                          {fileVal ? (
                            <span className="text-[8px] text-green-600 bg-green-50 px-1 py-0.2 border border-green-200 inline-block font-bold rounded">✓ Uploaded</span>
                          ) : (
                            <span className="text-[8px] text-gray-400 font-semibold">Empty</span>
                          )}
                        </div>
                        <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-[9px] font-semibold py-0.5 px-1 rounded block cursor-pointer transition">
                          <Upload size={8} className="inline mr-1" />
                          Select File
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, doc.f)}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#f9fafb] border-t p-2 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditingMaster(false)}
                  className="border border-[#d1d5db] text-gray-700 bg-white hover:bg-gray-50 px-3 py-1.5 rounded font-bold text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-4 py-1.5 rounded flex items-center space-x-1 text-xs"
                >
                  <Save size={12} />
                  <span>Save Contractor Record</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Subcontractor Directory Table Layout */}
      <div className="bg-white border rounded shadow-sm overflow-hidden p-2 text-[10px]">
        <ERPTable
          id="subcontractor-master-table"
          data={filteredSubcontractors}
          columns={erpColumns}
          idKey="id"
          searchPlaceholder="Filter subcontractor partners..."
          rowActions={erpRowActions}
          exportFilename="subcontractor_partners"
        />
      </div>
    </div>
  );
};
