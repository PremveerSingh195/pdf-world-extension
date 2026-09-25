import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { ProgressCallback } from '@/types/pdf';

export interface HandwritingOptions {
  fontStyle: 'cursive' | 'print' | 'casual';
  inkColor: string;
  paperStyle: 'ruled' | 'grid' | 'blank';
  fontSize: number;
  lineSpacing: number;
  margin: number;
}

export const handwritingService = {
  /**
   * Render text with realistic lined or grid notebook paper to PDF
   */
  textToHandwritingPdf(text: string, options: HandwritingOptions): Uint8Array {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = options.margin || 45;
    const contentWidth = pageWidth - margin * 2;
    const lineSpacing = options.lineSpacing || 28;

    const drawPaperBackground = () => {
      // Paper background tint (warm off-white)
      pdf.setFillColor(254, 252, 246);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      if (options.paperStyle === 'ruled') {
        // Red vertical margin line on the left
        pdf.setDrawColor(248, 113, 113);
        pdf.setLineWidth(1);
        pdf.line(margin + 20, 0, margin + 20, pageHeight);

        // Light blue horizontal lines
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.6);
        for (let y = 60; y < pageHeight - 30; y += lineSpacing) {
          pdf.line(0, y, pageWidth, y);
        }
      } else if (options.paperStyle === 'grid') {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        const gridSize = 20;
        for (let x = 0; x < pageWidth; x += gridSize) {
          pdf.line(x, 0, x, pageHeight);
        }
        for (let y = 0; y < pageHeight; y += gridSize) {
          pdf.line(0, y, pageWidth, y);
        }
      }
    };

    drawPaperBackground();

    // Map font style
    if (options.fontStyle === 'cursive') {
      pdf.setFont('courier', 'italic');
    } else {
      pdf.setFont('helvetica', 'normal');
    }

    pdf.setFontSize(options.fontSize || 13);

    // Ink color
    const hex = options.inkColor || '#1e3a8a';
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    pdf.setTextColor(r, g, b);

    const paragraphs = text.split('\n');
    let curY = 56; // Aligns slightly above the first rule line

    for (const para of paragraphs) {
      if (!para.trim()) {
        curY += lineSpacing;
        continue;
      }

      const lines = pdf.splitTextToSize(para, contentWidth - 30);
      for (const line of lines) {
        if (curY > pageHeight - 50) {
          pdf.addPage();
          drawPaperBackground();
          curY = 56;
        }

        // Add subtle natural jitter for handwriting feel
        const jitterX = (Math.random() - 0.5) * 1.5;
        const jitterY = (Math.random() - 0.5) * 1.0;

        pdf.text(line, margin + 30 + jitterX, curY + jitterY);
        curY += lineSpacing;
      }
    }

    return new Uint8Array(pdf.output('arraybuffer'));
  },

  /**
   * Convert typed PDF text into realistic handwriting-style PDF
   */
  async pdfToHandwriting(
    buffer: ArrayBuffer,
    options: HandwritingOptions,
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    if (onProgress) onProgress(20, 'Extracting text from PDF...');
    const pdfDoc = await pdfJsService.loadDocument(buffer);
    const text = await pdfJsService.extractText(pdfDoc, undefined, onProgress);

    if (onProgress) onProgress(80, 'Rendering handwritten script...');
    return this.textToHandwritingPdf(text, options);
  },

  /**
   * Convert scanned handwriting photos to clean PDF
   */
  async imagesToPdf(
    images: Array<{ file: File; buffer: ArrayBuffer }>,
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();

    for (let i = 0; i < images.length; i++) {
      if (onProgress) {
        onProgress(Math.round(((i + 1) / images.length) * 100), `Processing image ${i + 1} of ${images.length}...`);
      }

      const { file, buffer } = images[i];
      let embedded: any;
      try {
        if (file.type.includes('png')) {
          embedded = await doc.embedPng(buffer);
        } else {
          embedded = await doc.embedJpg(buffer);
        }
      } catch {
        // Fallback try PNG or JPG
        try {
          embedded = await doc.embedJpg(buffer);
        } catch {
          embedded = await doc.embedPng(buffer);
        }
      }

      const page = doc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      });
    }

    return await doc.save();
  },
};
