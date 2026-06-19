import { Module } from '@nestjs/common';
import { AuthApplicationModule } from '@application/auth/auth.application.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [AuthApplicationModule],
  controllers: [AuthController],
  providers: [JwtAuthGuard],
})
export class AuthPresentationModule {}
