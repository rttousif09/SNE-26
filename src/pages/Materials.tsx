import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { AnimateBadge } from '../components/AnimatedERP';
import { 
  Plus, Trash2, Edit, Printer, FileSpreadsheet, Search, AlertTriangle, 
  Building2, Grid, Calendar, ShoppingCart, Send, RotateCcw, TrendingUp, Info, ArrowLeftRight, User, DollarSign, Wrench, Hammer, Upload
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { 
  checkMaterialPurchaseDuplicate, 
  checkMaterialIssueDuplicate, 
  checkMaterialReturnDuplicate, 
  checkSupplierPaymentDuplicate, 
  addOverrideLog 
} from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { exportToPDF, downloadPDF, formatCurrency } from '../lib/pdfGenerator';
import { ReportPreviewModal } from '../components/ReportPreviewModal';

// Reusable standard lists
const ITEM_CATEGORIES = [
  'Consumables', 'Safety Items', 'Tools', 'Equipment', 'Machinery', 'Office Supplies', 
  'Civil', 'Structural', 'Electrical', 'Plumbing', 'Finishing', 'Other'
];
const ITEM_UNITS = ['Nos', 'Kg', 'Ton', 'Sqm', 'Cum', 'Meter', 'Bundle', 'Bag', 'Roll', 'Litre'];
const ASSET_STATUSES = ['Available', 'In Use', 'Under Maintenance', 'Damaged', 'Lost', 'Disposed'];

interface MaterialTransfer {
  id: string;
  transferDate: string;
  itemId: string;
  qty: number;
  fromProjectId: string;
  toProjectId: string;
  remarks?: string;
  createdBy: string;
  createdDate: string;
}

interface MaterialLoss {
  id: string;
  date: string;
  projectId: string;
  itemId: string;
  qty: number;
  reason: string;
  responsiblePerson: string;
  recoveryAmount?: number;
  remarks?: string;
  createdBy: string;
  createdDate: string;
}

interface SupplierPayment {
  id: string;
  supplierName: string;
  paymentDate: string;
  amountPaid: number;
  paymentMode: string;
  invoiceReference?: string;
  remarks?: string;
}

export const Materials: React.FC = () => {
  const { 
    projects, 
    materialItems, 
    materialIssues,      // Re-purposed as Client Receipts
    materialReturns,     // Re-purposed as Client Returns
    materialPurchases,   // Re-purposed as Company Purchases
    addMaterialItem,
    updateMaterialItem,
    deleteMaterialItem,
    addMaterialIssue,
    updateMaterialIssue,
    deleteMaterialIssue,
    addMaterialReturn,
    updateMaterialReturn,
    deleteMaterialReturn,
    addMaterialPurchase,
    updateMaterialPurchase,
    deleteMaterialPurchase,
    assets,
    addAsset,
    updateAsset,
    deleteAsset,
    user
  } = useAppContext();

  // Active ERP Workspace Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'receipt' | 'return' | 'reconciliation' | 'transfer' | 'loss_damage' | 'company_purchase' | 'equipment' | 'supplier_ledger' | 'reports'>('dashboard');
  const [materialsReportPreview, setMaterialsReportPreview] = useState<{title: string, headers: string[], data: any[][]} | null>(null);

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Duplicate verification states
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupModuleTitle, setDupModuleTitle] = useState('');
  const [dupWarningText, setDupWarningText] = useState('');
  const [dupData, setDupData] = useState<any[]>([]);
  const [pendingSaveFn, setPendingSaveFn] = useState<((overrideReason?: string) => void) | null>(null);

  // Multi-utility state lists backed by localStorage
  const [materialTransfers, setMaterialTransfers] = useState<MaterialTransfer[]>(() => {
    const saved = localStorage.getItem('erp_material_transfers');
    return saved ? JSON.parse(saved) : [];
  });

  const [materialLosses, setMaterialLosses] = useState<MaterialLoss[]>(() => {
    const saved = localStorage.getItem('erp_material_losses');
    return saved ? JSON.parse(saved) : [];
  });

  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(() => {
    const saved = localStorage.getItem('erp_supplier_payments');
    return saved ? JSON.parse(saved) : [];
  });

  // Synchronize dynamic local registries
  useEffect(() => {
    localStorage.setItem('erp_material_transfers', JSON.stringify(materialTransfers));
  }, [materialTransfers]);

  useEffect(() => {
    localStorage.setItem('erp_material_losses', JSON.stringify(materialLosses));
  }, [materialLosses]);

  useEffect(() => {
    localStorage.setItem('erp_supplier_payments', JSON.stringify(supplierPayments));
  }, [supplierPayments]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterItem, setFilterItem] = useState('all');
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState('');

  // Editing Modals/Form states
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  
  const [masterForm, setMasterForm] = useState({ itemCode: '', itemName: '', category: 'Civil', materialType: 'Consumable' as 'Consumable' | 'Returnable', unit: 'Nos', description: '' });
  const [receiptForm, setReceiptForm] = useState({ voucherNo: '', issueDate: new Date().toISOString().split('T')[0], projectId: '', tower: '', floor: '', itemId: '', qty: 0, issuedTo: '', remarks: '' });
  const [receiptLineItems, setReceiptLineItems] = useState([{ id: Math.random(), itemId: '', qty: 0, tower: '', floor: '', remarks: '' }]);
  const [returnForm, setReturnForm] = useState({ voucherNo: '', returnDate: new Date().toISOString().split('T')[0], projectId: '', itemId: '', qty: 0, returnedBy: '', remarks: '' });
  const [transferForm, setTransferForm] = useState({ transferDate: new Date().toISOString().split('T')[0], itemId: '', qty: 0, fromProjectId: '', toProjectId: '', remarks: '' });
  const [lossForm, setLossForm] = useState({ date: new Date().toISOString().split('T')[0], projectId: '', itemId: '', qty: 0, reason: '', responsiblePerson: '', recoveryAmount: 0, remarks: '' });
  const [purchaseForm, setPurchaseForm] = useState({ purchaseDate: new Date().toISOString().split('T')[0], supplierName: '', projectId: '', itemId: '', qty: 0, rate: 0, invoiceNumber: '', remarks: '' });
  const [equipmentForm, setEquipmentForm] = useState({ purchaseDate: new Date().toISOString().split('T')[0], name: '', assetCode: '', brand: '', purchaseCost: 0, currentSiteId: '', status: 'Available' as any, remarks: '' });
  const [paymentForm, setPaymentForm] = useState({ supplierName: '', paymentDate: new Date().toISOString().split('T')[0], amountPaid: 0, paymentMode: 'Bank Transfer', invoiceReference: '', remarks: '' });

  // Dedicated Returnable Material Quick Log state
  const [isReturnableModalOpen, setIsReturnableModalOpen] = useState(false);
  const [returnableForm, setReturnableForm] = useState({
    type: 'Issue' as 'Issue' | 'Return',
    date: new Date().toISOString().substring(0, 10),
    projectId: '',
    itemId: '',
    qty: 0,
    voucherNo: '',
    person: '',
    condition: 'Good' as 'Good' | 'Damaged' | 'Scrap',
    tower: '',
    floor: '',
    remarks: ''
  });

  const handleQuickLogReturnable = (type: 'Issue' | 'Return', projectId: string = '', itemId: string = '') => {
    setReturnableForm({
      type,
      date: new Date().toISOString().substring(0, 10),
      projectId,
      itemId,
      qty: 0,
      voucherNo: '',
      person: '',
      condition: 'Good',
      tower: '',
      floor: '',
      remarks: ''
    });
    setIsReturnableModalOpen(true);
  };

  const handleSaveReturnable = () => {
    if (!returnableForm.projectId || !returnableForm.itemId || !returnableForm.qty) {
      alert('Project Site, Material Item, and Quantity are mandatory.');
      return;
    }
    if (returnableForm.qty <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    const creator = user?.name || user?.username || 'Admin';
    const vNo = returnableForm.voucherNo || getNextVoucherNo(returnableForm.type === 'Issue' ? 'REC' : 'RET');

    if (returnableForm.type === 'Issue') {
      const dataToSave = {
        voucherNo: vNo,
        issueDate: returnableForm.date,
        projectId: returnableForm.projectId,
        tower: returnableForm.tower,
        floor: returnableForm.floor,
        itemId: returnableForm.itemId,
        qty: Number(returnableForm.qty),
        issuedTo: returnableForm.person || 'Representative',
        remarks: returnableForm.remarks || 'Returnable Item Issued'
      };

      // Check duplicates
      const countMatches = checkMaterialIssueDuplicate(
        materialIssues,
        {
          voucherNo: dataToSave.voucherNo,
          issueDate: dataToSave.issueDate,
          projectId: dataToSave.projectId,
          itemId: dataToSave.itemId
        }
      );

      const executeSave = (bypass: boolean = false, reason: string = '') => {
        addMaterialIssue(dataToSave);
        if (bypass && reason) {
          addOverrideLog(
            creator,
            'Client Material Receipt',
            `Voucher: ${dataToSave.voucherNo}, Date: ${dataToSave.issueDate}, Qty: ${dataToSave.qty}`,
            reason
          );
        }
        setIsReturnableModalOpen(false);
      };

      if (countMatches.length > 0) {
        setDupModuleTitle('Client Material Receipt');
        setDupWarningText('Warning: A duplicate receipt record with the exact same Date, Site, Item and Voucher Number exists.');
        setDupData(countMatches);
        setPendingSaveFn(() => (reason?: string) => executeSave(true, reason || 'No details'));
        setDupModalOpen(true);
        return;
      }

      executeSave();
    } else {
      const dataToSave = {
        voucherNo: vNo,
        returnDate: returnableForm.date,
        projectId: returnableForm.projectId,
        tower: returnableForm.tower,
        floor: returnableForm.floor,
        itemId: returnableForm.itemId,
        qty: Number(returnableForm.qty),
        returnedBy: returnableForm.person || 'Representative',
        condition: returnableForm.condition || 'Good',
        remarks: returnableForm.remarks || 'Returnable Item Returned'
      };

      // Check duplicates
      const countMatches = checkMaterialReturnDuplicate(
        materialReturns,
        {
          voucherNo: dataToSave.voucherNo,
          returnDate: dataToSave.returnDate,
          projectId: dataToSave.projectId,
          itemId: dataToSave.itemId
        }
      );

      const executeSave = (bypass: boolean = false, reason: string = '') => {
        addMaterialReturn(dataToSave as any);
        if (bypass && reason) {
          addOverrideLog(
            creator,
            'Client Material Return',
            `Voucher: ${dataToSave.voucherNo}, Date: ${dataToSave.returnDate}, Qty: ${dataToSave.qty}`,
            reason
          );
        }
        setIsReturnableModalOpen(false);
      };

      if (countMatches.length > 0) {
        setDupModuleTitle('Client Material Return');
        setDupWarningText('Warning: A duplicate return record with the exact same Date, Site, Item and Voucher Number exists.');
        setDupData(countMatches);
        setPendingSaveFn(() => (reason?: string) => executeSave(true, reason || 'No details'));
        setDupModalOpen(true);
        return;
      }

      executeSave();
    }
  };

  // Helpers
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Deleted Project Site';
  const getItemName = (id: string) => materialItems.find(i => i.id === id)?.itemName || 'Deleted item';
  const getItemUnit = (id: string) => materialItems.find(i => i.id === id)?.unit || 'UoM';

  // Master Deletion Safe Check
  const canDeleteMasterItem = (itemId: string): boolean => {
    const hasReceipts = materialIssues.some(i => i.itemId === itemId);
    const hasReturns = materialReturns.some(r => r.itemId === itemId);
    const hasTransfers = materialTransfers.some(t => t.itemId === itemId);
    const hasLosses = materialLosses.some(l => l.itemId === itemId);
    const hasPurchases = materialPurchases.some(p => p.itemId === itemId);
    return !hasReceipts && !hasReturns && !hasTransfers && !hasLosses && !hasPurchases;
  };

  // --- AUTOMATED MATERIAL RECONCILIATION LOGIC ---
  const reconciliationBalances = useMemo(() => {
    const balances: { [key: string]: { projectId: string; itemId: string; received: number; returned: number; balance: number } } = {};

    // 1. Inward Receipts (from clients, using materialIssues)
    materialIssues.forEach(m => {
      const key = `${m.projectId}_${m.itemId}`;
      if (!balances[key]) balances[key] = { projectId: m.projectId, itemId: m.itemId, received: 0, returned: 0, balance: 0 };
      balances[key].received += Number(m.qty || 0);
    });

    // 2. Outward Returns (to clients, using materialReturns)
    materialReturns.forEach(r => {
      const key = `${r.projectId}_${r.itemId}`;
      if (!balances[key]) balances[key] = { projectId: r.projectId, itemId: r.itemId, received: 0, returned: 0, balance: 0 };
      balances[key].returned += Number(r.qty || 0);
    });

    // Compute Net Balance (Received - Returned)
    return Object.values(balances).map(b => ({
      ...b,
      balance: Math.max(0, b.received - b.returned)
    }));
  }, [materialIssues, materialReturns]);

  // Overall Global Item-wise reconciliation summary
  const itemWiseSummary = useMemo(() => {
    const summary: { [itemId: string]: { itemId: string; received: number; returned: number; balance: number } } = {};
    reconciliationBalances.forEach(b => {
      if (!summary[b.itemId]) summary[b.itemId] = { itemId: b.itemId, received: 0, returned: 0, balance: 0 };
      summary[b.itemId].received += b.received;
      summary[b.itemId].returned += b.returned;
      summary[b.itemId].balance += b.balance;
    });
    return Object.values(summary);
  }, [reconciliationBalances]);

  // --- KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    const totalReceiptsQty = materialIssues.reduce((sum, r) => sum + Number(r.qty || 0), 0);
    const totalReturnsQty = materialReturns.reduce((sum, r) => sum + Number(r.qty || 0), 0);
    const totalBalanceQty = Math.max(0, totalReceiptsQty - totalReturnsQty);
    const totalTransferCount = materialTransfers.length;
    const totalLossQty = materialLosses.reduce((sum, l) => sum + Number(l.qty || 0), 0);
    
    // Company Purchases total (Grand Expense)
    const companyPurchasesTotal = materialPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    // Equipment purchase cost
    const equipmentCostTotal = assets.reduce((sum, a) => sum + Number(a.purchaseCost || 0), 0);

    // Outstanding supplier totals
    const supplierPurchasesMap: { [supplier: string]: number } = {};
    materialPurchases.forEach(p => {
      supplierPurchasesMap[p.supplierName] = (supplierPurchasesMap[p.supplierName] || 0) + Number(p.totalAmount || 0);
    });
    const supplierPaymentsMap: { [supplier: string]: number } = {};
    supplierPayments.forEach(pay => {
      supplierPaymentsMap[pay.supplierName] = (supplierPaymentsMap[pay.supplierName] || 0) + Number(pay.amountPaid || 0);
    });
    
    let totalOutstanding = 0;
    const allSuppliers = Array.from(new Set([...Object.keys(supplierPurchasesMap), ...Object.keys(supplierPaymentsMap)]));
    allSuppliers.forEach(supplier => {
      const pur = supplierPurchasesMap[supplier] || 0;
      const pay = supplierPaymentsMap[supplier] || 0;
      totalOutstanding += Math.max(0, pur - pay);
    });

    return {
      totalReceiptsQty,
      totalReturnsQty,
      totalBalanceQty,
      totalTransferCount,
      totalLossQty,
      companyPurchasesTotal,
      equipmentCostTotal,
      totalOutstanding
    };
  }, [materialIssues, materialReturns, materialTransfers, materialLosses, materialPurchases, supplierPayments, assets]);

  // Generator Helpers for Unique IDs
  const getNextVoucherNo = (type: 'REC' | 'RET' | 'PUR') => {
    const year = new Date().getFullYear();
    const count = type === 'REC' ? materialIssues.length : type === 'RET' ? materialReturns.length : materialPurchases.length;
    return `${type}-${year}-${String(count + 1).padStart(4, '0')}`;
  };

  // --- COMPACT ROW EDIT TRIGGERS & SAVERS ---
  const saveEntry = (type: 'master' | 'receipt' | 'return' | 'transfer' | 'loss' | 'purchase' | 'equipment' | 'payment') => {
    const creator = user?.name || user?.username || 'Admin';
    const todayStr = new Date().toISOString().substring(0, 10);

    const executeActualSave = (bypassCheck: boolean = false, overrideReason: string = '') => {
      if (type === 'master') {
        if (editTargetId === 'new') {
          addMaterialItem(masterForm);
        } else if (editTargetId) {
          updateMaterialItem(editTargetId, masterForm);
        }
      } 
      else if (type === 'receipt') {
        if (editTargetId === 'new') {
          const vNo = receiptForm.voucherNo || getNextVoucherNo('REC');
          let savedCount = 0;
          for (const item of receiptLineItems) {
            if (item.itemId && item.qty > 0) {
              const dataToSave = { 
                ...receiptForm, 
                voucherNo: vNo, 
                itemId: item.itemId, 
                qty: item.qty, 
                tower: item.tower, 
                floor: item.floor, 
                remarks: item.remarks 
              };
              addMaterialIssue(dataToSave as any);
              savedCount++;
            }
          }
        } else if (editTargetId) {
          const dataToSave = { ...receiptForm, voucherNo: receiptForm.voucherNo || getNextVoucherNo('REC') };
          updateMaterialIssue(editTargetId, dataToSave as any);
        }
        if (bypassCheck && overrideReason) {
          addOverrideLog(
            creator,
            'Client Material Receipt',
            `Voucher: ${receiptForm.voucherNo || 'Auto'}, Multiple Items`,
            overrideReason
          );
        }
      } 
      else if (type === 'return') {
        const dataToSave = { ...returnForm, condition: 'Good' as any, voucherNo: returnForm.voucherNo || getNextVoucherNo('RET') };
        if (editTargetId === 'new') {
          addMaterialReturn(dataToSave as any);
        } else if (editTargetId) {
          updateMaterialReturn(editTargetId, dataToSave as any);
        }
        if (bypassCheck && overrideReason) {
          addOverrideLog(
            creator,
            'Client Material Return',
            `Voucher: ${dataToSave.voucherNo}, Date: ${dataToSave.returnDate}, Qty: ${dataToSave.qty}`,
            overrideReason
          );
        }
      } 
      else if (type === 'transfer') {
        const list = [...materialTransfers];
        if (editTargetId === 'new') {
          list.push({ ...transferForm, id: crypto.randomUUID(), createdBy: creator, createdDate: todayStr });
        } else if (editTargetId) {
          const index = list.findIndex(t => t.id === editTargetId);
          if (index > -1) list[index] = { ...list[index], ...transferForm };
        }
        setMaterialTransfers(list);
      } 
      else if (type === 'loss') {
        const list = [...materialLosses];
        if (editTargetId === 'new') {
          list.push({ ...lossForm, id: crypto.randomUUID(), createdBy: creator, createdDate: todayStr });
        } else if (editTargetId) {
          const index = list.findIndex(l => l.id === editTargetId);
          if (index > -1) list[index] = { ...list[index], ...lossForm };
        }
        setMaterialLosses(list);
      } 
      else if (type === 'purchase') {
        const totalAmount = Number(purchaseForm.qty) * Number(purchaseForm.rate);
        const dataToSave = {
          ...purchaseForm,
          totalAmount,
          grandTotal: totalAmount,
          invoiceDate: purchaseForm.purchaseDate,
          purchaseVoucherNo: purchaseForm.invoiceNumber || getNextVoucherNo('PUR'),
          supplierMobile: '-',
          transportCharges: 0,
          loadingCharges: 0,
          otherCharges: 0
        };
        if (editTargetId === 'new') {
          addMaterialPurchase(dataToSave);
        } else if (editTargetId) {
          updateMaterialPurchase(editTargetId, dataToSave);
        }
        if (bypassCheck && overrideReason) {
          addOverrideLog(
            creator,
            'Material Purchase',
            `Invoice: ${dataToSave.invoiceNumber}, Supplier: ${dataToSave.supplierName}, Date: ${dataToSave.purchaseDate}`,
            overrideReason
          );
        }
      } 
      else if (type === 'equipment') {
        const dataToSave = {
          ...equipmentForm,
          category: 'Other' as any, // standard equipment mapping
          brand: equipmentForm.brand || 'Consolidated',
          purchaseCost: Number(equipmentForm.purchaseCost),
          createdDate: todayStr,
          createdBy: creator
        };
        if (editTargetId === 'new') {
          addAsset(dataToSave as any);
        } else if (editTargetId) {
          updateAsset(editTargetId, dataToSave as any);
        }
      } 
      else if (type === 'payment') {
        const list = [...supplierPayments];
        if (editTargetId === 'new') {
          list.push({ ...paymentForm, id: crypto.randomUUID() });
        } else if (editTargetId) {
          const index = list.findIndex(p => p.id === editTargetId);
          if (index > -1) list[index] = { ...list[index], ...paymentForm };
        }
        setSupplierPayments(list);
        if (bypassCheck && overrideReason) {
          addOverrideLog(
            creator,
            'Supplier Payment',
            `Ref: ${paymentForm.invoiceReference}, Supplier: ${paymentForm.supplierName}, Amount Paid: Rs ${paymentForm.amountPaid.toLocaleString()}`,
            overrideReason
          );
        }
      }
      setEditTargetId(null);
    };

    if (type === 'master') {
      if (!masterForm.itemName) return alert('Material Item Name is mandatory.');
    } 
    else if (type === 'receipt') {
      if (editTargetId === 'new') {
        if (!receiptForm.projectId) return alert('Site is mandatory.');
        const validItems = receiptLineItems.filter(i => i.itemId && i.qty > 0);
        if (validItems.length === 0) return alert('At least one Material Item and Quantity is mandatory.');
      } else {
        if (!receiptForm.projectId || !receiptForm.itemId || !receiptForm.qty) return alert('Site, Item, and Quantity are mandatory.');
      }
      
      const vNoToCheck = receiptForm.voucherNo || getNextVoucherNo('REC');
      
      const countMatches = editTargetId === 'new' ? [] : checkMaterialIssueDuplicate(
        materialIssues,
        {
          voucherNo: vNoToCheck,
          issueDate: receiptForm.issueDate,
          projectId: receiptForm.projectId,
          itemId: receiptForm.itemId
        },
        editTargetId || undefined
      );

      if (countMatches.length > 0) {
        setDupModuleTitle('Client Material Receipt');
        setDupWarningText('Warning: A duplicate receipt record with the exact same Date, Site, Item and Voucher Number exists.');
        setDupData(countMatches);
        setPendingSaveFn(() => (reason?: string) => executeActualSave(true, reason || 'No details'));
        setDupModalOpen(true);
        return;
      }
    } 
    else if (type === 'return') {
      if (!returnForm.projectId || !returnForm.itemId || !returnForm.qty) return alert('Site, Item, and Quantity are mandatory.');
      const dataToSave = { ...returnForm, condition: 'Good' as any, voucherNo: returnForm.voucherNo || getNextVoucherNo('RET') };
      
      const countMatches = checkMaterialReturnDuplicate(
        materialReturns,
        {
          voucherNo: dataToSave.voucherNo,
          returnDate: dataToSave.returnDate,
          projectId: dataToSave.projectId,
          itemId: dataToSave.itemId
        },
        editTargetId === 'new' ? undefined : editTargetId || undefined
      );

      if (countMatches.length > 0) {
        setDupModuleTitle('Client Material Return');
        setDupWarningText('Warning: A duplicate return record with the exact same Date, Site, Item and Voucher Number exists.');
        setDupData(countMatches);
        setPendingSaveFn(() => (reason?: string) => executeActualSave(true, reason || 'No details'));
        setDupModalOpen(true);
        return;
      }
    } 
    else if (type === 'transfer') {
      if (!transferForm.fromProjectId || !transferForm.toProjectId || !transferForm.itemId || !transferForm.qty) return alert('Items, From Site, To Site and Quantity are mandatory.');
      if (transferForm.fromProjectId === transferForm.toProjectId) return alert('Source and Destination sites must be different.');
    } 
    else if (type === 'loss') {
      if (!lossForm.projectId || !lossForm.itemId || !lossForm.qty || !lossForm.reason) return alert('Site, Item, Quantity and Reason are mandatory.');
    } 
    else if (type === 'purchase') {
      if (!purchaseForm.supplierName || !purchaseForm.projectId || !purchaseForm.itemId || !purchaseForm.qty || !purchaseForm.rate) return alert('Missing required Corporate invoice fields.');
      
      const countMatches = checkMaterialPurchaseDuplicate(
        materialPurchases,
        {
          invoiceNumber: purchaseForm.invoiceNumber,
          supplierName: purchaseForm.supplierName,
          purchaseDate: purchaseForm.purchaseDate
        },
        editTargetId === 'new' ? undefined : editTargetId || undefined
      );

      if (countMatches.length > 0) {
        setDupModuleTitle('Material Purchase');
        setDupWarningText('Warning: A raw invoice purchase already exists with this Supplier Name, Invoice Number and Date.');
        setDupData(countMatches);
        setPendingSaveFn(() => (reason?: string) => executeActualSave(true, reason || 'No details'));
        setDupModalOpen(true);
        return;
      }
    } 
    else if (type === 'equipment') {
      if (!equipmentForm.name || !equipmentForm.assetCode || !equipmentForm.purchaseCost || !equipmentForm.currentSiteId) return alert('Asset name, code, cost, and allocation site are mandatory.');
    } 
    else if (type === 'payment') {
      if (!paymentForm.supplierName || !paymentForm.amountPaid || !paymentForm.paymentDate) return alert('Supplier name, payment amount and date are mandatory.');
      
      const countMatches = checkSupplierPaymentDuplicate(
        supplierPayments as any,
        {
          invoiceReference: paymentForm.invoiceReference || '',
          supplierName: paymentForm.supplierName,
          amountPaid: Number(paymentForm.amountPaid),
          paymentDate: paymentForm.paymentDate
        },
        editTargetId === 'new' ? undefined : editTargetId || undefined
      );

      if (countMatches.length > 0) {
        setDupModuleTitle('Supplier Payment');
        setDupWarningText('Warning: A payment reference for this supplier with the same Amount, Date and Invoice Reference already exists.');
        setDupData(countMatches);
        setPendingSaveFn(() => (reason?: string) => executeActualSave(true, reason || 'No details'));
        setDupModalOpen(true);
        return;
      }
    }

    executeActualSave();
  };

  // Delete Action safety wrapper
  const removeRecord = (type: 'master' | 'receipt' | 'return' | 'transfer' | 'loss' | 'purchase' | 'equipment' | 'payment', id: string) => {
    if (type === 'master') {
      if (!canDeleteMasterItem(id)) {
        return alert("Operational Security: This material master item possesses active transactions in your historical logs (Receipts, Returns, Transfers, Losses, or Company Purchases) and cannot be deleted.");
      }
      if (confirm("Delete this master item?")) deleteMaterialItem(id);
    } else if (type === 'receipt') {
      if (confirm("Delete this receipt registration?")) deleteMaterialIssue(id);
    } else if (type === 'return') {
      if (confirm("Delete this return record?")) deleteMaterialReturn(id);
    } else if (type === 'transfer') {
      if (confirm("Delete this transfer entry?")) setMaterialTransfers(prev => prev.filter(t => t.id !== id));
    } else if (type === 'loss') {
      if (confirm("Delete this loss/damage record?")) setMaterialLosses(prev => prev.filter(l => l.id !== id));
    } else if (type === 'purchase') {
      if (confirm("Delete this company purchase invoice?")) deleteMaterialPurchase(id);
    } else if (type === 'equipment') {
      if (confirm("Delete this company asset permanently?")) deleteAsset(id);
    } else if (type === 'payment') {
      if (confirm("Delete this payment record?")) setSupplierPayments(prev => prev.filter(p => p.id !== id));
    }
  };

  // --- MASTER REPORT EXPORT SUITE ---
  const triggerPDFReport = (reportType: string) => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'Client Material Receipt Report') {
      headers = ['Challan No', 'Date', 'Project Site', 'Item Description', 'Qty Received', 'UoM', 'Issued by', 'Remarks'];
      rows = materialIssues.map(m => [
        m.voucherNo, m.issueDate, getProjectName(m.projectId), getItemName(m.itemId), m.qty, getItemUnit(m.itemId), m.issuedTo, m.remarks || '-'
      ]);
    } 
    else if (reportType === 'Client Material Receipt (Date-wise)') {
      headers = ['Date', 'Item Description', 'Project Site', 'Qty Received', 'UoM', 'Challan No'];
      const sorted = [...materialIssues].sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
      rows = sorted.map(m => [
        m.issueDate, getItemName(m.itemId), getProjectName(m.projectId), m.qty, getItemUnit(m.itemId), m.voucherNo
      ]);
    }
    else if (reportType === 'Item-wise Consolidated Balance') {
      headers = ['Material Item', 'Total Received', 'Total Returned', 'Net Balance', 'Unit'];
      const itemMap = new Map<string, { received: number, returned: number }>();
      materialIssues.forEach(i => {
        const d = itemMap.get(i.itemId) || { received: 0, returned: 0 };
        itemMap.set(i.itemId, { ...d, received: d.received + i.qty });
      });
      materialReturns.forEach(r => {
        const d = itemMap.get(r.itemId) || { received: 0, returned: 0 };
        itemMap.set(r.itemId, { ...d, returned: d.returned + r.qty });
      });
      rows = Array.from(itemMap.entries()).map(([k, v]) => [
        getItemName(k), v.received, v.returned, v.received - v.returned, getItemUnit(k)
      ]);
    }
    else if (reportType === 'Client Material Return Report') {
      headers = ['Challan No', 'Date', 'Project Site', 'Item Description', 'Qty Returned', 'UoM', 'Returned To', 'Remarks'];
      rows = materialReturns.map(m => [
        m.voucherNo, m.returnDate, getProjectName(m.projectId), getItemName(m.itemId), m.qty, getItemUnit(m.itemId), m.returnedBy, m.remarks || '-'
      ]);
    } 
    else if (reportType === 'Material Reconciliation Report') {
      headers = ['Project Site', 'Material Item', 'Received (Qty)', 'Returned (Qty)', 'Net Balance', 'Unit'];
      rows = reconciliationBalances.map(b => [
        getProjectName(b.projectId), getItemName(b.itemId), b.received, b.returned, b.balance, getItemUnit(b.itemId)
      ]);
    } 
    else if (reportType === 'Site-wise Material Balance Report') {
      headers = ['Project Site', 'Material Item', 'Received (Qty)', 'Returned (Qty)', 'Current Site Balance', 'Unit'];
      rows = reconciliationBalances
        .filter(b => filterProject === 'all' || b.projectId === filterProject)
        .map(b => [
          getProjectName(b.projectId), getItemName(b.itemId), b.received, b.returned, b.balance, getItemUnit(b.itemId)
        ]);
    } 
    else if (reportType === 'Material Transfer Report') {
      headers = ['Transfer Date', 'Material Item', 'Qty', 'Unit', 'From Project Site', 'To Project Site', 'Remarks'];
      rows = materialTransfers.map(t => [
        t.transferDate, getItemName(t.itemId), t.qty, getItemUnit(t.itemId), getProjectName(t.fromProjectId), getProjectName(t.toProjectId), t.remarks || '-'
      ]);
    } 
    else if (reportType === 'Loss & Damage Report') {
      headers = ['Loss Date', 'Project Site', 'Material Item', 'Qty Lost', 'Reason', 'Responsible Person', 'Recovery (INR)', 'Remarks'];
      rows = materialLosses.map(l => [
        l.date, getProjectName(l.projectId), getItemName(l.itemId), l.qty, l.reason, l.responsiblePerson, l.recoveryAmount ? `Rs ${l.recoveryAmount}` : '-', l.remarks || '-'
      ]);
    } 
    else if (reportType === 'Purchase Register') {
      headers = ['Purchase Date', 'Supplier Name', 'Invoice No', 'Project Site', 'Material Item', 'Qty', 'Rate', 'Total Amount'];
      rows = materialPurchases.map(p => [
        p.purchaseDate, p.supplierName, p.invoiceNumber || '-', getProjectName(p.projectId), getItemName(p.itemId), p.qty, `Rs ${p.rate}`, `Rs ${(p.qty * p.rate).toLocaleString()}`
      ]);
    } 
    else if (reportType === 'Equipment Purchase Report') {
      headers = ['Purchase Date', 'Asset Code', 'Asset Name', 'Supplier/Brand', 'Cost (INR)', 'Allocated Site', 'Status'];
      rows = assets.map(a => [
        a.purchaseDate, a.assetCode, a.name, a.brand, `Rs ${a.purchaseCost.toLocaleString()}`, getProjectName(a.currentSiteId), a.status
      ]);
    } 
    else if (reportType === 'Supplier Outstanding Statement') {
      headers = ['Supplier Name', 'Total Invoice Amount', 'Total Safe Payments', 'Current Outstanding'];
      // Compute outstanding on the fly
      const suppliers = Array.from(new Set([...materialPurchases.map(p => p.supplierName), ...supplierPayments.map(p => p.supplierName)]));
      rows = suppliers.map(sup => {
        const pur = materialPurchases.filter(p => p.supplierName === sup).reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
        const pay = supplierPayments.filter(p => p.supplierName === sup).reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        return [sup, `Rs ${pur.toLocaleString()}`, `Rs ${pay.toLocaleString()}`, `Rs ${Math.max(0, pur - pay).toLocaleString()}`];
      });
    }

    setMaterialsReportPreview({
      title: reportType,
      headers,
      data: rows
    });
  };

  // Specific supplier chronological log data source
  const activeSupplierLedgerData = useMemo(() => {
    if (!selectedLedgerSupplier) return [];
    
    const logs: any[] = [];
    materialPurchases
      .filter(p => p.supplierName === selectedLedgerSupplier)
      .forEach(p => {
        logs.push({
          date: p.purchaseDate,
          type: 'Invoice Bill',
          ref: p.invoiceNumber || p.purchaseVoucherNo,
          project: getProjectName(p.projectId),
          debit: p.totalAmount, // Purchase adds to what we owe (liability increases)
          credit: 0,
          details: `Purchased Item: ${getItemName(p.itemId)} (${p.qty} Qty @ Rs ${p.rate})`
        });
      });

    supplierPayments
      .filter(pay => pay.supplierName === selectedLedgerSupplier)
      .forEach(pay => {
        logs.push({
          date: pay.paymentDate,
          type: 'Cash/JV Payment',
          ref: pay.invoiceReference || 'PAY-REF',
          project: '-',
          debit: 0,
          credit: pay.amountPaid, // Payment reduces what we owe
          details: `Payment reference mode: ${pay.paymentMode} (${pay.remarks || 'No remarks'})`
        });
      });

    // Chronological order sorting
    logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    return logs.map(l => {
      // Outstanding balance accumulates purchase bills and decreases with clear payments
      balance += (l.debit - l.credit);
      return { ...l, runningOutstanding: balance };
    });
  }, [selectedLedgerSupplier, materialPurchases, supplierPayments]);

  return (
    <div className="h-full flex flex-col bg-[#e0ebf5]">
      {/* Top Professional SAP header */}
      <div className="bg-[#1a365d] text-white px-4 py-2 border-b border-[#0d233e] flex flex-wrap items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <Building2 size={24} className="text-blue-300" />
          <div>
            <h1 className="text-sm font-bold tracking-tight uppercase">Labour Contractor ERP</h1>
            <p className="text-[10px] text-blue-200">Material Transits, Client Reconciliations & Corporate Assets</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-1 sm:mt-0 text-[11px] bg-blue-900/40 px-2 py-0.5 border border-blue-700/50 rounded">
          <span className="font-semibold text-emerald-400">● SECURE SHELL</span>
          <span className="text-gray-300">|</span>
          <span className="font-mono text-gray-200">{user?.name || user?.username || 'Administrator'}</span>
        </div>
      </div>

      {/* Primary ERP Navigation Toolbar */}
      <div className="bg-[#f0f4f8] flex flex-wrap border-b border-[#cbd5e1] overflow-x-auto text-[11px]">
        {[
          { tab: 'dashboard', icon: <TrendingUp size={12} />, label: 'Dashboard ERP' },
          { tab: 'master', icon: <Grid size={12} />, label: 'Material Catalog' },
          { tab: 'receipt', icon: <Plus size={12} />, label: 'Client Receipts' },
          { tab: 'return', icon: <RotateCcw size={12} />, label: 'Client Returns' },
          { tab: 'reconciliation', icon: <FileSpreadsheet size={12} />, label: 'Reconciliations' },
          { tab: 'transfer', icon: <ArrowLeftRight size={12} />, label: 'Site Transfers' },
          { tab: 'loss_damage', icon: <AlertTriangle size={12} />, label: 'Loss & Damage' },
          { tab: 'company_purchase', icon: <ShoppingCart size={12} />, label: 'Company Purchases' },
          { tab: 'equipment', icon: <Wrench size={12} />, label: 'Equipment & Machinery' },
          { tab: 'supplier_ledger', icon: <DollarSign size={12} />, label: 'Supplier Ledger' },
          { tab: 'reports', icon: <Printer size={12} />, label: 'ERP Reports Console' }
        ].map(item => (
          <button
            key={item.tab}
            onClick={() => { setActiveTab(item.tab as any); setEditTargetId(null); }}
            className={`px-3 py-2 border-r border-[#cbd5e1] font-bold flex items-center gap-1 cursor-pointer transition ${activeTab === item.tab ? 'text-[#1a365d] bg-white border-b-2 border-b-[#1a365d]' : 'text-gray-600 hover:text-black hover:bg-slate-100'}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* =========================================================================
            1. KEY DASHBOARD PANELS
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Real-time KPI Card Deck */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Client Mat Received</span>
                  <div className="text-xl font-extrabold text-blue-900">{kpis.totalReceiptsQty.toLocaleString()} Qty</div>
                </div>
                <div className="p-2 bg-blue-50 text-blue-700 rounded"><Plus size={20} /></div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Client Mat Returned</span>
                  <div className="text-xl font-extrabold text-[#7c3aed]">{kpis.totalReturnsQty.toLocaleString()} Qty</div>
                </div>
                <div className="p-2 bg-purple-50 text-purple-700 rounded"><RotateCcw size={20} /></div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Net Stock Balance</span>
                  <div className="text-xl font-extrabold text-emerald-800">{kpis.totalBalanceQty.toLocaleString()} Qty</div>
                  <span className="text-[8px] text-gray-400">Available client assets</span>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded"><FileSpreadsheet size={20} /></div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Site Transfers</span>
                  <div className="text-xl font-extrabold text-indigo-800">{kpis.totalTransferCount} Transits</div>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded"><ArrowLeftRight size={20} /></div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Registered Loss/Damaged</span>
                  <div className="text-xl font-extrabold text-red-700">{kpis.totalLossQty} Qty</div>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded"><AlertTriangle size={20} /></div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Company Purchases</span>
                  <div className="text-xl font-extrabold text-sky-800">₹{kpis.companyPurchasesTotal.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-2 bg-sky-50 text-sky-700 rounded"><ShoppingCart size={20} /></div>
              </div>

              <div className="bg-[#FAF9F6] p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Corporate Asset Investment</span>
                  <div className="text-xl font-extrabold text-amber-800">₹{kpis.equipmentCostTotal.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-2 bg-amber-50 text-amber-700 rounded"><Wrench size={20} /></div>
              </div>

              <div className="bg-white p-3 border border-red-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-red-500 uppercase font-bold tracking-wide">Supplier Outstanding Balance</span>
                  <div className="text-xl font-extrabold text-red-900">₹{kpis.totalOutstanding.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-2 bg-red-100 text-red-800 rounded"><DollarSign size={20} /></div>
              </div>
            </div>

            {/* Overall Live Reconciliation Balancing Statements inside Dashboard */}
            <div className="bg-white border border-[#b2c0cc] rounded-xs shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] font-bold text-slate-800 flex justify-between items-center text-xs">
                <span>Site-wise Active Client Material Balances Summary</span>
                <span className="text-[10px] text-gray-500 lowercase italic">Calculated live: receipts - returns</span>
              </div>
              <div className="p-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 uppercase text-[9px] border-b border-gray-300">
                      <th className="py-2 px-3">Project Site</th>
                      <th className="py-2 px-3">Material Item</th>
                      <th className="py-2 px-3 text-right">Inward Receipts</th>
                      <th className="py-2 px-3 text-right">Outward Returns</th>
                      <th className="py-2 px-3 text-right">Net Material Balance</th>
                      <th className="py-2 px-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reconciliationBalances.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-gray-800">{getProjectName(item.projectId)}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{getItemName(item.itemId)}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-700">{item.received}</td>
                        <td className="py-2 px-3 text-right font-mono text-purple-700">{item.returned}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">{item.balance}</td>
                        <td className="py-2 px-3 text-gray-500">{getItemUnit(item.itemId)}</td>
                      </tr>
                    ))}
                    {reconciliationBalances.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-400 font-medium">
                          No active client receipts or returns logged to populate the balance matrix.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Returnable Materials Issue & Return Tracking Registry */}
            <div className="bg-white border border-[#b2c0cc] rounded-xs shadow-xs animate-fade-in">
              <div className="bg-purple-50 px-3 py-2 border-b border-[#cbd5e1] font-bold text-purple-950 flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 font-sans font-extrabold text-purple-950">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                  Returnable Materials - Issue & Return Track Ledger
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-purple-700 bg-purple-100 font-bold px-2 py-0.5 rounded uppercase font-sans">Type: Returnable Only</span>
                  <button 
                    onClick={() => handleQuickLogReturnable('Issue', '', '')} 
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-3 py-1 rounded text-[10px] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus size={11} /> Quick Log Issue/Return
                  </button>
                </div>
              </div>
              <div className="p-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-100/40 text-purple-950 uppercase text-[9px] border-b border-purple-200">
                      <th className="py-2 px-3">Project Site</th>
                      <th className="py-2 px-3">Returnable Item Code & Name</th>
                      <th className="py-2 px-3 text-right">Inward Issued (Receipts)</th>
                      <th className="py-2 px-3 text-right">Outward Returned</th>
                      <th className="py-2 px-3 text-right font-extrabold text-purple-900 bg-purple-100/30">Outstanding Balance On-Site</th>
                      <th className="py-2 px-3 flex-none w-16">Unit</th>
                      <th className="py-2 px-3 text-center">Reconciliation Status</th>
                      <th className="py-2 px-3 text-center">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {reconciliationBalances
                      .filter(b => {
                        const itemObj = materialItems.find(mi => mi.id === b.itemId);
                        return itemObj?.materialType === 'Returnable';
                      })
                      .map((item, idx) => {
                        const itemObj = materialItems.find(mi => mi.id === item.itemId);
                        return (
                          <tr key={idx} className="hover:bg-purple-50/20">
                            <td className="py-2.5 px-3 font-semibold text-gray-800">{getProjectName(item.projectId)}</td>
                            <td className="py-2.5 px-3 font-bold text-purple-950">
                              <span className="text-gray-400 font-mono text-[10px] mr-1.5">[{itemObj?.itemCode}]</span>
                              {itemObj?.itemName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-purple-800 font-bold">{item.received}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-bold">{item.returned}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 bg-purple-50/50">{item.balance}</td>
                            <td className="py-2.5 px-3 text-gray-500 font-mono text-[10px]">{getItemUnit(item.itemId)}</td>
                            <td className="py-1 px-3 text-center">
                              {item.balance === 0 ? (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-105 text-emerald-800 border border-emerald-300 font-sans font-black uppercase tracking-wider">Fully Returned</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-amber-105 text-amber-800 border border-amber-300 font-sans font-black uppercase tracking-wider">Outstanding ({item.balance})</span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => handleQuickLogReturnable('Issue', item.projectId, item.itemId)}
                                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-[4px] text-[10px] font-bold shadow-sm flex items-center gap-0.5 cursor-pointer"
                                  title="Log Returnable Material Issue"
                                >
                                  <Plus size={10} /> Issue
                                </button>
                                <button 
                                  onClick={() => handleQuickLogReturnable('Return', item.projectId, item.itemId)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[4px] text-[10px] font-bold shadow-sm flex items-center gap-0.5 cursor-pointer"
                                  title="Log Returnable Material Return"
                                >
                                  <RotateCcw size={10} /> Return
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {reconciliationBalances.filter(b => {
                      const itemObj = materialItems.find(mi => mi.id === b.itemId);
                      return itemObj?.materialType === 'Returnable';
                    }).length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-400 font-medium">
                          No active returnable material issues or returns have been logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            2. MASTER MATERIAL MASTER CATALOG
            ========================================================================= */}
        {activeTab === 'master' && (
          <div className="space-y-4">
            {editTargetId && (
              <div className="bg-white border border-[#b2c0cc] p-4 rounded shadow-xs space-y-3">
                <h3 className="font-semibold text-[#1a365d] border-b pb-1 text-xs">
                  {editTargetId === 'new' ? 'Add New Item to Master Catalog' : 'Modify Item Details'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Item Code (ID) *</label>
                    <input type="text" placeholder="Item Code" className="w-full p-2 border rounded bg-[#fcfdfe]" value={masterForm.itemCode} onChange={e => setMasterForm({ ...masterForm, itemCode: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Material Item Name *</label>
                    <input type="text" placeholder="Material Item Name" className="w-full p-2 border rounded" value={masterForm.itemName} onChange={e => setMasterForm({ ...masterForm, itemName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Item Category *</label>
                    <select className="w-full p-2 border rounded bg-white" value={masterForm.category} onChange={e => setMasterForm({ ...masterForm, category: e.target.value })}>
                      {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Material Type *</label>
                    <select className="w-full p-2 border rounded bg-white" value={masterForm.materialType} onChange={e => setMasterForm({ ...masterForm, materialType: e.target.value as 'Consumable' | 'Returnable' })}>
                      <option value="Consumable">Consumable</option>
                      <option value="Returnable">Returnable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Unit of Measure *</label>
                    <select className="w-full p-2 border rounded bg-white" value={masterForm.unit} onChange={e => setMasterForm({ ...masterForm, unit: e.target.value })}>
                      {ITEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="text-xs">
                  <label className="block text-gray-700 font-bold mb-1 font-mono">Remarks / Technical Specifications</label>
                  <input type="text" placeholder="..." className="w-full p-2 border rounded" value={masterForm.description} onChange={e => setMasterForm({ ...masterForm, description: e.target.value })} />
                </div>
                <div className="flex justify-end space-x-2 text-xs pt-2">
                  <button onClick={() => setEditTargetId(null)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border rounded">Cancel</button>
                  <button onClick={() => saveEntry('master')} className="px-3 py-1.5 bg-[#1a365d] text-white hover:bg-slate-800 rounded">Save Material specifications</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-800">Master Material Specifications List</span>
                {!editTargetId && (
                  <div className="flex items-center space-x-2">
                    <button onClick={() => { setMasterForm({ itemCode: '', itemName: '', category: 'Civil', materialType: 'Consumable', unit: 'Bag', description: '' }); setEditTargetId('new'); }} className="bg-sky-700 text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-sky-800 transition flex items-center gap-1">
                      <Plus size={11} /> Append Material Item specifications
                    </button>
                    <button onClick={() => setIsBulkUploadOpen(true)} className="bg-[#2ea043] text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-[#238334] transition flex items-center gap-1">
                      <Upload size={11} /> Bulk Upload
                    </button>
                  </div>
                )}
              </div>
              <div className="p-3 border-b border-gray-200">
                <div className="relative max-w-md text-xs">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input type="text" placeholder="Search catalog by material name or code..." className="pl-9 pr-3 py-2 border rounded w-full" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px] tracking-wider">
                    <th className="py-2 px-3">Item Code</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3">Assigned Category</th>
                    <th className="py-2 px-3">Material Type</th>
                    <th className="py-2 px-3">Standard UoM</th>
                    <th className="py-2 px-3">Specifications/Remarks</th>
                    <th className="py-2 px-3 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence mode="popLayout">
                    {materialItems
                      .filter(i => i.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || (i.itemCode || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(item => (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          key={item.id} 
                          className="hover:bg-slate-50/50"
                        >
                          <td className="py-2 px-3 font-mono font-semibold text-blue-700">{item.itemCode || '-'}</td>
                          <td className="py-2 px-3 font-bold text-gray-900">{item.itemName}</td>
                          <td className="py-2 px-3 text-gray-600">{item.category}</td>
                          <td className="py-2 px-3">
                            <AnimateBadge 
                              status={item.materialType || 'Consumable'}
                              className={item.materialType === 'Returnable' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800'}
                            >
                              {item.materialType || 'Consumable'}
                            </AnimateBadge>
                          </td>
                          <td className="py-2 px-3 font-mono text-gray-500">{item.unit}</td>
                          <td className="py-2 px-3 text-gray-400 italic">{item.description || '-'}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-center items-center space-x-2">
                              <button onClick={() => { setMasterForm({ itemCode: item.itemCode || '', itemName: item.itemName, category: item.category, materialType: item.materialType || 'Consumable', unit: item.unit, description: item.description || '' }); setEditTargetId(item.id); }} className="text-slate-600 hover:text-blue-700"><Edit size={13} /></button>
                              <button onClick={() => removeRecord('master', item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. CLIENT MATERIAL RECEIPTS
            ========================================================================= */}
        {activeTab === 'receipt' && (
          <div className="space-y-4">
            {editTargetId && (
              <div className="bg-white border border-[#b2c0cc] p-4 shadow-xs space-y-3 rounded">
                <h3 className="font-semibold text-xs text-[#1a365d] border-b pb-1">Register Client Supplied Influx Goods</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Receipt Date *</label>
                    <input type="date" className="w-full p-2 border rounded" value={receiptForm.issueDate} onChange={e => setReceiptForm({ ...receiptForm, issueDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Allocated Project Site *</label>
                    <select className="w-full p-2 border rounded bg-white" value={receiptForm.projectId} onChange={e => setReceiptForm({ ...receiptForm, projectId: e.target.value })}>
                      <option value="">-- Choose Project --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Issued by *</label>
                    <input type="text" placeholder="Staff Name" className="w-full p-2 border rounded" value={receiptForm.issuedTo} onChange={e => setReceiptForm({ ...receiptForm, issuedTo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Client Delivery Challan (Voucher No) *</label>
                    <input type="text" placeholder="Voucher Number" className="w-full p-2 border rounded font-mono" value={receiptForm.voucherNo} onChange={e => setReceiptForm({ ...receiptForm, voucherNo: e.target.value })} />
                  </div>
                </div>

                {editTargetId === 'new' ? (
                  <div className="mt-4 border border-blue-200 bg-blue-50/30 p-2 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-xs text-[#0056b3]">Line Items</h4>
                      <button onClick={() => setReceiptLineItems([...receiptLineItems, { id: Math.random(), itemId: '', qty: 0, tower: '', floor: '', remarks: '' }])} className="text-[10px] bg-[#0056b3] text-white px-2 py-1 rounded hover:bg-blue-800 flex items-center">
                        <Plus size={10} className="mr-1" /> Add Line
                      </button>
                    </div>
                    {receiptLineItems.map((line, index) => (
                      <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs mb-2 items-start border-b border-blue-100 pb-2">
                        <div className="col-span-3">
                          <select className="w-full p-1.5 border rounded bg-white" value={line.itemId} onChange={e => {
                            const newLines = [...receiptLineItems];
                            newLines[index].itemId = e.target.value;
                            setReceiptLineItems(newLines);
                          }}>
                            <option value="">-- Choose item --</option>
                            {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input type="number" min="0" placeholder="Qty" className="w-full p-1.5 border rounded" value={line.qty || ''} onChange={e => {
                            const newLines = [...receiptLineItems];
                            newLines[index].qty = Number(e.target.value);
                            setReceiptLineItems(newLines);
                          }} />
                        </div>
                        <div className="col-span-2">
                          <input type="text" placeholder="Tower (Opt)" className="w-full p-1.5 border rounded" value={line.tower} onChange={e => {
                            const newLines = [...receiptLineItems];
                            newLines[index].tower = e.target.value;
                            setReceiptLineItems(newLines);
                          }} />
                        </div>
                        <div className="col-span-2">
                          <input type="text" placeholder="Floor (Opt)" className="w-full p-1.5 border rounded" value={line.floor} onChange={e => {
                            const newLines = [...receiptLineItems];
                            newLines[index].floor = e.target.value;
                            setReceiptLineItems(newLines);
                          }} />
                        </div>
                        <div className="col-span-2">
                          <input type="text" placeholder="Remarks" className="w-full p-1.5 border rounded" value={line.remarks} onChange={e => {
                            const newLines = [...receiptLineItems];
                            newLines[index].remarks = e.target.value;
                            setReceiptLineItems(newLines);
                          }} />
                        </div>
                        <div className="col-span-1 pt-1 text-center">
                          <button onClick={() => {
                            if (receiptLineItems.length > 1) {
                              setReceiptLineItems(receiptLineItems.filter((_, i) => i !== index));
                            }
                          }} className="text-red-500 hover:text-red-700">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mt-2 border-t pt-2">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Material Item Specification *</label>
                      <select className="w-full p-2 border rounded bg-white" value={receiptForm.itemId} onChange={e => setReceiptForm({ ...receiptForm, itemId: e.target.value })}>
                        <option value="">-- Choose item --</option>
                        {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Quantity Received *</label>
                      <input type="number" min="0" className="w-full p-2 border rounded" value={receiptForm.qty} onChange={e => setReceiptForm({ ...receiptForm, qty: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Tower (Optional)</label>
                      <input type="text" placeholder="Tower" className="w-full p-2 border rounded" value={receiptForm.tower} onChange={e => setReceiptForm({ ...receiptForm, tower: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Floor (Optional)</label>
                      <input type="text" placeholder="Floor" className="w-full p-2 border rounded" value={receiptForm.floor} onChange={e => setReceiptForm({ ...receiptForm, floor: e.target.value })} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-gray-700 font-bold mb-1">Remarks</label>
                      <input type="text" placeholder="Type comments..." className="w-full p-2 border rounded" value={receiptForm.remarks} onChange={e => setReceiptForm({ ...receiptForm, remarks: e.target.value })} />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 text-xs pt-2">
                  <button onClick={() => setEditTargetId(null)} className="px-3 py-1.5 bg-gray-100 border hover:bg-gray-200 rounded">Cancel</button>
                  <button onClick={() => saveEntry('receipt')} className="px-3 py-1.5 bg-[#1a365d] text-white hover:bg-slate-800 rounded">Save Receipt Entry</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-800">Historical Log of Client-Supplied Material Receipts</span>
                {!editTargetId && (
                  <button onClick={() => { setReceiptForm({ voucherNo: '', issueDate: new Date().toISOString().split('T')[0], projectId: '', tower: '', floor: '', itemId: '', qty: 0, issuedTo: '', remarks: '' }); setReceiptLineItems([{ id: Math.random(), itemId: '', qty: 0, tower: '', floor: '', remarks: '' }]); setEditTargetId('new'); }} className="bg-sky-700 text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-sky-800">
                    <Plus size={11} className="inline mr-1" /> Register Influx Material
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px]">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Challan / Voucher</th>
                    <th className="py-2 px-3">Project Site</th>
                    <th className="py-2 px-3">Location Target</th>
                    <th className="py-2 px-3">Material Name</th>
                    <th className="py-2 px-3 text-right">Qty Received</th>
                    <th className="py-2 px-3 font-semibold">Unit</th>
                    <th className="py-2 px-3">Issued by</th>
                    <th className="py-2 px-3">Audit Stamp</th>
                    <th className="py-2 px-3 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materialIssues.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-gray-600">{row.issueDate}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{row.voucherNo}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800">{getProjectName(row.projectId)}</td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-[10px]">{row.tower || row.floor ? `${row.tower || ''} ${row.floor ? `(F: ${row.floor})` : ''}` : '-'}</td>
                      <td className="py-2 px-3 font-bold text-gray-900">{getItemName(row.itemId)}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-blue-800">{row.qty}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono text-[10px]">{getItemUnit(row.itemId)}</td>
                      <td className="py-2 px-3 text-gray-600 font-medium">{row.issuedTo}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono text-[9px] uppercase">
                        By {row.createdBy || 'System'} at {row.createdDate || '-'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center items-center space-x-2">
                          <button onClick={() => { setReceiptForm({ voucherNo: row.voucherNo, issueDate: row.issueDate, projectId: row.projectId, tower: row.tower || '', floor: row.floor || '', itemId: row.itemId, qty: row.qty, issuedTo: row.issuedTo, remarks: row.remarks || '' }); setEditTargetId(row.id); }} className="text-slate-600 hover:text-blue-700"><Edit size={13} /></button>
                          <button onClick={() => removeRecord('receipt', row.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materialIssues.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400 font-semibold uppercase text-[10px]">No active materials registered as received yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. CLIENT MATERIAL RETURNS
            ========================================================================= */}
        {activeTab === 'return' && (
          <div className="space-y-4">
            {editTargetId && (
              <div className="bg-white border border-[#b2c0cc] p-4 shadow-xs space-y-3 rounded">
                <h3 className="font-semibold text-xs text-[#1a365d] border-b pb-1">Register Client Goods Return Dispatch</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Return Date *</label>
                    <input type="date" className="w-full p-2 border rounded" value={returnForm.returnDate} onChange={e => setReturnForm({ ...returnForm, returnDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Allocated Project Site *</label>
                    <select className="w-full p-2 border rounded bg-white" value={returnForm.projectId} onChange={e => setReturnForm({ ...returnForm, projectId: e.target.value })}>
                      <option value="">-- Choose Project --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Material Item *</label>
                    <select className="w-full p-2 border rounded bg-white" value={returnForm.itemId} onChange={e => setReturnForm({ ...returnForm, itemId: e.target.value })}>
                      <option value="">-- Choose item --</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Quantity Returned *</label>
                    <input type="number" min="0" className="w-full p-2 border rounded" value={returnForm.qty} onChange={e => setReturnForm({ ...returnForm, qty: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Returned To (Client Security/Supervisor) *</label>
                    <input type="text" placeholder="Receiver Name" className="w-full p-2 border rounded" value={returnForm.returnedBy} onChange={e => setReturnForm({ ...returnForm, returnedBy: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Outward Return Challan No *</label>
                    <input type="text" placeholder="Outward Challan Number" className="w-full p-2 border rounded font-mono" value={returnForm.voucherNo} onChange={e => setReturnForm({ ...returnForm, voucherNo: e.target.value })} />
                  </div>
                </div>
                <div className="text-xs">
                  <label className="block text-gray-700 font-bold mb-1">Remarks / Justification</label>
                  <input type="text" placeholder="..." className="w-full p-2 border rounded" value={returnForm.remarks} onChange={e => setReturnForm({ ...returnForm, remarks: e.target.value })} />
                </div>
                <div className="flex justify-end space-x-2 text-xs pt-2">
                  <button onClick={() => setEditTargetId(null)} className="px-3 py-1.5 bg-gray-100 border hover:bg-gray-200 rounded">Cancel</button>
                  <button onClick={() => saveEntry('return')} className="px-3 py-1.5 bg-[#1a365d] text-white hover:bg-slate-800 rounded">Save Return entry</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-800">Historical Log of Materials Returned to Client</span>
                {!editTargetId && (
                  <button onClick={() => { setReturnForm({ voucherNo: '', returnDate: new Date().toISOString().split('T')[0], projectId: '', itemId: '', qty: 0, returnedBy: '', remarks: '' }); setEditTargetId('new'); }} className="bg-sky-700 text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-sky-800">
                    <Plus size={11} className="inline mr-1" /> Register Material Return
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px]">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Return Challan</th>
                    <th className="py-2 px-3">Project Site</th>
                    <th className="py-2 px-3">Material Item Name</th>
                    <th className="py-2 px-3 text-right">Qty Returned</th>
                    <th className="py-2 px-3">Unit</th>
                    <th className="py-2 px-3">Returned To</th>
                    <th className="py-2 px-3">Remarks</th>
                    <th className="py-2 px-3">Audit Details</th>
                    <th className="py-2 px-3 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materialReturns.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-gray-600">{row.returnDate}</td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-700">{row.voucherNo}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800">{getProjectName(row.projectId)}</td>
                      <td className="py-2 px-3 font-bold text-gray-900">{getItemName(row.itemId)}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-purple-700">{row.qty}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono text-[10px]">{getItemUnit(row.itemId)}</td>
                      <td className="py-2 px-3 text-gray-600 font-medium">{row.returnedBy}</td>
                      <td className="py-2 px-3 text-gray-400 italic">{row.remarks || '-'}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono text-[9px] uppercase">
                        By {row.createdBy || 'System'} at {row.createdDate || '-'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center items-center space-x-2">
                          <button onClick={() => { setReturnForm({ voucherNo: row.voucherNo, returnDate: row.returnDate, projectId: row.projectId, itemId: row.itemId, qty: row.qty, returnedBy: row.returnedBy, remarks: row.remarks || '' }); setEditTargetId(row.id); }} className="text-slate-600 hover:text-blue-700"><Edit size={13} /></button>
                          <button onClick={() => removeRecord('return', row.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materialReturns.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400 font-semibold uppercase text-[10px]">No active outward returns saved in log registry.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. MATERIAL RECONCILIATION SUMMARY TAB
            ========================================================================= */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 border border-blue-200 text-xs rounded shadow-xs space-y-2">
              <h3 className="font-extrabold text-blue-900 flex items-center gap-1">
                <Info size={14} /> Labour Contractor Reconciliation Protocol
              </h3>
              <p className="text-slate-700 leading-relaxed font-sans">
                Below is a dynamic, automated listing of client-supplied construction material balances calculated live across our operational sites. This helps ensure precise audits of client assets, materials left on site, and returned packaging units.
                <strong> Formulas used: Material Balance = Gross Receipts - Gross Returns.</strong>
              </p>
            </div>

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-[#1a365d]">Item-wise Global Balancing Statements</span>
                <span className="text-slate-500 font-mono text-[10px]">Aggregated across all active projects</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px]">
                    <th className="py-2 px-3">Material Item</th>
                    <th className="py-2 px-3 text-right">Gross Receipts Volume</th>
                    <th className="py-2 px-3 text-right">Gross Returns Volume</th>
                    <th className="py-2 px-3 text-right">Total Net Balance Inventory</th>
                    <th className="py-2 px-3">UoM</th>
                    <th className="py-2 px-3">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemWiseSummary.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-gray-900">{getItemName(item.itemId)}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-700 font-semibold">{item.received}</td>
                      <td className="py-2 px-3 text-right font-mono text-purple-700 font-semibold">{item.returned}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/20">{item.balance}</td>
                      <td className="py-2 px-3 text-gray-400 font-semibold">{getItemUnit(item.itemId)}</td>
                      <td className="py-2 px-3">
                        {item.balance > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 font-bold">In-Transit / Site stock</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-green-100 text-green-800 font-bold">Perfect Reconciliation</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {itemWiseSummary.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-gray-400">No active master inventory items possess transits to balance yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. MATERIAL SITE TRANSFERS
            ========================================================================= */}
        {activeTab === 'transfer' && (
          <div className="space-y-4">
            {editTargetId && (
              <div className="bg-white border border-[#b2c0cc] p-4 shadow-xs space-y-3 rounded">
                <h3 className="font-semibold text-xs text-[#1a365d] border-b pb-1">Record Site-to-Site Transit Dispatch</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Transfer Date *</label>
                    <input type="date" className="w-full p-2 border rounded" value={transferForm.transferDate} onChange={e => setTransferForm({ ...transferForm, transferDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Source Complex (From Site) *</label>
                    <select className="w-full p-2 border rounded bg-white font-semibold" value={transferForm.fromProjectId} onChange={e => setTransferForm({ ...transferForm, fromProjectId: e.target.value })}>
                      <option value="">-- Choose Origin site --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Destination Complex (To Site) *</label>
                    <select className="w-full p-2 border rounded bg-white font-semibold" value={transferForm.toProjectId} onChange={e => setTransferForm({ ...transferForm, toProjectId: e.target.value })}>
                      <option value="">-- Choose Destination site --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Material Item *</label>
                    <select className="w-full p-2 border rounded bg-white" value={transferForm.itemId} onChange={e => setTransferForm({ ...transferForm, itemId: e.target.value })}>
                      <option value="">-- Choose item --</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Quantity Transferred *</label>
                    <input type="number" min="0" className="w-full p-2 border rounded font-mono font-bold" value={transferForm.qty} onChange={e => setTransferForm({ ...transferForm, qty: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="text-xs">
                  <label className="block text-gray-700 font-bold mb-1">Authorized Remarks / Gate Pass Ref</label>
                  <input type="text" placeholder="Authorized comments / pass details" className="w-full p-2 border rounded" value={transferForm.remarks} onChange={e => setTransferForm({ ...transferForm, remarks: e.target.value })} />
                </div>
                <div className="flex justify-end space-x-2 text-xs pt-2">
                  <button onClick={() => setEditTargetId(null)} className="px-3 py-1.5 bg-gray-100 border hover:bg-gray-200 rounded">Cancel</button>
                  <button onClick={() => saveEntry('transfer')} className="px-3 py-1.5 bg-[#1a365d] text-white hover:bg-slate-800 rounded">Save Transfer</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-800">Operational Log of Material Site-to-Site Transfers</span>
                {!editTargetId && (
                  <button onClick={() => { setTransferForm({ transferDate: new Date().toISOString().split('T')[0], itemId: '', qty: 0, fromProjectId: '', toProjectId: '', remarks: '' }); setEditTargetId('new'); }} className="bg-sky-700 text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-sky-800">
                    <Plus size={11} className="inline" /> Dispatch Material Transfer
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px]">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Transferred Material Item</th>
                    <th className="py-2 px-3 text-right">Transfer Quantity</th>
                    <th className="py-2 px-3 font-semibold">UoM</th>
                    <th className="py-2 px-3">Source Site (From)</th>
                    <th className="py-2 px-3">Destination Site (To)</th>
                    <th className="py-2 px-3">Gate Pass Details</th>
                    <th className="py-2 px-3 font-semibold">Authorized Stamp</th>
                    <th className="py-2 px-3 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materialTransfers.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-gray-600">{row.transferDate}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{getItemName(row.itemId)}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-blue-700">{row.qty}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono text-[10px]">{getItemUnit(row.itemId)}</td>
                      <td className="py-2 px-3 text-red-700 font-semibold">{getProjectName(row.fromProjectId)}</td>
                      <td className="py-2 px-3 text-emerald-700 font-semibold">{getProjectName(row.toProjectId)}</td>
                      <td className="py-2 px-3 text-gray-400 italic">{row.remarks || '-'}</td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-[8.5px] uppercase">
                        By {row.createdBy} on {row.createdDate}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center items-center space-x-2">
                          <button onClick={() => { setTransferForm({ transferDate: row.transferDate, itemId: row.itemId, qty: row.qty, fromProjectId: row.fromProjectId, toProjectId: row.toProjectId, remarks: row.remarks || '' }); setEditTargetId(row.id); }} className="text-slate-600 hover:text-blue-700"><Edit size={13} /></button>
                          <button onClick={() => removeRecord('transfer', row.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materialTransfers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400 uppercase text-[10px] font-semibold">No material transfers completed yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            7. LOSS & DAMAGE REGISTER
            ========================================================================= */}
        {activeTab === 'loss_damage' && (
          <div className="space-y-4">
            {editTargetId && (
              <div className="bg-white border border-[#b2c0cc] p-4 shadow-xs space-y-3 rounded">
                <h3 className="font-semibold text-xs text-[#1a365d] border-b pb-1">Record Material Write-Off / Damage Entry</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Accident / Incident Date *</label>
                    <input type="date" className="w-full p-2 border rounded" value={lossForm.date} onChange={e => setLossForm({ ...lossForm, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Incident Project Site *</label>
                    <select className="w-full p-2 border rounded bg-white" value={lossForm.projectId} onChange={e => setLossForm({ ...lossForm, projectId: e.target.value })}>
                      <option value="">-- Choose Project --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Damaged/Lost Material Item *</label>
                    <select className="w-full p-2 border rounded bg-white" value={lossForm.itemId} onChange={e => setLossForm({ ...lossForm, itemId: e.target.value })}>
                      <option value="">-- Choose Item --</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Qty Damaged/Lost *</label>
                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-red-700" value={lossForm.qty} onChange={e => setLossForm({ ...lossForm, qty: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Responsible Employee Name *</label>
                    <input type="text" placeholder="Owner / Driver / Foreman" className="w-full p-2 border rounded font-semibold" value={lossForm.responsiblePerson} onChange={e => setLossForm({ ...lossForm, responsiblePerson: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Agreed Recovery Amount (INR / Optional)</label>
                    <input type="number" min="0" placeholder="Rs 0.00" className="w-full p-2 border rounded" value={lossForm.recoveryAmount} onChange={e => setLossForm({ ...lossForm, recoveryAmount: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="text-xs">
                  <label className="block text-gray-700 font-bold mb-1">Reason for Damage / Accident Log *</label>
                  <input type="text" placeholder="Detail reason of damage/accident" className="w-full p-2 border rounded text-red-800 font-semibold" value={lossForm.reason} onChange={e => setLossForm({ ...lossForm, reason: e.target.value })} />
                </div>
                <div className="text-xs">
                  <label className="block text-gray-700 font-bold mb-1">Additional Comments / Remarks</label>
                  <input type="text" className="w-full p-2 border rounded" value={lossForm.remarks} onChange={e => setLossForm({ ...lossForm, remarks: e.target.value })} />
                </div>
                <div className="flex justify-end space-x-2 text-xs pt-2">
                  <button onClick={() => setEditTargetId(null)} className="px-3 py-1.5 bg-gray-100 border hover:bg-gray-200 rounded">Cancel</button>
                  <button onClick={() => saveEntry('loss')} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-800 rounded">Save Loss Entry</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-red-800 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-red-600 animate-pulse" /> Materials Loss & Damage Register
                </span>
                {!editTargetId && (
                  <button onClick={() => { setLossForm({ date: new Date().toISOString().split('T')[0], projectId: '', itemId: '', qty: 0, reason: '', responsiblePerson: '', recoveryAmount: 0, remarks: '' }); setEditTargetId('new'); }} className="bg-red-700 text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-red-800">
                    <Plus size={11} /> File Damage Claim
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px]">
                    <th className="py-2 px-3">Incident Date</th>
                    <th className="py-2 px-3">Project Site</th>
                    <th className="py-2 px-3">Material Item Details</th>
                    <th className="py-2 px-3 text-right text-red-700">Qty Damaged/Lost</th>
                    <th className="py-2 px-3 font-semibold">Incident Reason</th>
                    <th className="py-2 px-3">Responsible Rep</th>
                    <th className="py-2 px-3 text-right">Penal Recovery Amt</th>
                    <th className="py-2 px-3 font-semibold">Registered Stamp</th>
                    <th className="py-2 px-3 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materialLosses.map(row => (
                    <tr key={row.id} className="hover:bg-red-50/40">
                      <td className="py-2 px-3 font-mono text-gray-600">{row.date}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800">{getProjectName(row.projectId)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{getItemName(row.itemId)} <span className="text-gray-400 font-normal">({getItemUnit(row.itemId)})</span></td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-red-600 bg-red-50/10">{row.qty}</td>
                      <td className="py-2 px-3 text-red-800 font-semibold">{row.reason}</td>
                      <td className="py-2 px-3 font-medium text-[#1a365d]">{row.responsiblePerson}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">{row.recoveryAmount ? `₹${row.recoveryAmount.toLocaleString()}` : '-'}</td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-[8px] uppercase">By {row.createdBy} on {row.createdDate}</td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center items-center space-x-2">
                          <button onClick={() => { setLossForm({ date: row.date, projectId: row.projectId, itemId: row.itemId, qty: row.qty, reason: row.reason, responsiblePerson: row.responsiblePerson, recoveryAmount: row.recoveryAmount || 0, remarks: row.remarks || '' }); setEditTargetId(row.id); }} className="text-slate-600 hover:text-blue-700"><Edit size={13} /></button>
                          <button onClick={() => removeRecord('loss', row.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materialLosses.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400 font-semibold uppercase text-[10px]">No material losses reported in register.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            8. COMPANY PURCHASES REGISTER
            ========================================================================= */}
        {activeTab === 'company_purchase' && (
          <div className="space-y-4">
            {editTargetId && (
              <div className="bg-white border border-[#b2c0cc] p-4 shadow-xs space-y-3 rounded">
                <h3 className="font-semibold text-xs text-[#1a365d] border-b pb-1">Register Company Capital Goods Purchases</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Purchase Date *</label>
                    <input type="date" className="w-full p-2 border rounded" value={purchaseForm.purchaseDate} onChange={e => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Supplier Corp / Store *</label>
                    <input type="text" placeholder="Supplier / Store name" className="w-full p-2 border rounded font-semibold" value={purchaseForm.supplierName} onChange={e => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Purchase Site Allocation *</label>
                    <select className="w-full p-2 border rounded bg-white" value={purchaseForm.projectId} onChange={e => setPurchaseForm({ ...purchaseForm, projectId: e.target.value })}>
                      <option value="">-- Choose Target Project Site --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Inward Material item *</label>
                    <select className="w-full p-2 border rounded bg-white font-semibold" value={purchaseForm.itemId} onChange={e => setPurchaseForm({ ...purchaseForm, itemId: e.target.value })}>
                      <option value="">-- Select Master specifications --</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Quantity Purchased *</label>
                    <input type="number" min="0" className="w-full p-2 border rounded font-mono font-bold" value={purchaseForm.qty} onChange={e => setPurchaseForm({ ...purchaseForm, qty: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Rate base cost (INR) *</label>
                    <input type="number" min="0" placeholder="Rs" className="w-full p-2 border rounded font-mono font-bold text-emerald-800" value={purchaseForm.rate} onChange={e => setPurchaseForm({ ...purchaseForm, rate: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Invoice Number *</label>
                    <input type="text" placeholder="Invoice Number" className="w-full p-2 border rounded font-mono font-semibold text-blue-900" value={purchaseForm.invoiceNumber} onChange={e => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })} />
                  </div>
                </div>
                <div className="text-xs">
                  <label className="block text-gray-700 font-bold mb-1">Remarks / Quality verification specs</label>
                  <input type="text" className="w-full p-2 border rounded" value={purchaseForm.remarks} onChange={e => setPurchaseForm({ ...purchaseForm, remarks: e.target.value })} />
                </div>
                <div className="flex justify-end space-x-2 text-xs pt-2">
                  <button onClick={() => setEditTargetId(null)} className="px-3 py-1.5 bg-gray-100 border hover:bg-gray-200 rounded">Cancel</button>
                  <button onClick={() => saveEntry('purchase')} className="px-3 py-1.5 bg-[#1a365d] text-white hover:bg-slate-800 rounded">Save Purchase Invoice</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-800">Historical Corporate Purchase Register</span>
                {!editTargetId && (
                  <button onClick={() => { setPurchaseForm({ purchaseDate: new Date().toISOString().split('T')[0], supplierName: '', projectId: '', itemId: '', qty: 0, rate: 0, invoiceNumber: '', remarks: '' }); setEditTargetId('new'); }} className="bg-sky-700 text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-sky-800">
                    <Plus size={11} className="inline" /> New Corporate Invoice Bill
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px]">
                    <th className="py-2 px-3">Purchase Date</th>
                    <th className="py-2 px-3 font-semibold">Supplier Name</th>
                    <th className="py-2 px-3 text-center">Invoice No</th>
                    <th className="py-2 px-3">Allocated Site</th>
                    <th className="py-2 px-3">Corporate Asset Description</th>
                    <th className="py-2 px-3 text-right">Purchased Qty</th>
                    <th className="py-2 px-3">UoM</th>
                    <th className="py-2 px-3 text-right">Agreed Rate</th>
                    <th className="py-2 px-3 text-right text-emerald-800">Gross Expense Amount</th>
                    <th className="py-2 px-3 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materialPurchases.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-gray-600">{row.purchaseDate}</td>
                      <td className="py-2 px-3 font-bold text-gray-800">{row.supplierName}</td>
                      <td className="py-2 px-3 font-mono text-center font-semibold text-blue-700">{row.invoiceNumber || '-'}</td>
                      <td className="py-2 px-3 font-semibold text-gray-700">{getProjectName(row.projectId)}</td>
                      <td className="py-2 px-3 text-slate-900">{getItemName(row.itemId)} <span className="text-gray-400 font-mono text-[9px]">({materialItems.find(it => it.id === row.itemId)?.category || 'Other'})</span></td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{row.qty}</td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-[10px]">{getItemUnit(row.itemId)}</td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600">₹{row.rate.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/10">₹{row.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center items-center space-x-2">
                          <button onClick={() => { setPurchaseForm({ purchaseDate: row.purchaseDate, supplierName: row.supplierName, projectId: row.projectId, itemId: row.itemId, qty: row.qty, rate: row.rate, invoiceNumber: row.invoiceNumber || '', remarks: row.remarks || '' }); setEditTargetId(row.id); }} className="text-slate-600 hover:text-blue-700"><Edit size={13} /></button>
                          <button onClick={() => removeRecord('purchase', row.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materialPurchases.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400 uppercase text-[10px] font-semibold">No direct corporate purchasing invoices logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            9. EQUIPMENT & MACHINERY ASSETS SUITE
            ========================================================================= */}
        {activeTab === 'equipment' && (
          <div className="space-y-4">
            {editTargetId && (
              <div className="bg-white border border-[#b2c0cc] p-4 shadow-xs space-y-3 rounded">
                <h3 className="font-semibold text-xs text-[#1a365d] border-b pb-1">Register Heavy Technical Asset & Machinery</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Asset Category Name *</label>
                    <input type="text" placeholder="Asset Name / Description" className="w-full p-2 border rounded font-semibold text-slate-800" value={equipmentForm.name} onChange={e => setEquipmentForm({ ...equipmentForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1 font-mono">Unique Asset Serialization Code *</label>
                    <input type="text" placeholder="Asset Code" className="w-full p-2 border rounded font-mono font-semibold" value={equipmentForm.assetCode} onChange={e => setEquipmentForm({ ...equipmentForm, assetCode: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Acquisition Supplier / Brand *</label>
                    <input type="text" placeholder="Brand / Supplier" className="w-full p-2 border rounded" value={equipmentForm.brand} onChange={e => setEquipmentForm({ ...equipmentForm, brand: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Total Asset Cost (INR) *</label>
                    <input type="number" min="0" placeholder="Rs" className="w-full p-2 border rounded font-bold font-mono text-emerald-800" value={equipmentForm.purchaseCost} onChange={e => setEquipmentForm({ ...equipmentForm, purchaseCost: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Purchase Date *</label>
                    <input type="date" className="w-full p-2 border rounded" value={equipmentForm.purchaseDate} onChange={e => setEquipmentForm({ ...equipmentForm, purchaseDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Site Allocation *</label>
                    <select className="w-full p-2 border rounded bg-white font-semibold" value={equipmentForm.currentSiteId} onChange={e => setEquipmentForm({ ...equipmentForm, currentSiteId: e.target.value })}>
                      <option value="">-- Choose Allocation --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Current Operational Status</label>
                    <select className="w-full p-2 border rounded bg-white font-bold" value={equipmentForm.status} onChange={e => setEquipmentForm({ ...equipmentForm, status: e.target.value as any })}>
                      {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 text-xs pt-2">
                  <button onClick={() => setEditTargetId(null)} className="px-3 py-1.5 bg-gray-100 border hover:bg-gray-200 rounded">Cancel</button>
                  <button onClick={() => saveEntry('equipment')} className="px-3 py-1.5 bg-[#1a365d] text-white hover:bg-slate-800 rounded">Register Corporate Asset</button>
                </div>
              </div>
            )}

            <div className="bg-[#FAF9F6] border border-[#cbd5e1] p-3 text-xs italic text-gray-600 flex items-center gap-1.5 rounded">
              <Hammer size={16} className="text-amber-800" />
              <span>Track our highly durable corporate asset inventory securely (Vibrators, Cutter Machines, Drills, Generators, etc). Group acquisitions are synced.</span>
            </div>

            <div className="bg-white border border-[#b2c0cc] shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-[#cbd5e1] flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-800">Corporate Assets & Heavy Machinery Inventory</span>
                {!editTargetId && (
                  <button onClick={() => { setEquipmentForm({ purchaseDate: new Date().toISOString().split('T')[0], name: '', assetCode: '', brand: '', purchaseCost: 0, currentSiteId: '', status: 'Available', remarks: '' }); setEditTargetId('new'); }} className="bg-[#1a365d] text-white font-bold px-3 py-1 rounded text-[10px] hover:bg-slate-800">
                    <Plus size={11} /> Register Asset Allocation
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b uppercase text-[9px]">
                    <th className="py-2 px-3">Asset Code</th>
                    <th className="py-2 px-3">Asset Classification</th>
                    <th className="py-2 px-3">Acquisition Brand</th>
                    <th className="py-2 px-3">Date Purchased</th>
                    <th className="py-2 px-3 text-right">Capital Cost</th>
                    <th className="py-2 px-3">Assigned Site</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-center font-semibold">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono font-bold text-blue-800">{asset.assetCode}</td>
                      <td className="py-2 px-3 font-extrabold text-slate-900">{asset.name}</td>
                      <td className="py-2 px-3 font-medium text-slate-600">{asset.brand}</td>
                      <td className="py-2 px-3 font-mono text-gray-500">{asset.purchaseDate}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">₹{asset.purchaseCost.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 font-semibold text-[#1a365d]">{getProjectName(asset.currentSiteId)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${asset.status === 'Available' ? 'bg-green-100 text-green-800' : asset.status === 'In Use' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex justify-center items-center space-x-2">
                          <button onClick={() => { setEquipmentForm({ purchaseDate: asset.purchaseDate, name: asset.name, assetCode: asset.assetCode, brand: asset.brand, purchaseCost: asset.purchaseCost, currentSiteId: asset.currentSiteId, status: asset.status, remarks: asset.remarks || '' }); setEditTargetId(asset.id); }} className="text-slate-600 hover:text-blue-700"><Edit size={13} /></button>
                          <button onClick={() => removeRecord('equipment', asset.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400 font-semibold uppercase text-[10px]">No active heavy equipment acquisitions mapped.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            10. SUPPLIER LEDGER WORKSPACE
            ========================================================================= */}
        {activeTab === 'supplier_ledger' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#b2c0cc] p-4 flex flex-col justify-between space-y-3 rounded">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[11px] text-[#1a365d] uppercase tracking-wide">Record Supplier Payment Receipt</h4>
                  <p className="text-[10px] text-gray-500">Record payments to suppliers against active purchases</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-gray-600 font-bold mb-0.5">Supplier Name *</label>
                    <input type="text" placeholder="Supplier / Contractor Name" className="w-full p-2 border rounded font-semibold" value={paymentForm.supplierName} onChange={e => setPaymentForm({ ...paymentForm, supplierName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 font-bold mb-0.5">Payment Date *</label>
                      <input type="date" className="w-full p-2 border rounded" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-bold mb-0.5">Amount Paid *</label>
                      <input type="number" min="0" placeholder="Rs" className="w-full p-2 border rounded font-bold font-mono text-emerald-800" value={paymentForm.amountPaid} onChange={e => setPaymentForm({ ...paymentForm, amountPaid: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 font-bold mb-0.5">Mode *</label>
                      <select className="w-full p-2 border rounded bg-white font-semibold" value={paymentForm.paymentMode} onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash Handover</option>
                        <option value="Cheque">Cheque Draft</option>
                        <option value="UPI">UPI Digital Payment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-600 font-bold mb-0.5 font-mono">Invoice Reference</label>
                      <input type="text" placeholder="Invoice Number/Challan" className="w-full p-2 border rounded" value={paymentForm.invoiceReference} onChange={e => setPaymentForm({ ...paymentForm, invoiceReference: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-mono mb-0.5">Payment remarks</label>
                    <input type="text" className="w-full p-2 border rounded" value={paymentForm.remarks} onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })} />
                  </div>
                </div>
                <button onClick={() => { setEditTargetId('new'); saveEntry('payment'); }} className="w-full bg-emerald-600 hover:bg-emerald-800 text-white font-extrabold text-xs py-2 rounded shadow-xs mt-2">
                  Post Supplier Payment Voucher
                </button>
              </div>

              <div className="md:col-span-2 bg-white border border-[#b2c0cc] p-4 flex flex-col justify-between rounded shadow-xs">
                <div className="space-y-1 border-b pb-2 mb-3">
                  <h4 className="font-extrabold text-xs text-[#1a365d]">Supplier Outstanding Balance Sheet</h4>
                  <p className="text-[10px] text-gray-500">Live summary of accumulated invoice bills, past payments and current outstanding balance liabilities.</p>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b uppercase text-[8.5px]">
                        <th className="py-2 px-3">Supplier Name Location</th>
                        <th className="py-2 px-3 text-right">Sum Invoice Purchases</th>
                        <th className="py-2 px-3 text-right">Sum Payments Handover</th>
                        <th className="py-2 px-3 text-right text-red-700">Net Outstanding Balance</th>
                        <th className="py-2 px-3 text-center">Audit Statement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Array.from(new Set([...materialPurchases.map(p => p.supplierName), ...supplierPayments.map(p => p.supplierName)]))
                        .map((supplier, idx) => {
                          const purTotal = materialPurchases.filter(p => p.supplierName === supplier).reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
                          const payTotal = supplierPayments.filter(p => p.supplierName === supplier).reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
                          const oust = Math.max(0, purTotal - payTotal);

                          return (
                            <tr key={idx} className="hover:bg-slate-100/40">
                              <td className="py-2 px-3 font-semibold text-gray-800">{supplier}</td>
                              <td className="py-2 px-3 text-right font-mono text-gray-600">₹{purTotal.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-700">₹{payTotal.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3 text-right font-mono font-extrabold text-red-700 bg-red-50/10">₹{oust.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3 text-center">
                                <button onClick={() => setSelectedLedgerSupplier(supplier)} className="text-[10px] bg-slate-100 hover:bg-[#1a365d] hover:text-white px-2 py-0.5 border rounded">
                                  Select Ledger
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Selected Supplier detailed Ledger list */}
            {selectedLedgerSupplier && (
              <div className="bg-white border border-[#b2c0cc] rounded shadow-xs">
                <div className="bg-[#1a365d] px-3 py-2 text-white flex justify-between items-center text-xs font-sans">
                  <span className="font-extrabold">CHRONOLOGICAL LEDGER STATEMENT: <strong className="text-emerald-300 uppercase underline">{selectedLedgerSupplier}</strong></span>
                  <button onClick={() => setSelectedLedgerSupplier('')} className="text-gray-300 hover:text-white font-bold">Close Statement</button>
                </div>
                <div className="p-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b uppercase text-[9px] tracking-wider">
                        <th className="py-2 px-3">Posting Date</th>
                        <th className="py-2 px-3">Transaction Voucher Type</th>
                        <th className="py-2 px-3">Allocation Project</th>
                        <th className="py-2 px-3">Reference Ref</th>
                        <th className="py-2 px-3 text-right">Debit Owed Bill (+)</th>
                        <th className="py-2 px-3 text-right">Credit Payment Made (-)</th>
                        <th className="py-2 px-3 text-right text-red-700">Cumulative Liability Outstanding Balance</th>
                        <th className="py-2 px-3">Details / audit comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeSupplierLedgerData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="py-2 px-3 font-mono text-gray-500">{row.date}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{row.type}</td>
                          <td className="py-2 px-3 font-semibold text-gray-600">{row.project}</td>
                          <td className="py-2 px-3 font-mono text-blue-800 font-bold">{row.ref}</td>
                          <td className="py-2 px-3 text-right font-mono text-red-600">{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700">{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-red-700 bg-red-50/10">₹{row.runningOutstanding.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-gray-500 italic">{row.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            11. PDF REPORTS GENERATION PANEL
            ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#b2c0cc] p-4 rounded shadow-xs space-y-4 font-sans">
              <div className="border-b pb-2">
                <h3 className="font-extrabold text-[#1a365d] text-sm flex items-center gap-1.5">
                  <Printer size={18} /> Administrative Report Download Console
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Please choose from the certified audit listings below to download standard structural PDF document sheets.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "Client Material Receipt Report", desc: "Detailed chronological record of materials supplied by client." },
                  { title: "Client Material Receipt (Date-wise)", desc: "Material receipts sorted by date chronologically." },
                  { title: "Item-wise Consolidated Balance", desc: "Total quantity issued and returned mapped by item name." },
                  { title: "Client Material Return Report", desc: "Detailed records of raw/scrap materials returned to clients." },
                  { title: "Material Reconciliation Report", desc: "Comparative item-wise inward vs returned balance matrix." },
                  { title: "Site-wise Material Balance Report", desc: "Balance sheet filtered for site locations." },
                  { title: "Material Transfer Report", desc: "Complete log of project-to-project material transits." },
                  { title: "Loss & Damage Report", desc: "Filing statements of broken components, write-offs and penalties." },
                  { title: "Purchase Register", desc: "Inward invoice tracker for consumables and safety items purchased." },
                  { title: "Equipment Purchase Report", desc: "Heavy mechanical asset register tracker." },
                  { title: "Supplier Outstanding Statement", desc: "Outstanding bills statement group sheets with payments." }
                ].map((rep, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 border border-[#cbd5e1] hover:border-slate-400/80 transition flex flex-col justify-between space-y-2 rounded-xs shadow-xs">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{idx + 1}. {rep.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">{rep.desc}</p>
                    </div>
                    <button
                      onClick={() => triggerPDFReport(rep.title)}
                      className="w-fit text-[10px] bg-[#1a365d] hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1"
                    >
                      <Printer size={11} /> Download PDF report
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isReturnableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-[#b2c0cc] w-full max-w-lg shadow-xl rounded-xs overflow-hidden flex flex-col">
            <div className="bg-purple-900 text-white px-4 py-3 border-b border-purple-950 flex justify-between items-center font-sans">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                <Plus size={14} /> Log Returnable Material Transaction
              </div>
              <button 
                onClick={() => setIsReturnableModalOpen(false)}
                className="text-purple-200 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto max-h-[80vh] text-xs font-sans">
              
              {/* Type Switcher Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 text-center font-bold">
                <button
                  type="button"
                  onClick={() => setReturnableForm(prev => ({ ...prev, type: 'Issue' }))}
                  className={`py-2 rounded border transition ${returnableForm.type === 'Issue' ? 'bg-purple-100 border-purple-500 text-purple-950' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                >
                  <Plus size={12} className="inline mr-1" /> Issue (Inward Issued)
                </button>
                <button
                  type="button"
                  onClick={() => setReturnableForm(prev => ({ ...prev, type: 'Return' }))}
                  className={`py-2 rounded border transition ${returnableForm.type === 'Return' ? 'bg-emerald-100 border-emerald-500 text-emerald-950' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                >
                  <RotateCcw size={12} className="inline mr-1" /> Return (Outward Returned)
                </button>
              </div>

              {/* Form fields */}
              <div className="space-y-3 pt-2 text-left">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Transaction Date *</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded font-semibold text-slate-800" 
                    value={returnableForm.date} 
                    onChange={e => setReturnableForm(prev => ({ ...prev, date: e.target.value }))} 
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Allocated Project Site *</label>
                  <select 
                    className="w-full p-2 border rounded bg-white font-semibold text-slate-800" 
                    value={returnableForm.projectId} 
                    onChange={e => setReturnableForm(prev => ({ ...prev, projectId: e.target.value }))}
                  >
                    <option value="">-- Select Project Site --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Returnable Material Item *</label>
                  <select 
                    className="w-full p-2 border rounded bg-white font-semibold text-slate-800" 
                    value={returnableForm.itemId} 
                    onChange={e => setReturnableForm(prev => ({ ...prev, itemId: e.target.value }))}
                  >
                    <option value="">-- Choose Returnable Item --</option>
                    {materialItems
                      .filter(i => i.materialType === 'Returnable')
                      .map(i => <option key={i.id} value={i.id}>{i.itemName} [{i.itemCode || 'No Code'}] ({i.unit})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Quantity/Volume *</label>
                    <input 
                      type="number" 
                      min="1" 
                      placeholder="Enter count"
                      className="w-full p-2 border rounded font-bold font-mono text-slate-800"
                      value={returnableForm.qty || ''} 
                      onChange={e => setReturnableForm(prev => ({ ...prev, qty: Number(e.target.value) }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Challan / Voucher No (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Auto-generated if blank"
                      className="w-full p-2 border rounded font-mono text-slate-800"
                      value={returnableForm.voucherNo} 
                      onChange={e => setReturnableForm(prev => ({ ...prev, voucherNo: e.target.value }))} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Tower (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tower 3"
                      className="w-full p-2 border rounded text-slate-800"
                      value={returnableForm.tower} 
                      onChange={e => setReturnableForm(prev => ({ ...prev, tower: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Floor (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 15th F"
                      className="w-full p-2 border rounded text-slate-800"
                      value={returnableForm.floor} 
                      onChange={e => setReturnableForm(prev => ({ ...prev, floor: e.target.value }))} 
                    />
                  </div>
                </div>

                {returnableForm.type === 'Return' && (
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Packaging / Safety Material Condition *</label>
                    <select 
                      className="w-full p-2 border rounded bg-white text-slate-800"
                      value={returnableForm.condition}
                      onChange={e => setReturnableForm(prev => ({ ...prev, condition: e.target.value as any }))}
                    >
                      <option value="Good">Good/Reusable</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Scrap">Waste/Scrap</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {returnableForm.type === 'Issue' 
                      ? 'Issued by *' 
                      : 'Returned To (Supervisor/Security Signoff) *'}
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter name of carrier/person"
                    className="w-full p-[7px] border rounded font-medium text-slate-800"
                    value={returnableForm.person} 
                    onChange={e => setReturnableForm(prev => ({ ...prev, person: e.target.value }))} 
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Transaction Specifications / Remarks</label>
                  <textarea 
                    rows={2} 
                    placeholder="Type comments, gate pass logs, or transit notes..."
                    className="w-full p-2 border rounded text-slate-800"
                    value={returnableForm.remarks}
                    onChange={e => setReturnableForm(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => setIsReturnableModalOpen(false)} 
                className="px-3 py-1.5 bg-white border hover:bg-slate-100 rounded text-slate-700 font-medium font-sans cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveReturnable} 
                className={`px-4 py-1.5 text-white font-bold rounded font-sans transition shadow-sm cursor-pointer ${returnableForm.type === 'Issue' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}
              >
                Save {returnableForm.type === 'Issue' ? 'Issue Inflow' : 'Return Outflow'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DuplicateWarningModal
        isOpen={dupModalOpen}
        moduleName={dupModuleTitle}
        warningText={dupWarningText}
        duplicates={dupData}
        currentUser={user}
        onCancel={() => {
          setDupModalOpen(false);
          setPendingSaveFn(null);
        }}
        onSaveAnyway={(reason) => {
          setDupModalOpen(false);
          if (pendingSaveFn) {
            pendingSaveFn(reason);
            setPendingSaveFn(null);
          }
        }}
        onViewExisting={(record) => {
          setDupModalOpen(false);
          // Set edit state using the record properties
          setEditTargetId(record.id);
          if (dupModuleTitle === 'Client Material Receipt') {
            setReceiptForm({
              projectId: record.projectId || '',
              itemId: record.itemId || '',
              qty: Number(record.qty || 0),
              issuedTo: record.issuedTo || '',
              remarks: record.remarks || '',
              voucherNo: record.voucherNo || '',
              issueDate: record.issueDate || '',
              tower: record.tower || '',
              floor: record.floor || ''
            });
            setActiveTab('receipt');
          } else if (dupModuleTitle === 'Client Material Return') {
            setReturnForm({
              projectId: record.projectId || '',
              itemId: record.itemId || '',
              qty: Number(record.qty || 0),
              returnedBy: record.returnedBy || '',
              remarks: record.remarks || '',
              voucherNo: record.voucherNo || '',
              returnDate: record.returnDate || ''
            });
            setActiveTab('return');
          } else if (dupModuleTitle === 'Material Purchase') {
            setPurchaseForm({
              projectId: record.projectId || '',
              itemId: record.itemId || '',
              qty: record.qty?.toString() || '',
              rate: record.rate?.toString() || '',
              supplierName: record.supplierName || '',
              invoiceNumber: record.invoiceNumber || '',
              remarks: record.remarks || '',
              purchaseDate: record.purchaseDate || ''
            });
            setActiveTab('company_purchase');
          } else if (dupModuleTitle === 'Supplier Payment') {
            setPaymentForm({
              supplierName: record.supplierName || '',
              paymentDate: record.paymentDate || '',
              amountPaid: record.amountPaid?.toString() || '',
              paymentMode: record.paymentMode || 'Cash',
              invoiceReference: record.invoiceReference || '',
              remarks: record.remarks || ''
            });
            setActiveTab('supplier_ledger');
          }
        }}
      />
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        expectedColumns={['itemCode', 'itemName', 'category', 'unit']}
        entityName="Material Master"
        onUpload={async (data) => {
          const formattedData = data.map(item => ({
            ...item,
            id: `m_` + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
            materialType: item.materialType || 'Consumable'
          }));
          const res = await fetch('/api/material-items/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedData)
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to bulk upload materials");
          }
          window.location.reload();
        }}
      />
      {materialsReportPreview && (
        <ReportPreviewModal
          title={materialsReportPreview.title}
          subtitle="Material Logistics Division Registry"
          headers={materialsReportPreview.headers}
          data={materialsReportPreview.data}
          filename={materialsReportPreview.title}
          isOpen={!!materialsReportPreview}
          onClose={() => setMaterialsReportPreview(null)}
        />
      )}
    </div>
  );
};
