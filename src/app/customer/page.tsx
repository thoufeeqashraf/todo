import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-session';
import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { logoutCustomer } from './actions';

export const instant = false;

export default async function CustomerDashboardPage() {
  const session = await getCustomerSession();
  
  if (!session) {
    redirect('/customer-login');
  }

  // Get company with industry
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('*, industries(*)')
    .eq('id', session.companyId)
    .single();

  // Get enabled modules count
  const { data: enabledModules } = await supabaseAdmin
    .from('company_modules')
    .select('*')
    .eq('company_id', session.companyId)
    .eq('is_enabled', true);

  const moduleCount = enabledModules?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{company?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {company?.industries?.display_name} · {company?.region.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)}
            </Badge>
            <span className="text-sm">
              {session.user.first_name} {session.user.last_name}
            </span>
            <form action={logoutCustomer}>
              <Button type="submit" variant="outline" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Welcome to your dashboard</h2>
          <p className="text-muted-foreground">
            Manage your operations, team, and business workflows
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>Active features for your company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{moduleCount}</div>
              <p className="text-sm text-muted-foreground mb-4">modules enabled</p>
              {session.user.role === 'admin' && (
                <Link href="/customer/modules">
                  <Button variant="outline" size="sm">Manage Modules</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Link href="/customer/tasks">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Manage and assign work</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and manage tasks, assignments, and deadlines
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/customer/module/onboarding">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Onboarding</CardTitle>
                <CardDescription>Setup checklist</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Industry, modules, people, and the first task
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/customer/staff">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Staff</CardTitle>
                <CardDescription>Team management</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage your team members and departments
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/customer/scheduling">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Scheduling</CardTitle>
                <CardDescription>Shifts and rosters</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create schedules and manage shifts
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/customer/reports">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Analytics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View reports and analytics
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/customer/module/incidents">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Incidents</CardTitle>
                <CardDescription>Module gated</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Noise, maintenance, and other tickets</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/attendance">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Attendance</CardTitle>
                <CardDescription>Geofence clock-in</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Refuses clock-in outside the saved geofence</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/wallet">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Wallet</CardTitle>
                <CardDescription>Ledger, payments stub</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manual ledger only. Top-up does not move money.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/pos">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>POS</CardTitle>
                <CardDescription>Orders stay unpaid</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Table orders without a payment provider</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/cctv">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>CCTV</CardTitle>
                <CardDescription>Registry, no stream</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Camera names only</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/find">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Find My Staff</CardTitle>
                <CardDescription>Consented coordinates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No map provider is connected</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/health">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Staff health</CardTitle>
                <CardDescription>Provisional rules score</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Visible to managers and admins</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/mini-apps">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Mini-apps</CardTitle>
                <CardDescription>Marketplace shell</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No partner APIs are connected</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customer/module/notifications">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>In-app notices</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Push and email delivery are not connected</p>
              </CardContent>
            </Card>
          </Link>

          {session.user.role === 'admin' && (
            <Link href="/customer/module/audit">
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle>Audit log</CardTitle>
                  <CardDescription>Company history</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Admin-only record of changes</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {session.user.role === 'admin' && (
            <Link href="/customer/settings">
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Company configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage company settings and preferences
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
