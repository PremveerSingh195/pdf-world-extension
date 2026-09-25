import { marked } from 'marked';
import { jsPDF } from 'jspdf';

export const markdownService = {
  /**
   * Convert Markdown string to HTML
   */
  async markdownToHtml(md: string): Promise<string> {
    return await marked.parse(md);
  },

  /**
   * Convert Markdown string to high-quality PDF
   */
  async markdownToPdf(md: string, title = 'Document'): Promise<Uint8Array> {
    const rawHtml = await marked.parse(md);

    const styledHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6; padding: 10px;">
        <h1 style="color: #0f172a; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px;">${title}</h1>
        ${rawHtml}
      </div>
    `;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '700px';
    container.style.backgroundColor = '#ffffff';
    container.innerHTML = styledHtml;
    document.body.appendChild(container);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      await pdf.html(container, {
        callback: () => {},
        x: 30,
        y: 30,
        width: 535,
        windowWidth: 700,
      });

      return new Uint8Array(pdf.output('arraybuffer'));
    } finally {
      document.body.removeChild(container);
    }
  },
};
