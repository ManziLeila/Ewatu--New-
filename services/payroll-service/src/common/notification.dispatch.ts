const SUBJECTS: Record<string, string> = {
  'leave-submitted': 'A leave request requires your approval',
  'leave-approved': 'Leave request approved',
  'leave-rejected': 'Leave request rejected',
  'leave-info-requested': 'More information requested on your leave request',
  'permit-expiring': 'Work permit / visa expiring soon',
  'contract-expiry-90': 'Contract expiring in 90 days',
  'contract-expiry-60': 'Contract expiring in 60 days',
  'contract-expiry-30': 'Contract expiring in 30 days',
  'secondment-contract-expiring': 'Secondment contract expiring soon',
  'payroll-submitted': 'Payroll run submitted for HR approval',
  'payroll-hr-approved': 'Payroll run approved by HR — MD sign-off needed',
  'payroll-md-approved': 'Payroll run approved by MD',
  'payroll-client-approved': 'Payroll run approved by client — ready to finalize',
  'payroll-rejected': 'Payroll run rejected',
  'payroll-reminder': 'Payroll run reminder',
  'payslip-ready': 'Your payslip is ready',
  'payroll-finalized': 'Payroll run finalized',
  // Legacy type names — kept in case anything still dispatches under the old names.
  'payroll-approval-needed': 'Payroll approval required',
  'payroll-locked': 'Payroll run locked',
  'payslip-emailed': 'Your payslip is ready',
};

/** Builds the short, human-readable line shown in the in-app notification feed — the raw
 *  payload dump is fine as an email body, but unreadable in a compact notification list. */
function buildInAppMessage(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'leave-submitted':
      return `${payload.employeeName ?? 'An employee'} submitted a ${payload.leaveType ?? ''} leave request for your approval.`;
    case 'leave-approved':
      return `Your ${payload.leaveType ?? ''} leave request was approved.`;
    case 'leave-rejected':
      return `Your ${payload.leaveType ?? ''} leave request was rejected${payload.reason ? `: ${payload.reason}` : '.'}`;
    case 'leave-info-requested':
      return `More information was requested on your leave request${payload.note ? `: ${payload.note}` : '.'}`;
    case 'permit-expiring':
      return `A work permit / visa is expiring soon.`;
    case 'payroll-submitted':
      return `Finance submitted payroll for ${payload.periodYear}-${payload.periodMonth}. HR review required.`;
    case 'payroll-hr-approved':
      return `HR approved payroll for ${payload.periodYear}-${payload.periodMonth}. Executive sign-off required.`;
    case 'payroll-md-approved':
      return `MD approved payroll for ${payload.periodYear}-${payload.periodMonth}.`;
    case 'payroll-client-approved':
      return `Client approved payroll for ${payload.periodYear}-${payload.periodMonth}. Finance may finalize.`;
    case 'payroll-approval-needed':
      return `A payroll run is waiting on your approval.`;
    case 'payroll-locked':
      return `A payroll run has been locked.`;
    case 'payslip-emailed':
      return `Your payslip is ready.`;
    default:
      return SUBJECTS[type] ?? 'You have a new notification.';
  }
}

// Fields already reflected elsewhere in the email (recipient address, internal ids) or not
// meaningful to a human reader — left out of the readable field list below.
const HIDDEN_FIELDS = new Set(['tenantId', 'employeeEmail', 'employeeId', 'clientId', 'alertTier']);

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

/** Renders a notification payload as a clean, human-readable field list instead of a raw JSON
 *  dump — every dispatched type shares this, so no per-type email template is needed. */
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
    const body = (await res.json()) as { data?: { id: string } | null };
    return body.data?.id;
  } catch {
    return undefined;
  }
}

/** Fire-and-forget notification dispatch to notification-service — both an email (when an
 *  address is available) and an in-app inbox entry (when the recipient's email resolves to a
 *  known User account). */
export async function dispatchNotification(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const base = process.env.NOTIFICATION_SERVICE_URL?.replace(/\/$/, '');
  const key = process.env.INTERNAL_API_KEY;
  if (!base || !key) return;

  const to =
    typeof payload.employeeEmail === 'string'
      ? payload.employeeEmail
      : typeof payload.email === 'string'
        ? payload.email
        : undefined;
  const subject = SUBJECTS[type] ?? 'E-Watu notification';
  const { text, html } = buildEmailBody(subject, payload);
  const userId =
    typeof payload.userId === 'string'
      ? payload.userId
      : await resolveUserIdByEmail(to);

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
        body: buildInAppMessage(type, payload),
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
