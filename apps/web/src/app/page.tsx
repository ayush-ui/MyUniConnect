import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">MyUniConnect</h1>
      <p className="text-lg text-gray-600">The exclusive platform for verified university students.</p>
      <div className="flex gap-4">
        <Link href="/register" className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
          Register
        </Link>
        <Link href="/login" className="rounded-md border px-6 py-2 hover:bg-gray-50">
          Log in
        </Link>
      </div>
    </main>
  );
}
