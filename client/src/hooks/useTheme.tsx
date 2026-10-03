import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

export interface ChartColors {
  series: [string, string, string, string, string];
  grid: string;
  axis: string;
  surface: string;
  ink: string;
  ink2: string;
  line: string;
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  /** Resolved token values — Recharts needs concrete colors, not CSS variables. */
  chart: ChartColors;
}

const ThemeContext = createContext<ThemeState | null>(null);

function readChartColors(): ChartColors {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    series: [v('--chart-1'), v('--chart-2'), v('--chart-3'), v('--chart-4'), v('--chart-5')],
    grid: v('--chart-grid'),
    axis: v('--chart-axis'),
    surface: v('--surface'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    line: v('--line'),
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [chart, setChart] = useState<ChartColors>(readChartColors);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setChart(readChartColors());
    try {
      localStorage.setItem('ht-theme', theme);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, toggle, chart }), [theme, toggle, chart]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
