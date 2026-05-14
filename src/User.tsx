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
      sx={(theme, u) => ({
        paddingTop: theme.spacing.sm,
        borderTop: `1px solid ${theme.colors.gray[2]}`,
        [u.dark]: {
          borderTopColor: theme.colors.dark[4],
        },
      })}
    >
      <UnstyledButton
        sx={(theme, u) => ({
          display: 'block',
          width: '100%',
          padding: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          color: theme.black,
          '&:hover': {
            backgroundColor: theme.colors.gray[0],
          },
          [u.dark]: {
            color: theme.colors.dark[0],
            '&:hover': {
              backgroundColor: theme.colors.dark[6],
            },
          },
        })}
      >
        <Group>
          <Avatar radius="xl">
            <DeviceFloppy />
          </Avatar>
          <Box sx={{ flex: 1 }} onClick={onClick}>
            <Text size="sm" fw={500}>
              {isClosed ? 'Event Closed' : 'Save Picks'}
            </Text>
            <Text c="dimmed" size="xs">
              {isClosed
                ? `Picks submission is closed for ${meet}`
                : 'Save and submit your picks'}
            </Text>
          </Box>

          <ChevronRight size={18} />
        </Group>
      </UnstyledButton>
    </Box>
  );
}
