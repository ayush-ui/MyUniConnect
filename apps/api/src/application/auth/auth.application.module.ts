import { Module } from '@nestjs/common';
import { AuthInfrastructureModule } from '../../infrastructure/auth.infrastructure.module';
import { RegisterUserUseCase } from './register-user.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';

@Module({
  imports: [AuthInfrastructureModule],
  providers: [RegisterUserUseCase, VerifyEmailUseCase],
  exports: [RegisterUserUseCase, VerifyEmailUseCase],
})
export class AuthApplicationModule {}
