/**
 * SpeechSynthesizer.js - Reliable Web Speech API Wrapper for Screen Readers
 * Features: Rate/pitch/volume controls, voice discovery, WebKit speech-hang auto-recovery.
 */

export class SpeechSynthesizer {
  constructor(options = {}) {
    this.rate = options.rate ?? 1.0;
    this.pitch = options.pitch ?? 1.0;
    this.volume = options.volume ?? 1.0;
    this.selectedVoiceURI = options.voiceURI || null;
    this.speaking = false;
    this.currentUtterance = null;
    this.availableVoices = [];

    this._keepAliveTimer = null;
    this._initVoices();
  }

  _initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      this.availableVoices = window.speechSynthesis.getVoices() || [];
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  getBestVoice(lang = 'en') {
    if (!this.availableVoices.length) {
      this.availableVoices = window.speechSynthesis?.getVoices() || [];
    }

    if (this.selectedVoiceURI) {
      const match = this.availableVoices.find((v) => v.voiceURI === this.selectedVoiceURI);
      if (match) return match;
    }

    // Prioritize natural / enhanced / accessibility voices
    const langPrefix = lang.split('-')[0].toLowerCase();
    const matchingLang = this.availableVoices.filter((v) =>
      v.lang.toLowerCase().startsWith(langPrefix)
    );

    const preferred = matchingLang.find(
      (v) =>
        v.name.includes('Natural') ||
        v.name.includes('Enhanced') ||
        v.name.includes('Samantha') ||
        v.name.includes('Google') ||
        v.name.includes('Daniel')
    );

    return preferred || matchingLang[0] || this.availableVoices[0] || null;
  }

  /**
   * Speaks text immediately with completion callback
   */
  speak(text, { onStart, onEnd, onError, lang = 'en-US', urgent = false } = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onError) onError(new Error('SpeechSynthesis unavailable'));
      return;
    }

    const cleaned = (text || '').trim();
    if (!cleaned) {
      if (onEnd) onEnd();
      return;
    }

    if (urgent) {
      this.cancel();
    }

    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.rate = this.rate;
    utter.pitch = this.pitch;
    utter.volume = this.volume;
    utter.lang = lang;

    const voice = this.getBestVoice(lang);
    if (voice) utter.voice = voice;

    this.currentUtterance = utter;
    this.speaking = true;

    // WebKit / Chromium speech pause bug workaround: keep synthesis active
    this._startKeepAlive();

    utter.onstart = () => {
      this.speaking = true;
      if (onStart) onStart();
    };

    const cleanup = () => {
      this._stopKeepAlive();
      this.speaking = false;
      this.currentUtterance = null;
    };

    utter.onend = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    utter.onerror = (e) => {
      cleanup();
      if (onError) onError(e);
      else if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utter);
  }

  cancel() {
    this._stopKeepAlive();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.speaking = false;
    this.currentUtterance = null;
  }

  pause() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  resume() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }

  setRate(newRate) {
    this.rate = Math.max(0.5, Math.min(3.0, Number(newRate) || 1.0));
  }

  setPitch(newPitch) {
    this.pitch = Math.max(0.5, Math.min(2.0, Number(newPitch) || 1.0));
  }

  setVolume(newVol) {
    this.volume = Math.max(0, Math.min(1.0, Number(newVol) || 1.0));
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI;
  }

  // Prevents browsers from cutting speech after 15 seconds
  _startKeepAlive() {
    this._stopKeepAlive();
    this._keepAliveTimer = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        this._stopKeepAlive();
      }
    }, 12000);
  }

  _stopKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }
}
