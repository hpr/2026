import fs from 'fs';
import { execSync } from 'child_process';
import { ENTRIES_PATH, MEET, MONTAGE_PATH } from './const.mjs';

const entries: any = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));
let imgs: number = Object.values(entries[MEET]).reduce(
  (acc: number, evt: any) => acc + Math.min(2, evt.entrants?.length || 0), 0 as number
) as number;

let bestCols = 1, bestRows = imgs, bestRatio = Infinity;
for (let c = 1; c <= imgs; c++) {
  if (imgs % c === 0) {
    const r = imgs / c;
    const ratio = Math.max(c / r, r / c);
    if (ratio <= bestRatio) { bestCols = c; bestRows = r; bestRatio = ratio; }
  }
}
if (bestRatio > 2) {
  const pool = Object.values(entries[MEET]).reduce((acc: number, evt: any) => acc + Math.max(0, (evt.entrants?.length || 0) - 2), 0);
  for (let target = imgs + 1; target <= imgs + pool; target++) {
    for (let c = 1; c <= target; c++) {
      if (target % c === 0) {
        const r = target / c;
        const ratio = Math.max(c / r, r / c);
        if (ratio < bestRatio) { bestCols = c; bestRows = r; bestRatio = ratio; imgs = target; }
      }
    }
  }
}
const tile = `${bestCols}x${bestRows}`;

console.log(`${imgs} images -> ${tile}`);

const remainingExtra = imgs - Object.values(entries[MEET]).reduce((acc: number, evt: any) => acc + Math.min(2, evt.entrants?.length || 0), 0);
let extrasAdded = 0;
const files = Object.values(entries[MEET]).flatMap((evt: any) => {
  const n = Math.min(2 + ((extrasAdded < remainingExtra) ? Math.min((evt.entrants?.length || 0) - 2, remainingExtra - extrasAdded) : 0), evt.entrants?.length || 0);
  extrasAdded += Math.max(0, n - 2);
  return (evt.entrants || []).slice(0, n).map((e: any) => `./public/img/avatars/${e.id}_128x128.png`);
}).join(' ');

execSync(`montage -background "#141517" -tile ${tile} ${files} ${MONTAGE_PATH}`, { stdio: 'inherit' });
