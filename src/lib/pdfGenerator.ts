import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  data: (string | number)[][];
  totals?: string[];
  filename?: string;
  userName?: string;
  siteName?: string;
  dateRange?: string;
  watermark?: boolean;
}

export const exportToPDF = ({
  title,
  subtitle,
  headers,
  data,
  totals,
  filename = 'Export.pdf',
  userName = 'Admin',
  siteName,
  dateRange,
  watermark = false
}: PDFExportOptions) => {
  const doc = new jsPDF('landscape');

  // Add Watermark
  if (watermark) {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(40);
    doc.text('SN ENTERPRISES CONFIDENTIAL', 140, 105, { angle: 45, align: 'center' });
  }

  // Header Details
  doc.setTextColor(0, 47, 108); // The #002f6c color from app
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SN ENTERPRISES', 14, 20);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(16);
  doc.text(title, 14, 30);

  let yPos = 38;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (subtitle) {
    doc.text(subtitle, 14, yPos);
    yPos += 6;
  }
  if (siteName) {
    doc.text(`Site: ${siteName}`, 14, yPos);
    yPos += 6;
  }
  if (dateRange) {
    doc.text(`Period: ${dateRange}`, 14, yPos);
    yPos += 6;
  }

  const generatedDate = new Date().toLocaleString();
  doc.text(`Generated On: ${generatedDate}`, 14, yPos);
  
  const finalData = [...data];
  if (totals && totals.length > 0) {
    finalData.push(totals);
  }

  // Record Audit Log (Console.log for now, typically sent to API)
  console.log(`[AUDIT LOG] User: ${userName} | Report: ${title} | Date & Time: ${generatedDate} | Export Type: PDF${watermark ? ' (Watermarked)' : ''}`);

  autoTable(doc, {
    startY: yPos + 4,
    head: [headers],
    body: finalData,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [0, 47, 108],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    willDrawCell: function(data) {
      // If this is the last row and we have totals, format it differently
      if (totals && totals.length > 0 && data.row.index === finalData.length - 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
      }
    },
    didDrawPage: function(data) {
      // Footer
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      
      doc.text(`Prepared by: ${userName}`, 14, pageHeight - 15);
      doc.text('Checked and Approved by: _________________', doc.internal.pageSize.width / 2 - 30, pageHeight - 15);
      
      doc.text(str, doc.internal.pageSize.width - 25, pageHeight - 15);
      doc.text(`Generated at: ${generatedDate}`, 14, pageHeight - 10);
    }
  });

  // Action preview/download. We'll open in new tab (preview), and allow save.
  // We'll return output blob url for preview
  return doc.output('bloburl');
};

const addReportFooter = (doc: jsPDF, pageStr: string, userName: string, generatedDate: string) => {
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  
  // Footer text
  doc.text(`Prepared by Authorized Executive Profile: ${userName}`, 14, pageHeight - 12);
  doc.text('Checked and Countersigned by Managing Director: _________________', pageWidth / 2 - 40, pageHeight - 12);
  doc.text(pageStr, pageWidth - 20, pageHeight - 12);
  
  doc.text(`Compiled via SN Enterprise ERP PRD Server Core on ${generatedDate}`, 14, pageHeight - 7);
  
  // Subtle separator line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 17, pageWidth - 14, pageHeight - 17);
};

