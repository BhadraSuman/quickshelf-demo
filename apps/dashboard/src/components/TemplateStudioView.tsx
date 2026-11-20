import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Type,
  DollarSign,
  Tag as TagIcon,
  Minus,
  Barcode as BarcodeIcon,
  Trash2,
  Plus,
  RotateCcw,
  Save,
  Check,
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Info,
  Copy,
  Download,
  FileCode,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

// ==========================================
// 1. Highlight Hardware Models & Specifications
// ==========================================
export interface HardwareModelPreset {
  id: string;
  name: string;
  screenSize: string;
  width: number;
  height: number;
  dpi: number;
  colors: string[]; // ['black', 'white', 'red', 'yellow']
  description: string;
}

export const HIGHLIGHT_MODELS: HardwareModelPreset[] = [
  {
    id: 'HS290-M',
    name: 'HS290-M (Standard Shelf)',
    screenSize: '2.90"',
    width: 296,
    height: 128,
    dpi: 112,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Most popular grocery & supermarket shelf tag',
  },
  {
    id: 'HS750-M',
    name: 'HS750-M (Flagship End-Cap)',
    screenSize: '7.50"',
    width: 800,
    height: 480,
    dpi: 124,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Large display for electronics, produce & promo end-caps',
  },
  {
    id: 'HS213-M',
    name: 'HS213-M (Compact)',
    screenSize: '2.13"',
    width: 250,
    height: 122,
    dpi: 130,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Compact shelf tag for cosmetics and narrow facings',
  },
  {
    id: 'HS420-M',
    name: 'HS420-M (Bakery & Produce)',
    screenSize: '4.20"',
    width: 400,
    height: 300,
    dpi: 119,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Square aspect ratio for fruit bins, deli and bakery',
  },
  {
    id: 'HS154-M',
    name: 'HS154-M (Mini)',
    screenSize: '1.54"',
    width: 200,
    height: 200,
    dpi: 188,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Mini square tag for peg hooks & jewelry',
  },
];

// The 4 authentic Highlight E-Paper hardware colors
export const EPAPER_COLORS = [
  { id: 'black', hex: '#000000', label: 'Black', textClass: 'text-black' },
  { id: 'white', hex: '#ffffff', label: 'White', textClass: 'text-white' },
  { id: 'red', hex: '#dc2626', label: 'E-Paper Red', textClass: 'text-red' },
  { id: 'yellow', hex: '#eab308', label: 'E-Paper Yellow', textClass: 'text-yellow' },
];

// ==========================================
// 2. Template Element Types
// ==========================================
export type ElementType = 'text' | 'price' | 'badge' | 'divider' | 'barcode';

export interface TemplateElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  fieldBinding?: 'none' | 'name' | 'code' | 'price' | 'mrp' | 'promo' | 'category';
  color: string; // one of 4 e-paper colors
  backgroundColor?: string; // for badges or backgrounds
  fontSize?: number;
  fontWeight?: 400 | 600 | 700 | 800 | 900;
  textAlign?: 'left' | 'center' | 'right';
  strikeThrough?: boolean;
}

export interface EslTemplate {
  id: string;
  name: string;
  modelId: string;
  backgroundColor: string; // '#ffffff' or '#000000'
  elements: TemplateElement[];
  updatedAt: string;
}

