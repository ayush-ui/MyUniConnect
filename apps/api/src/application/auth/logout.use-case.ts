import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository.interface';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.refreshTokenRepo.findValid(tokenHash);

    if (!stored) return;

    await this.refreshTokenRepo.revoke(stored.id);
  }
}
