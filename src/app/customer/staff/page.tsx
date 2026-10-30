import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const instant = false;

export default async function StaffPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Link href="/customer">
            <Button variant="ghost" size="sm" className="mb-2">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-semibold">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members, departments, and organizational structure
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>View and manage staff</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Complete user management with roles, departments, and hierarchy
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Organizational structure</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create departments with hierarchical management up to 10 levels
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>Invite new team members</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Send email invitations to join your company
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Health</CardTitle>
              <CardDescription>Performance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                AI-driven staff health scores based on task completion and history
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Find My Staff</CardTitle>
              <CardDescription>GPS location tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Real-time GPS tracking for authorized managers (requires mobile app)
              </p>
              <Button variant="outline" size="sm" disabled>Mobile Only</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
