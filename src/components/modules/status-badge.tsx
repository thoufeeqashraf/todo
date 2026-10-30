import { Badge } from '@/components/ui/badge';

const tone: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'outline',
  pending: 'outline',
  in_progress: 'secondary',
  resolved: 'default',
  closed: 'secondary',
  unpaid: 'outline',
  paid: 'default',
  clocked_in: 'default',
  clocked_out: 'secondary',
  absent: 'destructive',
  late: 'destructive',
  credit: 'default',
  debit: 'outline',
  miss: 'destructive',
  proof_rejected: 'destructive',
  complete: 'default',
  good: 'default',
  watch: 'outline',
  poor: 'destructive',
  active: 'default',
  inactive: 'secondary',
  unconfigured: 'outline',
};

export function StatusBadge({ value }: { value: string }) {
  const key = value.toLowerCase();
  return (
    <Badge variant={tone[key] ?? 'secondary'} className="capitalize">
      {value.replace(/_/g, ' ')}
    </Badge>
  );
}
