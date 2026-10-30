import { z } from 'zod';

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

export interface PageMeta {
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PageResult<T> {
  items: T[];
  page: PageMeta;
}

export function parsePageQuery(searchParams: { get(name: string): string | null }): PageQuery {
  const raw: { limit?: string; offset?: string } = {};
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  if (limit !== null) raw.limit = limit;
  if (offset !== null) raw.offset = offset;
  return pageQuerySchema.parse(raw);
}

/** `rows` is already offset and may contain one extra record past `limit`. */
export function pageResult<T>(rows: T[], page: PageQuery): PageResult<T> {
  const hasMore = rows.length > page.limit;
  return {
    items: hasMore ? rows.slice(0, page.limit) : rows,
    page: { limit: page.limit, offset: page.offset, hasMore },
  };
}

/** Page a full in-memory list. SQL reads should use `pageResult` after `range`. */
export function pageSlice<T>(rows: T[], page: PageQuery): PageResult<T> {
  return pageResult(rows.slice(page.offset, page.offset + page.limit + 1), page);
}
