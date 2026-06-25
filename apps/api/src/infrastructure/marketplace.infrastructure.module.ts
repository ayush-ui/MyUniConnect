import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PrismaMarketplaceListingRepository } from './repositories/prisma-marketplace-listing.repository';
import { PrismaCategoryRepository } from './repositories/prisma-category.repository';
import { S3StorageService } from './storage/s3-storage.service';
import { MARKETPLACE_LISTING_REPOSITORY } from '../domain/repositories/marketplace-listing.repository.interface';
import { CATEGORY_REPOSITORY } from '../domain/repositories/category.repository.interface';
import { STORAGE_SERVICE } from '../application/marketplace/storage.service.interface';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: MARKETPLACE_LISTING_REPOSITORY, useClass: PrismaMarketplaceListingRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    { provide: STORAGE_SERVICE, useClass: S3StorageService },
  ],
  exports: [MARKETPLACE_LISTING_REPOSITORY, CATEGORY_REPOSITORY, STORAGE_SERVICE],
})
export class MarketplaceInfrastructureModule {}
