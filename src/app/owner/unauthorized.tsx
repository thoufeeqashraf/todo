import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OwnerUnauthorized() {
  return (
    <main className="app-canvas flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>The platform console is only available to a signed-in platform owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/customer-login?next=/owner" />}>Sign in</Button>
        </CardContent>
      </Card>
    </main>
  );
}
