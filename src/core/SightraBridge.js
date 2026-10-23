/**
 * SightraBridge.js - API client bridging the Vision Model pipeline to the Screen Reader
 * Connects to sightra.net /api/navigation/stream/ with automatic consent checking & error recovery.
 */

export class SightraBridge {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/api/navigation/stream/';
    this.baseUrl = options.baseUrl || '';
    this.mockMode = options.mockMode ?? false;
    this.isFlight = false;
    this.csrfToken = options.csrfToken || this._getCsrfCookie();
  }

  _getCsrfCookie() {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  /**
   * Sends a captured frame to Sightra's vision analysis pipeline
   * @param {string} frameData - Base64 encoded JPEG image
   * @param {Object} options - { textPrompt, userPrompt, narrationMode, forceRefresh }
   * @returns {Promise<Object>} Processed vision payload
   */
  async sendFrame(frameData, options = {}) {
    if (this.isFlight) {
      throw new Error('A frame analysis request is already in-flight');
    }

    if (this.mockMode || !frameData) {
      return this._generateMockAnalysis(options);
    }

    this.isFlight = true;
    const url = this.baseUrl ? `${this.baseUrl}${this.endpoint}` : this.endpoint;

    const payload = {
      frame_data: frameData,
      text_prompt: options.textPrompt || 'Describe obstacles and pathways ahead.',
      user_prompt: options.userPrompt || '',
      frame_id: Date.now(),
      narration_mode: options.narrationMode || 'fast',
      force_refresh: options.forceRefresh ?? false,
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      const csrf = this.csrfToken || this._getCsrfCookie();
      if (csrf) headers['X-CSRFToken'] = csrf;

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 && errorData.code === 'consent_required') {
          throw new Error('CONSENT_REQUIRED');
        }
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to analyze frame`);
      }

      const data = await response.json();
      return this._normalizeResponse(data);
    } finally {
      this.isFlight = false;
    }
  }

  _normalizeResponse(raw) {
    const meta = raw.metadata || {};
    return {
      success: true,
      analysisText: raw.analysis_text || '',
      hazardAlert: raw.hazard_alert || null,
      warnings: raw.warnings || meta.warnings || [],
      objects: (meta.objects || []).map((o) => ({
        label: o.label || 'unknown',
        confidence: o.confidence ?? 0.5,
        box: o.box || [0, 0, 0, 0], // [x, y, w, h]
        distance: o.distance_estimate || this._estimateDistance(o.box),
        position: this._estimateClockPosition(o.box),
        trackId: o.track_id || null,
      })),
      depth: meta.depth || {},
      narrationMode: raw.narration_mode || 'fast',
      raw: raw,
    };
  }

  _estimateDistance(box) {
    if (!box || !box[3]) return 'medium';
    const height = box[3];
    // Larger vertical size in image indicates closer proximity
    if (height > 220) return 'immediate';
    if (height > 120) return 'near';
    if (height > 60) return 'medium';
    return 'far';
  }

  _estimateClockPosition(box) {
    if (!box) return '12 o\'clock';
    const centerX = box[0] + box[2] / 2;
    // Assuming standard 640px width
    const relX = centerX / 640;
    if (relX < 0.25) return '10 o\'clock';
    if (relX < 0.42) return '11 o\'clock';
    if (relX <= 0.58) return '12 o\'clock';
    if (relX <= 0.75) return '1 o\'clock';
    return '2 o\'clock';
  }

  _generateMockAnalysis(options = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userPrompt = options.userPrompt || '';
        let analysisText = 'The pathway ahead is clear. Proceed straight.';
        const objects = [
          {
            label: 'chair',
            confidence: 0.88,
            box: [120, 200, 80, 110],
            distance: 'near',
            position: '10 o\'clock',
          },
          {
            label: 'door',
            confidence: 0.94,
            box: [280, 140, 90, 180],
            distance: 'far',
            position: '12 o\'clock',
          },
        ];

        if (userPrompt.toLowerCase().includes('what')) {
          analysisText = 'You are facing an open doorway at 12 o\'clock, with a chair to your left at 10 o\'clock.';
        }

        resolve({
          success: true,
          analysisText,
          hazardAlert: null,
          warnings: [],
          objects,
          depth: { overall_average_distance_m: 2.4 },
          narrationMode: 'full',
          raw: {},
        });
      }, 400);
    });
  }
}
