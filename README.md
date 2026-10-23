# Sightra Screen Reader

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WCAG](https://img.shields.io/badge/WCAG-2.2%20AAA-green.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![A11y](https://img.shields.io/badge/Accessibility-Screen%20Reader-cyan.svg)](https://sightra.net)

An accessible, high-contrast, spatial audio screen reader engine designed to plug directly on top of the **Sightra** (`sightra.net`) computer vision perception pipeline.

---

## 🌟 Overview

Sightra analyzes physical environments in real time using YOLO object detection, depth estimation, and Gemini generative reasoning. 

**Sightra Screen Reader** transforms this raw perceptual metadata into a multimodal, blind-first auditory and tactile experience:
- **Spatial Auditory Icons (Earcons)**: Synthesized stereo-panned frequency tones indicate obstacle proximity and direction (left, center, right) in real time.
- **Priority Speech Queue**: Interrupts non-urgent descriptions immediately for emergency safety hazards (`aria-live="assertive"`).
- **Spatial Touch / Virtual Wand Exploration**: Sweeping a finger or cursor across the camera feed announces the exact object and distance located in that quadrant.
- **Text & Signage Reader**: Targeted reading of environmental text, signs, room numbers, and notices.
- **Keyboard Commander**: Global hotkeys engineered specifically for blind screen reader users.
- **1-Line Plug-and-Play Integration**: Drop into any vision web page with a single `<script>` tag.

---

## 🏗️ Architecture

```
sightra-screen-reader/
├── src/
│   ├── core/
│   │   ├── ScreenReaderEngine.js     # Master coordinator & state machine
│   │   ├── SpeechQueue.js            # Priority speech queue with hazard pre-emption
│   │   ├── SpeechSynthesizer.js      # Multi-voice TTS with rate/pitch controls
│   │   ├── EarconEngine.js           # Spatial Web Audio API 3D panner & beeps
│   │   ├── HapticEngine.js           # Tactile vibration patterns
│   │   └── SightraBridge.js          # Client bridge to /api/navigation/stream/
│   ├── modes/
│   │   ├── ContinuousNavMode.js      # Hands-free environmental narration
│   │   ├── TouchExploreMode.js       # Touch screen spatial exploration
│   │   ├── TextReaderMode.js         # OCR and signage reading
│   │   └── ObjectAuditMode.js        # Nearest-to-farthest obstacle listing
│   ├── a11y/
│   │   ├── AriaLiveManager.js        # Assertive/polite ARIA regions
│   │   └── KeyboardCommander.js      # Blind-accessible shortcuts
│   ├── ui/
│   │   └── ScreenReaderHUD.js        # High-contrast HUD with live subtitles
│   └── integration/
│       └── sightra-plugin.js         # Plug-and-play connector for sightra.net/vision/
├── dist/
│   └── sightra-screen-reader.js      # Standalone UMD bundle
├── public/
│   ├── index.html                    # Standalone interactive application
│   └── css/screen-reader.css         # High-contrast WCAG 2.2 AAA styling
├── demo/
│   └── plug_and_play_demo.html       # Sightra vision page mock with screen reader
└── test/
    └── run_tests.py                  # Automated verification suite
```

---

## 🚀 Quick Start

### 1. Plug onto `sightra.net/vision/`
Add the script and mount the plugin:

```html
<!-- Include Screen Reader bundle and styles -->
<link rel="stylesheet" href="path/to/screen-reader.css" />
<script src="path/to/sightra-screen-reader.js"></script>

<script>
  // Mount directly onto the existing Sightra vision page
  SightraScreenReader.mountToVisionPage({
    initialMode: 'continuous',
    speechRate: 1.0,
    enableEarcons: true,
    enableHaptics: true
  });
</script>
```

The plugin automatically:
1. Intercepts `/api/navigation/stream/` responses.
2. Replaces unbuffered raw browser utterances with the managed priority speech queue.
3. Binds touch exploration on `#cameraElement` and `#dynamic-boxes`.
4. Renders the accessible floating HUD.

---

### 2. Standalone Application
To run the standalone interface with simulation feeds and camera capture:

```bash
# Start a local static server
python3 -m http.server 8080 --directory public
```

Open `http://localhost:8080` in any modern browser.

---

## ⌨️ Accessibility Keyboard Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| `Space` | **Pause / Resume** | Temporarily pause or resume speech output |
| `R` | **Repeat Last** | Re-announces the most recent description |
| `H` | **Hazard Summary** | Checks for urgent hazards or step-offs |
| `O` | **Object Audit** | Lists all detected items from nearest to farthest |
| `M` | **Cycle Modes** | Switches between Continuous, Touch, and Text modes |
| `T` | **Text Reader** | Enters targeted signage/OCR mode |
| `]` / `[` | **Speed Up / Down** | Adjusts speech rate by 0.2x |
| `Esc` | **Silence** | Instantly silences all active speech and alerts |
| `?` or `/` | **Help** | Speaks the full keyboard shortcut reference |

---

## 🧪 Testing

Run the automated test suite:

```bash
python3 test/run_tests.py
```

All 4 test phases verify:
- ✅ Directory and module completeness
- ✅ UMD bundle export integrity
- ✅ HTTP delivery & MIME type compliance
- ✅ Package metadata and configuration

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
