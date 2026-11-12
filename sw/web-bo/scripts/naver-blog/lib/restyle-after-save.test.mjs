import test from 'node:test';
import assert from 'node:assert/strict';
import { restyleOutcome } from './restyle-after-save.mjs';

test('completed events confirm every saved post', () => {
  const out = ['noise', JSON.stringify({ event: 'completed', logNo: '1' }), JSON.stringify({ event: 'completed', logNo: '2' }), JSON.stringify({ event: 'finished' })].join('\n');
  assert.deepEqual(restyleOutcome(out, [1, '2']), { missing: [], deferred: [] });
});

test('deferred post counts as missing even when restyle exits normally', () => {
  const out = [JSON.stringify({ event: 'completed', logNo: '1' }), JSON.stringify({ event: 'deferred', logNo: '2', error: 'Exact paragraph missing' })].join('\n');
  const r = restyleOutcome(out, ['1', '2']);
  assert.deepEqual(r.missing, ['2']);
  assert.equal(r.deferred[0].error, 'Exact paragraph missing');
});
