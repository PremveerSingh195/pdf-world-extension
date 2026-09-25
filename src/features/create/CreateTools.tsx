import React, { useState } from 'react';
import { downloadService } from '@/services/download/downloadService';
import { docxService } from '@/services/conversion/docxService';
import { sheetService } from '@/services/conversion/sheetService';
import { pptxService } from '@/services/conversion/pptxService';
import { htmlService } from '@/services/conversion/htmlService';
import { markdownService } from '@/services/conversion/markdownService';
import { resumeService, ResumeData } from '@/services/conversion/resumeService';
import { audioService } from '@/services/conversion/audioService';
import { handwritingService } from '@/services/conversion/handwritingService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Images,
  Table,
  Presentation,
  Code,
  FileCode,
  Briefcase,
  FileSpreadsheet,
  Mic,
  BookOpen,
  PlusCircle,
  Play,
  Square,
} from 'lucide-react';

/* =========================================================================
   1. CREATE BLANK / CUSTOM PDF
   ========================================================================= */
export const CreatePDFView: React.FC = () => {
  const [title, setTitle] = useState('New Document');
  const [body, setBody] = useState('Write or paste your document content here...');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);

  const handleCreate = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text(title, 40, 60);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(body, 515);
    pdf.text(lines, 40, 95);

    setOutputBytes(new Uint8Array(pdf.output('arraybuffer')));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-brand-600" />
          Create PDF Document
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Generate a fresh, styled PDF document directly from scratch.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Document Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Body Content
          </label>
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 leading-relaxed"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button size="md" variant="primary" onClick={handleCreate}>
            Generate PDF
          </Button>
        </div>
      </div>

      {outputBytes && (
        <DownloadButton
          filename={`${title.replace(/\s+/g, '_')}.pdf`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `${title.replace(/\s+/g, '_')}.pdf`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   2. IMAGES TO PDF
   ========================================================================= */
export const ImagesToPDFView: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setProgress(0);
    try {
      const items = await Promise.all(
        images.map(async (f) => ({ file: f, buffer: await f.arrayBuffer() }))
      );
      const res = await handwritingService.imagesToPdf(items, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert images to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Images className="w-6 h-6 text-brand-600" />
          Images to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Combine JPG, PNG, WEBP, and GIF images into a single clean PDF document.
        </p>
      </div>

      <FileDropzone
        multiple
        acceptedFileTypes={['.jpg', '.jpeg', '.png', '.webp', '.gif']}
        onFilesSelected={(files) => {
          setImages((prev) => [...prev, ...files]);
          setOutputBytes(null);
        }}
        title="Drop images here to convert"
      />

      {images.length > 0 && !outputBytes && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {images.length} {images.length === 1 ? 'image' : 'images'} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setImages([])}>
              Clear
            </Button>
            <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
              Create PDF ({images.length} Pages)
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename="Images_Combined.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'Images_Combined.pdf');
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   3. WORD TO PDF
   ========================================================================= */
export const WordToPDFView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (f: File) => {
    setFile(f);
    setProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const res = await docxService.docxToPdf(f, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert Word document to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-600" />
          Word to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert Microsoft Word (.docx / .doc) documents into standard PDF pages.
        </p>
      </div>

      {!file ? (
        <FileDropzone
          acceptedFileTypes={['.docx', '.doc']}
          onFilesSelected={(files) => handleConvert(files[0])}
          title="Drop Word document (.docx) here"
        />
      ) : null}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={() => { setFile(null); setError(null); }} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'Document'}.pdf`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `${file?.name.replace(/\.[^/.]+$/, '') || 'Document'}.pdf`);
          }}
          onReset={() => {
            setFile(null);
            setOutputBytes(null);
          }}
        />
      )}
    </div>
  );
};

/* =========================================================================
   4. EXCEL TO PDF
   ========================================================================= */
export const ExcelToPDFView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (f: File) => {
    setFile(f);
    setProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const res = await sheetService.excelToPdf(f, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert Excel spreadsheet to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Table className="w-6 h-6 text-brand-600" />
          Excel to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Render Excel spreadsheets (.xlsx, .xls) into styled, printable PDF tables.
        </p>
      </div>

      {!file ? (
        <FileDropzone
          acceptedFileTypes={['.xlsx', '.xls']}
          onFilesSelected={(files) => handleConvert(files[0])}
          title="Drop Excel (.xlsx, .xls) spreadsheet here"
        />
      ) : null}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={() => { setFile(null); setError(null); }} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'Spreadsheet'}.pdf`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `${file?.name.replace(/\.[^/.]+$/, '') || 'Spreadsheet'}.pdf`);
          }}
          onReset={() => {
            setFile(null);
            setOutputBytes(null);
          }}
        />
      )}
    </div>
  );
};

