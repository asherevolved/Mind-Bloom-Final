import { BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrainCircuit className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-headline font-bold text-foreground">
        Mind Bloom
      </h1>
    </div>
  );
}
