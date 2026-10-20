import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchCapabilities, type CapabilitiesPayload } from '../api';
import { getAccessToken, subscribeAuth } from '../auth/token';

type CapabilitiesContextValue = {
  capabilities: CapabilitiesPayload | null;
  loading: boolean;
  reload: () => Promise<void>;
  hasModule: (moduleId: string) => boolean;
};

const CapabilitiesContext = createContext<CapabilitiesContextValue | null>(null);

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<CapabilitiesPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!getAccessToken()) {
      setCapabilities(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCapabilities(await fetchCapabilities());
    } catch {
      setCapabilities(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return subscribeAuth(() => {
      void reload();
    });
  }, [reload]);

  const hasModule = useCallback(
    (moduleId: string) => {
      if (loading) return true;
      if (!capabilities) return false;
      return capabilities.enabledModules.includes(moduleId);
    },
    [capabilities, loading],
  );

  const value = useMemo(
    () => ({ capabilities, loading, reload, hasModule }),
    [capabilities, loading, reload, hasModule],
  );

  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities() {
  const ctx = useContext(CapabilitiesContext);
  if (!ctx) {
    throw new Error('useCapabilities must be used within CapabilitiesProvider');
  }
  return ctx;
}
