/**
 * Sightra Screen Reader - Main Entry Point
 */

export { ScreenReaderEngine } from './core/ScreenReaderEngine.js';
export { EarconEngine } from './core/EarconEngine.js';
export { HapticEngine } from './core/HapticEngine.js';
export { SpeechSynthesizer } from './core/SpeechSynthesizer.js';
export { SpeechQueue, SPEECH_PRIORITY } from './core/SpeechQueue.js';
export { SightraBridge } from './core/SightraBridge.js';

export { ContinuousNavMode } from './modes/ContinuousNavMode.js';
export { TouchExploreMode } from './modes/TouchExploreMode.js';
export { TextReaderMode } from './modes/TextReaderMode.js';
export { ObjectAuditMode } from './modes/ObjectAuditMode.js';

export { AriaLiveManager } from './a11y/AriaLiveManager.js';
export { KeyboardCommander } from './a11y/KeyboardCommander.js';

export { ScreenReaderHUD } from './ui/ScreenReaderHUD.js';
export { SightraScreenReaderPlugin } from './integration/sightra-plugin.js';

// Global convenience registration for browsers
import { SightraScreenReaderPlugin } from './integration/sightra-plugin.js';
import { ScreenReaderEngine } from './core/ScreenReaderEngine.js';

if (typeof window !== 'undefined') {
  window.SightraScreenReader = {
    Engine: ScreenReaderEngine,
    mountToVisionPage: (options) => SightraScreenReaderPlugin.mount(options),
  };
}
