import React from 'react';
import { StoreData } from '../types';

interface MiniMapProps {
  store: StoreData;
  activeAisleIndex: number;
  onSelectAisle: (index: number) => void;
  cameraPos: [number, number, number];
  cameraRotY: number;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  store,
  activeAisleIndex,
  onSelectAisle,
  cameraPos,
  cameraRotY,
}) => {
  const totalAisles = store.aisles.length;

  const handlePrevAisle = () => {
    onSelectAisle((activeAisleIndex - 1 + totalAisles) % totalAisles);
  };

  const handleNextAisle = () => {
    onSelectAisle((activeAisleIndex + 1) % totalAisles);
  };

  return (
    <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 pointer-events-auto">
      {/* Radar Map Card */}
      <div className="w-52 h-44 bg-[#FFFFFF]/90 backdrop-blur-md rounded-2xl border border-[#E8E6DF] shadow-lg p-3 flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#006153] animate-pulse" />
            <span className="font-bold text-[11px] text-[#181C21]">Store Floor Plan</span>
          </div>
          <span className="font-mono text-[9px] text-[#656F7D]">
            Aisle {activeAisleIndex + 1} of {totalAisles}
          </span>
        </div>

        {/* Floor Canvas representation */}
        <div className="relative flex-1 my-1.5 bg-[#F1F4FA] rounded-xl border border-[#CBD5E1] overflow-hidden flex flex-col justify-around py-1 px-3">
          {store.aisles.map((aisle, idx) => {
            const isActive = idx === activeAisleIndex;
            return (
              <div
                key={aisle.id}
                onClick={() => onSelectAisle(idx)}
                className={`h-3 rounded-sm flex items-center justify-between px-2 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#006153] text-white shadow-sm scale-102 font-bold'
                    : 'bg-[#CBD5E1]/60 hover:bg-[#CBD5E1] text-[#3E4946]'
                }`}
              >
                <span className="text-[8px] font-mono leading-none">Aisle {aisle.number}</span>
                <span className="text-[7px] leading-none opacity-80">{aisle.nameEn.split(' ')[0]}</span>
              </div>
            );
          })}

          {/* "You Are Here" Marker */}
          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-[#C4262E] border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
            style={{
              left: `${Math.max(10, Math.min(90, 50 + (cameraPos[0] / 5) * 40))}%`,
              top: `${Math.max(10, Math.min(90, 50 + (cameraPos[2] / 12) * 40))}%`,
            }}
          >
            {/* Direction Cone */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-[#C4262E]"
              style={{ transform: `translateX(-50%) rotate(${cameraRotY}rad)` }}
            />
          </div>
        </div>

        {/* Prev / Next Aisle Jumper */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#E8E6DF]">
          <button
            onClick={handlePrevAisle}
            className="px-2 py-0.5 rounded-md bg-[#FAFAF7] hover:bg-[#E5E8EF] border border-[#CBD5E1] text-[10px] font-bold text-[#181C21] transition-colors"
          >
            ◀ Prev Aisle
          </button>
          <span className="text-[9px] font-mono text-[#656F7D] font-bold">
            A{activeAisleIndex + 1}
          </span>
          <button
            onClick={handleNextAisle}
            className="px-2 py-0.5 rounded-md bg-[#FAFAF7] hover:bg-[#E5E8EF] border border-[#CBD5E1] text-[10px] font-bold text-[#181C21] transition-colors"
          >
            Next Aisle ▶
          </button>
        </div>
      </div>
    </div>
  );
};
