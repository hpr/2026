import { Button, useMantineColorScheme } from '@mantine/core';
import { Sun, Moon } from 'tabler-icons-react';

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <Button
      size="xs"
      onClick={() => toggleColorScheme()}
      style={{ marginLeft: '10px', marginRight: '-10px', padding: '5px' }}
    >
      {colorScheme === 'dark' ? <Sun size={10} /> : <Moon size={10} />}
    </Button>
  );
}
