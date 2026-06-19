import { Module } from '@nestjs/common';
import { AuthApplicationModule } from '@application/auth/auth.application.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [AuthApplicationModule],
  controllers: [AuthController],
})
export class AuthPresentationModule {}
