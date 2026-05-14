import {
  Avatar,
  Text,
  Group,
  Button,
  Modal,
  Accordion,
  Stack,
  Title,
  Table,
  LoadingOverlay,
  Popover,
  Indicator,
  useMantineTheme,
  useMantineColorScheme,
  Badge,
  Box,
  Grid,
  Timeline,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useContext } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Book, Diamond, Globe, Link, Minus, Plus, SquareRoundedLetterF, World, Trophy } from 'tabler-icons-react';
import { mantineGray, PICKS_PER_EVT } from './const';
import { Store } from './Store';
import { AthleticsEvent, Competitor, DLMeet, Entrant, ResultsByYearResult } from './types';
import { isFlo, isTouchDevice } from './util';

interface AthleteCardProps {
  avatar: string;
  name: string;
  job: string;
  stats: { label: string; value: string }[];
  event: AthleticsEvent;
  meet: DLMeet;
  entrant: Entrant;
  tableView: boolean;
  isClosed: boolean;
  blurb?: string;
  idx: number;
  numEntrants: number;
  showDetails: boolean;
  setShowDetails: (sd: boolean) => void;
  showPrev: () => void;
  showNext: () => void;

  cacheDetails: () => void;
  competitor: Competitor | null;
  wiki: string | null;
}

function nth(n: string) {
  const num = Number.parseInt(n);
  return ['st', 'nd', 'rd'][((((num + 90) % 100) - 10) % 10) - 1] || 'th';
}

