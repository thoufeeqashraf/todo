import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { pageQuerySchema, pageResult, pageSlice, parsePageQuery } from './pagination.ts';

describe('pagination', () => {
  it('defaults limit and offset when the query is empty', () => {
    const page = parsePageQuery(new URLSearchParams());
    assert.deepEqual(page, { limit: 50, offset: 0 });
  });

  it('rejects a limit outside 1 to 100', () => {
    assert.throws(() => pageQuerySchema.parse({ limit: '0' }), z.ZodError);
    assert.throws(() => pageQuerySchema.parse({ limit: '101' }), z.ZodError);
    assert.throws(() => pageQuerySchema.parse({ offset: '-1' }), z.ZodError);
  });

  it('sets hasMore when the extra row is present', () => {
    const page = pageResult(['a', 'b', 'c'], { limit: 2, offset: 4 });
    assert.deepEqual(page.items, ['a', 'b']);
    assert.deepEqual(page.page, { limit: 2, offset: 4, hasMore: true });
  });

  it('slices an in-memory list by offset', () => {
    const page = pageSlice(['a', 'b', 'c', 'd'], { limit: 2, offset: 1 });
    assert.deepEqual(page.items, ['b', 'c']);
    assert.equal(page.page.hasMore, true);
  });
});
