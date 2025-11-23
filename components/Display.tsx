import React, { useEffect, useState } from 'react';

interface DisplayProps {
  bpm: number;
  inputBuffer: string;
  isPlaying: boolean;
  beatActive: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const Display: React.FC<DisplayProps> = ({ 
  bpm, 
  inputBuffer, 
  isPlaying, 
  beatActive,
  onIncrement,
  onDecrement
}) => {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (beatActive) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 80);
      return () => clearTimeout(timer);
    }
  }, [beatActive]);

  return (
    <div className="flex items-center justify-between w-full bg-slate-900/50 border-2 border-slate-800 p-1.5 rounded-md">
      
      {/* Down Button */}
      <button 
        onClick={onDecrement}
        className="w-12 h-12 flex items-center justify-center border border-slate-700 text-slate-500 hover:text-cyan-400 hover:border-cyan-400 active:bg-cyan-900/30 transition-colors"
        aria-label="Decrease"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
      </button>

      {/* Main Screen */}
      <div className="relative flex-1 mx-3 h-14 bg-black border border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden">
        {/* Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
        
        {/* Beat Flash Background */}
        {isFlashing && (
          <div className="absolute inset-0 bg-cyan-500/20 z-0"></div>
        )}

        <div className="z-20 flex flex-col items-center">
          <span className={`text-4xl leading-none tracking-widest ${inputBuffer ? 'text-pink-500 animate-pulse' : 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]'}`}>
            {inputBuffer || bpm}
          </span>
          <span className="text-[10px] text-slate-500 tracking-[0.2em]">BPM</span>
        </div>
      </div>

      {/* Up Button */}
      <button 
        onClick={onIncrement}
        className="w-12 h-12 flex items-center justify-center border border-slate-700 text-slate-500 hover:text-cyan-400 hover:border-cyan-400 active:bg-cyan-900/30 transition-colors"
        aria-label="Increase"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>
  );
};