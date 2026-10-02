#!/usr/bin/env bash
# Every check, in the order that fails fastest. Run from the repository root.
set -e
cd "$(dirname "$0")/.."
echo "── maths core ───────────────────────────────"; node tests/t-mathcore.js
echo "── generators ───────────────────────────────"; node tests/t-generators.js
echo "── engine ───────────────────────────────────"; node tests/t-engine.js
echo "── lesson content ───────────────────────────"; node tests/t-content.js
echo "── browser (Chromium, both themes) ──────────"; node tests/t-browser.js
echo
echo "all suites passed"
