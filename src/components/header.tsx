
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Home, Smile, MessageCircle, CheckSquare, User, BarChart3, Star, Brain, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/mood', icon: Smile, label: 'Mood' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/journal', icon: Brain, label: 'Journal' },
  { href: '/calm', icon: HeartPulse, label: 'Calm' },
  { href: '/badges', icon: Star, label: 'Badges' },
  { href: '/profile/settings', icon: User, label: 'Profile' },
];

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Logo />
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname === item.href ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:hidden">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="px-2 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <Link href="/" className="flex items-center" onClick={() => setIsOpen(false)}>
                <Logo />
              </Link>
              <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                <div className="flex flex-col space-y-3">
                   {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-md p-2 text-lg font-medium transition-colors hover:text-foreground/80',
                         pathname === item.href ? 'text-foreground bg-accent' : 'text-foreground/60'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
