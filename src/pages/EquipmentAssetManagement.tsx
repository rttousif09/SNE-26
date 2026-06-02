import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { 
  Plus, Trash2, Edit, Printer, FileSpreadsheet, Search, AlertTriangle, 
  Building2, Grid, Calendar, ShoppingCart, Send, RotateCcw, TrendingUp, Info,
  ArrowLeftRight, FileText, Settings, User, DollarSign, LayoutDashboard, CheckCircle, Clock, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Asset, AssetCategory, AssetStatus, AssetTransfer, AssetMaintenance } from '../types';
import { PDFExportButton } from '../components/PDFExportButton';

const CATEGORIES: AssetCategory[] = [
  'Vibrator',
  'Drill Machine',
  'Cutter Machine',
  'Scaffolding',
  'Shuttering Material',
  'Props',
  'Jack System',
  'Power Tools',
  'Safety Equipment',
  'Other'
];

const STATUSES: AssetStatus[] = [
  'Available',
  'In Use',
  'Under Maintenance',
  'Damaged',
  'Lost',
  'Disposed'
];

export const EquipmentAssetManagement: React.FC = () => {
  const { 
    projects,
    assets = [],
    assetTransfers = [],
    assetMaintenances = [],
    addAsset,
    updateAsset,
    deleteAsset,
    addAssetTransfer,
    addAssetMaintenance,
    workers = []
  } = useAppContext();

  // Active ERP Sub-Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register' | 'transfers' | 'maintenance' | 'ledger' | 'reports'>('dashboard');

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal / Form trigger states
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetAssetForTransfer, setTargetAssetForTransfer] = useState<Asset | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [targetAssetForMaintenance, setTargetAssetForMaintenance] = useState<Asset | null>(null);

  // Asset Ledger Selected Asset
  const [ledgerSelectedAssetId, setLedgerSelectedAssetId] = useState<string>('');

  // Form Field States
  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'Drill Machine' as AssetCategory,
    customCategory: '',
    assetCode: '',
    brand: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    currentSiteId: 'unassigned',
    assignedTo: '',
    status: 'Available' as AssetStatus,
    remarks: ''
  });

  const [transferForm, setTransferForm] = useState({
    toSiteId: 'unassigned',
    transferDate: new Date().toISOString().split('T')[0],
    transferredBy: '',
    remarks: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceDate: new Date().toISOString().split('T')[0],
    maintenanceType: 'Preventive',
    vendor: '',
    cost: '',
    remarks: '',
    nextMaintenanceDate: ''
  });

  // Notifications State (Alert Messages)
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // Resolve Names
  const getProjectName = (id: string) => {
    if (id === 'unassigned' || id === 'general_pool') return 'General Storage Pool';
    const proj = projects.find(p => p.id === id);
    return proj ? proj.name : 'Unknown Site';
  };

  const getAssetName = (id: string) => {
    const asset = assets.find(a => a.id === id);
    return asset ? `${asset.name} (${asset.assetCode})` : 'Unknown Asset';
  };

  // Helper code generator for deterministic unique sequential Asset ID like AST-1001, AST-1002 etc.
  const generateNewAssetCode = () => {
    const codes = assets
      .map(a => {
        const match = a.assetCode.match(/AST-(\d+)/i);
        return match ? parseInt(match[1]) : null;
      })
      .filter((n): n is number => n !== null);
    
    const maxNum = codes.length > 0 ? Math.max(...codes) : 1000;
    return `AST-${maxNum + 1}`;
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      const matchSearch = 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCat = filterCategory === 'all' || item.category === filterCategory;
      const matchSite = filterSite === 'all' || item.currentSiteId === filterSite;
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;

      return matchSearch && matchCat && matchSite && matchStatus;
    });
  }, [assets, searchQuery, filterCategory, filterSite, filterStatus]);

  // Site-wise asset calculations for report
  const siteWiseReport = useMemo(() => {
    const reportList: {
      siteId: string;
      siteName: string;
      total: number;
      available: number;
      inUse: number;
      maintenance: number;
      damaged: number;
    }[] = [];

    // All active projects + general pool
    const sites = [{ id: 'general_pool', name: 'General Storage Pool' }, ...projects];

    sites.forEach(site => {
      const siteAssets = assets.filter(a => a.currentSiteId === site.id);
      if (siteAssets.length > 0 || site.id !== 'general_pool') {
        reportList.push({
          siteId: site.id,
          siteName: site.name,
          total: siteAssets.length,
          available: siteAssets.filter(a => a.status === 'Available').length,
          inUse: siteAssets.filter(a => a.status === 'In Use').length,
          maintenance: siteAssets.filter(a => a.status === 'Under Maintenance').length,
          damaged: siteAssets.filter(a => a.status === 'Damaged').length
        });
      }
    });

    return reportList;
  }, [projects, assets]);

  // Dashboard calculations
  const dashboardStats = useMemo(() => {
    const total = assets.length;
    const inUse = assets.filter(a => a.status === 'In Use').length;
    const maintenance = assets.filter(a => a.status === 'Under Maintenance').length;
    const damaged = assets.filter(a => a.status === 'Damaged').length;
    const available = assets.filter(a => a.status === 'Available').length;
    const assignedToSites = assets.filter(a => a.currentSiteId !== 'general_pool' && a.currentSiteId !== 'unassigned').length;

    return { total, inUse, maintenance, damaged, available, assignedToSites };
  }, [assets]);

  // ALERTS ENGINE: Track upcoming/overdue maintenance and status issues
  const notifications = useMemo(() => {
    const list: { id: string; type: 'warning' | 'danger' | 'info'; title: string; desc: string; date?: string }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    assets.forEach(asset => {
      // 1. Damaged Assets Warnings
      if (asset.status === 'Damaged') {
        list.push({
          id: `dmg-${asset.id}`,
          type: 'danger',
          title: 'Asset Damaged Alert',
          desc: `${asset.name} (${asset.assetCode}) on site "${getProjectName(asset.currentSiteId)}" is reported Damaged.`
        });
      }

      // 2. Lost Assets Warnings
      if (asset.status === 'Lost') {
        list.push({
          id: `lost-${asset.id}`,
          type: 'danger',
          title: 'Missing Asset Alert',
          desc: `${asset.name} (${asset.assetCode}) is reported Lost.`
        });
      }

      // Check maintenance schedule
      // Get all maintenances for this asset, locate latest
      const assetMaints = assetMaintenances.filter(m => m.assetId === asset.id);
      
      // Look at individual asset scheduled nextMaintenanceDate or last logged
      // We can search if any nextMaintenanceDate has been scheduled inside asset maintenance listings
      assetMaints.forEach(m => {
        if (m.nextMaintenanceDate && asset.status !== 'Disposed') {
          const nextDate = new Date(m.nextMaintenanceDate);
          const diffTime = nextDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            list.push({
              id: `overdue-${m.id}`,
              type: 'danger',
              title: 'Overdue Maintenance Alert',
              desc: `${asset.name} was scheduled for maintenance on ${m.nextMaintenanceDate} (${Math.abs(diffDays)} days overdue). Vendor: ${m.vendor || '—'}`,
              date: m.nextMaintenanceDate
            });
          } else if (diffDays <= 15) {
            list.push({
              id: `upcoming-${m.id}`,
              type: 'warning',
              title: 'Upcoming Maintenance',
              desc: `${asset.name} upkeep schedule is due on ${m.nextMaintenanceDate} (in ${diffDays} days).`,
              date: m.nextMaintenanceDate
            });
          }
        }
      });
    });

    return list;
  }, [assets, assetMaintenances]);

  // Asset Ledger chronological history constructor
  const assetLedgerData = useMemo(() => {
    if (!ledgerSelectedAssetId) return [];
    const assetObj = assets.find(a => a.id === ledgerSelectedAssetId);
    if (!assetObj) return [];

    const ledgerLines: {
      date: string;
      rawDate: number;
      type: 'Purchase' | 'Site Transfer' | 'Maintenance' | 'Status Update' | 'Remarks';
      desc: string;
      costValue: number;
      costDisplay: string;
      siteName: string;
    }[] = [];

    // 1. Purchase Event
    ledgerLines.push({
      date: assetObj.purchaseDate,
      rawDate: new Date(assetObj.purchaseDate).getTime(),
      type: 'Purchase',
      desc: `Capital procurement of asset [${assetObj.name}]. Brand: ${assetObj.brand || '—'}. Initial status: ${assetObj.status}. Remarks: ${assetObj.remarks || 'Initial entry'}`,
      costValue: assetObj.purchaseCost || 0,
      costDisplay: assetObj.purchaseCost ? `₹${parseFloat(assetObj.purchaseCost.toString()).toLocaleString('en-IN')}` : '₹0',
      siteName: getProjectName(assetObj.currentSiteId)
    });

    // 2. Transfers Events
    const transfers = assetTransfers.filter(t => t.assetId === ledgerSelectedAssetId);
    transfers.forEach(t => {
      ledgerLines.push({
        date: t.transferDate,
        rawDate: new Date(t.transferDate).getTime(),
        type: 'Site Transfer',
        desc: `Transferred from [${getProjectName(t.fromSiteId)}] to [${getProjectName(t.toSiteId)}]. Dispatched by: ${t.transferredBy || 'System'}. Remarks: ${t.remarks || '—'}`,
        costValue: 0,
        costDisplay: '—',
        siteName: getProjectName(t.toSiteId)
      });
    });

    // 3. Maintenance Events
    const maintenances = assetMaintenances.filter(m => m.assetId === ledgerSelectedAssetId);
    maintenances.forEach(m => {
      ledgerLines.push({
        date: m.maintenanceDate,
        rawDate: new Date(m.maintenanceDate).getTime(),
        type: 'Maintenance',
        desc: `Upkeep service logged. Type: ${m.maintenanceType}. Service Vendor: ${m.vendor || '—'}. Next scheduled due: ${m.nextMaintenanceDate || 'Not specified'}. Remarks: ${m.remarks || '—'}`,
        costValue: m.cost || 0,
        costDisplay: `₹${parseFloat((m.cost || 0).toString()).toLocaleString('en-IN')}`,
        siteName: getProjectName(assetObj.currentSiteId) // site is current site at that time
      });
    });

    // Sort chronologically
    return ledgerLines.sort((a, b) => b.rawDate - a.rawDate);
  }, [ledgerSelectedAssetId, assets, assetTransfers, assetMaintenances]);


  // HANDLERS
  const handleOpenAssetAdd = () => {
    setEditingAssetId(null);
    setAssetForm({
      name: '',
      category: 'Drill Machine',
      customCategory: '',
      assetCode: generateNewAssetCode(),
      brand: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: '',
      currentSiteId: 'general_pool',
      assignedTo: '',
      status: 'Available',
      remarks: ''
    });
    setIsAssetModalOpen(true);
  };

  const handleOpenAssetEdit = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetForm({
      name: asset.name,
      category: asset.category,
      customCategory: asset.category === 'Other' ? asset.category : '',
      assetCode: asset.assetCode,
      brand: asset.brand,
      purchaseDate: asset.purchaseDate,
      purchaseCost: asset.purchaseCost.toString(),
      currentSiteId: asset.currentSiteId,
      assignedTo: asset.assignedTo || '',
      status: asset.status,
      remarks: asset.remarks || ''
    });
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.assetCode) {
      triggerAlert('error', 'Please fill in Name and Asset Code.');
      return;
    }

    const costNum = parseFloat(assetForm.purchaseCost) || 0;
    const finalCategory = assetForm.category === 'Other' && assetForm.customCategory 
      ? (assetForm.customCategory as AssetCategory) 
      : assetForm.category;

    const dataPayload: Omit<Asset, 'id'> = {
      name: assetForm.name,
      category: finalCategory,
      assetCode: assetForm.assetCode,
      brand: assetForm.brand,
      purchaseDate: assetForm.purchaseDate,
      purchaseCost: costNum,
      currentSiteId: assetForm.currentSiteId,
      assignedTo: assetForm.assignedTo,
      status: assetForm.status,
      remarks: assetForm.remarks,
      createdBy: 'fttousif38@gmail.com',
      createdDate: new Date().toISOString()
    };

    if (editingAssetId) {
      await updateAsset(editingAssetId, dataPayload);
      triggerAlert('success', `Asset "${assetForm.name}" updated successfully.`);
    } else {
      // Check duplicate code
      const isDuplicate = assets.some(a => a.assetCode.trim().toLowerCase() === assetForm.assetCode.trim().toLowerCase());
      if (isDuplicate) {
        triggerAlert('error', `An asset with Code "${assetForm.assetCode}" already exists.`);
        return;
      }
      await addAsset(dataPayload);
      triggerAlert('success', `Asset "${assetForm.name}" registered successfully with code ${assetForm.assetCode}.`);
    }

    setIsAssetModalOpen(false);
  };

  const handleDeleteAssetClick = async (asset: Asset) => {
    if (confirm(`Are you sure you want to permanently delete "${asset.name} (${asset.assetCode})"?`)) {
      const result = await deleteAsset(asset.id);
      if (result.success) {
        triggerAlert('success', `Asset "${asset.name}" removed successfully.`);
      } else {
        triggerAlert('error', result.error || 'Failed to remove asset.');
      }
    }
  };

  // Site Transfer Dispatch
  const handleOpenTransfer = (asset: Asset) => {
    setTargetAssetForTransfer(asset);
    setTransferForm({
      toSiteId: 'general_pool',
      transferDate: new Date().toISOString().split('T')[0],
      transferredBy: '',
      remarks: ''
    });
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssetForTransfer) return;
    if (transferForm.toSiteId === targetAssetForTransfer.currentSiteId) {
      triggerAlert('error', 'Cannot transfer an asset to the same site it is currently located at.');
      return;
    }

    const payload: Omit<AssetTransfer, 'id'> = {
      assetId: targetAssetForTransfer.id,
      fromSiteId: targetAssetForTransfer.currentSiteId,
      toSiteId: transferForm.toSiteId,
      transferDate: transferForm.transferDate,
      transferredBy: transferForm.transferredBy || 'SYSTEM',
      remarks: transferForm.remarks
    };

    await addAssetTransfer(payload);

    // Dynamic state update of status if active status is "Available" we can tag as "In Use" on actual projects
    const isTransferredToProject = transferForm.toSiteId !== 'general_pool' && transferForm.toSiteId !== 'unassigned';
    const postStatus: AssetStatus = isTransferredToProject ? 'In Use' : 'Available';
    await updateAsset(targetAssetForTransfer.id, { 
      currentSiteId: transferForm.toSiteId,
      status: postStatus 
    });

    triggerAlert('success', `Asset logged and dispatached to "${getProjectName(transferForm.toSiteId)}".`);
    setIsTransferModalOpen(false);
  };

  // Upkeep Maintenance forms
  const handleOpenMaintenance = (asset: Asset) => {
    setTargetAssetForMaintenance(asset);
    setMaintenanceForm({
      maintenanceDate: new Date().toISOString().split('T')[0],
      maintenanceType: 'Repair',
      vendor: '',
      cost: '',
      remarks: '',
      nextMaintenanceDate: ''
    });
    setIsMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssetForMaintenance) return;
    if (!maintenanceForm.vendor || !maintenanceForm.cost) {
      triggerAlert('error', 'Please include Service Vendor and cost.');
      return;
    }

    const costNum = parseFloat(maintenanceForm.cost) || 0;

    const payload: Omit<AssetMaintenance, 'id'> = {
      assetId: targetAssetForMaintenance.id,
      maintenanceDate: maintenanceForm.maintenanceDate,
      maintenanceType: maintenanceForm.maintenanceType,
      vendor: maintenanceForm.vendor,
      cost: costNum,
      remarks: maintenanceForm.remarks,
      nextMaintenanceDate: maintenanceForm.nextMaintenanceDate || undefined
    };

    // Log the maintenance entry
    await addAssetMaintenance(payload);

    // Update status to Under Maintenance
    await updateAsset(targetAssetForMaintenance.id, { status: 'Under Maintenance' });

    triggerAlert('success', `Upkeep and maintenance record logged for "${targetAssetForMaintenance.name}". Status changed to Under Maintenance.`);
    setIsMaintenanceModalOpen(false);
  };

  // EXPORTS
  const handleExportCSV = () => {
    if (filteredAssets.length === 0) {
      triggerAlert('error', 'No records found to export.');
      return;
    }

    const headers = ['Asset ID/Code', 'Asset Name', 'Category', 'Brand/Make', 'Purchase Date', 'Purchase Cost (INR)', 'Current Site Location', 'Assigned User', 'Current Condition/Status', 'Remarks'];
    const csvRows = [headers.join(',')];

    filteredAssets.forEach(a => {
      const row = [
        `"${a.assetCode}"`,
        `"${a.name.replace(/"/g, '""')}"`,
        `"${a.category}"`,
        `"${a.brand.replace(/"/g, '""')}"`,
        `"${a.purchaseDate}"`,
        a.purchaseCost,
        `"${getProjectName(a.currentSiteId).replace(/"/g, '""')}"`,
        `"${(a.assignedTo || '').replace(/"/g, '""')}"`,
        `"${a.status}"`,
        `"${(a.remarks || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Equipment_Asset_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert('success', 'Asset register spreadsheet CSV downloaded.');
  };

  const handleExportPDF = () => {
    if (filteredAssets.length === 0) {
      triggerAlert('error', 'No records found to export.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text("SN ENTERPRISE - CONSTRUCTION ERP", 14, 15);
    doc.setFontSize(11);
    doc.text(`Equipment & Asset Register Report (Generated: ${new Date().toLocaleDateString()})`, 14, 21);

    const tableData = filteredAssets.map((a) => [
      a.assetCode,
      a.name,
      a.category,
      a.brand,
      a.purchaseDate,
      `INR ${parseFloat(a.purchaseCost.toString()).toLocaleString('en-IN')}`,
      getProjectName(a.currentSiteId),
      a.assignedTo || '—',
      a.status
    ]);

    autoTable(doc, {
      head: [['Code/ID', 'Asset Name', 'Category', 'Brand', 'Purch. Date', 'Cost', 'Current Location', 'Assigned To', 'Status']],
      body: tableData,
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 86, 179] }
    });

    doc.save(`ERP_Asset_Register_${new Date().toISOString().split('T')[0]}.pdf`);
    triggerAlert('success', 'Asset Register PDF report generated.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fa] p-1 overflow-auto text-slate-800">
      
      {/* Upper Status Notifications Banner inside ERP */}
      {alertMessage && (
        <div className={`fixed top-12 right-4 z-50 p-2.5 rounded shadow-lg border text-white font-medium flex items-center space-x-2 animate-fade-in text-[10px] ${alertMessage.type === 'success' ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'}`}>
          <span>{alertMessage.type === 'success' ? '✓' : '⚠'}</span>
          <span>{alertMessage.text}</span>
          <button onClick={() => setAlertMessage(null)} className="ml-2 font-bold hover:text-gray-200">×</button>
        </div>
      )}

      {/* Main SAP Tab Bar Navigation */}
      <div className="flex items-center space-x-1 border-b border-[#8c9ba8] bg-[#eef2f6] p-1 print:hidden select-none">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-3 py-1 text-center font-semibold border ${activeTab === 'dashboard' ? 'bg-white border-[#8c9ba8] border-b-transparent text-[#0056b3]' : 'bg-[#d9e4f1] border-transparent hover:bg-white text-slate-600'}`}
        >
          <div className="flex items-center space-x-1">
            <LayoutDashboard size={12} />
            <span>Asset Dashboard</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('register')} 
          className={`px-3 py-1 text-center font-semibold border ${activeTab === 'register' ? 'bg-white border-[#8c9ba8] border-b-transparent text-[#0056b3]' : 'bg-[#d9e4f1] border-transparent hover:bg-white text-slate-600'}`}
        >
          <div className="flex items-center space-x-1">
            <Grid size={12} />
            <span>Asset Register ({assets.length})</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('transfers')} 
          className={`px-3 py-1 text-center font-semibold border ${activeTab === 'transfers' ? 'bg-white border-[#8c9ba8] border-b-transparent text-[#0056b3]' : 'bg-[#d9e4f1] border-transparent hover:bg-white text-slate-600'}`}
        >
          <div className="flex items-center space-x-1">
            <ArrowLeftRight size={12} />
            <span>Mobilization & Transfers</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('maintenance')} 
          className={`px-3 py-1 text-center font-semibold border ${activeTab === 'maintenance' ? 'bg-white border-[#8c9ba8] border-b-transparent text-[#0056b3]' : 'bg-[#d9e4f1] border-transparent hover:bg-white text-slate-600'}`}
        >
          <div className="flex items-center space-x-1">
            <Clock size={12} />
            <span>Maintenance Schedule</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('ledger')} 
          className={`px-3 py-1 text-center font-semibold border ${activeTab === 'ledger' ? 'bg-white border-[#8c9ba8] border-b-transparent text-[#0056b3]' : 'bg-[#d9e4f1] border-transparent hover:bg-white text-slate-600'}`}
        >
          <div className="flex items-center space-x-1">
            <FileText size={12} />
            <span>Asset Ledger Audits</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`px-3 py-1 text-center font-semibold border ${activeTab === 'reports' ? 'bg-white border-[#8c9ba8] border-b-transparent text-[#0056b3]' : 'bg-[#d9e4f1] border-transparent hover:bg-white text-slate-600'}`}
        >
          <div className="flex items-center space-x-1">
            <TrendingUp size={12} />
            <span>Site Utilization Reports</span>
          </div>
        </button>
      </div>


      {/* TAB PANEL 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col space-y-3 p-1 animate-fade-in print:hidden">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="bg-white p-2 border border-slate-300 rounded-sm shadow-sm hover:border-[#0056b3] transition duration-150">
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Total Capital Assets</span>
              <div className="flex items-baseline space-x-1.5 pt-1">
                <span className="text-xl font-bold font-mono text-[#0056b3]">{dashboardStats.total}</span>
                <span className="text-[9px] text-slate-400">machines</span>
              </div>
            </div>
            <div className="bg-white p-2 border border-slate-300 rounded-sm shadow-sm hover:border-green-600 transition duration-150">
              <span className="text-[10px] uppercase text-green-600 font-bold block">Available / Ready</span>
              <div className="flex items-baseline space-x-1.5 pt-1">
                <span className="text-xl font-bold font-mono text-green-600">{dashboardStats.available}</span>
                <span className="text-[9px] text-slate-400">idle</span>
              </div>
            </div>
            <div className="bg-white p-2 border border-slate-300 rounded-sm shadow-sm hover:border-blue-600 transition duration-150">
              <span className="text-[10px] uppercase text-blue-600 font-bold block">Deployed (In Use)</span>
              <div className="flex items-baseline space-x-1.5 pt-1">
                <span className="text-xl font-bold font-mono text-blue-600">{dashboardStats.inUse}</span>
                <span className="text-[9px] text-slate-400">deployed</span>
              </div>
            </div>
            <div className="bg-white p-2 border border-slate-300 rounded-sm shadow-sm hover:border-amber-600 transition duration-150">
              <span className="text-[10px] uppercase text-amber-600 font-bold block">In Service Upkeeps</span>
              <div className="flex items-baseline space-x-1.5 pt-1">
                <span className="text-xl font-bold font-mono text-amber-600">{dashboardStats.maintenance}</span>
                <span className="text-[9px] text-slate-400 font-mono">undergoing</span>
              </div>
            </div>
            <div className="bg-white p-2 border border-slate-300 rounded-sm shadow-sm hover:border-red-600 transition duration-150">
              <span className="text-[10px] uppercase text-red-600 font-bold block">Damaged / Broken</span>
              <div className="flex items-baseline space-x-1.5 pt-1">
                <span className="text-xl font-bold font-mono text-red-600">{dashboardStats.damaged}</span>
                <span className="text-[9px] text-slate-400">alerts</span>
              </div>
            </div>
            <div className="bg-white p-2 border border-slate-300 rounded-sm shadow-sm hover:border-[#0056b3] transition duration-150">
              <span className="text-[10px] uppercase text-slate-600 font-bold block">Mobilized on Sites</span>
              <div className="flex items-baseline space-x-1.5 pt-1">
                <span className="text-xl font-bold font-mono text-slate-700">{dashboardStats.assignedToSites}</span>
                <span className="text-[9px] text-slate-400">active sites</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Left: Alerts, Overdue and Notifications panel */}
            <div className="bg-white p-2 border border-[#8c9ba8] rounded-sm shadow-sm flex flex-col h-[300px]">
              <div className="flex items-center justify-between border-b pb-1.5 border-dashed border-[#8c9ba8]">
                <div className="flex items-center space-x-2 text-red-700 font-bold">
                  <AlertTriangle size={14} />
                  <span>CRITICAL ALERTS & SCHEDULES</span>
                </div>
                <span className="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono">{notifications.length} alerts</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-slate-400 italic text-center py-12">
                    ✓ No equipment alerts, lost reports, or overdue maintenance logs tracked!
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-2 border rounded-sm flex flex-col space-y-1 text-[10px] ${
                        notif.type === 'danger' ? 'bg-red-50 border-red-200 text-red-900' : 
                        notif.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                        'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{notif.title}</span>
                      </div>
                      <p className="text-slate-600 text-[10px] font-sans leading-relaxed">{notif.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Middle: Site-wise Deployment Distribution */}
            <div className="bg-white p-2 border border-[#8c9ba8] rounded-sm shadow-sm flex flex-col h-[300px]">
              <div className="flex items-center justify-between border-b pb-1.5 border-dashed border-[#8c9ba8]">
                <div className="flex items-center space-x-2 text-[#0056b3] font-bold">
                  <Building2 size={13} />
                  <span>SITE EQUIPMENT ALLOCATIONS</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pt-2">
                <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-1 px-2">Project Site</th>
                      <th className="p-1 text-center font-mono font-bold w-16">Qty Deployed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteWiseReport.map(site => (
                      <tr key={site.siteId} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="p-1.5 px-2 font-bold text-slate-700">{site.siteName}</td>
                        <td className="p-1.5 text-center font-mono font-semibold text-blue-700">{site.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Quick Actions and System Guidelines */}
            <div className="bg-white p-2 border border-[#8c9ba8] rounded-sm shadow-sm flex flex-col h-[300px]">
              <div className="flex items-center border-b pb-1.5 border-dashed border-[#8c9ba8] text-slate-700 font-bold space-x-2">
                <Settings size={13} />
                <span>QUICK MOBILIZATION DISPATCH</span>
              </div>
              <div className="flex-1 p-1 flex flex-col justify-between pt-3">
                <p className="text-slate-500 text-[10px] leading-relaxed">
                  Easily register and keep track of your tools between different projects. Keeping records helps decrease capital loss constraints, extends equipment lifespans via proactive scheduled servicing, and streamlines field execution timelines.
                </p>
                <div className="space-y-1.5 pt-2">
                  <button onClick={handleOpenAssetAdd} className="w-full sap-btn flex items-center justify-center space-x-1 py-1 text-slate-700 bg-white hover:bg-slate-50 border">
                    <Plus size={11} />
                    <span>Register New Equipment</span>
                  </button>
                  <button onClick={() => { setActiveTab('register'); setFilterStatus('Available'); }} className="w-full sap-btn flex items-center justify-center space-x-1 py-1 text-slate-700 bg-white hover:bg-slate-50 border">
                    <ArrowLeftRight size={11} />
                    <span>Transfer Available Assets</span>
                  </button>
                  <button onClick={() => { setActiveTab('maintenance'); }} className="w-full sap-btn flex items-center justify-center space-x-1 py-1 text-slate-700 bg-white hover:bg-slate-50 border">
                    <Clock size={11} />
                    <span>Log Maintenance & Servicing</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TAB PANEL 2: ASSET REGISTER */}
      {activeTab === 'register' && (
        <div className="flex flex-col space-y-3 p-1 animate-fade-in print:block">
          
          {/* SEARCH AND FILTER SHEET */}
          <div className="bg-white p-2 border border-[#8c9ba8] rounded-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2 print:hidden select-none">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 px-1.5 py-0.5 rounded-sm">
                <Search size={12} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ID, name, brand..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[11px] w-32 focus:w-44 transition-all duration-150 font-medium"
                />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-black font-bold">×</button>}
              </div>

              {/* Category Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 font-bold">Category:</span>
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)} 
                  className="bg-white border rounded-sm border-slate-300 text-[10px] p-0.5"
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Site Location Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 font-bold">Site:</span>
                <select 
                  value={filterSite} 
                  onChange={(e) => setFilterSite(e.target.value)} 
                  className="bg-white border rounded-sm border-slate-300 text-[10px] p-0.5"
                >
                  <option value="all">All Sites</option>
                  <option value="general_pool">General Storage Pool</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Status Condition Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 font-bold">Status:</span>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)} 
                  className="bg-white border rounded-sm border-slate-300 text-[10px] p-0.5"
                >
                  <option value="all">All Statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button onClick={handleOpenAssetAdd} className="sap-btn bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 p-1 px-2.5">
                <Plus size={11} />
                <span>Add Asset</span>
              </button>
              <button onClick={handleExportCSV} className="sap-btn bg-slate-50 text-slate-700 flex items-center space-x-1 p-1 hover:bg-slate-150 border" title="Export selection to CSV Spreadsheet">
                <FileSpreadsheet size={11} className="text-emerald-700" />
                <span>Export Excel</span>
              </button>
              <PDFExportButton
                title="Equipment & Capital Assets Register"
                headers={['Code/ID', 'Asset Name', 'Category', 'Brand', 'Purch. Date', 'Cost', 'Current Location', 'Assigned To', 'Status']}
                data={filteredAssets.map(a => [
                  a.assetCode,
                  a.name,
                  a.category,
                  a.brand,
                  a.purchaseDate,
                  `Rs. ${parseFloat(a.purchaseCost.toString()).toLocaleString('en-IN')}`,
                  getProjectName(a.currentSiteId),
                  a.assignedTo || '—',
                  a.status
                ])}
              />
            </div>
          </div>

          {/* ASSETS MASTER TABLE REGISTER CONTAINER */}
          <div className="bg-white border border-[#8c9ba8] rounded-sm shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 text-slate-700 border-b border-[#8c9ba8] p-1 px-2 font-bold uppercase select-none print:hidden flex justify-between items-center text-[10px]">
              <span>EQUIPMENT & CAPITAL ASSETS REGISTER</span>
              <span className="bg-[#0056b3] text-white text-[9px] px-2 py-0.5 rounded font-mono font-bold tracking-wider">{filteredAssets.length} assets matched</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-sans">
                <thead>
                  <tr className="sap-header text-slate-800 font-normal select-none border-b border-[#8c9ba8] text-[10px]">
                    <th className="p-1 px-2">Code/ID</th>
                    <th className="p-1">Asset Name</th>
                    <th className="p-1">Category</th>
                    <th className="p-1">Make/Brand</th>
                    <th className="p-1">Purch. Date</th>
                    <th className="p-1 text-right">Cost (INR)</th>
                    <th className="p-1 text-center">Site Location</th>
                    <th className="p-1">Assigned To</th>
                    <th className="p-1 text-center">Status</th>
                    <th className="p-1 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center italic text-slate-400">
                        No equipment matched those filtration settings. Log new assets above.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(item => {
                      const carriesLedger = assetTransfers.some(t => t.assetId === item.id) || assetMaintenances.some(m => m.assetId === item.id);
                      return (
                        <tr key={item.id} className="border-b border-slate-200 hover:bg-[#e6f2ff] cursor-default leading-tight">
                          <td className="p-1.5 px-2 font-mono font-bold text-[#0056b3] select-all">{item.assetCode}</td>
                          <td className="p-1.5 font-bold text-slate-800">{item.name}</td>
                          <td className="p-1.5">{item.category}</td>
                          <td className="p-1.5 italic text-slate-600">{item.brand || '—'}</td>
                          <td className="p-1.5 font-mono text-slate-500">{item.purchaseDate}</td>
                          <td className="p-1.5 text-right font-mono font-semibold text-slate-700">
                            {parseFloat(item.purchaseCost.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-1.5 text-center font-bold text-slate-700">
                            {getProjectName(item.currentSiteId)}
                          </td>
                          <td className="p-1.5 font-medium text-slate-600">
                            {item.assignedTo ? (
                              <div className="flex items-center space-x-1">
                                <User size={10} className="text-slate-400" />
                                <span>{item.assignedTo}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-1.5 text-center">
                            <span className={`p-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold select-none whitespace-nowrap ${
                              item.status === 'Available' ? 'bg-green-100 text-green-800 border border-green-200' :
                              item.status === 'In Use' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              item.status === 'Under Maintenance' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              item.status === 'Damaged' ? 'bg-red-100 text-red-800 border border-red-200' :
                              'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-1.5 text-center print:hidden select-none">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button 
                                onClick={() => handleOpenAssetEdit(item)} 
                                className="text-blue-700 hover:text-blue-900" 
                                title="Edit Asset Properties"
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                onClick={() => handleOpenTransfer(item)} 
                                className="text-emerald-700 hover:text-emerald-900" 
                                title="Mobilization / Site Transfer"
                              >
                                <ArrowLeftRight size={12} />
                              </button>
                              <button 
                                onClick={() => handleOpenMaintenance(item)} 
                                className="text-amber-700 hover:text-amber-900" 
                                title="Track Upkeep Servicing Logs"
                              >
                                <Clock size={12} />
                              </button>
                              <button 
                                onClick={() => { 
                                  setLedgerSelectedAssetId(item.id); 
                                  setActiveTab('ledger'); 
                                }} 
                                className="text-indigo-700 hover:text-indigo-900" 
                                title="View Complete Ledger History logs"
                              >
                                <FileText size={12} />
                              </button>
                              <button 
                                onClick={() => handleDeleteAssetClick(item)} 
                                className={`text-red-600 hover:text-red-800 ${carriesLedger ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                disabled={carriesLedger}
                                title={carriesLedger ? "Restricted: This asset has a transaction history logs to protect data integrity" : "Permanently remove asset record"}
                              >
                                <Trash2 size={12} />
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
        </div>
      )}


      {/* TAB PANEL 3: SITE ALLOCATION / TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="flex flex-col space-y-3 p-1 animate-fade-in print:hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Left Column: Direct manual transfer logs addition */}
            <div className="bg-white p-3 border border-[#8c9ba8] rounded-sm shadow-sm flex flex-col select-none">
              <span className="font-bold text-[#0056b3] border-b pb-1 border-dashed text-[11px] uppercase block">SITE DISPATCH & MOBILIZATION MOBILITY</span>
              <p className="text-slate-500 text-[10px] leading-relaxed pt-2">
                Deploy an asset to a construction project or return it back to the general storage pool. Transfer records maintain site history tracking.
              </p>
              
              <form onSubmit={handleSaveTransfer} className="space-y-3 pt-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Select Asset to Move:</label>
                  <select 
                    value={targetAssetForTransfer?.id || ''} 
                    onChange={(e) => {
                      const selected = assets.find(a => a.id === e.target.value);
                      setTargetAssetForTransfer(selected || null);
                    }}
                    className="w-full bg-white border rounded-sm p-1 text-[11px]"
                    required
                  >
                    <option value="">-- Choose Asset from inventory --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.assetCode}) - Currently: {getProjectName(a.currentSiteId)}
                      </option>
                    ))}
                  </select>
                </div>

                {targetAssetForTransfer && (
                  <div className="p-2 bg-slate-50 rounded-sm border text-[10px] space-y-1">
                    <div><span className="font-bold">Asset category:</span> {targetAssetForTransfer.category}</div>
                    <div><span className="font-bold">Current site:</span> {getProjectName(targetAssetForTransfer.currentSiteId)}</div>
                    <div><span className="font-bold">Asset condition status:</span> {targetAssetForTransfer.status}</div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Destisnation Site Location:</label>
                  <select 
                    value={transferForm.toSiteId} 
                    onChange={(e) => setTransferForm(s => ({ ...s, toSiteId: e.target.value }))}
                    className="w-full bg-white border rounded-sm p-1 text-[11px]"
                    required
                  >
                    <option value="general_pool">General Storage Pool (Inventory Pool)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Transfer Date:</label>
                  <input 
                    type="date" 
                    value={transferForm.transferDate} 
                    onChange={(e) => setTransferForm(s => ({ ...s, transferDate: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Authorized Transferred By:</label>
                  <input 
                    type="text" 
                    placeholder="Enter personnel name..."
                    value={transferForm.transferredBy} 
                    onChange={(e) => setTransferForm(s => ({ ...s, transferredBy: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Dispatch Gate-pass Remarks:</label>
                  <textarea 
                    placeholder="E.g. Deployed for column structuring"
                    rows={2}
                    value={transferForm.remarks} 
                    onChange={(e) => setTransferForm(s => ({ ...s, remarks: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!targetAssetForTransfer}
                  className={`w-full font-bold flex items-center justify-center space-x-1 p-1.5 rounded-sm ${
                    targetAssetForTransfer 
                      ? 'bg-emerald-600 border border-emerald-700 text-white hover:bg-emerald-700 cursor-pointer' 
                      : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={11} />
                  <span>Execute Mobilization Move</span>
                </button>
              </form>
            </div>

            {/* Right Column: Historical Mobilization log sheet */}
            <div className="bg-white p-3 border border-[#8c9ba8] rounded-sm shadow-sm md:col-span-2 flex flex-col">
              <span className="font-bold text-slate-700 border-b pb-1 border-dashed text-[11px] uppercase block">COMPREHENSIVE TRANSFER TIMELINES</span>
              
              <div className="flex-1 overflow-y-auto mt-3 max-h-[450px]">
                <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-1.5 px-2">Assigned Asset</th>
                      <th className="p-1.5">Dispatch Origin (From Site)</th>
                      <th className="p-1.5">Destination Deployment (To Site)</th>
                      <th className="p-1.5 text-center">Transfer Date</th>
                      <th className="p-1.5">Assigned Authorized User</th>
                      <th className="p-1.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center italic text-slate-400">
                          No asset mobilization moves logged in database yet.
                        </td>
                      </tr>
                    ) : (
                      [...assetTransfers].reverse().map(log => (
                        <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="p-2 font-bold text-[#0056b3]">{getAssetName(log.assetId)}</td>
                          <td className="p-2 text-red-700 font-bold">{getProjectName(log.fromSiteId)}</td>
                          <td className="p-2 text-green-700 font-bold">{getProjectName(log.toSiteId)}</td>
                          <td className="p-2 text-center font-mono text-slate-500">{log.transferDate}</td>
                          <td className="p-2 font-semibold text-slate-600">{log.transferredBy}</td>
                          <td className="p-2 italic text-slate-500 max-w-44 truncate" title={log.remarks}>{log.remarks || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TAB PANEL 4: MAINTENANCE SCHEDULES */}
      {activeTab === 'maintenance' && (
        <div className="flex flex-col space-y-3 p-1 animate-fade-in print:hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Left Column: Form to log new maintenace upkeeps */}
            <div className="bg-white p-3 border border-[#8c9ba8] rounded-sm shadow-sm flex flex-col select-none">
              <span className="font-bold text-amber-700 border-b pb-1 border-dashed text-[11px] uppercase block">LOG ASSET REPAIR & MAINTENANCE</span>
              <p className="text-slate-500 text-[10px] leading-relaxed pt-2">
                Whenever equipment undergoes regular tuneups, preventive servicing, or major component repairs, log the cost and schedule here.
              </p>
              
              <form onSubmit={handleSaveMaintenance} className="space-y-3 pt-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Asset Requiring Service:</label>
                  <select 
                    value={targetAssetForMaintenance?.id || ''} 
                    onChange={(e) => {
                      const selected = assets.find(a => a.id === e.target.value);
                      setTargetAssetForMaintenance(selected || null);
                    }}
                    className="w-full bg-white border rounded-sm p-1 text-[11px]"
                    required
                  >
                    <option value="">-- Choose Asset from inventory --</option>
                    {assets.filter(a => a.status !== 'Disposed').map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.assetCode}) - Status: {a.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Service Date:</label>
                  <input 
                    type="date" 
                    value={maintenanceForm.maintenanceDate} 
                    onChange={(e) => setMaintenanceForm(s => ({ ...s, maintenanceDate: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Maintenance Type:</label>
                  <select 
                    value={maintenanceForm.maintenanceType} 
                    onChange={(e) => setMaintenanceForm(s => ({ ...s, maintenanceType: e.target.value }))}
                    className="w-full bg-white border rounded-sm p-1 text-[11px]"
                    required
                  >
                    <option value="Preventive">Preventive Tuneup (Standard Overhaul)</option>
                    <option value="Repair">Breakdown Repair (Active Fix)</option>
                    <option value="Calibration">Inspection & Calibration</option>
                    <option value="Upkeep">Safety Inspections</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Service Vendor / Workshop:</label>
                  <input 
                    type="text" 
                    placeholder="Enter repair workshop or vendor..."
                    value={maintenanceForm.vendor} 
                    onChange={(e) => setMaintenanceForm(s => ({ ...s, vendor: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Maintenance Cost Charged (INR):</label>
                  <input 
                    type="number" 
                    placeholder="E.g. 4500"
                    value={maintenanceForm.cost} 
                    onChange={(e) => setMaintenanceForm(s => ({ ...s, cost: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Recommended Next Schedule Date:</label>
                  <input 
                    type="date" 
                    value={maintenanceForm.nextMaintenanceDate} 
                    onChange={(e) => setMaintenanceForm(s => ({ ...s, nextMaintenanceDate: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Remarks / Parts Replaced:</label>
                  <textarea 
                    placeholder="E.g. Swapped drill carbon brush, cleaned grease chamber"
                    rows={2}
                    value={maintenanceForm.remarks} 
                    onChange={(e) => setMaintenanceForm(s => ({ ...s, remarks: e.target.value }))}
                    className="w-full border rounded-sm p-1 text-[11px]"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!targetAssetForMaintenance}
                  className={`w-full font-bold flex items-center justify-center space-x-1 p-1.5 rounded-sm ${
                    targetAssetForMaintenance 
                      ? 'bg-amber-600 border border-amber-700 text-white hover:bg-amber-700 cursor-pointer' 
                      : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Clock size={11} />
                  <span>Log Upkeep Maintenance</span>
                </button>
              </form>
            </div>

            {/* Right Column: Historical Maintenance updates log */}
            <div className="bg-white p-3 border border-[#8c9ba8] rounded-sm shadow-sm md:col-span-2 flex flex-col">
              <span className="font-bold text-slate-700 border-b pb-1 border-dashed text-[11px] uppercase block">PREVIOUS UPKEEP & SERVICING HISTORY LOGS</span>
              
              <div className="flex-1 overflow-y-auto mt-3 max-h-[450px]">
                <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-1.5 px-2">Serviced Asset</th>
                      <th className="p-1.5">Upkeep Date</th>
                      <th className="p-1.5">Service Type</th>
                      <th className="p-1.5">Vendor</th>
                      <th className="p-1.5 text-right">Upkeep Cost (INR)</th>
                      <th className="p-1.5 text-center text-amber-700 font-bold">Planned Next Schedule</th>
                      <th className="p-1.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetMaintenances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center italic text-slate-400">
                          No asset servicing has been logged in the ERP database.
                        </td>
                      </tr>
                    ) : (
                      [...assetMaintenances].reverse().map(log => (
                        <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="p-2 font-bold text-[#0056b3]">{getAssetName(log.assetId)}</td>
                          <td className="p-2 font-mono text-slate-500">{log.maintenanceDate}</td>
                          <td className="p-2 font-medium">{log.maintenanceType}</td>
                          <td className="p-2">{log.vendor}</td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {parseFloat((log.cost || 0).toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center font-bold text-amber-700 font-mono bg-amber-50/50">
                            {log.nextMaintenanceDate || '—'}
                          </td>
                          <td className="p-2 italic text-slate-500" title={log.remarks}>{log.remarks || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TAB PANEL 5: AUDITING LEDGER Timelines */}
      {activeTab === 'ledger' && (
        <div className="flex flex-col space-y-3 p-1 animate-fade-in print:hidden">
          
          <div className="bg-white p-3 border border-[#8c9ba8] rounded-sm shadow-sm select-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <FileText size={14} className="text-indigo-700" />
                <span className="font-bold text-slate-700 text-[11px] uppercase">EQUIPMENT AUDIT TRAIL & ASSET HISTORIC LEDGER</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">Audit specific asset:</span>
                <select 
                  value={ledgerSelectedAssetId} 
                  onChange={(e) => setLedgerSelectedAssetId(e.target.value)}
                  className="bg-white border rounded-sm p-1 text-[11px] max-w-xs font-semibold"
                >
                  <option value="">-- Choose an Equipment Asset to audit --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.assetCode}] - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {ledgerSelectedAssetId ? (
            <div className="bg-white p-3 border border-[#8c9ba8] rounded-sm shadow-sm flex flex-col">
              <div className="flex items-center justify-between border-b pb-2 mb-3 border-dashed">
                <div>
                  <h3 className="text-sm font-bold text-indigo-900">{getAssetName(ledgerSelectedAssetId)}</h3>
                  <span className="text-[10px] text-slate-500">Asset Audit Register chronology. Database record sync complete.</span>
                </div>
                
                {assets.find(a => a.id === ledgerSelectedAssetId) && (
                  <div className="flex items-center space-x-4 text-[10px]">
                    <div>
                      <span className="text-slate-400">Current Site:</span>{' '}
                      <span className="font-bold">{getProjectName(assets.find(a => a.id === ledgerSelectedAssetId)!.currentSiteId)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Status:</span>{' '}
                      <span className="font-bold text-emerald-700">{assets.find(a => a.id === ledgerSelectedAssetId)!.status}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-indigo-200 text-slate-600 font-bold">
                      <th className="p-2 border border-slate-200 w-24">Timeline Date</th>
                      <th className="p-2 border border-slate-200 w-32">Ledger Event Type</th>
                      <th className="p-2 border border-slate-200">Chronicle Transaction Description</th>
                      <th className="p-2 border border-slate-200 text-right w-36">Capital / Upkeep Cost (INR)</th>
                      <th className="p-2 border border-slate-200">Associated Location Site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetLedgerData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center italic text-slate-400">
                          Empty timeline trace results in ledger database.
                        </td>
                      </tr>
                    ) : (
                      assetLedgerData.map((line, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-mono text-slate-500">{line.date}</td>
                          <td className="p-2 border border-slate-200">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] tracking-wide uppercase ${
                              line.type === 'Purchase' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                              line.type === 'Site Transfer' ? 'bg-emerald-100 text-emerald-950 border border-emerald-200' :
                              line.type === 'Maintenance' ? 'bg-amber-100 text-amber-950 border border-amber-200' :
                              'bg-indigo-50 text-indigo-900'
                            }`}>
                              {line.type}
                            </span>
                          </td>
                          <td className="p-2 border border-slate-200 text-slate-700 font-sans leading-relaxed">{line.desc}</td>
                          <td className={`p-2 border border-slate-200 text-right font-mono ${line.costValue > 0 ? 'text-indigo-900 font-bold' : 'text-slate-400'}`}>
                            {line.costDisplay}
                          </td>
                          <td className="p-2 border border-slate-200 font-medium">{line.siteName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 border border-[#8c9ba8] bg-opacity-50 text-center italic text-slate-400 rounded-sm">
              Please choose a specific capital asset inside the dropdown above to display audits ledger.
            </div>
          )}
        </div>
      )}


      {/* TAB PANEL 6: SITE REPORT GRIDS */}
      {activeTab === 'reports' && (
        <div className="flex flex-col space-y-3 p-1 animate-fade-in print:block">
          
          <div className="bg-white p-3 border border-[#8c9ba8] rounded-sm shadow-sm flex justify-between items-center print:hidden">
            <div>
              <span className="font-bold text-[#0056b3] text-[11px] uppercase">PROJECT-WISE SITE ASSET UTILIZATION & HEALTH</span>
              <p className="text-slate-500 text-[10px] leading-relaxed pt-1 select-none">
                Live summaries of logistics deploy ratios and damage/upkeep metrics per construction project site.
              </p>
            </div>
            
            <button onClick={handlePrint} className="sap-btn bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center space-x-1 border p-1 select-none">
              <Printer size={12} />
              <span>Print Reports</span>
            </button>
          </div>

          <div className="bg-white border border-[#8c9ba8] rounded-sm shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px] font-sans">
              <thead>
                <tr className="sap-header text-slate-800 font-normal border-b select-none text-[10px]">
                  <th className="p-2 px-3">Associated Project Location Site</th>
                  <th className="p-2 text-center w-32 font-bold select-all">Total Assets Deployed</th>
                  <th className="p-2 text-center w-32 text-green-700">Available / idle</th>
                  <th className="p-2 text-center w-32 text-blue-700">Currently Deployed</th>
                  <th className="p-2 text-center w-32 text-amber-700">Maintenance Upkeeps</th>
                  <th className="p-2 text-center w-32 text-red-700 font-bold">Health Danger alerts</th>
                </tr>
              </thead>
              <tbody>
                {siteWiseReport.map(report => (
                  <tr key={report.siteId} className="border-b hover:bg-slate-50 leading-tight">
                    <td className="p-2.5 px-3 font-bold text-slate-800 text-[12px]">{report.siteName}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#0056b3] text-[12px]">{report.total}</td>
                    <td className="p-2.5 text-center font-mono font-semibold text-green-700">{report.available}</td>
                    <td className="p-2.5 text-center font-mono font-semibold text-blue-700">{report.inUse}</td>
                    <td className="p-2.5 text-center font-mono text-amber-700 font-medium">{report.maintenance}</td>
                    <td className="p-2.5 text-center font-mono select-all bg-red-50 text-red-800 font-bold">{report.damaged}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ----------------- MODALS ----------------- */}

      {/* MODAL 1: ADD / UPDATE ASSET */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded shadow-xl border border-slate-300 flex flex-col text-[11px] font-sans">
            <div className="bg-[#0056b3] text-white p-2.5 flex items-center justify-between font-bold text-[11px]">
              <span>{editingAssetId ? 'EDIT CAPITAL ASSET PARAMETERS' : 'REGISTER NEW FIELD ASSET'}</span>
              <button onClick={() => setIsAssetModalOpen(false)} className="hover:opacity-80"><X size={14} /></button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-3 space-y-2.5 overflow-y-auto max-h-[85vh]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Asset Code / ID (Unique):</label>
                  <input 
                    type="text" 
                    value={assetForm.assetCode} 
                    onChange={(e) => setAssetForm(s => ({ ...s, assetCode: e.target.value }))}
                    className="w-full border rounded-sm p-1 font-mono font-bold text-[#0056b3]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Category Designation:</label>
                  <select 
                    value={assetForm.category} 
                    onChange={(e) => setAssetForm(s => ({ ...s, category: e.target.value as AssetCategory }))}
                    className="w-full bg-white border rounded-sm p-1"
                    required
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {assetForm.category === 'Other' && (
                <div>
                  <label className="block font-bold text-amber-700 mb-0.5">Specify Other Category Type:</label>
                  <input 
                    type="text" 
                    value={assetForm.customCategory} 
                    placeholder="Enter custom category..."
                    onChange={(e) => setAssetForm(s => ({ ...s, customCategory: e.target.value }))}
                    className="w-full border rounded-sm p-1"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Equipment / Tool Name:</label>
                <input 
                  type="text" 
                  placeholder="E.g. Drill TE 70-Heavy, Jack system pump"
                  value={assetForm.name} 
                  onChange={(e) => setAssetForm(s => ({ ...s, name: e.target.value }))}
                  className="w-full border rounded-sm p-1 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Make / Brand / Vendor:</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Hilti, Bosch, Dewalt"
                    value={assetForm.brand} 
                    onChange={(e) => setAssetForm(s => ({ ...s, brand: e.target.value }))}
                    className="w-full border rounded-sm p-1"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Capital Purchase Cost (INR):</label>
                  <input 
                    type="number" 
                    placeholder="E.g. 45000"
                    value={assetForm.purchaseCost} 
                    onChange={(e) => setAssetForm(s => ({ ...s, purchaseCost: e.target.value }))}
                    className="w-full border rounded-sm p-1 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Purchase Procurement Date:</label>
                  <input 
                    type="date" 
                    value={assetForm.purchaseDate} 
                    onChange={(e) => setAssetForm(s => ({ ...s, purchaseDate: e.target.value }))}
                    className="w-full border rounded-sm p-1"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Initial Location Site:</label>
                  <select 
                    value={assetForm.currentSiteId} 
                    onChange={(e) => setAssetForm(s => ({ ...s, currentSiteId: e.target.value }))}
                    className="w-full bg-white border rounded-sm p-1"
                    required
                  >
                    <option value="general_pool">General Storage Pool (Inventory Pool)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Current Status / Condition:</label>
                  <select 
                    value={assetForm.status} 
                    onChange={(e) => setAssetForm(s => ({ ...s, status: e.target.value as AssetStatus }))}
                    className="w-full bg-white border rounded-sm p-1"
                    required
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Assigned Operator (Worker):</label>
                  <select 
                    value={assetForm.assignedTo} 
                    onChange={(e) => setAssetForm(s => ({ ...s, assignedTo: e.target.value }))}
                    className="w-full bg-white border rounded-sm p-1"
                  >
                    <option value="">No assigned operator (Idle)</option>
                    {workers.map(w => <option key={w.id} value={w.name}>{w.name} ({w.designation})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Capital Asset Remarks:</label>
                <textarea 
                  rows={2}
                  placeholder="Log specific physical tags, barcode information, or warranty due dates..."
                  value={assetForm.remarks} 
                  onChange={(e) => setAssetForm(s => ({ ...s, remarks: e.target.value }))}
                  className="w-full border rounded-sm p-1"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="sap-btn border p-1 px-3 text-slate-600">Cancel</button>
                <button type="submit" className="sap-btn bg-[#0056b3] text-white p-1 px-4 font-bold">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 2: QUICK MOBILIZATION MOVES (TRANSFER) */}
      {isTransferModalOpen && targetAssetForTransfer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded shadow-xl border border-slate-300 flex flex-col text-[11px]">
            <div className="bg-emerald-700 text-white p-2 flex items-center justify-between font-bold text-[11px]">
              <span>TRANSFER DEPLOYMENT GATEPASS</span>
              <button onClick={() => setIsTransferModalOpen(false)} className="hover:opacity-80"><X size={14} /></button>
            </div>

            <form onSubmit={handleSaveTransfer} className="p-3 space-y-3">
              <div className="p-2 bg-slate-50 border rounded-sm">
                <div><span className="font-bold text-slate-500">Asset:</span> <span className="font-bold">{targetAssetForTransfer.name} [{targetAssetForTransfer.assetCode}]</span></div>
                <div><span className="font-bold text-slate-500">From site (Current Location):</span> <span className="font-bold font-mono text-amber-700">{getProjectName(targetAssetForTransfer.currentSiteId)}</span></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Mobilize to Site Location:</label>
                <select 
                  value={transferForm.toSiteId} 
                  onChange={(e) => setTransferForm(s => ({ ...s, toSiteId: e.target.value }))}
                  className="w-full bg-white border rounded-sm p-1 text-[11px]"
                  required
                >
                  <option value="general_pool">General Storage Pool (Return to Inventory)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Transfer Date:</label>
                <input 
                  type="date" 
                  value={transferForm.transferDate} 
                  onChange={(e) => setTransferForm(s => ({ ...s, transferDate: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Responsible Dispatcher / Authorized User:</label>
                <input 
                  type="text" 
                  placeholder="Enter personnel name..."
                  value={transferForm.transferredBy} 
                  onChange={(e) => setTransferForm(s => ({ ...s, transferredBy: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Transfer Remarks / Gatepass Code:</label>
                <textarea 
                  rows={2}
                  placeholder="Transfer reasons or checklist constraints..."
                  value={transferForm.remarks} 
                  onChange={(e) => setTransferForm(s => ({ ...s, remarks: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="sap-btn border p-1 text-slate-600">Cancel</button>
                <button type="submit" className="sap-btn bg-emerald-600 text-white p-1 px-3 font-bold">Transfer Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 3: MAINTENANCE REPAIR LOG */}
      {isMaintenanceModalOpen && targetAssetForMaintenance && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded shadow-xl border border-slate-300 flex flex-col text-[11px]">
            <div className="bg-amber-700 text-white p-2 flex items-center justify-between font-bold text-[11px]">
              <span>PLAN UPKEEP SERVICING LOG</span>
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="hover:opacity-80"><X size={14} /></button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="p-3 space-y-3">
              <div className="p-2 bg-slate-50 border rounded-sm font-bold text-slate-700">
                <span>Selected Tool:</span> {targetAssetForMaintenance.name} [{targetAssetForMaintenance.assetCode}]
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Servicing Date:</label>
                <input 
                  type="date" 
                  value={maintenanceForm.maintenanceDate} 
                  onChange={(e) => setMaintenanceForm(s => ({ ...s, maintenanceDate: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Checkup Type:</label>
                <select 
                  value={maintenanceForm.maintenanceType} 
                  onChange={(e) => setMaintenanceForm(s => ({ ...s, maintenanceType: e.target.value }))}
                  className="w-full bg-white border rounded-sm p-1 text-[11px]"
                  required
                >
                  <option value="Preventive">Preventive Tuneup (Overhaul)</option>
                  <option value="Repair">Breakdown Repair (Action Fix)</option>
                  <option value="Calibration">Inspection & Calibration</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Service Vendor Workshop:</label>
                <input 
                  type="text" 
                  placeholder="Enter repair workshop..."
                  value={maintenanceForm.vendor} 
                  onChange={(e) => setMaintenanceForm(s => ({ ...s, vendor: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Total Service Fee (INR):</label>
                <input 
                  type="number" 
                  placeholder="E.g. 5200"
                  value={maintenanceForm.cost} 
                  onChange={(e) => setMaintenanceForm(s => ({ ...s, cost: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Next Planned Upkeep Date:</label>
                <input 
                  type="date" 
                  value={maintenanceForm.nextMaintenanceDate} 
                  onChange={(e) => setMaintenanceForm(s => ({ ...s, nextMaintenanceDate: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Remarks / Swapped parts:</label>
                <textarea 
                  rows={2}
                  placeholder="Log any parts Swapped, component health indexes..."
                  value={maintenanceForm.remarks} 
                  onChange={(e) => setMaintenanceForm(s => ({ ...s, remarks: e.target.value }))}
                  className="w-full border rounded-sm p-1 text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="sap-btn border p-1 text-slate-600">Cancel</button>
                <button type="submit" className="sap-btn bg-amber-600 text-white p-1 px-3 font-bold">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
