import React from 'react';

export interface TunerData {
  note: string;
  octave: number;
  cents: number;
  frequency: number;
}

interface TunerProps {
  isActive: boolean;
  data: TunerData | null;
  onToggle: () => void;
}

export const Tuner: React.FC<TunerProps> = ({ isActive, data, onToggle }) => {
  
  // Needle position (-50 to 50 cents map to 0% to 100% visually for fine tuning, or wider)
  const getNeedlePos = (cents: number) => {
      const clamped = Math.max(-50, Math.min(50, cents));
      return 50 + clamped; // -50 -> 0, 0 -> 50, 50 -> 100
  };

  const isInTune = data && Math.abs(data.cents) < 5;

  if (!isActive) {
    return (
      <button 
        onClick={onToggle}
        className="w-full h-16 bg-slate-900/50 border border-slate-800 hover:border-cyan-600 rounded-sm flex items-center justify-center group transition-all mb-1"
      >
         <svg className="w-5 h-5 mr-3 text-slate-500 group-hover:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
         <span className="text-slate-500 group-hover:text-cyan-400 text-sm tracking-widest font-bold">ACTIVATE TUNER</span>
      </button>
    );
  }

  return (
    <div className={`w-full h-32 border border-slate-800 rounded-sm relative overflow-hidden transition-colors duration-300 mb-1 ${isInTune ? 'bg-cyan-900/20' : 'bg-black'}`}>
      
      {/* Scale Marks */}
      <div className="absolute inset-0 flex justify-between px-4 items-center opacity-30 pointer-events-none">
         <div className="w-0.5 h-6 bg-slate-500"></div>
         <div className="w-0.5 h-8 bg-slate-500"></div>
         <div className="w-0.5 h-6 bg-slate-500"></div>
      </div>
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 -translate-x-1/2"></div>

      {/* Close Button */}
      <button 
        onClick={onToggle}
        className="absolute right-2 top-2 z-30 p-1 text-slate-600 hover:text-pink-500 hover:bg-pink-900/20 rounded"
      >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      {/* Active State */}
      {data ? (
        <>
            {/* Needle / Bar */}
            <div 
                className="absolute top-2 bottom-2 w-1.5 transition-all duration-100 ease-out z-10 rounded-full"
                style={{ 
                    left: `${getNeedlePos(data.cents)}%`,
                    backgroundColor: isInTune ? '#22d3ee' : '#ec4899',
                    boxShadow: `0 0 15px ${isInTune ? '#22d3ee' : '#ec4899'}`
                }}
            ></div>

            {/* Info Text */}
            <div className="absolute inset-0 flex items-center justify-between px-6 z-20">
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-slate-500 tracking-wider uppercase mb-1">Frequency</span>
                    <span className="text-lg font-mono text-cyan-300 font-bold">{data.frequency.toFixed(1)} <span className="text-sm text-cyan-600">Hz</span></span>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm border border-slate-800/50 shadow-xl">
                    <span className={`text-4xl font-bold tracking-tighter drop-shadow-lg leading-none flex items-start ${isInTune ? 'text-cyan-400' : 'text-pink-500'}`}>
                        {data.note}
                        <span className="text-xl text-slate-400 mt-1 ml-1">{data.octave}</span>
                    </span>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 tracking-wider uppercase mb-1">Deviation</span>
                    <span className={`text-lg font-mono font-bold ${isInTune ? 'text-cyan-400' : 'text-pink-500'}`}>
                        {data.cents > 0 ? '+' : ''}{Math.round(data.cents)}<span className="text-sm opacity-70">¢</span>
                    </span>
                </div>
            </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center animate-pulse space-y-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
            <span className="text-cyan-500/70 text-xs tracking-widest font-bold">LISTENING...</span>
        </div>
      )}
    </div>
  );
};