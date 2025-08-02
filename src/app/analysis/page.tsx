'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, BarChart3,ClipboardCheck, ArrowRight, MessageSquareQuote, Trophy } from 'lucide-react';
import Link from 'next/link';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const chartData = [
  { emotion: "Anxious", value: 50, fill: "var(--color-anxious)" },
  { emotion: "Overwhelmed", value: 30, fill: "var(--color-overwhelmed)" },
  { emotion: "Hopeful", value: 15, fill: "var(--color-hopeful)" },
  { emotion: "Calm", value: 5, fill: "var(--color-calm)" },
];

const chartConfig = {
  value: {
    label: "Percentage",
  },
  anxious: {
    label: "Anxious",
    color: "hsl(var(--chart-1))",
  },
  overwhelmed: {
    label: "Overwhelmed",
    color: "hsl(var(--chart-2))",
  },
  hopeful: {
    label: "Hopeful",
    color: "hsl(var(--chart-3))",
  },
  calm: {
    label: "Calm",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;


export default function AnalysisPage() {
  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Session Analysis</h1>
          <p className="text-muted-foreground">Here's a breakdown of your recent therapy session.</p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
             <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 /> Mood Analysis</CardTitle>
                <CardDescription>Emotional state expressed during the session.</CardDescription>
              </CardHeader>
              <CardContent>
                 <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="emotion"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <XAxis dataKey="value" type="number" hide />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={5} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb /> Key Insights</CardTitle>
                <CardDescription>Recurring themes and important points from your conversation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                 <div className="flex items-start gap-3">
                    <MessageSquareQuote className="h-5 w-5 text-primary mt-1 shrink-0" />
                    <p className="text-muted-foreground">You mentioned "self-doubt" and feeling "stuck" multiple times, especially in relation to career decisions.</p>
                </div>
                <div className="flex items-start gap-3">
                    <MessageSquareQuote className="h-5 w-5 text-primary mt-1 shrink-0" />
                    <p className="text-muted-foreground">There's a pattern of prioritizing others' expectations over your own needs.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-primary/10 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck /> Actionable Advice</CardTitle>
                <CardDescription>Practical steps to take based on your session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">1. Journal about your ideal career</h3>
                  <p className="text-sm text-muted-foreground">Spend 10 minutes writing what a fulfilling work life looks like to you, without any judgment.</p>
                </div>
                 <div className="space-y-1">
                  <h3 className="font-semibold">2. Practice saying "no" once</h3>
                  <p className="text-sm text-muted-foreground">Find one small opportunity this week to politely decline a request that doesn't align with your priorities.</p>
                </div>
                 <div className="space-y-1">
                  <h3 className="font-semibold">3. Reach out to one friend</h3>
                  <p className="text-sm text-muted-foreground">Share a small part of how you're feeling with someone you trust.</p>
                </div>
                <Link href="/tasks">
                  <Button className="w-full">
                    Add to Daily Tasks <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Follow-Up</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-3">Want to continue this conversation next time?</p>
                    <Button variant="outline" className="w-full">Set a Reminder</Button>
                </CardContent>
             </Card>

             <div className="flex justify-center">
                <Badge variant="outline" className="p-2 px-4 text-sm">
                    <Trophy className="h-4 w-4 mr-2 text-yellow-500"/> You've unlocked the "Self-Reflector" badge!
                </Badge>
             </div>
          </div>
        </div>
      </div>
    </MainAppLayout>
  );
}
