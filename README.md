# PDF Toolbox - Full-Featured PDF Editor & Workspace Chrome Extension

A production-quality **PDF Editor and PDF Utility Chrome Extension** built with **TypeScript**, **React**, **Vite**, **Tailwind CSS**, and **Manifest V3**.

Designed as a modern multi-tool workspace that feels like a lightweight desktop PDF utility inside Google Chrome, prioritizing **100% local, client-side document processing** for maximum privacy and performance.

---

## Features & Tool Registry

PDF Toolbox organizes 50+ tools across 7 modular categories:

### 1. Visual Workflow Builder (`/workflow`)
- Chain multiple PDF operations into an automated custom pipeline.
- Operation nodes: Remove Pages, Rotate, Flip, Add Watermark, Page Numbers, Bates Numbering, Compress, Flatten, Trim Margins, Update Metadata.
- Reorder nodes with drag/buttons, configure parameters per node, preview, run pipeline, and save/load reusable presets to Chrome Storage.

### 2. Organize Tools
- **Merge PDFs (`/merge`)**: Combine multiple PDFs into a single document with drag & drop reordering.
- **Alternate & Mix PDF (`/alternate-mix`)**: Interleave pages from 2+ documents (A1, B1, A2, B2...) with reverse option for duplex scanning.
- **Split PDF (`/split`)**: Split by page ranges (e.g. `1-3, 4-6`), extract all pages, and download individually or as a ZIP archive.
- **Split PDF by Text (`/split-text`)**: Automatically detect keywords (e.g. "Invoice Number") and split where matches appear.
- **Split PDF by Bookmarks (`/split-bookmarks`)**: Read PDF outline and split into chapters.
- **Split PDF in Half (`/split-half`)**: Cut dual-page book scans vertically (left/right) or horizontally (top/bottom).
- **Split PDF by Size (`/split-size`)**: Automatically divide large files into partitions under a specified maximum MB size.
- **Organize Pages (`/organize`)**: Visual grid editor with live thumbnails to drag & drop reorder, delete, duplicate, select, and rotate pages.
- **Rotate PDF (`/rotate`)**: Rotate 90°, 180°, 270° clockwise or counter-clockwise on all or specific page ranges.
- **Flip PDF (`/flip`)**: Mirror pages horizontally or vertically.
- **Multiple Pages Per Sheet (`/n-up`)**: Print-layout generator for 2, 4, 6, or 8 pages per sheet with border grid.
- **Crop & Resize (`/crop-resize`)**: Visually crop margins or standardize page dimensions to A4, Letter, A3, Legal, or custom.
- **Compress PDF (`/compress`)**: Low, Medium, and High compression with real-time original size, new size, and reduction percentage stats.

### 3. Edit & Annotate Tools
- **Edit PDF & Add Signature (`/edit`)**: Interactive page canvas to add movable, resizable text, signatures, images, checkboxes, dates, and yellow highlights.
- **Sign PDF (`/sign`)**: Dedicated signature interface with Draw signature, Type signature (cursive script), and Upload signature image.
- **Fill PDF Form (`/fill-form`)**: Detect and fill interactive AcroForm fields (text boxes, checkboxes, select menus, radio buttons).
- **Redact PDF (`/redact`)**: Draw redaction rectangles to permanently remove and sanitize confidential text and content with labels.
- **Add Watermark (`/watermark`)**: Apply text watermarks with angle, opacity, font size, and color controls.
- **Add Page Numbers (`/page-numbers`)**: Number pages at 6 positions with formats like `1`, `Page 1`, or `Page 1 of 10`.
- **Bates Numbering (`/bates`)**: Legal document indexing with custom prefix, digit padding (e.g., `CASE-000001`), and increment.
- **Headers & Footers (`/header-footer`)**: Add dynamic headers and footers supporting `{page}`, `{total}`, `{date}`, and `{filename}` variables.
- **Flatten PDF (`/flatten`)**: Lock form fields and annotations into permanent, non-editable page content.
- **Invert PDF Colours (`/invert`)**: Convert pages into high-contrast dark mode.
- **Thumbmark Maker (`/thumbmark`)**: Procedural biometric fingerprint stamping onto documents.

