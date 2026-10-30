'use client';

import { personName } from '@/components/modules/format';
import type { DirectoryPerson } from '@/components/modules/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PeopleSelect({
  id,
  people,
  value,
  onChange,
  label = 'Person',
}: {
  id: string;
  people: DirectoryPerson[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No people are available in this company.</p>
      ) : (
        <Select value={value} onValueChange={(next) => onChange(next ?? '')}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {people.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {personName(person)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
