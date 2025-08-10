import {
  AppShell,
  Group,
  Header,
  Modal,
  Navbar,
  Stack,
  Text,
  Code,
  useMantineTheme,
  Burger,
  MediaQuery,
  Button,
  List,
  CopyButton,
  SegmentedControl,
  TextInput,
  PasswordInput,
  ScrollArea,
  Progress,
  Popover,
  Box,
  Badge,
  Grid,
  Title,
  Paper,
} from '@mantine/core';
import React, { useEffect, useState } from 'react';
import { AthleticsEvent, AuthPage, DLMeet, Entrant, Entries, Page, Team, TeamToScore, WaApi } from './types';
import { Store } from './Store';
import { MainLinks } from './MainLinks';
import { User } from './User';
import { BrandGit, Calculator, Check, Diamond, Dots, Mail, Run, Trophy, Users, Switch2, Home, Book, SquareRoundedLetterF } from 'tabler-icons-react';
import { DIVIDER, PAGES, PICKS_PER_EVT, SERVER_URL, standingsMeets } from './const';
import { isEmail, useForm } from '@mantine/form';
import { Submissions } from './Submissions';
import { useLocation, useNavigate } from 'react-router-dom';
import { Leaderboard } from './Leaderboard';
import { evtSort, isFlo } from './util';
import { Results } from './Results';
import { EventTeamPicker } from './EventTeamPicker';
import LeagueStandings from './LeagueStandings';
import { modals } from '@mantine/modals';
import { ColorSchemeToggle } from './ColorSchemeToggle';

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const hash = decodeURIComponent(pathname.slice(1));
  const [entries, setEntries] = useState<Entries | null>(null);
  const [meet, setMeet] = useState<DLMeet>('silesia25');
  const [evt, setEvt] = useState<AthleticsEvent | null>(null);
  const [myTeam, setMyTeam] = useState<Team>({});
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [navbarOpen, setNavbarOpen] = useState<boolean>(false);
  const [page, setPage] = useState<Page>('home');
  const [authPage, setAuthPage] = useState<AuthPage>('register');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [teamToScore, setTeamToScore] = useState<TeamToScore | null>(null);
  const [athletesById, setAthletesById] = useState<{ [id: string]: Entrant }>({});
  const [waApi, setWaApi] = useState<WaApi | null>(null);
  const registerForm = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      tiebreaker: '',
    },
    validate: {
      email: isEmail('Invalid email'),
    },
  });

  const theme = useMantineTheme();

  useEffect(() => {
    (async () => {
      const entries: Entries = await (await fetch('entries.json')).json();
      setEntries(entries);

      setAthletesById(
        Object.fromEntries(
          Object.values(entries ?? {})
            .flatMap((val) => Object.values(val))
            .flatMap(({ entrants }) => entrants)
            .map((entrant) => [entrant.id, entrant])
        )
      );
      const initialEvt = Object.keys(entries[meet] ?? [])[0] as AthleticsEvent;
      setEvt(initialEvt);

      if (hash) {
        const hashParts = hash.split('/');
        const possibleMeet = hashParts[0];
        if (standingsMeets.some((sm) => sm.meet === possibleMeet)) setMeet(possibleMeet as DLMeet);
        if (hashParts[1] === 'evt') {
          const hashEvt = hashParts[2];
          if (hashEvt !== evt) {
            setPage('events');
            setEvt(hashEvt as AthleticsEvent);
          }
        } else if (PAGES.includes(hashParts[1] as Page) && page !== hashParts[1]) {
          setPage(hashParts[1] as Page);
        } else if (PAGES.includes(hashParts[0] as Page) && page !== hashParts[0]) {
          setPage(hashParts[0] as Page);
        }
      }
    })();
  }, []);

  useEffect(() => {
    setMyTeam(JSON.parse(localStorage.getItem('myTeam') ?? '{}'));
  }, []);

  useEffect(() => {
    if (Object.keys(myTeam).length) localStorage.setItem('myTeam', JSON.stringify(myTeam));
  }, [myTeam]);

  const numPicks = Object.values(myTeam[meet] ?? {}).flat().length;
  const numMaxPicks = Object.keys(entries?.[meet] ?? {}).length * PICKS_PER_EVT;
  const arePicksComplete = numPicks >= numMaxPicks;
  const percentComplete = Math.round((numPicks / numMaxPicks) * 100);

  const picksText = Object.keys(myTeam[meet] ?? {})
    .sort(evtSort)
    .map((evt) => `${evt}: ${myTeam[meet]![evt as AthleticsEvent]!.map(({ firstName, lastName }) => `${firstName} ${lastName}`).join(', ')}`)
    .join('\n');

  const hasEventClosed = Object.values(entries?.[meet] ?? {}).some(({ isClosed }) => isClosed);

  const tiebreakerEvt = Object.keys(entries?.[meet] ?? {}).find((key) => entries?.[meet]?.[key as AthleticsEvent]?.tiebreaker);
  const tiebreakerMark = entries?.[meet]?.[tiebreakerEvt as AthleticsEvent]?.tiebreaker;

  const earliestDate: Date = [...Object.values(entries?.[meet] ?? {}).map((v) => new Date(v.date))].sort((a, b) => +a - +b)[0];
  const deadline = Object.values(entries?.[meet] ?? {}).find((evt) => evt.deadline)?.deadline;

  const color = standingsMeets.find((m) => m.meet === meet)?.color;

  const getMeetButtons = () => {
    const buttonify = (enabled: boolean) => ({ meet: selectedMeet, color }: { meet: DLMeet, color: string }) => (
      <Button
        variant="default"
        style={{ 
          borderLeft: `10px solid ${color}`,
          width: 140,
          color: theme.colorScheme === 'dark' ? 'white' : 'black',
        }}
        disabled={!enabled}
        m="sm"
        key={selectedMeet}
        onClick={() => {
          if (!enabled) return;
          if (selectedMeet === meet) {
            navigate('events');
            setPage('events');
          } else {
            setMeet(selectedMeet);
            navigate(`/home`);
            setPage('home');
          }
          modals.closeAll();
        }}
      >
        {selectedMeet[0].toUpperCase() + selectedMeet.slice(1, -2) + " '" + selectedMeet.slice(-2)}
      </Button>
    );
    const currentMeets = standingsMeets
      .filter(({ meet }) => entries?.[meet])
      .map(buttonify(true));
    const futureMeets = standingsMeets
      .filter(({ meet }) => !entries?.[meet])
      .map(buttonify(false));
    return (
      <div style={{ textAlign: 'center' }}>
        <Title order={2} p="sm">
          Current
        </Title>
        <Grid justify="center">{currentMeets}</Grid>
        {futureMeets.length > 0 && (
          <React.Fragment>
            <Title order={2} p="sm">Coming Soon</Title>
            <Grid justify="center">{futureMeets}</Grid>
          </React.Fragment>
        )}
      </div>
    );
  };

  const rules = (
    <React.Fragment>
      <Text mb={10} size="sm">
        Select {PICKS_PER_EVT} athletes per event by selecting events on the left side menu (on mobile tap the three lines to bring it up), and
        picking athletes in the main view. Your incomplete picks are saved to your device, and once you submit you can always re-submit to update
        your picks before the submissions deadline.
      </Text>
      <Text mb={10} size="sm">
        Your athletes will be scored by place, with zero points awarded outside the top six. The <strong>catch</strong> is that the order of your
        team matters: Your first athlete will be scored 20-12-8-6-5-4 style, then your #2 athlete will be scored 10-8-6-4-3-2 style, and your
        final athlete will be scored 6-5-4-3-2-1. Once all {PICKS_PER_EVT} athletes are scored, we remove the lowest-scoring athlete so that only
        your top {PICKS_PER_EVT - 1} scorers per event will count. Once you have finished your picks, you <strong>must</strong> submit them by
        pressing "Save Picks" and then registering or logging in to an account.
      </Text>
      <Text mb={10} size="sm">
        <strong>Submissions Deadline:</strong> {earliestDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })},
        before the first event starts, by {deadline} (for {meet}).
        {/* <br />
        <strong>Prizes:</strong> First Place: Free Supporters Club Membership ($100 value!) + T-Shirt. Second Place: Free T-Shirt. Third Place:
        Free T-Shirt.
        <br /> */}
        {/* <strong>
          <a href="#/standings">Overall League Champion</a> Prize
        </strong>
        : Free Supporters Club Membership + T-Shirt.
        <br /> */}
        {/* Thanks to sponsor <strong>LetsRun.com</strong> for providing the prizes! */}
      </Text>
    </React.Fragment>
  );

  return (
    <Store.Provider value={{ myTeam, setMyTeam, teamToScore, setTeamToScore, athletesById, setAthletesById, waApi, setWaApi }}>
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Register / Login & Submit Picks">
        {arePicksComplete ? (
          <Stack>
            <Text italic>
              If you want to use an existing account from a previous contest or are updating your picks, click "Submit / Update Picks" -- otherwise, click
              "Register"
            </Text>
            <SegmentedControl
              value={authPage}
              onChange={(v: AuthPage) => {
                setAuthPage(v);
                registerForm.setErrors({});
                setIsSuccess(false);
              }}
              data={[
                { label: 'Submit / Update Picks', value: 'addPicks' },
                { label: 'Register', value: 'register' },
              ]}
              mb={10}
            />
            <form
              onChange={() => {
                setIsSuccess(false);
                registerForm.setErrors({});
              }}
              onSubmit={registerForm.onSubmit(async (vals) => {
                setIsLoading(true);
                let { status } = await (
                  await fetch(SERVER_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                      action: authPage,
                      ...vals,
                      ...(authPage === 'addPicks'
                        ? {
                            meet,
                            picksJson: {
                              ...myTeam[meet],
                              tiebreaker: registerForm.values.tiebreaker,
                            },
                          }
                        : {}),
                    }),
                  })
                ).json();
                if (authPage === 'register' && status === 'success') {
                  ({ status } = await (
                    await fetch(SERVER_URL, {
                      method: 'POST',
                      body: JSON.stringify({
                        action: 'addPicks',
                        ...vals,
                        ...{
                          meet,
                          picksJson: {
                            ...myTeam[meet],
                            tiebreaker: registerForm.values.tiebreaker,
                          },
                        },
                      }),
                    })
                  ).json());
                }
                setIsLoading(false);
                if (status === 'success') setIsSuccess(true);
                else {
                  setIsSuccess(false);
                  let msg = `Error in ${authPage === 'register' ? 'registration' : 'login'}, try again?`;
                  if (authPage === 'register') msg += ' If you already have an account, click "Submit / Update Picks" to log in';
                  registerForm.setErrors({
                    email: msg,
                    password: msg,
                  });
                }
              })}
            >
              <TextInput withAsterisk label="Email" placeholder="usain@bolt.com" {...registerForm.getInputProps('email')} />
              {authPage === 'register' && (
                <TextInput withAsterisk label="Name" placeholder="Usain (will be displayed on leaderboards)" {...registerForm.getInputProps('name')} />
              )}
              <PasswordInput withAsterisk label="Password" placeholder="Password" {...registerForm.getInputProps('password')} />
              <TextInput
                withAsterisk
                label={`Tiebreaker: ${tiebreakerEvt} winning time?`}
                placeholder={`e.g. ${tiebreakerMark}`}
                {...registerForm.getInputProps('tiebreaker')}
              />
              <Group position="right" mt="md">
                <Button leftIcon={isSuccess ? <Check /> : undefined} type="submit" loading={isLoading}>
                  {authPage === 'register'
                    ? isSuccess
                      ? 'Registered and submitted picks!'
                      : 'Register'
                    : isSuccess
                    ? 'Updated Picks!'
                    : 'Submit / Update Picks'}
                </Button>
              </Group>
            </form>

            <Code mt={20} block>
              {picksText}
            </Code>
            <CopyButton value={picksText}>
              {({ copied, copy }) => (
                <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
                  {copied ? 'Copied picks' : 'Copy picks to clipboard'}
                </Button>
              )}
            </CopyButton>
          </Stack>
        ) : (
          <>
            <Text mb={20}>Please complete your picks before submission. You still need to select for these events:</Text>
            <List>
              {Object.keys(entries?.[meet] ?? {})
                .sort(evtSort)
                .filter((evt) => (myTeam[meet]?.[evt as AthleticsEvent]?.length ?? 0) < PICKS_PER_EVT)
                .map((evt) => (
                  <List.Item key={evt}>{evt}</List.Item>
                ))}
            </List>
          </>
        )}
      </Modal>
      <AppShell
        padding="md"
        navbarOffsetBreakpoint="sm"
        navbar={
          <Navbar sx={{ zIndex: 99 }} width={{ base: 300 }} hiddenBreakpoint="sm" hidden={!navbarOpen} height="calc(100% - 60px)" p="md">
            <ScrollArea type="always" offsetScrollbars scrollbarSize={15}>
              <Box w={266}>
                <Navbar.Section grow mt="xs">
                  <MainLinks
                    links={[
                      {
                        icon: <Home />,
                        color: theme.colorScheme === 'dark' ? 'black' : '',
                        label: 'Home',
                        path: 'home',
                        onClick: () => {
                          navigate(`/home`);
                          setPage('home');
                          setNavbarOpen(false);
                        },
                      },
                      ...(isFlo ? [{
                        icon: <SquareRoundedLetterF />,
                        color: theme.colorScheme === 'dark' ? 'black' : '',
                        label: 'Back to FloTrack',
                        path: 'flotrack',
                        onClick: () => {
                          window.location.href = 'https://www.flotrack.org/collections/12408809-wanda-diamond-league';
                        },
                      }] : []),
                      {
                        icon: <Switch2 />,
                        color: theme.colorScheme === 'dark' ? 'black' : '',
                        label: 'Switch Meet',
                        path: 'switch',
                        onClick: () => {
                          modals.open({
                            title: 'Switch Meet',
                            size: 'xl',
                            children: getMeetButtons(),
                          });
                        },
                      },
                      ...(hasEventClosed
                        ? [
                            {
                              icon: <Trophy />,
                              color: theme.colorScheme === 'dark' ? 'gold': '',
                              label: 'Leaderboard',
                              path: `${meet}/leaderboard`,
                              onClick: () => {
                                navigate(`/${meet}/leaderboard`);
                                setPage('leaderboard');
                                setNavbarOpen(false);
                              },
                            },
                            {
                              icon: <Calculator />,
                              color: theme.colorScheme === 'dark' ? 'black': '',
                              label: 'Results',
                              path: `${meet}/scoring`,
                              onClick: () => {
                                navigate(`/${meet}/scoring`);
                                setPage('scoring');
                                setNavbarOpen(false);
                              },
                            },
                          ]
                        : []),
                      {
                        icon: <Diamond />,
                        color: theme.colorScheme === 'dark' ? 'black' : '',
                        label: 'League Standings',
                        path: 'standings',
                        onClick: () => {
                          navigate('/standings');
                          setPage('standings');
                          setNavbarOpen(false);
                        },
                      },
                      {
                        icon: <Users />,
                        color: theme.colorScheme === 'dark' ? 'black' : '',
                        label: 'Submissions',
                        path: `${meet}/submissions`,
                        onClick: () => {
                          navigate(`/${meet}/submissions`);
                          setPage('submissions');
                          setNavbarOpen(false);
                        },
                      },
                      DIVIDER,
                      ...Object.keys(entries?.[meet] ?? {})
                        // .sort(evtSort)
                        .map((label) => {
                          const linkEvt = label as AthleticsEvent;
                          const filled = myTeam[meet]?.[linkEvt]?.length === PICKS_PER_EVT;
                          const date = entries?.[meet]?.[label as AthleticsEvent]?.date;
                          return {
                            icon: filled ? <Check /> : <Run />,
                            color: filled ? 'green' : 'blue',
                            path: `${meet}/evt/${linkEvt}`,
                            onClick: () => {
                              navigate(`${meet}/evt/${linkEvt}`);
                              setEvt(linkEvt);
                              setPage('events');
                              setNavbarOpen(false);
                            },
                            label: (
                              <>
                                {label.replace('Steeplechase', 'SC')}
                                {/* <Badge color={date === 'Sat' ? 'green' : 'yellow'}>{date}</Badge> */}
                              </>
                            ),
                          };
                        }),
                    ]}
                  />
                </Navbar.Section>
              </Box>
            </ScrollArea>

            <Navbar.Section
              onClick={() => {
                if (!hasEventClosed) setModalOpen(true);
              }}
            >
              <User isClosed={hasEventClosed} meet={meet} />
            </Navbar.Section>
          </Navbar>
        }
        header={
          <Header height={60} p="xs">
            <Group sx={{ height: '100%' }} px={20} position="apart">
              <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
                <Burger opened={navbarOpen} onClick={() => setNavbarOpen((o) => !o)} size="sm" color={theme.colors.gray[6]} mr="xl" />
              </MediaQuery>
              <Text size="md">
                {isFlo && <img src="Hawk-ignite.png" height="20px" style={{ marginRight: 5 }} />} Fantasy {meet[0].toUpperCase()}
                {meet.slice(1, -2)}
                <ColorSchemeToggle />
                <Popover width="100%" position="bottom" withArrow shadow="md">
                  <Popover.Target>
                    <Button size="xs" ml={20} bg={color}>
                      Rules
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown>
                    {rules}
                    <Group align="center">
                      <Text>Contact for suggestions, improvements or issues:</Text>
                      <Button variant="default" size="xs" leftIcon={<Mail />} onClick={() => window.open('mailto:habs@sdf.org')?.close()}>
                        habs@sdf.org
                      </Button>
                      <Button variant="default" size="xs" leftIcon={<BrandGit />} onClick={() => window.open(`https://github.com/hpr/2025`, '_blank')}>
                        Source code
                      </Button>
                    </Group>
                  </Popover.Dropdown>
                </Popover>
              </Text>
              <MediaQuery smallerThan="md" styles={{ display: 'none ' }}>
                <Progress
                  value={percentComplete}
                  label={percentComplete >= 10 ? `${percentComplete}% Complete` : ''}
                  size="xl"
                  radius="xl"
                  sx={{ width: '50%' }}
                />
              </MediaQuery>
            </Group>
          </Header>
        }
        styles={(theme) => ({
          main: {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
          },
        })}
      >
        <Stack align="center" mt={0}>
          {page === 'home' ? (
            <div style={{ textAlign: 'center' }}>
              <Paper shadow="xl" radius="xl" p="xl" withBorder sx={{ 
                backgroundColor: 'white',
                color: 'white',
                backgroundImage: "linear-gradient( rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6) ), url(diamondtrophy.png)",
                backgroundPosition: 'center top',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              }}>
                {isFlo && <img src={`FloTrack-ignitewhite.svg`} height={30} style={{ marginBottom: 10 }} />}
                <Title><Diamond /> {isFlo ? 'FloTrack Fantasy Game: Wanda Diamond League' : '2025 Fantasy Diamond League'}</Title>
                {/* {isFlo && <Button color="red" mt="md" onClick={() => window.open('https://www.flotrack.org/collections/12408809-wanda-diamond-league?view=live-and-upcoming', '_blank')}>Watch the Diamond League live on FloTrack</Button>} */}
                {true && <React.Fragment>
                  <Title order={4}>Watch all Diamond League meetings live on FloTrack, the exclusive U.S. provider of the 2025 Wanda Diamond League</Title>
                  <Button color="red" mt="md" onClick={() => window.open('?affiliate', '_blank')}><Badge mr="md">New!</Badge> Save US$22.50 (15%) on FloTrack</Button>
                  <Text italic>Save on an annual FloTrack subscription using this link! (Click "Sign Up" then enter an email and password to receive the discount cookie)</Text>
                </React.Fragment>}
              </Paper>
              {getMeetButtons()}
              <Paper shadow="xl" radius="xl" p="xl" withBorder mt="xl" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper shadow="sm" radius="sm" p="sm" mb="xl" withBorder><Title>{isFlo ? '🏆 Build Your Squad. Compete Globally.' : 'Rules'}</Title></Paper>
                {isFlo ? (
                  <React.Fragment>
                    <Title order={4}>Pick your dream team of Diamond League athletes and earn points every meet based on their real-world performances. Climb the leaderboard and claim bragging rights.</Title>
                    <Text mt={10} style={{ textAlign: 'left' }}>
                      How to Play:
                      <ol style={{ marginTop: 10 }}>
                        <li>Pick 3 Athletes Per Event Discipline<br />
                        Choose from sprinters, distance stars, jumpers, and throwers.</li>
                        <li>Score Points<br />
                        Your team earns based on finishes of your top two athletes per discipline.</li>
                        <li>Win Bragging Rights<br />
                          Weekly shoutouts. Full-season glory. Bragging rights forever.</li>
                      </ol>
                    </Text>
                  </React.Fragment>
                ) : rules}
                <Button onClick={() => { setEvt(Object.keys(entries?.[meet] ?? {})[0] as AthleticsEvent); setPage('events'); }}>👉 Start Picking Your Team</Button>
              </Paper>
            </div>
          ) : page === 'submissions' ? (
            <Submissions meet={meet} />
          ) : page === 'leaderboard' ? (
            <Leaderboard meet={meet} entries={entries!} setPage={setPage} />
          ) : page === 'scoring' ? (
            <Results entries={entries} meet={meet} />
          ) : page === 'standings' ? (
            <LeagueStandings />
          ) : (
            <EventTeamPicker entries={entries} meet={meet} evt={evt!} />
          )}
        </Stack>
      </AppShell>
    </Store.Provider>
  );
}
