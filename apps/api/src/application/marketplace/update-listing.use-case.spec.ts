import { Test } from '@nestjs/testing';
import { UpdateListingUseCase } from './update-listing.use-case';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
  ListingWithImages,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { ForbiddenError, NotFoundError } from '../../domain/errors/app-error';

function makeListing(overrides: Partial<{ status: string; sellerId: string }> = {}): ListingWithImages {
  return {
    id: 'listing-1',
    sellerId: overrides.sellerId ?? 'user-1',
    categoryId: 'cat-1',
    title: 'Old Title',
    description: 'Old description that is long enough.',
    priceCents: 50000,
    currency: 'EUR',
    condition: 'good',
    visibility: 'students_only',
    status: (overrides.status ?? 'active') as any,
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
    update: jest.fn<Promise<ListingWithImages>, any>().mockResolvedValue({ ...makeListing(), title: 'New Title' }),
    updateStatus: jest.fn(),
  };
}

async function buildUseCase(repoOverride?: Partial<jest.Mocked<IMarketplaceListingRepository>>) {
  const repo = { ...makeRepo(), ...repoOverride };
  const module = await Test.createTestingModule({
    providers: [UpdateListingUseCase, { provide: MARKETPLACE_LISTING_REPOSITORY, useValue: repo }],
  }).compile();
  return { useCase: module.get(UpdateListingUseCase), repo };
}

describe('UpdateListingUseCase', () => {
  it('updates and returns the listing', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute({ callerId: 'user-1', listingId: 'listing-1', title: 'New Title' });
    expect(result.title).toBe('New Title');
  });

  it('throws LISTING_NOT_FOUND when listing does not exist', async () => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(null),
    });
    await expect(useCase.execute({ callerId: 'user-1', listingId: 'nope' })).rejects.toThrow(NotFoundError);
  });

  it('throws FORBIDDEN when caller is not the owner', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ callerId: 'other-user', listingId: 'listing-1' })).rejects.toThrow(ForbiddenError);
  });

  it('throws LISTING_NOT_EDITABLE for a sold listing', async () => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(makeListing({ status: 'sold' })),
    });
    await expect(useCase.execute({ callerId: 'user-1', listingId: 'listing-1', title: 'New' })).rejects.toThrow(
      expect.objectContaining({ code: 'LISTING_NOT_EDITABLE' }),
    );
  });

  it('throws LISTING_NOT_EDITABLE for a deactivated listing', async () => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(makeListing({ status: 'deactivated' })),
    });
    await expect(useCase.execute({ callerId: 'user-1', listingId: 'listing-1', title: 'New' })).rejects.toThrow(
      expect.objectContaining({ code: 'LISTING_NOT_EDITABLE' }),
    );
  });
});
