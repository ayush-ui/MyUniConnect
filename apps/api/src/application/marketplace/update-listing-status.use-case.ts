import { Inject, Injectable } from '@nestjs/common';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import {
  MarketplaceListing,
  ListingStatus,
  VALID_STATUS_TRANSITIONS,
} from '../../domain/entities/marketplace-listing.entity';
import { AppError, ForbiddenError, NotFoundError } from '../../domain/errors/app-error';

export interface UpdateListingStatusInput {
  callerId: string;
  listingId: string;
  newStatus: ListingStatus;
}

@Injectable()
export class UpdateListingStatusUseCase {
  constructor(
    @Inject(MARKETPLACE_LISTING_REPOSITORY) private readonly listingRepo: IMarketplaceListingRepository,
  ) {}

  async execute(input: UpdateListingStatusInput): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findById(input.listingId);
    if (!listing) throw new NotFoundError('LISTING_NOT_FOUND', 'Listing not found.');
    if (listing.sellerId !== input.callerId) throw new ForbiddenError('FORBIDDEN', 'You do not own this listing.');

    const allowed = VALID_STATUS_TRANSITIONS[listing.status];
    if (!allowed.includes(input.newStatus)) {
      throw new AppError(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition from '${listing.status}' to '${input.newStatus}'.`,
        422,
      );
    }

    return this.listingRepo.updateStatus(input.listingId, input.newStatus);
  }
}
