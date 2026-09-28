import React, { useState } from 'react';
import { StoreData } from '../types';

interface StoreSelectorProps {
  stores: StoreData[];
  onSelectStore: (store: StoreData) => void;
  onInstantSyncDemo: (newPrice: number) => void;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  stores,
  onSelectStore,
  onInstantSyncDemo,
}) => {
  const [demoPrice, setDemoPrice] = useState<number>(145);
  const [showAck, setShowAck] = useState<boolean>(false);

  const handleInstantSync = () => {
    onInstantSyncDemo(demoPrice);
    setShowAck(true);
    setTimeout(() => setShowAck(false), 3000);
  };

  return (
    <div className="w-full min-h-screen pt-20 pb-16 bg-[#FAFAF7] text-[#181C21] px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Hero Section */}
        <section className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D8E5E3] text-[#006153] text-xs uppercase tracking-wider font-bold">
            <span className="w-2 h-2 rounded-full bg-[#006153] animate-pulse" />
            Virtual Hardware Experience
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between w-full gap-6">
            <div className="max-w-3xl">
              <h1 className="font-sans text-4xl sm:text-5xl font-extrabold tracking-tight text-[#181C21] leading-tight">
                Walk through a Quickshelf store.
              </h1>
              <p className="mt-3 text-base sm:text-lg text-[#656F7D] font-medium leading-relaxed">
                Every tag you see is an electrophoretic replica of our 3-color e-ink labels. Change a price, trigger flash updates, and inspect live Sub-1 GHz RF telemetry across regional Indian retail formats.
              </p>
            </div>

            {/* Live Metrics Ticker Pill Bar */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#E5E8EF]/60 backdrop-blur-sm self-start lg:self-auto border border-[#E8E6DF]">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] shadow-sm text-xs font-semibold">
                <span className="text-[#C4262E] font-bold">⚡</span>
                <span>Sub-second BLE</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] shadow-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px] text-[#006153]">battery_charging_full</span>
                <span>5-Yr Battery</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] shadow-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px] text-[#006153]">cell_tower</span>
                <span>60m Gateway</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] shadow-sm text-xs font-semibold">
                <span>🇮🇳</span>
                <span>Made for India</span>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Live Price Override Controller (Matches Stitch) */}
        <section className="p-4 sm:p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D8E5E3] flex items-center justify-center text-[#006153] shrink-0">
              <span className="material-symbols-outlined text-[22px]">sensors</span>
            </div>
            <div>
              <p className="text-base font-bold text-[#181C21]">Instant E-Ink Price Push</p>
              <p className="text-xs text-[#656F7D]">Edit sample shelf pricing to trigger sub-second over-the-air packet simulation</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-[#FAFAF7] border border-[#E8E6DF] px-3.5 py-2 rounded-xl">
              <span className="font-mono text-xs text-[#656F7D]">Basmati 1kg:</span>
              <span className="font-bold text-base text-[#181C21]">₹</span>
              <input
                type="number"
                data-testid="instant-sync-input"
                value={demoPrice}
                onChange={(e) => setDemoPrice(parseInt(e.target.value) || 0)}
                className="w-16 bg-transparent font-bold text-base text-[#181C21] focus:outline-none"
              />
            </div>
            <button
              onClick={handleInstantSync}
              data-testid="instant-sync-btn"
              className="px-5 py-2.5 rounded-xl bg-[#006153] hover:bg-[#0B6356] text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>Sync Tags</span>
            </button>
            {showAck && (
              <span className="font-mono text-xs text-[#006153] flex items-center gap-1 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#006153] inline-block animate-ping" />
                ACK: 42ms
              </span>
            )}
          </div>
        </section>

        {/* Four Store Cards Grid */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl font-extrabold text-[#181C21]">Choose a Store Floor</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5E8EF] text-[#656F7D] font-mono text-[11px] font-bold">
                4 ACTIVE RIGS
              </span>
            </div>
            <span className="hidden sm:inline text-xs text-[#656F7D]">Click any venue to enter the interactive 3D store simulator</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stores.map((store) => (
              <div
                key={store.id}
                data-testid={`store-card-${store.id}`}
                onClick={() => onSelectStore(store)}
                className="group flex flex-col bg-[#FFFFFF] rounded-2xl overflow-hidden border border-[#E8E6DF] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E0E2E9]">
                  <img
                    src={store.thumbnailUrl}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/95 backdrop-blur-md text-[#006153] text-[11px] font-bold shadow-sm">
                      {store.typeLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/95 backdrop-blur-md text-[#3E4946] text-[11px] font-semibold shadow-sm">
                      {store.city}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-[#23272D]/90 text-white font-mono text-[10px] backdrop-blur-md">
                    RSSI {store.defaultRssi} dBm
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[#181C21] group-hover:text-[#006153] transition-colors">
                      {store.name}
                    </h3>
                    <p className="text-xs text-[#656F7D] mt-1 line-clamp-2">
                      {store.tagline}
                    </p>
                  </div>

                  <div className="pt-3 flex flex-col gap-3 bg-[#FAFAF7] -mx-5 -mb-5 p-5 border-t border-[#E8E6DF]">
                    <div className="flex items-center justify-between text-xs text-[#656F7D]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#006153]">store</span>
                        {store.aisles.length} {store.type === 'sweets' ? 'counters' : 'aisles'}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono font-bold text-[#181C21]">
                        <span className="material-symbols-outlined text-[16px] text-[#006153]">label</span>
                        {store.totalTags} tags
                      </span>
                    </div>

                    <button
                      data-testid={`enter-store-btn-${store.id}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#006153] group-hover:bg-[#0B6356] text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Enter store</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
