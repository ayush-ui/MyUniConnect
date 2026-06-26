export type UserRole = 'student' | 'admin';

export type AccountType = 'student' | 'non_student';

export type StudentStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  universityId: string | null;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  accountType: AccountType;
  studentStatus: StudentStatus;
  isVerifiedStudent: boolean;
  claimedUniversityName: string | null;
  role: UserRole;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
