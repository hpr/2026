import { JSDOM } from 'jsdom';
import fs from 'fs';
import { nameFixer } from 'name-fixer';
import { AthleticsEvent, BlurbCache, DLMeet, Entrant, Entries, EventCircuitStandings, MeetCache, WAEventCode } from './types.mjs';
import PDFParser, { Output } from 'pdf2json';
import { CACHE_PATH, disciplineCodes, ENTRIES_PATH, runningEvents, getDomain, BLURBCACHE_PATH, MEET, SERVER_URL } from './const.mjs';
//import PDFJS from 'pdfjs-dist/legacy/build/pdf.js';
import { PNG } from 'pngjs';
import { TextItem } from 'pdfjs-dist/types/src/display/api.js';
import * as sass from 'sass';
import * as cheerio from 'cheerio';

/*
[...document.querySelectorAll('tr')].slice(1).map(tr => {
  const name = tr.querySelector('.name').innerText;
  const lastName = name.split(' ')[0];
  let id = '';
	window.open = (str) => {
    id = str.match(/^\/athletes\/(\d+)\.html$/)[1];
    return { focus: () => {} };
  }
  tr.querySelector('.athlete-name').click();
  return {
		firstName: name.split(' ').slice(1).join(' '),
    lastName: lastName[0].toUpperCase() + lastName.slice(1).toLowerCase(),
    nat: tr.querySelector('.nat-code').innerText,
    pb: tr.querySelector('.pb').innerText,
    sb: tr.querySelector('.sb').innerText,
    hasAvy: true,
    id,
  }
})
*/
const waApi: { apiKey: string, endpoint: string } = await (await fetch(SERVER_URL + '/wa')).json();

const cache: MeetCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));

const targetTimes: { [k in DLMeet]?: { [k in AthleticsEvent]?: string } } = {
  paris23: {
    '3000m Steeplechase Men': '7:53',
  },
};

const tieBreakers: { [k in DLMeet]?: { [k in AthleticsEvent]?: string } } = {
  xiamen25: {
    '300mH Men': '33.26',
  },
  xiamen24: {
    "100m Men": '9.85',
  },
  shanghai24: {
    "200m Women": '21.90',
  },
  doha24: {
    "3000m Steeplechase Men": '8:00.00',
  },
  rabat24: {
    "100m Men": "9.95",
  },
  eugene24: {
    "Mile Men": "3:45.00",
  },
  oslo24: {
    "5000m Men": "12:40.00",
  },
  stockholm24: {
    "400m Hurdles Men": "46.50",
  },
  paris24: {
    "400m Hurdles Men": "46.50",
  },
  monaco24: {
    "1500m Men": "3:28.00",
  },
  london24: {
    "400m Hurdles Women": "51.00",
  },
  lausanne24: {
    "1500m Men": "3:26.00",
  },
  silesia24: {
    "800m Men": "1:41.00",
  },
  rome24: {
    "100m Men": "9.80",
  },
  zurich24: {
    "1500m Men": "3:26.50",
  },
  brussels24: {
    "800m Men": "1:41.00",
  },
  shanghai25: {
    "100m Men": "9.99",
  },
  doha25: {
    "200m Men": "19.80",
  },
  rabat25: {
    "3000m Steeple Men": "8:05.00",
  },
  rome25: {
    "5000m Women": "14:20.00",
  },
  oslo25: {
    '5000m Men': '12:40.00',
  },
  stockholm25: {
    '400m Hurdles Men': '47.50',
  },
  paris25: {
    '110m Hurdles Men': '13.00',
  },
  eugene25: {
    'Bowerman Mile Men': '3:46.00',
  },
  monaco25: {
    '110m Hurdles Men': '12.90',
  },
  london25: {
    '1 Mile Women': '4:15.00',
  },
  silesia25: {
    '100m Men': '9.80',
  },
  lausanne25: {
    '800m Men': '1:41.50',
  },
  brussels25: {
    '100m Women': '10.65',
  },
  zurich25: {
    '200m Men': '19.60',
  },
  shanghai26: {
    '1500m Women': '3:55.00',
  },
  xiamen26: {
    '100mH Women': '12.25',
  },
  rabat26: {
    '3000m St Men': '8:00',
  },
  rome26: {
    '100m Men': '9.90',
  },
  stockholm26: {
    '1500 meters, Men': '3:30.00',
  },
};

