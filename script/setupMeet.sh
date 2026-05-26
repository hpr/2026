#!/usr/bin/env bash
# Usage: ./script/setupMeet.sh <prev_meet> <new_meet> <url> <deadline> "<tiebreaker_event>" "<tiebreaker_time>"
# Example: ./script/setupMeet.sh xiamen26 rabat26 "https://rabat.diamondleague.com/en/programme-results/" "2pm ET" "3000m St Men" "8:05.00"

set -euo pipefail

PREV="${1:?Usage: $0 <prev_meet> <new_meet> <url> <deadline> <tiebreaker_event> <tiebreaker_time>}"
NEW="${2:?}"
URL="${3:?}"
DEADLINE="${4:?}"
TIE_EVT="${5:?}"
TIE_TIME="${6:?}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENTRIES="$REPO_DIR/script/getEntries.mts"

echo "Setting up meet: $NEW (previous: $PREV)"
echo "  URL: $URL"
echo "  Deadline: $DEADLINE"
echo "  Tiebreaker: $TIE_EVT: $TIE_TIME"
echo ""

# 1. Update script/const.mts MEET
sed -i "s/export const MEET: DLMeet = '[^']*';/export const MEET: DLMeet = '$NEW';/" "$REPO_DIR/script/const.mts"
echo "✓ Updated script/const.mts MEET -> $NEW"

# 2. Update src/App.tsx meet useState default
sed -i "s/const \[meet, setMeet\] = useState<DLMeet>('[^']*');/const [meet, setMeet] = useState<DLMeet>('$NEW');/" "$REPO_DIR/src/App.tsx"
echo "✓ Updated src/App.tsx meet default -> $NEW"

# 3. Add tieBreakers entry after $PREV's tieBreakers block
# Insert new block first, then add comma to the previous block's closing brace
sed -i "/^  $PREV: {/,/^  }/ { /^  }/a\\
  $NEW: {\\
    '$TIE_EVT': '$TIE_TIME',\\
  },
}" "$ENTRIES"
# Add comma to the closing brace that's now followed by the new meet's block
sed -i "/^  }$/{ N; s/^  }\n  $NEW: {$/  },\n  $NEW: {/ }" "$ENTRIES"
echo "✓ Added $NEW tiebreaker (after $PREV)"

# 4. Add deadlines entry after $PREV's deadline line (identified by single quote after colon)
sed -i "/^  $PREV: '/a\\  $NEW: '$DEADLINE'," "$ENTRIES"
echo "✓ Added $NEW deadline (after $PREV)"

# 5. Add schedules entry after $PREV's schedule line (identified by bracket after colon)
sed -i "/^  $PREV: \[/a\\  $NEW: ['$URL']," "$ENTRIES"
echo "✓ Added $NEW schedule (after $PREV)"

echo ""
echo "Done. Next steps:"
echo "  npm run getEntries"
echo "  npm run getAvatars"
echo "  npm run getBlurbs"
echo "  npm run getEntries   (final, to pick up avatars/blurbs)"
