/**
 * TouchExploreMode.js - Spatial Touch & Virtual Wand Exploration for blind users
 * Allows blind users to sweep their finger across the camera view to hear what is in each quadrant.
 */

import { SPEECH_PRIORITY } from '../core/SpeechQueue.js';

export class TouchExploreMode {
  constructor(screenReader) {
    this.sr = screenReader;
    this.name = 'touch';
    this.label = 'Touch & Spatial Exploration';

    this.latestObjects = [];
    this.lastHoveredLabel = null;
    this.throttleTimer = null;
  }

  onVisionResult(result) {
    if (result && result.objects) {
      this.latestObjects = result.objects;
    }
  }

  /**
   * Called when user touches or sweeps across the screen viewport
   * @param {number} clientX - Screen X
   * @param {number} clientY - Screen Y
   * @param {DOMRect} viewportRect - Dimensions of the camera feed container
   */
  inspectPoint(clientX, clientY, viewportRect) {
    if (!viewportRect || viewportRect.width === 0 || viewportRect.height === 0) return;

    const normX = (clientX - viewportRect.left) / viewportRect.width;
    const normY = (clientY - viewportRect.top) / viewportRect.height;

    // Map normalized (0..1) to frame standard resolution (640x480)
    const frameX = normX * 640;
    const frameY = normY * 480;

    // Find any detected object intersecting this point
    const hit = this.latestObjects.find((obj) => {
      const [ox, oy, ow, oh] = obj.box;
      return frameX >= ox && frameX <= ox + ow && frameY >= oy && frameY <= oy + oh;
    });

    if (hit) {
      if (this.lastHoveredLabel === hit.label && this.sr.synth.speaking) {
        return; // Avoid spamming same object continuously
      }
      this.lastHoveredLabel = hit.label;

      const panX = normX;
      const desc = `${hit.label}, ${hit.distance} at ${hit.position}.`;

      // Auditory cue and haptic tick
      this.sr.earcons.play('touch_hover', {
        panX,
        distance: hit.distance,
        freq: hit.distance === 'near' ? 800 : 500,
      });
      this.sr.haptics.vibrate('touch_hover');

      // Announce via screen reader
      this.sr.queue.enqueue(desc, {
        priority: SPEECH_PRIORITY.USER_PROMPT,
        panX,
        meta: { type: 'touch_hit', object: hit },
      });
      this.sr.aria.announcePolite(desc);
    } else {
      // Empty area
      this.lastHoveredLabel = null;
      this.sr.earcons.play('touch_hover', { panX: normX, freq: 300 });
    }
  }
}
