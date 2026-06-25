import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { ICategoryRepository, CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import { ItemCondition, ListingVisibility, MarketplaceListing } from '../../domain/entities/marketplace-listing.entity';
import { ListingImage } from '../../domain/entities/listing-image.entity';
import { AppError, NotFoundError, ValidationError } from '../../domain/errors/app-error';

const CreateListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  priceCents: z.number().int().min(0, 'Price cannot be negative').max(999900, 'Price exceeds maximum'),
  currency: z.literal('EUR'),
  categoryId: z.string().min(1),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
  visibility: z.enum(['students_only', 'public']),
  location: z.string().max(100).nullable().optional(),
  imageKeys: z.array(z.string()).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed'),
});

export interface CreateListingInput {
  callerId: string;
  title: string;
  description: string;
  priceCents: number;
  currency: 'EUR';
  categoryId: string;
  condition: ItemCondition;
  visibility: ListingVisibility;
  location?: string | null;
  imageKeys: string[];
}

@Injectable()
export class CreateListingUseCase {
  constructor(
    @Inject(MARKETPLACE_LISTING_REPOSITORY) private readonly listingRepo: IMarketplaceListingRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(input: CreateListingInput): Promise<MarketplaceListing & { images: ListingImage[] }> {
    const parsed = CreateListingSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    for (const key of input.imageKeys) {
      if (!key.startsWith(`uploads/${input.callerId}/`)) {
        throw new AppError('INVALID_IMAGE_KEY', `Image key does not belong to the caller: ${key}`, 400);
      }
    }

    const category = await this.categoryRepo.findById(input.categoryId);
    if (!category) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found.');
    }

    const activeCount = await this.listingRepo.countActiveListingsBySeller(input.callerId);
    if (activeCount >= 20) {
      throw new AppError('LISTING_LIMIT_REACHED', 'You have reached the maximum of 20 active listings.', 422);
    }

    return this.listingRepo.create({
      sellerId: input.callerId,
      categoryId: input.categoryId,
      title: input.title.trim(),
      description: input.description.trim(),
      priceCents: input.priceCents,
      currency: input.currency,
      condition: input.condition,
      visibility: input.visibility,
      location: input.location ?? null,
      imageKeys: input.imageKeys,
    });
  }
}
