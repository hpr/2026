import fs from 'fs';
import { execSync } from 'child_process';
import { ENTRIES_PATH, MEET, MONTAGE_PATH } from './const.mjs';

const entries: any = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));
const imgs = Object.values(entries[MEET]).reduce(
  (acc: number, evt: any) => acc + Math.min(2, evt.entrants?.length || 0), 0 as number
) as number;

let bestCols = imgs;
for (let c = Math.ceil(Math.sqrt(imgs)); c <= imgs; c++) {
  if (imgs % c === 0) { bestCols = c; break; }
}
const rows = Math.ceil((imgs as number) / bestCols);
const tile = `${bestCols}x${rows}`;

console.log(`${imgs} images -> ${tile}`);

const files = Object.values(entries[MEET]).flatMap((evt: any) =>
  (evt.entrants || []).slice(0, 2).map((e: any) => `./public/img/avatars/${e.id}_128x128.png`)
).join(' ');

execSync(`montage -background "#141517" -tile ${tile} ${files} ${MONTAGE_PATH}`, { stdio: 'inherit' });
