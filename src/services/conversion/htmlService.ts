import { jsPDF } from 'jspdf';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { ProgressCallback } from '@/types/pdf';

export const htmlService = {
  /**
   * Convert HTML string into a PDF
   */
  async htmlToPdf(htmlContent: string, title = 'Document'): Promise<Uint8Array> {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '750px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#1e293b';
    container.style.fontFamily = 'Inter, -apple-system, sans-serif';
    container.style.fontSize = '14px';
    container.style.lineHeight = '1.6';
    container.innerHTML = htmlContent;

    document.body.appendChild(container);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      await pdf.html(container, {
        callback: () => {},
        x: 20,
        y: 20,
        width: 555,
        windowWidth: 750,
      });

      return new Uint8Array(pdf.output('arraybuffer'));
    } finally {
      document.body.removeChild(container);
    }
  },

  /**
   * Convert PDF to clean semantic HTML
   */
  async pdfToHtml(buffer: ArrayBuffer, onProgress?: ProgressCallback): Promise<string> {
    if (onProgress) onProgress(20, 'Reading PDF pages for HTML conversion...');
    const pdfDoc = await pdfJsService.loadDocument(buffer);
    const totalPages = pdfDoc.numPages;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Converted Document</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; color: #0f172a; }
    .page-container { background: #ffffff; max-width: 800px; margin: 0 auto 2rem auto; padding: 3rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .page-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1.5rem; font-weight: 600; color: #64748b; font-size: 0.875rem; }
    p { line-height: 1.6; margin-bottom: 1rem; }
  </style>
</head>
<body>\n`;

    for (let p = 1; p <= totalPages; p++) {
      if (onProgress) {
        onProgress(Math.round(20 + (p / totalPages) * 70), `Converting page ${p} of ${totalPages}...`);
      }

      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((i: any) => i.str || '').join(' ');

      html += `  <div class="page-container">
    <div class="page-header">Page ${p}</div>
    <p>${pageText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>
  </div>\n`;
    }

    html += `</body>\n</html>`;
    if (onProgress) onProgress(100, 'HTML generated successfully!');
    return html;
  },
};
