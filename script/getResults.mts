import { AthleticsEvent, MeetCache, DLMeet, Entries, Entrant, ResultEntrant, SportResultSchedule, SportResultTiming } from './types.mjs';
import fs from 'fs';
import { backupNotes, CACHE_PATH, ENTRIES_PATH, getDomainAndPath, MEET, runningEvents } from './const.mjs';
import { JSDOM } from 'jsdom';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const resultsLinks: { [k in DLMeet]?: string } = {
  doha: 'https://web.archive.org/web/20201001215002/https://doha.diamondleague.com/programme-results-doha/?tx_diamondrace_diamondleaguestatistics%5BeventId%5D=&tx_diamondrace_diamondleaguestatistics%5Baction%5D=list&tx_diamondrace_diamondleaguestatistics%5Bcontroller%5D=DiamondLeagueStatistics&cHash=ff3931bd5e5bc713438d0056bc3eb290',
  birminghamIndoor: 'https://results-json.microplustimingservices.com/export/WAITF2023/ScheduleByDate_1.JSON',
  ncaai23: 'https://flashresults.ncaa.com/Indoor/2023/index.htm',
  boston23: '',
  doha23: 'https://livecache.sportresult.com/node/db/ATH_PROD/DOHA2023_SCHEDULE_JSON.json',
  rabat23: 'https://livecache.sportresult.com/node/db/ATH_PROD/RABAT2023_SCHEDULE_JSON.json',
  florence23: 'https://livecache.sportresult.com/node/db/ATH_PROD/ROME2023_SCHEDULE_JSON.json',
  paris23: 'https://livecache.sportresult.com/node/db/ATH_PROD/PARIS2023_SCHEDULE_JSON.json',
  oslo23: 'https://livecache.sportresult.com/node/db/ATH_PROD/OSLO2023_SCHEDULE_JSON.json',
  lausanne23: 'https://livecache.sportresult.com/node/db/ATH_PROD/LAUSANNE2023_SCHEDULE_JSON.json',
  stockholm23: 'https://livecache.sportresult.com/node/db/ATH_PROD/STOCKHOLM2023_SCHEDULE_JSON.json',
  silesia23: 'https://livecache.sportresult.com/node/db/ATH_PROD/SILESIA2023_SCHEDULE_JSON.json',
  monaco23: 'https://livecache.sportresult.com/node/db/ATH_PROD/MONACO2023_SCHEDULE_JSON.json',
  london23: 'https://livecache.sportresult.com/node/db/ATH_PROD/LONDON2023_SCHEDULE_JSON.json',
  zurich23: 'https://livecache.sportresult.com/node/db/ATH_PROD/ZURICH2023_SCHEDULE_JSON.json',
  xiamen23: 'https://livecache.sportresult.com/node/db/ATH_PROD/XIAMEN2023_SCHEDULE_JSON.json',
  brussels23: 'https://livecache.sportresult.com/node/db/ATH_PROD/BRUSSELS2023_SCHEDULE_JSON.json',
  eugene23: 'https://livecache.sportresult.com/node/db/ATH_PROD/EUGENE2023_SCHEDULE_JSON.json',

  xiamen24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/XIAMEN_2024_SCHEDULE_JSON.json',
  shanghai24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/SHANGHAI_2024_SCHEDULE_JSON.json',
  doha24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/DOHA_2024_SCHEDULE_JSON.json',
  rabat24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/RABAT_2024_SCHEDULE_JSON.json',
  eugene24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/EUGENE_2024_SCHEDULE_JSON.json',
  oslo24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/OSLO_2024_SCHEDULE_JSON.json',
  stockholm24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/STOCKHOLM_2024_SCHEDULE_JSON.json',
  paris24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/PARIS_2024_SCHEDULE_JSON.json',
  monaco24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/MONACO_2024_SCHEDULE_JSON.json',
  london24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/LONDON_2024_SCHEDULE_JSON.json',
  lausanne24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/LAUSANNE_2024_SCHEDULE_JSON.json',
  silesia24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/SILESIA_2024_SCHEDULE_JSON.json',
  rome24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/ROME_2024_SCHEDULE_JSON.json',
  zurich24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/ZURICH_2024_SCHEDULE_JSON.json',
  brussels24: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/BRUSSELS_2024_SCHEDULE_JSON.json',

  xiamen25: 'https://ps-cache-next.ath.swisstiming.com/node/db/ATH_PROD/XIAMEN_2025_SCHEDULE_JSON.json',
  shanghai25: 'https://ps-cache-next.ath.swisstiming.com/node/db/ATH_PROD/SHANGHAI_2025_SCHEDULE_JSON.json',
  doha25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/DOHA_2025_SCHEDULE_JSON.json',
  rabat25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/RABAT_2025_SCHEDULE_JSON.json',
  rome25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/ROME_2025_SCHEDULE_JSON.json',
  oslo25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/OSLO_2025_SCHEDULE_JSON.json',
  stockholm25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/STOCKHOLM_2025_SCHEDULE_JSON.json',
  paris25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/PARIS_2025_SCHEDULE_JSON.json',
  eugene25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/EUGENE_2025_SCHEDULE_JSON.json',
  monaco25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/MONACO_2025_SCHEDULE_JSON.json',
  london25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/LONDON_2025_SCHEDULE_JSON.json',
  silesia25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/SILESIA_2025_SCHEDULE_JSON.json',
  lausanne25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/LAUSANNE_2025_SCHEDULE_JSON.json',
  brussels25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/BRUSSELS_2025_SCHEDULE_JSON.json',
  zurich25: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/ZURICH_2025_SCHEDULE_JSON.json',

  shanghai26: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/SHANGHAI_2026_SCHEDULE_JSON.json',
  xiamen26: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/XIAMEN_2026_SCHEDULE_JSON.json',
  rabat26: 'https://ps-cache.web.swisstiming.com/node/db/ATH_PROD/RABAT_2026_SCHEDULE_JSON.json',
};

