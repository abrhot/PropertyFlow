import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">PropertyFlow</h1>
          <p className="text-sm text-muted-foreground">SaaS Property Management Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
