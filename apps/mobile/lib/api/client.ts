const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends RequestInit {
  /** Bearer token for authenticated requests */
  accessToken?: string;
  /** Raw refresh token to send as Cookie header */
  refreshToken?: string;
}

/** Returns both the parsed JSON body and the raw Response (for header inspection). */
export async function apiFetchRaw<T>(
  path: string,
  options: FetchOptions = {},
): Promise<{ data: T; response: Response }> {
  const { accessToken, refreshToken, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  if (refreshToken) {
    headers['Cookie'] = `refresh_token=${refreshToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { headers, ...rest });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string; code?: string };
    throw new ApiError(
      body.code ?? `HTTP_${response.status}`,
      body.message ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as T;
  return { data, response };
}

/** Convenience wrapper when you don't need headers. */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { data } = await apiFetchRaw<T>(path, options);
  return data;
}
