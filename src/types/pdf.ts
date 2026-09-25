/**
 * Core PDF and Document Types
 */

export interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  buffer?: ArrayBuffer;
  thumbnailUrl?: string;
  lastModified?: number;
}

export interface PDFPageInfo {
  pageNumber: number; // 1-indexed
  originalIndex: number; // 0-indexed original index
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  selected?: boolean;
}

export interface PDFOperationResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  message?: string;
  multipleBlobs?: Array<{ blob: Blob; filename: string }>;
  stats?: {
    originalSize?: number;
    newSize?: number;
    reductionPercent?: number;
    pageCount?: number;
    imagesCount?: number;
  };
}

export type ProgressCallback = (progress: number, statusText: string) => void;

export interface AnnotationItem {
  id: string;
  type: 'text' | 'signature' | 'image' | 'checkbox' | 'date' | 'highlight' | 'draw' | 'thumbmark' | 'redaction';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  text?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  rotation?: number;
  checked?: boolean;
  imageUrl?: string;
  pathPoints?: Array<{ x: number; y: number }>;
  strokeWidth?: number;
}
