import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const instant = false;

export default async function SchedulingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Link href="/customer">
            <Button variant="ghost" size="sm" className="mb-2">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-semibold">Scheduling & Roster</h1>
          <p className="text-sm text-muted-foreground">
            Manage work schedules, shifts, and attendance
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Shift Planning</CardTitle>
              <CardDescription>Create and manage shifts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Weekly/monthly shift scheduling with staff assignments
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Roster</CardTitle>
              <CardDescription>Intelligent scheduling</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                AI-powered roster optimization based on demand and availability
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
              <CardDescription>Clock in/out tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Track attendance with geofencing and travel exceptions
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Geofence Clock-In</CardTitle>
              <CardDescription>Location-based attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Require staff to be on-site for clock-in (mobile app feature)
              </p>
              <Button variant="outline" size="sm" disabled>Mobile Only</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Travel Days</CardTitle>
              <CardDescription>Off-site work management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Pre-approve off-site work and client visits
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
