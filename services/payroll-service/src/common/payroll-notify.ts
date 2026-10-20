import { dispatchNotification } from './notification.dispatch';

const IDENTITY_BASE = () => process.env.IDENTITY_SERVICE_URL?.replace(/\/$/, '');
const INTERNAL_KEY = () => process.env.INTERNAL_API_KEY;

export type TenantNotifyUser = { id: string; email: string };

/** Resolve active tenant users whose JWT roles intersect `wantedRoles`. */
export async function findTenantUsersByRoles(
  tenantId: string,
  wantedRoles: string[],
): Promise<TenantNotifyUser[]> {
  const base = IDENTITY_BASE();
  const key = INTERNAL_KEY();
  if (!base || !key || !tenantId || wantedRoles.length === 0) return [];
  try {
    const qs = new URLSearchParams({ tenantId, roles: wantedRoles.join(',') });
    const res = await fetch(`${base}/api/v1/internal/users/by-tenant-roles?${qs}`, {
      headers: { 'x-internal-key': key },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: TenantNotifyUser[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}

export async function notifyTenantRoles(
  tenantId: string,
  roles: string[],
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const users = await findTenantUsersByRoles(tenantId, roles);
  await Promise.all(
    users.map((u) =>
      dispatchNotification(type, {
        ...payload,
        tenantId,
        email: u.email,
        employeeEmail: u.email,
        userId: u.id,
      }),
    ),
  );
}
