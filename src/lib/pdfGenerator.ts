/**
 * SN ENTERPRISES ERP - PDF GENERATOR WRAPPER
 * Standardized across the ERP using the centralized /src/lib/exportEngine.ts
 */

import {
  exportToPDFEnterprise,
  formatIndianCurrency,
  formatIndianNumber,
  formatReportDate,
  downloadReportPDF,
  EnterpriseReportDefinition,
} from './exportEngine';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  tcode?: string;
  headers: string[];
  data: (string | number | boolean | null | undefined)[][];
  totals?: (string | number)[];
  filename?: string;
  userName?: string;
  siteName?: string;
  clientName?: string;
  dateRange?: string;
  watermark?: boolean;
}

/**
 * Universal exportToPDF wrapper
 */
export const exportToPDF = ({
  title,
  subtitle,
  tcode,
  headers,
  data,
  totals,
  filename,
  userName = 'Admin',
  siteName,
  clientName,
  dateRange,
  watermark = false,
}: PDFExportOptions): string => {
  const options: EnterpriseReportDefinition = {
    title,
    subtitle,
    tcode,
    projectName: siteName,
    clientName,
    dateRange,
    headers,
    data,
    totals,
    userName,
    watermark,
    filename,
  };

  return exportToPDFEnterprise(options);
};

/**
 * Universal downloadPDF wrapper
 */
export const downloadPDF = (
  blobUrl: URL | string | Blob | MediaSource,
  filename: string = 'SN_ENTERPRISES_Report.pdf'
) => {
  const url = typeof blobUrl === 'string' ? blobUrl : (blobUrl as any).toString();
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formatted Indian currency helper
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  return formatIndianCurrency(val);
};

/**
 * Professional Consolidated Executive Performance Report
 */
export const exportConsolidatedSitesReportToPDF = (state: any, userName: string = 'Executive'): string => {
  const projects = state.projects || [];
  const billings = state.billings || [];
  const clientPayments = state.clientPayments || [];
  const workerPayments = state.workerPayments || [];
  const advances = state.advances || [];
  const kharchis = state.kharchis || [];
  const workers = state.workers || [];

  let totalBilled = 0;
  let totalReceived = 0;
  let totalWages = 0;
  let totalAdv = 0;
  let totalKhar = 0;

  const tableData = projects.map((p: any, idx: number) => {
    const siteBills = billings.filter((b: any) => b.projectId === p.id);
    const siteBilled = siteBills.reduce((s: number, b: any) => s + (b.amount || 0), 0);
    const sitePays = clientPayments.filter((cp: any) => cp.projectId === p.id);
    const siteRecv = sitePays.reduce((s: number, cp: any) => s + (cp.amountReceived || 0), 0);
    const siteOust = siteBilled - siteRecv;

    const siteWorkers = workers.filter((w: any) => w.projectId === p.id);
    const siteWages = workerPayments
      .filter((wp: any) => wp.projectId === p.id)
      .reduce((s: number, wp: any) => s + (wp.workAmount || 0), 0);
    const siteAdv = advances
      .filter((ad: any) => ad.projectId === p.id)
      .reduce((s: number, ad: any) => s + (ad.amount || 0), 0);
    const siteKhar = kharchis
      .filter((kh: any) => kh.projectId === p.id)
      .reduce((s: number, kh: any) => s + (kh.amount || 0), 0);

    totalBilled += siteBilled;
    totalReceived += siteRecv;
    totalWages += siteWages;
    totalAdv += siteAdv;
    totalKhar += siteKhar;

    return [
      idx + 1,
      p.name || 'Unnamed Site',
      p.clientName || 'N/A',
      p.status || 'Active',
      siteWorkers.length,
      siteBilled,
      siteRecv,
      siteOust,
      siteWages,
      siteAdv + siteKhar,
    ];
  });

  const totals = [
    'TOTAL',
    'CONSOLIDATED ALL SITES',
    '',
    '',
    workers.length,
    totalBilled,
    totalReceived,
    totalBilled - totalReceived,
    totalWages,
    totalAdv + totalKhar,
  ];

  const summaryBlocks = [
    { title: 'Total Active Sites', value: projects.length, color: 'blue' as const },
    { title: 'Active Workforce', value: workers.length, color: 'purple' as const },
    { title: 'Total Billed Amount', value: totalBilled, isCurrency: true, color: 'green' as const },
    { title: 'Total Collected', value: totalReceived, isCurrency: true, color: 'cyan' as const },
    { title: 'Total Outstanding', value: totalBilled - totalReceived, isCurrency: true, color: 'orange' as const },
    { title: 'Labor Outflow', value: totalWages, isCurrency: true, color: 'red' as const },
  ];

  const headers = [
    { header: '#', type: 'sr' as const },
    { header: 'Project Site', type: 'text' as const },
    { header: 'Client', type: 'text' as const },
    { header: 'Status', type: 'status' as const },
    { header: 'Workers', type: 'quantity' as const },
    { header: 'Billed Amount', type: 'currency' as const },
    { header: 'Amount Received', type: 'currency' as const },
    { header: 'Outstanding', type: 'currency' as const },
    { header: 'Gross Wages', type: 'currency' as const },
    { header: 'Advances & Kharchi', type: 'currency' as const },
  ];

  return exportToPDFEnterprise({
    title: 'Consolidated Site Executive Performance Report',
    subtitle: 'Comprehensive Project Directory, Receivables & Workforce Outflows',
    tcode: 'PRD-EXEC-01',
    headers,
    data: tableData,
    totals,
    summaryBlocks,
    userName,
    watermark: false,
    orientation: 'landscape',
    signatures: [
      { title: 'Prepared By: Project Accountant' },
      { title: 'Verified By: Operations Manager' },
      { title: 'Approved By: Managing Director' },
    ],
  });
};

