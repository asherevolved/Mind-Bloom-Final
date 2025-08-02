import type { ReactNode } from 'react';
import { Header } from './header';

export function MainAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 pt-16">{children}</main>
    </div>
  );
}
