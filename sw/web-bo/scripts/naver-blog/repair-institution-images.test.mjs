import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { parseOptions, selectTargets, assertImageChange, canonicalImageSource, validateReplacements, findReplacementImage, replaceDraftImage, assertLogoGeometry, uploadFile, assertCaretAtParagraphEnd, caretPointsStable } from './repair-institution-images.mjs';

function fixture() {
  const post = { logNo: '123', kind: 'curated', link: 'check', title: '기관 글', url: 'https://feelandnote.com/library/curated/test/test-books' };
  const drafts = [{ logNo: '123', body: '기존 원고' }];
  const curator = { slug: 'test', name: '기관', blog_posts: [{ logNo: '123', list_slug: 'test-books' }], image_check: { visually_checked: true, reusable_as_institution_image: true }, prepared_image: { logNos: ['123'], local_file: 'test.png', original_url: 'https://example.com/test.png', sha256: 'a'.repeat(64), naver_raster_compatible: true } };
  const blog = { posts: [{ logNo: '123', source_bundle: 'new', curator_slug: 'test', reusable_institution_images: [] }] };
  return { post, drafts, curator, blog };
}

test('명시한 글 번호만 선택하고 기본 실행은 미저장이다', () => {
  assert.deepEqual(parseOptions(['--log=123,456']).ids, ['123', '456']);
  assert.equal(parseOptions(['--log=123']).apply, false);
  assert.equal(parseOptions(['--log=123', '--prepare-only']).prepareOnly, true);
});
for (const args of [[], ['--log='], ['--log=123,123'], ['--log=123', '--all'], ['--log=123', '--apply', '--dry'], ['--log=123', '--apply', '--prepare-only']]) {
  test(`모호하거나 충돌하는 실행 인자 거부: ${args.join(' ')}`, () => assert.throws(() => parseOptions(args)));
}

test('기관·목록·글 번호·검수 결과가 모두 일치한 준비 이미지 선택', () => {
  const f = fixture();
  const [target] = selectTargets(['123'], [f.post], f.drafts, { curators: [f.curator] }, f.blog);
  assert.equal(target.curator.slug, 'test');
  assert.equal(target.post.body, undefined, '추가 사진이 생긴 재열기에 오래된 원고 사진 수를 강제하지 않는다');
});
for (const [name, change] of [
  ['삭제된 글', f => { f.post.link = 'deleted'; }],
  ['다른 기관 이미지', f => { f.curator.slug = 'other'; }],
  ['다른 목록 이미지', f => { f.curator.blog_posts[0].list_slug = 'other'; }],
  ['이미 기관 이미지가 있는 글', f => { f.blog.posts[0].reusable_institution_images = [{ preferred: true }]; }],
  ['옛글의 기관로고 중복추가', f => { f.blog.posts[0].source_bundle = 'legacy'; }],
  ['기관 신원 미검수', f => { f.curator.image_check.visually_checked = false; }],
  ['흰색 바탕에서 안 보이는 로고', f => { f.curator.prepared_image.white_background_legible = false; }],
  ['이미지 원본 해시 누락', f => { delete f.curator.prepared_image.sha256; }],
]) test(`${name}는 브라우저 실행 전에 차단`, () => {
  const f = fixture(); change(f);
  assert.throws(() => selectTargets(['123'], [f.post], f.drafts, { curators: [f.curator] }, f.blog));
});

const old = { id: 'book', src: 'https://blogfiles.pstatic.net/original/book.jpg?type=w1', width: '240', height: null, naturalWidth: 840, naturalHeight: 1240, align: 'se-section-align-center', caption: [], representative: true };
const logo = { id: 'logo', src: 'https://blogfiles.pstatic.net/new/institution-test-aaaaaaaaaaaa.jpg?type=w1', width: '330', height: null, naturalWidth: 1024, naturalHeight: 1024, align: 'se-section-align-center', caption: [], representative: true };
const before = { title: '기존 제목', text: ['소개', '책 설명'], links: [{ text: '원문', href: 'https://example.com' }], dividers: 1, images: [old] };
function ready() { return { ...structuredClone(before), images: [structuredClone(logo), { ...structuredClone(old), representative: false }] }; }

