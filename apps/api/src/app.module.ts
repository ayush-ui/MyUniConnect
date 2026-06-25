import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthPresentationModule } from './presentation/auth/auth.presentation.module';
import { MarketplacePresentationModule } from './presentation/marketplace/marketplace.presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthPresentationModule,
    MarketplacePresentationModule,
  ],
})
export class AppModule {}
