(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SightraScreenReader = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- EarconEngine ---
  class EarconEngine {
    constructor(options = {}) {
      this.enabled = options.enabled ?? true;
      this.volume = options.volume ?? 0.7;
      this.audioCtx = null;
    }
    _getAudioContext() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    }
    _calculatePan(normalizedX = 0.5) {
      return Math.max(-1.0, Math.min(1.0, (normalizedX - 0.5) * 2.0));
    }
    play(type, opts = {}) {
      if (!this.enabled) return;
      const ctx = this._getAudioContext();
      if (!ctx) return;
      const panVal = this._calculatePan(opts.panX ?? 0.5);
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);

      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(panVal, now);
        masterGain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        masterGain.connect(ctx.destination);
      }

      switch (type) {
        case 'hazard':
        case 'emergency': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const g = ctx.createGain();
          osc1.type = 'sawtooth';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(880, now);
          osc1.frequency.setValueAtTime(1174.66, now + 0.1);
          osc1.frequency.setValueAtTime(880, now + 0.2);
          osc1.frequency.setValueAtTime(1174.66, now + 0.3);
          osc2.frequency.setValueAtTime(440, now);
          g.gain.setValueAtTime(0.8, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
          osc1.connect(g);
          osc2.connect(g);
          g.connect(masterGain);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.45);
          osc2.stop(now + 0.45);
          break;
        }
        case 'obstacle_near': {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(659.25, now);
          osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.18);
          g.gain.setValueAtTime(0.7, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 'obstacle_far': {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          g.gain.setValueAtTime(0.4, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'touch_hover': {
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
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.setValueAtTime(880, now + 0.08);
          g.gain.setValueAtTime(0.5, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }
      }
    }
    toggle(enable) {
      this.enabled = typeof enable === 'boolean' ? enable : !this.enabled;
      return this.enabled;
    }
  }

  // --- HapticEngine ---
  class HapticEngine {
    constructor(options = {}) {
      this.enabled = options.enabled ?? true;
      this.supported = typeof navigator !== 'undefined' && Boolean(navigator.vibrate);
    }
    vibrate(patternType) {
      if (!this.enabled || !this.supported) return;
      try {
        switch (patternType) {
          case 'hazard':
          case 'emergency':
            navigator.vibrate([180, 60, 180, 60, 250]);
            break;
          case 'obstacle_near':
            navigator.vibrate([120, 70, 120]);
            break;
          case 'touch_hover':
            navigator.vibrate(25);
            break;
          case 'scan_start':
            navigator.vibrate([50, 50, 100]);
            break;
          case 'scan_stop':
            navigator.vibrate([100, 50, 50]);
            break;
          case 'mode_switch':
            navigator.vibrate([40, 40, 40]);
            break;
        }
      } catch {}
    }
    cancel() {
      if (this.supported) navigator.vibrate(0);
    }
  }

  // --- SpeechSynthesizer ---
  class SpeechSynthesizer {
    constructor(options = {}) {
      this.rate = options.rate ?? 1.0;
      this.pitch = options.pitch ?? 1.0;
      this.volume = options.volume ?? 1.0;
      this.selectedVoiceURI = options.voiceURI || null;
      this.speaking = false;
      this.availableVoices = [];
      this._initVoices();
    }
    _initVoices() {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const updateVoices = () => {
        this.availableVoices = window.speechSynthesis.getVoices() || [];
      };
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
    getBestVoice(lang = 'en') {
      if (!this.availableVoices.length) {
        this.availableVoices = window.speechSynthesis?.getVoices() || [];
      }
      if (this.selectedVoiceURI) {
        const match = this.availableVoices.find((v) => v.voiceURI === this.selectedVoiceURI);
        if (match) return match;
      }
      const langPrefix = lang.split('-')[0].toLowerCase();
      const matching = this.availableVoices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
      const preferred = matching.find(
        (v) =>
          v.name.includes('Natural') ||
          v.name.includes('Enhanced') ||
          v.name.includes('Samantha') ||
          v.name.includes('Google') ||
          v.name.includes('Daniel')
      );
      return preferred || matching[0] || this.availableVoices[0] || null;
    }
    speak(text, { onStart, onEnd, onError, lang = 'en-US', urgent = false } = {}) {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (onError) onError(new Error('SpeechSynthesis unavailable'));
        return;
      }
      const cleaned = (text || '').trim();
      if (!cleaned) {
        if (onEnd) onEnd();
        return;
      }
      if (urgent) this.cancel();

      const utter = new SpeechSynthesisUtterance(cleaned);
      utter.rate = this.rate;
      utter.pitch = this.pitch;
      utter.volume = this.volume;
      utter.lang = lang;
      const voice = this.getBestVoice(lang);
      if (voice) utter.voice = voice;

      this.speaking = true;
      utter.onstart = () => {
        this.speaking = true;
        if (onStart) onStart();
      };
      utter.onend = () => {
        this.speaking = false;
        if (onEnd) onEnd();
      };
      utter.onerror = (e) => {
        this.speaking = false;
        if (onError) onError(e);
        else if (onEnd) onEnd();
      };
      window.speechSynthesis.speak(utter);
    }
    cancel() {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.speaking = false;
    }
    pause() {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.pause();
    }
    resume() {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.resume();
    }
    setRate(r) {
      this.rate = Math.max(0.5, Math.min(3.0, Number(r) || 1.0));
    }
  }

  // --- SpeechQueue ---
  const SPEECH_PRIORITY = { AMBIENT: 0, NAVIGATION: 1, USER_PROMPT: 2, EMERGENCY: 3 };

  class SpeechQueue {
    constructor(synth, earcons, haptics, options = {}) {
      this.synth = synth;
      this.earcons = earcons;
      this.haptics = haptics;
      this.queue = [];
      this.activeItem = null;
      this.paused = false;
      this.minRepeatIntervalMs = options.minRepeatIntervalMs || 7000;
      this.lastSpokenText = '';
      this.lastSpokenTimestamp = 0;
      this.history = [];
      this.onStateChange = options.onStateChange || null;
    }
    enqueue(text, { priority = SPEECH_PRIORITY.NAVIGATION, earcon = null, haptic = null, panX = 0.5, meta = null } = {}) {
      const cleaned = (text || '').trim();
      if (!cleaned) return;
      const now = Date.now();
      if (
        priority <= SPEECH_PRIORITY.NAVIGATION &&
        cleaned === this.lastSpokenText &&
        now - this.lastSpokenTimestamp < this.minRepeatIntervalMs
      ) {
        return;
      }
      const item = { text: cleaned, priority, earcon, haptic, panX, meta, timestamp: now };

      if (priority === SPEECH_PRIORITY.EMERGENCY) {
        this.synth.cancel();
        this.queue = this.queue.filter((q) => q.priority >= SPEECH_PRIORITY.USER_PROMPT);
        this.queue.unshift(item);
        this.activeItem = null;
        this._notify('preempt', item);
        this._processNext();
        return;
      }

      let idx = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        if (item.priority > this.queue[i].priority) {
          idx = i;
          break;
        }
      }
      this.queue.splice(idx, 0, item);
      this._notify('enqueue', item);
      this._processNext();
    }
    _processNext() {
      if (this.paused || this.synth.speaking || this.queue.length === 0) return;
      const item = this.queue.shift();
      this.activeItem = item;

      if (item.earcon && this.earcons) this.earcons.play(item.earcon, { panX: item.panX });
      if (item.haptic && this.haptics) this.haptics.vibrate(item.haptic);

      this.lastSpokenText = item.text;
      this.lastSpokenTimestamp = Date.now();
      this.history.unshift(item);
      if (this.history.length > 25) this.history.pop();

      this._notify('speak', item);
      this.synth.speak(item.text, {
        urgent: item.priority === SPEECH_PRIORITY.EMERGENCY,
        onStart: () => this._notify('speaking', item),
        onEnd: () => {
          this.activeItem = null;
          this._notify('idle', item);
          this._processNext();
        },
        onError: () => {
          this.activeItem = null;
          this._notify('idle', item);
          this._processNext();
        },
      });
    }
    repeatLast() {
      if (this.history.length > 0) {
        const last = this.history[0];
        this.enqueue(`Repeating: ${last.text}`, { priority: SPEECH_PRIORITY.USER_PROMPT, earcon: 'obstacle_far' });
        return last.text;
      }
      this.enqueue('No previous announcements.', { priority: SPEECH_PRIORITY.USER_PROMPT });
      return null;
    }
    clear() {
      this.synth.cancel();
      this.queue = [];
      this.activeItem = null;
      this._notify('clear');
    }
    togglePause() {
      this.paused = !this.paused;
      if (this.paused) this.synth.pause();
      else {
        this.synth.resume();
        this._processNext();
      }
      this._notify(this.paused ? 'pause' : 'resume');
      return this.paused;
    }
    _notify(event, data) {
      if (typeof this.onStateChange === 'function') {
        try {
          this.onStateChange(event, data, { speaking: this.synth.speaking, paused: this.paused, queueLength: this.queue.length });
        } catch {}
      }
    }
  }

  // --- AriaLiveManager ---
  class AriaLiveManager {
    constructor() {
      this._init();
    }
    _init() {
      if (typeof document === 'undefined') return;
      let c = document.getElementById('sightra-sr-container');
      if (!c) {
        c = document.createElement('div');
        c.id = 'sightra-sr-container';
        c.style.cssText = 'position:absolute!important;width:1px!important;height:1px!important;clip:rect(0,0,0,0)!important;overflow:hidden!important;';
        document.body.appendChild(c);
      }
      this.assertive = document.getElementById('sightra-sr-assertive') || this._create(c, 'sightra-sr-assertive', 'alert', 'assertive');
      this.polite = document.getElementById('sightra-sr-polite') || this._create(c, 'sightra-sr-polite', 'status', 'polite');
    }
    _create(parent, id, role, live) {
      const el = document.createElement('div');
      el.id = id;
      el.setAttribute('role', role);
      el.setAttribute('aria-live', live);
      el.setAttribute('aria-atomic', 'true');
      parent.appendChild(el);
      return el;
    }
    announceHazard(text) {
      this._post(this.assertive, text);
    }
    announcePolite(text) {
      this._post(this.polite, text);
    }
    _post(el, text) {
      if (!el || !text) return;
      el.textContent = '';
      setTimeout(() => { el.textContent = text.trim(); }, 40);
    }
  }

  // --- KeyboardCommander ---
  class KeyboardCommander {
    constructor(sr) {
      this.sr = sr;
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e) => {
          const t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          switch (e.code) {
            case 'Space':
              e.preventDefault();
              const p = this.sr.togglePause();
              this.sr.aria.announcePolite(p ? 'Speech paused' : 'Speech resumed');
              break;
            case 'KeyR':
              e.preventDefault();
              this.sr.repeatLast();
              break;
            case 'KeyH':
              e.preventDefault();
              this.sr.announceHazards();
              break;
            case 'KeyO':
              e.preventDefault();
              this.sr.announceObjectAudit();
              break;
            case 'KeyM':
              e.preventDefault();
              this.sr.cycleMode();
              break;
            case 'BracketRight':
              e.preventDefault();
              this.sr.adjustRate(0.2);
              break;
            case 'BracketLeft':
              e.preventDefault();
              this.sr.adjustRate(-0.2);
              break;
            case 'Escape':
              e.preventDefault();
              this.sr.silence();
              break;
          }
        });
      }
    }
  }

  // --- Modes ---
  class ContinuousNavMode {
    constructor(sr) {
      this.sr = sr;
      this.label = 'Continuous Navigation';
      this.lastFp = '';
    }
    onVisionResult(res) {
      if (!res) return;
      if (res.hazardAlert) {
        this.sr.queue.enqueue(res.hazardAlert, { priority: SPEECH_PRIORITY.EMERGENCY, earcon: 'hazard', haptic: 'hazard' });
        this.sr.aria.announceHazard(`Urgent Hazard: ${res.hazardAlert}`);
        return;
      }
      const immediate = res.objects.filter((o) => o.distance === 'immediate' && o.label !== 'door');
      if (immediate.length > 0) {
        const o = immediate[0];
        const panX = (o.box[0] + o.box[2] / 2) / 640;
        const msg = `Caution: ${o.label} directly ahead at ${o.position}.`;
        this.sr.queue.enqueue(msg, { priority: SPEECH_PRIORITY.EMERGENCY, earcon: 'obstacle_near', haptic: 'obstacle_near', panX });
        this.sr.aria.announceHazard(msg);
        return;
      }
      if (res.analysisText) {
        const fp = res.objects.map((o) => `${o.label}@${o.position}`).sort().join('|');
        this.sr.queue.enqueue(res.analysisText, {
          priority: SPEECH_PRIORITY.NAVIGATION,
          earcon: fp !== this.lastFp && res.objects.length > 0 ? 'obstacle_far' : null,
        });
        this.sr.aria.announcePolite(res.analysisText);
        this.lastFp = fp;
      }
    }
  }

  class TouchExploreMode {
    constructor(sr) {
      this.sr = sr;
      this.label = 'Touch & Spatial Exploration';
      this.latestObjects = [];
      this.lastHovered = null;
    }
    onVisionResult(res) {
      if (res && res.objects) this.latestObjects = res.objects;
    }
    inspectPoint(cx, cy, rect) {
      if (!rect || rect.width === 0) return;
      const nx = (cx - rect.left) / rect.width;
      const ny = (cy - rect.top) / rect.height;
      const fx = nx * 640;
      const fy = ny * 480;
      const hit = this.latestObjects.find((o) => {
        const [ox, oy, ow, oh] = o.box;
        return fx >= ox && fx <= ox + ow && fy >= oy && fy <= oy + oh;
      });
      if (hit) {
        if (this.lastHovered === hit.label && this.sr.synth.speaking) return;
        this.lastHovered = hit.label;
        const msg = `${hit.label}, ${hit.distance} at ${hit.position}.`;
        this.sr.earcons.play('touch_hover', { panX: nx, distance: hit.distance, freq: hit.distance === 'near' ? 800 : 500 });
        this.sr.haptics.vibrate('touch_hover');
        this.sr.queue.enqueue(msg, { priority: SPEECH_PRIORITY.USER_PROMPT, panX: nx });
        this.sr.aria.announcePolite(msg);
      } else {
        this.lastHovered = null;
        this.sr.earcons.play('touch_hover', { panX: nx, freq: 300 });
      }
    }
  }

  class TextReaderMode {
    constructor(sr) {
      this.sr = sr;
      this.label = 'Text & Signage Reader';
    }
    onVisionResult(res) {
      if (!res || !res.analysisText) return;
      this.sr.queue.enqueue(`Text detected: ${res.analysisText}`, { priority: SPEECH_PRIORITY.USER_PROMPT, earcon: 'obstacle_far' });
      this.sr.aria.announcePolite(res.analysisText);
    }
  }

  class ObjectAuditMode {
    constructor(sr) {
      this.sr = sr;
    }
    audit(objects = []) {
      if (!objects.length) {
        const msg = 'No distinct objects identified in your surroundings.';
        this.sr.queue.enqueue(msg, { priority: SPEECH_PRIORITY.USER_PROMPT });
        this.sr.aria.announcePolite(msg);
        return;
      }
      const order = { immediate: 0, near: 1, medium: 2, far: 3 };
      const sorted = [...objects].sort((a, b) => (order[a.distance] ?? 2) - (order[b.distance] ?? 2));
      const summary = `${sorted.length} objects detected: ` + sorted.map((o, idx) => `${idx + 1}. ${o.label}, ${o.distance} at ${o.position}`).join('. ');
      this.sr.queue.enqueue(summary, { priority: SPEECH_PRIORITY.USER_PROMPT, earcon: 'obstacle_far' });
      this.sr.aria.announcePolite(summary);
    }
  }

  // --- SightraBridge ---
  class SightraBridge {
    constructor(options = {}) {
      this.endpoint = options.endpoint || '/api/navigation/stream/';
      this.baseUrl = options.baseUrl || '';
      this.mockMode = options.mockMode ?? false;
      this.isFlight = false;
    }
    _normalizeResponse(raw) {
      const meta = raw.metadata || {};
      return {
        success: true,
        analysisText: raw.analysis_text || '',
        hazardAlert: raw.hazard_alert || null,
        warnings: raw.warnings || meta.warnings || [],
        objects: (meta.objects || []).map((o) => ({
          label: o.label || 'unknown',
          confidence: o.confidence ?? 0.5,
          box: o.box || [0, 0, 0, 0],
          distance: o.box && o.box[3] > 180 ? 'immediate' : o.box && o.box[3] > 90 ? 'near' : 'medium',
          position: o.box ? (o.box[0] + o.box[2] / 2 < 240 ? '10 o\'clock' : o.box[0] + o.box[2] / 2 > 400 ? '2 o\'clock' : '12 o\'clock') : '12 o\'clock',
        })),
        depth: meta.depth || {},
        raw,
      };
    }
  }

  // --- ScreenReaderEngine ---
  class ScreenReaderEngine {
    constructor(options = {}) {
      this.active = false;
      this.currentModeName = options.initialMode || 'continuous';
      this.earcons = new EarconEngine({ enabled: options.enableEarcons ?? true });
      this.haptics = new HapticEngine({ enabled: options.enableHaptics ?? true });
      this.synth = new SpeechSynthesizer({ rate: options.speechRate ?? 1.0 });
      this.queue = new SpeechQueue(this.synth, this.earcons, this.haptics, {
        onStateChange: (ev, d, s) => this._emit('stateChange', { event: ev, data: d, state: s }),
      });
      this.aria = new AriaLiveManager();
      this.bridge = new SightraBridge(options);
      this.modes = {
        continuous: new ContinuousNavMode(this),
        touch: new TouchExploreMode(this),
        text: new TextReaderMode(this),
      };
      this.objectAudit = new ObjectAuditMode(this);
      this.keyboard = new KeyboardCommander(this);
      this._listeners = {};
      this.latestResult = null;
    }
    start() {
      if (this.active) return;
      this.active = true;
      this.earcons.play('scan_start');
      this.haptics.vibrate('scan_start');
      const label = this.getActiveMode().label;
      this.speakDirect(`Sightra screen reader active. Mode: ${label}.`, { priority: SPEECH_PRIORITY.USER_PROMPT });
      this._emit('start', { mode: this.currentModeName });
    }
    stop() {
      if (!this.active) return;
      this.active = false;
      this.silence();
      this.earcons.play('scan_stop');
      this.haptics.vibrate('scan_stop');
      this._emit('stop');
    }
    processVisionResult(res) {
      if (!this.active || !res) return;
      this.latestResult = res;
      this.getActiveMode().onVisionResult(res);
      this._emit('visionResult', res);
    }
    getActiveMode() {
      return this.modes[this.currentModeName] || this.modes.continuous;
    }
    setMode(name) {
      if (!this.modes[name]) return;
      this.currentModeName = name;
      this.earcons.play('mode_switch');
      this.haptics.vibrate('mode_switch');
      const label = this.getActiveMode().label;
      this.speakDirect(`Switched to ${label}.`, { priority: SPEECH_PRIORITY.USER_PROMPT });
      this.aria.announcePolite(`Mode: ${label}`);
      this._emit('modeChange', { mode: name, label });
    }
    cycleMode() {
      const keys = Object.keys(this.modes);
      const next = keys[(keys.indexOf(this.currentModeName) + 1) % keys.length];
      this.setMode(next);
      return this.getActiveMode().label;
    }
    inspectPoint(cx, cy, rect) {
      if (this.currentModeName !== 'touch') this.setMode('touch');
      this.modes.touch.inspectPoint(cx, cy, rect);
    }
    announceHazards() {
      if (this.latestResult?.hazardAlert) {
        this.speakDirect(`Active Hazard: ${this.latestResult.hazardAlert}`, { priority: SPEECH_PRIORITY.EMERGENCY, earcon: 'hazard' });
      } else {
        this.speakDirect('No hazards detected in your forward pathway.', { priority: SPEECH_PRIORITY.USER_PROMPT });
      }
    }
    announceObjectAudit() {
      this.objectAudit.audit(this.latestResult?.objects || []);
    }
    repeatLast() {
      return this.queue.repeatLast();
    }
    silence() {
      this.queue.clear();
      this.haptics.cancel();
    }
    togglePause() {
      return this.queue.togglePause();
    }
    adjustRate(delta) {
      const r = Math.round((this.synth.rate + delta) * 10) / 10;
      this.synth.setRate(r);
      this.speakDirect(`Speed ${r}x`, { priority: SPEECH_PRIORITY.USER_PROMPT });
      this._emit('rateChange', r);
    }
    speakDirect(text, opts = {}) {
      this.queue.enqueue(text, opts);
    }
    on(ev, fn) {
      (this._listeners[ev] = this._listeners[ev] || []).push(fn);
    }
    _emit(ev, d) {
      (this._listeners[ev] || []).forEach((fn) => { try { fn(d); } catch {} });
    }
  }

  // --- ScreenReaderHUD ---
  class ScreenReaderHUD {
    constructor(sr, container = document.body) {
      this.sr = sr;
      this.root = document.createElement('section');
      this.root.className = 'sightra-sr-hud';
      this.root.innerHTML = `
        <div class="sr-hud-panel">
          <header class="sr-hud-header">
            <div class="sr-hud-badge">
              <span class="sr-status-dot" id="sr-dot"></span>
              <span id="sr-title" class="sr-hud-title">SCREEN READER: CONTINUOUS</span>
            </div>
            <div class="sr-hud-actions">
              <button id="sr-rate" class="sr-hud-btn-mini">1.0x</button>
              <button id="sr-rep" class="sr-hud-btn-mini">↻</button>
              <button id="sr-pause" class="sr-hud-btn-mini">⏸</button>
            </div>
          </header>
          <div class="sr-subtitles-box">
            <p id="sr-sub" class="sr-subtitle-text">Ready. Audio guidance active.</p>
          </div>
          <nav class="sr-mode-selector">
            <button class="sr-mode-pill active" id="pill-cont">Continuous</button>
            <button class="sr-mode-pill" id="pill-touch">Touch Explore</button>
            <button class="sr-mode-pill" id="pill-text">Text/Signs</button>
            <button class="sr-mode-pill" id="pill-audit">Audit (O)</button>
          </nav>
        </div>
      `;
      container.appendChild(this.root);

      const dot = this.root.querySelector('#sr-dot');
      const sub = this.root.querySelector('#sr-sub');
      const title = this.root.querySelector('#sr-title');
      const rateBtn = this.root.querySelector('#sr-rate');

      this.sr.on('stateChange', ({ data, state }) => {
        if (data?.text) sub.textContent = data.text;
        dot.classList.toggle('speaking', state.speaking);
      });
      this.sr.on('modeChange', ({ mode, label }) => {
        title.textContent = `SCREEN READER: ${label.toUpperCase()}`;
        this.root.querySelector('#pill-cont').classList.toggle('active', mode === 'continuous');
        this.root.querySelector('#pill-touch').classList.toggle('active', mode === 'touch');
        this.root.querySelector('#pill-text').classList.toggle('active', mode === 'text');
      });
      this.sr.on('rateChange', (r) => { rateBtn.textContent = `${r}x`; });

      this.root.querySelector('#pill-cont').onclick = () => this.sr.setMode('continuous');
      this.root.querySelector('#pill-touch').onclick = () => this.sr.setMode('touch');
      this.root.querySelector('#pill-text').onclick = () => this.sr.setMode('text');
      this.root.querySelector('#pill-audit').onclick = () => this.sr.announceObjectAudit();
      this.root.querySelector('#sr-rep').onclick = () => this.sr.repeatLast();
      this.root.querySelector('#sr-pause').onclick = () => this.sr.togglePause();
      rateBtn.onclick = () => {
        let n = this.sr.synth.rate + 0.25;
        if (n > 2.0) n = 0.75;
        this.sr.adjustRate(n - this.sr.synth.rate);
      };
    }
  }

  // --- Plug-and-play Mount Function ---
  function mountToVisionPage(options = {}) {
    const engine = new ScreenReaderEngine(options);
    const hud = new ScreenReaderHUD(engine);

    // Disable raw browser utterance speech from sightra.net
    if (typeof window !== 'undefined') {
      window._sightraTTSHooked = true;
      if (typeof window.speakNonBlocking === 'function') {
        window.speakNonBlocking = () => {};
      }
    }

    // Attach to Sightra scan button
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        setTimeout(() => {
          const scanLabel = document.getElementById('scanLabel');
          const isScanning = scanLabel && (
            scanLabel.textContent.toLowerCase().includes('stop') ||
            scanLabel.classList.contains('vision-scan-label-active') ||
            scanLabel.classList.contains('text-error')
          );
          if (isScanning) engine.start();
          else engine.stop();
        }, 100);
      });
    }

    // Hook touch exploration
    const touchTarget = document.getElementById('dynamic-boxes') || document.getElementById('cameraElement') || document.body;
    if (touchTarget) {
      const handlePointer = (e) => {
        if (!engine.active) return;
        const rect = touchTarget.getBoundingClientRect();
        engine.inspectPoint(e.clientX, e.clientY, rect);
      };
      touchTarget.addEventListener('pointerdown', handlePointer);
      touchTarget.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) handlePointer({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
      });
    }

    // Intercept /api/navigation/stream/ responses
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/api/navigation/stream/') && response.ok) {
        try {
          const clone = response.clone();
          clone.json().then((data) => {
            if (engine.active) {
              const normalized = engine.bridge._normalizeResponse(data);
              engine.processVisionResult(normalized);
            }
          });
        } catch {}
      }
      return response;
    };

    console.log('[Sightra Screen Reader] Plugged successfully onto vision pipeline.');
    return { engine, hud };
  }

  return {
    Engine: ScreenReaderEngine,
    EarconEngine,
    HapticEngine,
    SpeechSynthesizer,
    SpeechQueue,
    SPEECH_PRIORITY,
    AriaLiveManager,
    KeyboardCommander,
    ScreenReaderHUD,
    mountToVisionPage,
  };
});
