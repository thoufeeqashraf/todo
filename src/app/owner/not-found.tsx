import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function OwnerNotFound() {
  return (
    <div className="space-y-3">
      <h1>Business not found</h1>
      <p className="text-sm text-muted-foreground">That id is not a company on this platform.</p>
      <Button variant="outline" render={<Link href="/owner/tenants" />}>
        All businesses
      </Button>
    </div>
  );
}
