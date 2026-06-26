import { Module } from '@nestjs/common';
import { AuthInfrastructureModule } from '../../infrastructure/auth.infrastructure.module';
import { RegisterUserUseCase } from './register-user.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { LoginUseCase } from './login.use-case';
import { RefreshAccessTokenUseCase } from './refresh-token.use-case';
import { LogoutUseCase } from './logout.use-case';
import { GetMeUseCase } from './get-me.use-case';
import { ResendVerificationUseCase } from './resend-verification.use-case';
import { ListUniversitiesUseCase } from './list-universities.use-case';
@Module({
  imports: [AuthInfrastructureModule],
  providers: [RegisterUserUseCase, VerifyEmailUseCase, LoginUseCase, RefreshAccessTokenUseCase, LogoutUseCase, GetMeUseCase, ResendVerificationUseCase, ListUniversitiesUseCase],
  exports: [RegisterUserUseCase, VerifyEmailUseCase, LoginUseCase, RefreshAccessTokenUseCase, LogoutUseCase, GetMeUseCase, ResendVerificationUseCase, ListUniversitiesUseCase, AuthInfrastructureModule],
})
export class AuthApplicationModule {}
