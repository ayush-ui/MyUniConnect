import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { RefreshAccessTokenUseCase } from './refresh-token.use-case';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY, RefreshToken } from '../../domain/repositories/refresh-token.repository.interface';
import { ITokenService, TOKEN_SERVICE } from './token.service.interface';
import { UnauthorizedError } from '../../domain/errors/app-error';

const RAW_REFRESH_TOKEN = 'raw-refresh-token-string';
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_REFRESH_TOKEN).digest('hex');

const mockStoredToken: RefreshToken = {
  id: 'rt-1',
  userId: 'user-1',
  tokenHash: TOKEN_HASH,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  createdAt: new Date(),
};

const mockUser = {
  id: 'user-1',
  email: 'student@tu-ilmenau.de',
  passwordHash: 'hashed',
  firstName: 'Max',
  lastName: 'Muster',
  universityId: 'uni-1',
  emailVerified: true,
  emailVerifiedAt: new Date(),
  role: 'student' as const,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepos() {
  const refreshTokenRepo: jest.Mocked<IRefreshTokenRepository> = {
    create: jest.fn().mockResolvedValue({ ...mockStoredToken, id: 'rt-2' }),
    findValid: jest.fn().mockResolvedValue(mockStoredToken),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  };
  const userRepo: jest.Mocked<IUserRepository> = {
    findById: jest.fn().mockResolvedValue(mockUser),
    findByEmail: jest.fn(),
    create: jest.fn(),
    markEmailVerified: jest.fn(),
    save: jest.fn(),
  };
  const tokenService: jest.Mocked<ITokenService> = {
    signAccessToken: jest.fn().mockReturnValue('new-access-token'),
    signRefreshToken: jest.fn().mockReturnValue('new-refresh-token'),
    verifyAccessToken: jest.fn(),
  };
  return { refreshTokenRepo, userRepo, tokenService };
}

async function buildUseCase(overrides: Partial<ReturnType<typeof makeRepos>> = {}) {
  const repos = { ...makeRepos(), ...overrides };
  const module = await Test.createTestingModule({
    providers: [
      RefreshAccessTokenUseCase,
      { provide: REFRESH_TOKEN_REPOSITORY, useValue: repos.refreshTokenRepo },
      { provide: USER_REPOSITORY, useValue: repos.userRepo },
      { provide: TOKEN_SERVICE, useValue: repos.tokenService },
    ],
  }).compile();
  return { useCase: module.get(RefreshAccessTokenUseCase), ...repos };
}

describe('RefreshAccessTokenUseCase', () => {
  it('returns new accessToken and refreshToken for a valid refresh token', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(RAW_REFRESH_TOKEN);
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
  });

  it('looks up the token by SHA-256 hash', async () => {
    const { useCase, refreshTokenRepo } = await buildUseCase();
    await useCase.execute(RAW_REFRESH_TOKEN);
    expect(refreshTokenRepo.findValid).toHaveBeenCalledWith(TOKEN_HASH);
  });

  it('revokes the old token before issuing new one', async () => {
    const revokeOrder: string[] = [];
    const { refreshTokenRepo, tokenService, userRepo } = makeRepos();
    refreshTokenRepo.revoke.mockImplementation(async () => { revokeOrder.push('revoke'); });
    tokenService.signAccessToken.mockImplementation(() => { revokeOrder.push('sign'); return 'tok'; });
    const module = await Test.createTestingModule({
      providers: [
        RefreshAccessTokenUseCase,
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: refreshTokenRepo },
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: TOKEN_SERVICE, useValue: tokenService },
      ],
    }).compile();
    await module.get(RefreshAccessTokenUseCase).execute(RAW_REFRESH_TOKEN);
    expect(revokeOrder[0]).toBe('revoke');
    expect(revokeOrder[1]).toBe('sign');
  });

  it('fetches the user to get role for new token payload', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute(RAW_REFRESH_TOKEN);
    expect(userRepo.findById).toHaveBeenCalledWith('user-1');
  });

  it('signs new access token with correct sub and role', async () => {
    const { useCase, tokenService } = await buildUseCase();
    await useCase.execute(RAW_REFRESH_TOKEN);
    expect(tokenService.signAccessToken).toHaveBeenCalledWith({ sub: 'user-1', role: 'student' });
  });

  it('stores new refresh token hash (not raw token) in repository', async () => {
    const { useCase, refreshTokenRepo } = await buildUseCase();
    await useCase.execute(RAW_REFRESH_TOKEN);
    const storedHash: string = refreshTokenRepo.create.mock.calls[0][1];
    expect(storedHash).not.toBe('new-refresh-token');
    expect(storedHash).toHaveLength(64); // SHA-256 hex
  });

  it('sets new refresh token expiry to ~7 days from now', async () => {
    const { useCase, refreshTokenRepo } = await buildUseCase();
    const before = Date.now();
    await useCase.execute(RAW_REFRESH_TOKEN);
    const after = Date.now();
    const expiresAt: Date = refreshTokenRepo.create.mock.calls[0][2];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it('throws INVALID_REFRESH_TOKEN when token is not found in repository', async () => {
    const { useCase } = await buildUseCase({
      refreshTokenRepo: { ...makeRepos().refreshTokenRepo, findValid: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(RAW_REFRESH_TOKEN)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    await expect(useCase.execute(RAW_REFRESH_TOKEN)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws INVALID_REFRESH_TOKEN when raw token is empty string', async () => {
    const { useCase } = await buildUseCase({
      refreshTokenRepo: { ...makeRepos().refreshTokenRepo, findValid: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute('')).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  });

  it('throws INVALID_REFRESH_TOKEN when user no longer exists', async () => {
    const { useCase } = await buildUseCase({
      userRepo: { ...makeRepos().userRepo, findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(RAW_REFRESH_TOKEN)).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  });
});
