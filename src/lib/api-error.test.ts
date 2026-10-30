import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { errorBody } from './api-error.ts';
import { PlatformError } from './platform-error.ts';

describe('API error shape', () => {
  it('keeps module gating errors in one object', () => {
    const result = errorBody(new PlatformError('module_disabled', 'The wallet module is off for this company.', 403, { module: 'wallet' }));
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, {
      error: { code: 'module_disabled', message: 'The wallet module is off for this company.', module: 'wallet' },
    });
  });

  it('maps zod failures to invalid', () => {
    try {
      z.object({ email: z.string().email() }).parse({});
      assert.fail('expected a zod error');
    } catch (error) {
      const result = errorBody(error);
      assert.equal(result.status, 400);
      assert.equal(result.body.error.code, 'invalid');
      assert.equal(result.body.error.message, 'Invalid input.');
      assert.ok(Array.isArray(result.body.error.issues));
    }
  });

  it('hides unexpected failures', () => {
    const result = errorBody(new Error('sql blew up'));
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { error: { code: 'internal', message: 'Internal server error.' } });
  });
});
