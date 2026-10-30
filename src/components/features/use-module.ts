'use client';

import { useEffect, useState } from 'react';

import { loadModule } from '@/app/customer/actions';
import type { ModuleLoad } from '@/components/features/records';

export function useModuleData(slug: string, initial?: ModuleLoad) {
  const [state, setState] = useState<ModuleLoad | null>(initial ?? null);
  const [loading, setLoading] = useState(initial === undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (tick === 0 && initial !== undefined) return;
    let ignore = false;
    void loadModule(slug).then((result) => {
      if (ignore) return;
      setState(result);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [slug, tick, initial]);

  return {
    state,
    loading,
    reload: () => {
      setLoading(true);
      setTick((value) => value + 1);
    },
  };
}
