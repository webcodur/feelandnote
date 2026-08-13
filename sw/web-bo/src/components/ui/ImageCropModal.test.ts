import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./ImageCropModal.tsx', import.meta.url), 'utf8')

test('이미지 크롭 모달은 카드의 overflow·containment 밖인 document.body에 렌더한다', () => {
  assert.match(source, /import\s+\{\s*createPortal\s*\}\s+from\s+['"]react-dom['"]/, 'createPortal을 사용해야 합니다.')
  assert.match(source, /return\s+createPortal\(modal,\s*document\.body\)/, '모달을 document.body 포털로 보내야 합니다.')
})
