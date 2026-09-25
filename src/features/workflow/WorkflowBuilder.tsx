import React, { useState } from 'react';
import { WorkflowNode, WorkflowOperationType, WorkflowPreset } from '@/types/workflow';
import { workflowService } from '@/services/workflow/workflowService';
import { downloadService } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import {
  Plus,
  Trash2,
  Play,
  RotateCw,
  Stamp,
  Binary,
  Minimize2,
  FileCheck,
  Crop,
  ArrowUp,
  ArrowDown,
  BookmarkPlus,
  Save,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useChromeStorage } from '@/hooks/useChromeStorage';

const AVAILABLE_OPERATIONS: Array<{
  type: WorkflowOperationType;
  title: string;
  desc: string;
  defaultConfig: Record<string, any>;
  icon: any;
}> = [
  {
    type: 'watermark',
    title: 'Add Watermark',
    desc: 'Apply custom text watermark with angle & opacity',
    defaultConfig: { text: 'CONFIDENTIAL', opacity: '0.25', rotation: '45', color: '#ef4444', fontSize: '48' },
    icon: Stamp,
  },
  {
    type: 'pageNumbers',
    title: 'Add Page Numbers',
    desc: 'Position numbers at bottom or top',
    defaultConfig: { position: 'bottom-right', format: 'page_n_of_total', fontSize: '10' },
    icon: Binary,
  },
  {
    type: 'rotate',
    title: 'Rotate Pages',
    desc: 'Rotate clockwise by 90°, 180°, or 270°',
    defaultConfig: { degrees: '90', pages: '' },
    icon: RotateCw,
  },
  {
    type: 'compress',
    title: 'Compress PDF',
    desc: 'Optimize file size with stream compression',
    defaultConfig: { level: 'medium' },
    icon: Minimize2,
  },
  {
    type: 'removePages',
    title: 'Remove Pages',
    desc: 'Strip specific page numbers or ranges (e.g. 1, 3-5)',
    defaultConfig: { pages: '1' },
    icon: Trash2,
  },
  {
    type: 'flatten',
    title: 'Flatten Annotations',
    desc: 'Bake form fields and layers into fixed page content',
    defaultConfig: {},
    icon: FileCheck,
  },
  {
    type: 'crop',
    title: 'Trim Margins',
    desc: 'Crop outer borders from all pages',
    defaultConfig: { margin: '20' },
    icon: Crop,
  },
  {
    type: 'metadata',
    title: 'Update Metadata',
    desc: 'Clean and set Title & Author tags',
    defaultConfig: { title: 'Optimized Document', author: 'PDF Toolbox' },
    icon: Info,
  },
];