/* =========================================================================
   5. POWERPOINT TO PDF
   ========================================================================= */
export const PPTToPDFView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (f: File) => {
    setFile(f);
    setProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const res = await pptxService.pptxToPdf(f, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert PowerPoint to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Presentation className="w-6 h-6 text-brand-600" />
          PowerPoint to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert PowerPoint presentations (.pptx) into clean PDF slides.
        </p>
      </div>

      {!file ? (
        <FileDropzone
          acceptedFileTypes={['.pptx', '.ppt']}
          onFilesSelected={(files) => handleConvert(files[0])}
          title="Drop PowerPoint (.pptx) here"
        />
      ) : null}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={() => { setFile(null); setError(null); }} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'Presentation'}.pdf`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `${file?.name.replace(/\.[^/.]+$/, '') || 'Presentation'}.pdf`);
          }}
          onReset={() => {
            setFile(null);
            setOutputBytes(null);
          }}
        />
      )}
    </div>
  );
};

/* =========================================================================
   6. HTML TO PDF
   ========================================================================= */
export const HTMLToPDFView: React.FC = () => {
  const [htmlCode, setHtmlCode] = useState(
    `<h1 style="color: #ef4444;">Monthly Executive Report</h1>\n<p>This document was generated directly from <strong>HTML and CSS</strong> using the PDF Toolbox Chrome Extension.</p>\n<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">\n  <tr style="background: #f1f5f9;">\n    <th style="border: 1px solid #cbd5e1; padding: 8px;">Metric</th>\n    <th style="border: 1px solid #cbd5e1; padding: 8px;">Value</th>\n  </tr>\n  <tr>\n    <td style="border: 1px solid #cbd5e1; padding: 8px;">Performance</td>\n    <td style="border: 1px solid #cbd5e1; padding: 8px;">99.8%</td>\n  </tr>\n</table>`
  );
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await htmlService.htmlToPdf(htmlCode);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'HTML to PDF rendering failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Code className="w-6 h-6 text-brand-600" />
          HTML to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Paste HTML and CSS code to instantly generate high-fidelity PDF documents.
        </p>
      </div>

      <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <textarea
          rows={10}
          value={htmlCode}
          onChange={(e) => setHtmlCode(e.target.value)}
          className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 leading-relaxed"
        />

        <div className="flex justify-end">
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Render HTML to PDF
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename="HTML_Rendered.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'HTML_Rendered.pdf');
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   7. MARKDOWN TO PDF
   ========================================================================= */
