/**
 * ScreenReaderHUD.js - High-Contrast Accessible Screen Reader Overlay
 * Provides subtitles, status indicators, and large accessible touch controls.
 */

export class ScreenReaderHUD {
  constructor(screenReader, container = document.body) {
    this.sr = screenReader;
    this.container = container;
    this.root = null;
    this._render();
    this._bindEvents();
  }

  _render() {
    this.root = document.createElement('section');
    this.root.id = 'sightra-sr-hud';
    this.root.className = 'sightra-sr-hud';
    this.root.setAttribute('aria-label', 'Screen Reader HUD');

    this.root.innerHTML = `
      <div class="sr-hud-panel">
        <header class="sr-hud-header">
          <div class="sr-hud-badge">
            <span class="sr-status-dot" id="sr-hud-status-dot"></span>
            <span id="sr-hud-mode-title" class="sr-hud-title">SCREEN READER: CONTINUOUS</span>
          </div>
          <div class="sr-hud-actions">
            <button id="sr-btn-rate" class="sr-hud-btn-mini" aria-label="Speech Speed: 1.0x">1.0x</button>
            <button id="sr-btn-repeat" class="sr-hud-btn-mini" aria-label="Repeat Announcement (Key R)">
              <span class="material-symbols-outlined" style="font-size:18px;">replay</span>
            </button>
            <button id="sr-btn-mute" class="sr-hud-btn-mini" aria-label="Toggle Pause (Space)">
              <span class="material-symbols-outlined" id="sr-mute-icon" style="font-size:18px;">volume_up</span>
            </button>
          </div>
        </header>

        <div class="sr-subtitles-box" aria-live="polite" id="sr-hud-subtitles">
          <p id="sr-hud-subtitle-text" class="sr-subtitle-text">Ready. Start vision scanning to receive audio guidance.</p>
        </div>

        <nav class="sr-mode-selector" aria-label="Screen Reader Mode Switcher">
          <button class="sr-mode-pill active" data-mode="continuous" id="mode-btn-continuous">Continuous Nav</button>
          <button class="sr-mode-pill" data-mode="touch" id="mode-btn-touch">Touch Explore</button>
          <button class="sr-mode-pill" data-mode="text" id="mode-btn-text">Text & Signs</button>
          <button class="sr-mode-pill" id="sr-btn-audit">Object Audit (O)</button>
        </nav>
      </div>
    `;

    this.container.appendChild(this.root);
  }

  _bindEvents() {
    const subtitleEl = this.root.querySelector('#sr-hud-subtitle-text');
    const statusDot = this.root.querySelector('#sr-hud-status-dot');
    const modeTitle = this.root.querySelector('#sr-hud-mode-title');
    const rateBtn = this.root.querySelector('#sr-btn-rate');
    const muteBtn = this.root.querySelector('#sr-btn-mute');
    const muteIcon = this.root.querySelector('#sr-mute-icon');

    // Subscribe to screen reader state changes
    this.sr.on('stateChange', ({ event, data, state }) => {
      if (data && data.text) {
        subtitleEl.textContent = data.text;
      }
      if (state.speaking) {
        statusDot.classList.add('speaking');
      } else {
        statusDot.classList.remove('speaking');
      }
      if (state.paused) {
        muteIcon.textContent = 'volume_off';
      } else {
        muteIcon.textContent = 'volume_up';
      }
    });

    this.sr.on('modeChange', ({ mode, label }) => {
      modeTitle.textContent = `SCREEN READER: ${label.toUpperCase()}`;
      this.root.querySelectorAll('.sr-mode-pill').forEach((btn) => {
        if (btn.dataset.mode === mode) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    });

    this.sr.on('rateChange', (rate) => {
      rateBtn.textContent = `${rate}x`;
      rateBtn.setAttribute('aria-label', `Speech Speed: ${rate}x`);
    });

    // Button Click Handlers
    this.root.querySelector('#mode-btn-continuous')?.addEventListener('click', () => {
      this.sr.setMode('continuous');
    });

    this.root.querySelector('#mode-btn-touch')?.addEventListener('click', () => {
      this.sr.setMode('touch');
    });

    this.root.querySelector('#mode-btn-text')?.addEventListener('click', () => {
      this.sr.setMode('text');
    });

    this.root.querySelector('#sr-btn-audit')?.addEventListener('click', () => {
      this.sr.announceObjectAudit();
    });

    this.root.querySelector('#sr-btn-repeat')?.addEventListener('click', () => {
      this.sr.repeatLast();
    });

    rateBtn?.addEventListener('click', () => {
      // Cycle: 1.0 -> 1.25 -> 1.5 -> 1.75 -> 2.0 -> 0.75 -> 1.0
      let nextRate = this.sr.synth.rate + 0.25;
      if (nextRate > 2.0) nextRate = 0.75;
      this.sr.synth.setRate(nextRate);
      this.sr.adjustRate(0); // triggers announcement
    });

    muteBtn?.addEventListener('click', () => {
      this.sr.togglePause();
    });
  }
}
