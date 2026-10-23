/**
 * HapticEngine.js - Tactile feedback coordinator for blind assistive interaction
 */

export class HapticEngine {
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
        default:
          if (Array.isArray(patternType) || typeof patternType === 'number') {
            navigator.vibrate(patternType);
          }
          break;
      }
    } catch {
      // Ignored if browser policy restricts background vibration
    }
  }

  cancel() {
    if (this.supported) {
      navigator.vibrate(0);
    }
  }

  toggle(enable) {
    this.enabled = typeof enable === 'boolean' ? enable : !this.enabled;
    return this.enabled;
  }
}