/**
 * Professional Individual Bill Payment Certificate PDF
 */
export const exportIndividualBillToPDF = (
  bill: any,
  projectName: string,
  userName: string = 'Admin'
): string => {
  const tdsVal = bill.tds ?? 0;
  const retVal = bill.retention ?? 0;
  const gstVal = bill.gst ?? 0;
  const extraVal = bill.extraWorkAmount ?? 0;
  const debitVal = bill.debitAmount ?? 0;
  const holdVal = bill.holdAmount ?? 0;
  const netAmount = (bill.amount || 0) + extraVal - tdsVal - retVal + gstVal - debitVal - holdVal;

  const summaryBlocks = [
    { title: 'Gross Bill Amount', value: bill.amount || 0, isCurrency: true, color: 'blue' as const },
    { title: 'TDS Deducted', value: tdsVal, isCurrency: true, color: 'red' as const },
    { title: 'Retention Deducted', value: retVal, isCurrency: true, color: 'orange' as const },
    { title: 'GST Added', value: gstVal, isCurrency: true, color: 'purple' as const },
    { title: 'Net Certified Payable', value: netAmount, isCurrency: true, color: 'green' as const },
  ];

  let headers: any[] = [];
  let data: any[][] = [];
  let totals: any[] = [];

  if (bill.measurementItems && bill.measurementItems.length > 0) {
    headers = [
      { header: '#', type: 'sr' as const },
      { header: 'Item Description / Scope of Work', type: 'text' as const },
      { header: 'Unit', type: 'status' as const },
      { header: 'Rate (Rs)', type: 'currency' as const },
      { header: 'Executed Qty', type: 'quantity' as const },
      { header: 'Total Value (INR)', type: 'currency' as const },
    ];

    data = bill.measurementItems.map((item: any, idx: number) => [
      idx + 1,
      item.description || 'General Work Execution',
      item.unit || 'Nos',
      item.rate || 0,
      item.qtyExecuted || 0,
      item.amount || (item.qtyExecuted || 0) * (item.rate || 0),
    ]);

    const totalMeasured = data.reduce((s, row) => s + (Number(row[5]) || 0), 0);
    totals = ['', 'TOTAL MEASURED PROGRESS VALUE', '', '', '', totalMeasured];
  } else {
    headers = [
      { header: 'Item Description', type: 'text' as const },
      { header: 'Nature / Factor', type: 'status' as const },
      { header: 'Amount (INR)', type: 'currency' as const },
    ];

    data = [
      ['Gross Work Progress Certified', 'Base Value (+)', bill.amount || 0],
      ['Extra Work Certified', 'Addition (+)', extraVal],
      ['TDS (Tax Deducted at Source)', 'Deduction (-)', tdsVal],
      ['Retention Security Deposit', 'Deduction (-)', retVal],
      ['GST (Goods & Services Tax)', 'Tax Addition (+)', gstVal],
      ['Debit / Material Deduction', 'Deduction (-)', debitVal],
      ['Withheld / Hold Amount', 'Deduction (-)', holdVal],
    ];

    totals = ['TOTAL NET CERTIFIED PAYABLE', 'Net Amount', netAmount];
  }

  return exportToPDFEnterprise({
    title: 'Bill Payment Certificate & Schedule',
    subtitle: `Official Progress Billing Voucher - ${bill.billType || 'Running Account (RA)'}`,
    tcode: 'BILL01',
    reportNo: bill.billNo || 'BILL-CERT',
    projectName,
    dateRange: bill.month || formatReportDate(bill.certifyDate),
    appliedFilters: [
      { label: 'Bill No', value: bill.billNo || 'N/A' },
      { label: 'Certify Date', value: formatReportDate(bill.certifyDate) },
      { label: 'Work Nature', value: bill.workNature || 'General Execution' },
    ],
    headers,
    data,
    totals,
    summaryBlocks,
    userName,
    orientation: 'portrait',
    signatures: [
      { title: 'Prepared By: Billing Engineer' },
      { title: 'Checked By: Project Manager' },
      { title: 'Approved By: Client Authorized Signatory' },
    ],
  });
};
