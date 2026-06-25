/**
 * Auth API layer tests.
 *
 * Verifies that each authApi function:
 *  - Calls apiFetch / apiFetchRaw with the correct /api/v1/auth/... path
 *  - Sends the correct method and body
 *  - Parses the Set-Cookie header for the refresh token (login, refresh)
 *  - Re-throws ApiError from the underlying client
 */

import { authApi } from './auth';
import { ApiError } from './client';

// ── Mock the client module ─────────────────────────────────────────────────

const mockApiFetch = jest.fn();
const mockApiFetchRaw = jest.fn();

jest.mock('./client', () => ({
  ...jest.requireActual('./client'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchRaw: (...args: unknown[]) => mockApiFetchRaw(...args),
}));

// ── Test fixtures ──────────────────────────────────────────────────────────

const PROFILE = {
  id: 'usr-1',
  email: 'student@tu-ilmenau.de',
  firstName: 'Max',
  lastName: 'Muster',
  universityId: 'uni-1',
  role: 'student',
  emailVerified: true,
  createdAt: '2025-01-01T00:00:00Z',
};

beforeEach(() => jest.clearAllMocks());

// ── register ───────────────────────────────────────────────────────────────

describe('authApi.register', () => {
  it('calls POST /api/v1/auth/register with all required fields', async () => {
    mockApiFetch.mockResolvedValue({ userId: 'usr-1', message: 'Check your email' });
    const result = await authApi.register({
      email: 'student@tu-ilmenau.de',
      password: 'Secure1!',
      firstName: 'Max',
      lastName: 'Muster',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'student@tu-ilmenau.de',
          password: 'Secure1!',
          firstName: 'Max',
          lastName: 'Muster',
        }),
      }),
    );
    expect(result.userId).toBe('usr-1');
  });

  it('re-throws EMAIL_DOMAIN_NOT_ALLOWED ApiError', async () => {
    const err = new ApiError('EMAIL_DOMAIN_NOT_ALLOWED', 'Not a university email', 422);
    mockApiFetch.mockRejectedValue(err);
    const caught = await authApi.register({
      email: 'user@gmail.com', password: 'Secure1!', firstName: 'Max', lastName: 'Muster',
    }).catch((e) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
  });

  it('re-throws EMAIL_ALREADY_REGISTERED ApiError', async () => {
    const err = new ApiError('EMAIL_ALREADY_REGISTERED', 'Already registered', 409);
    mockApiFetch.mockRejectedValue(err);
    const caught = await authApi.register({
      email: 'student@tu-ilmenau.de', password: 'Secure1!', firstName: 'Max', lastName: 'Muster',
    }).catch((e) => e);
    expect((caught as ApiError).code).toBe('EMAIL_ALREADY_REGISTERED');
  });
});

// ── login ──────────────────────────────────────────────────────────────────

describe('authApi.login', () => {
  it('calls POST /api/v1/auth/login and parses refreshToken from Set-Cookie', async () => {
    const mockResponse = {
      headers: { get: (h: string) => h === 'set-cookie' ? 'refresh_token=ref-tok; HttpOnly' : null },
    };
    mockApiFetchRaw.mockResolvedValue({ data: { accessToken: 'acc-tok' }, response: mockResponse });

    const result = await authApi.login({ email: 'student@tu-ilmenau.de', password: 'Secure1!' });
    expect(mockApiFetchRaw).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.accessToken).toBe('acc-tok');
    expect(result.refreshToken).toBe('ref-tok');
  });

  it('returns null refreshToken when Set-Cookie header is absent', async () => {
    const mockResponse = { headers: { get: () => null } };
    mockApiFetchRaw.mockResolvedValue({ data: { accessToken: 'acc-tok' }, response: mockResponse });
    const result = await authApi.login({ email: 'student@tu-ilmenau.de', password: 'Secure1!' });
    expect(result.refreshToken).toBeNull();
  });

  it('re-throws INVALID_CREDENTIALS ApiError', async () => {
    const err = new ApiError('INVALID_CREDENTIALS', 'Wrong credentials', 401);
    mockApiFetchRaw.mockRejectedValue(err);
    const caught = await authApi.login({ email: 'x@tu-ilmenau.de', password: 'wrong' }).catch((e) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('INVALID_CREDENTIALS');
  });

  it('re-throws EMAIL_NOT_VERIFIED ApiError', async () => {
    const err = new ApiError('EMAIL_NOT_VERIFIED', 'Verify email first', 403);
    mockApiFetchRaw.mockRejectedValue(err);
    const caught = await authApi.login({ email: 'student@tu-ilmenau.de', password: 'Secure1!' }).catch((e) => e);
    expect((caught as ApiError).code).toBe('EMAIL_NOT_VERIFIED');
  });
});

// ── refresh ────────────────────────────────────────────────────────────────

describe('authApi.refresh', () => {
  it('calls POST /api/v1/auth/refresh with refreshToken in Cookie header', async () => {
    const mockResponse = {
      headers: { get: (h: string) => h === 'set-cookie' ? 'refresh_token=new-ref-tok; HttpOnly' : null },
    };
    mockApiFetchRaw.mockResolvedValue({ data: { accessToken: 'new-acc-tok' }, response: mockResponse });

    const result = await authApi.refresh('old-ref-tok');
    expect(mockApiFetchRaw).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      expect.objectContaining({ method: 'POST', refreshToken: 'old-ref-tok' }),
    );
    expect(result.accessToken).toBe('new-acc-tok');
    expect(result.refreshToken).toBe('new-ref-tok');
  });

  it('re-throws INVALID_REFRESH_TOKEN on expired token', async () => {
    const err = new ApiError('INVALID_REFRESH_TOKEN', 'Token expired', 401);
    mockApiFetchRaw.mockRejectedValue(err);
    const caught = await authApi.refresh('expired').catch((e) => e);
    expect((caught as ApiError).code).toBe('INVALID_REFRESH_TOKEN');
  });
});

// ── logout ─────────────────────────────────────────────────────────────────

describe('authApi.logout', () => {
  it('calls POST /api/v1/auth/logout with refreshToken as Cookie header', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await authApi.logout('ref-tok');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST', refreshToken: 'ref-tok' }),
    );
  });
});

// ── me ─────────────────────────────────────────────────────────────────────

describe('authApi.me', () => {
  it('calls GET /api/v1/auth/me with Bearer accessToken', async () => {
    mockApiFetch.mockResolvedValue(PROFILE);
    const result = await authApi.me('acc-tok');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({ accessToken: 'acc-tok' }),
    );
    expect(result.email).toBe('student@tu-ilmenau.de');
    expect(result.emailVerified).toBe(true);
  });

  it('re-throws 401 ApiError on expired access token', async () => {
    const err = new ApiError('UNAUTHORIZED', 'Token expired', 401);
    mockApiFetch.mockRejectedValue(err);
    const caught = await authApi.me('expired-tok').catch((e) => e);
    expect((caught as ApiError).status).toBe(401);
  });
});

// ── resendVerification ─────────────────────────────────────────────────────

describe('authApi.resendVerification', () => {
  it('calls POST /api/v1/auth/resend-verification with email in body', async () => {
    mockApiFetch.mockResolvedValue({ message: 'Verification email sent' });
    const result = await authApi.resendVerification('student@tu-ilmenau.de');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/resend-verification',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'student@tu-ilmenau.de' }),
      }),
    );
    expect(result.message).toBe('Verification email sent');
  });
});
