import { apiFetch, apiFetchRaw } from './client';
import { parseRefreshTokenFromCookie } from '../auth/storage';

const AUTH = '/api/v1/auth';

export type AccountType = 'student' | 'non_student';
export type StudentStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accountType: AccountType;
  /** Set when a student picks a partner university from the list. */
  universityId?: string;
  /** Free text when a student picks "Other (Not listed)". */
  claimedUniversityName?: string;
}

export interface RegisterResult {
  userId: string;
  accountType: AccountType;
  studentStatus: StudentStatus;
  message: string;
}

export interface University {
  id: string;
  name: string;
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
  universityId: string | null;
  role: string;
  emailVerified: boolean;
  accountType: AccountType;
  studentStatus: StudentStatus;
  /** Derived gate for posting: student & verified & email-verified. */
  isVerifiedStudent: boolean;
  university: University | null;
  /** Free-text university from the "Other" path (pending students). */
  claimedUniversityName: string | null;
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

  /** Active partner universities for the signup picker (public endpoint). */
  async universities(): Promise<University[]> {
    return apiFetch(`${AUTH}/universities`);
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    return apiFetch(`${AUTH}/resend-verification`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};
