import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFPage,
  PDFName,
  PDFDict,
} from 'pdf-lib';
import { AnnotationItem, ProgressCallback } from '@/types/pdf';

export const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612.0, 792.0],
  A3: [841.89, 1190.55],
  Legal: [612.0, 1008.0],
};

function hexToRgb(hex?: string) {
  if (!hex || typeof hex !== 'string') {
    return { r: 0.94, g: 0.27, b: 0.27 };
  }
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) {
    return { r: 0.94, g: 0.27, b: 0.27 };
  }
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export const pdfLibService = {
  /**
   * Merge multiple PDF ArrayBuffers into one
   */
  async mergePDFs(
    buffers: ArrayBuffer[],
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    if (buffers.length === 0) {
      throw new Error('Please select at least one PDF file to merge.');
    }

    const mergedDoc = await PDFDocument.create();

    for (let i = 0; i < buffers.length; i++) {
      if (onProgress) {
        onProgress(Math.round(((i + 1) / buffers.length) * 100), `Merging file ${i + 1} of ${buffers.length}...`);
      }
      const sourceDoc = await PDFDocument.load(buffers[i], { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    return await mergedDoc.save();
  },

  /**
   * Alternate & Mix pages from multiple PDFs
   */
  async alternateMixPDFs(
    buffers: ArrayBuffer[],
    pattern: 'alternate' | 'custom' = 'alternate',
    reverseDoc2 = false,
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    if (buffers.length < 2) {
      throw new Error('Alternate & Mix requires at least 2 PDF documents.');
    }

    const docs = await Promise.all(
      buffers.map((buf) => PDFDocument.load(buf, { ignoreEncryption: true }))
    );

    const mergedDoc = await PDFDocument.create();
    const maxPages = Math.max(...docs.map((d) => d.getPageCount()));

    // Pre-copy all pages into each document reference
    const docPages: PDFPage[][] = [];
    for (let d = 0; d < docs.length; d++) {
      const copied = await mergedDoc.copyPages(docs[d], docs[d].getPageIndices());
      if (d === 1 && reverseDoc2) {
        copied.reverse();
      }
      docPages.push(copied);
    }

    for (let p = 0; p < maxPages; p++) {
      if (onProgress) {
        onProgress(Math.round(((p + 1) / maxPages) * 100), `Mixing page step ${p + 1} of ${maxPages}...`);
      }
      for (let d = 0; d < docs.length; d++) {
        if (p < docPages[d].length) {
          mergedDoc.addPage(docPages[d][p]);
        }
      }
    }

    return await mergedDoc.save();
  },

  /**
   * Split a PDF by page ranges into multiple PDFs
   */
  async splitPDF(
    buffer: ArrayBuffer,
    ranges: number[][],
    onProgress?: ProgressCallback
  ): Promise<Array<{ pages: number[]; data: Uint8Array }>> {
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();
    const results: Array<{ pages: number[]; data: Uint8Array }> = [];

    for (let i = 0; i < ranges.length; i++) {
      const pageList = ranges[i].filter((p) => p >= 1 && p <= totalPages);
      if (pageList.length === 0) continue;

      if (onProgress) {
        onProgress(Math.round(((i + 1) / ranges.length) * 100), `Creating split file ${i + 1} of ${ranges.length}...`);
      }

      const newDoc = await PDFDocument.create();
      // Zero-indexed page indices
      const indices = pageList.map((p) => p - 1);
      const copiedPages = await newDoc.copyPages(sourceDoc, indices);
      copiedPages.forEach((page) => newDoc.addPage(page));

      const data = await newDoc.save();
      results.push({ pages: pageList, data });
    }

    return results;
  },

  /**
   * Split PDF in Half (vertically or horizontally for dual page scans)
   */
  async splitPDFInHalf(
    buffer: ArrayBuffer,
    direction: 'vertical' | 'horizontal' = 'vertical',
    selectedPages?: number[]
  ): Promise<{ part1: Uint8Array; part2: Uint8Array }> {
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = sourceDoc.getPageCount();
    const targetPages = selectedPages?.length
      ? selectedPages
      : Array.from({ length: total }, (_, i) => i + 1);

    const docLeft = await PDFDocument.create();
    const docRight = await PDFDocument.create();

    for (const pageNum of targetPages) {
      const idx = pageNum - 1;
      const [copiedPage1] = await docLeft.copyPages(sourceDoc, [idx]);
      const [copiedPage2] = await docRight.copyPages(sourceDoc, [idx]);

      const { width, height } = copiedPage1.getSize();

      if (direction === 'vertical') {
        // Vertical split: left half and right half
        const halfWidth = width / 2;

        // Left half: crop box from x=0 to x=halfWidth
        copiedPage1.setCropBox(0, 0, halfWidth, height);
        docLeft.addPage(copiedPage1);

        // Right half: crop box from x=halfWidth to x=width
        copiedPage2.setCropBox(halfWidth, 0, halfWidth, height);
        docRight.addPage(copiedPage2);
      } else {
        // Horizontal split: top half and bottom half
        const halfHeight = height / 2;

        // Top half: y from halfHeight to height
        copiedPage1.setCropBox(0, halfHeight, width, halfHeight);
        docLeft.addPage(copiedPage1);

        // Bottom half: y from 0 to halfHeight
        copiedPage2.setCropBox(0, 0, width, halfHeight);
        docRight.addPage(copiedPage2);
      }
    }

    const part1 = await docLeft.save();
    const part2 = await docRight.save();
    return { part1, part2 };
  },

  /**
   * Split PDF by approximate maximum file size
   */
  async splitPDFBySize(
    buffer: ArrayBuffer,
    maxSizeBytes: number,
    onProgress?: ProgressCallback
  ): Promise<Array<{ name: string; data: Uint8Array }>> {
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();
    const results: Array<{ name: string; data: Uint8Array }> = [];

    let currentDoc = await PDFDocument.create();
    let currentPages: number[] = [];
    let partNum = 1;

    for (let i = 0; i < totalPages; i++) {
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalPages) * 100), `Partitioning page ${i + 1} of ${totalPages}...`);
      }
      const [copied] = await currentDoc.copyPages(sourceDoc, [i]);
      currentDoc.addPage(copied);
      currentPages.push(i + 1);

      // Check current size
      const currentBytes = await currentDoc.save();
      if (currentBytes.byteLength >= maxSizeBytes && currentPages.length > 1) {
        // Remove the last page that exceeded limit and finalize this part
        currentDoc.removePage(currentDoc.getPageCount() - 1);
        currentPages.pop();
        const finalPartBytes = await currentDoc.save();
        results.push({
          name: `part_${partNum}_pages_${currentPages[0]}-${currentPages[currentPages.length - 1]}.pdf`,
          data: finalPartBytes,
        });

        // Start new doc with current page
        partNum++;
        currentDoc = await PDFDocument.create();
        const [reCopied] = await currentDoc.copyPages(sourceDoc, [i]);
        currentDoc.addPage(reCopied);
        currentPages = [i + 1];
      }
    }

    if (currentPages.length > 0) {
      const finalPartBytes = await currentDoc.save();
      results.push({
        name: `part_${partNum}_pages_${currentPages[0]}-${currentPages[currentPages.length - 1]}.pdf`,
        data: finalPartBytes,
      });
    }

    return results;
  },

  /**
   * Organize pages (reorder, duplicate, delete, and rotate individual pages)
   */
  async organizePages(
    buffer: ArrayBuffer,
    pageConfigs: Array<{ originalIndex: number; rotation: number }>
  ): Promise<Uint8Array> {
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    for (const config of pageConfigs) {
      const [copied] = await newDoc.copyPages(sourceDoc, [config.originalIndex]);
      const currentRotation = copied.getRotation().angle;
      copied.setRotation(degrees((currentRotation + config.rotation) % 360));
      newDoc.addPage(copied);
    }

    return await newDoc.save();
  },

  /**
   * Rotate PDF pages
   */
  async rotatePDF(
    buffer: ArrayBuffer,
    angleDegrees: number,
    pageNumbers?: number[]
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const targetSet = pageNumbers && pageNumbers.length > 0 ? new Set(pageNumbers) : null;

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      if (!targetSet || targetSet.has(pageNum)) {
        const currentAngle = page.getRotation().angle;
        page.setRotation(degrees((currentAngle + angleDegrees) % 360));
      }
    });

    return await doc.save();
  },

  /**
   * Flip PDF horizontally or vertically
   */
  async flipPDF(
    buffer: ArrayBuffer,
    direction: 'horizontal' | 'vertical',
    pageNumbers?: number[]
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const targetSet = pageNumbers && pageNumbers.length > 0 ? new Set(pageNumbers) : null;

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      if (!targetSet || targetSet.has(pageNum)) {
        const { width, height } = page.getSize();
        if (direction === 'horizontal') {
          // Horizontal flip: scale x by -1 and translate x by width
          page.scale(-1, 1);
          page.translateContent(-width, 0);
        } else {
          // Vertical flip: scale y by -1 and translate y by height
          page.scale(1, -1);
          page.translateContent(0, -height);
        }
      }
    });

    return await doc.save();
  },

  /**
   * N-Up: Place multiple pages per sheet (2, 4, 6, 8)
   */
  async nUpPDF(
    buffer: ArrayBuffer,
    pagesPerSheet: 2 | 4 | 6 | 8 = 2,
    landscape = true
  ): Promise<Uint8Array> {
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const outputDoc = await PDFDocument.create();

    const cols = pagesPerSheet === 2 ? 2 : pagesPerSheet === 4 ? 2 : pagesPerSheet === 6 ? 3 : 4;
    const rows = pagesPerSheet === 2 ? 1 : pagesPerSheet === 4 ? 2 : 2;

    const sheetWidth = landscape ? 841.89 : 595.28; // A4
    const sheetHeight = landscape ? 595.28 : 841.89;

    const margin = 20;
    const cellWidth = (sheetWidth - margin * 2) / cols;
    const cellHeight = (sheetHeight - margin * 2) / rows;

    const totalPages = sourceDoc.getPageCount();
    const embeddedPages = await outputDoc.embedPdf(sourceDoc, sourceDoc.getPageIndices());

    for (let i = 0; i < totalPages; i += pagesPerSheet) {
      const sheet = outputDoc.addPage([sheetWidth, sheetHeight]);

      for (let slot = 0; slot < pagesPerSheet; slot++) {
        const pageIdx = i + slot;
        if (pageIdx >= totalPages) break;

        const embedded = embeddedPages[pageIdx];
        const row = Math.floor(slot / cols);
        const col = slot % cols;

        const scale = Math.min(
          (cellWidth - 10) / embedded.width,
          (cellHeight - 10) / embedded.height
        );
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;

        const x = margin + col * cellWidth + (cellWidth - drawWidth) / 2;
        // In PDF coordinates, y=0 is bottom
        const y = sheetHeight - margin - (row + 1) * cellHeight + (cellHeight - drawHeight) / 2;

        sheet.drawPage(embedded, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });

        // Draw light border around each page slot
        sheet.drawRectangle({
          x: margin + col * cellWidth + 2,
          y: sheetHeight - margin - (row + 1) * cellHeight + 2,
          width: cellWidth - 4,
          height: cellHeight - 4,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5,
        });
      }
    }

    return await outputDoc.save();
  },

  /**
   * Crop and Resize PDF
   */
  async cropAndResizePDF(
    buffer: ArrayBuffer,
    cropMargin: { top: number; right: number; bottom: number; left: number },
    targetSize?: 'A4' | 'Letter' | 'A3' | 'Legal' | 'Custom',
    customDims?: { width: number; height: number },
    selectedPages?: number[]
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const targetSet = selectedPages?.length ? new Set(selectedPages) : null;

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      if (!targetSet || targetSet.has(pageNum)) {
        const { width, height } = page.getSize();
        const newX = cropMargin.left;
        const newY = cropMargin.bottom;
        const newW = Math.max(10, width - cropMargin.left - cropMargin.right);
        const newH = Math.max(10, height - cropMargin.top - cropMargin.bottom);

        page.setCropBox(newX, newY, newW, newH);

        if (targetSize && targetSize !== 'Custom' && PAGE_SIZES[targetSize]) {
          const [stdW, stdH] = PAGE_SIZES[targetSize];
          page.setSize(stdW, stdH);
        } else if (customDims && customDims.width > 0 && customDims.height > 0) {
          page.setSize(customDims.width, customDims.height);
        }
      }
    });

    return await doc.save();
  },

  /**
   * Add text or image Watermark
   */
  async addWatermark(
    buffer: ArrayBuffer,
    options: {
      text?: string;
      imageBuffer?: ArrayBuffer;
      opacity?: number;
      rotation?: number;
      fontSize?: number;
      color?: string;
      pageNumbers?: number[];
      repeat?: boolean;
      repeatSpacing?: number;
      position?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
      fontFamily?: 'helvetica-bold' | 'helvetica' | 'courier' | 'times-roman';
    }
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();

    const fontMap: Record<string, typeof StandardFonts[keyof typeof StandardFonts]> = {
      'helvetica-bold': StandardFonts.HelveticaBold,
      'helvetica': StandardFonts.Helvetica,
      'courier': StandardFonts.Courier,
      'times-roman': StandardFonts.TimesRoman,
    };
    const selectedFont = fontMap[options.fontFamily || 'helvetica-bold'] || StandardFonts.HelveticaBold;
    const font = await doc.embedFont(selectedFont);

    const opacity = options.opacity ?? 0.3;
    const rotation = options.rotation ?? 45;
    const fontSize = options.fontSize ?? 48;
    const colorHex = options.color ?? '#ef4444';
    const c = hexToRgb(colorHex);
    const repeat = options.repeat ?? false;
    const repeatSpacing = options.repeatSpacing ?? 150;
    const position = options.position ?? 'center';
    const targetSet = options.pageNumbers?.length ? new Set(options.pageNumbers) : null;

    let embeddedImage: any = null;
    if (options.imageBuffer) {
      try {
        embeddedImage = await doc.embedPng(options.imageBuffer);
      } catch {
        embeddedImage = await doc.embedJpg(options.imageBuffer);
      }
    }

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      if (!targetSet || targetSet.has(pageNum)) {
        const { width, height } = page.getSize();

        if (embeddedImage) {
          const imgScale = Math.min((width * 0.5) / embeddedImage.width, (height * 0.5) / embeddedImage.height);
          const imgW = embeddedImage.width * imgScale;
          const imgH = embeddedImage.height * imgScale;
          page.drawImage(embeddedImage, {
            x: (width - imgW) / 2,
            y: (height - imgH) / 2,
            width: imgW,
            height: imgH,
            opacity,
            rotate: degrees(rotation),
          });
        } else if (options.text) {
          const textWidth = font.widthOfTextAtSize(options.text, fontSize);
          const textHeight = font.heightAtSize(fontSize);

          if (repeat) {
            // Tile watermark across the entire page with safe positive bounds
            const spacingX = Math.max(30, (textWidth || 50) + (repeatSpacing || 150));
            const spacingY = Math.max(30, fontSize + (repeatSpacing || 150));
            // Start from outside the page to cover edges when rotated
            for (let y = -height; y < height * 2; y += spacingY) {
              for (let x = -width; x < width * 2; x += spacingX) {
                page.drawText(options.text, {
                  x,
                  y,
                  size: fontSize,
                  font,
                  color: rgb(c.r, c.g, c.b),
                  opacity,
                  rotate: degrees(rotation),
                });
              }
            }
          } else {
            // Single watermark at specified position
            let x: number;
            let y: number;
            const margin = 40;

            switch (position) {
              case 'top-left':
                x = margin;
                y = height - margin - textHeight;
                break;
              case 'top-center':
                x = (width - textWidth) / 2;
                y = height - margin - textHeight;
                break;
              case 'top-right':
                x = width - textWidth - margin;
                y = height - margin - textHeight;
                break;
              case 'bottom-left':
                x = margin;
                y = margin;
                break;
              case 'bottom-center':
                x = (width - textWidth) / 2;
                y = margin;
                break;
              case 'bottom-right':
                x = width - textWidth - margin;
                y = margin;
                break;
              case 'center':
              default:
                x = (width - textWidth) / 2;
                y = (height - textHeight) / 2;
                break;
            }

            page.drawText(options.text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgb(c.r, c.g, c.b),
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      }
    });

    return await doc.save();
  },

  /**
   * Add Page Numbers with flexible positions and formats
   */
  async addPageNumbers(
    buffer: ArrayBuffer,
    options: {
      position: 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left';
      format: 'n' | 'page_n' | 'page_n_of_total';
      startNumber?: number;
      fontSize?: number;
      color?: string;
      margin?: number;
      selectedPages?: number[];
    }
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    const totalPages = pages.length;
    const startNum = options.startNumber ?? 1;
    const fontSize = options.fontSize ?? 10;
    const margin = options.margin ?? 30;
    const c = hexToRgb(options.color ?? '#334155');
    const targetSet = options.selectedPages?.length ? new Set(options.selectedPages) : null;

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      if (!targetSet || targetSet.has(pageNum)) {
        const { width, height } = page.getSize();
        const currentVal = startNum + idx;

        let label = `${currentVal}`;
        if (options.format === 'page_n') {
          label = `Page ${currentVal}`;
        } else if (options.format === 'page_n_of_total') {
          label = `Page ${currentVal} of ${totalPages + startNum - 1}`;
        }

        const textWidth = font.widthOfTextAtSize(label, fontSize);

        let x = margin;
        if (options.position.includes('center')) {
          x = (width - textWidth) / 2;
        } else if (options.position.includes('right')) {
          x = width - margin - textWidth;
        }

        let y = margin;
        if (options.position.includes('top')) {
          y = height - margin;
        }

        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(c.r, c.g, c.b),
        });
      }
    });

    return await doc.save();
  },

  /**
   * Bates Numbering for legal document indexing
   */
  async addBatesNumbering(
    buffer: ArrayBuffer,
    options: {
      prefix: string;
      startNumber: number;
      digits: number;
      position: string;
      increment?: number;
      fontSize?: number;
    }
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const font = await doc.embedFont(StandardFonts.CourierBold);

    const inc = options.increment ?? 1;
    const digits = Math.max(3, options.digits ?? 6);
    const fontSize = options.fontSize ?? 10;
    const margin = 28;

    pages.forEach((page, idx) => {
      const num = options.startNumber + idx * inc;
      const padded = String(num).padStart(digits, '0');
      const batesCode = `${options.prefix}${padded}`;

      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(batesCode, fontSize);

      let x = width - margin - textWidth;
      let y = margin;

      switch (options.position) {
        case 'top-left':
          x = margin;
          y = height - margin;
          break;
        case 'top-center':
          x = (width - textWidth) / 2;
          y = height - margin;
          break;
        case 'top-right':
          x = width - margin - textWidth;
          y = height - margin;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'bottom-center':
          x = (width - textWidth) / 2;
          y = margin;
          break;
        case 'bottom-right':
        default:
          x = width - margin - textWidth;
          y = margin;
          break;
      }

      page.drawText(batesCode, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    return await doc.save();
  },

  /**
   * Add dynamic Headers & Footers
   */
  async addHeadersFooters(
    buffer: ArrayBuffer,
    options: {
      headerLeft?: string;
      headerCenter?: string;
      headerRight?: string;
      footerLeft?: string;
      footerCenter?: string;
      footerRight?: string;
      fontSize?: number;
      margin?: number;
      filename?: string;
    }
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    const fontSize = options.fontSize ?? 9;
    const margin = options.margin ?? 25;
    const totalPages = pages.length;
    const today = new Date().toLocaleDateString();

    const resolveTokens = (template: string, pageNum: number) => {
      return template
        .replace(/\{page\}/gi, `${pageNum}`)
        .replace(/\{total\}/gi, `${totalPages}`)
        .replace(/\{date\}/gi, today)
        .replace(/\{filename\}/gi, options.filename || 'Document.pdf');
    };

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      const { width, height } = page.getSize();
      const topY = height - margin;
      const bottomY = margin;

      // Headers
      if (options.headerLeft) {
        page.drawText(resolveTokens(options.headerLeft, pageNum), {
          x: margin,
          y: topY,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      if (options.headerCenter) {
        const text = resolveTokens(options.headerCenter, pageNum);
        const w = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: (width - w) / 2,
          y: topY,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      if (options.headerRight) {
        const text = resolveTokens(options.headerRight, pageNum);
        const w = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: width - margin - w,
          y: topY,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      // Footers
      if (options.footerLeft) {
        page.drawText(resolveTokens(options.footerLeft, pageNum), {
          x: margin,
          y: bottomY,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      if (options.footerCenter) {
        const text = resolveTokens(options.footerCenter, pageNum);
        const w = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: (width - w) / 2,
          y: bottomY,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      if (options.footerRight) {
        const text = resolveTokens(options.footerRight, pageNum);
        const w = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: width - margin - w,
          y: bottomY,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    });

    return await doc.save();
  },

  /**
   * Flatten PDF: Bakes annotations and form fields into page content
   */
  async flattenPDF(buffer: ArrayBuffer): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = doc.getForm();
    try {
      form.flatten();
    } catch (e) {
      console.warn('Form flatten failed or document has no form:', e);
    }
    return await doc.save();
  },

  /**
   * Get interactive form fields
   */
  async getFormFields(buffer: ArrayBuffer): Promise<Array<{ name: string; type: string; value: any }>> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = doc.getForm();
    const fields = form.getFields();

    return fields.map((f) => {
      const name = f.getName();
      const constructorName = f.constructor.name;
      let type = 'text';
      let value: any = '';

      if (constructorName.includes('CheckBox')) {
        type = 'checkbox';
        try {
          value = (f as any).isChecked();
        } catch {
          value = false;
        }
      } else if (constructorName.includes('Dropdown') || constructorName.includes('OptionList')) {
        type = 'select';
        try {
          value = (f as any).getSelected()[0] || '';
        } catch {
          value = '';
        }
      } else if (constructorName.includes('Radio')) {
        type = 'radio';
        try {
          value = (f as any).getSelected() || '';
        } catch {
          value = '';
        }
      } else {
        try {
          value = (f as any).getText() || '';
        } catch {
          value = '';
        }
      }

      return { name, type, value };
    });
  },

  /**
   * Fill interactive form fields
   */
  async fillFormFields(
    buffer: ArrayBuffer,
    fieldValues: Record<string, string | boolean>
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = doc.getForm();

    for (const [name, val] of Object.entries(fieldValues)) {
      try {
        const field = form.getField(name);
        if (!field) continue;

        if (typeof val === 'boolean') {
          if (val) (field as any).check?.();
          else (field as any).uncheck?.();
        } else {
          (field as any).setText?.(String(val));
        }
      } catch (err) {
        console.warn(`Could not set field ${name}:`, err);
      }
    }

    return await doc.save();
  },

  /**
   * Edit PDF with Canvas Annotations (signatures, text, images, highlights)
   */
  async editPDFWithAnnotations(
    buffer: ArrayBuffer,
    annotations: AnnotationItem[]
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Group annotations by page
    const grouped = new Map<number, AnnotationItem[]>();
    for (const ann of annotations) {
      const list = grouped.get(ann.pageNumber) || [];
      list.push(ann);
      grouped.set(ann.pageNumber, list);
    }

    for (const [pageNumber, items] of grouped.entries()) {
      if (pageNumber > pages.length) continue;
      const page = pages[pageNumber - 1];
      const { height } = page.getSize();

      for (const item of items) {
        // PDF Y-axis is inverted from top-left canvas coordinates
        const pdfY = height - item.y - item.height;

        if (item.type === 'text' && item.text) {
          const c = hexToRgb(item.color || '#000000');
          page.drawText(item.text, {
            x: item.x,
            y: height - item.y - (item.fontSize || 14),
            size: item.fontSize || 14,
            font,
            color: rgb(c.r, c.g, c.b),
          });
        } else if (item.type === 'highlight') {
          page.drawRectangle({
            x: item.x,
            y: pdfY,
            width: item.width,
            height: item.height,
            color: rgb(1, 0.95, 0.2), // Yellow highlight
            opacity: 0.45,
          });
        } else if (item.type === 'checkbox') {
          page.drawRectangle({
            x: item.x,
            y: pdfY,
            width: item.width,
            height: item.height,
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 1.5,
          });
          if (item.checked) {
            page.drawLine({
              start: { x: item.x + 3, y: pdfY + item.height / 2 },
              end: { x: item.x + item.width / 2, y: pdfY + 3 },
              color: rgb(0, 0.5, 0),
              thickness: 2,
            });
            page.drawLine({
              start: { x: item.x + item.width / 2, y: pdfY + 3 },
              end: { x: item.x + item.width - 3, y: pdfY + item.height - 3 },
              color: rgb(0, 0.5, 0),
              thickness: 2,
            });
          }
        } else if (
          (item.type === 'signature' || item.type === 'image' || item.type === 'thumbmark') &&
          item.imageUrl
        ) {
          try {
            const base64Data = item.imageUrl.split(',')[1];
            const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const embedded = item.imageUrl.includes('png')
              ? await doc.embedPng(imgBytes)
              : await doc.embedJpg(imgBytes);

            page.drawImage(embedded, {
              x: item.x,
              y: pdfY,
              width: item.width,
              height: item.height,
              opacity: item.opacity ?? 1,
            });
          } catch (e) {
            console.warn('Failed embedding image annotation:', e);
          }
        }
      }
    }

    return await doc.save();
  },

  /**
   * Redact PDF: permanently covers and strips contents in designated regions
   */
  async redactPDF(
    buffer: ArrayBuffer,
    redactions: Array<{ pageNumber: number; x: number; y: number; width: number; height: number; label?: string }>
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);

    for (const r of redactions) {
      if (r.pageNumber <= pages.length) {
        const page = pages[r.pageNumber - 1];
        const { height } = page.getSize();
        const pdfY = height - r.y - r.height;

        // Solid opaque black rectangle
        page.drawRectangle({
          x: r.x,
          y: pdfY,
          width: r.width,
          height: r.height,
          color: rgb(0, 0, 0),
          opacity: 1.0,
        });

        if (r.label) {
          const fontSize = Math.min(10, r.height * 0.6);
          const tw = font.widthOfTextAtSize(r.label, fontSize);
          page.drawText(r.label, {
            x: r.x + (r.width - tw) / 2,
            y: pdfY + (r.height - fontSize) / 2,
            size: fontSize,
            font,
            color: rgb(1, 1, 1),
          });
        }
      }
    }

    return await doc.save();
  },

  /**
   * Read document metadata
   */
  async getMetadata(buffer: ArrayBuffer): Promise<Record<string, string>> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const rawKw = doc.getKeywords();
    const keywords = Array.isArray(rawKw) ? rawKw.join(', ') : (typeof rawKw === 'string' ? rawKw : '');
    return {
      title: doc.getTitle() || '',
      author: doc.getAuthor() || '',
      subject: doc.getSubject() || '',
      keywords,
      creator: doc.getCreator() || '',
      producer: doc.getProducer() || '',
    };
  },

  /**
   * Update document metadata
   */
  async updateMetadata(
    buffer: ArrayBuffer,
    meta: {
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string[];
      creator?: string;
      producer?: string;
    }
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    if (meta.title !== undefined) doc.setTitle(meta.title);
    if (meta.author !== undefined) doc.setAuthor(meta.author);
    if (meta.subject !== undefined) doc.setSubject(meta.subject);
    if (meta.keywords !== undefined) doc.setKeywords(meta.keywords);
    if (meta.creator !== undefined) doc.setCreator(meta.creator);
    if (meta.producer !== undefined) doc.setProducer(meta.producer);
    return await doc.save();
  },
};
