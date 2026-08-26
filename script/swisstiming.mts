/**
 * swisstiming.mts - Fetch entries for meets using the swisstiming/flotrack pipeline.
 *
 * Used when the DL website has transitioned to AJAX rendering that can't be scraped
 * with the old JSDOM approach. Instead:
 *   1. Flotrack API provides entry lists (names, nats, PBs) as HTML
 *   2. Swisstiming COMPSTRUCT provides event dates/times and DIAMOND status
 *   3. WA GraphQL search resolves athlete IDs
 *
 * Also auto-infers deadline and tiebreaker from the swisstiming schedule.
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import { AthleticsEvent, DLMeet, Entrant, Entries, BlurbCache, MeetCache } from './types.mjs';
import { CACHE_PATH, BLURBCACHE_PATH, disciplineCodes } from './const.mjs';

// ── Config ──────────────────────────────────────────────────────────────────

/** Map meet → flotrack event ID (from api.flotrack.org URL) */
export const flotrackEventIds: Partial<Record<DLMeet, string>> = {
  zurich26: '14465227',
};

const WA_GRAPHQL_ENDPOINT = 'https://graphql-prod-4881.edge.aws.worldathletics.org/graphql';
const WA_GRAPHQL_API_KEY = 'da2-wbnmtmvlpbhifh3uc2xaxsue5i';

// ── Types ───────────────────────────────────────────────────────────────────

type SwissCompStruct = {
  content: {
    full: {
      ListDay: string[];
      Events: Record<
        string,
        {
          ListIndex: number;
          Rsc: string;
          Name: string;
          Phases: Record<
            string,
            {
              Units: Record<string, { StartTime: number; Rsc: string }>;
            }
          >;
        }
      >;
    };
  };
};

type FlotrackAthlete = {
  fullName: string;
  nat: string; // IOC 3-letter
  pb: string;
};

type FlotrackEvent = {
  rawName: string; // e.g. "Women's Pole Vault - Aug. 26"
  event: AthleticsEvent; // normalized, e.g. "Pole Vault Women"
  athletes: FlotrackAthlete[];
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert flotrack event name to AthleticsEvent format.
 *  "Women's Pole Vault - Aug. 26" → "Pole Vault Women"
 *  "Men's 1500m" → "1500m Men"
 *  "Men's Javelin Throw" → "Javelin Men"
 */
const flotrackEvtNormalize = (raw: string): AthleticsEvent => {
  let evt = raw.replace(/ - \w+\. \d+$/, '').trim(); // strip date suffix
  if (evt.startsWith("Women's ")) evt = evt.slice(8) + ' Women';
  else if (evt.startsWith("Men's ")) evt = evt.slice(6) + ' Men';
  evt = evt.replace('Javelin Throw', 'Javelin');
  return evt as AthleticsEvent;
};

/** Convert swisstiming event name to AthleticsEvent format (for matching).
 *  "Javelin Throw Men" → "Javelin Men"
 */
const swissEvtNormalize = (name: string): string => {
  return name.replace('Javelin Throw', 'Javelin');
};

/** Format a Unix ms timestamp as a deadline string like "11:30am ET" */
const formatDeadline = (ms: number): string => {
  const dt = new Date(ms);
  // Convert to ET (EDT = UTC-4 in summer)
  const et = new Date(dt.getTime() - 4 * 60 * 60 * 1000);
  const h = et.getUTCHours();
  const m = et.getUTCMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm} ET` : `${h12}:${m.toString().padStart(2, '0')}${ampm} ET`;
};

// ── Flotrack parsing ────────────────────────────────────────────────────────

const fetchFlotrackEntries = async (flotrackEventId: string): Promise<FlotrackEvent[]> => {
  const url = `https://api.flotrack.org/api/experiences/web/legacy-core/events/${flotrackEventId}?version=1.33.2&site_id=1`;
  const resp = await fetch(url);
  const data = await resp.json();
  const html: string = data.data.participant_content;

  const $ = cheerio.load(html);
  const events: FlotrackEvent[] = [];

  $('p').each((_, p) => {
    const rawName = $(p).text().trim();
    const ul = $(p).next('ul');
    if (!ul.length || !rawName) return;

    const event = flotrackEvtNormalize(rawName);
    const athletes: FlotrackAthlete[] = [];

    ul.find('li').each((_, li) => {
      const text = $(li).text().trim();
      const match = text.match(/^(.+?)\s+\(([A-Z]{3})\)\s+-\s+PB:\s+(.+)$/);
      if (match) {
        const [, fullName, nat, pb] = match;
        athletes.push({ fullName: fullName.trim(), nat, pb: pb === 'N/A' ? '' : pb });
      }
    });

    if (athletes.length) events.push({ rawName, event, athletes });
  });

  return events;
};

// ── Swisstiming schedule ────────────────────────────────────────────────────

