import { Test } from '@nestjs/testing';
import { VerifyEmailUseCase } from './verify-email.use-case';
import {
  IEmailVerificationTokenRepository,
  EmailVerificationToken,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { AppError } from '../../domain/errors/app-error';

const VALID_RAW_TOKEN = 'a'.repeat(64); // 64-char hex string (32 bytes)

const makeToken = (overrides: Partial<EmailVerificationToken> = {}): EmailVerificationToken => ({
  id: 'tok-1',
  userId: 'user-1',
  tokenHash: 'irrelevant-in-unit-test',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  usedAt: null,
  createdAt: new Date(),
  ...overrides,
});

function makeRepos(tokenOverride?: EmailVerificationToken | null) {
  const tokenRepo: jest.Mocked<IEmailVerificationTokenRepository> = {
    create: jest.fn(),
    findUnusedByHash: jest.fn().mockResolvedValue(tokenOverride === undefined ? makeToken() : tokenOverride),
    findValidByUserId: jest.fn(),
    markUsed: jest.fn().mockResolvedValue(undefined),
    invalidateAllForUser: jest.fn(),
  };
  const userRepo: jest.Mocked<IUserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    markEmailVerified: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(),
  };
  return { tokenRepo, userRepo };
}

async function buildUseCase(tokenOverride?: EmailVerificationToken | null) {
  const { tokenRepo, userRepo } = makeRepos(tokenOverride);
  const module = await Test.createTestingModule({
    providers: [
      VerifyEmailUseCase,
      { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useValue: tokenRepo },
      { provide: USER_REPOSITORY, useValue: userRepo },
    ],
  }).compile();
  return { useCase: module.get(VerifyEmailUseCase), tokenRepo, userRepo };
}

describe('VerifyEmailUseCase', () => {
  it('returns success message for a valid token', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(VALID_RAW_TOKEN);
    expect(result.message).toBeDefined();
  });

  it('marks the token as used', async () => {
    const { useCase, tokenRepo } = await buildUseCase();
    await useCase.execute(VALID_RAW_TOKEN);
    expect(tokenRepo.markUsed).toHaveBeenCalledWith('tok-1');
  });

  it('marks the user email as verified', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute(VALID_RAW_TOKEN);
    expect(userRepo.markEmailVerified).toHaveBeenCalledWith('user-1');
  });

  it('looks up token by SHA-256 hash of the raw token', async () => {
    const { useCase, tokenRepo } = await buildUseCase();
    await useCase.execute(VALID_RAW_TOKEN);
    // The repo should have been called with the SHA-256 hash, not the raw token
    const calledWith = tokenRepo.findUnusedByHash.mock.calls[0][0];
    expect(calledWith).not.toBe(VALID_RAW_TOKEN);
    expect(calledWith).toHaveLength(64); // SHA-256 hex is 64 chars
  });

  it('throws INVALID_OR_EXPIRED_TOKEN when token is not found', async () => {
    const { useCase } = await buildUseCase(null);
    await expect(useCase.execute(VALID_RAW_TOKEN)).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
      statusCode: 400,
    });
  });

  it('throws INVALID_OR_EXPIRED_TOKEN when token is expired (repo returns null for expired)', async () => {
    // findUnusedByHash already filters expiry; returning null covers this case
    const { useCase } = await buildUseCase(null);
    await expect(useCase.execute('expired-token')).rejects.toBeInstanceOf(AppError);
  });

  it('does not call markEmailVerified when token is invalid', async () => {
    const { useCase, userRepo } = await buildUseCase(null);
    await expect(useCase.execute(VALID_RAW_TOKEN)).rejects.toThrow();
    expect(userRepo.markEmailVerified).not.toHaveBeenCalled();
  });

  it('is idempotent: already-verified user still marks token used and returns success', async () => {
    // The use case doesn't know if the user is already verified —
    // markEmailVerified is a no-op in that state at the DB level.
    // Here we verify the use case still completes without error.
    const { useCase, userRepo } = await buildUseCase();
    await expect(useCase.execute(VALID_RAW_TOKEN)).resolves.toBeDefined();
    expect(userRepo.markEmailVerified).toHaveBeenCalledTimes(1);
  });
});