export const exportConsolidatedSitesReportToPDF = (state: any, userName: string = 'Saddam') => {
  const doc = new jsPDF('landscape');
  const generatedDate = new Date().toLocaleString('en-IN', { hour12: true });

  // PAGE 1: COVER PAGE
  doc.setFillColor(0, 47, 108); // The #002f6c background
  doc.rect(0, 0, 297, 210, 'F');

  // Decorative border
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.rect(8, 8, 281, 194, 'S');

  // Sub decorative lines
  doc.setDrawColor(44, 91, 151);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 277, 190, 'S');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('SN ENTERPRISES', 148, 65, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  doc.text('INTEGRATED ERP AUTOMATION PLATFORM', 148, 77, { align: 'center' });

  // Title box
  doc.setFillColor(0, 31, 77); // dark container
  doc.rect(40, 92, 217, 30, 'F');
  doc.setDrawColor(0, 86, 179);
  doc.setLineWidth(1.5);
  doc.rect(40, 92, 217, 30, 'S');

  doc.setTextColor(255, 215, 0); // Gold
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSOLIDATED SITE EXECUTIVE PERFORMANCE REPORT', 148, 110, { align: 'center' });

  // Info details block
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Authorized Executive: ${userName}`, 148, 140, { align: 'center' });
  doc.text(`Security Connection Class: PRD_ADMIN_BYPASS`, 148, 146, { align: 'center' });
  doc.text(`Total Sites Audited: ${state.projects ? state.projects.length : 0}`, 148, 152, { align: 'center' });
  doc.text(`Logistics Directory Records: ${state.workers ? state.workers.length : 0} Active Workforce Registrations`, 148, 158, { align: 'center' });
  doc.text(`Report Compiled On: ${generatedDate}`, 148, 164, { align: 'center' });

  // Footer cover info
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text('This is an automatically generated, authenticated document from SN Enterprise ERP Database.', 148, 190, { align: 'center' });

  // PAGE 2: REGISTRY SECTION
  doc.addPage();
  doc.setTextColor(0, 47, 108);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SECTION 1: SITES & PROJECTS ACTIVE DIRECTORY', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('A comprehensive index of all contractor work orders, locations, rate methodologies, and schedules recorded.', 14, 26);

  const projectsHeaders = ['Site Name', 'Client/Customer', 'Start Date', 'Location', 'Rate Type', 'Budget', 'Status'];
  const projectsData = (state.projects || []).map((p: any) => [
    p.name || 'N/A',
    p.clientName || 'N/A',
    p.startDate || 'N/A',
    p.address || 'N/A',
    p.rateType || 'N/A',
    'Rs. ' + (p.budget || 0).toLocaleString('en-IN'),
    p.status || 'N/A'
  ]);

  autoTable(doc, {
    startY: 32,
    head: [projectsHeaders],
    body: projectsData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 47, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
    didDrawPage: (data) => addReportFooter(doc, 'Page 2', userName, generatedDate)
  });

  // PAGE 3: FINANCIAL SECTION
  doc.addPage();
  doc.setTextColor(0, 47, 108);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SECTION 2: SITE FINANCIAL LEDGER PERFORMANCE', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Real-time comparison of cumulative work progress billings submitted against actual payment receipts.', 14, 26);

  const financialHeaders = ['Site Name', 'Client Name', 'Total Audited Billings (A)', 'Progress Payments Recv. (B)', 'Outstanding Receivables (A - B)', 'Financial Status'];
  
  let totalBilledAllSites = 0;
  let totalRecvAllSites = 0;
  let totalOustAllSites = 0;

  const financialData = (state.projects || []).map((p: any) => {
    const siteBills = (state.billings || []).filter((b: any) => b.projectId === p.id);
    const siteBilled = siteBills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const sitePayments = (state.clientPayments || []).filter((cp: any) => cp.projectId === p.id);
    const siteRecv = sitePayments.reduce((sum: number, cp: any) => sum + (cp.amountReceived || 0), 0);
    const siteOust = siteBilled - siteRecv;

    totalBilledAllSites += siteBilled;
    totalRecvAllSites += siteRecv;
    totalOustAllSites += siteOust;

    let statusText = 'N/A';
    if (siteBilled === 0) statusText = 'No Billing';
    else if (siteOust <= 0) statusText = 'Fully Paid';
    else if (siteOust > 0) statusText = 'Outstanding';

    return [
      p.name || 'N/A',
      p.clientName || 'N/A',
      'Rs. ' + siteBilled.toLocaleString('en-IN'),
      'Rs. ' + siteRecv.toLocaleString('en-IN'),
      'Rs. ' + siteOust.toLocaleString('en-IN'),
      statusText
    ];
  });

  const financialTotals = [
    'TOTAL CONSOLIDATED',
    '',
    'Rs. ' + totalBilledAllSites.toLocaleString('en-IN'),
    'Rs. ' + totalRecvAllSites.toLocaleString('en-IN'),
    'Rs. ' + totalOustAllSites.toLocaleString('en-IN'),
    ''
  ];

  autoTable(doc, {
    startY: 32,
    head: [financialHeaders],
    body: [...financialData, financialTotals],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 47, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
    willDrawCell: (data) => {
      if (data.row.index === financialData.length) { // total row
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
      }
    },
    didDrawPage: (data) => addReportFooter(doc, 'Page 3', userName, generatedDate)
  });

  // PAGE 4: WORKFORCE PAYROLL SECTION
  doc.addPage();
  doc.setTextColor(0, 47, 108);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SECTION 3: WORKFORCE ALLOCATIONS & WAGE LEDGERS', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Consolidated labor rosters, worker headcounts, advances outlays, and net wage payouts.', 14, 26);

  const workerHeaders = ['Site Name', 'Headcount Registered', 'Cumulative Wages Approved', 'Advances Outlay', 'Kharchis Paid', 'Net Workers Payments Recv.'];

  let totalWorkersAllSites = 0;
  let totalWagesAllSites = 0;
  let totalAdvAllSites = 0;
  let totalKharAllSites = 0;
  let totalNetPayAllSites = 0;

  const workerData = (state.projects || []).map((p: any) => {
    const siteWorkers = (state.workers || []).filter((w: any) => w.projectId === p.id);

    // Filter wage payments
    const sitePayments = (state.workerPayments || []).filter((wp: any) => wp.projectId === p.id);
    const siteWagesSum = sitePayments.reduce((sum: number, wp: any) => sum + (wp.workAmount || 0), 0);
    const siteNetPaySum = sitePayments.reduce((sum: number, wp: any) => sum + (wp.netPayment || 0), 0);

    // Advances and Kharchis
    const siteAdv = (state.advances || []).filter((ad: any) => ad.projectId === p.id).reduce((sum: number, ad: any) => sum + (ad.amount || 0), 0);
    const siteKharchi = (state.kharchis || []).filter((kh: any) => kh.projectId === p.id).reduce((sum: number, kh: any) => sum + (kh.amount || 0), 0);

    totalWorkersAllSites += siteWorkers.length;
    totalWagesAllSites += siteWagesSum;
    totalAdvAllSites += siteAdv;
    totalKharAllSites += siteKharchi;
    totalNetPayAllSites += siteNetPaySum;

    return [
      p.name || 'N/A',
      siteWorkers.length + ' Workers',
      'Rs. ' + siteWagesSum.toLocaleString('en-IN'),
      'Rs. ' + siteAdv.toLocaleString('en-IN'),
      'Rs. ' + siteKharchi.toLocaleString('en-IN'),
      'Rs. ' + siteNetPaySum.toLocaleString('en-IN')
    ];
  });

  const workerTotals = [
    'TOTAL REGISTERED',
    totalWorkersAllSites + ' Workers',
    'Rs. ' + totalWagesAllSites.toLocaleString('en-IN'),
    'Rs. ' + totalAdvAllSites.toLocaleString('en-IN'),
    'Rs. ' + totalKharAllSites.toLocaleString('en-IN'),
    'Rs. ' + totalNetPayAllSites.toLocaleString('en-IN')
  ];

  autoTable(doc, {
    startY: 32,
    head: [workerHeaders],
    body: [...workerData, workerTotals],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 47, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
    willDrawCell: (data) => {
      if (data.row.index === workerData.length) { // total row
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
      }
    },
    didDrawPage: (data) => addReportFooter(doc, 'Page 4', userName, generatedDate)
  });

  // PAGE 5: LOGISTICS & MATERIAL STOCK REGISTRY
  doc.addPage();
  doc.setTextColor(0, 47, 108);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SECTION 4: MATERIALS LOGISTICS & INVENTORIES', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Site-wise inventory logistics representing total consumable issues vs. returnable returns received back.', 14, 26);

  const matHeaders = ['Site Name', 'Vouchers Issued', 'Consumable Outflow Qty', 'Returned Inflow Qty', 'Reconciled Active Inventory Balance'];

  let grandTotalIssues = 0;
  let grandTotalReturns = 0;
  let grandTotalBalance = 0;

  const matData = (state.projects || []).map((p: any) => {
    const siteIssues = (state.materialIssues || []).filter((i: any) => i.projectId === p.id);
    const siteReturns = (state.materialReturns || []).filter((r: any) => r.projectId === p.id);

    const totalIssuesQty = siteIssues.reduce((sum: number, item: any) => sum + (Number(item.qty) || 0), 0);
    const totalReturnsQty = siteReturns.reduce((sum: number, item: any) => sum + (Number(item.qty) || 0), 0);
    const activeBalance = Math.max(0, totalIssuesQty - totalReturnsQty);

    grandTotalIssues += totalIssuesQty;
    grandTotalReturns += totalReturnsQty;
    grandTotalBalance += activeBalance;

    return [
      p.name || 'N/A',
      siteIssues.length + ' Vouchers',
      totalIssuesQty.toLocaleString('en-IN'),
      totalReturnsQty.toLocaleString('en-IN'),
      activeBalance.toLocaleString('en-IN')
    ];
  });

  const matTotals = [
    'TOTAL LOGISTICS',
    '',
    grandTotalIssues.toLocaleString('en-IN'),
    grandTotalReturns.toLocaleString('en-IN'),
    grandTotalBalance.toLocaleString('en-IN')
  ];

  autoTable(doc, {
    startY: 32,
    head: [matHeaders],
    body: [...matData, matTotals],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 47, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
    willDrawCell: (data) => {
      if (data.row.index === matData.length) { // total row
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
      }
    },
    didDrawPage: (data) => addReportFooter(doc, 'Page 5', userName, generatedDate)
  });

  return doc.output('bloburl');
};

export const downloadPDF = (blobUrl: URL | string | Blob | MediaSource, filename: string) => {
  const link = document.createElement('a');
  link.href = blobUrl as string;
  link.download = filename;
  link.click();
};

export const exportIndividualBillToPDF = (bill: any, projectName: string, userName: string = 'Admin') => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const generatedDate = new Date().toLocaleString('en-IN', { hour12: true });

  // Top elegant primary color bar
  doc.setFillColor(0, 47, 108); // Deep blue #002f6c
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Title / Company Header
  doc.setTextColor(0, 47, 108);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SN ENTERPRISES', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Construction Billing & Site Management ERP', 14, 23);

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(14, 26, pageWidth - 14, 26);

  // Title of the Document
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL PAYMENT CERTIFICATE', 14, 34);

  // Right-aligned Bill reference and date
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Ref No: ${bill.billNo}`, pageWidth - 14, 32, { align: 'right' });
  doc.text(`Generated: ${generatedDate}`, pageWidth - 14, 37, { align: 'right' });

  // 1. Bill Details Section (2-column layout)
  doc.setFillColor(248, 249, 250); // Light gray background
  doc.rect(14, 42, pageWidth - 28, 28, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, 42, pageWidth - 28, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('PROJECT & BILL INFORMATION', 18, 48);
  doc.line(18, 50, pageWidth - 18, 50);

  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  
  // Column 1
  doc.setFont('helvetica', 'normal'); doc.text('Project Name:', 18, 55);
  doc.setFont('helvetica', 'bold'); doc.text(projectName, 42, 55);

  doc.setFont('helvetica', 'normal'); doc.text('Bill Number:', 18, 60);
  doc.setFont('helvetica', 'bold'); doc.text(bill.billNo || 'N/A', 42, 60);

  doc.setFont('helvetica', 'normal'); doc.text('Bill Type:', 18, 65);
  doc.setFont('helvetica', 'bold'); doc.text(bill.billType || 'Running Account', 42, 65);

  // Column 2
  const col2X = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'normal'); doc.text('Period/Month:', col2X, 55);
  doc.setFont('helvetica', 'bold'); doc.text(bill.month || 'N/A', col2X + 25, 55);

  doc.setFont('helvetica', 'normal'); doc.text('Certify Date:', col2X, 60);
  doc.setFont('helvetica', 'bold'); doc.text(bill.certifyDate || 'N/A', col2X + 25, 60);

  doc.setFont('helvetica', 'normal'); doc.text('Work Nature:', col2X, 65);
  doc.setFont('helvetica', 'bold'); 
  const workNatureTruncated = (bill.workNature || '').length > 28 
    ? (bill.workNature || '').substring(0, 25) + '...' 
    : (bill.workNature || 'N/A');
  doc.text(workNatureTruncated, col2X + 25, 65);

  // 2. Financial Summary Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 47, 108);
  doc.text('FINANCIAL SUMMARY STATEMENT', 14, 78);

  const summaryHeaders = ['Transaction Item Description', 'Factor', 'Amount (INR)'];
  
  const tdsVal = bill.tds ?? 0;
  const retVal = bill.retention ?? 0;
  const gstVal = bill.gst ?? 0;
  const extraVal = bill.extraWorkAmount ?? 0;
  const debitVal = bill.debitAmount ?? 0;
  const holdVal = bill.holdAmount ?? 0;
  const netAmount = bill.amount + extraVal - tdsVal - retVal + gstVal - debitVal - holdVal;

  const summaryRows = [
    ['Gross Billing Amount', 'Base Work', 'Rs. ' + bill.amount.toLocaleString('en-IN')],
    ['TDS Deducted', 'Deduction (-)', tdsVal > 0 ? 'Rs. ' + tdsVal.toLocaleString('en-IN') : 'N/A'],
    ['Retention Deducted', 'Deduction (-)', retVal > 0 ? 'Rs. ' + retVal.toLocaleString('en-IN') : 'N/A'],
    ['GST Added', 'Tax Addition (+)', gstVal > 0 ? 'Rs. ' + gstVal.toLocaleString('en-IN') : 'N/A']
  ];

  if (extraVal > 0) {
    summaryRows.push(['Extra Work Amount', 'Addition (+)', 'Rs. ' + extraVal.toLocaleString('en-IN')]);
  }
  if (debitVal > 0) {
    summaryRows.push([`Debit Deduction (${bill.debitReason || 'Debit'})`, 'Deduction (-)', 'Rs. ' + debitVal.toLocaleString('en-IN')]);
  }
  if (holdVal > 0) {
    summaryRows.push([`Hold Amount (${bill.holdReason || 'Withheld'})`, 'Deduction (-)', 'Rs. ' + holdVal.toLocaleString('en-IN')]);
  }

  summaryRows.push(['TOTAL NET RECEIVABLE AMOUNT', 'Net Payable', 'Rs. ' + netAmount.toLocaleString('en-IN')]);

  autoTable(doc, {
    startY: 81,
    head: [summaryHeaders],
    body: summaryRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [0, 47, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    },
    willDrawCell: (data) => {
      if (data.row.index === summaryRows.length - 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(230, 245, 233); // light green background for net receivable
      }
    }
  });

  // Calculate next table position
  // @ts-ignore
  let currentY = doc.lastAutoTable.finalY + 10;

  // 3. Measurement Items Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 47, 108);
  doc.text('MEASUREMENT SHEET SCHEDULE', 14, currentY);
  currentY += 4;

  if (!bill.measurementItems || bill.measurementItems.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('No matching measurement items sheet recorded for this bill.', 14, currentY + 3);
    currentY += 8;
  } else {
    const measureHeaders = ['#', 'Description of Item', 'Unit', 'Rate (Rs.)', 'Qty Executed', 'Amount (Rs.)'];
    const measureRows = bill.measurementItems.map((item: any, idx: number) => [
      (idx + 1).toString(),
      item.description || 'N/A',
      item.unit || 'N/A',
      item.rate ? item.rate.toLocaleString('en-IN', { minimumFractionDigits: 1 }) : '0.0',
      item.qtyExecuted ? item.qtyExecuted.toString() : '0',
      item.amount ? item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'
    ]);

    const totalMeasured = bill.measurementItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    measureRows.push([
      '', 'TOTAL MEASURED WORK AMOUNT', '', '', '', 'Rs. ' + totalMeasured.toLocaleString('en-IN')
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [measureHeaders],
      body: measureRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8, font: 'helvetica' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' }, // indigo header
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 95 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
      },
      willDrawCell: (data) => {
        if (data.row.index === measureRows.length - 1) {
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
        }
      }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15;
  }

  // Ensure signatures fit, or put them on next page if space is low
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 25;
  }

  // Draw elegant separator line for signatures
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 10;

  // Signatures block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  
  doc.text('Prepared By: Billing Engineer', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text('________________________________', 14, currentY - 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Checked & Approved By: Authorized Signatory', pageWidth - 14, currentY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('________________________________', pageWidth - 14, currentY - 5, { align: 'right' });

  // Add small page footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages} | SN Enterprises ERP Billing System`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    doc.text(`Authenticated Document Copy | Prepared for project: ${projectName}`, 14, pageHeight - 6);
  }

  return doc.output('bloburl');
};

export const formatCurrency = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return val;
  return 'Rs ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