const fetchSwisstimingSchedule = async (
  cityUpper: string,
  year: string
): Promise<SwissCompStruct['content']['full']> => {
  const url = `https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/${cityUpper}_${year}_COMPSTRUCT_JSON.json`;
  const resp = await fetch(url);
  const data: SwissCompStruct = await resp.json();
  return data.content.full;
};

// ── WA GraphQL search ───────────────────────────────────────────────────────

const waSearch = async (
  fullName: string,
  nat: string,
  disciplineCode?: string
): Promise<{ id: string; firstName: string; lastName: string } | undefined> => {
  const body = JSON.stringify({
    operationName: 'SearchCompetitors',
    variables: { query: fullName, disciplineCode },
    query: `query SearchCompetitors($query: String, $gender: GenderType, $disciplineCode: String, $environment: String, $countryCode: String) {
      searchCompetitors(query: $query, gender: $gender, disciplineCode: $disciplineCode, environment: $environment, countryCode: $countryCode) {
        aaAthleteId
        familyName
        givenName
        birthDate
        disciplines
        gender
        country
        __typename
      }
    }`,
  });

  const resp = await fetch(WA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'x-api-key': WA_GRAPHQL_API_KEY, 'content-type': 'application/json' },
    body,
  });
  const { data } = await resp.json();
  const results = data?.searchCompetitors ?? [];

  // Normalize for comparison
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchNorm = normalize(fullName);
  const nameWords = fullName.split(' ');
  const lastWord = nameWords[nameWords.length - 1];

  // Filter: match country, then find best name match
  const candidates = results.filter(
    (r: any) => r.country === nat && r.aaAthleteId
  );

  // Try full name match first (handles multi-word family names like "dos Santos", "Hunter Bell")
  const match = candidates.find((r: any) => {
    const waFirst = normalize(r.givenName);
    const waLast = normalize(r.familyName);
    return searchNorm === `${waFirst} ${waLast}` ||
           searchNorm === `${waLast} ${waFirst}` ||
           (searchNorm.includes(waFirst) && searchNorm.includes(waLast));
  }) ?? candidates.find((r: any) => {
    const waLast = normalize(r.familyName);
    const searchLast = normalize(lastWord);
    return waLast === searchLast || waLast.startsWith(searchLast) || searchLast.startsWith(waLast);
  }) ?? candidates.find((r: any) => {
    // Fallback: check if any name word matches the family name
    const waLast = normalize(r.familyName);
    return nameWords.some(w => normalize(w) === waLast);
  }) ?? candidates[0]; // Last resort: first country-matched result

  if (!match) {
    console.log(`  ⚠ No WA match for ${fullName} (${nat})`);
    return undefined;
  }

  // Use WA's givenName/familyName (properly capitalized)
  const firstName = match.givenName;
  const lastName = match.familyName
    .split(' ')
    .map((w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return { id: match.aaAthleteId, firstName, lastName };
};

// ── Main export ─────────────────────────────────────────────────────────────

export const getSwisstimingEntries = async (
  meet: DLMeet,
  oldEntries: Entries,
  cache: MeetCache,
  entries: Entries,
  tieBreakers: { [k in DLMeet]?: { [k in AthleticsEvent]?: string } },
  targetTimes: { [k in DLMeet]?: { [k in AthleticsEvent]?: string } }
): Promise<{ deadline: string; tiebreakerEvent: string }> => {
  const flotrackId = flotrackEventIds[meet];
  if (!flotrackId) throw new Error(`No flotrack event ID for ${meet}`);

  const city = meet.replace(/\d+$/, '');
  const year = '20' + (meet.match(/\d+$/)?.[0] ?? '26');
  const cityUpper = city.toUpperCase();

  console.log(`Fetching swisstiming schedule for ${cityUpper}_${year}...`);
  const swiss = await fetchSwisstimingSchedule(cityUpper, year);

  // Build map of normalized event name → swiss data
  const swissEvents: Record<string, { isDiamond: boolean; startTime: number }> = {};
  for (const [code, evt] of Object.entries(swiss.Events)) {
    const normalized = swissEvtNormalize(evt.Name);
    const phase = Object.values(evt.Phases)[0];
    const unit = Object.values(phase?.Units ?? {})[0];
    if (!unit) continue;
    swissEvents[normalized] = {
      isDiamond: code.includes('DIAMOND'),
      startTime: unit.StartTime,
    };
  }

  console.log(`Fetching flotrack entries (event ${flotrackId})...`);
  const flotrackEvents = await fetchFlotrackEntries(flotrackId);

  // Auto-infer deadline and tiebreaker from swisstiming
  const diamondEvents = Object.entries(swissEvents)
    .filter(([, v]) => v.isDiamond)
    .sort((a, b) => a[1].startTime - b[1].startTime);

  // Group by day
  const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const allDays = [...new Set(diamondEvents.map(([, v]) => dayOf(v.startTime)))].sort();
  const lastDay = allDays[allDays.length - 1];
  const lastDayEvents = diamondEvents.filter(([, v]) => dayOf(v.startTime) === lastDay);

  const firstEvent = lastDayEvents[0];
  const lastEvent = diamondEvents[diamondEvents.length - 1]; // last overall (not just last day)

  const deadline = formatDeadline(firstEvent[1].startTime);
  const tiebreakerEvent = lastEvent[0];

  console.log(`\nInferred deadline: ${deadline} (first DL event on ${lastDay})`);
  console.log(`Inferred tiebreaker event: ${tiebreakerEvent}`);
  console.log(`Days: ${allDays.join(', ')} (${allDays.length > 1 ? 'multi-day, using last day for deadline' : 'single day'})`);
  console.log(`Diamond events: ${diamondEvents.map(([n]) => n).join(', ')}\n`);

  // Process flotrack events, filtering to DIAMOND only
  const blurbCache: BlurbCache = JSON.parse(fs.readFileSync(BLURBCACHE_PATH, 'utf-8'));
  entries[meet] = {};

  for (const flotrackEvt of flotrackEvents) {
    const evtName = flotrackEvt.event;
    const swissInfo = swissEvents[evtName];

    if (!swissInfo) {
      console.log(`  ⚠ ${flotrackEvt.rawName} (${evtName}) not found in swisstiming, skipping`);
      continue;
    }
    if (!swissInfo.isDiamond) {
      console.log(`  ⏭ ${evtName} is not a Diamond event, skipping`);
      continue;
    }

    // Skip events on earlier days (they happen before the entry deadline)
    if (allDays.length > 1 && dayOf(swissInfo.startTime) !== lastDay) {
      console.log(`  ⏭ ${evtName} is on ${dayOf(swissInfo.startTime)} (before deadline day ${lastDay}), skipping`);
      continue;
    }

    // Skip excluded events
    const { excludedEvents } = await import('./const.mjs');
    if (excludedEvents[meet]?.includes(evtName)) {
      console.log(`  ⏭ ${evtName} is excluded, skipping`);
      continue;
    }

    console.log(`  Processing ${evtName} (${flotrackEvt.athletes.length} athletes)...`);

    // Look up WA IDs
    const gender = evtName.endsWith('Women') ? 'Women' : 'Men';
    const disciplineKey = evtName.replace(/ (Men|Women)$/, '');
    const dCode = disciplineCodes[disciplineKey];

    const entrants: Entrant[] = [];
    for (const ath of flotrackEvt.athletes) {
      const cacheKey = `${ath.fullName}|${ath.nat}`;
      const cached = cache[meet]?.ids?.[cacheKey];

      let id: string | undefined;
      let firstName: string;
      let lastName: string;

      if (cached) {
        id = cached.id;
        // Split full name for display
        const words = ath.fullName.split(' ');
        lastName = words[words.length - 1];
        firstName = words.slice(0, -1).join(' ');
      } else {
        const result = await waSearch(ath.fullName, ath.nat, dCode);
        cache[meet] ??= { schedule: {}, events: {}, ids: {} } as any;
        cache[meet].ids ??= {};
        if (result) {
          cache[meet].ids[cacheKey] = { id: result.id, country: ath.nat };
          id = result.id;
          firstName = result.firstName;
          lastName = result.lastName;
        } else {
          // No WA match - use name as-is
          const words = ath.fullName.split(' ');
          lastName = words[words.length - 1];
          firstName = words.slice(0, -1).join(' ');
        }
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      }

      entrants.push({
        id: id ?? '',
        firstName: firstName!,
        lastName: lastName!,
        nat: ath.nat,
        pb: ath.pb,
        sb: '',
        hasAvy: id ? fs.existsSync(`./public/img/avatars/${id}_128x128.png`) : false,
      });
    }

    // Sort entrants
    const isFieldEvt = ['jump', 'vault', 'shot', 'discus', 'javelin'].some(s =>
      evtName.toLowerCase().includes(s)
    );
    entrants.sort((a, b) => {
      if (!a.pb && !b.pb) return 0;
      if (!a.pb) return 1;
      if (!b.pb) return -1;
      if (isFieldEvt) {
        const diff = Number.parseInt(b.pb) - Number.parseInt(a.pb);
        return diff || b.pb.localeCompare(a.pb);
      } else {
        const diff = Number.parseInt(a.pb) - Number.parseInt(b.pb);
        return diff || a.pb.localeCompare(b.pb);
      }
    });

    entries[meet]![evtName] = {
      tiebreaker: tieBreakers[meet]?.[evtName],
      date: oldEntries[meet]?.[evtName]?.date ?? new Date(swissInfo.startTime).toISOString(),
      url: `https://${city}.diamondleague.com/en/programme-results/`,
      deadline,
      blurb: blurbCache[meet]?.blurbs?.[evtName],
      targetTime: targetTimes[meet]?.[evtName],
      entrants,
    };
  }

  return { deadline, tiebreakerEvent };
};
