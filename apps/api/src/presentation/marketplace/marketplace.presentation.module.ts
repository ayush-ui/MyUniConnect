import { Module } from '@nestjs/common';
import { MarketplaceApplicationModule } from '../../application/marketplace/marketplace.application.module';
import { MarketplaceController } from './marketplace.controller';
import { AuthInfrastructureModule } from '../../infrastructure/auth.infrastructure.module';

@Module({
  imports: [MarketplaceApplicationModule, AuthInfrastructureModule],
  controllers: [MarketplaceController],
})
export class MarketplacePresentationModule {}
