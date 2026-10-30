import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, Waypoints } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const points = [
  {
    icon: Building2,
    title: "One company, one tenant",
    body: "Signup creates the company and its first admin. Data stays inside that company.",
  },
  {
    icon: Waypoints,
    title: "Industry, then modules",
    body: "Restaurant, retail, property, construction, and the rest of the catalogue set the defaults. Admins turn the rest on.",
  },
  {
    icon: ShieldCheck,
    title: "Rules live on the server",
    body: "The web console and a future mobile app read the same /api/v1 bootstrap.",
  },
];

export default function Home() {
  return (
    <div className="app-canvas min-h-svh">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              W
            </div>
            <span className="text-sm font-semibold tracking-tight">Workplace</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/customer-login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start a company</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:py-24">
        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Badge variant="secondary">Operations console</Badge>
            <h1 className="max-w-xl text-4xl sm:text-5xl">
              Run the floor from one calm workspace.
            </h1>
            <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
              Tasks, people, shifts, and the modules your industry actually uses.
              Officials work here. Frontline mobile comes later and follows this server.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Create a company
                  <ArrowRight />
                </Button>
              </Link>
              <Link href="/customer-login">
                <Button size="lg" variant="outline">Customer sign in</Button>
              </Link>
            </div>
          </div>
          <Card className="border-0 bg-card/80 shadow-lg shadow-primary/5 ring-1 ring-foreground/10 backdrop-blur">
            <CardHeader>
              <CardDescription>Today</CardDescription>
              <CardTitle>Harbour Kitchen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Opening checklist", "Due 10:00"],
                ["Floor recovery", "In progress"],
                ["Cash-up", "Unassigned"],
              ].map(([title, state]) => (
                <div key={title} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-3">
                  <span className="text-sm font-medium">{title}</span>
                  <span className="font-numeric text-xs text-muted-foreground">{state}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {points.map((point) => (
            <Card key={point.title} className="bg-card/70 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <point.icon className="size-4 text-primary" />
                <CardTitle>{point.title}</CardTitle>
                <CardDescription>{point.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Platform operators</CardTitle>
            <CardDescription>
              The /login gate is development-only. It is separate from a customer company.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline">Operator sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
