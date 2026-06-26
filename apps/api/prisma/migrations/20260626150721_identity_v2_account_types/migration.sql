-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('student', 'non_student');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('none', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "VerificationRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_university_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_type" "AccountType" NOT NULL DEFAULT 'student',
ADD COLUMN     "claimed_university_name" TEXT,
ADD COLUMN     "is_verified_student" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "student_status" "StudentStatus" NOT NULL DEFAULT 'none',
ALTER COLUMN "university_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "student_verification_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "claimed_university_name" TEXT NOT NULL,
    "email_domain" TEXT NOT NULL,
    "status" "VerificationRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_verification_requests_user_id_idx" ON "student_verification_requests"("user_id");

-- CreateIndex
CREATE INDEX "student_verification_requests_status_idx" ON "student_verification_requests"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_verification_requests" ADD CONSTRAINT "student_verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every pre-existing account was created under the v1 partner-only rule,
-- so they are all verified students of their (non-null) partner university.
UPDATE "users"
SET "account_type" = 'student',
    "student_status" = 'verified',
    "is_verified_student" = true
WHERE "university_id" IS NOT NULL;
