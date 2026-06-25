import { Inject, Injectable } from '@nestjs/common';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { MarketplaceListing } from '../../domain/entities/marketplace-listing.entity';
import { ListingImage } from '../../domain/entities/listing-image.entity';
import { ForbiddenError, NotFoundError } from '../../domain/errors/app-error';

export interface GetListingInput {
  listingId: string;
  isVerifiedStudent: boolean;
}

@Injectable()
export class GetListingUseCase {
  constructor(
    @Inject(MARKETPLACE_LISTING_REPOSITORY) private readonly listingRepo: IMarketplaceListingRepository,
  ) {}

  async execute(input: GetListingInput): Promise<MarketplaceListing & { images: ListingImage[] }> {
    const listing = await this.listingRepo.findById(input.listingId);
    if (!listing) {
      throw new NotFoundError('LISTING_NOT_FOUND', 'Listing not found.');
    }
    if (listing.visibility === 'students_only' && !input.isVerifiedStudent) {
      throw new ForbiddenError('FORBIDDEN', 'This listing is only available to verified students.');
    }
    return listing;
  }
}
