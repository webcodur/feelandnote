import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveCelebContentCount } from './celeb-content-research.ts'

test('positive actual content count always wins', () => {
  assert.equal(resolveCelebContentCount(3, 'open', false), 3)
  assert.equal(resolveCelebContentCount(4, 'confirmed_empty', true), 4)
})

test('inactive zero-content celebrities display -1 regardless of research status', () => {
  assert.equal(resolveCelebContentCount(0, 'open', false), -1)
  assert.equal(resolveCelebContentCount(0, 'researching', false), -1)
  assert.equal(resolveCelebContentCount(0, 'confirmed_empty', false), -1)
})

test('active zero-content celebrities follow the research status', () => {
  assert.equal(resolveCelebContentCount(0, 'open', true), 0)
  assert.equal(resolveCelebContentCount(0, 'researching', true), 0)
  assert.equal(resolveCelebContentCount(0, 'confirmed_empty', true), -1)
})
