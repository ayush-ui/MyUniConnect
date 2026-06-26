import { ExecutionContext } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { ITokenService, TokenPayload } from '../../../application/auth/token.service.interface';

const mockTokenService: jest.Mocked<ITokenService> = {
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
};

function makeContext(authHeader?: string): ExecutionContext {
  const request: Record<string, unknown> = {
    headers: authHeader ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new OptionalJwtAuthGuard(mockTokenService);
  });

  it('returns true and populates req.user when token is valid', () => {
    const payload: TokenPayload = { sub: 'user-1', role: 'student', accountType: 'student', studentStatus: 'verified', isVerifiedStudent: true };
    mockTokenService.verifyAccessToken.mockReturnValue(payload);

    const ctx = makeContext('Bearer valid-token');
    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest<{ user?: TokenPayload }>();
    expect(req.user).toEqual(payload);
  });

  it('returns true and leaves req.user undefined when no Authorization header', () => {
    const ctx = makeContext();
    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest<{ user?: TokenPayload }>();
    expect(req.user).toBeUndefined();
    expect(mockTokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('returns true and leaves req.user undefined when token is expired or invalid', () => {
    mockTokenService.verifyAccessToken.mockImplementation(() => { throw new Error('expired'); });

    const ctx = makeContext('Bearer bad-token');
    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest<{ user?: TokenPayload }>();
    expect(req.user).toBeUndefined();
  });

  it('returns true and leaves req.user undefined when Authorization header is malformed', () => {
    const ctx = makeContext('Basic not-bearer');
    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest<{ user?: TokenPayload }>();
    expect(req.user).toBeUndefined();
    expect(mockTokenService.verifyAccessToken).not.toHaveBeenCalled();
  });
});
