import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const saveActionSource = readFileSync(
  new URL('../../actions/admin/factions/script.ts', import.meta.url),
  'utf8',
)
const editorSource = readFileSync(
  new URL('./FactionEditor.tsx', import.meta.url),
  'utf8',
)
const toolDockSource = readFileSync(
  new URL('./FactionEditor/sections/FactionToolDock.tsx', import.meta.url),
  'utf8',
)
const infoPanelSource = readFileSync(
  new URL('./FactionEditor/sections/FactionInfoPanel.tsx', import.meta.url),
  'utf8',
)
const shortsPanelSource = readFileSync(
  new URL('./FactionEditor/sections/FactionShortsPanel.tsx', import.meta.url),
  'utf8',
)
const productionActionsSource = readFileSync(
  new URL('./FactionEditor/hooks/useFactionProductionActions.ts', import.meta.url),
  'utf8',
)

test('일반 저장은 DB 저장과 로컬 export만 하고 출간을 시작하지 않는다', () => {
  assert.doesNotMatch(saveActionSource, /publishEpisode/)
  assert.doesNotMatch(saveActionSource, /publishAfterSave/)
})

test('편집기 진입은 전체 사진 해시 진단을 자동으로 시작하지 않는다', () => {
  assert.doesNotMatch(toolDockSource, /FactionImageSyncBadge/)
})

test('음성 생성 모달 상태는 거대한 편집기 본문 바깥에서 갱신된다', () => {
  assert.doesNotMatch(editorSource, /voiceModalOpen/)
  assert.match(toolDockSource, /FactionVoiceModal/)
})

test('에피소드 설정 변경은 세력·장면 전체 목록을 다시 렌더하지 않는다', () => {
  assert.match(infoPanelSource, /const FactionGroupList = memo\(/)
})

test('루트 편집기는 생성 API 구현과 쇼츠 편성 본문을 직접 소유하지 않는다', () => {
  assert.doesNotMatch(editorSource, /\/api\/\$\{series\}\/render/)
  assert.doesNotMatch(editorSource, /\/api\/\$\{series\}\/voice/)
  assert.match(productionActionsSource, /\/api\/\$\{series\}\/render/)
  assert.match(productionActionsSource, /\/api\/\$\{series\}\/voice/)
  assert.match(shortsPanelSource, /memo\(function FactionShortsPanel/)
})
