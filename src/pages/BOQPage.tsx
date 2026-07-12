import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../store';
import { BOQ, BOQItem, BOQRevision, BOQExtraItem, BOQAuditLog } from '../types';
import { 
  Plus, Trash2, Edit, Save, X, Search, FileText, FileSpreadsheet, 
  Upload, Eye, History, Check, AlertTriangle, ArrowUpDown, ChevronRight,
  TrendingUp, BarChart3, Clock, HelpCircle, ArrowLeftRight, CheckCircle, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function BOQPage({ onUnsavedChange }: { onUnsavedChange?: (hasUnsaved: boolean) => void }) {
  const { 
    projects, boqs, boqAuditLogs, addBOQ, updateBOQ, deleteBOQ, addBOQAuditLog, user 
  } = useAppContext();

  // Active navigation tab inside BOQ Module
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'executed' | 'billing' | 'extra' | 'audit'>('dashboard');
  
  // Selected Project filter
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Search & Filter state for listings
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Create / Edit BOQ Modal and form states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isViewing, setIsViewing] = useState<boolean>(false);
  const [selectedBOQ, setSelectedBOQ] = useState<BOQ | null>(null);

  // Form Fields
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formClientName, setFormClientName] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formRevisionNo, setFormRevisionNo] = useState<number>(0);
  const [formItems, setFormItems] = useState<BOQItem[]>([]);
  const [formPdfFile, setFormPdfFile] = useState<string>('');
  const [formExcelFile, setFormExcelFile] = useState<string>('');

  // Item detail inputs (within creation form)
  const [itemCode, setItemCode] = useState<string>('');
  const [itemDesc, setItemDesc] = useState<string>('');
  const [itemUnit, setItemUnit] = useState<string>('cum');
  const [itemQty, setItemQty] = useState<number>(0);
  const [itemRate, setItemRate] = useState<number>(0);
  const [itemRemarks, setItemRemarks] = useState<string>('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Extra/Variation register inputs
  const [isExtraModalOpen, setIsExtraModalOpen] = useState<boolean>(false);
  const [extraCode, setExtraCode] = useState<string>('');
  const [extraDesc, setExtraDesc] = useState<string>('');
  const [extraUnit, setExtraUnit] = useState<string>('cum');
  const [extraQty, setExtraQty] = useState<number>(0);
  const [extraRate, setExtraRate] = useState<number>(0);
  const [extraRemarks, setExtraRemarks] = useState<string>('');

  // Comparison logging (allowing users to log executed/billed quantities directly for simulation)
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [simItem, setSimItem] = useState<{ boqId: string; itemId: string; code: string; type: 'executed' | 'billed' } | null>(null);
  const [simValue, setSimValue] = useState<number>(0);

  // Drag and Drop Ref for Excel file parsing
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: auto-calculate totals
  const totalBOQAmount = useMemo(() => {
    return formItems.reduce((acc, curr) => acc + (curr.boqQuantity * curr.boqRate), 0);
  }, [formItems]);

  // Handle unsaved changes notification back to the Multi-tab manager
  const updateHasUnsavedChanges = (isDirty: boolean) => {
    if (onUnsavedChange) {
      onUnsavedChange(isDirty);
    }
  };

  // Find active projects list
  const activeProjects = useMemo(() => {
    return projects.filter(p => p.status !== 'Completed');
  }, [projects]);

  // Fetch BOQ client automatically based on project choice
  const handleFormProjectChange = (projId: string) => {
    setFormProjectId(projId);
    const proj = projects.find(p => p.id === projId);
    if (proj) {
      setFormClientName(proj.clientName || 'SNE Client');
    }
  };

  // Log action in the audit trail
  const logAudit = async (boqId: string, boqNo: string, action: string, details: string, oldValue?: string, newValue?: string) => {
    await addBOQAuditLog({
      boqId,
      boqNo,
      action,
      details,
      username: user?.name || user?.username || 'Admin',
      oldValue,
      newValue
    });
  };

  // Save / Update BOQ Master
  const handleSaveBOQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      alert('Please select a project');
      return;
    }
    if (formItems.length === 0) {
      alert('Please add at least one item to the BOQ');
      return;
    }

    const boqData: Omit<BOQ, 'id'> = {
      boqNo: selectedBOQ ? selectedBOQ.boqNo : 'BOQ-' + Math.floor(1000 + Math.random() * 9000),
      projectId: formProjectId,
      clientName: formClientName || 'SNE Client',
      date: formDate,
      revisionNo: formRevisionNo,
      remarks: formRemarks,
      items: formItems,
      revisions: selectedBOQ ? selectedBOQ.revisions || [] : [],
      extraItems: selectedBOQ ? selectedBOQ.extraItems || [] : [],
      status: (selectedBOQ ? selectedBOQ.status : 'Draft') as any,
      boqPdfName: formPdfFile || undefined,
      boqExcelName: formExcelFile || undefined
    };

    if (selectedBOQ) {
      // It's an update or revision
      const changedNotes = `Updated BOQ configuration. Revision level: ${formRevisionNo}. Item count: ${formItems.length}`;
      await updateBOQ(selectedBOQ.id, boqData);
      await logAudit(selectedBOQ.id, selectedBOQ.boqNo, 'Update', changedNotes);
    } else {
      // It's a brand new entry
      // Trigger API to push
      await addBOQ(boqData);
      // Wait a moment for creation log
      await logAudit('', boqData.boqNo, 'Creation', `Logged initial BOQ. Value: ₹${totalBOQAmount.toLocaleString('en-IN')}`);
    }

    setIsFormOpen(false);
    setSelectedBOQ(null);
    clearForm();
    updateHasUnsavedChanges(false);
  };

  // Add Item to the temporary items list
  const handleAddItem = () => {
    if (!itemCode || !itemDesc || itemQty <= 0 || itemRate <= 0) {
      alert('Please enter valid Code, Description, Quantity and Rate');
      return;
    }

    const newItem: BOQItem = {
      id: editingItemIndex !== null ? formItems[editingItemIndex].id : 'item_' + Date.now(),
      itemCode,
      description: itemDesc,
      unit: itemUnit,
      boqQuantity: Number(itemQty),
      boqRate: Number(itemRate),
      boqAmount: Number(itemQty) * Number(itemRate),
      remarks: itemRemarks || undefined,
      executedQuantity: editingItemIndex !== null ? formItems[editingItemIndex].executedQuantity || 0 : 0,
      billedQuantity: editingItemIndex !== null ? formItems[editingItemIndex].billedQuantity || 0 : 0
    };

    if (editingItemIndex !== null) {
      const updated = [...formItems];
      updated[editingItemIndex] = newItem;
      setFormItems(updated);
      setEditingItemIndex(null);
    } else {
      setFormItems([...formItems, newItem]);
    }

    // Reset inputs
    setItemCode('');
    setItemDesc('');
    setItemUnit('cum');
    setItemQty(0);
    setItemRate(0);
    setItemRemarks('');
    updateHasUnsavedChanges(true);
  };

  const handleEditItemInForm = (index: number) => {
    const item = formItems[index];
    setItemCode(item.itemCode);
    setItemDesc(item.description);
    setItemUnit(item.unit);
    setItemQty(item.boqQuantity);
    setItemRate(item.boqRate);
    setItemRemarks(item.remarks || '');
    setEditingItemIndex(index);
  };

  const handleDeleteItemInForm = (index: number) => {
    const updated = formItems.filter((_, i) => i !== index);
    setFormItems(updated);
    updateHasUnsavedChanges(true);
  };

  const clearForm = () => {
    setFormProjectId('');
    setFormClientName('');
    setFormRemarks('');
    setFormRevisionNo(0);
    setFormItems([]);
    setFormPdfFile('');
    setFormExcelFile('');
    setItemCode('');
    setItemDesc('');
    setItemQty(0);
    setItemRate(0);
    setItemRemarks('');
    setEditingItemIndex(null);
  };

  // Open Form to create New BOQ
  const handleOpenCreateForm = () => {
    clearForm();
    setSelectedBOQ(null);
    setIsViewing(false);
    setIsFormOpen(true);
  };

  // Open Form to Edit BOQ
  const handleOpenEditForm = (boq: BOQ) => {
    setSelectedBOQ(boq);
    setFormProjectId(boq.projectId);
    setFormClientName(boq.clientName);
    setFormDate(boq.date);
    setFormRemarks(boq.remarks || '');
    setFormRevisionNo(boq.revisionNo);
    setFormItems(boq.items || []);
    setFormPdfFile(boq.boqPdfName || '');
    setFormExcelFile(boq.boqExcelName || '');
    setIsViewing(false);
    setIsFormOpen(true);
  };

  // View BOQ summary
  const handleViewBOQ = (boq: BOQ) => {
    setSelectedBOQ(boq);
    setFormProjectId(boq.projectId);
    setFormClientName(boq.clientName);
    setFormDate(boq.date);
    setFormRemarks(boq.remarks || '');
    setFormRevisionNo(boq.revisionNo);
    setFormItems(boq.items || []);
    setFormPdfFile(boq.boqPdfName || '');
    setFormExcelFile(boq.boqExcelName || '');
    setIsViewing(true);
    setIsFormOpen(true);
  };

  // Delete BOQ
  const handleDeleteBOQ = async (id: string, boqNo: string) => {
    if (confirm(`Are you sure you want to delete BOQ Master: ${boqNo}? This cannot be undone.`)) {
      await deleteBOQ(id);
      await logAudit(id, boqNo, 'Deletion', `Deleted BOQ entry permanently`);
    }
  };

  // Revise BOQ structure (create a new Revision index)
  const handleReviseBOQ = async (boq: BOQ) => {
    const newRevisionRecord: BOQRevision = {
      id: 'rev_' + Date.now(),
      revisionNo: boq.revisionNo,
      revisionDate: new Date().toISOString().split('T')[0],
      items: boq.items || [],
      remarks: `Archived Revision Rev ${boq.revisionNo}`
    };

    const nextRevision = boq.revisionNo + 1;
    const revisedBOQ: Partial<BOQ> = {
      revisionNo: nextRevision,
      status: 'Revised' as any, // 'Revised' matches the expanded status we added
      revisions: [...(boq.revisions || []), newRevisionRecord]
    };

    await updateBOQ(boq.id, revisedBOQ);
    await logAudit(boq.id, boq.boqNo, 'Revision', `Triggered automatic revision level upgrade to Rev ${nextRevision}`);
    alert(`BOQ ${boq.boqNo} successfully transitioned to Revision level: Rev ${nextRevision}`);
  };

  // Change BOQ status
  const handleStatusChange = async (boq: BOQ, newStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Closed' | 'Revised') => {
    await updateBOQ(boq.id, { status: newStatus as any });
    await logAudit(boq.id, boq.boqNo, 'Status Transition', `Changed workflow stage from ${boq.status} to ${newStatus}`);
  };

  // Excel file import handler
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedItems: BOQItem[] = rawJson.map((row, idx) => {
          const qty = Number(row['BOQ Quantity'] || row['Quantity'] || row['Qty'] || 0);
          const rate = Number(row['BOQ Rate'] || row['Rate'] || row['Price'] || 0);
          return {
            id: 'item_imported_' + idx + '_' + Date.now(),
            itemCode: String(row['Item Code'] || row['Code'] || `ITEM-${idx + 1}`),
            description: String(row['Item Description'] || row['Description'] || row['Item Name'] || 'Imported item description'),
            unit: String(row['Unit'] || row['UoM'] || 'cum'),
            boqQuantity: qty,
            boqRate: rate,
            boqAmount: qty * rate,
            remarks: row['Remarks'] ? String(row['Remarks']) : undefined,
            executedQuantity: 0,
            billedQuantity: 0
          };
        });

        if (parsedItems.length === 0) {
          alert('Could not find any valid rows with "Item Code", "Description", "Quantity", and "Rate".');
          return;
        }

        setFormItems(prev => [...prev, ...parsedItems]);
        setFormExcelFile(file.name);
        updateHasUnsavedChanges(true);
        alert(`Successfully imported ${parsedItems.length} items from ${file.name}`);
      } catch (err) {
        console.error('Error reading Excel: ', err);
        alert('Failed to parse Excel file. Please ensure columns match standard BOQ fields.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Simulate updating executed/billed quantities for testing purposes
  const handleOpenSimulate = (boqId: string, itemId: string, itemCode: string, type: 'executed' | 'billed', currentVal: number) => {
    setSimItem({ boqId, itemId, code: itemCode, type });
    setSimValue(currentVal);
    setIsSimulateModalOpen(true);
  };

  const handleSaveSimulation = async () => {
    if (!simItem) return;
    const boq = boqs.find(b => b.id === simItem.boqId);
    if (!boq) return;

    const updatedItems = (boq.items || []).map(it => {
      if (it.id === simItem.itemId) {
        return {
          ...it,
          executedQuantity: simItem.type === 'executed' ? Number(simValue) : it.executedQuantity || 0,
          billedQuantity: simItem.type === 'billed' ? Number(simValue) : it.billedQuantity || 0
        };
      }
      return it;
    });

    await updateBOQ(boq.id, { items: updatedItems });
    await logAudit(
      boq.id, 
      boq.boqNo, 
      'Simulation Log', 
      `Manually updated item ${simItem.code} ${simItem.type} quantity to ${simValue}`
    );

    setIsSimulateModalOpen(false);
    setSimItem(null);
  };

  // Add Extra Item to the selected active project's BOQ
  const handleAddExtraItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project context first');
      return;
    }
    const matchingBOQ = boqs.find(b => b.projectId === selectedProjectId && b.status === 'Approved');
    if (!matchingBOQ) {
      alert('No Approved BOQ found for this project. Please approve the master BOQ first.');
      return;
    }

    if (!extraCode || !extraDesc || extraQty <= 0 || extraRate <= 0) {
      alert('Please enter valid Code, Description, Approved Quantity and Approved Rate');
      return;
    }

    const newExtra: BOQExtraItem = {
      id: 'extra_' + Date.now(),
      itemCode: extraCode,
      description: extraDesc,
      unit: extraUnit,
      quantity: Number(extraQty),
      rate: Number(extraRate),
      amount: Number(extraQty) * Number(extraRate),
      remarks: extraRemarks || undefined,
      approvalStatus: 'Approved'
    };

    const updatedExtras = [...(matchingBOQ.extraItems || []), newExtra];
    await updateBOQ(matchingBOQ.id, { extraItems: updatedExtras });
    await logAudit(
      matchingBOQ.id, 
      matchingBOQ.boqNo, 
      'Extra Item Register', 
      `Logged new Variation/Extra Item ${extraCode}. Value: ₹${(newExtra.amount).toLocaleString('en-IN')}`
    );

    // Reset fields
    setExtraCode('');
    setExtraDesc('');
    setExtraUnit('cum');
    setExtraQty(0);
    setExtraRate(0);
    setExtraRemarks('');
    setIsExtraModalOpen(false);
    alert(`Extra Item ${extraCode} added to variation register for project.`);
  };

  // Export functions (PDF / Excel)
  const handleExportPDF = (boq: BOQ) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`SN ENTERPRISES Construction ERP`, 14, 15);
    doc.setFontSize(12);
    doc.text(`Bill of Quantities (BOQ) - ${boq.boqNo}`, 14, 22);
    const pObj = projects.find(p => p.id === boq.projectId);
    doc.text(`Project: ${pObj ? pObj.name : 'Unknown'}`, 14, 28);
    doc.text(`Client: ${boq.clientName}`, 14, 34);
    doc.text(`Date: ${boq.date} | Revision: Rev ${boq.revisionNo} | Status: ${boq.status}`, 14, 40);

    const headers = [['S.No', 'Item Code', 'Description', 'Unit', 'BOQ Quantity', 'BOQ Rate', 'Amount']];
    const data = (boq.items || []).map((it, idx) => [
      idx + 1,
      it.itemCode,
      it.description,
      it.unit,
      it.boqQuantity.toLocaleString('en-IN'),
      `₹${it.boqRate.toLocaleString('en-IN')}`,
      `₹${(it.boqQuantity * it.boqRate).toLocaleString('en-IN')}`
    ]);

    const total = (boq.items || []).reduce((acc, curr) => acc + (curr.boqQuantity * curr.boqRate), 0);
    data.push(['', '', '', 'Grand Total', '', '', `₹${total.toLocaleString('en-IN')}`]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 48,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 86, 179] }
    });

    doc.save(`BOQ_${boq.boqNo}.pdf`);
  };

  const handleExportExcel = (boq: BOQ) => {
    const formatted = (boq.items || []).map((it, idx) => ({
      'S.No': idx + 1,
      'Item Code': it.itemCode,
      'Item Description': it.description,
      'Unit': it.unit,
      'BOQ Quantity': it.boqQuantity,
      'BOQ Rate (₹)': it.boqRate,
      'BOQ Amount (₹)': it.boqQuantity * it.boqRate,
      'Remarks': it.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BOQ Items');
    XLSX.writeFile(workbook, `BOQ_${boq.boqNo}.xlsx`);
  };

  // Filter lists based on UI controls
  const filteredBOQs = useMemo(() => {
    return boqs.filter(b => {
      const matchProject = selectedProjectId ? b.projectId === selectedProjectId : true;
      const matchStatus = filterStatus ? b.status === filterStatus : true;
      
      const pObj = projects.find(p => p.id === b.projectId);
      const projName = pObj ? pObj.name : '';

      const matchSearch = searchQuery ? (
        b.boqNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        projName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;
      return matchProject && matchStatus && matchSearch;
    });
  }, [boqs, selectedProjectId, filterStatus, searchQuery, projects]);

  // Aggregate stats for active dashboard
  const dashboardStats = useMemo(() => {
    const filtered = selectedProjectId ? boqs.filter(b => b.projectId === selectedProjectId) : boqs;
    const approvedBOQ = filtered.find(b => b.status === 'Approved');

    if (!approvedBOQ) {
      return {
        totalValue: 0,
        executedValue: 0,
        billedValue: 0,
        balanceValue: 0,
        profitMargin: 0,
        itemCount: 0,
        extrasCount: 0,
        extrasValue: 0
      };
    }

    const items = approvedBOQ.items || [];
    const totalVal = items.reduce((sum, curr) => sum + (curr.boqQuantity * curr.boqRate), 0);
    const executedVal = items.reduce((sum, curr) => sum + ((curr.executedQuantity || 0) * curr.boqRate), 0);
    const billedVal = items.reduce((sum, curr) => sum + ((curr.billedQuantity || 0) * curr.boqRate), 0);
    const balanceVal = totalVal - executedVal;

    // Extras / variations
    const extras = approvedBOQ.extraItems || [];
    const extVal = extras.reduce((sum, curr) => sum + curr.amount, 0);

    return {
      totalValue: totalVal,
      executedValue: executedVal,
      billedValue: billedVal,
      balanceValue: balanceVal,
      profitMargin: totalVal > 0 ? ((totalVal - (executedVal * 0.75)) / totalVal) * 100 : 0, // Mock profit analysis: execution costing 75% of rate
      itemCount: items.length,
      extrasCount: extras.length,
      extrasValue: extVal
    };
  }, [boqs, selectedProjectId]);

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-slate-50 min-h-screen">
      
      {/* Header and Project Filter Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded shadow-sm border border-slate-200 mb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            📊 Bill of Quantities (BOQ) Module
          </h1>
          <p className="text-xs text-slate-500">
            Enterprise Quantity Control, Revisions Tracking, Variations register, Profitability analysis & Approvals workflow.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Active Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded text-xs px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
            >
              <option value="">-- All Active Projects --</option>
              {activeProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenCreateForm}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={14} /> New BOQ Master
          </button>
        </div>
      </div>

      {/* SAP-Style Tabs Navigation Bar */}
      <div className="flex border-b border-slate-200 mb-4 bg-white rounded shadow-sm p-1 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded transition-colors cursor-pointer shrink-0 ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <BarChart3 size={14} /> Profitability & Stats Dashboard
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded transition-colors cursor-pointer shrink-0 ${activeTab === 'master' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <FileText size={14} /> BOQ Masters Directory ({filteredBOQs.length})
        </button>
        <button
          onClick={() => setActiveTab('executed')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded transition-colors cursor-pointer shrink-0 ${activeTab === 'executed' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ArrowLeftRight size={14} /> BOQ vs Executed Comparison
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded transition-colors cursor-pointer shrink-0 ${activeTab === 'billing' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <CheckCircle size={14} /> BOQ vs Billed Tracking
        </button>
        <button
          onClick={() => setActiveTab('extra')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded transition-colors cursor-pointer shrink-0 ${activeTab === 'extra' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <TrendingUp size={14} /> Extra Item / Variations Register
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded transition-colors cursor-pointer shrink-0 ${activeTab === 'audit' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Clock size={14} /> Audit & Revisions Trail
        </button>
      </div>

      {/* Tab 1: Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 hover:shadow transition-shadow">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Approved BOQ Budget Value</span>
                <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold">Approved</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">₹{dashboardStats.totalValue.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-400 mt-2">Active items: <strong className="text-slate-600">{dashboardStats.itemCount}</strong></p>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 hover:shadow transition-shadow">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Executed Quantity Value</span>
                <span className="text-green-500 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold">Progress</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">₹{dashboardStats.executedValue.toLocaleString('en-IN')}</h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all" 
                  style={{ width: `${dashboardStats.totalValue > 0 ? Math.min(100, (dashboardStats.executedValue / dashboardStats.totalValue) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Execution progress: <strong className="text-green-600">{dashboardStats.totalValue > 0 ? ((dashboardStats.executedValue / dashboardStats.totalValue) * 100).toFixed(1) : 0}%</strong></p>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 hover:shadow transition-shadow">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Certified Billed Amount</span>
                <span className="text-teal-500 bg-teal-50 px-2 py-0.5 rounded text-[10px] font-bold">Billing</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">₹{dashboardStats.billedValue.toLocaleString('en-IN')}</h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className="bg-teal-500 h-full rounded-full transition-all" 
                  style={{ width: `${dashboardStats.totalValue > 0 ? Math.min(100, (dashboardStats.billedValue / dashboardStats.totalValue) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Billing progress: <strong className="text-teal-600">{dashboardStats.totalValue > 0 ? ((dashboardStats.billedValue / dashboardStats.totalValue) * 100).toFixed(1) : 0}%</strong></p>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 hover:shadow transition-shadow">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Balance Contract Value</span>
                <span className="text-amber-500 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">Outstanding</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">₹{dashboardStats.balanceValue.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-400 mt-2">Extra variations logged: <strong className="text-amber-600">{dashboardStats.extrasCount} (₹{dashboardStats.extrasValue.toLocaleString('en-IN')})</strong></p>
            </div>
          </div>

          {/* Project Profitability and Visual Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded shadow-sm border border-slate-200 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                📉 Cumulative Progress Comparison Chart
              </h3>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Approved Budget Value vs Physical Execution</span>
                    <span className="text-slate-700">₹{dashboardStats.executedValue.toLocaleString('en-IN')} / ₹{dashboardStats.totalValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="relative w-full bg-slate-100 h-6 rounded-sm overflow-hidden flex items-center px-2">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-green-200/80 transition-all border-r border-green-400"
                      style={{ width: `${dashboardStats.totalValue > 0 ? Math.min(100, (dashboardStats.executedValue / dashboardStats.totalValue) * 100) : 0}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-700 z-10">
                      {dashboardStats.totalValue > 0 ? ((dashboardStats.executedValue / dashboardStats.totalValue) * 100).toFixed(1) : 0}% Physically Completed
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Contract Value vs Invoiced Billing Certification</span>
                    <span className="text-slate-700">₹{dashboardStats.billedValue.toLocaleString('en-IN')} / ₹{dashboardStats.totalValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="relative w-full bg-slate-100 h-6 rounded-sm overflow-hidden flex items-center px-2">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-blue-200/80 transition-all border-r border-blue-400"
                      style={{ width: `${dashboardStats.totalValue > 0 ? Math.min(100, (dashboardStats.billedValue / dashboardStats.totalValue) * 100) : 0}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-700 z-10">
                      {dashboardStats.totalValue > 0 ? ((dashboardStats.billedValue / dashboardStats.totalValue) * 100).toFixed(1) : 0}% Billed Certified
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Extra Variation / Change Orders Approved</span>
                    <span className="text-slate-700">₹{dashboardStats.extrasValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="relative w-full bg-slate-100 h-6 rounded-sm overflow-hidden flex items-center px-2">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-amber-100/80 transition-all border-r border-amber-300"
                      style={{ width: `${dashboardStats.totalValue > 0 ? Math.min(100, (dashboardStats.extrasValue / dashboardStats.totalValue) * 100) : 0}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-700 z-10">
                      Variation Ratio: {dashboardStats.totalValue > 0 ? ((dashboardStats.extrasValue / dashboardStats.totalValue) * 100).toFixed(1) : 0}% of Main Contract
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <strong>SAP Smart ERP Advisory:</strong> To maximize project profitability margin, ensure billing invoice certification (currently at <strong className="text-slate-900">{dashboardStats.totalValue > 0 ? ((dashboardStats.billedValue / dashboardStats.totalValue) * 100).toFixed(0) : 0}%</strong>) closely matches the physical execution progress status (<strong className="text-slate-900">{dashboardStats.totalValue > 0 ? ((dashboardStats.executedValue / dashboardStats.totalValue) * 100).toFixed(0) : 0}%</strong>) to prevent working capital blockages.
              </div>
            </div>

            <div className="bg-white p-5 rounded shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                📈 Profitability & Gross Margin Analysis
              </h3>

              <div className="flex flex-col items-center justify-center p-4">
                <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                  {/* Circular progress simulated */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#059669" 
                      strokeWidth="8" 
                      strokeDasharray={`${2 * Math.PI * 40}`} 
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.max(0, dashboardStats.profitMargin) / 100)}`}
                      className="transition-all"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold text-slate-800">{dashboardStats.profitMargin.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Estimated Margin</span>
                  </div>
                </div>

                <div className="w-full space-y-2 mt-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Gross Contract Value</span>
                    <span className="font-bold text-slate-700">₹{dashboardStats.totalValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Estimated Production Cost (75%)</span>
                    <span className="font-bold text-slate-700">₹{(dashboardStats.executedValue * 0.75).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600 font-semibold">Net Profit Contribution</span>
                    <span className="font-bold text-green-600">₹{(dashboardStats.totalValue - (dashboardStats.executedValue * 0.75)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Masters List */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 gap-2 w-full">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search BOQ Number, Project or Client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded text-xs pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded text-xs px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              >
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Revised">Revised</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">BOQ Number</th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Revision</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Workflow Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBOQs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                      No Bill of Quantities masters logged for the active filters. Click "New BOQ Master" to log a record.
                    </td>
                  </tr>
                ) : (
                  filteredBOQs.map((boq) => {
                    const boqTotal = (boq.items || []).reduce((sum, curr) => sum + (curr.boqQuantity * curr.boqRate), 0);
                    const pObj = projects.find(p => p.id === boq.projectId);
                    return (
                      <tr key={boq.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-blue-700 flex items-center gap-1.5">
                          {boq.boqNo}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{pObj ? pObj.name : 'Unknown Project'}</td>
                        <td className="px-4 py-3">{boq.clientName}</td>
                        <td className="px-4 py-3 text-slate-500">{boq.date}</td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                            Rev {boq.revisionNo}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-950">₹{boqTotal.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            boq.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            boq.status === 'Revised' ? 'bg-amber-100 text-amber-700' :
                            boq.status === 'Closed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {boq.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewBOQ(boq)}
                              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-1 rounded transition-colors cursor-pointer"
                              title="View Items Details"
                            >
                              <Eye size={13} />
                            </button>
                            
                            {(boq.status === 'Draft' || boq.status === 'Pending Approval') && (
                              <>
                                <button
                                  onClick={() => handleOpenEditForm(boq)}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors cursor-pointer"
                                  title="Edit draft details"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(boq, 'Approved')}
                                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors cursor-pointer"
                                  title="Approve BOQ Master"
                                >
                                  <Check size={13} />
                                </button>
                              </>
                            )}

                            {boq.status === 'Approved' && (
                              <button
                                onClick={() => handleReviseBOQ(boq)}
                                className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1 rounded transition-colors cursor-pointer"
                                title="Revise BOQ (Increments revision counter)"
                              >
                                <History size={13} />
                              </button>
                            )}

                            <button
                              onClick={() => handleExportPDF(boq)}
                              className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 rounded transition-colors cursor-pointer"
                              title="Export PDF Report"
                            >
                              <FileText size={13} />
                            </button>
                            
                            <button
                              onClick={() => handleExportExcel(boq)}
                              className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 p-1 rounded transition-colors cursor-pointer"
                              title="Export Excel spreadsheet"
                            >
                              <FileSpreadsheet size={13} />
                            </button>

                            <button
                              onClick={() => handleDeleteBOQ(boq.id, boq.boqNo)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: BOQ vs Executed Comparison */}
      {activeTab === 'executed' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-xs text-amber-800 p-4 rounded shadow-sm">
            <strong>Physical Quantity Ledger Comparison:</strong> This report lists approved BOQ item quantities against real executed site quantities. Items exceeding BOQ allowance values are highlighted as <strong className="text-red-700">Over-Executed</strong>.
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Item Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">BOQ Qty Allowed</th>
                  <th className="px-4 py-3">Executed Qty</th>
                  <th className="px-4 py-3">Balance Qty</th>
                  <th className="px-4 py-3">Execution Ratio %</th>
                  <th className="px-4 py-3">Status Condition</th>
                  <th className="px-4 py-3 text-right">Action Simulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boqs.filter(b => b.status === 'Approved' && (selectedProjectId ? b.projectId === selectedProjectId : true)).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                      Please select a project with an approved active BOQ to run the comparison dashboard.
                    </td>
                  </tr>
                ) : (
                  boqs.filter(b => b.status === 'Approved' && (selectedProjectId ? b.projectId === selectedProjectId : true)).flatMap(boq => 
                    (boq.items || []).map(item => {
                      const executed = item.executedQuantity || 0;
                      const balance = item.boqQuantity - executed;
                      const progressPct = item.boqQuantity > 0 ? (executed / item.boqQuantity) * 100 : 0;
                      const isOver = balance < 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.itemCode}</td>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 font-mono">{item.unit}</td>
                          <td className="px-4 py-3 font-bold">{item.boqQuantity.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-green-700">{executed.toLocaleString('en-IN')}</td>
                          <td className={`px-4 py-3 font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>
                            {balance.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded overflow-hidden">
                                <div className={`h-full rounded ${isOver ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, progressPct)}%` }} />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-500">{progressPct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                              isOver ? 'bg-red-100 text-red-700' : progressPct === 100 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isOver ? '⚠️ Over Executed' : progressPct === 100 ? 'Completed' : 'Under Executed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenSimulate(boq.id, item.id, item.itemCode, 'executed', executed)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer bg-blue-50 px-2.5 py-1 rounded border border-blue-200"
                            >
                              Log Execution
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: BOQ vs Billed Tracking */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 text-xs text-teal-800 p-4 rounded shadow-sm">
            <strong>Invoiced billing Quantity Certification:</strong> This report monitors bill certified quantities against master BOQ allocations. Keep track of what has been certified vs what is still outstanding in terms of unbilled scope.
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Item Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">BOQ Allocation Qty</th>
                  <th className="px-4 py-3">Billed Certified Qty</th>
                  <th className="px-4 py-3">Unbilled Balance Qty</th>
                  <th className="px-4 py-3">Billed Certified Amount</th>
                  <th className="px-4 py-3">Billing Ratio %</th>
                  <th className="px-4 py-3 text-right">Action Simulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boqs.filter(b => b.status === 'Approved' && (selectedProjectId ? b.projectId === selectedProjectId : true)).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                      Please select a project with an approved active BOQ to run the billing dashboard.
                    </td>
                  </tr>
                ) : (
                  boqs.filter(b => b.status === 'Approved' && (selectedProjectId ? b.projectId === selectedProjectId : true)).flatMap(boq => 
                    (boq.items || []).map(item => {
                      const billed = item.billedQuantity || 0;
                      const unbilled = item.boqQuantity - billed;
                      const billingPct = item.boqQuantity > 0 ? (billed / item.boqQuantity) * 100 : 0;
                      const billedAmount = billed * item.boqRate;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.itemCode}</td>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 font-mono">{item.unit}</td>
                          <td className="px-4 py-3 font-bold">{item.boqQuantity.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-teal-700">{billed.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{unbilled.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-slate-950">₹{billedAmount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded overflow-hidden">
                                <div className="h-full rounded bg-teal-500" style={{ width: `${Math.min(100, billingPct)}%` }} />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-500">{billingPct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenSimulate(boq.id, item.id, item.itemCode, 'billed', billed)}
                              className="text-xs text-teal-600 hover:text-teal-800 font-bold transition-colors cursor-pointer bg-teal-50 px-2.5 py-1 rounded border border-teal-200"
                            >
                              Log Bill Certification
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Extra Item Variation Register */}
      {activeTab === 'extra' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Variation Register (Scope Changes)</h3>
              <p className="text-xs text-slate-500">Track and log approved quantities outside of the main contract limits.</p>
            </div>
            
            <button
              onClick={() => {
                if (!selectedProjectId) {
                  alert('Please select a project filter first');
                  return;
                }
                setIsExtraModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} /> Add Variation / Extra Item
            </button>
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Item Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Approved Variation Qty</th>
                  <th className="px-4 py-3">Approved Rate</th>
                  <th className="px-4 py-3">Approved Amount</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boqs.filter(b => b.status === 'Approved' && (selectedProjectId ? b.projectId === selectedProjectId : true)).flatMap(b => b.extraItems || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                      No Variations or Extra Items registered for this active project.
                    </td>
                  </tr>
                ) : (
                  boqs.filter(b => b.status === 'Approved' && (selectedProjectId ? b.projectId === selectedProjectId : true)).flatMap(b => 
                    (b.extraItems || []).map((ext) => (
                      <tr key={ext.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-amber-800">{ext.itemCode}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{ext.description}</td>
                        <td className="px-4 py-3 font-mono">{ext.unit}</td>
                        <td className="px-4 py-3 font-bold">{ext.quantity.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">₹{ext.rate.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-bold text-slate-950">₹{ext.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 italic text-slate-500">{ext.remarks || 'No remarks'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {ext.approvalStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-[#f8fafc] border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">System Revisions & Approvals Security Log</h3>
          </div>
          <table className="w-full border-collapse text-left text-xs text-slate-700">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">BOQ Number</th>
                <th className="px-4 py-3">User Executing</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boqAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                    No security revisions audits logged yet. All status transitions or master edits will create permanent entries here.
                  </td>
                </tr>
              ) : (
                boqAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{log.boqNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{log.username}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action === 'Creation' ? 'bg-green-100 text-green-700' :
                        log.action === 'Revision' ? 'bg-amber-100 text-amber-700' :
                        log.action === 'Deletion' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Create / Edit / View BOQ Master Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                📂 {isViewing ? 'View BOQ Master Specifications' : selectedBOQ ? 'Update BOQ Specifications' : 'Draft New BOQ Master'}
              </h2>
              <button 
                onClick={() => {
                  setIsFormOpen(false);
                  setSelectedBOQ(null);
                  updateHasUnsavedChanges(false);
                }} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBOQ} className="p-6 space-y-4">
              
              {/* Header section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Project</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => handleFormProjectChange(e.target.value)}
                    disabled={isViewing || !!selectedBOQ}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Choose Project --</option>
                    {activeProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Client Authority</label>
                  <input
                    type="text"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    disabled={isViewing}
                    placeholder="Auto populated client"
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">BOQ Master Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    disabled={isViewing}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Revision Level</label>
                  <input
                    type="number"
                    value={formRevisionNo}
                    onChange={(e) => setFormRevisionNo(Number(e.target.value))}
                    disabled={isViewing || !selectedBOQ}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    min="0"
                  />
                </div>
              </div>

              {/* Remarks Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Scope description & remarks</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  disabled={isViewing}
                  placeholder="Provide scope statements or core contract guidelines"
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 h-16"
                />
              </div>

              {/* Items Table Input Section (Hidden if viewing) */}
              {!isViewing && (
                <div className="bg-blue-50/50 p-4 rounded border border-blue-200">
                  <h3 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center justify-between">
                    <span>✏️ Item Specifications Input</span>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-normal text-slate-600">Import template items:</span>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleExcelImport}
                        accept=".xlsx, .xls"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Upload size={10} /> Excel Import
                      </button>
                    </div>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Item Code</label>
                      <input
                        type="text"
                        placeholder="e.g. CONC-01"
                        value={itemCode}
                        onChange={(e) => setItemCode(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Item Description</label>
                      <input
                        type="text"
                        placeholder="e.g. M25 Grade Reinforced Concrete..."
                        value={itemDesc}
                        onChange={(e) => setItemDesc(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Unit</label>
                      <select
                        value={itemUnit}
                        onChange={(e) => setItemUnit(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1"
                      >
                        <option value="cum">cum</option>
                        <option value="sqm">sqm</option>
                        <option value="rm">rm</option>
                        <option value="kg">kg</option>
                        <option value="mt">mt</option>
                        <option value="nos">nos</option>
                        <option value="Sq.ft">Sq.ft</option>
                        <option value="Cu.ft">Cu.ft</option>
                        <option value="Rft">Rft</option>
                        <option value="Lumpsum">Lumpsum</option>
                        <option value="Bags">Bags</option>
                        <option value="Ltr">Ltr</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Brass">Brass</option>
                        <option value="Trips">Trips</option>
                        <option value="Days">Days</option>
                        <option value="Months">Months</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 font-medium mb-0.5">BOQ Quantity</label>
                      <input
                        type="number"
                        value={itemQty}
                        onChange={(e) => setItemQty(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1 font-bold"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Contract Rate (₹)</label>
                      <input
                        type="number"
                        value={itemRate}
                        onChange={(e) => setItemRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1 font-bold"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <input
                      type="text"
                      placeholder="Optional Item Specific remarks"
                      value={itemRemarks}
                      onChange={(e) => setItemRemarks(e.target.value)}
                      className="bg-white border border-slate-300 rounded text-xs px-2.5 py-1 w-2/3"
                    />

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded cursor-pointer transition-colors"
                    >
                      {editingItemIndex !== null ? 'Save Edit Item' : '+ Add Item Row'}
                    </button>
                  </div>
                </div>
              )}

              {/* Items List Table */}
              <div className="bg-white rounded border border-slate-200 overflow-hidden">
                <table className="w-full border-collapse text-left text-xs text-slate-700">
                  <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">S.No</th>
                      <th className="px-4 py-2.5">Item Code</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5">Unit</th>
                      <th className="px-4 py-2.5">BOQ Quantity</th>
                      <th className="px-4 py-2.5">Contract Rate</th>
                      <th className="px-4 py-2.5">Gross Amount</th>
                      <th className="px-4 py-2.5">Remarks</th>
                      {!isViewing && <th className="px-4 py-2.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formItems.length === 0 ? (
                      <tr>
                        <td colSpan={isViewing ? 8 : 9} className="px-4 py-6 text-center text-slate-400 italic">
                          No items added. Add items manually or use the Excel Import feature.
                        </td>
                      </tr>
                    ) : (
                      formItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono text-slate-500">{index + 1}</td>
                          <td className="px-4 py-2 font-bold text-slate-800">{item.itemCode}</td>
                          <td className="px-4 py-2 font-medium">{item.description}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">{item.unit}</td>
                          <td className="px-4 py-2 font-bold">{item.boqQuantity.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 font-bold text-slate-600">₹{item.boqRate.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 font-bold text-slate-900">₹{(item.boqQuantity * item.boqRate).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 italic text-slate-500">{item.remarks || '-'}</td>
                          {!isViewing && (
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditItemInForm(index)}
                                  className="text-blue-600 hover:bg-blue-50 p-1 rounded cursor-pointer"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItemInForm(index)}
                                  className="text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-slate-600 text-right uppercase">Grand Total:</td>
                      <td colSpan={2} className="px-4 py-3"></td>
                      <td colSpan={isViewing ? 2 : 3} className="px-4 py-3 text-slate-950 text-base">₹{totalBOQAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setSelectedBOQ(null);
                    updateHasUnsavedChanges(false);
                  }}
                  className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded border border-slate-300 cursor-pointer"
                >
                  Close Window
                </button>
                
                {!isViewing && (
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Save size={14} /> {selectedBOQ ? 'Update Specifications' : 'Save Draft Master'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Extra Variation Item Modal */}
      {isExtraModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
              <h2 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                ⚠️ Register Variation / Extra Contract Item
              </h2>
              <button onClick={() => setIsExtraModalOpen(false)} className="text-amber-700 hover:text-amber-900 font-bold text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleAddExtraItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Code</label>
                <input
                  type="text"
                  placeholder="e.g. EXTRA-CONC-01"
                  value={extraCode}
                  onChange={(e) => setExtraCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Description</label>
                <input
                  type="text"
                  placeholder="e.g. Additional excavation due to hard rock stratum..."
                  value={extraDesc}
                  onChange={(e) => setExtraDesc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">UoM</label>
                  <select
                    value={extraUnit}
                    onChange={(e) => setExtraUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5"
                  >
                    <option value="cum">cum</option>
                    <option value="sqm">sqm</option>
                    <option value="rm">rm</option>
                    <option value="kg">kg</option>
                    <option value="mt">mt</option>
                    <option value="nos">nos</option>
                    <option value="Sq.ft">Sq.ft</option>
                    <option value="Cu.ft">Cu.ft</option>
                    <option value="Rft">Rft</option>
                    <option value="Lumpsum">Lumpsum</option>
                    <option value="Bags">Bags</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Brass">Brass</option>
                    <option value="Trips">Trips</option>
                    <option value="Days">Days</option>
                    <option value="Months">Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Approved Extra Qty</label>
                  <input
                    type="number"
                    value={extraQty}
                    onChange={(e) => setExtraQty(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-bold"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Approved Extra Rate (₹)</label>
                <input
                  type="number"
                  value={extraRate}
                  onChange={(e) => setExtraRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-bold"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Variation Justification</label>
                <textarea
                  value={extraRemarks}
                  onChange={(e) => setExtraRemarks(e.target.value)}
                  placeholder="Reference official change order document or site instruction number"
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 h-16"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsExtraModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-1.5 rounded shadow-sm cursor-pointer"
                >
                  Register Variation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Simulate Quantities Updates */}
      {isSimulateModalOpen && simItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-200 flex justify-between items-center">
              <h2 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                📊 Log Physical {simItem.type === 'executed' ? 'Physical Execution' : 'Billing Certification'}
              </h2>
              <button onClick={() => { setIsSimulateModalOpen(false); setSimItem(null); }} className="text-blue-750 hover:text-blue-950 font-bold text-lg cursor-pointer">×</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Item Reference: <strong className="text-slate-800">{simItem.code}</strong></p>
                <p className="text-xs text-slate-500">Provide the total physical quantity logged for verification.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Total Quantity Value</label>
                <input
                  type="number"
                  value={simValue}
                  onChange={(e) => setSimValue(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-bold"
                  min="0"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsSimulateModalOpen(false); setSimItem(null); }}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSimulation}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded shadow-sm cursor-pointer"
                >
                  Log Quantity Value
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
