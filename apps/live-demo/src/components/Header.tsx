import React from 'react';
import { StoreData, TagData } from '../types';

interface HeaderProps {
  stores: StoreData[];
  selectedStore: StoreData;
  onSelectStore: (store: StoreData) => void;
  onOpenStoreSelector: () => void;
  viewMode: '3d' | '2d';
  onToggleViewMode: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onStartGuidedTour: () => void;
  isTourActive: boolean;
  onSearchFind: (searchTerm: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stores,
  selectedStore,
  onSelectStore,
  onOpenStoreSelector,
  viewMode,
  onToggleViewMode,
  demoMode,
  onToggleDemoMode,
  onStartGuidedTour,
  isTourActive,
  onSearchFind,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearchFind(searchTerm.trim());
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E8E6DF] shadow-[0_1px_8px_rgba(0,0,0,0.04)] h-16 px-5 flex items-center justify-between gap-4">
      {/* Left: Quickshelf Logo & Store Selector Dropdown */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={onOpenStoreSelector}
          data-testid="header-logo-btn"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left focus:outline-none"
          title="Return to Store Selector"
        >
          <img
            src="/logo-banner.webp"
            alt="Quickshelf"
            className="h-7 w-auto object-contain hidden sm:block"
          />
          <img
            src="/logo-icon.png"
            alt="Quickshelf Icon"
            className="h-8 w-auto object-contain sm:hidden"
          />
          <span className="px-2 py-0.5 rounded-full bg-[#D8E5E3] text-[#006153] text-[11px] font-bold uppercase tracking-wider hidden md:inline-block">
            Live Demo
          </span>
        </button>

        <div className="h-5 w-[1px] bg-[#E8E6DF] hidden sm:block" />

        {/* Store Dropdown */}
        <div className="relative">
          <select
            value={selectedStore.id}
            data-testid="header-store-select"
            onChange={(e) => {
              const s = stores.find((st) => st.id === e.target.value);
              if (s) onSelectStore(s);
            }}
            className="appearance-none bg-[#F1F4FA] hover:bg-[#E5E8EF] text-[#181C21] font-semibold text-xs py-2 pl-3 pr-8 rounded-lg border border-[#CBD5E1] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#006153]"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                📍 {s.name} ({s.city})
              </option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-[#656F7D]">
            ▼
          </span>
        </div>
      </div>

      {/* Center: Search Find (Pick-to-Light) */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center relative max-w-xs w-full"
      >
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#656F7D]">
          search
        </span>
        <input
          type="text"
          value={searchTerm}
          data-testid="search-input"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find product / LED blink..."
          className="w-full bg-[#FAFAF7] border border-[#E8E6DF] text-xs rounded-lg pl-9 pr-3 py-1.5 text-[#181C21] placeholder-[#656F7D] focus:outline-none focus:border-[#006153] focus:bg-[#FFFFFF]"
        />
        {searchTerm && (
          <button
            type="submit"
            data-testid="search-submit-btn"
            className="absolute right-2 text-[10px] bg-[#006153] text-white px-2 py-0.5 rounded font-bold uppercase"
          >
            Find
          </button>
        )}
      </form>

      {/* Right: Actions, Tour, Demo Mode, 2D/3D Toggle */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* BLE Telemetry Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F1F4FA] text-[#181C21] text-xs font-mono font-medium">
          <span className="text-[#C4262E] font-bold">⚡</span>
          <span>BLE 5.4 Sub-GHz</span>
          <span className="text-[10px] text-[#006153] font-bold">ACK 42ms</span>
        </div>

        {/* Join the Beta CTA */}
        <a
          href="https://www.quickshelf.in/beta"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="join-beta-link"
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-[#006153] hover:bg-[#0B6356] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          Join the Beta ➔
        </a>

        {/* Guided Tour Button */}
        <button
          onClick={onStartGuidedTour}
          data-testid="start-tour-btn"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isTourActive
              ? 'bg-[#AC1020] text-white animate-pulse'
              : 'bg-[#F1F4FA] text-[#181C21] hover:bg-[#E5E8EF] border border-[#E8E6DF]'
          }`}
          title="Play 4-step automated store demonstration"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isTourActive ? 'pause' : 'play_arrow'}
          </span>
          <span>{isTourActive ? 'Tour Active' : 'Guided Tour'}</span>
        </button>

        {/* Demo Mode Toggle */}
        <button
          onClick={onToggleDemoMode}
          data-testid="toggle-demomode-btn"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            demoMode
              ? 'bg-[#006153] text-white shadow-sm'
              : 'bg-[#F1F4FA] text-[#656F7D] hover:text-[#181C21] border border-[#E8E6DF]'
          }`}
          title="Auto-change a random price every 5 seconds to simulate live retail sync"
        >
          <span className={`w-2 h-2 rounded-full ${demoMode ? 'bg-[#98F3DE] animate-ping' : 'bg-[#BDC9C5]'}`} />
          <span>Demo Mode {demoMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* 2D / 3D Toggle */}
        <button
          onClick={onToggleViewMode}
          data-testid="toggle-viewmode-btn"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0E7C6B] hover:bg-[#0B6356] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          title="Switch between 3D store walkthrough and 2D shelf rail"
        >
          <span className="material-symbols-outlined text-[16px]">
            {viewMode === '3d' ? 'view_agenda' : 'view_in_ar'}
          </span>
          <span>{viewMode === '3d' ? '2D Rail' : '3D Store'}</span>
        </button>
      </div>
    </header>
  );
};
