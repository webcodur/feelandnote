import assert from 'node:assert/strict'
import test from 'node:test'

import { applyTtsOverride, findTtsOverrides, prepareDialogueSave } from './draft'

const original = '나의 죽음을 적에게 알리지 마라.'
const edited = '나의 죽음을, 적에게 알리지 마라.'

function ttsOnlyEdit() {
  return {
    linesKo: { greeting: [original, '', ''] },
    linesEn: null,
    ttsTexts: { 'ko/greeting-1': edited },
    dialogues: { 'ko/greeting-1': original },
    quotes: { ko: '', en: '' },
    monologues: { ko: '', en: '' },
  }
}

test('음성 합성용 문장만 바뀌면 저장 성공으로 처리하지 않는다', () => {
  const plan = prepareDialogueSave(ttsOnlyEdit())

  assert.deepEqual(plan, {
    status: 'blocked',
    overrideKeys: ['ko/greeting-1'],
  })
})

test('음성 합성용 문장을 대사에 반영하면 저장 payload에 수정문이 들어간다', () => {
  const draft = ttsOnlyEdit()
  const applied = applyTtsOverride(draft, 'ko/greeting-1')

  assert.deepEqual(findTtsOverrides(applied), [])

  const plan = prepareDialogueSave({ ...draft, ...applied })
  assert.equal(plan.status, 'ready')
  if (plan.status === 'ready') {
    assert.equal(plan.linesKo.greeting[0], edited)
  }
})

test('실제 대사 칸을 수정하면 바로 저장 payload에 들어간다', () => {
  const draft = ttsOnlyEdit()
  draft.dialogues['ko/greeting-1'] = edited

  const plan = prepareDialogueSave(draft)
  assert.equal(plan.status, 'ready')
  if (plan.status === 'ready') {
    assert.equal(plan.linesKo.greeting[0], edited)
  }
})
