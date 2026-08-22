/**
 * ============================================================================
 * SN ENTERPRISES ERP - CENTRALIZED PROFESSIONAL EXPORT & PRINT ENGINE
 * ============================================================================
 * Single, robust, mathematically precise export engine for:
 *  - PDF (Vector Logo, Indian Number/Currency, Dynamic Layout, Autotable, Multi-page)
 *  - Excel (.xlsx via SheetJS with AutoFilter, Frozen Panes, Indian Currency masks, Multi-Sheet)
 *  - Print & WYSIWYG Print Preview
 *
 * Implements strict typographical hierarchy, intelligent column width calculation,
 * data-type auto-detection & alignment, page break intelligence, and consistent branding.
 * ============================================================================
 */

import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ----------------------------------------------------------------------------
// 1. INTERFACES & TYPE DEFINITIONS
// ----------------------------------------------------------------------------

export type ReportDensity = 'compact' | 'standard' | 'comfortable';
export type ReportPaperSize = 'a4' | 'a3' | 'letter';
export type ReportOrientation = 'auto' | 'portrait' | 'landscape';
export type ReportAlignment = 'left' | 'center' | 'right';
export type ReportDataType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'time' 
  | 'percentage' 
  | 'quantity' 
  | 'status' 
  | 'sr' 
  | 'code';

export interface ReportSummaryBlock {
  title: string;
  value: string | number;
  isCurrency?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple' | 'cyan';
  subtitle?: string;
}

export interface ReportColumnConfig {
  header: string;
  key?: string;
  type?: ReportDataType;
  align?: ReportAlignment;
  widthWeight?: number; // Relative weight for auto-layout (1-5)
  minWidth?: number;    // In mm
  maxWidth?: number;    // In mm
}

export interface ReportTaxDeductions {
  grossAmount?: number;
  extraWorkAmount?: number;
  tds?: number;
  tdsPercent?: number;
  retention?: number;
  retentionPercent?: number;
  gst?: number;
  gstPercent?: number;
  debitAmount?: number;
  debitReason?: string;
  holdAmount?: number;
  holdReason?: string;
  messDeduction?: number;
  kharchiDeduction?: number;
  advanceDeduction?: number;
  recoveryAmount?: number;
  otherDeductions?: number;
  netPayable?: number;
}

export interface ReportSignature {
  title: string;
  subtitle?: string;
  name?: string;
}

export interface EnterpriseReportDefinition {
  title: string;
  subtitle?: string;
  tcode?: string;
  reportNo?: string;
  projectName?: string;
  projectCode?: string;
  clientName?: string;
  financialYear?: string;
  dateRange?: string;
  appliedFilters?: { label: string; value: string }[];
  userName?: string;
  generatedAt?: string;

  // Company Information
  companyDetails?: {
    name?: string;
    tagline?: string;
    gstin?: string;
    pan?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };

  // Table Data
  headers: (string | ReportColumnConfig)[];
  data: (string | number | boolean | null | undefined)[][];
  totals?: (string | number | null | undefined)[];
  subtotals?: { label: string; values: (string | number)[]; highlight?: boolean }[];
  
  // Tax / Deduction statement breakdown if applicable
  taxDeductions?: ReportTaxDeductions;

  // KPI Summary Blocks
  summaryBlocks?: ReportSummaryBlock[];

  // Signatures & Disclaimers
  signatures?: ReportSignature[];
  notes?: string[];

  // Custom multi-sheet dataset for Excel
  customSheets?: {
    sheetName: string;
    headers: string[];
    data: (string | number)[][];
    totals?: (string | number)[];
  }[];

  // Presentation & Print Controls
  filename?: string;
  orientation?: ReportOrientation;
  paperSize?: ReportPaperSize;
  density?: ReportDensity;
  scale?: 'auto' | 'fit-width' | 'fit-page' | '100';
  showHeader?: boolean;
  showFooter?: boolean;
  showPageNumbers?: boolean;
  watermark?: boolean | string;
}

// ----------------------------------------------------------------------------
// 2. INDIAN NUMBER, CURRENCY & DATE FORMATTING UTILITIES
// ----------------------------------------------------------------------------

/**
 * Format any numeric value as standard Indian Currency: ₹12,50,000.00
 */
export const formatIndianCurrency = (
  val: number | string | undefined | null,
  showSymbol: boolean = true,
  decimals: number = 2
): string => {
  if (val === undefined || val === null || val === '') {
    return showSymbol ? '₹0.00' : '0.00';
  }
  
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^\d.-]/g, '')) : val;
  if (isNaN(num)) return String(val);

  const isNegative = num < 0;
  const absNum = Math.abs(num).toFixed(decimals);
  const parts = absNum.split('.');
  
  let intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';

  let lastThree = intPart.substring(intPart.length - 3);
  const otherParts = intPart.substring(0, intPart.length - 3);
  if (otherParts !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = (showSymbol ? '₹' : '') + formattedInt + decPart;

  return isNegative ? `-${result}` : result;
};