### 4. Handwriting Tools
- **Text to Handwriting (`/text-to-handwriting`)**: Convert typed text into handwritten notes on lined or grid notebook paper.
- **PDF to Handwriting (`/pdf-to-handwriting`)**: Transform regular typed PDF pages into handwritten script with customizable ink.
- **Handwriting to PDF (`/handwriting-to-pdf`)**: Convert smartphone photos, scans, and notebook snapshots into a clean PDF.

### 5. Create PDF Tools
- **Create PDF (`/create-pdf`)**: Create a new PDF document with headings, body, and typography from scratch.
- **Images to PDF (`/images-to-pdf`)**: Convert JPG, PNG, WEBP, and GIF images into a unified multi-page PDF.
- **Word to PDF (`/word-to-pdf`)**: Convert Microsoft Word (.docx / .doc) documents into PDF.
- **Excel to PDF (`/excel-to-pdf`)**: Render spreadsheets (.xlsx, .xls) into styled PDF tables.
- **PowerPoint to PDF (`/ppt-to-pdf`)**: Convert PowerPoint slides (.pptx) into PDF.
- **HTML to PDF (`/html-to-pdf`)**: Render HTML and CSS code directly into PDF pages.
- **Markdown to PDF (`/markdown-to-pdf`)**: Live Markdown editor with live preview and high-quality PDF export.
- **Resume Builder (`/resume-builder`)**: Interactive CV builder with modern layout and ATS-friendly PDF generation.
- **CSV to PDF (`/csv-to-pdf`)**: Convert comma-separated tabular data into formatted PDF reports.
- **Audio to PDF (`/audio-to-pdf`)**: Record speech with voice dictation or enter transcript to generate formatted PDF.
- **eBook to PDF (`/ebook-to-pdf`)**: Convert digital book text (.epub, .txt) into formatted PDF.

### 6. Convert From PDF Tools
- **PDF to Word (`/pdf-to-word`)**: Export layout and text paragraphs into editable Microsoft Word (.docx) documents.
- **PDF to JPG (`/pdf-to-jpg`)**: Render pages into high-definition JPG images, individual or as a ZIP archive.
- **PDF to Excel (`/pdf-to-excel`)**: Detect tabular structures in PDF and export directly to Microsoft Excel (.xlsx).
- **PDF to PowerPoint (`/pdf-to-ppt`)**: Convert PDF pages into PowerPoint presentation slides (.pptx).
- **PDF to HTML (`/pdf-to-html`)**: Generate semantic, responsive HTML web pages.
- **PDF to Audio (`/pdf-to-audio`)**: Listen to PDF text read aloud using natural browser Text-to-Speech (TTS) with playback speed controls.
- **PDF to EPUB (`/pdf-to-epub`)**: Convert PDF text into standard EPUB ebook files.
- **Extract Text (`/extract-text`)**: Extract all text from PDF with 1-click clipboard copy or TXT download.
- **Extract Images from PDF (`/extract-images`)**: Scan and pull all embedded photos and diagrams; download individual or as ZIP.
- **PDF to ZIP (`/pdf-to-zip`)**: Package documents and pages into a compressed ZIP archive.

### 7. Security & Metadata Tools
- **Encrypt PDF (`/encrypt`)**: Protect documents with password protection and security markers.
- **Unlock / Remove Password (`/unlock-pdf`)**: Decrypt protected documents using the master password to produce an unrestricted copy.
- **Edit PDF Metadata (`/metadata`)**: Inspect and update Title, Author, Subject, Keywords, Creator, and Producer.

---

## Technology Stack

- **Runtime & Language**: TypeScript, React 18
- **Build System**: Vite, Rollup
- **Styling**: Tailwind CSS, PostCSS
- **PDF Engine**: `pdf-lib` (structural manipulation, forms, metadata, watermarks), `pdfjs-dist` (local worker rendering, text & image extraction)
- **Document Generators**: `docx`, `xlsx`, `pptxgenjs`, `jspdf`, `jszip`, `marked`
- **Extension Platform**: Chrome Extension Manifest V3, Chrome Storage API, Chrome Downloads API, Background Service Worker

