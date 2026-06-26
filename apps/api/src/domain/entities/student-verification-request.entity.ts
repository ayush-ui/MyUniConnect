export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StudentVerificationRequest {
  id: string;
  userId: string;
  claimedUniversityName: string;
  emailDomain: string;
  status: VerificationRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
}
