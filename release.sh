#!/usr/bin/env bash
# Healen v3.6.8 release helper
# Reads GH_TOKEN from YOUR shell env — never expose it in chat.
set -euo pipefail

cd "$(dirname "$0")"

: "${GH_TOKEN:?Set GH_TOKEN in your terminal first:  export GH_TOKEN=\"ghp_...\"}"
REPO="pywellsdm/Healen"
TAG="v3.6.8"
APK="Healen-v3.6.8.apk"

STEP="${1:-all}"   # all | code | release

if [[ "$STEP" == "all" || "$STEP" == "code" ]]; then
  echo ">> Committing and pushing v3.6.8 code..."
  git add \
    android/app/build.gradle \
    package.json \
    src/lib/appInfo.js \
    src/lib/updates.js \
    src/pages/Settings.jsx \
    src/components/ColorPicker.jsx
  git commit -m "Healen v3.6.8: vertical settings menu, separate Characters section, modern color picker, fix update popup" || true
  git push origin main || true
fi

if [[ "$STEP" == "all" || "$STEP" == "release" ]]; then
  echo ">> Creating GitHub release $TAG..."
  BODY=$(python3 - "$TAG" <<'PY'
import json, sys
tag = sys.argv[1]
ver = tag.lstrip("v")
body = f"""## Healen v{ver}

- **Redesigned Settings:** tapping Settings now shows a clean vertical menu — tap any category to see its options, then go back. No more tiny horizontal tabs.
- **Separate Characters section:** "Your Own Characters" is now its own top-level settings page, not buried under AI Coach Persona.
- **Modern color picker:** the theme color selector is now a proper saturation-brightness square with a hue slider and preset colors — like a real design tool, not a confusing circle.
- **Fixed update popup:** the "new update available" banner now reliably appears after a new GitHub release is published, even across sessions. The cache properly resets when the app version changes.
- **AI time awareness (continued):** your AI coach still knows the current time and greets you naturally when you return after a gap.

APK: install Healen-v{ver}.apk"""
print(json.dumps({"tag_name": tag, "name": f"Healen v{ver}", "body": body}))
PY
)
  RESP=$(curl -s -X POST \
    -H "Authorization: token $GH_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/releases" \
    -d "$BODY")

  ID=$(python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" <<< "$RESP" 2>/dev/null || true)
  if [[ -z "$ID" ]]; then
    echo "!! Could not create release. Response:"; echo "$RESP"; exit 1
  fi
  echo ">> Release created with id=$ID. Uploading APK..."
  curl -s -X POST \
    -H "Authorization: token $GH_TOKEN" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @"$APK" \
    "https://uploads.github.com/repos/$REPO/releases/$ID/assets?name=$APK" \
    | python3 -m json.tool || echo "!! Upload response not JSON/empty."
fi

echo ">> Done."
