import { Test } from '@nestjs/testing';
import { GetMeUseCase } from './get-me.use-case';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { NotFoundError } from '../../domain/errors/app-error';

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

async function buildUseCase(user: typeof mockUser | null = mockUser) {
  const repo: jest.Mocked<IUserRepository> = {
    findById: jest.fn().mockResolvedValue(user),
    findByEmail: jest.fn(),
    create: jest.fn(),
    markEmailVerified: jest.fn(),
    save: jest.fn(),
  };
  const module = await Test.createTestingModule({
    providers: [GetMeUseCase, { provide: USER_REPOSITORY, useValue: repo }],
  }).compile();
  return { useCase: module.get(GetMeUseCase), repo };
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
