import { GetCategoriesUseCase } from './get-categories.use-case';
import { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { Category } from '../../domain/entities/category.entity';

const mockCategoryRepo: jest.Mocked<ICategoryRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
};

describe('GetCategoriesUseCase', () => {
  let useCase: GetCategoriesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetCategoriesUseCase(mockCategoryRepo);
  });

  it('returns all categories from the repository', async () => {
    const cats: Category[] = [
      { id: 'cat-1', name: 'Electronics', slug: 'electronics', createdAt: new Date() },
      { id: 'cat-2', name: 'Books & Study Materials', slug: 'books-study', createdAt: new Date() },
    ];
    mockCategoryRepo.findAll.mockResolvedValue(cats);

    const result = await useCase.execute();

    expect(result).toEqual(cats);
    expect(mockCategoryRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no categories exist', async () => {
    mockCategoryRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
