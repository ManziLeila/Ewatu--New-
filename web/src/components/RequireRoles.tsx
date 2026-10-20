import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchMe } from '../api';
import { hasAnyRole } from '../lib/roles';

type RequireRolesProps = {
  allowed: string[];
  fallback?: string;
  children: ReactNode;
};

/** Redirect when the signed-in user lacks any of the allowed roles. */
export function RequireRoles({ allowed, fallback = '/platform', children }: RequireRolesProps) {
  const [roles, setRoles] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setRoles(me.roles ?? []);
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (roles === null) {
    return (
      <div className="adm-boot">
        <p className="muted">Checking access…</p>
      </div>
    );
  }

  if (!hasAnyRole(roles, allowed)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
