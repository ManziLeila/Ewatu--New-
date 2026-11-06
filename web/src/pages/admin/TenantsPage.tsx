import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  approveTenant,
  archiveTenant,
  purgeTenantPermanent,
  createTenant,
  fetchPendingTenants,
  fetchTenants,
  reactivateTenant,
  rejectTenant,
  suspendTenant,
  updateTenant,
  type TenantRow,
} from '../../api';
import { StatusBadge } from './StatusBadge';
import { TenantCrudActions } from './TenantCrudActions';
import { parseError } from './parseError';
import { useAdminContext } from './useAdminContext';

export function TenantsPage() {
  const { isSuper } = useAdminContext();
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [pending, setPending] = useState<TenantRow[] | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [all, pend] = await Promise.all([fetchTenants(), fetchPendingTenants()]);
      setTenants(all);
      setPending(pend);
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuper) load();
  }, [isSuper, load]);

  if (!isSuper) {
    return <Navigate to="/platform" replace />;
  }

  const onCreate = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);
    try {
      const createdName = name.trim();
      await createTenant({ name: createdName, slug, plan: 'starter', country: 'RW' });
      setName('');
      setSlug('');
      await load();
      toast.success(`${createdName} created`);
      setTab('all');
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const withTenantAction = async (id: string, action: () => Promise<void>, successMessage?: string) => {
    setBusyId(id);
    setErr(null);
    try {
      await action();
      await load();
      if (successMessage) toast.success(successMessage);
    } catch (e) {
      const message = parseError(e);
      setErr(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const tenantName = (id: string) =>
    tenants?.find((row) => row.id === id)?.name ?? pending?.find((row) => row.id === id)?.name ?? 'Company';

  const onApprove = (id: string) =>
    withTenantAction(id, () => approveTenant(id), `${tenantName(id)} approved`);
  const onReject = (id: string, reason?: string) =>
    withTenantAction(id, () => rejectTenant(id, reason), `${tenantName(id)} rejected`);
  const onSuspend = (id: string) =>
    withTenantAction(id, () => suspendTenant(id), `${tenantName(id)} suspended`);
  const onReactivate = (id: string) =>
    withTenantAction(id, () => reactivateTenant(id), `${tenantName(id)} activated`);
  const onArchive = (id: string) =>
    withTenantAction(id, () => archiveTenant(id), `${tenantName(id)} archived`);
  const onPurgePermanent = (id: string, confirmSlug: string) =>
    withTenantAction(id, () => purgeTenantPermanent(id, confirmSlug), `${confirmSlug} permanently deleted`);
  const onEditSave = (id: string, body: { name: string; plan: string; country: string }) =>
    withTenantAction(id, () => updateTenant(id, body), `${body.name} updated`);

  return (
    <div className="adm-page">
      <header className="adm-page__head">
        <h1 className="adm-page__title">Tenants</h1>
        <p className="adm-page__lead">
          HR companies on the platform — review registrations, approve workspaces, or create tenants manually.
        </p>
      </header>

      {err && (
        <div className="alert alert--err" role="alert">
          {err}
        </div>
      )}

      <div className="adm-toolbar">
        <div className="adm-tabs">
          <button
            type="button"
            className={tab === 'pending' ? 'btn btn--primary' : 'btn'}
            onClick={() => setTab('pending')}
          >
            Pending ({pending?.length ?? 0})
          </button>
          <button
            type="button"
            className={tab === 'all' ? 'btn btn--primary' : 'btn'}
            onClick={() => setTab('all')}
          >
            All ({tenants?.length ?? 0})
          </button>
        </div>
        <button type="button" className="btn" onClick={() => load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && tab === 'pending' && pending && (
        <section className="adm-card">
          {pending.length === 0 ? (
            <p className="muted">No companies waiting for approval.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Slug</th>
                  <th>Contact</th>
                  <th>Registered</th>
                  <th>Email verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.name}</strong>
                    </td>
                    <td>
                      <code>{t.slug}</code>
                    </td>
                    <td>
                      {t.businessEmail ?? '—'}
                      {t.phone ? (
                        <>
                          <br />
                          <span className="muted small">{t.phone}</span>
                        </>
                      ) : null}
                    </td>
                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                    <td>{t.emailVerifiedAt ? 'Yes' : 'No'}</td>
                    <td>
                      <TenantCrudActions
                        tenant={t}
                        busyId={busyId}
                        onApprove={onApprove}
                        onReject={onReject}
                        onSuspend={onSuspend}
                        onReactivate={onReactivate}
                        onArchive={onArchive}
                        onPurgePermanent={onPurgePermanent}
                        onEditSave={onEditSave}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {!loading && tab === 'all' && tenants && (
        <>
          <section className="adm-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Country</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>
                      <code>{t.slug}</code>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>{t.plan ?? '—'}</td>
                    <td>{t.country ?? '—'}</td>
                    <td>
                      <TenantCrudActions
                        tenant={t}
                        busyId={busyId}
                        onApprove={onApprove}
                        onReject={onReject}
                        onSuspend={onSuspend}
                        onReactivate={onReactivate}
                        onArchive={onArchive}
                        onPurgePermanent={onPurgePermanent}
                        onEditSave={onEditSave}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="adm-card">
            <h2 className="adm-card__title">Create tenant manually</h2>
            <p className="muted small" style={{ marginTop: 0 }}>
              Creates an <strong>ACTIVE</strong> tenant (for demos or operator-provisioned companies).
            </p>
            <form className="form" onSubmit={onCreate} style={{ marginTop: '1rem' }}>
              <label>
                Company name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="ACME HR Ltd"
                  className="auth-input"
                />
              </label>
              <label>
                Slug
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  required
                  placeholder="acme-hr"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  className="auth-input"
                />
              </label>
              <button type="submit" className="btn btn--primary">
                Create tenant
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
