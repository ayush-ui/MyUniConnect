import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { PrismaEmailVerificationTokenRepository } from '../../infrastructure/repositories/prisma-email-verification-token.repository';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from '../../domain/repositories/email-verification-token.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AppError } from '../../domain/errors/app-error';

// Requires: docker compose up -d postgres_test
// DATABASE_URL_TEST is set in jest.integration.config.ts global setup

const TEST_DB_URL = process.env.DATABASE_URL;

describe('VerifyEmailUseCase (integration)', () => {
  let prisma: PrismaClient;
  let useCase: VerifyEmailUseCase;
  let universityId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();

    const module = await Test.createTestingModule({
      providers: [
        VerifyEmailUseCase,
        PrismaService,
        { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useClass: PrismaEmailVerificationTokenRepository },
        { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    useCase = module.get(VerifyEmailUseCase);

    const uni = await prisma.university.upsert({
      where: { emailDomain: 'test-integration.de' },
      update: {},
      create: { name: 'Test University', emailDomain: 'test-integration.de', country: 'DE', active: true },
    });
    universityId = uni.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.user.deleteMany({ where: { universityId } });
  });

  async function seedUserWithToken(overrides: { expiresAt?: Date; usedAt?: Date } = {}) {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test-integration.de`,
        passwordHash: 'irrelevant',
        firstName: 'Test',
        lastName: 'User',
        universityId,
      },
    });
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const token = await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
        usedAt: overrides.usedAt ?? null,
      },
    });
    return { user, rawToken, token };
  }

  it('marks user as verified and token as used', async () => {
    const { user, rawToken } = await seedUserWithToken();
    await useCase.execute(rawToken);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.emailVerified).toBe(true);
    expect(updatedUser?.emailVerifiedAt).not.toBeNull();

    const updatedToken = await prisma.emailVerificationToken.findFirst({ where: { userId: user.id } });
    expect(updatedToken?.usedAt).not.toBeNull();
  });

  it('throws INVALID_OR_EXPIRED_TOKEN for an already-used token', async () => {
    const { rawToken } = await seedUserWithToken({ usedAt: new Date() });
    await expect(useCase.execute(rawToken)).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  it('throws INVALID_OR_EXPIRED_TOKEN for an expired token', async () => {
    const { rawToken } = await seedUserWithToken({
      expiresAt: new Date(Date.now() - 1000), // 1 second in the past
    });
    await expect(useCase.execute(rawToken)).rejects.toBeInstanceOf(AppError);
  });

  it('throws INVALID_OR_EXPIRED_TOKEN for a non-existent token', async () => {
    const fakeToken = crypto.randomBytes(32).toString('hex');
    await expect(useCase.execute(fakeToken)).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
});
