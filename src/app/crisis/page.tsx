import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

export default function CrisisPage() {
  return (
    <MainAppLayout>
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-destructive">
              Need Urgent Help?
            </CardTitle>
            <CardDescription>
              If you are in a crisis or any other person may be in danger, please use these resources immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a href="tel:988" className="block">
              <Button className="w-full h-16 text-lg" variant="destructive">
                <Phone className="mr-4 h-6 w-6" /> Call 988 Crisis Line
              </Button>
            </a>
             <a href="https://www.google.com/maps/search/?api=1&query=mental+health+support+near+me" target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full h-16 text-lg" variant="outline">
                <MapPin className="mr-4 h-6 w-6" /> Find Help Near Me
              </Button>
            </a>
            <Link href="/calm" className="block">
              <Button className="w-full h-16 text-lg" variant="secondary">
                <HeartPulse className="mr-4 h-6 w-6" /> Use a Calming Tool
              </Button>
            </Link>
          </CardContent>
        </Card>
        <p className="mt-8 text-sm text-muted-foreground">
            Remember, it's okay to ask for help. You are not alone.
        </p>
      </div>
    </MainAppLayout>
  );
}
