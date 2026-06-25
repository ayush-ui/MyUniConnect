import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authApi, MeResult } from '../lib/api/auth';
import { tokenStorage } from '../lib/auth/storage';

interface AuthState {
  user: MeResult | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  /** Called after successful registration so UI can transition. */
  clearSession(): void;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

/** Access token lifetime is 15 min; refresh 2 min before expiry. */
const REFRESH_BEFORE_MS = 2 * 60 * 1000;
const TOKEN_LIFETIME_MS = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResult | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleRefresh(token: string) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void performRefresh(token);
    }, TOKEN_LIFETIME_MS - REFRESH_BEFORE_MS);
  }

  async function performRefresh(currentRefreshToken: string) {
    try {
      const result = await authApi.refresh(currentRefreshToken);
      const newRefreshToken = result.refreshToken ?? currentRefreshToken;
      await Promise.all([
        tokenStorage.setAccessToken(result.accessToken),
        tokenStorage.setRefreshToken(newRefreshToken),
      ]);
      setAccessToken(result.accessToken);
      scheduleRefresh(newRefreshToken);
    } catch {
      await handleSessionExpiry();
    }
  }

  async function handleSessionExpiry() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await tokenStorage.clearAll();
    setAccessToken(null);
    setUser(null);
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const [storedAccess, storedRefresh] = await Promise.all([
          tokenStorage.getAccessToken(),
          tokenStorage.getRefreshToken(),
        ]);

        if (!storedRefresh) {
          setIsLoading(false);
          return;
        }

        // Try using stored access token first; if missing/expired, refresh immediately.
        let activeAccess = storedAccess;
        let activeRefresh = storedRefresh;

        if (!activeAccess) {
          const result = await authApi.refresh(storedRefresh);
          activeAccess = result.accessToken;
          const newRefresh = result.refreshToken ?? storedRefresh;
          await Promise.all([
            tokenStorage.setAccessToken(activeAccess),
            tokenStorage.setRefreshToken(newRefresh),
          ]);
          activeRefresh = newRefresh;
        }

        const profile = await authApi.me(activeAccess);
        setUser(profile);
        setAccessToken(activeAccess);
        scheduleRefresh(activeRefresh);
      } catch {
        await tokenStorage.clearAll();
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const result = await authApi.login({ email, password });

    const refreshToken = result.refreshToken ?? '';
    await Promise.all([
      tokenStorage.setAccessToken(result.accessToken),
      ...(refreshToken ? [tokenStorage.setRefreshToken(refreshToken)] : []),
    ]);

    const profile = await authApi.me(result.accessToken);
    setUser(profile);
    setAccessToken(result.accessToken);
    if (refreshToken) scheduleRefresh(refreshToken);
  }

  async function logout() {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {});
    }
    await handleSessionExpiry();
  }

  function clearSession() {
    setUser(null);
    setAccessToken(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, isAuthenticated: !!user, login, logout, clearSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState & AuthActions {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
