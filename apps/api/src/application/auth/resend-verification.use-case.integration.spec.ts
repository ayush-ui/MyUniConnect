import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ResendVerificationUseCase } from './resend-verification.use-case';
import { PrismaEmailVerificationTokenRepository } from '../../infrastructure/repositories/prisma-email-verification-token.repository';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from '../../domain/repositories/email-verification-token.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { EMAIL_SERVICE } from './email.service.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Requires: docker compose up -d postgres_test
// DATABASE_URL_TEST is set in jest.integration.config.ts global setup

const TEST_DB_URL = process.env.DATABASE_URL;

describe('ResendVerificationUseCase (integration)', () => {
  let prisma: PrismaClient;
  let useCase: ResendVerificationUseCase;
  let universityId: string;
  const sentEmails: { to: string; token: string }[] = [];

  const fakeEmailService = {
    sendVerificationEmail: jest.fn(async (to: string, token: string) => {
      sentEmails.push({ to, token });
    }),
  };

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();

    const module = await Test.createTestingModule({
      providers: [
        ResendVerificationUseCase,
        PrismaService,
        { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useClass: PrismaEmailVerificationTokenRepository },
        { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
        { provide: EMAIL_SERVICE, useValue: fakeEmailService },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    useCase = module.get(ResendVerificationUseCase);

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
    sentEmails.length = 0;
    fakeEmailService.sendVerificationEmail.mockClear();
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.user.deleteMany({ where: { universityId } });
  });

  async function seedUser(overrides: { emailVerified?: boolean; deletedAt?: Date } = {}) {
    return prisma.user.create({
      data: {
        email: `resend-${Date.now()}@test-integration.de`,
        passwordHash: 'irrelevant',
        firstName: 'Test',
        lastName: 'User',
        universityId,
        emailVerified: overrides.emailVerified ?? false,
        emailVerifiedAt: overrides.emailVerified ? new Date() : null,
        deletedAt: overrides.deletedAt ?? null,
      },
    });
  }

  it('creates a fresh token and sends an email for an unverified user', async () => {
    const user = await seedUser();
    await useCase.execute(user.email);

    const tokens = await prisma.emailVerificationToken.findMany({ where: { userId: user.id, usedAt: null } });
    expect(tokens).toHaveLength(1);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(user.email);
    // The emailed raw token must hash to the stored token.
    const crypto = await import('crypto');
    const expectedHash = crypto.createHash('sha256').update(sentEmails[0].token).digest('hex');
    expect(tokens[0].tokenHash).toBe(expectedHash);
  });

  it('invalidates previously outstanding tokens so only the newest link is valid', async () => {
    const user = await seedUser();
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: 'old-hash', expiresAt: new Date(Date.now() + 3600_000) },
    });

    await useCase.execute(user.email);

    const unused = await prisma.emailVerificationToken.findMany({ where: { userId: user.id, usedAt: null } });
    expect(unused).toHaveLength(1);
    expect(unused[0].tokenHash).not.toBe('old-hash');
  });

  it('does not send for an already-verified user', async () => {
    const user = await seedUser({ emailVerified: true });
    await useCase.execute(user.email);
    expect(fakeEmailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('does not send for an unknown email (no enumeration)', async () => {
    await useCase.execute('does-not-exist@test-integration.de');
    expect(fakeEmailService.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
