import { PDFDocument } from 'pdf-lib';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { ProgressCallback } from '@/types/pdf';

export interface CompressionResult {
  data: Uint8Array;
  originalSize: number;
  newSize: number;
  reductionPercent: number;
}

export const compressionService = {
  async compressPDF(
    buffer: ArrayBuffer,
    level: 'low' | 'medium' | 'high' = 'medium',
    onProgress?: ProgressCallback
  ): Promise<CompressionResult> {
    const originalSize = buffer.byteLength;

    if (level === 'high') {
      // High compression: rasterize pages to optimized quality JPEGs and rebuild PDF
      if (onProgress) onProgress(10, 'Analyzing PDF document structure...');
      const pdfDoc = await pdfJsService.loadDocument(buffer);
      const totalPages = pdfDoc.numPages;

      const outputDoc = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        if (onProgress) {
          onProgress(
            Math.round(10 + (i / totalPages) * 80),
            `Optimizing page ${i} of ${totalPages}...`
          );
        }
        // Scale 1.25 gives great readability while dramatically reducing heavy scans/vector trees
        const pageBlob = await pdfJsService.renderPageToBlob(pdfDoc, i, 1.25, 0.72);
        const imgBuffer = await pageBlob.arrayBuffer();
        const img = await outputDoc.embedJpg(imgBuffer);

        const page = outputDoc.addPage([img.width, img.height]);
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });
      }

      if (onProgress) onProgress(95, 'Finalizing compressed stream...');
      const data = await outputDoc.save({ useObjectStreams: true });
      const newSize = data.byteLength;
      const reductionPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      return {
        data,
        originalSize,
        newSize,
        reductionPercent,
      };
    } else {
      // Low or Medium compression: reconstruct and compress object streams
      if (onProgress) onProgress(30, 'Optimizing PDF object streams...');
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      if (onProgress) onProgress(75, 'Applying Deflate compression...');
      const data = await doc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      const newSize = data.byteLength;
      const reductionPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      return {
        data,
        originalSize,
        newSize,
        reductionPercent,
      };
    }
  },
};
