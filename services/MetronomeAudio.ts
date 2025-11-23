export type Subdivision = '1/4' | '1/8' | '1/8T' | '1/16' | 'dotted';

export class MetronomeAudio {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private beatInBar: number = 0; // Always 0 for 1/4 meter
  private tempo: number = 120;
  private lookahead: number = 25.0; 
  private scheduleAheadTime: number = 0.1; 
  private nextNoteTime: number = 0.0; 
  private timerID: number | null = null;
  private volume: number = 0.8;
  private frequency: number = 1500; 
  private subdivision: Subdivision = '1/4';
  private onBeatCallback: ((beatNumber: number) => void) | null = null;
  
  // Tuning Note (A440 Square)
  private tuningOsc: OscillatorNode | null = null;
  private tuningGain: GainNode | null = null;

  // Synth (Piano Keys Sawtooth)
  private synthOscillators: Map<string, { osc: OscillatorNode, gain: GainNode }> = new Map();

  // Tuner
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private tunerBuffer: Float32Array = new Float32Array(2048);
  private tunerRafId: number | null = null;
  private onTunerData: ((data: { note: string, octave: number, cents: number, frequency: number } | null) => void) | null = null;

  constructor(onBeat?: (beatNumber: number) => void) {
    if (onBeat) {
      this.onBeatCallback = onBeat;
    }
  }

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setTempo(bpm: number) {
    this.tempo = bpm;
  }

  public setVolume(vol: number) {
    this.volume = vol;
    const now = this.audioContext ? this.audioContext.currentTime : 0;
    
    if (this.tuningGain && this.audioContext) {
      this.tuningGain.gain.setTargetAtTime(vol * 0.5, now, 0.1);
    }

    this.synthOscillators.forEach(({ gain }) => {
        if (this.audioContext) {
            gain.gain.setTargetAtTime(vol * 0.25, now, 0.1);
        }
    });
  }

  public setSubdivision(sub: Subdivision) {
    this.subdivision = sub;
  }

  public start() {
    if (this.isPlaying) return;
    this.initContext();

    this.isPlaying = true;
    this.beatInBar = 0;
    this.nextNoteTime = this.audioContext!.currentTime + 0.05;
    this.timerID = window.setInterval(() => this.scheduler(), this.lookahead);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      window.clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  public toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  // A-440 Tuning Note Logic
  public toggleTuningNote(enable: boolean) {
    this.initContext();

    if (enable) {
      if (this.tuningOsc) return; 

      this.tuningOsc = this.audioContext!.createOscillator();
      this.tuningGain = this.audioContext!.createGain();

      this.tuningOsc.type = 'square';
      this.tuningOsc.frequency.value = 440; 

      this.tuningOsc.connect(this.tuningGain);
      this.tuningGain.connect(this.audioContext!.destination);

      this.tuningGain.gain.setValueAtTime(0, this.audioContext!.currentTime);
      this.tuningGain.gain.linearRampToValueAtTime(this.volume * 0.5, this.audioContext!.currentTime + 0.1);

      this.tuningOsc.start();
    } else {
      if (this.tuningOsc && this.tuningGain) {
        const stopTime = this.audioContext!.currentTime + 0.1;
        this.tuningGain.gain.linearRampToValueAtTime(0, stopTime);
        this.tuningOsc.stop(stopTime);
        
        setTimeout(() => {
          this.tuningOsc = null;
          this.tuningGain = null;
        }, 150);
      }
    }
  }

  // Synth / Piano Keys Logic
  public playSynthTone(id: string, frequency: number): boolean {
    this.initContext();
    
    if (this.synthOscillators.has(id)) {
      this.stopSynthTone(id);
      return false; 
    }

    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    
    osc.connect(gain);
    gain.connect(this.audioContext!.destination);
    
    const synthVol = this.volume * 0.25; 
    
    gain.gain.setValueAtTime(0, this.audioContext!.currentTime);
    gain.gain.linearRampToValueAtTime(synthVol, this.audioContext!.currentTime + 0.02);
    
    osc.start();
    
    this.synthOscillators.set(id, { osc, gain });
    return true; 
  }

  public stopSynthTone(id: string) {
    const voice = this.synthOscillators.get(id);
    if (voice) {
      const { osc, gain } = voice;
      const now = this.audioContext!.currentTime;
      
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      
      osc.stop(now + 0.06);
      this.synthOscillators.delete(id);
    }
  }

  public stopAllSynthTones() {
    const keys = Array.from(this.synthOscillators.keys());
    keys.forEach(key => this.stopSynthTone(key));
  }

  // TUNER IMPLEMENTATION
  public async startTuner(callback: (data: { note: string, octave: number, cents: number, frequency: number } | null) => void) {
    this.onTunerData = callback;
    this.initContext(); 
    
    if (!this.micStream) {
        try {
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error("Mic Error:", err);
            return;
        }
    }

    const source = this.audioContext!.createMediaStreamSource(this.micStream);
    this.analyser = this.audioContext!.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    this.updateTuner();
  }

  public stopTuner() {
     if (this.tunerRafId) {
         cancelAnimationFrame(this.tunerRafId);
         this.tunerRafId = null;
     }
     if (this.micStream) {
         this.micStream.getTracks().forEach(track => track.stop());
         this.micStream = null;
     }
     if (this.analyser) {
         this.analyser.disconnect();
         this.analyser = null;
     }
     this.onTunerData = null;
  }

  private updateTuner = () => {
     if (!this.analyser || !this.onTunerData) return;
     
     this.analyser.getFloatTimeDomainData(this.tunerBuffer);
     const freq = this.autoCorrelate(this.tunerBuffer, this.audioContext!.sampleRate);
     
     if (freq === -1) {
         this.onTunerData(null); 
     } else {
         const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
         const noteNum = 12 * (Math.log(freq / 440) / Math.log(2)) + 69;
         const noteIndex = Math.round(noteNum);
         const note = noteStrings[noteIndex % 12];
         const octave = Math.floor(noteIndex / 12) - 1;
         const targetFreq = 440 * Math.pow(2, (noteIndex - 69) / 12);
         const cents = 1200 * Math.log2(freq / targetFreq);
         
         this.onTunerData({ note, octave, cents, frequency: freq });
     }
     
     this.tunerRafId = requestAnimationFrame(this.updateTuner);
  }

  private autoCorrelate(buf: Float32Array, sampleRate: number): number {
      let size = buf.length;
      let rms = 0;
      for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / size);
      if (rms < 0.01) return -1;

      let r1 = 0, r2 = size - 1, thres = 0.2;
      for (let i=0; i<size/2; i++) if (Math.abs(buf[i]) < thres) { r1=i; break; }
      for (let i=1; i<size/2; i++) if (Math.abs(buf[size-i]) < thres) { r2=size-i; break; }
      buf = buf.slice(r1, r2);
      size = buf.length;

      const c = new Array(size).fill(0);
      for (let i=0; i<size; i++) {
          for (let j=0; j<size-i; j++) {
              c[i] = c[i] + buf[j] * buf[j+i];
          }
      }

      let d = 0;
      while(c[d] > c[d+1]) d++;
      let maxval = -1, maxpos = -1;
      for(let i=d; i<size; i++) {
          if (c[i] > maxval) {
              maxval = c[i];
              maxpos = i;
          }
      }
      let T0 = maxpos;
      
      let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
      let a = (x1 + x3 - 2 * x2) / 2;
      let b = (x3 - x1) / 2;
      if (a) T0 = T0 - b / (2 * a);

      return sampleRate / T0;
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += secondsPerBeat;
    this.beatInBar++;    
    // Reset at 1 to strictly enforce a 1/4 meter feel conceptually
    if (this.beatInBar === 1) {
      this.beatInBar = 0;
    }
  }

