import type { AnalyticsSnapshot } from '@/components/analytics/aggregate';

export type AnalyticsLoad =
  | { state: 'unconfigured' }
  | { state: 'gated'; message: string }
  | { state: 'error'; message: string }
  | { state: 'ready'; today: string; snapshot: AnalyticsSnapshot };
