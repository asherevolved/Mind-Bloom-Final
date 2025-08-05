import type { Metadata } from 'next';
import { Playfair_Display, PT_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import ConvexClientProvider from './ConvexClientProvider';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mind Bloom',
  description: 'Your personal guide to mental wellness.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", playfairDisplay.variable, ptSans.variable)} suppressHydrationWarning>
      <head />
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
