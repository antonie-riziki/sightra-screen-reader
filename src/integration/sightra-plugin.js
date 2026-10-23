/**
 * sightra-plugin.js - Drop-in Screen Reader integration for sightra.net/vision/
 * Attaches directly onto the live Sightra vision page with a single initialization call.
 */

import { ScreenReaderEngine } from '../core/ScreenReaderEngine.js';
import { ScreenReaderHUD } from '../ui/ScreenReaderHUD.js';

export class SightraScreenReaderPlugin {
  static instance = null;

  static mount(options = {}) {
    if (this.instance) return this.instance;

    const engine = new ScreenReaderEngine({
      endpoint: options.endpoint || '/api/navigation/stream/',
      baseUrl: options.baseUrl || '',
      initialMode: options.mode || 'continuous',
      speechRate: options.speechRate || 1.0,
      enableEarcons: options.enableEarcons ?? true,
      enableHaptics: options.enableHaptics ?? true,
      enableKeyboardShortcuts: true,
    });

    const hud = new ScreenReaderHUD(engine, document.body);

    // 1. Intercept native sightra.net TTS to prevent double audio playback
    if (typeof window !== 'undefined') {
      window._sightraTTSHooked = true;
      // Override default page speakNonBlocking if defined
      if (typeof window.speakNonBlocking === 'function') {
        window.speakNonBlocking = (text) => {
          // Handled via screen reader engine
        };
      }
    }

    // 2. Intercept Sightra scan button state
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        // Sightra's scan button toggles isScanning
        setTimeout(() => {
          const scanLabel = document.getElementById('scanLabel');
          const isScanningNow =
            scanLabel &&
            (scanLabel.textContent.toLowerCase().includes('stop') ||
              scanLabel.classList.contains('vision-scan-label-active') ||
              scanLabel.classList.contains('text-error'));

          if (isScanningNow) {
            engine.start();
          } else {
            engine.stop();
          }
        }, 100);
      });
    }

    // 3. Attach touch / sweep exploration to camera and canvas overlays
    const touchTarget =
      document.getElementById('dynamic-boxes') ||
      document.getElementById('cameraElement') ||
      document.body;

    if (touchTarget) {
      const handlePointer = (e) => {
        if (!engine.active) return;
        const rect = touchTarget.getBoundingClientRect();
        engine.inspectPoint(e.clientX, e.clientY, rect);
      };

      touchTarget.addEventListener('pointerdown', handlePointer);
      touchTarget.addEventListener('pointermove', (e) => {
        if (e.buttons > 0) handlePointer(e);
      });
      touchTarget.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          const t = e.touches[0];
          handlePointer({ clientX: t.clientX, clientY: t.clientY });
        }
      });
    }

    // 4. Hook into network responses from /api/navigation/stream/
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
        } catch {
          // Keep network transparent
        }
      }
      return response;
    };

    this.instance = { engine, hud };
    console.log('[Sightra Screen Reader] Plugged successfully onto vision pipeline.');
    return this.instance;
  }
}
