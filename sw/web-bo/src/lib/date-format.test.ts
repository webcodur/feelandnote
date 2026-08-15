import assert from 'node:assert/strict'
import test from 'node:test'
import { formatKstDateTime } from './date-format'

test('KST date-time text is identical regardless of the runtime locale', () => {
  assert.equal(
    formatKstDateTime('2026-08-15T06:46:59.000Z'),
    '2026. 8. 15. 15:46:59',
  )
})
