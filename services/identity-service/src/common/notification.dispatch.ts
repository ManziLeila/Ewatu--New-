const SUBJECTS: Record<string, string> = {
  'password-reset-requested': 'Reset your password',
};

const HIDDEN_FIELDS = new Set(['tenantId', 'email']);

function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function humanizeValue(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return String(value);
}

function buildEmailBody(subject: string, payload: Record<string, unknown>): { text: string; html: string } {
  const rows = Object.entries(payload)
    .filter(([key, value]) => !HIDDEN_FIELDS.has(key) && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [humanizeKey(key), humanizeValue(value)] as const);

  const text = [subject, '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
  const html =
    `<h2 style="margin:0 0 12px;font-family:sans-serif;font-size:18px;">${subject}</h2>` +
    `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">` +
    rows
      .map(([k, v]) => {
        const isUrl = /^https?:\/\//.test(v);
        const cell = isUrl ? `<a href="${v}">${v}</a>` : v;
        return `<tr><td style="padding:4px 16px 4px 0;color:#64748b;white-space:nowrap;">${k}</td><td style="padding:4px 0;font-weight:600;">${cell}</td></tr>`;
      })
      .join('') +
    `</table>`;
  return { text, html };
}

async function resolveUserIdByEmail(email: string | undefined): Promise<string | undefined> {
  if (!email) return undefined;
  const base = process.env.IDENTITY_SERVICE_URL?.replace(/\/$/, '');
  const key = process.env.INTERNAL_API_KEY;
  if (!base || !key) return undefined;
  try {
    const res = await fetch(`${base}/api/v1/internal/users/by-email?email=${encodeURIComponent(email)}`, {
      headers: { 'x-internal-key': key },
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { id?: string } | null;
    return body?.id;
  } catch {
    return undefined;
  }
}

/** Fire-and-forget notification dispatch — email when an address is known, plus in-app when user exists. */
export async function dispatchNotification(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const base = process.env.NOTIFICATION_SERVICE_URL?.replace(/\/$/, '');
  const key = process.env.INTERNAL_API_KEY;
  if (!base || !key) return;

  const to = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined;
  const subject = SUBJECTS[type] ?? 'E-Watu notification';
  const { text, html } = buildEmailBody(subject, payload);
  const userId =
    typeof payload.userId === 'string' ? payload.userId : await resolveUserIdByEmail(to);

  try {
    await fetch(`${base}/api/v1/internal/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': key,
      },
      body: JSON.stringify({
        channel: to ? (userId ? 'both' : 'email') : 'email',
        to,
        userId,
        tenantId: payload.tenantId,
        title: subject,
        body: text.split('\n').slice(0, 3).join(' '),
        template: 'generic',
        payload: {
          subject,
          text,
          html,
          notificationType: type,
          ...payload,
        },
      }),
    });
  } catch (err) {
    console.error('[notification] dispatch failed', err);
  }
}
