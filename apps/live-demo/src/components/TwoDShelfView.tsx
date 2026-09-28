import React, { useRef, useEffect } from 'react';
import { StoreData, TagData, EInkRefreshPhase } from '../types';
import { renderTagToCanvas, getTagPixelDimensions } from '../engine/epaperRenderer';

interface TwoDShelfViewProps {
  store: StoreData;
  activeAisleIndex: number;
  onSelectAisle: (index: number) => void;
  selectedTag: TagData | null;
  onSelectTag: (tag: TagData) => void;
  onOpenShopperView: (tag: TagData) => void;
  locatingTagId: string | null;
  refreshingTagId: string | null;
  refreshPhase: EInkRefreshPhase;
}

export const TwoDShelfView: React.FC<TwoDShelfViewProps> = ({
  store,
  activeAisleIndex,
  onSelectAisle,
  selectedTag,
  onSelectTag,
  onOpenShopperView,
  locatingTagId,
  refreshingTagId,
  refreshPhase,
}) => {
  const currentAisle = store.aisles[activeAisleIndex] || store.aisles[0];

  return (
    <div className="w-full min-h-[calc(100vh-64px)] pt-20 pb-16 bg-[#FAFAF7] px-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Aisle Banner Header (Matches Stitch Aisle Header) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#D8E5E3] text-[#006153] text-xs font-bold font-mono">
                {currentAisle.apHardwareId}
              </span>
              <span className="text-xs text-[#656F7D]">Sub-1 GHz RF Channel 865 MHz</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181C21] mt-1">
              AISLE {currentAisle.number} · {currentAisle.nameHi}
            </h1>
            <p className="text-sm font-semibold text-[#006153]">{currentAisle.nameEn}</p>
            <p className="text-xs text-[#656F7D] mt-0.5">{currentAisle.categoryDesc}</p>
          </div>

          {/* Aisle Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F1F4FA] p-1.5 rounded-xl border border-[#CBD5E1]">
            {store.aisles.map((aisle, idx) => (
              <button
                key={aisle.id}
                onClick={() => onSelectAisle(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  idx === activeAisleIndex
                    ? 'bg-[#006153] text-white shadow-sm'
                    : 'text-[#3E4946] hover:bg-[#E5E8EF]'
                }`}
              >
                Aisle {aisle.number}
              </button>
            ))}
          </div>
        </div>

        {/* Supermarket Shelf Gondola Racks */}
        <div className="flex flex-col gap-10">
          {currentAisle.shelves.map((shelf) => (
            <div
              key={shelf.id}
              className="flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm overflow-hidden"
            >
              {/* Shelf Tier Header */}
              <div className="px-5 py-3 bg-[#F1F4FA] border-b border-[#E8E6DF] flex items-center justify-between">
                <span className="font-extrabold text-xs uppercase tracking-wider text-[#181C21]">
                  Tier {shelf.tierNumber}: {shelf.name}
                </span>
                <span className="text-[11px] font-mono text-[#656F7D]">
                  {shelf.tags.length} Active Labels
                </span>
              </div>

              {/* Shelf Rail with Mounted Tags */}
              <div className="p-6 bg-gradient-to-b from-[#FAFAF7] to-[#EAEAEA] flex flex-col gap-4">
                {/* Physical Mounting Rail (Dark Aluminum Channel) */}
                <div className="relative w-full bg-[#23272D] rounded-xl p-3 shadow-inner border border-[#353A42] flex flex-wrap gap-4 items-center justify-start min-h-[140px]">
                  {shelf.tags.map((tag) => (
                    <ShelfTagCard
                      key={tag.id}
                      tag={tag}
                      isSelected={selectedTag?.id === tag.id}
                      isLocating={locatingTagId === tag.id}
                      isRefreshing={refreshingTagId === tag.id}
                      refreshPhase={refreshPhase}
                      onClick={() => onSelectTag(tag)}
                      onQrClick={() => onOpenShopperView(tag)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ShelfTagCardProps {
  tag: TagData;
  isSelected: boolean;
  isLocating: boolean;
  isRefreshing: boolean;
  refreshPhase: EInkRefreshPhase;
  onClick: () => void;
  onQrClick: () => void;
}

const ShelfTagCard: React.FC<ShelfTagCardProps> = ({
  tag,
  isSelected,
  isLocating,
  isRefreshing,
  refreshPhase,
  onClick,
  onQrClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderTagToCanvas(canvasRef.current, tag, isRefreshing ? refreshPhase : 'settled');
    }
  }, [tag, isRefreshing, refreshPhase]);

  const dims = getTagPixelDimensions(tag.size);

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-lg p-1.5 bg-[#23272D] border transition-all duration-200 cursor-pointer shadow-md hover:-translate-y-1 ${
        isSelected
          ? 'border-[#006153] ring-4 ring-[#006153]/30 scale-102'
          : isLocating
          ? 'border-[#10B981] ring-4 ring-[#10B981]/50 animate-pulse scale-102'
          : 'border-[#353A42] hover:border-[#CBD5E1]'
      }`}
      style={{ width: `${Math.min(320, dims.width * 0.75)}px` }}
    >
      {/* Pick-to-Light LED indicator on bezel */}
      <div
        className={`absolute top-1.5 right-2 w-2 h-2 rounded-full border border-black/40 transition-all ${
          isLocating ? 'bg-[#00FF66] shadow-[0_0_10px_#00FF66] animate-ping' : 'bg-[#111111]'
        }`}
      />

      {/* 3-Color Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-sm block bg-[#F2F0EA]"
      />

      {/* Card Micro Actions Hover Overlay */}
      <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-[#A0AEC0]">
        <span className="font-mono">{tag.id}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQrClick();
          }}
          className="text-[#98F3DE] hover:underline font-bold"
        >
          Scan QR ➔
        </button>
      </div>
    </div>
  );
};
