import { Test } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository.interface';
import { ITokenService, TOKEN_SERVICE } from './token.service.interface';
import { UnauthorizedError } from '../../domain/errors/app-error';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'student@tu-ilmenau.de',
  passwordHash: bcrypt.hashSync('Secure!123', 1),
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
  const userRepo: jest.Mocked<IUserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn(),
    markEmailVerified: jest.fn(),
    save: jest.fn(),
  };
  const refreshTokenRepo: jest.Mocked<IRefreshTokenRepository> = {
    create: jest.fn().mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      createdAt: new Date(),
    }),
    findValid: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
  };
  const tokenService: jest.Mocked<ITokenService> = {
    signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
    signRefreshToken: jest.fn().mockReturnValue('raw-refresh-token'),
    verifyAccessToken: jest.fn(),
  };
  return { userRepo, refreshTokenRepo, tokenService };
}

async function buildUseCase(overrides: Partial<ReturnType<typeof makeRepos>> = {}) {
  const repos = { ...makeRepos(), ...overrides };
  const module = await Test.createTestingModule({
    providers: [
      LoginUseCase,
      { provide: USER_REPOSITORY, useValue: repos.userRepo },
      { provide: REFRESH_TOKEN_REPOSITORY, useValue: repos.refreshTokenRepo },
      { provide: TOKEN_SERVICE, useValue: repos.tokenService },
    ],
  }).compile();
  return { useCase: module.get(LoginUseCase), ...repos };
}

describe('LoginUseCase', () => {
  const validInput = { email: 'student@tu-ilmenau.de', password: 'Secure!123' };

  it('returns accessToken and refreshToken for valid credentials', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(validInput);
    expect(result.accessToken).toBe('access.jwt.token');
    expect(result.refreshToken).toBe('raw-refresh-token');
  });

  it('throws INVALID_CREDENTIALS when user not found', async () => {
    const { useCase } = await buildUseCase({
      userRepo: { ...makeRepos().userRepo, findByEmail: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('throws INVALID_CREDENTIALS when user is soft-deleted', async () => {
    const { useCase } = await buildUseCase({
      userRepo: {
        ...makeRepos().userRepo,
        findByEmail: jest.fn().mockResolvedValue({ ...mockUser, deletedAt: new Date() }),
      },
    });
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('throws EMAIL_NOT_VERIFIED when emailVerified is false', async () => {
    const { useCase } = await buildUseCase({
      userRepo: {
        ...makeRepos().userRepo,
        findByEmail: jest.fn().mockResolvedValue({ ...mockUser, emailVerified: false }),
      },
    });
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws INVALID_CREDENTIALS when password does not match', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, password: 'WrongPass!1' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('stores a hashed refresh token in the repository', async () => {
    const { useCase, refreshTokenRepo } = await buildUseCase();
    await useCase.execute(validInput);
    expect(refreshTokenRepo.create).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
      expect.any(Date),
    );
    const storedHash: string = refreshTokenRepo.create.mock.calls[0][1];
    expect(storedHash).not.toBe('raw-refresh-token');
    expect(storedHash).toHaveLength(64); // SHA-256 hex
  });

  it('signs the access token with correct sub and role', async () => {
    const { useCase, tokenService } = await buildUseCase();
    await useCase.execute(validInput);
    expect(tokenService.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: 'student',
    });
  });

  it('sets refresh token expiry to ~7 days from now', async () => {
    const { useCase, refreshTokenRepo } = await buildUseCase();
    const before = Date.now();
    await useCase.execute(validInput);
    const after = Date.now();
    const expiresAt: Date = refreshTokenRepo.create.mock.calls[0][2];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it('normalises email to lowercase before lookup', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute({ ...validInput, email: 'STUDENT@TU-ILMENAU.DE' });
    expect(userRepo.findByEmail).toHaveBeenCalledWith('student@tu-ilmenau.de');
  });

  it('throws ValidationError when email is missing', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ email: '', password: 'Secure!123' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws ValidationError when password is missing', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ email: 'student@tu-ilmenau.de', password: '' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
