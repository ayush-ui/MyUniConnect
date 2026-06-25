import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateListingUseCase } from './create-listing.use-case';
import { PrismaMarketplaceListingRepository } from '../../infrastructure/repositories/prisma-marketplace-listing.repository';
import { PrismaCategoryRepository } from '../../infrastructure/repositories/prisma-category.repository';
import { MARKETPLACE_LISTING_REPOSITORY } from '../../domain/repositories/marketplace-listing.repository.interface';
import { CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import { AppError, ValidationError } from '../../domain/errors/app-error';

// Requires: docker compose up -d postgres_test
const TEST_DB_URL = process.env.DATABASE_URL;

describe('CreateListingUseCase (integration)', () => {
  let prisma: PrismaClient;
  let useCase: CreateListingUseCase;
  let userId: string;
  let categoryId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();

    const module = await Test.createTestingModule({
      providers: [
        CreateListingUseCase,
        PrismaService,
        { provide: MARKETPLACE_LISTING_REPOSITORY, useClass: PrismaMarketplaceListingRepository },
        { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    useCase = module.get(CreateListingUseCase);

    const uni = await prisma.university.upsert({
      where: { emailDomain: 'marketplace-integration.de' },
      update: {},
      create: { name: 'Marketplace Test Uni', emailDomain: 'marketplace-integration.de', country: 'DE', active: true },
    });

    const user = await prisma.user.create({
      data: {
        email: `seller-${Date.now()}@marketplace-integration.de`,
        passwordHash: 'hash',
        firstName: 'Seller',
        lastName: 'Test',
        universityId: uni.id,
        emailVerified: true,
      },
    });
    userId = user.id;

    const category = await prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: { name: 'Electronics', slug: 'electronics' },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await prisma.marketplaceListing.deleteMany({ where: { sellerId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('persists a listing with images', async () => {
    const result = await useCase.execute({
      callerId: userId,
      title: 'Integration Test Laptop',
      description: 'A real laptop for integration testing purposes.',
      priceCents: 60000,
      currency: 'EUR',
      categoryId,
      condition: 'good',
      visibility: 'students_only',
      location: 'Ilmenau',
      imageKeys: [`uploads/${userId}/img1.jpg`],
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe('Integration Test Laptop');
    expect(result.images).toHaveLength(1);
    expect(result.images[0].s3Key).toBe(`uploads/${userId}/img1.jpg`);

    const fromDb = await prisma.marketplaceListing.findUnique({
      where: { id: result.id },
      include: { images: true },
    });
    expect(fromDb).not.toBeNull();
    expect(fromDb!.images).toHaveLength(1);
  });

  it('enforces the 20-listing limit', async () => {
    const bulkData = Array.from({ length: 20 }, (_, i) => ({
      sellerId: userId,
      categoryId,
      title: `Listing ${i}`,
      description: 'Filler listing for limit test.',
      priceCents: 100,
      currency: 'EUR',
      condition: 'good' as const,
      visibility: 'students_only' as const,
      status: 'active' as const,
    }));

    const created = await prisma.marketplaceListing.createMany({ data: bulkData });

    await expect(
      useCase.execute({
        callerId: userId,
        title: 'One Too Many',
        description: 'This should be rejected by the limit guard.',
        priceCents: 100,
        currency: 'EUR',
        categoryId,
        condition: 'good',
        visibility: 'students_only',
        imageKeys: [`uploads/${userId}/extra.jpg`],
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'LISTING_LIMIT_REACHED' }));

    // Clean up bulk listings
    await prisma.marketplaceListing.deleteMany({
      where: { sellerId: userId, title: { startsWith: 'Listing ' } },
    });
  });

  it('throws CATEGORY_NOT_FOUND for a non-existent category', async () => {
    await expect(
      useCase.execute({
        callerId: userId,
        title: 'Invalid Category Test',
        description: 'Testing category not found error path.',
        priceCents: 100,
        currency: 'EUR',
        categoryId: '00000000-0000-0000-0000-000000000000',
        condition: 'good',
        visibility: 'students_only',
        imageKeys: [`uploads/${userId}/img.jpg`],
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'CATEGORY_NOT_FOUND' }));
  });
});
