import React, { useState, useRef } from 'react';
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
  Info,
  Copy,
  Download,
  FileCode,
  ArrowLeft,
  Edit3,
  Image as ImageIcon,
  Search,
  Filter,
  X,
  Upload,
  Snowflake,
  RotateCw,
  Crop,
  Maximize2,
  Move,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

// ==========================================
// 1. Highlight Hardware Models & Specifications (2, 3, 4 Color & Freezer)
// ==========================================
export type ColorCapability = 2 | 3 | 4;
export type OrientationType = 'horizontal' | 'vertical';

export interface HardwareModelPreset {
  id: string;
  name: string;
  screenSize: string;
  width: number;
  height: number;
  dpi: number;
  colorCapability: ColorCapability; // 2: B/W, 3: B/W/R, 4: B/W/R/Y
  colors: string[];
  isFreezer?: boolean;
  description: string;
}

export const HIGHLIGHT_MODELS: HardwareModelPreset[] = [
  // 4-Color Multi-Ink Models (Black, White, Red, Yellow)
  {
    id: 'HS290-M',
    name: 'HS290-M (2.90" 4-Color)',
    screenSize: '2.90"',
    width: 296,
    height: 128,
    dpi: 112,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Most popular grocery & supermarket shelf tag',
  },
  {
    id: 'HS213-M',
    name: 'HS213-M (2.13" 4-Color)',
    screenSize: '2.13"',
    width: 250,
    height: 122,
    dpi: 130,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Compact tag for cosmetics, wine bottles & narrow facings',
  },
  {
    id: 'HS266-M',
    name: 'HS266-M (2.66" 4-Color)',
    screenSize: '2.66"',
    width: 296,
    height: 152,
    dpi: 125,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Medium shelf tag for pharmacy, health & beauty',
  },
  {
    id: 'HS420-M',
    name: 'HS420-M (4.20" 4-Color)',
    screenSize: '4.20"',
    width: 400,
    height: 300,
    dpi: 119,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Square aspect ratio for produce bins, deli & bakery',
  },
  {
    id: 'HS750-M',
    name: 'HS750-M (7.50" 4-Color)',
    screenSize: '7.50"',
    width: 800,
    height: 480,
    dpi: 124,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Flagship promotional end-caps and electronics display',
  },
  {
    id: 'HS154-M',
    name: 'HS154-M (1.54" 4-Color Mini)',
    screenSize: '1.54"',
    width: 200,
    height: 200,
    dpi: 188,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Mini square tag for peg-hooks & jewelry',
  },
  {
    id: 'HS350-M',
    name: 'HS350-M (3.50" 4-Color)',
    screenSize: '3.50"',
    width: 384,
    height: 184,
    dpi: 122,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Wide format tag for liquor, wine and health',
  },
  {
    id: 'HS580-M',
    name: 'HS580-M (5.80" 4-Color)',
    screenSize: '5.80"',
    width: 648,
    height: 480,
    dpi: 138,
    colorCapability: 4,
    colors: ['#000000', '#ffffff', '#dc2626', '#eab308'],
    description: 'Large shelf display for home goods & appliances',
  },

  // 3-Color Standard Models (Black, White, Red)
  {
    id: 'HS290',
    name: 'HS290 (2.90" 3-Color)',
    screenSize: '2.90"',
    width: 296,
    height: 128,
    dpi: 112,
    colorCapability: 3,
    colors: ['#000000', '#ffffff', '#dc2626'],
    description: 'Standard 3-color shelf tag (Black, White, Red)',
  },
  {
    id: 'HS213',
    name: 'HS213 (2.13" 3-Color)',
    screenSize: '2.13"',
    width: 250,
    height: 122,
    dpi: 130,
    colorCapability: 3,
    colors: ['#000000', '#ffffff', '#dc2626'],
    description: 'Compact 3-color shelf tag for narrow facings',
  },
  {
    id: 'HS266',
    name: 'HS266 (2.66" 3-Color)',
    screenSize: '2.66"',
    width: 296,
    height: 152,
    dpi: 125,
    colorCapability: 3,
    colors: ['#000000', '#ffffff', '#dc2626'],
    description: 'Medium 3-color shelf tag for general retail',
  },
  {
    id: 'HS420',
    name: 'HS420 (4.20" 3-Color)',
    screenSize: '4.20"',
    width: 400,
    height: 300,
    dpi: 119,
    colorCapability: 3,
    colors: ['#000000', '#ffffff', '#dc2626'],
    description: 'Square 3-color tag for produce & bakery',
  },
  {
    id: 'HS750',
    name: 'HS750 (7.50" 3-Color)',
    screenSize: '7.50"',
    width: 800,
    height: 480,
    dpi: 124,
    colorCapability: 3,
    colors: ['#000000', '#ffffff', '#dc2626'],
    description: 'Large 3-color tag for end-caps and promotions',
  },
  {
    id: 'HS154',
    name: 'HS154 (1.54" 3-Color)',
    screenSize: '1.54"',
    width: 200,
    height: 200,
    dpi: 188,
    colorCapability: 3,
    colors: ['#000000', '#ffffff', '#dc2626'],
    description: 'Mini 3-color tag for peg-hooks and accessories',
  },

  // 2-Color Low-Temperature Freezer Models (Black & White, -25°C)
  {
    id: 'HS213F',
    name: 'HS213F (2.13" Freezer)',
    screenSize: '2.13"',
    width: 212,
    height: 104,
    dpi: 110,
    colorCapability: 2,
    colors: ['#000000', '#ffffff'],
    isFreezer: true,
    description: 'Low-temperature deep freezer & cold storage tag (-25°C)',
  },
  {
    id: 'HS266F',
    name: 'HS266F (2.66" Freezer)',
    screenSize: '2.66"',
    width: 296,
    height: 152,
    dpi: 125,
    colorCapability: 2,
    colors: ['#000000', '#ffffff'],
    isFreezer: true,
    description: 'Low-temperature frozen meat & ice cream display tag (-25°C)',
  },
];

// All Highlight E-Paper hardware ink colors with required capability levels
export const ALL_EPAPER_COLORS = [
  { id: 'black', hex: '#000000', label: 'Black', requiredCap: 2 },
  { id: 'white', hex: '#ffffff', label: 'White', requiredCap: 2 },
  { id: 'red', hex: '#dc2626', label: 'E-Paper Red', requiredCap: 3 },
  { id: 'yellow', hex: '#eab308', label: 'E-Paper Yellow', requiredCap: 4 },
];

// Helper: Calculate effective dimensions accounting for Horizontal vs Vertical orientation
export function getModelDimensions(model: HardwareModelPreset, orientation: OrientationType = 'horizontal'): { width: number; height: number } {
  if (orientation === 'vertical') {
    return {
      width: Math.min(model.width, model.height),
      height: Math.max(model.width, model.height),
    };
  }
  return {
    width: Math.max(model.width, model.height),
    height: Math.min(model.width, model.height),
  };
}

// ==========================================
// 2. Template Element Types
// ==========================================
export type ElementType = 'text' | 'price' | 'badge' | 'divider' | 'barcode' | 'image';

export interface TemplateElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string; // text string, or base64 image data url
  fieldBinding?: 'none' | 'name' | 'code' | 'price' | 'mrp' | 'promo' | 'category';
  color: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: 400 | 600 | 700 | 800 | 900;
  textAlign?: 'left' | 'center' | 'right';
  strikeThrough?: boolean;
  imageTone?: 'original' | 'black' | 'red' | 'yellow';
  objectFit?: 'contain' | 'cover' | 'fill';
}

export interface EslTemplate {
  id: string;
  name: string;
  modelId: string;
  orientation: OrientationType; // 'horizontal' | 'vertical'
  backgroundColor: string; // '#ffffff' or '#000000'
  elements: TemplateElement[];
  updatedAt: string;
}

