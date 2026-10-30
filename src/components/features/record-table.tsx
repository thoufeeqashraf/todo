'use client';

import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { DataTableFrame, PersonCell, StatusBadge } from '@/components/features/chrome';
import { RowActions } from '@/components/features/row-actions';
import { text } from '@/components/features/records';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type Column = {
  id: string;
  header: string;
  className?: string;
  cell: (row: Record<string, unknown>) => ReactNode;
};

export function RecordTable({
  rows,
  columns,
  emptyTitle,
  emptyBody,
  actions,
}: {
  rows: Record<string, unknown>[];
  columns: Column[];
  emptyTitle: string;
  emptyBody: string;
  actions?: (row: Record<string, unknown>) => { id: string; label: string; onSelect: () => void }[];
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return (
    <DataTableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => <TableHead key={column.id} className={column.className}>{column.header}</TableHead>)}
            {actions ? <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const id = text(row.id, String(index));
            const menu = actions?.(row) ?? [];
            return (
              <TableRow key={id}>
                {columns.map((column) => <TableCell key={column.id} className={column.className}>{column.cell(row)}</TableCell>)}
                {actions ? (
                  <TableCell className="text-right">
                    {menu.length > 0 ? <RowActions label={`Actions for ${id}`} items={menu} /> : null}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableFrame>
  );
}

export function personColumn(nameKey: string, detailKey?: string): Column {
  return {
    id: nameKey,
    header: 'Person',
    cell: (row) => <PersonCell name={text(row[nameKey])} detail={detailKey ? text(row[detailKey], '') : null} />,
  };
}

export function statusColumn(key: string, header = 'Status'): Column {
  return {
    id: key,
    header,
    cell: (row) => <StatusBadge value={text(row[key], 'unknown')} />,
  };
}
