import { createContext } from 'react';
import { Entrant, Popularity, Team, TeamToScore, WaApi } from './types';

export const Store = createContext({
  myTeam: {} as Team,
  setMyTeam: (_: Team) => {},
  teamToScore: null as TeamToScore | null,
  setTeamToScore: (_: TeamToScore) => {},
  athletesById: {} as { [id: string]: Entrant },
  setAthletesById: (_: { [id: string]: Entrant }) => {},
  popularity: {} as Popularity,
  setPopularity: (_: Popularity) => {},

  waApi: null as WaApi | null,
  setWaApi: (waApi: WaApi) => {},
});
