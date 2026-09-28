import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoaded: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoaded }) => {
  const [progress, setProgress] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>('Initializing Quickshelf Live Rig...');

  useEffect(() => {
    let isMounted = true;

    async function loadAssets() {
      // Step 1: Wait for fonts (especially Noto Sans Devanagari & Barlow Condensed)
      setStatusText('Loading Noto Sans Devanagari & Barlow fonts...');
      setProgress(40);
      try {
        if ('fonts' in document) {
          await document.fonts.ready;
        }
      } catch (_e) {
        // Continue if font API not available
      }

      if (!isMounted) return;
      setProgress(75);
      setStatusText('Calibrating 3-color electrophoretic shaders...');

      // Step 2: Artificial brief pause to allow smooth logo display
      await new Promise((r) => setTimeout(r, 600));

      if (!isMounted) return;
      setProgress(100);
      setStatusText('All Systems Ready · 42ms BLE 5.4 Active');

      await new Promise((r) => setTimeout(r, 300));
      if (isMounted) onLoaded();
    }

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, [onLoaded]);

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAF7] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Animated Brand Mark */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-[#FFFFFF] shadow-[0_12px_36px_-6px_rgba(0,0,0,0.08)] border border-[#E8E6DF] flex items-center justify-center p-4">
            <img
              src="/logo-icon.png"
              alt="Quickshelf"
              className="w-full h-full object-contain"
            />
          </div>
          {/* Radio Ripple Wave */}
          <div className="absolute inset-0 rounded-3xl border-2 border-[#006153]/40 animate-ping pointer-events-none" />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-[#181C21] tracking-tight">
            Quickshelf Live Demo
          </h1>
          <p className="text-xs font-semibold text-[#006153] mt-1 font-mono uppercase tracking-widest">
            Wireless Electronic Shelf Labels · Made for India
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E5E8EF] h-2 rounded-full overflow-hidden border border-[#CBD5E1]">
          <div
            className="bg-[#006153] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs font-mono text-[#656F7D] font-medium">
          {statusText}
        </span>
      </div>
    </div>
  );
};
