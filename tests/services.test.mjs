import test from 'node:test';
import assert from 'node:assert/strict';
import { createService, BackendNotConnectedError } from '../src/services/adapter.js';
import { UNIVERSITY, ACADEMIC_CATALOGUE } from '../src/data/uniport.js';

test('unconfigured service operations reject instead of faking success', async () => {
  const isolatedService = createService('isolated-unconfigured-test', ['getDashboard', 'getNotifications']);
  for (const [method, implementation] of Object.entries(isolatedService)) {
    await assert.rejects(() => implementation(), error => {
      assert.ok(error instanceof BackendNotConnectedError, method);
      assert.equal(error.code, 'BACKEND_NOT_CONNECTED');
      return true;
    });
  }
});
test('there is one locked university and no fabricated academic catalogue', () => {
  assert.equal(UNIVERSITY.id, 'UNIPORT');
  assert.equal(UNIVERSITY.locked, true);
  Object.values(ACADEMIC_CATALOGUE).forEach(collection => assert.deepEqual(collection, []));
});
