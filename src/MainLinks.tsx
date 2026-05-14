import React, { MouseEventHandler, useContext } from 'react';
import { ThemeIcon, UnstyledButton, Group, Text, Divider } from '@mantine/core';
import { DIVIDER } from './const';
import { useLocation } from 'react-router-dom';

interface MainLinkProps {
  icon: React.ReactNode;
  path: string;
  color: string;
  label: string | React.ReactNode;
  onClick?: MouseEventHandler;
}

function MainLink({ icon, color, path, label, onClick = () => {} }: MainLinkProps) {
  const { pathname } = useLocation();
  const hash = decodeURIComponent(pathname.slice(1));
  return (
    <UnstyledButton
      onClick={onClick}
      sx={(theme, u) => ({
        display: 'block',
        width: '100%',
        padding: theme.spacing.xs,
        borderRadius: theme.radius.sm,
        color: theme.black,
        backgroundColor: path === hash ? '#d1d2d7' : undefined,
        '&:hover': {
          backgroundColor: theme.colors.gray[0],
        },
        [u.dark]: {
          color: theme.colors.dark[0],
          backgroundColor: path === hash ? theme.colors.dark[6] : undefined,
          '&:hover': {
            backgroundColor: theme.colors.dark[6],
          },
        },
      })}
    >
      <Group>
        <ThemeIcon color={color} variant="light">
          {icon}
        </ThemeIcon>

        <Text size="sm">{label}</Text>
      </Group>
    </UnstyledButton>
  );
}

type MainLinksProps = {
  links?: (
    | {
        icon: React.ReactNode;
        color: string;
        path: string;
        label: string | React.ReactNode;
        onClick?: MouseEventHandler;
      }
    | 'divider'
  )[];
};

export function MainLinks({ links = [] }: MainLinksProps) {
  return (
    <div>
      {links.map((link, i) =>
        link === DIVIDER ? <Divider key={i} my="lg" /> : <MainLink {...link} key={link.path} />
      )}
    </div>
  );
}
