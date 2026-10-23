/**
 * KeyboardCommander.js - Blind-first hotkey shortcuts for screen reader control
 */

export class KeyboardCommander {
  constructor(screenReader, options = {}) {
    this.sr = screenReader;
    this.enabled = options.enabled ?? true;
    this._boundHandler = this._handleKeyDown.bind(this);

    this.shortcuts = {
      Space: 'Pause or resume speech output',
      KeyR: 'Repeat last environmental description',
      KeyH: 'Announce safety hazards',
      KeyO: 'List detected objects and distances',
      KeyT: 'Activate Text / Sign reading mode',
      KeyM: 'Cycle screen reader modes',
      BracketRight: 'Increase speech speed',
      BracketLeft: 'Decrease speech speed',
      KeyV: 'Toggle audio earcons',
      Escape: 'Silence all current speech and alerts',
      Slash: 'Announce keyboard shortcuts help',
    };

    if (this.enabled) {
      this.attach();
    }
  }

  attach() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._boundHandler);
    }
  }

  detach() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._boundHandler);
    }
  }

  _handleKeyDown(e) {
    if (!this.enabled) return;

    // Do not trigger shortcuts when typing inside form inputs
    const target = e.target;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }

    const code = e.code;

    switch (code) {
      case 'Space':
        e.preventDefault();
        const paused = this.sr.togglePause();
        this.sr.aria.announcePolite(paused ? 'Speech paused' : 'Speech resumed');
        break;

      case 'KeyR':
        e.preventDefault();
        this.sr.repeatLast();
        break;

      case 'KeyH':
        e.preventDefault();
        this.sr.announceHazards();
        break;

      case 'KeyO':
        e.preventDefault();
        this.sr.announceObjectAudit();
        break;

      case 'KeyM':
        e.preventDefault();
        const newMode = this.sr.cycleMode();
        this.sr.aria.announcePolite(`Mode switched to ${newMode}`);
        break;

      case 'KeyT':
        e.preventDefault();
        this.sr.setMode('text');
        this.sr.aria.announcePolite('Text reading mode active');
        break;

      case 'BracketRight':
        e.preventDefault();
        this.sr.adjustRate(0.2);
        break;

      case 'BracketLeft':
        e.preventDefault();
        this.sr.adjustRate(-0.2);
        break;

      case 'KeyV':
        e.preventDefault();
        const earconsOn = this.sr.earcons.toggle();
        this.sr.aria.announcePolite(earconsOn ? 'Audio earcons enabled' : 'Audio earcons disabled');
        break;

      case 'Escape':
        e.preventDefault();
        this.sr.silence();
        this.sr.aria.announcePolite('Speech silenced');
        break;

      case 'Slash':
      case 'Backslash':
        if (e.shiftKey || code === 'Slash') {
          e.preventDefault();
          this.announceHelp();
        }
        break;

      default:
        break;
    }
  }

  announceHelp() {
    const help =
      'Sightra Screen Reader Shortcuts: Space to pause or resume. R to repeat. H for hazards. O for object list. M to cycle modes. Left and right brackets to adjust speed. Escape to silence.';
    this.sr.speakDirect(help, { priority: 2 });
  }
}
