import React, { useState, useEffect, useRef } from 'react';
import { TagData, PriceUpdateLog, EInkRefreshPhase } from '../types';
import { renderTagToCanvas, getTagPixelDimensions } from '../engine/epaperRenderer';

interface PosConsoleDrawerProps {
  tag: TagData | null;
  onClose: () => void;
  onPushPrice: (tagId: string, newPrice: number, newMrp: number, promo?: string) => void;
  onFlashLed: (tagId: string) => void;
  onBulkDiscountAisle: (percent: number) => void;
  onRunEveningMarkdown: () => void;
  isSweetsStore: boolean;
  activityLogs: PriceUpdateLog[];
  isRefreshing: boolean;
  refreshPhase: EInkRefreshPhase;
}

export const PosConsoleDrawer: React.FC<PosConsoleDrawerProps> = ({
  tag,
  onClose,
  onPushPrice,
  onFlashLed,
  onBulkDiscountAisle,
  onRunEveningMarkdown,
  isSweetsStore,
  activityLogs,
  isRefreshing,
  refreshPhase,
}) => {
  const [priceInput, setPriceInput] = useState<number>(0);
  const [mrpInput, setMrpInput] = useState<number>(0);
  const [promoInput, setPromoInput] = useState<string>('');
  const [stockInput, setStockInput] = useState<number>(0);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync inputs with selected tag
  useEffect(() => {
    if (tag) {
      setPriceInput(tag.price);
      setMrpInput(tag.mrp);
      setPromoInput(tag.promo || '');
      setStockInput(tag.stock);
    }
  }, [tag]);

  // Update 2D Canvas Preview in drawer
  useEffect(() => {
    if (tag && previewCanvasRef.current) {
      renderTagToCanvas(
        previewCanvasRef.current,
        tag,
        isRefreshing ? refreshPhase : 'settled',
        priceInput,
        promoInput
      );
    }
  }, [tag, priceInput, promoInput, isRefreshing, refreshPhase]);

  if (!tag) return null;

  const discountPercent = mrpInput > 0 ? Math.round(((mrpInput - priceInput) / mrpInput) * 100) : 0;

  const handleApplyPromoPreset = (preset: string) => {
    if (preset === 'SAVE25') {
      const newP = Math.max(1, mrpInput - 25);
      setPriceInput(newP);
      setPromoInput('SAVE ₹25');
    } else if (preset === '15OFF') {
      const newP = Math.round(mrpInput * 0.85);
      setPriceInput(newP);
      setPromoInput('15% OFF');
    } else if (preset === 'BOGO') {
      setPromoInput('BUY 1 GET 1');
    } else if (preset === 'CLEARANCE') {
      const newP = Math.round(mrpInput * 0.6);
      setPriceInput(newP);
      setPromoInput('60% CLEARANCE');
    }
  };

  const handlePush = () => {
    onPushPrice(tag.id, priceInput, mrpInput, promoInput);
  };

  return (
    <aside className="fixed top-16 right-0 w-full sm:w-[420px] h-[calc(100vh-64px)] z-40 bg-[#FFFFFF] border-l border-[#E8E6DF] shadow-[-8px_0_24px_-4px_rgba(31,35,40,0.12)] flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAFAF7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-[#181C21]">Store POS Console</span>
            <span className="px-2 py-0.5 rounded-full bg-[#D8E5E3] text-[#006153] text-[10px] font-bold font-mono">
              BLE 5.4 OTA
            </span>
          </div>
          <p className="text-xs text-[#656F7D] mt-0.5">Direct over-the-air price rewrite simulation</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-[#E5E8EF] flex items-center justify-center text-[#656F7D] hover:text-[#181C21] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Hardware Status & Telemetry Pill */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F4FA] border border-[#E8E6DF] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#181C21]">{tag.id}</span>
            <span className="px-1.5 py-0.5 rounded bg-[#E5E8EF] text-[10px] font-bold">
              {tag.size}" E-Ink
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-[#656F7D]">
            <span>🔋 {tag.batteryPct}%</span>
            <span>📶 {tag.signalDbm} dBm</span>
          </div>
        </div>

        {/* Live E-Ink Canvas Preview Card */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#656F7D] self-start">
            Live Hardware Screen State
          </span>
          <div className="relative p-2.5 rounded-xl bg-[#23272D] shadow-lg border border-[#353A42] flex items-center justify-center max-w-full overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              className="rounded-sm shadow-inner max-w-full h-auto object-contain"
            />
            {isRefreshing && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white rounded-xl">
                <span className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin mb-1" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Phase: {refreshPhase}
                </span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-[#656F7D] font-mono">
            3-Color Electrophoretic BWR Display (Paper · Black · Red)
          </span>
        </div>

        {/* Pricing & Commercial Inputs */}
        <div className="flex flex-col gap-3.5 bg-[#FAFAF7] p-4 rounded-xl border border-[#E8E6DF]">
          <span className="text-xs font-bold text-[#181C21]">Commercial Price & MRP</span>

          <div className="grid grid-cols-2 gap-3">
            {/* Selling Price */}
            <div>
              <label className="text-[11px] font-semibold text-[#656F7D] block mb-1">
                Selling Price (₹)
              </label>
              <div className="flex items-center bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#006153]">
                <span className="font-bold text-[#181C21] mr-1">₹</span>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(parseInt(e.target.value) || 0)}
                  className="w-full font-bold text-sm text-[#181C21] bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* MRP */}
            <div>
              <label className="text-[11px] font-semibold text-[#656F7D] block mb-1">
                Maximum Retail Price (₹)
              </label>
              <div className="flex items-center bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#006153]">
                <span className="font-bold text-[#656F7D] mr-1">₹</span>
                <input
                  type="number"
                  value={mrpInput}
                  onChange={(e) => setMrpInput(parseInt(e.target.value) || 0)}
                  className="w-full font-bold text-sm text-[#656F7D] bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Discount Pill */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#656F7D]">Calculated Discount:</span>
            <span className={`font-bold font-mono ${discountPercent > 0 ? 'text-[#C4262E]' : 'text-[#656F7D]'}`}>
              {discountPercent > 0 ? `${discountPercent}% OFF (Savings: ₹${mrpInput - priceInput})` : 'At Standard MRP'}
            </span>
          </div>

          {/* Promo Header Customization */}
          <div>
            <label className="text-[11px] font-semibold text-[#656F7D] block mb-1">
              Red Promo Banner (Top Band)
            </label>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="e.g. SAVE ₹50, 20% OFF, BOGO"
              className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#181C21] focus:outline-none focus:ring-2 focus:ring-[#006153]"
            />
          </div>

          {/* Promo Presets */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPromoPreset('SAVE25')}
              className="px-2 py-1 rounded bg-white hover:bg-[#E5E8EF] border border-[#CBD5E1] text-[10px] font-semibold text-[#181C21]"
            >
              SAVE ₹25
            </button>
            <button
              type="button"
              onClick={() => handleApplyPromoPreset('15OFF')}
              className="px-2 py-1 rounded bg-white hover:bg-[#E5E8EF] border border-[#CBD5E1] text-[10px] font-semibold text-[#181C21]"
            >
              15% OFF
            </button>
            <button
              type="button"
              onClick={() => handleApplyPromoPreset('BOGO')}
              className="px-2 py-1 rounded bg-white hover:bg-[#E5E8EF] border border-[#CBD5E1] text-[10px] font-semibold text-[#181C21]"
            >
              BOGO
            </button>
            <button
              type="button"
              onClick={() => handleApplyPromoPreset('CLEARANCE')}
              className="px-2 py-1 rounded bg-[#FDF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5] text-[10px] font-bold text-[#C4262E]"
            >
              Clearance 60%
            </button>
          </div>
        </div>

        {/* Batch Operations & Store Specific Triggers */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[#181C21]">Store-Wide Batch Operations</span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onBulkDiscountAisle(10)}
              className="px-3 py-2 rounded-xl bg-[#F1F4FA] hover:bg-[#E5E8EF] border border-[#CBD5E1] text-xs font-semibold text-[#181C21] transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-[#006153]">percent</span>
              <span>10% Off Aisle</span>
            </button>

            <button
              onClick={() => onFlashLed(tag.id)}
              className="px-3 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#6EE7B7] text-xs font-bold text-[#047857] transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-[#10B981] animate-pulse">lightbulb</span>
              <span>Blink LED (10s)</span>
            </button>
          </div>

          {/* Sweets 8 PM Markdown Special */}
          {isSweetsStore && (
            <button
              onClick={onRunEveningMarkdown}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FCD34D] text-xs font-bold text-[#B45309] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">nightlight</span>
              <span>Run 8 PM Evening Markdown (-25% All Sweets)</span>
            </button>
          )}
        </div>

        {/* Activity Log Audit */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#181C21]">RF Transmission Log</span>
            <span className="text-[10px] text-[#656F7D] font-mono">Last 5 Events</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-[#656F7D] italic p-2 bg-[#FAFAF7] rounded-lg">
                No recent price updates in this session.
              </p>
            ) : (
              activityLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-[#FAFAF7] border border-[#E8E6DF] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#181C21] block line-clamp-1">
                      {log.productName}
                    </span>
                    <span className="text-[10px] text-[#656F7D] font-mono">
                      ₹{log.oldPrice} ➔ ₹{log.newPrice} · {log.syncTimeMs}ms
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D8E5E3] text-[#006153] font-bold font-mono">
                    ACKED
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Drawer Footer CTA */}
      <div className="p-4 border-t border-[#E8E6DF] bg-[#FAFAF7] flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F1F4FA] text-xs font-semibold text-[#181C21] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handlePush}
          disabled={isRefreshing}
          className="flex-2 py-2.5 px-5 rounded-xl bg-[#006153] hover:bg-[#0B6356] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span>{isRefreshing ? 'Dispatching...' : 'Push Price to Tag ➔'}</span>
        </button>
      </div>
    </aside>
  );
};
