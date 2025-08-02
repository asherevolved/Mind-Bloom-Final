
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Bell, Download, Trash2, Moon, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

type Preferences = {
    dark_mode: boolean;
    notification_frequency: string;
};

type UserProfile = {
  id: string;
  email?: string;
  name?: string;
};

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
      const fetchUserData = async () => {
          setIsLoading(true);
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
              const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id, email, name')
                .eq('auth_uid', session.user.id)
                .single();

              if (profile) {
                  setUser(profile);
                  const { data: prefs, error: prefsError } = await supabase
                      .from('preferences')
                      .select('dark_mode, notification_frequency')
                      .eq('user_id', profile.id)
                      .single();

                  if (prefsError && prefsError.code !== 'PGRST116') { // Ignore 'no rows found'
                      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch preferences.' });
                  } else {
                      setPreferences(prefs || { dark_mode: false, notification_frequency: 'daily' });
                  }
              }
          } else {
            const guest = sessionStorage.getItem('isGuest') === 'true';
            setIsGuest(guest);
          }
          setIsLoading(false);
      };
      fetchUserData();
  }, [toast]);

  const handleUpdatePreferences = async (newPrefs: Partial<Preferences>) => {
      if (!user || !preferences) return;
      
      const updatedPrefs = { ...preferences, ...newPrefs };
      setPreferences(updatedPrefs);

      const { error } = await supabase
          .from('preferences')
          .update(updatedPrefs)
          .eq('user_id', user.id);
      
      if (error) {
          toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
          // Revert optimistic update
          setPreferences(preferences);
      } else {
          toast({ title: 'Preferences Saved!' });
      }
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    router.push('/');
  }

  if (isLoading) {
    return (
        <MainAppLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </MainAppLayout>
    )
  }

  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="font-headline text-3xl font-bold text-foreground">Profile & Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences.</p>
            </div>
            {!isGuest && <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2"/>Logout</Button>}
        </header>

        <div className="space-y-8">
          {isGuest && !user && (
            <Card className="bg-primary/10 border-primary/50">
              <CardHeader>
                <CardTitle>You are in Guest Mode</CardTitle>
                <CardDescription>Sign up to save your progress and unlock all features.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => router.push('/signup')}>Upgrade to a Full Account</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="profile avatar" />
                  <AvatarFallback>{user?.name?.[0] || 'G'}</AvatarFallback>
                </Avatar>
                <Button variant="outline" disabled>Change Photo</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" defaultValue={user?.name || 'Guest'} disabled={isGuest} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email || 'guest@example.com'} disabled />
              </div>
              <Button disabled={isGuest}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2"><Moon/> Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable a darker theme for the app.
                  </p>
                </div>
                <Switch 
                    checked={preferences?.dark_mode} 
                    onCheckedChange={(checked) => handleUpdatePreferences({ dark_mode: checked })}
                    disabled={isGuest}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2"><Bell/> Notifications</Label>
                   <p className="text-xs text-muted-foreground">
                    Receive reminders for tasks and journals.
                  </p>
                </div>
                <Switch defaultChecked disabled={isGuest}/>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-destructive">
             <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
               <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button variant="outline" className="w-full justify-start text-left" disabled={isGuest}>
                  <Download className="mr-2 h-4 w-4" /> Download My Data
                </Button>
               <Button variant="destructive" className="w-full justify-start text-left" disabled={isGuest}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainAppLayout>
  );
}
