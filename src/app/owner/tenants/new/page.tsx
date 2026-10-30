import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { CreateTenantForm } from '@/components/owner/create-tenant-form';
import { requirePageOwner } from '@/lib/owner/page-owner';
import { listIndustryTemplates } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';

export const instant = false;

export default async function NewTenantPage() {
  const owner = await requirePageOwner();
  if (!owner.configured) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set the Supabase URL and service role, then apply migrations 001–003."
      />
    );
  }
  const industries = await listIndustryTemplates(supabaseOwnerStore);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Owner"
        title="New business"
        description="Creates the company, turns on its industry modules, and invites the first admin. No password is set here."
      />
      <CreateTenantForm
        industries={industries.map((industry) => ({
          id: industry.id,
          displayName: industry.displayName,
          description: industry.description,
        }))}
      />
    </div>
  );
}
