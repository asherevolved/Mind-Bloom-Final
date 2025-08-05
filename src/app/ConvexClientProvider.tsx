'use client';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { PropsWithChildren } from 'react';

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function ConvexClientProvider({ children }: PropsWithChildren) {
  if (!clerkPubKey) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Missing Clerk Key</h1>
                <p className="text-muted-foreground">
                    Please add your Clerk Publishable Key to the .env file as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
                </p>
            </div>
        </div>
    )
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
        </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
