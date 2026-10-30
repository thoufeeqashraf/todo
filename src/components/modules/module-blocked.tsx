import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/modules/page-header';

export function ModuleBlocked({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Unavailable" title={title} description={body} />
      <EmptyState title={`${title} is unavailable`} body={body} />
    </div>
  );
}
