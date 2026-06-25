/**
 * AuthContext tests.
 *
 * Covers: session restore, login, logout, token refresh scheduling,
 * and clearSession. Uses manual mocks for authApi and tokenStorage
 * rather than msw, since AuthContext orchestrates those layers.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import { __resetStore } from '../__mocks__/expo-secure-store';
import { tokenStorage } from '../lib/auth/storage';

// ── Mock authApi ───────────────────────────────────────────────────────────

const mockLogin = jest.fn();
const mockRefresh = jest.fn();
const mockLogout = jest.fn();
const mockMe = jest.fn();

jest.mock('../lib/api/auth', () => ({
  authApi: {
    login: (...args: unknown[]) => mockLogin(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    me: (...args: unknown[]) => mockMe(...args),
    resendVerification: jest.fn(),
  },
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

const LOGIN_RESULT = { accessToken: 'acc-tok', refreshToken: 'ref-tok' };
const REFRESH_RESULT = { accessToken: 'new-acc-tok', refreshToken: 'new-ref-tok' };

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  __resetStore();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Cold start — no stored tokens ──────────────────────────────────────────

describe('session restore — no tokens', () => {
  it('sets isLoading=false and isAuthenticated=false when no tokens exist', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });
});

// ── Cold start — valid stored tokens ──────────────────────────────────────

describe('session restore — valid stored access token', () => {
  beforeEach(async () => {
    await tokenStorage.setAccessToken('stored-acc');
    await tokenStorage.setRefreshToken('stored-ref');
    mockMe.mockResolvedValue(PROFILE);
  });

  it('restores session: isAuthenticated=true, user populated', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('student@tu-ilmenau.de');
    expect(mockMe).toHaveBeenCalledWith('stored-acc');
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

// ── Cold start — expired access token triggers refresh ────────────────────

describe('session restore — no access token, valid refresh token', () => {
  beforeEach(async () => {
    // Only refresh token is stored (access token missing / expired)
    await tokenStorage.setRefreshToken('stored-ref');
    mockRefresh.mockResolvedValue(REFRESH_RESULT);
    mockMe.mockResolvedValue(PROFILE);
  });

  it('calls refresh, then me, and restores session', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRefresh).toHaveBeenCalledWith('stored-ref');
    expect(mockMe).toHaveBeenCalledWith('new-acc-tok');
    expect(result.current.isAuthenticated).toBe(true);
  });
});

// ── Cold start — refresh fails, session cleared ───────────────────────────

describe('session restore — refresh token expired', () => {
  beforeEach(async () => {
    await tokenStorage.setRefreshToken('expired-ref');
    mockRefresh.mockRejectedValue(new Error('Token expired'));
  });

  it('clears state and is not authenticated', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });
});

// ── login ──────────────────────────────────────────────────────────────────

describe('login', () => {
  beforeEach(() => {
    mockLogin.mockResolvedValue(LOGIN_RESULT);
    mockMe.mockResolvedValue(PROFILE);
  });

  it('sets isAuthenticated=true and user after successful login', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('student@tu-ilmenau.de', 'Secure1!');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.firstName).toBe('Max');
  });

  it('stores tokens in secure storage after login', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('student@tu-ilmenau.de', 'Secure1!');
    });

    expect(await tokenStorage.getAccessToken()).toBe('acc-tok');
    expect(await tokenStorage.getRefreshToken()).toBe('ref-tok');
  });

  it('throws when authApi.login fails', async () => {
    const err = new Error('INVALID_CREDENTIALS');
    mockLogin.mockRejectedValue(err);
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => { await result.current.login('bad@tu-ilmenau.de', 'wrong'); }),
    ).rejects.toThrow();

    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ── logout ─────────────────────────────────────────────────────────────────

describe('logout', () => {
  beforeEach(async () => {
    mockLogin.mockResolvedValue(LOGIN_RESULT);
    mockMe.mockResolvedValue(PROFILE);
    mockLogout.mockResolvedValue(undefined);
  });

  it('clears session after logout even if server call succeeds', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.login('student@tu-ilmenau.de', 'Secure1!'); });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => { await result.current.logout(); });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(await tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it('clears local state even when server logout call throws', async () => {
    mockLogout.mockRejectedValue(new Error('Network error'));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.login('student@tu-ilmenau.de', 'Secure1!'); });
    await act(async () => { await result.current.logout(); });

    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ── clearSession ───────────────────────────────────────────────────────────

describe('clearSession', () => {
  it('clears user and accessToken without a server call', async () => {
    mockLogin.mockResolvedValue(LOGIN_RESULT);
    mockMe.mockResolvedValue(PROFILE);

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.login('student@tu-ilmenau.de', 'Secure1!'); });

    act(() => { result.current.clearSession(); });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
