import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CELEB_PROFESSIONS,
  getCelebProfession,
  getCelebProfessionLabel,
} from './celeb-professions'

test('other remains an explicit final profession instead of an unknown fallback', () => {
  assert.equal(CELEB_PROFESSIONS.at(-1)?.value, 'other')
  assert.equal(getCelebProfession('other')?.value, 'other')
  assert.equal(getCelebProfessionLabel('other'), '기타')
  assert.equal(getCelebProfessionLabel('other', 'en'), 'Other')
})
