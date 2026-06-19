import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { RefreshAccessTokenUseCase } from './refresh-token.use-case';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/repositories/prisma-refresh-token.repository';
import { NestTokenService } from '../../infrastructure/jwt/nest-token.service';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository.interface';
import { TOKEN_SERVICE } from './token.service.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UnauthorizedError } from '../../domain/errors/app-error';

const TEST_DB_URL = process.env.DATABASE_URL;

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

describe('RefreshAccessTokenUseCase (integration)', () => {
  let prisma: PrismaClient;
  let useCase: RefreshAccessTokenUseCase;
  let tokenService: NestTokenService;
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
        RefreshAccessTokenUseCase,
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

    useCase = module.get(RefreshAccessTokenUseCase);
    tokenService = module.get(NestTokenService);

    const uni = await prisma.university.upsert({
      where: { emailDomain: 'refresh-integration.de' },
      update: {},
      create: { name: 'Refresh Test Uni', emailDomain: 'refresh-integration.de', country: 'DE', active: true },
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

  async function seedUser() {
    const passwordHash = await bcrypt.hash('Secure!123', 1);
    return prisma.user.create({
      data: {
        email: `refresh-${Date.now()}@refresh-integration.de`,
        passwordHash,
        firstName: 'Refresh',
        lastName: 'Tester',
        universityId,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  async function seedRefreshToken(userId: string): Promise<string> {
    const rawToken = tokenService.signRefreshToken({ sub: userId, role: 'student' });
    // rawToken is a random opaque hex string (not a JWT); see NestTokenService
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

  it('returns new access and refresh tokens for a valid token', async () => {
    const user = await seedUser();
    const rawToken = await seedRefreshToken(user.id);
    const result = await useCase.execute(rawToken);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(rawToken);
  });

  it('revokes the old token and stores a new one (rotation)', async () => {
    const user = await seedUser();
    const rawToken = await seedRefreshToken(user.id);
    const oldHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const { refreshToken: newRaw } = await useCase.execute(rawToken);

    const oldRow = await prisma.refreshToken.findFirst({ where: { tokenHash: oldHash } });
    expect(oldRow?.revokedAt).not.toBeNull();

    const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
    const newRow = await prisma.refreshToken.findFirst({ where: { tokenHash: newHash } });
    expect(newRow).not.toBeNull();
    expect(newRow?.revokedAt).toBeNull();
  });

  it('throws INVALID_REFRESH_TOKEN for a bogus token', async () => {
    await expect(useCase.execute('completely-bogus-token')).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    await expect(useCase.execute('completely-bogus-token')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws INVALID_REFRESH_TOKEN when the token is already revoked', async () => {
    const user = await seedUser();
    const rawToken = await seedRefreshToken(user.id);
    await useCase.execute(rawToken);
    await expect(useCase.execute(rawToken)).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  });

  it('throws INVALID_REFRESH_TOKEN when no token is provided', async () => {
    await expect(useCase.execute(undefined)).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  });
});
