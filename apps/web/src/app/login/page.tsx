'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

interface FieldError {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get('verified') === 'true';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);

  function validate(): FieldError {
    const e: FieldError = {};
    if (!form.email.trim()) e.email = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }

    setErrors({});
    setLoading(true);
    try {
      await authApi.login({ email: form.email, password: form.password });
      router.push('/dashboard');
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      if (apiErr.code === 'EMAIL_NOT_VERIFIED') {
        setErrors({});
        setShowResend(true);
        setResendEmail(form.email);
      } else if (apiErr.code === 'INVALID_CREDENTIALS') {
        setErrors({ general: 'Invalid email or password.' });
      } else {
        setErrors({ general: apiErr.message ?? 'Something went wrong. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!resendEmail) return;
    try {
      await authApi.resendVerification(resendEmail);
      setResendSent(true);
    } catch {
      // silently succeed per API contract
      setResendSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mb-6 text-sm text-gray-500">Log in to your MyUniConnect account.</p>

        {justVerified && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            Email verified! You can now log in.
          </div>
        )}

        {showResend && (
          <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
            <p className="font-medium">Email not verified</p>
            <p className="mt-1">Please verify your email before logging in.</p>
            {resendSent ? (
              <p className="mt-2 text-green-700">Verification email sent! Check your inbox.</p>
            ) : (
              <button
                onClick={handleResend}
                className="mt-2 font-medium text-yellow-900 underline hover:no-underline"
              >
                Resend verification email
              </button>
            )}
          </div>
        )}

        {errors.general && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