export function AthleteCard({
  avatar,
  name,
  job,
  stats,
  event,
  meet,
  entrant,
  blurb,
  tableView,
  isClosed,
  showDetails,
  setShowDetails,
  showNext,
  showPrev,
  idx,
  numEntrants,
  cacheDetails,
  competitor,
  wiki,
}: AthleteCardProps) {
  const { myTeam, setMyTeam } = useContext(Store);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [popOpened, { close: popClose, open: popOpen }] = useDisclosure(false);
  const isSmall = useMediaQuery(`(max-width: ${theme.breakpoints.md}px)`);

  const team = myTeam?.[meet]?.[event] ?? [];
  const teamPosition = team.findIndex((member) => member.id === entrant.id);
  const isOnTeam = teamPosition >= 0;
  const isBackup = teamPosition >= PICKS_PER_EVT;

  const items = stats.map((stat) => (
    <div key={stat.label}>
      <Text ta="center" size="lg" fw={500}>
        {stat.value}
      </Text>
      <Text ta="center" size="sm" c="dimmed">
        {stat.label}
      </Text>
    </div>
  ));

  const addToTeam: React.MouseEventHandler = (evt) => {
    evt.stopPropagation();
    if (isClosed) return;
    if (!isOnTeam && (myTeam[meet]?.[event]?.length ?? 0) >= PICKS_PER_EVT) return;
    setMyTeam({
      ...myTeam,
      [meet]: {
        ...myTeam[meet],
        [event]: isOnTeam ? myTeam[meet]![event]?.filter((member) => member.id !== entrant.id) : [...(myTeam[meet]?.[event] ?? []), entrant],
      },
    });
  };
  const AddToTeamButtonIcon = isOnTeam ? Minus : team.length < PICKS_PER_EVT ? Plus : AlertCircle;

  const avatarOverlay = (
    <Avatar
      src={`https://files.opentrack.run/live/countryflags/ioc/${entrant.nat}.svg`}
      radius="50%"
      w="100%"
      h="100%"
      pos="absolute"
      top={0}
      left={0}
      sx={(theme, u) => ({
        [u.light]: { filter: 'brightness(90%)' },
        [u.dark]: { filter: 'brightness(20%)' },
      })}
    />
  );

  return (
    <>
      <Modal
        size={500}
        title={
          <Text variant="gradient" gradient={colorScheme === 'dark' ? { from: 'gray', to: 'white' } : { from: 'gray', to: 'black' }} size="xl" sx={{ fontWeight: 'bold', fontSize: 30 }}>
            {entrant.firstName} {entrant.lastName.toUpperCase()}
          </Text>
        }
        closeButtonProps={{ mr: 10 }}
        withCloseButton={true}
        opened={showDetails}
        onClose={() => setShowDetails(false)}
      >
        <div style={{ position: 'relative' }}>
          <Stack align="center">
            <Group align="center" justify="center" wrap="nowrap">
              <Button disabled={idx === 0} variant="outline" onClick={() => showPrev()} size="xs">
                <ArrowLeft size={16} />
              </Button>
              <Box sx={{ position: 'relative', width: isSmall ? 96 : 128, height: isSmall ? 96 : 128 }}>
                {avatarOverlay}
                <Avatar variant="outline" size={isSmall ? 96 : 128} radius={128} src={entrant.hasAvy ? avatar : undefined}>
                  {!entrant.hasAvy && entrant.firstName[0] + entrant.lastName[0]}
                </Avatar>
              </Box>
              <Button disabled={idx === numEntrants - 1} variant="outline" onClick={() => showNext()} size="xs">
                <ArrowRight size={16} />
              </Button>
            </Group>
            <Group align="center" justify="center">
              {entrant.pb && (
                <Badge size="xl" rightSection="PB">
                  {entrant.pb}
                </Badge>
              )}
              {entrant.sb && (
                <Badge size="xl" rightSection="SB">
                  {entrant.sb}
                </Badge>
              )}
              <Badge size="xl" leftSection={<World size={18} />}>
                {entrant.nat}
              </Badge>
            </Group>
            <Button.Group orientation="vertical">
              <Button variant="outline" leftSection={<AddToTeamButtonIcon />} radius="xl" size="xl" color={isOnTeam ? 'red' : undefined} onClick={addToTeam}>
                {(() => {
                  if (isSmall) return '';
                  if (isOnTeam) return 'Remove from Team';
                  if (team.length >= PICKS_PER_EVT) return 'Team Full';
                  if (team.length === 0) return 'Add as Event Captain';
                  return 'Add to Team';
                })()}
              </Button>
              <Button
                size="xl"
                variant="outline"
                radius="xl"
                leftSection={<Link />}
                onClick={() => window.open(`https://worldathletics.org/athletes/_/${entrant.id}`, '_blank')}
              >
                {isSmall ? '' : 'World Athletics'}
              </Button>
              {wiki && (
                <Button size="xl" variant="outline" radius="xl" leftSection={<Book />} onClick={() => window.open(wiki, '_blank')}>
                  {isSmall ? '' : 'Wikipedia'}
                </Button>
              )}
              <Button size="xl" variant="outline" radius="xl" leftSection={<Diamond />} onClick={() => window.open(`https://www.diamondleague.com/athlete/${entrant.id}`, '_blank')}>
                {isSmall ? '' : 'Diamond League'}
              </Button>
              {isFlo && <Button size="xl" variant="outline" radius="xl" leftSection={<SquareRoundedLetterF />} onClick={() => window.open('https://www.flotrack.org/search?' + new URLSearchParams({ q: `"${entrant.firstName} ${entrant.lastName}"` }), '_blank')}>
                {isSmall ? (
                  ''
                ) : (
                  <>
                    FloTrack{' '}
                    <Badge ml="md" color="red">
                      New!
                    </Badge>
                  </>
                )}
              </Button>}
            </Button.Group>
            {blurb && (
              <Accordion variant="contained" sx={{ width: '100%' }}>
                <Accordion.Item value="blurb">
                  <Accordion.Control>AI-Generated Bio (may contain incorrect information)</Accordion.Control>
                  <Accordion.Panel>{blurb}</Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
            <Title order={3}>Personal Bests</Title>
            <Box pos="relative" w="100%">
              <Stack align="center">
                <LoadingOverlay visible={!competitor} />
                <Table sx={{ textAlign: 'left' }} striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Tbody>
                    {competitor?.personalBests.results.map(({ indoor, discipline, mark, notLegal, venue, date, resultScore }, i) => {
                      return (
                        <Table.Tr key={i}>
                          <Table.Td>
                            {indoor ? 'Indoor' : ''} {discipline}
                          </Table.Td>
                          <Table.Td>
                            {mark}
                            {notLegal ? '*' : ''} ({date})
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
                <Title order={3}>{competitor?.resultsByYear?.activeYears[0]} Results</Title>
                <Accordion multiple variant="contained" sx={{ width: '100%' }}>
                  {competitor &&
                    Object.entries(
                      competitor.resultsByYear.resultsByEvent.reduce((acc, { indoor, discipline, results }) => {
                        acc[discipline] ??= [];
                        acc[discipline].push(...results);
                        return acc;
                      }, {} as { [k: string]: ResultsByYearResult[] })
                    ).map(([discipline, results]) => (
                      <Accordion.Item key={discipline} value={discipline}>
                        <Accordion.Control>{discipline}</Accordion.Control>
                        <Accordion.Panel>
                          <Timeline
                            bulletSize={30}
                            lineWidth={2}
                            active={results.length - 1}
                            sx={{ marginTop: 10 }}
                          >
                            {results
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map(({ date, venue, place, mark, wind, notLegal, competition, race }, i) => {
                                const placeNum = Number.parseInt(place);
                                const ordinal = placeNum ? `${placeNum}${nth(place)}` : '';
                                const medal = placeNum === 1 ? '🥇' : placeNum === 2 ? '🥈' : placeNum === 3 ? '🥉' : placeNum ? `${placeNum}` : '–';
                                const cleanVenue = venue?.replace(/ \(i\)/g, '');
                                const cleanCompetition = competition?.replace(/, .+ \(i\) - Indoor Meeting/g, '').replace(/ \(i\)/g, '');
                                const competitionName = cleanCompetition?.split(',')[0];
                                return (
                                  <Timeline.Item
                                    key={i}
                                    bullet={
                                      <Tooltip label={ordinal} openDelay={200}>
                                        <Text size="lg">{medal}</Text>
                                      </Tooltip>
                                    }
                                    title={
                                      <Group gap="xs" align="center">
                                        <Text size="sm" fw={600}>{date.split(' ').slice(0, -1).join(' ')}</Text>
                                        {competitionName && (
                                          <Tooltip label={cleanCompetition} openDelay={200}>
                                            <Text size="sm" fw={500}>{competitionName}</Text>
                                          </Tooltip>
                                        )}
                                      </Group>
                                    }
                                  >
                                    <Group gap="xs" align="center">
                                      <Text size="md" fw={700}>{mark}{notLegal ? '*' : ''}</Text>
                                      {wind && <Badge size="xs" variant="light">{wind}</Badge>}
                                      {race && <Badge size="xs" variant="light" color="gray">{race}</Badge>}
                                    </Group>
                                    <Tooltip label={cleanVenue} openDelay={200}>
                                      <Text size="xs" c="dimmed" mt={2}>{cleanVenue?.split(',')[0]}</Text>
                                    </Tooltip>
                                  </Timeline.Item>
                                );
                              })}
                          </Timeline>
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                </Accordion>
              </Stack>
            </Box>
          </Stack>
        </div>
      </Modal>
      {tableView ? (
        <Table.Tr
          onClick={() => {
            setShowDetails(true);
            cacheDetails();
          }}
          style={{ cursor: 'pointer' }}
        >
          <Table.Td>
            {name}
            {isOnTeam && <Badge ml={5}>{isBackup ? 'Backup' : `#${teamPosition + 1}`}</Badge>}
          </Table.Td>
          <Table.Td>{entrant.pb}</Table.Td>
          <Table.Td onClick={addToTeam}>
            <Button
              size="xs"
              fullWidth
              sx={{ minWidth: 114 }}
              color={isOnTeam ? 'red' : undefined}
              disabled={!isOnTeam && team.length >= PICKS_PER_EVT}
              leftSection={<AddToTeamButtonIcon size={20} />}
            >
              {(() => {
                if (isOnTeam) return 'Remove';
                if (team.length === 0) return 'Captain';
                if (team.length < PICKS_PER_EVT) return 'Add';
                return 'Full';
              })()}
            </Button>
          </Table.Td>
        </Table.Tr>
      ) : (
        <Grid.Col span="content">
          <Popover width={200} position="bottom" withArrow shadow="md" opened={popOpened}>
            <Popover.Target>
              <Indicator
                className="addToTeamIndicator"
                color={isOnTeam ? 'red' : mantineGray}
                disabled={!isOnTeam && team.length >= PICKS_PER_EVT}
                size={40}
                withBorder
                label={<AddToTeamButtonIcon onClick={addToTeam} />}
                offset={15}
                sx={{ cursor: 'pointer', zIndex: 1 }}
              >
                <Indicator
                  color={'green'}
                  disabled={!isOnTeam}
                  size={30}
                  withBorder
                  label={isBackup ? 'Backup' : `#${teamPosition + 1}`}
                  offset={15}
                  position="top-start"
                  sx={{ zIndex: 1, '& .mantine-Indicator-indicator': { width: 30 } }}
                >
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    {avatarOverlay}
                    <Avatar
                      onMouseEnter={popOpen}
                      onMouseLeave={popClose}
                      onClick={() => {
                        setShowDetails(true);
                        cacheDetails();
                      }}
                      src={entrant.hasAvy ? avatar : undefined}
                      size={128}
                      radius={128}
                      sx={{ border: `1px solid ${mantineGray}`, cursor: 'pointer' }}
                    >
                      {!entrant.hasAvy && entrant.firstName[0] + entrant.lastName[0]}
                    </Avatar>
                    <Text
                      size="xs"
                      fw={700}
                      ta="center"
                      style={{
                        position: 'absolute',
                        bottom: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: mantineGray,
                        color: 'white',
                        borderRadius: 10,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        paddingLeft: 8,
                        paddingRight: 8,
                        paddingTop: 3,
                        paddingBottom: 3,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setShowDetails(true);
                        cacheDetails();
                      }}
                    >
                      {entrant.lastName.toUpperCase()}
                    </Text>
                  </Box>
                </Indicator>
              </Indicator>
            </Popover.Target>
            <Popover.Dropdown sx={{ display: isTouchDevice() ? 'none' : undefined }}>
              <Text ta="center" size="lg" fw={500} mt="sm">
                {name}
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                {entrant.team ? `${entrant.team} (${job})` : job}
              </Text>
              <Group mt="md" justify="center" gap={30}>
                {items}
              </Group>
            </Popover.Dropdown>
          </Popover>
        </Grid.Col>
      )}
    </>
  );
}
