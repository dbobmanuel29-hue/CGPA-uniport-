import test from 'node:test';
import assert from 'node:assert/strict';
import * as services from '../src/services/index.js';
import { BackendNotConnectedError } from '../src/services/adapter.js';
import { UNIVERSITY, ACADEMIC_CATALOGUE } from '../src/data/uniport.js';

test('every unconfigured service operation rejects instead of faking success', async () => {
  for (const [name, service] of Object.entries(services)) {
    if (!name.endsWith('Service')) continue;
    for (const [method, implementation] of Object.entries(service)) {
      await assert.rejects(() => implementation(), error => {
        assert.ok(error instanceof BackendNotConnectedError, `${name}.${method}`);
        assert.equal(error.code, 'BACKEND_NOT_CONNECTED');
        return true;
      });
    }
  }
});
test('there is one locked university and no fabricated academic catalogue', () => {
  assert.equal(UNIVERSITY.id, 'UNIPORT');
  assert.equal(UNIVERSITY.locked, true);
  Object.values(ACADEMIC_CATALOGUE).forEach(collection => assert.deepEqual(collection, []));
});