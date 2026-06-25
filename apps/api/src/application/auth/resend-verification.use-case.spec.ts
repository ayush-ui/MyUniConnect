import { ResendVerificationUseCase } from './resend-verification.use-case';
import { EMAIL_SERVICE } from './email.service.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import { ValidationError } from '../../domain/errors/app-error';
import { Test } from '@nestjs/testing';

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
    findByEmail: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn(),
    markEmailVerified: jest.fn(),
    save: jest.fn(),
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
  return { userRepo, tokenRepo, emailService };
}

async function buildUseCase(overrides: Partial<ReturnType<typeof makeRepos>> = {}) {
  const repos = { ...makeRepos(), ...overrides };
  const module = await Test.createTestingModule({
    providers: [
      ResendVerificationUseCase,
      { provide: USER_REPOSITORY, useValue: repos.userRepo },
      { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useValue: repos.tokenRepo },
      { provide: EMAIL_SERVICE, useValue: repos.emailService },
    ],
  }).compile();
  return { useCase: module.get(ResendVerificationUseCase), ...repos };
}

describe('ResendVerificationUseCase', () => {
  it('invalidates old tokens, creates a new one, and sends an email for an unverified user', async () => {
    const { useCase, tokenRepo, emailService } = await buildUseCase();
    await useCase.execute('student@tu-ilmenau.de');
    expect(tokenRepo.invalidateAllForUser).toHaveBeenCalledWith('user-1');
    expect(tokenRepo.create).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('student@tu-ilmenau.de', expect.any(String));
  });

  it('returns the same generic message regardless of account state', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute('student@tu-ilmenau.de');
    expect(result.message).toMatch(/if an unverified account exists/i);
  });

  it('normalises email to lowercase before lookup', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute('STUDENT@TU-ILMENAU.DE');
    expect(userRepo.findByEmail).toHaveBeenCalledWith('student@tu-ilmenau.de');
  });

  it('does not create a token or send email when no account exists (no enumeration)', async () => {
    const { useCase, tokenRepo, emailService } = await buildUseCase({
      userRepo: { ...makeRepos().userRepo, findByEmail: jest.fn().mockResolvedValue(null) },
    });
    const result = await useCase.execute('nobody@tu-ilmenau.de');
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    expect(result.message).toMatch(/if an unverified account exists/i);
  });

  it('does not resend when the account is already verified', async () => {
    const { useCase, tokenRepo, emailService } = await buildUseCase({
      userRepo: {
        ...makeRepos().userRepo,
        findByEmail: jest.fn().mockResolvedValue({ ...mockUser, emailVerified: true }),
      },
    });
    await useCase.execute('student@tu-ilmenau.de');
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('does not resend for a soft-deleted account', async () => {
    const { useCase, emailService } = await buildUseCase({
      userRepo: {
        ...makeRepos().userRepo,
        findByEmail: jest.fn().mockResolvedValue({ ...mockUser, deletedAt: new Date() }),
      },
    });
    await useCase.execute('student@tu-ilmenau.de');
    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('does not fail if the email service throws', async () => {
    const { useCase } = await buildUseCase({
      emailService: { sendVerificationEmail: jest.fn().mockRejectedValue(new Error('send failed')) },
    });
    await expect(useCase.execute('student@tu-ilmenau.de')).resolves.toBeDefined();
  });

  it('throws ValidationError for an invalid email format', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute('not-an-email')).rejects.toBeInstanceOf(ValidationError);
  });
});
