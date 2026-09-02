import fs from 'fs';
import path from 'path';
import { BLURBCACHE_PATH, ENTRIES_PATH, MEET, SERVER_URL, standingsMeets } from './const.mjs';
import { AthleticsEvent, Entries, BlurbCache } from './types.mjs';
import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── Logging ─────────────────────────────────────────────────────────────────
const LOG_DIR = './script/logs';
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_PATH = path.join(LOG_DIR, `getBlurbs_${MEET}_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
const log = (msg: string) => {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(msg);
  logStream.write(line + '\n');
};
const logErr = (msg: string) => {
  const ts = new Date().toISOString();
  const line = `[${ts}] ERROR: ${msg}`;
  console.error(msg);
  logStream.write(line + '\n');
};

const entries: Entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));
const blurbCache: BlurbCache = JSON.parse(fs.readFileSync(BLURBCACHE_PATH, 'utf-8'));

const cap = (str: string) => str[0].toUpperCase() + str.slice(1);

function nth(n: number) {
  return n + (['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th');
}

function getAge(birthday: Date) {
  const ageDifMs = Date.now() - birthday.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

async function getBlurbs() {
  // const api = new ChatGPTAPI({
  //   apiKey: process.env.OPENAI_API_KEY!,
  //   completionParams: {
  //     model: 'gpt-4',
  //   },
  // });

  blurbCache[MEET] ??= { blurbs: {}, athletes: {} };
  const meetInfo = standingsMeets.find(m => m.meet === MEET);
  const meetDate = meetInfo?.date ?? '';
  const meetName = MEET[0].toUpperCase() + MEET.slice(1, -2) + ' Diamond League';

  // Collect events needing blurbs
  const todo: { evt: AthleticsEvent; gender: string; ungenderedEvt: string }[] = [];
  for (const key in entries[MEET]) {
    const evt = key as AthleticsEvent;
    if (blurbCache[MEET].blurbs[evt]) continue;
    if (!entries[MEET][evt]?.entrants.length) { log(`${evt}: no entrants`); continue; }
    const gender = evt.toLowerCase().includes('women') ? 'Women' : 'Men';
    const ungenderedEvt = evt
      .split(' ') .filter((w) => 
      !w.toLowerCase().includes('men')).join(' ')
      .replace('meters', 'Metres')
      .replace('Meters', 'Metres')
      .replace(',', '')
      .replace('m/hurdles', ' Metres Hurdles')
      .replace('m Hurdles', ' Metres Hurdles')
      .replace(/m H$/, ' Metres Hurdles')
      .replace(/m H /, ' Metres Hurdles ')
      .replace('mH', ' Metres Hurdles')
      .replace(/(\d) H$/, '$1 Metres Hurdles')
      .replace('mSC', ' Metres Steeplechase')
      .replace('m SC', ' Metres Steeplechase')
      .replace('m Sc', ' Metres Steeplechase')
      .replace(/m St$/, ' Metres Steeplechase')
      .replace(/m Steeple$/, ' Metres Steeplechase')
      .replace(/m Steeplechase$/, ' Metres Steeplechase')
      .replace(/m$/, ' Metres')
      .replace(/Steeple$/, 'Steeplechase')
      .replace(/Javelin$/, 'Javelin Throw')
      .replace('2 Miles', 'Two Miles')
      .replace('Dream', 'One')
      .replace(' put', ' Put')
      .replace(/^1 Mile/, 'One Mile')
      .replace('Bowerman', 'One')
      .replace('Mutola ', '')
      .replace(/Discus$/, 'Discus Throw')
      .replace(' throw', ' Throw')
      .replace(' vault', ' Vault')
      .replace(' jump', ' Jump')
      .replace(' steeplechase', ' Steeplechase');
    todo.push({ evt, gender, ungenderedEvt });
  }

  log(`${todo.length} events need blurbs`);

  // Process in batches of 8 concurrent requests
  const BATCH = 8;
  const failed: string[] = [];
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    log(`Batch ${Math.floor(i / BATCH) + 1}: ${batch.map(b => b.evt).join(', ')}`);
    await Promise.all(batch.map(async ({ evt, gender, ungenderedEvt }) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const resp = (await (await fetch(SERVER_URL + '/match', {
            method: 'POST',
            body: JSON.stringify({
              discipline: ungenderedEvt,
              gender,
              meetName,
              meetDate,
              athletes: entries[MEET][evt]?.entrants.map(e => ({ id: e.id, year: String(new Date().getFullYear()) })),
            }),
          })).json());
          if (!resp.response) throw new Error(`Empty response: ${JSON.stringify(resp).slice(0, 500)}`);
          blurbCache[MEET].blurbs[evt] = resp.response;
          log(`  ✓ ${evt} (${resp.response.length} chars)`);
          return;
        } catch (e: any) {
          logErr(`  ✗ ${evt} (attempt ${attempt + 1}/3): ${e?.message ?? e}`);
          if (attempt < 2) await new Promise(res => setTimeout(res, 2000));
        }
      }
      failed.push(evt);
    }));
    fs.writeFileSync(BLURBCACHE_PATH, JSON.stringify(blurbCache));
    log(`  Saved cache (${Object.keys(blurbCache[MEET].blurbs).length} total)`);
  }

  // Summary
  const cached = Object.keys(blurbCache[MEET].blurbs).length;
  log(`\n=== Summary: ${cached} cached, ${todo.length} attempted, ${failed.length} failed ===`);
  if (failed.length) log(`Failed events: ${failed.join(', ')}`);
  log(`Log file: ${LOG_PATH}`);

  const oldEntries: Entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));  
  for (const evt in oldEntries[MEET]) {
    oldEntries[MEET][evt].blurb = blurbCache[MEET]?.blurbs?.[evt];
  }
  // fs.writeFileSync(ENTRIES_PATH, JSON.stringify(oldEntries)); // if commented out, run getEntries
}

await getBlurbs();
