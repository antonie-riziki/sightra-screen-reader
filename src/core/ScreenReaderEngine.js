/**
 * ScreenReaderEngine.js - Main coordinator for Sightra Screen Reader
 * Integrates speech synthesis, spatial earcons, haptics, ARIA live regions, and vision pipeline.
 */

import { EarconEngine } from './EarconEngine.js';
import { HapticEngine } from './HapticEngine.js';
import { SpeechSynthesizer } from './SpeechSynthesizer.js';
import { SpeechQueue, SPEECH_PRIORITY } from './SpeechQueue.js';
import { AriaLiveManager } from '../a11y/AriaLiveManager.js';
import { KeyboardCommander } from '../a11y/KeyboardCommander.js';
import { SightraBridge } from './SightraBridge.js';

import { ContinuousNavMode } from '../modes/ContinuousNavMode.js';
import { TouchExploreMode } from '../modes/TouchExploreMode.js';
import { TextReaderMode } from '../modes/TextReaderMode.js';
import { ObjectAuditMode } from '../modes/ObjectAuditMode.js';

export class ScreenReaderEngine {
  constructor(options = {}) {
    this.options = options;
    this.active = false;
    this.currentModeName = options.initialMode || 'continuous';

    // Subsystems
    this.earcons = new EarconEngine({
      enabled: options.enableEarcons ?? true,
      volume: options.earconVolume ?? 0.7,
    });

    this.haptics = new HapticEngine({
      enabled: options.enableHaptics ?? true,
    });

    this.synth = new SpeechSynthesizer({
      rate: options.speechRate ?? 1.0,
      pitch: options.speechPitch ?? 1.0,
      volume: options.speechVolume ?? 1.0,
      voiceURI: options.voiceURI || null,
    });

    this.queue = new SpeechQueue(this.synth, this.earcons, this.haptics, {
      minRepeatIntervalMs: options.minRepeatIntervalMs || 7000,
      onStateChange: (event, data, state) => this._emit('stateChange', { event, data, state }),
    });

    this.aria = new AriaLiveManager();
    this.bridge = new SightraBridge({
      endpoint: options.endpoint || '/api/navigation/stream/',
      baseUrl: options.baseUrl || '',
      mockMode: options.mockMode ?? false,
    });

    // Modes
    this.modes = {
      continuous: new ContinuousNavMode(this),
      touch: new TouchExploreMode(this),
      text: new TextReaderMode(this),
    };
    this.objectAudit = new ObjectAuditMode(this);

    // Keyboard Commander
    this.keyboard = new KeyboardCommander(this, {
      enabled: options.enableKeyboardShortcuts ?? true,
    });

    this._listeners = {};
    this.latestVisionResult = null;
  }

  /**
   * Starts the screen reader engine
   */
  start() {
    if (this.active) return;
    this.active = true;
    this.earcons.play('scan_start');
    this.haptics.vibrate('scan_start');
    this.aria.announcePolite('Sightra screen reader active. Mode: ' + this.getActiveMode().label);
    this.speakDirect(`Sightra screen reader ready in ${this.getActiveMode().label} mode.`, {
      priority: SPEECH_PRIORITY.USER_PROMPT,
    });
    this._emit('start', { mode: this.currentModeName });
  }

  /**
   * Stops the screen reader and silences audio
   */
  stop() {
    if (!this.active) return;
    this.active = false;
    this.silence();
    this.earcons.play('scan_stop');
    this.haptics.vibrate('scan_stop');
    this.aria.announcePolite('Sightra screen reader stopped.');
    this._emit('stop');
  }

  /**
   * Ingests a new vision payload from Sightra backend or camera capture
   */
  processVisionResult(result) {
    if (!this.active || !result) return;
    this.latestVisionResult = result;

    const currentMode = this.getActiveMode();
    if (currentMode && typeof currentMode.onVisionResult === 'function') {
      currentMode.onVisionResult(result);
    }
    this._emit('visionResult', result);
  }

  getActiveMode() {
    return this.modes[this.currentModeName] || this.modes.continuous;
  }

  setMode(modeName) {
    if (!this.modes[modeName]) return;
    this.currentModeName = modeName;
    this.earcons.play('mode_switch');
    this.haptics.vibrate('mode_switch');
    const label = this.getActiveMode().label;
    this.speakDirect(`Switched to ${label} mode.`, { priority: SPEECH_PRIORITY.USER_PROMPT });
    this.aria.announcePolite(`Screen reader mode: ${label}`);
    this._emit('modeChange', { mode: modeName, label });
  }

  cycleMode() {
    const modeNames = Object.keys(this.modes);
    const currIdx = modeNames.indexOf(this.currentModeName);
    const nextIdx = (currIdx + 1) % modeNames.length;
    this.setMode(modeNames[nextIdx]);
    return this.getActiveMode().label;
  }

  inspectPoint(clientX, clientY, viewportRect) {
    if (this.currentModeName !== 'touch') {
      this.setMode('touch');
    }
    this.modes.touch.inspectPoint(clientX, clientY, viewportRect);
  }

  announceHazards() {
    const res = this.latestVisionResult;
    if (res && res.hazardAlert) {
      this.speakDirect(`Active Hazard: ${res.hazardAlert}`, {
        priority: SPEECH_PRIORITY.EMERGENCY,
        earcon: 'hazard',
      });
      this.aria.announceHazard(`Active Hazard: ${res.hazardAlert}`);
    } else {
      const msg = 'No immediate hazards detected in your forward pathway.';
      this.speakDirect(msg, { priority: SPEECH_PRIORITY.USER_PROMPT });
      this.aria.announcePolite(msg);
    }
  }

  announceObjectAudit() {
    const objects = this.latestVisionResult?.objects || [];
    this.objectAudit.audit(objects);
  }

  repeatLast() {
    return this.queue.repeatLast();
  }

  silence() {
    this.queue.clear();
    this.earcons.audioCtx?.suspend();
    this.haptics.cancel();
  }

  togglePause() {
    return this.queue.togglePause();
  }

  adjustRate(delta) {
    const newRate = Math.round((this.synth.rate + delta) * 10) / 10;
    this.synth.setRate(newRate);
    const msg = `Speech speed ${newRate}x`;
    this.speakDirect(msg, { priority: SPEECH_PRIORITY.USER_PROMPT });
    this.aria.announcePolite(msg);
    this._emit('rateChange', newRate);
  }

  speakDirect(text, options = {}) {
    this.queue.enqueue(text, options);
  }

  // Event listener management
  on(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  }

  off(event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((h) => h !== handler);
  }

  _emit(event, data) {
    const handlers = this._listeners[event];
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch {
          // Keep execution resilient
        }
      });
    }
  }
}
