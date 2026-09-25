import { WorkflowNode } from '@/types/workflow';
import { ProgressCallback } from '@/types/pdf';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { compressionService } from '@/services/compression/compressionService';
import { parsePageRanges } from '@/utils/fileUtils';
import { PDFDocument } from 'pdf-lib';

export const workflowService = {
  /**
   * Run a chain of PDF workflow operations sequentially
   */
  async executeWorkflow(
    inputBuffer: ArrayBuffer,
    nodes: WorkflowNode[],
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    let currentBuffer = inputBuffer.slice(0);
    const activeNodes = nodes.filter((n) => n.enabled);

    if (activeNodes.length === 0) {
      return new Uint8Array(currentBuffer);
    }

    for (let i = 0; i < activeNodes.length; i++) {
      const node = activeNodes[i];
      const stepPercent = Math.round((i / activeNodes.length) * 100);

      if (onProgress) {
        onProgress(stepPercent, `Running step ${i + 1} of ${activeNodes.length}: ${node.title}...`);
      }

      switch (node.type) {
        case 'removePages': {
          const doc = await PDFDocument.load(currentBuffer, { ignoreEncryption: true });
          const total = doc.getPageCount();
          const pagesToRemove = parsePageRanges(node.config.pages || '', total);
          // Sort descending to delete from back without shifting indices
          const sortedDesc = Array.from(new Set(pagesToRemove)).sort((a, b) => b - a);
          for (const p of sortedDesc) {
            if (p >= 1 && p <= doc.getPageCount()) {
              doc.removePage(p - 1);
            }
          }
          currentBuffer = (await doc.save()).buffer as ArrayBuffer;
          break;
        }

        case 'rotate': {
          const degrees = parseInt(node.config.degrees || '90', 10);
          const targetPages = node.config.pages ? parsePageRanges(node.config.pages) : undefined;
          const rotated = await pdfLibService.rotatePDF(currentBuffer, degrees, targetPages);
          currentBuffer = rotated.buffer as ArrayBuffer;
          break;
        }

        case 'flip': {
          const dir = node.config.direction || 'horizontal';
          const flipped = await pdfLibService.flipPDF(currentBuffer, dir);
          currentBuffer = flipped.buffer as ArrayBuffer;
          break;
        }

        case 'watermark': {
          const wm = await pdfLibService.addWatermark(currentBuffer, {
            text: node.config.text || 'CONFIDENTIAL',
            opacity: parseFloat(node.config.opacity ?? '0.3'),
            rotation: parseInt(node.config.rotation ?? '45', 10),
            fontSize: parseInt(node.config.fontSize ?? '48', 10),
            color: node.config.color || '#ef4444',
          });
          currentBuffer = wm.buffer as ArrayBuffer;
          break;
        }

        case 'pageNumbers': {
          const pn = await pdfLibService.addPageNumbers(currentBuffer, {
            position: node.config.position || 'bottom-right',
            format: node.config.format || 'page_n_of_total',
            fontSize: parseInt(node.config.fontSize ?? '10', 10),
          });
          currentBuffer = pn.buffer as ArrayBuffer;
          break;
        }

        case 'batesNumbering': {
          const bates = await pdfLibService.addBatesNumbering(currentBuffer, {
            prefix: node.config.prefix || 'CASE-',
            startNumber: parseInt(node.config.startNumber ?? '1', 10),
            digits: parseInt(node.config.digits ?? '6', 10),
            position: node.config.position || 'top-right',
          });
          currentBuffer = bates.buffer as ArrayBuffer;
          break;
        }

        case 'compress': {
          const level = node.config.level || 'medium';
          const compResult = await compressionService.compressPDF(currentBuffer, level);
          currentBuffer = compResult.data.buffer as ArrayBuffer;
          break;
        }

        case 'flatten': {
          const flattened = await pdfLibService.flattenPDF(currentBuffer);
          currentBuffer = flattened.buffer as ArrayBuffer;
          break;
        }

        case 'crop': {
          const margin = parseInt(node.config.margin ?? '20', 10);
          const cropped = await pdfLibService.cropAndResizePDF(currentBuffer, {
            top: margin,
            right: margin,
            bottom: margin,
            left: margin,
          });
          currentBuffer = cropped.buffer as ArrayBuffer;
          break;
        }

        case 'metadata': {
          const updated = await pdfLibService.updateMetadata(currentBuffer, {
            title: node.config.title,
            author: node.config.author,
            subject: node.config.subject,
          });
          currentBuffer = updated.buffer as ArrayBuffer;
          break;
        }

        default:
          break;
      }
    }

    if (onProgress) onProgress(100, 'Workflow completed successfully!');
    return new Uint8Array(currentBuffer);
  },
};
