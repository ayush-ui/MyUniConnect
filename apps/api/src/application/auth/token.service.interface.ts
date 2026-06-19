export interface TokenPayload {
  sub: string;
  role: string;
}

export interface ITokenService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
}

export const TOKEN_SERVICE = Symbol('ITokenService');
