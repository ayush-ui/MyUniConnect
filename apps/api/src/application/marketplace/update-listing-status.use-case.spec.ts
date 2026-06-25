import { Test } from '@nestjs/testing';
import { UpdateListingStatusUseCase } from './update-listing-status.use-case';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
  ListingWithImages,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { MarketplaceListing, ListingStatus } from '../../domain/entities/marketplace-listing.entity';
import { ForbiddenError, NotFoundError } from '../../domain/errors/app-error';

function makeListing(status: ListingStatus = 'active', sellerId = 'user-1'): ListingWithImages {
  return {
    id: 'listing-1',
    sellerId,
    categoryId: 'cat-1',
    title: 'Laptop',
    description: 'A laptop',
    priceCents: 50000,
    currency: 'EUR',
    condition: 'good',
    visibility: 'students_only',
    status,
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
    findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(makeListing()),
    findMany: jest.fn(),
    findBySellerId: jest.fn(),
    countActiveListingsBySeller: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn<Promise<MarketplaceListing>, any>().mockImplementation(
      async (_id, status) => ({ ...makeListing(status), images: undefined }),
    ),
  };
}

async function buildUseCase(repoOverride?: Partial<jest.Mocked<IMarketplaceListingRepository>>) {
  const repo = { ...makeRepo(), ...repoOverride };
  const module = await Test.createTestingModule({
    providers: [UpdateListingStatusUseCase, { provide: MARKETPLACE_LISTING_REPOSITORY, useValue: repo }],
  }).compile();
  return { useCase: module.get(UpdateListingStatusUseCase), repo };
}

describe('UpdateListingStatusUseCase', () => {
  it.each<[ListingStatus, ListingStatus]>([
    ['active', 'reserved'],
    ['active', 'sold'],
    ['active', 'deactivated'],
    ['reserved', 'active'],
    ['reserved', 'sold'],
    ['reserved', 'deactivated'],
    ['deactivated', 'active'],
  ])('allows %s → %s transition', async (from, to) => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(makeListing(from)),
    });
    const result = await useCase.execute({ callerId: 'user-1', listingId: 'listing-1', newStatus: to });
    expect(result.status).toBe(to);
  });

  it.each<[ListingStatus, ListingStatus]>([
    ['sold', 'active'],
    ['sold', 'reserved'],
    ['sold', 'deactivated'],
    ['active', 'active'],
  ])('rejects %s → %s transition', async (from, to) => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(makeListing(from)),
    });
    await expect(
      useCase.execute({ callerId: 'user-1', listingId: 'listing-1', newStatus: to }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }));
  });

  it('throws LISTING_NOT_FOUND when listing does not exist', async () => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(null),
    });
    await expect(useCase.execute({ callerId: 'user-1', listingId: 'nope', newStatus: 'sold' })).rejects.toThrow(NotFoundError);
  });

  it('throws FORBIDDEN when caller is not the owner', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ callerId: 'other', listingId: 'listing-1', newStatus: 'sold' })).rejects.toThrow(ForbiddenError);
  });
});
