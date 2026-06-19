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

SKIP_SETUP=false
if [[ "${1:-}" == "--live" ]]; then
  SKIP_SETUP=true
  shift
fi

log "=== Meet day starting for $MEET ==="

git pull

if ! $SKIP_SETUP; then
  log "Step 1: Closing entries"
  npm run closeEntries

  log "Step 2: Dumping picks and users CSVs"
  echo "select * from picks where meet = '$MEET';" | ssh ma.sdf.org sqlite3 -header -csv "$DB_PATH" > "$PICKS_CSV"
  echo "select * from users;" | ssh ma.sdf.org sqlite3 -header -csv "$DB_PATH" > "$USERS_CSV"

  log "Step 3: Fetching results"
  npm run getResults

  log "Step 4: Computing leaderboard"
  npm run getLeaderboard

  log "Step 5: Pushing to trigger deployment"
  git add -A
  git commit -m "meet day: $MEET $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
  git push
fi

log "Starting live results loop (every ${INTERVAL}s, until complete)"

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
  npm run getResults

  log "Computing leaderboard..."
  npm run getLeaderboard

  log "Pushing updates..."
  git add -A
  git commit -m "live results: $MEET $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
  git push

  PARTS=(${COMPLETE//\// })
  DONE=${PARTS[0]}
  TOTAL=${PARTS[1]}
  if [ "$DONE" -ge "$TOTAL" ] 2>/dev/null; then
    log "All $TOTAL events have results. Updating final standings..."

    npm run getStandings

    git add -A
    git commit -m "final standings: $MEET $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
    git push

    log "Done!"
    break
  fi
done

log "=== Meet day complete for $MEET ==="
