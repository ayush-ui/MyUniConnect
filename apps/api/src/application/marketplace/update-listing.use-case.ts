import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { MarketplaceListing } from '../../domain/entities/marketplace-listing.entity';
import { ListingImage } from '../../domain/entities/listing-image.entity';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/app-error';

const NON_EDITABLE_STATUSES = ['sold', 'deactivated'] as const;

const UpdateListingSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  priceCents: z.number().int().min(0).max(999900).optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  visibility: z.enum(['students_only', 'public']).optional(),
  location: z.string().max(100).nullable().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export interface UpdateListingInput {
  callerId: string;
  listingId: string;
  title?: string;
  description?: string;
  priceCents?: number;
  condition?: MarketplaceListing['condition'];
  visibility?: MarketplaceListing['visibility'];
  location?: string | null;
}

@Injectable()
export class UpdateListingUseCase {
  constructor(
    @Inject(MARKETPLACE_LISTING_REPOSITORY) private readonly listingRepo: IMarketplaceListingRepository,
  ) {}

  async execute(input: UpdateListingInput): Promise<MarketplaceListing & { images: ListingImage[] }> {
    const listing = await this.listingRepo.findById(input.listingId);
    if (!listing) throw new NotFoundError('LISTING_NOT_FOUND', 'Listing not found.');
    if (listing.sellerId !== input.callerId) throw new ForbiddenError('FORBIDDEN', 'You do not own this listing.');
    if ((NON_EDITABLE_STATUSES as readonly string[]).includes(listing.status)) {
      throw new AppError('LISTING_NOT_EDITABLE', `A listing with status '${listing.status}' cannot be edited.`, 422);
    }

    const { callerId, listingId, ...fields } = input;
    const parsed = UpdateListingSchema.safeParse(fields);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

    return this.listingRepo.update(input.listingId, fields);
  }
}
