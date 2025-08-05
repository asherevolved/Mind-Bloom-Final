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
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';


type Preferences = {
    darkMode: boolean;
    notificationFrequency: string;
};

type UserProfile = {
  uid: string;
  _id?: string;
  email?: string;
  name?: string;
  photoURL?: string;
};

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [name, setName] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const allUsers = useQuery(api.crud.list, user ? { table: 'users' } : 'skip');
  const updateUser = useMutation(api.crud.update);

  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
              setIsGuest(false);
              const userDoc: any = allUsers?.find((u: any) => u.uid === currentUser.uid);

              if (userDoc) {
                  setUser({
                      uid: currentUser.uid,
                      _id: userDoc._id,
                      email: currentUser.email || '',
                      name: userDoc.name || currentUser.displayName || '',
                      photoURL: currentUser.photoURL || '',
                  });
                  setName(userDoc.name || currentUser.displayName || '');
                  setPreferences({
                      darkMode: userDoc.darkMode ?? true,
                      notificationFrequency: userDoc.notificationFrequency ?? 'daily',
                  });
              } else if (allUsers !== undefined) { // ensure query has run
                  setUser({ // fallback user object
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      name: currentUser.displayName || '',
                      photoURL: currentUser.photoURL || '',
                  });
                  setName(currentUser.displayName || '');
              }
          } else {
              const guest = sessionStorage.getItem('isGuest') === 'true';
              setIsGuest(guest);
              if (guest) {
                setUser({ uid: 'guest', name: 'Guest', email: 'guest@example.com' });
                setName('Guest');
              }
          }
          setIsLoading(false);
      });
      return () => unsubscribe();
  }, [allUsers]);

  const handleUpdateProfile = async () => {
    if (!user || isGuest || !auth.currentUser || !user._id) return;
    try {
        await updateProfile(auth.currentUser, { displayName: name });
        await updateUser({table: 'users', id: user._id, patch: { name }});
        toast({ title: 'Profile Updated!' });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Update failed', description: error.message});
    }
  }

  const handleUpdatePreferences = async (newPrefs: Partial<Preferences>) => {
      if (!user || !preferences || isGuest || !user._id) return;
      
      const updatedPrefs = { ...preferences, ...newPrefs, darkMode: true };
      setPreferences(updatedPrefs);

      try {
        await updateUser({ table: 'users', id: user._id, patch: updatedPrefs});
        toast({ title: 'Preferences Saved!' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
          setPreferences(preferences); // Revert
      }
  };
  
  const handleLogout = async () => {
    await signOut(auth);
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
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2"/>{isGuest ? 'Exit Guest Mode' : 'Logout'}</Button>
        </header>

        <div className="space-y-8">
          {isGuest && (
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
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.photoURL || undefined} data-ai-hint="profile avatar" />
                  <AvatarFallback>{user?.name?.[0]?.toUpperCase() || 'G'}</AvatarFallback>
                </Avatar>
                <Button variant="outline" disabled>Change Photo</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isGuest} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || 'guest@example.com'} disabled />
              </div>
              <Button onClick={handleUpdateProfile} disabled={isGuest || !user?._id}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2"><Moon/> Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enjoy the dark theme.
                  </p>
                </div>
                <Switch 
                    checked={true}
                    disabled={true}
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
            <CardContent className="space-y-4 pt-6">
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
