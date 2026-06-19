import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyUniConnect',
  description: 'The exclusive platform for verified university students.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
