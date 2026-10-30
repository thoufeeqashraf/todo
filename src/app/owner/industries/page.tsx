import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePageOwner } from '@/lib/owner/page-owner';
import { listIndustryTemplates } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';

export const instant = false;

export default async function IndustriesPage() {
  const owner = await requirePageOwner();
  if (!owner.configured) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Industries are seeded by migration 001. Apply it before this catalogue can load."
      />
    );
  }
  const industries = await listIndustryTemplates(supabaseOwnerStore);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Industries"
        description="Each industry stores default module names. Checklist labels that exist in the app are shown beside that template. There is no separate templates table."
      />
      {industries.length === 0 ? (
        <EmptyState title="No industries" body="Apply migration 001 to seed the catalogue." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {industries.map((industry) => (
            <Card key={industry.id} className="bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>{industry.displayName}</CardTitle>
                <CardDescription>{industry.description || industry.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {industry.modules.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No default modules</span>
                  ) : (
                    industry.modules.map((module) => (
                      <Badge key={module.name} variant={module.inCatalogue ? 'secondary' : 'outline'}>
                        {module.displayName}
                      </Badge>
                    ))
                  )}
                </div>
                {industry.labels.checklists.length > 0 ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {industry.labels.checklists.map((list) => (
                      <li key={list.name}>
                        {list.name}: {list.items.join(', ')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No checklist pack is stored for this industry in the app.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
