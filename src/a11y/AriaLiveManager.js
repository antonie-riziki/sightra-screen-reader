/**
 * AriaLiveManager.js - WCAG 2.2 AAA Compliant Live Region Manager
 * Coordinates assertive (hazards) and polite (guidance) announcements for system screen readers.
 */

export class AriaLiveManager {
  constructor(options = {}) {
    this.containerId = options.containerId || 'sightra-sr-container';
    this.assertiveEl = null;
    this.politeEl = null;
    this.statusEl = null;

    this._ensureLiveRegions();
  }

  _ensureLiveRegions() {
    if (typeof document === 'undefined') return;

    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'sr-only';
      // Visually hidden but accessible to assistive technologies
      container.style.cssText =
        'position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important;';
      document.body.appendChild(container);
    }

    // Assertive region (alerts & hazards)
    let assertive = document.getElementById('sightra-sr-assertive');
    if (!assertive) {
      assertive = document.createElement('div');
      assertive.id = 'sightra-sr-assertive';
      assertive.setAttribute('role', 'alert');
      assertive.setAttribute('aria-live', 'assertive');
      assertive.setAttribute('aria-atomic', 'true');
      container.appendChild(assertive);
    }
    this.assertiveEl = assertive;

    // Polite region (scene descriptions & navigation)
    let polite = document.getElementById('sightra-sr-polite');
    if (!polite) {
      polite = document.createElement('div');
      polite.id = 'sightra-sr-polite';
      polite.setAttribute('role', 'status');
      polite.setAttribute('aria-live', 'polite');
      polite.setAttribute('aria-atomic', 'true');
      container.appendChild(polite);
    }
    this.politeEl = polite;

    // Status readout (system state)
    let status = document.getElementById('sightra-sr-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'sightra-sr-status';
      status.setAttribute('role', 'log');
      status.setAttribute('aria-live', 'polite');
      container.appendChild(status);
    }
    this.statusEl = status;
  }

  /**
   * Announces an urgent warning via assertive live region
   */
  announceHazard(text) {
    this._post(this.assertiveEl, text);
  }

  /**
   * Announces environmental info via polite live region
   */
  announcePolite(text) {
    this._post(this.politeEl, text);
  }

  /**
   * Updates state status
   */
  announceStatus(text) {
    this._post(this.statusEl, text);
  }

  _post(element, text) {
    if (!element || !text) return;
    const clean = text.trim();

    // Toggle content to force assistive technology to re-read even duplicate strings
    element.textContent = '';
    setTimeout(() => {
      element.textContent = clean;
    }, 50);
  }

  clear() {
    if (this.assertiveEl) this.assertiveEl.textContent = '';
    if (this.politeEl) this.politeEl.textContent = '';
    if (this.statusEl) this.statusEl.textContent = '';
  }
}
