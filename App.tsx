import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MetronomeAudio, Subdivision } from './services/MetronomeAudio';
import { Keypad } from './components/Keypad';
import { Display } from './components/Display';
import { PianoKeys } from './components/PianoKeys';
import { VolumeControl } from './components/VolumeControl';
import { Button } from './components/Button';
import { Tuner, TunerData } from './components/Tuner';

// Constants
const MIN_BPM = 10;
const MAX_BPM = 999;
const DEFAULT_BPM = 60;

// Chord Definitions for logic (offsets in semitones)
const CHORD_OFFSETS: Record<string, number[]> = {
  'M3': [0, 4, 7, 12],
  'm3': [0, 3, 7, 12],
  'Mm7': [0, 4, 7, 10],
  'Dim7': [0, 3, 6, 9],
  '5th': [0, 7, 12, 24],
  '8va': [0, 12, 24]
};

const App: React.FC = () => {
  const [bpm, setBpm] = useState<number>(DEFAULT_BPM);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTuning, setIsTuning] = useState<boolean>(false); 
  const [isA440Playing, setIsA440Playing] = useState<boolean>(false);
  const [inputBuffer, setInputBuffer] = useState<string>('');
  const [beatActive, setBeatActive] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [subdivision, setSubdivision] = useState<Subdivision>('1/4');
  
  // Drone State
  const [droneRoot, setDroneRoot] = useState<number | null>(null); // MIDI number
  const [droneChord, setDroneChord] = useState<string | null>(null); 
  const playingIdsRef = useRef<Set<string>>(new Set());

  // Tuner Data
  const [tunerData, setTunerData] = useState<TunerData | null>(null);
  
  // Tap Tempo State
  const tapTimesRef = useRef<number[]>([]);

  const engineRef = useRef<MetronomeAudio | null>(null);

  useEffect(() => {
    engineRef.current = new MetronomeAudio(() => {
      setBeatActive(true);
    });

    return () => {
      if (engineRef.current) {
          engineRef.current.stop();
          engineRef.current.stopTuner();
      }
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setTempo(bpm);
  }, [bpm]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setSubdivision(subdivision);
  }, [subdivision]);

  // Drone Synth Logic
  useEffect(() => {
      if (!engineRef.current) return;

      const targetIds = new Set<string>();
      const targetFreqs = new Map<string, number>();

      if (droneRoot !== null) {
          const offsets = (droneChord && CHORD_OFFSETS[droneChord]) ? CHORD_OFFSETS[droneChord] : [0];
          
          offsets.forEach(offset => {
             const midi = droneRoot + offset;
             const id = `midi-${midi}`;
             const freq = 440 * Math.pow(2, (midi - 69) / 12);
             targetIds.add(id);
             targetFreqs.set(id, freq);
          });
      }

      const currentIds = Array.from(playingIdsRef.current) as string[];
      currentIds.forEach(id => {
          if (!targetIds.has(id)) {
              engineRef.current?.stopSynthTone(id);
              playingIdsRef.current.delete(id);
          }
      });

      targetIds.forEach(id => {
          if (!playingIdsRef.current.has(id)) {
              const freq = targetFreqs.get(id);
              if (freq) {
                  engineRef.current?.playSynthTone(id, freq);
                  playingIdsRef.current.add(id);
              }
          }
      });

  }, [droneRoot, droneChord]);


  const toggleTuner = useCallback(() => {
      const newState = !isTuning;
      setIsTuning(newState);
      if (!engineRef.current) return;

      if (newState) {
          engineRef.current.startTuner((data) => {
              setTunerData(data);
          });
      } else {
          engineRef.current.stopTuner();
          setTunerData(null);
      }
  }, [isTuning]);

  const toggleA440 = useCallback(() => {
    if (!engineRef.current) return;
    const newState = !isA440Playing;
    setIsA440Playing(newState);
    engineRef.current.toggleTuningNote(newState);
  }, [isA440Playing]);


  const togglePlay = useCallback(() => {
    if (!engineRef.current) return;
    if (inputBuffer) commitInput();
    const playing = engineRef.current.toggle();
    setIsPlaying(playing);
  }, [inputBuffer]);

  const handleDigitPress = (digit: number) => {
    if (inputBuffer.length >= 3) return;
    setInputBuffer(prev => prev + digit.toString());
  };

  const handleBackspace = () => setInputBuffer(prev => prev.slice(0, -1));
  const handleClear = () => setInputBuffer('');

  const commitInput = useCallback(() => {
    if (!inputBuffer) return;
    let newBpm = parseInt(inputBuffer, 10);
    newBpm = Math.min(Math.max(newBpm, MIN_BPM), MAX_BPM);
    setBpm(newBpm);
    setInputBuffer('');
  }, [inputBuffer]);

  useEffect(() => {
    if (!inputBuffer) return;
    const timeout = setTimeout(() => {
      const val = parseInt(inputBuffer, 10);
      if (val >= MIN_BPM && val <= MAX_BPM) {
        setBpm(val);
        setInputBuffer(''); 
      }
    }, 1200);
    return () => clearTimeout(timeout);
  }, [inputBuffer]);

  const adjustTempo = (amount: number) => {
    setBpm(prev => Math.min(Math.max(prev + amount, MIN_BPM), MAX_BPM));
    if (inputBuffer) setInputBuffer('');
  };

  const handleTap = () => {
      const now = Date.now();
      const times = tapTimesRef.current;
      if (times.length > 0 && now - times[times.length - 1] > 2000) {
          tapTimesRef.current = [now];
          return;
      }
      times.push(now);
      if (times.length > 5) times.shift();
      if (times.length >= 2) {
          let totalInterval = 0;
          for (let i = 1; i < times.length; i++) totalInterval += times[i] - times[i - 1];
          const avgInterval = totalInterval / (times.length - 1);
          const newBpm = Math.round(60000 / avgInterval);
          if (newBpm >= MIN_BPM && newBpm <= MAX_BPM) setBpm(newBpm);
      }
  };

  return (
    <div className="h-full w-full flex flex-col p-2 max-w-md mx-auto overflow-y-auto no-scrollbar bg-black text-cyan-400">
      
      {/* Header & Display */}
      <div className="flex-none w-full flex flex-col gap-1 mb-1">
        <header className="flex justify-between items-end border-b border-slate-800 pb-1">
           <h1 className="text-xl text-cyan-400 tracking-tighter font-bold italic" style={{ textShadow: '0 0 10px rgba(6,182,212,0.6)' }}>
             TEMPO<span className="text-pink-500">TRON</span> 3.0
           </h1>
           <div className="flex gap-1 mb-1">
              <div className={`w-2 h-2 bg-cyan-400 ${isPlaying ? 'opacity-100 animate-pulse' : 'opacity-20'}`}></div>
              <div className={`w-2 h-2 bg-pink-500 ${isPlaying ? 'opacity-20' : 'opacity-100'}`}></div>
           </div>
        </header>

        <Display 
          bpm={bpm} 
          inputBuffer={inputBuffer} 
          isPlaying={isPlaying} 
          beatActive={beatActive}
          onIncrement={() => adjustTempo(1)}
          onDecrement={() => adjustTempo(-1)}
        />

        <Tuner isActive={isTuning} data={tunerData} onToggle={toggleTuner} />
      </div>

      {/* Drone Module */}
      <div className="flex-none w-full mb-1">
          <PianoKeys 
              selectedRoot={droneRoot}
              selectedChord={droneChord}
              onRootChange={(root) => setDroneRoot(prev => prev === root ? null : root)}
              onChordChange={setDroneChord}
          />
      </div>

      {/* Middle Controls */}
      <div className="flex-shrink flex flex-col items-center justify-center w-full gap-1 mb-1">
          <div className="w-full grid grid-cols-4 gap-1">
             {['1/8', '1/8T', '1/16', 'dotted'].map((sub) => (
                <Button 
                   key={sub}
                   variant={subdivision === sub ? 'active' : 'secondary'} 
                   onClick={() => setSubdivision(prev => prev === sub ? '1/4' : sub as Subdivision)}
                   className="h-16 px-0"
                >
                   {sub === '1/8' && (
                       <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current">
                          <rect x="30" y="20" width="40" height="10" /><rect x="30" y="20" width="4" height="55" /><rect x="66" y="20" width="4" height="55" />
                          <ellipse cx="26" cy="75" rx="10" ry="7" transform="rotate(-20 26 75)" /><ellipse cx="62" cy="75" rx="10" ry="7" transform="rotate(-20 62 75)" />
                       </svg>
                   )}
                   {sub === '1/8T' && (
                       <div className="relative w-8 h-8"><svg viewBox="0 0 100 100" className="w-full h-full fill-current"><text x="50" y="15" fontSize="20" fontWeight="bold" textAnchor="middle">3</text><rect x="15" y="25" width="70" height="8" /><rect x="15" y="25" width="4" height="50" /><rect x="48" y="25" width="4" height="50" /><rect x="81" y="25" width="4" height="50" /><ellipse cx="11" cy="75" rx="9" ry="7" transform="rotate(-20 11 75)" /><ellipse cx="44" cy="75" rx="9" ry="7" transform="rotate(-20 44 75)" /><ellipse cx="77" cy="75" rx="9" ry="7" transform="rotate(-20 77 75)" /></svg></div>
                   )}
                   {sub === '1/16' && (
                       <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current"><rect x="10" y="20" width="80" height="8" /><rect x="10" y="35" width="80" height="8" /><rect x="10" y="20" width="3" height="55" /><rect x="35.6" y="20" width="3" height="55" /><rect x="61.3" y="20" width="3" height="55" /><rect x="87" y="20" width="3" height="55" /><ellipse cx="6" cy="75" rx="8" ry="6" transform="rotate(-20 6 75)" /><ellipse cx="31.6" cy="75" rx="8" ry="6" transform="rotate(-20 31.6 75)" /><ellipse cx="57.3" cy="75" rx="8" ry="6" transform="rotate(-20 57.3 75)" /><ellipse cx="83" cy="75" rx="8" ry="6" transform="rotate(-20 83 75)" /></svg>
                   )}
                   {sub === 'dotted' && (
                       <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current"><rect x="25" y="20" width="50" height="8" /><rect x="50" y="35" width="25" height="8" /><rect x="25" y="20" width="4" height="55" /><rect x="71" y="20" width="4" height="55" /><ellipse cx="21" cy="75" rx="10" ry="7" transform="rotate(-20 21 75)" /><ellipse cx="67" cy="75" rx="10" ry="7" transform="rotate(-20 67 75)" /><circle cx="40" cy="75" r="4" /></svg>
                   )}
                </Button>
             ))}
          </div>

          <Keypad onDigitPress={handleDigitPress} onBackspace={handleBackspace} onClear={handleClear} />
      </div>

      {/* Controls */}
      <div className="flex-none w-full flex flex-col gap-2 mt-auto pb-4">
         <div className="flex gap-2 w-full h-12">
            <div className="flex-grow">
                <VolumeControl volume={volume} onChange={setVolume} />
            </div>
            {/* A440 Button - ALWAYS PINK OUTLINE */}
            <Button 
                onClick={toggleA440} 
                variant={isA440Playing ? 'danger' : 'pink-outline'}
                className="w-24 h-full text-xl font-bold"
            >
                A440
            </Button>
         </div>

         <div className="flex gap-2 w-full h-20">
            <Button 
                onClick={togglePlay} 
                variant={isPlaying ? 'danger' : 'accent'}
                className="flex-grow h-full text-4xl tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
                {isPlaying ? 'STOP' : 'START'}
            </Button>

            {/* TAP Button - ALWAYS PINK OUTLINE */}
            <Button 
                onClick={handleTap} 
                variant="pink-outline" 
                className="h-full aspect-square font-bold text-xl flex flex-col justify-center items-center leading-tight shadow-[0_0_15px_rgba(236,72,153,0.3)]"
            >
                TAP
            </Button>
         </div>
      </div>
    </div>
  );
};

export default App;