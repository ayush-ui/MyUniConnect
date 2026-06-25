import { Test } from '@nestjs/testing';
import { GetMyListingsUseCase } from './get-my-listings.use-case';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
  ListingWithImages,
} from '../../domain/repositories/marketplace-listing.repository.interface';

const listing: ListingWithImages = {
  id: 'listing-1',
  sellerId: 'user-1',
  categoryId: 'cat-1',
  title: 'Laptop',
  description: 'Good laptop',
  priceCents: 50000,
  currency: 'EUR',
  condition: 'good',
  visibility: 'students_only',
  status: 'active',
  location: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
};

function makeRepo(): jest.Mocked<IMarketplaceListingRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    findBySellerId: jest.fn<Promise<ListingWithImages[]>, any>().mockResolvedValue([listing]),
    countActiveListingsBySeller: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };
}

async function buildUseCase(repoOverride?: Partial<jest.Mocked<IMarketplaceListingRepository>>) {
  const repo = { ...makeRepo(), ...repoOverride };
  const module = await Test.createTestingModule({
    providers: [GetMyListingsUseCase, { provide: MARKETPLACE_LISTING_REPOSITORY, useValue: repo }],
  }).compile();
  return { useCase: module.get(GetMyListingsUseCase), repo };
}

describe('GetMyListingsUseCase', () => {
  it('returns all listings belonging to the caller', async () => {
    const { useCase, repo } = await buildUseCase();
    const result = await useCase.execute({ callerId: 'user-1' });
    expect(result).toHaveLength(1);
    expect(repo.findBySellerId).toHaveBeenCalledWith('user-1');
  });

  it('returns an empty array when caller has no listings', async () => {
    const { useCase } = await buildUseCase({
      findBySellerId: jest.fn<Promise<ListingWithImages[]>, any>().mockResolvedValue([]),
    });
    const result = await useCase.execute({ callerId: 'user-1' });
    expect(result).toEqual([]);
  });
});
