import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Project, Worker, FloorAbstract, FloorAbstractWorker } from '../types';
import { Plus, Trash2, Save, X, Edit, Search, ChevronDown, ChevronUp, LayoutList, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const LEVEL_OPTIONS = [
  'Raft',
  'Plinth Level',
  ...Array.from({ length: 80 }, (_, i) => {
    const num = i + 1;
    let suffix = 'th';
    if (num % 10 === 1 && num % 100 !== 11) suffix = 'st';
    else if (num % 10 === 2 && num % 100 !== 12) suffix = 'nd';
    else if (num % 10 === 3 && num % 100 !== 13) suffix = 'rd';
    return `${num}${suffix} Floor`;
  }),
  'Terrace Floor',
  'LMR',
  'OHT',
  'Mivan Setup'
];

export function FloorAbstracts() {
  const { projects, workers, floorAbstracts, addFloorAbstract, updateFloorAbstract, deleteFloorAbstract, user } = useAppContext();
  
  const [projectId, setProjectId] = useState<string>('');
  const [category, setCategory] = useState<'Amount' | 'Hajira'>('Amount');
  const [level, setLevel] = useState<string>('');
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Row state
  const [srNo, setSrNo] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [averageRate, setAverageRate] = useState<number>(0);
  const [flatHajira, setFlatHajira] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  
  const [rowWorkers, setRowWorkers] = useState<Partial<FloorAbstractWorker>[]>([]);
  
  const [activeTab, setActiveTab] = useState<'entries' | 'worker-summary' | 'floor-summary'>('entries');
  const [summaryLevelFilter, setSummaryLevelFilter] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const updateRowWorkersAndAverage = (updatedWorkers: Partial<FloorAbstractWorker>[]) => {
    setRowWorkers(updatedWorkers);
    if (category === 'Amount') {
      const included = updatedWorkers.filter(w => w.includeInAvg);
      if (included.length > 0) {
        const sum = included.reduce((acc, curr) => acc + (curr.rate || 0), 0);
        setAverageRate(parseFloat((sum / included.length).toFixed(2)));
      } else {
        setAverageRate(0);
      }
    }
  };

  const projectWorkers = useMemo(() => {
    if (!projectId) return [];
    return workers.filter(w => w.projectId === projectId && !w.exitDate);
  }, [projectId, workers]);

  const filteredRecords = floorAbstracts.filter(f => 
    (!projectId || f.projectId === projectId) &&
    (!searchQuery || f.flatNo?.toLowerCase().includes(searchQuery.toLowerCase()) || f.srNo?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const workerSummary = useMemo(() => {
    if (!projectId) return [];
    
    const summaryMap = new Map<string, {
      workerId: string;
      workerSysId: string;
      name: string;
      totalHajira: number;
      payableAmount: number;
      floorsWorked: number;
    }>();
    
    filteredRecords.forEach(record => {
      record.workers.forEach(w => {
        const existing = summaryMap.get(w.workerId);
        const wHajira = record.category === 'Amount' ? (w.hajiraPerWorker || 0) : (w.workerHajira || 0);
        
        if (existing) {
          existing.totalHajira += wHajira;
          existing.payableAmount += w.payableAmount;
          existing.floorsWorked += 1;
        } else {
          const wInfo = projectWorkers.find(pw => pw.id === w.workerId);
          summaryMap.set(w.workerId, {
            workerId: wInfo?.workerId || '-',
            workerSysId: w.workerId,
            name: wInfo?.name || 'Unknown',
            totalHajira: wHajira,
            payableAmount: w.payableAmount,
            floorsWorked: 1
          });
        }
      });
    });
    
    return Array.from(summaryMap.values()).sort((a, b) => b.totalHajira - a.totalHajira);
  }, [projectId, filteredRecords, projectWorkers]);

  const projectSummary = useMemo(() => {
    let totalFloors = 0;
    let totalAmount = 0;
    let totalHajira = 0;
    let totalPayableAmount = 0;
    const workerSet = new Set<string>();

    filteredRecords.forEach(record => {
      totalFloors++;
      if (record.category === 'Amount') {
        totalAmount += record.amount || 0;
        totalHajira += record.totalHajira || 0;
      } else {
        totalHajira += record.flatHajira || 0;
      }
      
      record.workers.forEach(w => {
        totalPayableAmount += w.payableAmount;
        workerSet.add(w.workerId);
      });
    });

    return {
      totalFloors,
      totalAmount,
      totalHajira,
      totalWorkers: workerSet.size,
      averageRate: totalHajira > 0 ? (totalPayableAmount / totalHajira) : 0,
      totalPayableAmount
    };
  }, [filteredRecords]);

  const floorSummaryRows = useMemo(() => {
    if (!summaryLevelFilter) return [];
    
    const rows: any[] = [];
    let floorSr = 1;
    filteredRecords.filter(r => r.level === summaryLevelFilter).forEach(record => {
      if (record.workers.length === 0) return;
      
      record.workers.forEach((w, workerIndex) => {
        const winfo = projectWorkers.find(pw => pw.id === w.workerId);
        
        rows.push({
          isFirstInFloor: workerIndex === 0,
          floorSr: floorSr,
          flatNo: record.flatNo,
          totalAmount: record.category === 'Amount' ? record.amount : undefined,
          averageRate: record.averageRate,
          totalHajira: record.category === 'Amount' ? record.totalHajira : record.flatHajira,
          workerSr: workerIndex + 1,
          workerName: winfo?.name || 'Unknown',
          workerRate: w.rate,
          workerHajira: record.category === 'Amount' ? w.hajiraPerWorker : w.workerHajira,
          payableAmount: w.payableAmount,
          sharePercentage: w.sharePercentage,
          rowSpan: record.workers.length
        });
      });
      floorSr++;
    });
    return rows;
  }, [filteredRecords, projectWorkers, summaryLevelFilter]);

  const exportToExcel = () => {
    const tableData = floorSummaryRows.map(row => ({
      'Floor SR': row.isFirstInFloor ? row.floorSr : '',
      'Flat No': row.isFirstInFloor ? row.flatNo : '',
      'Total Flat Amount': row.isFirstInFloor ? (row.totalAmount || '') : '',
      'Average Rate': row.isFirstInFloor ? (row.averageRate || '') : '',
      'Total Hajira': row.isFirstInFloor ? (row.totalHajira || '') : '',
      'Worker SR': row.workerSr,
      'Worker Name': row.workerName,
      'Rate': row.workerRate,
      'Hajira Per Worker': row.workerHajira,
      'Amount Paid': row.payableAmount,
      'Share%': row.sharePercentage ? `${row.sharePercentage}%` : ''
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Floor Summary");
    XLSX.writeFile(wb, `Floor_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text("Floor Wise Summary", 14, 15);
    
    const tableColumn = ["Floor SR", "Flat No", "Total Flat Amount", "Average Rate", "Total Hajira", "Worker SR", "Worker Name", "Rate", "Hajira Per Worker", "Amount Paid", "Share%"];
    const tableRows = floorSummaryRows.map(row => [
      row.isFirstInFloor ? row.floorSr : '',
      row.isFirstInFloor ? row.flatNo : '',
      row.isFirstInFloor ? (row.totalAmount?.toFixed(2) || '') : '',
      row.isFirstInFloor ? (row.averageRate?.toFixed(2) || '') : '',
      row.isFirstInFloor ? (row.totalHajira?.toFixed(2) || '') : '',
      row.workerSr,
      row.workerName,
      row.workerRate?.toFixed(2) || '',
      row.workerHajira?.toFixed(2) || '',
      row.payableAmount?.toFixed(2) || '',
      row.sharePercentage ? `${row.sharePercentage}%` : ''
    ]);

    // @ts-ignore
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      theme: 'grid',
    });
    
    doc.save(`Floor_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  const resetForm = () => {
    setIsEditing(null);
    setSrNo('');
    setFlatNo('');
    setAmount(0);
    setAverageRate(0);
    setFlatHajira(0);
    setRemarks('');
    setRowWorkers([]);
  };

  const handleEdit = (record: FloorAbstract) => {
    setIsEditing(record.id);
    setProjectId(record.projectId);
    setCategory(record.category);
    setLevel(record.level);
    setSrNo(record.srNo || '');
    setFlatNo(record.flatNo || '');
    setAmount(record.amount || 0);
    setAverageRate(record.averageRate || 0);
    setFlatHajira(record.flatHajira || 0);
    setRemarks(record.remarks || '');
    setRowWorkers(record.workers || []);
  };

  const handleSave = () => {
    if (!projectId || !category || !level || !flatNo) {
      alert("Please fill in Project, Category, Level, and Flat No.");
      return;
    }

    // Prepare workers with calculations
    const finalWorkers = rowWorkers.map((w, index) => {
      const workerInfo = projectWorkers.find(pw => pw.id === w.workerId);
      const rate = w.rate || 0;
      
      let payableAmount = 0;
      let sharePercentage = 0;
      
      if (category === 'Amount') {
        const hajiraPerWorker = w.hajiraPerWorker || 0;
        payableAmount = hajiraPerWorker * rate;
        if (amount > 0) {
          sharePercentage = parseFloat(((payableAmount / amount) * 100).toFixed(2));
        }
        return {
          id: w.id || `temp_${Date.now()}_${index}`,
          workerId: w.workerId || '',
          rate,
          hajiraPerWorker,
          payableAmount,
          sharePercentage,
          includeInAvg: w.includeInAvg
        } as FloorAbstractWorker;
      } else {
        const workerHj = w.workerHajira || 0;
        payableAmount = workerHj * rate;
        return {
          id: w.id || `temp_${Date.now()}_${index}`,
          workerId: w.workerId || '',
          rate,
          workerHajira: workerHj,
          payableAmount,
          includeInAvg: w.includeInAvg
        } as FloorAbstractWorker;
      }
    });

    if (category === 'Amount') {
      const allocatedHajira = finalWorkers.reduce((acc, w) => acc + (w.hajiraPerWorker || 0), 0);
      const calculatedTotalHajira = averageRate > 0 ? parseFloat((amount / averageRate).toFixed(2)) : 0;
      
      const allocatedAmount = finalWorkers.reduce((acc, w) => acc + w.payableAmount, 0);
      
      const hajiraDiff = Math.abs(allocatedHajira - calculatedTotalHajira);
      const amountDiff = Math.abs(allocatedAmount - amount);

      if (hajiraDiff > 0.1 || amountDiff > 5) {
        if (!confirm(
          `Worker Allocation Total has slight mismatch with Floor Amount/Hajira.\n\n` +
          `Allocated Hajira: ${allocatedHajira.toFixed(2)} | Target: ${calculatedTotalHajira.toFixed(2)}\n` +
          `Allocated Amount: ${allocatedAmount.toFixed(2)} | Target: ${amount.toFixed(2)}\n\n` + 
          `Are you sure you want to save anyway?`
        )) {
          return;
        }
      }
    } else {
      const allocatedHajira = finalWorkers.reduce((acc, w) => acc + (w.workerHajira || 0), 0);
      const hajiraDiff = Math.abs(allocatedHajira - flatHajira);
      
      if (hajiraDiff > 0.1) {
        if (!confirm(
          `Worker Allocation Total does not match Floor Hajira.\n\n` +
          `Allocated Hajira: ${allocatedHajira.toFixed(2)} | Target: ${flatHajira.toFixed(2)}\n\n` +
          `Are you sure you want to save anyway?`
        )) {
          return;
        }
      }
    }

    const totalHajira = category === 'Amount' && averageRate > 0 ? parseFloat((amount / averageRate).toFixed(2)) : undefined;

    const payload: Omit<FloorAbstract, 'id'> = {
      projectId,
      category,
      level,
      srNo,
      flatNo,
      amount: category === 'Amount' ? amount : undefined,
      averageRate: category === 'Amount' ? averageRate : undefined,
      totalHajira: category === 'Amount' ? totalHajira : undefined,
      flatHajira: category === 'Hajira' ? flatHajira : undefined,
      workers: finalWorkers,
      remarks
    };

    if (isEditing) {
      updateFloorAbstract(isEditing, payload);
    } else {
      addFloorAbstract(payload);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this Floor Abstract?')) {
      deleteFloorAbstract(id);
    }
  };

  const handleAddWorker = () => {
    const updated = [...rowWorkers, { id: Date.now().toString(), workerId: '', rate: 0, includeInAvg: true }];
    updateRowWorkersAndAverage(updated);
  };

  const handleRemoveWorker = (index: number) => {
    const updated = [...rowWorkers];
    updated.splice(index, 1);
    updateRowWorkersAndAverage(updated);
  };

  const handleWorkerChange = (index: number, workerId: string) => {
    const workerInfo = projectWorkers.find(w => w.id === workerId);
    const updated = [...rowWorkers];
    updated[index] = {
      ...updated[index],
      workerId,
      rate: workerInfo?.dailyRate || 0
    };
    updateRowWorkersAndAverage(updated);
  };

  /* Let's mock fetching rate. In many ERPs, rate is fetched or manually entered. We will add a rate field in the UI. */

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8]">
      <div className="bg-[#002f6c] text-white p-2 flex items-center justify-between sap-header">
        <h2 className="text-lg font-bold font-mono">Floor Abstract</h2>
        {user?.role === 'staff' && !user.allowedModules?.includes('payroll') && (
           <span className="text-xs bg-red-600 px-2 py-0.5 rounded">Read-Only</span>
        )}
      </div>

      <div className="flex border-b border-gray-300 bg-white px-2 pt-2">
        <button 
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'entries' ? 'border-[#002f6c] text-[#002f6c]' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('entries')}
        >
          <LayoutList size={16} className="inline-block mr-1" /> Floor Abstracts
        </button>
        <button 
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'worker-summary' ? 'border-[#002f6c] text-[#002f6c]' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('worker-summary')}
        >
          <Users size={16} className="inline-block mr-1" /> Worker Wise Summary
        </button>
        <button 
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'floor-summary' ? 'border-[#002f6c] text-[#002f6c]' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('floor-summary')}
        >
          <LayoutList size={16} className="inline-block mr-1" /> Floor Wise Summary
        </button>
      </div>

      <div className="p-2 space-y-2 flex-grow overflow-y-auto w-full max-w-7xl mx-auto">
        {activeTab === 'entries' && (
          <>
            {/* Top Filters / Creation */}
        <div className="bg-white border border-[#8c9ba8] p-3 shadow-sm rounded-sm">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
            <h3 className="font-bold text-[#002f6c] text-sm">Create/Edit Floor Abstract</h3>
            <button onClick={resetForm} className="text-blue-600 hover:text-blue-800 text-xs flex items-center">
              <X size={14} className="mr-1" /> Clear Selection
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="sap-label">Project *</label>
              <select className="sap-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="sap-label">Category *</label>
              <select className="sap-input" value={category} onChange={(e) => {
                setCategory(e.target.value as 'Amount' | 'Hajira');
                setRowWorkers([]);
              }}>
                <option value="Amount">Amount</option>
                <option value="Hajira">Hajira</option>
              </select>
            </div>
            <div>
              <label className="sap-label">Level *</label>
              <select className="sap-input" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Select Level</option>
                {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="sap-label">SR No</label>
              <input type="text" className="sap-input" value={srNo} onChange={e => setSrNo(e.target.value)} />
            </div>
            <div>
              <label className="sap-label">Flat No *</label>
              <input type="text" className="sap-input" value={flatNo} onChange={e => setFlatNo(e.target.value)} />
            </div>
            {category === 'Amount' ? (
              <>
                <div>
                  <label className="sap-label">Amount</label>
                  <input type="number" className="sap-input" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                </div>
                <div>
                  <label className="sap-label">Average Rate</label>
                  <input type="number" className="sap-input" value={averageRate} onChange={e => setAverageRate(Number(e.target.value))} />
                </div>
                <div>
                  <label className="sap-label">Total Hajira</label>
                  <div className="sap-input bg-gray-100 flex items-center font-mono text-gray-700">{averageRate > 0 ? (amount / averageRate).toFixed(2) : '0.00'}</div>
                </div>
              </>
            ) : (
              <div>
                <label className="sap-label">Flat Hajira</label>
                <input type="number" className="sap-input" value={flatHajira} onChange={e => setFlatHajira(Number(e.target.value))} />
              </div>
            )}
             <div className="col-span-full">
              <label className="sap-label">Remarks</label>
              <input type="text" className="sap-input" value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
          </div>

        </div>

        {/* Worker Distribution Section */}
        {projectId && category && (
          <div className="bg-white border border-[#8c9ba8] shadow-sm rounded-sm overflow-hidden">
            <div className="bg-[#eef2f6] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
              <h3 className="font-bold text-[#002f6c] text-sm">Worker Distribution</h3>
              <button onClick={handleAddWorker} className="sap-btn sap-btn-blue text-xs flex items-center h-6">
                <Plus size={12} className="mr-1" /> Add Worker
              </button>
            </div>
            
             <div className="p-3 overflow-x-auto">
               <table className="w-full text-left text-[11px] border-collapse border border-[#8c9ba8] whitespace-nowrap bg-white">
                 <thead className="sap-header select-none">
                   <tr className="divide-x divide-[#8c9ba8]">
                     <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Worker Name</th>
                     <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Worker ID</th>
                     <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Rate</th>
                     {category === 'Amount' ? (
                       <>
                         <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-center">Avg Calc</th>
                         <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Hajira Per Worker</th>
                         <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Payable Amount</th>
                         <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Share %</th>
                       </>
                     ) : (
                       <>
                         <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Worker Hajira</th>
                         <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Payable Amount</th>
                       </>
                     )}
                     <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold w-10 text-center">Act</th>
                   </tr>
                 </thead>
                 <tbody>
                   {rowWorkers.length === 0 ? (
                     <tr><td colSpan={7} className="text-center p-4 text-gray-500 italic">No workers added. Click "Add Worker" to begin.</td></tr>
                   ) : rowWorkers.map((w, index) => {
                     const workerInfo = projectWorkers.find(x => x.id === w.workerId);
                     
                     return (
                       <tr key={index} className="hover:bg-[#e6f2ff]">
                         <td className="border border-[#8c9ba8] p-1">
                           <select 
                             className="sap-input !h-6 w-full" 
                             value={w.workerId} 
                             onChange={(e) => {
                               const updated = [...rowWorkers];
                               updated[index] = { ...updated[index], workerId: e.target.value };
                               updateRowWorkersAndAverage(updated);
                             }}
                           >
                             <option value="">Select Worker</option>
                             {projectWorkers.map(pw => <option key={pw.id} value={pw.id}>{pw.name} ({pw.workerId})</option>)}
                           </select>
                         </td>
                         <td className="border border-[#8c9ba8] px-2 py-1 bg-gray-50 text-gray-700 whitespace-nowrap">
                           {workerInfo?.workerId || '-'}
                         </td>
                         <td className="border border-[#8c9ba8] p-1 w-24">
                           <input type="number" className="sap-input !h-6 text-right w-full" value={w.rate || ''} onChange={(e) => {
                             const updated = [...rowWorkers];
                             updated[index] = { ...updated[index], rate: Number(e.target.value) };
                             updateRowWorkersAndAverage(updated);
                           }} />
                         </td>
                         
                         {category === 'Amount' ? (
                           <>
                             <td className="border border-[#8c9ba8] p-1 text-center">
                               <input 
                                 type="checkbox" 
                                 checked={w.includeInAvg || false}
                                 onChange={(e) => {
                                   const updated = [...rowWorkers];
                                   updated[index] = { ...updated[index], includeInAvg: e.target.checked };
                                   updateRowWorkersAndAverage(updated);
                                 }}
                                 className="cursor-pointer h-4 w-4"
                               />
                             </td>
                             <td className="border border-[#8c9ba8] p-1 w-32">
                               <input type="number" className="sap-input !h-6 text-right w-full" value={w.hajiraPerWorker || ''} onChange={(e) => {
                                 const updated = [...rowWorkers];
                                 updated[index] = { ...updated[index], hajiraPerWorker: Number(e.target.value) };
                                 updateRowWorkersAndAverage(updated);
                               }} />
                             </td>
                             <td className="border border-[#8c9ba8] px-2 py-1 bg-gray-50 text-right font-mono">
                               ₹{ ((w.hajiraPerWorker || 0) * (w.rate || 0)).toFixed(2) }
                             </td>
                             <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-blue-900 bg-blue-50">
                               {amount > 0 ? (((w.hajiraPerWorker || 0) * (w.rate || 0) / amount) * 100).toFixed(2) : '0.00'}%
                             </td>
                           </>
                         ) : (
                           <>
                             <td className="border border-[#8c9ba8] p-1 w-32">
                               <input type="number" className="sap-input !h-6 text-right w-full" value={w.workerHajira || ''} onChange={(e) => {
                                 const updated = [...rowWorkers];
                                 updated[index] = { ...updated[index], workerHajira: Number(e.target.value) };
                                 updateRowWorkersAndAverage(updated);
                               }} />
                             </td>
                             <td className="border border-[#8c9ba8] px-2 py-1 bg-gray-50 text-right font-mono">
                               ₹{ ((w.workerHajira || 0) * (w.rate || 0)).toFixed(2) }
                             </td>
                           </>
                         )}
                         <td className="border border-[#8c9ba8] p-1 text-center">
                           <button onClick={() => handleRemoveWorker(index)} className="text-red-600 hover:bg-red-100 p-1 rounded transition-colors">
                             <Trash2 size={12} />
                           </button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
                 {rowWorkers.length > 0 && (
                   <tfoot className="bg-gray-100 font-bold border-t border-[#8c9ba8]">
                     <tr>
                       <td colSpan={category === 'Amount' ? 4 : 3} className="border border-[#8c9ba8] px-2 py-1 text-right">Totals:</td>
                       {category === 'Amount' ? (
                         <>
                           <td className="border border-[#8c9ba8] px-2 py-1 text-right text-blue-800">
                             {rowWorkers.reduce((acc, curr) => acc + (curr.hajiraPerWorker || 0), 0).toFixed(2)}
                           </td>
                           <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-800">
                              ₹{rowWorkers.reduce((acc, curr) => acc + ((curr.hajiraPerWorker || 0) * (curr.rate || 0)), 0).toFixed(2)}
                           </td>
                           <td className="border border-[#8c9ba8] px-2 py-1 text-right text-orange-800">
                             {amount > 0 ? (rowWorkers.reduce((acc, curr) => acc + ((curr.hajiraPerWorker || 0) * (curr.rate || 0)), 0) / amount * 100).toFixed(2) : '0.00'}%
                           </td>
                         </>
                       ) : (
                         <>
                           <td className="border border-[#8c9ba8] px-2 py-1 text-right text-blue-800">
                             {rowWorkers.reduce((acc, curr) => acc + (curr.workerHajira || 0), 0).toFixed(2)}
                           </td>
                           <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-800">
                              ₹{rowWorkers.reduce((acc, curr) => acc + ((curr.workerHajira || 0) * (curr.rate || 0)), 0).toFixed(2)}
                           </td>
                         </>
                       )}
                       <td className="border border-[#8c9ba8]"></td>
                     </tr>
                   </tfoot>
                 )}
               </table>
            </div>

            <div className="bg-[#eef2f6] p-2 border-t border-[#8c9ba8] flex justify-end">
               <button onClick={handleSave} className="sap-btn-primary flex items-center">
                 <Save size={14} className="mr-2" /> {isEditing ? 'Update Floor Abstract' : 'Save Floor Abstract'}
               </button>
            </div>
          </div>
        )}

        {/* Existing Records List */}
        <div className="bg-white border border-[#8c9ba8] shadow-sm rounded-sm overflow-hidden mt-4">
          <div className="bg-[#002f6c] text-white px-3 py-2 flex justify-between items-center sap-header">
            <h3 className="font-bold text-sm">Saved Floor Abstracts</h3>
            <div className="flex items-center space-x-2 w-64">
              <Search size={14} className="text-gray-300" />
              <input 
                type="text" 
                placeholder="Search Flat No or SR..." 
                className="w-full bg-blue-900 border border-blue-700 text-white text-xs p-1 rounded-sm placeholder-blue-300 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-3 mt-4">
            {filteredRecords.length === 0 ? (
              <div className="bg-white border border-[#8c9ba8] shadow-sm rounded-sm p-4 text-center text-gray-500 italic">
                No abstracts found.
              </div>
            ) : (
              filteredRecords.map(record => {
                const totalPayable = record.workers.reduce((sum, w) => sum + w.payableAmount, 0);
                const isExpanded = expandedCards.includes(record.id);
                const hasMismatch = record.category === 'Amount' 
                  ? Math.abs(totalPayable - (record.amount || 0)) > 0.5 
                  : false;

                return (
                  <div key={record.id} className="bg-white border border-[#8c9ba8] shadow-sm rounded-sm overflow-hidden flex flex-col">
                    <div 
                      className="bg-[#002f6c] text-white px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-[#003b86] transition-colors"
                      onClick={() => toggleCardExpand(record.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="font-bold">{record.flatNo} <span className="font-normal text-blue-200 text-xs ml-1">(SR: {record.srNo})</span></div>
                        <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono ${record.category === 'Amount' ? 'bg-blue-100 text-blue-900 border border-blue-500' : 'bg-green-100 text-green-900 border border-green-500'}`}>
                          {record.category}
                        </span>
                        <div className="text-sm border-l border-blue-400 pl-4 ml-2">Level: {record.level}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right mr-4 text-sm font-mono">
                          {record.category === 'Amount' ? (
                            <>Total Amount: <span className="font-bold text-green-300">₹{record.amount?.toFixed(2)}</span></>
                          ) : (
                            <>Flat Hajira: <span className="font-bold text-blue-300">{record.flatHajira?.toFixed(2)}</span></>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    <div className="bg-[#eef2f6] px-3 py-2 border-b border-[#8c9ba8] grid grid-cols-5 gap-2 text-xs">
                       <div className="bg-white p-1 border border-gray-200 rounded">
                         <div className="text-gray-500 mb-0.5">Total Workers</div>
                         <div className="font-bold font-mono text-[#002f6c]">{record.workers.length}</div>
                       </div>
                       <div className="bg-white p-1 border border-gray-200 rounded">
                         <div className="text-gray-500 mb-0.5">Average Rate</div>
                         <div className="font-bold font-mono text-[#002f6c]">₹{record.averageRate?.toFixed(2) || 'N/A'}</div>
                       </div>
                       <div className="bg-white p-1 border border-gray-200 rounded">
                         <div className="text-gray-500 mb-0.5">Total Hajira</div>
                         <div className="font-bold font-mono text-[#002f6c]">{record.totalHajira?.toFixed(2) || record.flatHajira?.toFixed(2) || '0.00'}</div>
                       </div>
                       <div className={`p-1 border rounded ${hasMismatch ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                         <div className="text-gray-500 mb-0.5">Total Payable</div>
                         <div className={`font-bold font-mono ${hasMismatch ? 'text-red-700' : 'text-green-700'}`}>₹{totalPayable.toFixed(2)}</div>
                       </div>
                       <div className={`p-1 border rounded ${hasMismatch ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                         <div className="text-gray-500 mb-0.5">Balance Diff</div>
                         <div className={`font-bold font-mono ${hasMismatch ? 'text-red-700' : 'text-gray-700'}`}>
                           {record.category === 'Amount' ? `₹${(Math.abs(totalPayable - (record.amount || 0))).toFixed(2)}` : 'N/A'}
                         </div>
                       </div>
                    </div>

                    {isExpanded && (
                      <div className="p-0 border-b border-[#8c9ba8]">
                        <table className="w-full text-left text-[11px] border-collapse bg-white">
                           <thead className="bg-[#f8fafc] border-b border-[#8c9ba8]">
                             <tr className="divide-x divide-[#8c9ba8]">
                               <th className="px-2 py-1 font-bold">Worker ID</th>
                               <th className="px-2 py-1 font-bold">Worker Name</th>
                               <th className="px-2 py-1 font-bold text-right">Rate</th>
                               <th className="px-2 py-1 font-bold text-right">{record.category === 'Amount' ? 'Allocated Hajira' : 'Worker Hajira'}</th>
                               <th className="px-2 py-1 font-bold text-right">Payable Amount</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                             {record.workers.map((w, idx) => {
                               const winfo = projectWorkers.find(x => x.id === w.workerId);
                               return (
                                 <tr key={idx} className="divide-x divide-gray-100 hover:bg-gray-50">
                                   <td className="px-2 py-1">{winfo?.workerId || '-'}</td>
                                   <td className="px-2 py-1">{winfo?.name || 'Unknown'}</td>
                                   <td className="px-2 py-1 text-right font-mono">₹{w.rate?.toFixed(2) || '0.00'}</td>
                                   <td className="px-2 py-1 text-right font-mono">{record.category === 'Amount' ? w.hajiraPerWorker?.toFixed(2) : w.workerHajira?.toFixed(2)}</td>
                                   <td className="px-2 py-1 text-right font-mono font-bold text-green-700">₹{w.payableAmount.toFixed(2)}</td>
                                 </tr>
                               );
                             })}
                           </tbody>
                        </table>
                      </div>
                    )}
                    
                    <div className="bg-white px-3 py-2 flex justify-end space-x-2">
                      <button onClick={() => handleEdit(record)} className="sap-btn sap-btn-blue p-1 px-3 flex items-center text-xs">
                        <Edit size={12} className="mr-1" /> Edit
                      </button>
                      <button onClick={() => handleDelete(record.id)} className="sap-btn bg-red-100 text-red-700 border-red-300 hover:bg-red-200 p-1 px-3 flex items-center text-xs">
                         <Trash2 size={12} className="mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Project Summary section at bottom of entries */}
        {filteredRecords.length > 0 && (
          <div className="bg-[#002f6c] text-white p-3 rounded-sm shadow-sm mt-6 mb-4 grid grid-cols-6 gap-4 text-center divide-x divide-blue-800">
            <div>
               <div className="text-blue-300 text-[10px] uppercase font-bold tracking-wider mb-1">Total Floors</div>
               <div className="text-xl font-mono">{projectSummary.totalFloors}</div>
            </div>
            <div>
               <div className="text-blue-300 text-[10px] uppercase font-bold tracking-wider mb-1">Total Amount</div>
               <div className="text-xl font-mono text-green-300">₹{projectSummary.totalAmount.toFixed(2)}</div>
            </div>
            <div>
               <div className="text-blue-300 text-[10px] uppercase font-bold tracking-wider mb-1">Total Hajira</div>
               <div className="text-xl font-mono">{projectSummary.totalHajira.toFixed(2)}</div>
            </div>
            <div>
               <div className="text-blue-300 text-[10px] uppercase font-bold tracking-wider mb-1">Workers Involved</div>
               <div className="text-xl font-mono">{projectSummary.totalWorkers}</div>
            </div>
            <div>
               <div className="text-blue-300 text-[10px] uppercase font-bold tracking-wider mb-1">Project Avg Rate</div>
               <div className="text-xl font-mono">₹{projectSummary.averageRate.toFixed(2)}</div>
            </div>
            <div>
               <div className="text-blue-300 text-[10px] uppercase font-bold tracking-wider mb-1">Total Payable Amount</div>
               <div className="text-xl font-mono font-bold text-yellow-300">₹{projectSummary.totalPayableAmount.toFixed(2)}</div>
            </div>
          </div>
        )}
        </>
        )}
        {activeTab === 'worker-summary' && (
          /* Worker Summary View */
          <div className="bg-white border border-[#8c9ba8] shadow-sm rounded-sm overflow-hidden mt-4">
             <div className="bg-[#eef2f6] text-[#002f6c] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
                <h3 className="font-bold text-sm">Worker Wise Summary</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-[11px] border-collapse bg-white">
                 <thead className="sap-header select-none">
                   <tr className="divide-x divide-[#8c9ba8]">
                     <th className="border border-[#8c9ba8] px-3 py-2 font-bold whitespace-nowrap">Worker ID</th>
                     <th className="border border-[#8c9ba8] px-3 py-2 font-bold whitespace-nowrap">Worker Name</th>
                     <th className="border border-[#8c9ba8] px-3 py-2 font-bold whitespace-nowrap text-right">Total Hajira</th>
                     <th className="border border-[#8c9ba8] px-3 py-2 font-bold whitespace-nowrap text-right">Average Rate</th>
                     <th className="border border-[#8c9ba8] px-3 py-2 font-bold whitespace-nowrap text-center">Floors Worked</th>
                     <th className="border border-[#8c9ba8] px-3 py-2 font-bold whitespace-nowrap text-right">Total Payable Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {workerSummary.length === 0 ? (
                     <tr><td colSpan={6} className="text-center p-4 text-gray-500 italic">No worker data available.</td></tr>
                   ) : workerSummary.map(ws => (
                     <tr key={ws.workerSysId} className="hover:bg-gray-50 divide-x divide-gray-200">
                       <td className="px-3 py-1.5 font-mono text-gray-600">{ws.workerId}</td>
                       <td className="px-3 py-1.5 font-bold text-[#002f6c]">{ws.name}</td>
                       <td className="px-3 py-1.5 text-right font-mono text-blue-700">{ws.totalHajira.toFixed(2)}</td>
                       <td className="px-3 py-1.5 text-right font-mono">₹{(ws.totalHajira > 0 ? (ws.payableAmount / ws.totalHajira) : 0).toFixed(2)}</td>
                       <td className="px-3 py-1.5 text-center font-mono">{ws.floorsWorked}</td>
                       <td className="px-3 py-1.5 text-right font-mono font-bold text-green-700">₹{ws.payableAmount.toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}
        {activeTab === 'floor-summary' && (
           <div className="bg-white border border-[#8c9ba8] shadow-sm rounded-sm overflow-hidden mt-4">
              <div className="bg-[#eef2f6] text-[#002f6c] px-3 py-2 border-b border-[#8c9ba8] flex flex-wrap gap-2 justify-between items-center">
                 <h3 className="font-bold text-sm flex items-center space-x-4">
                   <span>Floor Wise Summary</span>
                   <select 
                     className="sap-input text-xs w-64 font-normal !h-7 bg-white" 
                     value={summaryLevelFilter} 
                     onChange={e => setSummaryLevelFilter(e.target.value)}
                   >
                     <option value="">-- Select Level --</option>
                     {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                 </h3>
                 <div className="flex space-x-2">
                   <button onClick={exportToExcel} disabled={!summaryLevelFilter} className="sap-btn sap-btn-blue text-xs flex items-center p-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed">
                     <Download size={12} className="mr-1" /> Excel
                   </button>
                   <button onClick={exportToPDF} disabled={!summaryLevelFilter} className="sap-btn sap-btn-blue text-xs flex items-center p-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed">
                     <Download size={12} className="mr-1" /> PDF
                   </button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse bg-white">
                  <thead className="sap-header select-none">
                    <tr className="divide-x divide-[#8c9ba8]">
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Floor SR</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Flat No</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-right">Total Flat Amount</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-right">Average Rate</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-right">Total Hajira</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">SR</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Worker Name</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-right">Rate</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-right">Hajira Per Worker</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-right">Amount Paid</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold text-right">Share%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {!summaryLevelFilter ? (
                      <tr><td colSpan={11} className="text-center p-8 text-gray-500 font-medium">Please select a level to view the floor wise summary.</td></tr>
                    ) : floorSummaryRows.length === 0 ? (
                      <tr><td colSpan={11} className="text-center p-4 text-gray-500 italic">No floor data available for this level.</td></tr>
                    ) : floorSummaryRows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 divide-x divide-gray-200">
                        {row.isFirstInFloor ? (
                          <>
                            <td className="px-2 py-1 border-t border-[#8c9ba8] bg-gray-100 text-center font-bold align-top" rowSpan={row.rowSpan}>{row.floorSr}</td>
                            <td className="px-2 py-1 border-t border-[#8c9ba8] bg-gray-100 font-bold align-top" rowSpan={row.rowSpan}>{row.flatNo}</td>
                            <td className="px-2 py-1 border-t border-[#8c9ba8] bg-gray-100 text-right font-mono align-top" rowSpan={row.rowSpan}>{row.totalAmount !== undefined ? row.totalAmount.toFixed(2) : ''}</td>
                            <td className="px-2 py-1 border-t border-[#8c9ba8] bg-gray-100 text-right font-mono align-top" rowSpan={row.rowSpan}>{row.averageRate !== undefined ? row.averageRate.toFixed(2) : ''}</td>
                            <td className="px-2 py-1 border-t border-[#8c9ba8] bg-gray-100 text-right font-mono align-top" rowSpan={row.rowSpan}>{row.totalHajira !== undefined ? row.totalHajira.toFixed(2) : ''}</td>
                          </>
                        ) : null}
                        <td className={`px-2 py-1 font-mono text-center ${row.isFirstInFloor ? 'border-t border-[#8c9ba8]' : ''}`}>{row.workerSr}</td>
                        <td className={`px-2 py-1 ${row.isFirstInFloor ? 'border-t border-[#8c9ba8]' : ''}`}>{row.workerName}</td>
                        <td className={`px-2 py-1 text-right font-mono ${row.isFirstInFloor ? 'border-t border-[#8c9ba8]' : ''}`}>{row.workerRate?.toFixed(2) || ''}</td>
                        <td className={`px-2 py-1 text-right font-mono ${row.isFirstInFloor ? 'border-t border-[#8c9ba8]' : ''}`}>{row.workerHajira?.toFixed(3) || ''}</td>
                        <td className={`px-2 py-1 text-right font-mono ${row.isFirstInFloor ? 'border-t border-[#8c9ba8]' : ''}`}>{row.payableAmount?.toFixed(2) || ''}</td>
                        <td className={`px-2 py-1 text-right font-mono ${row.isFirstInFloor ? 'border-t border-[#8c9ba8]' : ''}`}>{row.sharePercentage ? `${row.sharePercentage}%` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}
      </div>

    </div>
  );
}
