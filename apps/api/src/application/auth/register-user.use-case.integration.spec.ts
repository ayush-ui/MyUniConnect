import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { RegisterUserUseCase } from './register-user.use-case';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { PrismaUniversityRepository } from '../../infrastructure/repositories/prisma-university.repository';
import { PrismaEmailVerificationTokenRepository } from '../../infrastructure/repositories/prisma-email-verification-token.repository';
import { PrismaStudentVerificationRequestRepository } from '../../infrastructure/repositories/prisma-student-verification-request.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from '../../domain/repositories/email-verification-token.repository.interface';
import { STUDENT_VERIFICATION_REQUEST_REPOSITORY } from '../../domain/repositories/student-verification-request.repository.interface';
import { EMAIL_SERVICE } from './email.service.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const TEST_DB_URL = process.env.DATABASE_URL;

describe('RegisterUserUseCase (integration)', () => {
  let prisma: PrismaClient;
  let useCase: RegisterUserUseCase;
  let universityId: string;
  const emails: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();

    const module = await Test.createTestingModule({
      providers: [
        RegisterUserUseCase,
        PrismaService,
        { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
        { provide: UNIVERSITY_REPOSITORY, useClass: PrismaUniversityRepository },
        { provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY, useClass: PrismaEmailVerificationTokenRepository },
        { provide: STUDENT_VERIFICATION_REQUEST_REPOSITORY, useClass: PrismaStudentVerificationRequestRepository },
        { provide: EMAIL_SERVICE, useValue: { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    useCase = module.get(RegisterUserUseCase);

    const uni = await prisma.university.upsert({
      where: { emailDomain: 'reg-integration.de' },
      update: {},
      create: { name: 'Reg Test University', emailDomain: 'reg-integration.de', country: 'DE', active: true },
    });
    universityId = uni.id;
  });

  afterAll(async () => {
    if (emails.length) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await prisma.$disconnect();
  });

  function uniqueEmail(local: string, domain: string): string {
    const e = `${local}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@${domain}`;
    emails.push(e);
    return e;
  }

  it('persists a partner-university student as pending with a linked university and no verification request', async () => {
    const email = uniqueEmail('partner', 'reg-integration.de');
    const { userId } = await useCase.execute({
      email,
      password: 'Secure!123',
      firstName: 'Max',
      lastName: 'Muster',
      accountType: 'student',
      universityId,
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.accountType).toBe('student');
    expect(user?.studentStatus).toBe('pending');
    expect(user?.universityId).toBe(universityId);
    expect(user?.isVerifiedStudent).toBe(false);

    const requests = await prisma.studentVerificationRequest.findMany({ where: { userId } });
    expect(requests).toHaveLength(0);
  });

  it('persists a non-student with a null university and no verification request', async () => {
    const email = uniqueEmail('visitor', 'gmail.com');
    const { userId } = await useCase.execute({
      email,
      password: 'Secure!123',
      firstName: 'Vera',
      lastName: 'Visitor',
      accountType: 'non_student',
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.accountType).toBe('non_student');
    expect(user?.studentStatus).toBe('none');
    expect(user?.universityId).toBeNull();

    const requests = await prisma.studentVerificationRequest.findMany({ where: { userId } });
    expect(requests).toHaveLength(0);
  });

  it('persists an "Other" student (null university) and creates a pending verification request', async () => {
    const email = uniqueEmail('otto', 'some-other-uni.edu');
    const { userId } = await useCase.execute({
      email,
      password: 'Secure!123',
      firstName: 'Otto',
      lastName: 'Other',
      accountType: 'student',
      claimedUniversityName: 'Some Other University',
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.universityId).toBeNull();
    expect(user?.studentStatus).toBe('pending');
    expect(user?.claimedUniversityName).toBe('Some Other University');

    const requests = await prisma.studentVerificationRequest.findMany({ where: { userId } });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      claimedUniversityName: 'Some Other University',
      emailDomain: 'some-other-uni.edu',
      status: 'pending',
    });
  });
});
