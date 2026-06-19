import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { LogoutUseCase } from './logout.use-case';
import { IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY, RefreshToken } from '../../domain/repositories/refresh-token.repository.interface';

const RAW_REFRESH_TOKEN = 'raw-refresh-token-logout';
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_REFRESH_TOKEN).digest('hex');

const mockStoredToken: RefreshToken = {
  id: 'rt-logout-1',
  userId: 'user-1',
  tokenHash: TOKEN_HASH,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  createdAt: new Date(),
};

function makeRepo(): jest.Mocked<IRefreshTokenRepository> {
  return {
    create: jest.fn(),
    findValid: jest.fn().mockResolvedValue(mockStoredToken),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn(),
  };
}

async function buildUseCase(repo: jest.Mocked<IRefreshTokenRepository> = makeRepo()) {
  const module = await Test.createTestingModule({
    providers: [
      LogoutUseCase,
      { provide: REFRESH_TOKEN_REPOSITORY, useValue: repo },
    ],
  }).compile();
  return { useCase: module.get(LogoutUseCase), repo };
}

describe('LogoutUseCase', () => {
  it('revokes the refresh token when it is valid', async () => {
    const { useCase, repo } = await buildUseCase();
    await useCase.execute(RAW_REFRESH_TOKEN);
    expect(repo.revoke).toHaveBeenCalledWith('rt-logout-1');
  });

  it('looks up the token by SHA-256 hash', async () => {
    const { useCase, repo } = await buildUseCase();
    await useCase.execute(RAW_REFRESH_TOKEN);
    expect(repo.findValid).toHaveBeenCalledWith(TOKEN_HASH);
  });

  it('succeeds silently when token is not found (idempotent)', async () => {
    const repo = makeRepo();
    repo.findValid.mockResolvedValue(null);
    const { useCase } = await buildUseCase(repo);
    await expect(useCase.execute(RAW_REFRESH_TOKEN)).resolves.toBeUndefined();
    expect(repo.revoke).not.toHaveBeenCalled();
  });

  it('succeeds silently when no refresh token is provided', async () => {
    const repo = makeRepo();
    repo.findValid.mockResolvedValue(null);
    const { useCase } = await buildUseCase(repo);
    await expect(useCase.execute(undefined)).resolves.toBeUndefined();
    expect(repo.revoke).not.toHaveBeenCalled();
  });

  it('returns void (no payload in response)', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(RAW_REFRESH_TOKEN);
    expect(result).toBeUndefined();
  });
});
