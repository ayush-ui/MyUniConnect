import { Inject, Injectable } from '@nestjs/common';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { MarketplaceListing } from '../../domain/entities/marketplace-listing.entity';
import { ListingImage } from '../../domain/entities/listing-image.entity';

export interface GetMyListingsInput {
  callerId: string;
}

@Injectable()
export class GetMyListingsUseCase {
  constructor(
    @Inject(MARKETPLACE_LISTING_REPOSITORY) private readonly listingRepo: IMarketplaceListingRepository,
  ) {}

  async execute(input: GetMyListingsInput): Promise<(MarketplaceListing & { images: ListingImage[] })[]> {
    return this.listingRepo.findBySellerId(input.callerId);
  }
}
