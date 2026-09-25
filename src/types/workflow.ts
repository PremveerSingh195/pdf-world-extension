/**
 * PDF Workflow Automation Types
 */

export type WorkflowOperationType =
  | 'removePages'
  | 'rotate'
  | 'flip'
  | 'watermark'
  | 'pageNumbers'
  | 'batesNumbering'
  | 'compress'
  | 'flatten'
  | 'crop'
  | 'invert'
  | 'metadata';

export interface WorkflowNode {
  id: string;
  type: WorkflowOperationType;
  title: string;
  description: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  createdAt: number;
}
