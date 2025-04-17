import { useMantineColorScheme } from '@mantine/core';
import { Sun, Moon } from 'tabler-icons-react';

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <button 
      onClick={() => toggleColorScheme()}
      style={{ marginLeft: '10px', marginRight: '-10px', cursor: 'pointer', padding: '5px' }}
    >
      {colorScheme === 'dark' ? <Sun size={10} /> : <Moon size={10} />}
    </button>
  );
}