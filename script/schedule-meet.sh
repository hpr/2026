#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# FantasyDL meet-day"
LOG="$REPO_DIR/script/meet-day.log"

cd "$REPO_DIR"

DEADLINE=$(npx tsx -e "
  import fs from 'fs';
  import { MEET } from './script/const.mts';
  const entries = JSON.parse(fs.readFileSync('./public/entries.json', 'utf-8'));
  const meet = entries[MEET];
  if (!meet) { console.error('No entries for', MEET); process.exit(1); }
  const evts = Object.values(meet);
  const dateStr = evts.find((e: any) => e.date)?.date;
  if (!dateStr) { console.error('No date found'); process.exit(1); }
  console.log(dateStr);
" 2>/dev/null)

if [ -z "$DEADLINE" ]; then
  echo "ERROR: Could not determine meet deadline from entries.json"
  exit 1
fi

echo "Meet deadline (UTC): $DEADLINE"

CRON_MIN=$(date -u -d "$DEADLINE" +%M)
CRON_HOUR=$(date -u -d "$DEADLINE" +%H)
CRON_DAY=$(date -u -d "$DEADLINE" +%d)
CRON_MONTH=$(date -u -d "$DEADLINE" +%m)

CRON_EXPR="$CRON_MIN $CRON_HOUR $CRON_DAY $CRON_MONTH *"

echo "Cron expression (UTC): $CRON_EXPR"
echo "Command: cd $REPO_DIR && bash script/meet-day.sh >> $LOG 2>&1"

EXISTING=$(crontab -l 2>/dev/null | grep -F "$MARKER" || true)
if [ -n "$EXISTING" ]; then
  echo "Removing existing meet-day cron job:"
  echo "  $EXISTING"
  (crontab -l 2>/dev/null | grep -v -F "$MARKER") | crontab -
fi

(crontab -l 2>/dev/null; echo "$CRON_EXPR cd $REPO_DIR && bash $REPO_DIR/script/meet-day.sh >> $LOG 2>&1 $MARKER") | crontab -

echo "Cron job installed:"
echo "  $(crontab -l | grep -F "$MARKER")"
echo ""
echo "To remove later: crontab -l | grep -v '$MARKER' | crontab -"
