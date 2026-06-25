import { Test } from '@nestjs/testing';
import { CreateListingUseCase } from './create-listing.use-case';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
  ListingWithImages,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { ICategoryRepository, CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import { ValidationError } from '../../domain/errors/app-error';

const mockCategory = { id: 'cat-1', name: 'Electronics', slug: 'electronics', createdAt: new Date() };

const mockListing: ListingWithImages = {
  id: 'listing-1',
  sellerId: 'user-1',
  categoryId: 'cat-1',
  title: 'Used Laptop',
  description: 'Good condition laptop for studying.',
  priceCents: 50000,
  currency: 'EUR',
  condition: 'good',
  visibility: 'students_only',
  status: 'active',
  location: 'Ilmenau',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
};

const validInput = {
  callerId: 'user-1',
  title: 'Used Laptop',
  description: 'Good condition laptop for studying.',
  priceCents: 50000,
  currency: 'EUR' as const,
  categoryId: 'cat-1',
  condition: 'good' as const,
  visibility: 'students_only' as const,
  location: 'Ilmenau',
  imageKeys: ['uploads/user-1/abc.jpg'],
};

function makeListingRepo(): jest.Mocked<IMarketplaceListingRepository> {
  return {
    create: jest.fn<Promise<ListingWithImages>, any>().mockResolvedValue(mockListing),
    findById: jest.fn<Promise<ListingWithImages | null>, any>().mockResolvedValue(null),
    findMany: jest.fn(),
    findBySellerId: jest.fn(),
    countActiveListingsBySeller: jest.fn<Promise<number>, any>().mockResolvedValue(0),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };
}

function makeCategoryRepo(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn().mockResolvedValue(mockCategory),
    findAll: jest.fn(),
  };
}

async function buildUseCase(
  listingOverride?: Partial<jest.Mocked<IMarketplaceListingRepository>>,
  categoryOverride?: Partial<jest.Mocked<ICategoryRepository>>,
) {
  const listingRepo = { ...makeListingRepo(), ...listingOverride };
  const categoryRepo = { ...makeCategoryRepo(), ...categoryOverride };
  const module = await Test.createTestingModule({
    providers: [
      CreateListingUseCase,
      { provide: MARKETPLACE_LISTING_REPOSITORY, useValue: listingRepo },
      { provide: CATEGORY_REPOSITORY, useValue: categoryRepo },
    ],
  }).compile();
  return { useCase: module.get(CreateListingUseCase), listingRepo, categoryRepo };
}

describe('CreateListingUseCase', () => {
  it('creates a listing and returns it', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(validInput);
    expect(result.id).toBe('listing-1');
    expect(result.status).toBe('active');
  });

  it('throws VALIDATION_ERROR when title is too short', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, title: 'AB' })).rejects.toThrow(ValidationError);
  });

  it('throws VALIDATION_ERROR when description is too short', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, description: 'Short' })).rejects.toThrow(ValidationError);
  });

  it('throws VALIDATION_ERROR when priceCents is negative', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, priceCents: -1 })).rejects.toThrow(ValidationError);
  });

  it('throws VALIDATION_ERROR when priceCents exceeds maximum', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, priceCents: 1000001 })).rejects.toThrow(ValidationError);
  });

  it('throws VALIDATION_ERROR when imageKeys is empty', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, imageKeys: [] })).rejects.toThrow(ValidationError);
  });

  it('throws VALIDATION_ERROR when imageKeys exceeds 10', async () => {
    const { useCase } = await buildUseCase();
    const keys = Array.from({ length: 11 }, (_, i) => `uploads/user-1/${i}.jpg`);
    await expect(useCase.execute({ ...validInput, imageKeys: keys })).rejects.toThrow(ValidationError);
  });

  it('throws CATEGORY_NOT_FOUND when category does not exist', async () => {
    const { useCase } = await buildUseCase({ countActiveListingsBySeller: jest.fn<Promise<number>, any>().mockResolvedValue(0) }, { findById: jest.fn().mockResolvedValue(null) });
    await expect(useCase.execute(validInput)).rejects.toThrow(
      expect.objectContaining({ code: 'CATEGORY_NOT_FOUND' }),
    );
  });

  it('throws LISTING_LIMIT_REACHED when seller has 20 active listings', async () => {
    const { useCase } = await buildUseCase({ countActiveListingsBySeller: jest.fn<Promise<number>, any>().mockResolvedValue(20) });
    await expect(useCase.execute(validInput)).rejects.toThrow(
      expect.objectContaining({ code: 'LISTING_LIMIT_REACHED' }),
    );
  });

  it('throws INVALID_IMAGE_KEY when an image key does not belong to the caller', async () => {
    const { useCase } = await buildUseCase();
    await expect(
      useCase.execute({ ...validInput, imageKeys: ['uploads/other-user/file.jpg'] }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_IMAGE_KEY' }));
  });

  it('allows priceCents = 0 (free item)', async () => {
    const { useCase } = await buildUseCase();
    await expect(useCase.execute({ ...validInput, priceCents: 0 })).resolves.toBeDefined();
  });
});
