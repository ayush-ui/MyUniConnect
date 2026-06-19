import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ITokenService, TOKEN_SERVICE } from '../../../application/auth/token.service.interface';

function makeContext(authHeader?: string): ExecutionContext {
  const request = {
    headers: authHeader ? { authorization: authHeader } : {},
    user: undefined as unknown,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let tokenService: jest.Mocked<ITokenService>;

  beforeEach(() => {
    tokenService = {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn().mockReturnValue({ sub: 'user-1', role: 'student' }),
    };
    guard = new JwtAuthGuard(tokenService);
  });

  it('returns true and attaches user when token is valid', () => {
    const ctx = makeContext('Bearer valid.jwt.token');
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest<{ user: unknown }>();
    expect(req.user).toEqual({ sub: 'user-1', role: 'student' });
  });

  it('calls verifyAccessToken with the raw token (without Bearer prefix)', () => {
    const ctx = makeContext('Bearer my.raw.token');
    guard.canActivate(ctx);
    expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('my.raw.token');
  });

  it('throws UnauthorizedException when Authorization header is missing', () => {
    const ctx = makeContext();
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header is not Bearer scheme', () => {
    const ctx = makeContext('Basic abc123');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token verification fails', () => {
    tokenService.verifyAccessToken.mockImplementation(() => { throw new Error('jwt expired'); });
    const ctx = makeContext('Bearer expired.jwt.token');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is malformed', () => {
    tokenService.verifyAccessToken.mockImplementation(() => { throw new Error('invalid signature'); });
    const ctx = makeContext('Bearer bad.token');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
