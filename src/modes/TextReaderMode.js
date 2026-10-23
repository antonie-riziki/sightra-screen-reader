/**
 * TextReaderMode.js - OCR and Signage Screen Reader Mode
 * Focuses on capturing, parsing, and reading environmental text, signs, packaging, and documents.
 */

import { SPEECH_PRIORITY } from '../core/SpeechQueue.js';

export class TextReaderMode {
  constructor(screenReader) {
    this.sr = screenReader;
    this.name = 'text';
    this.label = 'Text & Signage Reader';
    this.extractedLines = [];
    this.currentIndex = 0;
  }

  getPrompt() {
    return 'Read and transcribe all visible text, signs, room numbers, labels, or notices clearly in natural reading order.';
  }

  onVisionResult(result) {
    if (!result || !result.analysisText) return;

    // Split analysis into readable sentences/lines
    const rawText = result.analysisText;
    const lines = rawText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (lines.length > 0) {
      this.extractedLines = lines;
      this.currentIndex = 0;
      this.sr.queue.enqueue(`Text detected: ${lines[0]}`, {
        priority: SPEECH_PRIORITY.USER_PROMPT,
        earcon: 'obstacle_far',
        meta: { type: 'text_read' },
      });
      this.sr.aria.announcePolite(lines[0]);
    } else {
      this.sr.queue.enqueue('No clear text or signage detected in view.', {
        priority: SPEECH_PRIORITY.USER_PROMPT,
      });
      this.sr.aria.announcePolite('No clear text detected in view');
    }
  }

  readNext() {
    if (this.currentIndex < this.extractedLines.length - 1) {
      this.currentIndex += 1;
      const line = this.extractedLines[this.currentIndex];
      this.sr.speakDirect(line, { priority: SPEECH_PRIORITY.USER_PROMPT });
      this.sr.aria.announcePolite(line);
      return line;
    }
    this.sr.speakDirect('End of text.', { priority: SPEECH_PRIORITY.USER_PROMPT });
    return null;
  }

  readPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      const line = this.extractedLines[this.currentIndex];
      this.sr.speakDirect(line, { priority: SPEECH_PRIORITY.USER_PROMPT });
      this.sr.aria.announcePolite(line);
      return line;
    }
    this.sr.speakDirect('At the beginning of text.', { priority: SPEECH_PRIORITY.USER_PROMPT });
    return null;
  }
}
