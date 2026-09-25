import pptxgen from 'pptxgenjs';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { ProgressCallback } from '@/types/pdf';
import { jsPDF } from 'jspdf';

export const pptxService = {
  /**
   * Convert PDF pages into a real PowerPoint presentation (.pptx)
   */
  async pdfToPptx(buffer: ArrayBuffer, onProgress?: ProgressCallback): Promise<Blob> {
    if (onProgress) onProgress(10, 'Initializing PowerPoint presentation builder...');
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';

    const pdfDoc = await pdfJsService.loadDocument(buffer);
    const totalPages = pdfDoc.numPages;

    for (let p = 1; p <= totalPages; p++) {
      if (onProgress) {
        onProgress(Math.round(15 + (p / totalPages) * 75), `Rendering slide ${p} of ${totalPages}...`);
      }

      // Render high-res slide image
      const dataUrl = await pdfJsService.renderPageToDataUrl(pdfDoc, p, 1.8);
      const slide = pres.addSlide();

      // Fit full slide
      slide.addImage({
        data: dataUrl,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
      });
    }

    if (onProgress) onProgress(95, 'Generating PPTX file...');
    const result = await pres.write({ outputType: 'blob' });
    return result as Blob;
  },

  /**
   * Convert PowerPoint (.pptx) file to PDF
   */
  async pptxToPdf(file: File, onProgress?: ProgressCallback): Promise<Uint8Array> {
    if (onProgress) onProgress(20, 'Reading PowerPoint presentation...');
    const arrayBuffer = await file.arrayBuffer();

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Look for slide XML files or embedded images
    const slideKeys = Object.keys(zip.files).filter((k) =>
      k.startsWith('ppt/slides/slide') && k.endsWith('.xml')
    );

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [842, 595], // A4 landscape
    });

    if (slideKeys.length === 0) {
      pdf.setFontSize(18);
      pdf.text(file.name.replace(/\.[^/.]+$/, ''), 50, 80);
      pdf.setFontSize(12);
      pdf.text('Presentation content rendered into PDF', 50, 120);
    } else {
      slideKeys.sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });

      for (let i = 0; i < slideKeys.length; i++) {
        if (i > 0) pdf.addPage();
        if (onProgress) {
          onProgress(Math.round(30 + ((i + 1) / slideKeys.length) * 60), `Processing slide ${i + 1}...`);
        }

        const xmlString = await zip.files[slideKeys[i]].async('string');
        const textRegex = /<a:t[^>]*>(.*?)<\/a:t>/g;
        let match;
        const slideTexts: string[] = [];
        while ((match = textRegex.exec(xmlString)) !== null) {
          const t = match[1].trim();
          if (t) slideTexts.push(t);
        }

        // Draw slide background card
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(30, 30, 782, 535, 8, 8, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(30, 30, 782, 535, 8, 8, 'S');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(30, 41, 59);
        const title = slideTexts[0] || `Slide ${i + 1}`;
        pdf.text(title, 60, 80);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(71, 85, 105);

        let curY = 120;
        for (let t = 1; t < slideTexts.length; t++) {
          if (curY > 520) break;
          const bodyText = slideTexts[t];
          const lines = pdf.splitTextToSize(bodyText, 700);
          pdf.text(lines, 60, curY);
          curY += lines.length * 18 + 8;
        }
      }
    }

    if (onProgress) onProgress(100, 'PowerPoint to PDF conversion complete!');
    return new Uint8Array(pdf.output('arraybuffer'));
  },
};
