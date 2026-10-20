import { useEffect, useRef } from 'react';
import { fetchMyTenant, type TenantRow } from '../api';
import { subscribeAuth, isAuthenticatedSnapshot } from '../auth/token';
import { applyTenantTheme } from './tenantTheme';

/** Mounted once at the app root. Applies the logged-in user's tenant brand colors on
 *  login/refresh, and clears them back to the default theme on logout. */
export function useTenantThemeSync(): void {
  const tenantRef = useRef<TenantRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!isAuthenticatedSnapshot()) {
        tenantRef.current = null;
        applyTenantTheme(null);
        return;
      }
      try {
        const tenant = await fetchMyTenant();
        if (!cancelled) {
          tenantRef.current = tenant;
          applyTenantTheme(tenant);
        }
      } catch {
        if (!cancelled) {
          tenantRef.current = null;
          applyTenantTheme(null);
        }
      }
    };

    const onShellTheme = () => {
      applyTenantTheme(tenantRef.current);
    };

    sync();
    const unsubscribe = subscribeAuth(sync);
    window.addEventListener('ewatu-shell-theme', onShellTheme);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('ewatu-shell-theme', onShellTheme);
    };
  }, []);
}
