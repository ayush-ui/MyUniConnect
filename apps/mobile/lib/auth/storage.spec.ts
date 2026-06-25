/**
 * tokenStorage abstraction tests.
 *
 * Uses the expo-secure-store mock from __mocks__/expo-secure-store.ts.
 * Verifies get/set/clear operations and the cookie-parsing helper.
 */

import { tokenStorage, parseRefreshTokenFromCookie } from './storage';
import { __resetStore } from '../../__mocks__/expo-secure-store';

beforeEach(() => __resetStore());

// ── access token ───────────────────────────────────────────────────────────

describe('tokenStorage.accessToken', () => {
  it('returns null when nothing is stored', async () => {
    expect(await tokenStorage.getAccessToken()).toBeNull();
  });

  it('stores and retrieves an access token', async () => {
    await tokenStorage.setAccessToken('acc-tok-123');
    expect(await tokenStorage.getAccessToken()).toBe('acc-tok-123');
  });

  it('overwrites an existing access token', async () => {
    await tokenStorage.setAccessToken('old-tok');
    await tokenStorage.setAccessToken('new-tok');
    expect(await tokenStorage.getAccessToken()).toBe('new-tok');
  });
});

// ── refresh token ──────────────────────────────────────────────────────────

describe('tokenStorage.refreshToken', () => {
  it('returns null when nothing is stored', async () => {
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it('stores and retrieves a refresh token', async () => {
    await tokenStorage.setRefreshToken('ref-tok-abc');
    expect(await tokenStorage.getRefreshToken()).toBe('ref-tok-abc');
  });
});

// ── clearAll ───────────────────────────────────────────────────────────────

describe('tokenStorage.clearAll', () => {
  it('removes both tokens', async () => {
    await tokenStorage.setAccessToken('acc');
    await tokenStorage.setRefreshToken('ref');
    await tokenStorage.clearAll();
    expect(await tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it('is a no-op when tokens are not set', async () => {
    await expect(tokenStorage.clearAll()).resolves.not.toThrow();
  });
});

// ── parseRefreshTokenFromCookie ────────────────────────────────────────────

describe('parseRefreshTokenFromCookie', () => {
  it('extracts refresh_token value from a standard Set-Cookie string', () => {
    const header = 'refresh_token=abc123; HttpOnly; Path=/; Max-Age=604800';
    expect(parseRefreshTokenFromCookie(header)).toBe('abc123');
  });

  it('returns null when header is null', () => {
    expect(parseRefreshTokenFromCookie(null)).toBeNull();
  });

  it('returns null when refresh_token is absent from the header', () => {
    expect(parseRefreshTokenFromCookie('session=xyz; Path=/')).toBeNull();
  });

  it('handles token value that contains a dot (JWT format)', () => {
    const token = 'aaa.bbb.ccc';
    const header = `refresh_token=${token}; HttpOnly; SameSite=Strict`;
    expect(parseRefreshTokenFromCookie(header)).toBe(token);
  });

  it('stops at first semicolon', () => {
    const header = 'refresh_token=tok-xyz; HttpOnly';
    expect(parseRefreshTokenFromCookie(header)).toBe('tok-xyz');
  });
});
