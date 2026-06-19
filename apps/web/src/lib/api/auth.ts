const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
    ...init,
  });
  const body = await res.json();
  if (!res.ok) throw { statusCode: res.status, ...body };
  return body as T;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiFetch<{ userId: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginPayload) =>
    apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    apiFetch<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  refresh: () => apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),

  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: (accessToken: string) =>
    apiFetch<{ id: string; email: string; firstName: string; lastName: string; university: string }>(
      '/auth/me',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ),
};
