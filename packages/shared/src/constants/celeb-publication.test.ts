import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CELEB_MANAGED_PUBLICATION_STATUSES,
  CELEB_PUBLICATION_STATUSES,
  DEFAULT_CELEB_PUBLICATION_STATUS,
  isCelebPublicationStatus,
} from './celeb-publication'

test('celeb publication values have one complete shared definition', () => {
  assert.deepEqual(CELEB_PUBLICATION_STATUSES, [
    'active', 'inactive', 'suspended', 'deleted',
  ])
  assert.deepEqual(CELEB_MANAGED_PUBLICATION_STATUSES, ['active', 'inactive'])
  assert.equal(DEFAULT_CELEB_PUBLICATION_STATUS, 'inactive')
  assert.equal(isCelebPublicationStatus('suspended'), true)
  assert.equal(isCelebPublicationStatus('other'), false)
})
