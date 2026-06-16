import fs from 'fs';
import { BLURBCACHE_PATH, ENTRIES_PATH, MEET, SERVER_URL, standingsMeets } from './const.mjs';
import { AthleticsEvent, Entries, BlurbCache } from './types.mjs';
import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
  for (const key in entries[MEET]) {
    const evt = key as AthleticsEvent;
    const gender = evt.toLowerCase().includes('women') ? 'Women' : 'Men';
    const targetTime = entries[MEET][evt]?.targetTime;
    const ungenderedEvt = evt
      .split(' ') .filter((w) => 
      !w.toLowerCase().includes('men')).join(' ')
      .replace('meters', 'Metres')
      .replace('Meters', 'Metres')
      .replace(',', '')
      .replace('m Hurdles', ' Metres Hurdles')
      .replace(/m H$/, ' Metres Hurdles')
      .replace(/m H /, ' Metres Hurdles ')
      .replace('mH', ' Metres Hurdles')
      .replace('mSC', ' Metres Steeplechase')
      .replace('m SC', ' Metres Steeplechase')
      .replace(/m St$/, ' Metres Steeplechase')
      .replace(/m Steeple$/, ' Metres Steeplechase')
      .replace(/m Steeplechase$/, ' Metres Steeplechase')
      .replace(/m$/, ' Metres')
      .replace(/Steeple$/, 'Steeplechase')
      .replace(/Javelin$/, 'Javelin Throw')
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
    fs.writeFileSync(BLURBCACHE_PATH, JSON.stringify(blurbCache));
    fs.writeFileSync(ENTRIES_PATH, JSON.stringify(entries));
    if (!blurbCache[MEET].blurbs[evt]) {
      console.log(evt);
      if (!entries[MEET][evt]?.entrants.length) {
        console.log('no entrants');
        continue;
      }
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
      console.log(resp);
      blurbCache[MEET].blurbs[evt] = resp.response;
      fs.writeFileSync(BLURBCACHE_PATH, JSON.stringify(blurbCache));
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  const oldEntries: Entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));  
  for (const evt in oldEntries[MEET]) {
    oldEntries[MEET][evt].blurb = blurbCache[MEET]?.blurbs?.[evt];
  }
  // fs.writeFileSync(ENTRIES_PATH, JSON.stringify(oldEntries)); // if commented out, run getEntries
}

await getBlurbs();
