import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IEmailService } from '../../application/auth/email.service.interface';

@Injectable()
export class ResendEmailService implements IEmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly client: Resend;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = config.getOrThrow<string>('EMAIL_FROM');
    this.appUrl = config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/verify-email?token=${token}`;

    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject: 'Verify your MyUniConnect email',
      html: this.buildVerificationHtml(link),
      text: `Welcome to MyUniConnect!\n\nVerify your email by opening this link:\n${link}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    });

    if (error) {
      // Surface the failure so the caller (fire-and-forget) can log it; do not leak to the user.
      this.logger.error(`Failed to send verification email to ${to}: ${error.message}`);
      throw new Error(`Resend send failed: ${error.message}`);
    }

    this.logger.log(`Verification email sent to ${to}`);
  }

  private buildVerificationHtml(link: string): string {
    return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Welcome to MyUniConnect</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4b5563;">
                  Confirm your university email address to activate your account.
                </p>
                <a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">
                  Verify email
                </a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#9ca3af;">
                  This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;word-break:break-all;">
                  Or paste this link into your browser:<br />${link}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
