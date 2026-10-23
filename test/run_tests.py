#!/usr/bin/env python3
"""
Sightra Screen Reader Automated Verification Suite
"""

import os
import sys
import json
import urllib.request
import threading
import http.server
import socketserver

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def test_file_structure():
    print("[1/4] Verifying file structure and completeness...")
    required_files = [
        "src/core/ScreenReaderEngine.js",
        "src/core/SpeechQueue.js",
        "src/core/SpeechSynthesizer.js",
        "src/core/EarconEngine.js",
        "src/core/HapticEngine.js",
        "src/core/SightraBridge.js",
        "src/modes/ContinuousNavMode.js",
        "src/modes/TouchExploreMode.js",
        "src/modes/TextReaderMode.js",
        "src/modes/ObjectAuditMode.js",
        "src/a11y/AriaLiveManager.js",
        "src/a11y/KeyboardCommander.js",
        "src/ui/ScreenReaderHUD.js",
        "src/integration/sightra-plugin.js",
        "src/index.js",
        "dist/sightra-screen-reader.js",
        "public/index.html",
        "public/css/screen-reader.css",
        "demo/plug_and_play_demo.html",
        "README.md",
        "package.json",
        "LICENSE",
        ".gitignore"
    ]

    missing = []
    for rel_path in required_files:
        full_path = os.path.join(REPO_ROOT, rel_path)
        if not os.path.exists(full_path):
            missing.append(rel_path)
        else:
            size = os.path.getsize(full_path)
            if size == 0:
                missing.append(f"{rel_path} (empty)")

    if missing:
        print(f"FAILED: Missing or empty files: {missing}")
        return False

    print(f"PASSED: All {len(required_files)} essential files verified.")
    return True

def test_syntax_and_contents():
    print("[2/4] Verifying JavaScript exports and bundle integrity...")
    dist_file = os.path.join(REPO_ROOT, "dist/sightra-screen-reader.js")
    with open(dist_file, 'r', encoding='utf-8') as f:
        content = f.read()

    expected_symbols = [
        "ScreenReaderEngine",
        "EarconEngine",
        "HapticEngine",
        "SpeechSynthesizer",
        "SpeechQueue",
        "AriaLiveManager",
        "KeyboardCommander",
        "SightraBridge",
        "ContinuousNavMode",
        "TouchExploreMode",
        "TextReaderMode",
        "ObjectAuditMode",
        "ScreenReaderHUD",
        "mountToVisionPage"
    ]

    missing_symbols = [s for s in expected_symbols if s not in content]
    if missing_symbols:
        print(f"FAILED: Bundle missing symbols: {missing_symbols}")
        return False

    print(f"PASSED: Bundle contains all {len(expected_symbols)} expected symbols.")
    return True

def test_http_delivery():
    print("[3/4] Testing HTTP delivery and MIME types...")
    PORT = 9876
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=REPO_ROOT, **kwargs)
        def log_message(self, format, *args):
            pass # Silent log

    httpd = socketserver.TCPServer(("", PORT), Handler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    try:
        urls_to_test = [
            f"http://localhost:{PORT}/public/index.html",
            f"http://localhost:{PORT}/dist/sightra-screen-reader.js",
            f"http://localhost:{PORT}/public/css/screen-reader.css",
            f"http://localhost:{PORT}/demo/plug_and_play_demo.html"
        ]

        for url in urls_to_test:
            req = urllib.request.urlopen(url, timeout=5)
            if req.status != 200:
                print(f"FAILED: {url} returned status {req.status}")
                return False
            data = req.read()
            if len(data) == 0:
                print(f"FAILED: {url} returned empty body")
                return False

        print(f"PASSED: Static web server successfully served all assets (HTTP 200).")
        return True
    finally:
        httpd.shutdown()

def test_package_json():
    print("[4/4] Verifying package.json metadata...")
    pkg_path = os.path.join(REPO_ROOT, "package.json")
    with open(pkg_path, 'r', encoding='utf-8') as f:
        pkg = json.load(f)

    assert pkg.get("name") == "sightra-screen-reader"
    assert "version" in pkg
    assert "description" in pkg
    print("PASSED: package.json metadata valid.")
    return True

if __name__ == "__main__":
    tests = [
        test_file_structure,
        test_syntax_and_contents,
        test_http_delivery,
        test_package_json
    ]

    failed = 0
    for t in tests:
        if not t():
            failed += 1

    if failed == 0:
        print("\nALL AUTOMATED TESTS PASSED! (4/4)")
        sys.exit(0)
    else:
        print(f"\n{failed} TESTS FAILED.")
        sys.exit(1)
