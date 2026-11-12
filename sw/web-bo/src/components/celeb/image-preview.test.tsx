import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImageConfigContext } from 'next/dist/shared/lib/image-config-context.shared-runtime'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'
import nextConfig from '../../../next.config'

import CelebAvatarEditor from './avatar/CelebAvatarEditor'
import CelebPortraitEditor from './portrait/CelebPortraitEditor'

const IMAGE_URL = 'https://images.example.com/celeb.webp?v=1'

test('상세·이미지 작업은 같은 아바타 저장·후처리 컴포넌트를 사용한다', () => {
  for (const path of [
    '../../app/(admin)/members/components/CelebForm.tsx',
    '../../app/(admin)/celebs/components/CelebImageGrid.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /<PersistedCelebAvatarEditor\b[\s\S]*?backgroundRemovalControls=/)
    assert.doesNotMatch(source, /<CelebAvatarNobgButton\b/, '후처리 도구를 화면에서 별도로 조립하지 않는다')
  }
})

function assertPublicImagePreview(markup: string) {
  assert.match(markup, /src="https:\/\/images\.example\.com\/celeb\.webp\?v=1"/)
  assert.doesNotMatch(markup, /cors=1/)
  assert.doesNotMatch(markup, /crossorigin=/i)
  assert.match(markup, /draggable="true"/, '미리보기에서 다른 이미지 칸으로 끌어갈 수 있어야 한다')
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

test('상세 화면의 링크 없는 아바타·대표사진도 다른 이미지 칸으로 끌어갈 수 있다', () => {
  for (const markup of [
    renderToStaticMarkup(<CelebAvatarEditor value={IMAGE_URL} alt="테스트" onCroppedFile={() => undefined} />),
    renderToStaticMarkup(<CelebPortraitEditor value={IMAGE_URL} alt="테스트" onCroppedFile={() => undefined} />),
  ]) assertPublicImagePreview(markup)
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

test('목록의 작은 아바타·대표사진은 축소하고 원본 링크는 보존한다', () => {
  const original = 'https://assets.feelandnote.com/celebs/test/avatar.webp?v=1'
  for (const Editor of [CelebAvatarEditor, CelebPortraitEditor]) {
    const markup = renderToStaticMarkup(
      <ImageConfigContext.Provider value={{ ...imageConfigDefault, ...nextConfig.images }}>
        <Editor value={original} alt="테스트" previewSizes="64px" openOnClick onCroppedFile={() => undefined} />
      </ImageConfigContext.Provider>,
    )
    assert.match(markup, /sizes="64px"/)
    assert.match(markup, /srcSet="[^\"]*\/_next\/image\?[^\"]*w=64/)
    assert.ok(markup.includes(`href="${original}"`), '원본 열기는 축소본 주소로 바뀌면 안 된다')
    assert.match(markup, /draggable="true"/)
  }
})

test('외부 이미지와 편집용 큰 미리보기는 원본 요청을 유지한다', () => {
  for (const Editor of [CelebAvatarEditor, CelebPortraitEditor]) {
    const external = renderToStaticMarkup(
      <Editor value={IMAGE_URL} alt="테스트" previewSizes="64px" onCroppedFile={() => undefined} />,
    )
    assertPublicImagePreview(external)
    assert.doesNotMatch(external, /\/_next\/image\?/)
    const original = 'https://assets.feelandnote.com/celebs/test/avatar.webp?v=2'
    const editing = renderToStaticMarkup(
      <Editor value={original} alt="테스트" onCroppedFile={() => undefined} />,
    )
    assert.ok(editing.includes(`src="${original}"`))
    assert.doesNotMatch(editing, /\/_next\/image\?/)
  }
})