test('본문과 기존 액자 표지를 그대로 두고 새 로고 한 장만 대표 지정', () => {
  assert.equal(assertImageChange(before, ready(), 'institution-test-aaaaaaaaaaaa').id, 'logo');
});
for (const [name, mutate] of [
  ['본문 삭제', x => { x.text.pop(); }],
  ['제목 변경', x => { x.title += '!'; }],
  ['링크 주소 변경', x => { x.links[0].href += '/wrong'; }],
  ['구분선 삭제', x => { x.dividers = 0; }],
  ['기존 사진 다시 액자 적용', x => { x.images[1].src = 'https://blogfiles.pstatic.net/reframed/book.jpg'; }],
  ['기존 사진 폭 변경', x => { x.images[1].width = '280'; }],
  ['표시 폭은 같지만 원본 가로 액자 중첩', x => { x.images[1].naturalWidth += 40; }],
  ['표시 높이는 같지만 원본 세로 액자 중첩', x => { x.images[1].naturalHeight += 40; }],
  ['기존 사진 삭제', x => { x.images.pop(); }],
  ['새 이미지 대표 미지정', x => { x.images[0].representative = false; }],
  ['기존 이미지도 대표', x => { x.images[1].representative = true; }],
  ['중복 로고 삽입', x => { x.images.push({ ...logo }); }],
]) test(`${name}이면 저장 전후 검사 실패`, () => {
  const after = ready(); mutate(after);
  assert.throws(() => assertImageChange(before, after, 'institution-test-aaaaaaaaaaaa'));
});

test('같은 로고가 있는 재시도는 추가하지 않고 대표 상태만 확인', () => {
  const existing = ready();
  assertImageChange(existing, ready(), 'institution-test-aaaaaaaaaaaa', { added: false });
  assert.throws(() => assertImageChange(existing, { ...ready(), images: [...ready().images, logo] }, 'institution-test-aaaaaaaaaaaa', { added: false }));
});

test('로딩 전 SVG에 기존 로고가 숨겨져 있으면 중복 삽입 판정을 허용하지 않는다', () => {
  const placeholder = { ...old, src: 'https://blogfiles.pstatic.net/lazy.svg' };
  assert.throws(() => assertImageChange({ ...before, images: [placeholder] }, { ...ready(), images: [logo, { ...placeholder, representative: false }] }, 'institution-test-aaaaaaaaaaaa'));
});

test('한글 파일명에 UTF-8이 아닌 escape가 있어도 ASCII 로고 표식을 판별한다', () => {
  const after = ready(); after.images[0].src = after.images[0].src.replace('/new/', '/new/%BA%CE/');
  assert.equal(assertImageChange(before, after, 'institution-test-aaaaaaaaaaaa').id, 'logo');
});

test('네이버 원본 CDN과 표시 크기만 바뀐 것은 같은 이미지', () => {
  assert.equal(canonicalImageSource('https://blogfiles.pstatic.net/path/a.jpg?type=w1'), canonicalImageSource('https://postfiles.pstatic.net/path/a.jpg?type=w773'));
  assert.notEqual(canonicalImageSource('https://example.com/a.jpg?version=1'), canonicalImageSource('https://example.com/a.jpg?version=2'));
});

const priorLogo = { ...old, id: 'SE-prior-logo', src: 'https://postfiles.pstatic.net/original/old-logo.png?type=w773', width: '307', height: '200', naturalWidth: 600, naturalHeight: 390, caption: ['기관 소개 사진'] };
const replacement = { logNo: '123', curator_slug: 'test', component_id: priorLogo.id, source_url: priorLogo.src, naturalWidth: 600, naturalHeight: 390 };
function replacementSnapshot() {
  return { ...structuredClone(before), images: [{ ...structuredClone(old), representative: false }, structuredClone(priorLogo)],
    flow: [{ kind: 'se-text', paragraphs: ['책 설명'] }, { kind: 'image', src: old.src }, { kind: 'se-text', paragraphs: ['기관 소개'] }, { kind: 'image', src: priorLogo.src }] };
}
function replacementReady() {
  const snapshot = replacementSnapshot();
  snapshot.images[1] = { ...structuredClone(logo), caption: [...priorLogo.caption] };
  snapshot.flow[3] = { kind: 'image', src: logo.src };
  return snapshot;
}