const deadlines: { [k in DLMeet]?: string } = {
  xiamen24: '7am ET',
  shanghai24: '7am ET',
  doha24: '12pm noon ET',
  rabat24: '2pm ET',
  eugene24: '4pm ET',
  oslo24: '2pm ET',
  stockholm24: '12pm noon ET',
  paris24: '9am ET',
  monaco24: '2pm ET',
  london24: '9am ET',
  lausanne24: '2pm ET',
  silesia24: '8:59am ET',
  rome24: '3pm ET',
  zurich24: '2pm ET',
  brussels24: '2pm ET',

  xiamen25: '7am ET',
  shanghai25: '6:20am ET',
  doha25: '10:45am ET',
  rabat25: '1:20pm ET',
  rome25: '1:15pm ET',

  oslo25: '1:15pm ET',
  stockholm25: '11:14am ET',
  paris25: '1:50pm ET',
  eugene25: '3:27pm ET',
  monaco25: '12:55pm ET',
  london25: '7:53am ET',
  silesia25: '8:05am ET',
  lausanne25: '1:30pm ET',
  brussels25: '12:29pm ET',
  zurich25: '11:05am ET',

  shanghai26: '6:15am ET',
  xiamen26: '6:10am ET',
  rabat26: '1:10pm ET',
  rome26: '1:10pm ET',
  stockholm26: '10:04am ET',
};

const schedules: { [k in DLMeet]?: string[] } = {
  doha: ['https://web.archive.org/web/20220512074007/https://doha.diamondleague.com/programme-results-doha/'],
  birminghamIndoor: ['./script/files/EntryList.PDF'],
  ncaai23: [
    'https://www.tfrrs.org/list_data/3901?other_lists=https%3A%2F%2Ftf.tfrrs.org%2Flists%2F3901%2F2022_2023_NCAA_Division_I_Indoor_Qualifying_List&limit=30&event_type=&year=&gender=m',
    'https://www.tfrrs.org/list_data/3901?other_lists=https%3A%2F%2Ftf.tfrrs.org%2Flists%2F3901%2F2022_2023_NCAA_Division_I_Indoor_Qualifying_List&limit=30&event_type=&year=&gender=f',
  ],
  boston23: ['https://www.baa.org/races/boston-marathon/pro-athletes/2023-boston-marathon-professional-team'],
  doha23: ['https://doha.diamondleague.com/programme-results-doha/'],
  rabat23: ['https://rabat.diamondleague.com/en/programme-results-rabat/'],
  florence23: ['https://rome.diamondleague.com/en/programme-results/programme-results-rome/'],
  paris23: ['https://paris.diamondleague.com/en/programme-results/programme-2020-results/'],
  oslo23: ['https://oslo.diamondleague.com/en/programme-results/programme-2023/'],
  lausanne23: ['https://lausanne.diamondleague.com/en/programme-results-lausanne/'],
  stockholm23: ['https://stockholm.diamondleague.com/en/lists-results-stockholm/'],
  silesia23: ['https://silesia.diamondleague.com/en/programme-results/translate-to-english-programme-results/'],
  monaco23: ['https://monaco.diamondleague.com/en/programme-resultats-monaco-en/'],
  london23: ['https://london.diamondleague.com/lists-results-london/'],
  zurich23: ['https://zurich.diamondleague.com/en/programme-results-zurich/'],
  xiamen23: ['https://xiamen.diamondleague.com/program-results/program-2023/'],
  brussels23: ['https://brussels.diamondleague.com/en/programme-results-brussels/'],
  eugene23: ['https://eugene.diamondleague.com/program-results-eugene/'],

  xiamen24: ['https://xiamen.diamondleague.com/program-results/program-2024/'],
  shanghai24: ['https://shanghai.diamondleague.com/programme-results/programme-results-shanghai/'],
  doha24: ['https://doha.diamondleague.com/programme-results-doha/'],
  rabat24: ['https://rabat.diamondleague.com/en/programme-results-rabat/'],
  eugene24: ['https://eugene.diamondleague.com/program-results-eugene/'],
  oslo24: ['https://oslo.diamondleague.com/en/programme-results/programme-2023/'],
  stockholm24: ['https://stockholm.diamondleague.com/en/lists-results-stockholm/'],
  paris24: ['https://paris.diamondleague.com/en/programme-results/programme-2020-results/'],
  monaco24: ['https://monaco.diamondleague.com/en/programme-resultats-monaco-en/'],
  london24: ['https://london.diamondleague.com/lists-results-london/'],
  lausanne24: ['https://lausanne.diamondleague.com/en/programme-results-lausanne/'],
  silesia24: ['https://silesia.diamondleague.com/en/programme-results/translate-to-english-programme-results/'],
  rome24: ['https://rome.diamondleague.com/en/programme-results/programme-results-rome/'],
  zurich24: ['https://zurich.diamondleague.com/en/programme-results/programme-results/'],
  brussels24: ['https://brussels.diamondleague.com/en/program-results/program-2024/program-2024/'],

  xiamen25: ['https://xiamen.diamondleague.com/programme-results/'],
  shanghai25: ['https://shanghai.diamondleague.com/programme-results/'],
  doha25: ['https://doha.diamondleague.com/programme-results/'],
  rabat25: ['https://rabat.diamondleague.com/en/programme-results/'],
  rome25: ['https://rome.diamondleague.com/en/programme-results/'],
  oslo25: ['https://oslo.diamondleague.com/en/programme-results/'],
  stockholm25: ['https://stockholm.diamondleague.com/en/programme-results/'],
  paris25: ['https://paris.diamondleague.com/en/programme-results/'],
  eugene25: ['https://eugene.diamondleague.com/programme-results/'],
  monaco25: ['https://monaco.diamondleague.com/en/programme-results/'],
  london25: ['https://london.diamondleague.com/programme-results/'],
  silesia25: ['https://silesia.diamondleague.com/programme-results/'],
  lausanne25: ['https://lausanne.diamondleague.com/en/programme-results/'],
  brussels25: ['https://brussels.diamondleague.com/en/programme-results/'],
  zurich25: ['https://zurich.diamondleague.com/en/programme-results/'],

  shanghai26: ['https://shanghai.diamondleague.com/programme-results/'],
  xiamen26: ['https://xiamen.diamondleague.com/programme-results/'],
  rabat26: ['https://rabat.diamondleague.com/en/programme-results/'],
  rome26: ['https://rome.diamondleague.com/en/programme-results/'],
  stockholm26: ['https://stockholm.diamondleague.com/en/programme-results/'],
};

