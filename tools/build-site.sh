#!/usr/bin/env bash
# Assemble the public site in dist/: the hub, the math course, and the English
# course. The English course is not kept in this repository. It is copied from
# its own folder (ENGLISH_SRC, default ../EnglishLearn) on every build, so the
# site always carries the latest version and there is no second copy to fall
# behind. Upload dist/, not the repository root.
set -euo pipefail
cd "$(dirname "$0")/.."
ENGLISH_SRC="${ENGLISH_SRC:-../EnglishLearn}"

rm -rf dist
mkdir -p dist
cp index.html course.html site.css site.js courses.js dist/
cp -R src dist/src

if [ -f "$ENGLISH_SRC/index.html" ] && [ -f "$ENGLISH_SRC/content/curriculum.js" ]; then
  mkdir dist/english
  cp -R "$ENGLISH_SRC/index.html" "$ENGLISH_SRC/css" "$ENGLISH_SRC/js" "$ENGLISH_SRC/content" dist/english/
  rm -rf dist/english/content/_example          # authoring sample, not a lesson
  # A way back to the hub, added here so the English folder itself stays untouched.
  node -e '
    const fs = require("fs"), f = process.argv[1], anchor = "<a href=\"#/settings\">Settings</a>";
    const s = fs.readFileSync(f, "utf8");
    if (!s.includes(anchor)) { console.error("build-site: the English menu has changed; cannot add the All classes link"); process.exit(1); }
    fs.writeFileSync(f, s.replace(anchor, anchor + "<a href=\"/\">All classes ↗</a>"));
  ' dist/english/index.html
  echo "built dist/ with the English course from $ENGLISH_SRC"
else
  echo "warning: no English course at $ENGLISH_SRC, so dist/ has no english/ and its card will lead nowhere" >&2
fi
find dist -name .DS_Store -delete
