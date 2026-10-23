/**
 * SpeechQueue.js - Priority-based speech queue with emergency pre-emption and deduplication
 */

export const SPEECH_PRIORITY = {
  AMBIENT: 0,
  NAVIGATION: 1,
  USER_PROMPT: 2,
  EMERGENCY: 3,
};

export class SpeechQueue {
  constructor(synthesizer, earconEngine, hapticEngine, options = {}) {
    this.synth = synthesizer;
    this.earcons = earconEngine;
    this.haptics = hapticEngine;

    this.queue = [];
    this.activeItem = null;
    this.paused = false;

    this.minRepeatIntervalMs = options.minRepeatIntervalMs || 7000;
    this.lastSpokenText = '';
    this.lastSpokenTimestamp = 0;
    this.history = [];
    this.maxHistorySize = 25;

    this.onStateChange = options.onStateChange || null;
  }

  enqueue(text, { priority = SPEECH_PRIORITY.NAVIGATION, earcon = null, haptic = null, panX = 0.5, meta = null } = {}) {
    const cleaned = (text || '').trim();
    if (!cleaned) return;

    // Deduplication check for low/ambient priority
    const now = Date.now();
    if (
      priority <= SPEECH_PRIORITY.NAVIGATION &&
      cleaned === this.lastSpokenText &&
      now - this.lastSpokenTimestamp < this.minRepeatIntervalMs
    ) {
      return;
    }

    const item = {
      id: Math.random().toString(36).substring(2, 9),
      text: cleaned,
      priority,
      earcon,
      haptic,
      panX,
      meta,
      timestamp: now,
    };

    // Emergency Pre-emption: interrupt immediately
    if (priority === SPEECH_PRIORITY.EMERGENCY) {
      this.synth.cancel();
      // Drop pending ambient messages to avoid queue clogging
      this.queue = this.queue.filter((q) => q.priority >= SPEECH_PRIORITY.USER_PROMPT);
      this.queue.unshift(item);
      this.activeItem = null;
      this._notify('preempt', item);
      this._processNext();
      return;
    }

    // Insert sorted by priority (higher priority first)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (item.priority > this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this.queue.splice(insertIndex, 0, item);
    this._notify('enqueue', item);
    this._processNext();
  }

  _processNext() {
    if (this.paused || this.synth.speaking || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    this.activeItem = item;

    // Trigger accompanying earcon and haptics
    if (item.earcon && this.earcons) {
      this.earcons.play(item.earcon, { panX: item.panX });
    }
    if (item.haptic && this.haptics) {
      this.haptics.vibrate(item.haptic);
    }

    this.lastSpokenText = item.text;
    this.lastSpokenTimestamp = Date.now();

    this._recordHistory(item);
    this._notify('speak', item);

    this.synth.speak(item.text, {
      urgent: item.priority === SPEECH_PRIORITY.EMERGENCY,
      onStart: () => {
        this._notify('speaking', item);
      },
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

  _recordHistory(item) {
    this.history.unshift({
      text: item.text,
      priority: item.priority,
      timestamp: item.timestamp,
      meta: item.meta,
    });
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }

  repeatLast() {
    if (this.history.length > 0) {
      const last = this.history[0];
      this.enqueue(`Repeating: ${last.text}`, {
        priority: SPEECH_PRIORITY.USER_PROMPT,
        earcon: 'obstacle_far',
      });
      return last.text;
    }
    this.enqueue('No previous announcements to repeat.', { priority: SPEECH_PRIORITY.USER_PROMPT });
    return null;
  }

  clear() {
    this.synth.cancel();
    this.queue = [];
    this.activeItem = null;
    this._notify('clear');
  }

  pause() {
    this.paused = true;
    this.synth.pause();
    this._notify('pause');
  }

  resume() {
    this.paused = false;
    this.synth.resume();
    this._notify('resume');
    this._processNext();
  }

  togglePause() {
    if (this.paused) this.resume();
    else this.pause();
    return this.paused;
  }

  _notify(event, data) {
    if (typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(event, data, {
          speaking: this.synth.speaking,
          paused: this.paused,
          queueLength: this.queue.length,
          activeText: this.activeItem?.text || '',
        });
      } catch {
        // Safe callback execution
      }
    }
  }
}
