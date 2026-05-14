import { MantineProvider, createTheme } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { emotionTransform, MantineEmotionProvider } from '@mantine/emotion';
import '@mantine/core/styles.css';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const theme = createTheme({
  defaultRadius: 'sm',
});

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <MantineProvider defaultColorScheme="light" theme={theme} stylesTransform={emotionTransform}>
      <MantineEmotionProvider>
        <ModalsProvider>
          {children}
        </ModalsProvider>
      </MantineEmotionProvider>
    </MantineProvider>
  );
}