test('교체표 파일은 명시 옵션으로만 받는다', () => {
  assert.equal(parseOptions(['--log=123', '--replace-map=replacements.json']).replaceMap, 'replacements.json');
  assert.equal(parseOptions(['--log=123']).replaceMap, null);
  assert.deepEqual(validateReplacements([replacement], ['123']), [replacement]);
});
for (const [name, entries] of [
  ['행 누락', []], ['중복 행', [replacement, replacement]], ['다른 글', [{ ...replacement, logNo: '456' }]],
  ['컴포넌트 선택자 삽입', [{ ...replacement, component_id: 'x"] img' }]],
  ['자연크기 누락', [{ ...replacement, naturalWidth: undefined }]],
  ['아직 읽지 않은 자리표', [{ ...replacement, source_url: 'data:image/svg+xml;base64,test' }]],
]) test(`교체표 ${name} 거부`, () => assert.throws(() => validateReplacements(entries, ['123'])));

test('명시 교체표와 검수된 로고 출처가 있으면 로컬 원고 없는 옛글 허용', () => {
  const f = fixture();
  f.blog.posts[0].source_bundle = 'legacy';
  f.blog.posts[0].live_blog = { images: [{ src: priorLogo.src, role: 'historical_institution_logo', visual_checked: true }] };
  const [target] = selectTargets(['123'], [f.post], [], { curators: [f.curator] }, f.blog, [replacement]);
  assert.equal(target.draftBody, null);
  assert.equal(target.replacement.component_id, priorLogo.id);
  assert.throws(() => selectTargets(['123'], [f.post], [], { curators: [f.curator] }, f.blog));
});

test('교체표가 있어도 책 표지·미검수 출처·다른 기관은 허용하지 않는다', () => {
  const f = fixture(); f.blog.posts[0].source_bundle = 'legacy';
  for (const image of [{ src: priorLogo.src, role: 'book_cover', visual_checked: true }, { src: priorLogo.src, role: 'institution_logo', visual_checked: false }]) {
    f.blog.posts[0].live_blog = { images: [image] };
    assert.throws(() => selectTargets(['123'], [f.post], [], { curators: [f.curator] }, f.blog, [replacement]));
  }
  f.blog.posts[0].live_blog = { images: [{ src: priorLogo.src, role: 'institution_logo', visual_checked: true }] };
  assert.throws(() => selectTargets(['123'], [f.post], [], { curators: [f.curator] }, f.blog, [{ ...replacement, curator_slug: 'other' }]));
});

test('원본 URL·컴포넌트·자연크기가 한 장에 맞을 때만 교체한다', () => {
  const snapshot = replacementSnapshot();
  assert.equal(findReplacementImage(snapshot, replacement, 'institution-test-aaaaaaaaaaaa').id, priorLogo.id);
  assert.throws(() => findReplacementImage(snapshot, { ...replacement, component_id: old.id }, 'institution-test-aaaaaaaaaaaa'));
  assert.throws(() => findReplacementImage(snapshot, { ...replacement, naturalWidth: 640 }, 'institution-test-aaaaaaaaaaaa'));
  snapshot.images.push({ ...priorLogo, id: 'duplicate-source' });
  assert.throws(() => findReplacementImage(snapshot, replacement, 'institution-test-aaaaaaaaaaaa'));
});

test('새 로고가 이미 존재하면 교체를 중단한다', () => {
  const snapshot = replacementSnapshot(); snapshot.images.push(logo);
  assert.throws(() => findReplacementImage(snapshot, replacement, 'institution-test-aaaaaaaaaaaa'));
});

test('검수된 기존 기관 사진만 같은 자리에 교체하고 다른 표지는 원본 그대로 보존한다', () => {
  assert.equal(assertImageChange(replacementSnapshot(), replacementReady(), 'institution-test-aaaaaaaaaaaa', { replacement }).id, logo.id);
});
for (const [name, mutate] of [
  ['기관 사진 대신 책 표지 제거', s => { s.images = [priorLogo, logo]; }],
  ['교체한 이미지 위치 이동', s => { s.images.reverse(); }],
  ['사진 순서는 같아도 본문 앞으로 이동', s => { const image = s.flow.pop(); s.flow.unshift(image); }],
  ['기존 사진 설명 삭제', s => { s.images[1].caption = []; }],
  ['기존 책 원본 자연크기 변경', s => { s.images[0].naturalWidth += 40; }],
  ['구 로고가 남은 중복 삽입', s => { s.images.push(priorLogo); }],
  ['컴포넌트 순서 검증 누락', s => { delete s.flow; }],
]) test(`교체 후 ${name}이면 거부`, () => {
  const after = replacementReady(); mutate(after);
  assert.throws(() => assertImageChange(replacementSnapshot(), after, 'institution-test-aaaaaaaaaaaa', { replacement }));
});

