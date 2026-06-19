import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow text-center">
        <div className="mb-4 text-5xl">📬</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Check your email</h1>
        <p className="mb-6 text-gray-600">
          We sent a verification link to your university email. Click the link to activate your account.
        </p>
        <p className="text-sm text-gray-400">
          Didn&apos;t receive it?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Go to login
          </Link>{' '}
          and use the &ldquo;Resend verification&rdquo; option.
        </p>
      </div>
    </main>
  );
}
