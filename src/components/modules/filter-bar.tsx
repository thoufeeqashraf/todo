'use client';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function FilterBar({
  query,
  onQuery,
  filter,
  onFilter,
  options,
  placeholder,
}: {
  query: string;
  onQuery: (value: string) => void;
  filter: string;
  onFilter: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={filter} onValueChange={(value) => onFilter(value || options[0]?.id || 'all')}>
        <TabsList>
          {options.map((option) => (
            <TabsTrigger key={option.id} value={option.id}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder={placeholder}
        className="max-w-xs"
        aria-label={placeholder}
      />
    </div>
  );
}
