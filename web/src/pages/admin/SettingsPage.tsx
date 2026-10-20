import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchMyTenant, updateTenantSettings, type TenantRow } from '../../api';
import { applyTenantTheme } from '../../lib/tenantTheme';
import { parseError } from './parseError';
import { useAdminContext } from './useAdminContext';

type ColorField = 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'textColor';

const COLOR_FIELDS: { key: ColorField; label: string; hint: string; fallback: string }[] = [
  { key: 'primaryColor', label: 'Primary', hint: 'Main buttons & highlights', fallback: '#00466c' },
  { key: 'secondaryColor', label: 'Secondary', hint: 'Highlights & secondary accents (orange)', fallback: '#f5911e' },
  { key: 'accentColor', label: 'Accent', hint: 'Call-to-action buttons & focus states', fallback: '#f5911e' },
  { key: 'backgroundColor', label: 'Background', hint: 'App background & card surfaces', fallback: '#070c18' },
  { key: 'textColor', label: 'Text', hint: 'Main text color', fallback: '#f8fafc' },
];

export function SettingsPage() {
  const { me, isSuper } = useAdminContext();
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [colors, setColors] = useState<Record<ColorField, string | null>>({
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    backgroundColor: null,
    textColor: null,
  });
  const [website, setWebsite] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('RWF');
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(1);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const t = await fetchMyTenant();
      setTenant(t);
      if (t) {
        setName(t.name);
        setLogoUrl(t.logoUrl ?? '');
        setColors({
          primaryColor: t.primaryColor ?? null,
          secondaryColor: t.secondaryColor ?? null,
          accentColor: t.accentColor ?? null,
          backgroundColor: t.backgroundColor ?? null,
          textColor: t.textColor ?? null,
        });
        setWebsite(t.website ?? '');
        setBaseCurrency(t.baseCurrency ?? 'RWF');
        setFiscalYearStartMonth(t.fiscalYearStartMonth ?? 1);
      }
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isSuper) {
    return <Navigate to="/platform" replace />;
  }

  if (!me.tenant_id) {
    return (
      <div className="adm-page">
        <p className="muted">No company linked to this account.</p>
      </div>
    );
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);
    setSaved(false);
    try {
      const updated = await updateTenantSettings({
        name,
        logoUrl: logoUrl || undefined,
        primaryColor: colors.primaryColor,
        secondaryColor: colors.secondaryColor,
        accentColor: colors.accentColor,
        backgroundColor: colors.backgroundColor,
        textColor: colors.textColor,
        website: website || undefined,
        baseCurrency,
        fiscalYearStartMonth,
      });
      applyTenantTheme(updated);
      setSaved(true);
      await load();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  return (
    <div className="adm-page">
      <header className="adm-page__head">
        <h1 className="adm-page__title">Company settings</h1>
        <p className="adm-page__lead">
          Branding and configuration for your workspace (EWatu Phase 1).
        </p>
      </header>

      {tenant && (
        <p className="muted small">
          Public careers page:{' '}
          <a href={`/apply/${tenant.slug}`} target="_blank" rel="noreferrer">
            /apply/{tenant.slug}
          </a>
        </p>
      )}

      {err && <div className="alert alert--err">{err}</div>}
      {saved && <div className="alert alert--info">Settings saved.</div>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && tenant && (
        <form className="adm-card form" onSubmit={onSubmit}>
          <label>
            Company name
            <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Logo URL
            <input className="auth-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
          </label>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Brand colors</div>
            <p className="muted small" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
              Pick as many or as few as you like — anything left on "Default" keeps the standard
              E-Watu look, so you can set just your Primary color or all five.
            </p>
            <div className="adm-grid-2">
              {COLOR_FIELDS.map((f) => (
                <div key={f.key} style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block' }}>
                    {f.label} <span className="muted small">— {f.hint}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                      <input
                        className="auth-input"
                        type="color"
                        style={{ width: 52, padding: '0.25rem' }}
                        value={colors[f.key] ?? f.fallback}
                        onChange={(e) => setColors((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                      {colors[f.key] ? (
                        <button
                          type="button"
                          className="btn btn--ghost small"
                          onClick={() => setColors((prev) => ({ ...prev, [f.key]: null }))}
                        >
                          Reset to default
                        </button>
                      ) : (
                        <span className="muted small">Default</span>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <label>
            Website
            <input className="auth-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
          </label>
          <div className="adm-grid-2">
            <label>
              Base currency
              <input className="auth-input" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} maxLength={8} />
            </label>
            <label>
              Fiscal year starts (month 1–12)
              <input
                className="auth-input"
                type="number"
                min={1}
                max={12}
                value={fiscalYearStartMonth}
                onChange={(e) => setFiscalYearStartMonth(Number(e.target.value))}
              />
            </label>
          </div>
          <button type="submit" className="btn btn--primary">
            Save settings
          </button>
        </form>
      )}
    </div>
  );
}
