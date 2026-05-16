#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="/meta/h/habs/db/fantasy1500.db"
PICKS_CSV="$REPO_DIR/picks.csv"
USERS_CSV="$REPO_DIR/users.csv"
LOG="$REPO_DIR/script/meet-day.log"
INTERVAL=300

cd "$REPO_DIR"

MEET=$(npx tsx -e "
  import { MEET } from './script/const.mts';
  console.log(MEET);
" 2>/dev/null)

if [ -z "$MEET" ]; then
  echo "ERROR: Could not determine current meet" | tee -a "$LOG"
  exit 1
fi

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

log "=== Meet day starting for $MEET ==="

git pull

log "Step 1: Closing entries"
npx tsx script/closeEntries.mts

log "Step 2: Dumping picks and users CSVs"
sqlite3 -header -csv "$DB_PATH" "select * from picks where meet = '$MEET';" > "$PICKS_CSV"
sqlite3 -header -csv "$DB_PATH" "select * from users;" > "$USERS_CSV"

log "Step 3: Fetching results"
npx tsx script/getResults.mts

log "Step 4: Computing leaderboard"
npx tsx script/getLeaderboard.mts

log "Step 5: Pushing to trigger deployment"
git add -A
git commit -m "meet day: $MEET $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
git push

log "Step 6: Starting live results loop (every ${INTERVAL}s, until complete)"

while true; do
  sleep "$INTERVAL"

  COMPLETE=$(npx tsx -e "
    import fs from 'fs';
    import { MEET } from './script/const.mts';
    const entries = JSON.parse(fs.readFileSync('./public/entries.json', 'utf-8'));
    const meet = entries[MEET];
    if (!meet) { console.log('error'); process.exit(1); }
    const evts = Object.keys(meet);
    const withResults = evts.filter(e => Array.isArray(meet[e].results) && meet[e].results.length > 0);
    console.log(withResults.length + '/' + evts.length);
  " 2>/dev/null)

  if [[ "$COMPLETE" == "error" ]]; then
    log "ERROR reading entries.json"
    continue
  fi

  log "Results: $COMPLETE"

  log "Fetching results..."
  npx tsx script/getResults.mts

  log "Computing leaderboard..."
  npx tsx script/getLeaderboard.mts

  log "Pushing updates..."
  git add -A
  git commit -m "live results: $MEET $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
  git push

  PARTS=(${COMPLETE//\// })
  DONE=${PARTS[0]}
  TOTAL=${PARTS[1]}
  if [ "$DONE" -ge "$TOTAL" ] 2>/dev/null; then
    log "All $TOTAL events have results. Done!"
    break
  fi
done

log "=== Meet day complete for $MEET ==="