// Built-in starter templates representing 2, 3, 4 color, freezer & vertical tags
const DEFAULT_TEMPLATES: EslTemplate[] = [
  {
    id: 'tpl-grocery-290',
    name: 'Standard Grocery (2.9" HS290-M)',
    modelId: 'HS290-M',
    orientation: 'horizontal',
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
    id: 'tpl-vertical-wine-213',
    name: 'Vertical Wine & Bottle (2.13" HS213-M)',
    modelId: 'HS213-M',
    orientation: 'vertical',
    backgroundColor: '#ffffff',
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: 'v-1',
        type: 'badge',
        x: 8,
        y: 10,
        width: 106,
        height: 22,
        content: 'FINE VINTAGE',
        fieldBinding: 'none',
        color: '#000000',
        backgroundColor: '#eab308',
        fontSize: 9,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'v-2',
        type: 'text',
        x: 8,
        y: 40,
        content: 'CABERNET SAUVIGNON',
        fieldBinding: 'name',
        color: '#000000',
        fontSize: 10.5,
        fontWeight: 800,
        textAlign: 'left',
      },
      {
        id: 'v-3',
        type: 'text',
        x: 8,
        y: 60,
        content: '750ML • 2021 RESERVE',
        fieldBinding: 'code',
        color: '#dc2626',
        fontSize: 8.5,
        fontWeight: 700,
        textAlign: 'left',
      },
      {
        id: 'v-4',
        type: 'divider',
        x: 8,
        y: 80,
        width: 106,
        height: 2,
        content: '',
        color: '#000000',
      },
      {
        id: 'v-5',
        type: 'price',
        x: 8,
        y: 92,
        content: '₹1,299',
        fieldBinding: 'price',
        color: '#000000',
        fontSize: 28,
        fontWeight: 900,
        textAlign: 'left',
      },
      {
        id: 'v-6',
        type: 'text',
        x: 8,
        y: 130,
        content: 'MRP ₹1,699.00',
        fieldBinding: 'mrp',
        color: '#000000',
        fontSize: 9,
        fontWeight: 600,
        textAlign: 'left',
        strikeThrough: true,
      },
      {
        id: 'v-7',
        type: 'badge',
        x: 8,
        y: 150,
        width: 80,
        height: 18,
        content: 'SAVE 23%',
        fieldBinding: 'promo',
        color: '#ffffff',
        backgroundColor: '#dc2626',
        fontSize: 9,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'v-8',
        type: 'barcode',
        x: 18,
        y: 185,
        width: 85,
        height: 35,
        content: '8901030',
        fieldBinding: 'code',
        color: '#000000',
      },
    ],
  },
  {
    id: 'tpl-freezer-213f',
    name: 'Cold Storage Deep Freezer (2.13" HS213F)',
    modelId: 'HS213F',
    orientation: 'horizontal',
    backgroundColor: '#ffffff',
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: 'f-1',
        type: 'badge',
        x: 8,
        y: 8,
        width: 196,
        height: 18,
        content: '❄ COLD STORAGE • -25°C CERTIFIED',
        fieldBinding: 'none',
        color: '#ffffff',
        backgroundColor: '#000000',
        fontSize: 8.5,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'f-2',
        type: 'text',
        x: 10,
        y: 32,
        content: 'VANILLA BEAN ICE CREAM 1L',
        fieldBinding: 'name',
        color: '#000000',
        fontSize: 10.5,
        fontWeight: 800,
        textAlign: 'left',
      },
      {
        id: 'f-3',
        type: 'price',
        x: 10,
        y: 50,
        content: '₹249.00',
        fieldBinding: 'price',
        color: '#000000',
        fontSize: 26,
        fontWeight: 900,
        textAlign: 'left',
      },
      {
        id: 'f-4',
        type: 'text',
        x: 105,
        y: 54,
        content: 'MRP ₹299',
        fieldBinding: 'mrp',
        color: '#000000',
        fontSize: 9,
        fontWeight: 600,
        textAlign: 'left',
        strikeThrough: true,
      },
      {
        id: 'f-5',
        type: 'text',
        x: 105,
        y: 70,
        content: 'Keep Frozen at -18°C',
        fieldBinding: 'none',
        color: '#000000',
        fontSize: 8,
        fontWeight: 600,
        textAlign: 'left',
      },
      {
        id: 'f-6',
        type: 'barcode',
        x: 10,
        y: 82,
        width: 90,
        height: 18,
        content: '89012345',
        fieldBinding: 'code',
        color: '#000000',
      },
    ],
  },
  {
    id: 'tpl-retail-3color-266',
    name: 'Retail Pharmacy (2.66" HS266 3-Color)',
    modelId: 'HS266',
    orientation: 'horizontal',
    backgroundColor: '#ffffff',
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: 'r-1',
        type: 'badge',
        x: 10,
        y: 10,
        width: 80,
        height: 20,
        content: 'PHARMACY',
        fieldBinding: 'none',
        color: '#ffffff',
        backgroundColor: '#dc2626',
        fontSize: 9,
        fontWeight: 800,
        textAlign: 'center',
      },
      {
        id: 'r-2',
        type: 'text',
        x: 100,
        y: 12,
        content: 'DAILY MULTIVITAMIN 60 TABS',
        fieldBinding: 'name',
        color: '#000000',
        fontSize: 11,
        fontWeight: 800,
        textAlign: 'left',
      },
      {
        id: 'r-3',
        type: 'divider',
        x: 10,
        y: 36,
        width: 276,
        height: 2,
        content: '',
        color: '#dc2626',
      },
      {
        id: 'r-4',
        type: 'price',
        x: 10,
        y: 48,
        content: '₹549.00',
        fieldBinding: 'price',
        color: '#dc2626',
        fontSize: 34,
        fontWeight: 900,
        textAlign: 'left',
      },
      {
        id: 'r-5',
        type: 'text',
        x: 140,
        y: 56,
        content: 'MRP ₹699.00',
        fieldBinding: 'mrp',
        color: '#000000',
        fontSize: 10,
        fontWeight: 600,
        textAlign: 'left',
        strikeThrough: true,
      },
      {
        id: 'r-6',
        type: 'barcode',
        x: 215,
        y: 50,
        width: 65,
        height: 40,
        content: '89045671',
        fieldBinding: 'code',
        color: '#000000',
      },
    ],
  },
  {
    id: 'tpl-yellow-clearance-290',
    name: 'Yellow Flash Clearance (2.9" HS290-M)',
    modelId: 'HS290-M',
    orientation: 'horizontal',
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
    orientation: 'horizontal',
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
  onSaveTemplate?: (template: EslTemplate) => void;
}

// ==========================================
// 3. Helper: Render Dynamic Content for Element
// ==========================================
function getRenderedContent(el: TemplateElement): string {
  if (el.type === 'divider') return '';
  return el.content;
}