---

## Project Structure

```text
pdf-world/
├── public/
│   ├── icons/                  # 16, 32, 48, 128 px extension icons
│   ├── manifest.json           # Chrome Extension Manifest V3
│   └── pdf.worker.min.js       # Offline local PDF.js worker
├── src/
│   ├── background/             # MV3 Service worker
│   ├── popup/                  # Lightweight launcher popup
│   ├── components/
│   │   ├── common/             # Button, FormControls, Modal, Dropzone, FileList, etc.
│   │   ├── layout/             # Topbar, Sidebar, SettingsModal
│   │   ├── viewer/             # Interactive PDFViewer with thumbnails & zoom
│   │   ├── editor/             # AnnotationCanvas & SignaturePadModal
│   │   └── organizer/          # PageGrid drag-and-drop organizer
│   ├── features/
│   │   ├── dashboard/          # Home discovery hub
│   │   ├── workflow/           # Visual Workflow Builder
│   │   ├── organize/           # Merge, Split, Rotate, Compress, N-Up, Crop, etc.
│   │   ├── edit/               # Editor, Signature, Form fill, Redact, Watermark, etc.
│   │   ├── handwriting/        # Text to Handwriting, Handwriting to PDF
│   │   ├── create/             # Word/Excel/PPT/HTML/Markdown/Resume/CSV to PDF
│   │   ├── convert/            # PDF to Word/Excel/PPT/JPG/HTML/Audio/EPUB/Text/Images
│   │   ├── security/           # Encrypt, Unlock, Metadata
│   │   └── tools/              # Tool registry & dispatcher router
│   ├── services/
│   │   ├── pdf/                # pdfLibService, pdfJsService
│   │   ├── conversion/         # docx, sheet, pptx, html, markdown, resume, audio, handwriting
│   │   ├── compression/        # compressionService (Low, Medium, High)
│   │   ├── storage/            # chromeStorageService
│   │   └── download/           # downloadService (Single, Multiple, ZIP)
│   ├── hooks/                  # useChromeStorage, useTheme, useToast
│   ├── types/                  # Strong TypeScript definitions
│   ├── utils/                  # fileUtils, byte formatting, range parsing
│   ├── test/                   # Automated unit test suite
│   ├── App.tsx                 # Main application shell
│   ├── main.tsx                # App entry point for app.html
│   └── index.css               # Design system and tokens
├── app.html                    # Full workspace HTML entry
├── popup.html                  # Popup launcher HTML entry
├── vite.config.ts              # Multi-page extension bundler config
├── tailwind.config.js          # Design palette & dark mode
├── tsconfig.json               # Strict TypeScript configuration
└── package.json
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
Run the Vite development server:
```bash
npm run dev
```

### 3. Run Unit Tests
Execute the unit test suite:
```bash
npm test
```

### 4. Build Production Bundle
Generate the unpacked Chrome Extension in `dist/`:
```bash
npm run build
```

---

## Loading the Extension into Google Chrome

1. Open Google Chrome.
2. In the URL address bar, enter `chrome://extensions`.
3. In the upper-right corner, enable **Developer mode**.
4. In the upper-left corner, click **Load unpacked**.
5. Select the `dist` folder located inside `/Users/prem/Documents/coding/PersonalProjects/pdf-world/dist`.
6. Click the extension icon in your Chrome toolbar:
   - Click **Open PDF Toolbox Workspace** to launch the full-page application.
   - Or click any recent tool in the popup to jump straight to that tool.

---

## Privacy & Security

PDF Toolbox was built from the ground up to protect user privacy:
- **No external server uploads**: Files never leave your local device.
- **In-browser execution**: All rendering, compression, text extraction, and conversions occur client-side.
- **Offline ready**: The PDF.js worker and all document engines are bundled directly inside the extension.
