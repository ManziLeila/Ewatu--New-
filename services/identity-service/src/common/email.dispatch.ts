/** Sends templated email via notification-service internal API. */
export async function dispatchEmail(
  to: string,
  template: 'verify-email' | 'password-reset' | 'generic',
  payload: Record<string, unknown>,
  tenantId?: string,
): Promise<{ sent: boolean }> {
  const base = process.env.NOTIFICATION_SERVICE_URL?.replace(/\/$/, '');
  const key = process.env.INTERNAL_API_KEY;
  if (!base || !key) {
    console.warn('[email] NOTIFICATION_SERVICE_URL or INTERNAL_API_KEY not set — email not sent');
    return { sent: false };
  }

  try {
    const r = await fetch(`${base}/api/v1/internal/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': key,
      },
      body: JSON.stringify({
        channel: 'email',
        to,
        tenantId,
        template,
        payload,
      }),
    });
    if (!r.ok) {
      console.error('[email] dispatch failed', r.status, await r.text());
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] dispatch error', err);
    return { sent: false };
  }
}
