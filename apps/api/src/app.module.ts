import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthPresentationModule } from './presentation/auth/auth.presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthPresentationModule,
  ],
})
export class AppModule {}
