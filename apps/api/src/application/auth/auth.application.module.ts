import { Module } from '@nestjs/common';
import { AuthInfrastructureModule } from '../../infrastructure/auth.infrastructure.module';
import { RegisterUserUseCase } from './register-user.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { LoginUseCase } from './login.use-case';

@Module({
  imports: [AuthInfrastructureModule],
  providers: [RegisterUserUseCase, VerifyEmailUseCase, LoginUseCase],
  exports: [RegisterUserUseCase, VerifyEmailUseCase, LoginUseCase],
})
export class AuthApplicationModule {}
