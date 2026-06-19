'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

interface FieldError {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  general?: string;
}

function passwordStrength(pw: string): { label: string; color: string } {
  const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { label: 'Fair', color: 'bg-yellow-500' };
  if (score === 3) return { label: 'Good', color: 'bg-blue-500' };
  return { label: 'Strong', color: 'bg-green-500' };
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);

  function validate(): FieldError {
    const e: FieldError = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }

    setErrors({});
    setLoading(true);
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      router.push('/register/check-email');
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      if (apiErr.code === 'EMAIL_ALREADY_REGISTERED') {
        setErrors({ email: 'This email is already registered.' });
      } else if (apiErr.code === 'UNIVERSITY_NOT_SUPPORTED') {
        setErrors({ email: 'Only university email addresses are accepted (e.g. @tu-ilmenau.de).' });
      } else if (apiErr.code === 'WEAK_PASSWORD') {
        setErrors({ password: apiErr.message ?? 'Password is too weak.' });
      } else {
        setErrors({ general: apiErr.message ?? 'Something went wrong. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }

  const strength = form.password ? passwordStrength(form.password) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mb-6 text-sm text-gray-500">Use your university email to get started.</p>

        {errors.general && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">First name</label>
              <input
                type="text"
                autoComplete="given-name"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Last name</label>
              <input
                type="text"
                autoComplete="family-name"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">University email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@tu-ilmenau.de"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.email
              ? <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              : <p className="mt-1 text-xs text-gray-400">Use your university email address.</p>
            }
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
            />
            {strength && (
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                  <div
                    className={`h-1.5 rounded-full transition-all ${strength.color}`}
                    style={{ width: `${(['Weak','Fair','Good','Strong'].indexOf(strength.label) + 1) * 25}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{strength.label}</span>
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
