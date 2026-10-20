import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BOQ, BOQItem, Project } from '../types';

export function exportBOQToExcel(boq: BOQ, project?: Project) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['SN ENTERPRISES — CONSTRUCTION ERP'],
    ['BILL OF QUANTITIES (BOQ01) — CONTRACT SPECIFICATIONS SCHEDULE'],
    [],
    ['BOQ Number:', boq.boqNo, '', 'Date:', boq.date, '', 'Revision:', `Rev ${boq.revisionNo}`],
    ['Project:', project?.name || 'N/A', '', 'Project Code:', boq.projectId, '', 'Status:', boq.status],
    ['Client Authority:', boq.clientName, '', 'Contract Ref:', boq.contractRef || project?.workOrderNo || 'N/A', '', 'Currency:', boq.currency || 'INR (₹)'],
    ['Scope / Remarks:', boq.remarks || 'Standard Contract Works', '', 'Company:', boq.company || 'SN ENTERPRISES'],
    []
  ];

  const headers = [
    'S.No',
    'Item No',
    'Section',
    'Item Code',
    'Work Description & Specifications',
    'Unit',
    'Contract Qty',
    'Unit Rate (₹)',
    'Contract Amount (₹)',
    'Approved Revised Qty',
    'Revised Amount (₹)',
    'Measured Qty',
    'Billed Qty',
    'Balance Qty',
    'Drawing / Remarks'
  ];

  const items = boq.items || [];
  let grandContractTotal = 0;
  let grandRevisedTotal = 0;

  const dataRows: any[][] = [];

  // Group by section if available
  const sections: { [key: string]: BOQItem[] } = {};
  items.forEach(it => {
    const sec = it.section || 'General Works';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(it);
  });

  let globalIndex = 1;
  Object.keys(sections).forEach(secName => {
    const secItems = sections[secName];
    let secContractTotal = 0;
    let secRevisedTotal = 0;

    // Add Section Header Row if multiple sections
    if (Object.keys(sections).length > 1 || secName !== 'General Works') {
      dataRows.push(['', '', `[ ${secName.toUpperCase()} ]`, '', '', '', '', '', '', '', '', '', '', '', '']);
    }

    secItems.forEach(it => {
      const contractQty = it.contractQuantity ?? it.originalQuantity ?? it.boqQuantity ?? 0;
      const rate = it.unitRate ?? it.originalRate ?? it.boqRate ?? 0;
      const contractAmt = Math.round(contractQty * rate * 100) / 100;
      const revQty = it.approvedRevisedQuantity ?? it.boqQuantity ?? contractQty;
      const revAmt = Math.round(revQty * rate * 100) / 100;
      const balance = revQty - (it.billedQuantity || 0);

      secContractTotal += contractAmt;
      secRevisedTotal += revAmt;
      grandContractTotal += contractAmt;
      grandRevisedTotal += revAmt;

      dataRows.push([
        globalIndex++,
        it.itemNumber || '-',
        it.subSection || it.section || '-',
        it.itemCode,
        it.description,
        it.unit,
        contractQty,
        rate,
        contractAmt,
        revQty,
        revAmt,
        it.executedQuantity || 0,
        it.billedQuantity || 0,
        balance,
        it.drawingRef ? `${it.drawingRef} | ${it.remarks || ''}` : it.remarks || ''
      ]);
    });

    if (Object.keys(sections).length > 1) {
      dataRows.push([
        '',
        '',
        `Subtotal - ${secName}`,
        '',
        '',
        '',
        '',
        '',
        secContractTotal,
        '',
        secRevisedTotal,
        '',
        '',
        '',
        ''
      ]);
      dataRows.push([]); // blank separator
    }
  });

  // Grand Total row
  dataRows.push([
    '',
    '',
    'GRAND TOTAL',
    '',
    '',
    '',
    '',
    '',
    grandContractTotal,
    '',
    grandRevisedTotal,
    '',
    '',
    '',
    ''
  ]);

  const allSheetData = [...titleRows, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allSheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 10 }, // Item No
    { wch: 22 }, // Section
    { wch: 14 }, // Item Code
    { wch: 45 }, // Description
    { wch: 8 },  // Unit
    { wch: 14 }, // Contract Qty
    { wch: 14 }, // Unit Rate
    { wch: 18 }, // Contract Amount
    { wch: 18 }, // Revised Qty
    { wch: 18 }, // Revised Amount
    { wch: 14 }, // Measured Qty
    { wch: 14 }, // Billed Qty
    { wch: 14 }, // Balance Qty
    { wch: 25 }  // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'BOQ Master');
  const safeName = (boq.boqNo || 'BOQ').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${safeName}_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportBOQRegisterToExcel(boqs: BOQ[], projects: Project[]) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['SN ENTERPRISES — CONSTRUCTION ERP'],
    ['BILL OF QUANTITIES (BOQ01) — MASTER REGISTER'],
    ['Generated On:', new Date().toLocaleString('en-IN')],
    []
  ];

  const headers = [
    'S.No',
    'BOQ Number',
    'Project Code',
    'Project Name',
    'BOQ Description',
    'Client Name',
    'Contract Ref',
    'Revision',
    'Date',
    'Original BOQ Value (₹)',
    'Approved Revised Value (₹)',
    'Status'
  ];

  let totalOriginal = 0;
  let totalRevised = 0;

  const rows = boqs.map((b, idx) => {
    const p = projects.find(proj => proj.id === b.projectId);
    const origVal = (b.items || []).reduce(
      (sum, it) => sum + ((it.contractQuantity ?? it.originalQuantity ?? it.boqQuantity) * (it.unitRate ?? it.originalRate ?? it.boqRate)),
      0
    );
    const revVal = (b.items || []).reduce(
      (sum, it) => sum + ((it.approvedRevisedQuantity ?? it.boqQuantity) * (it.approvedRevisedRate ?? it.boqRate)),
      0
    );
    totalOriginal += origVal;
    totalRevised += revVal;

    return [
      idx + 1,
      b.boqNo,
      b.projectId,
      p?.name || 'N/A',
      b.title || b.remarks || '-',
      b.clientName,
      b.contractRef || p?.workOrderNo || '-',
      `Rev ${b.revisionNo}`,
      b.date,
      origVal,
      revVal,
      b.status
    ];
  });

  rows.push([
    '',
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalOriginal,
    totalRevised,
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 14 },
    { wch: 28 },
    { wch: 30 },
    { wch: 22 },
    { wch: 18 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
    { wch: 22 },
    { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'BOQ Register');
  XLSX.writeFile(wb, `SN_ENTERPRISES_BOQ_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function printBOQReport(boq: BOQ, project?: Project) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header banner
  doc.setFillColor(30, 58, 95); // SAP Blue #1e3a5f
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SN ENTERPRISES — CONSTRUCTION ERP', 14, 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('TRANSACTION: BOQ01 | BILL OF QUANTITIES CONTRACT SPECIFICATIONS SCHEDULE', 14, 14);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 14, 14, { align: 'right' });

  // Metadata block
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 21, pageWidth - 28, 20, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 21, pageWidth - 28, 20, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`BOQ Number:`, 18, 26);
  doc.setFont('helvetica', 'normal');
  doc.text(boq.boqNo, 40, 26);

  doc.setFont('helvetica', 'bold');
  doc.text(`Project:`, 85, 26);
  doc.setFont('helvetica', 'normal');
  doc.text(`${project?.name || 'N/A'} (${boq.projectId})`, 100, 26);

  doc.setFont('helvetica', 'bold');
  doc.text(`Revision:`, 190, 26);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rev ${boq.revisionNo} (${boq.status})`, 205, 26);

  doc.setFont('helvetica', 'bold');
  doc.text(`Client Authority:`, 18, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(boq.clientName, 44, 32);

  doc.setFont('helvetica', 'bold');
  doc.text(`Contract Ref:`, 85, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(boq.contractRef || project?.workOrderNo || 'N/A', 105, 32);

  doc.setFont('helvetica', 'bold');
  doc.text(`BOQ Date:`, 190, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(boq.date, 205, 32);

  doc.setFont('helvetica', 'bold');
  doc.text(`Scope / Title:`, 18, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(boq.title || boq.remarks || 'Main Contract Specifications', 40, 38);

  const items = boq.items || [];
  let totalContractAmt = 0;
  let totalRevisedAmt = 0;

  const tableBody = items.map((it, idx) => {
    const qty = it.contractQuantity ?? it.originalQuantity ?? it.boqQuantity;
    const rate = it.unitRate ?? it.originalRate ?? it.boqRate;
    const amt = qty * rate;
    const revQty = it.approvedRevisedQuantity ?? it.boqQuantity;
    const revAmt = revQty * rate;
    const balance = revQty - (it.billedQuantity || 0);

    totalContractAmt += amt;
    totalRevisedAmt += revAmt;

    return [
      idx + 1,
      it.itemNumber || '-',
      it.itemCode,
      it.description,
      it.unit,
      qty.toLocaleString('en-IN', { maximumFractionDigits: 3 }),
      `₹${rate.toLocaleString('en-IN')}`,
      `₹${amt.toLocaleString('en-IN')}`,
      revQty.toLocaleString('en-IN', { maximumFractionDigits: 3 }),
      `₹${revAmt.toLocaleString('en-IN')}`,
      (it.billedQuantity || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 }),
      balance.toLocaleString('en-IN', { maximumFractionDigits: 3 })
    ];
  });

  // Footer total row
  tableBody.push([
    '',
    '',
    'TOTAL',
    'CONTRACT GRAND TOTAL',
    '',
    '',
    '',
    `₹${totalContractAmt.toLocaleString('en-IN')}`,
    '',
    `₹${totalRevisedAmt.toLocaleString('en-IN')}`,
    '',
    ''
  ]);

  autoTable(doc, {
    startY: 44,
    head: [[
      'S.No',
      'Item No',
      'Code',
      'Work Description & Specifications',
      'Unit',
      'Contract Qty',
      'Rate (₹)',
      'Contract Amount',
      'Revised Qty',
      'Revised Amount',
      'Billed Qty',
      'Balance Qty'
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      3: { halign: 'left', cellWidth: 70 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      8: { halign: 'right', cellWidth: 20 },
      9: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      10: { halign: 'right', cellWidth: 18 },
      11: { halign: 'right', cellWidth: 20 }
    },
    didDrawPage: data => {
      // Signature Block on last page
      const currentY = data.cursor?.y || 160;
      if (currentY + 25 < pageHeight) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Prepared By: Site / Billing Engineer', 25, currentY + 15);
        doc.text('Checked By: QA / QC Incharge', 115, currentY + 15);
        doc.text('Approved By: Project Manager / Client Authority', 205, currentY + 15);
      }

      // Page numbers
      const pageStr = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, pageWidth - 14, pageHeight - 5, { align: 'right' });
      doc.text('SN ENTERPRISES ERP — CONFIDENTIAL & AUTHORITATIVE CONTRACT DOCUMENT', 14, pageHeight - 5);
    }
  });

  const safeName = (boq.boqNo || 'BOQ').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${safeName}_Specification_Report.pdf`);
}
