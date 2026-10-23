/**
 * ObjectAuditMode.js - Structured spatial audit of all detected objects in scene
 */

import { SPEECH_PRIORITY } from '../core/SpeechQueue.js';

export class ObjectAuditMode {
  constructor(screenReader) {
    this.sr = screenReader;
  }

  audit(objects = []) {
    if (!objects || objects.length === 0) {
      const msg = 'No distinct objects identified in your immediate surroundings.';
      this.sr.queue.enqueue(msg, { priority: SPEECH_PRIORITY.USER_PROMPT });
      this.sr.aria.announcePolite(msg);
      return;
    }

    // Sort by proximity: immediate -> near -> medium -> far
    const order = { immediate: 0, near: 1, medium: 2, far: 3 };
    const sorted = [...objects].sort((a, b) => (order[a.distance] ?? 2) - (order[b.distance] ?? 2));

    const count = sorted.length;
    const summary = `${count} object${count > 1 ? 's' : ''} detected: ` +
      sorted
        .map((o, idx) => `${idx + 1}. ${o.label}, ${o.distance} at ${o.position}`)
        .join('. ');

    this.sr.queue.enqueue(summary, {
      priority: SPEECH_PRIORITY.USER_PROMPT,
      earcon: 'obstacle_far',
      meta: { type: 'object_audit', count },
    });
    this.sr.aria.announcePolite(summary);
  }
}
