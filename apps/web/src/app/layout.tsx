import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FieldTrack Admin',
  description: 'Field Operations Management Platform - Admin Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
