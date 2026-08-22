/**
 * SN ENTERPRISES ERP - REPORT ENGINE COMPATIBILITY WRAPPER
 * All operations are powered by the centralized /src/lib/exportEngine.ts
 */

export * from './exportEngine';
export {
  exportToPDFEnterprise,
  exportToExcelEnterprise,
  formatIndianCurrency,
  formatIndianNumber,
  formatReportDate,
  generateReportFilename,
  drawVectorLogo,
  printReportBlob,
  downloadReportPDF,
} from './exportEngine';

export type {
  EnterpriseReportDefinition as EnterpriseReportOptions,
  ReportSummaryBlock,
  ReportColumnConfig,
  ReportTaxDeductions,
  ReportSignature,
  ReportDensity,
  ReportPaperSize,
  ReportOrientation,
  ReportAlignment,
  ReportDataType,
} from './exportEngine';
