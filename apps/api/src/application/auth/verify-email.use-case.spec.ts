import { Test } from '@nestjs/testing';
import { VerifyEmailUseCase } from './verify-email.use-case';
import {
  IEmailVerificationTokenRepository,
  EmailVerificationToken,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import { AppError } from '../../domain/errors/app-error';
import { User } from '../../domain/entities/user.entity';

const VALID_RAW_TOKEN = 'a'.repeat(64); // 64-char hex string (32 bytes)

const mockUniversity = {
  id: 'uni-1',
  name: 'TU Ilmenau',
  emailDomain: 'tu-ilmenau.de',
  country: 'Germany',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'student@tu-ilmenau.de',
  passwordHash: 'hashed',
  firstName: 'Max',
  lastName: 'Muster',
  universityId: 'uni-1',
  emailVerified: false,
  emailVerifiedAt: null,
  accountType: 'student',
  studentStatus: 'pending',
  isVerifiedStudent: false,
  claimedUniversityName: null,
  role: 'student',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeToken = (overrides: Partial<EmailVerificationToken> = {}): EmailVerificationToken => ({
  id: 'tok-1',
  userId: 'user-1',
  tokenHash: 'irrelevant-in-unit-test',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  usedAt: null,
  createdAt: new Date(),
  ...overrides,
});

function makeRepos(opts: { token?: EmailVerificationToken | null; user?: User | null } = {}) {
  const tokenRepo: jest.Mocked<IEmailVerificationTokenRepository> = {
    create: jest.fn(),
    findUnusedByHash: jest.fn().mockResolvedValue(opts.token === undefined ? makeToken() : opts.token),
    findValidByUserId: jest.fn(),
    markUsed: jest.fn().mockResolvedValue(undefined),
    invalidateAllForUser: jest.fn(),
  };
  const userRepo: jest.Mocked<IUserRepository> = {
    findById: jest.fn().mockResolvedValue(opts.user === undefined ? makeUser() : opts.user),
    findByEmail: jest.fn(),
    create: jest.fn(),
    markEmailVerified: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
  };
  const universityRepo: jest.Mocked<IUniversityRepository> = {
    findById: jest.fn().mockResolvedValue(mockUniversity),
    findByDomain: jest.fn(),
    findAll: jest.fn(),
  };
  return { tokenRepo, userRepo, universityRepo };
}

async function buildUseCase(opts: { token?: EmailVerificationToken | null; user?: User | null } = {}) {
  const repos = makeRepos(opts);
  const module = await Test.createTestingModule({
    providers: [
      VerifyEmailUseCase,
      { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useValue: repos.tokenRepo },
      { provide: USER_REPOSITORY, useValue: repos.userRepo },
      { provide: UNIVERSITY_REPOSITORY, useValue: repos.universityRepo },
    ],
  }).compile();
  return { useCase: module.get(VerifyEmailUseCase), ...repos };
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

  it('marks the user email as verified via save', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute(VALID_RAW_TOKEN);
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', emailVerified: true }),
    );
  });

  it('promotes a pending partner-domain student to verified', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute(VALID_RAW_TOKEN);
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ studentStatus: 'verified', isVerifiedStudent: true }),
    );
  });

  it('does NOT promote when the email domain does not match the partner university', async () => {
    const { useCase, userRepo } = await buildUseCase({
      user: makeUser({ email: 'student@gmail.com' }),
    });
    await useCase.execute(VALID_RAW_TOKEN);
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ studentStatus: 'pending', isVerifiedStudent: false, emailVerified: true }),
    );
  });

  it('does NOT promote a non-student account', async () => {
    const { useCase, userRepo } = await buildUseCase({
      user: makeUser({ accountType: 'non_student', studentStatus: 'none', universityId: null }),
    });
    await useCase.execute(VALID_RAW_TOKEN);
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ accountType: 'non_student', isVerifiedStudent: false }),
    );
  });

  it('looks up token by SHA-256 hash of the raw token', async () => {
    const { useCase, tokenRepo } = await buildUseCase();
    await useCase.execute(VALID_RAW_TOKEN);
    const calledWith = tokenRepo.findUnusedByHash.mock.calls[0][0];
    expect(calledWith).not.toBe(VALID_RAW_TOKEN);
    expect(calledWith).toHaveLength(64);
  });

  it('throws INVALID_OR_EXPIRED_TOKEN when token is not found', async () => {
    const { useCase } = await buildUseCase({ token: null });
    await expect(useCase.execute(VALID_RAW_TOKEN)).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
      statusCode: 400,
    });
  });

  it('throws INVALID_OR_EXPIRED_TOKEN when token is expired (repo returns null for expired)', async () => {
    const { useCase } = await buildUseCase({ token: null });
    await expect(useCase.execute('expired-token')).rejects.toBeInstanceOf(AppError);
  });

  it('does not save the user when token is invalid', async () => {
    const { useCase, userRepo } = await buildUseCase({ token: null });
    await expect(useCase.execute(VALID_RAW_TOKEN)).rejects.toThrow();
    expect(userRepo.save).not.toHaveBeenCalled();
  });
});
