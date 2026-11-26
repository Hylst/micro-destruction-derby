/**
 * Web Audio API Synth Engine for 16-bit Retro Arcade BGM & SFX
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  public muted: boolean = false;
  private bgmTimer: number | null = null;
  private isPlayingBgm: boolean = false;

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.35;

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;

    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- Sound Effects ---

  public playCoin() {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playSelect() {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playStart() {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + index * 0.06);
      gain.gain.setValueAtTime(0.25, now + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.2);
    });
  }

  public playCrash(intensity: number = 1) {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    const dur = 0.2 + intensity * 0.3;

    // Filtered Noise buffer
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300 + intensity * 500, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    noise.start(now);

    // Sub crunch oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + dur * 0.7);
    oscGain.gain.setValueAtTime(0.3 * intensity, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.7);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + dur * 0.7);
  }

  public playSkid() {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400 + Math.random() * 400, now);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(now);
  }

  public playBoost() {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playItem() {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      gain.gain.setValueAtTime(0.3, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.15);
    });
  }

  public playExplosion() {
    if (this.muted || !this.ctx) return;
    this.init();
    const now = this.ctx.currentTime;
    const dur = 1.2;

    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(50, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(now);
  }

  // --- Retro Chiptune Background Music (BGM) Sequencer ---

  public startBGM() {
    this.init();
    if (this.isPlayingBgm) return;
    this.isPlayingBgm = true;

    // 16-step retro driving bass & melody loop
    const bpm = 132;
    const stepDuration = 60 / bpm / 4; // 16th notes
    let currentStep = 0;

    // C minor pentatonic / blues scale
    const bassSequence = [130.81, 130.81, 155.56, 130.81, 174.61, 130.81, 196.00, 174.61, 130.81, 130.81, 233.08, 196.00, 174.61, 155.56, 130.81, 116.54];
    const melodyNotes = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25];

    const scheduleStep = () => {
      if (!this.isPlayingBgm || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Schedule next 4 steps ahead to be robust against JS timer jitter
      for (let i = 0; i < 4; i++) {
        const stepTime = now + i * stepDuration;
        const step = (currentStep + i) % 16;

        // --- 1. Bass ---
        const bassFreq = bassSequence[step];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = "sawtooth";
        bassOsc.frequency.setValueAtTime(bassFreq, stepTime);

        bassGain.gain.setValueAtTime(0.18, stepTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, stepTime + stepDuration * 0.9);

        const bassFilter = this.ctx.createBiquadFilter();
        bassFilter.type = "lowpass";
        bassFilter.frequency.setValueAtTime(1200, stepTime);

        bassOsc.connect(bassGain);
        bassGain.connect(bassFilter);
        bassFilter.connect(this.bgmGain!);

        bassOsc.start(stepTime);
        bassOsc.stop(stepTime + stepDuration * 0.9);

        // --- 2. Drums (Noise Hi-hat & Snare) ---
        if (step % 2 === 0) {
          // Hi-hat
          const bufferSize = this.ctx.sampleRate * 0.05;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let k = 0; k < bufferSize; k++) data[k] = Math.random() * 2 - 1;
          const hh = this.ctx.createBufferSource();
          hh.buffer = buffer;

          const hhFilter = this.ctx.createBiquadFilter();
          hhFilter.type = "highpass";
          hhFilter.frequency.setValueAtTime(6000, stepTime);

          const hhGain = this.ctx.createGain();
          hhGain.gain.setValueAtTime(0.08, stepTime);
          hhGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.04);

          hh.connect(hhFilter);
          hhFilter.connect(hhGain);
          hhGain.connect(this.bgmGain!);
          hh.start(stepTime);
        }

        if (step % 4 === 2) {
          // Snare / crash
          const bufferSize = this.ctx.sampleRate * 0.12;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let k = 0; k < bufferSize; k++) data[k] = Math.random() * 2 - 1;
          const snare = this.ctx.createBufferSource();
          snare.buffer = buffer;

          const snareFilter = this.ctx.createBiquadFilter();
          snareFilter.type = "bandpass";
          snareFilter.frequency.setValueAtTime(1800, stepTime);
          snareFilter.Q.value = 1.2;

          const snareGain = this.ctx.createGain();
          snareGain.gain.setValueAtTime(0.15, stepTime);
          snareGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.11);

          snare.connect(snareFilter);
          snareFilter.connect(snareGain);
          snareGain.connect(this.bgmGain!);
          snare.start(stepTime);
        }

        // --- 3. Arpeggio Melody (on some steps) ---
        if (step % 4 === 0 || step % 4 === 3 || step === 10) {
          const melFreq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
          const melOsc = this.ctx.createOscillator();
          const melGain = this.ctx.createGain();
          melOsc.type = "square";
          melOsc.frequency.setValueAtTime(melFreq, stepTime);

          melGain.gain.setValueAtTime(0.1, stepTime);
          melGain.gain.exponentialRampToValueAtTime(0.001, stepTime + stepDuration * 1.2);

          melOsc.connect(melGain);
          melGain.connect(this.bgmGain!);
          melOsc.start(stepTime);
          melOsc.stop(stepTime + stepDuration * 1.2);
        }
      }

      currentStep = (currentStep + 4) % 16;
    };

    scheduleStep();
    this.bgmTimer = window.setInterval(scheduleStep, stepDuration * 4 * 1000);
  }

  public stopBGM() {
    this.isPlayingBgm = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const audioEngine = new SoundEngine();
