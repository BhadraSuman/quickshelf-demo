import QRCode from 'qrcode';
import { TagData, EInkRefreshPhase } from '../types';

export interface TagDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export function getTagPixelDimensions(size: TagData['size']): TagDimensions {
  switch (size) {
    case '1.54':
      return { width: 220, height: 220, aspectRatio: 1.0 };
    case '2.13':
      return { width: 360, height: 176, aspectRatio: 360 / 176 };
    case '2.9':
      return { width: 416, height: 180, aspectRatio: 416 / 180 };
    case '4.2':
      return { width: 440, height: 320, aspectRatio: 440 / 320 };
    case '7.5':
      return { width: 640, height: 384, aspectRatio: 640 / 384 };
    default:
      return { width: 360, height: 176, aspectRatio: 360 / 176 };
  }
}

// 3 strict electrophoretic e-ink colors
export const EPAPER_COLORS = {
  paper: '#F2F0EA',
  black: '#111111',
  red: '#C4262E',
  bezel: '#23272D',
  bezelRim: '#353A42',
};

/**
 * Recalculates unit price dynamically when product price is updated
 */
export function computeEffectiveUnitPrice(
  originalUnitPrice: string,
  originalPrice: number,
  currentPrice: number
): string {
  if (!originalUnitPrice) return '';
  const match = originalUnitPrice.match(/^₹?\s*([\d,.]+)\s*\/\s*(.+)$/);
  if (!match) return originalUnitPrice;
  const originalUnitRate = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(originalUnitRate) || originalPrice <= 0) return originalUnitPrice;
  const currentUnitRate = (originalUnitRate / originalPrice) * currentPrice;
  const formattedRate = Math.round(currentUnitRate).toLocaleString('en-IN');
  return `₹${formattedRate} / ${match[2].trim()}`;
}

/**
 * Draws an authentic 3-color e-ink tag directly onto an HTML5 canvas.
 * Can be called during normal rendering or during 4-phase e-ink refresh.
 */
