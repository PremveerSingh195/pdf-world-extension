import * as pdfjsLib from 'pdfjs-dist';
import { ProgressCallback } from '@/types/pdf';

// Configure the worker source
if (typeof window !== 'undefined') {
  try {
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL;
    pdfjsLib.GlobalWorkerOptions.workerSrc = isExtension
      ? chrome.runtime.getURL('pdf.worker.min.js')
      : '/pdf.worker.min.js';
  } catch (e) {
    console.warn('Could not set pdfjs workerSrc:', e);
  }
}

export interface BookmarkItem {
  title: string;
  dest: any;
  pageNumber: number;
  items?: BookmarkItem[];
}

export interface ExtractedImage {
  name: string;
  blob: Blob;
  width: number;
  height: number;
  pageNumber: number;
}

export const pdfJsService = {
  /**
   * Load a PDF document from an ArrayBuffer
   */
  async loadDocument(buffer: ArrayBuffer, password?: string) {
    const loadingTask = pdfjsLib.getDocument({
      data: buffer.slice(0),
      password: password || undefined,
    });
    return await loadingTask.promise;
  },

  /**
   * Render a specific page to an HTML Canvas
   */
  async renderPageToCanvas(
    pdfDoc: any,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale = 1.0,
    invertColors = false
  ): Promise<void> {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    if (invertColors) {
      const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];         // R
        data[i + 1] = 255 - data[i + 1]; // G
        data[i + 2] = 255 - data[i + 2]; // B
      }
      context.putImageData(imgData, 0, 0);
    }
  },

  /**
   * Render a page directly to a base64 DataURL (useful for thumbnails)
   */
  async renderPageToDataUrl(
    pdfDoc: any,
    pageNumber: number,
    scale = 0.5,
    invertColors = false
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    await this.renderPageToCanvas(pdfDoc, pageNumber, canvas, scale, invertColors);
    return canvas.toDataURL('image/jpeg', 0.85);
  },

  /**
   * Render a page directly to a Blob
   */
  async renderPageToBlob(
    pdfDoc: any,
    pageNumber: number,
    scale = 2.0,
    quality = 0.92,
    invertColors = false
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    await this.renderPageToCanvas(pdfDoc, pageNumber, canvas, scale, invertColors);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        },
        'image/jpeg',
        quality
      );
    });
  },

  /**
   * Extract plain text page by page
   */
  async extractText(
    pdfDoc: any,
    selectedPages?: number[],
    onProgress?: ProgressCallback
  ): Promise<string> {
    const totalPages = pdfDoc.numPages;
    const pagesToProcess = selectedPages && selectedPages.length > 0
      ? selectedPages
      : Array.from({ length: totalPages }, (_, i) => i + 1);

    let fullText = '';

    for (let i = 0; i < pagesToProcess.length; i++) {
      const pageNum = pagesToProcess[i];
      if (onProgress) {
        onProgress(Math.round(((i + 1) / pagesToProcess.length) * 100), `Extracting text from page ${pageNum}...`);
      }

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map((item: any) => item.str || '');
      const pageText = pageStrings.join(' ');

      fullText += `--- Page ${pageNum} ---\n\n${pageText}\n\n`;
    }

    return fullText;
  },

  /**
   * Search for text inside PDF pages for 'Split PDF by Text'
   */
  async findPagesContainingText(
    pdfDoc: any,
    query: string,
    caseSensitive = false,
    exactMatch = false
  ): Promise<number[]> {
    const matchingPages: number[] = [];
    const totalPages = pdfDoc.numPages;
    const targetQuery = caseSensitive ? query.trim() : query.trim().toLowerCase();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      let pageText = textContent.items.map((item: any) => item.str || '').join(' ');
      if (!caseSensitive) {
        pageText = pageText.toLowerCase();
      }

      let matches = false;
      if (exactMatch) {
        matches = pageText.includes(targetQuery);
      } else {
        const words = targetQuery.split(/\s+/).filter(Boolean);
        matches = words.every((w) => pageText.includes(w));
      }

      if (matches) {
        matchingPages.push(pageNum);
      }
    }

    return matchingPages;
  },

  /**
   * Read outline/bookmarks for 'Split PDF by Bookmarks'
   */
  async extractOutline(pdfDoc: any): Promise<BookmarkItem[]> {
    try {
      const outline = await pdfDoc.getOutline();
      if (!outline || outline.length === 0) return [];

      const processNode = async (node: any): Promise<BookmarkItem> => {
        let pageNumber = 1;
        if (node.dest) {
          try {
            let explicitDest = node.dest;
            if (typeof explicitDest === 'string') {
              explicitDest = await pdfDoc.getDestination(explicitDest);
            }
            if (Array.isArray(explicitDest) && explicitDest[0]) {
              const ref = explicitDest[0];
              const pageIndex = await pdfDoc.getPageIndex(ref);
              pageNumber = pageIndex + 1;
            }
          } catch (e) {
            console.warn('Destination resolve failed:', e);
          }
        }

        const item: BookmarkItem = {
          title: node.title || 'Untitled Chapter',
          dest: node.dest,
          pageNumber,
        };

        if (node.items && node.items.length > 0) {
          item.items = await Promise.all(node.items.map((child: any) => processNode(child)));
        }

        return item;
      };

      return await Promise.all(outline.map((node: any) => processNode(node)));
    } catch (e) {
      console.warn('Extract outline error:', e);
      return [];
    }
  },

  /**
   * Extract embedded images from all or selected pages
   */
  async extractImages(
    pdfDoc: any,
    onProgress?: ProgressCallback
  ): Promise<ExtractedImage[]> {
    const extracted: ExtractedImage[] = [];
    const totalPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (onProgress) {
        onProgress(Math.round((pageNum / totalPages) * 100), `Scanning page ${pageNum} for images...`);
      }

      const page = await pdfDoc.getPage(pageNum);
      const operatorList = await page.getOperatorList();

      for (let i = 0; i < operatorList.fnArray.length; i++) {
        // OPS.paintImageXObject is 85
        if (operatorList.fnArray[i] === 85) {
          const imgObjKey = operatorList.argsArray[i][0];
          try {
            const imgObj = await page.objs.get(imgObjKey);
            if (imgObj && (imgObj.bitmap || imgObj.data)) {
              const canvas = document.createElement('canvas');
              canvas.width = imgObj.width;
              canvas.height = imgObj.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                if (imgObj.bitmap) {
                  ctx.drawImage(imgObj.bitmap, 0, 0);
                } else if (imgObj.data) {
                  const imgData = ctx.createImageData(imgObj.width, imgObj.height);
                  // Copy or adjust components
                  if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                    // RGB to RGBA
                    let srcIdx = 0;
                    for (let p = 0; p < imgData.data.length; p += 4) {
                      imgData.data[p] = imgObj.data[srcIdx++];
                      imgData.data[p + 1] = imgObj.data[srcIdx++];
                      imgData.data[p + 2] = imgObj.data[srcIdx++];
                      imgData.data[p + 3] = 255;
                    }
                  } else {
                    imgData.data.set(imgObj.data);
                  }
                  ctx.putImageData(imgData, 0, 0);
                }

                const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
                if (blob) {
                  extracted.push({
                    name: `page_${pageNum}_img_${extracted.length + 1}.png`,
                    blob,
                    width: imgObj.width,
                    height: imgObj.height,
                    pageNumber: pageNum,
                  });
                }
              }
            }
          } catch (imgErr) {
            console.warn(`Could not extract image object ${imgObjKey}:`, imgErr);
          }
        }
      }
    }

    return extracted;
  },
};
