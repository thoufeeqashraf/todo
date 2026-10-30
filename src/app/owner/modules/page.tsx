import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { EmptyState } from '@/components/empty-state';
import { countOrDash } from '@/components/owner/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requirePageOwner } from '@/lib/owner/page-owner';
import { listModuleCatalogue } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';

export const instant = false;

export default async function ModulesPage() {
  const owner = await requirePageOwner();
  if (!owner.configured) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="The module catalogue is seeded by migrations 001 and 003."
      />
    );
  }
  const catalogue = await listModuleCatalogue(supabaseOwnerStore);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Modules"
        description="The shared catalogue. Enabling a module for one business is done on that business page, not here."
      />
      {catalogue.modules.length === 0 ? (
        <EmptyState title="No modules" body="Apply migrations 001 and 003 to seed the catalogue." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Businesses on</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogue.modules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>
                    <p className="font-medium">{module.displayName}</p>
                    <p className="text-xs text-muted-foreground">{module.description || module.name}</p>
                  </TableCell>
                  <TableCell className="capitalize">{module.category || '—'}</TableCell>
                  <TableCell className="font-numeric">
                    {catalogue.countsAvailable ? countOrDash(module.enabledCompanies) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
