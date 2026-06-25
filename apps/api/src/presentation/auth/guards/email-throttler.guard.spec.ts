import { EmailThrottlerGuard } from './email-throttler.guard';

// getTracker is protected; expose it for the test.
class TestableGuard extends EmailThrottlerGuard {
  public track(req: Record<string, any>): Promise<string> {
    return this.getTracker(req);
  }
}

describe('EmailThrottlerGuard', () => {
  let guard: TestableGuard;

  beforeEach(() => {
    // The base ThrottlerGuard deps are unused by getTracker, so pass stubs.
    guard = new TestableGuard({} as any, {} as any, {} as any);
  });

  it('tracks by the request-body email', async () => {
    await expect(guard.track({ body: { email: 'student@tu-ilmenau.de' }, ip: '1.2.3.4' })).resolves.toBe(
      'student@tu-ilmenau.de',
    );
  });

  it('normalises the email (trim + lowercase) so casing cannot bypass the limit', async () => {
    await expect(guard.track({ body: { email: '  STUDENT@TU-ILMENAU.DE ' }, ip: '1.2.3.4' })).resolves.toBe(
      'student@tu-ilmenau.de',
    );
  });

  it('falls back to IP when no email is present', async () => {
    await expect(guard.track({ body: {}, ip: '9.9.9.9' })).resolves.toBe('9.9.9.9');
  });
});
