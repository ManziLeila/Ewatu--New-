export type ParsedApiError = {
  title: string;
  message: string;
  code?: string;
  variant: 'error' | 'warning';
};

const FRIENDLY_BY_CODE: Record<
  string,
  Pick<ParsedApiError, 'title' | 'message' | 'variant'>
> = {
  EMAIL_NOT_VERIFIED: {
    title: 'Activate your email',
    message:
      'This account is not activated yet. Check your email inbox and spam folder for the activation link, or resend a new email below.',
    variant: 'warning',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Please wait before trying again',
    message:
      'Too many sign-in attempts were made. For your security, sign-in is paused for about 15 minutes. You can try again later or reset your password if you forgot it.',
    variant: 'warning',
  },
};

const TENANT_STATUS_MESSAGES: Record<string, string> = {
  TENANT_SUSPENDED: 'This company account has been suspended. Please contact your administrator.',
  TENANT_EXPIRED: "This company's subscription has expired. Please renew to continue.",
  TENANT_PENDING_ACTIVATION: 'This company is awaiting approval from the platform team.',
  TENANT_REJECTED: "This company's registration was not approved.",
};

function fromNestMessage(message: string): ParsedApiError | null {
  const lower = message.toLowerCase();
  for (const [code, friendly] of Object.entries(TENANT_STATUS_MESSAGES)) {
    if (lower.includes(code.toLowerCase())) {
      return { title: 'Company access restricted', message: friendly, code, variant: 'warning' };
    }
  }
  if (lower.includes('account_locked')) {
    return {
      title: 'Account locked',
      message: 'Your account has been temporarily locked. Please contact your administrator.',
      variant: 'error',
    };
  }
  if (lower.includes('invalid email or password')) {
    return {
      title: 'Sign-in failed',
      message: 'The email or password you entered is incorrect. Please check your details and try again.',
      variant: 'error',
    };
  }
  if (lower.includes('deactivated')) {
    return {
      title: 'Account unavailable',
      message: 'This account has been deactivated. Contact your administrator if you need access restored.',
      variant: 'error',
    };
  }
  if (lower.includes('no linked employee record') || lower.includes('no employee record is linked')) {
    return {
      title: 'No employee profile',
      message:
        'Your login is not linked to an employee record yet. Ask HR to add you in Payroll → Employees with the same email, or sign in with a staff account that is already on the roster.',
      variant: 'warning',
    };
  }
  if (lower.includes('email_not_verified')) {
    return { ...FRIENDLY_BY_CODE.EMAIL_NOT_VERIFIED, code: 'EMAIL_NOT_VERIFIED' };
  }
  if (lower.includes('verify your email') || lower.includes('email verification')) {
    return {
      title: 'Email not verified',
      message: message,
      variant: 'warning',
    };
  }
  if (lower.includes('invalid or expired verification')) {
    return {
      title: 'Link expired or already used',
      message:
        'This link is no longer valid — it may have expired, already been used, or been replaced by a newer email.',
      code: 'VERIFY_LINK_INVALID',
      variant: 'warning',
    };
  }
  return null;
}

function stripHttpStatusPrefix(raw: string): { status?: number; body: string } {
  const m = raw.match(/^(\d{3}):\s*(.+)$/s);
  if (m) return { status: Number(m[1]), body: m[2].trim() };
  return { body: raw };
}

function extractPayload(raw: string): Record<string, unknown> | null {
  const { body } = stripHttpStatusPrefix(raw);
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type ParseApiErrorContext = 'auth' | 'payroll' | 'default';

const NETWORK_MESSAGES: Record<
  ParseApiErrorContext,
  Pick<ParsedApiError, 'title' | 'message'>
> = {
  auth: {
    title: 'Connection problem',
    message:
      'Could not reach the sign-in service. Run npm run dev (identity on port 3011), wait until services finish starting, then refresh and try again.',
  },
  payroll: {
    title: 'Connection problem',
    message:
      'Could not reach the payroll service. Check that npm run dev is running and refresh this page.',
  },
  default: {
    title: 'Connection problem',
    message:
      'Could not reach the server. Check that npm run dev is running and refresh this page.',
  },
};

/** Turn API / fetch error bodies into user-facing copy (never raw JSON). */
export function parseApiError(
  e: unknown,
  context: ParseApiErrorContext = 'default',
): ParsedApiError {
  const raw = e instanceof Error ? e.message : String(e);

  const payload = extractPayload(raw);
  if (payload) {
    const nested = payload.error;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const err = nested as { code?: string; message?: string };
      if (err.code && FRIENDLY_BY_CODE[err.code]) {
        return { ...FRIENDLY_BY_CODE[err.code], code: err.code };
      }
      if (typeof err.message === 'string' && err.message.trim()) {
        return {
          title: 'Something went wrong',
          message: err.message,
          code: err.code,
          variant: 'error',
        };
      }
    }

    const topMessage = payload.message;
    if (typeof topMessage === 'string' && topMessage.trim()) {
      const friendly = fromNestMessage(topMessage);
      if (friendly) return friendly;
      return { title: 'Something went wrong', message: topMessage, variant: 'error' };
    }
    if (Array.isArray(topMessage)) {
      return {
        title: 'Please fix the following',
        message: topMessage.join(' '),
        variant: 'error',
      };
    }
  }

  if (raw.startsWith('{') || raw.startsWith('[')) {
    return {
      title: 'Something went wrong',
      message: 'We could not complete your request. Please try again in a moment.',
      variant: 'error',
    };
  }

  const friendly = fromNestMessage(raw);
  if (friendly) return friendly;

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return { ...NETWORK_MESSAGES[context], variant: 'error' };
  }

  return {
    title: 'Something went wrong',
    message: raw || 'An unexpected error occurred. Please try again.',
    variant: 'error',
  };
}