export const WorkflowBuilder: React.FC = () => {
  const { storage, saveWorkflow } = useChromeStorage();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'node-wm',
      type: 'watermark',
      title: 'Add Watermark',
      description: 'Stamp CONFIDENTIAL watermark across all pages',
      config: { text: 'CONFIDENTIAL', opacity: '0.25', rotation: '45', color: '#ef4444' },
      enabled: true,
    },
    {
      id: 'node-pn',
      type: 'pageNumbers',
      title: 'Add Page Numbers',
      description: 'Bottom right page numbers',
      config: { position: 'bottom-right', format: 'page_n_of_total', fontSize: '10' },
      enabled: true,
    },
    {
      id: 'node-cp',
      type: 'compress',
      title: 'Compress Document',
      description: 'Optimize PDF file size',
      config: { level: 'medium' },
      enabled: true,
    },
  ]);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Custom Workflow');

  // Filter out operations that are already in use in the pipeline
  const usedOperationTypes = new Set(nodes.map((n) => n.type));
  const availableUnusedOperations = AVAILABLE_OPERATIONS.filter(
    (op) => !usedOperationTypes.has(op.type)
  );

  const addNode = (opType: WorkflowOperationType) => {
    if (nodes.some((n) => n.type === opType)) return;
    const template = AVAILABLE_OPERATIONS.find((o) => o.type === opType);
    if (!template) return;

    const newNode: WorkflowNode = {
      id: 'node-' + Math.random().toString(36).substring(2, 9),
      type: opType,
      title: template.title,
      description: template.desc,
      config: { ...template.defaultConfig },
      enabled: true,
    };
    setNodes([...nodes, newNode]);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) return;
    const copy = [...nodes];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setNodes(copy);
  };

  const updateConfig = (nodeId: string, key: string, value: any) => {
    setNodes(
      nodes.map((n) => (n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n))
    );
  };

  const toggleNode = (id: string) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)));
  };

  const handleRunWorkflow = async () => {
    if (!pdfFile) {
      setError('Please select a PDF file to run the workflow on.');
      return;
    }
    setError(null);
    setProcessing(true);
    setProgress(0);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const outputBytes = await workflowService.executeWorkflow(
        buffer,
        nodes,
        (pct, text) => {
          setProgress(pct);
          setStatusText(text);
        }
      );
      setResultBytes(outputBytes);
    } catch (err: any) {
      setError(err?.message || 'Workflow execution failed. Check node configurations.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePreset = async () => {
    const preset: WorkflowPreset = {
      id: 'preset-' + Math.random().toString(36).substring(2, 9),
      name: workflowName || 'Untitled Workflow',
      description: `${nodes.length} chained operations`,
      nodes: [...nodes],
      createdAt: Date.now(),
    };
    await saveWorkflow(preset);
    alert('Workflow preset saved successfully to extension storage!');
  };

  const loadPreset = (preset: WorkflowPreset) => {
    setNodes([...preset.nodes]);
    setWorkflowName(preset.name);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100">
            PDF Workflow Builder
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build and automate custom multi-step PDF pipelines in a single visual pass.
          </p>
        </div>

        {/* Preset Selector */}
        {storage?.savedWorkflows && storage.savedWorkflows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Presets:</span>
            <select
              onChange={(e) => {
                const found = storage.savedWorkflows.find((w) => w.id === e.target.value);
                if (found) loadPreset(found);
              }}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-700 dark:text-slate-300"
            >
              <option value="">Load saved preset...</option>
              {storage.savedWorkflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Step 1: Input Document */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] flex items-center justify-center font-mono">
            1
          </span>
          Select Source PDF Document
        </h3>

        {!pdfFile ? (
          <FileDropzone
            onFilesSelected={(files) => setPdfFile(files[0])}
            title="Drop PDF to automate"
            subtitle="or browse file"
          />
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {pdfFile.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPdfFile(null)}>
              Change
            </Button>
          </div>
        )}
      </div>

      {/* Step 2: Visual Workflow Pipeline */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] flex items-center justify-center font-mono">
              2
            </span>
            Pipeline Steps ({nodes.filter((n) => n.enabled).length} Active)
          </h3>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 w-44"
              placeholder="Preset name"
            />
            <Button
              size="sm"
              variant="outline"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSavePreset}
            >
              Save Preset
            </Button>
          </div>
        </div>

        {/* Nodes chain */}
        <div className="space-y-3 relative">
          {nodes.map((node, index) => {
            const OpDef = AVAILABLE_OPERATIONS.find((o) => o.type === node.type);
            const Icon = OpDef?.icon || Play;

            return (
              <div
                key={node.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  node.enabled
                    ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100/50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={node.enabled}
                      onChange={() => toggleNode(node.id)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {node.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {node.description}
                      </p>
                    </div>
                  </div>

                  {/* Node controls */}
                  <div className="flex items-center gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => moveNode(index, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === nodes.length - 1}
                      onClick={() => moveNode(index, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeNode(node.id)}
                      className="p-1 text-slate-400 hover:text-red-600 ml-1"
                      title="Remove Node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Node configuration inputs */}
                {node.enabled && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {node.type === 'watermark' && (
                      <>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Text
                          </label>
                          <input
                            type="text"
                            value={node.config.text || ''}
                            onChange={(e) => updateConfig(node.id, 'text', e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Opacity ({node.config.opacity})
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.05"
                            value={node.config.opacity || 0.3}
                            onChange={(e) => updateConfig(node.id, 'opacity', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Rotation ({node.config.rotation}°)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="90"
                            step="15"
                            value={node.config.rotation || 45}
                            onChange={(e) => updateConfig(node.id, 'rotation', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}

                    {node.type === 'pageNumbers' && (
                      <>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Position
                          </label>
                          <select
                            value={node.config.position || 'bottom-right'}
                            onChange={(e) => updateConfig(node.id, 'position', e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                          >
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-center">Bottom Center</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="top-center">Top Center</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Format
                          </label>
                          <select
                            value={node.config.format || 'page_n_of_total'}
                            onChange={(e) => updateConfig(node.id, 'format', e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                          >
                            <option value="page_n_of_total">Page 1 of 10</option>
                            <option value="page_n">Page 1</option>
                            <option value="n">1</option>
                          </select>
                        </div>
                      </>
                    )}

                    {node.type === 'compress' && (
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Compression Level
                        </label>
                        <select
                          value={node.config.level || 'medium'}
                          onChange={(e) => updateConfig(node.id, 'level', e.target.value)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                        >
                          <option value="low">Low (Fast stream Deflate)</option>
                          <option value="medium">Medium (Standard optimization)</option>
                          <option value="high">High (Maximum size reduction)</option>
                        </select>
                      </div>
                    )}

                    {node.type === 'rotate' && (
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Degrees
                        </label>
                        <select
                          value={node.config.degrees || '90'}
                          onChange={(e) => updateConfig(node.id, 'degrees', e.target.value)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                        >
                          <option value="90">90° Clockwise</option>
                          <option value="180">180° Flip</option>
                          <option value="270">270° Counter-Clockwise</option>
                        </select>
                      </div>
                    )}

                    {node.type === 'removePages' && (
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Pages to Remove (e.g. 1, 3-5)
                        </label>
                        <input
                          type="text"
                          value={node.config.pages || ''}
                          onChange={(e) => updateConfig(node.id, 'pages', e.target.value)}
                          placeholder="e.g. 1, 4-6"
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add node dropdown */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            + Add Operation to Workflow:
          </label>
          {availableUnusedOperations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableUnusedOperations.map((op) => (
                <button
                  key={op.type}
                  type="button"
                  onClick={() => addNode(op.type)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {op.title}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>All available operations have been added to this workflow.</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          size="lg"
          variant="primary"
          icon={<Play className="w-4 h-4 fill-white" />}
          loading={processing}
          disabled={!pdfFile || nodes.filter((n) => n.enabled).length === 0}
          onClick={handleRunWorkflow}
        >
          Run Workflow Pipeline
        </Button>
      </div>

      {/* Progress View */}
      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}

      {/* Error View */}
      {error && <ErrorState message={error} onRetry={handleRunWorkflow} />}

      {/* Success & Download */}
      {resultBytes && !processing && (
        <DownloadButton
          filename={`Workflow_${pdfFile?.name || 'Output.pdf'}`}
          fileSize={resultBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([resultBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Workflow_${pdfFile?.name || 'Output.pdf'}`);
          }}
          onReset={() => {
            setResultBytes(null);
            setProgress(0);
          }}
        />
      )}
    </div>
  );
};
