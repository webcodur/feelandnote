import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./ImageCropModal.tsx', import.meta.url), 'utf8')

test('이미지 크롭 모달은 카드의 overflow·containment 밖인 document.body에 렌더한다', () => {
  assert.match(source, /import\s+\{\s*createPortal\s*\}\s+from\s+['"]react-dom['"]/, 'createPortal을 사용해야 합니다.')
  assert.match(source, /return\s+createPortal\(modal,\s*document\.body\)/, '모달을 document.body 포털로 보내야 합니다.')
})

test('AI 자동 맞춤은 저장해 둔 선택을 따라 창을 열 때 돌지 말지 정한다', () => {
  assert.match(
    source,
    /enableAutoCrop && readFlag\(AUTO_FIT_STORAGE_KEY, true\)/,
    '자동 실행 조건이 저장값을 직접 읽어야 합니다 — 상태에 의존하면 체크를 바꿀 때마다 다시 잘립니다.'
  )
  assert.match(
    source,
    /writeFlag\(AUTO_FIT_STORAGE_KEY, !on\)/,
    '체크 상태를 localStorage에 남겨 다음 창에서도 유지해야 합니다.'
  )
})

test('배경 제거는 기본으로 꺼져 있고, 적용할 때 고른 값을 호출부에 넘긴다', () => {
  assert.match(
    source,
    /readFlag\(NOBG_ON_APPLY_STORAGE_KEY, false\)/,
    '배경 제거는 로컬 CPU를 오래 쓰므로 기본값이 꺼짐이어야 합니다.'
  )
  assert.match(
    source,
    /writeFlag\(NOBG_ON_APPLY_STORAGE_KEY, !on\)/,
    '체크 상태를 localStorage에 남겨 다음 창에서도 유지해야 합니다.'
  )
  assert.match(
    source,
    /onComplete\(\s*getCroppedImage\(image, croppedAreaPixels\),\s*offerBackgroundRemoval && nobgOnApply\s*\)/,
    '적용 시 배경 제거 여부를 호출부에 함께 넘겨야 합니다.'
  )
})
