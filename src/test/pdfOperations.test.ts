import { describe, it, expect } from 'vitest';
import { formatBytes, parsePageRanges, formatPageRanges, isValidPdf } from '@/utils/fileUtils';
import { PDFDocument, degrees } from 'pdf-lib';
import { pdfLibService } from '@/services/pdf/pdfLibService';

describe('PDF World Utilities and Operations', () => {
  describe('File and Page Range Utilities', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('identifies PDF files accurately', () => {
      const mockPdf = new File(['dummy'], 'contract.pdf', { type: 'application/pdf' });
      const mockDoc = new File(['dummy'], 'letter.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      expect(isValidPdf(mockPdf)).toBe(true);
      expect(isValidPdf(mockDoc)).toBe(false);
    });

    it('parses complex page range expressions correctly', () => {
      expect(parsePageRanges('1-3, 5, 7-9')).toEqual([1, 2, 3, 5, 7, 8, 9]);
      expect(parsePageRanges('10-8')).toEqual([8, 9, 10]); // Handles inverted range
      expect(parsePageRanges('2, 2, 3, 1')).toEqual([1, 2, 3]); // Handles duplicates and sorting
      expect(parsePageRanges('1-10', 4)).toEqual([1, 2, 3, 4]); // Clamps to totalPages
    });

    it('formats page ranges to compact strings', () => {
      expect(formatPageRanges([1, 2, 3, 5, 7, 8])).toBe('1-3, 5, 7-8');
      expect(formatPageRanges([1, 2, 3])).toBe('1-3');
      expect(formatPageRanges([4])).toBe('4');
    });
  });

  describe('Core PDF Manipulation (pdf-lib)', () => {
    // Helper to generate a dummy multi-page PDF ArrayBuffer
    async function createTestPdfBuffer(pageCount = 3): Promise<ArrayBuffer> {
      const doc = await PDFDocument.create();
      for (let i = 0; i < pageCount; i++) {
        const page = doc.addPage([400, 600]);
        page.drawText(`Page ${i + 1}`, { x: 50, y: 500, size: 24 });
      }
      const bytes = await doc.save();
      return bytes.buffer as ArrayBuffer;
    }

    it('merges multiple PDF documents', async () => {
      const doc1 = await createTestPdfBuffer(2);
      const doc2 = await createTestPdfBuffer(3);

      const mergedBytes = await pdfLibService.mergePDFs([doc1, doc2]);
      const mergedDoc = await PDFDocument.load(mergedBytes);

      expect(mergedDoc.getPageCount()).toBe(5);
    });

    it('splits PDF into designated page ranges', async () => {
      const source = await createTestPdfBuffer(6);
      const results = await pdfLibService.splitPDF(source, [[1, 2], [3, 4, 5], [6]]);

      expect(results.length).toBe(3);
      expect(results[0].pages).toEqual([1, 2]);

      const docPart1 = await PDFDocument.load(results[0].data);
      expect(docPart1.getPageCount()).toBe(2);

      const docPart2 = await PDFDocument.load(results[1].data);
      expect(docPart2.getPageCount()).toBe(3);
    });

    it('rotates PDF pages by specified degrees', async () => {
      const source = await createTestPdfBuffer(2);
      const rotatedBytes = await pdfLibService.rotatePDF(source, 90, [1]);

      const rotatedDoc = await PDFDocument.load(rotatedBytes);
      const p1 = rotatedDoc.getPage(0);
      const p2 = rotatedDoc.getPage(1);

      expect(p1.getRotation().angle).toBe(90);
      expect(p2.getRotation().angle).toBe(0);
    });

    it('adds watermark to PDF pages', async () => {
      const source = await createTestPdfBuffer(2);
      const watermarked = await pdfLibService.addWatermark(source, {
        text: 'TEST_CONFIDENTIAL',
        opacity: 0.5,
        rotation: 45,
      });

      const doc = await PDFDocument.load(watermarked);
      expect(doc.getPageCount()).toBe(2);
    });

    it('adds page numbers with formatting', async () => {
      const source = await createTestPdfBuffer(3);
      const numbered = await pdfLibService.addPageNumbers(source, {
        position: 'bottom-right',
        format: 'page_n_of_total',
      });

      const doc = await PDFDocument.load(numbered);
      expect(doc.getPageCount()).toBe(3);
    });

    it('reads and updates document metadata', async () => {
      const source = await createTestPdfBuffer(1);
      const updated = await pdfLibService.updateMetadata(source, {
        title: 'Antigravity Specifications',
        author: 'Chief Architect',
        subject: 'Chrome Extensions',
        keywords: ['PDF', 'Editor', 'Workspace'],
      });

      const metadata = await pdfLibService.getMetadata(updated.buffer as ArrayBuffer);
      expect(metadata.title).toBe('Antigravity Specifications');
      expect(metadata.author).toBe('Chief Architect');
      expect(metadata.subject).toBe('Chrome Extensions');
    });

    it('organizes pages: reorders, duplicates, and deletes', async () => {
      const source = await createTestPdfBuffer(3);
      // Reorder: Page 3, Page 1, Page 3 (duplicate page 3, remove page 2)
      const organized = await pdfLibService.organizePages(source, [
        { originalIndex: 2, rotation: 0 },
        { originalIndex: 0, rotation: 90 },
        { originalIndex: 2, rotation: 180 },
      ]);

      const doc = await PDFDocument.load(organized);
      expect(doc.getPageCount()).toBe(3);
      expect(doc.getPage(1).getRotation().angle).toBe(90);
      expect(doc.getPage(2).getRotation().angle).toBe(180);
    });
  });
});
