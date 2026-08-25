import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./FactionGroupEditor.tsx', import.meta.url), 'utf8')
const clusterSource = readFileSync(new URL('./FactionClusterDialogueList.tsx', import.meta.url), 'utf8')
const sequenceCardSource = readFileSync(new URL('./FactionSequenceCard.tsx', import.meta.url), 'utf8')
const editorSource = readFileSync(new URL('../../FactionEditor.tsx', import.meta.url), 'utf8')
const toolDockSource = readFileSync(new URL('../sections/FactionToolDock.tsx', import.meta.url), 'utf8')

test('장면은 공통 beat 편집기만 쓰고 구 인물 대사·독립 장면 편집기를 열지 않는다', () => {
  assert.doesNotMatch(source, /FactionPersonRow/)
  assert.doesNotMatch(source, /FactionNarrativeEntryEditor|FactionSceneEntryEditor/)
  assert.match(clusterSource, /FactionSceneBeatRow/)
  assert.doesNotMatch(clusterSource, /FactionPersonDialogueItem|data-faction-dialogue-item/)
})

test('통합 대사의 표시·처리 단계 일괄 편집은 상단 작업 도구에 복구한다', () => {
  assert.match(editorSource, /FactionQuoteModeModal|quoteModeOpen/)
  assert.match(toolDockSource, /대사 단계|onOpenQuoteMode/)
})

test('세력색은 헤더뿐 아니라 아코디언 전체 외곽과 끝선에도 이어진다', () => {
  assert.match(source, /data-faction-group-frame="true"/)
  assert.match(source, /style=\{\{ borderColor: factionColor \}\}/)
  assert.match(source, /data-faction-group-end="true"/)
  assert.match(source, /border-b-4/)
})

test('긴 장면에서도 장면 헤더가 보이도록 세력 프레임이 sticky를 가두지 않는다', () => {
  assert.match(sequenceCardSource, /sticky/)
  assert.doesNotMatch(source, /data-faction-group-frame="true"[\s\S]{0,180}overflow-hidden/)
})
