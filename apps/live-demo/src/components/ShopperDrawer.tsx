import React from 'react';
import { TagData } from '../types';

interface ShopperDrawerProps {
  tag: TagData | null;
  onClose: () => void;
  onLocateTag: (tagId: string) => void;
}

export const ShopperDrawer: React.FC<ShopperDrawerProps> = ({ tag, onClose, onLocateTag }) => {
  if (!tag) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Smartphone Device Frame */}
      <div className="relative w-full max-w-[360px] h-[680px] bg-[#111111] rounded-[44px] p-3.5 shadow-2xl border-4 border-[#333333] flex flex-col justify-between overflow-hidden">
        {/* Phone Speaker & Dynamic Island */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#1C1C1E] rounded-full z-20 flex items-center justify-end px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00FF66]/60 animate-pulse" />
        </div>

        {/* Screen Content */}
        <div className="w-full h-full bg-[#FFFFFF] rounded-[32px] overflow-y-auto flex flex-col justify-between text-[#181C21] pt-8 pb-4 px-4">
          <div>
            {/* Top Bar */}
            <div className="flex items-center justify-between py-2 border-b border-[#E8E6DF]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#006153]">
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>Quickshelf Instant Scan</span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#F1F4FA] flex items-center justify-center text-xs text-[#656F7D]"
              >
                ✕
              </button>
            </div>

            {/* Product Card */}
            <div className="pt-4 flex flex-col gap-3">
              <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-[#F8FAFC] to-[#E2E8F0] border border-[#CBD5E1] flex flex-col items-center justify-center p-4 text-center">
                <span className="text-4xl mb-2">📦</span>
                <span className="text-xs font-bold text-[#006153] uppercase tracking-wider">
                  NFC Shelf Verified
                </span>
                <span className="text-[10px] text-[#656F7D] font-mono mt-0.5">{tag.sku}</span>
              </div>

              {/* Title & Regional Name */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#006153] bg-[#D8E5E3] px-2 py-0.5 rounded-full">
                  {tag.category}
                </span>
                <h3 className="text-lg font-extrabold text-[#181C21] mt-1.5 leading-snug">
                  {tag.nameEn}
                </h3>
                <p className="text-xs font-medium text-[#4B5563] mt-0.5">
                  {tag.nameHi}
                </p>
              </div>

              {/* Live Price Tag */}
              <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8E6DF] flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#181C21]">₹{tag.price}</span>
                    {tag.mrp > tag.price && (
                      <span className="text-xs text-[#656F7D] line-through">MRP ₹{tag.mrp}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#656F7D] block">{tag.unitPrice}</span>
                </div>

                {tag.promo && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#C4262E] text-white text-[11px] font-bold tracking-wide">
                    {tag.promo}
                  </span>
                )}
              </div>

              {/* Dynamic Metadata Section */}
              <div className="flex flex-col gap-2 text-xs">
                {tag.batchNo && (
                  <div className="flex justify-between py-1 border-b border-[#E8E6DF]">
                    <span className="text-[#656F7D]">Batch / Expiry:</span>
                    <span className="font-mono font-bold text-[#181C21]">
                      {tag.batchNo} · {tag.expiryDate}
                    </span>
                  </div>
                )}

                {tag.apparelSizes && (
                  <div className="flex justify-between py-1 border-b border-[#E8E6DF]">
                    <span className="text-[#656F7D]">Available Sizes:</span>
                    <span className="font-bold text-[#181C21]">{tag.apparelSizes.join(', ')}</span>
                  </div>
                )}

                {tag.madeOn && (
                  <div className="flex justify-between py-1 border-b border-[#E8E6DF]">
                    <span className="text-[#656F7D]">Freshness Stamp:</span>
                    <span className="font-bold text-[#C4262E]">{tag.madeOn}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-[#E8E6DF]">
                  <span className="text-[#656F7D]">Shelf Availability:</span>
                  <span className={`font-bold ${tag.stock <= 5 ? 'text-[#C4262E]' : 'text-[#006153]'}`}>
                    {tag.stock > 0 ? `${tag.stock} in stock` : 'Out of stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 pt-3 border-t border-[#E8E6DF]">
            <button
              onClick={() => {
                onLocateTag(tag.id);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#006153] hover:bg-[#0B6356] text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">navigation</span>
              <span>Find on Shelf (Blink Green LED)</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-[#F1F4FA] hover:bg-[#E5E8EF] text-[#181C21] text-xs font-semibold"
            >
              Close Shopper View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
