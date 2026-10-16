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
    'active', 'inactive',
  ])
  assert.deepEqual(CELEB_MANAGED_PUBLICATION_STATUSES, ['active', 'inactive'])
  assert.equal(DEFAULT_CELEB_PUBLICATION_STATUS, 'inactive')
  assert.equal(isCelebPublicationStatus('active'), true)
  assert.equal(isCelebPublicationStatus('inactive'), true)
  assert.equal(isCelebPublicationStatus('suspended'), false)
  assert.equal(isCelebPublicationStatus('deleted'), false)
  assert.equal(isCelebPublicationStatus('other'), false)
})
