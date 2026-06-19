export interface EmailVerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface IEmailVerificationTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<EmailVerificationToken>;
  findUnusedByHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  findValidByUserId(userId: string): Promise<EmailVerificationToken | null>;
  markUsed(tokenId: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}

export const EMAIL_VERIFICATION_TOKEN_REPOSITORY = Symbol('IEmailVerificationTokenRepository');
