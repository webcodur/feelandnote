import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicImages, parsePublicHtml } from './verify-revisions-public.mjs';

function fixture() {
  return {
    target: { revision: { logoAsset: { width: 330, height: 343 } }, plan: { images: [{ role: 'logo', width: 400 }, { role: 'cover', width: 240 }, { role: 'avatar', width: 100 }] } },
    images: [
      { width: 330, height: 343, originalWidth: 330, originalHeight: 343, align: 'center' },
      { width: 240, height: 320, originalWidth: 600, originalHeight: 800, align: 'center' },
      { width: 100, height: 100, originalWidth: 800, originalHeight: 800, align: 'center' },
    ],
  };
}

test('원고에 400px로 표시된 작은 로고는 편집기와 같은 원본 크기 상한으로 검증한다', () => {
  const f = fixture();
  assertPublicImages(f.target, f.images);
  f.images[0].width = 400; f.images[0].height = 400 * 343 / 330;
  assert.throws(() => assertPublicImages(f.target, f.images));
});

test('큰 원본 로고의 400px 축소와 정상 종횡비를 허용한다', () => {
  const f = fixture(); f.target.revision.logoAsset = { width: 1024, height: 512 };
  f.images[0] = { width: 400, height: 200, originalWidth: 1024, originalHeight: 512, align: 'center' };
  assertPublicImages(f.target, f.images);
});

for (const [name, mutate] of [
  ['로고 종횡비', f => { f.images[0].height = 330; }],
  ['표지 폭', f => { f.images[1].width = 330; }],
  ['인물 사진 폭', f => { f.images[2].width = 330; }],
  ['사진 정렬', f => { f.images[0].align = 'left'; }],
  ['사진 누락', f => { f.images.pop(); }],
]) test('작은 로고 허용으로 다른 사진 오류를 통과시키지 않는다: ' + name, () => {
  const f = fixture(); mutate(f); assert.throws(() => assertPublicImages(f.target, f.images));
});

test('공개 HTML에서 로고 검증에 필요한 표시 높이도 읽는다', () => {
  const html = `<div class="se-main-container"><div class="se-component se-image"><div class="se-section se-section-align-center"><a data-linktype="img" data-linkdata='{"src":"https://blogfiles.pstatic.net/day/source/logo.png","originalWidth":"330","originalHeight":"343"}'><img class="se-image-resource" data-width="330" data-height="343"></a></div></div></div>`;
  assert.equal(parsePublicHtml(html).images[0].height, 343);
});
