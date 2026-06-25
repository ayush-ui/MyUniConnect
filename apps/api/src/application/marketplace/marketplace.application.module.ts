import { Module } from '@nestjs/common';
import { MarketplaceInfrastructureModule } from '../../infrastructure/marketplace.infrastructure.module';
import { CreateListingUseCase } from './create-listing.use-case';
import { GetPresignedUploadUrlUseCase } from './get-presigned-upload-url.use-case';
import { ListListingsUseCase } from './list-listings.use-case';
import { GetListingUseCase } from './get-listing.use-case';
import { UpdateListingUseCase } from './update-listing.use-case';
import { UpdateListingStatusUseCase } from './update-listing-status.use-case';
import { GetMyListingsUseCase } from './get-my-listings.use-case';
import { GetCategoriesUseCase } from './get-categories.use-case';

const USE_CASES = [
  CreateListingUseCase,
  GetPresignedUploadUrlUseCase,
  ListListingsUseCase,
  GetListingUseCase,
  UpdateListingUseCase,
  UpdateListingStatusUseCase,
  GetMyListingsUseCase,
  GetCategoriesUseCase,
];

@Module({
  imports: [MarketplaceInfrastructureModule],
  providers: USE_CASES,
  exports: [...USE_CASES, MarketplaceInfrastructureModule],
})
export class MarketplaceApplicationModule {}
