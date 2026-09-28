import React, { useState, useEffect, useRef, useCallback } from 'react';
import { STORES_DATA } from './data/storesData';
import { StoreData, TagData, PriceUpdateLog, EInkRefreshPhase } from './types';
import { Header } from './components/Header';
import { StoreSelector } from './components/StoreSelector';
import { ThreeStoreCanvas } from './components/ThreeStoreCanvas';
import { TwoDShelfView } from './components/TwoDShelfView';
import { PosConsoleDrawer } from './components/PosConsoleDrawer';
import { ShopperDrawer } from './components/ShopperDrawer';
import { MiniMap } from './components/MiniMap';
import { LoadingScreen } from './components/LoadingScreen';

export const App: React.FC = () => {
  // Store & Navigation State
  const [stores, setStores] = useState<StoreData[]>(STORES_DATA);
  const [selectedStore, setSelectedStore] = useState<StoreData>(STORES_DATA[0]);
  const [activeAisleIndex, setActiveAisleIndex] = useState<number>(0);
  const [showStoreSelector, setShowStoreSelector] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Interaction State
  const [selectedTag, setSelectedTag] = useState<TagData | null>(null);
  const [shopperTag, setShopperTag] = useState<TagData | null>(null);
  const [hoveredTag, setHoveredTag] = useState<TagData | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);

  // RF & Hardware Emulation State
  const [locatingTagId, setLocatingTagId] = useState<string | null>(null);
  const [refreshingTagId, setRefreshingTagId] = useState<string | null>(null);
  const [refreshPhase, setRefreshPhase] = useState<EInkRefreshPhase>('settled');

  // Guided Tour & Demo Mode
  const [guidedTourIndex, setGuidedTourIndex] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Camera & MiniMap tracking
  const [cameraPos, setCameraPos] = useState<[number, number, number]>(selectedStore.defaultCameraPos);
  const [cameraRotY, setCameraRotY] = useState<number>(0);

  // Activity & Notification Toast
  const [activityLogs, setActivityLogs] = useState<PriceUpdateLog[]>([]);
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'success' | 'info' } | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((title: string, desc: string, type: 'success' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, desc, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // -------------------------------------------------------------
  // Tag Selection & Camera Focusing
  // -------------------------------------------------------------
  const handleSelectTag = useCallback((tag: TagData | null) => {
    setSelectedTag(tag);
  }, []);

  // -------------------------------------------------------------
  // E-Ink Hardware 4-Phase Refresh Wave
  // -------------------------------------------------------------
  const triggerEInkRefresh = useCallback((tagId: string, onComplete?: () => void) => {
    setRefreshingTagId(tagId);

    // Phase 1: Blackout (0.0s)
    setRefreshPhase('blackout');

    // Phase 2: Whiteout (0.2s)
    setTimeout(() => {
      setRefreshPhase('whiteout');
    }, 200);

    // Phase 3: Red Electrophoretic Surge (0.4s)
    setTimeout(() => {
      setRefreshPhase('redlayer');
    }, 400);

    // Phase 4: Final Settled State (0.6s)
    setTimeout(() => {
      setRefreshPhase('settled');
      setRefreshingTagId(null);
      if (onComplete) onComplete();
    }, 650);
  }, []);

  // -------------------------------------------------------------
  // Action 1: Push Price to Tag (BLE 5.4 OTA)
  // -------------------------------------------------------------
  const handlePushPrice = useCallback((
    tagId: string,
    newPrice: number,
    newMrp: number,
    promo?: string
  ) => {
    let oldPrice = 0;
    let oldMrp = 0;
    let productName = '';

    // Update in-memory state
    setStores((prevStores) => {
      return prevStores.map((st) => {
        if (st.id !== selectedStore.id) return st;
        return {
          ...st,
          aisles: st.aisles.map((aisle) => ({
            ...aisle,
            shelves: aisle.shelves.map((shelf) => ({
              ...shelf,
              tags: shelf.tags.map((t) => {
                if (t.id === tagId) {
                  oldPrice = t.price;
                  oldMrp = t.mrp;
                  productName = t.nameEn;
                  const updated: TagData = {
                    ...t,
                    price: newPrice,
                    mrp: newMrp,
                    promo: promo || undefined,
                  };
                  if (selectedTag?.id === tagId) {
                    setSelectedTag(updated);
                  }
                  return updated;
                }
                return t;
              }),
            })),
          })),
        };
      });
    });

    // Run realistic 4-phase e-paper refresh
    triggerEInkRefresh(tagId, () => {
      const syncTime = 38 + Math.floor(Math.random() * 20); // 38-58ms
      showToast(
        `Updated ${tagId} in ${syncTime}ms via BLE 5.4`,
        `${productName} is now ₹${newPrice} (was ₹${oldPrice})`
      );

      // Log in audit activity
      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tagId,
          productName,
          oldPrice,
          newPrice,
          oldMrp,
          newMrp,
          promo,
          syncTimeMs: syncTime,
          gatewayId: selectedStore.aisles[activeAisleIndex]?.apHardwareId || 'GW-01',
        },
        ...prev,
      ]);
    });
  }, [selectedStore, activeAisleIndex, selectedTag, triggerEInkRefresh, showToast]);

  // -------------------------------------------------------------
  // Action 2: Pick-to-Light (Locate Tag LED Pulse)
  // -------------------------------------------------------------
  const handleFlashLed = useCallback((tagId: string) => {
    setLocatingTagId(tagId);
    showToast(
      '📍 Pick-to-Light Active (10s)',
      `Green LED beacon pulsing on hardware bezel of ${tagId}`,
      'info'
    );

    setTimeout(() => {
      setLocatingTagId((current) => (current === tagId ? null : current));
    }, 10000);
  }, [showToast]);

  // -------------------------------------------------------------
  // Action 3: Bulk Discount Aisle (-10% Ripple)
  // -------------------------------------------------------------
  const handleBulkDiscountAisle = useCallback((percent: number) => {
    const currentAisle = selectedStore.aisles[activeAisleIndex];
    if (!currentAisle) return;

    const allAisleTags = currentAisle.shelves.flatMap((s) => s.tags);
    showToast(
      `Dispatched Aisle ${currentAisle.number} Batch Pacing`,
      `Applying ${percent}% discount across ${allAisleTags.length} labels...`,
      'info'
    );

    // Ripple updates with 80ms stagger
    allAisleTags.forEach((tag, idx) => {
      setTimeout(() => {
        const discounted = Math.round(tag.mrp * (1 - percent / 100));
        handlePushPrice(tag.id, discounted, tag.mrp, `${percent}% OFF`);
      }, idx * 120);
    });
  }, [selectedStore, activeAisleIndex, handlePushPrice, showToast]);

  // -------------------------------------------------------------
  // Action 4: Sweets 8 PM Evening Markdown (-25%)
  // -------------------------------------------------------------
  const handleRunEveningMarkdown = useCallback(() => {
    const allTags = selectedStore.aisles.flatMap((a) => a.shelves).flatMap((s) => s.tags);
    showToast(
      '🌙 8 PM Evening Clearance Activated',
      `Slashing 25% off all ${allTags.length} fresh sweets and bakery items`,
      'info'
    );

    allTags.forEach((tag, idx) => {
      setTimeout(() => {
        const markdownPrice = Math.round(tag.mrp * 0.75);
        handlePushPrice(tag.id, markdownPrice, tag.mrp, '8 PM CLEARANCE');
      }, idx * 100);
    });
  }, [selectedStore, handlePushPrice, showToast]);

  // -------------------------------------------------------------
  // Action 5: Search & Locate (Pick-to-Light Search)
  // -------------------------------------------------------------
  const handleSearchFind = useCallback((searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    const allTags = selectedStore.aisles.flatMap((a) => a.shelves).flatMap((s) => s.tags);
    const found = allTags.find(
      (t) =>
        t.nameEn.toLowerCase().includes(term) ||
        t.nameHi.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        t.sku.toLowerCase().includes(term)
    );

    if (found) {
      // Find which aisle it belongs to
      const aisleIdx = selectedStore.aisles.findIndex((a) =>
        a.shelves.some((s) => s.tags.some((t) => t.id === found.id))
      );
      if (aisleIdx !== -1) setActiveAisleIndex(aisleIdx);

      setSelectedTag(found);
      handleFlashLed(found.id);
      showToast('Product Located!', `Found ${found.nameEn} on Aisle ${aisleIdx + 1}`);
    } else {
      showToast('Product Not Found', `No matching ESL tag found for "${searchTerm}"`, 'info');
    }
  }, [selectedStore, handleFlashLed, showToast]);

  // -------------------------------------------------------------
  // Action 6: Guided Tour Next / Auto Tour
  // -------------------------------------------------------------
  const handleStartGuidedTour = useCallback(() => {
    if (guidedTourIndex !== null) {
      setGuidedTourIndex(null);
      showToast('Guided Tour Ended', 'You now have free first-person control', 'info');
    } else {
      setGuidedTourIndex(0);
      showToast('Guided Tour Started', 'Following 4-step automated retail walkthrough', 'info');
    }
  }, [guidedTourIndex, showToast]);

  const handleNextTourStop = useCallback(() => {
    if (guidedTourIndex === null) return;
    const nextIdx = guidedTourIndex + 1;
    if (nextIdx < selectedStore.tourStops.length) {
      setGuidedTourIndex(nextIdx);
    } else {
      setGuidedTourIndex(null);
      showToast('Tour Complete', 'Explore the store freely or switch venues!', 'success');
    }
  }, [guidedTourIndex, selectedStore, showToast]);

  // -------------------------------------------------------------
  // Action 7: Demo Mode (Random Price Change Every 5s)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!demoMode) return;

    const interval = setInterval(() => {
      const allTags = selectedStore.aisles.flatMap((a) => a.shelves).flatMap((s) => s.tags);
      if (allTags.length === 0) return;

      const randomTag = allTags[Math.floor(Math.random() * allTags.length)];
      const discount = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
      const newPrice = Math.round(randomTag.mrp * (1 - discount / 100));
      const promo = `${discount}% FLASH`;

      handlePushPrice(randomTag.id, newPrice, randomTag.mrp, promo);
    }, 5000);

    return () => clearInterval(interval);
  }, [demoMode, selectedStore, handlePushPrice]);

  // Keep selectedStore in sync with stores state updates
  useEffect(() => {
    const updated = stores.find((s) => s.id === selectedStore.id);
    if (updated) setSelectedStore(updated);
  }, [stores, selectedStore.id]);

  if (isLoading) {
    return <LoadingScreen onLoaded={() => setIsLoading(false)} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#FAFAF7] font-sans text-[#181C21]">
      {/* Fixed Top Header */}
      <Header
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={(st) => {
          setSelectedStore(st);
          setActiveAisleIndex(0);
          setSelectedTag(null);
          setGuidedTourIndex(null);
        }}
        onOpenStoreSelector={() => setShowStoreSelector(true)}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((m) => (m === '3d' ? '2d' : '3d'))}
        demoMode={demoMode}
        onToggleDemoMode={() => setDemoMode((d) => !d)}
        onStartGuidedTour={handleStartGuidedTour}
        isTourActive={guidedTourIndex !== null}
        onSearchFind={handleSearchFind}
      />

      {/* Main Viewport: Store Selector OR 3D Store OR 2D Shelf Rail */}
      {showStoreSelector ? (
        <StoreSelector
          stores={stores}
          onSelectStore={(st) => {
            setSelectedStore(st);
            setActiveAisleIndex(0);
            setSelectedTag(null);
            setShowStoreSelector(false);
          }}
          onInstantSyncDemo={(newPrice) => {
            // Instant demo price change on Basmati Rice
            const sampleTag = selectedStore.aisles[0]?.shelves[0]?.tags[0];
            if (sampleTag) {
              handlePushPrice(sampleTag.id, newPrice, sampleTag.mrp, 'DEMO SYNC');
            }
          }}
        />
      ) : (
        <main className="w-full h-full pt-16 relative">
          {viewMode === '3d' ? (
            <ThreeStoreCanvas
              store={selectedStore}
              activeAisleIndex={activeAisleIndex}
              selectedTag={selectedTag}
              onSelectTag={handleSelectTag}
              onHoverTag={(tag, pos) => {
                setHoveredTag(tag);
                setHoverScreenPos(pos || null);
              }}
              locatingTagId={locatingTagId}
              refreshingTagId={refreshingTagId}
              refreshPhase={refreshPhase}
              guidedTourIndex={guidedTourIndex}
              onCameraMove={(pos, rotY) => {
                setCameraPos(pos);
                setCameraRotY(rotY);
              }}
            />
          ) : (
            <TwoDShelfView
              store={selectedStore}
              activeAisleIndex={activeAisleIndex}
              onSelectAisle={setActiveAisleIndex}
              selectedTag={selectedTag}
              onSelectTag={handleSelectTag}
              onOpenShopperView={(t) => setShopperTag(t)}
              locatingTagId={locatingTagId}
              refreshingTagId={refreshingTagId}
              refreshPhase={refreshPhase}
            />
          )}

          {/* MiniMap in 3D Mode */}
          {viewMode === '3d' && (
            <MiniMap
              store={selectedStore}
              activeAisleIndex={activeAisleIndex}
              onSelectAisle={setActiveAisleIndex}
              cameraPos={cameraPos}
              cameraRotY={cameraRotY}
            />
          )}

          {/* 3D Hover Tooltip */}
          {viewMode === '3d' && hoveredTag && hoverScreenPos && !selectedTag && (
            <div
              className="fixed z-30 pointer-events-none px-3 py-2 rounded-xl bg-[#23272D]/95 text-white backdrop-blur-md shadow-xl border border-[#353A42] flex flex-col gap-0.5 text-xs animate-in fade-in zoom-in-95 duration-150"
              style={{ left: `${hoverScreenPos.x + 14}px`, top: `${hoverScreenPos.y - 45}px` }}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <span>{hoveredTag.nameEn}</span>
                <span className="text-[#98F3DE]">₹{hoveredTag.price}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#A0AEC0] font-mono">
                <span>{hoveredTag.nameHi}</span>
                <span>·</span>
                <span>Click to edit in POS</span>
              </div>
            </div>
          )}

          {/* Guided Tour Narrative Banner at Bottom */}
          {guidedTourIndex !== null && selectedStore.tourStops[guidedTourIndex] && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-xl w-full px-4">
              <div className="p-4 rounded-2xl bg-[#FFFFFF]/95 backdrop-blur-md border-2 border-[#006153] shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#006153] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {guidedTourIndex + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#006153] uppercase tracking-wider block">
                      Tour Narrative Stop {guidedTourIndex + 1} of {selectedStore.tourStops.length}
                    </span>
                    <p className="text-xs font-semibold text-[#181C21] mt-0.5">
                      {selectedStore.tourStops[guidedTourIndex].narrative}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleNextTourStop}
                  className="px-4 py-2 rounded-xl bg-[#006153] hover:bg-[#0B6356] text-white text-xs font-bold shrink-0 transition-all flex items-center gap-1"
                >
                  <span>Next Stop</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* POS Console Slide-Over Right Drawer */}
      {selectedTag && (
        <PosConsoleDrawer
          tag={selectedTag}
          onClose={() => setSelectedTag(null)}
          onPushPrice={handlePushPrice}
          onFlashLed={handleFlashLed}
          onBulkDiscountAisle={handleBulkDiscountAisle}
          onRunEveningMarkdown={handleRunEveningMarkdown}
          isSweetsStore={selectedStore.type === 'sweets'}
          activityLogs={activityLogs}
          isRefreshing={refreshingTagId === selectedTag.id}
          refreshPhase={refreshPhase}
        />
      )}

      {/* Shopper Smartphone Mockup Modal */}
      {shopperTag && (
        <ShopperDrawer
          tag={shopperTag}
          onClose={() => setShopperTag(null)}
          onLocateTag={handleFlashLed}
        />
      )}

      {/* Real-Time Notification Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl bg-[#23272D] text-white border border-[#353A42] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-9 h-9 rounded-xl bg-[#006153] flex items-center justify-center text-[#98F3DE] shrink-0 font-bold">
            ⚡
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold block">{toast.title}</span>
            <span className="text-[11px] text-[#CBD5E1] block mt-0.5">{toast.desc}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