/**
 * Format standard Indian integer or quantity: 1,25,000 or 1,250.50
 */
export const formatIndianNumber = (
  val: number | string | undefined | null,
  decimals?: number
): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^\d.-]/g, '')) : val;
  if (isNaN(num)) return String(val);

  if (decimals !== undefined) {
    return formatIndianCurrency(num, false, decimals);
  }

  // Preserve natural decimal if exists
  const str = String(num);
  const parts = str.split('.');
  let intFormatted = formatIndianCurrency(parseInt(parts[0], 10), false, 0);
  if (parts.length > 1) {
    return intFormatted + '.' + parts[1];
  }
  return intFormatted;
};

/**
 * Format dates consistently into official DD-MMM-YYYY format
 */
export const formatReportDate = (dateVal: any): string => {
  if (!dateVal) return 'N/A';
  if (typeof dateVal === 'string' && /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateVal)) {
    return dateVal;
  }
  
  // Check if standard YYYY-MM-DD
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, d] = dateVal.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d}-${months[parseInt(m, 10) - 1]}-${y}`;
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Standardize File Naming
 * Pattern: SN_ENTERPRISES_<ReportTitle>_<Project>_<Date>.<ext>
 */
export const generateReportFilename = (
  title: string,
  projectName?: string,
  extension: 'pdf' | 'xlsx' = 'pdf'
): string => {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').trim();
  const cleanTitle = sanitize(title || 'ERP_Report');
  const cleanProject = projectName && projectName !== 'All Projects' && projectName !== 'all'
    ? `_${sanitize(projectName)}`
    : '';
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  return `SN_ENTERPRISES_${cleanTitle}${cleanProject}_${dateStr}.${extension}`;
};

// ----------------------------------------------------------------------------
// 3. INTELLIGENT COLUMN & DATA TYPE ANALYSIS
// ----------------------------------------------------------------------------

export interface NormalizedColumn {
  header: string;
  key?: string;
  type: ReportDataType;
  align: ReportAlignment;
  widthWeight: number;
  minWidth: number;
  maxWidth: number;
  calculatedWidth?: number;
}

/**
 * Automatically inspects column headers and sample data to determine
 * alignment, data types, and proportional layout weights.
 */
export const analyzeReportColumns = (
  rawHeaders: (string | ReportColumnConfig)[],
  sampleData: (string | number | boolean | null | undefined)[][]
): NormalizedColumn[] => {
  return rawHeaders.map((rawHeader, colIdx) => {
    let headerText = typeof rawHeader === 'string' ? rawHeader : rawHeader.header;
    const explicitConfig: Partial<ReportColumnConfig> = typeof rawHeader === 'object' && rawHeader !== null ? rawHeader : {};
    
    const hLower = headerText.toLowerCase();

    // 1. Detect Data Type
    let detectedType: ReportDataType = 'text';
    if (explicitConfig.type) {
      detectedType = explicitConfig.type;
    } else if (
      hLower === '#' || 
      hLower === 'sr' || 
      hLower === 'sr.' || 
      hLower === 'sr no' || 
      hLower === 'sr. no' || 
      hLower === 's.no' ||
      hLower === 'sl'
    ) {
      detectedType = 'sr';
    } else if (
      hLower.includes('code') || 
      hLower.includes('id') || 
      hLower.includes('tcode') || 
      hLower.includes('bill no') || 
      hLower.includes('flat no') || 
      hLower.includes('ref') ||
      hLower.includes('voucher') ||
      hLower.includes('asset')
    ) {
      detectedType = 'code';
    } else if (
      hLower.includes('date') || 
      hLower.includes('period') || 
      hLower.includes('month') || 
      hLower.includes('created at') || 
      hLower.includes('certify date')
    ) {
      detectedType = 'date';
    } else if (hLower.includes('time')) {
      detectedType = 'time';
    } else if (
      hLower.includes('amount') || 
      hLower.includes('rate') || 
      hLower.includes('rs') || 
      hLower.includes('inr') || 
      hLower.includes('gross') || 
      hLower.includes('net') || 
      hLower.includes('balance') || 
      hLower.includes('tds') || 
      hLower.includes('gst') || 
      hLower.includes('retention') || 
      hLower.includes('debit') || 
      hLower.includes('credit') || 
      hLower.includes('advance') || 
      hLower.includes('kharchi') || 
      hLower.includes('wage') || 
      hLower.includes('budget') || 
      hLower.includes('payout') || 
      hLower.includes('earnings') ||
      hLower.includes('deduction') ||
      hLower.includes('expense') ||
      hLower.includes('payable')
    ) {
      detectedType = 'currency';
    } else if (
      hLower.includes('qty') || 
      hLower.includes('quantity') || 
      hLower.includes('hajira') || 
      hLower.includes('count') || 
      hLower.includes('headcount') || 
      hLower.includes('hours') ||
      hLower.includes('vouchers')
    ) {
      detectedType = 'quantity';
    } else if (hLower.includes('%') || hLower.includes('percent') || hLower.includes('percentage')) {
      detectedType = 'percentage';
    } else if (
      hLower.includes('status') || 
      hLower.includes('state') || 
      hLower.includes('unit') || 
      hLower.includes('level') || 
      hLower.includes('type')
    ) {
      detectedType = 'status';
    }

    // 2. Determine Alignment
    let detectedAlign: ReportAlignment = 'left';
    if (explicitConfig.align) {
      detectedAlign = explicitConfig.align;
    } else {
      switch (detectedType) {
        case 'currency':
        case 'number':
        case 'quantity':
        case 'percentage':
          detectedAlign = 'right';
          break;
        case 'sr':
        case 'date':
        case 'time':
        case 'status':
          detectedAlign = 'center';
          break;
        case 'code':
          detectedAlign = headerText.length <= 8 ? 'center' : 'left';
          break;
        default:
          detectedAlign = 'left';
          break;
      }
    }

    // 3. Inspect Sample Values to refine width weight
    let maxContentLen = headerText.length;
    sampleData.slice(0, 50).forEach(row => {
      const cellVal = row[colIdx];
      if (cellVal !== undefined && cellVal !== null) {
        const len = String(cellVal).length;
        if (len > maxContentLen) maxContentLen = len;
      }
    });

    // 4. Determine Width Weights & Constraints
    let widthWeight = explicitConfig.widthWeight || 1;
    let minWidth = explicitConfig.minWidth || 10;
    let maxWidth = explicitConfig.maxWidth || 80;

    switch (detectedType) {
      case 'sr':
        widthWeight = 0.6;
        minWidth = 7;
        maxWidth = 12;
        break;
      case 'code':
        widthWeight = 1.1;
        minWidth = 14;
        maxWidth = 26;
        break;
      case 'date':
        widthWeight = 1.3;
        minWidth = 18;
        maxWidth = 26;
        break;
      case 'status':
        widthWeight = 1.1;
        minWidth = 14;
        maxWidth = 24;
        break;
      case 'currency':
        widthWeight = 1.5;
        minWidth = 20;
        maxWidth = 36;
        break;
      case 'quantity':
      case 'number':
        widthWeight = 1.1;
        minWidth = 14;
        maxWidth = 24;
        break;
      case 'percentage':
        widthWeight = 0.9;
        minWidth = 12;
        maxWidth = 18;
        break;
      default:
        // Text/Description
        if (
          hLower.includes('desc') || 
          hLower.includes('remark') || 
          hLower.includes('address') || 
          hLower.includes('work')
        ) {
          widthWeight = 3.2;
          minWidth = 35;
          maxWidth = 120;
        } else if (hLower.includes('name') || hLower.includes('project') || hLower.includes('client')) {
          widthWeight = 2.2;
          minWidth = 26;
          maxWidth = 60;
        } else {
          widthWeight = 1.6;
          minWidth = 18;
          maxWidth = 45;
        }
        break;
    }

    return {
      header: headerText,
      key: explicitConfig.key,
      type: detectedType,
      align: detectedAlign,
      widthWeight,
      minWidth,
      maxWidth,
    };
  });
};

/**
 * Distributes available page width across columns based on weights and constraints
 */
export const calculatePreciseColumnWidths = (
  columns: NormalizedColumn[],
  availableWidth: number
): number[] => {
  const totalWeight = columns.reduce((sum, col) => sum + col.widthWeight, 0);
  
  // Initial pass: Allocate proportional to weight
  let allocated = columns.map(col => (col.widthWeight / totalWeight) * availableWidth);

  // Second pass: Clamp to minWidth and maxWidth
  let extraSpace = 0;
  let unconstrainedIndices: number[] = [];

  allocated = allocated.map((w, idx) => {
    const col = columns[idx];
    if (w < col.minWidth) {
      extraSpace -= (col.minWidth - w);
      return col.minWidth;
    } else if (w > col.maxWidth) {
      extraSpace += (w - col.maxWidth);
      return col.maxWidth;
    }
    unconstrainedIndices.push(idx);
    return w;
  });

  // Re-distribute extra/deficit space to unconstrained columns
  if (unconstrainedIndices.length > 0 && Math.abs(extraSpace) > 0.1) {
    const share = extraSpace / unconstrainedIndices.length;
    unconstrainedIndices.forEach(idx => {
      allocated[idx] = Math.max(columns[idx].minWidth, allocated[idx] + share);
    });
  }

  return allocated;
};

// ----------------------------------------------------------------------------
// 4. VECTOR BRANDING & VECTOR LOGO RENDERER FOR PDF
// ----------------------------------------------------------------------------

export const drawVectorLogo = (doc: jsPDF, x: number, y: number, size: number = 10) => {
  const radius = size / 2;
  const cx = x + radius;
  const cy = y + radius;

  // Outer circle (SAP Deep Blue #002f6c)
  doc.setFillColor(0, 47, 108);
  doc.circle(cx, cy, radius, 'F');

  // Inner border circle (White)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, radius - 0.7, 'S');

  // Orange accent diagonal dynamic swoop (#f97316)
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(size * 0.1);
  doc.line(cx - radius * 0.8, cy + radius * 0.35, cx + radius * 0.8, cy - radius * 0.35);

  // Bold "SN" Monogram
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.8);
  doc.text('SN', cx, cy + size * 0.28, { align: 'center' });
};

// ----------------------------------------------------------------------------
// 5. CENTRAL ENTERPRISE PDF EXPORT ENGINE
// ----------------------------------------------------------------------------

export const exportToPDFEnterprise = (options: EnterpriseReportDefinition): string => {
  const normalizedColumns = analyzeReportColumns(options.headers, options.data);
  const columnCount = normalizedColumns.length;

  // 1. Intelligent Orientation Calculation
  let orientation: 'portrait' | 'landscape' = 'portrait';
  if (options.orientation && options.orientation !== 'auto') {
    orientation = options.orientation;
  } else {
    // Automatically choose landscape if more than 6 columns or wide content weights
    const totalMinW = normalizedColumns.reduce((sum, c) => sum + c.minWidth, 0);
    orientation = columnCount > 6 || totalMinW > 165 ? 'landscape' : 'portrait';
  }

  const paper = options.paperSize || 'a4';
  const density = options.density || 'standard';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: paper,
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

  // 2. Margins Calculation
  let leftMargin = 12;
  let rightMargin = 12;
  let topMargin = 52;
  let bottomMargin = 16;

  if (density === 'compact') {
    leftMargin = 8;
    rightMargin = 8;
    topMargin = 46;
    bottomMargin = 12;
  } else if (density === 'comfortable') {
    leftMargin = 16;
    rightMargin = 16;
    topMargin = 58;
    bottomMargin = 20;
  }

  const availableTableWidth = pageWidth - leftMargin - rightMargin;
  const calculatedWidths = calculatePreciseColumnWidths(normalizedColumns, availableTableWidth);

  // 3. Typographical Scale by Density
  let titleFontSize = 15;
  let tableHeaderFontSize = 8.5;
  let tableDataFontSize = 8;
  let cellPadding = 2;
  let metaFontSize = 7.5;

  if (density === 'compact') {
    titleFontSize = 13;
    tableHeaderFontSize = 7.5;
    tableDataFontSize = 7;
    cellPadding = 1.4;
    metaFontSize = 6.5;
  } else if (density === 'comfortable') {
    titleFontSize = 17;
    tableHeaderFontSize = 9.5;
    tableDataFontSize = 8.5;
    cellPadding = 2.8;
    metaFontSize = 8;
  }

  const generatedTime = options.generatedAt || new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const company = {
    name: options.companyDetails?.name || 'SN ENTERPRISES',
    tagline: options.companyDetails?.tagline || 'Construction Billing & Site Management ERP',
    gstin: options.companyDetails?.gstin || '07AAAAA1111A1Z1',
    address: options.companyDetails?.address || '123, Industrial Area, Phase-1, New Delhi - 110020',
    phone: options.companyDetails?.phone || '+91-9876543210',
    email: options.companyDetails?.email || 'accounts@snenterprises.co.in',
  };

  // 4. Header & Footer Drawing Function (Overlay on each page)
  const drawPageHeaderAndFooter = (pageNum: number, totalPages: number) => {
    const rightX = pageWidth - rightMargin;

    if (options.showHeader !== false) {
      // Top Primary Decorative Color Ribbon
      doc.setFillColor(0, 47, 108); // SAP Royal Navy
      doc.rect(0, 0, pageWidth, 4, 'F');
      
      doc.setFillColor(249, 115, 22); // Orange micro line
      doc.rect(0, 4, pageWidth, 0.6, 'F');

      // Logo Badge
      drawVectorLogo(doc, leftMargin, 8, 10);

      // Company Info Block
      doc.setTextColor(0, 47, 108);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(titleFontSize);
      doc.text(company.name, leftMargin + 13, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaFontSize);
      doc.setTextColor(90, 90, 90);
      doc.text(`${company.tagline}`, leftMargin + 13, 18);
      doc.text(`GSTIN: ${company.gstin} | Email: ${company.email} | Phone: ${company.phone}`, leftMargin + 13, 21.8);
      doc.text(`Address: ${company.address}`, leftMargin + 13, 25.4);

      // Right-aligned Document Title & Metadata Box
      doc.setTextColor(0, 47, 108);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(titleFontSize - 2);
      doc.text(options.title.toUpperCase(), rightX, 13.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaFontSize);
      doc.setTextColor(70, 70, 70);
      
      let metaY = 17.5;
      if (options.tcode || options.reportNo) {
        const docRef = [options.tcode ? `T-Code: ${options.tcode}` : '', options.reportNo ? `Ref: ${options.reportNo}` : ''].filter(Boolean).join(' | ');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 86, 179);
        doc.text(docRef, rightX, metaY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);
        metaY += 3.8;
      }
      if (options.projectName) {
        doc.text(`Project: ${options.projectName}`, rightX, metaY, { align: 'right' });
        metaY += 3.8;
      }
      if (options.clientName) {
        doc.text(`Client: ${options.clientName}`, rightX, metaY, { align: 'right' });
        metaY += 3.8;
      }
      if (options.dateRange || options.financialYear) {
        const periodStr = [options.financialYear ? `FY: ${options.financialYear}` : '', options.dateRange ? `Period: ${options.dateRange}` : ''].filter(Boolean).join(' | ');
        doc.text(periodStr, rightX, metaY, { align: 'right' });
        metaY += 3.8;
      }

      // Applied Filters Ribbon if present
      if (options.appliedFilters && options.appliedFilters.length > 0) {
        const filterStr = 'Filters: ' + options.appliedFilters.map(f => `${f.label}: ${f.value}`).join(' | ');
        doc.setFontSize(metaFontSize - 0.5);
        doc.setTextColor(110, 110, 110);
        doc.text(filterStr, leftMargin, 31);
      }

      // Header Divider Line
      doc.setDrawColor(0, 47, 108);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, 34, rightX, 34);
    }

    // WATERMARK
    if (options.watermark) {
      const watermarkText = typeof options.watermark === 'string'
        ? options.watermark
        : 'SN ENTERPRISES CONFIDENTIAL';
      
      doc.saveGraphicsState();
      doc.setTextColor(225, 230, 238);
      doc.setFontSize(pageWidth > 260 ? 40 : 30);
      doc.setFont('helvetica', 'bold');
      doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: orientation === 'landscape' ? 30 : 45,
      });
      doc.restoreGraphicsState();
    }

    // FOOTER
    if (options.showFooter !== false) {
      doc.setDrawColor(210, 215, 225);
      doc.setLineWidth(0.4);
      doc.line(leftMargin, pageHeight - bottomMargin + 2, rightX, pageHeight - bottomMargin + 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaFontSize);
      doc.setTextColor(120, 120, 120);

      // Left Footer
      const leftFooter = `${company.name}  |  Report: ${options.tcode || options.reportNo || 'ERP-PRD'}  |  Security: CONFIDENTIAL`;
      doc.text(leftFooter, leftMargin, pageHeight - bottomMargin + 6);
      doc.text(`Generated By: ${options.userName || 'Admin'}  |  Generated: ${generatedTime}`, leftMargin, pageHeight - bottomMargin + 10);

      // Center Signatory Indicator
      doc.text('Checked & Approved: ____________________', pageWidth / 2, pageHeight - bottomMargin + 8, { align: 'center' });

      // Right Footer (Page X of Y)
      if (options.showPageNumbers !== false) {
        doc.text(`Page ${pageNum} of ${totalPages}`, rightX, pageHeight - bottomMargin + 6, { align: 'right' });
      }
      doc.text(`SN-ERP Enterprise Core v5.0`, rightX, pageHeight - bottomMargin + 10, { align: 'right' });
    }
  };

  // 5. Draw Summary KPI Cards on Page 1 (if present)
  let startTableY = topMargin - 14;

  if (options.summaryBlocks && options.summaryBlocks.length > 0) {
    const blocks = options.summaryBlocks;
    const count = blocks.length;
    const cardGap = 2;
    const cardWidth = (availableTableWidth - (count - 1) * cardGap) / count;
    const cardHeight = density === 'compact' ? 11 : 13;
    const cardY = topMargin - 15;

    blocks.forEach((block, idx) => {
      const cardX = leftMargin + idx * (cardWidth + cardGap);

      // Card Background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1, 1, 'FD');

      // Accent color bar
      let accent = [0, 47, 108]; // default blue
      if (block.color === 'green') accent = [22, 163, 74];
      if (block.color === 'orange') accent = [217, 119, 6];
      if (block.color === 'red') accent = [220, 38, 38];
      if (block.color === 'purple') accent = [124, 58, 237];
      if (block.color === 'cyan') accent = [8, 145, 178];
      if (block.color === 'gray') accent = [100, 116, 139];

      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(cardX, cardY, 1.2, cardHeight, 'F');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(metaFontSize - 1);
      doc.setTextColor(100, 116, 139);
      doc.text(block.title.toUpperCase(), cardX + 2.5, cardY + 3.8);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(tableHeaderFontSize);
      doc.setTextColor(15, 23, 42);
      const displayVal = block.isCurrency
        ? formatIndianCurrency(block.value)
        : typeof block.value === 'number'
        ? formatIndianNumber(block.value)
        : String(block.value);
      doc.text(displayVal, cardX + 2.5, cardY + (density === 'compact' ? 8.5 : 9.8));
    });

    startTableY = cardY + cardHeight + 4;
  }

  // 6. Format Body Rows with Data Types & Alignment
  const processedData = options.data.map(row => {
    return row.map((cellVal, colIdx) => {
      const colDef = normalizedColumns[colIdx];
      if (cellVal === undefined || cellVal === null) return '';

      if (colDef.type === 'currency' && typeof cellVal === 'number') {
        return formatIndianCurrency(cellVal);
      }
      if (colDef.type === 'quantity' && typeof cellVal === 'number') {
        return formatIndianNumber(cellVal);
      }
      if (colDef.type === 'percentage' && typeof cellVal === 'number') {
        return `${cellVal.toFixed(2)}%`;
      }
      if (colDef.type === 'date') {
        return formatReportDate(cellVal);
      }
      return String(cellVal);
    });
  });

  // Prepare Totals Row if provided
  if (options.totals && options.totals.length > 0) {
    const formattedTotals = options.totals.map((tVal, colIdx) => {
      const colDef = normalizedColumns[colIdx];
      if (tVal === undefined || tVal === null) return '';
      if (colDef.type === 'currency' && typeof tVal === 'number') {
        return formatIndianCurrency(tVal);
      }
      if (colDef.type === 'quantity' && typeof tVal === 'number') {
        return formatIndianNumber(tVal);
      }
      return String(tVal);
    });
    processedData.push(formattedTotals);
  }

  // 7. Autotable Column Styles Configuration
  const colStylesConfig: Record<number, any> = {};
  normalizedColumns.forEach((col, idx) => {
    colStylesConfig[idx] = {
      halign: col.align,
      cellWidth: calculatedWidths[idx],
    };
  });

  const tableHeaders = normalizedColumns.map(c => c.header);

  // 8. Generate Main Autotable
  autoTable(doc, {
    startY: startTableY,
    margin: { left: leftMargin, right: rightMargin, top: topMargin - 15, bottom: bottomMargin + 6 },
    head: [tableHeaders],
    body: processedData,
    theme: 'grid',
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: tableDataFontSize,
      cellPadding: cellPadding,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [0, 47, 108], // Deep SAP Navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: tableHeaderFontSize,
      valign: 'middle',
      lineWidth: 0.3,
      lineColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Subtle zebra striping
    },
    columnStyles: colStylesConfig,
    willDrawCell: data => {
      // Highlight Totals Row
      const isLastTotalsRow = options.totals && options.totals.length > 0 && data.row.index === processedData.length - 1;
      if (isLastTotalsRow) {
        doc.setFont('helvetica', 'bold');
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }

      // Negative number / currency red accent
      const cellText = String(data.cell.raw || '');
      if (cellText.startsWith('-₹') || cellText.startsWith('-Rs') || cellText.startsWith('-')) {
        data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  // 9. Signatures Block if specified
  // @ts-ignore
  let finalTableY = doc.lastAutoTable.finalY + 8;
  if (options.signatures && options.signatures.length > 0) {
    if (finalTableY > pageHeight - 35) {
      doc.addPage();
      finalTableY = 25;
    }

    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.4);
    doc.line(leftMargin, finalTableY, pageWidth - rightMargin, finalTableY);
    finalTableY += 8;

    const sigCount = options.signatures.length;
    const sigColWidth = availableTableWidth / sigCount;

    options.signatures.forEach((sig, idx) => {
      const sigX = leftMargin + idx * sigColWidth + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(metaFontSize + 0.5);
      doc.setTextColor(50, 50, 50);
      doc.text(sig.title, sigX, finalTableY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaFontSize - 0.5);
      doc.setTextColor(120, 120, 120);
      doc.text('Signature: __________________________', sigX, finalTableY + 7);
      if (sig.subtitle || sig.name) {
        doc.text(sig.name || sig.subtitle || '', sigX, finalTableY + 11);
      }
    });
  }

  // 10. Multi-Page Pass for Repeating Headers, Footers & Numbering
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageHeaderAndFooter(i, totalPages);
  }

  return doc.output('bloburl') as any as string;
};

// ----------------------------------------------------------------------------
// 6. CENTRAL ENTERPRISE EXCEL EXPORT ENGINE (XLSX)
// ----------------------------------------------------------------------------

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

export const exportToExcelEnterprise = (
  options: EnterpriseReportDefinition,
  customFilename?: string
) => {
  const normalizedColumns = analyzeReportColumns(options.headers, options.data);
  const rawHeaders = normalizedColumns.map(c => c.header);
  const rawData = options.data;

  const workbook = XLSX.utils.book_new();

  // --------------------------------------------------------------------------
  // SHEET 1: MAIN FORMATTED REPORT
  // --------------------------------------------------------------------------
  const sheetRows: any[][] = [];

  // 1. Company Header
  const compName = options.companyDetails?.name || 'SN ENTERPRISES';
  const gstin = options.companyDetails?.gstin || '07AAAAA1111A1Z1';
  const email = options.companyDetails?.email || 'accounts@snenterprises.co.in';
  const phone = options.companyDetails?.phone || '+91-9876543210';
  const addr = options.companyDetails?.address || '123, Industrial Area, Phase-1, New Delhi - 110020';

  sheetRows.push([compName]);
  sheetRows.push([addr]);
  sheetRows.push([`GSTIN: ${gstin}  |  Email: ${email}  |  Phone: ${phone}`]);

  // 2. Report Metadata
  let metaLine = `REPORT: ${options.title.toUpperCase()}`;
  if (options.tcode) metaLine += `  |  T-CODE: ${options.tcode}`;
  if (options.projectName) metaLine += `  |  PROJECT: ${options.projectName}`;
  if (options.clientName) metaLine += `  |  CLIENT: ${options.clientName}`;
  if (options.financialYear) metaLine += `  |  FY: ${options.financialYear}`;
  if (options.dateRange) metaLine += `  |  PERIOD: ${options.dateRange}`;
  sheetRows.push([metaLine]);

  if (options.appliedFilters && options.appliedFilters.length > 0) {
    const filterLine = 'APPLIED FILTERS: ' + options.appliedFilters.map(f => `${f.label}: ${f.value}`).join(' | ');
    sheetRows.push([filterLine]);
  } else {
    sheetRows.push([]);
  }

  // 3. KPI Summary Blocks (if present)
  let kpiOffset = 0;
  if (options.summaryBlocks && options.summaryBlocks.length > 0) {
    const kpiTitles: string[] = [];
    const kpiValues: any[] = [];
    options.summaryBlocks.forEach(b => {
      kpiTitles.push(b.title.toUpperCase());
      kpiValues.push(b.value);
    });
    sheetRows.push(kpiTitles);
    sheetRows.push(kpiValues);
    sheetRows.push([]); // blank divider
    kpiOffset = 3;
  }

  // 4. Main Table Headers
  const tableHeaderRowIndex = 5 + kpiOffset;
  sheetRows.push(rawHeaders);

  // 5. Data Rows
  rawData.forEach(row => {
    sheetRows.push(row);
  });

  // 6. Totals Row (if present)
  if (options.totals && options.totals.length > 0) {
    sheetRows.push(options.totals);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

  // 7. AutoFilter & Freeze Panes
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const lastColLetter = getExcelColumnLetter(rawHeaders.length);
  const freezeRowLimit = tableHeaderRowIndex + 1;

  worksheet['!views'] = [
    {
      state: 'frozen',
      ySplit: freezeRowLimit,
      xSplit: 0,
      topLeftCell: `A${freezeRowLimit + 1}`,
      activePane: 'bottomLeft',
    },
  ];

  worksheet['!autofilter'] = {
    ref: `A${freezeRowLimit}:${lastColLetter}${range.e.r + 1}`,
  };

  // 8. Page Print Setup
  worksheet['!pageSetup'] = {
    orientation: options.orientation === 'portrait' ? 'portrait' : 'landscape',
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // 9. Numeric, Date & Currency Formatting
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellRef];
      if (!cell) continue;

      const isHeaderRow = R <= tableHeaderRowIndex;
      const isTotalsRow = options.totals && (R === range.e.r);
      const colDef = normalizedColumns[C];

      if (!isHeaderRow && colDef) {
        if (colDef.type === 'currency' && cell.v !== undefined && cell.v !== null && cell.v !== '') {
          const num = typeof cell.v === 'number'
            ? cell.v
            : parseFloat(String(cell.v).replace(/[^\d.-]/g, ''));
          if (!isNaN(num)) {
            cell.v = num;
            cell.t = 'n';
            cell.z = '[$₹-3c09]#,##,##0.00;[Red]-[$₹-3c09]#,##,##0.00;0.00';
          }
        } else if ((colDef.type === 'quantity' || colDef.type === 'number') && cell.v !== undefined && cell.v !== null) {
          const num = typeof cell.v === 'number'
            ? cell.v
            : parseFloat(String(cell.v).replace(/[^\d.-]/g, ''));
          if (!isNaN(num)) {
            cell.v = num;
            cell.t = 'n';
            cell.z = '#,##,##0.00';
          }
        } else if (colDef.type === 'date' && cell.v) {
          cell.v = formatReportDate(cell.v);
          cell.t = 's';
        }
      }
    }
  }

  // 10. Intelligent Column Widths Calculation
  const maxLens = rawHeaders.map((colHeader, cIdx) => {
    const colDef = normalizedColumns[cIdx];
    let maxLen = colHeader.length;

    rawData.forEach(row => {
      const cellVal = row[cIdx];
      if (cellVal !== undefined && cellVal !== null) {
        let len = 0;
        if (colDef.type === 'currency' && typeof cellVal === 'number') {
          len = formatIndianCurrency(cellVal).length;
        } else {
          len = String(cellVal).length;
        }
        if (len > maxLen) maxLen = len;
      }
    });

    return Math.max(maxLen + 3, colDef.minWidth * 0.7, 10);
  });

  worksheet['!cols'] = maxLens.map(len => ({ wch: Math.min(Math.round(len), 60) }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report_Statement');

  // --------------------------------------------------------------------------
  // SHEET 2: SUMMARY & KPIS (If Summary Blocks Exist)
  // --------------------------------------------------------------------------
  if (options.summaryBlocks && options.summaryBlocks.length > 0) {
    const summarySheetRows: any[][] = [
      ['SN ENTERPRISES - EXECUTIVE SUMMARY STATEMENT'],
      ['Report Name', options.title],
      ['Project', options.projectName || 'All'],
      ['Client', options.clientName || 'All'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      [],
      ['METRIC DESCRIPTION', 'VALUE / AMOUNT'],
    ];

    options.summaryBlocks.forEach(b => {
      summarySheetRows.push([
        b.title,
        b.isCurrency ? formatIndianCurrency(b.value) : b.value,
      ]);
    });

    if (options.totals && options.totals.length > 0) {
      summarySheetRows.push([]);
      summarySheetRows.push(['AGGREGATE TOTALS']);
      rawHeaders.forEach((h, idx) => {
        const tVal = options.totals![idx];
        if (tVal !== undefined && tVal !== null && tVal !== '') {
          summarySheetRows.push([h, tVal]);
        }
      });
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetRows);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Executive_Summary');
  }

  // --------------------------------------------------------------------------
  // SHEET 3: SOURCE DATA / CUSTOM SHEETS (If Provided)
  // --------------------------------------------------------------------------
  if (options.customSheets && options.customSheets.length > 0) {
    options.customSheets.forEach(custom => {
      const customRows = [custom.headers, ...custom.data];
      if (custom.totals) customRows.push(custom.totals);
      const wsCustom = XLSX.utils.aoa_to_sheet(customRows);
      XLSX.utils.book_append_sheet(workbook, wsCustom, custom.sheetName.substring(0, 31));
    });
  }

  // 11. Trigger Download
  const filename = customFilename || generateReportFilename(options.title, options.projectName, 'xlsx');
  XLSX.writeFile(workbook, filename);
};

// ----------------------------------------------------------------------------
// 7. PRINT ENGINE & PRINT PREVIEW UTILITIES
// ----------------------------------------------------------------------------

/**
 * Triggers direct browser printing of the generated report PDF blob
 */
export const printReportBlob = (blobUrl: string) => {
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    });
  } else {
    // Fallback: hidden iframe print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    };
  }
};

/**
 * Download helper for PDF blob url
 */
export const downloadReportPDF = (
  blobUrl: string,
  title: string,
  projectName?: string,
  customFilename?: string
) => {
  const filename = customFilename || generateReportFilename(title, projectName, 'pdf');
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
