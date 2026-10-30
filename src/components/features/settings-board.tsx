'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { runModule } from '@/app/customer/actions';
import { EmptyState } from '@/components/empty-state';
import { Callout, Metric, PageHeader, TableSkeleton } from '@/components/features/chrome';
import { isRecord, payloadOf, text, type ModuleLoad } from '@/components/features/records';
import { useModuleData } from '@/components/features/use-module';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const regions = [
  { id: 'za', title: 'South Africa', body: 'Company data is marked for the South Africa region.' },
  { id: 'eu', title: 'European Union', body: 'Company data is marked for the EU region.' },
  { id: 'multi', title: 'Multi-region', body: 'The company can span regions. A single deployment region is not locked.' },
];

export function SettingsBoard({ initial }: { initial?: ModuleLoad }) {
  const { state, loading, reload } = useModuleData('settings', initial);
  const company = isRecord(payloadOf(state)?.settings) ? payloadOf(state)?.settings : null;
  const serverName = isRecord(company) && typeof company.name === 'string' ? company.name : '';
  const serverRegion = isRecord(company) && typeof company.region === 'string' && regions.some((item) => item.id === company.region)
    ? company.region
    : 'za';
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [regionDraft, setRegionDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const name = nameDraft ?? serverName;
  const region = regionDraft ?? serverRegion;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await runModule('settings', { name, region });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Company settings saved');
    reload();
  }

  if (loading && !state) return <TableSkeleton rows={4} />;
  if (state && !state.ok) {
    return <EmptyState title="Settings are unavailable" body={state.error} action={<Button onClick={reload}>Try again</Button>} />;
  }
  if (!isRecord(company)) {
    return <EmptyState title="No company settings" body="The server did not return a company row." action={<Button onClick={reload}>Try again</Button>} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Company"
        title="Settings"
        description={state?.ok ? state.blurb : 'Company name and hosting region.'}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Slug" value={text(company.slug)} hint="Used in links" />
        <Metric label="Region" value={region.toUpperCase()} hint="za, eu, or multi" />
        <Metric label="Name" value={name || '—'} hint="Shown in the console" />
      </div>
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-4 rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
          <div>
            <h2 className="text-base">Identity</h2>
            <p className="text-sm text-muted-foreground">Only an admin can save. Logos and colours are not part of this form.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input id="company-name" name="name" value={name} onChange={(event) => setNameDraft(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-slug">Slug</Label>
            <Input id="company-slug" value={text(company.slug, '')} readOnly className="font-numeric" />
          </div>
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
        </section>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Hosting region</legend>
          {regions.map((item) => {
            const selected = region === item.id;
            return (
              <label
                key={item.id}
                className={`block cursor-pointer rounded-xl bg-card px-4 py-3 shadow-sm ring-1 transition-colors ${selected ? 'ring-primary' : 'ring-foreground/10 hover:ring-foreground/20'}`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="region"
                    value={item.id}
                    checked={selected}
                    onChange={() => setRegionDraft(item.id)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{item.body}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </form>
      <Callout title="What this does not change" body="Per-company logos, colours, and a single global deployment region are still open. This form only stores the company name and za, eu, or multi." />
    </div>
  );
}
