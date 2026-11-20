import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports data to Excel using SheetJS
 */
export function exportToExcel<T extends object>(rows: T[], filename: string): void {
  const worksheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Data');
  writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Exports data to PDF using jsPDF + AutoTable
 */
export function exportToPdf(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  metaLines: string[] = []
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const now = new Date().toLocaleString();

  // Institute Header
  doc.setFontSize(18);
  doc.setTextColor(26, 23, 69); // Deep Navy
  doc.text('Apex Institute of Technology', 14, 15);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(title, 14, 22);
  
  doc.setFontSize(8);
  doc.text(`Generated on: ${now}`, 14, 27);

  let startY = 32;
  if (metaLines.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    metaLines.forEach((line, idx) => {
      doc.text(line, 14, 33 + idx * 5);
    });
    startY = 35 + metaLines.length * 5;
  }

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [109, 66, 232], textColor: 255 }, // Indigo
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { top: startY },
    didDrawPage: (data) => {
      // Footer
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    }
  });

  doc.save(`${filename}.pdf`);
}

export function exportReceiptToPdf(params: {
  receiptNo: string;
  date: string;
  status: string;
  studentName: string;
  enrollmentNo: string;
  courseName: string;
  mode: string;
  refNo?: string;
  collectedBy: string;
  items: { label: string; amount: string; fine?: string }[];
  subtotal: string;
  fine: string;
  concession: string;
  total: string;
  amountInWords: string;
}): void {
  const doc = new jsPDF('p', 'mm', 'a4');

  doc.setFillColor(26, 23, 69);
  doc.rect(0, 0, 210, 34, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Apex Institute of Technology', 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('OFFICIAL INSTITUTIONAL FEE RECEIPT', 14, 24);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(params.receiptNo, 196, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Status: ${params.status.toUpperCase()}`, 196, 24, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Student Name: ${params.studentName}`, 14, 46);
  doc.text(`Enrollment No: ${params.enrollmentNo}`, 14, 53);
  doc.text(`Program / Course: ${params.courseName}`, 14, 60);

  doc.text(`Receipt Date: ${params.date}`, 196, 46, { align: 'right' });
  doc.text(`Payment Mode: ${params.mode}`, 196, 53, { align: 'right' });
  if (params.refNo) {
    doc.text(`Reference ID: ${params.refNo}`, 196, 60, { align: 'right' });
  }

  const bodyRows: (string | number)[][] = params.items.map(i => [
    i.label,
    i.fine || '₹0',
    i.amount,
  ]);
  bodyRows.push(['Subtotal', '', params.subtotal]);
  bodyRows.push(['Late Payment Fine', '', `+ ${params.fine}`]);
  bodyRows.push(['Scholarship / Concession', '', `- ${params.concession}`]);
  bodyRows.push(['NET TOTAL RECEIVED', '', params.total]);

  autoTable(doc, {
    startY: 68,
    head: [['Fee Particulars', 'Fine', 'Amount']],
    body: bodyRows,
    theme: 'grid',
    headStyles: { fillColor: [109, 66, 232], textColor: 255 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Amount in Words: ${params.amountInWords}`, 14, finalY + 12);
  doc.text(`Collected By: ${params.collectedBy}`, 14, finalY + 20);
  doc.text('Authorized Accounts Signatory', 196, finalY + 28, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Computer-generated institutional receipt persisted in EduERP Financial Ledger.', 14, 282);

  doc.save(`${params.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}
