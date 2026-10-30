import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';

const variant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  manager: 'secondary',
  user: 'outline',
};

export function RoleBadge({ role }: { role: string }) {
  const known = role === 'admin' || role === 'manager' || role === 'user' ? role : null;
  return (
    <Badge variant={known ? variant[known] : 'outline'} className="capitalize">
      {known ?? role}
    </Badge>
  );
}
