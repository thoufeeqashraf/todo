import { AnalyticsDashboard } from '@/components/analytics/dashboard';
import { loadAnalytics } from '@/components/analytics/load';

export const instant = false;

export default async function CustomerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const result = await loadAnalytics({ from: params.from, to: params.to });
  return <AnalyticsDashboard result={result} />;
}
