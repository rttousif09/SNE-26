import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, Plus, Edit, Eye, Trash2, Printer, Download, RefreshCw, 
  Search, Filter, CheckCircle, Clock, AlertTriangle, ChevronRight, ChevronDown, 
  ChevronUp, FileSpreadsheet, ArrowLeft, Send, RotateCcw, ShieldCheck, Check,
  X, Layers, Calendar, MapPin, Building, FileText, CornerDownRight, Tag
} from 'lucide-react';
import { useAppContext } from '../store';
import { JMR, JMRItem, JMRStatus, JMRMeasurementRow, BOQ, BOQItem, Project } from '../types';
import { JMRMeasurementModal } from '../components/JMRMeasurementModal';
import { JMRExcelModal } from '../components/JMRExcelModal';
import { exportJMRToPDF, exportJMRToExcel, exportJMRRegisterToExcel } from '../utils/jmrExport';

interface JMRPageProps {
  onUnsavedChange?: (hasUnsaved: boolean) => void;
  initialAction?: string;
  initialProjectId?: string;
  initialBoqId?: string;
}

export const JMRPage: React.FC<JMRPageProps> = ({
  onUnsavedChange,
  initialAction,
  initialProjectId,
  initialBoqId
}) => {
  const { 
    jmrs, 
    jmrAuditLogs, 
    boqs, 
    projects, 
    refreshJMRs, 
    addJMR, 
    updateJMR, 
    deleteJMR, 
    addJMRAuditLog,
    user 
  } = useAppContext();

  // Mode: 'register' | 'create' | 'edit' | 'display' | 'audit'
  const [viewMode, setViewMode] = useState<'register' | 'create' | 'edit' | 'display' | 'audit'>('register');
  const [activeTab, setActiveTab] = useState<string>('All');
  
  // Selection & Filters
  const [selectedJmrId, setSelectedJmrId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId || 'All');
  const [boqFilter, setBoqFilter] = useState<string>(initialBoqId || 'All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Creation / Edit Wizard State
  const [wizardProjectId, setWizardProjectId] = useState<string>('');
  const [wizardBoqId, setWizardBoqId] = useState<string>('');
  const [wizardJmrNo, setWizardJmrNo] = useState<string>('');
  const [wizardDate, setWizardDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [wizardStartDate, setWizardStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [wizardEndDate, setWizardEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [wizardLocation, setWizardLocation] = useState<string>('');
  const [wizardRefNo, setWizardRefNo] = useState<string>('');
  const [wizardRemarks, setWizardRemarks] = useState<string>('');
  const [wizardItems, setWizardItems] = useState<JMRItem[]>([]);
  const [selectedItemIndices, setSelectedItemIndices] = useState<Set<number>>(new Set());
  const [itemSearchText, setItemSearchText] = useState<string>('');

  // Measurement Modal State
  const [activeMeasurementItem, setActiveMeasurementItem] = useState<JMRItem | null>(null);
  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState<boolean>(false);

  // Bulk Excel Upload Modal State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);

  // Workflow Dialogs (Submit, Verify, Approve, Return)
  const [workflowModal, setWorkflowModal] = useState<{
    type: 'submit' | 'verify' | 'approve' | 'return' | null;
    jmr: JMR | null;
    remarks: string;
  }>({ type: null, jmr: null, remarks: '' });

  // Load Initial Action if provided
  useEffect(() => {
    if (initialAction === 'create') {
      handleOpenCreate();
    }
  }, [initialAction]);

  // Selected JMR object
  const currentJmr = useMemo(() => {
    return jmrs.find(j => j.id === selectedJmrId) || null;
  }, [jmrs, selectedJmrId]);

  // Filtered JMRs for ALV Table
  const filteredJmrs = useMemo(() => {
    return jmrs.filter(j => {
      // Tab filter
      if (activeTab !== 'All' && j.status !== activeTab) {
        return false;
      }
      // Project filter
      if (projectFilter !== 'All' && j.projectId !== projectFilter) {
        return false;
      }
      // BOQ filter
      if (boqFilter !== 'All' && j.boqId !== boqFilter) {
        return false;
      }
      // Date range filter
      if (dateFrom && j.date < dateFrom) return false;
      if (dateTo && j.date > dateTo) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const proj = projects.find(p => p.id === j.projectId);
        const matchNo = j.jmrNo.toLowerCase().includes(q);
        const matchClient = (j.clientName || '').toLowerCase().includes(q);
        const matchProj = (proj?.name || '').toLowerCase().includes(q) || j.projectId.toLowerCase().includes(q);
        const matchLoc = (j.location || '').toLowerCase().includes(q);
        const matchItems = (j.items || []).some(it => 
          it.itemNumber.toLowerCase().includes(q) || 
          it.description.toLowerCase().includes(q) ||
          (it.itemCode || '').toLowerCase().includes(q)
        );
        return matchNo || matchClient || matchProj || matchLoc || matchItems;
      }
      return true;
    });
  }, [jmrs, activeTab, projectFilter, boqFilter, dateFrom, dateTo, searchQuery, projects]);

  // Status Counts for Tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: jmrs.length,
      Draft: 0,
      Submitted: 0,
      'Under Verification': 0,
      Returned: 0,
      Approved: 0,
      'Partially Billed': 0,
      Billed: 0
    };
    jmrs.forEach(j => {
      if (counts[j.status] !== undefined) {
        counts[j.status]++;
      }
    });
    return counts;
  }, [jmrs]);

  // Auto-generate JMR Number when project changes
  const generateNextJmrNo = (projId: string): string => {
    const proj = projects.find(p => p.id === projId);
    const shortCode = (proj as any)?.code || projId || 'PRJ';
    const count = jmrs.filter(j => j.projectId === projId).length + 1;
    const padded = String(count).padStart(3, '0');
    return `JMR/${shortCode}/2026-27/${padded}`;
  };

  // Open Create Wizard
  const handleOpenCreate = () => {
    const defaultProjId = projects[0]?.id || '';
    const projBoqs = boqs.filter(b => b.projectId === defaultProjId && b.status !== 'Draft');
    const defaultBoq = projBoqs[0] || boqs.find(b => b.projectId === defaultProjId) || null;

    setWizardProjectId(defaultProjId);
    setWizardBoqId(defaultBoq?.id || '');
    setWizardJmrNo(generateNextJmrNo(defaultProjId));
    setWizardDate(new Date().toISOString().split('T')[0]);
    setWizardStartDate(new Date().toISOString().split('T')[0]);
    setWizardEndDate(new Date().toISOString().split('T')[0]);
    setWizardLocation('');
    setWizardRefNo('');
    setWizardRemarks('');

    if (defaultBoq) {
      populateWizardItemsFromBoq(defaultBoq);
    } else {
      setWizardItems([]);
      setSelectedItemIndices(new Set());
    }

    setViewMode('create');
  };

  // Populate items from BOQ
  const populateWizardItemsFromBoq = (boq: BOQ) => {
    // Calculate historical approved measurements for each BOQ item
    const approvedJmrsForBoq = jmrs.filter(j => j.boqId === boq.id && (j.status === 'Approved' || j.status === 'Partially Billed' || j.status === 'Billed'));
    const approvedQtyByItemId: Record<string, number> = {};
    const billedQtyByItemId: Record<string, number> = {};

    approvedJmrsForBoq.forEach(j => {
      (j.items || []).forEach(it => {
        approvedQtyByItemId[it.boqItemId] = (approvedQtyByItemId[it.boqItemId] || 0) + (it.netQuantity || 0);
      });
    });

    const items: JMRItem[] = (boq.items || []).map(bItem => {
      const contractQty = bItem.approvedRevisedQuantity ?? bItem.contractQuantity ?? bItem.boqQuantity ?? 0;
      const rate = bItem.approvedRevisedRate ?? bItem.unitRate ?? bItem.boqRate ?? 0;
      const prevApproved = approvedQtyByItemId[bItem.id] || 0;
      const prevBilled = bItem.billedQuantity || billedQtyByItemId[bItem.id] || 0;
      const avail = Math.max(0, contractQty - prevApproved);

      return {
        id: `jmritem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        boqItemId: bItem.id,
        itemNumber: bItem.itemNumber || bItem.itemCode || '1',
        itemCode: bItem.itemCode || '',
        description: bItem.description || '',
        unit: bItem.unit || 'EA',
        rate,
        contractQuantity: contractQty,
        previouslyApprovedQuantity: prevApproved,
        previouslyBilledQuantity: prevBilled,
        availableContractQuantity: avail,
        netQuantity: 0,
        currentClaimAmount: 0,
        measurementRows: [],
        remarks: ''
      };
    });

    setWizardItems(items);
    // Initially select all items with available quantity
    const initialSelected = new Set<number>();
    items.forEach((it, idx) => {
      if (it.availableContractQuantity > 0) {
        initialSelected.add(idx);
      }
    });
    setSelectedItemIndices(initialSelected);
  };

  // Handle Wizard Project Change
  const handleWizardProjectChange = (projId: string) => {
    setWizardProjectId(projId);
    setWizardJmrNo(generateNextJmrNo(projId));
    const projBoqs = boqs.filter(b => b.projectId === projId);
    const firstBoq = projBoqs[0] || null;
    setWizardBoqId(firstBoq?.id || '');
    if (firstBoq) {
      populateWizardItemsFromBoq(firstBoq);
    } else {
      setWizardItems([]);
      setSelectedItemIndices(new Set());
    }
  };

  // Handle Wizard BOQ Change
  const handleWizardBoqChange = (boqId: string) => {
    setWizardBoqId(boqId);
    const boq = boqs.find(b => b.id === boqId);
    if (boq) {
      populateWizardItemsFromBoq(boq);
    }
  };

  // Open Edit Wizard
  const handleOpenEdit = (jmr: JMR) => {
    if (jmr.status === 'Approved' || jmr.status === 'Partially Billed' || jmr.status === 'Billed') {
      alert(`JMR ${jmr.jmrNo} is ${jmr.status} and cannot be modified. You can view or print it.`);
      return;
    }
    setSelectedJmrId(jmr.id);
    setWizardProjectId(jmr.projectId);
    setWizardBoqId(jmr.boqId);
    setWizardJmrNo(jmr.jmrNo);
    setWizardDate(jmr.date);
    setWizardStartDate(jmr.startDate);
    setWizardEndDate(jmr.endDate);
    setWizardLocation(jmr.location || '');
    setWizardRefNo(jmr.referenceNo || '');
    setWizardRemarks(jmr.remarks || '');
    setWizardItems(JSON.parse(JSON.stringify(jmr.items || [])));

    // Pre-select items that have measurement rows or non-zero claims
    const selected = new Set<number>();
    (jmr.items || []).forEach((it, idx) => {
      if ((it.measurementRows && it.measurementRows.length > 0) || (it.netQuantity && it.netQuantity !== 0)) {
        selected.add(idx);
      }
    });
    setSelectedItemIndices(selected);
    setViewMode('edit');
  };

  // Open Display View
  const handleOpenDisplay = (jmr: JMR) => {
    setSelectedJmrId(jmr.id);
    setViewMode('display');
  };

  // Toggle item selection checkbox
  const handleToggleItemSelection = (index: number) => {
    const next = new Set(selectedItemIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedItemIndices(next);
  };

  // Select / Deselect All
  const handleSelectAll = (select: boolean) => {
    if (select) {
      const all = new Set<number>();
      wizardItems.forEach((_, i) => all.add(i));
      setSelectedItemIndices(all);
    } else {
      setSelectedItemIndices(new Set());
    }
  };

  // Open Measurement Modal for a specific item
  const handleOpenItemMeasurement = (item: JMRItem) => {
    setActiveMeasurementItem(item);
    setIsMeasurementModalOpen(true);
  };

  // Save updated item from Measurement Modal
  const handleSaveMeasurementItem = (updatedItem: JMRItem) => {
    setWizardItems(prev => prev.map(it => it.id === updatedItem.id ? updatedItem : it));
    // Ensure item index is marked as selected if it now has measurements
    const idx = wizardItems.findIndex(it => it.id === updatedItem.id);
    if (idx !== -1 && (updatedItem.measurementRows?.length > 0 || updatedItem.netQuantity !== 0)) {
      setSelectedItemIndices(prev => new Set(prev).add(idx));
    }
  };

  // Handle Bulk Excel Import Commit
  const handleImportExcelRows = (groupedRows: Record<string, JMRMeasurementRow[]>) => {
    setWizardItems(prev => prev.map((item, idx) => {
      const imported = groupedRows[item.itemNumber];
      if (!imported || imported.length === 0) return item;

      // Merge imported rows
      const combinedRows = [...(item.measurementRows || []), ...imported];
      let addTotal = 0;
      let subTotal = 0;
      combinedRows.forEach(r => {
        const q = Number(r.calculatedQuantity) || 0;
        if (r.entryType === 'Add') addTotal += q;
        else subTotal += q;
      });
      const net = parseFloat((addTotal - subTotal).toFixed(4));
      const claimAmt = parseFloat((net * (item.rate || 0)).toFixed(2));

      // Auto-select this item
      setSelectedItemIndices(s => new Set(s).add(idx));

      return {
        ...item,
        measurementRows: combinedRows,
        netQuantity: net,
        currentClaimAmount: claimAmt
      };
    }));
  };

  // Computed wizard totals
  const wizardTotals = useMemo(() => {
    let totalClaimAmt = 0;
    let totalClaimQty = 0;
    let selectedCount = 0;

    wizardItems.forEach((item, idx) => {
      if (selectedItemIndices.has(idx)) {
        selectedCount++;
        totalClaimAmt += item.currentClaimAmount || 0;
        totalClaimQty += item.netQuantity || 0;
      }
    });

    return {
      selectedCount,
      totalClaimAmt: parseFloat(totalClaimAmt.toFixed(2)),
      totalClaimQty: parseFloat(totalClaimQty.toFixed(4))
    };
  }, [wizardItems, selectedItemIndices]);

  // Save JMR Wizard (as Draft or Submitted)
  const handleSaveJmr = async (submitDirectly = false) => {
    if (!wizardProjectId) {
      alert('Please select a project.');
      return;
    }
    if (!wizardBoqId) {
      alert('Please select a BOQ.');
      return;
    }
    if (!wizardJmrNo.trim()) {
      alert('Please provide a JMR number.');
      return;
    }

    const proj = projects.find(p => p.id === wizardProjectId);
    const boq = boqs.find(b => b.id === wizardBoqId);

    // Only include selected items that have non-zero claim or measurement rows
    const finalItems = wizardItems.filter((_, idx) => selectedItemIndices.has(idx));

    if (finalItems.length === 0) {
      if (!window.confirm('No BOQ items are selected with measurements. Do you want to save an empty JMR draft?')) {
        return;
      }
    }

    const status: JMRStatus = submitDirectly ? 'Submitted' : 'Draft';
    const now = new Date().toISOString();

    if (viewMode === 'create') {
      const newJmrData: Omit<JMR, 'id'> = {
        jmrNo: wizardJmrNo.trim(),
        projectId: wizardProjectId,
        boqId: wizardBoqId,
        company: 'SN ENTERPRISES',
        clientName: proj?.clientName || boq?.clientName || 'Client Authority',
        workOrderNo: proj?.workOrderNo || boq?.contractRef || '',
        date: wizardDate,
        startDate: wizardStartDate,
        endDate: wizardEndDate,
        location: wizardLocation.trim(),
        referenceNo: wizardRefNo.trim(),
        remarks: wizardRemarks.trim(),
        items: finalItems,
        status,
        preparedBy: user?.name || user?.username || 'Site Engineer',
        preparedDate: wizardDate,
        submittedBy: submitDirectly ? (user?.name || user?.username || 'Site Engineer') : undefined,
        submittedDate: submitDirectly ? wizardDate : undefined,
        createdDate: now,
        modifiedDate: now
      };

      const newId = await addJMR(newJmrData);
      await addJMRAuditLog({
        jmrNo: wizardJmrNo.trim(),
        username: user?.name || user?.username || 'System',
        action: submitDirectly ? 'SUBMIT' : 'CREATE_DRAFT',
        details: `Created JMR ${wizardJmrNo} with ${finalItems.length} items (${status})`
      });

      alert(`JMR ${wizardJmrNo} successfully saved as ${status}!`);
      setSelectedJmrId(newId);
      setViewMode('register');
    } else if (viewMode === 'edit' && selectedJmrId) {
      const updateData: Partial<JMR> = {
        jmrNo: wizardJmrNo.trim(),
        date: wizardDate,
        startDate: wizardStartDate,
        endDate: wizardEndDate,
        location: wizardLocation.trim(),
        referenceNo: wizardRefNo.trim(),
        remarks: wizardRemarks.trim(),
        items: finalItems,
        status: submitDirectly ? 'Submitted' : 'Draft',
        submittedBy: submitDirectly ? (user?.name || user?.username || 'Site Engineer') : undefined,
        submittedDate: submitDirectly ? wizardDate : undefined,
        modifiedDate: now
      };

      await updateJMR(selectedJmrId, updateData);
      await addJMRAuditLog({
        jmrNo: wizardJmrNo.trim(),
        username: user?.name || user?.username || 'System',
        action: submitDirectly ? 'SUBMIT' : 'UPDATE_DRAFT',
        details: `Updated JMR ${wizardJmrNo} with ${finalItems.length} items (${status})`
      });

      alert(`JMR ${wizardJmrNo} updated successfully!`);
      setViewMode('register');
    }
  };

  // Workflow actions: Submit, Verify, Approve, Return, Delete
  const handleExecuteWorkflow = async () => {
    if (!workflowModal.jmr || !workflowModal.type) return;

    const jmr = workflowModal.jmr;
    const now = new Date().toISOString().split('T')[0];
    const username = user?.name || user?.username || 'Engineer';

    if (workflowModal.type === 'submit') {
      await updateJMR(jmr.id, {
        status: 'Submitted',
        submittedBy: username,
        submittedDate: now,
        remarks: workflowModal.remarks ? `${jmr.remarks || ''}\n[Submission Notes: ${workflowModal.remarks}]` : jmr.remarks
      });
      await addJMRAuditLog({
        jmrNo: jmr.jmrNo,
        username,
        action: 'SUBMIT',
        details: `Submitted JMR for verification. Notes: ${workflowModal.remarks || 'None'}`
      });
      alert(`JMR ${jmr.jmrNo} submitted for verification.`);
    } else if (workflowModal.type === 'verify') {
      await updateJMR(jmr.id, {
        status: 'Under Verification',
        verifiedBy: username,
        verifiedDate: now,
        remarks: workflowModal.remarks ? `${jmr.remarks || ''}\n[Verification Notes: ${workflowModal.remarks}]` : jmr.remarks
      });
      await addJMRAuditLog({
        jmrNo: jmr.jmrNo,
        username,
        action: 'VERIFY',
        details: `Site measurements verified by ${username}. Notes: ${workflowModal.remarks || 'Verified on site'}`
      });
      alert(`JMR ${jmr.jmrNo} marked as Verified.`);
    } else if (workflowModal.type === 'approve') {
      await updateJMR(jmr.id, {
        status: 'Approved',
        approvedBy: username,
        approvedDate: now,
        approvalRemarks: workflowModal.remarks
      });
      await addJMRAuditLog({
        jmrNo: jmr.jmrNo,
        username,
        action: 'APPROVE',
        details: `Certified and approved JMR. Remarks: ${workflowModal.remarks || 'Certified'}`
      });
      alert(`JMR ${jmr.jmrNo} has been officially APPROVED! Measurements are now certified for RA Billing.`);
    } else if (workflowModal.type === 'return') {
      if (!workflowModal.remarks.trim()) {
        alert('Please state the specific reason for returning the JMR.');
        return;
      }
      await updateJMR(jmr.id, {
        status: 'Returned',
        returnReason: workflowModal.remarks
      });
      await addJMRAuditLog({
        jmrNo: jmr.jmrNo,
        username,
        action: 'RETURN',
        details: `Returned JMR for correction. Reason: ${workflowModal.remarks}`
      });
      alert(`JMR ${jmr.jmrNo} returned for site corrections.`);
    }

    setWorkflowModal({ type: null, jmr: null, remarks: '' });
  };

  // Delete Draft JMR
  const handleDeleteDraft = async (jmr: JMR) => {
    if (jmr.status !== 'Draft' && jmr.status !== 'Returned') {
      alert(`Cannot delete JMR with status '${jmr.status}'. Only Draft or Returned JMRs can be deleted.`);
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete Draft JMR ${jmr.jmrNo}?`)) {
      await deleteJMR(jmr.id);
      await addJMRAuditLog({
        jmrNo: jmr.jmrNo,
        username: user?.name || user?.username || 'System',
        action: 'DELETE',
        details: `Deleted draft JMR ${jmr.jmrNo}`
      });
      if (selectedJmrId === jmr.id) setSelectedJmrId(null);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: JMRStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="bg-gray-100 text-gray-800 border border-gray-300 px-1.5 py-0.5 text-[10px] font-bold">DRAFT</span>;
      case 'Submitted':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold">SUBMITTED</span>;
      case 'Under Verification':
        return <span className="bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 text-[10px] font-bold">UNDER VERIF</span>;
      case 'Returned':
        return <span className="bg-rose-100 text-rose-900 border border-rose-300 px-1.5 py-0.5 text-[10px] font-bold">RETURNED</span>;
      case 'Approved':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">APPROVED</span>;
      case 'Partially Billed':
        return <span className="bg-cyan-100 text-cyan-900 border border-cyan-300 px-1.5 py-0.5 text-[10px] font-bold">PARTIAL BILLED</span>;
      case 'Billed':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 px-1.5 py-0.5 text-[10px] font-bold">BILLED</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 text-[10px]">{status}</span>;
    }
  };

  // Filtered wizard items for table display
  const filteredWizardItems = useMemo(() => {
    if (!itemSearchText.trim()) return wizardItems;
    const q = itemSearchText.toLowerCase();
    return wizardItems.filter(it => 
      it.itemNumber.toLowerCase().includes(q) ||
      (it.itemCode || '').toLowerCase().includes(q) ||
      it.description.toLowerCase().includes(q)
    );
  }, [wizardItems, itemSearchText]);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] text-slate-800 font-sans text-xs">
      
      {/* =========================================================================
          TOP SAP TITLE BAR & APP CONTEXT
         ========================================================================= */}
      <div className="bg-[#1e3a5f] text-white px-4 py-2 border-b border-[#0f233a] flex items-center justify-between flex-shrink-0 select-none shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-1 rounded-none border border-white/20">
            <Calculator size={16} className="text-[#a5c7f9]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wide text-sm">
                JMR01 — JOINT MEASUREMENT RECORD WORKBENCH
              </span>
              <span className="bg-blue-900/80 text-blue-200 text-[10px] font-mono px-2 py-0.5 border border-blue-700">
                SAP GUI Classic
              </span>
            </div>
            <div className="text-[10px] text-blue-200 flex items-center gap-3">
              <span>Company: <strong className="text-white">SN ENTERPRISES</strong></span>
              <span>•</span>
              <span>Client & Subcontractor Measurement Certification</span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher / Breadcrumb */}
        <div className="flex items-center gap-2">
          {viewMode !== 'register' && (
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 text-xs font-semibold flex items-center gap-1 border border-white/20 transition-colors"
            >
              <ArrowLeft size={13} /> Back to Register
            </button>
          )}
          <button
            type="button"
            onClick={() => setViewMode('audit')}
            className={`px-2.5 py-1 text-xs font-semibold flex items-center gap-1 border transition-colors ${viewMode === 'audit' ? 'bg-amber-600 text-white border-amber-700' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}`}
          >
            <ShieldCheck size={13} /> Audit Trail
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE: REGISTER (MAIN ALV TABLE & WORKBENCH)
         ========================================================================= */}
      {viewMode === 'register' && (
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* SAP Action Toolbar */}
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-3 py-1 font-semibold flex items-center gap-1 border border-[#1b5e20] shadow-2xs transition-colors"
                title="Create New JMR (F5)"
              >
                <Plus size={13} /> Create JMR
              </button>

              <button
                type="button"
                disabled={!selectedJmrId}
                onClick={() => currentJmr && handleOpenDisplay(currentJmr)}
                className={`px-2.5 py-1 font-semibold flex items-center gap-1 border shadow-2xs transition-colors ${selectedJmrId ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-400' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Display Details (F7)"
              >
                <Eye size={13} /> Display
              </button>

              <button
                type="button"
                disabled={!selectedJmrId || (currentJmr && currentJmr.status !== 'Draft' && currentJmr.status !== 'Returned')}
                onClick={() => currentJmr && handleOpenEdit(currentJmr)}
                className={`px-2.5 py-1 font-semibold flex items-center gap-1 border shadow-2xs transition-colors ${selectedJmrId && (currentJmr?.status === 'Draft' || currentJmr?.status === 'Returned') ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-400' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Change / Edit Draft (F6)"
              >
                <Edit size={13} /> Change
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1" />

              {/* Submit for verification */}
              <button
                type="button"
                disabled={!selectedJmrId || currentJmr?.status !== 'Draft'}
                onClick={() => currentJmr && setWorkflowModal({ type: 'submit', jmr: currentJmr, remarks: '' })}
                className={`px-2.5 py-1 font-semibold flex items-center gap-1 border shadow-2xs transition-colors ${selectedJmrId && currentJmr?.status === 'Draft' ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-[#1d4ed8]' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Submit for Site Verification"
              >
                <Send size={12} /> Submit
              </button>

              {/* Site Engineer Verification */}
              <button
                type="button"
                disabled={!selectedJmrId || currentJmr?.status !== 'Submitted'}
                onClick={() => currentJmr && setWorkflowModal({ type: 'verify', jmr: currentJmr, remarks: '' })}
                className={`px-2.5 py-1 font-semibold flex items-center gap-1 border shadow-2xs transition-colors ${selectedJmrId && currentJmr?.status === 'Submitted' ? 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white border-[#6d28d9]' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Verify Site Measurements"
              >
                <CheckCircle size={12} /> Verify
              </button>

              {/* Client / Authority Approval */}
              <button
                type="button"
                disabled={!selectedJmrId || (currentJmr?.status !== 'Submitted' && currentJmr?.status !== 'Under Verification')}
                onClick={() => currentJmr && setWorkflowModal({ type: 'approve', jmr: currentJmr, remarks: '' })}
                className={`px-2.5 py-1 font-semibold flex items-center gap-1 border shadow-2xs transition-colors ${selectedJmrId && (currentJmr?.status === 'Submitted' || currentJmr?.status === 'Under Verification') ? 'bg-[#059669] hover:bg-[#047857] text-white border-[#047857]' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Approve / Certify JMR"
              >
                <ShieldCheck size={12} /> Approve
              </button>

              {/* Return for correction */}
              <button
                type="button"
                disabled={!selectedJmrId || (currentJmr?.status !== 'Submitted' && currentJmr?.status !== 'Under Verification')}
                onClick={() => currentJmr && setWorkflowModal({ type: 'return', jmr: currentJmr, remarks: '' })}
                className={`px-2 py-1 font-semibold flex items-center gap-1 border shadow-2xs transition-colors ${selectedJmrId && (currentJmr?.status === 'Submitted' || currentJmr?.status === 'Under Verification') ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Return with Comments"
              >
                <RotateCcw size={12} /> Return
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1" />

              {/* Delete Draft */}
              <button
                type="button"
                disabled={!selectedJmrId || (currentJmr?.status !== 'Draft' && currentJmr?.status !== 'Returned')}
                onClick={() => currentJmr && handleDeleteDraft(currentJmr)}
                className={`px-2 py-1 flex items-center gap-1 border transition-colors ${selectedJmrId && (currentJmr?.status === 'Draft' || currentJmr?.status === 'Returned') ? 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Delete Draft"
              >
                <Trash2 size={12} /> Delete Draft
              </button>
            </div>

            {/* Print & Export Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!selectedJmrId}
                onClick={() => {
                  if (currentJmr) {
                    const p = projects.find(proj => proj.id === currentJmr.projectId);
                    const b = boqs.find(boq => boq.id === currentJmr.boqId);
                    exportJMRToPDF(currentJmr, p, b);
                  }
                }}
                className={`px-2.5 py-1 font-semibold flex items-center gap-1 border shadow-2xs ${selectedJmrId ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-400' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Print Official JMR PDF"
              >
                <Printer size={13} /> Print PDF
              </button>

              <button
                type="button"
                disabled={!selectedJmrId}
                onClick={() => {
                  if (currentJmr) {
                    const p = projects.find(proj => proj.id === currentJmr.projectId);
                    const b = boqs.find(boq => boq.id === currentJmr.boqId);
                    exportJMRToExcel(currentJmr, p, b);
                  }
                }}
                className={`px-2.5 py-1 font-semibold flex items-center gap-1 border shadow-2xs ${selectedJmrId ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-400' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                title="Export Detailed Measurements to Excel"
              >
                <Download size={13} /> Export Excel
              </button>

              <button
                type="button"
                onClick={() => exportJMRRegisterToExcel(filteredJmrs, projects)}
                className="bg-white hover:bg-gray-100 text-gray-800 px-2 py-1 font-semibold flex items-center gap-1 border border-gray-400 shadow-2xs"
                title="Export Filtered Register to Excel"
              >
                <FileSpreadsheet size={13} /> Export Register
              </button>

              <button
                type="button"
                onClick={() => refreshJMRs()}
                className="bg-white hover:bg-gray-100 text-gray-700 px-2 py-1 border border-gray-300 shadow-2xs"
                title="Refresh Table"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* SAP Filter Ribbon */}
          <div className="bg-[#e4ebf3] border-b border-[#b6c7db] px-4 py-2 flex flex-wrap items-center gap-3 flex-shrink-0 text-[11px]">
            {/* Project Filter */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#1e3a5f]">Project:</span>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setBoqFilter('All');
                }}
                className="h-6 px-1.5 border border-[#8c9ba8] rounded-none bg-white font-medium"
              >
                <option value="All">All Projects ({projects.length})</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
            </div>

            {/* BOQ / Work Order Filter */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#1e3a5f]">BOQ / WO:</span>
              <select
                value={boqFilter}
                onChange={(e) => setBoqFilter(e.target.value)}
                className="h-6 px-1.5 border border-[#8c9ba8] rounded-none bg-white font-medium max-w-xs truncate"
              >
                <option value="All">All BOQs</option>
                {boqs
                  .filter(b => projectFilter === 'All' || b.projectId === projectFilter)
                  .map(b => (
                    <option key={b.id} value={b.id}>{b.boqNo} {b.contractRef ? `(${b.contractRef})` : ''}</option>
                  ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#1e3a5f]">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-6 px-1 border border-[#8c9ba8] rounded-none bg-white font-mono text-[10px]"
              />
              <span className="font-bold text-[#1e3a5f]">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-6 px-1 border border-[#8c9ba8] rounded-none bg-white font-mono text-[10px]"
              />
            </div>

            {/* Text Search Box */}
            <div className="flex items-center gap-1 ml-auto">
              <Search size={13} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search JMR #, Client, Items, Loc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-6 px-2 w-56 border border-[#8c9ba8] rounded-none bg-white text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs Navigation */}
          <div className="bg-[#d0deed] border-b border-[#8c9ba8] px-3 flex flex-wrap gap-1 flex-shrink-0 pt-1 select-none">
            {['All', 'Draft', 'Submitted', 'Under Verification', 'Returned', 'Approved', 'Partially Billed', 'Billed'].map((tab) => {
              const count = statusCounts[tab] || 0;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 font-semibold text-xs border-t border-l border-r transition-colors flex items-center gap-1.5 ${isActive ? 'bg-white text-[#1e3a5f] border-[#8c9ba8] border-b-white -mb-px font-bold shadow-2xs' : 'bg-[#e4ebf3] text-gray-600 hover:bg-white/60 border-transparent'}`}
                >
                  <span>{tab}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${isActive ? 'bg-[#1e3a5f] text-white' : 'bg-gray-300 text-gray-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ALV Table Container (flex-1 min-h-0 overflow-y-auto) */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white p-2">
            {filteredJmrs.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 p-8 text-center bg-gray-50/50 my-6">
                <Calculator size={36} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-700 font-bold text-sm">No Joint Measurement Records found matching criteria.</p>
                <p className="text-gray-500 text-xs mt-1">
                  Click <strong>Create JMR</strong> above to record measurements against contract BOQs.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-3 bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-3 py-1.5 font-semibold text-xs inline-flex items-center gap-1 shadow-2xs"
                >
                  <Plus size={13} /> Create First JMR
                </button>
              </div>
            ) : (
              <div className="border border-[#b6c7db] overflow-x-auto shadow-2xs">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#2f4f75] text-white text-[10px] uppercase font-semibold tracking-wider select-none">
                      <th className="p-1.5 text-center w-8 border-r border-[#1e3a5f]"></th>
                      <th className="p-1.5 w-32 border-r border-[#1e3a5f]">JMR Number</th>
                      <th className="p-1.5 w-44 border-r border-[#1e3a5f]">Project</th>
                      <th className="p-1.5 w-28 border-r border-[#1e3a5f]">BOQ / WO Ref</th>
                      <th className="p-1.5 w-36 border-r border-[#1e3a5f]">Client</th>
                      <th className="p-1.5 w-24 border-r border-[#1e3a5f]">JMR Date</th>
                      <th className="p-1.5 w-36 border-r border-[#1e3a5f]">Measurement Period</th>
                      <th className="p-1.5 text-center w-16 border-r border-[#1e3a5f]">Items</th>
                      <th className="p-1.5 text-right w-24 border-r border-[#1e3a5f]">Total Qty</th>
                      <th className="p-1.5 text-right w-28 border-r border-[#1e3a5f]">Claim Value (₹)</th>
                      <th className="p-1.5 text-center w-28 border-r border-[#1e3a5f]">Status</th>
                      <th className="p-1.5 w-24 border-r border-[#1e3a5f]">Prepared By</th>
                      <th className="p-1.5 w-24 border-r border-[#1e3a5f]">Approved By</th>
                      <th className="p-1.5 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredJmrs.map((jmr) => {
                      const isSelected = selectedJmrId === jmr.id;
                      const isExpanded = expandedRowId === jmr.id;
                      const proj = projects.find(p => p.id === jmr.projectId);
                      const boq = boqs.find(b => b.id === jmr.boqId);
                      const totalQty = (jmr.items || []).reduce((acc, it) => acc + (it.netQuantity || 0), 0);
                      const totalAmt = (jmr.items || []).reduce((acc, it) => acc + (it.currentClaimAmount || 0), 0);

                      return (
                        <React.Fragment key={jmr.id}>
                          <tr
                            onClick={() => setSelectedJmrId(jmr.id)}
                            onDoubleClick={() => handleOpenDisplay(jmr)}
                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-100/90 font-medium' : 'hover:bg-blue-50/50 bg-white'}`}
                          >
                            {/* Expand row arrow */}
                            <td 
                              className="p-1 text-center border-r border-gray-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRowId(isExpanded ? null : jmr.id);
                              }}
                            >
                              <button className="text-gray-500 hover:text-blue-800 p-0.5">
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                            </td>

                            {/* JMR Number */}
                            <td className="p-1.5 font-mono font-bold text-[#1e3a5f] border-r border-gray-200">
                              {jmr.jmrNo}
                            </td>

                            {/* Project */}
                            <td className="p-1.5 border-r border-gray-200 truncate max-w-xs" title={proj?.name || jmr.projectId}>
                              <span className="font-semibold">{proj?.name || jmr.projectId}</span>
                              <span className="text-[10px] text-gray-500 block font-mono">{jmr.projectId}</span>
                            </td>

                            {/* BOQ / WO Ref */}
                            <td className="p-1.5 border-r border-gray-200 font-mono text-[10px] text-gray-700">
                              <div>{boq?.boqNo || jmr.boqId}</div>
                              {jmr.workOrderNo && <div className="text-gray-500">WO: {jmr.workOrderNo}</div>}
                            </td>

                            {/* Client */}
                            <td className="p-1.5 border-r border-gray-200 truncate max-w-xs text-gray-700">
                              {jmr.clientName || proj?.clientName || '—'}
                            </td>

                            {/* Date */}
                            <td className="p-1.5 border-r border-gray-200 font-mono text-[10px] text-gray-700">
                              {jmr.date}
                            </td>

                            {/* Period */}
                            <td className="p-1.5 border-r border-gray-200 font-mono text-[10px] text-gray-600">
                              {jmr.startDate} <span className="text-gray-400">to</span> {jmr.endDate}
                            </td>

                            {/* Items count */}
                            <td className="p-1.5 text-center font-mono border-r border-gray-200">
                              {(jmr.items || []).length}
                            </td>

                            {/* Total Qty */}
                            <td className="p-1.5 text-right font-mono border-r border-gray-200 text-gray-800">
                              {totalQty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Total Claim Amount */}
                            <td className="p-1.5 text-right font-mono font-bold border-r border-gray-200 text-[#1e3a5f]">
                              ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Status */}
                            <td className="p-1 text-center border-r border-gray-200">
                              {renderStatusBadge(jmr.status)}
                            </td>

                            {/* Prepared By */}
                            <td className="p-1.5 border-r border-gray-200 text-gray-600 truncate max-w-xs">
                              {jmr.preparedBy || '—'}
                            </td>

                            {/* Approved By */}
                            <td className="p-1.5 border-r border-gray-200 text-gray-600 truncate max-w-xs">
                              {jmr.approvedBy || (jmr.status === 'Submitted' ? <span className="text-amber-600 italic">Pending</span> : '—')}
                            </td>

                            {/* Actions Quick Icons */}
                            <td className="p-1 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDisplay(jmr);
                                  }}
                                  className="text-gray-600 hover:text-blue-800 p-0.5"
                                  title="Display"
                                >
                                  <Eye size={12} />
                                </button>
                                {(jmr.status === 'Draft' || jmr.status === 'Returned') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEdit(jmr);
                                    }}
                                    className="text-gray-600 hover:text-amber-700 p-0.5"
                                    title="Edit"
                                  >
                                    <Edit size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportJMRToPDF(jmr, proj, boq);
                                  }}
                                  className="text-gray-600 hover:text-purple-700 p-0.5"
                                  title="Print PDF"
                                >
                                  <Printer size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Item Breakdown Row */}
                          {isExpanded && (
                            <tr className="bg-[#f8fafc] border-b border-gray-300">
                              <td colSpan={14} className="p-3 pl-10">
                                <div className="border border-[#b6c7db] bg-white p-2">
                                  <div className="flex items-center justify-between border-b pb-1 mb-2 font-bold text-gray-700 text-xs">
                                    <span className="flex items-center gap-1.5 text-[#1e3a5f]">
                                      <Layers size={13} /> Measurement Items in {jmr.jmrNo}:
                                    </span>
                                    <span className="text-gray-500 font-mono text-[10px]">
                                      Location: {jmr.location || 'Site Wide'} | Ref: {jmr.referenceNo || 'None'}
                                    </span>
                                  </div>

                                  <table className="w-full text-left border-collapse text-[10px]">
                                    <thead>
                                      <tr className="bg-[#e4ebf3] text-gray-700 uppercase font-semibold">
                                        <th className="p-1 w-12 text-center">Item #</th>
                                        <th className="p-1 w-16">Code</th>
                                        <th className="p-1">Description</th>
                                        <th className="p-1 w-12 text-center">Unit</th>
                                        <th className="p-1 w-16 text-right">Rate (₹)</th>
                                        <th className="p-1 w-20 text-right">Contract Qty</th>
                                        <th className="p-1 w-20 text-right">Prev Approved</th>
                                        <th className="p-1 w-20 text-right font-bold text-[#1e3a5f]">Net Claim Qty</th>
                                        <th className="p-1 w-24 text-right font-bold text-[#1e3a5f]">Claim Amt (₹)</th>
                                        <th className="p-1 w-24 text-center">Rows</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono">
                                      {(jmr.items || []).map((it) => {
                                        const addCount = (it.measurementRows || []).filter(r => r.entryType === 'Add').length;
                                        const subCount = (it.measurementRows || []).filter(r => r.entryType === 'Subtract').length;
                                        return (
                                          <tr key={it.id} className="hover:bg-gray-50">
                                            <td className="p-1 text-center font-bold text-[#1e3a5f]">{it.itemNumber}</td>
                                            <td className="p-1 text-gray-600">{it.itemCode || '—'}</td>
                                            <td className="p-1 font-sans text-gray-800 truncate max-w-md" title={it.description}>
                                              {it.description}
                                            </td>
                                            <td className="p-1 text-center">{it.unit}</td>
                                            <td className="p-1 text-right">₹{(it.rate || 0).toLocaleString('en-IN')}</td>
                                            <td className="p-1 text-right text-gray-600">{(it.contractQuantity || 0).toLocaleString('en-IN')}</td>
                                            <td className="p-1 text-right text-gray-600">{(it.previouslyApprovedQuantity || 0).toLocaleString('en-IN')}</td>
                                            <td className="p-1 text-right font-bold text-emerald-800">
                                              {(it.netQuantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-1 text-right font-bold text-[#1e3a5f]">
                                              ₹{(it.currentClaimAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-1 text-center font-sans text-[9px]">
                                              <span className="text-emerald-700 font-bold">{addCount} Add</span>
                                              {subCount > 0 && <span className="text-rose-700 font-bold ml-1">{subCount} Sub</span>}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Persistent Footer Summary Bar */}
          <div className="bg-[#f0f2f5] border-t border-[#8c9ba8] px-4 py-1.5 flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-4 text-gray-600 text-[11px]">
              <span>Showing: <strong className="text-gray-900">{filteredJmrs.length}</strong> of {jmrs.length} JMRs</span>
              <span>•</span>
              <span>Double-click any row to view complete measurement sheet</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold text-xs">
              <span>Total Filtered Claim Value:</span>
              <span className="bg-[#1e3a5f] text-white px-2.5 py-0.5 shadow-2xs">
                ₹{filteredJmrs.reduce((acc, j) => acc + (j.items || []).reduce((sum, it) => sum + (it.currentClaimAmount || 0), 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          VIEW MODE: CREATE OR EDIT JMR (RELIANCE SUPPLIERFIRST-STYLE WIZARD)
         ========================================================================= */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
          
          {/* Header Action Bar */}
          <div className="bg-[#e4ebf3] border-b border-[#b6c7db] px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1e3a5f] text-sm">
                {viewMode === 'create' ? 'CREATE NEW JOINT MEASUREMENT RECORD' : `EDIT JMR: ${wizardJmrNo}`}
              </span>
              <span className="text-gray-500 text-xs">| Reliance SupplierFirst Workflow</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('register')}
                className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1 font-semibold border border-gray-400 shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveJmr(false)}
                className="bg-[#2f4f75] hover:bg-[#1e3a5f] text-white px-4 py-1 font-semibold border border-[#1e3a5f] shadow-2xs"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveJmr(true)}
                className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-1 font-bold border border-[#1b5e20] shadow-2xs flex items-center gap-1"
              >
                <Send size={13} /> Submit for Verification
              </button>
            </div>
          </div>

          {/* Top Form: Master Information Ribbon */}
          <div className="bg-white border-b border-[#cbd5e1] p-3 flex-shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              
              {/* Project Selection */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">Project *</label>
                <select
                  disabled={viewMode === 'edit'}
                  value={wizardProjectId}
                  onChange={(e) => handleWizardProjectChange(e.target.value)}
                  className="w-full h-7 px-1.5 border border-gray-300 rounded-none bg-white font-medium"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>

              {/* BOQ Selection */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">BOQ / Work Order *</label>
                <select
                  disabled={viewMode === 'edit'}
                  value={wizardBoqId}
                  onChange={(e) => handleWizardBoqChange(e.target.value)}
                  className="w-full h-7 px-1.5 border border-gray-300 rounded-none bg-white font-medium truncate"
                >
                  {boqs
                    .filter(b => b.projectId === wizardProjectId)
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.boqNo} {b.contractRef ? `(${b.contractRef})` : ''}</option>
                    ))}
                </select>
              </div>

              {/* JMR Number */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">JMR Number *</label>
                <input
                  type="text"
                  value={wizardJmrNo}
                  onChange={(e) => setWizardJmrNo(e.target.value)}
                  className="w-full h-7 px-2 border border-gray-300 rounded-none bg-white font-mono font-bold text-[#1e3a5f]"
                />
              </div>

              {/* JMR Date */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">JMR Date</label>
                <input
                  type="date"
                  value={wizardDate}
                  onChange={(e) => setWizardDate(e.target.value)}
                  className="w-full h-7 px-1.5 border border-gray-300 rounded-none bg-white font-mono"
                />
              </div>

              {/* Period From */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">Period From</label>
                <input
                  type="date"
                  value={wizardStartDate}
                  onChange={(e) => setWizardStartDate(e.target.value)}
                  className="w-full h-7 px-1.5 border border-gray-300 rounded-none bg-white font-mono"
                />
              </div>

              {/* Period To */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">Period To</label>
                <input
                  type="date"
                  value={wizardEndDate}
                  onChange={(e) => setWizardEndDate(e.target.value)}
                  className="w-full h-7 px-1.5 border border-gray-300 rounded-none bg-white font-mono"
                />
              </div>

              {/* Location */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">Location / Grid / Axis</label>
                <input
                  type="text"
                  placeholder="e.g. Substation Area / Grid 1-4 / First Floor"
                  value={wizardLocation}
                  onChange={(e) => setWizardLocation(e.target.value)}
                  className="w-full h-7 px-2 border border-gray-300 rounded-none bg-white"
                />
              </div>

              {/* Reference No */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">Ref / Letter No</label>
                <input
                  type="text"
                  placeholder="Client Letter / Work Order Ref"
                  value={wizardRefNo}
                  onChange={(e) => setWizardRefNo(e.target.value)}
                  className="w-full h-7 px-2 border border-gray-300 rounded-none bg-white"
                />
              </div>

              {/* General Remarks */}
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">General Scope / Remarks</label>
                <input
                  type="text"
                  placeholder="Additional context, joint inspection notes, weather..."
                  value={wizardRemarks}
                  onChange={(e) => setWizardRemarks(e.target.value)}
                  className="w-full h-7 px-2 border border-gray-300 rounded-none bg-white"
                />
              </div>

            </div>
          </div>

          {/* BOQ Item Selection Toolbar (SupplierFirst inspired) */}
          <div className="bg-[#f0f2f5] border-b border-[#cbd5e1] px-4 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1e3a5f] text-xs">
                SELECT SERVICE / WORK ITEMS FOR MEASUREMENT:
              </span>
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="bg-white hover:bg-gray-100 text-gray-700 px-2 py-0.5 border border-gray-300 text-[11px]"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="bg-white hover:bg-gray-100 text-gray-700 px-2 py-0.5 border border-gray-300 text-[11px]"
              >
                Clear Selection
              </button>
              <span className="text-gray-500 text-[11px] ml-2">
                ({selectedItemIndices.size} of {wizardItems.length} items selected)
              </span>
            </div>

            {/* Quick Action: Bulk Upload Measurements via Excel */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(true)}
                className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-1 font-semibold text-xs flex items-center gap-1 border border-[#0369a1] shadow-2xs"
                title="Bulk upload measurements from spreadsheet"
              >
                <FileSpreadsheet size={13} /> Bulk Excel Upload
              </button>

              <div className="flex items-center gap-1 bg-white border border-gray-300 px-2 py-0.5">
                <Search size={12} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter items by text/code..."
                  value={itemSearchText}
                  onChange={(e) => setItemSearchText(e.target.value)}
                  className="h-5 w-48 text-xs border-none outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* BOQ Items Selection Table (Matches Reference Screenshot 1 & 2) */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white p-2">
            {wizardItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border border-gray-200">
                No items found for the selected BOQ.
              </div>
            ) : (
              <div className="border border-[#b6c7db] overflow-x-auto shadow-2xs">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#2f4f75] text-white text-[10px] uppercase font-semibold select-none">
                      <th className="p-1.5 text-center w-8 border-r border-[#1e3a5f]">
                        <input
                          type="checkbox"
                          checked={selectedItemIndices.size === wizardItems.length && wizardItems.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="p-1.5 text-center w-12 border-r border-[#1e3a5f]">Item #</th>
                      <th className="p-1.5 w-16 border-r border-[#1e3a5f]">Code</th>
                      <th className="p-1.5 border-r border-[#1e3a5f]">Detailed Work Description</th>
                      <th className="p-1.5 text-center w-12 border-r border-[#1e3a5f]">UOM</th>
                      <th className="p-1.5 text-right w-20 border-r border-[#1e3a5f]">Base Rate (₹)</th>
                      <th className="p-1.5 text-right w-20 border-r border-[#1e3a5f]">Contract Qty</th>
                      <th className="p-1.5 text-right w-20 border-r border-[#1e3a5f]">Prev Appr Qty</th>
                      <th className="p-1.5 text-right w-20 border-r border-[#1e3a5f]">Avail Balance</th>
                      <th className="p-1.5 text-right w-24 border-r border-[#1e3a5f] bg-[#1e3a5f]">Net Claim Qty</th>
                      <th className="p-1.5 text-right w-28 border-r border-[#1e3a5f] bg-[#1e3a5f]">Claim Amt (₹)</th>
                      <th className="p-1.5 text-center w-36">Measurement Entry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredWizardItems.map((item) => {
                      const origIndex = wizardItems.findIndex(it => it.id === item.id);
                      const isSelected = selectedItemIndices.has(origIndex);
                      const rowCount = (item.measurementRows || []).length;
                      const hasMeasurements = rowCount > 0 || (item.netQuantity !== 0);

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50 bg-white'}`}
                        >
                          {/* Checkbox */}
                          <td className="p-1 text-center border-r border-gray-200">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItemSelection(origIndex)}
                              className="cursor-pointer"
                            />
                          </td>

                          {/* Item Number */}
                          <td className="p-1 text-center font-mono font-bold text-[#1e3a5f] border-r border-gray-200">
                            {item.itemNumber}
                          </td>

                          {/* Item Code */}
                          <td className="p-1 border-r border-gray-200 font-mono text-[10px] text-gray-600">
                            {item.itemCode || '—'}
                          </td>

                          {/* Detailed Work Description */}
                          <td className="p-1.5 border-r border-gray-200 leading-tight">
                            <div className="font-semibold text-gray-900 line-clamp-2" title={item.description}>
                              {item.description}
                            </div>
                            {item.remarks && (
                              <div className="text-[10px] text-gray-500 italic mt-0.5 truncate">
                                Note: {item.remarks}
                              </div>
                            )}
                          </td>

                          {/* UOM */}
                          <td className="p-1 text-center border-r border-gray-200 font-mono font-semibold">
                            {item.unit}
                          </td>

                          {/* Base Rate */}
                          <td className="p-1 text-right border-r border-gray-200 font-mono text-gray-800">
                            ₹{(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Contract Qty */}
                          <td className="p-1 text-right border-r border-gray-200 font-mono text-gray-700">
                            {(item.contractQuantity || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Previously Approved Qty */}
                          <td className="p-1 text-right border-r border-gray-200 font-mono text-gray-500">
                            {(item.previouslyApprovedQuantity || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Available Balance Qty */}
                          <td className={`p-1 text-right border-r border-gray-200 font-mono font-semibold ${item.availableContractQuantity <= 0 ? 'text-rose-600' : 'text-purple-700'}`}>
                            {(item.availableContractQuantity || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Net Claim Qty */}
                          <td className="p-1 text-right border-r border-gray-200 font-mono font-bold text-emerald-800 bg-emerald-50/30">
                            {(item.netQuantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </td>

                          {/* Current Claim Amount */}
                          <td className="p-1 text-right border-r border-gray-200 font-mono font-bold text-[#1e3a5f] bg-blue-50/30">
                            ₹{(item.currentClaimAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Open Measurement Window Button */}
                          <td className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenItemMeasurement(item)}
                              className={`px-2 py-1 text-[11px] font-semibold border flex items-center justify-center gap-1 w-full shadow-2xs transition-colors ${hasMeasurements ? 'bg-[#2e7d32] hover:bg-[#1b5e20] text-white border-[#1b5e20]' : 'bg-[#e4ebf3] hover:bg-[#d0deed] text-[#1e3a5f] border-[#b6c7db]'}`}
                            >
                              <Calculator size={11} />
                              <span>{hasMeasurements ? `${rowCount} Meas Rows` : 'Enter Measurements'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pinned Bottom Summary Ribbon & Action Buttons */}
          <div className="bg-[#f8fafc] border-t border-[#cbd5e1] p-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-inner">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="bg-white border border-[#b6c7db] px-3 py-1 shadow-2xs">
                <span className="text-[9px] uppercase font-sans font-semibold text-gray-500 block">Selected Items</span>
                <span className="font-bold text-gray-900 text-sm">{wizardTotals.selectedCount} Items</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 px-3 py-1 shadow-2xs">
                <span className="text-[9px] uppercase font-sans font-semibold text-emerald-800 block">Total Claimed Quantity</span>
                <span className="font-bold text-emerald-900 text-sm">{wizardTotals.totalClaimQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-[#1e3a5f] text-white px-4 py-1 shadow-2xs">
                <span className="text-[9px] uppercase font-sans font-semibold text-blue-200 block">Total JMR Claim Value</span>
                <span className="font-bold text-base">₹{wizardTotals.totalClaimAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('register')}
                className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-1.5 text-xs font-semibold border border-gray-400 shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveJmr(false)}
                className="bg-[#2f4f75] hover:bg-[#1e3a5f] text-white px-5 py-1.5 text-xs font-semibold border border-[#1e3a5f] shadow-2xs"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveJmr(true)}
                className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-6 py-1.5 text-xs font-bold border border-[#1b5e20] shadow-2xs flex items-center gap-1.5"
              >
                <CheckCircle size={14} className="text-emerald-300" />
                Submit for Verification
              </button>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          VIEW MODE: DISPLAY JMR (READ-ONLY INSPECTION SHEET)
         ========================================================================= */}
      {viewMode === 'display' && currentJmr && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
          {/* Header Action Bar */}
          <div className="bg-[#e4ebf3] border-b border-[#b6c7db] px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1e3a5f] text-sm">
                DISPLAY JMR: {currentJmr.jmrNo}
              </span>
              {renderStatusBadge(currentJmr.status)}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('register')}
                className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1 font-semibold border border-gray-400 shadow-2xs"
              >
                Close Display
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = projects.find(proj => proj.id === currentJmr.projectId);
                  const b = boqs.find(boq => boq.id === currentJmr.boqId);
                  exportJMRToPDF(currentJmr, p, b);
                }}
                className="bg-[#1e3a5f] hover:bg-[#152840] text-white px-4 py-1 font-bold border border-[#0f233a] shadow-2xs flex items-center gap-1"
              >
                <Printer size={13} /> Print Official JMR
              </button>
            </div>
          </div>

          {/* Readonly Summary Info */}
          <div className="bg-white border-b border-[#cbd5e1] p-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <div>
                <span className="text-gray-500 text-[10px] block">Project:</span>
                <span className="font-bold text-[#1e3a5f]">{projects.find(p => p.id === currentJmr.projectId)?.name || currentJmr.projectId}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Client:</span>
                <span className="font-bold">{currentJmr.clientName}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Work Order:</span>
                <span className="font-mono">{currentJmr.workOrderNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Period:</span>
                <span className="font-mono">{currentJmr.startDate} to {currentJmr.endDate}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Location:</span>
                <span>{currentJmr.location || 'Site Wide'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Prepared By:</span>
                <span>{currentJmr.preparedBy || 'Site Engineer'} ({currentJmr.date})</span>
              </div>
            </div>
          </div>

          {/* Readonly Items & Measurement Rows List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {(currentJmr.items || []).map((item, idx) => (
              <div key={item.id} className="bg-white border border-[#b6c7db] shadow-2xs">
                {/* Item Header */}
                <div className="bg-[#e4ebf3] px-3 py-2 border-b border-[#b6c7db] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1e3a5f] text-xs">Item {item.itemNumber}</span>
                    {item.itemCode && <span className="text-gray-500 font-mono text-[10px]">({item.itemCode})</span>}
                    <span className="text-gray-700 font-medium truncate max-w-lg">{item.description}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span>Rate: <strong>₹{(item.rate || 0).toLocaleString('en-IN')}</strong></span>
                    <span>Net Qty: <strong className="text-emerald-700">{(item.netQuantity || 0).toLocaleString('en-IN')} {item.unit}</strong></span>
                    <span className="bg-[#1e3a5f] text-white px-2 py-0.5 font-bold">
                      ₹{(item.currentClaimAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Rows Table */}
                <div className="p-2 overflow-x-auto">
                  {(item.measurementRows || []).length === 0 ? (
                    <div className="text-gray-500 text-[11px] p-2 italic">
                      No measurement dimension entries recorded for this line item.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-[10px] font-mono">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 uppercase">
                          <th className="p-1 w-8 text-center">#</th>
                          <th className="p-1 w-14 text-center">Type</th>
                          <th className="p-1 w-20">From</th>
                          <th className="p-1 w-20">To</th>
                          <th className="p-1">Location</th>
                          <th className="p-1">Method / Formula</th>
                          <th className="p-1 text-center w-12">Times</th>
                          <th className="p-1 text-right w-24">Calculated Qty</th>
                          <th className="p-1">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {item.measurementRows.map((r, rIdx) => {
                          const isAdd = r.entryType === 'Add';
                          return (
                            <tr key={r.id} className={isAdd ? 'hover:bg-emerald-50/40' : 'hover:bg-rose-50/40'}>
                              <td className="p-1 text-center text-gray-400">{rIdx + 1}</td>
                              <td className="p-1 text-center font-bold">
                                <span className={`px-1 py-0.5 rounded text-[9px] ${isAdd ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {isAdd ? '+ ADD' : '− SUB'}
                                </span>
                              </td>
                              <td className="p-1">{r.startDate}</td>
                              <td className="p-1">{r.endDate}</td>
                              <td className="p-1 font-sans">{r.location || '—'}</td>
                              <td className="p-1">
                                {r.method === 'dimensions' ? `${r.length} × ${r.width} × ${r.height}` : `${r.baseQuantity}`}
                              </td>
                              <td className="p-1 text-center">{r.numberOfTimes || 1}</td>
                              <td className={`p-1 text-right font-bold ${isAdd ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {isAdd ? '+' : '−'}{(r.calculatedQuantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-1 font-sans text-gray-600">{r.remarks || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE: AUDIT TRAIL LOGS
         ========================================================================= */}
      {viewMode === 'audit' && (
        <div className="flex flex-col flex-1 min-h-0 bg-white">
          <div className="bg-[#e4ebf3] border-b border-[#b6c7db] px-4 py-2 flex items-center justify-between flex-shrink-0">
            <span className="font-bold text-[#1e3a5f] text-sm flex items-center gap-1.5">
              <ShieldCheck size={16} /> JMR AUDIT TRAIL & SYSTEM ACTIVITY LOGS
            </span>
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1 font-semibold border border-gray-400 shadow-2xs"
            >
              Back to Register
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {jmrAuditLogs.length === 0 ? (
              <div className="text-gray-500 text-center p-8">No audit logs recorded yet.</div>
            ) : (
              <div className="border border-gray-300 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300">
                      <th className="p-2 w-36">Timestamp</th>
                      <th className="p-2 w-28">JMR No</th>
                      <th className="p-2 w-28">User</th>
                      <th className="p-2 w-28">Action</th>
                      <th className="p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                    {jmrAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="p-2 text-gray-500">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                        <td className="p-2 font-bold text-[#1e3a5f]">{log.jmrNo}</td>
                        <td className="p-2">{log.username}</td>
                        <td className="p-2">
                          <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2 font-sans text-gray-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: SERVICE DESCRIPTION MEASUREMENT ENTRY POPUP
         ========================================================================= */}
      {activeMeasurementItem && (
        <JMRMeasurementModal
          isOpen={isMeasurementModalOpen}
          onClose={() => {
            setIsMeasurementModalOpen(false);
            setActiveMeasurementItem(null);
          }}
          item={activeMeasurementItem}
          defaultStartDate={wizardStartDate}
          defaultEndDate={wizardEndDate}
          defaultLocation={wizardLocation}
          onSave={handleSaveMeasurementItem}
          onOpenExcelUpload={() => {
            setIsMeasurementModalOpen(false);
            setIsExcelModalOpen(true);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 2: BULK EXCEL UPLOAD & TEMPLATE DOWNLOAD MODAL
         ========================================================================= */}
      <JMRExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        items={wizardItems}
        onImport={handleImportExcelRows}
      />

      {/* =========================================================================
          MODAL 3: WORKFLOW ACTION DIALOG (SUBMIT, VERIFY, APPROVE, RETURN)
         ========================================================================= */}
      {workflowModal.type && workflowModal.jmr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f0f2f5] border border-[#718baf] shadow-2xl w-full max-w-lg rounded-none overflow-hidden font-sans text-xs">
            <div className="bg-[#1e3a5f] text-white px-4 py-2 flex items-center justify-between border-b border-[#0f233a]">
              <span className="font-bold uppercase tracking-wide">
                {workflowModal.type === 'submit' && 'Submit JMR for Site Verification'}
                {workflowModal.type === 'verify' && 'Site Engineer Verification Sign-Off'}
                {workflowModal.type === 'approve' && 'Approve & Certify Joint Measurement Record'}
                {workflowModal.type === 'return' && 'Return JMR for Site Correction'}
              </span>
              <button 
                onClick={() => setWorkflowModal({ type: null, jmr: null, remarks: '' })}
                className="text-gray-300 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-white">
              <div className="bg-[#e4ebf3] p-2.5 border border-[#b6c7db]">
                <div className="font-bold text-[#1e3a5f] text-sm">{workflowModal.jmr.jmrNo}</div>
                <div className="text-[11px] text-gray-600 mt-0.5">
                  Project: {projects.find(p => p.id === workflowModal.jmr?.projectId)?.name} | Period: {workflowModal.jmr.startDate} to {workflowModal.jmr.endDate}
                </div>
              </div>

              {workflowModal.type === 'verify' && (
                <div className="bg-purple-50 border border-purple-200 p-2.5 text-[11px] text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle size={13} /> Verification Checklist:
                  </div>
                  <div>✓ Physical measurements and levels verified at site</div>
                  <div>✓ Additions & deductions cross-referenced with architectural specifications</div>
                  <div>✓ Quantities checked against contract BOQ balances</div>
                </div>
              )}

              {workflowModal.type === 'approve' && (
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900">
                  <p className="font-semibold">
                    Certifying this JMR makes the measured quantities official and immediately available for <strong>RA Billing (BIL01)</strong>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                  {workflowModal.type === 'return' ? 'Reason for Return (Required):' : 'Official Remarks / Notes:'}
                </label>
                <textarea
                  rows={3}
                  value={workflowModal.remarks}
                  onChange={(e) => setWorkflowModal(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder={workflowModal.type === 'return' ? 'Specify discrepancies in grid measurements, missing void deductions, or drawing mismatches...' : 'Enter approval notes, site condition records, or inspection references...'}
                  className="w-full p-2 border border-gray-300 text-xs rounded-none bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="bg-[#f8fafc] border-t border-[#cbd5e1] p-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWorkflowModal({ type: null, jmr: null, remarks: '' })}
                className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 font-semibold border border-gray-400 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteWorkflow}
                className={`px-5 py-1.5 font-bold text-xs text-white border shadow-2xs ${workflowModal.type === 'return' ? 'bg-rose-600 hover:bg-rose-700 border-rose-700' : 'bg-[#1e3a5f] hover:bg-[#152840] border-[#0f233a]'}`}
              >
                Confirm {workflowModal.type.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
