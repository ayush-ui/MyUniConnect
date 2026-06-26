import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { LogoutUseCase } from './logout.use-case';
import { PrismaRefreshTokenRepository } from '../../infrastructure/repositories/prisma-refresh-token.repository';
import { NestTokenService } from '../../infrastructure/jwt/nest-token.service';
import { REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const TEST_DB_URL = process.env.DATABASE_URL;

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('LogoutUseCase (integration)', () => {
  let prisma: PrismaClient;
  let useCase: LogoutUseCase;
  let tokenService: NestTokenService;
  let universityId: string;
  let userId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({}),
      ],
      providers: [
        LogoutUseCase,
        NestTokenService,
        PrismaService,
        { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    useCase = module.get(LogoutUseCase);
    tokenService = module.get(NestTokenService);

    const uni = await prisma.university.upsert({
      where: { emailDomain: 'logout-integration.de' },
      update: {},
      create: { name: 'Logout Test Uni', emailDomain: 'logout-integration.de', country: 'DE', active: true },
    });
    universityId = uni.id;

    const passwordHash = await bcrypt.hash('Secure!123', 1);
    const user = await prisma.user.upsert({
      where: { email: 'logout-user@logout-integration.de' },
      update: {},
      create: {
        email: 'logout-user@logout-integration.de',
        passwordHash,
        firstName: 'Logout',
        lastName: 'Tester',
        universityId,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  });

  async function seedRefreshToken(): Promise<string> {
    const rawToken = tokenService.signRefreshToken({ sub: userId, role: 'student', accountType: 'student', studentStatus: 'verified', isVerifiedStudent: true });
    // rawToken is a random opaque hex string; see NestTokenService
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return rawToken;
  }

  it('revokes the refresh token in the database', async () => {
    const rawToken = await seedRefreshToken();
    await useCase.execute(rawToken);
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const row = await prisma.refreshToken.findFirst({ where: { tokenHash: hash } });
    expect(row?.revokedAt).not.toBeNull();
  });

  it('succeeds silently for a non-existent token', async () => {
    await expect(useCase.execute('ghost-token-xyz')).resolves.toBeUndefined();
  });

  it('succeeds silently when no token is provided', async () => {
    await expect(useCase.execute(undefined)).resolves.toBeUndefined();
  });

  it('succeeds silently when token is already revoked', async () => {
    const rawToken = await seedRefreshToken();
    await useCase.execute(rawToken);
    await expect(useCase.execute(rawToken)).resolves.toBeUndefined();
  });
});
