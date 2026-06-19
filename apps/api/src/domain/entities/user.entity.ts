export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  universityId: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  role: UserRole;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
