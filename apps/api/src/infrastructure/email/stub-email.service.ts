import { Injectable, Logger } from '@nestjs/common';
import { IEmailService } from '../../application/auth/email.service.interface';

// TODO [DEBT-006]: Replace with real nodemailer/SES implementation before going to production
@Injectable()
export class StubEmailService implements IEmailService {
  private readonly logger = new Logger(StubEmailService.name);

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${process.env.APP_URL ?? 'http://localhost:3000'}/verify-email?token=${token}`;
    this.logger.log(`[STUB] Verification email → ${to}`);
    this.logger.log(`[STUB] Link: ${link}`);
  }
}
