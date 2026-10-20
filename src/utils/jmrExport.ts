import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMR, JMRItem, JMRMeasurementRow, Project, BOQ } from '../types';

// Convert number to Indian Rupee Words for official certifications
export function numberToWordsIndian(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let crore = Math.floor(integerPart / 10000000);
  let lakh = Math.floor((integerPart % 10000000) / 100000);
  let thousand = Math.floor((integerPart % 100000) / 1000);
  let remainder = Math.floor(integerPart % 1000);

  let res = '';
  if (crore > 0) res += inWords(crore) + ' Crore ';
  if (lakh > 0) res += inWords(lakh) + ' Lakh ';
  if (thousand > 0) res += inWords(thousand) + ' Thousand ';
  if (remainder > 0) res += inWords(remainder);

  res = res.trim() + ' Rupees';
  if (decimalPart > 0) {
    res += ' and ' + inWords(decimalPart) + ' Paise';
  }
  return (num < 0 ? 'Minus ' : '') + res + ' Only';
}

/**
 * Professional Multi-page PDF Export for Joint Measurement Record (JMR01)
 */
export function exportJMRToPDF(jmr: JMR, project?: Project, boq?: BOQ) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top SAP GUI Header Banner
  doc.setFillColor(30, 58, 95); // #1e3a5f
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SN ENTERPRISES — CONSTRUCTION ERP', 14, 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('JOINT MEASUREMENT RECORD (JMR01) — SITE MEASUREMENT & VERIFICATION SHEET', 14, 14);

  // Status Badge in Top Right
  doc.setFillColor(240, 242, 245);
  doc.rect(pageWidth - 48, 4, 38, 10, 'F');
  doc.setTextColor(30, 58, 95);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`STATUS: ${jmr.status.toUpperCase()}`, pageWidth - 46, 10.5);

  // Metadata Card / Information Grid
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(182, 199, 219);
  doc.rect(14, 22, pageWidth - 28, 26, 'FD');

  doc.setFontSize(8.5);
  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('JMR Number:', 18, 27);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.jmrNo || 'DRAFT', 40, 27);

  doc.setFont('helvetica', 'bold');
  doc.text('JMR Date:', 18, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.date || 'N/A', 40, 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Period (From-To):', 18, 39);
  doc.setFont('helvetica', 'normal');
  doc.text(`${jmr.startDate || 'N/A'}  to  ${jmr.endDate || 'N/A'}`, 44, 39);

  doc.setFont('helvetica', 'bold');
  doc.text('Location / Grid:', 18, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.location || 'General Site Areas', 42, 45);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text('Project:', 100, 27);
  doc.setFont('helvetica', 'normal');
  doc.text(`${project?.name || jmr.projectId} (${jmr.projectId})`, 116, 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Client Authority:', 100, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.clientName || project?.clientName || 'N/A', 126, 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Work Order / PO:', 100, 39);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.workOrderNo || project?.workOrderNo || 'N/A', 128, 39);

  doc.setFont('helvetica', 'bold');
  doc.text('Ref / Letter No:', 100, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.referenceNo || '—', 126, 45);

  // Column 3
  doc.setFont('helvetica', 'bold');
  doc.text('BOQ Master Ref:', 195, 27);
  doc.setFont('helvetica', 'normal');
  doc.text(boq?.boqNo || jmr.boqId || 'N/A', 222, 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Contractor:', 195, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.company || 'SN ENTERPRISES', 215, 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Prepared By:', 195, 39);
  doc.setFont('helvetica', 'normal');
  doc.text(`${jmr.preparedBy || 'Site Engineer'} (${jmr.preparedDate || jmr.date})`, 218, 39);

  doc.setFont('helvetica', 'bold');
  doc.text('Approved By:', 195, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(jmr.approvedBy ? `${jmr.approvedBy} (${jmr.approvedDate})` : 'Pending Verification', 218, 45);

  // Prepare table data including measurement row drill-downs
  const tableData: any[][] = [];
  let grandTotalAmount = 0;
  let totalNetQuantity = 0;

  const items = jmr.items || [];
  items.forEach((item, idx) => {
    grandTotalAmount += item.currentClaimAmount || 0;
    totalNetQuantity += item.netQuantity || 0;

    // Item summary header row
    tableData.push([
      { content: String(idx + 1), styles: { fontStyle: 'bold', fillColor: [228, 235, 243] } },
      { content: item.itemNumber, styles: { fontStyle: 'bold', fillColor: [228, 235, 243] } },
      { content: item.itemCode || '-', styles: { fontStyle: 'bold', fillColor: [228, 235, 243] } },
      { content: item.description, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [228, 235, 243] } },
      { content: item.unit, styles: { fontStyle: 'bold', fillColor: [228, 235, 243] } },
      { content: `₹${(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [228, 235, 243] } },
      { content: (item.contractQuantity || 0).toLocaleString('en-IN'), styles: { halign: 'right', fillColor: [228, 235, 243] } },
      { content: (item.previouslyApprovedQuantity || 0).toLocaleString('en-IN'), styles: { halign: 'right', fillColor: [228, 235, 243] } },
      { content: (item.netQuantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', textColor: [30, 58, 95], fillColor: [228, 235, 243] } },
      { content: `₹${(item.currentClaimAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [30, 58, 95], fillColor: [228, 235, 243] } }
    ]);

    // Detail measurement rows if present
    const rows = item.measurementRows || [];
    if (rows.length > 0) {
      rows.forEach((r, rIdx) => {
        const isAdd = r.entryType === 'Add';
        const typeBadge = isAdd ? '+ ADD' : '− SUB';
        const dimStr = r.method === 'dimensions' 
          ? `L:${r.length} × W:${r.width} × H:${r.height}`
          : r.method === 'length_width'
          ? `L:${r.length} × W:${r.width}`
          : `Base:${r.baseQuantity}`;

        tableData.push([
          '',
          '',
          { content: `(${rIdx + 1})`, styles: { halign: 'center', textColor: [120, 120, 120] } },
          { content: `${typeBadge}  [${r.startDate || ''}]  Loc: ${r.location || '—'}  ${r.equipmentNo ? `Eq:${r.equipmentNo}` : ''}`, colSpan: 3, styles: { textColor: isAdd ? [22, 101, 52] : [159, 18, 57] } },
          { content: `${dimStr} (×${r.numberOfTimes || 1})`, colSpan: 2, styles: { fontStyle: 'italic', textColor: [70, 70, 70] } },
          { content: r.remarks || '—', colSpan: 2, styles: { textColor: [100, 100, 100] } },
          '',
          { content: `${isAdd ? '+' : '−'}${(r.calculatedQuantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', textColor: isAdd ? [22, 101, 52] : [159, 18, 57] } },
          ''
        ]);
      });
    }
  });

  // Grand Total Summary Row
  tableData.push([
    { content: '', colSpan: 3, styles: { fillColor: [30, 58, 95] } },
    { content: 'GRAND TOTAL CERTIFIED JMR CLAIM', colSpan: 7, styles: { fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [30, 58, 95] } },
    { content: totalNetQuantity.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', textColor: [255, 255, 255], fillColor: [30, 58, 95] } },
    { content: `₹${grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [255, 255, 255], fillColor: [30, 58, 95] } }
  ]);

  // Render Table with autoTable
  autoTable(doc, {
    startY: 51,
    head: [[
      'S.N',
      'Item #',
      'Code',
      'Description & Specifications',
      '',
      '',
      '',
      'Unit',
      'Rate (₹)',
      'Contract Qty',
      'Prev Appr',
      'Claim Qty',
      'Claim Value (₹)'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      valign: 'middle',
      lineColor: [182, 199, 219],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [47, 79, 117],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 20, halign: 'right' },
      10: { cellWidth: 18, halign: 'right' },
      11: { cellWidth: 22, halign: 'right' },
      12: { cellWidth: 28, halign: 'right' }
    },
    didDrawPage: (data) => {
      // Page Number Footer
      const str = `Page ${doc.internal.pages.length - 1} of ${doc.getNumberOfPages()}  |  SN ENTERPRISES ERP JMR01`;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(str, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }
  });

  // Calculate position for Signatures block
  let finalY = (doc as any).lastAutoTable?.finalY || 140;

  // If table ended too close to bottom, add new page for signature certification
  if (finalY > pageHeight - 45) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 6;
  }

  // Rupee Words Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(182, 199, 219);
  doc.rect(14, finalY, pageWidth - 28, 8, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Amount in Words:', 18, finalY + 5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWordsIndian(grandTotalAmount), 48, finalY + 5.2);

  finalY += 14;

  // 4 Enterprise Verification & Signatory Blocks
  const blockWidth = (pageWidth - 28 - 9) / 4;
  const sigHeaders = [
    { title: 'PREPARED BY', sub: 'Site Measurement Engineer', comp: 'SN ENTERPRISES' },
    { title: 'CONTRACTOR REP', sub: 'Project / Billing Manager', comp: 'SN ENTERPRISES' },
    { title: 'PMC / CONSULTANT', sub: 'Site Inspection Engineer', comp: 'Third-Party / PMC' },
    { title: 'CLIENT REPRESENTATIVE', sub: 'Executive Engineer / Authority', comp: jmr.clientName || 'Client Authority' }
  ];

  sigHeaders.forEach((sig, i) => {
    const x = 14 + (i * (blockWidth + 3));
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, finalY, blockWidth, 24, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(sig.title, x + 3, finalY + 4.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(sig.sub, x + 3, finalY + 8);
    doc.text(sig.comp, x + 3, finalY + 11.5);

    doc.setDrawColor(148, 163, 184);
    doc.line(x + 3, finalY + 19, x + blockWidth - 3, finalY + 19);

    doc.setFontSize(6.5);
    doc.text('Signature & Official Stamp / Date', x + 3, finalY + 22.5);
  });

  // Save the PDF
  const safeFilename = `${jmr.jmrNo || 'JMR'}_${(project?.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(safeFilename);
}

/**
 * Detailed Excel Export for a single JMR
 */
export function exportJMRToExcel(jmr: JMR, project?: Project, boq?: BOQ) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['SN ENTERPRISES — CONSTRUCTION ERP'],
    ['JOINT MEASUREMENT RECORD (JMR01) — DETAILED MEASUREMENT SHEET'],
    [],
    ['JMR Number:', jmr.jmrNo, '', 'JMR Date:', jmr.date, '', 'Status:', jmr.status],
    ['Project:', project?.name || jmr.projectId, '', 'Project Code:', jmr.projectId, '', 'Location:', jmr.location || 'Site'],
    ['Client Authority:', jmr.clientName, '', 'Work Order / PO:', jmr.workOrderNo || project?.workOrderNo || 'N/A', '', 'BOQ Ref:', boq?.boqNo || jmr.boqId],
    ['Measurement Period:', `${jmr.startDate} to ${jmr.endDate}`, '', 'Contractor:', jmr.company || 'SN ENTERPRISES', '', 'Prepared By:', jmr.preparedBy || 'Engineer'],
    []
  ];

  const headers = [
    'Item #',
    'Item Code',
    'Work Description',
    'UOM',
    'Rate (₹)',
    'Contract Qty',
    'Prev Approved',
    'Avail Contract Qty',
    'Net Claim Qty',
    'Claim Amount (₹)',
    'Entry Type (Add/Sub)',
    'Meas From',
    'Meas To',
    'Location / Grid',
    'Equipment No',
    'Method',
    'Length',
    'Width',
    'Height',
    'Times',
    'Base Qty',
    'Calculated Qty',
    'Remarks'
  ];

  const rows: any[][] = [];
  let grandTotal = 0;

  (jmr.items || []).forEach(item => {
    grandTotal += item.currentClaimAmount || 0;
    const measRows = item.measurementRows || [];

    if (measRows.length === 0) {
      rows.push([
        item.itemNumber,
        item.itemCode,
        item.description,
        item.unit,
        item.rate,
        item.contractQuantity,
        item.previouslyApprovedQuantity,
        item.availableContractQuantity,
        item.netQuantity,
        item.currentClaimAmount,
        '—', '—', '—', '—', '—', '—', '', '', '', '', '', '', item.remarks || ''
      ]);
    } else {
      measRows.forEach((m, idx) => {
        rows.push([
          idx === 0 ? item.itemNumber : '',
          idx === 0 ? item.itemCode : '',
          idx === 0 ? item.description : '',
          idx === 0 ? item.unit : '',
          idx === 0 ? item.rate : '',
          idx === 0 ? item.contractQuantity : '',
          idx === 0 ? item.previouslyApprovedQuantity : '',
          idx === 0 ? item.availableContractQuantity : '',
          idx === 0 ? item.netQuantity : '',
          idx === 0 ? item.currentClaimAmount : '',
          m.entryType,
          m.startDate,
          m.endDate,
          m.location,
          m.equipmentNo,
          m.method,
          m.length || '',
          m.width || '',
          m.height || '',
          m.numberOfTimes || 1,
          m.baseQuantity || '',
          m.calculatedQuantity,
          m.remarks || ''
        ]);
      });
    }
  });

  rows.push([]);
  rows.push([
    '', '', 'GRAND TOTAL JMR CLAIM', '', '', '', '', '', '', grandTotal
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'JMR Measurements');

  const safeFilename = `${jmr.jmrNo || 'JMR'}_Measurements.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

/**
 * Export JMR Register to Excel
 */
export function exportJMRRegisterToExcel(jmrs: JMR[], projects?: Project[]) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['SN ENTERPRISES — CONSTRUCTION ERP'],
    ['JOINT MEASUREMENT RECORDS (JMR01) — CONSOLIDATED REGISTER'],
    ['Generated on:', new Date().toLocaleString('en-IN')],
    []
  ];

  const headers = [
    'S.No',
    'JMR Number',
    'Project Code',
    'Project Name',
    'Client',
    'Work Order No',
    'BOQ No',
    'JMR Date',
    'Period Start',
    'Period End',
    'Items Count',
    'Total Claim Qty',
    'Total Claim Value (₹)',
    'Status',
    'Prepared By',
    'Approved By',
    'Linked RA Bill'
  ];

  let totalValue = 0;
  const rows = jmrs.map((j, idx) => {
    const proj = projects?.find(p => p.id === j.projectId);
    const sumAmount = (j.items || []).reduce((acc, it) => acc + (it.currentClaimAmount || 0), 0);
    const sumQty = (j.items || []).reduce((acc, it) => acc + (it.netQuantity || 0), 0);
    totalValue += sumAmount;

    return [
      idx + 1,
      j.jmrNo,
      j.projectId,
      proj?.name || j.projectId,
      j.clientName,
      j.workOrderNo || 'N/A',
      j.boqId || 'N/A',
      j.date,
      j.startDate,
      j.endDate,
      (j.items || []).length,
      sumQty,
      sumAmount,
      j.status,
      j.preparedBy || '—',
      j.approvedBy || '—',
      j.linkedBillNo || j.linkedBillId || '—'
    ];
  });

  rows.push([
    '', 'TOTAL', '', '', '', '', '', '', '', '', '', '', totalValue, '', '', '', ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'JMR Register');

  XLSX.writeFile(wb, `JMR_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
}