const cityNameTo = {
  "xiamen": {
    "countryCodeAlpha2": "cn",
    "timeZone": "Asia/Shanghai"
  },
  "shanghai": {
    "countryCodeAlpha2": "cn",
    "timeZone": "Asia/Shanghai"
  },
  "doha": {
    "countryCodeAlpha2": "qa",
    "timeZone": "Asia/Qatar"
  },
  "rabat": {
    "countryCodeAlpha2": "ma",
    "timeZone": "Africa/Casablanca"
  },
  "eugene": {
    "countryCodeAlpha2": "us",
    "timeZone": "America/Los_Angeles"
  },
  "oslo": {
    "countryCodeAlpha2": "no",
    "timeZone": "Europe/Oslo"
  },
  "stockholm": {
    "countryCodeAlpha2": "se",
    "timeZone": "Europe/Stockholm"
  },
  "paris": {
    "countryCodeAlpha2": "fr",
    "timeZone": "Europe/Paris"
  },
  "monaco": {
    "countryCodeAlpha2": "mc",
    "timeZone": "Europe/Monaco"
  },
  "london": {
    "countryCodeAlpha2": "gb",
    "timeZone": "Europe/London"
  },
  "lausanne": {
    "countryCodeAlpha2": "ch",
    "timeZone": "Europe/Zurich"
  },
  "silesia": {
    "countryCodeAlpha2": "pl",
    "timeZone": "Europe/Warsaw"
  },
  "rome": {
    "countryCodeAlpha2": "it",
    "timeZone": "Europe/Rome"
  },
  "zurich": {
    "countryCodeAlpha2": "ch",
    "timeZone": "Europe/Zurich"
  },
  "brussels": {
    "countryCodeAlpha2": "be",
    "timeZone": "Europe/Brussels"
  }
};

function inTz(dateString: string, targetTimeZone: string) {
  const localDate = new Date(dateString);
  if (isNaN(localDate.getTime())) throw new Error("Invalid date string");
  const offset = getOffsetInMs(localDate, targetTimeZone);
  const desiredUtcTime = localDate.getTime() - offset;
  return new Date(desiredUtcTime);
}

function getOffsetInMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const formatted = formatter.format(date);  
  const offsetMatch = formatted.match(/GMT([+-]\d{1,2}(:?\d{0,2})?)/);
  if (!offsetMatch) throw new Error(`Unable to parse offset from: "${formatted}"`);
  const offsetString = offsetMatch[1];
  const parts = offsetString.match(/([+-])(\d{1,2})(:?(\d{2}))?/);
  if (!parts) throw new Error(`Invalid offset format: "${offsetString}"`);
  const sign = parts[1] === '+' ? 1 : -1;
  const hours = parseInt(parts[2], 10);
  const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
  return sign * ((hours * 60 + minutes) * 60 * 1000);
}

function extractCssValue(str: string, key: string) {
  const parts = str.split(';')
      .map(p => p.trim())
      .filter(p => p);
  for (const part of parts) {
      const [currentKey, ...rest] = part.split(':').map(s => s.trim());
      if (currentKey === key) {
          const currentValue = rest.join(':').trim();
          const match = currentValue.match(/'([^']*)'/);
          return match ? match[1] : null;
      }
  }
  return null;
}

