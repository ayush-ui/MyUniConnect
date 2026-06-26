/**
 * Dev-only seed: fixed, log-in-able test accounts for local development.
 *
 * Run with:  pnpm --filter api db:seed:dev   (or: pnpm db:seed:dev inside apps/api)
 *
 * Idempotent — re-running upserts the same accounts and RESETS their passwords,
 * so it doubles as a "reset my test login" command. Never run against production.
 *
 * All accounts share the password:  Test1234!
 *
 *   test.student@tu-ilmenau.de   verified student   → can browse AND post
 *   test.pending@tu-ilmenau.de   pending student    → can browse, posting locked
 *   test.visitor@gmail.com       non-student         → can browse, posting locked
 *
 * (The main seed.ts stays reference-data only so it remains safe for the
 * integration-test database.)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Test1234!';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the dev seed with NODE_ENV=production.');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // The verified student needs a partner university to be linked to.
  const university = await prisma.university.upsert({
    where: { emailDomain: 'tu-ilmenau.de' },
    update: {},
    create: { name: 'TU Ilmenau', emailDomain: 'tu-ilmenau.de', country: 'Germany', active: true },
  });

  // A — verified student (browse + post)
  await prisma.user.upsert({
    where: { email: 'test.student@tu-ilmenau.de' },
    update: { passwordHash, emailVerified: true, emailVerifiedAt: new Date(), accountType: 'student', studentStatus: 'verified', isVerifiedStudent: true, universityId: university.id, claimedUniversityName: null, deletedAt: null },
    create: { email: 'test.student@tu-ilmenau.de', passwordHash, firstName: 'Test', lastName: 'Student', emailVerified: true, emailVerifiedAt: new Date(), accountType: 'student', studentStatus: 'verified', isVerifiedStudent: true, universityId: university.id },
  });

  // B — pending "Other" student (browse only; posting locked, "under review")
  const pending = await prisma.user.upsert({
    where: { email: 'test.pending@tu-ilmenau.de' },
    update: { passwordHash, emailVerified: true, emailVerifiedAt: new Date(), accountType: 'student', studentStatus: 'pending', isVerifiedStudent: false, universityId: null, claimedUniversityName: 'Other Test University', deletedAt: null },
    create: { email: 'test.pending@tu-ilmenau.de', passwordHash, firstName: 'Pat', lastName: 'Pending', emailVerified: true, emailVerifiedAt: new Date(), accountType: 'student', studentStatus: 'pending', isVerifiedStudent: false, claimedUniversityName: 'Other Test University' },
  });
  const existingRequest = await prisma.studentVerificationRequest.findFirst({ where: { userId: pending.id } });
  if (!existingRequest) {
    await prisma.studentVerificationRequest.create({
      data: { userId: pending.id, claimedUniversityName: 'Other Test University', emailDomain: 'tu-ilmenau.de' },
    });
  }

  // C — non-student visitor (browse only; posting never available)
  await prisma.user.upsert({
    where: { email: 'test.visitor@gmail.com' },
    update: { passwordHash, emailVerified: true, emailVerifiedAt: new Date(), accountType: 'non_student', studentStatus: 'none', isVerifiedStudent: false, universityId: null, claimedUniversityName: null, deletedAt: null },
    create: { email: 'test.visitor@gmail.com', passwordHash, firstName: 'Val', lastName: 'Visitor', emailVerified: true, emailVerifiedAt: new Date(), accountType: 'non_student', studentStatus: 'none', isVerifiedStudent: false },
  });

  console.log('Dev accounts ready (password for all: ' + PASSWORD + '):');
  console.log('  test.student@tu-ilmenau.de   verified student  (browse + post)');
  console.log('  test.pending@tu-ilmenau.de   pending student   (browse, posting locked)');
  console.log('  test.visitor@gmail.com       non-student       (browse, posting locked)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
