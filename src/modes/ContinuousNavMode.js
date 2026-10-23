/**
 * ContinuousNavMode.js - Hands-free continuous navigation and hazard screen reader
 */

import { SPEECH_PRIORITY } from '../core/SpeechQueue.js';

export class ContinuousNavMode {
  constructor(screenReader) {
    this.sr = screenReader;
    this.name = 'continuous';
    this.label = 'Continuous Navigation';
    this.lastHazards = new Set();
    this.lastObjectFingerprint = '';
  }

  onVisionResult(result) {
    if (!result) return;

    // 1. Immediate Safety Hazards (Highest Priority Pre-emption)
    if (result.hazardAlert) {
      this.sr.queue.enqueue(result.hazardAlert, {
        priority: SPEECH_PRIORITY.EMERGENCY,
        earcon: 'hazard',
        haptic: 'hazard',
        meta: { type: 'hazard' },
      });
      this.sr.aria.announceHazard(`Urgent Hazard: ${result.hazardAlert}`);
      return;
    }

    // 2. Immediate Proximity Obstacles (< 1.5m)
    const immediateObstacles = result.objects.filter(
      (o) => o.distance === 'immediate' && o.label !== 'door'
    );
    if (immediateObstacles.length > 0) {
      const primary = immediateObstacles[0];
      const panX = (primary.box[0] + primary.box[2] / 2) / 640;
      const warningText = `Caution: ${primary.label} directly ahead at ${primary.position}.`;

      this.sr.queue.enqueue(warningText, {
        priority: SPEECH_PRIORITY.EMERGENCY,
        earcon: 'obstacle_near',
        haptic: 'obstacle_near',
        panX,
        meta: { type: 'obstacle' },
      });
      this.sr.aria.announceHazard(warningText);
      return;
    }

    // 3. Environmental Navigation Guidance
    if (result.analysisText) {
      const fingerprint = this._computeFingerprint(result.objects);
      const isSceneChanged = fingerprint !== this.lastObjectFingerprint;

      this.sr.queue.enqueue(result.analysisText, {
        priority: SPEECH_PRIORITY.NAVIGATION,
        earcon: isSceneChanged && result.objects.length > 0 ? 'obstacle_far' : null,
        meta: { type: 'navigation' },
      });
      this.sr.aria.announcePolite(result.analysisText);
      this.lastObjectFingerprint = fingerprint;
    }
  }

  _computeFingerprint(objects = []) {
    return objects
      .map((o) => `${o.label}@${o.position}`)
      .sort()
      .join('|');
  }
}
