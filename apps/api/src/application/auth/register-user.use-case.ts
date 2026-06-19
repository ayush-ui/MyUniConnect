import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { z } from 'zod';
import { Email } from '../../domain/value-objects/email.vo';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { AppError, ConflictError, ValidationError } from '../../domain/errors/app-error';

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
});

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterUserOutput {
  userId: string;
  message: string;
}

export interface IEmailService {
  sendVerificationEmail(to: string, token: string): Promise<void>;
}

export const EMAIL_SERVICE = Symbol('IEmailService');

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(UNIVERSITY_REPOSITORY) private readonly universityRepo: IUniversityRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const parsed = RegisterSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const email = Email.create(input.email);

    const university = await this.universityRepo.findByDomain(email.domain);
    if (!university || !university.active) {
      throw new AppError('UNIVERSITY_NOT_SUPPORTED', 'This university email domain is not supported.', 422);
    }

    const existing = await this.userRepo.findByEmail(email.value);
    if (existing && !existing.deletedAt) {
      throw new ConflictError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.userRepo.create({
      email: email.value,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      universityId: university.id,
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.tokenRepo.create(user.id, tokenHash, expiresAt);

    // Fire-and-forget — email failure does not fail registration
    this.emailService.sendVerificationEmail(user.email, rawToken).catch(() => {});

    return { userId: user.id, message: 'Check your email to verify your account.' };
  }
}
