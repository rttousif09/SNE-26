import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { 
  Plus, Trash2, Edit, Printer, FileSpreadsheet, Search, AlertTriangle, 
  Building2, Grid, Calendar, ShoppingCart, Send, RotateCcw, TrendingUp, Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEM_CATEGORIES = ['Civil', 'Structural', 'Electrical', 'Plumbing', 'Finishing', 'Safety', 'Mechanical', 'Others'];
const ITEM_UNITS = ['Nos', 'Kg', 'Ton', 'Sqm', 'Cum', 'Meter', 'Bundle', 'Bag', 'Roll', 'Litre'];
const RETURN_CONDITIONS = ['Good', 'Damaged', 'Scrap'];

export const Materials: React.FC = () => {
  const { 
    projects, 
    materialItems, 
    materialIssues, 
    materialReturns, 
    materialPurchases,
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
    user
  } = useAppContext();

  // Active ERP Tab
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'master' | 'purchase' | 'issue' | 'return' | 'ledger'>('dashboard');

  // Search/Filters
  const [filterProject, setFilterProject] = useState('all');
  const [filterItem, setFilterItem] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. --- MASTER STATE ---
  const [isEditingMaster, setIsEditingMaster] = useState<string | null>(null);
  const [masterForm, setMasterForm] = useState({
    itemCode: '',
    itemName: '',
    category: 'Civil',
    unit: 'Nos',
    description: ''
  });

  // 2. --- PURCHASE STATE ---
  const [isEditingPurchase, setIsEditingPurchase] = useState<string | null>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseVoucherNo: '',
    supplierName: '',
    supplierMobile: '',
    gstNo: '',
    projectId: '',
    itemId: '',
    qty: 0,
    rate: 0,
    transportCharges: 0,
    loadingCharges: 0,
    otherCharges: 0,
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // 3. --- ISSUE STATE ---
  const [isEditingIssue, setIsEditingIssue] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState({
    voucherNo: '',
    issueDate: new Date().toISOString().split('T')[0],
    projectId: '',
    tower: '',
    floor: '',
    itemId: '',
    qty: 0,
    issuedTo: '',
    remarks: ''
  });

  // 4. --- RETURN STATE ---
  const [isEditingReturn, setIsEditingReturn] = useState<string | null>(null);
  const [returnForm, setReturnForm] = useState({
    voucherNo: '',
    returnDate: new Date().toISOString().split('T')[0],
    projectId: '',
    tower: '',
    floor: '',
    itemId: '',
    qty: 0,
    returnedBy: '',
    condition: 'Good' as 'Good' | 'Damaged' | 'Scrap',
    remarks: ''
  });

  // 5. --- LEDGER STATE ---
  const [ledgerProjectId, setLedgerProjectId] = useState('');
  const [ledgerItemId, setLedgerItemId] = useState('');

  // ----------------------------------------------------
  // AUTO VOUCHER GENERATOR HELPER
  // ----------------------------------------------------
  const getNextVoucherNo = (type: 'PUR' | 'ISS' | 'RET') => {
    const year = new Date().getFullYear();
    if (type === 'PUR') {
      const matchCount = materialPurchases.length;
      return `PUR-${year}-${String(matchCount + 1).padStart(4, '0')}`;
    } else if (type === 'ISS') {
      const matchCount = materialIssues.length;
      return `ISS-${year}-${String(matchCount + 1).padStart(4, '0')}`;
    } else {
      const matchCount = materialReturns.length;
      return `RET-${year}-${String(matchCount + 1).padStart(4, '0')}`;
    }
  };

  // ----------------------------------------------------
  // STOCK BALANCE CALCULATIONS ENGINE
  // ----------------------------------------------------
  const inventoryBalances = useMemo(() => {
    // Balances is site-wise and item-wise details
    // Map with key: `${projectId}_${itemId}`
    const balances: { [key: string]: { 
      projectId: string; 
      itemId: string; 
      purchased: number; 
      issued: number; 
      returnedGood: number; 
      returnedDamaged: number; 
      returnedScrap: number; 
    }} = {};

    // 1. Process Purchases (+ to site balance)
    materialPurchases.forEach(p => {
      const key = `${p.projectId}_${p.itemId}`;
      if (!balances[key]) {
        balances[key] = { projectId: p.projectId, itemId: p.itemId, purchased: 0, issued: 0, returnedGood: 0, returnedDamaged: 0, returnedScrap: 0 };
      }
      balances[key].purchased += (p.qty || 0);
    });

    // 2. Process Issues (- from site balance)
    materialIssues.forEach(i => {
      const key = `${i.projectId}_${i.itemId}`;
      if (!balances[key]) {
        balances[key] = { projectId: i.projectId, itemId: i.itemId, purchased: 0, issued: 0, returnedGood: 0, returnedDamaged: 0, returnedScrap: 0 };
      }
      balances[key].issued += (i.qty || 0);
    });

    // 3. Process Returns (+ back to site balance or ledger record)
    materialReturns.forEach(r => {
      const key = `${r.projectId}_${r.itemId}`;
      if (!balances[key]) {
        balances[key] = { projectId: r.projectId, itemId: r.itemId, purchased: 0, issued: 0, returnedGood: 0, returnedDamaged: 0, returnedScrap: 0 };
      }
      if (r.condition === 'Good') {
        balances[key].returnedGood += (r.qty || 0);
      } else if (r.condition === 'Damaged') {
        balances[key].returnedDamaged += (r.qty || 0);
      } else {
        balances[key].returnedScrap += (r.qty || 0);
      }
    });

    return Object.values(balances).map(b => {
      const totalReturned = b.returnedGood + b.returnedDamaged + b.returnedScrap;
      
      // Stock available at site = Purchased - Issued + Returned (Good Reusable)
      // Damaged/Scrap usually goes out or gets written off, but client asked for net consumption: "Net Consumption = (Purchase + Returns) - Issues" or similar, wait
      // User requested: Net Consumption = Issued - Returned 
      // Running Balance = Available at Site = Purchased + Returned_Good - Issued
      const netConsumption = Math.max(0, b.issued - totalReturned);
      const availableBalance = Math.max(0, (b.purchased + b.returnedGood) - b.issued);

      return {
        ...b,
        netConsumption,
        availableBalance,
        totalReturned
      };
    });
  }, [materialPurchases, materialIssues, materialReturns]);

  // Overall Item Balances summary
  const overallItemBalances = useMemo(() => {
    const summary: { [itemId: string]: { 
      itemId: string; 
      purchased: number; 
      issued: number; 
      returned: number; 
      available: number; 
    }} = {};

    inventoryBalances.forEach(b => {
      if (!summary[b.itemId]) {
        summary[b.itemId] = { itemId: b.itemId, purchased: 0, issued: 0, returned: 0, available: 0 };
      }
      summary[b.itemId].purchased += b.purchased;
      summary[b.itemId].issued += b.issued;
      summary[b.itemId].returned += b.totalReturned;
      summary[b.itemId].available += b.availableBalance;
    });

    return Object.values(summary);
  }, [inventoryBalances]);

  // ----------------------------------------------------
  // LEDGER GENERATOR ENGINE
  // ----------------------------------------------------
  const materialLedger = useMemo(() => {
    if (!ledgerProjectId || !ledgerItemId) return [];

    const ledgerEntries: any[] = [];

    // Filter relevant purchases
    materialPurchases
      .filter(p => p.projectId === ledgerProjectId && p.itemId === ledgerItemId)
      .forEach(p => {
        ledgerEntries.push({
          date: p.purchaseDate,
          voucherNo: p.purchaseVoucherNo,
          type: 'Purchase',
          qtyIn: p.qty,
          qtyOut: 0,
          description: `Purchased from ${p.supplierName}`,
          raw: p
        });
      });

    // Filter relevant issues
    materialIssues
      .filter(i => i.projectId === ledgerProjectId && i.itemId === ledgerItemId)
      .forEach(i => {
        ledgerEntries.push({
          date: i.issueDate,
          voucherNo: i.voucherNo,
          type: 'Issue',
          qtyIn: 0,
          qtyOut: i.qty,
          description: `Issued to ${i.issuedTo}${i.tower ? ` (T: ${i.tower}, F: ${i.floor})` : ''}`,
          raw: i
        });
      });

    // Filter relevant returns
    materialReturns
      .filter(r => r.projectId === ledgerProjectId && r.itemId === ledgerItemId)
      .forEach(r => {
        ledgerEntries.push({
          date: r.returnDate,
          voucherNo: r.voucherNo,
          type: 'Return',
          qtyIn: r.condition === 'Good' ? r.qty : 0, // only good goes back to main inventory, but log everything
          qtyOut: 0,
          description: `Returned by ${r.returnedBy} (${r.condition})`,
          raw: r
        });
      });

    // Sort chronologically
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute Running Balance
    let balance = 0;
    return ledgerEntries.map(entry => {
      // Net change for available balance at site
      balance += entry.qtyIn - entry.qtyOut;
      return {
        ...entry,
        runningBalance: balance
      };
    });
  }, [ledgerProjectId, ledgerItemId, materialPurchases, materialIssues, materialReturns]);

  // ----------------------------------------------------
  // HANDLERS FOR FORMS
  // ----------------------------------------------------
  const handleSaveMaster = () => {
    if (!masterForm.itemName) {
      alert('Please fill in a valid Material Name.');
      return;
    }
    if (isEditingMaster === 'new') {
      addMaterialItem(masterForm);
    } else if (isEditingMaster) {
      updateMaterialItem(isEditingMaster, masterForm);
    }
    setIsEditingMaster(null);
  };

  const handleSavePurchase = () => {
    if (!purchaseForm.projectId || !purchaseForm.itemId || !purchaseForm.qty || !purchaseForm.rate) {
      alert('Missing required fields: Site, Item, Quantity, or Rate.');
      return;
    }

    const totalAmount = purchaseForm.qty * purchaseForm.rate;
    const grandTotal = totalAmount + Number(purchaseForm.transportCharges || 0) + Number(purchaseForm.loadingCharges || 0) + Number(purchaseForm.otherCharges || 0);

    const dataToSave = {
      ...purchaseForm,
      totalAmount,
      grandTotal,
      purchaseVoucherNo: purchaseForm.purchaseVoucherNo || getNextVoucherNo('PUR')
    };

    if (isEditingPurchase === 'new') {
      addMaterialPurchase(dataToSave);
    } else if (isEditingPurchase) {
      updateMaterialPurchase(isEditingPurchase, dataToSave);
    }
    setIsEditingPurchase(null);
  };

  const handleSaveIssue = () => {
    if (!issueForm.projectId || !issueForm.itemId || !issueForm.qty || !issueForm.issuedTo) {
      alert('Missing core parameters for issue entry.');
      return;
    }

    // Verify stock balance before issuing
    const currentSiteBal = inventoryBalances.find(b => b.projectId === issueForm.projectId && b.itemId === issueForm.itemId);
    const avail = currentSiteBal?.availableBalance || 0;
    if (issueForm.qty > avail) {
      const confirmProceed = confirm(`Warning: Available site balance is only ${avail} units. You are issuing ${issueForm.qty} units. Do you wish to override and proceed?`);
      if (!confirmProceed) return;
    }

    const dataToSave = {
      ...issueForm,
      voucherNo: issueForm.voucherNo || getNextVoucherNo('ISS')
    };

    if (isEditingIssue === 'new') {
      addMaterialIssue(dataToSave);
    } else if (isEditingIssue) {
      updateMaterialIssue(isEditingIssue, dataToSave);
    }
    setIsEditingIssue(null);
  };

  const handleSaveReturn = () => {
    if (!returnForm.projectId || !returnForm.itemId || !returnForm.qty || !returnForm.returnedBy) {
      alert('Missing core parameters for return entry.');
      return;
    }

    const dataToSave = {
      ...returnForm,
      voucherNo: returnForm.voucherNo || getNextVoucherNo('RET')
    };

    if (isEditingReturn === 'new') {
      addMaterialReturn(dataToSave);
    } else if (isEditingReturn) {
      updateMaterialReturn(isEditingReturn, dataToSave);
    }
    setIsEditingReturn(null);
  };

  // ----------------------------------------------------
  // EXPORTS
  // ----------------------------------------------------
  const exportPDFLedger = () => {
    if (!ledgerProjectId || !ledgerItemId) return;
    const doc = new jsPDF();
    
    const proj = projects.find(p => p.id === ledgerProjectId);
    const item = materialItems.find(i => i.id === ledgerItemId);

    doc.setFontSize(14);
    doc.text(`MATERIAL LEDGER - ${proj?.name || 'Site'}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Material Item: ${item?.itemName || 'Item'} (${item?.unit || ''})`, 14, 22);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 27);

    const rows = materialLedger.map((l, index) => [
      index + 1,
      l.date,
      l.voucherNo,
      l.type,
      l.qtyIn || '-',
      l.qtyOut || '-',
      l.runningBalance,
      l.description
    ]);

    autoTable(doc, {
      startY: 33,
      head: [['Sr No', 'Date', 'Voucher No', 'Transaction Type', 'Qty Received', 'Qty Issued', 'Running Balance', 'Details']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
      bodyStyles: { fontSize: 8 }
    });

    doc.save(`Ledger_${proj?.name || 'Site'}_${item?.itemName || 'Item'}.pdf`);
  };

  // CSV Export for Site Balances Grid
  const exportSiteBalancesCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Site Name,Material Name,Category,Unit,Total Purchased,Total Issued,Total Returned,Net Consumption,Running Balance\n';

    inventoryBalances.forEach(b => {
      const proj = projects.find(p => p.id === b.projectId);
      const item = materialItems.find(i => i.id === b.itemId);
      if (proj && item) {
        csvContent += `"${proj.name}","${item.itemName}","${item.category}","${item.unit}",${b.purchased},${b.issued},${b.totalReturned},${b.netConsumption},${b.availableBalance}\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Site_wise_Stock_Balances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f6] text-[11px] font-sans overflow-hidden">
      {/* Sub Tabs/Toolbar Navigation */}
      <div className="flex items-center space-x-1 border-b border-[#b2c0cc] bg-white px-2 py-1 print:hidden">
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsEditingMaster(null); }}
          className={`px-3 py-1 border-r border-[#b2c0cc] font-semibold flex items-center gap-1 ${activeTab === 'dashboard' ? 'text-[#0056b3] bg-[#e1edf7]' : 'text-gray-600 hover:text-black'}`}
        >
          <Grid size={12} /> Dashboard & Balances
        </button>
        <button 
          onClick={() => { setActiveTab('master'); setIsEditingMaster(null); }}
          className={`px-3 py-1 border-r border-[#b2c0cc] font-semibold flex items-center gap-1 ${activeTab === 'master' ? 'text-[#0056b3] bg-[#e1edf7]' : 'text-gray-600 hover:text-black'}`}
        >
          <Building2 size={12} /> Material Master
        </button>
        <button 
          onClick={() => { setActiveTab('purchase'); setIsEditingMaster(null); }}
          className={`px-3 py-1 border-r border-[#b2c0cc] font-semibold flex items-center gap-1 ${activeTab === 'purchase' ? 'text-[#0056b3] bg-[#e1edf7]' : 'text-gray-600 hover:text-black'}`}
        >
          <ShoppingCart size={12} /> Purchases (Inward)
        </button>
        <button 
          onClick={() => { setActiveTab('issue'); setIsEditingMaster(null); }}
          className={`px-3 py-1 border-r border-[#b2c0cc] font-semibold flex items-center gap-1 ${activeTab === 'issue' ? 'text-[#0056b3] bg-[#e1edf7]' : 'text-gray-600 hover:text-black'}`}
        >
          <Send size={12} /> Material Issues
        </button>
        <button 
          onClick={() => { setActiveTab('return'); setIsEditingMaster(null); }}
          className={`px-3 py-1 border-r border-[#b2c0cc] font-semibold flex items-center gap-1 ${activeTab === 'return' ? 'text-[#0056b3] bg-[#e1edf7]' : 'text-gray-600 hover:text-black'}`}
        >
          <RotateCcw size={12} /> Returns (Outward)
        </button>
        <button 
          onClick={() => { setActiveTab('ledger'); setIsEditingMaster(null); }}
          className={`px-3 py-1 font-semibold flex items-center gap-1 ${activeTab === 'ledger' ? 'text-[#0056b3] bg-[#e1edf7]' : 'text-gray-600 hover:text-black'}`}
        >
          <TrendingUp size={12} /> Material Ledger Reports
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {/* =========================================================================
            1. DASHBOARD & BALANCES VIEW
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Master Catalog Items</span>
                  <div className="text-lg font-bold text-slate-800">{materialItems.length} Items</div>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded">
                  <Grid size={18} />
                </div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Purchased Volume</span>
                  <div className="text-lg font-bold text-emerald-800">
                    {materialPurchases.reduce((sum, p) => sum + (p.qty || 0), 0).toLocaleString()} Qty
                  </div>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                  <ShoppingCart size={18} />
                </div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Issued Volume</span>
                  <div className="text-lg font-bold text-[#b88c00]">
                    {materialIssues.reduce((sum, i) => sum + (i.qty || 0), 0).toLocaleString()} Qty
                  </div>
                </div>
                <div className="p-2 bg-yellow-50 text-[#b58105] rounded">
                  <Send size={18} />
                </div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Returned Volume</span>
                  <div className="text-lg font-bold text-violet-800">
                    {materialReturns.reduce((sum, r) => sum + (r.qty || 0), 0).toLocaleString()} Qty
                  </div>
                </div>
                <div className="p-2 bg-violet-50 text-violet-600 rounded">
                  <RotateCcw size={18} />
                </div>
              </div>

              <div className="bg-white p-3 border border-[#b2c0cc] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Low Stock Warnings</span>
                  <div className="text-lg font-bold text-red-600">
                    {inventoryBalances.filter(b => b.availableBalance <= 15).length} Alerts
                  </div>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded animate-pulse">
                  <AlertTriangle size={18} />
                </div>
              </div>
            </div>

            {/* Main dashboard list layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {/* Balances List Table (3/4 Width) */}
              <div className="lg:col-span-3 bg-white border border-[#b2c0cc]">
                <div className="bg-[#eef2f6] px-2 py-1.5 border-b border-[#b2c0cc] flex items-center justify-between">
                  <span className="font-semibold text-[11px] text-[#0056b3]">Site-wise Current Material Stock Balances</span>
                  <button onClick={exportSiteBalancesCSV} className="sap-btn-xs text-[10px] bg-slate-100 hover:bg-slate-200 border border-gray-400 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <FileSpreadsheet size={10} /> Export Stock Sheet (CSV)
                  </button>
                </div>

                <div className="p-2 bg-slate-50 border-b border-[#d1dce6] flex gap-2">
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-700">Filter Project:</span>
                    <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="sap-input">
                      <option value="all">All Project Sites</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-700">Filter Material:</span>
                    <select value={filterItem} onChange={(e) => setFilterItem(e.target.value)} className="sap-input">
                      <option value="all">All Items</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName}</option>)}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="sap-table w-full">
                    <thead>
                      <tr>
                        <th>Site Name</th>
                        <th>Material Item</th>
                        <th>Category</th>
                        <th className="text-right">Total Inward (A)</th>
                        <th className="text-right">Total Issued (B)</th>
                        <th className="text-right">Returned Good (C)</th>
                        <th className="text-right">Net Consumption (B - Total Returned)</th>
                        <th className="text-right">Available Stock (A + C - B)</th>
                        <th>Unit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryBalances
                        .filter(b => {
                          const mProj = filterProject === 'all' || b.projectId === filterProject;
                          const mItem = filterItem === 'all' || b.itemId === filterItem;
                          return mProj && mItem;
                        })
                        .map((b, idx) => {
                          const proj = projects.find(p => p.id === b.projectId);
                          const item = materialItems.find(i => i.id === b.itemId);
                          const isLow = b.availableBalance <= 15;
                          if (!proj || !item) return null;

                          return (
                            <tr key={idx} className={isLow ? 'bg-red-50/50' : 'hover:bg-slate-50'}>
                              <td className="font-medium text-slate-800">{proj.name}</td>
                              <td className="font-bold text-slate-900">{item.itemName}</td>
                              <td>{item.category}</td>
                              <td className="text-right font-mono text-emerald-700 font-bold">{b.purchased}</td>
                              <td className="text-right font-mono text-amber-700 font-bold">{b.issued}</td>
                              <td className="text-right font-mono text-slate-700">{b.returnedGood}</td>
                              <td className="text-right font-mono text-rose-700">{b.netConsumption}</td>
                              <td className={`text-right font-mono font-bold ${isLow ? 'text-red-600 animate-pulse' : 'text-blue-700'}`}>{b.availableBalance}</td>
                              <td className="text-gray-500 font-medium">{item.unit}</td>
                              <td>
                                {isLow ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold flex items-center gap-1 w-fit">
                                    <AlertTriangle size={10} /> Low Stock
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 font-medium w-fit block">
                                    In Stock
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {inventoryBalances.length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-gray-500">
                            No active material transactions mapped to generate balances. Populate Purchases, Issues or Returns first.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar alerts and notifications panels (1/4 Width) */}
              <div className="space-y-3">
                {/* Condition-wise Return Analysis Summary */}
                <div className="bg-white border border-[#b2c0cc] p-3">
                  <div className="border-b border-[#b2c0cc] pb-1.5 mb-2 flex items-center gap-1">
                    <RotateCcw size={12} className="text-violet-600" />
                    <span className="font-bold text-[11px] text-[#0056b3]">Return Condition Analysis</span>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const good = materialReturns.filter(r => r.condition === 'Good').reduce((sum, r) => sum + (r.qty || 0), 0);
                      const damaged = materialReturns.filter(r => r.condition === 'Damaged').reduce((sum, r) => sum + (r.qty || 0), 0);
                      const scrap = materialReturns.filter(r => r.condition === 'Scrap').reduce((sum, r) => sum + (r.qty || 0), 0);
                      const total = good + damaged + scrap || 1;

                      return (
                        <>
                          <div>
                            <div className="flex justify-between text-[10px] font-semibold text-slate-700">
                              <span>Good / Reusable Asset</span>
                              <span>{good} qty ({Math.round(good/total*100)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-green-500 h-full" style={{ width: `${good/total*100}%` }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-semibold text-slate-700">
                              <span>Damaged Materials</span>
                              <span>{damaged} qty ({Math.round(damaged/total*100)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-amber-500 h-full" style={{ width: `${damaged/total*100}%` }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-semibold text-slate-700">
                              <span>Scrap Write-offs</span>
                              <span>{scrap} qty ({Math.round(scrap/total*100)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-red-500 h-full" style={{ width: `${scrap/total*100}%` }}></div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Info Note block */}
                <div className="bg-blue-55/40 border border-blue-200 p-3 rounded">
                  <div className="font-bold text-blue-900 mb-1 flex items-center gap-1">
                    <Info size={12} /> ERP Inventory Controls
                  </div>
                  <p className="text-blue-800 leading-relaxed text-[10.5px]">
                    Site balance values are auto-computed dynamically. Register a Material Purchase (Inward) to increase site supply. Record Material Issues to subtract and allocate stock to sub-contractors or building phases. Returns add reusable materials back into live site stock registers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            2. MATERIAL MASTER CATALOG
            ========================================================================= */}
        {activeTab === 'master' && (
          <div className="space-y-3">
            {/* Master Creation Trigger Form */}
            {isEditingMaster && (
              <div className="bg-white border border-[#b2c0cc] p-3">
                <div className="font-semibold text-[#0056b3] border-b border-[#b2c0cc] pb-2 mb-3">
                  {isEditingMaster === 'new' ? 'Register New Material Master Item' : 'Edit Material Master Item'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Item Code (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CMT-OPC43"
                      className="sap-input w-full"
                      value={masterForm.itemCode}
                      onChange={(e) => setMasterForm({ ...masterForm, itemCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Item Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. OPC 43 Portland Cement"
                      className="sap-input w-full"
                      value={masterForm.itemName}
                      onChange={(e) => setMasterForm({ ...masterForm, itemName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Category *</label>
                    <select 
                      className="sap-input w-full"
                      value={masterForm.category}
                      onChange={(e) => setMasterForm({ ...masterForm, category: e.target.value })}
                    >
                      {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Unit of Measure *</label>
                    <select 
                      className="sap-input w-full"
                      value={masterForm.unit}
                      onChange={(e) => setMasterForm({ ...masterForm, unit: e.target.value })}
                    >
                      {ITEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Description / Spec</label>
                    <input 
                      type="text" 
                      placeholder="e.g. UltraTech Grade 43 Cement"
                      className="sap-input w-full"
                      value={masterForm.description}
                      onChange={(e) => setMasterForm({ ...masterForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setIsEditingMaster(null)} className="sap-btn bg-slate-200 hover:bg-slate-300 border border-gray-400">Cancel</button>
                  <button onClick={handleSaveMaster} className="sap-btn">Save Item</button>
                </div>
              </div>
            )}

            {/* List Table Grid of Master Items */}
            <div className="bg-white border border-[#b2c0cc]">
              <div className="bg-[#eef2f6] px-2 py-1.5 border-b border-[#b2c0cc] flex items-center justify-between">
                <span className="font-semibold text-[#0056b3]">Registered Material Master Items</span>
                {!isEditingMaster && (
                  <button 
                    onClick={() => {
                      setMasterForm({ itemCode: '', itemName: '', category: 'Civil', unit: 'Bag', description: '' });
                      setIsEditingMaster('new');
                    }}
                    className="sap-btn-xs"
                  >
                    <Plus size={10} className="mr-0.5" /> Append Material Item
                  </button>
                )}
              </div>

              {/* Simple Filter */}
              <div className="p-2 bg-slate-50 border-b border-[#d1dce6] flex gap-3">
                <div className="flex items-center space-x-1 flex-1 max-w-sm">
                  <Search size={12} className="text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search material items by name/code..." 
                    className="sap-input w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="sap-table w-full">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">Sr.</th>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Standard Unit</th>
                      <th>Specification / Description</th>
                      <th>Created By</th>
                      <th>Created Date</th>
                      <th className="w-24 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialItems
                      .filter(item => {
                        const sQuery = searchQuery.toLowerCase();
                        return (
                          item.itemName.toLowerCase().includes(sQuery) ||
                          (item.itemCode || '').toLowerCase().includes(sQuery) ||
                          item.category.toLowerCase().includes(sQuery)
                        );
                      })
                      .map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="text-center font-mono">{index + 1}</td>
                          <td className="font-mono font-semibold text-[#0056b3]">{item.itemCode || 'N/A'}</td>
                          <td className="font-bold text-slate-900">{item.itemName}</td>
                          <td>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-300">
                              {item.category}
                            </span>
                          </td>
                          <td className="font-semibold text-slate-700">{item.unit}</td>
                          <td className="text-gray-500">{item.description || '-'}</td>
                          <td>{item.createdBy || 'System'}</td>
                          <td className="font-mono text-gray-500">{item.createdDate}</td>
                          <td className="text-center">
                            <div className="flex justify-center gap-1.5">
                              <button 
                                onClick={() => {
                                  setMasterForm({
                                    itemCode: item.itemCode || '',
                                    itemName: item.itemName,
                                    category: item.category,
                                    unit: item.unit,
                                    description: item.description || ''
                                  });
                                  setIsEditingMaster(item.id);
                                }}
                                className="text-slate-600 hover:text-[#0056b3] tooltip"
                                title="Edit Material Item"
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(`Delete '${item.itemName}' from the material master catalog? This is permanent.`)) {
                                    deleteMaterialItem(item.id);
                                  }
                                }}
                                className="text-slate-500 hover:text-red-500 tooltip"
                                title="Delete from Master"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {materialItems.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-gray-500">
                          The Material Master Catalog is currently empty. Click "Append Material Item" to start.
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
            3. PURCHASES (INWARD TRANSACTIONS)
            ========================================================================= */}
        {activeTab === 'purchase' && (
          <div className="space-y-3">
            {/* Purchase creation form */}
            {isEditingPurchase && (
              <div className="bg-white border border-[#b2c0cc] p-3">
                <div className="font-semibold text-[#0056b3] border-b border-[#b2c0cc] pb-2 mb-3">
                  {isEditingPurchase === 'new' ? 'Add Material Purchase Record' : 'Edit Material Purchase Record'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Purchase Date *</label>
                    <input 
                      type="date" 
                      className="sap-input w-full"
                      value={purchaseForm.purchaseDate}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Voucher No (Auto)</label>
                    <input 
                      type="text" 
                      disabled 
                      className="sap-input w-full bg-slate-100 font-mono text-gray-500"
                      value={purchaseForm.purchaseVoucherNo || getNextVoucherNo('PUR')}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Project Site Name *</label>
                    <select 
                      className="sap-input w-full"
                      value={purchaseForm.projectId}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, projectId: e.target.value })}
                    >
                      <option value="">-- Select Site --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Material Item *</label>
                    <select 
                      className="sap-input w-full"
                      value={purchaseForm.itemId}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, itemId: e.target.value })}
                    >
                      <option value="">-- Select Material --</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Qty Purchased *</label>
                    <input 
                      type="number" 
                      className="sap-input w-full font-mono text-right"
                      value={purchaseForm.qty || ''}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Rate per unit *</label>
                    <input 
                      type="number" 
                      className="sap-input w-full font-mono text-right"
                      value={purchaseForm.rate || ''}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Computed Material Amount</label>
                    <input 
                      type="text" 
                      disabled 
                      className="sap-input w-full font-mono bg-slate-100 text-right text-slate-700 font-bold"
                      value={(purchaseForm.qty * purchaseForm.rate).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Supplier Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. UltraTech Distributors"
                      className="sap-input w-full"
                      value={purchaseForm.supplierName}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Supplier Mobile</label>
                    <input 
                      type="text" 
                      placeholder="10-digit mobile"
                      className="sap-input w-full"
                      value={purchaseForm.supplierMobile}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierMobile: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">GST Registration No</label>
                    <input 
                      type="text" 
                      placeholder="15-character GSTIN"
                      className="sap-input w-full uppercase font-mono"
                      value={purchaseForm.gstNo}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, gstNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Transport Charges</label>
                    <input 
                      type="number" 
                      className="sap-input w-full font-mono text-right"
                      value={purchaseForm.transportCharges || ''}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, transportCharges: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Loading/Unloading fees</label>
                    <input 
                      type="number" 
                      className="sap-input w-full font-mono text-right"
                      value={purchaseForm.loadingCharges || ''}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, loadingCharges: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Other Surcharge</label>
                    <input 
                      type="number" 
                      className="sap-input w-full font-mono text-right"
                      value={purchaseForm.otherCharges || ''}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, otherCharges: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Supplier Invoice Number</label>
                    <input 
                      type="text" 
                      placeholder="Inv-99831/25"
                      className="sap-input w-full font-mono"
                      value={purchaseForm.invoiceNumber}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Invoice Date</label>
                    <input 
                      type="date" 
                      className="sap-input w-full"
                      value={purchaseForm.invoiceDate}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Remarks/Allocation</label>
                    <input 
                      type="text" 
                      placeholder="Cement for Tower A basement slab"
                      className="sap-input w-full"
                      value={purchaseForm.remarks}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, remarks: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[12px] font-bold text-slate-800">
                    Grand Total Composed: <span className="text-[#0056b3] text-sm">
                      {((purchaseForm.qty * purchaseForm.rate) + 
                        Number(purchaseForm.transportCharges || 0) + 
                        Number(purchaseForm.loadingCharges || 0) + 
                        Number(purchaseForm.otherCharges || 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingPurchase(null)} className="sap-btn bg-slate-200 hover:bg-slate-300 border border-gray-400">Cancel</button>
                    <button onClick={handleSavePurchase} className="sap-btn">Save Purchase Voucher</button>
                  </div>
                </div>
              </div>
            )}

            {/* List and registers of purchases */}
            <div className="bg-white border border-[#b2c0cc]">
              <div className="bg-[#eef2f6] px-2 py-1.5 border-b border-[#b2c0cc] flex items-center justify-between">
                <span className="font-semibold text-[#0056b3]">Registered Material Purchase Vouchers (Inward Master Register)</span>
                {!isEditingPurchase && (
                  <button 
                    onClick={() => {
                      setPurchaseForm({
                        purchaseDate: new Date().toISOString().split('T')[0],
                        purchaseVoucherNo: getNextVoucherNo('PUR'),
                        supplierName: '',
                        supplierMobile: '',
                        gstNo: '',
                        projectId: projects[0]?.id || '',
                        itemId: materialItems[0]?.id || '',
                        qty: 0,
                        rate: 0,
                        transportCharges: 0,
                        loadingCharges: 0,
                        otherCharges: 0,
                        invoiceNumber: '',
                        invoiceDate: new Date().toISOString().split('T')[0],
                        remarks: ''
                      });
                      setIsEditingPurchase('new');
                    }}
                    className="sap-btn-xs"
                  >
                    <Plus size={10} className="mr-0.5" /> Direct Purchase Receipt
                  </button>
                )}
              </div>

              {/* Registers Table */}
              <div className="overflow-x-auto">
                <table className="sap-table w-full">
                  <thead>
                    <tr>
                      <th>Voucher No</th>
                      <th>Date</th>
                      <th>Site Address</th>
                      <th>Material Item</th>
                      <th className="text-right">Qty</th>
                      <th>Unit</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Add-on (Transport+unloading)</th>
                      <th className="text-right">Total Amount Paid</th>
                      <th>Supplier Details</th>
                      <th>Invoice No & Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialPurchases.map(p => {
                      const proj = projects.find(pr => pr.id === p.projectId);
                      const item = materialItems.find(it => it.id === p.itemId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="font-mono font-bold text-[#0056b3]">{p.purchaseVoucherNo}</td>
                          <td className="font-mono text-gray-600">{p.purchaseDate}</td>
                          <td className="font-semibold text-slate-800">{proj?.name || 'Unknown Site'}</td>
                          <td className="font-bold text-slate-900">{item?.itemName || 'Deleted material'}</td>
                          <td className="text-right font-mono font-semibold text-slate-800">{p.qty}</td>
                          <td className="text-gray-500 font-medium">{item?.unit}</td>
                          <td className="text-right font-mono text-gray-600">₹{p.rate}</td>
                          <td className="text-right font-mono text-gray-500">₹{p.transportCharges + p.loadingCharges + p.otherCharges}</td>
                          <td className="text-right font-mono font-bold text-emerald-800">₹{p.grandTotal.toLocaleString('en-IN')}</td>
                          <td>
                            <div className="text-[10.5px]">
                              <p className="font-semibold text-slate-800">{p.supplierName}</p>
                              <p className="text-gray-500 font-mono text-[9.5px]">Mob: {p.supplierMobile} {p.gstNo ? `| GST: ${p.gstNo}` : ''}</p>
                            </div>
                          </td>
                          <td className="font-mono text-gray-500 text-[10px]">
                            {p.invoiceNumber ? `${p.invoiceNumber} (${p.invoiceDate})` : '-'}
                          </td>
                          <td>
                            <div className="flex gap-1.5 justify-center">
                              <button 
                                onClick={() => {
                                  setPurchaseForm({
                                    purchaseDate: p.purchaseDate,
                                    purchaseVoucherNo: p.purchaseVoucherNo,
                                    supplierName: p.supplierName,
                                    supplierMobile: p.supplierMobile,
                                    gstNo: p.gstNo || '',
                                    projectId: p.projectId,
                                    itemId: p.itemId,
                                    qty: p.qty,
                                    rate: p.rate,
                                    transportCharges: p.transportCharges,
                                    loadingCharges: p.loadingCharges,
                                    otherCharges: p.otherCharges,
                                    invoiceNumber: p.invoiceNumber || '',
                                    invoiceDate: p.invoiceDate || '',
                                    remarks: p.remarks || ''
                                  });
                                  setIsEditingPurchase(p.id);
                                }}
                                className="text-slate-600 hover:text-[#0056b3]"
                              >
                                <Edit size={11} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm("Delete this purchase receipt? Running balances across sites will update automatically.")) {
                                    deleteMaterialPurchase(p.id);
                                  }
                                }}
                                className="text-slate-500 hover:text-red-500"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {materialPurchases.length === 0 && (
                      <tr>
                        <td colSpan={12} className="text-center py-8 text-gray-500">
                          No inward purchase vouchers registered in ERP database. Check "Direct Purchase Receipt" to add inventory.
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
            4. ISSUES (OUTWARD TRANSACTIONS)
            ========================================================================= */}
        {activeTab === 'issue' && (
          <div className="space-y-3">
            {/* Issue Creation Form */}
            {isEditingIssue && (
              <div className="bg-white border border-[#b2c0cc] p-3">
                <div className="font-semibold text-[#0056b3] border-b border-[#b2c0cc] pb-2 mb-3">
                  {isEditingIssue === 'new' ? 'Issue Materials from Site Stock' : 'Edit Allocation Voucher'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Issue Date *</label>
                    <input 
                      type="date" 
                      className="sap-input w-full"
                      value={issueForm.issueDate}
                      onChange={(e) => setIssueForm({ ...issueForm, issueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Allocation Voucher No (Auto)</label>
                    <input 
                      type="text" 
                      disabled 
                      className="sap-input w-full bg-slate-100 font-mono text-gray-500"
                      value={issueForm.voucherNo || getNextVoucherNo('ISS')}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Project Site Area *</label>
                    <select 
                      className="sap-input w-full"
                      value={issueForm.projectId}
                      onChange={(e) => setIssueForm({ ...issueForm, projectId: e.target.value })}
                    >
                      <option value="">-- Select Site --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Material to Dispatch *</label>
                    <select 
                      className="sap-input w-full"
                      value={issueForm.itemId}
                      onChange={(e) => setIssueForm({ ...issueForm, itemId: e.target.value })}
                    >
                      <option value="">-- Select Material --</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Tower (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tower B"
                      className="sap-input w-full"
                      value={issueForm.tower}
                      onChange={(e) => setIssueForm({ ...issueForm, tower: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Floor (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 5th Floor"
                      className="sap-input w-full"
                      value={issueForm.floor}
                      onChange={(e) => setIssueForm({ ...issueForm, floor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Quantity to Issue *</label>
                    <input 
                      type="number" 
                      className="sap-input w-full font-mono text-right"
                      value={issueForm.qty || ''}
                      onChange={(e) => setIssueForm({ ...issueForm, qty: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Issued To (Recipient Name) *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rajesh Kumar (Subconst.)"
                      className="sap-input w-full"
                      value={issueForm.issuedTo}
                      onChange={(e) => setIssueForm({ ...issueForm, issuedTo: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-gray-700 font-semibold mb-1">Remarks / Remarks</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Columns concreting, floor mix ratio 1:2:4"
                      className="sap-input w-full"
                      value={issueForm.remarks}
                      onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setIsEditingIssue(null)} className="sap-btn bg-slate-200 hover:bg-slate-300 border border-gray-400">Cancel</button>
                  <button onClick={handleSaveIssue} className="sap-btn">Disburse Assets</button>
                </div>
              </div>
            )}

            {/* List and registry table of issues */}
            <div className="bg-white border border-[#b2c0cc]">
              <div className="bg-[#eef2f6] px-2 py-1.5 border-b border-[#b2c0cc] flex items-center justify-between">
                <span className="font-semibold text-[#0056b3]">Registered Material Issue Logs (Outward Site Allocation Ledger)</span>
                {!isEditingIssue && (
                  <button 
                    onClick={() => {
                      setIssueForm({
                        voucherNo: getNextVoucherNo('ISS'),
                        issueDate: new Date().toISOString().split('T')[0],
                        projectId: projects[0]?.id || '',
                        tower: '',
                        floor: '',
                        itemId: materialItems[0]?.id || '',
                        qty: 0,
                        issuedTo: '',
                        remarks: ''
                      });
                      setIsEditingIssue('new');
                    }}
                    className="sap-btn-xs"
                  >
                    <Plus size={10} className="mr-0.5" /> Register Outward Issue
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="sap-table w-full">
                  <thead>
                    <tr>
                      <th>Voucher No</th>
                      <th>Issue Date</th>
                      <th>Site Location</th>
                      <th>Location Sub-Phase</th>
                      <th>Allocated Material</th>
                      <th className="text-right">Qty Issued</th>
                      <th>UoM</th>
                      <th>Disbursed Recipient</th>
                      <th>Remarks & Target Specs</th>
                      <th className="w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialIssues.map(i => {
                      const proj = projects.find(p => p.id === i.projectId);
                      const item = materialItems.find(it => it.id === i.itemId);
                      return (
                        <tr key={i.id} className="hover:bg-slate-50">
                          <td className="font-mono font-bold text-[#0056b3]">{i.voucherNo}</td>
                          <td className="font-mono text-gray-600">{i.issueDate}</td>
                          <td className="font-semibold text-slate-800">{proj?.name || 'Deleted Project'}</td>
                          <td>
                            {i.tower || i.floor ? (
                              <span className="text-[10px] bg-slate-100 border px-1.5 py-0.5 rounded text-slate-700">
                                {i.tower || ''} {i.floor ? `| ${i.floor}` : ''}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="font-bold text-slate-900">{item?.itemName || 'Deleted material'}</td>
                          <td className="text-right font-mono font-bold text-amber-700">{i.qty}</td>
                          <td className="text-gray-500">{item?.unit}</td>
                          <td className="font-semibold text-slate-800">{i.issuedTo}</td>
                          <td className="text-gray-500">{i.remarks || '-'}</td>
                          <td className="text-center">
                            <div className="flex gap-1.5 justify-center">
                              <button 
                                onClick={() => {
                                  setIssueForm({
                                    voucherNo: i.voucherNo,
                                    issueDate: i.issueDate,
                                    projectId: i.projectId,
                                    tower: i.tower || '',
                                    floor: i.floor || '',
                                    itemId: i.itemId,
                                    qty: i.qty,
                                    issuedTo: i.issuedTo,
                                    remarks: i.remarks || ''
                                  });
                                  setIsEditingIssue(i.id);
                                }}
                                className="text-slate-600 hover:text-[#0056b3]"
                              >
                                <Edit size={11} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm("Cancel this outward material issue entry? Site stock balances will update immediately.")) {
                                    deleteMaterialIssue(i.id);
                                  }
                                }}
                                className="text-slate-500 hover:text-red-500"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {materialIssues.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-gray-500">
                          No material issue records found. Click "Register Outward Issue" to allocate stock.
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
            5. RETURNS (INDWARD TRANSACTIONS FROM OUTWARD WORK)
            ========================================================================= */}
        {activeTab === 'return' && (
          <div className="space-y-3">
            {/* Returns Entry Forms */}
            {isEditingReturn && (
              <div className="bg-white border border-[#b2c0cc] p-3">
                <div className="font-semibold text-[#0056b3] border-b border-[#b2c0cc] pb-2 mb-3">
                  {isEditingReturn === 'new' ? 'Register Return Entry' : 'Edit Return Record'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Return Date *</label>
                    <input 
                      type="date" 
                      className="sap-input w-full"
                      value={returnForm.returnDate}
                      onChange={(e) => setReturnForm({ ...returnForm, returnDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Reference / Return Voucher No</label>
                    <input 
                      type="text" 
                      disabled 
                      className="sap-input w-full bg-slate-100 font-mono text-gray-500"
                      value={returnForm.voucherNo || getNextVoucherNo('RET')}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Site Returning From *</label>
                    <select 
                      className="sap-input w-full"
                      value={returnForm.projectId}
                      onChange={(e) => setReturnForm({ ...returnForm, projectId: e.target.value })}
                    >
                      <option value="">-- Select Site --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Returned Material Item *</label>
                    <select 
                      className="sap-input w-full"
                      value={returnForm.itemId}
                      onChange={(e) => setReturnForm({ ...returnForm, itemId: e.target.value })}
                    >
                      <option value="">-- Select Material --</option>
                      {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Tower (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tower B"
                      className="sap-input w-full"
                      value={returnForm.tower}
                      onChange={(e) => setReturnForm({ ...returnForm, tower: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Floor (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 5th Floor"
                      className="sap-input w-full"
                      value={returnForm.floor}
                      onChange={(e) => setReturnForm({ ...returnForm, floor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Quantity Returned *</label>
                    <input 
                      type="number" 
                      className="sap-input w-full font-mono text-right"
                      value={returnForm.qty || ''}
                      onChange={(e) => setReturnForm({ ...returnForm, qty: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Condition of Returned Material *</label>
                    <select 
                      className="sap-input w-full font-semibold"
                      value={returnForm.condition}
                      onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value as 'Good' | 'Damaged' | 'Scrap' })}
                    >
                      {RETURN_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Returned By (Worker / Subconst.) *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rajkumar Tiles"
                      className="sap-input w-full"
                      value={returnForm.returnedBy}
                      onChange={(e) => setReturnForm({ ...returnForm, returnedBy: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-gray-700 font-semibold mb-1">Remarks</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Leftover tiles from lobby, reusable"
                      className="sap-input w-full"
                      value={returnForm.remarks}
                      onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setIsEditingReturn(null)} className="sap-btn bg-slate-200 hover:bg-slate-300 border border-gray-400">Cancel</button>
                  <button onClick={handleSaveReturn} className="sap-btn">Save Return Voucher</button>
                </div>
              </div>
            )}

            {/* Past Returns Table Register */}
            <div className="bg-white border border-[#b2c0cc]">
              <div className="bg-[#eef2f6] px-2 py-1.5 border-b border-[#b2c0cc] flex items-center justify-between">
                <span className="font-semibold text-[#0056b3]">Registered Material Returns (Inward Re-entry Registrar)</span>
                {!isEditingReturn && (
                  <button 
                    onClick={() => {
                      setReturnForm({
                        voucherNo: getNextVoucherNo('RET'),
                        returnDate: new Date().toISOString().split('T')[0],
                        projectId: projects[0]?.id || '',
                        tower: '',
                        floor: '',
                        itemId: materialItems[0]?.id || '',
                        qty: 0,
                        returnedBy: '',
                        condition: 'Good',
                        remarks: ''
                      });
                      setIsEditingReturn('new');
                    }}
                    className="sap-btn-xs"
                  >
                    <Plus size={10} className="mr-0.5" /> Direct Stock Return Entry
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="sap-table w-full">
                  <thead>
                    <tr>
                      <th>Voucher / Ref No</th>
                      <th>Return Date</th>
                      <th>Source Site</th>
                      <th>Location details</th>
                      <th>Material Item</th>
                      <th className="text-right">Qty Returned</th>
                      <th>Unit</th>
                      <th>Condition</th>
                      <th>Returned By</th>
                      <th>Remarks / Justification</th>
                      <th className="w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialReturns.map(r => {
                      const proj = projects.find(p => p.id === r.projectId);
                      const item = materialItems.find(it => it.id === r.itemId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="font-mono font-bold text-[#0056b3]">{r.voucherNo || 'RET-FreeHand'}</td>
                          <td className="font-mono text-gray-600">{r.returnDate}</td>
                          <td className="font-semibold text-slate-800">{proj?.name || 'Deleted site'}</td>
                          <td>{r.tower || r.floor ? `${r.tower || ''} ${r.floor || ''}` : '-'}</td>
                          <td className="font-bold text-slate-900">{item?.itemName || 'Deleted item'}</td>
                          <td className="text-right font-mono font-bold text-slate-800">{r.qty}</td>
                          <td className="text-gray-500">{item?.unit}</td>
                          <td>
                            {r.condition === 'Good' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-800 font-bold">Good</span>}
                            {r.condition === 'Damaged' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">Damaged</span>}
                            {r.condition === 'Scrap' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-bold">Scrap</span>}
                          </td>
                          <td className="font-medium text-slate-700">{r.returnedBy}</td>
                          <td className="text-gray-500">{r.remarks || '-'}</td>
                          <td className="text-center">
                            <div className="flex gap-1.5 justify-center">
                              <button 
                                onClick={() => {
                                  setReturnForm({
                                    voucherNo: r.voucherNo || '',
                                    returnDate: r.returnDate,
                                    projectId: r.projectId,
                                    tower: r.tower || '',
                                    floor: r.floor || '',
                                    itemId: r.itemId,
                                    qty: r.qty,
                                    returnedBy: r.returnedBy,
                                    condition: r.condition,
                                    remarks: r.remarks || ''
                                  });
                                  setIsEditingReturn(r.id);
                                }}
                                className="text-slate-600 hover:text-[#0056b3]"
                              >
                                <Edit size={11} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm("Delete this material return entry permanently?")) {
                                    deleteMaterialReturn(r.id);
                                  }
                                }}
                                className="text-slate-500 hover:text-red-500"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {materialReturns.length === 0 && (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-gray-500">
                          No outward material returns registered in ERP yet. Use "Direct Stock Return Entry" to register.
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
            6. CHRONOLOGICAL SITE-WISE MATERIAL LEDGER
            ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="space-y-3">
            <div className="bg-white border border-[#b2c0cc] p-3">
              <div className="font-semibold text-[#0056b3] border-b border-[#b2c0cc] pb-2 mb-3">
                Generate Chronological Site-wise Material Ledger Statement
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Target Project Site Asset *</label>
                  <select 
                    className="sap-input w-full"
                    value={ledgerProjectId}
                    onChange={(e) => setLedgerProjectId(e.target.value)}
                  >
                    <option value="">-- Select Project Site --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Target Material Item *</label>
                  <select 
                    className="sap-input w-full"
                    value={ledgerItemId}
                    onChange={(e) => setLedgerItemId(e.target.value)}
                  >
                    <option value="">-- Select Material Item --</option>
                    {materialItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                  </select>
                </div>
                <div>
                  <button 
                    onClick={exportPDFLedger}
                    disabled={!ledgerProjectId || !ledgerItemId || materialLedger.length === 0}
                    className="sap-btn w-full flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    <Printer size={13} /> Export PDF Ledger Statement
                  </button>
                </div>
              </div>
            </div>

            {/* Ledger Results */}
            {ledgerProjectId && ledgerItemId ? (
              <div className="bg-white border border-[#b2c0cc]">
                <div className="bg-[#eef2f6] px-2 py-1.5 border-b border-[#b2c0cc] flex items-center justify-between">
                  <span className="font-semibold text-[#0056b3]">
                    Chronological Ledger Trace (Site: {' '}
                    <strong className="text-slate-800">
                      {projects.find(p => p.id === ledgerProjectId)?.name}
                    </strong> 
                    {' '}| Item: {' '}
                    <strong className="text-slate-800">
                      {materialItems.find(i => i.id === ledgerItemId)?.itemName}
                    </strong>
                    )
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="sap-table w-full">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">Sr. No</th>
                        <th>Transaction Date</th>
                        <th>Voucher No</th>
                        <th>Transaction Type</th>
                        <th className="text-right">Quantity Inward (+)</th>
                        <th className="text-right">Quantity Outward (-)</th>
                        <th className="text-right">Site Running Balance</th>
                        <th>Transaction Audit Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialLedger.map((l, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="text-center font-mono">{idx + 1}</td>
                          <td className="font-mono text-gray-600">{l.date}</td>
                          <td className="font-mono font-semibold text-[#0056b3]">{l.voucherNo}</td>
                          <td>
                            {l.type === 'Purchase' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">Purchase Inflow</span>}
                            {l.type === 'Issue' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-medium">Site Dispatch</span>}
                            {l.type === 'Return' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 font-medium font-bold">Return entry</span>}
                          </td>
                          <td className="text-right font-mono text-emerald-600 font-medium">{l.qtyIn || '-'}</td>
                          <td className="text-right font-mono text-amber-600 font-medium">{l.qtyOut || '-'}</td>
                          <td className="text-right font-mono font-bold text-blue-700">{l.runningBalance}</td>
                          <td>
                            <span className="text-slate-700">{l.description}</span>
                          </td>
                        </tr>
                      ))}
                      {materialLedger.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-500">
                            No ledger transactions recorded for this combination of Site and Material.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#b2c0cc] p-8 text-center text-gray-500">
                Please select a high-level Project Site and Material Item from the selects above to load the running balance audit trace.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
