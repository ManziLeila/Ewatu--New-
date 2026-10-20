import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { Resend } from 'resend';

export type EmailTemplate =
  | 'verify-email'
  | 'password-reset'
  | 'tenant-approved'
  | 'tenant-rejected'
  | 'welcome'
  | 'generic';

/** Resend's sandbox sender — works with just an API key, but Resend restricts sandbox mode to
 *  only deliver to the email address on the Resend account itself. Set RESEND_FROM_ADDRESS once
 *  a real sending domain is verified in Resend. */
const RESEND_SANDBOX_FROM = 'onboarding@resend.dev';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly log = new Logger(EmailService.name);
  private resend?: Resend;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (resendKey) {
      this.resend = new Resend(resendKey);
      this.log.log('[EmailService] Resend configured');
    } else if (host) {
      this.log.log(`[EmailService] SMTP configured → ${host}`);
    } else {
      this.log.warn(
        '[EmailService] Neither RESEND_API_KEY nor SMTP_HOST is set — emails will be logged ' +
          'to console only.',
      );
    }
  }

  private usingResend(): boolean {
    return !!this.config.get<string>('RESEND_API_KEY')?.trim();
  }

  private fromAddress(): string {
    if (this.usingResend()) {
      const address = this.config.get<string>('RESEND_FROM_ADDRESS', RESEND_SANDBOX_FROM);
      const name = this.config.get<string>('MAIL_FROM_NAME');
      return name?.trim() ? `"${name.trim()}" <${address}>` : address;
    }
    const address =
      this.config.get<string>('MAIL_FROM_ADDRESS') ??
      this.config.get<string>('EMAIL_FROM', 'noreply@ewatu.local');
    const name = this.config.get<string>('MAIL_FROM_NAME');
    if (name?.trim()) {
      return `"${name.trim()}" <${address}>`;
    }
    return address;
  }

  private render(template: EmailTemplate, payload: Record<string, unknown>) {
    switch (template) {
      case 'verify-email':
        return {
          subject: 'Verify your E-Watu administrator email',
          text: `Hello,\n\nPlease verify your email to continue setting up your company workspace:\n\n${payload.verifyUrl}\n\n— E-Watu`,
          html: `<p>Hello,</p><p>Please verify your email to continue setting up your company workspace:</p><p><a href="${payload.verifyUrl}">Verify email</a></p><p>— E-Watu</p>`,
        };
      case 'tenant-approved':
        return {
          subject: `Your company ${payload.companyName} is approved on E-Watu`,
          text: `Your workspace for ${payload.companyName} is now active. Sign in at ${payload.loginUrl}`,
          html: `<p>Your workspace for <strong>${payload.companyName}</strong> is now active.</p><p><a href="${payload.loginUrl}">Sign in</a></p>`,
        };
      case 'tenant-rejected':
        return {
          subject: `Update on your E-Watu registration`,
          text: `Your registration for ${payload.companyName} was not approved.${payload.reason ? ` Reason: ${payload.reason}` : ''}`,
          html: `<p>Your registration for <strong>${payload.companyName}</strong> was not approved.</p>${payload.reason ? `<p>Reason: ${payload.reason}</p>` : ''}`,
        };
      case 'welcome':
        return {
          subject: `Your E-Watu application for ${payload.companyName} is under review`,
          text: `Thanks for applying! Your application for ${payload.companyName} is now under review by our team. You'll receive another email as soon as it's approved and your workspace is ready.`,
          html: `<p>Thanks for applying!</p><p>Your application for <strong>${payload.companyName}</strong> is now under review by our team. You'll receive another email as soon as it's approved and your workspace is ready.</p>`,
        };
      case 'password-reset':
        return {
          subject: 'Reset your E-Watu password',
          text: `Hello,\n\nUse this link to reset your password (valid for 1 hour):\n\n${payload.resetLink}\n\nIf you did not request this, ignore this email.\n\n— E-Watu`,
          html: `<p>Hello,</p><p>Use the link below to reset your password (valid for 1 hour):</p><p><a href="${payload.resetLink}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p><p>— E-Watu</p>`,
        };
      default:
        return {
          subject: String(payload.subject ?? 'E-Watu notification'),
          text: String(payload.text ?? payload.body ?? ''),
          html: String(payload.html ?? `<p>${payload.body ?? ''}</p>`),
        };
    }
  }

  async send(to: string, template: EmailTemplate, payload: Record<string, unknown>) {
    const { subject, text, html } = this.render(template, payload);
    const from = this.fromAddress();

    if (this.resend) {
      const { error } = await this.resend.emails.send({ from, to, subject, text, html });
      if (error) {
        this.log.error(`[email failed via Resend] To: ${to} | ${subject} | ${error.message}`);
        throw new Error(`Resend send failed: ${error.message}`);
      }
      this.log.log(`[email sent via Resend] To: ${to} | ${subject}`);
      return { sent: true, mode: 'resend' as const };
    }

    const host = this.config.get<string>('SMTP_HOST');

    if (!host?.trim()) {
      this.log.log(`[email console] To: ${to} | ${subject}\n${text}`);
      return { sent: false, mode: 'console' as const };
    }

    const transporter = createTransport({
      host,
      port: Number(this.config.get('SMTP_PORT', 587)),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth:
        this.config.get('SMTP_USER') && this.config.get('SMTP_PASS')
          ? {
              user: this.config.get('SMTP_USER'),
              pass: this.config.get('SMTP_PASS'),
            }
          : undefined,
    });

    await transporter.sendMail({ from, to, subject, text, html });
    this.log.log(`[email sent] To: ${to} | ${subject}`);
    return { sent: true, mode: 'smtp' as const };
  }
}