const idTeams = {
  // TODO fetch from wikidata? <-- done, just need to move these to WD
  14564128: 'LSU',
  14627624: 'WSU Cougars',
  14477412: 'Monmouth University Hawks',
  14642681: 'North Carolina A&T Aggies',
};

const makeEntrantSortFunc = (isField: boolean) => (a: Entrant, b: Entrant) => {
  if (!a.pb && !b.pb) return 0;
  if (!a.pb) return 1;
  if (!b.pb) return -1;
  if (isField) {
    const sigFigDiff = Number.parseInt(b.pb) - Number.parseInt(a.pb);
    if (sigFigDiff) return sigFigDiff;
    return b.pb.localeCompare(a.pb);
  } else {
    const sigFigDiff = Number.parseInt(a.pb) - Number.parseInt(b.pb);
    if (sigFigDiff) return sigFigDiff;
    return a.pb.localeCompare(b.pb);
  }
};

const isField = (evt: string) => {
  return ['discus', 'shot', 'javelin', 'jump', 'pole'].some(str => evt?.toLowerCase().includes(str));
}

const sanitizeEvtName = (name?: string, sex?: 'men' | 'women'): string | undefined => {
  name = name?.replace('  ', ' ');
  name = name?.replace('Bowerman ', '').replace('Emsley Carr ', '').replace('Mutola ', '');
  if (name?.startsWith('Men ')) name = name.replace('Men ', '') + ' Men';
  if (name?.startsWith('Women ')) name = name.replace('Women ', '') + ' Women';
  if (!name?.toLowerCase().includes('men')) name += ` ${sex![0].toUpperCase() + sex?.slice(1)}`;
  return name
    ?.replace('Dream ', '')
    .replace(' W Women', ' Women')
    .replace(' M Men', ' Men')
    .replace(' meters', 'm')
    .replace(' meter', 'm')
    .replace(' SC', ' Steeplechase')
    .replace('hurdles', 'Hurdles');
};
const sanitizeTime = (time?: string | null) => {
  if (time?.includes(':') && (time?.split(':')[0].length ?? 0) >= 2 && (time?.split('.').at(-1)?.length ?? 0) >= 2) {
    return time?.slice(0, -1);
  }
  return time;
};

const getWaId = async (
  firstName: string,
  lastName: string,
  {
    birthYear = '',
    college = false,
    indoors,
    gender,
    disciplineCode,
  }: {
    birthYear?: string;
    college?: boolean;
    indoors?: boolean;
    gender?: 'male' | 'female';
    disciplineCode?: WAEventCode;
  }
) => {
  const { data } = await (
    await fetch(waApi.endpoint, {
      headers: { 'x-api-key': waApi.apiKey },
      body: JSON.stringify({
        operationName: 'SearchCompetitors',
        variables: {
          query: `${firstName} ${lastName}`,
          environment: indoors ? 'indoor' : undefined,
          gender,
          disciplineCode,
        },
        query: `
        query SearchCompetitors($query: String, $gender: GenderType, $disciplineCode: String, $environment: String, $countryCode: String) {
          searchCompetitors(query: $query, gender: $gender, disciplineCode: $disciplineCode, environment: $environment, countryCode: $countryCode) {
            aaAthleteId
            birthDate
            country
            givenName
            familyName
          }
        }`,
      }),
      method: 'POST',
    })
  ).json();
  console.log(firstName, '|', lastName, disciplineCode, data.searchCompetitors);

  const { aaAthleteId, country } =
    data.searchCompetitors.find((ath: { birthDate: string; givenName: string; familyName: string }) => {
      const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const aliases: { [k: string]: string[] } = {
        Izzy: ['Isabella'],
        Samantha: ['Sam'],

        Beriso: ['Shankule'],
        Gebremaryam: ['Gebrekidan'],
        Baysa: ['Bayisa'],
        Olemomoi: ['Chebet'],
        Rohatinsky: ['Rohatinksy'],
        Mastandra: ['Mastandrea'],
        Hussar: ['Douma-Hussar'],
        Chepkirui: ['Chepkurui'],
      };

      // if (
      //   ((aliases[firstName] ?? [firstName]) as string[]).every((name) => {
      //     return (
      //       !normalize(ath.givenName).toLowerCase().startsWith(normalize(name).toLowerCase()) &&
      //       !normalize(ath.givenName).toLowerCase().endsWith(normalize(name).toLowerCase())
      //     );
      //   })
      // )
      //   return false;
      const candidatesToMatchWithFamilyName = [
        lastName,
        lastName.split(' ')[0],
        lastName.split(' ').slice(0, -1).join(' '),
        lastName.split(' ').at(-1) ?? '',
        lastName.split('-')[0],
        lastName.replace(/’/g, ''),
        firstName,
        ...(aliases[lastName] ?? []),
      ];
      if (candidatesToMatchWithFamilyName.every((name) => normalize(name).toLowerCase() !== normalize(ath.familyName).toLowerCase())) return false;

      if (!ath.birthDate) return true;
      if (birthYear) return ath.birthDate.slice(-4) === birthYear;
      if (college) return +ath.birthDate.slice(-4) >= 1994;
      return true;
    }) ?? {};
  return aaAthleteId ? { id: aaAthleteId, country } : undefined;
};

