/**
 * Highlight ESL API (V5.0.17) TypeScript Definitions
 */

export interface HighlightConfig {
  appKey: string;
  appSecret: string;
  endpoint?: string;
  lang?: 'en_US' | 'zh-CN';
  timeoutMs?: number;
}

export interface HighlightRawResponse<T = any> {
  code?: number | string;
  status?: number | string;
  msg: string;
  data: T;
  total?: number | null;
}

export interface HighlightApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  total?: number | null;
  raw: HighlightRawResponse<T>;
}

// ---------------------------------------------------------------------------
// 4. Product Interfaces
// ---------------------------------------------------------------------------

export interface ProductCustomFeatures {
  custFeature1?: string;
  custFeature2?: string;
  custFeature3?: string;
  custFeature4?: string;
  custFeature5?: string;
  custFeature6?: string;
  custFeature7?: string;
  custFeature8?: string;
  custFeature9?: string;
  custFeature10?: string;
  custFeature11?: string;
  custFeature12?: string;
  custFeature13?: string;
  custFeature14?: string;
  custFeature15?: string;
  custFeature16?: string;
  custFeature17?: string;
  custFeature18?: string;
  custFeature19?: string;
  custFeature20?: string;
  custFeature21?: string;
  custFeature22?: string;
  custFeature23?: string;
  custFeature24?: string;
  custFeature25?: string;
  custFeature26?: string;
  custFeature27?: string;
  custFeature28?: string;
  custFeature29?: string;
  custFeature30?: string;
  custFeature31?: string;
  custFeature32?: string;
  custFeature33?: string;
  custFeature34?: string;
  custFeature35?: string;
  custFeature36?: string;
  custFeature37?: string;
  custFeature38?: string;
  custFeature39?: string;
  custFeature40?: string;
  custFeature41?: string;
  custFeature42?: string;
  custFeature43?: string;
  custFeature44?: string;
  custFeature45?: string;
  custFeature46?: string;
  custFeature47?: string;
  custFeature48?: string;
  custFeature49?: string;
  custFeature50?: string;
}

export interface ProductDTO extends ProductCustomFeatures {
  /** Unique product ID in your database / SKU / Barcode (1~32 chars) */
  uniqueId: string;
  /** Product name (1~256 chars) */
  prodName?: string;
  /** Product landing page URL or QR URL (1~128 chars) */
  detailUrl?: string;
  /** Image or video URLs (0~5 items) */
  picUrlList?: string[];
  /** Product unit e.g. "kg", "pcs", "bags" (1~32 chars) */
  commodityUnit?: string;
  /** Selling price (up to 16 digits, 5 decimal places) */
  price?: number | string;
  /** Price currency symbol e.g. "₹", "$", "€" */
  priceUnit?: string;
  /** Copywriting / promo description (up to 1024 chars) */
  copyWriting?: string;
  /** Promo start time "YYYY-MM-DD HH:mm:ss" */
  proStartTime?: string;
  /** Promo end time "YYYY-MM-DD HH:mm:ss" */
  proEndTime?: string;
}

export interface ProductApiDTO extends ProductDTO {
  id?: number;
  companyId?: string | null;
  organizationId?: string | null;
  barCode?: string | null;
  createdTime?: string | null;
  lastModifiedTime?: string | null;
  /** List of ESL device numbers currently bound to this product */
  bindedDeviceList?: string[];
  isRight?: any;
}

// ---------------------------------------------------------------------------
// 5. AP Gateway Interfaces
// ---------------------------------------------------------------------------

export interface StationDTO {
  /** AP hardware code / MAC (1~12 chars) */
  stationId: string;
  /** AP human-readable name (1~64 chars) */
  stationName?: string;
  organizationId?: number | string | null;
}

// ---------------------------------------------------------------------------
// 6. Device (ESL) Interfaces
// ---------------------------------------------------------------------------

export type SendStatus = 
  | 0 // Unbound
  | 1 // To be sent (Queued)
  | 2 // Pending (Transmitting OTA over RF)
  | 3 // Incomplete (Failed / Retry)
  | 4; // Completed (ACK received, screen refreshed)

