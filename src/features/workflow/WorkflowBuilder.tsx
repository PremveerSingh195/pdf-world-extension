import React, { useState, useRef, useEffect } from 'react';
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
      defaultConfig: { text: 'CONFIDENTIAL', opacity: '0.25', rotation: '45', color: '#ef4444', fontSize: '48', repeat: 'false', repeatSpacing: '150', position: 'center', fontFamily: 'helvetica-bold' },
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToWorkflowBottom = (immediate = false) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    const performScroll = () => {
      // 1. Try to target the ready download card first
      const readyCard = document.getElementById('workflow-ready-download');
      if (readyCard) {
        readyCard.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'center' });
        return;
      }

      // 2. Try progress view
      const progressCard = document.getElementById('workflow-progress');
      if (progressCard) {
        progressCard.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'center' });
        return;
      }

      // 3. Fallback to bottomRef or main scroll
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'end' });
        return;
      }

      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({
          top: mainEl.scrollHeight,
          behavior: immediate ? 'auto' : 'smooth',
        });
      }
    };

    if (immediate) {
      performScroll();
    } else {
      scrollTimeoutRef.current = setTimeout(performScroll, 80);
    }
  };

  useEffect(() => {
    if (processing) {
      scrollToWorkflowBottom(false);
    }
  }, [processing]);

  useEffect(() => {
    if (resultBytes && !processing) {
      scrollToWorkflowBottom(false);
      // Failsafe: if smooth scroll was interrupted, ensure it centers in viewport
      const timer = setTimeout(() => {
        const readyCard = document.getElementById('workflow-ready-download');
        if (readyCard) {
          readyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [resultBytes, processing]);

  useEffect(() => {
    if (error) {
      scrollToWorkflowBottom(false);
    }
  }, [error]);

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
    setResultBytes(null);
    setProcessing(true);
    setProgress(0);
    // Smoothly scroll down immediately so user sees pipeline start
    scrollToWorkflowBottom(false);

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

  const handleLoadSamplePdf = async () => {
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await doc.embedFont(StandardFonts.Helvetica);
      const page = doc.addPage([600, 400]);
      page.drawText('Workflow Test Document', {
        x: 50,
        y: 340,
        size: 20,
        font,
        color: rgb(0.1, 0.2, 0.4),
      });
      page.drawText('This sample PDF is ready to be processed by your workflow pipeline.', {
        x: 50,
        y: 300,
        size: 12,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText('Click "Run Workflow Pipeline" below to test the automated flow.', {
        x: 50,
        y: 275,
        size: 11,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      const pdfBytes = await doc.save();
      const file = new File([pdfBytes as any], 'Sample_Workflow_Document.pdf', { type: 'application/pdf' });
      setPdfFile(file);
      setError(null);
    } catch (e: any) {
      setError('Could not generate sample PDF: ' + e?.message);
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] flex items-center justify-center font-mono">
              1
            </span>
            Select Source PDF Document
          </h3>
          {!pdfFile && (
            <button
              type="button"
              onClick={handleLoadSamplePdf}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold cursor-pointer"
            >
              Use Sample PDF
            </button>
          )}
        </div>

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
                className={`relative p-4 rounded-xl border transition-all ${node.enabled
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
                            Watermark Text
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
                            Font Size ({node.config.fontSize || 48}px)
                          </label>
                          <input
                            type="range"
                            min="12"
                            max="120"
                            step="4"
                            value={node.config.fontSize || 48}
                            onChange={(e) => updateConfig(node.id, 'fontSize', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={node.config.color || '#ef4444'}
                              onChange={(e) => updateConfig(node.id, 'color', e.target.value)}
                              className="w-8 h-8 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={node.config.color || '#ef4444'}
                              onChange={(e) => updateConfig(node.id, 'color', e.target.value)}
                              className="flex-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Opacity ({node.config.opacity})
                          </label>
                          <input
                            type="range"
                            min="0.05"
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
                            max="360"
                            step="15"
                            value={node.config.rotation || 45}
                            onChange={(e) => updateConfig(node.id, 'rotation', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Font
                          </label>
                          <select
                            value={node.config.fontFamily || 'helvetica-bold'}
                            onChange={(e) => updateConfig(node.id, 'fontFamily', e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                          >
                            <option value="helvetica-bold">Helvetica Bold</option>
                            <option value="helvetica">Helvetica</option>
                            <option value="courier">Courier</option>
                            <option value="times-roman">Times Roman</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Position
                          </label>
                          <select
                            value={node.config.position || 'center'}
                            onChange={(e) => updateConfig(node.id, 'position', e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                          >
                            <option value="center">Center</option>
                            <option value="top-left">Top Left</option>
                            <option value="top-center">Top Center</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-center">Bottom Center</option>
                            <option value="bottom-right">Bottom Right</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Repeat / Tile
                          </label>
                          <select
                            value={node.config.repeat || 'false'}
                            onChange={(e) => updateConfig(node.id, 'repeat', e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                          >
                            <option value="false">Single Watermark</option>
                            <option value="true">Repeat Across Page</option>
                          </select>
                        </div>
                        {(node.config.repeat === 'true' || node.config.repeat === true) && (
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                              Tile Spacing ({node.config.repeatSpacing || 150}px)
                            </label>
                            <input
                              type="range"
                              min="50"
                              max="400"
                              step="25"
                              value={node.config.repeatSpacing || 150}
                              onChange={(e) => updateConfig(node.id, 'repeatSpacing', e.target.value)}
                              className="w-full"
                            />
                          </div>
                        )}
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {resultBytes && !processing ? (
          <div className="flex items-center gap-2 p-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Workflow Complete! PDF Ready to Download Below</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3 justify-end">
          {resultBytes && !processing && (
            <Button
              size="lg"
              variant="outline"
              className="border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              icon={<ArrowDown className="w-4 h-4" />}
              onClick={() => {
                const el = document.getElementById('workflow-ready-download');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              Ready to Download ↓
            </Button>
          )}

          <Button
            size="lg"
            variant="primary"
            icon={<Play className="w-4 h-4 fill-white" />}
            loading={processing}
            disabled={!pdfFile || nodes.filter((n) => n.enabled).length === 0}
            onClick={handleRunWorkflow}
          >
            {resultBytes ? 'Re-run Workflow Pipeline' : 'Run Workflow Pipeline'}
          </Button>
        </div>
      </div>

      {/* Progress View */}
      {processing && (
        <div id="workflow-progress">
          <ProcessingProgress progress={progress} statusText={statusText} />
        </div>
      )}

      {/* Error View */}
      {error && (
        <div id="workflow-error">
          <ErrorState message={error} onRetry={handleRunWorkflow} />
        </div>
      )}

      {/* Success & Download */}
      {resultBytes && !processing && (
        <div id="workflow-ready-download" className="animate-fade-in">
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
        </div>
      )}

      {/* Bottom scroll anchor */}
      <div ref={bottomRef} className="h-6" />
    </div>
  );
};
