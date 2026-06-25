import { apiFetch, apiFetchRaw } from './client';
import { parseRefreshTokenFromCookie } from '../auth/storage';

const AUTH = '/api/v1/auth';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResult {
  userId: string;
  message: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  /** Parsed from Set-Cookie header — not in the JSON body. */
  refreshToken: string | null;
}

export interface MeResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  universityId: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    return apiFetch(`${AUTH}/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginPayload): Promise<LoginResult> {
    const { data, response } = await apiFetchRaw<{ accessToken: string }>(
      `${AUTH}/login`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    const setCookie = response.headers.get('set-cookie');
    return {
      accessToken: data.accessToken,
      refreshToken: parseRefreshTokenFromCookie(setCookie),
    };
  },

  async refresh(refreshToken: string): Promise<LoginResult> {
    const { data, response } = await apiFetchRaw<{ accessToken: string }>(
      `${AUTH}/refresh`,
      { method: 'POST', refreshToken },
    );
    const setCookie = response.headers.get('set-cookie');
    return {
      accessToken: data.accessToken,
      refreshToken: parseRefreshTokenFromCookie(setCookie),
    };
  },

  async logout(refreshToken: string): Promise<void> {
    await apiFetch(`${AUTH}/logout`, { method: 'POST', refreshToken });
  },

  async me(accessToken: string): Promise<MeResult> {
    return apiFetch(`${AUTH}/me`, { accessToken });
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    return apiFetch(`${AUTH}/resend-verification`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};
