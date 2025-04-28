import { ChevronRight, ChevronLeft, DeviceFloppy } from 'tabler-icons-react';
import { UnstyledButton, Group, Avatar, Text, Box, useMantineTheme } from '@mantine/core';
import { useContext } from 'react';
import { Store } from './Store';
import { DLMeet } from './types';

export function User({
  onClick = () => {},
  isClosed,
  meet,
}: {
  onClick?: React.MouseEventHandler;
  isClosed: boolean;
  meet: DLMeet;
}) {
  const theme = useMantineTheme();

  return (
    <Box
      sx={{
        paddingTop: theme.spacing.sm,
        borderTop: `1px solid ${
          theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
        }`,
      }}
    >
      <UnstyledButton
        sx={{
          display: 'block',
          width: '100%',
          padding: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,

          '&:hover': {
            backgroundColor:
              theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
          },
        }}
      >
        <Group>
          <Avatar radius="xl">
            <DeviceFloppy />
          </Avatar>
          <Box sx={{ flex: 1 }} onClick={onClick}>
            <Text size="sm" weight={500}>
              {isClosed ? 'Event Closed' : 'Save Picks'}
            </Text>
            <Text color="dimmed" size="xs">
              {isClosed
                ? `Picks submission is closed for ${meet}`
                : 'Save and submit your picks'}
            </Text>
          </Box>

          {theme.dir === 'ltr' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Group>
      </UnstyledButton>
    </Box>
  );
}
