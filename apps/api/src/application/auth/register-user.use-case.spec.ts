import { RegisterUserUseCase } from './register-user.use-case';
import { EMAIL_SERVICE } from './email.service.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import {
  IEmailVerificationTokenRepository,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/email-verification-token.repository.interface';
import {
  IStudentVerificationRequestRepository,
  STUDENT_VERIFICATION_REQUEST_REPOSITORY,
} from '../../domain/repositories/student-verification-request.repository.interface';
import { ConflictError, ValidationError } from '../../domain/errors/app-error';
import { Test } from '@nestjs/testing';

const mockUniversity = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'TU Ilmenau',
  emailDomain: 'tu-ilmenau.de',
  country: 'Germany',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepos() {
  const userRepo: jest.Mocked<IUserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
    // Echo the create payload so output reflects the resolved account state.
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'user-1',
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        universityId: data.universityId,
        emailVerified: false,
        emailVerifiedAt: null,
        accountType: data.accountType,
        studentStatus: data.studentStatus,
        isVerifiedStudent: false,
        claimedUniversityName: data.claimedUniversityName ?? null,
        role: 'student' as const,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    markEmailVerified: jest.fn(),
    save: jest.fn(),
  };
  const universityRepo: jest.Mocked<IUniversityRepository> = {
    findById: jest.fn().mockResolvedValue(mockUniversity),
    findByDomain: jest.fn().mockResolvedValue(mockUniversity),
    findAll: jest.fn().mockResolvedValue([mockUniversity]),
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
  const verificationRequestRepo: jest.Mocked<IStudentVerificationRequestRepository> = {
    create: jest.fn().mockResolvedValue({
      id: 'req-1',
      userId: 'user-1',
      claimedUniversityName: 'Some Uni',
      emailDomain: 'example.com',
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      decisionNote: null,
      createdAt: new Date(),
    }),
  };
  const emailService = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
  return { userRepo, universityRepo, tokenRepo, verificationRequestRepo, emailService };
}

async function buildUseCase(overrides: Partial<ReturnType<typeof makeRepos>> = {}) {
  const repos = { ...makeRepos(), ...overrides };
  const module = await Test.createTestingModule({
    providers: [
      RegisterUserUseCase,
      { provide: USER_REPOSITORY, useValue: repos.userRepo },
      { provide: UNIVERSITY_REPOSITORY, useValue: repos.universityRepo },
      { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useValue: repos.tokenRepo },
      { provide: STUDENT_VERIFICATION_REQUEST_REPOSITORY, useValue: repos.verificationRequestRepo },
      { provide: EMAIL_SERVICE, useValue: repos.emailService },
    ],
  }).compile();
  return { useCase: module.get(RegisterUserUseCase), ...repos };
}

