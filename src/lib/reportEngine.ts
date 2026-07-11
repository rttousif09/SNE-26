import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Initialize types
export interface ReportSummaryBlock {
  title: string;
  value: string | number;
  isCurrency?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}

export interface EnterpriseReportOptions {
  title: string;
  subtitle?: string;
  projectName?: string;
  clientName?: string;
  dateRange?: string;
  headers: string[];
  data: (string | number)[][];
  columnAlignments?: ('left' | 'center' | 'right')[];
  totals?: (string | number)[];
  summaryBlocks?: ReportSummaryBlock[];
  userName?: string;
  watermark?: boolean;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'a4' | 'letter';
  marginSize?: 'compact' | 'normal' | 'wide';
}

// 1. Indian Currency Formatter (₹1,25,000.00)
export const formatIndianCurrency = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '₹0.00';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  
  const isNegative = num < 0;
  const absNum = Math.abs(num).toFixed(2);
  const parts = absNum.split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherParts = parts[0].substring(0, parts[0].length - 3);
  if (otherParts !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  const formattedVal = '₹' + formattedInt + '.' + parts[1];
  return isNegative ? `-${formattedVal}` : formattedVal;
};

// 2. Date Formatter (DD-MMM-YYYY)
export const formatReportDate = (dateVal: any): string => {
  if (!dateVal) return 'N/A';
  // If already matches DD-MMM-YYYY, return as is
  if (typeof dateVal === 'string' && /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateVal)) {
    return dateVal;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Vector logo drawing on PDF
export const drawVectorLogo = (doc: jsPDF, x: number, y: number) => {
  // Outer circle background (Deep Navy)
  doc.setFillColor(0, 47, 108);
  doc.circle(x, y, 6, 'F');
  
  // White inner circle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(x, y, 5, 'S');
  
  // Orange swoop line
  doc.setDrawColor(249, 115, 22); // Orange #f97316
  doc.setLineWidth(0.8);
  doc.line(x - 5.5, y + 2, x + 5.5, y - 2);
  
  // White bold "SN" text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('SN', x, y + 2.2, { align: 'center' });
};

// 3. Central Enterprise PDF Exporter
export const exportToPDFEnterprise = (options: EnterpriseReportOptions): string => {
  // Determine orientation automatically if not set
  let orientation = options.orientation;
  if (!orientation) {
    orientation = options.headers.length > 7 ? 'landscape' : 'portrait';
  }
  
  const paper = options.paperSize || 'a4';
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: paper
  });

  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

  // Margins setup
  let topMargin = 55;
  let bottomMargin = 18;
  let leftMargin = 15;
  let rightMargin = 15;

  if (options.marginSize === 'compact') {
    topMargin = 45;
    bottomMargin = 12;
    leftMargin = 10;
    rightMargin = 10;
  } else if (options.marginSize === 'wide') {
    topMargin = 65;
    bottomMargin = 24;
    leftMargin = 20;
    rightMargin = 20;
  }

  // Pre-calculate page count and print time
  const printTime = new Date().toLocaleString('en-IN', { hour12: true });

  // Generate body data with totals if present
  const finalTableData = [...options.data];
  if (options.totals && options.totals.length > 0) {
    finalTableData.push(options.totals);
  }

  // Draw Header helper to repeat on every page
  const drawPageHeaderAndFooter = (pageNum: number, totalPages: number) => {
    // 1. HEADER BRANDING
    drawVectorLogo(doc, leftMargin + 6, 15);
    
    // Company details
    doc.setTextColor(0, 47, 108); // SAP Deep Blue
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SN ENTERPRISES', leftMargin + 15, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text('GSTIN: 07AAAAA1111A1Z1  |  Email: accounts@snenterprises.co.in  |  Phone: +91-9876543210', leftMargin + 15, 21.5);
    doc.text('Address: 123, Industrial Area, Phase-1, New Delhi - 110020', leftMargin + 15, 25.5);

    // Document Details
    const rightX = pageWidth - rightMargin;
    doc.setTextColor(0, 47, 108);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(options.title.toUpperCase(), rightX, 17, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    let rY = 21.5;
    if (options.projectName) {
      doc.text(`Project: ${options.projectName}`, rightX, rY, { align: 'right' });
      rY += 3.8;
    }
    if (options.clientName) {
      doc.text(`Client: ${options.clientName}`, rightX, rY, { align: 'right' });
      rY += 3.8;
    }
    if (options.dateRange) {
      doc.text(`Period: ${options.dateRange}`, rightX, rY, { align: 'right' });
      rY += 3.8;
    }

    // Border line under header
    doc.setDrawColor(0, 47, 108);
    doc.setLineWidth(0.6);
    doc.line(leftMargin, 35, pageWidth - rightMargin, 35);

    // WATERMARK
    if (options.watermark) {
      doc.setTextColor(230, 230, 230);
      doc.setFontSize(pageWidth > 250 ? 44 : 34);
      doc.setFont('helvetica', 'bold');
      doc.text('SN ENTERPRISES - OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 35
      });
    }

    // FOOTER DETAILS
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(leftMargin, pageHeight - 14, pageWidth - rightMargin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);

    // Left Footer
    doc.text('CONFIDENTIAL  |  OFFICIAL RECORDS AUDIT LOG', leftMargin, pageHeight - 10);
    doc.text(`System Version: SN-ERP Enterprise v4.5.0  |  Record Count: ${options.data.length}`, leftMargin, pageHeight - 6.5);

    // Center Verification
    doc.text('Authorized Signatory: ________________________', pageWidth / 2, pageHeight - 8.5, { align: 'center' });

    // Right Footer
    doc.text(`Page ${pageNum} of ${totalPages}`, rightX, pageHeight - 10, { align: 'right' });
    doc.text(`Printed: ${printTime}  |  By: ${options.userName || 'Admin'}`, rightX, pageHeight - 6.5, { align: 'right' });
  };

  // Draw Summary Cards Block on page 1 only if provided
  let startYPos = topMargin - 15;
  if (options.summaryBlocks && options.summaryBlocks.length > 0) {
    const cardCount = options.summaryBlocks.length;
    const padding = 2;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const cardWidth = (contentWidth - (cardCount - 1) * padding) / cardCount;
    
    options.summaryBlocks.forEach((block, index) => {
      const cardX = leftMargin + index * (cardWidth + padding);
      const cardY = topMargin - 16;
      const cardH = 12;

      // Card frame
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardY, cardWidth, cardH, 1, 1, 'FD');

      // Accent colored bar
      let accentColor = [0, 47, 108]; // blue
      if (block.color === 'green') accentColor = [22, 163, 74];
      if (block.color === 'orange') accentColor = [217, 119, 6];
      if (block.color === 'red') accentColor = [220, 38, 38];
      if (block.color === 'gray') accentColor = [100, 116, 139];

      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(cardX, cardY, 1, cardH, 'F');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(115, 115, 115);
      doc.text(block.title.toUpperCase(), cardX + 2.5, cardY + 4);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const displayVal = block.isCurrency ? formatIndianCurrency(block.value) : String(block.value);
      doc.text(displayVal, cardX + 2.5, cardY + 9.5);
    });
    startYPos = topMargin - 1.5;
  }

  // Setup column styling alignments
  const colStyles: Record<number, any> = {};
  if (options.columnAlignments) {
    options.columnAlignments.forEach((align, idx) => {
      colStyles[idx] = { halign: align };
    });
  } else {
    // Guess based on header labels or data values
    options.headers.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower.includes('amount') || lower.includes('rs') || lower.includes('rate') || lower.includes('balance') || lower.includes('total') || lower.includes('debit') || lower.includes('credit') || lower.includes('earned') || lower.includes('paid') || lower.includes('advance') || lower.includes('kharchi') || lower.includes('gst') || lower.includes('tds') || lower.includes('retention') || lower.includes('outstanding') || lower.includes('budget') || lower.includes('wage')) {
        colStyles[idx] = { halign: 'right' };
      } else if (lower.includes('date') || lower.includes('status') || lower.includes('sl') || lower.includes('no') || lower.includes('id')) {
        colStyles[idx] = { halign: 'center' };
      } else {
        colStyles[idx] = { halign: 'left' };
      }
    });
  }

  // Generate Table
  autoTable(doc, {
    startY: startYPos,
    margin: { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin },
    head: [options.headers],
    body: finalTableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [0, 47, 108],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineWidth: 0.2,
      lineColor: [226, 232, 240]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // light zebra striped
    },
    columnStyles: colStyles,
    willDrawCell: function(cellData) {
      // Bold the last totals row if provided
      if (options.totals && cellData.row.index === finalTableData.length - 1) {
        doc.setFont('helvetica', 'bold');
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [241, 245, 249];
      }

      // Format currency cells automatically if they look like numbers
      const rawText = String(cellData.cell.raw || '');
      const isNumericField = colStyles[cellData.column.index]?.halign === 'right';
      if (isNumericField && !isNaN(Number(rawText)) && rawText !== '') {
        const val = Number(rawText);
        cellData.cell.text = [formatIndianCurrency(val)];
        if (val < 0) {
          doc.setTextColor(220, 38, 38); // Red color for negative
        }
      } else if (rawText.startsWith('-₹') || rawText.startsWith('-Rs') || rawText.startsWith('-Rs.')) {
        doc.setTextColor(220, 38, 38);
      }
    }
  });

  // Second pass to overlay repeating headers/footers with proper page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageHeaderAndFooter(i, totalPages);
  }

  return doc.output('bloburl') as any as string;
};

