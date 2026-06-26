export interface TokenPayload {
  sub: string;
  role: string;
  accountType: 'student' | 'non_student';
  studentStatus: 'none' | 'pending' | 'verified' | 'rejected';
  isVerifiedStudent: boolean;
}

export interface ITokenService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
}

export const TOKEN_SERVICE = Symbol('ITokenService');
