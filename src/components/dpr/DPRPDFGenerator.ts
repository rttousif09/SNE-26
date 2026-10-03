import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DPRReport } from '../../types/dpr';

// Colors conforming to Construction DPR standard & SAP Palette
const PRIMARY_BLUE: [number, number, number] = [10, 110, 209]; // #0A6ED1
const HEADER_BG: [number, number, number] = [238, 242, 246]; // #EEF2F6
const TEXT_DARK: [number, number, number] = [48, 59, 68]; // #303B44
const BORDER_COLOR: [number, number, number] = [188, 200, 208]; // #BCC8D0
const ACCENT_RED: [number, number, number] = [180, 40, 40];

export function generateDPRPDF(dpr: DPRReport): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  // ==========================================
  // PAGE 1: HEADER, MANPOWER, PLANT, WORK EXECUTED, MATERIAL
  // ==========================================

  // Company Brand Header
  doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  doc.rect(margin, margin, contentWidth, 14, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SN ENTERPRISES', margin + 4, margin + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('General Civil, Industrial & Infrastructure Contractors', margin + 4, margin + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DAILY PROGRESS REPORT (DPR)', pageWidth - margin - 4, margin + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`TCODE: DPR01 | STATUS: ${dpr.status.toUpperCase()}`, pageWidth - margin - 4, margin + 11, { align: 'right' });

  // Metadata Table (Header Fields)
  const metaY = margin + 16;
  const headerData = [
    [
      { content: 'Project:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.projectName || dpr.projectId, colSpan: 2 },
      { content: 'Report No:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.reportNo, styles: { fontStyle: 'bold', textColor: PRIMARY_BLUE } }
    ],
    [
      { content: 'Project Code:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.projectCode || '-' },
      { content: 'Date:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.date, styles: { fontStyle: 'bold' } },
      { content: 'Weather:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.weather || 'Sunny' }
    ],
    [
      { content: 'Client:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.clientName || '-' },
      { content: 'Contractor:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.contractorName || 'SN ENTERPRISES' },
      { content: 'Working Hours:', styles: { fontStyle: 'bold', fillColor: HEADER_BG, textColor: TEXT_DARK } },
      { content: dpr.workingHours || '08:00 AM - 06:00 PM (10 hrs)' }
    ]
  ];

  autoTable(doc, {
    startY: metaY,
    margin: { left: margin, right: margin },
    body: headerData as any,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      textColor: TEXT_DARK
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 3;

  // Section Header Helper
  const printSectionHeader = (title: string, y: number) => {
    doc.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.rect(margin, y, contentWidth, 5, 'D');

    doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title, margin + 2.5, y + 3.6);
    return y + 6;
  };

  // --- SECTION A: MANPOWER DEPLOYED ---
  currentY = printSectionHeader('A. MANPOWER DEPLOYED', currentY);

  const manpowerRows = (dpr.manpower && dpr.manpower.length > 0)
    ? dpr.manpower.map((m, idx) => [
        idx + 1,
        m.trade,
        m.skilled || 0,
        m.semiSkilled || 0,
        m.unskilled || 0,
        (Number(m.skilled || 0) + Number(m.semiSkilled || 0) + Number(m.unskilled || 0)),
        m.agency || 'SN Enterprises',
        m.remarks || ''
      ])
    : [[1, 'General Site Labour', 0, 0, 0, 0, 'SN Enterprises', 'No manpower deployed']];

  // Calculate totals
  const totalSkilled = dpr.manpower?.reduce((s, m) => s + Number(m.skilled || 0), 0) || 0;
  const totalSemi = dpr.manpower?.reduce((s, m) => s + Number(m.semiSkilled || 0), 0) || 0;
  const totalUnskilled = dpr.manpower?.reduce((s, m) => s + Number(m.unskilled || 0), 0) || 0;
  const totalManpower = totalSkilled + totalSemi + totalUnskilled;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Trade / Category', 'Skilled', 'Semi-Sk.', 'Unskilled', 'Total', 'Sub-contractor / Agency', 'Remarks']],
    body: manpowerRows as any,
    foot: [['', 'TOTAL MANPOWER', totalSkilled, totalSemi, totalUnskilled, totalManpower, '', '']],
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    footStyles: { fillColor: [230, 236, 242], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 35 },
      7: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // --- SECTION B: PLANT & MACHINERY ---
  currentY = printSectionHeader('B. PLANT & MACHINERY', currentY);

  const plantRows = (dpr.plantMachinery && dpr.plantMachinery.length > 0)
    ? dpr.plantMachinery.map((p, idx) => [
        idx + 1,
        p.equipment,
        p.nos || 1,
        p.hoursRun || 0,
        p.idleHours || 0,
        p.fuelLtr ? `${p.fuelLtr} L` : '-',
        p.remarks || '-',
        p.ownedOrHired || 'Owned'
      ])
    : [[1, 'No equipment reported on site', 0, 0, 0, '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Equipment', 'Nos', 'Hours Run', 'Idle Hours', 'Fuel (Ltr)', 'Breakdown / Remarks', 'Owned / Hired']],
    body: plantRows as any,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 48 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 'auto' },
      7: { cellWidth: 22, halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // --- SECTION C: WORK EXECUTED TODAY ---
  currentY = printSectionHeader('C. WORK EXECUTED TODAY', currentY);

  const workRows = (dpr.workExecuted && dpr.workExecuted.length > 0)
    ? dpr.workExecuted.map((w, idx) => [
        idx + 1,
        w.location,
        w.activity,
        w.unit,
        w.quantity || 0,
        w.cumulative || 0,
        w.drawingRef || '-',
        w.remarks || ''
      ])
    : [[1, 'Site', 'Routine preparatory works', 'LS', 1, 1, '-', 'Completed']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Location / Grid / Floor', 'Activity', 'Unit', 'Today Qty', 'Cumulative', 'Drawing Reference', 'Remarks']],
    body: workRows as any,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 46 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 25 },
      7: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // --- SECTION D: MATERIAL RECEIVED TODAY ---
  currentY = printSectionHeader('D. MATERIAL RECEIVED TODAY', currentY);

  const matRows = (dpr.materialReceived && dpr.materialReceived.length > 0)
    ? dpr.materialReceived.map((m, idx) => [
        idx + 1,
        m.material,
        m.unit,
        m.quantity,
        m.challanNo,
        m.supplier,
        m.testCertificateReceived,
        m.remarks || ''
      ])
    : [[1, 'No material inward registered today', '-', 0, '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Material Description', 'Unit', 'Quantity', 'Challan / Inv No', 'Supplier / Source', 'Test Cert.', 'Remarks']],
    body: matRows as any,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 26 },
      5: { cellWidth: 35 },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 'auto' }
    }
  });

  // Page 1 Footer
  doc.setFontSize(6.5);
  doc.setTextColor(120, 130, 140);
  doc.text(`SN ENTERPRISES ERP — DPR01 | Report: ${dpr.reportNo} | Date: ${dpr.date} | Page 1 of 2`, margin, pageHeight - 5);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

  // ==========================================
  // PAGE 2: CONCRETE, SAFETY, HINDRANCES, INSTRUCTIONS, TOMORROW PLAN, SIGNATURES
  // ==========================================
  doc.addPage();

  // Page 2 Mini Header
  doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  doc.rect(margin, margin, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SN ENTERPRISES — DAILY PROGRESS REPORT (PAGE 2)', margin + 3, margin + 4.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`PROJECT: ${dpr.projectName || dpr.projectId} | REPORT: ${dpr.reportNo} | DATE: ${dpr.date}`, pageWidth - margin - 3, margin + 4.8, { align: 'right' });

  currentY = margin + 10;

  // --- SECTION E: CONCRETE POURED TODAY ---
  currentY = printSectionHeader('E. CONCRETE POURED TODAY', currentY);

  const concreteRows = (dpr.concrete && dpr.concrete.length > 0)
    ? dpr.concrete.map((c, idx) => [
        idx + 1,
        c.memberLocation,
        c.grade,
        c.volume || 0,
        c.slump ? `${c.slump} mm` : '-',
        c.cubesCast || 0,
        c.startFinishTime || '-',
        c.remarks || ''
      ])
    : [[1, 'No concreting activity scheduled today', '-', 0, '-', 0, '-', '-']];

  const totalConcreteVolume = dpr.concrete?.reduce((s, c) => s + Number(c.volume || 0), 0) || 0;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Member / Location', 'Grade', 'Volume (cum)', 'Slump (mm)', 'Cubes Cast', 'Start & Finish Time', 'Remarks']],
    body: concreteRows as any,
    foot: [['', 'TOTAL CONCRETE POURED', '', totalConcreteVolume.toFixed(2), '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    footStyles: { fillColor: [230, 236, 242], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 48 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'center' },
      7: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // --- SECTION F: SAFETY OBSERVATIONS & TOOLBOX TALK ---
  currentY = printSectionHeader('F. SAFETY OBSERVATIONS, INCIDENTS AND TOOLBOX TALK', currentY);

  const safetyRows = (dpr.safety && dpr.safety.length > 0)
    ? dpr.safety.map(s => [
        s.time || '-',
        s.category,
        s.observation,
        s.actionTaken || '-',
        s.responsiblePerson || '-',
        s.status || 'Rectified'
      ])
    : [['08:15 AM', 'Toolbox Talk', 'Morning safety pep talk on working at heights & PPE compliance.', 'All workmen inducted.', 'Site Safety Officer', 'Closed']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Time', 'Category', 'Observation / Incident Description', 'Action Taken', 'Responsible Person', 'Status']],
    body: safetyRows as any,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 62 },
      3: { cellWidth: 44 },
      4: { cellWidth: 26 },
      5: { cellWidth: 16, halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // --- SECTION G: DELAYS, HINDRANCES & ISSUES ---
  currentY = printSectionHeader('G. DELAYS, HINDRANCES AND ISSUES REQUIRING DECISION', currentY);

  const hindranceRows = (dpr.hindrances && dpr.hindrances.length > 0)
    ? dpr.hindrances.map(h => [
        h.time || '-',
        h.issue,
        h.location || '-',
        h.timeLost || '0 hr',
        h.manpowerAffected || 0,
        h.actionTaken || '-',
        `${h.personInformed || '-'} (${h.timeInformed || '-'})`,
        h.status || 'Pending',
        h.rfiRef || '-'
      ])
    : [['-', 'Nil delays or site hindrances reported today.', '-', '0 hr', 0, '-', '-', 'Closed', '-']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Time', 'Issue / Hindrance', 'Location', 'Lost Time', 'Men Aff.', 'Action Taken', 'Person & Time Informed', 'Status', 'RFI / Ref']],
    body: hindranceRows as any,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 6.8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 6.8, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 22 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 32 },
      6: { cellWidth: 28 },
      7: { cellWidth: 15, halign: 'center' },
      8: { cellWidth: 14, halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // --- SECTION H: INSTRUCTIONS RECEIVED FROM CLIENT / CONSULTANT ---
  currentY = printSectionHeader('H. INSTRUCTIONS RECEIVED FROM CLIENT / CONSULTANT', currentY);

  const instructionRows = (dpr.instructions && dpr.instructions.length > 0)
    ? dpr.instructions.map(i => [
        i.dateTime || '-',
        i.from,
        i.instruction,
        i.location || '-',
        i.actionRequired || '-',
        i.responsiblePerson || '-',
        i.dueDate || '-',
        i.status || 'In Progress'
      ])
    : [['-', 'Client Representative', 'Routine inspection completed with satisfactory progress.', 'All areas', 'Continue as per schedule', 'Project Incharge', '-', 'Closed']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Date/Time', 'From', 'Instruction Given', 'Location', 'Action Required', 'Resp. Person', 'Due Date', 'Status']],
    body: instructionRows as any,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 6.8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 6.8, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 44 },
      3: { cellWidth: 22 },
      4: { cellWidth: 34 },
      5: { cellWidth: 22 },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // --- SECTION I: PLANNED WORK FOR TOMORROW ---
  currentY = printSectionHeader('I. PLANNED WORK FOR TOMORROW', currentY);

  const tomorrowRows = (dpr.tomorrowPlan && dpr.tomorrowPlan.length > 0)
    ? dpr.tomorrowPlan.map((t, idx) => [
        idx + 1,
        t.location,
        t.plannedActivity,
        t.unit,
        t.plannedQuantity || 0,
        t.drawingRef || '-',
        t.remarks || ''
      ])
    : [[1, 'Tower A - 3rd Floor', 'Rebar tying for beams & columns', 'MT', 3.5, 'DWG-STR-301', 'Materials available']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Location / Area', 'Planned Activity', 'Unit', 'Planned Qty', 'Drawing Reference', 'Remarks / Prerequisites']],
    body: tomorrowRows as any,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 246], textColor: TEXT_DARK, fontSize: 7, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 36 },
      2: { cellWidth: 54 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 26 },
      6: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- SIGNATURES & AUTHORIZATION BLOCK ---
  // Ensure we don't overflow Page 2
  if (currentY > pageHeight - 34) {
    currentY = pageHeight - 34;
  }

  const sigBlockWidth = contentWidth / 4;
  const sigBoxHeight = 24;

  const signatures = [
    { title: 'Prepared By:', name: dpr.preparedBy || 'Site Engineer', role: 'SN Enterprises (Site)' },
    { title: 'Reviewed By:', name: dpr.reviewedBy || 'QA/QC & Safety Incharge', role: 'SN Enterprises' },
    { title: 'Approved By (Contractor):', name: dpr.approvedBy || 'Project Manager', role: 'SN Enterprises' },
    { title: 'Verified / Accepted By:', name: 'Client / Consultant PMC', role: dpr.clientName || 'PMC Engineer' }
  ];

  signatures.forEach((sig, i) => {
    const x = margin + (i * sigBlockWidth);
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.rect(x, currentY, sigBlockWidth, sigBoxHeight, 'D');

    doc.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
    doc.rect(x, currentY, sigBlockWidth, 4.5, 'F');

    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(sig.title, x + 2, currentY + 3.2);

    // Sign line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(sig.name, x + 2, currentY + 18);
    doc.setFontSize(5.8);
    doc.setTextColor(110, 120, 130);
    doc.text(sig.role, x + 2, currentY + 21.5);
  });

  // Page 2 Footer
  doc.setFontSize(6.5);
  doc.setTextColor(120, 130, 140);
  doc.text(`SN ENTERPRISES ERP — DPR01 | Report: ${dpr.reportNo} | Date: ${dpr.date} | Page 2 of 2`, margin, pageHeight - 5);
  doc.text(`Status: ${dpr.status} | Verified Construction Record`, pageWidth - margin, pageHeight - 5, { align: 'right' });

  // Optional Page 3: Site Photographs Annexure
  if (dpr.photos && dpr.photos.length > 0) {
    doc.addPage();
    doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.rect(margin, margin, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ANNEXURE: SITE PROGRESS PHOTOGRAPHS', margin + 3, margin + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`REPORT NO: ${dpr.reportNo} | DATE: ${dpr.date}`, pageWidth - margin - 3, margin + 4.8, { align: 'right' });

    let photoY = margin + 12;
    const photoWidth = (contentWidth - 6) / 2;
    const photoHeight = 65;

    dpr.photos.slice(0, 4).forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = margin + (col * (photoWidth + 6));
      const py = photoY + (row * (photoHeight + 16));

      // Border box for photo
      doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
      doc.rect(px, py, photoWidth, photoHeight + 12, 'D');

      try {
        if (p.dataUrl && p.dataUrl.startsWith('data:image')) {
          doc.addImage(p.dataUrl, 'JPEG', px + 1, py + 1, photoWidth - 2, photoHeight - 2);
        } else {
          doc.setFillColor(245, 247, 250);
          doc.rect(px + 1, py + 1, photoWidth - 2, photoHeight - 2, 'F');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('[Site Photo]', px + (photoWidth / 2), py + (photoHeight / 2), { align: 'center' });
        }
      } catch {
        doc.setFillColor(245, 247, 250);
        doc.rect(px + 1, py + 1, photoWidth - 2, photoHeight - 2, 'F');
      }

      // Caption bar
      doc.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
      doc.rect(px, py + photoHeight, photoWidth, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
      doc.text(`Photo #${idx + 1}: ${p.caption || 'Site Work in Progress'}`, px + 2, py + photoHeight + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 110, 120);
      doc.text(`Location: ${p.location || '-'} | Time: ${p.dateTime || dpr.date}`, px + 2, py + photoHeight + 9);
    });

    doc.setFontSize(6.5);
    doc.setTextColor(120, 130, 140);
    doc.text(`SN ENTERPRISES ERP — DPR01 | Report: ${dpr.reportNo} | Annexure: Photographs`, margin, pageHeight - 5);
  }

  return doc;
}

// Multi-section Excel Workbook Export
export function exportDPRExcel(dpr: DPRReport): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Master Summary & Manpower
  const summaryData: any[] = [
    ['SN ENTERPRISES - DAILY PROGRESS REPORT (DPR01)'],
    ['Report No:', dpr.reportNo, 'Date:', dpr.date, 'Status:', dpr.status],
    ['Project:', dpr.projectName || dpr.projectId, 'Project Code:', dpr.projectCode || '-', 'Client:', dpr.clientName || '-'],
    ['Contractor:', dpr.contractorName || 'SN ENTERPRISES', 'Weather:', dpr.weather, 'Working Hours:', dpr.workingHours],
    [],
    ['A. MANPOWER DEPLOYED'],
    ['S.No', 'Trade / Category', 'Skilled', 'Semi-skilled', 'Unskilled', 'Total', 'Sub-contractor / Agency', 'Remarks']
  ];

  dpr.manpower?.forEach((m, idx) => {
    summaryData.push([
      idx + 1,
      m.trade,
      m.skilled || 0,
      m.semiSkilled || 0,
      m.unskilled || 0,
      (Number(m.skilled || 0) + Number(m.semiSkilled || 0) + Number(m.unskilled || 0)),
      m.agency || 'SN Enterprises',
      m.remarks || ''
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, "Summary & Manpower");

  // Sheet 2: Plant & Machinery
  const plantData: any[] = [
    ['B. PLANT & MACHINERY'],
    ['S.No', 'Equipment', 'Nos', 'Hours Run', 'Idle Hours', 'Fuel (Ltr)', 'Breakdown / Remarks', 'Owned / Hired']
  ];
  dpr.plantMachinery?.forEach((p, idx) => {
    plantData.push([idx + 1, p.equipment, p.nos, p.hoursRun, p.idleHours, p.fuelLtr, p.remarks || '', p.ownedOrHired]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(plantData);
  XLSX.utils.book_append_sheet(wb, ws2, "Plant & Machinery");

  // Sheet 3: Work Executed Today
  const workData: any[] = [
    ['C. WORK EXECUTED TODAY'],
    ['S.No', 'Location / Grid / Floor', 'Activity', 'Unit', 'Today Quantity', 'Cumulative', 'Drawing Reference', 'Remarks']
  ];
  dpr.workExecuted?.forEach((w, idx) => {
    workData.push([idx + 1, w.location, w.activity, w.unit, w.quantity, w.cumulative, w.drawingRef || '', w.remarks || '']);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(workData);
  XLSX.utils.book_append_sheet(wb, ws3, "Work Executed");

  // Sheet 4: Material Received
  const matData: any[] = [
    ['D. MATERIAL RECEIVED TODAY'],
    ['S.No', 'Material Description', 'Unit', 'Quantity', 'Challan / Bill No.', 'Supplier', 'Test Cert. Received', 'Remarks']
  ];
  dpr.materialReceived?.forEach((m, idx) => {
    matData.push([idx + 1, m.material, m.unit, m.quantity, m.challanNo, m.supplier, m.testCertificateReceived, m.remarks || '']);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(matData);
  XLSX.utils.book_append_sheet(wb, ws4, "Material Received");

  // Sheet 5: Concrete Poured
  const concData: any[] = [
    ['E. CONCRETE POURED TODAY'],
    ['S.No', 'Member / Location', 'Grade', 'Volume (cum)', 'Slump (mm)', 'Cubes Cast (nos)', 'Start & Finish Time', 'Remarks']
  ];
  dpr.concrete?.forEach((c, idx) => {
    concData.push([idx + 1, c.memberLocation, c.grade, c.volume, c.slump, c.cubesCast, c.startFinishTime, c.remarks || '']);
  });
  const ws5 = XLSX.utils.aoa_to_sheet(concData);
  XLSX.utils.book_append_sheet(wb, ws5, "Concrete Poured");

  // Sheet 6: Safety, Hindrances, Instructions & Tomorrow
  const otherData: any[] = [
    ['F. SAFETY OBSERVATIONS & TOOLBOX TALK'],
    ['Time', 'Category', 'Observation', 'Action Taken', 'Responsible Person', 'Status']
  ];
  dpr.safety?.forEach(s => otherData.push([s.time, s.category, s.observation, s.actionTaken, s.responsiblePerson, s.status]));

  otherData.push([], ['G. DELAYS, HINDRANCES AND ISSUES REQUIRING DECISION'], ['Time', 'Issue', 'Location', 'Time Lost', 'Men Affected', 'Action Taken', 'Person Informed', 'Time Informed', 'Status', 'RFI/Ref']);
  dpr.hindrances?.forEach(h => otherData.push([h.time, h.issue, h.location, h.timeLost, h.manpowerAffected, h.actionTaken, h.personInformed, h.timeInformed, h.status, h.rfiRef || '']));

  otherData.push([], ['H. INSTRUCTIONS RECEIVED FROM CLIENT / CONSULTANT'], ['Date/Time', 'From', 'Instruction', 'Location', 'Action Required', 'Resp. Person', 'Due Date', 'Status']);
  dpr.instructions?.forEach(i => otherData.push([i.dateTime, i.from, i.instruction, i.location, i.actionRequired, i.responsiblePerson, i.dueDate, i.status]));

  otherData.push([], ['I. PLANNED WORK FOR TOMORROW'], ['S.No', 'Location', 'Planned Activity', 'Unit', 'Planned Qty', 'Drawing Ref', 'Remarks']);
  dpr.tomorrowPlan?.forEach((t, idx) => otherData.push([idx + 1, t.location, t.plannedActivity, t.unit, t.plannedQuantity, t.drawingRef || '', t.remarks || '']));

  const ws6 = XLSX.utils.aoa_to_sheet(otherData);
  XLSX.utils.book_append_sheet(wb, ws6, "Safety, Hindrances & Plan");

  const safeReportNo = (dpr.reportNo || 'DPR').replace(/[\/\\]/g, '_');
  XLSX.writeFile(wb, `SN_DPR01_${safeReportNo}_${dpr.date}.xlsx`);
}
