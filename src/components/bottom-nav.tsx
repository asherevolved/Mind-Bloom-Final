'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Smile, MessageCircle, CheckSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/mood', icon: Smile, label: 'Mood' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/profile/settings', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background/95 backdrop-blur-sm sm:h-auto">
      <nav className="flex h-full items-center justify-around px-2 sm:container sm:mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-primary sm:w-24 sm:py-2',
                isActive ? 'text-primary bg-accent/80' : 'hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
