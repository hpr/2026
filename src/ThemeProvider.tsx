import { 
  MantineProvider, 
  ColorSchemeProvider, 
  ColorScheme 
} from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { useState } from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    (localStorage.getItem('colorScheme') as ColorScheme) || 'light'
  );

  const toggleColorScheme = (value?: ColorScheme) => {
    const next = value || (colorScheme === 'dark' ? 'light' : 'dark');
    localStorage.setItem('colorScheme', next);
    setColorScheme(next);
  };

  return (
    <ColorSchemeProvider 
      colorScheme={colorScheme} 
      toggleColorScheme={toggleColorScheme}
    >
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{ colorScheme }}
      >
        <ModalsProvider>
          {children}
        </ModalsProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}