'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Bell, Download, Trash2, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const isGuest = false; // This would be dynamic state

  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences.</p>
        </header>

        <div className="space-y-8">
          {isGuest && (
            <Card className="bg-primary/10 border-primary/50">
              <CardHeader>
                <CardTitle>You are in Guest Mode</CardTitle>
                <CardDescription>Sign up to save your progress and unlock all features.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Upgrade to a Full Account</Button>
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
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <Button variant="outline">Change Photo</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" defaultValue="Explorer" disabled={isGuest} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="user@example.com" disabled />
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
                <Switch />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2"><Bell/> Notifications</Label>
                   <p className="text-xs text-muted-foreground">
                    Receive reminders for tasks and journals.
                  </p>
                </div>
                <Switch defaultChecked />
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
