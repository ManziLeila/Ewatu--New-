import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact';

type AppPreferences = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
  toggleLightDark: () => void;
  density: Density;
  setDensity: (d: Density) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebarCollapsed: () => void;
};

const STORAGE_KEY = 'ewatu.app.preferences';

const AppPreferencesContext = createContext<AppPreferences | null>(null);

function readStored(): Partial<{ theme: ThemeMode; density: Density; sidebarCollapsed: boolean }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<{ theme: ThemeMode; density: Density; sidebarCollapsed: boolean }>) : {};
  } catch {
    return {};
  }
}

function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.theme = resolved;
  window.dispatchEvent(new Event('ewatu-shell-theme'));
  return resolved;
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [theme, setThemeState] = useState<ThemeMode>(stored.theme ?? 'dark');
  const [density, setDensityState] = useState<Density>(stored.density ?? 'comfortable');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(stored.sidebarCollapsed ?? false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    typeof window === 'undefined' ? 'dark' : applyTheme(stored.theme ?? 'dark'),
  );

  const persist = useCallback(
    (next: Partial<{ theme: ThemeMode; density: Density; sidebarCollapsed: boolean }>) => {
      const merged = { theme, density, sidebarCollapsed, ...next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    },
    [theme, density, sidebarCollapsed],
  );

  const setTheme = useCallback(
    (t: ThemeMode) => {
      setThemeState(t);
      setResolvedTheme(applyTheme(t));
      persist({ theme: t });
    },
    [persist],
  );

  const toggleLightDark = useCallback(() => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const setDensity = useCallback(
    (d: Density) => {
      setDensityState(d);
      document.documentElement.dataset.density = d;
      persist({ density: d });
    },
    [persist],
  );

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (theme === 'system') setResolvedTheme(applyTheme('system'));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const value = useMemo<AppPreferences>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      toggleLightDark,
      density,
      setDensity,
      sidebarCollapsed,
      setSidebarCollapsed: (v) => {
        setSidebarCollapsed(v);
        persist({ sidebarCollapsed: v });
      },
      toggleSidebarCollapsed: () => {
        setSidebarCollapsed((c) => {
          const next = !c;
          persist({ sidebarCollapsed: next });
          return next;
        });
      },
    }),
    [theme, setTheme, resolvedTheme, toggleLightDark, density, setDensity, sidebarCollapsed, persist],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  return ctx;
}
