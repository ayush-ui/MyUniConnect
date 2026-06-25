import { Inject, Injectable } from '@nestjs/common';
import {
  IMarketplaceListingRepository,
  MARKETPLACE_LISTING_REPOSITORY,
  ListingsPage,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { ItemCondition } from '../../domain/entities/marketplace-listing.entity';

export interface ListListingsInput {
  isVerifiedStudent: boolean;
  categoryId?: string;
  condition?: ItemCondition;
  minPriceCents?: number;
  maxPriceCents?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

@Injectable()
export class ListListingsUseCase {
  constructor(
    @Inject(MARKETPLACE_LISTING_REPOSITORY) private readonly listingRepo: IMarketplaceListingRepository,
  ) {}

  async execute(input: ListListingsInput): Promise<ListingsPage> {
    return this.listingRepo.findMany({
      includeStudentsOnly: input.isVerifiedStudent,
      categoryId: input.categoryId,
      condition: input.condition,
      minPriceCents: input.minPriceCents,
      maxPriceCents: input.maxPriceCents,
      search: input.search,
      page: input.page ?? 1,
      pageSize: Math.min(input.pageSize ?? 20, 50),
      sortBy: input.sortBy ?? 'newest',
    });
  }
}