const cache: MeetCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
const entries: Entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8'));

const findMatchingEvt = (meetEntries: Entries['ncaai23'], evt: AthleticsEvent) => {
  return Object.keys(meetEntries!).find((entriesEvt) => runningEvents.find((group) => group.includes(entriesEvt))!.includes(evt))!;
};

for (const key in resultsLinks) {
  const meet = key as DLMeet;
  if (meet !== MEET) continue;
  cache[meet] ??= { schedule: {}, events: {}, ids: {} };
  if (resultsLinks[meet]?.includes('flashresults')) {
    cache[meet].resultsSchedule ??= await (await fetch(resultsLinks[meet]!)).text();
    const { document } = new JSDOM(cache[meet].resultsSchedule).window;
    const rows = document.querySelectorAll('tbody > tr');
    const runningFinals: { evt: AthleticsEvent; link: string }[] = [...rows]
      .filter(
        (tr) =>
          runningEvents.flat().includes(tr.querySelector('td.fixed-column')?.textContent!) && tr.querySelectorAll('td')[4].textContent?.startsWith('Final')
      )
      .map((tr) => ({
        evt: findMatchingEvt(entries[meet], tr.querySelector('td.fixed-column')?.textContent! as AthleticsEvent) as AthleticsEvent,
        link:
          getDomainAndPath(resultsLinks[meet]!) +
          [...tr.querySelectorAll('td')]
            .find((td) => td.textContent?.trim() === 'Result')! // TODO change to 'Result'
            .querySelector('a')?.href,
      }));
    for (const { evt, link } of runningFinals) {
      console.log(evt, link);
      const { document } = new JSDOM(await (await fetch(link)).text()).window;
      const resultRows = document.querySelectorAll('table.table-striped > tbody > tr');
      const results: ResultEntrant[] = [...resultRows].map((tr) => {
        const mark = tr.querySelectorAll('td')[3].textContent?.trim()!.split(' ')[0]!;
        let notes = [...tr.querySelectorAll('td')].at(-1)?.textContent?.trim() ?? '';
        if (backupNotes.some((bn) => mark.includes(bn))) notes += mark;
        return {
          entrant: entries[meet]![evt]?.entrants.find(
            (ent: Entrant) => `${ent.firstName} ${ent.lastName.toUpperCase()}` === tr.querySelectorAll('td')[2].querySelector('a')!.textContent?.trim()
          )!,
          place: +tr.querySelectorAll('td')[0].textContent?.trim()!,
          mark,
          notes,
        };
      });
      if (!results.length || results.every((res) => !res.mark)) entries[meet]![evt]!.results = undefined;
      else entries[meet]![evt]!.results = results;
    }
  } else if (resultsLinks[meet]?.includes('microplustimingservices')) {
    const meetCode = resultsLinks[meet]?.match(/^https:\/\/results-json\.microplustimingservices\.com\/export\/(.*)\//)![1];
    cache[meet].resultsSchedule ??= await (await fetch(resultsLinks[meet]!)).text();
    const resultsSchedule = JSON.parse(cache[meet].resultsSchedule!);
    for (const { c0, c1, c2, c3, tab, d1_en, d3_en, d_en } of resultsSchedule.e) {
      const evt = `${d3_en}'s ${d_en}` as AthleticsEvent;
      if (!entries[meet]![evt]) continue;
      if (d1_en !== 'Final') continue;
      const resultCode = tab.find((t: { p_en: string }) => t.p_en === 'Result')?.nf;
      cache[meet].events[evt] ??= {};
      cache[meet].events[evt]!.results ??= await (
        await fetch(`https://results-json.microplustimingservices.com/export/${meetCode}/AT${c0}${c1}${resultCode}${String(+c2).padStart(2, '0')}%20${c3}.JSON`)
      ).text();
      const evtResults = JSON.parse(cache[meet].events[evt]!.results!);
      entries[meet]![evt]!.results = evtResults.data.map((dat: { MemPrest: string; PlaCls: string; MemNote: string; PlaName: string; PlaSurname: string }) => {
        return {
          mark: dat.MemPrest,
          place: +dat.PlaCls,
          notes: dat.MemNote,
          entrant: entries[meet]![evt]?.entrants.find((ent) => `${ent.firstName} ${ent.lastName.toUpperCase()}` === `${dat.PlaName} ${dat.PlaSurname}`),
        };
      });
    }
  } else if (resultsLinks[meet]?.includes('livecache.sportresult.com') || resultsLinks[meet]?.includes('swisstiming.com')) {
    const domain = resultsLinks[meet]?.includes('livecache.sportresult.com') ? 'livecache.sportresult.com' : 'ps-cache.web.swisstiming.com';
    const meetId = resultsLinks[meet]?.match(/^https:\/\/(livecache.sportresult.com|ps-cache.web.swisstiming.com)\/node\/db\/ATH_PROD\/(.+)_SCHEDULE/)?.[2];
    console.log('fetching', resultsLinks[meet]);
    const schedule: SportResultSchedule = await (await fetch(resultsLinks[meet]!)).json();
    console.log(schedule);
    for (const key in entries[meet]) {
      const evt = key as AthleticsEvent;
      // console.log(evt);
      // if (evt === 'Discus Women') {
      //   console.log(Object.values(schedule.content.full.Units).map(u => [u.EventName, u.Rsc?.ValueUnit]));
      // }
      const evtId = Object.values(schedule.content.full.Units).find(
        (unit) =>
          [evt, '1 ' + evt, evt].some((s) => unit.EventName.replace('Steeplechase', 'Steeple') === s
          .replace('Steeplechase', 'Steeple')
          .replace('Discus Women', 'Discus Throw Women')
          .replace('Discus Men', 'Discus Throw Men')
          .replace('Javelin Men', 'Javelin Throw Men')
          .replace('Javelin Women', 'Javelin Throw Women')
          .replace(',', '')
          .replace('meters', 'Metres')
          .replace('Meters', 'Metres')
          .replace('Dream ', '')
          .replace('Bowerman ', '')
          .replace('Mutola ', '')
          .replace(' Metres', 'm') // only stockholm?
          .replace('m H ', 'm Hurdles ')
          .replace('mH', 'm Hurdles')
          .replace('mSC', 'm Steeple')
          .replace('m SC', 'm Steeple')
          .replace('m St ', 'm Steeple ')
          .replace(' put ', ' Put ')
          .replace('Men 100m', '100m Men')
        ) && unit.Stats.DiamondId
      )?.Rsc.ValueUnit;
      const evtResultUrl = `https://${domain}/node/db/ATH_PROD/${meetId}_TIMING_${evtId}_JSON.json`;
      console.log(evt, evtResultUrl);
      const evtResultResp = await fetch(evtResultUrl);
      if (evtResultResp.status === 404) {
        console.log('skipping', evt, evtId);
      }
      const evtResult: SportResultTiming = await evtResultResp.json();
      let competitors = Object.values(evtResult.content.full.CompetitorDetails ?? {});
      if (meet === 'doha25') {
        /*
document.querySelectorAll('table').forEach(t => {
  const evt = t.parentElement.parentElement.previousSibling.querySelector('div[class^="styles_text"]')?.textContent;
  console.log(evt);
  const rows = [...t.querySelectorAll('tbody tr')];
  const competitorDetails = rows.map(tr => {
    const tds = [...tr.querySelectorAll('td')];
    const txts = tds.map(td => td.textContent);
    const pl = txts[0].replaceAll('.', '') || undefined;
    const fn = txts[1].split(' ')[0];
    const ln = txts[1].split(' ').slice(1).join(' ');
    const code = tr.querySelector('a')?.href.split('-').at(-1);
    const res = txts[4];
    const irm = res === 'DNF' ? 'Participant-DNF-ATH' : res === 'DNS' ? 'Participant-DNS-ATH' : undefined;
    return { Result: res, Rank: pl, FirstName: fn, Name: ln, AthleteId: '', FedCode: code, IRM: irm };
  });
  console.log(JSON.stringify(competitorDetails));
});
        */
        if (evtId?.startsWith('ATHM5000M')) competitors = [{"Result":"13:16.40","Rank":"1","FirstName":"Reynold","Name":"CHERUIYOT","AthleteId":"","FedCode":"14997479"},{"Result":"13:17.70","Rank":"2","FirstName":"Dominic","Name":"Lokinyomo LOBALU","AthleteId":"","FedCode":"14792211"},{"Result":"13:17.70","Rank":"3","FirstName":"Birhanu","Name":"BALEW","AthleteId":"","FedCode":"14695983"},{"Result":"13:18.63","Rank":"4","FirstName":"Samuel","Name":"TEFERA","AthleteId":"","FedCode":"14797484"},{"Result":"13:19.32","Rank":"5","FirstName":"Edwin","Name":"KURGAT","AthleteId":"","FedCode":"14401023"},{"Result":"13:20.43","Rank":"6","FirstName":"Cornelius","Name":"KEMBOI","AthleteId":"","FedCode":"14894347"},{"Result":"13:20.86","Rank":"7","FirstName":"Mohamed","Name":"ABDILAAHI","AthleteId":"","FedCode":"14753471"},{"Result":"13:22.38","Rank":"8","FirstName":"Abdullahi","Name":"JAMA MOHAMED","AthleteId":"","FedCode":"14887075"},{"Result":"13:24.32","Rank":"9","FirstName":"Gulveer","Name":"SINGH","AthleteId":"","FedCode":"15023839"},{"Result":"13:35.73","Rank":"10","FirstName":"Addisu","Name":"YIHUNE","AthleteId":"","FedCode":"14977660"},{"Result":"13:36.12","Rank":"11","FirstName":"Khairi","Name":"BEJIGA","AthleteId":"","FedCode":"15156595"},{"Result":"13:39.16","Rank":"12","FirstName":"Cooper","Name":"TEARE","AthleteId":"","FedCode":"14757466"},{"Result":"13:40.28","Rank":"13","FirstName":"Getnet","Name":"WALE","AthleteId":"","FedCode":"14760253"},{"Result":"13:58.59","Rank":"14","FirstName":"Adehena","Name":"KASAYE","AthleteId":"","FedCode":"14977659"},{"Result":"DNF","FirstName":"Mounir","Name":"AKBACHE","AthleteId":"","FedCode":"014182819","IRM":"Participant-DNF-ATH"},{"Result":"DNF","FirstName":"Mohamed","Name":"ISMAIL","AthleteId":"","FedCode":"14661612","IRM":"Participant-DNF-ATH"},{"Result":"DNF","FirstName":"Boaz","Name":"KIPRUGUT","AthleteId":"","FedCode":"14695615","IRM":"Participant-DNF-ATH"},{"Result":"DNF","FirstName":"Filip","Name":"SASÍNEK","AthleteId":"","FedCode":"14474319","IRM":"Participant-DNF-ATH"}];
        if (evtId?.startsWith('ATHM200M')) competitors = [{"Result":"20.10","Rank":"1","FirstName":"Letsile","Name":"TEBOGO","AthleteId":"","FedCode":"14883897"},{"Result":"20.11","Rank":"2","FirstName":"Courtney","Name":"LINDSEY","AthleteId":"","FedCode":"14845926"},{"Result":"20.26","Rank":"3","FirstName":"Joseph","Name":"FAHNBULLEH","AthleteId":"","FedCode":"14803230"},{"Result":"20.35","Rank":"4","FirstName":"Aaron","Name":"BROWN","AthleteId":"","FedCode":"14366482"},{"Result":"20.41","Rank":"5","FirstName":"Filippo","Name":"TORTU","AthleteId":"","FedCode":"14629026"},{"Result":"20.61","Rank":"6","FirstName":"Kyree","Name":"KING","AthleteId":"","FedCode":"14476000"},{"Result":"20.78","Rank":"7","FirstName":"Shaun","Name":"MASWANGANYI","AthleteId":"","FedCode":"14748228"},{"Result":"20.93","Rank":"8","FirstName":"William","Name":"REAIS","AthleteId":"","FedCode":"14740317"}];
        if (evtId?.startsWith('ATHM400MHURD')) competitors = [{"Result":"49.32","Rank":"1","FirstName":"Alessandro","Name":"SIBILIO","AthleteId":"","FedCode":"14699358"},{"Result":"49.40","Rank":"2","FirstName":"İsmail","Name":"NEZIR","AthleteId":"","FedCode":"14928872"},{"Result":"49.49","Rank":"3","FirstName":"Matic","Name":"Ian GUČEK","AthleteId":"","FedCode":"14874438"},{"Result":"49.87","Rank":"4","FirstName":"Carl","Name":"BENGTSTRÖM","AthleteId":"","FedCode":"14713427"},{"Result":"49.90","Rank":"5","FirstName":"CJ","Name":"ALLEN","AthleteId":"","FedCode":"14627624"},{"Result":"49.99","Rank":"6","FirstName":"Nick","Name":"SMIDT","AthleteId":"","FedCode":"14564609"},{"Result":"50.32","Rank":"7","FirstName":"Berke","Name":"AKÇAM","AthleteId":"","FedCode":"14797505"},{"Result":"1:03.09","Rank":"8","FirstName":"Malik","Name":"JAMES-KING","AthleteId":"","FedCode":"14744387"}];
        if (evtId?.startsWith('ATHW1500M')) competitors = [{"Result":"4:05.00","Rank":"1","FirstName":"Nelly","Name":"CHEPCHIRCHIR","AthleteId":"","FedCode":"14892139"},{"Result":"4:06.27","Rank":"2","FirstName":"Susan","Name":"Lokayo EJORE","AthleteId":"","FedCode":"14700633"},{"Result":"4:07.33","Rank":"3","FirstName":"Jemma","Name":"REEKIE","AthleteId":"","FedCode":"14533469"},{"Result":"4:07.87","Rank":"4","FirstName":"Saron","Name":"BERHE","AthleteId":"","FedCode":"15009577"},{"Result":"4:08.77","Rank":"5","FirstName":"Agathe","Name":"GUILLEMOT","AthleteId":"","FedCode":"14685757"},{"Result":"4:08.97","Rank":"6","FirstName":"Elsabet","Name":"AMARE","AthleteId":"","FedCode":"15024103"},{"Result":"4:09.62","Rank":"7","FirstName":"Teresiah","Name":"Muthoni GATERI","AthleteId":"","FedCode":"14798246"},{"Result":"4:09.89","Rank":"8","FirstName":"Tigist","Name":"GIRMA","AthleteId":"","FedCode":"14894776"},{"Result":"4:10.66","Rank":"9","FirstName":"Weronika","Name":"LIZAKOWSKA","AthleteId":"","FedCode":"14650587"},{"Result":"4:10.81","Rank":"10","FirstName":"Samrawit","Name":"MULUGETA","AthleteId":"","FedCode":"15090443"},{"Result":"4:11.76","Rank":"11","FirstName":"Adelle","Name":"TRACEY","AthleteId":"","FedCode":"14941414"},{"Result":"4:15.20","Rank":"12","FirstName":"Bayise","Name":"TOLESA","AthleteId":"","FedCode":"15116036"},{"Result":"4:16.35","Rank":"13","FirstName":"Mebriht","Name":"MEKONEN","AthleteId":"","FedCode":"14988675"},{"Result":"DNF","FirstName":"Khadija","Name":"BENKASSEM","AthleteId":"","FedCode":"14649286","IRM":"Participant-DNF-ATH"}];
      }
      const results = evtResult.content.full.LastCompetitor ? [] : competitors
        .sort((a, b) => +(a.Rank ?? Infinity) - +(b.Rank ?? Infinity))
        .map((comp) => ({
          mark: comp.Result!,
          place: +comp.Rank!,
          notes: comp.IRM?.includes('DNF') ? 'DNF' : comp.IRM?.includes('DNS') ? 'DNS' : '',
          entrant: entries[meet]?.[evt]?.entrants.find(
            (ent) => ent.id === comp.FedCode || `${ent.firstName} ${ent.lastName}`.toLowerCase() === `${comp.FirstName} ${comp.Name}`.toLowerCase()
          )!,
        }));
      // results.forEach(r => console.log(`${r.place || r.notes}. ${r.entrant?.firstName} ${r.entrant?.lastName} (${r.mark})`));
      if (results.some((res) => res.entrant && res.mark && res.place)) {
        entries[meet]![evt]!.results = results;
      }
      else entries[meet]![evt]!.results = undefined;
    }
  }
}

fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
fs.writeFileSync(ENTRIES_PATH, JSON.stringify(entries, null, 2));
