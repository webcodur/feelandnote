import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

function source(file: string): string {
  const path = join(here, file)
  assert.equal(existsSync(path), true, `${file}이(가) 있어야 합니다.`)
  return readFileSync(path, 'utf8')
}

test('셀럽 음성 화면은 GEM/ELE 엔진과 엔진별 보이스를 선택한다', () => {
  const panel = source('VoiceProviderSettings.tsx')
  const studio = source('CelebDialogueStudio.tsx')
  const editor = source('voice-editor/CelebVoiceEditorModal.tsx')

  assert.match(panel, /SpeakerEngineToggle/)
  assert.match(panel, /GeminiVoiceSelect/)
  assert.match(panel, /EleVoicePicker/)
  assert.match(studio, /engineKo/)
  assert.match(studio, /engineEn/)
  assert.match(editor, /chosenEngine:\s*engine/)
})

test('같은 음성 편집 흐름에서 공용 트림과 들숨 처리를 제공한다', () => {
  const editor = source('voice-editor/CelebVoiceEditorModal.tsx')

  assert.match(editor, /SavedVoiceSection/)
  assert.match(editor, /BreathModeContent/)
})

test('셀럽 음성 일괄 생성은 제한 병렬 실행과 슬롯별 진행 상태를 쓴다', () => {
  const studio = source('CelebDialogueStudio.tsx')

  assert.match(studio, /runVoiceJobsWithConcurrency/)
  assert.match(studio, /generatingKeys\.has\(fullKey\)/)
  assert.doesNotMatch(studio, /setTimeout\(res,\s*800\)/)
})
