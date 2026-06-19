'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token was found in the link. Please use the link from your email.');
      return;
    }

    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/login?verified=true'), 2500);
      })
      .catch((err: unknown) => {
        const apiErr = err as { code?: string; message?: string };
        setStatus('error');
        setErrorMessage(
          apiErr.code === 'INVALID_OR_EXPIRED_TOKEN'
            ? 'This verification link has expired or was already used.'
            : (apiErr.message ?? 'Something went wrong. Please try again.'),
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleResend() {
    if (!resendEmail) return;
    try {
      await authApi.resendVerification(resendEmail);
    } finally {
      setResendSent(true);
    }
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">✉️</div>
          <p className="text-gray-600">Verifying your email…</p>
        </div>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Email verified!</h1>
          <p className="text-gray-600">Redirecting you to login…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow text-center">
        <div className="mb-4 text-5xl">⛔</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Link expired</h1>
        <p className="mb-6 text-gray-600">{errorMessage}</p>

        {!resendSent ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Enter your email to receive a new verification link:</p>
            <input
              type="email"
              placeholder="you@tu-ilmenau.de"
              value={resendEmail}
              onChange={e => setResendEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleResend}
              disabled={!resendEmail.trim()}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Resend verification email
            </button>
          </div>
        ) : (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            If your email is registered and unverified, a new link has been sent.
          </div>
        )}
      </div>
    </main>
  );
}
