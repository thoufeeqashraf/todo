import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initials, personName } from '@/components/modules/format';
import type { DirectoryPerson } from '@/components/modules/types';

export function PersonCell({
  person,
  id,
}: {
  person?: DirectoryPerson;
  id?: string | null;
}) {
  if (!person && !id) return <span className="text-muted-foreground">—</span>;
  const name = person ? personName(person) : 'Former member';
  return (
    <div className="flex items-center gap-2.5">
      <Avatar size="sm">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {person?.email ? <p className="truncate text-xs text-muted-foreground">{person.email}</p> : null}
      </div>
    </div>
  );
}
