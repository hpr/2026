#!/usr/bin/env bash
# Usage (classic): ./script/setupMeet.sh <prev_meet> <new_meet> <url> <deadline> "<tiebreaker_event>" "<tiebreaker_time>"
# Example: ./script/setupMeet.sh xiamen26 rabat26 "https://rabat.diamondleague.com/en/programme-results/" "2pm ET" "3000m St Men" "8:05.00"
#
# Usage (flotrack): ./script/setupMeet.sh <prev_meet> <new_meet> <flotrack_event_id>
# Example: ./script/setupMeet.sh silesia26 zurich26 14465227
#   Deadline and tiebreaker event are auto-inferred from swisstiming COMPSTRUCT.

set -euo pipefail

PREV="${1:?Usage: $0 <prev_meet> <new_meet> <url_or_flotrack_id> [deadline <tiebreaker_event> <tiebreaker_time>]}"
NEW="${2:?}"
URL_OR_ID="${3:?}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENTRIES="$REPO_DIR/script/getEntries.mts"
SWISS="$REPO_DIR/script/swisstiming.mts"

# Detect flotrack mode: numeric arg = flotrack event ID
FLOTRACK_MODE=false
if [[ "$URL_OR_ID" =~ ^[0-9]+$ ]]; then
  FLOTRACK_MODE=true
  FLOTRACK_ID="$URL_OR_ID"
  # Derive DL URL from meet name
  CITY=$(echo "$NEW" | sed 's/[0-9]//g')
  URL="https://${CITY}.diamondleague.com/en/programme-results/"
else
  URL="$URL_OR_ID"
  DEADLINE="${4:?Deadline required for classic mode}"
  TIE_EVT="${5:?Tiebreaker event required for classic mode}"
  TIE_TIME="${6:?Tiebreaker time required for classic mode}"
fi

echo "Setting up meet: $NEW (previous: $PREV)"
echo "  URL: $URL"
if $FLOTRACK_MODE; then
  echo "  Mode: flotrack (ID: $FLOTRACK_ID)"
  echo "  Deadline/tiebreaker: auto-inferred"
else
  echo "  Deadline: $DEADLINE"
  echo "  Tiebreaker: $TIE_EVT: $TIE_TIME"
fi
echo ""

# 1. Update script/const.mts MEET
sed -i "s/export const MEET: DLMeet = '[^']*';/export const MEET: DLMeet = '$NEW';/" "$REPO_DIR/script/const.mts"
echo "✓ Updated script/const.mts MEET -> $NEW"

# 2. Update src/App.tsx meet useState default
sed -i "s/const \[meet, setMeet\] = useState<DLMeet>('[^']*');/const [meet, setMeet] = useState<DLMeet>('$NEW');/" "$REPO_DIR/src/App.tsx"
echo "✓ Updated src/App.tsx meet default -> $NEW"

# 3. Add flotrack event ID to swisstiming.mts (flotrack mode only)
if $FLOTRACK_MODE; then
  sed -i "/^  zurich26:/i\\  $NEW: '$FLOTRACK_ID'," "$SWISS" 2>/dev/null || true
  # If that didn't work (no zurich26 line), try a generic approach
  if ! grep -q "$NEW: '$FLOTRACK_ID'" "$SWISS"; then
    sed -i "/^};/i\\  $NEW: '$FLOTRACK_ID'," "$SWISS"
  fi
  echo "✓ Added $NEW flotrack ID -> $FLOTRACK_ID"
fi

# 4. Add tieBreakers entry after $PREV's tieBreakers block
if ! $FLOTRACK_MODE; then
  sed -i "/^  $PREV: {/,/^  }/ { /^  }/a\\
  $NEW: {\\
    '$TIE_EVT': '$TIE_TIME',\\
  },
}" "$ENTRIES"
  sed -i "/^  }$/{ N; s/^  }\n  $NEW: {$/  },\n  $NEW: {/ }" "$ENTRIES"
  echo "✓ Added $NEW tiebreaker (after $PREV)"
fi

# 5. Add deadlines entry after $PREV's deadline line (classic mode only; auto-inferred for flotrack)
if ! $FLOTRACK_MODE; then
  sed -i "/^  $PREV: '/a\\  $NEW: '$DEADLINE'," "$ENTRIES"
  echo "✓ Added $NEW deadline (after $PREV)"
fi

# 6. Add schedules entry after $PREV's schedule line
sed -i "/^  $PREV: \[/a\\  $NEW: ['$URL']," "$ENTRIES"
echo "✓ Added $NEW schedule (after $PREV)"

# 7. Add results link after $PREV's results link in getResults.mts
RESULTS_FILE="$REPO_DIR/script/getResults.mts"
CITY_UPPER=$(echo "$NEW" | sed 's/[0-9]//g' | tr '[:lower:]' '[:upper:]')
YR=$(echo "$NEW" | sed 's/[^0-9]//g')
sed -i "/^  $PREV: 'https:\/\/.*SCHEDULE_JSON\.json'/a\\  $NEW: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/${CITY_UPPER}_20${YR}_SCHEDULE_JSON.json'," "$RESULTS_FILE"
echo "✓ Added $NEW results link (after $PREV)"

echo ""
if $FLOTRACK_MODE; then
  echo "Done. Run 'npm run getEntries' to auto-infer deadline/tiebreaker, then set the tiebreaker time."
  echo "Next steps (order matters!):"
  echo "  npm run getEntries       (scrape events & entrants, auto-infer deadline/tiebreaker)"
  echo "  npm run getAvatars       (fetch & crop athlete images)"
  echo "  npm run getEntries       (MUST re-run after getAvatars to update hasAvy flags)"
  echo "  npm run getBlurbs        (~20 mins, uses LLM to generate event previews)"
  echo "  npm run getEntries       (final, to pick up blurbs)"
  echo "  npm run getMontage       (generate montage image)"
else
  echo "Done. Next steps (order matters!):"
  echo "  npm run getEntries       (scrape events & entrants)"
  echo "  npm run getAvatars       (fetch & crop athlete images)"
  echo "  npm run getEntries       (MUST re-run after getAvatars to update hasAvy flags)"
  echo "  npm run getBlurbs        (~20 mins, uses LLM to generate event previews)"
  echo "  npm run getEntries       (final, to pick up blurbs)"
  echo "  npm run getMontage       (generate montage image)"
fi
