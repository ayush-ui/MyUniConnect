import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { z } from 'zod';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository.interface';
import { ITokenService, TOKEN_SERVICE } from './token.service.interface';
import { UnauthorizedError, ValidationError } from '../../domain/errors/app-error';

const LoginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const parsed = LoginSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const email = input.email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(email);

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedError('EMAIL_NOT_VERIFIED', 'Please verify your email before logging in.');
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      accountType: user.accountType,
      studentStatus: user.studentStatus,
      isVerifiedStudent: user.isVerifiedStudent,
    };
    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    await this.refreshTokenRepo.create(user.id, tokenHash, expiresAt);

    return { accessToken, refreshToken };
  }
}
