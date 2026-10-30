import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomerSession } from '@/lib/customer-session';
import { redirect } from 'next/navigation';

export const instant = false;

export default async function SettingsPage() {
  const session = await getCustomerSession();
  
  if (!session) {
    redirect('/customer-login');
  }

  // Only admins can access settings
  if (session.user.role !== 'admin') {
    redirect('/customer');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Link href="/customer">
            <Button variant="ghost" size="sm" className="mb-2">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-semibold">Company Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your company preferences and integrations
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Basic information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Update company name, industry, and region
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Logo and colors</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your company's appearance
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect external services</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Payment gateways, CCTV, and third-party APIs
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Alert preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure email and push notification settings
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Access control</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Password policies, two-factor auth, and audit logs
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Subscription management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View plans, invoices, and payment methods
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
