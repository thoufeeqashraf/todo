import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const instant = false;

export default async function ReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Link href="/customer">
            <Button variant="ghost" size="sm" className="mb-2">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Task Analytics</CardTitle>
              <CardDescription>Completion rates and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Track task completion, overdue items, and team performance
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
              <CardDescription>Staff attendance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze attendance patterns, lateness, and absences
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operations Dashboard</CardTitle>
              <CardDescription>Real-time operations overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Live view of tasks, staff on duty, and active incidents
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Individual and team metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Performance scores, completion rates, and quality metrics
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Industry Reports</CardTitle>
              <CardDescription>Sector-specific analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Customized reports based on your industry
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>CSV and PDF exports</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Export reports for external analysis
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