// ==========================================
// 4. Miniature E-Paper Screen Renderer
// ==========================================
const MiniEslPreview: React.FC<{
  template: EslTemplate;
  maxDisplayWidth?: number;
  maxDisplayHeight?: number;
}> = ({ template, maxDisplayWidth = 260, maxDisplayHeight = 200 }) => {
  const model = HIGHLIGHT_MODELS.find((m) => m.id === template.modelId) || HIGHLIGHT_MODELS[0];
  const orientation = template.orientation || 'horizontal';
  const dims = getModelDimensions(model, orientation);

  const scale = Math.min(maxDisplayWidth / dims.width, maxDisplayHeight / dims.height, 1);
  const displayW = Math.round(dims.width * scale);
  const displayH = Math.round(dims.height * scale);

  return (
    <div
      style={{
        width: `${displayW}px`,
        height: `${displayH}px`,
        backgroundColor: template.backgroundColor || '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '3px',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
        userSelect: 'none',
      }}
    >
      {template.elements.map((el) => {
        const text = getRenderedContent(el);
        const x = el.x * scale;
        const y = el.y * scale;

        if (el.type === 'text' || el.type === 'price') {
          return (
            <span
              key={el.id}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                fontSize: `${(el.fontSize || 12) * scale}px`,
                fontWeight: el.fontWeight || (el.type === 'price' ? 900 : 700),
                color: el.color,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                textDecoration: el.strikeThrough ? 'line-through' : 'none',
              }}
            >
              {text}
            </span>
          );
        }

        if (el.type === 'badge') {
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${(el.width || 80) * scale}px`,
                height: `${(el.height || 20) * scale}px`,
                backgroundColor: el.backgroundColor || '#dc2626',
                color: el.color || '#ffffff',
                fontSize: `${(el.fontSize || 10) * scale}px`,
                fontWeight: el.fontWeight || 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                textTransform: 'uppercase',
                padding: '0 2px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {text}
            </div>
          );
        }

        if (el.type === 'divider') {
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${(el.width || 100) * scale}px`,
                height: `${Math.max(1, (el.height || 2) * scale)}px`,
                backgroundColor: el.color,
              }}
            />
          );
        }

        if (el.type === 'barcode') {
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${(el.width || 70) * scale}px`,
                height: `${(el.height || 30) * scale}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '75%',
                  backgroundImage: `repeating-linear-gradient(90deg, ${el.color} 0px, ${el.color} 2px, transparent 2px, transparent 4px)`,
                }}
              />
              <span style={{ fontSize: `${Math.max(6, 7 * scale)}px`, fontWeight: 800, fontFamily: 'monospace', color: el.color }}>
                {text}
              </span>
            </div>
          );
        }

        if (el.type === 'image' && el.content) {
          return (
            <img
              key={el.id}
              src={el.content}
              alt=""
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${(el.width || 60) * scale}px`,
                height: `${(el.height || 60) * scale}px`,
                objectFit: el.objectFit || 'contain',
                filter:
                  el.imageTone === 'black'
                    ? 'grayscale(100%) contrast(200%)'
                    : el.imageTone === 'red' && model.colorCapability >= 3
                    ? 'sepia(100%) hue-rotate(320deg) saturate(500%)'
                    : el.imageTone === 'yellow' && model.colorCapability >= 4
                    ? 'sepia(100%) hue-rotate(40deg) saturate(500%)'
                    : 'none',
              }}
            />
          );
        }

        return null;
      })}
    </div>
  );
};

// ==========================================
// 5. Main Template Studio & Gallery Component
// ==========================================
export const TemplateStudioView: React.FC<TemplateStudioViewProps> = ({ onSaveTemplate }) => {
  // Funnel view: 'list' (gallery) vs 'editor' (studio designer)
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');

  // Saved templates state
  const [templates, setTemplates] = useState<EslTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('qs_esl_templates');
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  });

  // Active template being edited
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || 'tpl-grocery-290');
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];
  const activeModel = HIGHLIGHT_MODELS.find((m) => m.id === activeTemplate.modelId) || HIGHLIGHT_MODELS[0];

  const activeOrientation = activeTemplate.orientation || 'horizontal';
  const activeDims = getModelDimensions(activeModel, activeOrientation);

  // Selected element for editing on canvas
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const selectedElement = activeTemplate.elements.find((el) => el.id === selectedElementId) || null;

  // Search & filter in list view
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<'all' | '2' | '3' | '4' | 'freezer'>('all');
  const [orientationFilter, setOrientationFilter] = useState<'all' | 'horizontal' | 'vertical'>('all');

  // Preview modal state
  const [previewModalTemplateId, setPreviewModalTemplateId] = useState<string | null>(null);
  const previewModalTemplate = templates.find((t) => t.id === previewModalTemplateId) || null;

  // Create new modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('New Custom Label');
  const [newTemplateModelId, setNewTemplateModelId] = useState('HS290-M');
  const [newTemplateOrientation, setNewTemplateOrientation] = useState<OrientationType>('horizontal');

  // Zoom & view scale in editor
  const [zoomLevel, setZoomLevel] = useState<number>(() => (activeDims.width > 500 ? 1 : 1.75));

  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Dragging to move state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Direct Side / Corner Dragging Resize State
  type ResizeHandle = 'e' | 's' | 'se' | 'w' | 'n' | 'nw' | 'ne' | 'sw';
  const [resizingState, setResizingState] = useState<{
    elementId: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startElemX: number;
    startElemY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Image Crop Modal State
  const [cropModalElementId, setCropModalElementId] = useState<string | null>(null);
  const cropTargetElement = activeTemplate.elements.find((e) => e.id === cropModalElementId) || null;
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number }>({ x: 10, y: 10, width: 80, height: 80 });
  const [cropDragMode, setCropDragMode] = useState<'move' | 'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ clientX: number; clientY: number; rect: typeof cropRect }>({ clientX: 0, clientY: 0, rect: cropRect });

  // File input ref for image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enterprise Clean Palette
  const c = {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceSubtle: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    primary: '#2563eb',
    success: '#059669',
    danger: '#dc2626',
    yellow: '#eab308',
    freezer: '#0284c7',
  };

  // Helper: Persist templates
  const persistTemplates = (newTemplates: EslTemplate[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem('qs_esl_templates', JSON.stringify(newTemplates));
    } catch (e) {
      console.error('Failed to save templates', e);
    }
  };

  // Toggle Horizontal / Vertical orientation
  const handleToggleOrientation = () => {
    const nextOrientation: OrientationType = activeOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    const updated = templates.map((t) => (t.id === activeTemplate.id ? { ...t, orientation: nextOrientation } : t));
    persistTemplates(updated);
  };

  // Update an element in the current template
  const updateElement = (id: string, patch: Partial<TemplateElement>) => {
    const updated = templates.map((t) => {
      if (t.id !== activeTemplate.id) return t;
      return {
        ...t,
        elements: t.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
        updatedAt: new Date().toISOString(),
      };
    });
    persistTemplates(updated);
  };

  // Delete an element
  const deleteElement = (id: string) => {
    const updated = templates.map((t) => {
      if (t.id !== activeTemplate.id) return t;
      return {
        ...t,
        elements: t.elements.filter((el) => el.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
    persistTemplates(updated);
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Add a new element
  const addElement = (type: ElementType) => {
    const newId = `el-${Date.now()}`;
    let newElement: TemplateElement;
    const defaultColor = '#000000';

    switch (type) {
      case 'text':
        newElement = {
          id: newId,
          type: 'text',
          x: 16,
          y: 16,
          width: 140,
          content: 'New Text Field',
          fieldBinding: 'name',
          color: defaultColor,
          fontSize: 12,
          fontWeight: 700,
          textAlign: 'left',
        };
        break;
      case 'price':
        newElement = {
          id: newId,
          type: 'price',
          x: 16,
          y: 44,
          width: 120,
          content: '₹199.00',
          fieldBinding: 'price',
          color: activeModel.colorCapability >= 3 ? '#dc2626' : defaultColor,
          fontSize: 30,
          fontWeight: 900,
          textAlign: 'left',
        };
        break;
      case 'badge':
        newElement = {
          id: newId,
          type: 'badge',
          x: 16,
          y: 80,
          width: Math.min(85, activeDims.width - 32),
          height: 20,
          content: 'OFFER',
          fieldBinding: 'promo',
          color: '#ffffff',
          backgroundColor: activeModel.colorCapability >= 3 ? '#dc2626' : '#000000',
          fontSize: 9.5,
          fontWeight: 800,
          textAlign: 'center',
        };
        break;
      case 'divider':
        newElement = {
          id: newId,
          type: 'divider',
          x: 16,
          y: 36,
          width: Math.min(220, activeDims.width - 32),
          height: 2,
          content: '',
          color: defaultColor,
        };
        break;
      case 'barcode':
        newElement = {
          id: newId,
          type: 'barcode',
          x: 16,
          y: 80,
          width: 70,
          height: 35,
          content: '8003152970',
          fieldBinding: 'code',
          color: defaultColor,
        };
        break;
      case 'image':
        newElement = {
          id: newId,
          type: 'image',
          x: 16,
          y: 16,
          width: 60,
          height: 60,
          content: '',
          color: defaultColor,
          imageTone: 'original',
          objectFit: 'contain',
        };
        break;
    }

    const updated = templates.map((t) => {
      if (t.id !== activeTemplate.id) return t;
      return {
        ...t,
        elements: [...t.elements, newElement],
        updatedAt: new Date().toISOString(),
      };
    });
    persistTemplates(updated);
    setSelectedElementId(newId);
  };

  // Image file upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      if (selectedElement && selectedElement.type === 'image') {
        updateElement(selectedElement.id, { content: dataUrl });
      } else {
        const newId = `el-${Date.now()}`;
        const newEl: TemplateElement = {
          id: newId,
          type: 'image',
          x: 16,
          y: 16,
          width: 60,
          height: 60,
          content: dataUrl,
          color: '#000000',
          imageTone: 'original',
          objectFit: 'contain',
        };
        const updated = templates.map((t) => {
          if (t.id !== activeTemplate.id) return t;
          return {
            ...t,
            elements: [...t.elements, newEl],
            updatedAt: new Date().toISOString(),
          };
        });
        persistTemplates(updated);
        setSelectedElementId(newId);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Save templates manually
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

  // Reset to factory templates
  const handleResetDefaults = () => {
    if (confirm('Reset to factory Highlight e-paper templates? Custom edits will be restored.')) {
      persistTemplates(DEFAULT_TEMPLATES);
      setActiveTemplateId(DEFAULT_TEMPLATES[0].id);
      setSelectedElementId(null);
    }
  };

  // Create new template via modal
  const handleConfirmCreate = () => {
    if (!newTemplateName.trim()) return;
    const model = HIGHLIGHT_MODELS.find((m) => m.id === newTemplateModelId) || HIGHLIGHT_MODELS[0];
    const newId = `tpl-custom-${Date.now()}`;
    const dims = getModelDimensions(model, newTemplateOrientation);
    const is3Or4 = model.colorCapability >= 3;

    const newTemplate: EslTemplate = {
      id: newId,
      name: newTemplateName.trim(),
      modelId: model.id,
      orientation: newTemplateOrientation,
      backgroundColor: '#ffffff',
      updatedAt: new Date().toISOString(),
      elements: [
        {
          id: `el-${Date.now()}-1`,
          type: 'text',
          x: 12,
          y: 12,
          width: 140,
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
          y: 44,
          width: 120,
          content: '₹199.00',
          fieldBinding: 'price',
          color: is3Or4 ? '#dc2626' : '#000000',
          fontSize: 30,
          fontWeight: 900,
          textAlign: 'left',
        },
        {
          id: `el-${Date.now()}-3`,
          type: 'badge',
          x: dims.width > 200 ? 135 : 12,
          y: dims.width > 200 ? 46 : 82,
          width: 75,
          height: 20,
          content: 'SPECIAL',
          fieldBinding: 'promo',
          color: '#ffffff',
          backgroundColor: is3Or4 ? '#dc2626' : '#000000',
          fontSize: 9.5,
          fontWeight: 800,
          textAlign: 'center',
        },
        {
          id: `el-${Date.now()}-4`,
          type: 'barcode',
          x: dims.width > 240 ? dims.width - 80 : 12,
          y: dims.height > 120 ? dims.height - 45 : 75,
          width: 60,
          height: 30,
          content: '8003152970',
          fieldBinding: 'code',
          color: '#000000',
        },
      ],
    };

    const updated = [...templates, newTemplate];
    persistTemplates(updated);
    setActiveTemplateId(newId);
    setSelectedElementId(null);
    setIsCreateModalOpen(false);
    setViewMode('editor');
  };

  // Duplicate a template
  const handleDuplicateTemplate = (tpl: EslTemplate) => {
    const copyName = `${tpl.name} (Copy)`;
    const newId = `tpl-copy-${Date.now()}`;
    const duplicated: EslTemplate = {
      ...tpl,
      id: newId,
      name: copyName,
      elements: tpl.elements.map((el, idx) => ({ ...el, id: `el-${Date.now()}-${idx}` })),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...templates, duplicated];
    persistTemplates(updated);
    setActiveTemplateId(newId);
    setSelectedElementId(null);
    setViewMode('editor');
  };

  // Delete a template
  const handleDeleteTemplate = (id: string, name: string) => {
    if (templates.length <= 1) {
      alert('You must keep at least one ESL template in the system.');
      return;
    }
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      const remaining = templates.filter((t) => t.id !== id);
      persistTemplates(remaining);
      if (activeTemplateId === id) {
        setActiveTemplateId(remaining[0].id);
      }
    }
  };

  // Export SVG representation matching physical resolution and orientation
  const handleExportSVG = (tpl: EslTemplate = activeTemplate) => {
    const model = HIGHLIGHT_MODELS.find((m) => m.id === tpl.modelId) || HIGHLIGHT_MODELS[0];
    const orientation = tpl.orientation || 'horizontal';
    const dims = getModelDimensions(model, orientation);

    const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">`;
    const svgBg = `<rect width="${dims.width}" height="${dims.height}" fill="${tpl.backgroundColor || '#ffffff'}"/>`;
    const svgElements = tpl.elements
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
        if (el.type === 'image' && el.content) {
          const preserve = el.objectFit === 'fill' ? 'none' : el.objectFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';
          return `<image href="${el.content}" x="${el.x}" y="${el.y}" width="${el.width || 60}" height="${el.height || 60}" preserveAspectRatio="${preserve}" />`;
        }
        return `<text x="${el.x}" y="${el.y + (el.fontSize || 14)}" fill="${el.color}" font-family="sans-serif" font-size="${el.fontSize || 14}" font-weight="${el.fontWeight || 700}" text-anchor="${el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start'}">${text}</text>`;
      })
      .join('\n');
    const fullSvg = `${svgHeader}\n${svgBg}\n${svgElements}\n</svg>`;
    const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tpl.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${model.id}-${orientation}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Drag-to-Move handler on canvas
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

  // Drag-to-Resize handler on handle
  const handleResizeMouseDown = (handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedElement) return;

    setResizingState({
      elementId: selectedElement.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startElemX: selectedElement.x,
      startElemY: selectedElement.y,
      startWidth: selectedElement.width || (selectedElement.type === 'divider' ? 100 : selectedElement.type === 'text' || selectedElement.type === 'price' ? 120 : 60),
      startHeight: selectedElement.height || (selectedElement.type === 'divider' ? 2 : selectedElement.fontSize ? Math.round(selectedElement.fontSize * 1.3) : 24),
    });
  };

  // Combined MouseMove for both Dragging and Resizing
  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Resizing logic
    if (resizingState) {
      const dx = (e.clientX - resizingState.startX) / zoomLevel;
      const dy = (e.clientY - resizingState.startY) / zoomLevel;
      let newW = resizingState.startWidth;
      let newH = resizingState.startHeight;
      let newX = resizingState.startElemX;
      let newY = resizingState.startElemY;

      if (resizingState.handle.includes('e')) {
        newW = Math.max(10, Math.round(resizingState.startWidth + dx));
      }
      if (resizingState.handle.includes('s')) {
        newH = Math.max(2, Math.round(resizingState.startHeight + dy));
      }
      if (resizingState.handle.includes('w')) {
        const rawW = resizingState.startWidth - dx;
        if (rawW >= 10) {
          newW = Math.round(rawW);
          newX = Math.round(resizingState.startElemX + dx);
        }
      }
      if (resizingState.handle.includes('n')) {
        const rawH = resizingState.startHeight - dy;
        if (rawH >= 2) {
          newH = Math.round(rawH);
          newY = Math.round(resizingState.startElemY + dy);
        }
      }

      // Keep within bounds
      newX = Math.max(0, Math.min(activeDims.width - 10, newX));
      newY = Math.max(0, Math.min(activeDims.height - 2, newY));
      newW = Math.min(newW, activeDims.width - newX);
      newH = Math.min(newH, activeDims.height - newY);

      updateElement(resizingState.elementId, {
        width: newW,
        height: newH,
        x: newX,
        y: newY,
      });
      return;
    }

    // 2. Dragging to move logic
    if (isDragging && selectedElement && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = Math.round((e.clientX - canvasRect.left) / zoomLevel - dragOffset.x);
      const newY = Math.round((e.clientY - canvasRect.top) / zoomLevel - dragOffset.y);

      const elWidth = selectedElement.width || 40;
      const elHeight = selectedElement.height || 20;

      const clampedX = Math.max(0, Math.min(activeDims.width - elWidth, newX));
      const clampedY = Math.max(0, Math.min(activeDims.height - elHeight, newY));

      updateElement(selectedElement.id, { x: clampedX, y: clampedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizingState(null);
  };

  // Apply Image Crop
  const handleApplyCrop = () => {
    if (!cropTargetElement || !cropTargetElement.content) return;
    const img = new window.Image();
    img.src = cropTargetElement.content;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const pixelX = Math.round((cropRect.x / 100) * img.naturalWidth);
      const pixelY = Math.round((cropRect.y / 100) * img.naturalHeight);
      const pixelW = Math.max(1, Math.round((cropRect.width / 100) * img.naturalWidth));
      const pixelH = Math.max(1, Math.round((cropRect.height / 100) * img.naturalHeight));

      canvas.width = pixelW;
      canvas.height = pixelH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);
        const croppedDataUrl = canvas.toDataURL('image/png');
        updateElement(cropTargetElement.id, { content: croppedDataUrl });
      }
      setCropModalElementId(null);
    };
  };

  // Filter templates for gallery
  const filteredTemplates = templates.filter((t) => {
    const model = HIGHLIGHT_MODELS.find((m) => m.id === t.modelId) || HIGHLIGHT_MODELS[0];
    const orientation = t.orientation || 'horizontal';

    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.modelId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesColor =
      colorFilter === 'all' ||
      (colorFilter === 'freezer' && model.isFreezer) ||
      (colorFilter === '2' && model.colorCapability === 2 && !model.isFreezer) ||
      (colorFilter === '3' && model.colorCapability === 3) ||
      (colorFilter === '4' && model.colorCapability === 4);

    const matchesOrientation = orientationFilter === 'all' || orientation === orientationFilter;

    return matchesSearch && matchesColor && matchesOrientation;
  });

  // Allowed colors for current template's model capability
  const availableColors = ALL_EPAPER_COLORS.filter((col) => col.requiredCap <= activeModel.colorCapability);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 75px)',
        backgroundColor: c.bg,
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseUp={handleMouseUp}
    >
      {/* Hidden file input for uploading images */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      {/* =========================================================================
          VIEW 1: TEMPLATE HUB / GALLERY (FUNNEL ENTRANCE)
      ========================================================================== */}
      {viewMode === 'list' && (
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Funnel Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              paddingBottom: '20px',
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: c.primary,
                  }}
                >
                  <Palette size={20} />
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: c.text, margin: 0 }}>
                  ESL Template Gallery
                </h1>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '12px', backgroundColor: '#fef08a', border: '1px solid #facc15', color: '#854d0e', fontSize: '11px', fontWeight: 800 }}>
                    4-Color
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '11px', fontWeight: 800 }}>
                    3-Color
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '12px', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Snowflake size={11} /> Freezer B/W
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: c.textMuted, margin: '6px 0 0 0' }}>
                Design shelf layouts for Highlight 2, 3, 4-color and freezer tags with drag-to-fit sizing, image cropping, and horizontal/vertical views.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                backgroundColor: c.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Plus size={16} />
              <span>Create Template</span>
            </button>
          </div>

          {/* Filter Bar: Color Capability + Orientation + Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: c.surface,
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${c.border}`,
                width: '260px',
              }}
            >
              <Search size={15} color={c.textMuted} />
              <input
                type="text"
                placeholder="Search templates or models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '12.5px',
                  color: c.text,
                  width: '100%',
                  backgroundColor: 'transparent',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: c.textMuted }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills: Tag Capability */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: c.textMuted }}>Tag Type:</span>
              {[
                { id: 'all', label: 'All Tags' },
                { id: '4', label: '4-Color (B/W/R/Y)' },
                { id: '3', label: '3-Color (B/W/R)' },
                { id: 'freezer', label: '❄ Freezer (-25°C)' },
              ].map((pill) => {
                const isActive = colorFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setColorFilter(pill.id as any)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: isActive ? `1px solid ${c.primary}` : `1px solid ${c.border}`,
                      backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : c.surface,
                      color: isActive ? c.primary : c.textMuted,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Filter Pills: Orientation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: c.textMuted }}>View:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'horizontal', label: '↔ Horizontal' },
                { id: 'vertical', label: '↕ Vertical' },
              ].map((pill) => {
                const isActive = orientationFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setOrientationFilter(pill.id as any)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: isActive ? `1px solid ${c.primary}` : `1px solid ${c.border}`,
                      backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : c.surface,
                      color: isActive ? c.primary : c.textMuted,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredTemplates.map((t) => {
              const model = HIGHLIGHT_MODELS.find((m) => m.id === t.modelId) || HIGHLIGHT_MODELS[0];
              const orientation = t.orientation || 'horizontal';
              const dims = getModelDimensions(model, orientation);

              return (
                <div
                  key={t.id}
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: '12px',
                    border: `1px solid ${c.border}`,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = c.border;
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  {/* Miniature Hardware Frame Preview */}
                  <div
                    style={{
                      backgroundColor: '#0f172a',
                      padding: '24px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: orientation === 'vertical' ? '240px' : '160px',
                      position: 'relative',
                    }}
                  >
                    {/* Top Left: Model & Resolution */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '12px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: '#64748b',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{model.id}</span>
                      <span>•</span>
                      <span>{dims.width}×{dims.height}PX</span>
                      <span>•</span>
                      <span>{orientation === 'vertical' ? 'PORTRAIT' : 'LANDSCAPE'}</span>
                    </div>

                    {/* Top Right: Color Capability Badges */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {model.isFreezer && (
                        <span title="Low-Temperature Freezer Tag (-25°C)">
                          <Snowflake size={13} color="#38bdf8" />
                        </span>
                      )}
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#000000', border: '1px solid #475569', display: 'inline-block' }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', display: 'inline-block' }} />
                      {model.colorCapability >= 3 && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />
                      )}
                      {model.colorCapability >= 4 && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308', display: 'inline-block' }} />
                      )}
                    </div>

                    {/* Miniature E-Paper rendering */}
                    <div style={{ marginTop: '14px' }}>
                      <MiniEslPreview
                        template={t}
                        maxDisplayWidth={orientation === 'vertical' ? 160 : 280}
                        maxDisplayHeight={orientation === 'vertical' ? 220 : 140}
                      />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: c.text, margin: 0 }}>
                        {t.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {model.isFreezer && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Snowflake size={10} /> Freezer
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: c.primary,
                          }}
                        >
                          {model.screenSize}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: orientation === 'vertical' ? '#f3e8ff' : '#f1f5f9',
                            color: orientation === 'vertical' ? '#7e22ce' : c.textMuted,
                          }}
                        >
                          {orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '11.5px', color: c.textMuted, margin: 0 }}>
                      {model.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: c.textMuted, marginTop: '4px' }}>
                      <span>{t.elements.length} elements</span>
                      <span>•</span>
                      <span>{model.colorCapability} Colors</span>
                      <span>•</span>
                      <span>DPI: {model.dpi}</span>
                    </div>
                  </div>

                  {/* Card Action Bar */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: c.surfaceSubtle,
                      borderTop: `1px solid ${c.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* View Fullscreen Modal */}
                      <button
                        type="button"
                        onClick={() => setPreviewModalTemplateId(t.id)}
                        title="View Fullscreen"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.text,
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={13} color={c.textMuted} />
                        <span>View</span>
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateTemplate(t)}
                        title="Duplicate Template"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.textMuted,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Copy size={13} />
                      </button>

                      {/* Export SVG */}
                      <button
                        type="button"
                        onClick={() => handleExportSVG(t)}
                        title="Export SVG File"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.textMuted,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Download size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id, t.name)}
                        title="Delete Template"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.danger,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Edit Design */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTemplateId(t.id);
                        setSelectedElementId(null);
                        setViewMode('editor');
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: c.primary,
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Edit Design</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: TEMPLATE STUDIO EDITOR (DRAG-TO-FIT, RESIZE HANDLES, CROP TOOL)
      ========================================================================== */}
      {viewMode === 'editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 75px)', overflow: 'hidden' }}>
          {/* Top Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              backgroundColor: c.surface,
              borderBottom: `1px solid ${c.border}`,
              gap: '16px',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            {/* Left: Back button + Template Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  handleSave();
                  setViewMode('list');
                }}
                title="Back to Template Gallery"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: c.surfaceSubtle,
                  color: c.text,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                <span>Gallery</span>
              </button>

              <div style={{ height: '20px', width: '1px', backgroundColor: c.border }} />

              <input
                type="text"
                value={activeTemplate.name}
                onChange={(e) => {
                  const updated = templates.map((t) => (t.id === activeTemplate.id ? { ...t, name: e.target.value } : t));
                  persistTemplates(updated);
                }}
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: c.text,
                  border: '1px solid transparent',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  outline: 'none',
                  backgroundColor: 'transparent',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = c.primary;
                  e.currentTarget.style.backgroundColor = c.surfaceSubtle;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              />

              {/* Hardware Model & Resolution Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: activeModel.isFreezer ? '#e0f2fe' : 'rgba(37, 99, 235, 0.08)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeModel.isFreezer ? '#0369a1' : c.primary,
                  fontFamily: 'monospace',
                }}
              >
                {activeModel.isFreezer && <Snowflake size={12} />}
                <span>{activeModel.id}</span>
                <span>•</span>
                <span>{activeDims.width}×{activeDims.height}px</span>
                <span>•</span>
                <span>{activeModel.colorCapability} Colors</span>
              </div>
            </div>

            {/* Right: Orientation Toggle, Zoom & Save Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Orientation Toggle Button */}
              <button
                type="button"
                onClick={handleToggleOrientation}
                title="Switch between Horizontal (Landscape) and Vertical (Portrait) layout"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: c.surfaceSubtle,
                  color: c.text,
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={13} color={c.primary} />
                <span>{activeOrientation === 'vertical' ? 'Vertical (Portrait)' : 'Horizontal (Landscape)'}</span>
              </button>

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

              {/* Export SVG */}
              <button
                type="button"
                onClick={() => handleExportSVG()}
                title="Download SVG matching hardware resolution"
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

              {/* Reset to factory */}
              <button
                type="button"
                onClick={handleResetDefaults}
                title="Reset to factory templates"
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: 'transparent',
                  color: c.textMuted,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RotateCcw size={12} />
              </button>

              {/* Save Template Button */}
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
                <span>{isSavedRecently ? 'Saved!' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Studio Workspace: Toolbox (Left) | Canvas (Center) | Properties (Right) */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* ==========================================
                LEFT TOOLBOX: Add Elements & Upload Image
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
                  Add Elements
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { type: 'text' as ElementType, label: 'Text Field', icon: Type, desc: 'Name, SKU, notes' },
                    { type: 'price' as ElementType, label: 'Price Block', icon: DollarSign, desc: 'Bold price figure' },
                    { type: 'badge' as ElementType, label: 'Promo Badge', icon: TagIcon, desc: 'Colored banner' },
                    { type: 'divider' as ElementType, label: 'Divider Line', icon: Minus, desc: 'Separator bar' },
                    { type: 'barcode' as ElementType, label: 'Barcode', icon: BarcodeIcon, desc: 'Shelf code strip' },
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

                  {/* Upload Image Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      backgroundColor: 'rgba(37, 99, 235, 0.05)',
                      border: '1px dashed #93c5fd',
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
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #bfdbfe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: c.primary,
                        flexShrink: 0,
                      }}
                    >
                      <Upload size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: c.primary }}>Upload Image</div>
                      <div style={{ fontSize: '10px', color: c.textMuted }}>Logo, icon, graphic</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Hardware Color Palette Notice */}
              <div
                style={{
                  marginTop: 'auto',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: activeModel.isFreezer ? '#f0f9ff' : 'rgba(234, 179, 8, 0.08)',
                  border: activeModel.isFreezer ? '1px solid #bae6fd' : '1px solid rgba(234, 179, 8, 0.3)',
                  fontSize: '11px',
                  color: activeModel.isFreezer ? '#0369a1' : '#854d0e',
                }}
              >
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  {activeModel.isFreezer ? <Snowflake size={13} /> : <Info size={13} />}
                  <span>{activeModel.name}</span>
                </div>
                <span>
                  {activeModel.colorCapability === 2 && 'Freezer 2-Color: Black and White e-paper pigments only (-25°C).'}
                  {activeModel.colorCapability === 3 && 'Standard 3-Color: Black, White, and Red e-paper pigments.'}
                  {activeModel.colorCapability === 4 && 'Multi-Ink 4-Color: Black, White, Red, and Yellow e-paper pigments.'}
                </span>
              </div>
            </div>

            {/* ==========================================
                CENTER: WYSIWYG E-Paper Canvas Workspace (With Drag-To-Fit Handles)
            =========================================== */}
            <div
              style={{
                flex: 1,
                backgroundColor: '#cbd5e1',
                backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: '30px',
                position: 'relative',
              }}
              onMouseMove={handleMouseMove}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedElementId(null);
                }
              }}
            >
              {/* Hardware Screen Outer Casing */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#0f172a',
                  borderRadius: '16px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0,0,0,0.1)',
                  display: 'inline-block',
                }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setSelectedElementId(null);
                  }
                }}
              >
                {/* Screen Dimension & Model Label */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '10px', fontWeight: 700, marginBottom: '8px', padding: '0 4px', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {activeModel.isFreezer && <Snowflake size={11} color="#38bdf8" />}
                    <span>{activeModel.id} ({activeModel.screenSize})</span>
                  </div>
                  <span>
                    {activeDims.width} × {activeDims.height} PX • {activeOrientation.toUpperCase()}
                  </span>
                </div>

                {/* The Physical E-Paper Display */}
                <div
                  ref={canvasRef}
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setSelectedElementId(null);
                    }
                  }}
                  style={{
                    width: `${activeDims.width * zoomLevel}px`,
                    height: `${activeDims.height * zoomLevel}px`,
                    backgroundColor: activeTemplate.backgroundColor || '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    cursor: resizingState ? 'default' : isDragging ? 'grabbing' : 'default',
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${el.x * zoomLevel}px`,
                          top: `${el.y * zoomLevel}px`,
                          width: el.width ? `${el.width * zoomLevel}px` : undefined,
                          height: el.height ? `${el.height * zoomLevel}px` : undefined,
                          outline: isSelected ? '2px dashed #2563eb' : '1px solid transparent',
                          outlineOffset: '2px',
                          cursor: resizingState ? 'default' : isDragging ? 'grabbing' : 'grab',
                          zIndex: isSelected ? 20 : 2,
                          userSelect: 'none',
                          boxSizing: 'border-box',
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
                              pointerEvents: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%',
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
                              backgroundColor: el.backgroundColor || (activeModel.colorCapability >= 3 ? '#dc2626' : '#000000'),
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
                              pointerEvents: 'none',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {renderedText}
                          </div>
                        )}

                        {/* Element: DIVIDER LINE */}
                        {el.type === 'divider' && (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              minHeight: '1px',
                              backgroundColor: el.color,
                              pointerEvents: 'none',
                            }}
                          />
                        )}

                        {/* Element: BARCODE */}
                        {el.type === 'barcode' && (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              pointerEvents: 'none',
                            }}
                          >
                            <svg
                              width="100%"
                              height="75%"
                              viewBox="0 0 70 30"
                              preserveAspectRatio="none"
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
                            <span style={{ fontSize: `${8 * zoomLevel}px`, fontWeight: 800, fontFamily: 'monospace', color: el.color, lineHeight: 1 }}>
                              {renderedText}
                            </span>
                          </div>
                        )}

                        {/* Element: IMAGE (With Area Fit) */}
                        {el.type === 'image' && (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: el.content ? 'transparent' : 'rgba(0,0,0,0.05)',
                              border: el.content ? 'none' : '1px dashed #cbd5e1',
                              overflow: 'hidden',
                            }}
                          >
                            {el.content ? (
                              <img
                                src={el.content}
                                alt="ESL graphic"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: el.objectFit || 'contain',
                                  pointerEvents: 'none',
                                  display: 'block',
                                  filter:
                                    el.imageTone === 'black'
                                      ? 'grayscale(100%) contrast(200%)'
                                      : el.imageTone === 'red' && activeModel.colorCapability >= 3
                                      ? 'sepia(100%) hue-rotate(320deg) saturate(500%)'
                                      : el.imageTone === 'yellow' && activeModel.colorCapability >= 4
                                      ? 'sepia(100%) hue-rotate(40deg) saturate(500%)'
                                      : 'none',
                                }}
                              />
                            ) : (
                              <div style={{ textAlign: 'center', color: c.textMuted, fontSize: '10px' }}>
                                <ImageIcon size={20} style={{ margin: '0 auto 4px' }} />
                                <span>No Image</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ===================================================
                            8 RESIZE HANDLES: Drag Sides/Corners to Fit Any Area
                        ==================================================== */}
                        {isSelected && (
                          <>
                            {/* East (Right Side Handle) */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('e', e)}
                              title="Drag right edge to fit area width"
                              style={{
                                position: 'absolute',
                                right: '-5px',
                                top: 'calc(50% - 5px)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'ew-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                            {/* South (Bottom Side Handle) */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('s', e)}
                              title="Drag bottom edge to fit area height"
                              style={{
                                position: 'absolute',
                                bottom: '-5px',
                                left: 'calc(50% - 5px)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'ns-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                            {/* South-East (Bottom-Right Corner Handle) */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('se', e)}
                              title="Drag corner to stretch width & height"
                              style={{
                                position: 'absolute',
                                right: '-5px',
                                bottom: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'nwse-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                            {/* West (Left Side Handle) */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('w', e)}
                              title="Drag left edge"
                              style={{
                                position: 'absolute',
                                left: '-5px',
                                top: 'calc(50% - 5px)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'ew-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                            {/* North (Top Side Handle) */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('n', e)}
                              title="Drag top edge"
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                left: 'calc(50% - 5px)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'ns-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                            {/* North-East Corner */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('ne', e)}
                              title="Drag top-right corner"
                              style={{
                                position: 'absolute',
                                right: '-5px',
                                top: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'nesw-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                            {/* South-West Corner */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('sw', e)}
                              title="Drag bottom-left corner"
                              style={{
                                position: 'absolute',
                                left: '-5px',
                                bottom: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'nesw-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                            {/* North-West Corner */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown('nw', e)}
                              title="Drag top-left corner"
                              style={{
                                position: 'absolute',
                                left: '-5px',
                                top: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#2563eb',
                                border: '2px solid #ffffff',
                                borderRadius: '2px',
                                cursor: 'nwse-resize',
                                zIndex: 35,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ==========================================
                RIGHT SIDEBAR: Selected Element Properties & Area Fit Controls
            =========================================== */}
            <div
              style={{
                width: '280px',
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
                  {selectedElement ? `Edit ${selectedElement.type}` : 'Template Settings'}
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
                      color: c.danger,
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
                  {/* Dynamic Catalog Variable Binding */}
                  {selectedElement.type !== 'divider' && selectedElement.type !== 'image' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                        Field Mapping
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

                  {/* Content Input */}
                  {selectedElement.type !== 'image' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                        Label Text
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
                  )}

                  {/* Controls for IMAGE element (With Crop & Object Fit) */}
                  {selectedElement.type === 'image' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text }}>
                        Image Source & Cropping
                      </label>

                      {selectedElement.content && (
                        <div
                          style={{
                            height: '90px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '6px',
                            border: `1px solid ${c.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={selectedElement.content}
                            alt=""
                            style={{
                              maxHeight: '100%',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              filter:
                                selectedElement.imageTone === 'black'
                                  ? 'grayscale(100%) contrast(200%)'
                                  : selectedElement.imageTone === 'red' && activeModel.colorCapability >= 3
                                  ? 'sepia(100%) hue-rotate(320deg) saturate(500%)'
                                  : selectedElement.imageTone === 'yellow' && activeModel.colorCapability >= 4
                                  ? 'sepia(100%) hue-rotate(40deg) saturate(500%)'
                                  : 'none',
                            }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '7px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${c.border}`,
                            backgroundColor: c.surfaceSubtle,
                            color: c.primary,
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Upload size={13} />
                          <span>{selectedElement.content ? 'Replace' : 'Upload'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={!selectedElement.content}
                          onClick={() => {
                            if (selectedElement.content) {
                              setCropModalElementId(selectedElement.id);
                              setCropRect({ x: 10, y: 10, width: 80, height: 80 });
                            }
                          }}
                          style={{
                            padding: '7px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${selectedElement.content ? '#93c5fd' : c.border}`,
                            backgroundColor: selectedElement.content ? 'rgba(37, 99, 235, 0.08)' : c.surfaceSubtle,
                            color: selectedElement.content ? c.primary : c.textMuted,
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: selectedElement.content ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Crop size={13} />
                          <span>Crop Image</span>
                        </button>
                      </div>

                      {/* Image Fit Mode */}
                      <div>
                        <span style={{ fontSize: '11px', color: c.textMuted, fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                          Image Fit to Area:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                          {[
                            { id: 'contain', label: 'Contain' },
                            { id: 'cover', label: 'Fill & Crop' },
                            { id: 'fill', label: 'Stretch' },
                          ].map((m) => {
                            const isFitActive = (selectedElement.objectFit || 'contain') === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => updateElement(selectedElement.id, { objectFit: m.id as any })}
                                style={{
                                  padding: '5px 4px',
                                  borderRadius: '6px',
                                  border: isFitActive ? `1px solid ${c.primary}` : `1px solid ${c.border}`,
                                  backgroundColor: isFitActive ? 'rgba(37, 99, 235, 0.08)' : c.surfaceSubtle,
                                  color: isFitActive ? c.primary : c.text,
                                  fontSize: '10.5px',
                                  fontWeight: isFitActive ? 700 : 500,
                                  cursor: 'pointer',
                                }}
                              >
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* E-Paper Tone Filters */}
                      <div>
                        <span style={{ fontSize: '11px', color: c.textMuted, fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                          E-Paper Tone Rendering:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {[
                            { id: 'original', label: 'Full Color', req: 2 },
                            { id: 'black', label: 'E-Paper Black', req: 2 },
                            { id: 'red', label: 'Red Tint', req: 3 },
                            { id: 'yellow', label: 'Yellow Tint', req: 4 },
                          ]
                            .filter((t) => t.req <= activeModel.colorCapability)
                            .map((t) => {
                              const isToneActive = (selectedElement.imageTone || 'original') === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => updateElement(selectedElement.id, { imageTone: t.id as any })}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: isToneActive ? `1px solid ${c.primary}` : `1px solid ${c.border}`,
                                    backgroundColor: isToneActive ? 'rgba(37, 99, 235, 0.08)' : c.surfaceSubtle,
                                    color: isToneActive ? c.primary : c.text,
                                    fontSize: '11px',
                                    fontWeight: isToneActive ? 700 : 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {t.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Area Fit & Alignment Shortcuts for ANY element */}
                  <div style={{ padding: '10px', backgroundColor: c.surfaceSubtle, borderRadius: '8px', border: `1px solid ${c.border}` }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Fit to Area Shortcuts
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { x: 0, width: activeDims.width })}
                        title="Stretch element horizontally to 100% of tag width"
                        style={{
                          padding: '6px 6px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.text,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <Maximize2 size={11} />
                        <span>Fit Full Width</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { y: 0, height: activeDims.height })}
                        title="Stretch element vertically to 100% of tag height"
                        style={{
                          padding: '6px 6px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.text,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <Maximize2 size={11} />
                        <span>Fit Full Height</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { x: Math.max(0, Math.round((activeDims.width - (selectedElement.width || 60)) / 2)) })}
                        title="Center element horizontally"
                        style={{
                          padding: '6px 6px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.text,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Center X
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { y: Math.max(0, Math.round((activeDims.height - (selectedElement.height || 30)) / 2)) })}
                        title="Center element vertically"
                        style={{
                          padding: '6px 6px',
                          borderRadius: '6px',
                          border: `1px solid ${c.border}`,
                          backgroundColor: c.surface,
                          color: c.text,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Center Y
                      </button>
                    </div>
                  </div>

                  {/* Hardware Restricted E-Paper Ink Colors (2, 3, or 4 Colors) */}
                  {selectedElement.type !== 'image' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: c.text }}>
                          E-Paper Ink Color
                        </label>
                        <span style={{ fontSize: '10px', color: c.textMuted, fontWeight: 700 }}>
                          {activeModel.colorCapability} Colors
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availableColors.length}, 1fr)`, gap: '6px' }}>
                        {availableColors.map((col) => {
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
                  )}

                  {/* Badge Background Color (Restricted by hardware) */}
                  {selectedElement.type === 'badge' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                        Badge Background
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availableColors.length}, 1fr)`, gap: '6px' }}>
                        {availableColors.map((col) => {
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

                  {/* Font Size */}
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
                      Position on Tag (px)
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

                  {/* Dimensions (Width / Height) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                      Area Dimensions (px)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: c.textMuted, fontWeight: 700 }}>Width:</span>
                        <input
                          type="number"
                          value={selectedElement.width || (selectedElement.type === 'divider' ? 100 : 60)}
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
                      <div>
                        <span style={{ fontSize: '10px', color: c.textMuted, fontWeight: 700 }}>Height:</span>
                        <input
                          type="number"
                          value={selectedElement.height || (selectedElement.type === 'divider' ? 2 : 24)}
                          onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
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
                </div>
              ) : (
                /* No element selected: Show Hardware & Orientation Settings */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: c.surfaceSubtle, borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                      Hardware Tag Model
                    </div>
                    <CustomSelect
                      value={activeTemplate.modelId}
                      onChange={(val) => {
                        const updated = templates.map((t) => (t.id === activeTemplate.id ? { ...t, modelId: val } : t));
                        persistTemplates(updated);
                      }}
                      size="sm"
                      width="100%"
                      options={HIGHLIGHT_MODELS.map((m) => ({
                        value: m.id,
                        label: `${m.name}`,
                        badge: `${m.colorCapability}C`,
                        badgeColor: m.isFreezer ? '#0284c7' : m.colorCapability === 4 ? '#eab308' : '#dc2626',
                      }))}
                    />
                  </div>

                  {/* Orientation Switcher */}
                  <div style={{ padding: '12px', backgroundColor: c.surfaceSubtle, borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                      Display Orientation
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = templates.map((t) => (t.id === activeTemplate.id ? { ...t, orientation: 'horizontal' as OrientationType } : t));
                          persistTemplates(updated);
                        }}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: activeOrientation === 'horizontal' ? `2px solid ${c.primary}` : `1px solid ${c.border}`,
                          backgroundColor: activeOrientation === 'horizontal' ? 'rgba(37, 99, 235, 0.08)' : c.surface,
                          color: activeOrientation === 'horizontal' ? c.primary : c.textMuted,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ↔ Horizontal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = templates.map((t) => (t.id === activeTemplate.id ? { ...t, orientation: 'vertical' as OrientationType } : t));
                          persistTemplates(updated);
                        }}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: activeOrientation === 'vertical' ? `2px solid ${c.primary}` : `1px solid ${c.border}`,
                          backgroundColor: activeOrientation === 'vertical' ? 'rgba(37, 99, 235, 0.08)' : c.surface,
                          color: activeOrientation === 'vertical' ? c.primary : c.textMuted,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ↕ Vertical
                      </button>
                    </div>
                  </div>

                  {/* Layers List */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                      Template Layers ({activeTemplate.elements.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {activeTemplate.elements.map((el, i) => (
                        <div
                          key={el.id}
                          onClick={() => setSelectedElementId(el.id)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            backgroundColor: selectedElementId === el.id ? 'rgba(37, 99, 235, 0.1)' : c.surfaceSubtle,
                            border: selectedElementId === el.id ? `1px solid ${c.primary}` : `1px solid ${c.border}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11.5px',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: c.text, textTransform: 'capitalize' }}>
                            {i + 1}. {el.type} ({el.fieldBinding !== 'none' ? el.fieldBinding : 'static'})
                          </span>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: el.color }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: FULLSCREEN VIEW MODAL
      ========================================================================== */}
      {previewModalTemplate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setPreviewModalTemplateId(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${c.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: c.text, margin: 0 }}>
                  {previewModalTemplate.name}
                </h2>
                <span style={{ fontSize: '11.5px', color: c.textMuted }}>
                  Hardware: {previewModalTemplate.modelId} • {previewModalTemplate.orientation || 'horizontal'} orientation
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewModalTemplateId(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: c.textMuted }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div
              style={{
                padding: '40px 24px',
                backgroundColor: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '340px',
              }}
            >
              <MiniEslPreview
                template={previewModalTemplate}
                maxDisplayWidth={previewModalTemplate.orientation === 'vertical' ? 320 : 640}
                maxDisplayHeight={previewModalTemplate.orientation === 'vertical' ? 420 : 300}
              />
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: `1px solid ${c.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: c.surfaceSubtle,
              }}
            >
              <button
                type="button"
                onClick={() => handleExportSVG(previewModalTemplate)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: c.surface,
                  color: c.text,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={13} />
                <span>Export SVG</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewModalTemplateId(null)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: `1px solid ${c.border}`,
                    backgroundColor: 'transparent',
                    color: c.textMuted,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTemplateId(previewModalTemplate.id);
                    setSelectedElementId(null);
                    setPreviewModalTemplateId(null);
                    setViewMode('editor');
                  }}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: c.primary,
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit3 size={13} />
                  <span>Open in Editor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: INTERACTIVE IMAGE CROP MODAL
      ========================================================================== */}
      {cropTargetElement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setCropModalElementId(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: c.text, margin: 0 }}>
                  Crop Image Area
                </h3>
                <p style={{ fontSize: '12px', color: c.textMuted, margin: '2px 0 0 0' }}>
                  Adjust the crop region to fit your shelf tag display area
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCropModalElementId(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: c.textMuted }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Crop Aspect Ratio Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: c.textMuted }}>Crop Preset:</span>
              {[
                { label: 'Free (Custom)', rect: { x: 10, y: 10, width: 80, height: 80 } },
                { label: '1:1 Square', rect: { x: 15, y: 10, width: 70, height: 70 } },
                { label: 'Wide Banner', rect: { x: 5, y: 25, width: 90, height: 45 } },
                { label: 'Fit Tag Ratio', rect: { x: 5, y: 15, width: 90, height: Math.min(80, Math.round(90 * (activeDims.height / activeDims.width))) } },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setCropRect(p.rect)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${c.border}`,
                    backgroundColor: c.surfaceSubtle,
                    color: c.text,
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Visual Crop Stage */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '280px',
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
            >
              <img
                src={cropTargetElement.content}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />

              {/* Crop Box Overlay */}
              <div
                style={{
                  position: 'absolute',
                  left: `${cropRect.x}%`,
                  top: `${cropRect.y}%`,
                  width: `${cropRect.width}%`,
                  height: `${cropRect.height}%`,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                  border: '2px solid #3b82f6',
                  cursor: 'move',
                  boxSizing: 'border-box',
                }}
              >
                {/* 4 Corner Markers */}
                <div style={{ position: 'absolute', left: '-5px', top: '-5px', width: '10px', height: '10px', backgroundColor: '#3b82f6', border: '1px solid #ffffff' }} />
                <div style={{ position: 'absolute', right: '-5px', top: '-5px', width: '10px', height: '10px', backgroundColor: '#3b82f6', border: '1px solid #ffffff' }} />
                <div style={{ position: 'absolute', left: '-5px', bottom: '-5px', width: '10px', height: '10px', backgroundColor: '#3b82f6', border: '1px solid #ffffff' }} />
                <div style={{ position: 'absolute', right: '-5px', bottom: '-5px', width: '10px', height: '10px', backgroundColor: '#3b82f6', border: '1px solid #ffffff' }} />
              </div>
            </div>

            {/* Crop Sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted, fontWeight: 700 }}>Crop Width (%): {cropRect.width}%</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={cropRect.width}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    setCropRect((r) => ({ ...r, width: w, x: Math.min(r.x, 100 - w) }));
                  }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted, fontWeight: 700 }}>Crop Height (%): {cropRect.height}%</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={cropRect.height}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setCropRect((r) => ({ ...r, height: h, y: Math.min(r.y, 100 - h) }));
                  }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Crop Modal Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setCropModalElementId(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: 'transparent',
                  color: c.textMuted,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: c.primary,
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CREATE NEW TEMPLATE MODAL
      ========================================================================== */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: c.text, margin: 0 }}>
                  Create New ESL Template
                </h3>
                <p style={{ fontSize: '12px', color: c.textMuted, margin: '4px 0 0 0' }}>
                  Choose Highlight hardware model (2, 3, or 4 color, freezer) and orientation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: c.textMuted }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                Template Name
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Frozen Foods 2.13 Cold Storage"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${c.border}`,
                  fontSize: '13px',
                  color: c.text,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Orientation Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                Display Orientation
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div
                  onClick={() => setNewTemplateOrientation('horizontal')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: newTemplateOrientation === 'horizontal' ? `2px solid ${c.primary}` : `1px solid ${c.border}`,
                    backgroundColor: newTemplateOrientation === 'horizontal' ? 'rgba(37, 99, 235, 0.05)' : c.surfaceSubtle,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: c.text }}>↔ Horizontal (Landscape)</div>
                  <div style={{ fontSize: '11px', color: c.textMuted }}>Standard shelf rail mount</div>
                </div>

                <div
                  onClick={() => setNewTemplateOrientation('vertical')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: newTemplateOrientation === 'vertical' ? `2px solid ${c.primary}` : `1px solid ${c.border}`,
                    backgroundColor: newTemplateOrientation === 'vertical' ? 'rgba(37, 99, 235, 0.05)' : c.surfaceSubtle,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: c.text }}>↕ Vertical (Portrait)</div>
                  <div style={{ fontSize: '11px', color: c.textMuted }}>Peg-hook, bottle hanger, narrow facing</div>
                </div>
              </div>
            </div>

            {/* Hardware Model List */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: c.text, marginBottom: '6px' }}>
                Highlight Hardware Model
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {HIGHLIGHT_MODELS.map((m) => {
                  const isSelected = newTemplateModelId === m.id;
                  const dims = getModelDimensions(m, newTemplateOrientation);
                  return (
                    <div
                      key={m.id}
                      onClick={() => setNewTemplateModelId(m.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${c.primary}` : `1px solid ${c.border}`,
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : c.surfaceSubtle,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {m.isFreezer ? (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '10px', fontWeight: 800 }}>
                            FREEZER ❄
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: m.colorCapability === 4 ? '#fef08a' : '#fee2e2',
                              color: m.colorCapability === 4 ? '#854d0e' : '#991b1b',
                              fontSize: '10px',
                              fontWeight: 800,
                            }}
                          >
                            {m.colorCapability}C
                          </span>
                        )}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: c.text }}>{m.name}</div>
                          <div style={{ fontSize: '10.5px', color: c.textMuted }}>{m.description}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '11px', color: c.textMuted }}>
                        <div>{dims.width}×{dims.height}px</div>
                        <div>{m.dpi} DPI</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: 'transparent',
                  color: c.textMuted,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: c.primary,
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Create & Design
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
