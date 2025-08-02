
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Step 1: Sign up the user
    const { data: { user: signedUpUser }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `https://google.com/search?q=email-confirmed`,
        data: {
          full_name: name,
        },
      },
    });

    if (signUpError) {
      toast({ variant: 'destructive', title: 'Signup Failed', description: signUpError.message });
      setIsLoading(false);
      return;
    }

    if (!signedUpUser) {
      toast({ variant: 'destructive', title: 'Signup Error', description: 'Could not create user. A confirmation email has been sent.' });
      setIsLoading(false);
      return;
    }

    // Step 2: Immediately sign in the user to create a session
    const { data: { user: loggedInUser }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
    if (signInError) {
        toast({ variant: 'destructive', title: 'Login after signup failed', description: signInError.message });
        setIsLoading(false);
        return;
    }

    if (loggedInUser) {
      // Step 3: Create the user profile in the public `users` table
      const { error: profileError } = await supabase.from('users').insert({
          auth_uid: loggedInUser.id,
          email: loggedInUser.email,
          name: name,
      });

      if (profileError) {
          toast({ variant: 'destructive', title: 'Profile Creation Failed', description: profileError.message });
          setIsLoading(false);
          return;
      }
      
      toast({ title: 'Account Created!', description: 'Welcome to Mind Bloom.' });
      router.push('/onboarding');
    } else {
      toast({ variant: 'destructive', title: 'Signup Error', description: 'Could not log you in after creating account. Please try logging in manually.' });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <header className="flex justify-center mb-8">
          <Logo />
        </header>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
            <CardDescription>Start your path to mental wellness</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required/>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-sm">
            <p>
              Already have an account?{' '}
              <Link href="/" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
