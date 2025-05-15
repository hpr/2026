// sqlite3 -header -csv fantasy1500.db 'select * from picks;' > picks.csv
// scp habs@ma.sdf.org:~/db/picks.csv .

import { parse } from 'csv-parse/sync';
import fs from 'fs';

const rows: { picksJson: string }[] = parse(fs.readFileSync('./picks.csv', 'utf-8'), {
  columns: true,
  skip_empty_lines: true,
});
type AthFreq = { [ath: string]: number };
const res: { [evt: string]: { toWin: AthFreq, toMedal: AthFreq } } = {};

for (const { picksJson } of rows) {
  const picks = JSON.parse(picksJson);
  for (const evt in picks) {
    if (evt === 'tiebreaker') continue;
    res[evt] ??= { toWin: {}, toMedal: {} };
    for (let i = 0; i < 3; i++) {
      const { firstName, lastName }: { firstName: string; lastName: string } = picks[evt][i];
      const pickName = `${firstName} ${lastName}`;
      res[evt].toMedal[pickName] ??= 0;

      if (i === 0) {
        res[evt].toWin[pickName] ??= 0;
        res[evt].toWin[pickName]++;
      }
      res[evt].toMedal[pickName]++;
    }
  }
}

for (const evt in res) {
  console.log(`${evt}:`);
  const total = Object.values(res[evt].toWin).reduce((acc, x) => acc + x, 0);
  for (const key of ['toWin', 'toMedal'] as const) {
    let keyLine = `- To ${key[2].toLowerCase()}${key.slice(3)}: `
    const namePairs: string[] = [];
    for (const [name, num] of Object.entries(res[evt][key]).sort((a, b) => b[1] - a[1])) {
      namePairs.push(`${name} (${Math.round(num / total * 100)}%)`);
    }
    keyLine += namePairs.join(', ');
    console.log(keyLine);
  }
  console.log('');
}

const evts: [string, number][] = [];
for (const evt in res) {
  if (evt === 'tiebreaker') continue;
  // const total = Object.values(res[evt]).reduce((acc, x) => acc + x, 0);
  const topPick = Object.entries(res[evt].toWin).sort((a, b) => b[1] - a[1])[0];
  evts.push([evt, topPick[1]]);
}

console.log('Events sorted by controversy for win:')
evts
  .sort((a, b) => a[1] - b[1])
  .forEach(([evt, num], i) => {
    console.log(` ${String(i+1).padStart(2, '0')}. ${evt}: ${100 - Math.round((num / rows.length) * 100)}% controversial`);
  });
