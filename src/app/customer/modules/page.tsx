'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  LayoutGrid,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Store,
  Users,
  Video,
  Wallet,
} from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { DataToolbar, Metric, PageHeader, StatusBadge, TableSkeleton } from '@/components/features/chrome';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Module {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string | null;
  is_enabled: boolean;
}

const labels: Record<string, string> = {
  core: 'Core',
  operations: 'Operations',
  analytics: 'Analytics',
  system: 'System',
};

const icons: Record<string, typeof Users> = {
  staff: Users,
  tasks: ClipboardList,
  scheduling: CalendarDays,
  incidents: Shield,
  attendance: LayoutGrid,
  staff_health: HeartPulse,
  health: HeartPulse,
  wallet: Wallet,
  pos: Store,
  reports: Receipt,
  notifications: Bell,
  cctv: Video,
  mini_apps: Sparkles,
  settings: Settings,
};

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('all');

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/companies/modules');
        const data: unknown = await res.json();
        if (!ignore && Array.isArray(data)) setModules(data as Module[]);
        if (!ignore && !Array.isArray(data)) toast.error('Modules are not available yet.');
      } catch {
        if (!ignore) toast.error('Could not load modules.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  async function setEnabled(moduleId: string, isEnabled: boolean) {
    const previous = modules;
    setModules(modules.map((item) => (item.id === moduleId ? { ...item, is_enabled: isEnabled } : item)));
    const res = await fetch('/api/companies/modules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, isEnabled }),
    });
    if (!res.ok) {
      setModules(previous);
      toast.error('Only an admin can change modules, and Supabase has to be configured.');
      return;
    }
    toast.success(isEnabled ? 'Module on' : 'Module off');
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return modules.filter((module) => {
      const matchesQuery = !needle || `${module.display_name} ${module.name} ${module.description ?? ''}`.toLowerCase().includes(needle);
      const matchesMode = mode === 'all' || (mode === 'on' ? module.is_enabled : !module.is_enabled);
      return matchesQuery && matchesMode;
    });
  }, [modules, query, mode]);

  const grouped = filtered.reduce<Record<string, Module[]>>((acc, module) => {
    const category = module.category || 'other';
    acc[category] = acc[category] ?? [];
    acc[category].push(module);
    return acc;
  }, {});
  const categories = Object.keys(grouped);
  const enabled = modules.filter((module) => module.is_enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Company"
        title="Modules"
        description="Turn features on for this company. Defaults came from the industry. Optional modules stay off until an admin enables them."
      />
      {loading ? (
        <TableSkeleton rows={4} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Catalogue" value={modules.length} hint="Available to this company" />
            <Metric label="On" value={enabled} hint="Enabled right now" />
            <Metric label="Off" value={Math.max(modules.length - enabled, 0)} hint="Hidden from the console" />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="on">On</TabsTrigger>
                <TabsTrigger value="off">Off</TabsTrigger>
              </TabsList>
            </Tabs>
            <DataToolbar query={query} onQuery={setQuery} placeholder="Search modules" />
          </div>
          {modules.length === 0 ? (
            <EmptyState title="No module catalogue" body="The server did not return modules. Check the company session and Supabase." />
          ) : categories.length === 0 ? (
            <EmptyState title="No matches" body="Try another search or show every module." />
          ) : (
            <Tabs defaultValue={categories[0]}>
              <TabsList>
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>{labels[category] ?? category}</TabsTrigger>
                ))}
              </TabsList>
              {categories.map((category) => (
                <TabsContent key={category} value={category} className="mt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {grouped[category].map((module) => {
                      const Icon = icons[module.name] ?? Sparkles;
                      return (
                        <Card key={module.id} className="bg-card/80 shadow-sm ring-1 ring-foreground/10">
                          <CardHeader className="flex-row items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="size-4" />
                              </span>
                              <div>
                                <CardTitle>{module.display_name}</CardTitle>
                                {module.description ? <CardDescription>{module.description}</CardDescription> : null}
                              </div>
                            </div>
                            <StatusBadge value={module.is_enabled ? 'active' : 'off'} />
                          </CardHeader>
                          <CardContent className="flex items-center justify-between">
                            <Badge variant="outline" className="font-numeric">{module.name}</Badge>
                            <Switch
                              checked={module.is_enabled}
                              onCheckedChange={(checked) => void setEnabled(module.id, checked)}
                              aria-label={`Toggle ${module.display_name}`}
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
