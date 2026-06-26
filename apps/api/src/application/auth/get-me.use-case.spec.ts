import { Test } from '@nestjs/testing';
import { GetMeUseCase } from './get-me.use-case';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import { NotFoundError } from '../../domain/errors/app-error';

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
  universityId: 'uni-1' as string | null,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  accountType: 'student' as const,
  studentStatus: 'verified' as const,
  isVerifiedStudent: true,
  claimedUniversityName: null,
  role: 'student' as const,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function buildUseCase(user: typeof mockUser | null = mockUser) {
  const repo: jest.Mocked<IUserRepository> = {
    findById: jest.fn().mockResolvedValue(user),
    findByEmail: jest.fn(),
    create: jest.fn(),
    markEmailVerified: jest.fn(),
    save: jest.fn(),
  };
  const universityRepo: jest.Mocked<IUniversityRepository> = {
    findById: jest.fn().mockResolvedValue(mockUniversity),
    findByDomain: jest.fn(),
    findAll: jest.fn(),
  };
  const module = await Test.createTestingModule({
    providers: [
      GetMeUseCase,
      { provide: USER_REPOSITORY, useValue: repo },
      { provide: UNIVERSITY_REPOSITORY, useValue: universityRepo },
    ],
  }).compile();
  return { useCase: module.get(GetMeUseCase), repo, universityRepo };
}

describe('GetMeUseCase', () => {
  it('returns user profile for a known userId', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute('user-1');
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('student@tu-ilmenau.de');
    expect(result.firstName).toBe('Max');
    expect(result.lastName).toBe('Muster');
    expect(result.role).toBe('student');
  });

  it('exposes the identity v2 fields', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute('user-1');
    expect(result.accountType).toBe('student');
    expect(result.studentStatus).toBe('verified');
    expect(result.isVerifiedStudent).toBe(true);
    expect(result.university).toEqual({ id: 'uni-1', name: 'TU Ilmenau' });
  });

  it('returns null university for an account with no university', async () => {
    const { useCase } = await buildUseCase({ ...mockUser, universityId: null });
    const result = await useCase.execute('user-1');
    expect(result.university).toBeNull();
  });

  it('does not expose passwordHash in the output', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute('user-1');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NOT_FOUND when user does not exist', async () => {
    const { useCase } = await buildUseCase(null);
    await expect(useCase.execute('ghost-id')).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute('ghost-id')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});
