'use client';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import { PropsWithChildren } from 'react';

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

export default function ConvexClientProvider({ children }: PropsWithChildren) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
