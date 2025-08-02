import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';

export function MainAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
