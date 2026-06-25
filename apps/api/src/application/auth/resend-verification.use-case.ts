import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Email } from '../../domain/value-objects/email.vo';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { IEmailService, EMAIL_SERVICE } from './email.service.interface';

export interface ResendVerificationOutput {
  message: string;
}

// Generic response — never reveal whether an account exists or is already verified (prevents email enumeration).
const GENERIC_MESSAGE = 'If an unverified account exists for this email, a new verification link has been sent.';

@Injectable()
export class ResendVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  async execute(rawEmail: string): Promise<ResendVerificationOutput> {
    const email = Email.create(rawEmail);

    const user = await this.userRepo.findByEmail(email.value);

    // Silently no-op for unknown, deleted, or already-verified accounts.
    if (!user || user.deletedAt || user.emailVerified) {
      return { message: GENERIC_MESSAGE };
    }

    // Invalidate any outstanding tokens so only the newest link works.
    await this.tokenRepo.invalidateAllForUser(user.id);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.tokenRepo.create(user.id, tokenHash, expiresAt);

    // Fire-and-forget — email failure does not fail the request.
    this.emailService.sendVerificationEmail(user.email, rawToken).catch(() => {});

    return { message: GENERIC_MESSAGE };
  }
}
