import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from './database/database.module';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { PrismaUniversityRepository } from './repositories/prisma-university.repository';
import { PrismaEmailVerificationTokenRepository } from './repositories/prisma-email-verification-token.repository';
import { PrismaRefreshTokenRepository } from './repositories/prisma-refresh-token.repository';
import { ResendEmailService } from './email/resend-email.service';
import { NestTokenService } from './jwt/nest-token.service';
import { USER_REPOSITORY } from '../domain/repositories/user.repository.interface';
import { UNIVERSITY_REPOSITORY } from '../domain/repositories/university.repository.interface';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from '../domain/repositories/email-verification-token.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '../domain/repositories/refresh-token.repository.interface';
import { EMAIL_SERVICE } from '../application/auth/email.service.interface';
import { TOKEN_SERVICE } from '../application/auth/token.service.interface';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: UNIVERSITY_REPOSITORY, useClass: PrismaUniversityRepository },
    { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useClass: PrismaEmailVerificationTokenRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: EMAIL_SERVICE, useClass: ResendEmailService },
    { provide: TOKEN_SERVICE, useClass: NestTokenService },
  ],
  exports: [USER_REPOSITORY, UNIVERSITY_REPOSITORY, EMAIL_VERIFICATION_TOKEN_REPOSITORY, REFRESH_TOKEN_REPOSITORY, EMAIL_SERVICE, TOKEN_SERVICE],
})
export class AuthInfrastructureModule {}
