import { Test } from '@nestjs/testing';
import { GetListingUseCase } from './get-listing.use-case';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
  ListingWithImages,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { ForbiddenError, NotFoundError } from '../../domain/errors/app-error';

function makeListing(visibility: 'students_only' | 'public' = 'students_only'): ListingWithImages {
  return {
    id: 'listing-1',
    sellerId: 'user-1',
    categoryId: 'cat-1',
    title: 'Laptop',
    description: 'Great laptop',
    priceCents: 50000,
    currency: 'EUR',
    condition: 'good',
    visibility,
    status: 'active',
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
    updateStatus: jest.fn(),
  };
}

async function buildUseCase(repoOverride?: Partial<jest.Mocked<IMarketplaceListingRepository>>) {
  const repo = { ...makeRepo(), ...repoOverride };
  const module = await Test.createTestingModule({
    providers: [GetListingUseCase, { provide: MARKETPLACE_LISTING_REPOSITORY, useValue: repo }],
  }).compile();
  return { useCase: module.get(GetListingUseCase), repo };
}

describe('GetListingUseCase', () => {
  it('returns a listing for a verified student', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute({ listingId: 'listing-1', isVerifiedStudent: true });
    expect(result.id).toBe('listing-1');
  });

  it('returns a public listing for an unauthenticated caller', async () => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(makeListing('public')),
    });
    const result = await useCase.execute({ listingId: 'listing-1', isVerifiedStudent: false });
    expect(result.id).toBe('listing-1');
  });

  it('throws FORBIDDEN when students_only listing is accessed by unauthenticated caller', async () => {
    const { useCase } = await buildUseCase();
    await expect(
      useCase.execute({ listingId: 'listing-1', isVerifiedStudent: false }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws LISTING_NOT_FOUND when listing does not exist', async () => {
    const { useCase } = await buildUseCase({
      findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(null),
    });
    await expect(
      useCase.execute({ listingId: 'listing-1', isVerifiedStudent: true }),
    ).rejects.toThrow(NotFoundError);
  });
});