test('새글에 이미 삽입한 로고는 명시된 예전 이미지 토큰 한 개만 교체한다', () => {
  const f = fixture();
  const oldUrl = 'https://example.com/prior.png';
  f.drafts[0].body = `소개\n[img:${oldUrl}|330|기관 로고]\n책 설명\n[img:https://example.com/book.jpg|240|책 표지]`;
  const row = { ...replacement, source_url: 'https://blogfiles.pstatic.net/path/institution-test-bbbbbbbbbbbb.jpg', draft_image_url: oldUrl };
  const [target] = selectTargets(['123'], [f.post], f.drafts, { curators: [f.curator] }, f.blog, [row]);
  assert.equal(replaceDraftImage(target.draftBody, target, 400), '소개\n[img:https://example.com/test.png|400|기관 로고]\n책 설명\n[img:https://example.com/book.jpg|240|책 표지]');
  assert.throws(() => replaceDraftImage(target.draftBody.replace('기관 로고', '책 표지'), target, 400));
  assert.throws(() => replaceDraftImage(target.draftBody + `\n[img:${oldUrl}|330|기관 로고]`, target, 400));
  assert.throws(() => replaceDraftImage(target.draftBody + '\n[img:https://example.com/test.png|400|기관 로고]', target, 400));
});

test('옛글의 이미지 묶음 안 사진도 원본·자연크기·순서 보존 검사에 포함한다', () => {
  const baseline = replacementSnapshot(), after = replacementReady();
  const strips = ['one', 'two'].map((name, i) => ({ ...old, id: `SE-strip::${i}`, componentKind: 'imageStrip', src: `https://blogfiles.pstatic.net/strip/${name}.jpg?type=w1`, representative: false }));
  baseline.images.push(...structuredClone(strips)); after.images.push(...structuredClone(strips));
  baseline.flow.push({ kind: 'imageStrip', sources: strips.map(x => x.src), captions: ['기존 묶음 설명'] });
  after.flow.push({ kind: 'imageStrip', sources: strips.map(x => x.src.replace('blogfiles', 'postfiles').replace('w1', 'w773')), captions: ['기존 묶음 설명'] });
  assertImageChange(baseline, after, 'institution-test-aaaaaaaaaaaa', { replacement });
  const changedSize = structuredClone(after); changedSize.images[2].naturalHeight += 40;
  assert.throws(() => assertImageChange(baseline, changedSize, 'institution-test-aaaaaaaaaaaa', { replacement }));
  const missing = structuredClone(after); missing.images.pop();
  assert.throws(() => assertImageChange(baseline, missing, 'institution-test-aaaaaaaaaaaa', { replacement }));
  const moved = structuredClone(after); moved.flow.at(-1).sources.reverse();
  assert.throws(() => assertImageChange(baseline, moved, 'institution-test-aaaaaaaaaaaa', { replacement }));
});

test('새 정사각 로고의 다운샘플은 허용하고 실제 표시 비율을 확인한다', () => {
  const actual = { ...logo, width: '400', height: null, displayWidth: 400, displayHeight: 400, naturalWidth: 936, naturalHeight: 936 };
  assertLogoGeometry(actual, { width: 1024, height: 1024 });
  assertLogoGeometry({ ...actual, width: '240', displayWidth: 240, displayHeight: 240 }, { width: 240, height: 240 });
  assertLogoGeometry({ ...actual, width: '330', displayWidth: 330, displayHeight: 330 }, { width: 1024, height: 1024 });
});
for (const [name, changes] of [
  ['width 속성 누락', { width: null }], ['표시 높이 누락', { displayHeight: undefined }],
  ['표시 폭 무한대', { displayWidth: Infinity }], ['표시 높이 0', { displayHeight: 0 }],
  ['CSS에서 납작해진 사진', { displayHeight: 300 }], ['원본부터 납작해진 사진', { naturalHeight: 600 }],
  ['400px 제한 초과', { width: '500', displayWidth: 500, displayHeight: 500 }],
]) test(`새 로고 ${name} 감지`, () => {
  assert.throws(() => assertLogoGeometry({ ...logo, width: '400', displayWidth: 400, displayHeight: 400, ...changes }, { width: 1024, height: 1024 }));
});

