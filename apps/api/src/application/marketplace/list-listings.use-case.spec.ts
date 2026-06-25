import { Test } from '@nestjs/testing';
import { ListListingsUseCase } from './list-listings.use-case';
import { IMarketplaceListingRepository, MARKETPLACE_LISTING_REPOSITORY } from '../../domain/repositories/marketplace-listing.repository.interface';

function makeListing(overrides: Partial<{ id: string; visibility: string }> = {}) {
  return {
    id: overrides.id ?? 'listing-1',
    sellerId: 'user-1',
    categoryId: 'cat-1',
    title: 'Laptop',
    description: 'Good laptop',
    priceCents: 50000,
    currency: 'EUR',
    condition: 'good' as const,
    visibility: (overrides.visibility ?? 'students_only') as any,
    status: 'active' as const,
    location: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
  };
}

function makeRepo(): jest.Mocked<IMarketplaceListingRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn().mockResolvedValue({ data: [makeListing()], total: 1, page: 1, pageSize: 20 }),
    findBySellerId: jest.fn(),
    countActiveListingsBySeller: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };
}

async function buildUseCase(repoOverride?: Partial<IMarketplaceListingRepository>) {
  const repo = { ...makeRepo(), ...repoOverride };
  const module = await Test.createTestingModule({
    providers: [
      ListListingsUseCase,
      { provide: MARKETPLACE_LISTING_REPOSITORY, useValue: repo },
    ],
  }).compile();
  return { useCase: module.get(ListListingsUseCase), repo };
}

describe('ListListingsUseCase', () => {
  it('returns paginated listings', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute({ isVerifiedStudent: true });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('passes includeStudentsOnly=true when caller is a verified student', async () => {
    const { useCase, repo } = await buildUseCase();
    await useCase.execute({ isVerifiedStudent: true });
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ includeStudentsOnly: true }));
  });

  it('passes includeStudentsOnly=false when caller is unauthenticated', async () => {
    const { useCase, repo } = await buildUseCase();
    await useCase.execute({ isVerifiedStudent: false });
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ includeStudentsOnly: false }));
  });

  it('uses default pagination when not specified', async () => {
    const { useCase, repo } = await buildUseCase();
    await useCase.execute({ isVerifiedStudent: true });
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20, sortBy: 'newest' }));
  });

  it('caps pageSize at 50', async () => {
    const { useCase, repo } = await buildUseCase();
    await useCase.execute({ isVerifiedStudent: true, pageSize: 100 });
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 50 }));
  });

  it('forwards category, condition, price, and search filters', async () => {
    const { useCase, repo } = await buildUseCase();
    await useCase.execute({ isVerifiedStudent: true, categoryId: 'cat-1', condition: 'good', minPriceCents: 1000, maxPriceCents: 5000, search: 'laptop' });
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'cat-1', condition: 'good', minPriceCents: 1000, maxPriceCents: 5000, search: 'laptop' }));
  });
});
