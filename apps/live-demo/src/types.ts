export type TagSize = '1.54' | '2.13' | '2.9' | '4.2' | '7.5';

export interface TagData {
  id: string; // e.g. QS-2.13-890123
  size: TagSize;
  sku: string;
  nameEn: string;
  nameHi: string;
  category: string;
  price: number; // in Rupees
  mrp: number;
  unitPrice: string; // e.g. "₹145 / kg"
  promo?: string; // e.g. "SAVE ₹25", "20% OFF", "BOGO"
  stock: number;
  qrUrl: string;
  batteryPct: number; // 0-100
  signalDbm: number; // e.g. -54
  aisleId: string;
  shelfTier: number; // 1 (top) to 4 (bottom)
  positionX: number; // relative position along shelf
  
  // Vertical specific metadata
  batchNo?: string;
  expiryDate?: string;
  apparelSizes?: string[];
  fabric?: string;
  madeOn?: string;
  bestBefore?: string;
  isPerishable?: boolean;
}

export interface ShelfData {
  id: string;
  tierNumber: number;
  name: string;
  tags: TagData[];
}

export interface AisleData {
  id: string;
  number: number;
  nameEn: string;
  nameHi: string;
  categoryDesc: string;
  shelves: ShelfData[];
  apHardwareId: string;
}

export interface StoreData {
  id: string;
  name: string;
  tagline: string;
  city: string;
  state: string;
  type: 'supermarket' | 'pharmacy' | 'fashion' | 'sweets';
  typeLabel: string;
  totalTags: number;
  activeGateways: number;
  defaultRssi: number;
  thumbnailUrl: string;
  description: string;
  aisles: AisleData[];
  defaultCameraPos: [number, number, number];
  defaultLookAt: [number, number, number];
  tourStops: {
    tagId: string;
    cameraPos: [number, number, number];
    lookAt: [number, number, number];
    narrative: string;
    autoAction?: 'price_change' | 'promo' | 'led_find' | 'qr_open';
  }[];
}

export interface PriceUpdateLog {
  id: string;
  timestamp: string;
  tagId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  oldMrp: number;
  newMrp: number;
  promo?: string;
  syncTimeMs: number;
  gatewayId: string;
}

export type EInkRefreshPhase = 'idle' | 'blackout' | 'whiteout' | 'redlayer' | 'settled';
