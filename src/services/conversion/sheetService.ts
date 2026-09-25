import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { ProgressCallback } from '@/types/pdf';

export const sheetService = {
  /**
   * Extract text & tabular structures from PDF into an Excel (.xlsx) file
   */
  async pdfToExcel(buffer: ArrayBuffer, onProgress?: ProgressCallback): Promise<Blob> {
    if (onProgress) onProgress(15, 'Scanning PDF for tabular content...');
    const pdfDoc = await pdfJsService.loadDocument(buffer);
    const totalPages = pdfDoc.numPages;

    const workbook = XLSX.utils.book_new();

    for (let p = 1; p <= totalPages; p++) {
      if (onProgress) {
        onProgress(Math.round(20 + (p / totalPages) * 60), `Processing table on page ${p}...`);
      }

      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();

      // Group items by vertical Y coordinates (rows)
      const rowsMap = new Map<number, Array<{ x: number; text: string }>>();
      for (const item of textContent.items) {
        const text = (item as any).str || '';
        if (!text.trim()) continue;

        const transform = (item as any).transform;
        const x = transform ? Math.round(transform[4]) : 0;
        const y = transform ? Math.round(transform[5] / 12) * 12 : 0; // Bucket near Y levels

        const row = rowsMap.get(y) || [];
        row.push({ x, text });
        rowsMap.set(y, row);
      }

      // Sort rows top-to-bottom (higher Y to lower Y in PDF)
      const sortedYs = Array.from(rowsMap.keys()).sort((a, b) => b - a);
      const sheetData: string[][] = [];

      for (const y of sortedYs) {
        const rowItems = rowsMap.get(y)!;
        // Sort items left-to-right (lower X to higher X)
        rowItems.sort((a, b) => a.x - b.x);
        sheetData.push(rowItems.map((r) => r.text));
      }

      const worksheet = XLSX.utils.aoa_to_sheet(
        sheetData.length > 0 ? sheetData : [['No text found on this page']]
      );
      XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${p}`);
    }

    if (onProgress) onProgress(90, 'Generating Excel workbook...');
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  },

  /**
   * Convert Excel (.xlsx or .xls) file into formatted PDF
   */
  async excelToPdf(file: File, onProgress?: ProgressCallback): Promise<Uint8Array> {
    if (onProgress) onProgress(20, 'Reading spreadsheet workbook...');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const margin = 30;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let isFirstSheet = true;

    for (const sheetName of workbook.SheetNames) {
      if (!isFirstSheet) {
        pdf.addPage();
      }
      isFirstSheet = false;

      const sheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(`Sheet: ${sheetName}`, margin, 35);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      let curY = 55;
      const colCount = Math.max(...data.map((r) => r.length), 1);
      const colWidth = Math.min(120, (pageWidth - margin * 2) / colCount);

      for (let r = 0; r < data.length; r++) {
        if (curY > pageHeight - margin - 20) {
          pdf.addPage();
          curY = 40;
        }

        const row = data[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
          const truncated = val.length > 20 ? val.substring(0, 18) + '..' : val;
          pdf.text(truncated, margin + c * colWidth + 4, curY + 10);
        }

        // Draw horizontal grid line
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, curY + 14, pageWidth - margin, curY + 14);
        curY += 18;
      }
    }

    if (onProgress) onProgress(100, 'Excel to PDF conversion complete!');
    return new Uint8Array(pdf.output('arraybuffer'));
  },

  /**
   * Convert CSV text to clean, styled PDF
   */
  async csvToPdf(csvText: string, onProgress?: ProgressCallback): Promise<Uint8Array> {
    if (onProgress) onProgress(25, 'Parsing CSV data...');
    const workbook = XLSX.read(csvText, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const margin = 30;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('CSV Document Report', margin, 35);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    let curY = 55;
    const colCount = Math.max(...data.map((r) => r.length), 1);
    const colWidth = Math.min(140, (pageWidth - margin * 2) / colCount);

    for (let r = 0; r < data.length; r++) {
      if (curY > pageHeight - margin - 20) {
        pdf.addPage();
        curY = 40;
      }

      const row = data[r] || [];
      const isHeader = r === 0;

      if (isHeader) {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(margin, curY, pageWidth - margin * 2, 18, 'F');
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }

      for (let c = 0; c < row.length; c++) {
        const val = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
        const truncated = val.length > 24 ? val.substring(0, 22) + '..' : val;
        pdf.text(truncated, margin + c * colWidth + 4, curY + 12);
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, curY + 18, pageWidth - margin, curY + 18);
      curY += 19;
    }

    if (onProgress) onProgress(100, 'CSV to PDF conversion complete!');
    return new Uint8Array(pdf.output('arraybuffer'));
  },
};
