import React from 'react';

interface VolumeControlProps {
  volume: number;
  onChange: (vol: number) => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onChange }) => {
  return (
    <div className="w-full h-full flex items-center space-x-3 px-4 py-2 border border-slate-800 bg-black rounded-sm">
      <span className="text-xs text-slate-500 uppercase tracking-widest w-8 font-bold">Vol</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-6 bg-slate-900 rounded-sm appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
        style={{
            backgroundImage: `linear-gradient(90deg, #06b6d4 ${volume * 100}%, #1e293b ${volume * 100}%)`
        }}
      />
    </div>
  );
};