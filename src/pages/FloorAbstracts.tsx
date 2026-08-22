import React, { useState, useMemo } from 'react';
import { SAPSelect } from '../components/SAPSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../store';
import { Project, Worker, FloorAbstract, FloorAbstractWorker } from '../types';
import { Plus, Trash2, Save, X, Edit, Search, ChevronDown, ChevronUp, LayoutList, Users, Download, GitFork } from 'lucide-react';
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
  
  const isReadOnly = user?.role === 'Viewer' || user?.username === 'saddamsne';
  
  const [projectId, setProjectId] = useState<string>('');
  const [towerName, setTowerName] = useState<string>('');
  const [category, setCategory] = useState<'Amount' | 'Hajira'>('Amount');
  const [level, setLevel] = useState<string>('');
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  
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
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterTower, setFilterTower] = useState<string>('');

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

  const selectedProjectObj = useMemo(() => {
    return projects.find(p => p.id === projectId);
  }, [projectId, projects]);

  const availableTowers = useMemo(() => {
    return selectedProjectObj?.towerNames || [];
  }, [selectedProjectObj]);

  const filterTowersList = useMemo(() => {
    if (!projectId) {
      return Array.from(new Set(floorAbstracts.map(f => f.towerName).filter(Boolean))) as string[];
    }
    return availableTowers;
  }, [projectId, availableTowers, floorAbstracts]);

  const projectWorkers = useMemo(() => {
    if (!projectId) return [];
    return workers.filter(w => w.projectId === projectId && !w.exitDate);
  }, [projectId, workers]);

  const filteredRecords = useMemo(() => {
    return floorAbstracts.filter(f => {
      // 1. Project Filter
      if (projectId && f.projectId !== projectId) return false;

      // 2. Level Filter
      if (filterLevel && f.level !== filterLevel) return false;

      // 3. Category Filter
      if (filterCategory && f.category !== filterCategory) return false;

      // 4. Tower Filter
      if (filterTower && f.towerName !== filterTower) return false;

      // 5. Search Filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();

      // Check flatNo or srNo
      if (f.flatNo?.toLowerCase().includes(query) || f.srNo?.toLowerCase().includes(query)) {
        return true;
      }

      // Check level
      if (f.level?.toLowerCase().includes(query)) return true;

      // Check tower name
      if (f.towerName?.toLowerCase().includes(query)) return true;

      // Check worker names/IDs
      const hasMatchingWorker = f.workers.some(w => {
        const winfo = workers.find(x => x.id === w.workerId);
        return (
          winfo?.name?.toLowerCase().includes(query) || 
          winfo?.workerId?.toLowerCase().includes(query)
        );
      });
      if (hasMatchingWorker) return true;

      return false;
    });
  }, [floorAbstracts, projectId, filterLevel, filterCategory, filterTower, searchQuery, workers]);

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
          towerName: record.towerName || '',
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
          rowSpan: record.workers.length,
          remarks: record.remarks || ''
        });
      });
      floorSr++;
    });
    return rows;
  }, [filteredRecords, projectWorkers, summaryLevelFilter]);

  const sortLevels = (levels: string[]) => {
    return [...levels].sort((a, b) => {
      const idxA = LEVEL_OPTIONS.indexOf(a);
      const idxB = LEVEL_OPTIONS.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  const exportToExcel = () => {
    const tableData = floorSummaryRows.map(row => ({
      'Floor SR': row.isFirstInFloor ? row.floorSr : '',
      'Tower/Block': row.isFirstInFloor ? row.towerName : '',
      'Flat No': row.isFirstInFloor ? row.flatNo : '',
      'Total Flat Amount': row.isFirstInFloor ? (row.totalAmount || '') : '',
      'Average Rate': row.isFirstInFloor ? (row.averageRate || '') : '',
      'Total Hajira': row.isFirstInFloor ? (row.totalHajira || '') : '',
      'Worker SR': row.workerSr,
      'Worker Name': row.workerName,
      'Rate': row.workerRate,
      'Hajira Per Worker': row.workerHajira,
      'Amount Paid': row.payableAmount,
      'Share%': row.sharePercentage ? `${row.sharePercentage}%` : '',
      'Remarks': row.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Floor Summary");
    XLSX.writeFile(wb, `Floor_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    const projectName = project ? project.name.toUpperCase() : 'UNKNOWN PROJECT';
    const clientName = project ? (project.clientName || 'SN ENTERPRISES').toUpperCase() : 'SN ENTERPRISES';
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const doc = new jsPDF('landscape');
    
    // Determine which levels to export
    const levelsToExport = summaryLevelFilter 
      ? [summaryLevelFilter] 
      : sortLevels(Array.from(new Set(floorAbstracts.filter(f => f.projectId === projectId).map(r => r.level).filter(Boolean))));

    if (levelsToExport.length === 0) {
      alert("No floor abstract records found for this project.");
      return;
    }

    let grandTotalAmount = 0;
    let grandTotalHajira = 0;
    let grandTotalWorkerPay = 0;
    let tableIndex = 0;

    // Helper to get rows for a level
    const getLevelSummaryRows = (lvl: string) => {
      const rows: any[] = [];
      let floorSr = 1;
      
      const recordsToUse = floorAbstracts.filter(f => 
        f.projectId === projectId && f.level === lvl
      );

      recordsToUse.forEach(record => {
        if (record.workers.length === 0) return;
        
        record.workers.forEach((w, workerIndex) => {
          const winfo = workers.find(pw => pw.id === w.workerId);
          
          rows.push({
            isFirstInFloor: workerIndex === 0,
            floorSr: floorSr,
            towerName: record.towerName || '',
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
            rowSpan: record.workers.length,
            remarks: record.remarks || ''
          });
        });
        floorSr++;
      });
      return rows;
    };

    // Reusable function to draw A4 landscape page header frame
    const drawPageHeaderBlock = (pdfDoc: typeof doc, pageNum: number) => {
      const pdfWidth = pdfDoc.internal.pageSize.width; // 297mm
      
      // Page outer frame/border
      pdfDoc.setDrawColor(0, 47, 108); // `#002f6c`
      pdfDoc.setLineWidth(0.5);
      pdfDoc.rect(10, 10, pdfWidth - 20, 190);
      
      // Secondary inline soft border
      pdfDoc.setDrawColor(200, 210, 225);
      pdfDoc.setLineWidth(0.1);
      pdfDoc.rect(11, 11, pdfWidth - 22, 188);

      // Main Brand Title header box
      pdfDoc.setFillColor(238, 242, 246);
      pdfDoc.rect(12, 12, pdfWidth - 24, 25, 'F');
      
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(22);
      pdfDoc.setTextColor(0, 47, 108); // deep blue
      pdfDoc.text("SN ENTERPRISES", 16, 22);
      
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(8);
      pdfDoc.setTextColor(110, 120, 130);
      pdfDoc.text("CIVIL CONTRACTORS & INFRASTRUCTURE DEVELOPERS", 16, 26);
      pdfDoc.setDrawColor(0, 47, 108);
      pdfDoc.setLineWidth(1);
      pdfDoc.line(16, 28, 112, 28);
      
      // Document type on right
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(11);
      pdfDoc.setTextColor(0, 47, 108);
      pdfDoc.text("FLAT/FLOOR ABSTRACT WORK SHEET", pdfWidth - 110, 20);

      // Info details grid row
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(8.5);
      pdfDoc.setTextColor(50, 50, 50);
      
      pdfDoc.text("PROJECT SITE:", 16, 33);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(projectName, 44, 33);

      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("CLIENT / DEVELOPER:", 16, 36);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(clientName, 53, 36);

      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("DATE OF EXPORT:", pdfWidth - 110, 33);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(dateStr, pdfWidth - 75, 33);

      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("CATEGORY BASIS:", pdfWidth - 110, 36);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(category.toUpperCase() + ' BASIS', pdfWidth - 75, 36);

      // Page numbers & footer
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(8);
      pdfDoc.setTextColor(120, 120, 120);
      pdfDoc.text(`Page ${pageNum}`, pdfWidth - 25, 196);
      pdfDoc.text("SN ENTERPRISES - SITE ABSTRACTS REPORT REGISTER", 14, 196);
    };

    // Draw separate tables for each level
    levelsToExport.forEach((lvl) => {
      const levelRows = getLevelSummaryRows(lvl);
      if (levelRows.length === 0) return;

      if (tableIndex > 0) {
        doc.addPage();
      }
      tableIndex++;

      const pageNum = doc.getNumberOfPages();
      drawPageHeaderBlock(doc, pageNum);

      // Floor Section label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(0, 47, 108);
      doc.text(`FLOOR LEVEL SUMMARY: ${lvl.toUpperCase()}`, 14, 44);

      // Underline for floor level
      doc.setDrawColor(0, 47, 108);
      doc.setLineWidth(0.5);
      doc.line(14, 46, doc.internal.pageSize.width - 14, 46);

      const tableColumn = [
        "Floor SR", 
        "Tower/Block",
        "Flat No", 
        `Total Amount (${category === 'Amount' ? '₹' : '-'})`, 
        "Average Rate (₹)", 
        "Total Hajira", 
        "Worker SR", 
        "Worker Name", 
        "Rate (₹)", 
        "Worker Hajira", 
        "Amount Paid (₹)", 
        "Share %", 
        "Remarks"
      ];

      const levelTotalAmount = levelRows
        .filter(r => r.isFirstInFloor)
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const levelTotalHajira = levelRows
        .filter(r => r.isFirstInFloor)
        .reduce((sum, r) => sum + (r.totalHajira || 0), 0);
      const levelTotalWorkerPay = levelRows
        .reduce((sum, r) => sum + (r.payableAmount || 0), 0);

      // Accumulate Grand Totals
      grandTotalAmount += levelTotalAmount;
      grandTotalHajira += levelTotalHajira;
      grandTotalWorkerPay += levelTotalWorkerPay;

      const bodyData = levelRows.map(row => [
        row.isFirstInFloor ? row.floorSr : '',
        row.isFirstInFloor ? row.towerName : '',
        row.isFirstInFloor ? row.flatNo : '',
        row.isFirstInFloor ? (row.totalAmount !== undefined ? row.totalAmount.toFixed(2) : '') : '',
        row.isFirstInFloor ? (row.averageRate !== undefined ? row.averageRate.toFixed(2) : '') : '',
        row.isFirstInFloor ? (row.totalHajira !== undefined ? row.totalHajira.toFixed(2) : '') : '',
        row.workerSr,
        row.workerName,
        row.workerRate !== undefined ? row.workerRate.toFixed(2) : '',
        row.workerHajira !== undefined ? row.workerHajira.toFixed(3) : '',
        row.payableAmount !== undefined ? row.payableAmount.toFixed(2) : '',
        row.sharePercentage ? `${row.sharePercentage}%` : '',
        row.remarks || ''
      ]);

      // Add subtotal row specifier
      bodyData.push([
        "SUBTOTAL", 
        "", 
        "", 
        levelTotalAmount > 0 ? levelTotalAmount.toFixed(2) : "-", 
        "", 
        levelTotalHajira.toFixed(2), 
        "", 
        "", 
        "", 
        "", 
        levelTotalWorkerPay.toFixed(2), 
        "", 
        `Totals for Level ${lvl}`
      ]);

      // @ts-ignore
      doc.autoTable({
        head: [tableColumn],
        body: bodyData,
        startY: 49,
        margin: { left: 14, right: 14 },
        styles: { 
          fontSize: 7.5,
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [0, 47, 108], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7.5
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' }, // Floor SR
          1: { cellWidth: 18, halign: 'left' },   // Tower/Block
          2: { cellWidth: 15, halign: 'left' },   // Flat No
          3: { cellWidth: 22, halign: 'right' },  // Total Flat Amount
          4: { cellWidth: 18, halign: 'right' },  // Average Rate
          5: { cellWidth: 18, halign: 'right' },  // Total Hajira
          6: { cellWidth: 12, halign: 'center' }, // Worker SR
          7: { cellWidth: 38, halign: 'left' },   // Worker Name
          8: { cellWidth: 15, halign: 'right' },  // Rate
          9: { cellWidth: 20, halign: 'right' },  // Hajira Paid
          10: { cellWidth: 22, halign: 'right' }, // Amount Paid
          11: { cellWidth: 15, halign: 'right' }, // Share %
          12: { cellWidth: 30, halign: 'left' }   // Remarks
        },
        theme: 'grid',
        didParseCell: function(data: any) {
          const firstCellVal = data.row.cells[0]?.raw;
          if (firstCellVal === 'SUBTOTAL' || firstCellVal === 'GRAND TOTAL') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 246]; // `#eef2f6`
            data.cell.styles.textColor = [0, 47, 108]; // Deep blue `#002f6c`
          }
        }
      });
    });

    // Draw Grand Summary & Approval page
    if (levelsToExport.length > 0) {
      doc.addPage();
      const pageNum = doc.getNumberOfPages();
      drawPageHeaderBlock(doc, pageNum);

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 47, 108);
      doc.text("GRAND SUMMARY & APPROVAL REPORT", 14, 45);

      doc.setDrawColor(0, 47, 108);
      doc.setLineWidth(1);
      doc.line(14, 47, doc.internal.pageSize.width - 14, 47);

      const columnsSummary = [
        "Description Profile", 
        "Amount Basis Valuations (INR)", 
        "Estimated Total Hajiras", 
        "Total Net Worker Allocation Paid (INR)",
        "Overall Ledger Status"
      ];

      const rowsSummary = [
        [
          "PROJECT WORK ABSTRACTS GRAND TOTALS",
          grandTotalAmount > 0 ? `INR ${grandTotalAmount.toLocaleString('en-IN')}.00` : "Hajira-Only Work",
          `${grandTotalHajira.toFixed(2)} Hajiras`,
          `INR ${grandTotalWorkerPay.toLocaleString('en-IN')}.00`,
          "READY FOR ACCOUNTS DISBURSAL"
        ]
      ];

      // @ts-ignore
      doc.autoTable({
        head: [columnsSummary],
        body: rowsSummary,
        startY: 52,
        margin: { left: 14, right: 14 },
        styles: { 
          fontSize: 9,
          cellPadding: 4,
          align: 'center',
          lineColor: [0, 47, 108],
          lineWidth: 0.3
        },
        headStyles: {
          fillColor: [0, 47, 108],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        theme: 'grid'
      });

      // Quick visual cards
      const startCardY = 85;
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(180, 190, 210);
      doc.setLineWidth(0.1);
      
      // Card 1
      doc.rect(14, startCardY, 82, 35, 'FD');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110, 120, 130);
      doc.text("TOTAL PROJECT VALUATION", 18, startCardY + 8);
      doc.setFontSize(16);
      doc.setTextColor(0, 47, 108);
      doc.text(grandTotalAmount > 0 ? `₹${grandTotalAmount.toLocaleString('en-IN')}` : "Hajira Only", 18, startCardY + 22);
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 140);
      doc.text("Approved for site structural works.", 18, startCardY + 30);

      // Card 2
      doc.rect(106, startCardY, 82, 35, 'FD');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110, 120, 130);
      doc.text("TOTAL DESIGNATED HAJIRAS", 110, startCardY + 8);
      doc.setFontSize(16);
      doc.setTextColor(0, 47, 108);
      doc.text(`${grandTotalHajira.toFixed(2)} HJ`, 110, startCardY + 22);
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 140);
      doc.text("Total labor effort days calculated.", 110, startCardY + 30);

      // Card 3
      doc.rect(198, startCardY, 85, 35, 'FD');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110, 120, 130);
      doc.text("ALLOCATED LABOUR PAYMENT", 202, startCardY + 8);
      doc.setFontSize(16);
      doc.setTextColor(150, 10, 10);
      doc.text(`₹${grandTotalWorkerPay.toLocaleString('en-IN')}`, 202, startCardY + 22);
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 140);
      doc.text("Direct worker payable transfer sum.", 202, startCardY + 30);

      // Professional Signatures Block
      const sigY = 155;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);

      // Prep Line
      doc.line(25, sigY, 75, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 47, 108);
      doc.text("PREPARED BY", 37, sigY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Site Supervisor Abstract Cell", 30, sigY + 9);

      // Checked Line
      doc.line(115, sigY, 175, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 47, 108);
      doc.text("CHECKED BY", 132, sigY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Structural Project Manager", 126, sigY + 9);

      // Approved Line
      doc.line(215, sigY, 265, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 47, 108);
      doc.text("APPROVED & PRINTED", 225, sigY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Director, SN enterprises", 228, sigY + 9);
    }

    doc.save(`Floor_Abstract_${projectName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  const resetForm = () => {
    setIsEditing(null);
    setTowerName('');
    setSrNo('');
    setFlatNo('');
    setAmount(0);
    setAverageRate(0);
    setFlatHajira(0);
    setRemarks('');
    setRowWorkers([]);
    setIsAdding(false);
  };

  const handleEdit = (record: FloorAbstract) => {
    setIsEditing(record.id);
    setIsAdding(true);
    setProjectId(record.projectId);
    setTowerName(record.towerName || '');
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
      towerName: towerName || undefined,
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
    setIsAdding(false);
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
      <div className="bg-[var(--color-sap-blue-val)] text-white p-2 flex items-center justify-between sap-header">
        <h2 className="text-lg font-bold font-mono">Floor Abstract</h2>
        {user?.role === 'staff' && !user.allowedModules?.includes('payroll') && (
           <span className="text-xs bg-red-600 px-2 py-0.5 rounded">Read-Only</span>
        )}
      </div>

      <div className="flex border-b border-gray-300 bg-white px-2 pt-2">
        <button 
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'entries' ? 'border-[var(--color-sap-blue-val)] text-[var(--color-sap-blue-val)]' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('entries')}
        >
          <LayoutList size={16} className="inline-block mr-1" /> Floor Abstracts
        </button>
        <button 
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'worker-summary' ? 'border-[var(--color-sap-blue-val)] text-[var(--color-sap-blue-val)]' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('worker-summary')}
        >
          <Users size={16} className="inline-block mr-1" /> Worker Wise Summary
        </button>
        <button 
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'floor-summary' ? 'border-[var(--color-sap-blue-val)] text-[var(--color-sap-blue-val)]' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('floor-summary')}
        >
          <LayoutList size={16} className="inline-block mr-1" /> Floor Wise Summary
        </button>
      </div>

      <div className="p-2 space-y-2 flex-grow overflow-y-auto w-full max-w-7xl mx-auto relative">
        {activeTab === 'entries' && (
          <>
            <AnimatePresence>
              {(isAdding || isEditing) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
                    onClick={() => { resetForm(); setIsAdding(false); }}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="sap-panel relative z-10 w-full max-w-4xl max-h-[95vh] overflow-y-auto p-4 shadow-[0_10px_40px_rgb(0,0,0,0.2)] bg-[#fcfdfe] rounded-md border-b-4 border-b-[#0056b3]"
                  >
                    <div className="bg-white border border-[#8c9ba8] p-3 shadow-sm rounded-sm">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                        <h3 className="font-bold text-[var(--color-sap-blue-val)] text-sm">{isEditing ? 'Edit Floor Abstract' : 'Create Floor Abstract'}</h3>
                        <button onClick={() => { resetForm(); setIsAdding(false); }} className="text-gray-500 hover:text-gray-800 text-xs flex items-center transition-colors">
                          <X size={16} />
                        </button>
                      </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="sap-label">Project *</label>
              <SAPSelect className="sap-input" value={projectId} onChange={(e) => {
                setProjectId(e.target.value);
                setTowerName('');
              }}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SAPSelect>
            </div>
            <div>
              <label className="sap-label">Tower / Block</label>
              <SAPSelect 
                className="sap-input" 
                value={towerName} 
                onChange={(e) => setTowerName(e.target.value)}
                disabled={!projectId || availableTowers.length === 0}
              >
                <option value="">{!projectId ? 'Choose Project First' : availableTowers.length === 0 ? 'No Towers Listed' : 'All Towers / Select'}</option>
                {availableTowers.map(tow => <option key={tow} value={tow}>{tow}</option>)}
              </SAPSelect>
            </div>
            <div>
              <label className="sap-label">Category *</label>
              <SAPSelect className="sap-input" value={category} onChange={(e) => {
                setCategory(e.target.value as 'Amount' | 'Hajira');
                setRowWorkers([]);
              }}>
                <option value="Amount">Amount</option>
                <option value="Hajira">Hajira</option>
              </SAPSelect>
            </div>
            <div>
              <label className="sap-label">Level *</label>
              <SAPSelect className="sap-input" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Select Level</option>
                {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </SAPSelect>
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
              <h3 className="font-bold text-[var(--color-sap-blue-val)] text-sm">Worker Distribution</h3>
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
                           <SAPSelect 
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
                           </SAPSelect>
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
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

        {/* Existing Records List */}
        <div className="bg-white border border-[#8c9ba8] shadow-sm rounded-sm overflow-hidden mt-4">
          <div className="bg-[var(--color-sap-blue-val)] text-white px-3 py-2 flex justify-between items-center sap-header">
            <h3 className="font-bold text-sm">Saved Floor Abstracts</h3>
            {!isReadOnly && (
              <button onClick={() => setIsAdding(true)} className="sap-btn-primary bg-[#004085] hover:bg-[#003366] text-white border-none py-1 px-2 text-xs flex items-center cursor-pointer shadow-sm">
                <Plus size={12} className="mr-1" /> Add New Abstract
              </button>
            )}
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-[#f8fafc] border-b border-[#8c9ba8] p-3 gap-3 grid grid-cols-1 md:grid-cols-5 items-end select-none">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search Flat No, SR No, Level, or Worker name..." 
                  className="sap-input pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Floor Level</label>
              <SAPSelect 
                className="sap-input w-full bg-white font-normal" 
                value={filterLevel} 
                onChange={(e) => setFilterLevel(e.target.value)}
              >
                <option value="">All Levels</option>
                {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </SAPSelect>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Category Basis</label>
              <SAPSelect 
                className="sap-input w-full bg-white font-normal" 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Amount">Amount Basis</option>
                <option value="Hajira">Hajira Basis</option>
              </SAPSelect>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Tower / Block</label>
              <SAPSelect 
                className="sap-input w-full bg-white font-normal" 
                value={filterTower} 
                onChange={(e) => setFilterTower(e.target.value)}
              >
                <option value="">All Towers</option>
                {filterTowersList.map(t => <option key={t} value={t}>{t}</option>)}
              </SAPSelect>
            </div>
          </div>
          
          <div className="p-3 space-y-3">
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
                      className="bg-[var(--color-sap-blue-val)] text-white px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-[#003b86] transition-colors"
                      onClick={() => toggleCardExpand(record.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="font-bold">{record.flatNo} <span className="font-normal text-blue-200 text-xs ml-1">(SR: {record.srNo})</span></div>
                        {record.towerName && (
                          <span className="bg-indigo-950 border border-indigo-400 px-2 py-0.5 rounded-sm text-indigo-100 text-[10px] font-bold tracking-wide uppercase">
                            {record.towerName}
                          </span>
                        )}
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
                         <div className="font-bold font-mono text-[var(--color-sap-blue-val)]">{record.workers.length}</div>
                       </div>
                       <div className="bg-white p-1 border border-gray-200 rounded">
                         <div className="text-gray-500 mb-0.5">Average Rate</div>
                         <div className="font-bold font-mono text-[var(--color-sap-blue-val)]">₹{record.averageRate?.toFixed(2) || 'N/A'}</div>
                       </div>
                       <div className="bg-white p-1 border border-gray-200 rounded">
                         <div className="text-gray-500 mb-0.5">Total Hajira</div>
                         <div className="font-bold font-mono text-[var(--color-sap-blue-val)]">{record.totalHajira?.toFixed(2) || record.flatHajira?.toFixed(2) || '0.00'}</div>
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
                      <button
                        type="button"
                        onClick={() => {
                          if ((window as any).openDocumentFlow) {
                            (window as any).openDocumentFlow(`FAB-${record.id}`);
                          }
                        }}
                        className="sap-btn bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 p-1 px-3 flex items-center text-xs"
                        title="Inspect SAP Document Flow Chain (DF01)"
                      >
                        <GitFork size={12} className="mr-1 text-indigo-600" /> Doc Flow
                      </button>
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
          <div className="bg-[var(--color-sap-blue-val)] text-white p-3 rounded-sm shadow-sm mt-6 mb-4 grid grid-cols-6 gap-4 text-center divide-x divide-blue-800">
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
             <div className="bg-[#eef2f6] text-[var(--color-sap-blue-val)] px-3 py-2 border-b border-[#8c9ba8] flex justify-between items-center">
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
                       <td className="px-3 py-1.5 font-bold text-[var(--color-sap-blue-val)]">{ws.name}</td>
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
              <div className="bg-[#eef2f6] text-[var(--color-sap-blue-val)] px-3 py-2 border-b border-[#8c9ba8] flex flex-wrap gap-2 justify-between items-center">
                 <h3 className="font-bold text-sm flex flex-wrap items-center gap-3">
                   <span>Floor Wise Summary</span>
                   <div className="flex items-center space-x-1">
                     <span className="text-xs text-gray-500 font-normal font-mono">Project:</span>
                     <SAPSelect 
                       className="sap-input text-xs w-56 font-normal !h-7 bg-white" 
                       value={projectId} 
                       onChange={e => {
                         setProjectId(e.target.value);
                         setSummaryLevelFilter('');
                       }}
                     >
                       <option value="">-- Select Project --</option>
                       {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </SAPSelect>
                   </div>
                   {projectId && (
                     <div className="flex items-center space-x-1">
                       <span className="text-xs text-gray-500 font-normal font-mono">Level:</span>
                       <SAPSelect 
                         className="sap-input text-xs w-48 font-normal !h-7 bg-white" 
                         value={summaryLevelFilter} 
                         onChange={e => setSummaryLevelFilter(e.target.value)}
                       >
                         <option value="">-- Select Level --</option>
                         {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </SAPSelect>
                     </div>
                   )}
                 </h3>
                 <div className="flex space-x-2">
                   <button onClick={exportToExcel} disabled={!projectId || !summaryLevelFilter} className="sap-btn sap-btn-blue text-xs flex items-center p-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed">
                     <Download size={12} className="mr-1" /> Excel
                   </button>
                   <button onClick={exportToPDF} disabled={!projectId} className="sap-btn sap-btn-blue text-xs flex items-center p-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed">
                     <Download size={12} className="mr-1" /> PDF {summaryLevelFilter ? '' : '(All Floors)'}
                   </button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse bg-white">
                  <thead className="sap-header select-none">
                    <tr className="divide-x divide-[#8c9ba8]">
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Floor SR</th>
                      <th className="border border-[#8c9ba8] px-2 py-1.5 font-bold">Tower / Block</th>
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
                    {!projectId ? (
                      <tr><td colSpan={12} className="text-center p-8 text-gray-500 font-medium font-sans">Please select a project first.</td></tr>
                    ) : !summaryLevelFilter ? (
                      <tr><td colSpan={12} className="text-center p-8 text-gray-500 font-medium">Please select a level to view the floor wise summary.</td></tr>
                    ) : floorSummaryRows.length === 0 ? (
                      <tr><td colSpan={12} className="text-center p-4 text-gray-500 italic">No floor data available for this level.</td></tr>
                    ) : floorSummaryRows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 divide-x divide-gray-200">
                        {row.isFirstInFloor ? (
                          <>
                            <td className="px-2 py-1 border-t border-[#8c9ba8] bg-gray-100 text-center font-bold align-top" rowSpan={row.rowSpan}>{row.floorSr}</td>
                            <td className="px-2 py-1 border-t border-[#8c9ba8] bg-gray-100 font-bold align-top" rowSpan={row.rowSpan}>{row.towerName || '-'}</td>
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
