import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { z } from 'zod';
import { Email } from '../../domain/value-objects/email.vo';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import {
  IStudentVerificationRequestRepository,
  STUDENT_VERIFICATION_REQUEST_REPOSITORY,
} from '../../domain/repositories/student-verification-request.repository.interface';
import { AppError, ConflictError, ValidationError } from '../../domain/errors/app-error';
import { AccountType, StudentStatus } from '../../domain/entities/user.entity';
import { IEmailService, EMAIL_SERVICE } from './email.service.interface';

const RegisterSchema = z.object({
  email: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  accountType: z.enum(['student', 'non_student']),
  universityId: z.string().uuid().optional().nullable(),
  claimedUniversityName: z.string().min(1).max(200).optional().nullable(),
});

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accountType: AccountType;
  universityId?: string | null;
  claimedUniversityName?: string | null;
}

export interface RegisterUserOutput {
  userId: string;
  accountType: AccountType;
  studentStatus: StudentStatus;
  message: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(UNIVERSITY_REPOSITORY) private readonly universityRepo: IUniversityRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    @Inject(STUDENT_VERIFICATION_REQUEST_REPOSITORY)
    private readonly verificationRequestRepo: IStudentVerificationRequestRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const parsed = RegisterSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.errors[0];
      // A malformed accountType is a distinct, actionable error for the client.
      if (issue.path[0] === 'accountType') {
        throw new AppError('INVALID_ACCOUNT_TYPE', 'accountType must be "student" or "non_student".', 422);
      }
      throw new ValidationError(issue.message);
    }

    const email = Email.create(input.email);

    const existing = await this.userRepo.findByEmail(email.value);
    if (existing && !existing.deletedAt) {
      throw new ConflictError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    // Resolve account state. Domain is never a registration blocker in v2 —
    // posting is gated later by isVerifiedStudent, not at signup.
    let universityId: string | null = null;
    let studentStatus: StudentStatus = 'none';
    let claimedUniversityName: string | null = null;
    // Verification request details to create *after* the user row exists.
    let pendingRequest: { claimedUniversityName: string; emailDomain: string } | null = null;

    if (input.accountType === 'student') {
      studentStatus = 'pending';

      if (input.universityId) {
        const university = await this.universityRepo.findById(input.universityId);
        if (!university || !university.active) {
          throw new AppError('INVALID_UNIVERSITY', 'The selected university is not available.', 422);
        }
        universityId = university.id;
        // Domain mismatch → cannot auto-verify; queue for manual review.
        if (email.domain !== university.emailDomain) {
          pendingRequest = { claimedUniversityName: university.name, emailDomain: email.domain };
        }
        // Domain match → stays pending; promoted to verified on email confirmation (UC-1.2).
      } else {
        // "Other (Not listed)" path — free-text university, manual approval.
        const claimed = input.claimedUniversityName?.trim();
        if (!claimed) {
          throw new AppError(
            'UNIVERSITY_NAME_REQUIRED',
            'Please select your university or tell us which one you attend.',
            422,
          );
        }
        claimedUniversityName = claimed;
        pendingRequest = { claimedUniversityName: claimed, emailDomain: email.domain };
      }
    }

    const user = await this.userRepo.create({
      email: email.value,
      passwordHash,
      firstName,
      lastName,
      universityId,
      accountType: input.accountType,
      studentStatus,
      claimedUniversityName,
    });

    if (pendingRequest) {
      await this.verificationRequestRepo.create({
        userId: user.id,
        claimedUniversityName: pendingRequest.claimedUniversityName,
        emailDomain: pendingRequest.emailDomain,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    // SHA-256 (not bcrypt) so the hash is deterministic and lookup-able by value
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.tokenRepo.create(user.id, tokenHash, expiresAt);

    // Fire-and-forget — email failure does not fail registration
    this.emailService.sendVerificationEmail(user.email, rawToken).catch(() => {});

    return {
      userId: user.id,
      accountType: user.accountType,
      studentStatus: user.studentStatus,
      message: 'Check your email to verify your account.',
    };
  }
}
