import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">Multi-tenant Operations Platform</p>
        <h1 className="text-4xl font-bold tracking-tight">
          Workplace Operations
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Complete workforce management for restaurants, retail, property, construction, 
          and 25+ other industries. Tasks, scheduling, staff management, and more.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>For Businesses</CardTitle>
            <CardDescription>
              Customer portal to manage your operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/customer-login">
              <Button className="w-full">Customer Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="w-full">Create Company Account</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>For Operators</CardTitle>
            <CardDescription>
              Platform administration and control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">Operator Sign In</Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">
              Development access only
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          P1 · Web console · 30+ industries · Multi-region support
        </p>
      </div>
    </main>
  );
}
