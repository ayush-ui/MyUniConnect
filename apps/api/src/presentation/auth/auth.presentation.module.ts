import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthApplicationModule } from '@application/auth/auth.application.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailThrottlerGuard } from './guards/email-throttler.guard';

@Module({
  imports: [
    AuthApplicationModule,
    // Storage/config for the per-email throttler on resend-verification.
    // Default cap; the route overrides with its own @Throttle (3/hour).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard, EmailThrottlerGuard],
})
export class AuthPresentationModule {}
