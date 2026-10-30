'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/companies/modules');
        const data = await res.json();
        if (!ignore && Array.isArray(data)) setModules(data);
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

  const grouped = modules.reduce<Record<string, Module[]>>((acc, module) => {
    const category = module.category || 'other';
    acc[category] = acc[category] ?? [];
    acc[category].push(module);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  return (
    <div className="space-y-6">
      <div>
        <h1>Modules</h1>
        <p className="text-sm text-muted-foreground">Turn features on for this company. Defaults came from the industry.</p>
      </div>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No module catalogue was returned.</p>
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
                {grouped[category].map((module) => (
                  <Card key={module.id} className="bg-card/80 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="flex-row items-start justify-between gap-3">
                      <div>
                        <CardTitle>{module.display_name}</CardTitle>
                        {module.description && <CardDescription>{module.description}</CardDescription>}
                      </div>
                      <Badge variant={module.is_enabled ? 'default' : 'outline'}>
                        {module.is_enabled ? 'On' : 'Off'}
                      </Badge>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{module.name}</span>
                      <Switch
                        checked={module.is_enabled}
                        onCheckedChange={(checked) => void setEnabled(module.id, checked)}
                        aria-label={`Toggle ${module.display_name}`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
