import { RegisterUserUseCase, EMAIL_SERVICE } from './register-user.use-case';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { ConflictError, ValidationError } from '../../domain/errors/app-error';
import { Test } from '@nestjs/testing';

const mockUniversity = {
  id: 'uni-1',
  name: 'TU Ilmenau',
  emailDomain: 'tu-ilmenau.de',
  country: 'Germany',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: 'user-1',
  email: 'student@tu-ilmenau.de',
  passwordHash: 'hashed',
  firstName: 'Max',
  lastName: 'Muster',
  universityId: 'uni-1',
  emailVerified: false,
  emailVerifiedAt: null,
  role: 'student' as const,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepos() {
  const userRepo: jest.Mocked<IUserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(mockUser),
    markEmailVerified: jest.fn(),
    save: jest.fn(),
  };
  const universityRepo: jest.Mocked<IUniversityRepository> = {
    findByDomain: jest.fn().mockResolvedValue(mockUniversity),
    findAll: jest.fn(),
  };
  const tokenRepo: jest.Mocked<IEmailVerificationTokenRepository> = {
    create: jest.fn().mockResolvedValue({
      id: 'tok-1',
      userId: 'user-1',
      tokenHash: 'h',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
    }),
    findUnusedByHash: jest.fn(),
    findValidByUserId: jest.fn(),
    markUsed: jest.fn(),
    invalidateAllForUser: jest.fn(),
  };
  const emailService = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
  return { userRepo, universityRepo, tokenRepo, emailService };
}

async function buildUseCase(overrides: Partial<ReturnType<typeof makeRepos>> = {}) {
  const repos = { ...makeRepos(), ...overrides };
  const module = await Test.createTestingModule({
    providers: [
      RegisterUserUseCase,
      { provide: USER_REPOSITORY, useValue: repos.userRepo },
      { provide: UNIVERSITY_REPOSITORY, useValue: repos.universityRepo },
      { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useValue: repos.tokenRepo },
      { provide: EMAIL_SERVICE, useValue: repos.emailService },
    ],
  }).compile();
  return { useCase: module.get(RegisterUserUseCase), ...repos };
}

describe('RegisterUserUseCase', () => {
  const validInput = {
    email: 'student@tu-ilmenau.de',
    password: 'Secure!123',
    firstName: 'Max',
    lastName: 'Muster',
  };

  it('registers a new user and returns userId', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(validInput);
    expect(result.userId).toBe('user-1');
    expect(result.message).toContain('email');
  });

  it('normalises email to lowercase before storing', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute({ ...validInput, email: 'STUDENT@TU-ILMENAU.DE' });
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'student@tu-ilmenau.de' }),
    );
  });

  it('throws UNIVERSITY_NOT_SUPPORTED for unknown domain', async () => {
    const { useCase } = await buildUseCase({
      universityRepo: { findByDomain: jest.fn().mockResolvedValue(null), findAll: jest.fn() },
    });
    await expect(
      useCase.execute({ ...validInput, email: 'student@unknown.edu' }),
    ).rejects.toMatchObject({ code: 'UNIVERSITY_NOT_SUPPORTED' });
  });

  it('throws UNIVERSITY_NOT_SUPPORTED when university is inactive', async () => {
    const { useCase } = await buildUseCase({
      universityRepo: {
        findByDomain: jest.fn().mockResolvedValue({ ...mockUniversity, active: false }),
        findAll: jest.fn(),
      },
    });
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'UNIVERSITY_NOT_SUPPORTED' });
  });

  it('throws EMAIL_ALREADY_REGISTERED when email exists and is not soft-deleted', async () => {
    const { useCase } = await buildUseCase({
      userRepo: { ...makeRepos().userRepo, findByEmail: jest.fn().mockResolvedValue(mockUser) },
    });
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('allows re-registration when previous account was soft-deleted', async () => {
    const deletedUser = { ...mockUser, deletedAt: new Date() };
    const { useCase } = await buildUseCase({
      userRepo: { ...makeRepos().userRepo, findByEmail: jest.fn().mockResolvedValue(deletedUser) },
    });
    await expect(useCase.execute(validInput)).resolves.toBeDefined();
  });

  it('throws ValidationError for invalid email format', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, email: 'not-an-email' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('throws ValidationError for weak password', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, password: 'weak' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('creates a verification token after registration', async () => {
    const { useCase, tokenRepo } = await buildUseCase();
    await useCase.execute(validInput);
    expect(tokenRepo.create).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
  });

  it('does not fail if email service throws', async () => {
    const { useCase } = await buildUseCase({
      emailService: {
        sendVerificationEmail: jest.fn().mockRejectedValue(new Error('SMTP error')),
      },
    });
    await expect(useCase.execute(validInput)).resolves.toBeDefined();
  });
});