const entries: Entries = {};

const getMediaGuidePhotos = async (meet: DLMeet) => {
  const entries: Entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));
  const mediaGuides: {
    [k in DLMeet]?: {
      uri: string;
      evtPages: {
        [k in AthleticsEvent]?: number[];
      };
    };
  } = {
    boston23: {
      uri: 'file:///home/habs/run/boston23/archive/BM23%20Media%20Guide%20Pages_Corrected_040323.pdf',
      evtPages: {
        "Men's Marathon": [103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116],
        "Women's Marathon": [118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133],
      },
    },
  };
  const PDFJS = await import('pdfjs-dist/legacy/build/pdf.js');
  const doc = await PDFJS.getDocument(mediaGuides[meet]?.uri!).promise;

  for (const key in mediaGuides[meet]?.evtPages) {
    const evt = key as AthleticsEvent;
    for (const pageNo of mediaGuides[meet]?.evtPages[evt] ?? []) {
      console.log(pageNo);
      const page = await doc.getPage(pageNo);
      const { items } = await page.getTextContent();
      const nameItems = (items as TextItem[]).filter(({ str, fontName }) => fontName === 'g_d0_f2' && str?.trim() && !+str);
      const dirNames = nameItems.reduce((acc, item) => {
        const dir = item.transform[4] < 400 ? 'L' : 'R';
        acc[dir] ??= [];
        acc[dir]!.push(item.str.replace(/ /g, ''));
        return acc;
      }, {} as { L: string[]; R: string[] });
      const { fnArray, argsArray } = await page.getOperatorList();

      const imageArgs = argsArray.flatMap((_, i) => {
        if (fnArray[i] === PDFJS.OPS.paintImageXObject)
          return {
            x: argsArray[i - 2][4],
            id: argsArray[i][0],
          };
        return [];
      });

      for (const { id, x } of imageArgs) {
        const isLeft = x === Math.min(...imageArgs.map(({ x }) => x));
        const { data, width, height } = await new Promise<{
          data: Uint8ClampedArray;
          width: number;
          height: number;
        }>((res) => page.objs.get(id, res));
        const png = new PNG({ width, height });
        const imgData: number[] = [];
        for (let i = 0, j = 0; i < width * height * 4; ) {
          imgData[i++] = data[j++];
          imgData[i++] = data[j++];
          imgData[i++] = data[j++];
          imgData[i++] = 255;
        }
        png.data = Buffer.from(imgData);
        const name = dirNames[isLeft ? 'L' : 'R'].join(' ');
        let matchingEntrants = entries[meet]?.[evt]?.entrants.filter(({ lastName }) => lastName.toLowerCase() === name.split(' ').at(-1)?.toLowerCase()) ?? [];
        if (matchingEntrants.length > 1)
          matchingEntrants = matchingEntrants.filter(({ firstName }) => firstName.toLowerCase() === name.split(' ').slice(0, -1).join(' ').toLowerCase());
        if (matchingEntrants.length !== 1) {
          console.log('ambiguous', name, matchingEntrants);
        } else {
          png.pack().pipe(fs.createWriteStream(`./public/img/avatars/${matchingEntrants[0].id}.png`));
        }
      }
    }
  }
};