// Built-in starter templates for immediate out-of-the-box utility
const DEFAULT_TEMPLATES: EslTemplate[] = [
  {
    id: 'tpl-grocery-290',
    name: 'Standard Grocery (2.9" HS290-M)',
    modelId: 'HS290-M',
    backgroundColor: '#ffffff',
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: 'el-1',
        type: 'text',
        x: 12,
        y: 12,
        content: 'ORGANIC ARABICA COFFEE 500G',
        fieldBinding: 'name',
        color: '#000000',
        fontSize: 12,
        fontWeight: 800,
        textAlign: 'left',
      },
      {
        id: 'el-2',
        type: 'text',
        x: 12,
        y: 30,
        content: 'SKU: BEV-COF-001 • AISLE 04',
        fieldBinding: 'code',
        color: '#000000',
        fontSize: 9,
        fontWeight: 600,
        textAlign: 'left',
      },
      {
        id: 'el-3',
        type: 'divider',
        x: 12,
        y: 44,
        width: 272,
        height: 2,
        content: '',
        color: '#000000',
      },
      {
        id: 'el-4',
        type: 'price',
        x: 12,
        y: 54,
        content: '₹449.00',
        fieldBinding: 'price',
        color: '#000000',
        fontSize: 32,
        fontWeight: 900,
        textAlign: 'left',
      },
      {
        id: 'el-5',
        type: 'text',
        x: 145,
        y: 60,
        content: 'MRP ₹599.00',
        fieldBinding: 'mrp',
        color: '#000000',
        fontSize: 10,
        fontWeight: 600,
        textAlign: 'left',
        strikeThrough: true,
      },
      {
        id: 'el-6',
        type: 'badge',
        x: 145,
        y: 78,
        width: 82,
        height: 20,
        content: 'SAVE 25%',
        fieldBinding: 'promo',
        color: '#ffffff',
        backgroundColor: '#dc2626',
        fontSize: 10,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'el-7',
        type: 'barcode',
        x: 235,
        y: 52,
        width: 50,
        height: 38,
        content: '8003152970',
        fieldBinding: 'code',
        color: '#000000',
      },
      {
        id: 'el-8',
        type: 'text',
        x: 12,
        y: 110,
        content: 'Price inclusive of all taxes',
        fieldBinding: 'none',
        color: '#000000',
        fontSize: 8,
        fontWeight: 600,
        textAlign: 'left',
      },
    ],
  },
  {
    id: 'tpl-yellow-clearance-290',
    name: 'Yellow Flash Clearance (2.9" HS290-M)',
    modelId: 'HS290-M',
    backgroundColor: '#ffffff',
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: 'el-1',
        type: 'badge',
        x: 0,
        y: 0,
        width: 296,
        height: 26,
        content: '★ SPECIAL CLEARANCE OFFER ★',
        fieldBinding: 'promo',
        color: '#000000',
        backgroundColor: '#eab308',
        fontSize: 11,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'el-2',
        type: 'text',
        x: 12,
        y: 34,
        content: 'FRESH SOURDOUGH BREAD 500G',
        fieldBinding: 'name',
        color: '#000000',
        fontSize: 12,
        fontWeight: 800,
        textAlign: 'left',
      },
      {
        id: 'el-3',
        type: 'price',
        x: 12,
        y: 56,
        content: '₹149.00',
        fieldBinding: 'price',
        color: '#dc2626',
        fontSize: 34,
        fontWeight: 900,
        textAlign: 'left',
      },
      {
        id: 'el-4',
        type: 'badge',
        x: 160,
        y: 62,
        width: 120,
        height: 24,
        content: 'MUST GO TODAY',
        fieldBinding: 'none',
        color: '#ffffff',
        backgroundColor: '#dc2626',
        fontSize: 10,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'el-5',
        type: 'text',
        x: 12,
        y: 104,
        content: 'Was ₹220.00 • Save ₹71.00',
        fieldBinding: 'none',
        color: '#000000',
        fontSize: 9.5,
        fontWeight: 600,
        textAlign: 'left',
      },
    ],
  },
  {
    id: 'tpl-flagship-750',
    name: 'Flagship Showcase (7.5" HS750-M)',
    modelId: 'HS750-M',
    backgroundColor: '#ffffff',
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: 'el-1',
        type: 'badge',
        x: 24,
        y: 24,
        width: 752,
        height: 48,
        content: 'PREMIUM ELECTRONICS & APPLIANCES',
        fieldBinding: 'none',
        color: '#000000',
        backgroundColor: '#eab308',
        fontSize: 18,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'el-2',
        type: 'text',
        x: 32,
        y: 96,
        content: 'SONY WH-1000XM4 NOISE CANCELING HEADPHONES',
        fieldBinding: 'name',
        color: '#000000',
        fontSize: 22,
        fontWeight: 800,
        textAlign: 'left',
      },
      {
        id: 'el-3',
        type: 'divider',
        x: 32,
        y: 136,
        width: 736,
        height: 3,
        content: '',
        color: '#000000',
      },
      {
        id: 'el-4',
        type: 'price',
        x: 32,
        y: 160,
        content: '₹22,990.00',
        fieldBinding: 'price',
        color: '#dc2626',
        fontSize: 64,
        fontWeight: 900,
        textAlign: 'left',
      },
      {
        id: 'el-5',
        type: 'text',
        x: 32,
        y: 250,
        content: 'Original MRP: ₹29,990.00 (Inclusive of all taxes)',
        fieldBinding: 'mrp',
        color: '#000000',
        fontSize: 16,
        fontWeight: 600,
        textAlign: 'left',
        strikeThrough: true,
      },
      {
        id: 'el-6',
        type: 'badge',
        x: 520,
        y: 165,
        width: 240,
        height: 54,
        content: 'LIMITED FESTIVE DEAL',
        fieldBinding: 'promo',
        color: '#ffffff',
        backgroundColor: '#dc2626',
        fontSize: 15,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'el-7',
        type: 'barcode',
        x: 540,
        y: 240,
        width: 200,
        height: 80,
        content: '8003152970',
        fieldBinding: 'code',
        color: '#000000',
      },
    ],
  },
];

