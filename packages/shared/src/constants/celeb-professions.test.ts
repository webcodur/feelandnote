import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CELEB_PROFESSIONS,
  getCelebProfession,
  getCelebProfessionLabel,
  getCelebProfessionMessages,
  mapCelebProfessions,
} from './celeb-professions'

test('other remains an explicit final profession instead of an unknown fallback', () => {
  assert.equal(CELEB_PROFESSIONS.at(-1)?.value, 'other')
  assert.equal(getCelebProfession('other')?.value, 'other')
  assert.equal(getCelebProfessionLabel('other'), '기타')
  assert.equal(getCelebProfessionLabel('other', 'en'), 'Other')
})

test('profession definitions have unique stable codes and complete Korean and English labels', () => {
  const codes = new Set<string>()
  for (const profession of CELEB_PROFESSIONS) {
    assert.match(profession.value, /^[a-z][a-z0-9_]*$/)
    assert.ok(!['all', 'uncategorized'].includes(profession.value))
    assert.ok(!codes.has(profession.value))
    codes.add(profession.value)
    assert.ok(profession.label.trim() && profession.label_en.trim())
    assert.ok(profession.description.trim() && profession.description_en.trim())
  }
})

test('a new profession needs only a data entry to receive bilingual messages and default presentation', () => {
  const profession = { value: 'physician', label: '의사', label_en: 'Physician', description: '질병을 진단하고 치료합니다.', description_en: 'Diagnoses and treats illness.' }
  const expanded = [...CELEB_PROFESSIONS, profession]
  assert.equal(getCelebProfessionMessages('ko', expanded).physician, profession.label)
  assert.equal(getCelebProfessionMessages('en', expanded).physician, profession.label_en)
  const existing = { leader: 'crown' }
  const presentation = mapCelebProfessions(existing, 'default', expanded)
  assert.equal(presentation.physician, 'default')
  assert.equal(presentation.leader, 'crown')
})
