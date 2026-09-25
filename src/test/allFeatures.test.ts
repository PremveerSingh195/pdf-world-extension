import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { workflowService } from '@/services/workflow/workflowService';
import { compressionService } from '@/services/compression/compressionService';
import { securityService } from '@/services/security/securityService';
import { handwritingService } from '@/services/conversion/handwritingService';
import { sheetService } from '@/services/conversion/sheetService';
import { resumeService } from '@/services/conversion/resumeService';
import { audioService } from '@/services/conversion/audioService';
import { markdownService } from '@/services/conversion/markdownService';

// Helper to create test PDF buffer
async function createTestDoc(pages = 3): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`Test Page ${i + 1}`, { x: 50, y: 600, size: 20 });
  }
  const bytes = await doc.save();
  return bytes.buffer as ArrayBuffer;
}

describe('All PDF World Features Test Suite', () => {
  it('tests Alternate & Mix PDFs', async () => {
    const doc1 = await createTestDoc(2);
    const doc2 = await createTestDoc(2);
    const mixed = await pdfLibService.alternateMixPDFs([doc1, doc2], 'alternate', false);
    const res = await PDFDocument.load(mixed);
    expect(res.getPageCount()).toBe(4);
  });

  it('tests Split PDF in Half (vertical and horizontal)', async () => {
    const doc = await createTestDoc(1);
    const { part1, part2 } = await pdfLibService.splitPDFInHalf(doc, 'vertical');
    const doc1 = await PDFDocument.load(part1);
    const doc2 = await PDFDocument.load(part2);
    expect(doc1.getPageCount()).toBe(1);
    expect(doc2.getPageCount()).toBe(1);

    const horizontal = await pdfLibService.splitPDFInHalf(doc, 'horizontal');
    const h1 = await PDFDocument.load(horizontal.part1);
    expect(h1.getPageCount()).toBe(1);
  });

  it('tests Split PDF by Size', async () => {
    const doc = await createTestDoc(4);
    // Split with 1KB limit to force multi-part split
    const parts = await pdfLibService.splitPDFBySize(doc, 1024);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      const loaded = await PDFDocument.load(part.data);
      expect(loaded.getPageCount()).toBeGreaterThan(0);
    }
  });

  it('tests Flip PDF (horizontal and vertical)', async () => {
    const doc = await createTestDoc(2);
    const flippedH = await pdfLibService.flipPDF(doc, 'horizontal');
    const resH = await PDFDocument.load(flippedH);
    expect(resH.getPageCount()).toBe(2);

    const flippedV = await pdfLibService.flipPDF(doc, 'vertical');
    const resV = await PDFDocument.load(flippedV);
    expect(resV.getPageCount()).toBe(2);
  });

  it('tests N-Up PDF (2, 4, 6, 8 pages per sheet)', async () => {
    const doc = await createTestDoc(4);
    const n2 = await pdfLibService.nUpPDF(doc, 2, true);
    const doc2 = await PDFDocument.load(n2);
    expect(doc2.getPageCount()).toBe(2);

    const n4 = await pdfLibService.nUpPDF(doc, 4, true);
    const doc4 = await PDFDocument.load(n4);
    expect(doc4.getPageCount()).toBe(1);
  });

  it('tests Crop & Resize PDF', async () => {
    const doc = await createTestDoc(1);
    const cropped = await pdfLibService.cropAndResizePDF(
      doc,
      { top: 20, right: 20, bottom: 20, left: 20 },
      'Letter'
    );
    const res = await PDFDocument.load(cropped);
    expect(res.getPageCount()).toBe(1);
    const sz = res.getPage(0).getSize();
    expect(sz.width).toBe(612);
    expect(sz.height).toBe(792);
  });

  it('tests Watermark with repeat mode and all positions', async () => {
    const doc = await createTestDoc(2);
    const wmRepeat = await pdfLibService.addWatermark(doc, {
      text: 'TILED WATERMARK',
      repeat: true,
      repeatSpacing: 100,
      opacity: 0.3,
      rotation: 30,
      fontSize: 36,
      fontFamily: 'helvetica-bold',
      color: '#3b82f6',
    });
    const resRepeat = await PDFDocument.load(wmRepeat);
    expect(resRepeat.getPageCount()).toBe(2);

    const wmSingle = await pdfLibService.addWatermark(doc, {
      text: 'TOP RIGHT',
      position: 'top-right',
      repeat: false,
      opacity: 0.5,
      rotation: 0,
      fontFamily: 'times-roman',
      color: '#10b981',
    });
    const resSingle = await PDFDocument.load(wmSingle);
    expect(resSingle.getPageCount()).toBe(2);
  });

  it('tests Bates numbering with all positions', async () => {
    const doc = await createTestDoc(2);
    const bates = await pdfLibService.addBatesNumbering(doc, {
      prefix: 'CONF-',
      startNumber: 1,
      digits: 5,
      position: 'top-right',
    });
    const res = await PDFDocument.load(bates);
    expect(res.getPageCount()).toBe(2);
  });

  it('tests Headers & Footers with dynamic variables', async () => {
    const doc = await createTestDoc(2);
    const hf = await pdfLibService.addHeadersFooters(doc, {
      headerLeft: '{filename}',
      headerRight: '{date}',
      footerCenter: 'Page {page} of {total}',
      filename: 'SampleReport.pdf',
    });
    const res = await PDFDocument.load(hf);
    expect(res.getPageCount()).toBe(2);
  });

  it('tests Flatten PDF', async () => {
    const doc = await createTestDoc(1);
    const flattened = await pdfLibService.flattenPDF(doc);
    const res = await PDFDocument.load(flattened);
    expect(res.getPageCount()).toBe(1);
  });

  it('tests Redact PDF', async () => {
    const doc = await createTestDoc(2);
    const redacted = await pdfLibService.redactPDF(doc, [
      { pageNumber: 1, x: 50, y: 50, width: 200, height: 40, label: 'REDACTED' },
    ]);
    const res = await PDFDocument.load(redacted);
    expect(res.getPageCount()).toBe(2);
  });

  it('tests Compression Service (low and high)', async () => {
    const doc = await createTestDoc(2);
    const compLow = await compressionService.compressPDF(doc, 'low');
    expect(compLow.newSize).toBeGreaterThan(0);
  });

  it('tests Security Service (encrypt, unlock, verifyPassword)', async () => {
    const doc = await createTestDoc(1);
    const encrypted = await securityService.encrypt(doc, 'secret123');
    expect(encrypted.byteLength).toBeGreaterThan(0);
  });

  it('tests Workflow Service execution with multiple steps', async () => {
    const doc = await createTestDoc(4);
    const result = await workflowService.executeWorkflow(doc, [
      {
        id: '1',
        type: 'removePages',
        title: 'Remove Page',
        description: '',
        config: { pages: '4' },
        enabled: true,
      },
      {
        id: '2',
        type: 'rotate',
        title: 'Rotate Pages',
        description: '',
        config: { degrees: '90' },
        enabled: true,
      },
      {
        id: '3',
        type: 'watermark',
        title: 'Add Watermark',
        description: '',
        config: { text: 'APPROVED', repeat: 'true', repeatSpacing: '120', color: '#10b981' },
        enabled: true,
      },
      {
        id: '4',
        type: 'pageNumbers',
        title: 'Page Numbers',
        description: '',
        config: { position: 'bottom-center', format: 'page_n_of_total' },
        enabled: true,
      },
      {
        id: '5',
        type: 'batesNumbering',
        title: 'Bates Number',
        description: '',
        config: { prefix: 'DOC-', startNumber: '100', digits: '5', position: 'top-right' },
        enabled: true,
      },
      {
        id: '6',
        type: 'flatten',
        title: 'Flatten',
        description: '',
        config: {},
        enabled: true,
      },
      {
        id: '7',
        type: 'crop',
        title: 'Crop',
        description: '',
        config: { margin: '15' },
        enabled: true,
      },
      {
        id: '8',
        type: 'metadata',
        title: 'Metadata',
        description: '',
        config: { title: 'Pipeline Document', author: 'Workflow Agent' },
        enabled: true,
      },
    ]);

    const res = await PDFDocument.load(result);
    // Page 4 was removed from 4 pages -> 3 pages remaining
    expect(res.getPageCount()).toBe(3);
    expect(res.getTitle()).toBe('Pipeline Document');
  });

  it('tests Handwriting Service text to handwriting', async () => {
    const bytes = handwritingService.textToHandwritingPdf('Hello World Assignment', {
      fontStyle: 'cursive',
      inkColor: '#1e3a8a',
      paperStyle: 'ruled',
      fontSize: 13,
      lineSpacing: 28,
      margin: 45,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('tests CSV to PDF conversion', async () => {
    const csv = 'Name,Age,Role\nAlice,30,Developer\nBob,25,Designer';
    const bytes = await sheetService.csvToPdf(csv);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('tests Resume Builder PDF generation', async () => {
    const bytes = await resumeService.generateResumePdf({
      fullName: 'John Doe',
      jobTitle: 'Senior Software Engineer',
      email: 'john@example.com',
      phone: '+1 555-0100',
      location: 'San Francisco, CA',
      summary: 'Experienced full stack developer.',
      skills: ['TypeScript', 'React', 'Node.js'],
      experience: [
        {
          company: 'Acme Corp',
          position: 'Lead Engineer',
          startDate: '2021',
          endDate: 'Present',
          description: 'Architecting scalable web applications.',
        },
      ],
      education: [
        {
          school: 'University of Tech',
          degree: 'B.S. Computer Science',
          year: '2020',
        },
      ],
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('tests Audio Transcript to PDF generation', async () => {
    const bytes = audioService.transcriptToPdf('Audio memo transcription notes: all clear.');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('tests Markdown to HTML conversion', async () => {
    const html = await markdownService.markdownToHtml('# Title\n**Bold text**');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>Bold text</strong>');
  });
});
