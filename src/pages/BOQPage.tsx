import React, { useState, useMemo, useRef } from 'react';
import { SAPSelect } from '../components/SAPSelect';
import { useAppContext } from '../store';
import { BOQ, BOQItem, BOQRevision, BOQExtraItem, BOQAuditLog, BOQItemRevision, BOQItemVariation } from '../types';
import { 
  Plus, Trash2, Edit, Save, X, Search, FileText, FileSpreadsheet, 
  Upload, Eye, History, Check, AlertTriangle, ArrowUpDown, ChevronRight,
  TrendingUp, BarChart3, Clock, HelpCircle, ArrowLeftRight, CheckCircle, RefreshCw,
  GitPullRequest, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { BOQItemFloorManager } from '../components/BOQItemFloorManager';
import { SAPTransactionHeader } from '../components/common/SAPTransactionHeader';
import { SAPTabs } from '../components/common/SAPTabs';
import { BOQItemModal } from '../components/BOQItemModal';

export function BOQPage({ onUnsavedChange }: { onUnsavedChange?: (hasUnsaved: boolean) => void }) {
  const { 
    projects, boqs, boqAuditLogs, addBOQ, updateBOQ, deleteBOQ, addBOQAuditLog, user, billings 
  } = useAppContext();

  // Active navigation tab inside BOQ Module
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'executed' | 'billing' | 'extra' | 'audit'>('dashboard');
  
  // Floor Manager State
  const [managingFloorItem, setManagingFloorItem] = useState<{ boqId: string, item: BOQItem } | null>(null);

  // Drill-down State for Detailed RA-wise Claim History Modal
  const [drillDownItem, setDrillDownItem] = useState<{ boq: BOQ; item: BOQItem; itemClaimData: any } | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'claims' | 'revisions'>('claims');

  // BOQ Revision & Extra Quantity / Variation Modal State
  const [revisionModalItem, setRevisionModalItem] = useState<{ boq: BOQ; item: BOQItem } | null>(null);
  const [modalWorkflow, setModalWorkflow] = useState<'revision' | 'variation'>('revision');
  const [revWorkOrderNo, setRevWorkOrderNo] = useState<string>('');
  const [revDate, setRevDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [revAdditionalQty, setRevAdditionalQty] = useState<number>(0);
  const [revTargetTotalQty, setRevTargetTotalQty] = useState<number>(0);
  const [revRate, setRevRate] = useState<number>(0);
  const [revReason, setRevReason] = useState<string>('');
  const [revApprovalStatus, setRevApprovalStatus] = useState<'Approved' | 'Pending Approval'>('Approved');
  const [revRemarks, setRevRemarks] = useState<string>('');


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
  const [extraProjectId, setExtraProjectId] = useState<string>('');
  const [extraBoqItemId, setExtraBoqItemId] = useState<string>('');
  const [extraWorkOrderNo, setExtraWorkOrderNo] = useState<string>('');
  const [extraApprovalStatus, setExtraApprovalStatus] = useState<'Approved' | 'Pending Approval'>('Approved');
  const [extraCode, setExtraCode] = useState<string>('');
  const [extraDesc, setExtraDesc] = useState<string>('');
  const [extraUnit, setExtraUnit] = useState<string>('cum');
  const [extraQty, setExtraQty] = useState<number>(0);
  const [extraRate, setExtraRate] = useState<number>(0);
  const [extraRemarks, setExtraRemarks] = useState<string>('');
  const [variationStatusFilter, setVariationStatusFilter] = useState<'All' | 'Approved' | 'Pending Approval' | 'Rejected'>('All');
  const [extraTargetType, setExtraTargetType] = useState<'new_item' | 'existing_item'>('new_item');

  // Comparison logging (allowing users to log executed/billed quantities directly for simulation)
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [simItem, setSimItem] = useState<{ boqId: string; itemId: string; code: string; type: 'executed' | 'billed' } | null>(null);
  const [simValue, setSimValue] = useState<number>(0);

  // Dedicated Add / Edit BOQ Item Modal state
  const [boqItemModalState, setBoqItemModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    item: BOQItem | null;
    targetBoqId?: string;
    formIndex?: number | null;
  }>({
    isOpen: false,
    mode: 'add',
    item: null,
    targetBoqId: undefined,
    formIndex: null
  });
  const [isSavingBOQ, setIsSavingBOQ] = useState<boolean>(false);

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

  // Authoritative RA bills from Billing Management:
  // Non-draft, non-rejected, and non-cancelled RA bills for the active project filter
  const eligibleProjectBills = useMemo(() => {
    return (billings || [])
      .filter(b => {
        const matchProject = selectedProjectId ? b.projectId === selectedProjectId : true;
        const notDraft = (b as any).status !== 'Draft';
        const notRejected = (b as any).status !== 'Rejected';
        const notCancelled = (b as any).status !== 'Cancelled';
        return matchProject && notDraft && notRejected && notCancelled;
      })
      .sort((a, b) => {
        const dateA = a.certifyDate || a.month || '';
        const dateB = b.certifyDate || b.month || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.billNo || '').localeCompare(b.billNo || '');
      });
  }, [billings, selectedProjectId]);

  // Compute authoritative claim details, revisions, variations, and dynamic RA breakdown for any BOQ item
  const getItemClaimData = (boq: BOQ, item: BOQItem) => {
    const billsForProject = eligibleProjectBills.filter(b => b.projectId === boq.projectId);

    // Baseline original quantity and current approved revised quantity
    const originalQuantity = item.originalQuantity !== undefined ? item.originalQuantity : item.boqQuantity;
    const currentRevisedApprovedQuantity = item.boqQuantity;
    const approvedAdditions = currentRevisedApprovedQuantity - originalQuantity;

    // Separate pending approval quantity
    const pendingVariations = (item.variations || []).filter(v => v.approvalStatus === 'Pending Approval');
    const pendingRevisions = (item.revisionsHistory || []).filter(r => r.approvalStatus === 'Pending Approval');
    const pendingApprovalQuantity = pendingVariations.reduce((s, v) => s + (v.additionalQuantity || 0), 0) +
                                    pendingRevisions.reduce((s, r) => s + (r.additionalQuantity || 0), 0);

    let runningCumulative = 0;
    const claimsByBillId: Record<string, number> = {};
    const history: Array<{
      seq: number;
      billId: string;
      billNo: string;
      billDate: string;
      billStatus: string;
      claimedInThisRA: number;
      prevCumulative: number;
      cumulativeAfterRA: number;
      remainingBalanceAfterRA: number;
      rate: number;
      claimAmount: number;
    }> = [];

    let latestClaimDate = '';

    billsForProject.forEach((b, idx) => {
      // Connect claim by stable BOQ Item ID first, then itemCode as fallback
      const mi = b.measurementItems?.find(m => 
        (m.boqItemId && m.boqItemId === item.id) ||
        (m.itemCode && item.itemCode && m.itemCode.trim().toLowerCase() === item.itemCode.trim().toLowerCase())
      );

      const claimedInThisRA = mi ? (Number(mi.qtyExecuted) || 0) : 0;
      const prevCumulative = runningCumulative;
      const cumulativeAfterRA = prevCumulative + claimedInThisRA;
      // Calculate remaining balance against current revised approved quantity
      const remainingBalanceAfterRA = currentRevisedApprovedQuantity - cumulativeAfterRA;
      const rate = Number(mi?.boqRate !== undefined ? mi.boqRate : (mi?.rate || item.boqRate));
      const claimAmount = Number((claimedInThisRA * rate).toFixed(2));

      runningCumulative = cumulativeAfterRA;
      claimsByBillId[b.id] = claimedInThisRA;

      if (claimedInThisRA > 0) {
        latestClaimDate = b.certifyDate || b.month || '';
      }

      history.push({
        seq: idx + 1,
        billId: b.id,
        billNo: b.billNo || `RA-${String(idx + 1).padStart(2, '0')}`,
        billDate: b.certifyDate || b.month || 'N/A',
        billStatus: (b as any).status || 'Approved',
        claimedInThisRA,
        prevCumulative,
        cumulativeAfterRA,
        remainingBalanceAfterRA,
        rate,
        claimAmount
      });
    });

    const totalClaimed = runningCumulative;
    // Remaining approved quantity
    const balance = currentRevisedApprovedQuantity - totalClaimed;
    const percentClaimed = currentRevisedApprovedQuantity > 0 ? (totalClaimed / currentRevisedApprovedQuantity) * 100 : 0;

    let claimStatus: 'Overclaim' | 'Fully Claimed' | 'In Progress' | 'Unclaimed' = 'Unclaimed';
    if (balance < 0) {
      claimStatus = 'Overclaim';
    } else if (percentClaimed >= 100) {
      claimStatus = 'Fully Claimed';
    } else if (totalClaimed > 0) {
      claimStatus = 'In Progress';
    } else {
      claimStatus = 'Unclaimed';
    }

    return {
      originalQuantity,
      approvedAdditions,
      currentRevisedApprovedQuantity,
      approvedQty: currentRevisedApprovedQuantity,
      pendingApprovalQuantity,
      rate: item.boqRate,
      claimsByBillId,
      totalClaimed,
      balance, // Remaining approved quantity
      percentClaimed,
      latestClaimDate: latestClaimDate || '-',
      claimStatus,
      history,
      revisionsHistory: item.revisionsHistory || [],
      variations: item.variations || []
    };
  };

  // Open Revision / Variation modal for a specific BOQ item
  const handleOpenRevisionModal = (boq: BOQ, item: BOQItem, defaultWorkflow: 'revision' | 'variation' = 'revision') => {
    setRevisionModalItem({ boq, item });
    setModalWorkflow(defaultWorkflow);
    const proj = projects.find(p => p.id === boq.projectId);
    setRevWorkOrderNo(proj?.workOrderNo || '');
    setRevDate(new Date().toISOString().split('T')[0]);
    setRevAdditionalQty(0);
    setRevTargetTotalQty(item.boqQuantity);
    setRevRate(item.boqRate);
    setRevReason(defaultWorkflow === 'revision' ? 'Approved contract scope revision' : 'Variation Order additional work');
    setRevApprovalStatus(defaultWorkflow === 'revision' ? 'Approved' : 'Pending Approval');
    setRevRemarks('');
  };

  // Save BOQ Revision or Extra Quantity Variation
  const handleSaveItemRevisionOrVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionModalItem) return;
    const { boq, item } = revisionModalItem;
    const currentBoq = boqs.find(b => b.id === boq.id) || boq;
    const currentItem = (currentBoq.items || []).find(i => i.id === item.id) || item;

    let additionalQty = Number(revAdditionalQty);
    if (additionalQty === 0 && revTargetTotalQty !== undefined && revTargetTotalQty !== currentItem.boqQuantity) {
      additionalQty = Number(revTargetTotalQty) - currentItem.boqQuantity;
    }

    if (additionalQty === 0 && Number(revRate) === currentItem.boqRate) {
      alert('Please specify a non-zero quantity adjustment or updated rate.');
      return;
    }

    const effectiveReason = revReason.trim() || (modalWorkflow === 'revision' ? 'Approved contract scope revision' : 'Variation Order additional work');

    const originalQty = currentItem.originalQuantity !== undefined ? currentItem.originalQuantity : currentItem.boqQuantity;
    const currentApprovedQty = currentItem.boqQuantity;
    const applicableRate = Number(revRate) > 0 ? Number(revRate) : currentItem.boqRate;
    const revisedQty = currentApprovedQty + additionalQty;

    if (revisedQty < 0) {
      alert('Revised approved quantity cannot be negative.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isApproved = revApprovalStatus === 'Approved';

    const sharedVarId = 'var_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const updatedItems = (currentBoq.items || []).map(it => {
      if (it.id !== currentItem.id) return it;

      const updated = { ...it };
      if (updated.originalQuantity === undefined) {
        updated.originalQuantity = originalQty;
      }
      if (updated.originalRate === undefined) {
        updated.originalRate = it.boqRate;
      }

      if (modalWorkflow === 'revision') {
        const revId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const revisionRecord: BOQItemRevision = {
          id: revId,
          revisionNo: (updated.revisionsHistory?.length || 0) + 1,
          date: revDate || todayStr,
          type: 'BOQ Revision',
          workOrderNo: revWorkOrderNo || undefined,
          originalQuantity: currentApprovedQty,
          additionalQuantity: additionalQty,
          revisedQuantity: revisedQty,
          rate: applicableRate,
          amount: Number((additionalQty * applicableRate).toFixed(2)),
          reason: effectiveReason,
          approvalStatus: revApprovalStatus,
          approvedBy: isApproved ? (user?.name || user?.username || 'Contract Engineer') : undefined,
          approvedDate: isApproved ? todayStr : undefined,
          remarks: revRemarks || undefined
        };

        updated.revisionsHistory = [...(updated.revisionsHistory || []), revisionRecord];

        if (isApproved) {
          updated.boqQuantity = revisedQty;
          updated.boqRate = applicableRate;
          updated.boqAmount = Number((revisedQty * applicableRate).toFixed(2));
        }
      } else {
        // Variation workflow
        const variationRecord: BOQItemVariation = {
          id: sharedVarId,
          variationNo: 'VAR-' + Math.floor(1000 + Math.random() * 9000),
          boqItemId: it.id,
          projectId: currentBoq.projectId,
          workOrderNo: revWorkOrderNo || undefined,
          date: revDate || todayStr,
          originalQuantity: currentApprovedQty,
          additionalQuantity: additionalQty,
          revisedQuantity: revisedQty,
          rate: applicableRate,
          amount: Number((additionalQty * applicableRate).toFixed(2)),
          reason: effectiveReason,
          approvalStatus: revApprovalStatus,
          approvedBy: isApproved ? (user?.name || user?.username || 'Contract Engineer') : undefined,
          approvedDate: isApproved ? todayStr : undefined,
          remarks: revRemarks || undefined
        };

        updated.variations = [...(updated.variations || []), variationRecord];

        if (isApproved) {
          updated.boqQuantity = revisedQty;
          updated.boqRate = applicableRate;
          updated.boqAmount = Number((revisedQty * applicableRate).toFixed(2));
          
          const revRecord: BOQItemRevision = {
            id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            revisionNo: (updated.revisionsHistory?.length || 0) + 1,
            date: revDate || todayStr,
            type: 'Variation',
            workOrderNo: revWorkOrderNo || undefined,
            originalQuantity: currentApprovedQty,
            additionalQuantity: additionalQty,
            revisedQuantity: revisedQty,
            rate: applicableRate,
            amount: Number((additionalQty * applicableRate).toFixed(2)),
            reason: effectiveReason,
            approvalStatus: 'Approved',
            approvedBy: user?.name || user?.username || 'Contract Engineer',
            approvedDate: todayStr,
            remarks: revRemarks || undefined
          };
          updated.revisionsHistory = [...(updated.revisionsHistory || []), revRecord];
        }
      }

      return updated;
    });

    let updatedExtraItems = currentBoq.extraItems || [];
    if (modalWorkflow === 'variation') {
      const extraEntry: BOQExtraItem = {
        id: sharedVarId,
        itemCode: currentItem.itemCode,
        description: `[Variation] ${currentItem.description}`,
        unit: currentItem.unit,
        quantity: additionalQty,
        rate: applicableRate,
        amount: Number((additionalQty * applicableRate).toFixed(2)),
        remarks: effectiveReason,
        approvalStatus: revApprovalStatus as any,
        boqItemId: currentItem.id,
        workOrderNo: revWorkOrderNo || undefined,
        reason: effectiveReason,
        date: revDate || todayStr,
        originalQuantity: currentApprovedQty,
        revisedQuantity: revisedQty,
        approvedBy: isApproved ? (user?.name || user?.username || 'Admin') : undefined,
        approvedDate: isApproved ? todayStr : undefined
      };
      updatedExtraItems = [...updatedExtraItems, extraEntry];
    }

    await updateBOQ(currentBoq.id, {
      items: updatedItems,
      extraItems: updatedExtraItems
    });

    const actionTitle = modalWorkflow === 'revision' ? 'BOQ Item Revision' : 'Extra Quantity Variation';
    const logDetails = `${actionTitle} for ${currentItem.itemCode}: ${additionalQty >= 0 ? '+' : ''}${additionalQty} ${currentItem.unit} at ₹${applicableRate}. Status: ${revApprovalStatus}. Reason: ${effectiveReason}`;
    await logAudit(currentBoq.id, currentBoq.boqNo, actionTitle, logDetails);

    if (drillDownItem && drillDownItem.boq.id === currentBoq.id) {
      const updatedBOQ = { ...currentBoq, items: updatedItems, extraItems: updatedExtraItems };
      const updatedItem = updatedItems.find(i => i.id === currentItem.id);
      if (updatedItem) {
        setDrillDownItem({
          boq: updatedBOQ,
          item: updatedItem,
          itemClaimData: getItemClaimData(updatedBOQ, updatedItem)
        });
      }
    }

    setRevisionModalItem(null);
    alert(`${actionTitle} saved successfully! ${isApproved ? `Approved BOQ quantity updated to ${revisedQty.toLocaleString('en-IN')} ${currentItem.unit}.` : 'Pending approval variation recorded.'}`);
  };

  // Approve a pending variation
  const handleApproveVariation = async (boqId: string, variationId: string, boqItemId?: string) => {
    const boq = boqs.find(b => b.id === boqId);
    if (!boq) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetExtra = (boq.extraItems || []).find(e => e.id === variationId);
    const resolvedBoqItemId = boqItemId || targetExtra?.boqItemId;

    let approvedQtyDelta = targetExtra ? Number(targetExtra.quantity) : 0;
    let targetRate = targetExtra ? Number(targetExtra.rate) : 0;
    let targetWorkOrder = targetExtra?.workOrderNo;
    let targetReason = targetExtra?.reason || targetExtra?.remarks || 'Approved Variation Order';
    let targetItemCode = targetExtra?.itemCode || '';

    // Check item variations
    let foundOnItem = false;
    const updatedItems = (boq.items || []).map(it => {
      const targetVar = (it.variations || []).find(v => v.id === variationId);
      const isTargetItem = (resolvedBoqItemId && it.id === resolvedBoqItemId) || !!targetVar;

      if (isTargetItem) {
        foundOnItem = true;
        if (!targetItemCode) targetItemCode = it.itemCode;
        if (targetVar) {
          approvedQtyDelta = Number(targetVar.additionalQuantity);
          targetRate = Number(targetVar.rate);
          targetWorkOrder = targetVar.workOrderNo || targetWorkOrder;
          targetReason = targetVar.reason || targetReason;
        } else if (!approvedQtyDelta && targetExtra) {
          approvedQtyDelta = Number(targetExtra.quantity);
          targetRate = Number(targetExtra.rate);
        }

        const updatedVariations = targetVar
          ? (it.variations || []).map(v => v.id === variationId ? {
              ...v,
              approvalStatus: 'Approved' as const,
              approvedBy: user?.name || user?.username || 'Contract Manager',
              approvedDate: todayStr
            } : v)
          : [
              ...(it.variations || []),
              {
                id: variationId,
                variationNo: 'VAR-' + Math.floor(1000 + Math.random() * 9000),
                boqItemId: it.id,
                projectId: boq.projectId,
                workOrderNo: targetWorkOrder,
                date: todayStr,
                originalQuantity: it.boqQuantity,
                additionalQuantity: approvedQtyDelta,
                revisedQuantity: it.boqQuantity + approvedQtyDelta,
                rate: targetRate || it.boqRate,
                amount: Number((approvedQtyDelta * (targetRate || it.boqRate)).toFixed(2)),
                reason: targetReason,
                approvalStatus: 'Approved' as const,
                approvedBy: user?.name || user?.username || 'Contract Manager',
                approvedDate: todayStr
              }
            ];

        const prevQty = it.boqQuantity;
        const originalQty = it.originalQuantity !== undefined ? it.originalQuantity : prevQty;
        const newQty = prevQty + approvedQtyDelta;
        const effectiveRate = targetRate > 0 ? targetRate : it.boqRate;

        const revRecord: BOQItemRevision = {
          id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          revisionNo: (it.revisionsHistory?.length || 0) + 1,
          date: todayStr,
          type: 'Variation',
          workOrderNo: targetWorkOrder,
          originalQuantity: prevQty,
          additionalQuantity: approvedQtyDelta,
          revisedQuantity: newQty,
          rate: effectiveRate,
          amount: Number((approvedQtyDelta * effectiveRate).toFixed(2)),
          reason: targetReason,
          approvalStatus: 'Approved',
          approvedBy: user?.name || user?.username || 'Contract Manager',
          approvedDate: todayStr
        };

        return {
          ...it,
          originalQuantity: originalQty,
          boqQuantity: newQty,
          boqRate: effectiveRate,
          boqAmount: Number((newQty * effectiveRate).toFixed(2)),
          variations: updatedVariations,
          revisionsHistory: [...(it.revisionsHistory || []), revRecord]
        };
      }
      return it;
    });

    // If it's a brand new extra item not linked to any existing item, add it to boq.items upon approval!
    let finalItems = updatedItems;
    if (!foundOnItem && targetExtra) {
      const newBoqItem: BOQItem = {
        id: targetExtra.id || ('item_extra_' + Date.now()),
        itemCode: targetExtra.itemCode,
        description: targetExtra.description,
        unit: targetExtra.unit,
        originalQuantity: 0,
        originalRate: targetExtra.rate,
        boqQuantity: targetExtra.quantity,
        boqRate: targetExtra.rate,
        boqAmount: targetExtra.amount,
        remarks: targetExtra.remarks || 'Approved variation extra item',
        executedQuantity: 0,
        billedQuantity: 0,
        revisionsHistory: [{
          id: 'rev_' + Date.now(),
          revisionNo: 1,
          date: todayStr,
          type: 'Variation',
          workOrderNo: targetExtra.workOrderNo,
          originalQuantity: 0,
          additionalQuantity: targetExtra.quantity,
          revisedQuantity: targetExtra.quantity,
          rate: targetExtra.rate,
          amount: targetExtra.amount,
          reason: targetReason,
          approvalStatus: 'Approved',
          approvedBy: user?.name || user?.username || 'Admin',
          approvedDate: todayStr
        }],
        variations: [{
          id: variationId,
          variationNo: 'VAR-' + Math.floor(1000 + Math.random() * 9000),
          boqItemId: targetExtra.id,
          projectId: boq.projectId,
          workOrderNo: targetExtra.workOrderNo,
          date: todayStr,
          originalQuantity: 0,
          additionalQuantity: targetExtra.quantity,
          revisedQuantity: targetExtra.quantity,
          rate: targetExtra.rate,
          amount: targetExtra.amount,
          reason: targetReason,
          approvalStatus: 'Approved',
          approvedBy: user?.name || user?.username || 'Admin',
          approvedDate: todayStr
        }]
      };
      finalItems = [...updatedItems, newBoqItem];
    }

    const updatedExtraItems = (boq.extraItems || []).map(ext => {
      if (ext.id === variationId) {
        if (!approvedQtyDelta) approvedQtyDelta = ext.quantity;
        if (!targetItemCode) targetItemCode = ext.itemCode;
        return {
          ...ext,
          approvalStatus: 'Approved' as const,
          approvedBy: user?.name || user?.username || 'Admin',
          approvedDate: todayStr
        };
      }
      return ext;
    });

    await updateBOQ(boq.id, {
      items: finalItems,
      extraItems: updatedExtraItems
    });

    await logAudit(
      boq.id,
      boq.boqNo,
      'Variation Approved',
      `Approved variation ${variationId} for item ${targetItemCode}: +${approvedQtyDelta} approved to contract allowance.`
    );

    // Refresh drillDownItem if open
    if (drillDownItem && drillDownItem.boq.id === boqId) {
      const updatedBOQ = { ...boq, items: finalItems, extraItems: updatedExtraItems };
      const updatedItem = finalItems.find(i => i.id === drillDownItem.item.id);
      if (updatedItem) {
        const claimData = getItemClaimData(updatedBOQ, updatedItem);
        setDrillDownItem({ boq: updatedBOQ, item: updatedItem, itemClaimData: claimData });
      }
    }

    alert(`Variation approved successfully! Approved contract quantity increased by ${approvedQtyDelta.toLocaleString('en-IN')}.`);
  };

  // Reject a pending variation
  const handleRejectVariation = async (boqId: string, variationId: string) => {
    const boq = boqs.find(b => b.id === boqId);
    if (!boq) return;

    const updatedItems = (boq.items || []).map(it => {
      const hasVar = (it.variations || []).some(v => v.id === variationId);
      if (hasVar) {
        return {
          ...it,
          variations: (it.variations || []).map(v => v.id === variationId ? { ...v, approvalStatus: 'Rejected' as const } : v)
        };
      }
      return it;
    });

    const updatedExtraItems = (boq.extraItems || []).map(ext => {
      if (ext.id === variationId) {
        return { ...ext, approvalStatus: 'Rejected' as const };
      }
      return ext;
    });

    await updateBOQ(boq.id, {
      items: updatedItems,
      extraItems: updatedExtraItems
    });

    await logAudit(boq.id, boq.boqNo, 'Variation Rejected', `Rejected variation ${variationId}`);

    // Refresh drillDownItem if open
    if (drillDownItem && drillDownItem.boq.id === boqId) {
      const updatedBOQ = { ...boq, items: updatedItems, extraItems: updatedExtraItems };
      const updatedItem = updatedItems.find(i => i.id === drillDownItem.item.id);
      if (updatedItem) {
        const claimData = getItemClaimData(updatedBOQ, updatedItem);
        setDrillDownItem({ boq: updatedBOQ, item: updatedItem, itemClaimData: claimData });
      }
    }

    alert(`Variation has been rejected.`);
  };

  // Permanently delete a line item from a BOQ
  const handleDeleteItemFromBOQ = async (boq: BOQ, item: BOQItem) => {
    const claimData = getItemClaimData(boq, item);
    if (claimData.totalClaimed > 0) {
      if (!confirm(`Warning: Item "${item.itemCode}" has ${claimData.totalClaimed.toLocaleString('en-IN')} ${item.unit} in active claims in Billing Management across ${claimData.history.filter(h => h.claimedInThisRA > 0).length} RA bill(s).\n\nDeleting this item will remove it from the BOQ master and execution schedule. Are you sure you want to permanently delete it?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to permanently delete item "${item.itemCode} - ${item.description}" from BOQ ${boq.boqNo}? This cannot be undone.`)) {
        return;
      }
    }

    const updatedItems = (boq.items || []).filter(i => i.id !== item.id);
    await updateBOQ(boq.id, { items: updatedItems });
    await logAudit(
      boq.id,
      boq.boqNo,
      'Item Deleted',
      `Deleted BOQ item ${item.itemCode}: ${item.description} (Approved Qty: ${item.boqQuantity} ${item.unit})`
    );

    if (drillDownItem && drillDownItem.item.id === item.id) {
      setDrillDownItem(null);
    }

    alert(`Item ${item.itemCode} has been successfully deleted from BOQ ${boq.boqNo}.`);
  };

  // Permanently delete a variation order or extra item
  const handleDeleteVariation = async (boqId: string, variationId: string, boqItemId?: string) => {
    const boq = boqs.find(b => b.id === boqId);
    if (!boq) return;

    const targetExtra = (boq.extraItems || []).find(e => e.id === variationId);
    const targetItem = boqItemId 
      ? (boq.items || []).find(i => i.id === boqItemId) 
      : targetExtra?.boqItemId
      ? (boq.items || []).find(i => i.id === targetExtra.boqItemId)
      : (boq.items || []).find(i => (i.variations || []).some(v => v.id === variationId || (targetExtra && v.variationNo === targetExtra.itemCode)));
    const targetVar = targetItem?.variations?.find(v => v.id === variationId || (targetExtra && v.variationNo === targetExtra.itemCode));

    const desc = targetExtra?.description || targetVar?.reason || targetExtra?.itemCode || 'variation';

    if (!confirm(`Are you sure you want to delete variation "${desc}"? This cannot be undone.`)) {
      return;
    }

    const updatedExtras = (boq.extraItems || []).filter(e => e.id !== variationId);

    let updatedItems = boq.items || [];
    if (targetItem) {
      updatedItems = updatedItems.map(it => {
        if (it.id === targetItem.id) {
          const matchingVar = (it.variations || []).find(v => v.id === variationId || (targetExtra && v.variationNo === targetExtra.itemCode));
          const filteredVars = (it.variations || []).filter(v => v.id !== variationId && !(targetExtra && v.variationNo === targetExtra.itemCode));

          let newQty = it.boqQuantity;
          // Roll back approved quantity if it had been approved
          if (matchingVar && matchingVar.approvalStatus === 'Approved') {
            newQty = Math.max(0, it.boqQuantity - Number(matchingVar.additionalQuantity || 0));
          } else if (targetExtra && targetExtra.approvalStatus === 'Approved' && targetExtra.boqItemId === it.id) {
            newQty = Math.max(0, it.boqQuantity - Number(targetExtra.quantity || 0));
          }

          const filteredRevs = (it.revisionsHistory || []).filter(r => r.id !== variationId && (!matchingVar || r.id !== matchingVar.id));

          return {
            ...it,
            boqQuantity: newQty,
            boqAmount: Number((newQty * it.boqRate).toFixed(2)),
            variations: filteredVars,
            revisionsHistory: filteredRevs
          };
        }
        return it;
      });
    } else {
      // If this was an approved new extra item placed into items, remove it
      updatedItems = updatedItems.filter(it => it.id !== variationId);
    }

    await updateBOQ(boq.id, {
      extraItems: updatedExtras,
      items: updatedItems
    });

    await logAudit(
      boq.id,
      boq.boqNo,
      'Variation Deleted',
      `Deleted variation ${desc} from BOQ ${boq.boqNo}`
    );

    if (drillDownItem && drillDownItem.boq.id === boqId) {
      const updatedBOQ = { ...boq, items: updatedItems, extraItems: updatedExtras };
      const updatedItem = updatedItems.find(i => i.id === drillDownItem.item.id);
      if (updatedItem) {
        setDrillDownItem({
          boq: updatedBOQ,
          item: updatedItem,
          itemClaimData: getItemClaimData(updatedBOQ, updatedItem)
        });
      } else {
        setDrillDownItem(null);
      }
    }
    alert(`Variation "${desc}" deleted successfully.`);
  };

  // Export BOQ vs Execution table to Excel with full revision & variation breakdown
  const handleExportExecutionExcel = () => {
    const activeBoq = boqs.find(b => b.status === 'Approved' && (selectedProjectId ? b.projectId === selectedProjectId : true));
    if (!activeBoq) {
      alert('Please select a project with an approved active BOQ to export.');
      return;
    }

    const rows = (activeBoq.items || []).map((item, idx) => {
      const claimData = getItemClaimData(activeBoq, item);
      const rowObj: any = {
        'S.No.': idx + 1,
        'Item Code': item.itemCode,
        'Item Description': item.description,
        'Unit': item.unit,
        'Original BOQ Qty': claimData.originalQuantity,
        'Approved Additions': claimData.approvedAdditions,
        'Current Revised Approved Qty': claimData.currentRevisedApprovedQuantity,
        'Pending Approval Qty': claimData.pendingApprovalQuantity
      };

      eligibleProjectBills.forEach((b, bIdx) => {
        const header = b.billNo || `RA-${bIdx + 1}`;
        rowObj[header] = claimData.claimsByBillId[b.id] || 0;
      });

      rowObj['Total Cumulative Claimed Qty'] = claimData.totalClaimed;
      rowObj['Remaining Approved Qty'] = claimData.balance;
      rowObj['% Claimed'] = `${claimData.percentClaimed.toFixed(1)}%`;
      rowObj['Latest Claim Date'] = claimData.latestClaimDate;
      rowObj['Claim Status'] = claimData.claimStatus;

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BOQ vs Execution');
    XLSX.writeFile(workbook, `BOQ_vs_Execution_${activeBoq.boqNo}.xlsx`);
  };

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
    if (isSavingBOQ) return;
    if (!formProjectId) {
      alert('Please select a project');
      return;
    }
    if (formItems.length === 0) {
      alert('Please add at least one item to the BOQ');
      return;
    }

    setIsSavingBOQ(true);
    try {
      const totalBOQAmount = formItems.reduce((acc, it) => acc + (it.boqQuantity * it.boqRate), 0);

      // If updating an approved or revised BOQ, track revisions if quantity changed
      let finalItems = formItems;
      if (selectedBOQ && (selectedBOQ.status === 'Approved' || selectedBOQ.status === 'Revised')) {
        const todayStr = new Date().toISOString().split('T')[0];
        finalItems = formItems.map(item => {
          const oldItem = (selectedBOQ.items || []).find(i => i.id === item.id || i.itemCode === item.itemCode);
          if (oldItem && oldItem.boqQuantity !== item.boqQuantity) {
            const diff = item.boqQuantity - oldItem.boqQuantity;
            const revRecord: BOQItemRevision = {
              id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              revisionNo: (oldItem.revisionsHistory?.length || 0) + 1,
              date: todayStr,
              type: 'BOQ Revision',
              originalQuantity: oldItem.boqQuantity,
              additionalQuantity: diff,
              revisedQuantity: item.boqQuantity,
              rate: item.boqRate,
              amount: Number((diff * item.boqRate).toFixed(2)),
              reason: `Direct master BOQ quantity edit (${diff >= 0 ? '+' : ''}${diff} ${item.unit})`,
              approvalStatus: 'Approved',
              approvedBy: user?.name || user?.username || 'Contract Admin',
              approvedDate: todayStr
            };
            return {
              ...item,
              originalQuantity: oldItem.originalQuantity !== undefined ? oldItem.originalQuantity : oldItem.boqQuantity,
              revisionsHistory: [...(oldItem.revisionsHistory || []), revRecord]
            };
          }
          return item;
        });
      }

      const boqData: Omit<BOQ, 'id'> = {
        boqNo: selectedBOQ ? selectedBOQ.boqNo : 'BOQ-' + Math.floor(1000 + Math.random() * 9000),
        projectId: formProjectId,
        clientName: formClientName || 'SNE Client',
        date: formDate,
        revisionNo: formRevisionNo,
        remarks: formRemarks,
        items: finalItems,
        revisions: selectedBOQ ? selectedBOQ.revisions || [] : [],
        extraItems: selectedBOQ ? selectedBOQ.extraItems || [] : [],
        status: (selectedBOQ ? selectedBOQ.status : 'Draft') as any,
        boqPdfName: formPdfFile || undefined,
        boqExcelName: formExcelFile || undefined
      };

      if (selectedBOQ) {
        // It's an update or revision
        const changedNotes = `Updated BOQ configuration. Revision level: ${formRevisionNo}. Item count: ${finalItems.length}. Total Value: ₹${totalBOQAmount.toLocaleString('en-IN')}`;
        await updateBOQ(selectedBOQ.id, boqData);
        await logAudit(selectedBOQ.id, selectedBOQ.boqNo, 'Update', changedNotes);
      } else {
        // It's a brand new entry
        await addBOQ(boqData);
        await logAudit('', boqData.boqNo, 'Creation', `Logged initial BOQ. Value: ₹${totalBOQAmount.toLocaleString('en-IN')}`);
      }

      setIsFormOpen(false);
      setSelectedBOQ(null);
      clearForm();
      updateHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Error saving BOQ:', err);
      alert('Failed to save BOQ: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingBOQ(false);
    }
  };

  // Dedicated Add / Edit BOQ Item handlers
  const handleOpenAddBOQItem = (targetBoqId?: string) => {
    setBoqItemModalState({
      isOpen: true,
      mode: 'add',
      item: null,
      targetBoqId: targetBoqId || (selectedBOQ ? selectedBOQ.id : undefined),
      formIndex: null
    });
  };

  const handleOpenEditBOQItem = (item: BOQItem, targetBoqId?: string, formIndex?: number) => {
    setBoqItemModalState({
      isOpen: true,
      mode: 'edit',
      item,
      targetBoqId: targetBoqId || (selectedBOQ ? selectedBOQ.id : undefined),
      formIndex: formIndex !== undefined ? formIndex : null
    });
  };

  const handleSaveBOQItemModal = async (savedItem: BOQItem) => {
    // 1. If inside master form (updating existing row by index or adding)
    if (boqItemModalState.formIndex !== null && boqItemModalState.formIndex !== undefined && boqItemModalState.formIndex >= 0) {
      const updated = [...formItems];
      updated[boqItemModalState.formIndex] = savedItem;
      setFormItems(updated);
      updateHasUnsavedChanges(true);
      return;
    }

    if (isFormOpen && !boqItemModalState.targetBoqId) {
      setFormItems(prev => [...prev, savedItem]);
      updateHasUnsavedChanges(true);
      return;
    }

    // 2. Direct edit or add to an existing persisted BOQ
    const boqId = boqItemModalState.targetBoqId || (selectedBOQ ? selectedBOQ.id : null);
    if (boqId) {
      const targetBoq = boqs.find(b => b.id === boqId);
      if (targetBoq) {
        const existingItems = targetBoq.items || [];
        const itemIdx = existingItems.findIndex(i => i.id === savedItem.id || i.itemCode.toLowerCase() === savedItem.itemCode.toLowerCase());
        let newItems: BOQItem[];
        if (itemIdx >= 0) {
          newItems = [...existingItems];
          newItems[itemIdx] = savedItem;
        } else {
          newItems = [...existingItems, savedItem];
        }
        await updateBOQ(boqId, { items: newItems });
        await logAudit(
          boqId,
          targetBoq.boqNo,
          boqItemModalState.mode === 'edit' ? 'Update' : 'Creation',
          `${boqItemModalState.mode === 'edit' ? 'Updated' : 'Added'} BOQ item ${savedItem.itemCode}: ${savedItem.description.substring(0, 80)}... Qty: ${savedItem.boqQuantity} ${savedItem.unit}`
        );
        if (isFormOpen && selectedBOQ && selectedBOQ.id === boqId) {
          setFormItems(newItems);
        }
      }
    } else {
      // Fallback: append to formItems
      setFormItems(prev => [...prev, savedItem]);
      updateHasUnsavedChanges(true);
    }
  };

  // Add Item to the temporary items list
  const handleAddItem = () => {
    if (!itemCode || !itemDesc || itemQty <= 0 || itemRate <= 0) {
      alert('Please enter valid Code, Description, Quantity and Rate');
      return;
    }

    const existing = editingItemIndex !== null ? formItems[editingItemIndex] : null;

    const newItem: BOQItem = {
      id: existing ? existing.id : 'item_' + Date.now(),
      itemCode,
      description: itemDesc,
      unit: itemUnit,
      originalQuantity: existing && existing.originalQuantity !== undefined ? existing.originalQuantity : Number(itemQty),
      originalRate: existing && existing.originalRate !== undefined ? existing.originalRate : Number(itemRate),
      boqQuantity: Number(itemQty),
      boqRate: Number(itemRate),
      boqAmount: Number(itemQty) * Number(itemRate),
      remarks: itemRemarks || undefined,
      executedQuantity: existing ? existing.executedQuantity || 0 : 0,
      billedQuantity: existing ? existing.billedQuantity || 0 : 0,
      revisionsHistory: existing ? existing.revisionsHistory || [] : [],
      variations: existing ? existing.variations || [] : [],
      floors: existing ? existing.floors || [] : []
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
    const itemToDelete = formItems[index];
    if (selectedBOQ && (selectedBOQ.status === 'Approved' || selectedBOQ.status === 'Revised')) {
      const hasClaims = (billings || []).some(b => 
        b.projectId === selectedBOQ.projectId && 
        (b as any).status !== 'Draft' && 
        (b as any).status !== 'Cancelled' && 
        b.measurementItems?.some(m => (m.boqItemId && m.boqItemId === itemToDelete.id) || (m.itemCode && m.itemCode === itemToDelete.itemCode && Number(m.qtyExecuted) > 0))
      );
      if (hasClaims) {
        if (!confirm(`Warning: Item "${itemToDelete.itemCode}" has active claims in Billing Management. Deleting this item will remove it from the contract specifications. Are you sure you want to proceed?`)) {
          return;
        }
      } else {
        if (!confirm(`Are you sure you want to delete item "${itemToDelete.itemCode} - ${itemToDelete.description}"?`)) {
          return;
        }
      }
    }
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
      status: 'Approved' as any, // Retain approved status so execution and billing tabs keep running seamlessly
      revisions: [...(boq.revisions || []), newRevisionRecord]
    };

    await updateBOQ(boq.id, revisedBOQ);
    await logAudit(boq.id, boq.boqNo, 'Revision', `Triggered automatic revision level upgrade to Rev ${nextRevision}`);
    alert(`BOQ ${boq.boqNo} successfully transitioned to Revision level: Rev ${nextRevision}. Opening specifications editor.`);
    handleOpenEditForm({ ...boq, ...revisedBOQ } as BOQ);
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

  // Add Extra Item or Variation to the selected project's BOQ
  // Add Extra Item or Variation to the selected project's BOQ
  const handleAddExtraItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjId = extraProjectId || selectedProjectId || (activeProjects.length > 0 ? activeProjects[0].id : (projects.length > 0 ? projects[0].id : ''));
    if (!targetProjId) {
      alert('Please select a target project first.');
      return;
    }

    if (!extraCode || !extraDesc || extraQty <= 0 || extraRate <= 0) {
      alert('Please enter valid Code, Description, Quantity and Rate');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isApproved = extraApprovalStatus === 'Approved';
    const varId = 'var_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const newExtra: BOQExtraItem = {
      id: varId,
      itemCode: extraCode,
      description: extraDesc,
      unit: extraUnit,
      quantity: Number(extraQty),
      rate: Number(extraRate),
      amount: Number(extraQty) * Number(extraRate),
      remarks: extraRemarks || undefined,
      approvalStatus: extraApprovalStatus,
      boqItemId: extraBoqItemId || undefined,
      workOrderNo: extraWorkOrderNo || undefined,
      reason: extraRemarks || undefined,
      date: todayStr,
      approvedBy: isApproved ? (user?.name || user?.username || 'Contract Admin') : undefined,
      approvedDate: isApproved ? todayStr : undefined
    };

    let matchingBOQ = boqs.find(b => b.projectId === targetProjId && (b.status === 'Approved' || b.status === 'Revised')) ||
                      boqs.find(b => b.projectId === targetProjId);

    if (!matchingBOQ) {
      const pObj = projects.find(p => p.id === targetProjId);
      const boqNo = 'BOQ-' + Math.floor(1000 + Math.random() * 9000);
      const initialItems: BOQItem[] = isApproved ? [{
        id: varId,
        itemCode: extraCode,
        description: extraDesc,
        unit: extraUnit,
        originalQuantity: 0,
        originalRate: Number(extraRate),
        boqQuantity: Number(extraQty),
        boqRate: Number(extraRate),
        boqAmount: Number(extraQty) * Number(extraRate),
        remarks: extraRemarks || 'Approved variation extra item',
        executedQuantity: 0,
        billedQuantity: 0,
        revisionsHistory: [{
          id: 'rev_' + Date.now(),
          revisionNo: 1,
          date: todayStr,
          type: 'Variation',
          workOrderNo: extraWorkOrderNo || undefined,
          originalQuantity: 0,
          additionalQuantity: Number(extraQty),
          revisedQuantity: Number(extraQty),
          rate: Number(extraRate),
          amount: Number(extraQty) * Number(extraRate),
          reason: extraRemarks || 'Approved Extra Work Order',
          approvalStatus: 'Approved',
          approvedBy: user?.name || user?.username || 'Contract Admin',
          approvedDate: todayStr
        }],
        variations: [{
          id: varId,
          variationNo: 'VAR-' + Math.floor(1000 + Math.random() * 9000),
          boqItemId: varId,
          projectId: targetProjId,
          workOrderNo: extraWorkOrderNo || undefined,
          date: todayStr,
          originalQuantity: 0,
          additionalQuantity: Number(extraQty),
          revisedQuantity: Number(extraQty),
          rate: Number(extraRate),
          amount: Number(extraQty) * Number(extraRate),
          reason: extraRemarks || 'Approved Extra Work Order',
          approvalStatus: 'Approved',
          approvedBy: user?.name || user?.username || 'Contract Admin',
          approvedDate: todayStr
        }]
      }] : [];

      const newBoqData: Omit<BOQ, 'id'> = {
        boqNo,
        projectId: targetProjId,
        clientName: pObj?.clientName || 'SNE Client',
        date: todayStr,
        revisionNo: 0,
        remarks: 'Contract BOQ Master (Auto-initialized with Variation)',
        items: initialItems,
        revisions: [],
        extraItems: [newExtra],
        status: 'Approved' as any
      };
      await addBOQ(newBoqData);
      await logAudit('', boqNo, 'Variation Register', `Initialized BOQ master and logged Variation ${extraCode} (${extraApprovalStatus})`);

      setExtraCode('');
      setExtraDesc('');
      setExtraUnit('cum');
      setExtraQty(0);
      setExtraRate(0);
      setExtraRemarks('');
      setExtraBoqItemId('');
      setExtraWorkOrderNo('');
      setExtraApprovalStatus('Approved');
      setIsExtraModalOpen(false);
      alert(`Variation "${extraCode}" successfully registered (${extraApprovalStatus}) for project.`);
      return;
    }

    let updatedItems = matchingBOQ.items || [];
    if (extraBoqItemId) {
      updatedItems = updatedItems.map(it => {
        if (it.id === extraBoqItemId) {
          const prevQty = it.boqQuantity;
          const originalQty = it.originalQuantity !== undefined ? it.originalQuantity : prevQty;
          const newQty = isApproved ? prevQty + Number(extraQty) : prevQty;

          const variationRecord: BOQItemVariation = {
            id: varId,
            variationNo: 'VAR-' + Math.floor(1000 + Math.random() * 9000),
            boqItemId: it.id,
            projectId: matchingBOQ!.projectId,
            workOrderNo: extraWorkOrderNo || undefined,
            date: todayStr,
            originalQuantity: prevQty,
            additionalQuantity: Number(extraQty),
            revisedQuantity: newQty,
            rate: Number(extraRate),
            amount: Number(extraQty) * Number(extraRate),
            reason: extraRemarks || `Variation for ${it.itemCode}`,
            approvalStatus: extraApprovalStatus,
            approvedBy: isApproved ? (user?.name || user?.username || 'Contract Admin') : undefined,
            approvedDate: isApproved ? todayStr : undefined
          };

          const newVars = [...(it.variations || []), variationRecord];
          let newRevs = it.revisionsHistory || [];

          if (isApproved) {
            const revRecord: BOQItemRevision = {
              id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              revisionNo: (it.revisionsHistory?.length || 0) + 1,
              date: todayStr,
              type: 'Variation',
              workOrderNo: extraWorkOrderNo || undefined,
              originalQuantity: prevQty,
              additionalQuantity: Number(extraQty),
              revisedQuantity: newQty,
              rate: Number(extraRate),
              amount: Number(extraQty) * Number(extraRate),
              reason: extraRemarks || 'Approved Variation Order',
              approvalStatus: 'Approved',
              approvedBy: user?.name || user?.username || 'Contract Admin',
              approvedDate: todayStr
            };
            newRevs = [...newRevs, revRecord];
          }

          return {
            ...it,
            originalQuantity: originalQty,
            boqQuantity: newQty,
            boqAmount: Number((newQty * it.boqRate).toFixed(2)),
            variations: newVars,
            revisionsHistory: newRevs
          };
        }
        return it;
      });
    } else if (isApproved) {
      // Brand new extra scope item that was immediately approved: add it to items!
      const newBoqItem: BOQItem = {
        id: varId,
        itemCode: extraCode,
        description: extraDesc,
        unit: extraUnit,
        originalQuantity: 0,
        originalRate: Number(extraRate),
        boqQuantity: Number(extraQty),
        boqRate: Number(extraRate),
        boqAmount: Number(extraQty) * Number(extraRate),
        remarks: extraRemarks || 'Approved variation extra item',
        executedQuantity: 0,
        billedQuantity: 0,
        revisionsHistory: [{
          id: 'rev_' + Date.now(),
          revisionNo: 1,
          date: todayStr,
          type: 'Variation',
          workOrderNo: extraWorkOrderNo || undefined,
          originalQuantity: 0,
          additionalQuantity: Number(extraQty),
          revisedQuantity: Number(extraQty),
          rate: Number(extraRate),
          amount: Number(extraQty) * Number(extraRate),
          reason: extraRemarks || 'Approved Extra Work Order',
          approvalStatus: 'Approved',
          approvedBy: user?.name || user?.username || 'Contract Admin',
          approvedDate: todayStr
        }],
        variations: [{
          id: varId,
          variationNo: 'VAR-' + Math.floor(1000 + Math.random() * 9000),
          boqItemId: varId,
          projectId: matchingBOQ.projectId,
          workOrderNo: extraWorkOrderNo || undefined,
          date: todayStr,
          originalQuantity: 0,
          additionalQuantity: Number(extraQty),
          revisedQuantity: Number(extraQty),
          rate: Number(extraRate),
          amount: Number(extraQty) * Number(extraRate),
          reason: extraRemarks || 'Approved Extra Work Order',
          approvalStatus: 'Approved',
          approvedBy: user?.name || user?.username || 'Contract Admin',
          approvedDate: todayStr
        }]
      };
      updatedItems = [...updatedItems, newBoqItem];
    }

    const updatedExtras = [...(matchingBOQ.extraItems || []), newExtra];
    await updateBOQ(matchingBOQ.id, {
      items: updatedItems,
      extraItems: updatedExtras
    });

    await logAudit(
      matchingBOQ.id, 
      matchingBOQ.boqNo, 
      'Variation Register', 
      `Logged new Variation ${extraCode} (${extraApprovalStatus}). Value: ₹${(newExtra.amount).toLocaleString('en-IN')}`
    );

    // Reset fields
    setExtraCode('');
    setExtraDesc('');
    setExtraUnit('cum');
    setExtraQty(0);
    setExtraRate(0);
    setExtraRemarks('');
    setExtraBoqItemId('');
    setExtraWorkOrderNo('');
    setExtraApprovalStatus('Approved');
    setIsExtraModalOpen(false);
    alert(`Variation "${extraCode}" successfully registered (${extraApprovalStatus}) for project.`);
  };

  // Export functions (PDF / Excel)
  const handleExportPDF = (boq: BOQ) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`SN ENTERPRISE Construction ERP`, 14, 15);
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

  // Aggregate stats for active dashboard (synchronized with Billing Management)
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

    // Compute certified claims from Billing Management
    let billedVal = 0;
    items.forEach(item => {
      const claimData = getItemClaimData(approvedBOQ, item);
      billedVal += (claimData.totalClaimed * item.boqRate);
    });

    const executedVal = billedVal; // Billing claims represent the verified execution progress
    const balanceVal = totalVal - billedVal;

    // Extras / variations
    const extras = approvedBOQ.extraItems || [];
    const extVal = extras.reduce((sum, curr) => sum + curr.amount, 0);

    return {
      totalValue: totalVal,
      executedValue: executedVal,
      billedValue: billedVal,
      balanceValue: balanceVal,
      profitMargin: totalVal > 0 ? ((totalVal - (executedVal * 0.75)) / totalVal) * 100 : 0,
      itemCount: items.length,
      extrasCount: extras.length,
      extrasValue: extVal
    };
  }, [boqs, selectedProjectId, eligibleProjectBills]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F7] min-h-screen text-[12px] pb-8">
      {/* SAP Screen Header: BOQ01 */}
      <SAPTransactionHeader
        tcode="BOQ01"
        title="BOQ Master & Quantity Schedule"
        subtitle="Enterprise Quantity Control, Revisions Tracking, Variations & Floor Abstract Allocations"
        onNew={handleOpenCreateForm}
        onRefresh={() => window.location.reload()}
        canSave={false}
        canEdit={false}
        canDelete={false}
      >
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-semibold text-[#5F6B75]">Project:</span>
          <SAPSelect
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white border border-[#B8C3CC] rounded-[2px] text-[11px] px-2 py-0.5 text-[#2F3B45]"
          >
            <option value="">-- All Active Projects --</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SAPSelect>
        </div>
      </SAPTransactionHeader>

      {/* SAP-Style Tabs Navigation Bar */}
      <SAPTabs
        tabs={[
          { id: 'dashboard', label: 'Profitability & Stats' },
          { id: 'master', label: 'BOQ Masters Directory', count: filteredBOQs.length },
          { id: 'executed', label: 'BOQ vs Execution' },
          { id: 'billing', label: 'BOQ vs Billed Tracking' },
          { id: 'extra', label: 'Variations Register' },
          { id: 'audit', label: 'Audit & Revisions Trail' }
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        className="mb-2"
      />

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

              <SAPSelect
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
              </SAPSelect>
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
                            
                            <button
                              onClick={() => handleOpenEditForm(boq)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors cursor-pointer"
                              title={boq.status === 'Approved' || boq.status === 'Revised' ? 'Edit / Revise BOQ Specifications & Quantities' : 'Edit draft details'}
                            >
                              <Edit size={13} />
                            </button>

                            {(boq.status === 'Draft' || boq.status === 'Pending Approval') && (
                              <button
                                onClick={() => handleStatusChange(boq, 'Approved')}
                                className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors cursor-pointer"
                                title="Approve BOQ Master"
                              >
                                <Check size={13} />
                              </button>
                            )}

                            {(boq.status === 'Approved' || boq.status === 'Revised') && (
                              <button
                                onClick={() => handleReviseBOQ(boq)}
                                className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1 rounded transition-colors cursor-pointer"
                                title="Revise BOQ (Increments revision level to Rev +1)"
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

      {/* Tab 3: BOQ vs Execution Module (Synchronized with Billing Management) */}
      {activeTab === 'executed' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-xs text-blue-900 p-3.5 rounded shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <strong className="text-blue-950">Authoritative BOQ vs Execution Schedule:</strong> Synchronized live with Billing Management. Track baseline original BOQ quantities, approved contract revisions, extra quantity variations, pending approvals, dynamic RA bill claims, cumulative claims, and remaining approved scope.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const targetB = boqs.find(b => (b.status === 'Approved' || b.status === 'Revised') && (selectedProjectId ? b.projectId === selectedProjectId : true)) ||
                                  boqs.find(b => selectedProjectId ? b.projectId === selectedProjectId : true) ||
                                  boqs[0];
                  if (targetB) {
                    handleOpenAddBOQItem(targetB.id);
                  } else {
                    handleOpenCreateForm();
                  }
                }}
                className="bg-blue-700 hover:bg-blue-800 text-white border border-blue-900 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Add new BOQ item with full specifications"
              >
                <Plus size={14} />
                <span>Add BOQ Item</span>
              </button>
              <button
                type="button"
                onClick={handleExportExecutionExcel}
                className="bg-white hover:bg-slate-50 text-blue-900 border border-blue-300 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Export Ledger</span>
              </button>
              {eligibleProjectBills.length > 0 && (
                <span className="text-[11px] font-semibold bg-blue-100/80 text-blue-950 px-2.5 py-1 rounded border border-blue-300">
                  {eligibleProjectBills.length} Active RA {eligibleProjectBills.length === 1 ? 'Bill' : 'Bills'} Synchronized
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1250px]">
                <thead className="bg-[#1e3a5f] text-white uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10 select-none shadow-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-10">S.No.</th>
                    <th className="px-3 py-2.5 font-bold w-24">Item Code</th>
                    <th className="px-3 py-2.5 min-w-[180px]">Item Description</th>
                    <th className="px-2 py-2.5 text-center w-14">Unit</th>
                    
                    {/* Original Baseline BOQ Quantity */}
                    <th className="px-3 py-2.5 text-right font-bold w-24 bg-[#18314f]">Original BOQ Qty</th>

                    {/* Approved Quantity Additions (Revisions + Approved Variations) */}
                    <th className="px-3 py-2.5 text-right font-bold w-24 bg-[#142840] text-emerald-300">Approved Additions</th>

                    {/* Current Revised Approved Quantity */}
                    <th className="px-3 py-2.5 text-right font-bold w-28 bg-[#0f1f33] text-white">Current Revised Approved Qty</th>

                    {/* Pending Approval Quantity */}
                    <th className="px-3 py-2.5 text-center font-bold w-24 bg-[#233f63] text-amber-300">Pending Approval Qty</th>

                    {/* Dynamic RA Bill Columns generated from actual eligible bills */}
                    {eligibleProjectBills.map((b, idx) => (
                      <th key={b.id} className="px-3 py-2 text-right bg-[#2c5282] border-l border-blue-800 min-w-[95px]">
                        <div className="font-bold text-white text-[11px]">{b.billNo || `RA-${String(idx + 1).padStart(2, '0')}`}</div>
                        <div className="text-[9px] text-blue-200 font-normal lowercase tracking-normal">
                          {b.certifyDate || b.month || 'date'}
                        </div>
                      </th>
                    ))}

                    <th className="px-3 py-2.5 text-right bg-blue-950 font-bold w-28 text-white">
                      Cumulative Claimed Qty
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold w-24">Remaining Approved Qty</th>
                    <th className="px-3 py-2.5 text-center w-24">% Claimed</th>
                    <th className="px-3 py-2.5 text-center w-24">Latest Claim Date</th>
                    <th className="px-3 py-2.5 text-center w-24">Claim Status</th>
                    <th className="px-3 py-2.5 text-center w-48">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {boqs.filter(b => (b.status === 'Approved' || b.status === 'Revised') && (selectedProjectId ? b.projectId === selectedProjectId : true)).length === 0 ? (
                    <tr>
                      <td colSpan={13 + eligibleProjectBills.length} className="px-4 py-8 text-center text-slate-400 italic">
                        Please select a project with an active approved or revised BOQ to run the BOQ vs Execution schedule.
                      </td>
                    </tr>
                  ) : (
                    boqs.filter(b => (b.status === 'Approved' || b.status === 'Revised') && (selectedProjectId ? b.projectId === selectedProjectId : true)).flatMap(boq => 
                      (boq.items || []).map((item, itemIdx) => {
                        const claimData = getItemClaimData(boq, item);
                        const isOver = claimData.balance < 0;

                        return (
                          <tr key={item.id} className={`hover:bg-blue-50/50 transition-colors ${isOver ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-500">
                              {itemIdx + 1}
                            </td>
                            <td className="px-3 py-2 font-bold font-mono text-blue-900">
                              <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                {item.itemCode}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-800">
                              <div>{item.description}</div>
                              {item.revisionsHistory && item.revisionsHistory.length > 0 && (
                                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                                  <span>Rev Level {item.revisionsHistory.length}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center font-mono">
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                {item.unit}
                              </span>
                            </td>

                            {/* Original BOQ Qty */}
                            <td className="px-3 py-2 text-right font-mono text-slate-600 bg-slate-50/50">
                              {claimData.originalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                            </td>

                            {/* Approved Quantity Additions */}
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              {claimData.approvedAdditions > 0 ? (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  +{claimData.approvedAdditions.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                </span>
                              ) : claimData.approvedAdditions < 0 ? (
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {claimData.approvedAdditions.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>

                            {/* Current Revised Approved Quantity */}
                            <td className="px-3 py-2 text-right font-mono font-extrabold text-blue-950 bg-blue-50/30">
                              {claimData.currentRevisedApprovedQuantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                            </td>

                            {/* Pending Approval Quantity */}
                            <td className="px-3 py-2 text-center font-mono">
                              {claimData.pendingApprovalQuantity > 0 ? (
                                <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold text-[10px] border border-amber-300 inline-flex items-center gap-0.5" title="Pending contract approval">
                                  +{claimData.pendingApprovalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Dynamic RA Columns */}
                            {eligibleProjectBills.map(b => {
                              const qty = claimData.claimsByBillId[b.id] || 0;
                              return (
                                <td key={b.id} className="px-3 py-2 text-right font-mono font-bold text-blue-900 border-l border-slate-100 bg-slate-50/40">
                                  {qty > 0 ? (
                                    qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })
                                  ) : (
                                    <span className="text-slate-300 font-normal">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Cumulative Claimed Quantity */}
                            <td className="px-3 py-2 text-right font-mono font-bold text-blue-950 bg-blue-50/50">
                              {claimData.totalClaimed.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                            </td>

                            {/* Remaining Approved Quantity */}
                            <td className={`px-3 py-2 text-right font-mono font-bold ${
                              isOver ? 'text-red-600 bg-red-50/40' : 'text-emerald-700'
                            }`}>
                              {isOver && '⚠️ '}
                              {claimData.balance.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                            </td>

                            {/* % Claimed */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 bg-slate-100 h-2 rounded overflow-hidden">
                                  <div 
                                    className={`h-full rounded ${isOver ? 'bg-red-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${Math.min(100, claimData.percentClaimed)}%` }} 
                                  />
                                </div>
                                <span className="font-mono text-[10px] font-bold text-slate-600">
                                  {claimData.percentClaimed.toFixed(0)}%
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-2 text-center font-mono text-slate-500 text-[11px]">
                              {claimData.latestClaimDate}
                            </td>

                            {/* Claim Status */}
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block ${
                                claimData.claimStatus === 'Overclaim'
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : claimData.claimStatus === 'Fully Claimed'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : claimData.claimStatus === 'In Progress'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {claimData.claimStatus === 'Overclaim' ? '⚠️ Overclaim' : claimData.claimStatus}
                              </span>
                            </td>

                            {/* Actions: Revise / Variation & Claim History */}
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBOQItem(item, boq.id)}
                                  className="text-[10px] text-blue-900 hover:text-white hover:bg-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-300 font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Edit full item specifications, description, and rates"
                                >
                                  <Edit size={11} />
                                  <span>Edit Item</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRevisionModal(boq, item, 'revision')}
                                  className="text-[10px] text-blue-900 hover:text-white hover:bg-blue-700 bg-blue-100/80 px-2 py-1 rounded border border-blue-400 font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Edit quantity, increase contract scope, or log extra variation"
                                >
                                  <ArrowUpDown size={11} />
                                  <span>Adjust Qty</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDrillDownItem({ boq, item, itemClaimData: claimData })}
                                  className="text-[10px] text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  title="View RA-wise Claim History"
                                >
                                  <History size={11} />
                                  <span>History</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setManagingFloorItem({ boqId: boq.id, item: item })}
                                  className="text-[10px] text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-1.5 py-1 rounded border border-slate-200 transition-colors cursor-pointer"
                                  title="Manage Floor breakdown"
                                >
                                  Floors
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItemFromBOQ(boq, item)}
                                  className="text-[10px] text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1 rounded border border-red-200 transition-colors cursor-pointer"
                                  title="Delete item from BOQ"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
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
        </div>
      )}

      {/* Tab 4: BOQ vs Billed Tracking (Synchronized) */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 text-xs text-teal-800 p-4 rounded shadow-sm">
            <strong>Invoiced billing Quantity Certification:</strong> This report monitors bill certified quantities against master BOQ allocations. Derived from authoritative Billing Management records. Keep track of what has been certified vs what is still outstanding in terms of unbilled scope.
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
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boqs.filter(b => (b.status === 'Approved' || b.status === 'Revised') && (selectedProjectId ? b.projectId === selectedProjectId : true)).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                      Please select a project with an active approved or revised BOQ to run the billing dashboard.
                    </td>
                  </tr>
                ) : (
                  boqs.filter(b => (b.status === 'Approved' || b.status === 'Revised') && (selectedProjectId ? b.projectId === selectedProjectId : true)).flatMap(boq => 
                    (boq.items || []).map(item => {
                      const claimData = getItemClaimData(boq, item);
                      const billed = claimData.totalClaimed;
                      const unbilled = claimData.balance;
                      const billingPct = claimData.percentClaimed;
                      const billedAmount = billed * item.boqRate;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.itemCode}</td>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 font-mono">{item.unit}</td>
                          <td className="px-4 py-3 font-bold">{item.boqQuantity.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-teal-700">{billed.toLocaleString('en-IN')}</td>
                          <td className={`px-4 py-3 font-bold ${unbilled < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {unbilled < 0 && '⚠️ '}
                            {unbilled.toLocaleString('en-IN')}
                          </td>
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
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setDrillDownItem({ boq, item, itemClaimData: claimData })}
                                className="text-xs text-teal-700 hover:text-teal-900 font-bold transition-colors cursor-pointer bg-teal-50 px-2.5 py-1 rounded border border-teal-200 flex items-center gap-1"
                              >
                                <History size={12} />
                                <span>Claim History</span>
                              </button>
                              <button
                                onClick={() => setManagingFloorItem({ boqId: boq.id, item: item })}
                                className="text-xs text-slate-600 hover:text-slate-800 font-bold transition-colors cursor-pointer bg-slate-50 px-2.5 py-1 rounded border border-slate-200"
                              >
                                Floors
                              </button>
                            </div>
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
      {activeTab === 'extra' && (() => {
        // Collect all variations from both extraItems and item.variations across matching BOQs
        const relevantBOQs = boqs.filter(b => selectedProjectId ? b.projectId === selectedProjectId : true);
        
        type ConsolidatedVariation = {
          id: string;
          boqId: string;
          boqNo: string;
          projectId: string;
          projectName: string;
          itemCode: string;
          description: string;
          unit: string;
          workOrderNo?: string;
          quantity: number;
          rate: number;
          amount: number;
          remarks?: string;
          reason?: string;
          approvalStatus: string;
          boqItemId?: string;
          approvedBy?: string;
          approvedDate?: string;
          date?: string;
          sourceType: 'extra_item' | 'item_variation' | 'item_revision';
        };

        const allVariations: ConsolidatedVariation[] = [];
        const seenIds = new Set<string>();

        relevantBOQs.forEach(b => {
          const pObj = projects.find(p => p.id === b.projectId);
          const pName = pObj?.name || 'Unknown Project';

          // 1. Extra items
          (b.extraItems || []).forEach(ext => {
            seenIds.add(ext.id);
            allVariations.push({
              id: ext.id,
              boqId: b.id,
              boqNo: b.boqNo,
              projectId: b.projectId,
              projectName: pName,
              itemCode: ext.itemCode,
              description: ext.description,
              unit: ext.unit,
              workOrderNo: ext.workOrderNo,
              quantity: ext.quantity,
              rate: ext.rate,
              amount: ext.amount,
              remarks: ext.remarks,
              reason: ext.reason || ext.remarks,
              approvalStatus: ext.approvalStatus || 'Approved',
              boqItemId: ext.boqItemId,
              approvedBy: ext.approvedBy,
              approvedDate: ext.approvedDate,
              date: ext.date,
              sourceType: 'extra_item'
            });
          });

          // 2. Variations nested on items
          (b.items || []).forEach(it => {
            (it.variations || []).forEach(v => {
              if (!seenIds.has(v.id)) {
                seenIds.add(v.id);
                allVariations.push({
                  id: v.id,
                  boqId: b.id,
                  boqNo: b.boqNo,
                  projectId: b.projectId,
                  projectName: pName,
                  itemCode: it.itemCode,
                  description: `[Variation] ${it.description}`,
                  unit: it.unit,
                  workOrderNo: v.workOrderNo,
                  quantity: v.additionalQuantity,
                  rate: v.rate,
                  amount: v.amount,
                  remarks: v.remarks,
                  reason: v.reason || v.remarks,
                  approvalStatus: v.approvalStatus || 'Pending Approval',
                  boqItemId: it.id,
                  approvedBy: v.approvedBy,
                  approvedDate: v.approvedDate,
                  date: v.date,
                  sourceType: 'item_variation'
                });
              }
            });

            // 3. Contract Scope Revisions nested on items
            (it.revisionsHistory || []).forEach(r => {
              if (!seenIds.has(r.id)) {
                seenIds.add(r.id);
                allVariations.push({
                  id: r.id,
                  boqId: b.id,
                  boqNo: b.boqNo,
                  projectId: b.projectId,
                  projectName: pName,
                  itemCode: it.itemCode,
                  description: `[Revision] ${it.description}`,
                  unit: it.unit,
                  workOrderNo: r.workOrderNo,
                  quantity: r.additionalQuantity,
                  rate: r.rate,
                  amount: r.amount,
                  remarks: r.remarks,
                  reason: r.reason || r.remarks,
                  approvalStatus: r.approvalStatus || 'Approved',
                  boqItemId: it.id,
                  approvedBy: r.approvedBy,
                  approvedDate: r.approvedDate,
                  date: r.date,
                  sourceType: 'item_revision'
                });
              }
            });
          });
        });

        // Filter by status tab
        const filteredVariations = allVariations.filter(v => {
          if (variationStatusFilter === 'All') return true;
          return v.approvalStatus === variationStatusFilter;
        });

        const pendingCount = allVariations.filter(v => v.approvalStatus === 'Pending Approval').length;
        const approvedCount = allVariations.filter(v => v.approvalStatus === 'Approved').length;
        const rejectedCount = allVariations.filter(v => v.approvalStatus === 'Rejected').length;

        return (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Variation Register (Scope Changes & Extra Quantities)</span>
                  {selectedProjectId && (
                    <span className="text-xs font-normal text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Project: {projects.find(p => p.id === selectedProjectId)?.name}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track, approve, reject, and delete variations and extra work orders beyond original contract quantities.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!extraProjectId && selectedProjectId) {
                      setExtraProjectId(selectedProjectId);
                    } else if (!extraProjectId && activeProjects.length > 0) {
                      setExtraProjectId(activeProjects[0].id);
                    }
                    setIsExtraModalOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Plus size={14} /> Add Variation / Extra Item
                </button>
              </div>
            </div>

            {/* Status Filter Badges */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200 text-xs font-semibold">
              <span className="text-slate-500 text-[11px] uppercase mr-1">Status Filter:</span>
              <button
                type="button"
                onClick={() => setVariationStatusFilter('All')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  variationStatusFilter === 'All'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All ({allVariations.length})
              </button>
              <button
                type="button"
                onClick={() => setVariationStatusFilter('Pending Approval')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  variationStatusFilter === 'Pending Approval'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                Pending Approval ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setVariationStatusFilter('Approved')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  variationStatusFilter === 'Approved'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setVariationStatusFilter('Rejected')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  variationStatusFilter === 'Rejected'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white text-red-800 hover:bg-red-50 border border-red-200'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse text-left text-xs text-slate-700">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Item Code</th>
                    {!selectedProjectId && <th className="px-4 py-3">Project</th>}
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">WO / Ref</th>
                    <th className="px-4 py-3 text-right">Variation Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Reason / Justification</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVariations.length === 0 ? (
                    <tr>
                      <td colSpan={selectedProjectId ? 10 : 11} className="px-4 py-8 text-center text-slate-400 italic">
                        No variations matching "{variationStatusFilter}" found. Click "+ Add Variation / Extra Item" to log variation work orders.
                      </td>
                    </tr>
                  ) : (
                    filteredVariations.map((ext) => (
                      <tr key={ext.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-amber-800 font-mono">
                          <span className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                            {ext.itemCode}
                          </span>
                        </td>
                        {!selectedProjectId && (
                          <td className="px-4 py-3 font-medium text-slate-700">{ext.projectName}</td>
                        )}
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {ext.description}
                          {ext.boqItemId && (
                            <span className="ml-1.5 text-[9px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                              Linked Item
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">{ext.unit}</td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{ext.workOrderNo || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-900">
                          {ext.quantity > 0 ? `+${ext.quantity.toLocaleString('en-IN')}` : ext.quantity.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">₹{ext.rate.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-950">₹{ext.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 italic text-slate-500 max-w-[200px] truncate" title={ext.reason || ext.remarks}>
                          {ext.reason || ext.remarks || 'No remarks'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                            ext.approvalStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            ext.approvalStatus === 'Pending Approval' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            ext.approvalStatus === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {ext.approvalStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {ext.approvalStatus === 'Pending Approval' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveVariation(ext.boqId, ext.id, ext.boqItemId)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                                  title="Approve variation and merge into approved BOQ quantity"
                                >
                                  <Check size={11} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectVariation(ext.boqId, ext.id)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-2 py-1 rounded text-[10px] font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                                  title="Reject variation"
                                >
                                  <X size={11} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteVariation(ext.boqId, ext.id, ext.boqItemId)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer border border-transparent hover:border-red-200"
                              title="Delete variation permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-5xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
            <div className="px-6 py-3.5 bg-[#f8fafc] border-b border-slate-200 flex justify-between items-center flex-shrink-0 select-none">
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

            <form onSubmit={handleSaveBOQ} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Header section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Target Project</label>
                    <SAPSelect
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
                    </SAPSelect>
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
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 h-16 resize-y"
                  />
                </div>

                {selectedBOQ && (selectedBOQ.status === 'Approved' || selectedBOQ.status === 'Revised') && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded text-xs flex items-center justify-between">
                    <div>
                      <strong>Editing Approved BOQ (Rev {selectedBOQ.revisionNo}):</strong> You can increase or adjust quantities, rates, and specifications. Any quantity changes will automatically be recorded as formal contract revisions and update approved contract allowances.
                    </div>
                    {isViewing && (
                      <button
                        type="button"
                        onClick={() => setIsViewing(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1 rounded cursor-pointer shrink-0 ml-3"
                      >
                        ✏️ Enable Edit Mode
                      </button>
                    )}
                  </div>
                )}

                {/* Items Table Input Section (Hidden if viewing) */}
                {!isViewing && (
                  <div className="bg-blue-50/50 p-4 rounded border border-blue-200">
                    <h3 className="text-xs font-bold text-slate-800 mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span>✏️ Item Specifications Input</span>
                        <button
                          type="button"
                          onClick={() => handleOpenAddBOQItem(selectedBOQ?.id)}
                          className="bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Open dedicated Add BOQ Item Form dialog with multiline Work Description and scrolling"
                        >
                          <Plus size={12} /> Open Add BOQ Item Form
                        </button>
                      </div>
                      
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
                          className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1 font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Item Description</label>
                        <textarea
                          placeholder="e.g. M25 Grade Reinforced Concrete with aggregate, batching, curing..."
                          value={itemDesc}
                          onChange={(e) => setItemDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1 resize-y min-h-[30px] max-h-24 overflow-y-auto break-words whitespace-pre-wrap"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Unit</label>
                        <SAPSelect
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
                        </SAPSelect>
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

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddBOQItem(selectedBOQ?.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded border border-slate-300 cursor-pointer transition-colors"
                        >
                          Full Item Form
                        </button>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded cursor-pointer transition-colors"
                        >
                          {editingItemIndex !== null ? 'Save Edit Item' : '+ Add Item Row'}
                        </button>
                      </div>
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
                        <th className="px-4 py-2.5 min-w-[220px]">Description</th>
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
                            <td className="px-4 py-2 font-bold text-slate-800 font-mono">{item.itemCode}</td>
                            <td className="px-4 py-2 font-medium max-w-md break-words whitespace-pre-wrap">{item.description}</td>
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
                                    onClick={() => handleOpenEditBOQItem(item, selectedBOQ?.id, index)}
                                    className="text-blue-600 hover:bg-blue-50 p-1 rounded cursor-pointer"
                                    title="Edit BOQ Item in full form"
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
              </div>

              {/* Persistent Actions Footer outside scrollable container */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0 select-none">
                <div className="text-xs font-bold text-slate-700">
                  Grand Total: <span className="font-mono text-blue-900 text-sm">₹{totalBOQAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setSelectedBOQ(null);
                      updateHasUnsavedChanges(false);
                    }}
                    disabled={isSavingBOQ}
                    className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded border border-slate-300 cursor-pointer disabled:opacity-50"
                  >
                    Close Window
                  </button>
                  
                  {isViewing && (
                    <button
                      type="button"
                      onClick={() => setIsViewing(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Edit size={13} /> Switch to Edit / Revise Mode
                    </button>
                  )}

                  {!isViewing && (
                    <button
                      type="submit"
                      disabled={isSavingBOQ}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded flex items-center gap-1.5 cursor-pointer shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                      {isSavingBOQ ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} /> {selectedBOQ ? 'Update Specifications' : 'Save Draft Master'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Extra Variation Item Modal */}
      {isExtraModalOpen && (() => {
        const curProjId = extraProjectId || selectedProjectId || (activeProjects.length > 0 ? activeProjects[0].id : '');
        const targetBOQ = boqs.find(b => b.projectId === curProjId && (b.status === 'Approved' || b.status === 'Revised')) ||
                          boqs.find(b => b.projectId === curProjId);

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-lg rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[11px] relative z-10">
              <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
                <h2 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <span>⚠️ Register Variation / Extra Contract Quantity</span>
                </h2>
                <button 
                  onClick={() => setIsExtraModalOpen(false)} 
                  className="text-amber-700 hover:text-amber-900 font-bold text-lg cursor-pointer"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddExtraItem} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3.5">
                  {/* Project Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Project</label>
                    <SAPSelect
                      value={curProjId}
                      onChange={(e) => {
                        setExtraProjectId(e.target.value);
                        setExtraBoqItemId('');
                      }}
                      className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-medium"
                      required
                    >
                      <option value="">-- Choose Project --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </SAPSelect>
                  </div>

                  {/* Variation Type Switch */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Variation Scope</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExtraTargetType('new_item');
                          setExtraBoqItemId('');
                        }}
                        className={`py-1.5 px-3 rounded text-xs font-bold transition-colors cursor-pointer border ${
                          extraTargetType === 'new_item'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        New Extra Scope Item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExtraTargetType('existing_item');
                        }}
                        className={`py-1.5 px-3 rounded text-xs font-bold transition-colors cursor-pointer border ${
                          extraTargetType === 'existing_item'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Extra Qty on Existing Item
                      </button>
                    </div>
                  </div>

                  {/* Existing Item Selector if applicable */}
                  {extraTargetType === 'existing_item' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select BOQ Item to Increase / Vary
                      </label>
                      <select
                        value={extraBoqItemId}
                        onChange={(e) => {
                          const itId = e.target.value;
                          setExtraBoqItemId(itId);
                          const found = targetBOQ?.items?.find(it => it.id === itId);
                          if (found) {
                            setExtraCode(found.itemCode);
                            setExtraDesc(found.description);
                            setExtraUnit(found.unit);
                            setExtraRate(found.boqRate);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-medium"
                        required
                      >
                        <option value="">-- Choose Existing BOQ Item --</option>
                        {(targetBOQ?.items || []).map(it => (
                          <option key={it.id} value={it.id}>
                            {it.itemCode} - {it.description} (Current Approved: {it.boqQuantity} {it.unit} @ ₹{it.boqRate})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Item Code</label>
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">WO / Change Order Ref</label>
                      <input
                        type="text"
                        placeholder="e.g. WO-VAR-2026-01"
                        value={extraWorkOrderNo}
                        onChange={(e) => setExtraWorkOrderNo(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Item Description / Scope Specifications</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Additional excavation due to hard rock stratum, including hydraulic breaker, loading and disposal within 5km lead..."
                      value={extraDesc}
                      onChange={(e) => setExtraDesc(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 resize-y min-h-[60px] max-h-32 overflow-y-auto break-words whitespace-pre-wrap leading-relaxed"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">UoM</label>
                      <SAPSelect
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
                      </SAPSelect>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Variation Qty</label>
                      <input
                        type="number"
                        step="any"
                        value={extraQty || ''}
                        onChange={(e) => setExtraQty(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-bold"
                        min="0.001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={extraRate || ''}
                        onChange={(e) => setExtraRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-bold"
                        min="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded p-2.5 flex justify-between items-center text-xs">
                    <span className="text-amber-900 font-semibold">Total Variation Amount:</span>
                    <span className="font-mono font-bold text-amber-950 text-sm">
                      ₹{(Number(extraQty || 0) * Number(extraRate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Status</label>
                    <select
                      value={extraApprovalStatus}
                      onChange={(e) => setExtraApprovalStatus(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-semibold"
                    >
                      <option value="Approved">Approved (Directly updates approved contract BOQ quantity)</option>
                      <option value="Pending Approval">Pending Approval (Tracked in Variation Register until approved)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Variation Justification / Remarks</label>
                    <textarea
                      value={extraRemarks}
                      onChange={(e) => setExtraRemarks(e.target.value)}
                      placeholder="Reference official change order document or site instruction number"
                      className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 h-14 resize-y"
                    />
                  </div>
                </div>

                {/* Persistent Footer */}
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 bg-[#f8fafc] flex-shrink-0 select-none">
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
        );
      })()}

      {/* MODAL 3: Simulate Quantities Updates */}
      {isSimulateModalOpen && simItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-sm rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
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

      {managingFloorItem && (
        <BOQItemFloorManager
          item={managingFloorItem.item}
          onClose={() => setManagingFloorItem(null)}
          onUpdate={(updatedItem) => {
            const boq = boqs.find(b => b.id === managingFloorItem.boqId);
            if (!boq) return;
            const updatedItems = boq.items.map(i => i.id === updatedItem.id ? updatedItem : i);
            updateBOQ(boq.id, { items: updatedItems });
            setManagingFloorItem({ boqId: boq.id, item: updatedItem });
          }}
        />
      )}

      {/* Detailed RA-wise Claim History Drill-down Modal */}
      {drillDownItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Modal Header */}
            <div className="bg-[#1e3a5f] text-white px-5 py-3.5 flex justify-between items-center select-none">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white font-mono px-2 py-0.5 rounded text-xs font-bold">
                    {drillDownItem.item.itemCode || 'BOQ ITEM'}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Detailed RA-Wise Claim History
                  </h3>
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  {drillDownItem.item.description} &bull; Unit: <strong className="text-white font-mono">{drillDownItem.item.unit}</strong> &bull; Approved Contract BOQ Qty: <strong className="text-white font-mono">{drillDownItem.item.boqQuantity.toLocaleString('en-IN')}</strong> &bull; BOQ Rate: <strong className="text-white font-mono">₹{drillDownItem.item.boqRate.toLocaleString('en-IN')}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownItem(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* KPI Summary strip */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Approved BOQ Qty</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {drillDownItem.item.boqQuantity.toLocaleString('en-IN')} {drillDownItem.item.unit}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Claimed Qty</span>
                <span className="text-sm font-bold text-blue-900 font-mono">
                  {drillDownItem.itemClaimData.totalClaimed.toLocaleString('en-IN')} {drillDownItem.item.unit}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Remaining Balance Qty</span>
                <span className={`text-sm font-bold font-mono ${drillDownItem.itemClaimData.balance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {drillDownItem.itemClaimData.balance < 0 && '⚠️ '}
                  {drillDownItem.itemClaimData.balance.toLocaleString('en-IN')} {drillDownItem.item.unit}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Percentage Claimed</span>
                <span className={`text-sm font-bold font-mono ${drillDownItem.itemClaimData.percentClaimed > 100 ? 'text-red-600' : 'text-blue-900'}`}>
                  {drillDownItem.itemClaimData.percentClaimed.toFixed(1)}%
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Claim Status</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mt-0.5 ${
                  drillDownItem.itemClaimData.claimStatus === 'Overclaim'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : drillDownItem.itemClaimData.claimStatus === 'Fully Claimed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : drillDownItem.itemClaimData.claimStatus === 'In Progress'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {drillDownItem.itemClaimData.claimStatus === 'Overclaim' ? '⚠️ Overclaim' : drillDownItem.itemClaimData.claimStatus}
                </span>
              </div>
            </div>

            {/* Modal Navigation Tabs: Claims vs Revisions Trail */}
            <div className="flex border-b border-slate-200 px-5 pt-2.5 bg-slate-50 gap-4 select-none">
              <button
                type="button"
                onClick={() => setActiveHistoryTab('claims')}
                className={`pb-2 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeHistoryTab === 'claims'
                    ? 'border-blue-700 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText size={14} className={activeHistoryTab === 'claims' ? 'text-blue-700' : 'text-slate-400'} />
                <span>RA-Wise Claim History ({drillDownItem.itemClaimData.history.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveHistoryTab('revisions')}
                className={`pb-2 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeHistoryTab === 'revisions'
                    ? 'border-blue-700 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History size={14} className={activeHistoryTab === 'revisions' ? 'text-blue-700' : 'text-slate-400'} />
                <span>Revisions & Variations Trail ({
                  (drillDownItem.item.revisionsHistory?.length || 0) + (drillDownItem.item.variations?.length || 0)
                })</span>
              </button>
            </div>

            {/* Content Table */}
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {activeHistoryTab === 'claims' ? (
                drillDownItem.itemClaimData.history.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                    <FileText className="mx-auto mb-2 text-slate-300" size={32} />
                    <p className="font-semibold text-slate-600 text-sm">No RA claims logged for this item</p>
                    <p className="text-xs text-slate-400 mt-1">This BOQ item has not been claimed yet in Billing Management.</p>
                  </div>
                ) : (
                  <div className="rounded border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full border-collapse text-left text-xs text-slate-700">
                      <thead className="bg-[#2c5282] text-white uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10 shadow-xs">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-10">S.No.</th>
                          <th className="px-3 py-2.5 font-bold">RA Bill Number</th>
                          <th className="px-3 py-2.5">Bill Date</th>
                          <th className="px-3 py-2.5">Bill Status</th>
                          <th className="px-3 py-2.5 text-right bg-blue-800 font-bold">Quantity Claimed</th>
                          <th className="px-3 py-2.5 text-right">Previously Claimed Cum.</th>
                          <th className="px-3 py-2.5 text-right bg-blue-900 font-bold">Cumulative Claimed After RA</th>
                          <th className="px-3 py-2.5 text-right font-bold">Remaining Balance</th>
                          <th className="px-3 py-2.5 text-right">Rate</th>
                          <th className="px-3 py-2.5 text-right font-bold">Claim Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {drillDownItem.itemClaimData.history.map((row: any, idx: number) => {
                          const isOver = row.remainingBalanceAfterRA < 0;
                          return (
                            <tr key={row.billId || idx} className={`hover:bg-blue-50/40 transition-colors ${isOver ? 'bg-amber-50/50' : ''}`}>
                              <td className="px-3 py-2 text-center font-mono font-bold text-slate-500">{row.seq}</td>
                              <td className="px-3 py-2 font-bold text-blue-950 font-mono">
                                <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                  {row.billNo}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-600">{row.billDate}</td>
                              <td className="px-3 py-2">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                  {row.billStatus}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                                {row.claimedInThisRA > 0 ? (
                                  row.claimedInThisRA.toLocaleString('en-IN', { maximumFractionDigits: 3 })
                                ) : (
                                  <span className="text-slate-300 font-normal">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {row.prevCumulative.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-blue-950 bg-blue-50/50">
                                {row.cumulativeAfterRA.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                              </td>
                              <td className={`px-3 py-2 text-right font-mono font-bold ${isOver ? 'text-red-600 bg-red-50/40' : 'text-emerald-700'}`}>
                                {isOver && '⚠️ '}
                                {row.remainingBalanceAfterRA.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700">
                                ₹{row.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                                ₹{row.claimAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-300 text-xs">
                        <tr>
                          <td colSpan={4} className="px-3 py-2.5 text-right font-bold text-slate-700 uppercase">
                            Contract Allowance: {drillDownItem.item.boqQuantity.toLocaleString('en-IN')} {drillDownItem.item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold text-blue-950 bg-blue-100/60 border border-blue-200">
                            {drillDownItem.itemClaimData.totalClaimed.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-400 text-[10px] italic">
                            Total Claimed
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold text-blue-950 bg-blue-100/80">
                            {drillDownItem.itemClaimData.totalClaimed.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-extrabold ${drillDownItem.itemClaimData.balance < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                            {drillDownItem.itemClaimData.balance.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-400 text-[10px] italic">
                            Total Value:
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-800">
                            ₹{drillDownItem.itemClaimData.history.reduce((sum: number, r: any) => sum + r.claimAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              ) : (
                /* Tab 2: Revisions & Variations Trail */
                <div>
                  <div className="bg-blue-50/60 border border-blue-200 rounded p-3 mb-4 text-xs text-blue-900 flex justify-between items-center">
                    <div>
                      <strong>Formal Scope Control & Variations Trail:</strong> Baseline contract quantity:{' '}
                      <strong className="font-mono">
                        {(drillDownItem.item.originalQuantity !== undefined ? drillDownItem.item.originalQuantity : drillDownItem.item.boqQuantity).toLocaleString('en-IN')} {drillDownItem.item.unit}
                      </strong>. Approved contract additions:{' '}
                      <strong className="font-mono text-emerald-700">
                        {drillDownItem.itemClaimData.approvedAdditions > 0 ? `+${drillDownItem.itemClaimData.approvedAdditions.toLocaleString('en-IN')}` : drillDownItem.itemClaimData.approvedAdditions.toLocaleString('en-IN')} {drillDownItem.item.unit}
                      </strong>.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenRevisionModal(drillDownItem.boq, drillDownItem.item, 'revision')}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Plus size={13} />
                      <span>Log New Revision / Var</span>
                    </button>
                  </div>

                  {(!drillDownItem.item.revisionsHistory || drillDownItem.item.revisionsHistory.length === 0) &&
                   (!drillDownItem.item.variations || drillDownItem.item.variations.length === 0) ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                      <History className="mx-auto mb-2 text-slate-300" size={32} />
                      <p className="font-semibold text-slate-600 text-sm">No revisions or variations recorded</p>
                      <p className="text-xs text-slate-400 mt-1">This item remains at its baseline original contract quantity.</p>
                    </div>
                  ) : (
                    <div className="rounded border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full border-collapse text-left text-xs text-slate-700">
                        <thead className="bg-[#1e3a5f] text-white uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10 shadow-xs">
                          <tr>
                            <th className="px-3 py-2.5 text-center w-8">#</th>
                            <th className="px-3 py-2.5">Workflow Type</th>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">WO / Ref</th>
                            <th className="px-3 py-2.5 text-right">Prior Qty</th>
                            <th className="px-3 py-2.5 text-right bg-blue-800 font-bold">Adjustment (+ / -)</th>
                            <th className="px-3 py-2.5 text-right font-bold bg-blue-900">Revised Qty</th>
                            <th className="px-3 py-2.5 text-right">Rate</th>
                            <th className="px-3 py-2.5 text-right font-bold">Amount</th>
                            <th className="px-3 py-2.5 min-w-[150px]">Reason / Authorization</th>
                            <th className="px-3 py-2.5 text-center">Status</th>
                            <th className="px-3 py-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {[
                            ...(drillDownItem.item.revisionsHistory || []).map((r, i) => ({ ...r, _source: 'revision' as const, _seq: i + 1 })),
                            ...(drillDownItem.item.variations || []).map((v, i) => ({ ...v, _source: 'variation' as const, _seq: (drillDownItem.item.revisionsHistory?.length || 0) + i + 1 }))
                          ].map((rec: any, idx: number) => {
                            const isPending = rec.approvalStatus === 'Pending Approval';
                            return (
                              <tr key={rec.id || idx} className={`hover:bg-blue-50/40 transition-colors ${isPending ? 'bg-amber-50/40' : ''}`}>
                                <td className="px-3 py-2 text-center font-mono font-bold text-slate-500">{rec._seq}</td>
                                <td className="px-3 py-2 font-bold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    rec.type === 'BOQ Revision'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                                  }`}>
                                    {rec.type || (rec._source === 'revision' ? 'BOQ Revision' : 'Variation')}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-600">{rec.date}</td>
                                <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">{rec.workOrderNo || '-'}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">
                                  {rec.originalQuantity?.toLocaleString('en-IN') || '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                                  {rec.additionalQuantity > 0 ? (
                                    <span className="text-emerald-700 font-bold">+{rec.additionalQuantity.toLocaleString('en-IN')}</span>
                                  ) : (
                                    <span className="text-amber-700 font-bold">{rec.additionalQuantity?.toLocaleString('en-IN')}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-blue-950 bg-blue-50/50">
                                  {rec.revisedQuantity?.toLocaleString('en-IN')}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-slate-700">₹{rec.rate?.toLocaleString('en-IN')}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                                  ₹{rec.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  <div>{rec.reason}</div>
                                  {rec.approvedBy && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      Approved by {rec.approvedBy} on {rec.approvedDate}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                                    rec.approvalStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    rec.approvalStatus === 'Pending Approval' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                    rec.approvalStatus === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {rec.approvalStatus}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {isPending && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await handleApproveVariation(drillDownItem.boq.id, rec.id, drillDownItem.item.id);
                                          }}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                                          title="Approve variation"
                                        >
                                          <Check size={11} />
                                          <span>Approve</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await handleRejectVariation(drillDownItem.boq.id, rec.id);
                                          }}
                                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-2 py-0.5 rounded text-[10px] font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                                          title="Reject variation"
                                        >
                                          <X size={11} />
                                          <span>Reject</span>
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await handleDeleteVariation(drillDownItem.boq.id, rec.id, drillDownItem.item.id);
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                                      title="Delete variation"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center text-xs">
              <span className="text-slate-500 italic">
                Authoritative source of truth: Saved RA bills in Billing Management
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await handleDeleteItemFromBOQ(drillDownItem.boq, drillDownItem.item);
                  }}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                  title="Permanently delete this line item from BOQ"
                >
                  <Trash2 size={13} />
                  <span>Delete Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrillDownItem(null)}
                  className="bg-[#2c5282] hover:bg-[#1e3a5f] text-white font-bold px-4 py-1.5 rounded transition-colors cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BOQ Revision & Extra Quantity / Variation */}
      {revisionModalItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-300 text-xs max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#1e3a5f] text-white px-5 py-3.5 flex justify-between items-center select-none flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus size={16} className="text-blue-300" />
                  <span>Log BOQ Revision or Extra Quantity Variation</span>
                </h3>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  Item: <strong className="text-white font-mono">{revisionModalItem.item.itemCode}</strong> - {revisionModalItem.item.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevisionModalItem(null)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Workflow Mode Tabs */}
            <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2 flex-shrink-0 select-none">
              <button
                type="button"
                onClick={() => {
                  setModalWorkflow('revision');
                  setRevApprovalStatus('Approved');
                }}
                className={`flex-1 py-2 px-3 rounded text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  modalWorkflow === 'revision'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>1. BOQ Revision</span>
                <span className={`text-[10px] font-normal ${modalWorkflow === 'revision' ? 'text-blue-100' : 'text-slate-400'}`}>
                  Formal contract change to existing item
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalWorkflow('variation');
                  setRevApprovalStatus('Pending Approval');
                }}
                className={`flex-1 py-2 px-3 rounded text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  modalWorkflow === 'variation'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>2. Extra Quantity / Variation</span>
                <span className={`text-[10px] font-normal ${modalWorkflow === 'variation' ? 'text-amber-100' : 'text-slate-400'}`}>
                  Additional work with separate approval
                </span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItemRevisionOrVariation} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                {/* Context Summary */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Baseline Original Qty</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {(revisionModalItem.item.originalQuantity !== undefined ? revisionModalItem.item.originalQuantity : revisionModalItem.item.boqQuantity).toLocaleString('en-IN')} {revisionModalItem.item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Current Approved Qty</span>
                    <span className="text-xs font-bold text-blue-900 font-mono">
                      {revisionModalItem.item.boqQuantity.toLocaleString('en-IN')} {revisionModalItem.item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Contract Rate</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      ₹{revisionModalItem.item.boqRate.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Input fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Work Order / Amendment Reference
                    </label>
                    <input
                      type="text"
                      value={revWorkOrderNo}
                      onChange={(e) => setRevWorkOrderNo(e.target.value)}
                      placeholder="e.g. WO-AMEND-01 or VAR-2026-004"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={revDate}
                      onChange={(e) => setRevDate(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Additional Qty (+ or -)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={revAdditionalQty || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRevAdditionalQty(val);
                        setRevTargetTotalQty(revisionModalItem.item.boqQuantity + val);
                      }}
                      placeholder="e.g. 1000 or -500"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-blue-950 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Type quantity addition or reduction
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Or New Total Target Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={revTargetTotalQty || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRevTargetTotalQty(val);
                        setRevAdditionalQty(val - revisionModalItem.item.boqQuantity);
                      }}
                      placeholder={`Current: ${revisionModalItem.item.boqQuantity}`}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-blue-950 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Target: {revisionModalItem.item.boqQuantity} + addition
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Applicable Rate (₹/{revisionModalItem.item.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={revRate || ''}
                      onChange={(e) => setRevRate(Number(e.target.value))}
                      placeholder="Rate"
                      required
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Defaults to contract rate
                    </span>
                  </div>
                </div>

                {/* Impact Calculation Preview */}
                <div className="bg-blue-50/70 border border-blue-200 rounded p-3 grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-blue-700 uppercase font-semibold block">Adjustment</span>
                    <span className={`text-xs font-bold font-mono ${revAdditionalQty > 0 ? 'text-emerald-700' : revAdditionalQty < 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {revAdditionalQty > 0 ? `+${revAdditionalQty}` : revAdditionalQty} {revisionModalItem.item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-700 uppercase font-semibold block">Revised Quantity</span>
                    <span className="text-xs font-bold text-blue-950 font-mono">
                      {(revisionModalItem.item.boqQuantity + Number(revAdditionalQty || 0)).toLocaleString('en-IN')} {revisionModalItem.item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-700 uppercase font-semibold block">Additional Value</span>
                    <span className="text-xs font-bold text-emerald-800 font-mono">
                      ₹{(Number(revAdditionalQty || 0) * Number(revRate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Reason / Contract Authorization */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason / Contract Authorization Reference <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={revReason}
                    onChange={(e) => setRevReason(e.target.value)}
                    placeholder="Detail the rationale, site instruction number, client request letter, or architectural revision..."
                    required
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 resize-y min-h-[50px] max-h-32 overflow-y-auto break-words whitespace-pre-wrap"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Approval Workflow Status
                    </label>
                    <select
                      value={revApprovalStatus}
                      onChange={(e) => setRevApprovalStatus(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Approved">Approved (Immediately updates current approved BOQ qty)</option>
                      <option value="Pending Approval">Pending Approval (Tracked separately until formally approved)</option>
                      <option value="Draft">Draft</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Internal Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={revRemarks}
                      onChange={(e) => setRevRemarks(e.target.value)}
                      placeholder="Optional notes or references"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Persistent Actions Footer */}
              <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 bg-[#f8fafc] flex-shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setRevisionModalItem(null)}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-1.5 rounded border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`text-white text-xs font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer transition-colors ${
                    modalWorkflow === 'revision' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Save {modalWorkflow === 'revision' ? 'BOQ Revision' : 'Extra Quantity Variation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Add / Edit BOQ Item Responsive Modal */}
      <BOQItemModal
        isOpen={boqItemModalState.isOpen}
        mode={boqItemModalState.mode}
        initialItem={boqItemModalState.item}
        onClose={() => setBoqItemModalState(prev => ({ ...prev, isOpen: false, item: null }))}
        onSave={handleSaveBOQItemModal}
        projectName={
          projects.find(p => p.id === (
            selectedBOQ?.projectId ||
            formProjectId ||
            boqs.find(b => b.id === boqItemModalState.targetBoqId)?.projectId ||
            selectedProjectId
          ))?.name
        }
        existingItemCodes={
          isFormOpen
            ? formItems.map(i => i.itemCode)
            : (boqs.find(b => b.id === boqItemModalState.targetBoqId)?.items || []).map(i => i.itemCode)
        }
      />

    </div>
  );
}
