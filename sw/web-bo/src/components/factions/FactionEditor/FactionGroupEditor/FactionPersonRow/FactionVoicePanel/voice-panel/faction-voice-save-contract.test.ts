import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const contextSource = readFileSync(
  new URL('../../../../../shared/FactionVoiceContext.tsx', import.meta.url),
  'utf8',
)
const editorSource = readFileSync(
  new URL('../../../../../FactionEditor.tsx', import.meta.url),
  'utf8',
)
const panelSource = readFileSync(
  new URL('./FactionExpandedVoicePanel.tsx', import.meta.url),
  'utf8',
)
const specSource = readFileSync(
  new URL('./useFactionVoiceSpec.ts', import.meta.url),
  'utf8',
)
const celebModalSource = readFileSync(
  new URL('../../../../../../celeb/dialogue-studio/voice-editor/CelebVoiceEditorModal.tsx', import.meta.url),
  'utf8',
)

test('GEM 스타일을 비우면 빈 문자열을 보존해 상속을 차단한다', () => {
  assert.match(specSource, /setField\(F\.style,\s*trimmed\)/)
  assert.doesNotMatch(specSource, /setField\(F\.style,\s*trimmed\s*\|\|\s*undefined\)/)
})

test('팩션 음원 저장은 선택한 보이스와 길이를 대본에도 즉시 확정한다', () => {
  assert.match(contextSource, /save:\s*\(\)\s*=>\s*Promise<boolean>/)
  assert.match(editorSource, /FactionVoiceProvider[\s\S]*?\bsave,/)
  assert.match(panelSource, /onSaved:\s*async\s+dur\s*=>[\s\S]*?await factionVoice\?\.save\?\.\(\)/)
})

test('팩션 ELE 생성은 카탈로그 조회 실패만으로 막지 않는다', () => {
  assert.match(panelSource, /eleSpec=\{spec\.eleSpec\}/)
  assert.doesNotMatch(panelSource, /eleSpec=\{eleGenerationBlocked\s*\?\s*null/)
})

test('셀럽 모달에서 ELE 음원을 저장하면 선택한 Voice ID도 프로필에 확정한다', () => {
  assert.match(celebModalSource, /await saveVoiceId\(celeb\.id,\s*locale,\s*voiceId\.trim\(\)\)/)
})