export async function renderTagToCanvas(
  canvas: HTMLCanvasElement,
  tag: TagData,
  phase: EInkRefreshPhase = 'settled',
  customPrice?: number,
  customPromo?: string
): Promise<void> {
  const { width, height } = getTagPixelDimensions(tag.size);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // -----------------------------------------------------------
  // E-INK REFRESH WAVE SIMULATION
  // -----------------------------------------------------------
  if (phase === 'blackout') {
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (phase === 'whiteout') {
    ctx.fillStyle = EPAPER_COLORS.paper;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (phase === 'redlayer') {
    // Red electrophoretic surge
    ctx.fillStyle = EPAPER_COLORS.paper;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = EPAPER_COLORS.red;
    ctx.fillRect(0, 0, width, Math.floor(height * 0.35));
    ctx.fillStyle = EPAPER_COLORS.red;
    ctx.font = 'bold 36px "Barlow Condensed", sans-serif';
    ctx.fillText('REFRESHING...', 20, height / 2 + 10);
    return;
  }

  // -----------------------------------------------------------
  // FINAL CRISP 3-COLOR E-INK RENDERING
  // -----------------------------------------------------------
  const effectivePrice = customPrice !== undefined ? customPrice : tag.price;
  const effectivePromo = customPromo !== undefined ? customPromo : tag.promo;
  const effectiveUnitPrice = computeEffectiveUnitPrice(tag.unitPrice, tag.price, effectivePrice);
  const isDiscounted = tag.mrp > effectivePrice;

  // 1. Paper Substrate
  ctx.fillStyle = EPAPER_COLORS.paper;
  ctx.fillRect(0, 0, width, height);

  // Outer border line
  ctx.strokeStyle = EPAPER_COLORS.black;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // 2. Promotional Red Header Band (if promo active)
  let contentStartY = 8;
  if (effectivePromo && effectivePromo.trim().length > 0) {
    const bannerHeight = tag.size === '1.54' ? 26 : 28;
    ctx.fillStyle = EPAPER_COLORS.red;
    ctx.fillRect(0, 0, width, bannerHeight);

    ctx.fillStyle = EPAPER_COLORS.paper;
    ctx.font = 'bold 13px "Manrope", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★ ${effectivePromo.toUpperCase()}`, 10, bannerHeight / 2);

    // Mini battery & signal in banner
    drawStatusIcons(ctx, width - 42, 6, tag.batteryPct, tag.signalDbm, true);

    contentStartY = bannerHeight + 6;
  } else {
    // Normal status icons in top right
    drawStatusIcons(ctx, width - 42, 6, tag.batteryPct, tag.signalDbm, false);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // 3. Product Names (English & Hindi)
  if (tag.size === '1.54') {
    // Compact 1.54" Layout (spices, medicine strips)
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = 'bold 12px "Manrope", sans-serif';
    ctx.fillText(truncateText(ctx, tag.nameEn, width - 20), 10, contentStartY);

    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = '500 11px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(truncateText(ctx, tag.nameHi, width - 20), 10, contentStartY + 16);

    // Large Price
    ctx.fillStyle = isDiscounted ? EPAPER_COLORS.red : EPAPER_COLORS.black;
    ctx.font = 'bold 34px "Barlow Condensed", sans-serif';
    ctx.fillText(`₹${effectivePrice.toLocaleString('en-IN')}`, 10, contentStartY + 38);

    // MRP struck-through
    if (isDiscounted) {
      ctx.fillStyle = EPAPER_COLORS.black;
      ctx.font = '11px "Manrope", sans-serif';
      const mrpText = `MRP: ₹${tag.mrp.toLocaleString('en-IN')}`;
      ctx.fillText(mrpText, 10, contentStartY + 74);
      const mrpWidth = ctx.measureText(mrpText).width;
      ctx.beginPath();
      ctx.moveTo(10, contentStartY + 80);
      ctx.lineTo(10 + mrpWidth, contentStartY + 80);
      ctx.strokeStyle = EPAPER_COLORS.red;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Metadata (Batch/EXP or unit)
    if (tag.expiryDate) {
      ctx.fillStyle = EPAPER_COLORS.red;
      ctx.font = 'bold 9px "Space Mono", monospace';
      ctx.fillText(tag.expiryDate, 10, contentStartY + 92);
    } else {
      ctx.fillStyle = EPAPER_COLORS.black;
      ctx.font = '10px "Space Mono", monospace';
      ctx.fillText(effectiveUnitPrice, 10, contentStartY + 92);
    }

    // Stock alert
    drawStockBadge(ctx, 10, height - 24, tag.stock);

    // Small QR
    await drawQrCode(ctx, tag.qrUrl, width - 58, height - 58, 48);

    // ID at bottom
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = '8px "Space Mono", monospace';
    ctx.fillText(tag.id, 10, height - 12);

  } else if (tag.size === '2.13' || tag.size === '2.9') {
    // Standard Supermarket / Fashion Layout
    // Left side: Names, Price, MRP, Stock
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = 'bold 14px "Manrope", sans-serif';
    ctx.fillText(truncateText(ctx, tag.nameEn, width - 90), 12, contentStartY);

    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = '500 12px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(truncateText(ctx, tag.nameHi, width - 90), 12, contentStartY + 18);

    // Price section
    const priceY = contentStartY + 42;
    ctx.fillStyle = isDiscounted ? EPAPER_COLORS.red : EPAPER_COLORS.black;
    ctx.font = 'bold 44px "Barlow Condensed", sans-serif';
    ctx.fillText(`₹${effectivePrice.toLocaleString('en-IN')}`, 12, priceY);

    const priceWidth = ctx.measureText(`₹${effectivePrice.toLocaleString('en-IN')}`).width;

    // MRP & Unit Price next to price
    if (isDiscounted) {
      ctx.fillStyle = EPAPER_COLORS.black;
      ctx.font = '600 12px "Manrope", sans-serif';
      const mrpText = `MRP ₹${tag.mrp.toLocaleString('en-IN')}`;
      ctx.fillText(mrpText, 18 + priceWidth, priceY + 6);
      const mrpWidth = ctx.measureText(mrpText).width;
      ctx.beginPath();
      ctx.moveTo(18 + priceWidth, priceY + 12);
      ctx.lineTo(18 + priceWidth + mrpWidth, priceY + 12);
      ctx.strokeStyle = EPAPER_COLORS.red;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '500 11px "Space Mono", monospace';
      ctx.fillText(effectiveUnitPrice, 18 + priceWidth, priceY + 24);
    } else {
      ctx.fillStyle = EPAPER_COLORS.black;
      ctx.font = '500 11px "Space Mono", monospace';
      ctx.fillText(effectiveUnitPrice, 18 + priceWidth, priceY + 14);
    }

    // Apparel size or batch pill
    if (tag.apparelSizes && tag.apparelSizes.length > 0) {
      ctx.fillStyle = EPAPER_COLORS.black;
      ctx.font = 'bold 10px "Space Mono", monospace';
      ctx.fillText(`SIZE: ${tag.apparelSizes.join(' ')}`, 12, height - 32);
    }

    // Stock alert
    drawStockBadge(ctx, 12, height - 20, tag.stock);

    // Right Side: Scannable QR Code & NFC touch symbol
    const qrSize = 64;
    const qrX = width - qrSize - 12;
    const qrY = contentStartY + 8;
    await drawQrCode(ctx, tag.qrUrl, qrX, qrY, qrSize);

    // NFC Touch glyph under QR
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = 'bold 9px "Space Mono", monospace';
    ctx.fillText('(( NFC ))', qrX + 8, qrY + qrSize + 4);

    // Tag ID in micro text
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = '8px "Space Mono", monospace';
    ctx.fillText(tag.id, qrX - 10, height - 12);

  } else {
    // 4.2" & 7.5" Large Fresh Produce & Sweets Display
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = 'bold 18px "Manrope", sans-serif';
    ctx.fillText(tag.nameEn, 16, contentStartY + 4);

    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = '600 15px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(tag.nameHi, 16, contentStartY + 28);

    // Made On / Freshness stamp (for sweets/bakery)
    if (tag.madeOn) {
      ctx.fillStyle = EPAPER_COLORS.red;
      ctx.font = 'bold 12px "Space Mono", monospace';
      ctx.fillText(`★ MADE: ${tag.madeOn} · BEST: ${tag.bestBefore}`, 16, contentStartY + 52);
    }

    // Huge Price
    const priceY = contentStartY + 80;
    ctx.fillStyle = isDiscounted ? EPAPER_COLORS.red : EPAPER_COLORS.black;
    ctx.font = 'bold 64px "Barlow Condensed", sans-serif';
    ctx.fillText(`₹${effectivePrice.toLocaleString('en-IN')}`, 16, priceY);

    const priceWidth = ctx.measureText(`₹${effectivePrice.toLocaleString('en-IN')}`).width;

    if (isDiscounted) {
      ctx.fillStyle = EPAPER_COLORS.black;
      ctx.font = '700 16px "Manrope", sans-serif';
      const mrpText = `MRP: ₹${tag.mrp.toLocaleString('en-IN')}`;
      ctx.fillText(mrpText, 24 + priceWidth, priceY + 12);
      const mrpWidth = ctx.measureText(mrpText).width;
      ctx.beginPath();
      ctx.moveTo(24 + priceWidth, priceY + 20);
      ctx.lineTo(24 + priceWidth + mrpWidth, priceY + 20);
      ctx.strokeStyle = EPAPER_COLORS.red;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '500 14px "Space Mono", monospace';
      ctx.fillText(effectiveUnitPrice, 24 + priceWidth, priceY + 36);
    } else {
      ctx.fillStyle = EPAPER_COLORS.black;
      ctx.font = '500 14px "Space Mono", monospace';
      ctx.fillText(effectiveUnitPrice, 24 + priceWidth, priceY + 24);
    }

    // QR Code
    const qrSize = 96;
    await drawQrCode(ctx, tag.qrUrl, width - qrSize - 20, contentStartY + 20, qrSize);

    // Stock alert
    drawStockBadge(ctx, 16, height - 32, tag.stock);

    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = '10px "Space Mono", monospace';
    ctx.fillText(tag.id, width - qrSize - 30, height - 16);
  }
}

/**
 * Draws battery and BLE signal meters
 */
function drawStatusIcons(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  batteryPct: number,
  signalDbm: number,
  isInRedHeader: boolean
) {
  const fgColor = isInRedHeader ? EPAPER_COLORS.paper : EPAPER_COLORS.black;

  // Signal Bars (3 bars)
  ctx.fillStyle = fgColor;
  const bars = signalDbm > -60 ? 3 : signalDbm > -75 ? 2 : 1;
  ctx.fillRect(x, y + 8, 2, 4);
  if (bars >= 2) ctx.fillRect(x + 3, y + 5, 2, 7);
  if (bars >= 3) ctx.fillRect(x + 6, y + 2, 2, 10);

  // Battery Body
  ctx.strokeStyle = fgColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 12, y + 3, 14, 8);
  ctx.fillRect(x + 26, y + 5, 2, 4); // Battery tip

  // Battery Fill
  const fillWidth = Math.max(1, Math.round((batteryPct / 100) * 11));
  ctx.fillStyle = batteryPct < 20 && !isInRedHeader ? EPAPER_COLORS.red : fgColor;
  ctx.fillRect(x + 14, y + 5, fillWidth, 5);
}

/**
 * Draws real scannable QR Code
 */
async function drawQrCode(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  size: number
) {
  try {
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, url, {
      width: size,
      margin: 0,
      color: {
        dark: EPAPER_COLORS.black,
        light: EPAPER_COLORS.paper,
      },
    });
    ctx.drawImage(qrCanvas, x, y, size, size);
  } catch (_e) {
    // Fallback QR wireframe
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.strokeRect(x, y, size, size);
    ctx.fillRect(x + 4, y + 4, size / 3, size / 3);
    ctx.fillRect(x + size - size / 3 - 4, y + 4, size / 3, size / 3);
    ctx.fillRect(x + 4, y + size - size / 3 - 4, size / 3, size / 3);
  }
}

/**
 * Draws stock badge (Low Stock / Out of Stock)
 */
function drawStockBadge(ctx: CanvasRenderingContext2D, x: number, y: number, stock: number) {
  if (stock === 0) {
    ctx.fillStyle = EPAPER_COLORS.red;
    ctx.font = 'bold 10px "Manrope", sans-serif';
    ctx.fillText('● OUT OF STOCK', x, y);
  } else if (stock <= 10) {
    ctx.fillStyle = EPAPER_COLORS.red;
    ctx.font = 'bold 10px "Manrope", sans-serif';
    ctx.fillText(`● ONLY ${stock} LEFT`, x, y);
  } else {
    ctx.fillStyle = EPAPER_COLORS.black;
    ctx.font = '9px "Space Mono", monospace';
    ctx.fillText(`Stock: ${stock} units`, x, y);
  }
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 3 && ctx.measureText(str + '...').width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + '...';
}