const getEntries = async () => {
  const oldEntries: Entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));
  const blurbCache: BlurbCache = JSON.parse(fs.readFileSync(BLURBCACHE_PATH, 'utf-8'));
  for (const key in schedules) {
    const meet = key as DLMeet;
    if (meet !== MEET) continue;
    cache[meet] ??= {} as { schedule: {}; events: {}; ids: {} }; // TODO fix typing
    entries[meet] = {};
    for (const meetScheduleUrl of schedules[meet] ?? []) {
      if (meetScheduleUrl.startsWith('https://www.baa.org')) {
        cache[meet] ??= { events: {}, ids: {}, schedule: {} };
        const { document } = new JSDOM((cache[meet].schedule.combined ??= await (await fetch(meetScheduleUrl)).text())).window;
        const meetEntries = Object.fromEntries(
          [...document.querySelectorAll('table:nth-of-type(3n+1)')].map((ele, i) => [
            `${i ? 'Men' : 'Women'}'s Marathon`,
            {
              entrants: [...ele.querySelectorAll('tr')].slice(1).map((tr) => {
                const [name, nat, pb] = [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim());
                let [firstName, lastName, ...rest] = name?.split(' ').map((word) => word.replace('^', '').replace('*', '').trim()) ?? [];
                if (rest.length) lastName = [lastName, ...rest].join(' ');
                return {
                  firstName,
                  lastName,
                  nat,
                  pb: pb?.toLowerCase() === 'debut' ? '' : pb,
                  id: '',
                  hasAvy: false,
                };
              }),
            },
          ])
        );
        for (const evt in meetEntries) {
          for (const ath of meetEntries[evt].entrants) {
            const { firstName, lastName, pb, nat } = ath;
            const fullName = `${firstName} ${lastName}`;
            const nonMarathoners = ['Kodi Kleven'];
            console.log(firstName, lastName);
            const { id, country } =
              (cache[meet].ids[`${firstName} ${lastName}`] ??= await getWaId(firstName, lastName, {
                gender: evt.startsWith('Men') ? 'male' : 'female',
                disciplineCode: pb && !nonMarathoners.includes(fullName) ? 'MAR' : undefined,
              })) ?? {};
            // if (country && country !== nat) console.log('mismatch country');
            ath.id = id;
            ath.hasAvy = fs.existsSync(`./public/img/avatars/${id}_128x128.png`);
          }
        }
        entries[meet] = meetEntries;
      } else if (meetScheduleUrl.startsWith('https://www.tfrrs.org')) {
        const isMale = meetScheduleUrl.endsWith('m');
        cache[meet] ??= { events: {}, ids: {}, schedule: {} };
        cache[meet].schedule[isMale ? 'm' : 'f'] ??= await (await fetch(meetScheduleUrl)).text();
        const { document } = new JSDOM(cache[meet].schedule[isMale ? 'm' : 'f']).window;
        const eventDivs = document.querySelectorAll(`.gender_${isMale ? 'm' : 'f'}`);
        for (const eventDiv of eventDivs) {
          const ungenderedEvt = eventDiv.querySelector('.custom-table-title > h3')?.textContent?.trim()!;
          const evt = `${isMale ? 'Men' : 'Women'}'s ${ungenderedEvt}` as AthleticsEvent;
          if (!runningEvents.flat().includes(evt)) continue;
          const athletes: Entrant[] = [];
          for (const row of eventDiv.querySelectorAll('.allRows')) {
            const [lastName, firstName] = row
              .querySelector('.tablesaw-priority-1')!
              .textContent!.trim()
              .split(', ')
              .map((name) => name.trim());
            const fullName = `${firstName} ${lastName}`;
            const { id, country } =
              (cache[meet].ids[fullName] ??= await getWaId(firstName, lastName, {
                college: true,
                disciplineCode: disciplineCodes[ungenderedEvt],
                indoors: true,
                gender: isMale ? 'male' : 'female',
              })) ?? {};
            const sbAnchor = [...row.querySelectorAll('a[href^="https://www.tfrrs.org/results/"]')].find((a) =>
              a.getAttribute('href')?.match(/^https:\/\/www.tfrrs.org\/results\/\d+\/\d+\/.+?\/.+/)
            );
            const sb =
              sbAnchor?.parentElement?.tagName === 'SPAN'
                ? sbAnchor.parentElement.getAttribute('title')?.match(/([\d.:]+)/)![1]
                : sbAnchor?.textContent?.trim();
            athletes.push({
              id,
              team: row.querySelector('a[href^="https://www.tfrrs.org/teams/"]')?.textContent?.trim(),
              nat: country,
              pb: '',
              sb: sb!,
              firstName,
              lastName,
            });
            console.log(athletes.at(-1));
          }
          entries[meet] ??= {};
          entries[meet]![evt] = {
            date: '',
            entrants: athletes.sort(makeEntrantSortFunc(isField(evt))),
          };
          fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
        }
      } else if (meetScheduleUrl.endsWith('.PDF')) {
        const pdfParser = new PDFParser();
        const pdfData: Output = await new Promise((res, rej) => {
          pdfParser.loadPDF(meetScheduleUrl);
          pdfParser.on('pdfParser_dataReady', res);
          pdfParser.on('pdfParser_dataError', rej);
        });
        for (const page of pdfData.Pages) {
          const texts = page.Texts.map((t) => t.R[0].T);
          const evt = decodeURIComponent(texts[1]) as AthleticsEvent;
          if (!runningEvents.flat().includes(evt)) continue;
          if (evt === "Men's 60 m") continue; // not world indoor tour
          const athStringArrs = texts
            .slice(43, -11)
            .reduce(
              ({ num, arr, lastNumIdx }, str, i) => {
                if (+str === num + 1 && i > lastNumIdx + 1) return { num: ++num, arr, lastNumIdx: i };
                arr[num] ??= [];
                if (str === 'PAC') delete arr[num]; // pacer
                else arr[num].push(str);
                return { num, arr, lastNumIdx };
              },
              { num: 0, arr: [] as string[][], lastNumIdx: -Infinity }
            )
            .arr.filter((x) => x);
          // console.log(athStringArrs);
          const athletes: Entrant[] = await Promise.all(
            athStringArrs.map(async (arr) => {
              const nameWords = decodeURIComponent(arr[2]).split(' ');
              const firstNameStartIdx = nameWords.findIndex((word) => word.toUpperCase() !== word);
              const lastName = nameWords.slice(0, firstNameStartIdx).join(' ');
              const firstName = nameWords.slice(firstNameStartIdx).join(' ');
              let pb = '';
              let sb = '';

              const birthYear = arr[4];

              let id: string;
              if (cache?.[meet]?.ids[`${firstName} ${lastName}`]) id = cache?.[meet]?.ids[`${firstName} ${lastName}`]?.id!;
              else {
                cache[meet] ??= { schedule: {}, events: {}, ids: {} };
                cache[meet].ids[`${firstName} ${lastName}`] = await getWaId(firstName, lastName, {
                  birthYear,
                });
                id = cache[meet].ids[`${firstName} ${lastName}`]?.id!;
                fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
              }

              if (arr.length === 6) {
                pb = arr[5];
              }
              if (arr.length === 7) {
                sb = arr[5];
                pb = arr[6];
              }
              return {
                firstName,
                lastName: nameFixer(lastName),
                nat: arr[3],
                id,
                sb: decodeURIComponent(sb),
                pb: decodeURIComponent(pb),
              };
            })
          );
          entries[meet]![evt] = {
            date: '2023-02-25',
            entrants: athletes.sort(makeEntrantSortFunc(isField(evt))),
          };
        }
      } else if (meetScheduleUrl === 'getEventCircuitStandings') {
        for (const sexCode of ['men', 'women']) {
          const { data }: EventCircuitStandings = await (
            await fetch(waApi.endpoint, {
              headers: { 'x-api-key': waApi.apiKey },
              body: JSON.stringify({
                operationName: 'getEventCircuitStandings',
                query: `
query getEventCircuitStandings($eventCircuitTypeCode: String, $season: Int, $sexCode: String) {
  getEventCircuitStandings(eventCircuitTypeCode: $eventCircuitTypeCode, season: $season, sexCode: $sexCode) {
    seasons
    circuitName
    parameters {
      gender
      season
      __typename
    }
    standings {
      disciplines
      entries {
        athlete
        country
        points
        results {
          date
          place
          discipline
          details
          points
          result
          venue
          __typename
        }
        rank
        athleteId
        __typename
      }
      __typename
    }
    __typename
  }
}`,
                variables: {
                  eventCircuitTypeCode: 'DL',
                  season: 2023,
                  sexCode,
                },
              }),
              method: 'POST',
            })
          ).json();
        }
      } else {
        // diamond league website
        if (!cache[meet].schedule) {
          cache[meet].schedule = { combined: await (await fetch(meetScheduleUrl)).text() };
          fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
        }
        const originalHtml = cache[meet].schedule.combined!.replace(/<style[\s\S]*?<\/style>/gi, '');
        const { document, window } = new JSDOM(originalHtml, {
          // resources: 'usable',
          // runScripts: 'dangerously',
          beforeParse(window) {
            // Workaround for CSS variable parsing
            window.CSSStyleDeclaration.prototype.setProperty = function(name, value) {
              this[name] = value?.replace(/url\(["']?#/g, 'url("#');
            };
          }
        }).window;
        const city = [...meet].filter(c => !'0123456789'.includes(c)).join('');
        const tz = cityNameTo[city].timeZone;
        for (const eDiv of document.querySelectorAll('[data-row=time]')) {
          const firstSvg = eDiv.querySelector('svg');
          if (firstSvg?.getAttribute('width') !== '20') continue; // filter out non-DL events
          const evt = eDiv.querySelectorAll('div')[2].textContent?.replace(' Final', '').replace(/ Heat [AB]/, '');
          if (meet === 'lausanne25' && evt === 'Pole Vault Men – City Event') continue;
          if (['U23', 'National'].some(k => evt?.includes(k))) continue;
          const pv = (prop: string) => extractCssValue(eDiv.parentElement?.getAttribute('style')!, prop);
          const year = '20' + (meet.match(/\d+$/)?.[0] ?? '26');
          const time = inTz(`${pv('--date-venue')} ${year} ${pv('--time-venue')}`, tz);
          const entrants: Entrant[] = [...eDiv.nextElementSibling?.querySelectorAll('.grid') ?? []]
            .filter(x => !x.classList.contains('font-medium'))
            .map(entDiv => {
              const entCols = [...entDiv.querySelectorAll('div')];
              const entColTexts = entCols.map(d => d.textContent?.trim() ?? '');
              const [nat, athName] = entColTexts;
              const [sb, pb, worldRank] = entColTexts.slice(-3);
              const words = athName.split(' ');
              const firstMixedCase = words.findIndex(w => w.toUpperCase() !== w);
              const lastName = nameFixer(words.slice(0, firstMixedCase).join(' '));
              const firstName = words.slice(firstMixedCase).join(' ');
              let id = entDiv.querySelector('a')?.href.split('/').at(-1)!;
              if (!id) id = {
                'Cierra Jackson': '14839155',
                'Mya Lesnar': '14847391',
                'Samuel Khogali': '14660262',
                'Jana van Lent': '14704113',
                'Pernille Karlsen Antonsen': '14708774',
              }[`${firstName} ${lastName}`];
              return {
                pb, sb, nat, id,
                hasAvy: fs.existsSync(`./public/img/avatars/${id}_128x128.png`),
                firstName, lastName,
              }
            });
      
          entries[meet]![evt as AthleticsEvent] = {
            tiebreaker: tieBreakers[meet]?.[evt as AthleticsEvent],
            date: oldEntries[meet]?.[evt as AthleticsEvent]?.date ?? time.toISOString(),
            url: meetScheduleUrl,
            deadline: deadlines[meet],
            blurb: blurbCache[meet]?.blurbs?.[evt as AthleticsEvent],
            targetTime: targetTimes[meet]?.[evt as AthleticsEvent],
            entrants: entrants.sort(makeEntrantSortFunc(isField(evt!))),
          };
        }
      }
    }
  }
  fs.writeFileSync(ENTRIES_PATH, JSON.stringify({ ...oldEntries, ...entries }));
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
};

const filterEntries = async (meet: DLMeet, isReview: boolean = false) => {
  const entries: Entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));
  const rtsptSanitize = (s: string) =>
    s.replace("Men's", 'Men').replace("Women's", 'Women').replace('Meters', 'Meter').replace('60 Hurdles', '60 Meter Hurdles');
  for (const gender of ['men', 'women']) {
    for (const day of ['1', '2']) {
      const review = await (await fetch(`https://rtspt.com/ncaa/d1indoor23/${gender}_${isReview ? 'review' : `start_day${day}`}.htm`)).text();
      const evtSections = review
        .replace(/1 Mile/g, 'Mile')
        .replace(/.*Heptathlon.*/g, '')
        .replace(/.*Pentathlon.*/g, '')
        .split(new RegExp('(?=' + runningEvents.flat().map(rtsptSanitize).join('|') + ')'));
      for (const sect of evtSections) {
        const evt: AthleticsEvent = runningEvents
          .flat()
          .sort((a, b) => b.length - a.length)
          .find((evt) => sect.startsWith(rtsptSanitize(evt)))! as AthleticsEvent;
        if (!evt) continue;
        entries[meet]![evt]!.entrants = entries[meet]![evt]!.entrants.filter(({ firstName, lastName }) => {
          if ([''].includes(`${firstName} ${lastName}`)) return false;
          const foundLine = sect
            .split('\n')
            .find((line) => line.toLowerCase().includes(` ${firstName} ${lastName} `.toLowerCase()))
            ?.trim();
          return isReview ? foundLine?.endsWith('A') : foundLine;
        }).slice(0, 16);
        console.log(
          evt,
          entries[meet]![evt]!.entrants.length,
          entries[meet]![evt]!.entrants.map(({ firstName, lastName }) => `${firstName} ${lastName}`)
        );
      }
    }
  }
  fs.writeFileSync(ENTRIES_PATH, JSON.stringify(entries));
};

getEntries();
// filterEntries('ncaai23', false);
// getMediaGuidePhotos('boston23');

/*
meet = 'monaco25';
window.entries??=await (await fetch('/2025/entries.json')).json();
Object.entries(window.entries[meet]).map(([k, v]) => {
  const gen = k.split(' ').at(-1);
  const disc = k.split(' ').slice(0, -1).join(' ').toLowerCase();
  const dt = new Date(v.date);
  dt.setMinutes(dt.getMinutes() - 60 * 4);
  const time = dt.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' PM', 'pm ET').replace(' AM', 'am ET');
  const evt = `${gen}'s ${disc}`;
  const aths = v.entrants.map(e => `${e.firstName} ${e.lastName}`).join(', ');
  return `<h3><strong><a target="_blank" href="https://hpr.github.io/2025/#/${meet}/evt/${k.replaceAll(' ', '%20')}">${evt} (${time}): </a></strong></h3>\n\n<p>${aths}</p>\n\n`;
}).join('');
*/