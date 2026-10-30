import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export function ModuleUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1>{title}</h1>
        <p className="text-sm text-muted-foreground">This module is off for the company.</p>
      </div>
      <EmptyState
        title="Turn the module on to open this screen"
        body={`${message} An admin can enable it from Modules.`}
        action={
          <Button variant="outline" render={<Link href="/customer/modules" />}>
            Modules
          </Button>
        }
      />
    </div>
  );
}
