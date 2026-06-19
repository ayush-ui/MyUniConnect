import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { AppError } from '../../domain/errors/app-error';

export interface VerifyEmailOutput {
  message: string;
}

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(rawToken: string): Promise<VerifyEmailOutput> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenRecord = await this.tokenRepo.findUnusedByHash(tokenHash);
    if (!tokenRecord) {
      throw new AppError(
        'INVALID_OR_EXPIRED_TOKEN',
        'This verification link is invalid or has expired.',
        400,
      );
    }

    await this.tokenRepo.markUsed(tokenRecord.id);
    await this.userRepo.markEmailVerified(tokenRecord.userId);

    return { message: 'Email verified successfully.' };
  }
}
