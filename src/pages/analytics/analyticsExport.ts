import { FilteredAnalyticsData } from './analyticsData';
import { AnalyticsFilterState } from './analyticsTypes';
import {
  exportToPDFEnterprise,
  exportToExcelEnterprise,
  downloadReportPDF,
  EnterpriseReportDefinition,
} from '../../lib/exportEngine';

export interface ExportReportHeaderMeta {
  companyName: string;
  reportName: string;
  projectName: string;
  clientName: string;
  financialYear: string;
  dateRange: string;
  generatedDate: string;
  generatedBy: string;
}

// 1. Export PDF via Centralized Engine
export const exportAnalyticsPDF = (
  analytics: FilteredAnalyticsData,
  filters: AnalyticsFilterState,
  meta: ExportReportHeaderMeta
) => {
  const summaryBlocks = [
    { title: 'Total Work Done', value: analytics.kpis.totalWorkAmount, isCurrency: true, color: 'blue' as const },
    { title: 'Billed Amount', value: analytics.kpis.totalBillingAmount, isCurrency: true, color: 'purple' as const },
    { title: 'Amount Received', value: analytics.kpis.totalAmountReceived, isCurrency: true, color: 'green' as const },
    { title: 'Outstanding Balance', value: analytics.kpis.outstanding, isCurrency: true, color: 'orange' as const },
    { title: 'Site Expenses', value: analytics.kpis.totalExpenses, isCurrency: true, color: 'red' as const },
    { title: 'Worker Wages Paid', value: analytics.kpis.totalWorkerPayments, isCurrency: true, color: 'cyan' as const },
  ];

  const headers = [
    { header: 'Month / Period', type: 'date' as const },
    { header: 'Client Inflow (INR)', type: 'currency' as const },
    { header: 'Site Expenses (INR)', type: 'currency' as const },
    { header: 'Worker Wages (INR)', type: 'currency' as const },
    { header: 'Subcontractor (INR)', type: 'currency' as const },
    { header: 'Total Outflows (INR)', type: 'currency' as const },
    { header: 'Net Cash Margin (INR)', type: 'currency' as const },
  ];

  const data = analytics.incomeVsExpense.map(row => {
    const totalOut = row.expenses + row.workerPayments + row.subcontractorPayments;
    const netMargin = row.clientReceived - totalOut;
    return [
      row.month,
      row.clientReceived,
      row.expenses,
      row.workerPayments,
      row.subcontractorPayments,
      totalOut,
      netMargin,
    ];
  });

  const totals = [
    'TOTALS',
    analytics.incomeVsExpense.reduce((s, r) => s + r.clientReceived, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.expenses, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.workerPayments, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.subcontractorPayments, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + (r.expenses + r.workerPayments + r.subcontractorPayments), 0),
    analytics.incomeVsExpense.reduce((s, r) => s + (r.clientReceived - (r.expenses + r.workerPayments + r.subcontractorPayments)), 0),
  ];

  const projectSheetData = (analytics.projectWiseBilling || []).map((p, idx) => {
    const exp = (analytics.projectWiseExpenses || []).find(e => e.projectId === p.projectId)?.totalExpense || 0;
    return [
      idx + 1,
      p.projectName,
      p.clientName,
      p.billingAmount,
      p.workAmount,
      exp,
      p.billingAmount - exp,
    ];
  });

  const reportDef: EnterpriseReportDefinition = {
    title: meta.reportName || 'Executive Financial & Operational Analytics',
    subtitle: 'Integrated Multi-Site Performance, Cashflows & Profitability Ledger',
    tcode: 'BI-ANL-01',
    projectName: meta.projectName,
    clientName: meta.clientName,
    financialYear: meta.financialYear,
    dateRange: meta.dateRange,
    headers,
    data,
    totals,
    summaryBlocks,
    userName: meta.generatedBy,
    orientation: 'landscape',
    customSheets: [
      {
        sheetName: 'Site_Billing_and_Expenses',
        headers: ['#', 'Project Site', 'Client Name', 'Total Billed (INR)', 'Work Done (INR)', 'Site Expenses (INR)', 'Net Surplus (INR)'],
        data: projectSheetData,
      },
    ],
    signatures: [
      { title: 'Prepared By: Financial Analyst' },
      { title: 'Verified By: Chief Financial Officer' },
      { title: 'Approved By: Managing Director' },
    ],
  };

  const blobUrl = exportToPDFEnterprise(reportDef);
  downloadReportPDF(blobUrl, meta.reportName, meta.projectName);
};

