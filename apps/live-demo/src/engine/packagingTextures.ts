import * as THREE from 'three';

/**
 * Generates realistic procedural canvas textures for Indian FMCG retail packaging.
 * Generates once in memory with 0 network calls, resulting in crisp PBR materials.
 */

// 1. Supermarket Polished Terrazzo / Large Format Floor Tile Texture
export function generateFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base warm light-grey / ivory tile
  ctx.fillStyle = '#EBE9E1';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle marble / terrazzo mineral flecks
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 1.8 + 0.5;
    const alpha = Math.random() * 0.15 + 0.03;
    const isDark = Math.random() > 0.4;
    ctx.fillStyle = isDark ? `rgba(60, 64, 72, ${alpha})` : `rgba(255, 255, 255, ${alpha * 1.5})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2x2 large format 60cm retail tiles with crisp grout lines
  ctx.strokeStyle = '#D1CEC4';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Subtle tile bevel inner shadow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.strokeRect(260, 4, 248, 248);
  ctx.strokeRect(4, 260, 248, 248);
  ctx.strokeRect(260, 260, 248, 248);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

// 2. Perforated Retail Pegboard Back Panel Texture
export function generatePegboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#E2E5EB';
  ctx.fillRect(0, 0, 128, 128);

  // Perforated hole grid
  const holeSpacing = 16;
  for (let x = 8; x < 128; x += holeSpacing) {
    for (let y = 8; y < 128; y += holeSpacing) {
      // Dark hole shadow
      ctx.fillStyle = '#1E232A';
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Lower highlight rim for 3D depth
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, y + 0.8, 1.2, 0, Math.PI);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 18);
  return texture;
}

// 3. Procedural Atta / Wheat Flour Bag Texture (Burlap + Wheat Graphics)
export function generateAttaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  // Warm textured paper bag background
  ctx.fillStyle = '#F4EDE2';
  ctx.fillRect(0, 0, 256, 340);

  // Top sewn-stitch seam
  ctx.fillStyle = '#D97706';
  ctx.fillRect(0, 0, 256, 18);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('••••••••••••••••••••••••••••••••', 6, 13);

  // Brand Header Band (Deep terracotta red)
  ctx.fillStyle = '#991B1B';
  ctx.fillRect(0, 18, 256, 68);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 24px "Manrope", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ANNAPURNA', 128, 48);

  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 12px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('शुद्ध चक्की ताजा आटा', 128, 70);

  // Center Wheat Graphic Badge
  ctx.fillStyle = '#FEF3C7';
  ctx.beginPath();
  ctx.arc(128, 150, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Wheat sheaf icon
  ctx.font = '36px sans-serif';
  ctx.fillText('🌾', 128, 162);

  // Description
  ctx.fillStyle = '#1C1917';
  ctx.font = '800 16px "Manrope", sans-serif';
  ctx.fillText('100% SHUDDH ATTA', 128, 222);

  ctx.fillStyle = '#78350F';
  ctx.font = '600 11px sans-serif';
  ctx.fillText('0% Maida · Traditional Stone Ground', 128, 240);

  // Bottom Weight & Nutrition Badges
  ctx.fillStyle = '#065F46';
  ctx.fillRect(20, 265, 96, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('NET WT: 5 KG', 68, 282);

  ctx.fillStyle = '#991B1B';
  ctx.fillRect(140, 265, 96, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('FSSAI CERTIFIED', 188, 282);

  // Barcode line
  ctx.fillStyle = '#000000';
  for (let i = 40; i < 216; i += Math.random() * 5 + 3) {
    ctx.fillRect(i, 308, Math.random() > 0.5 ? 2 : 1, 18);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 4. Procedural Basmati Rice Regal Bag Texture (Royal Navy & Gold)
export function generateBasmatiTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  // Regal Navy Blue
  ctx.fillStyle = '#0F1E36';
  ctx.fillRect(0, 0, 256, 340);

  // Gold ornate border
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 324);
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1;
  ctx.strokeRect(13, 13, 230, 314);

  // Top Regal Crown / Logo
  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'center';
  ctx.font = '28px sans-serif';
  ctx.fillText('👑', 128, 48);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 20px "Barlow Condensed", sans-serif';
  ctx.fillText('ROYAL BASMATI', 128, 76);

  ctx.fillStyle = '#FDE68A';
  ctx.font = '600 12px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('शाही दावत बासमती चावल', 128, 96);

  // Transparent rice grain window mockup
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(32, 114, 192, 100, 16);
  ctx.fill();

  // Grains inside window
  ctx.fillStyle = '#F3E8D0';
  for (let i = 0; i < 350; i++) {
    const gx = 40 + Math.random() * 176;
    const gy = 120 + Math.random() * 88;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillRect(-4, -1.2, 8, 2.4);
    ctx.restore();
  }

  // Window border
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Aging statement
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 12px "Manrope", sans-serif';
  ctx.fillText('★ 2 YEARS NATURALLY AGED ★', 128, 240);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '500 11px sans-serif';
  ctx.fillText('Long Slender Grains · Pristine Aroma', 128, 258);

  // Bottom Badge
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(36, 278, 184, 28);
  ctx.fillStyle = '#0F1E36';
  ctx.font = '800 12px "Manrope", sans-serif';
  ctx.fillText('PREMIUM FEAST PACK · 5 KG', 128, 296);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 5. Procedural Dal & Pulses Standing Pouch (Clear Window + Lentils)
export function generateDalTexture(type: 'toor' | 'moong'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  const isToor = type === 'toor';
  const brandColor = isToor ? '#B45309' : '#047857';
  const grainColor = isToor ? '#FBBF24' : '#10B981';
  const nameEn = isToor ? 'DESI TOOR DAL' : 'ORGANIC MOONG DAL';
  const nameHi = isToor ? 'अरहर दाल (अनपॉलिश्ड)' : 'मूँग दाल (छिलका रहित)';

  // Foil laminate base
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 256, 340);

  // Top heat-seal lines
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(0, 0, 256, 12);
  for (let x = 0; x < 256; x += 6) {
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(x, 2, 2, 8);
  }

  // Header band
  ctx.fillStyle = brandColor;
  ctx.fillRect(0, 16, 256, 68);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 18px "Manrope", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(nameEn, 128, 44);

  ctx.fillStyle = '#FEF3C7';
  ctx.font = '600 12px "Noto Sans Devanagari", sans-serif';
  ctx.fillText(nameHi, 128, 66);

  // Clear Lentil View Window
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(128, 170, 84, 64, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw simulated lentil grains
  ctx.fillStyle = grainColor;
  for (let i = 0; i < 400; i++) {
    const r = Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const lx = 128 + r * Math.cos(theta) * 1.2;
    const ly = 170 + r * Math.sin(theta) * 0.9;
    ctx.beginPath();
    ctx.arc(lx, ly, isToor ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Window border
  ctx.strokeStyle = brandColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(128, 170, 84, 64, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Benefit badge
  ctx.fillStyle = brandColor;
  ctx.font = 'bold 12px "Manrope", sans-serif';
  ctx.fillText('HIGH PROTEIN · UNPOLISHED', 128, 260);

  // Net Weight
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 14px "Space Mono", monospace';
  ctx.fillText('NET WT: 1 KG', 128, 290);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 6. Procedural Spices Carton Box (Everest / MDH Style Bold Saffron & Emerald)
export function generateSpiceBoxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  // Deep Royal Saffron / Crimson
  ctx.fillStyle = '#991B1B';
  ctx.fillRect(0, 0, 256, 340);

  // Gold filigree edge
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 244, 328);

  // Brand Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 24px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EVEREST MASALA', 128, 45);

  // Product Name
  ctx.fillStyle = '#FEF08A';
  ctx.font = '900 20px "Manrope", sans-serif';
  ctx.fillText('ROYAL GARAM MASALA', 128, 80);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('शाही गरम मसाला', 128, 104);

  // Dish graphic circle mockup
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.arc(128, 180, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Spices icon
  ctx.font = '40px sans-serif';
  ctx.fillText('🍲', 128, 194);

  // Tagline
  ctx.fillStyle = '#FEF3C7';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('BLENDED FROM 18 ROASTED SPICES', 128, 260);

  // Net Weight & Price
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 12px "Space Mono", monospace';
  ctx.fillText('NET WT: 100g', 128, 288);

  // Barcode
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(40, 304, 176, 22);
  ctx.fillStyle = '#000000';
  for (let i = 50; i < 206; i += Math.random() * 4 + 2) {
    ctx.fillRect(i, 306, 1.5, 18);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 7. Procedural Mustard Oil & Ghee Bottle Label
export function generateOilLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Amber golden yellow
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, 0, 256, 128);

  // Red brand bar
  ctx.fillStyle = '#991B1B';
  ctx.fillRect(0, 0, 256, 32);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 14px "Manrope", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FORTUNE KACHI GHANI', 128, 21);

  ctx.fillStyle = '#1C1917';
  ctx.font = '800 13px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('शुद्ध सरसों का तेल (1L)', 128, 56);

  ctx.fillStyle = '#78350F';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('NATURALLY COLD PRESSED · PURE MUSTARD', 128, 80);

  // Agmark Grade 1 stamp
  ctx.fillStyle = '#047857';
  ctx.fillRect(20, 95, 216, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('★ AGMARK GRADE 1 · 100% PURITY GUARANTEED ★', 128, 108);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 8. Procedural Kaju Katli (Silver Vark / Sweets) Texture
export function generateKajuKatliTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Cream cashew diamond base
  ctx.fillStyle = '#F4EDE2';
  ctx.fillRect(0, 0, 256, 256);

  // Diamond grid lines
  ctx.strokeStyle = '#D7C7B2';
  ctx.lineWidth = 1.5;
  for (let i = -256; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 256, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }

  // Silver leaf (vark) patches with metallic sheen
  for (let i = 0; i < 24; i++) {
    const vx = Math.random() * 200 + 20;
    const vy = Math.random() * 200 + 20;
    const grad = ctx.createRadialGradient(vx, vy, 2, vx, vy, 18);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(226, 232, 240, 0.8)');
    grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(vx, vy, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
