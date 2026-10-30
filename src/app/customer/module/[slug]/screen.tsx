'use client';

import dynamic from 'next/dynamic';

import { TableSkeleton } from '@/components/features/chrome';
import { ModuleWorkspace } from '@/components/features/module-workspace';
import type { ModuleLoad } from '@/components/features/records';
import { SchedulingBoard } from '@/components/features/scheduling-board';
import { SettingsBoard } from '@/components/features/settings-board';

import { StaffScreen } from '../../staff/screen';

const ReportsBoard = dynamic(
  () => import('@/components/features/reports-board').then((mod) => mod.ReportsBoard),
  { loading: () => <TableSkeleton /> },
);

export function ModuleScreen({
  slug,
  initial,
}: {
  slug: string;
  initial: ModuleLoad;
}) {
  if (slug === 'staff') return <StaffScreen initial={initial} />;
  if (slug === 'scheduling') return <SchedulingBoard initial={initial} />;
  if (slug === 'reports') return <ReportsBoard initial={initial} />;
  if (slug === 'settings') return <SettingsBoard initial={initial} />;
  return <ModuleWorkspace slug={slug} initial={initial} />;
}
