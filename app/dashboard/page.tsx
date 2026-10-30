'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Module {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string | null;
  is_enabled: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/companies/modules');
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const toggleModule = async (moduleId: string, currentStatus: boolean) => {
    setUpdating(moduleId);
    try {
      const res = await fetch('/api/companies/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          isEnabled: !currentStatus,
        }),
      });

      if (res.ok) {
        setModules((prev) =>
          prev.map((module) =>
            module.id === moduleId
              ? { ...module, is_enabled: !currentStatus }
              : module
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle module:', err);
    } finally {
      setUpdating(null);
    }
  };

  const groupedModules = modules.reduce((acc, module) => {
    const category = module.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, Module[]>);

  const categoryLabels: Record<string, string> = {
    core: 'Core Modules',
    operations: 'Operations',
    analytics: 'Analytics',
    system: 'System',
    other: 'Other',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ToDo App</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  document.cookie = 'session=; Max-Age=0';
                  router.push('/login');
                }}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Company Modules</h2>
            <p className="mt-1 text-sm text-gray-600">
              Enable or disable modules for your company. Changes take effect immediately.
            </p>
          </div>

          <div className="space-y-8">
            {Object.entries(groupedModules).map(([category, categoryModules]) => (
              <div key={category} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    {categoryLabels[category] || category}
                  </h3>
                </div>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryModules.map((module) => (
                      <div
                        key={module.id}
                        className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex-1 mr-4">
                          <h4 className="text-sm font-medium text-gray-900">
                            {module.display_name}
                          </h4>
                          {module.description && (
                            <p className="mt-1 text-xs text-gray-500">
                              {module.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleModule(module.id, module.is_enabled)}
                          disabled={updating === module.id}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            module.is_enabled ? 'bg-blue-600' : 'bg-gray-200'
                          } ${updating === module.id ? 'opacity-50' : ''}`}
                          role="switch"
                          aria-checked={module.is_enabled}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                              module.is_enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {modules.length === 0 && (
            <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
              No modules available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