interface TemplateStudioViewProps {
  skus: Array<{
    id: string;
    code: string;
    name: string;
    priceMinor: number;
    mrpMinor: number;
    promoBadge: string | null;
  }>;
  onSaveTemplate?: (template: EslTemplate) => void;
}

export const TemplateStudioView: React.FC<TemplateStudioViewProps> = ({ skus, onSaveTemplate }) => {
  // Saved templates state
  const [templates, setTemplates] = useState<EslTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('qs_esl_templates');
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  });

  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || 'tpl-grocery-290');
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  const activeModel = HIGHLIGHT_MODELS.find((m) => m.id === activeTemplate.modelId) || HIGHLIGHT_MODELS[0];

  // Selected element for editing
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const selectedElement = activeTemplate.elements.find((el) => el.id === selectedElementId) || null;

  // Zoom & view scale
  const [zoomLevel, setZoomLevel] = useState<number>(() => (activeModel.width > 500 ? 1 : 1.75));

  // Preview simulator product
  const [previewSkuId, setPreviewSkuId] = useState<string>(skus[0]?.id || 'mock');
  const previewSku = skus.find((s) => s.id === previewSkuId) || {
    id: 'mock',
    code: 'BEV-COF-001',
    name: 'Organic Colombian Dark Roast 500g',
    priceMinor: 44900,
    mrpMinor: 59900,
    promoBadge: 'SAVE 25%',
  };

  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Dragging state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update an element in the current template
  const updateElement = (id: string, patch: Partial<TemplateElement>) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== activeTemplate.id) return t;
        return {
          ...t,
          elements: t.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Delete an element
  const deleteElement = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== activeTemplate.id) return t;
        return {
          ...t,
          elements: t.elements.filter((el) => el.id !== id),
          updatedAt: new Date().toISOString(),
        };
      })
    );
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Add a new element
  const addElement = (type: ElementType) => {
    const newId = `el-${Date.now()}`;
    let newElement: TemplateElement;

    switch (type) {
      case 'text':
        newElement = {
          id: newId,
          type: 'text',
          x: 20,
          y: 20,
          content: 'New Text Field',
          fieldBinding: 'name',
          color: '#000000',
          fontSize: 12,
          fontWeight: 700,
          textAlign: 'left',
        };
        break;
      case 'price':
        newElement = {
          id: newId,
          type: 'price',
          x: 20,
          y: 50,
          content: '₹199.00',
          fieldBinding: 'price',
          color: '#000000',
          fontSize: 28,
          fontWeight: 900,
          textAlign: 'left',
        };
        break;
      case 'badge':
        newElement = {
          id: newId,
          type: 'badge',
          x: 20,
          y: 80,
          width: 90,
          height: 22,
          content: 'SPECIAL OFFER',
          fieldBinding: 'promo',
          color: '#ffffff',
          backgroundColor: '#dc2626',
          fontSize: 10,
          fontWeight: 800,
          textAlign: 'center',
        };
        break;
      case 'divider':
        newElement = {
          id: newId,
          type: 'divider',
          x: 20,
          y: 40,
          width: activeModel.width - 40,
          height: 2,
          content: '',
          color: '#000000',
        };
        break;
      case 'barcode':
        newElement = {
          id: newId,
          type: 'barcode',
          x: 20,
          y: 80,
          width: 70,
          height: 35,
          content: '8003152970',
          fieldBinding: 'code',
          color: '#000000',
        };
        break;
    }

    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== activeTemplate.id) return t;
        return {
          ...t,
          elements: [...t.elements, newElement],
          updatedAt: new Date().toISOString(),
        };
      })
    );
    setSelectedElementId(newId);
  };

  // Change active hardware model
  const handleModelChange = (modelId: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== activeTemplate.id) return t;
        return {
          ...t,
          modelId,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Save templates to LocalStorage
  const handleSave = () => {
    try {
      localStorage.setItem('qs_esl_templates', JSON.stringify(templates));
      setIsSavedRecently(true);
      if (onSaveTemplate) onSaveTemplate(activeTemplate);
      setTimeout(() => setIsSavedRecently(false), 2000);
    } catch (e) {
      console.error('Failed to save templates', e);
    }
  };

  // Reset to default factory templates
  const handleResetDefaults = () => {
    if (confirm('Reset to factory Highlight e-paper templates? Custom edits will be restored.')) {
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem('qs_esl_templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  };

  // Create brand new template
  const handleCreateNewTemplate = () => {
    const newName = prompt('Enter template name:', 'Custom 4-Color Label');
    if (!newName || !newName.trim()) return;
    const newId = `tpl-custom-${Date.now()}`;
    const newTemplate: EslTemplate = {
      id: newId,
      name: newName.trim(),
      modelId: activeModel.id,
      backgroundColor: '#ffffff',
      updatedAt: new Date().toISOString(),
      elements: [
        {
          id: `el-${Date.now()}-1`,
          type: 'text',
          x: 12,
          y: 12,
          content: 'PRODUCT NAME',
          fieldBinding: 'name',
          color: '#000000',
          fontSize: 12,
          fontWeight: 800,
          textAlign: 'left',
        },
        {
          id: `el-${Date.now()}-2`,
          type: 'price',
          x: 12,
          y: 45,
          content: '₹199.00',
          fieldBinding: 'price',
          color: '#000000',
          fontSize: 32,
          fontWeight: 900,
          textAlign: 'left',
        },
        {
          id: `el-${Date.now()}-3`,
          type: 'badge',
          x: 140,
          y: 48,
          width: 80,
          height: 22,
          content: 'SPECIAL',
          fieldBinding: 'promo',
          color: '#ffffff',
          backgroundColor: '#dc2626',
          fontSize: 10,
          fontWeight: 800,
          textAlign: 'center',
        },
        {
          id: `el-${Date.now()}-4`,
          type: 'barcode',
          x: activeModel.width > 300 ? activeModel.width - 90 : 220,
          y: 40,
          width: 50,
          height: 35,
          content: '8003152970',
          fieldBinding: 'code',
          color: '#000000',
        },
      ],
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    setActiveTemplateId(newId);
    setSelectedElementId(null);
    localStorage.setItem('qs_esl_templates', JSON.stringify(updated));
  };

  // Duplicate current template
  const handleDuplicateTemplate = () => {
    const copyName = `${activeTemplate.name} (Copy)`;
    const newId = `tpl-copy-${Date.now()}`;
    const duplicated: EslTemplate = {
      ...activeTemplate,
      id: newId,
      name: copyName,
      elements: activeTemplate.elements.map((el, idx) => ({ ...el, id: `el-${Date.now()}-${idx}` })),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...templates, duplicated];
    setTemplates(updated);
    setActiveTemplateId(newId);
    setSelectedElementId(null);
    localStorage.setItem('qs_esl_templates', JSON.stringify(updated));
  };

  // Export SVG representation matching physical resolution
  const handleExportSVG = () => {
    const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${activeModel.width}" height="${activeModel.height}" viewBox="0 0 ${activeModel.width} ${activeModel.height}">`;
    const svgBg = `<rect width="${activeModel.width}" height="${activeModel.height}" fill="${activeTemplate.backgroundColor || '#ffffff'}"/>`;
    const svgElements = activeTemplate.elements
      .map((el) => {
        const text = getRenderedContent(el);
        if (el.type === 'divider') {
          return `<rect x="${el.x}" y="${el.y}" width="${el.width || 100}" height="${el.height || 2}" fill="${el.color}"/>`;
        }
        if (el.type === 'badge') {
          return `<g><rect x="${el.x}" y="${el.y}" width="${el.width || 80}" height="${el.height || 20}" rx="3" fill="${el.backgroundColor || '#dc2626'}"/><text x="${el.x + (el.width || 80) / 2}" y="${el.y + (el.height || 20) / 2 + 4}" fill="${el.color || '#ffffff'}" font-family="sans-serif" font-size="${el.fontSize || 10}" font-weight="${el.fontWeight || 800}" text-anchor="middle" dominant-baseline="middle">${text}</text></g>`;
        }
        if (el.type === 'barcode') {
          return `<g transform="translate(${el.x}, ${el.y})"><rect x="0" y="0" width="${el.width || 70}" height="${el.height || 30}" fill="#ffffff" fill-opacity="0.1"/><text x="${(el.width || 70) / 2}" y="${(el.height || 30) + 8}" fill="${el.color}" font-family="monospace" font-size="8" font-weight="700" text-anchor="middle">${text}</text></g>`;
        }
        return `<text x="${el.x}" y="${el.y + (el.fontSize || 14)}" fill="${el.color}" font-family="sans-serif" font-size="${el.fontSize || 14}" font-weight="${el.fontWeight || 700}" text-anchor="${el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start'}">${text}</text>`;
      })
      .join('\n');
    const fullSvg = `${svgHeader}\n${svgBg}\n${svgElements}\n</svg>`;
    const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeModel.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON definition for Highlight API / Azure middleware
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeTemplate, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `${activeTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-spec.json`;
    link.click();
  };

  // Helper to render dynamic content based on selected simulator SKU
  const getRenderedContent = (el: TemplateElement): string => {
    if (el.type === 'divider') return '';
    if (!el.fieldBinding || el.fieldBinding === 'none') return el.content;

    switch (el.fieldBinding) {
      case 'name':
        return previewSku.name || el.content;
      case 'code':
        return previewSku.code || el.content;
      case 'price':
        return `₹${(previewSku.priceMinor / 100).toFixed(2)}`;
      case 'mrp':
        return `MRP ₹${(previewSku.mrpMinor / 100).toFixed(2)}`;
      case 'promo':
        return previewSku.promoBadge || el.content || 'SPECIAL';
      default:
        return el.content;
    }
  };

  // Handle Drag Move
  const handleMouseDown = (el: TemplateElement, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    setIsDragging(true);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setDragOffset({
        x: (e.clientX - canvasRect.left) / zoomLevel - el.x,
        y: (e.clientY - canvasRect.top) / zoomLevel - el.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = Math.round((e.clientX - canvasRect.left) / zoomLevel - dragOffset.x);
    const newY = Math.round((e.clientY - canvasRect.top) / zoomLevel - dragOffset.y);

    // Keep within bounds
    const clampedX = Math.max(0, Math.min(activeModel.width - (selectedElement.width || 40), newX));
    const clampedY = Math.max(0, Math.min(activeModel.height - 15, newY));

    updateElement(selectedElement.id, { x: clampedX, y: clampedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Modern Clean Enterprise Palette
  const c = {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceSubtle: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    primary: '#2563eb',
    success: '#059669',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        backgroundColor: c.bg,
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
      onMouseUp={handleMouseUp}
    >
      {/* =========================================================================
          TOP ACTION BAR: Model Selector, Active Template, Simulator & Save
      ========================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          backgroundColor: c.surface,
          borderBottom: `1px solid ${c.border}`,
          gap: '16px',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        {/* Left: Template Selector & Model Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={18} color={c.primary} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: c.text }}>Template Studio</span>
          </div>

          <CustomSelect
            value={activeTemplateId}
            onChange={(val) => {
              setActiveTemplateId(val);
              setSelectedElementId(null);
            }}
            size="sm"
            width="240px"
            options={templates.map((t) => ({
              value: t.id,
              label: t.name,
              badge: HIGHLIGHT_MODELS.find((m) => m.id === t.modelId)?.screenSize || 'Tag',
              badgeColor: '#2563eb',
            }))}
          />

          <button
            type="button"
            onClick={handleCreateNewTemplate}
            title="Create new template"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${c.border}`,
              backgroundColor: c.surfaceSubtle,
              color: c.text,
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={13} color={c.primary} />
            <span>New</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateTemplate}
            title="Duplicate active template"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${c.border}`,
              backgroundColor: c.surfaceSubtle,
              color: c.text,
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Copy size={12} color={c.textMuted} />
            <span>Duplicate</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              fontSize: '11.5px',
              fontWeight: 600,
              color: c.primary,
            }}
          >
            <span>Model: {activeModel.name}</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span style={{ fontFamily: 'monospace' }}>{activeModel.width}×{activeModel.height}px</span>
          </div>
        </div>

        {/* Center: Live Catalog Product Simulator Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={15} color={c.textMuted} />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: c.textMuted }}>Preview with SKU:</span>
          <CustomSelect
            value={previewSkuId}
            onChange={(val) => setPreviewSkuId(val)}
            size="sm"
            width="240px"
            options={
              skus.length > 0
                ? skus.map((s) => ({
                    value: s.id,
                    label: s.name,
                    badge: `₹${(s.priceMinor / 100).toFixed(0)}`,
                    badgeColor: '#059669',
                  }))
                : [{ value: 'mock', label: 'Organic Coffee 500g', badge: '₹449', badgeColor: '#059669' }]
            }
          />
        </div>

        {/* Right: Zoom & Save Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Zoom Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: c.surfaceSubtle, borderRadius: '6px', border: `1px solid ${c.border}` }}>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
              title="Zoom Out"
              style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: c.text }}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '0 6px', color: c.textMuted, minWidth: '40px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              title="Zoom In"
              style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: c.text }}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Export SVG & JSON */}
          <button
            type="button"
            onClick={handleExportSVG}
            title="Download crisp SVG matching hardware resolution"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${c.border}`,
              backgroundColor: c.surfaceSubtle,
              color: c.text,
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Download size={13} color={c.textMuted} />
            <span>Export SVG</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            title="Export JSON spec for Highlight middleware"
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: `1px solid ${c.border}`,
              backgroundColor: c.surfaceSubtle,
              color: c.text,
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileCode size={13} color={c.textMuted} />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            title="Reset to factory templates"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${c.border}`,
              backgroundColor: 'transparent',
              color: c.textMuted,
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isSavedRecently ? c.success : c.primary,
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              transition: 'background-color 0.15s ease',
            }}
          >
            {isSavedRecently ? <Check size={14} /> : <Save size={14} />}
            <span>{isSavedRecently ? 'Saved!' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE: Toolbox (Left) | Canvas (Center) | Properties (Right)
      ========================================================================== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ==========================================
            LEFT SIDEBAR: Essential Elements Toolbox
        =========================================== */}
        <div
          style={{
            width: '210px',
            backgroundColor: c.surface,
            borderRight: `1px solid ${c.border}`,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              Add Element
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { type: 'text' as ElementType, label: 'Text Field', icon: Type, desc: 'Name, SKU, or notes' },
                { type: 'price' as ElementType, label: 'Price Block', icon: DollarSign, desc: 'Large currency & price' },
                { type: 'badge' as ElementType, label: 'Promo Badge', icon: TagIcon, desc: 'Red or Yellow highlight' },
                { type: 'divider' as ElementType, label: 'Divider Line', icon: Minus, desc: 'Horizontal rule' },
                { type: 'barcode' as ElementType, label: 'Barcode', icon: BarcodeIcon, desc: 'Dynamic shelf barcode' },
              ].map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.type}
                    type="button"
                    onClick={() => addElement(btn.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid ${c.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = c.primary;
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = c.border;
                      e.currentTarget.style.backgroundColor = c.surfaceSubtle;
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: `1px solid ${c.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: c.primary,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: c.text }}>{btn.label}</div>
                      <div style={{ fontSize: '10px', color: c.textMuted }}>{btn.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Color Hardware Palette Notice */}
          <div
            style={{
              marginTop: 'auto',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              fontSize: '11px',
              color: '#854d0e',
            }}
          >
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Info size={13} />
              <span>Highlight 4-Color E-Paper</span>
            </div>
            <span>
              Your hardware supports <strong>Black, White, Red, and Yellow</strong>. Designs strictly conform to these ink pigments.
            </span>
          </div>
        </div>

        {/* ==========================================
            CENTER: WYSIWYG E-Paper Canvas Workspace
        =========================================== */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#e2e8f0',
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: '30px',
            position: 'relative',
          }}
          onMouseMove={handleMouseMove}
          onClick={() => setSelectedElementId(null)}
        >
          {/* Hardware Screen Outer Casing */}
          <div
            style={{
              padding: '14px',
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.1)',
              display: 'inline-block',
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Screen Dimension & Model Label */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '10px', fontWeight: 700, marginBottom: '8px', padding: '0 4px', fontFamily: 'monospace' }}>
              <span>{activeModel.id} ({activeModel.screenSize})</span>
              <span>{activeModel.width} × {activeModel.height} PX • {activeModel.dpi} DPI</span>
            </div>

            {/* The Actual Physical E-Paper Display */}
            <div
              ref={canvasRef}
              style={{
                width: `${activeModel.width * zoomLevel}px`,
                height: `${activeModel.height * zoomLevel}px`,
                backgroundColor: activeTemplate.backgroundColor || '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '4px',
                cursor: isDragging ? 'grabbing' : 'default',
                userSelect: 'none',
              }}
            >
              {/* Elements rendering */}
              {activeTemplate.elements.map((el) => {
                const isSelected = el.id === selectedElementId;
                const renderedText = getRenderedContent(el);

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(el, e)}
                    style={{
                      position: 'absolute',
                      left: `${el.x * zoomLevel}px`,
                      top: `${el.y * zoomLevel}px`,
                      width: el.width ? `${el.width * zoomLevel}px` : undefined,
                      height: el.height ? `${el.height * zoomLevel}px` : undefined,
                      outline: isSelected ? '2px dashed #2563eb' : 'none',
                      outlineOffset: '2px',
                      cursor: 'grab',
                      zIndex: isSelected ? 10 : 2,
                    }}
                  >
                    {/* Element: TEXT or PRICE */}
                    {(el.type === 'text' || el.type === 'price') && (
                      <span
                        style={{
                          fontSize: `${(el.fontSize || 14) * zoomLevel}px`,
                          fontWeight: el.fontWeight || (el.type === 'price' ? 900 : 600),
                          color: el.color,
                          textAlign: el.textAlign || 'left',
                          display: 'block',
                          lineHeight: 1.1,
                          textDecoration: el.strikeThrough ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          letterSpacing: el.type === 'price' ? '-0.03em' : 'normal',
                        }}
                      >
                        {renderedText}
                      </span>
                    )}

                    {/* Element: BADGE */}
                    {el.type === 'badge' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.backgroundColor || '#dc2626',
                          color: el.color || '#ffffff',
                          fontSize: `${(el.fontSize || 10) * zoomLevel}px`,
                          fontWeight: el.fontWeight || 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '0 4px',
                          boxSizing: 'border-box',
                        }}
                      >
                        {renderedText}
                      </div>
                    )}

                    {/* Element: DIVIDER LINE */}
                    {el.type === 'divider' && (
                      <div
                        style={{
                          width: `${(el.width || 100) * zoomLevel}px`,
                          height: `${(el.height || 2) * zoomLevel}px`,
                          backgroundColor: el.color,
                        }}
                      />
                    )}

                    {/* Element: BARCODE */}
                    {el.type === 'barcode' && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <svg
                          width={`${(el.width || 70) * zoomLevel}`}
                          height={`${(el.height || 30) * zoomLevel}`}
                          viewBox="0 0 70 30"
                          fill={el.color}
                        >
                          <rect x="0" y="0" width="3" height="30" />
                          <rect x="5" y="0" width="2" height="30" />
                          <rect x="9" y="0" width="4" height="30" />
                          <rect x="15" y="0" width="1" height="30" />
                          <rect x="18" y="0" width="3" height="30" />
                          <rect x="23" y="0" width="2" height="30" />
                          <rect x="27" y="0" width="4" height="30" />
                          <rect x="33" y="0" width="2" height="30" />
                          <rect x="37" y="0" width="3" height="30" />
                          <rect x="42" y="0" width="1" height="30" />
                          <rect x="45" y="0" width="4" height="30" />
                          <rect x="51" y="0" width="2" height="30" />
                          <rect x="55" y="0" width="3" height="30" />
                          <rect x="60" y="0" width="2" height="30" />
                          <rect x="64" y="0" width="4" height="30" />
                        </svg>
                        <span style={{ fontSize: `${8 * zoomLevel}px`, fontWeight: 800, fontFamily: 'monospace', color: el.color }}>
                          {renderedText}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==========================================
            RIGHT SIDEBAR: Selected Element Properties
        =========================================== */}
        <div
          style={{
            width: '260px',
            backgroundColor: c.surface,
            borderLeft: `1px solid ${c.border}`,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Properties
            </span>
            {selectedElement && (
              <button
                type="button"
                onClick={() => deleteElement(selectedElement.id)}
                title="Delete element"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}
          </div>

          {selectedElement ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type & ID indicator */}
              <div style={{ padding: '8px 10px', backgroundColor: c.surfaceSubtle, borderRadius: '6px', fontSize: '11px', color: c.textMuted }}>
                Editing: <strong style={{ color: c.text, textTransform: 'uppercase' }}>{selectedElement.type}</strong>
              </div>

              {/* Dynamic Catalog Variable Binding */}
              {selectedElement.type !== 'divider' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                    Data Source (Dynamic Binding)
                  </label>
                  <CustomSelect
                    value={selectedElement.fieldBinding || 'none'}
                    onChange={(val) => updateElement(selectedElement.id, { fieldBinding: val as any })}
                    size="sm"
                    width="100%"
                    options={[
                      { value: 'none', label: 'Static Text (Manual)' },
                      { value: 'name', label: 'Product Name', badge: 'SKU', badgeColor: '#2563eb' },
                      { value: 'price', label: 'Selling Price (₹)', badge: 'Price', badgeColor: '#059669' },
                      { value: 'mrp', label: 'MRP (Strikethrough)', badge: 'MRP', badgeColor: '#dc2626' },
                      { value: 'promo', label: 'Promo Badge / Discount', badge: 'Promo', badgeColor: '#eab308' },
                      { value: 'code', label: 'Barcode / SKU Code', badge: 'Code', badgeColor: '#64748b' },
                    ]}
                  />
                </div>
              )}

              {/* Static Content Override */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                  {selectedElement.fieldBinding && selectedElement.fieldBinding !== 'none' ? 'Fallback Text' : 'Text Content'}
                </label>
                <input
                  type="text"
                  value={selectedElement.content}
                  onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${c.border}`,
                    fontSize: '12px',
                    color: c.text,
                    backgroundColor: c.surfaceSubtle,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 4 E-Paper Colors Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                  E-Paper Color (Ink)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {EPAPER_COLORS.map((col) => {
                    const isColSelected = selectedElement.color === col.hex;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { color: col.hex })}
                        title={col.label}
                        style={{
                          height: '32px',
                          backgroundColor: col.hex,
                          border: isColSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isColSelected ? '0 0 0 2px rgba(37, 99, 235, 0.3)' : 'none',
                        }}
                      >
                        {isColSelected && (
                          <Check size={14} color={col.hex === '#ffffff' || col.hex === '#eab308' ? '#000000' : '#ffffff'} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Badge Background Color (If Badge type) */}
              {selectedElement.type === 'badge' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                    Badge Background Color
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {EPAPER_COLORS.map((col) => {
                      const isBgSelected = selectedElement.backgroundColor === col.hex;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { backgroundColor: col.hex })}
                          title={col.label}
                          style={{
                            height: '32px',
                            backgroundColor: col.hex,
                            border: isBgSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isBgSelected ? '0 0 0 2px rgba(37, 99, 235, 0.3)' : 'none',
                          }}
                        >
                          {isBgSelected && (
                            <Check size={14} color={col.hex === '#ffffff' || col.hex === '#eab308' ? '#000000' : '#ffffff'} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Font Size (For Text / Price / Badge) */}
              {selectedElement.fontSize !== undefined && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: c.text }}>Font Size</label>
                    <span style={{ fontSize: '11px', color: c.textMuted, fontWeight: 700 }}>{selectedElement.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="72"
                    step="1"
                    value={selectedElement.fontSize}
                    onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              )}

              {/* Position Coordinates (X, Y) */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                  Position on Hardware (px)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: c.textMuted, fontWeight: 700 }}>X (Left):</span>
                    <input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${c.border}`,
                        fontSize: '12px',
                        backgroundColor: c.surfaceSubtle,
                      }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: c.textMuted, fontWeight: 700 }}>Y (Top):</span>
                    <input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${c.border}`,
                        fontSize: '12px',
                        backgroundColor: c.surfaceSubtle,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions (For Badge or Divider) */}
              {(selectedElement.width !== undefined || selectedElement.type === 'divider') && (
                <div>
                  <span style={{ fontSize: '10px', color: c.textMuted, fontWeight: 700 }}>Width (px):</span>
                  <input
                    type="number"
                    value={selectedElement.width || 100}
                    onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${c.border}`,
                      fontSize: '12px',
                      backgroundColor: c.surfaceSubtle,
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 8px', color: c.textMuted }}>
              <Layers size={28} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: c.text }}>No Element Selected</div>
              <p style={{ fontSize: '11px', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Click on any text, price or badge on the e-paper screen to adjust its color, size, and product binding.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
