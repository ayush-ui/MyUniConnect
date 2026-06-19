import { Module } from '@nestjs/common';
import { AuthInfrastructureModule } from '../../infrastructure/auth.infrastructure.module';
import { RegisterUserUseCase } from './register-user.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { LoginUseCase } from './login.use-case';
import { RefreshAccessTokenUseCase } from './refresh-token.use-case';
import { LogoutUseCase } from './logout.use-case';
import { GetMeUseCase } from './get-me.use-case';
@Module({
  imports: [AuthInfrastructureModule],
  providers: [RegisterUserUseCase, VerifyEmailUseCase, LoginUseCase, RefreshAccessTokenUseCase, LogoutUseCase, GetMeUseCase],
  exports: [RegisterUserUseCase, VerifyEmailUseCase, LoginUseCase, RefreshAccessTokenUseCase, LogoutUseCase, GetMeUseCase, AuthInfrastructureModule],
})
export class AuthApplicationModule {}
