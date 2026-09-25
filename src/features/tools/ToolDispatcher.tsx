import React from 'react';
import { WorkflowBuilder } from '@/features/workflow/WorkflowBuilder';
import { MergePDFView } from '@/features/organize/MergePDFView';
import { SplitPDFView } from '@/features/organize/SplitPDFView';
import { OrganizePagesView } from '@/features/organize/OrganizePagesView';
import { CompressPDFView } from '@/features/organize/CompressPDFView';
import {
  AlternateMixView,
  SplitByTextView,
  SplitByBookmarksView,
  SplitInHalfView,
  SplitBySizeView,
  RotatePDFView,
  FlipPDFView,
  NUpPDFView,
  CropResizeView,
} from '@/features/organize/OrganizeTools';
import { EditPDFView, SignPDFView } from '@/features/edit/EditPDFView';
import {
  FillFormView,
  RedactPDFView,
  WatermarkView,
  PageNumbersView,
  BatesNumberingView,
  HeadersFootersView,
  FlattenPDFView,
  InvertColoursView,
  ThumbmarkMakerView,
} from '@/features/edit/EditTools';
import {
  TextToHandwritingView,
  PDFToHandwritingView,
  HandwritingToPDFView,
} from '@/features/handwriting/HandwritingTools';
import {
  CreatePDFView,
  ImagesToPDFView,
  WordToPDFView,
  ExcelToPDFView,
  PPTToPDFView,
  HTMLToPDFView,
  MarkdownToPDFView,
  ResumeBuilderView,
  CSVToPDFView,
  AudioToPDFView,
  EBookToPDFView,
} from '@/features/create/CreateTools';
import {
  PDFToWordView,
  PDFToJPGView,
  PDFToExcelView,
  PDFToPPTView,
  PDFToHTMLView,
  PDFToAudioView,
  PDFToEPUBView,
  ExtractTextView,
  ExtractImagesView,
  PDFToZIPView,
} from '@/features/convert/ConvertTools';
import {
  EncryptPDFView,
  UnlockPDFView,
  EditMetadataView,
} from '@/features/security/SecurityTools';

export interface ToolDispatcherProps {
  toolId: string;
}

export const ToolDispatcher: React.FC<ToolDispatcherProps> = ({ toolId }) => {
  switch (toolId) {
    // Workflow
    case 'workflow':
      return <WorkflowBuilder />;

    // Organize
    case 'merge':
      return <MergePDFView />;
    case 'alternate-mix':
      return <AlternateMixView />;
    case 'split':
      return <SplitPDFView />;
    case 'split-text':
      return <SplitByTextView />;
    case 'split-bookmarks':
      return <SplitByBookmarksView />;
    case 'split-half':
      return <SplitInHalfView />;
    case 'split-size':
      return <SplitBySizeView />;
    case 'organize':
      return <OrganizePagesView />;
    case 'rotate':
      return <RotatePDFView />;
    case 'flip':
      return <FlipPDFView />;
    case 'n-up':
      return <NUpPDFView />;
    case 'crop-resize':
      return <CropResizeView />;
    case 'compress':
      return <CompressPDFView />;

    // Edit & Annotate
    case 'edit':
      return <EditPDFView />;
    case 'sign':
      return <SignPDFView />;
    case 'fill-form':
      return <FillFormView />;
    case 'redact':
      return <RedactPDFView />;
    case 'watermark':
      return <WatermarkView />;
    case 'page-numbers':
      return <PageNumbersView />;
    case 'bates':
      return <BatesNumberingView />;
    case 'header-footer':
      return <HeadersFootersView />;
    case 'flatten':
      return <FlattenPDFView />;
    case 'invert':
      return <InvertColoursView />;
    case 'thumbmark':
      return <ThumbmarkMakerView />;

    // Handwriting
    case 'text-to-handwriting':
      return <TextToHandwritingView />;
    case 'pdf-to-handwriting':
      return <PDFToHandwritingView />;
    case 'handwriting-to-pdf':
      return <HandwritingToPDFView />;

    // Create PDF
    case 'create-pdf':
      return <CreatePDFView />;
    case 'images-to-pdf':
      return <ImagesToPDFView />;
    case 'word-to-pdf':
      return <WordToPDFView />;
    case 'excel-to-pdf':
      return <ExcelToPDFView />;
    case 'ppt-to-pdf':
      return <PPTToPDFView />;
    case 'html-to-pdf':
      return <HTMLToPDFView />;
    case 'markdown-to-pdf':
      return <MarkdownToPDFView />;
    case 'resume-builder':
      return <ResumeBuilderView />;
    case 'csv-to-pdf':
      return <CSVToPDFView />;
    case 'audio-to-pdf':
      return <AudioToPDFView />;
    case 'ebook-to-pdf':
      return <EBookToPDFView />;

    // Convert From PDF
    case 'pdf-to-word':
      return <PDFToWordView />;
    case 'pdf-to-jpg':
      return <PDFToJPGView />;
    case 'pdf-to-excel':
      return <PDFToExcelView />;
    case 'pdf-to-ppt':
      return <PDFToPPTView />;
    case 'pdf-to-html':
      return <PDFToHTMLView />;
    case 'pdf-to-audio':
      return <PDFToAudioView />;
    case 'pdf-to-epub':
      return <PDFToEPUBView />;
    case 'extract-text':
      return <ExtractTextView />;
    case 'extract-images':
      return <ExtractImagesView />;
    case 'pdf-to-zip':
      return <PDFToZIPView />;

    // Security & Metadata
    case 'encrypt':
      return <EncryptPDFView />;
    case 'remove-password':
    case 'unlock-pdf':
      return <UnlockPDFView />;
    case 'metadata':
      return <EditMetadataView />;

    default:
      return (
        <div className="p-8 text-center text-slate-500">
          Tool not found. Please select a tool from the sidebar.
        </div>
      );
  }
};