export const MarkdownToPDFView: React.FC = () => {
  const [md, setMd] = useState(
    `# Project Specification Document\n\n## Overview\nThis PDF was generated from **Markdown** live inside the extension.\n\n### Core Features\n- Fast client-side conversion\n- Typography and syntax highlighting\n- Standard A4 layout`
  );
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);

  const handleConvert = async () => {
    setProcessing(true);
    try {
      const res = await markdownService.markdownToPdf(md);
      setOutputBytes(res);
    } catch {
      //
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileCode className="w-6 h-6 text-brand-600" />
          Markdown to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Live Markdown editor with formatted PDF export.
        </p>
      </div>

      <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <textarea
          rows={10}
          value={md}
          onChange={(e) => setMd(e.target.value)}
          className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 leading-relaxed"
        />

        <div className="flex justify-end">
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Export to PDF
          </Button>
        </div>
      </div>

      {outputBytes && !processing && (
        <DownloadButton
          filename="Markdown_Document.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'Markdown_Document.pdf');
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   8. RESUME BUILDER
   ========================================================================= */
export const ResumeBuilderView: React.FC = () => {
  const [data, setData] = useState<ResumeData>({
    fullName: 'Alex Johnson',
    jobTitle: 'Senior Full Stack Engineer',
    email: 'alex.johnson@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    summary:
      'Passionate software engineer with 6+ years of experience designing scalable distributed web applications, modern frontends, and browser extensions.',
    skills: ['TypeScript', 'React', 'Node.js', 'Vite', 'Tailwind CSS', 'Chrome Extension APIs', 'PDF Architecture'],
    experience: [
      {
        company: 'CloudTech Systems',
        position: 'Lead Frontend Architect',
        startDate: '2022',
        endDate: 'Present',
        description: 'Led architecture for browser applications serving 2M+ monthly active users.',
      },
      {
        company: 'Digital Solutions Inc.',
        position: 'Software Engineer',
        startDate: '2019',
        endDate: '2022',
        description: 'Built customer-facing dashboards and real-time document manipulation pipelines.',
      },
    ],
    education: [
      {
        school: 'University of California, Berkeley',
        degree: 'B.S. in Computer Science',
        year: '2019',
      },
    ],
  });

  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);

  const handleGenerate = async () => {
    const res = await resumeService.generateResumePdf(data);
    setOutputBytes(res);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-brand-600" />
          Resume Builder
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Create clean, professional, ATS-friendly resumes and export immediately to PDF.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={data.fullName}
              onChange={(e) => setData({ ...data, fullName: e.target.value })}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Role / Title</label>
            <input
              type="text"
              value={data.jobTitle}
              onChange={(e) => setData({ ...data, jobTitle: e.target.value })}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="text"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input
              type="text"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => setData({ ...data, location: e.target.value })}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Executive Summary</label>
          <textarea
            rows={3}
            value={data.summary}
            onChange={(e) => setData({ ...data, summary: e.target.value })}
            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button size="md" variant="primary" onClick={handleGenerate}>
            Generate Resume PDF
          </Button>
        </div>
      </div>

      {outputBytes && (
        <DownloadButton
          filename={`${data.fullName.replace(/\s+/g, '_')}_Resume.pdf`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `${data.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   9. CSV TO PDF
   ========================================================================= */
export const CSVToPDFView: React.FC = () => {
  const [csvText, setCsvText] = useState(
    'Employee ID,Name,Department,Salary,Status\n101,John Doe,Engineering,$120000,Active\n102,Jane Smith,Marketing,$105000,Active\n103,Robert Brown,Finance,$98000,Active\n104,Emily Davis,Operations,$112000,Active'
  );
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      const text = await files[0].text();
      setCsvText(text);
      setError(null);
    } catch {
      setError('Could not read CSV file.');
    }
  };

  const handleConvert = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await sheetService.csvToPdf(csvText);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to render CSV to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-brand-600" />
          CSV to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert comma-separated tabular data or upload a CSV file to generate clean, formatted PDF reports.
        </p>
      </div>

      <FileDropzone
        acceptedFileTypes={['.csv']}
        onFilesSelected={handleFileUpload}
        title="Drop .csv file here or paste text below"
      />

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            CSV Data Content
          </label>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 leading-relaxed"
          />
        </div>

        <div className="flex justify-end">
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Render CSV to PDF
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {outputBytes && !processing && (
        <DownloadButton
          filename="CSV_Report.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'CSV_Report.pdf');
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   10. AUDIO TO PDF
   ========================================================================= */
export const AudioToPDFView: React.FC = () => {
  const [transcript, setTranscript] = useState('Meeting notes recorded on voice transcript:\n\n1. Project kickoff completed.\n2. Milestones aligned for next sprint release.');
  const [recording, setRecording] = useState(false);
  const [recognitionObj, setRecognitionObj] = useState<any>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);

  const toggleRecording = () => {
    if (recording) {
      recognitionObj?.stop();
      setRecording(false);
    } else {
      if (audioService.isRecognitionSupported()) {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          setTranscript(text);
        };
        rec.start();
        setRecognitionObj(rec);
        setRecording(true);
      } else {
        alert('Web Speech Recognition is not supported in this browser. Please type or paste your audio transcript directly.');
      }
    }
  };

  const handleExport = () => {
    const res = audioService.transcriptToPdf(transcript);
    setOutputBytes(res);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Mic className="w-6 h-6 text-brand-600" />
          Audio to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Record voice memos or transcribe audio recordings into a formatted PDF document.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Voice Dictation</span>
          <Button
            size="sm"
            variant={recording ? 'danger' : 'outline'}
            icon={recording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            onClick={toggleRecording}
          >
            {recording ? 'Stop Recording' : 'Start Voice Dictation'}
          </Button>
        </div>

        <textarea
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 leading-relaxed"
          placeholder="Speak or paste audio transcript here..."
        />

        <div className="flex justify-end">
          <Button size="md" variant="primary" onClick={handleExport}>
            Export Transcript to PDF
          </Button>
        </div>
      </div>

      {outputBytes && (
        <DownloadButton
          filename="Audio_Transcript.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'Audio_Transcript.pdf');
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   11. EBOOK TO PDF
   ========================================================================= */
export const EBookToPDFView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);

  const handleConvert = async (f: File) => {
    setFile(f);
    const text = await f.text();
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(text.substring(0, 4000), 515);
    pdf.text(lines, 40, 50);
    setOutputBytes(new Uint8Array(pdf.output('arraybuffer')));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-600" />
          eBook to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert digital ebook texts into cleanly typeset standard PDF format.
        </p>
      </div>

      {!file ? (
        <FileDropzone
          acceptedFileTypes={['.epub', '.txt']}
          onFilesSelected={(files) => handleConvert(files[0])}
          title="Drop eBook file here"
        />
      ) : null}

      {outputBytes && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'eBook'}.pdf`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `${file?.name.replace(/\.[^/.]+$/, '') || 'eBook'}.pdf`);
          }}
          onReset={() => {
            setFile(null);
            setOutputBytes(null);
          }}
        />
      )}
    </div>
  );
};