for (const format of ['png', 'jpeg']) test(`${format} 원본의 실제 형식과 바이트를 업로드 복사본에 보존한다`, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-image-original-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('naver-image-original-test-'));
    fs.rmSync(dir, { recursive: true });
  });
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 140, g: 50, b: 20, alpha: 0.4 } } }).withMetadata({ density: 144 }).toFormat(format).toBuffer();
  const input = path.join(dir, 'wrong-extension.bin'); fs.writeFileSync(input, bytes);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const target = { curator: { slug: 'test', name: '기관' }, marker: 'institution-test-original', asset: { local_file: input, sha256: digest, width: 32, height: 32 } };
  const copied = await uploadFile(target, dir);
  assert.equal(path.extname(copied), format === 'png' ? '.png' : '.jpg');
  assert.deepEqual(fs.readFileSync(copied), bytes);
  assert.equal(await uploadFile(target, dir), copied, '같은 복사본 재확인도 원본 해시를 검사한다');
  fs.writeFileSync(copied, 'corrupted');
  await assert.rejects(uploadFile(target, dir), /업로드 복사본/);
  assert.deepEqual(fs.readFileSync(input), bytes, '검수 원본은 변경하지 않는다');
});

const firstLink = '📚 전체 목록 → https://feelandnote.com/library/curated/bbc/bbc-big-read-top-100';
const caretPoint = { text: firstLink, x: 540.9, y: 414, scrollX: 0, scrollY: 312, rect: { left: 534, right: 541, top: 404, bottom: 424 }, hitInside: true };
test('줄바꿈된 URL 끝 좌표와 스크롤이 연속 안정되고 클릭 대상이 단락 안일 때만 클릭한다', () => {
  assert.equal(caretPointsStable(caretPoint, structuredClone(caretPoint)), true);
  assert.equal(caretPointsStable(null, caretPoint), false, '한 번 읽은 좌표만으로 클릭하지 않는다');
});
for (const [name, changes] of [
  ['스크롤 이동', { scrollY: 340 }],
  ['가로 스크롤 이동', { scrollX: 20 }],
  ['레이아웃 이동', { y: 438, rect: { left: 534, right: 541, top: 428, bottom: 448 } }],
  ['글자 너비 변경', { rect: { left: 527, right: 541, top: 404, bottom: 424 } }],
  ['클릭 위치를 덮은 다른 요소', { hitInside: false }],
  ['좌표 누락', { x: null }],
  ['문구 변경', { text: firstLink + ' 바뀜' }],
]) test(`캐럿 좌표 안정 검사에서 ${name} 차단`, () => {
  const changed = { ...caretPoint, ...changes };
  assert.equal(caretPointsStable(caretPoint, changed), false);
  assert.equal(caretPointsStable(changed, caretPoint), false);
});
test('실제 클릭으로 URL 단락 끝에 놓인 단일 캐럿만 삽입을 허용한다', () => {
  assertCaretAtParagraphEnd(firstLink, { text: firstLink, inside: true, collapsed: true, head: firstLink, tail: '' });
  assertCaretAtParagraphEnd(firstLink, { text: firstLink + '\u200b', inside: true, collapsed: true, head: firstLink, tail: '\u200b' });
});
for (const [name, changes] of [
  ['URL 중간 캐럿으로 BBC URL을 둘로 나누는 회귀', { head: '📚 전체 목록 → https://feelandnote.', tail: 'com/library/curated/bbc/bbc-big-read-top-100' }],
  ['다른 단락에 놓인 캐럿', { inside: false }],
  ['본문 선택 영역이 남은 상태', { collapsed: false }],
  ['클릭 후 URL 문구 변경', { text: firstLink.replace('bbc-big-read-top-100', 'other') }],
]) test(`삽입 직전 ${name} 차단`, () => {
  assert.throws(() => assertCaretAtParagraphEnd(firstLink, { text: firstLink, inside: true, collapsed: true, head: firstLink, tail: '', ...changes }));
});
