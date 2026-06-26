import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository.interface';
import { ITokenService, TOKEN_SERVICE } from './token.service.interface';
import { UnauthorizedError } from '../../domain/errors/app-error';

export interface RefreshOutput {
  accessToken: string;
  refreshToken: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(rawToken: string | undefined): Promise<RefreshOutput> {
    if (!rawToken) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Refresh token is missing or invalid.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.refreshTokenRepo.findValid(tokenHash);

    if (!stored) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Refresh token is missing or invalid.');
    }

    const user = await this.userRepo.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Refresh token is missing or invalid.');
    }

    await this.refreshTokenRepo.revoke(stored.id);

    const payload = {
      sub: user.id,
      role: user.role,
      accountType: user.accountType,
      studentStatus: user.studentStatus,
      isVerifiedStudent: user.isVerifiedStudent,
    };
    const accessToken = this.tokenService.signAccessToken(payload);
    const newRefreshToken = this.tokenService.signRefreshToken(payload);

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    await this.refreshTokenRepo.create(user.id, newHash, expiresAt);

    return { accessToken, refreshToken: newRefreshToken };
  }
}
