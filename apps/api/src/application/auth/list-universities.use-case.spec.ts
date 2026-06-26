import { Test } from '@nestjs/testing';
import { ListUniversitiesUseCase } from './list-universities.use-case';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';

const uni = (id: string, name: string) => ({
  id,
  name,
  emailDomain: `${name.toLowerCase().replace(/\s/g, '')}.edu`,
  country: 'Germany',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function buildUseCase(rows: ReturnType<typeof uni>[]) {
  const repo: jest.Mocked<IUniversityRepository> = {
    findById: jest.fn(),
    findByDomain: jest.fn(),
    findAll: jest.fn().mockResolvedValue(rows),
  };
  const module = await Test.createTestingModule({
    providers: [ListUniversitiesUseCase, { provide: UNIVERSITY_REPOSITORY, useValue: repo }],
  }).compile();
  return { useCase: module.get(ListUniversitiesUseCase), repo };
}

describe('ListUniversitiesUseCase', () => {
  it('returns only id and name (no domain/country)', async () => {
    const { useCase } = await buildUseCase([uni('1', 'TU Ilmenau')]);
    const result = await useCase.execute();
    expect(result).toEqual([{ id: '1', name: 'TU Ilmenau' }]);
  });

  it('returns the list sorted alphabetically by name', async () => {
    const { useCase } = await buildUseCase([
      uni('1', 'Zeppelin University'),
      uni('2', 'Aachen University'),
      uni('3', 'Munich University'),
    ]);
    const result = await useCase.execute();
    expect(result.map((u) => u.name)).toEqual([
      'Aachen University',
      'Munich University',
      'Zeppelin University',
    ]);
  });

  it('returns an empty array when there are no partner universities', async () => {
    const { useCase } = await buildUseCase([]);
    expect(await useCase.execute()).toEqual([]);
  });
});
