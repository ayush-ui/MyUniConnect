import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
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
    @Inject(UNIVERSITY_REPOSITORY) private readonly universityRepo: IUniversityRepository,
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

    const user = await this.userRepo.findById(tokenRecord.userId);
    if (!user) {
      // Token pointed at a missing/deleted user — treat as verified (idempotent, no leak).
      return { message: 'Email verified successfully.' };
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();

    // Auto-promote a pending student whose email domain matches their selected
    // partner university. "Other"/mismatch students stay pending (await CMS approval).
    if (
      user.accountType === 'student' &&
      user.studentStatus === 'pending' &&
      user.universityId
    ) {
      const university = await this.universityRepo.findById(user.universityId);
      if (university && university.active && user.email.split('@')[1] === university.emailDomain) {
        user.studentStatus = 'verified';
        user.isVerifiedStudent = true;
      }
    }

    await this.userRepo.save(user);

    return { message: 'Email verified successfully.' };
  }
}