export interface DeviceApiDTO {
  id?: number;
  companyId?: string | null;
  /** Device hardware code / MAC (1~60 chars) */
  deviceNumber: string;
  /** Device alias */
  deviceName?: string;
  /** Associated Base Station MAC */
  stationId?: string;
  stationName?: string;
  deviceGroupName?: string | null;
  /** Hardware model type code */
  type?: string | number;
  /** Device status: "1" = Online, "-" = Offline */
  shelfDeviceStatus?: string;
  powerValue?: number | null;
  /** Battery level (typically 1 to 5) */
  powerLevel?: number | null;
  /** RF Signal strength (RSSI) */
  signal?: number | null;
  /** IDs of templates supported by this hardware form factor */
  templateList?: number[] | null;
  templateName?: string | null;
  productCount?: number | null;
  organizationName?: string | null;
  sendStatus?: SendStatus | null;
  pageNum?: number | null;
  pageSize?: number | null;
}

// ---------------------------------------------------------------------------
// 7. Template Interfaces
// ---------------------------------------------------------------------------

export type TemplateColorMode =
  | '0' // Black & White
  | '1' // Black, White & Red (3-color BWR)
  | '2' // Black, White & Yellow (3-color BWY)
  | '4' // Multicolor
  | '5'; // Black, White, Red & Yellow (4-color BWRY)

export interface TemplateApiDTO {
  templateId: number;
  templateName: string;
  deviceType: string;
  /** 1 = Landscape, 2 = Portrait */
  templateLayout: '1' | '2' | string;
  color: TemplateColorMode;
  /** Screen diagonal size e.g. "1.54", "2.13", "2.9", "4.2", "5.8", "7.5", "13.3" */
  eslSize: string;
  /** Aspect ratio width,height e.g. "296,128", "648,480" */
  templateRatio: string;
  sizeWidth: number;
  sizeHeight: number;
  /** Number of products displayed on one screen (cardCount) */
  cardCount: number;
  /** HTML layout rendered to e-paper bitmap */
  templateSampleHtml: string;
  bindDeviceNum?: number;
  organizationName?: string | null;
  organizationId?: number | string | null;
  createdUser?: string;
  modifiedTime?: string;
  defaultTemplate?: boolean | null;
  isOperate?: boolean | null;
  typeId?: number;
  outOrgId?: any;
}

// ---------------------------------------------------------------------------
// 8. Product Display Binding Interfaces
// ---------------------------------------------------------------------------

export interface BindingPosDTO {
  /** Target ESL device code / MAC */
  deviceNumber: string;
  /** Template ID to apply */
  templateId: number;
  /** List of product uniqueIds to bind (must match template cardCount) */
  uniqueIdList: string[];
  /** Optional AP code routing */
  stationId?: string;
}

export interface UnboundPosDTO {
  /** Target ESL device code / MAC */
  deviceNumber: string;
  /** Optional AP code */
  stationId?: string;
}

// ---------------------------------------------------------------------------
// 9. ESL LED Flash Interfaces (Pick-to-Light / Locate) - Highlight V5.0.25 §7.3 & §7.4
// ---------------------------------------------------------------------------

export type FlashColor =
  | 1 // Red
  | 2 // Green
  | 3 // Blue
  | 4 // Yellow
  | 5 // Orange
  | 6 // Cyan
  | 7 // Purple
  | 8; // White

export interface ESLFlashDTO {
  /** Target ESL device code list (e.g. ['8003152970']) */
  deviceNumberList?: string[];
  /** Target product uniqueId list */
  uniqueIdList?: string[];
  /** 1=Red, 2=Green, 3=Blue, 4=Yellow, 5=Orange, 6=Cyan, 7=Purple, 8=White */
  lightColor: FlashColor | number;
  /** Flash time in seconds (max 14400s / 4 hours) */
  lightTime: number;
}

export interface ESLFlashStopDTO {
  /** Target ESL device code list. If both empty, stops all flashing tags under org */
  deviceNumberList?: string[];
  /** Target product uniqueId list */
  uniqueIdList?: string[];
}

