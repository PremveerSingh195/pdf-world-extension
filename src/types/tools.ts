export type ToolCategory =
  | 'workflow'
  | 'organize'
  | 'edit'
  | 'handwriting'
  | 'create'
  | 'convert'
  | 'security';

export interface PDFTool {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  category: ToolCategory;
  icon: string;
  badge?: string;
  acceptsMultipleFiles?: boolean;
  acceptedFileTypes?: string[];
  maxFiles?: number;
}
