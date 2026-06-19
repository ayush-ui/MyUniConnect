import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { LoginUseCase } from './login.use-case';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/repositories/prisma-refresh-token.repository';
import { NestTokenService } from '../../infrastructure/jwt/nest-token.service';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository.interface';
import { TOKEN_SERVICE } from './token.service.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UnauthorizedError } from '../../domain/errors/app-error';

// Requires: docker compose up -d postgres_test
// DATABASE_URL_TEST is set in jest.integration.config.ts global setup

const TEST_DB_URL = process.env.DATABASE_URL;

// Set JWT secrets before the NestJS module compiles
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

describe('LoginUseCase (integration)', () => {
  let prisma: PrismaClient;
  let useCase: LoginUseCase;
  let universityId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({}),
      ],
      providers: [
        LoginUseCase,
        NestTokenService,
        PrismaService,
        { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
        { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
        { provide: TOKEN_SERVICE, useClass: NestTokenService },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    useCase = module.get(LoginUseCase);

    const uni = await prisma.university.upsert({
      where: { emailDomain: 'login-integration.de' },
      update: {},
      create: { name: 'Login Test University', emailDomain: 'login-integration.de', country: 'DE', active: true },
    });
    universityId = uni.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({ where: { universityId } });
  });

  async function seedVerifiedUser(password: string) {
    const passwordHash = await bcrypt.hash(password, 1);
    return prisma.user.create({
      data: {
        email: `test-${Date.now()}@login-integration.de`,
        passwordHash,
        firstName: 'Login',
        lastName: 'Tester',
        universityId,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  it('returns access and refresh tokens for valid credentials', async () => {
    const user = await seedVerifiedUser('Secure!123');
    const result = await useCase.execute({ email: user.email, password: 'Secure!123' });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('stores a hashed refresh token in the database', async () => {
    const user = await seedVerifiedUser('Secure!123');
    const { refreshToken } = await useCase.execute({ email: user.email, password: 'Secure!123' });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await prisma.refreshToken.findFirst({ where: { userId: user.id } });
    expect(stored).not.toBeNull();
    expect(stored?.tokenHash).toBe(tokenHash);
    expect(stored?.revokedAt).toBeNull();
  });

  it('throws INVALID_CREDENTIALS for a non-existent user', async () => {
    await expect(
      useCase.execute({ email: 'ghost@login-integration.de', password: 'Secure!123' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('throws INVALID_CREDENTIALS for wrong password', async () => {
    const user = await seedVerifiedUser('Secure!123');
    await expect(
      useCase.execute({ email: user.email, password: 'WrongPass!1' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('throws EMAIL_NOT_VERIFIED for an unverified user', async () => {
    const passwordHash = await bcrypt.hash('Secure!123', 1);
    const unverified = await prisma.user.create({
      data: {
        email: `unverified-${Date.now()}@login-integration.de`,
        passwordHash,
        firstName: 'Un',
        lastName: 'Verified',
        universityId,
        emailVerified: false,
      },
    });
    await expect(
      useCase.execute({ email: unverified.email, password: 'Secure!123' }),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    await expect(
      useCase.execute({ email: unverified.email, password: 'Secure!123' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
