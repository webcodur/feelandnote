import assert from 'node:assert/strict'
import test from 'node:test'

import { activationRevalidationRequest } from './audit-activation-revalidation'

test('activation bulk cache request uses only the versioned v2 endpoint', () => {
  const request = activationRevalidationRequest()
  assert.equal(request.endpoint, '/api/revalidate/v2')
  assert.deepEqual(request.tags, [
    'celebs',
    'celebs:__all__',
    'dialogues',
    'dialogues:__all__',
    'spectrum',
    'spectrum:__all__',
    'tags',
    'tags:__all__',
  ])
})
