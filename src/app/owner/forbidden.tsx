import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OwnerForbidden() {
  return (
    <main className="app-canvas flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle>Platform owner only</CardTitle>
          <CardDescription>
            This account can run one company. It is not the vendor account for every business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/customer" />}>
            Back to the company
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
