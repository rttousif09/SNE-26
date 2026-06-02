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

export const downloadPDF = (blobUrl: URL | string | Blob | MediaSource, filename: string) => {
  const link = document.createElement('a');
  link.href = blobUrl as string;
  link.download = filename;
  link.click();
};

export const formatCurrency = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return val;
  return 'Rs ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
