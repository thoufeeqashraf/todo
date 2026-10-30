'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Module {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string | null;
  is_enabled: boolean;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/companies/modules');
        const data = await res.json();
        if (!ignore) setModules(data);
      } catch (err) {
        console.error('Failed to fetch modules:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const toggleModule = async (moduleId: string, currentlyEnabled: boolean) => {
    try {
      await fetch('/api/companies/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, isEnabled: !currentlyEnabled }),
      });
      
      setModules(modules.map(m => 
        m.id === moduleId ? { ...m, is_enabled: !currentlyEnabled } : m
      ));
    } catch (err) {
      console.error('Failed to toggle module:', err);
    }
  };

  const groupedModules = modules.reduce((acc, module) => {
    const category = module.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, Module[]>);

  if (loading) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Link href="/customer">
            <Button variant="ghost" size="sm" className="mb-2">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-semibold">Module Management</h1>
          <p className="text-sm text-muted-foreground">
            Enable or disable features for your company
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {Object.entries(groupedModules).map(([category, categoryModules]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold mb-4 capitalize">
              {category === 'core' ? 'Core Features' : 
               category === 'operations' ? 'Operations' :
               category === 'analytics' ? 'Analytics & Reports' :
               category === 'system' ? 'System' : category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryModules.map((module) => (
                <Card key={module.id} className={module.is_enabled ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{module.display_name}</CardTitle>
                        {module.description && (
                          <CardDescription className="text-xs mt-1">
                            {module.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={module.is_enabled ? 'default' : 'outline'}>
                        {module.is_enabled ? 'ON' : 'OFF'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={module.is_enabled ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleModule(module.id, module.is_enabled)}
                      className="w-full"
                    >
                      {module.is_enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