// Base-26 Encoder for last column letter
const getExcelColumnLetter = (colIdx: number): string => {
  let letter = '';
  let temp = colIdx;
  while (temp > 0) {
    const modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
};

// 4. Central Enterprise Excel Exporter (Beautifully formatted SAP-style sheets)
export const exportToExcelEnterprise = (options: EnterpriseReportOptions, customFilename?: string) => {
  const headers = options.headers;
  const rawData = options.data;
  const title = options.title;

  // Compile full sheet array of arrays
  const fullSheetRows: any[][] = [];

  // Row 1: Company Logo / Title Block
  fullSheetRows.push(['SN ENTERPRISES', '', '', '', '', '', '']);
  fullSheetRows.push(['123, Industrial Area, Phase-1, New Delhi - 110020', '', '', '', '', '', '']);
  fullSheetRows.push(['GSTIN: 07AAAAA1111A1Z1  |  Email: accounts@snenterprises.co.in  |  Phone: +91-9876543210', '', '', '', '', '', '']);
  
  // Row 4: Report Details
  let reportDetailStr = `REPORT: ${title.toUpperCase()}`;
  if (options.projectName) reportDetailStr += `  |  PROJECT: ${options.projectName.toUpperCase()}`;
  if (options.clientName) reportDetailStr += `  |  CLIENT: ${options.clientName.toUpperCase()}`;
  if (options.dateRange) reportDetailStr += `  |  PERIOD: ${options.dateRange}`;
  fullSheetRows.push([reportDetailStr, '', '', '', '', '', '']);

  // Row 5: Empty Spacer Row
  fullSheetRows.push([]);

  // Row 6: Summary blocks if present
  let summaryBlocksOffset = 0;
  if (options.summaryBlocks && options.summaryBlocks.length > 0) {
    const summaryHeader: string[] = [];
    const summaryVal: any[] = [];
    options.summaryBlocks.forEach(block => {
      summaryHeader.push(block.title.toUpperCase());
      summaryVal.push(block.value);
    });
    fullSheetRows.push(summaryHeader);
    fullSheetRows.push(summaryVal);
    fullSheetRows.push([]); // blank divider
    summaryBlocksOffset = 3;
  }

  // Table Headers row
  const tableHeaderRowIndex = 5 + summaryBlocksOffset;
  fullSheetRows.push(headers);

  // Data rows mapping
  rawData.forEach(row => {
    fullSheetRows.push(row);
  });

  // Totals row mapping
  if (options.totals && options.totals.length > 0) {
    fullSheetRows.push(options.totals);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SN_ERP_Report');

  // Format and Auto-styling (Column Widths, AutoFilter, Frozen Panes, Number Formats)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || '');
  
  // Freeze Top Rows (Company header + Table headers pinned)
  const freezeRowLimit = tableHeaderRowIndex + 1;
  worksheet['!views'] = [
    { state: 'frozen', ySplit: freezeRowLimit, xSplit: 0, topLeftCell: `A${freezeRowLimit + 1}`, activePane: 'bottomLeft' }
  ];

  // Auto filter for headers row
  const lastColLetter = getExcelColumnLetter(headers.length);
  worksheet['!autofilter'] = {
    ref: `A${tableHeaderRowIndex + 1}:${lastColLetter}${range.e.r + 1}`
  };

  // Configure margins & print options
  worksheet['!pageSetup'] = {
    orientation: options.orientation || 'landscape',
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0
  };

  // Apply cell formats & types
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellRef];
      if (!cell) continue;

      // Identify if this is a data row numeric column
      const isHeaderRow = R <= tableHeaderRowIndex;
      const isTotalsRow = options.totals && (R === range.e.r);
      const isDataRow = !isHeaderRow && !isTotalsRow;

      // Guess numeric column based on header value
      const headerLabel = headers[C] ? headers[C].toLowerCase() : '';
      const isCurrencyCol = headerLabel.includes('amount') || headerLabel.includes('rs') || headerLabel.includes('rate') || headerLabel.includes('balance') || headerLabel.includes('total') || headerLabel.includes('debit') || headerLabel.includes('credit') || headerLabel.includes('earned') || headerLabel.includes('paid') || headerLabel.includes('advance') || headerLabel.includes('kharchi') || headerLabel.includes('gst') || headerLabel.includes('tds') || headerLabel.includes('retention') || headerLabel.includes('outstanding') || headerLabel.includes('budget') || headerLabel.includes('wage') || headerLabel.includes('deduction');

      // Convert date column representation
      const isDateCol = headerLabel.includes('date') || headerLabel.includes('time') || headerLabel.includes('period') || headerLabel.includes('month');

      if (isDataRow || isTotalsRow) {
        if (isCurrencyCol && cell.v !== undefined && cell.v !== null && cell.v !== '') {
          const numVal = parseFloat(String(cell.v).replace(/[^\d.-]/g, ''));
          if (!isNaN(numVal)) {
            cell.v = numVal;
            cell.t = 'n';
            // Custom Excel number format: India Rupees with negative values highlighted in Red
            cell.z = '[$₹-3c09]#,##,##0.00;[Red]-[$₹-3c09]#,##,##0.00;0.00';
          }
        } else if (isDateCol && cell.v) {
          cell.v = formatReportDate(cell.v);
          cell.t = 's';
        }
      }
    }
  }

  // Calculate and set auto column widths
  const maxLens = headers.map((colHeader, cIdx) => {
    const headerLen = colHeader.length;
    // Inspect each data row length for this column
    const dataLens = rawData.map(row => {
      const cellVal = row[cIdx];
      if (cellVal === undefined || cellVal === null) return 0;
      if (typeof cellVal === 'number') {
        // Format as Indian Currency representation for length estimate
        return formatIndianCurrency(cellVal).length;
      }
      return String(cellVal).length;
    });
    return Math.max(headerLen, ...dataLens, 12) + 3;
  });
  worksheet['!cols'] = maxLens.map(len => ({ wch: len }));

  // File trigger
  const filePrefix = customFilename || `${title.replace(/\s+/g, '_')}`;
  XLSX.writeFile(workbook, `${filePrefix}_${Date.now()}.xlsx`);
};
