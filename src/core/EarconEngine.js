/**
 * EarconEngine.js - Spatial Web Audio Synthesizer for Sightra Screen Reader
 * Generates non-speech auditory cues (earcons) with 3D stereo panning and frequency modulation.
 */

export class EarconEngine {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.volume = options.volume ?? 0.7;
    this.audioCtx = null;
    this._initialized = false;
  }

  _getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Calculates stereo pan (-1.0 to 1.0) from normalized X coordinate (0.0 to 1.0)
   */
  _calculatePan(normalizedX = 0.5) {
    return Math.max(-1.0, Math.min(1.0, (normalizedX - 0.5) * 2.0));
  }

  /**
   * Plays a synthesized earcon with optional stereo panning
   * @param {string} type - 'hazard' | 'obstacle' | 'proximity' | 'tick' | 'start' | 'stop' | 'mode'
   * @param {Object} opts - { panX: 0.5, distance: 'near'|'medium'|'far', freq: 440 }
   */
  play(type, opts = {}) {
    if (!this.enabled) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const panVal = this._calculatePan(opts.panX ?? 0.5);
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, now);

    let panner = null;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      masterGain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      masterGain.connect(ctx.destination);
    }

    switch (type) {
      case 'hazard':
      case 'emergency': {
        // High-urgency alert: Rapid alternating dual frequencies
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const alertGain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.setValueAtTime(1174.66, now + 0.1);
        osc1.frequency.setValueAtTime(880, now + 0.2);
        osc1.frequency.setValueAtTime(1174.66, now + 0.3);

        osc2.frequency.setValueAtTime(440, now);

        alertGain.gain.setValueAtTime(0.8, now);
        alertGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc1.connect(alertGain);
        osc2.connect(alertGain);
        alertGain.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
        break;
      }

      case 'obstacle_near': {
        // Warning pulsed tone for obstacles < 1.5m
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.18); // C5

        g.gain.setValueAtTime(0.7, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'obstacle_far': {
        // Soft single locator ping
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4

        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'touch_hover': {
        // Crisp spatial tick for screen touching / cursor inspection
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const targetFreq = opts.freq || (opts.distance === 'near' ? 750 : 450);
        osc.frequency.setValueAtTime(targetFreq, now);

        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case 'scan_start': {
        // Ascending harmonic chime
        [329.63, 440, 554.37].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.07);

          g.gain.setValueAtTime(0.4, now + idx * 0.07);
          g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.2);

          osc.connect(g);
          g.connect(masterGain);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.2);
        });
        break;
      }

      case 'scan_stop': {
        // Descending chime
        [554.37, 440, 329.63].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.07);

          g.gain.setValueAtTime(0.4, now + idx * 0.07);
          g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.2);

          osc.connect(g);
          g.connect(masterGain);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.2);
        });
        break;
      }

      case 'mode_switch': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5

        g.gain.setValueAtTime(0.5, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      default:
        break;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggle(enable) {
    this.enabled = typeof enable === 'boolean' ? enable : !this.enabled;
    return this.enabled;
  }
}
