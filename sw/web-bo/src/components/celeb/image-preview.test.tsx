import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import CelebAvatarEditor from './avatar/CelebAvatarEditor'
import CelebPortraitEditor from './portrait/CelebPortraitEditor'

const IMAGE_URL = 'https://images.example.com/celeb.webp?v=1'

function assertPublicImagePreview(markup: string) {
  assert.match(markup, /src="https:\/\/images\.example\.com\/celeb\.webp\?v=1"/)
  assert.doesNotMatch(markup, /cors=1/)
  assert.doesNotMatch(markup, /crossorigin=/i)
}

test('원본 열기 아바타는 일반 이미지 요청으로 미리보기한다', () => {
  const markup = renderToStaticMarkup(
    <CelebAvatarEditor
      value={IMAGE_URL}
      alt="테스트 인물"
      openOnClick
      onCroppedFile={() => undefined}
    />,
  )

  assertPublicImagePreview(markup)
})

test('원본 열기 대표사진은 일반 이미지 요청으로 미리보기한다', () => {
  const markup = renderToStaticMarkup(
    <CelebPortraitEditor
      value={IMAGE_URL}
      alt="테스트 인물 대표사진"
      openOnClick
      onCroppedFile={() => undefined}
    />,
  )

  assertPublicImagePreview(markup)
})