  private playClick(time: number, freq: number, volMultiplier: number = 1.0) {
    if (!this.audioContext) return;
    
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.type = 'square'; 
    osc.frequency.value = freq;

    // Make subdivisions slightly shorter/snappier
    const duration = 0.03;

    gainNode.gain.setValueAtTime(this.volume * volMultiplier, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  private scheduleNote(beatNumber: number, time: number) {
    // Main Beat - Always High Click (No meter accent)
    const mainFreq = 1500;
    
    this.playClick(time, mainFreq, 1.0);

    // Subdivisions
    if (this.subdivision !== '1/4') {
        const secondsPerBeat = 60.0 / this.tempo;
        const subFreq = 800;
        const subVol = 0.6;

        if (this.subdivision === '1/8') {
            // 1 extra click halfway
            this.playClick(time + (secondsPerBeat * 0.5), subFreq, subVol);
        } else if (this.subdivision === '1/8T') {
            // Triplets: 2 extra clicks at 1/3 and 2/3
            this.playClick(time + (secondsPerBeat * (1/3)), subFreq, subVol);
            this.playClick(time + (secondsPerBeat * (2/3)), subFreq, subVol);
        } else if (this.subdivision === '1/16') {
            // 3 extra clicks
            this.playClick(time + (secondsPerBeat * 0.25), subFreq, subVol);
            this.playClick(time + (secondsPerBeat * 0.50), subFreq, subVol);
            this.playClick(time + (secondsPerBeat * 0.75), subFreq, subVol);
        } else if (this.subdivision === 'dotted') {
            // Dotted 8th + 16th: 1 extra click at the last 16th slot
            this.playClick(time + (secondsPerBeat * 0.75), subFreq, subVol);
        }
    }

    // UI Callback
    const delay = Math.max(0, (time - this.audioContext!.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying && this.onBeatCallback) {
        this.onBeatCallback(beatNumber);
      }
    }, delay);
  }

  private scheduler() {
    if (!this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.beatInBar, this.nextNoteTime);
      this.nextNote();
    }
  }
}