// 2. Print Report directly via Centralized Engine
export const printAnalyticsReport = (
  analytics: FilteredAnalyticsData,
  filters: AnalyticsFilterState,
  meta: ExportReportHeaderMeta
) => {
  const summaryBlocks = [
    { title: 'Total Work Done', value: analytics.kpis.totalWorkAmount, isCurrency: true, color: 'blue' as const },
    { title: 'Billed Amount', value: analytics.kpis.totalBillingAmount, isCurrency: true, color: 'purple' as const },
    { title: 'Amount Received', value: analytics.kpis.totalAmountReceived, isCurrency: true, color: 'green' as const },
    { title: 'Outstanding Balance', value: analytics.kpis.outstanding, isCurrency: true, color: 'orange' as const },
    { title: 'Site Expenses', value: analytics.kpis.totalExpenses, isCurrency: true, color: 'red' as const },
    { title: 'Worker Wages Paid', value: analytics.kpis.totalWorkerPayments, isCurrency: true, color: 'cyan' as const },
  ];

  const headers = [
    { header: 'Month / Period', type: 'date' as const },
    { header: 'Client Inflow (INR)', type: 'currency' as const },
    { header: 'Site Expenses (INR)', type: 'currency' as const },
    { header: 'Worker Wages (INR)', type: 'currency' as const },
    { header: 'Subcontractor (INR)', type: 'currency' as const },
    { header: 'Total Outflows (INR)', type: 'currency' as const },
    { header: 'Net Cash Margin (INR)', type: 'currency' as const },
  ];

  const data = analytics.incomeVsExpense.map(row => {
    const totalOut = row.expenses + row.workerPayments + row.subcontractorPayments;
    const netMargin = row.clientReceived - totalOut;
    return [
      row.month,
      row.clientReceived,
      row.expenses,
      row.workerPayments,
      row.subcontractorPayments,
      totalOut,
      netMargin,
    ];
  });

  const totals = [
    'TOTALS',
    analytics.incomeVsExpense.reduce((s, r) => s + r.clientReceived, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.expenses, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.workerPayments, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.subcontractorPayments, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + (r.expenses + r.workerPayments + r.subcontractorPayments), 0),
    analytics.incomeVsExpense.reduce((s, r) => s + (r.clientReceived - (r.expenses + r.workerPayments + r.subcontractorPayments)), 0),
  ];

  const reportDef: EnterpriseReportDefinition = {
    title: meta.reportName || 'Executive Financial & Operational Analytics',
    subtitle: 'Integrated Multi-Site Performance, Cashflows & Profitability Ledger',
    tcode: 'BI-ANL-01',
    projectName: meta.projectName,
    clientName: meta.clientName,
    financialYear: meta.financialYear,
    dateRange: meta.dateRange,
    headers,
    data,
    totals,
    summaryBlocks,
    userName: meta.generatedBy,
    orientation: 'landscape',
    signatures: [
      { title: 'Prepared By: Financial Analyst' },
      { title: 'Verified By: Chief Financial Officer' },
      { title: 'Approved By: Managing Director' },
    ],
  };

  const blobUrl = exportToPDFEnterprise(reportDef);
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
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.open(blobUrl, '_blank');
    }
  };
};

// 3. Export Excel via Centralized Engine
export const exportAnalyticsExcel = (
  analytics: FilteredAnalyticsData,
  filters: AnalyticsFilterState,
  meta: ExportReportHeaderMeta
) => {
  const summaryBlocks = [
    { title: 'Total Work Done', value: analytics.kpis.totalWorkAmount, isCurrency: true },
    { title: 'Billed Amount', value: analytics.kpis.totalBillingAmount, isCurrency: true },
    { title: 'Amount Received', value: analytics.kpis.totalAmountReceived, isCurrency: true },
    { title: 'Outstanding Balance', value: analytics.kpis.outstanding, isCurrency: true },
    { title: 'Site Expenses', value: analytics.kpis.totalExpenses, isCurrency: true },
    { title: 'Worker Wages Paid', value: analytics.kpis.totalWorkerPayments, isCurrency: true },
  ];

  const headers = [
    'Month / Period',
    'Client Inflow (INR)',
    'Site Expenses (INR)',
    'Worker Wages (INR)',
    'Subcontractor Payouts (INR)',
    'Total Outflows (INR)',
    'Net Cash Margin (INR)',
  ];

  const data = analytics.incomeVsExpense.map(row => {
    const totalOut = row.expenses + row.workerPayments + row.subcontractorPayments;
    const netMargin = row.clientReceived - totalOut;
    return [
      row.month,
      row.clientReceived,
      row.expenses,
      row.workerPayments,
      row.subcontractorPayments,
      totalOut,
      netMargin,
    ];
  });

  const totals = [
    'TOTALS',
    analytics.incomeVsExpense.reduce((s, r) => s + r.clientReceived, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.expenses, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.workerPayments, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + r.subcontractorPayments, 0),
    analytics.incomeVsExpense.reduce((s, r) => s + (r.expenses + r.workerPayments + r.subcontractorPayments), 0),
    analytics.incomeVsExpense.reduce((s, r) => s + (r.clientReceived - (r.expenses + r.workerPayments + r.subcontractorPayments)), 0),
  ];

  const projectSheetData = (analytics.projectWiseBilling || []).map((p, idx) => {
    const exp = (analytics.projectWiseExpenses || []).find(e => e.projectId === p.projectId)?.totalExpense || 0;
    return [
      idx + 1,
      p.projectName,
      p.clientName,
      p.billingAmount,
      p.workAmount,
      exp,
      p.billingAmount - exp,
    ];
  });

  const reportDef: EnterpriseReportDefinition = {
    title: meta.reportName || 'Analytics_Ledger',
    projectName: meta.projectName,
    clientName: meta.clientName,
    financialYear: meta.financialYear,
    dateRange: meta.dateRange,
    headers,
    data,
    totals,
    summaryBlocks,
    userName: meta.generatedBy,
    customSheets: [
      {
        sheetName: 'Site_Billing_Expenses',
        headers: ['#', 'Project Site', 'Client Name', 'Total Billed (INR)', 'Work Done (INR)', 'Site Expenses (INR)', 'Net Surplus (INR)'],
        data: projectSheetData,
      },
    ],
  };

  exportToExcelEnterprise(reportDef);
};
