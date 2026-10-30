import { EmptyState } from '@/components/empty-state';

import { PageHeader } from './page-header';

export function AdminGate({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title={title}
        description="This page is limited to company admins."
      />
      <EmptyState
        title="Admins only"
        body="Your role cannot open this page. A company admin can invite you again with the admin role if you need it."
      />
    </div>
  );
}
