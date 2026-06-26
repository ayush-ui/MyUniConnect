import { ExecutionContext } from '@nestjs/common';
import { VerifiedStudentGuard } from './verified-student.guard';
import { TokenPayload } from '../../../application/auth/token.service.interface';
import { AppError } from '../../../domain/errors/app-error';

function makeContext(user?: Partial<TokenPayload>): ExecutionContext {
  const request: Record<string, unknown> = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('VerifiedStudentGuard', () => {
  const guard = new VerifiedStudentGuard();

  it('allows a verified student through', () => {
    const ctx = makeContext({ sub: 'u1', role: 'student', accountType: 'student', studentStatus: 'verified', isVerifiedStudent: true });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a pending student with STUDENT_VERIFICATION_REQUIRED (403)', () => {
    const ctx = makeContext({ sub: 'u1', role: 'student', accountType: 'student', studentStatus: 'pending', isVerifiedStudent: false });
    try {
      guard.canActivate(ctx);
      fail('expected guard to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('STUDENT_VERIFICATION_REQUIRED');
      expect((err as AppError).statusCode).toBe(403);
    }
  });

  it('rejects a non-student', () => {
    const ctx = makeContext({ sub: 'u1', role: 'student', accountType: 'non_student', studentStatus: 'none', isVerifiedStudent: false });
    expect(() => guard.canActivate(ctx)).toThrow(AppError);
  });

  it('rejects when no user is present on the request', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(AppError);
  });
});
