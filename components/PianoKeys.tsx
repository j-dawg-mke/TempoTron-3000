import React from 'react';

interface PianoKeysProps {
  selectedRoot: number | null;
  selectedChord: string | null;
  onRootChange: (rootMidi: number) => void;
  onChordChange: (chord: string | null) => void;
}

const CHORD_BUTTONS = [
  { id: 'M3', label: 'M3', desc: 'Major Triad' },
  { id: 'm3', label: 'm3', desc: 'Minor Triad' },
  { id: 'Mm7', label: 'Mm7', desc: 'Dominant 7' },
  { id: 'Dim7', label: 'Dim7', desc: 'Diminished' },
  { id: '5th', label: '5th', desc: 'Perfect 5th' },
  { id: '8va', label: '8va', desc: 'Octaves' },
];

export const PianoKeys: React.FC<PianoKeysProps> = ({ 
  selectedRoot, 
  selectedChord, 
  onRootChange, 
  onChordChange 
}) => {

  // Construction of C3 (Midi 48) to B3 (Midi 59)
  const whiteKeyDefs = [
    { note: 'C', midi: 48 },
    { note: 'D', midi: 50 },
    { note: 'E', midi: 52 },
    { note: 'F', midi: 53 },
    { note: 'G', midi: 55 },
    { note: 'A', midi: 57 },
    { note: 'B', midi: 59 },
  ];

  const blackKeyDefs = [
    { note: 'C#', midi: 49, boundaryIndex: 1 }, 
    { note: 'D#', midi: 51, boundaryIndex: 2 },
    { note: 'F#', midi: 54, boundaryIndex: 4 },
    { note: 'G#', midi: 56, boundaryIndex: 5 },
    { note: 'A#', midi: 58, boundaryIndex: 6 },
  ];

  const whiteKeyWidthPct = 100 / 7;
  const blackKeyWidthPct = 8.5; 

  return (
    <div className="w-full flex flex-col gap-2 my-1 relative bg-slate-900/30 p-2 rounded border border-slate-800">
        
        {/* Chord Type Selectors */}
        <div className="grid grid-cols-6 gap-1">
            {CHORD_BUTTONS.map(btn => {
                const isActive = selectedChord === btn.id;
                return (
                    <button
                        key={btn.id}
                        onClick={() => onChordChange(isActive ? null : btn.id)}
                        className={`
                            h-12 text-sm font-bold border-2 rounded-sm transition-all
                            flex flex-col items-center justify-center leading-none
                            ${isActive 
                                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                                : 'bg-transparent text-cyan-500 border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-900/20'
                            }
                        `}
                    >
                        <span>{btn.label}</span>
                    </button>
                );
            })}
        </div>

        {/* Single Octave Keyboard (Root Selector) */}
        <div className="relative w-full h-40 select-none mt-1">
            {/* White Keys */}
            <div className="flex w-full h-full">
              {whiteKeyDefs.map((def) => {
                const isActive = selectedRoot === def.midi;
                return (
                  <button
                    key={def.midi}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onRootChange(def.midi)}
                    className={`
                      relative flex-1 h-full border-r border-b-4 border-slate-950 
                      active:scale-[0.98] origin-top transition-all duration-75
                      flex items-end justify-center pb-3
                      ${isActive 
                        ? 'bg-pink-500 border-pink-700 text-white z-10 shadow-[0_0_15px_rgba(236,72,153,0.4)]' 
                        : 'bg-slate-300 border-slate-400 text-slate-600 hover:bg-white'
                      }
                      first:rounded-bl-sm last:rounded-br-sm
                    `}
                  >
                    <span className="text-lg font-bold">{def.note}</span>
                  </button>
                );
              })}
            </div>

            {/* Black Keys */}
            {blackKeyDefs.map((def) => {
                const isActive = selectedRoot === def.midi;
                const leftPos = (def.boundaryIndex * whiteKeyWidthPct) - (blackKeyWidthPct / 2);

                return (
                  <button
                    key={def.midi}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRootChange(def.midi);
                    }}
                    style={{ 
                        left: `${leftPos}%`, 
                        width: `${blackKeyWidthPct}%`,
                        height: '65%' 
                    }}
                    className={`
                      absolute top-0 border-x border-b-4 border-slate-950 rounded-b-sm
                      active:scale-[0.98] origin-top transition-all duration-75 z-20
                      flex items-end justify-center pb-2
                      ${isActive 
                        ? 'bg-pink-600 border-pink-800 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                        : 'bg-slate-800 border-slate-900 text-slate-500 hover:bg-slate-700'
                      }
                    `}
                  >
                     {/* Label removed as requested */}
                  </button>
                );
            })}
        </div>
    </div>
  );
};