describe('RegisterUserUseCase', () => {
  const partnerStudent = {
    email: 'student@tu-ilmenau.de',
    password: 'Secure!123',
    firstName: 'Max',
    lastName: 'Muster',
    accountType: 'student' as const,
    universityId: mockUniversity.id,
  };

  it('registers a partner-university student as pending (auto-verifies later on email confirm)', async () => {
    const { useCase, userRepo, verificationRequestRepo } = await buildUseCase();
    const result = await useCase.execute(partnerStudent);

    expect(result.userId).toBe('user-1');
    expect(result.accountType).toBe('student');
    expect(result.studentStatus).toBe('pending');
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        universityId: mockUniversity.id,
        accountType: 'student',
        studentStatus: 'pending',
      }),
    );
    // Domain matches → no manual-review request.
    expect(verificationRequestRepo.create).not.toHaveBeenCalled();
  });

  it('registers a non-student with no university and status none', async () => {
    const { useCase, userRepo, verificationRequestRepo } = await buildUseCase();
    const result = await useCase.execute({
      email: 'visitor@gmail.com',
      password: 'Secure!123',
      firstName: 'Vera',
      lastName: 'Visitor',
      accountType: 'non_student',
    });

    expect(result.accountType).toBe('non_student');
    expect(result.studentStatus).toBe('none');
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ accountType: 'non_student', studentStatus: 'none', universityId: null }),
    );
    expect(verificationRequestRepo.create).not.toHaveBeenCalled();
  });

  it('creates a verification request when a partner student\'s email domain does NOT match', async () => {
    const { useCase, verificationRequestRepo } = await buildUseCase();
    await useCase.execute({ ...partnerStudent, email: 'student@gmail.com' });

    expect(verificationRequestRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      claimedUniversityName: 'TU Ilmenau',
      emailDomain: 'gmail.com',
    });
  });

  it('registers an "Other" student (free-text university) as pending + creates a verification request', async () => {
    const { useCase, userRepo, verificationRequestRepo } = await buildUseCase();
    const result = await useCase.execute({
      email: 'student@some-other-uni.edu',
      password: 'Secure!123',
      firstName: 'Otto',
      lastName: 'Other',
      accountType: 'student',
      claimedUniversityName: 'Some Other University',
    });

    expect(result.studentStatus).toBe('pending');
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        universityId: null,
        accountType: 'student',
        studentStatus: 'pending',
        claimedUniversityName: 'Some Other University',
      }),
    );
    expect(verificationRequestRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      claimedUniversityName: 'Some Other University',
      emailDomain: 'some-other-uni.edu',
    });
  });

  it('throws UNIVERSITY_NAME_REQUIRED when a student provides neither a university nor a name', async () => {
    const { useCase } = await buildUseCase();
    await expect(
      useCase.execute({
        email: 'student@some-uni.edu',
        password: 'Secure!123',
        firstName: 'Max',
        lastName: 'Muster',
        accountType: 'student',
      }),
    ).rejects.toMatchObject({ code: 'UNIVERSITY_NAME_REQUIRED' });
  });

  it('throws INVALID_UNIVERSITY when the selected university id does not exist', async () => {
    const { useCase } = await buildUseCase({
      universityRepo: {
        findById: jest.fn().mockResolvedValue(null),
        findByDomain: jest.fn(),
        findAll: jest.fn(),
      },
    });
    await expect(useCase.execute(partnerStudent)).rejects.toMatchObject({ code: 'INVALID_UNIVERSITY' });
  });

  it('throws INVALID_ACCOUNT_TYPE for an unknown account type', async () => {
    const { useCase } = await buildUseCase();
    await expect(
      useCase.execute({ ...partnerStudent, accountType: 'teacher' as any }),
    ).rejects.toMatchObject({ code: 'INVALID_ACCOUNT_TYPE' });
  });

  it('no longer rejects unknown email domains (UNIVERSITY_NOT_SUPPORTED is gone)', async () => {
    const { useCase } = await buildUseCase();
    await expect(
      useCase.execute({
        email: 'someone@unknown.edu',
        password: 'Secure!123',
        firstName: 'No',
        lastName: 'Body',
        accountType: 'non_student',
      }),
    ).resolves.toBeDefined();
  });

  it('normalises email to lowercase before storing', async () => {
    const { useCase, userRepo } = await buildUseCase();
    await useCase.execute({ ...partnerStudent, email: 'STUDENT@TU-ILMENAU.DE' });
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'student@tu-ilmenau.de' }),
    );
  });

  it('throws EMAIL_ALREADY_REGISTERED when email exists and is not soft-deleted', async () => {
    const existing = { id: 'existing', deletedAt: null } as any;
    const { useCase } = await buildUseCase({
      userRepo: { ...makeRepos().userRepo, findByEmail: jest.fn().mockResolvedValue(existing) },
    });
    await expect(useCase.execute(partnerStudent)).rejects.toBeInstanceOf(ConflictError);
  });

  it('allows re-registration when previous account was soft-deleted', async () => {
    const deletedUser = { id: 'old', deletedAt: new Date() } as any;
    const { useCase } = await buildUseCase({
      userRepo: { ...makeRepos().userRepo, findByEmail: jest.fn().mockResolvedValue(deletedUser) },
    });
    await expect(useCase.execute(partnerStudent)).resolves.toBeDefined();
  });

  it('throws ValidationError for invalid email format', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...partnerStudent, email: 'not-an-email' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('throws ValidationError for weak password', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...partnerStudent, password: 'weak' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('creates a verification token after registration', async () => {
    const { useCase, tokenRepo } = await buildUseCase();
    await useCase.execute(partnerStudent);
    expect(tokenRepo.create).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
  });

  it('does not fail if email service throws', async () => {
    const { useCase } = await buildUseCase({
      emailService: {
        sendVerificationEmail: jest.fn().mockRejectedValue(new Error('SMTP error')),
      },
    });
    await expect(useCase.execute(partnerStudent)).resolves.toBeDefined();
  });
});
