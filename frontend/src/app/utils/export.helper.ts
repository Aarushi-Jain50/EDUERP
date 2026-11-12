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
export function exportToPdf(title: string, columns: string[], rows: (string | number)[][], filename: string): void {
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

  autoTable(doc, {
    startY: 32,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [109, 66, 232], textColor: 255 }, // Indigo
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { top: 32 },
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
