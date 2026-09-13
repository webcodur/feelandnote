import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { REVISION_IDS, AVATAR_WIDTH, parseRevisionOptions, parseRevisionBody, selectRevisionTargets, assertRevisionSnapshot, assertFramesApplied, assertReservationPreserved, synchronizedRows, assertDbReviews, tableBaseTarget, assertFullListSource, assertTableOnlyChange, existingImageProof, fullListHtml, checkRevisionSource, tableAuthorBaseTarget, assertTableAuthorChange, needsExplicitServiceLink, explicitServiceLinkHtml, assertExplicitServiceLinkChange, textComponentParagraphs } from './apply-institution-revisions.mjs';

const targetPath = '/library/curated/booker-prize-foundation/booker-prize-winners';
const site = `https://feelandnote.com${targetPath}`;
function fixture(withLogo = false) {
  const logoAsset = { local_file: 'logo.png', sha256: 'a'.repeat(64), width: 1024, height: 1024, original_url: 'https://example.com/logo.png' };
  const body = [`전체 목록 → ${site}`, '', ...(withLogo ? [`[img:${logoAsset.original_url}|400|기관 로고]`, ''] : []), '소개합니다.', '━━━━━━', ...[1, 2, 3].flatMap(i => [`[img:https://example.com/book${i}.jpg|240|책 ${i} 표지]`, `책 ${i}를 읽었습니다.`]), '━━━━━━', site].join('\n');
  const rows = REVISION_IDS.map(logNo => ({ logNo, target: targetPath, title: '새 제목', body, ...(withLogo ? { logoAsset } : {}) }));
  const post = { logNo: REVISION_IDS[0], kind: 'curated', title: '기존 제목', url: site, link: 'check', scheduledAt: '2026. 10. 01 09:00' };
  const draft = { logNo: post.logNo, target: targetPath, title: post.title, body: '기존 본문', tags: ['기존 태그'], status: 'check', framed: true };
  const options = { ids: [post.logNo], useRevisionTitle: true };
  const [target] = selectRevisionTargets(rows, [post], [draft], options);
  const snapshot = { title: target.title, text: [...target.plan.text], links: target.plan.links.map(href => ({ text: href, href })), dividers: 2,
    flow: target.plan.flow.map(item => item.kind === 'image' ? { kind: 'image', src: `https://blogfiles.pstatic.net/${item.index}.jpg` } : item.kind === 'divider' ? { kind: 'se-horizontalLine', paragraphs: [], links: [] } : { kind: 'se-text', paragraphs: [item.text], links: [] }),
    images: target.plan.images.map((image, i) => ({ id: `SE-${i}`, src: `https://blogfiles.pstatic.net/${i}.jpg`, componentKind: 'image', naturalWidth: 640, naturalHeight: 940, width: '240', height: null, displayWidth: 240, displayHeight: 352.5, align: 'se-section-align-center', caption: [], representative: i === 0 })) };
  return { rows, post, draft, options, target, snapshot };
}

test('명시된 검수 ID만 골라 dry를 기본으로 한다', () => {
  assert.equal(parseRevisionOptions([`--ids=${REVISION_IDS[0]}`, '--revisions=test.json']).apply, false);
  assert.equal(parseRevisionOptions(['--all', '--revisions=test.json', '--use-revision-title']).ids.length, 18);
  assert.throws(() => parseRevisionOptions(['--all', '--revisions=test.json', '--apply']), /완료 18편/);
  for (const args of [['--all', '--ids=1'], ['--ids=1'], [`--ids=${REVISION_IDS[0]},${REVISION_IDS[0]}`], ['--all', '--apply', '--dry']]) assert.throws(() => parseRevisionOptions([...args, '--revisions=test.json']));
});
test('실행 원고는 정확한 18편이며 활성 원장 한 행과 목록 경로가 같아야 한다', () => {
  const f = fixture();
  assert.throws(() => selectRevisionTargets(f.rows.slice(1), [f.post], [f.draft], f.options));
  assert.throws(() => selectRevisionTargets([...f.rows.slice(1), f.rows[1]], [f.post], [f.draft], f.options));
  assert.throws(() => selectRevisionTargets(f.rows, [f.post, f.post], [f.draft], f.options));
  assert.throws(() => selectRevisionTargets(f.rows, [{ ...f.post, link: 'deleted' }], [f.draft], f.options));
  assert.throws(() => selectRevisionTargets(f.rows, [{ ...f.post, url: 'https://feelandnote.com/other' }], [f.draft], f.options));
});
test('기관 로고가 없어도 표지 세 장으로 구성하고 첫 표지를 대표사진으로 쓴다', () => {
  const f = fixture(); assert.equal(f.target.plan.logo, null); assertRevisionSnapshot(f.target, f.snapshot, { framedCovers: f.snapshot.images });
});
test('로고는 검수 원본과 같은 URL로 첫 링크 뒤 정확히 한 장만 허용한다', () => {
  const f = fixture(true); assert.equal(f.target.plan.logo.url, f.rows[0].logoAsset.original_url);
  assert.throws(() => parseRevisionBody({ ...f.rows[0], logoAsset: undefined }));
  assert.throws(() => parseRevisionBody({ ...f.rows[0], body: f.rows[0].body.replace('https://example.com/logo.png', 'https://example.com/wrong.png') }));
  assert.throws(() => parseRevisionBody({ ...f.rows[0], body: f.rows[0].body + '\n[img:https://example.com/other.png|400|다른 로고]' }));
});
test('기존 제목은 기본 보존하고 명시 옵션일 때만 수정안 제목을 쓴다', () => {
  const f = fixture(); assert.equal(f.target.title, '새 제목');
  assert.equal(selectRevisionTargets(f.rows, [f.post], [f.draft], { ...f.options, useRevisionTitle: false })[0].title, '기존 제목');
});
test('서비스 링크 두 개만 두고 외부 출처 링크와 마무리 뒤 본문을 차단한다', () => {
  const f = fixture(), revision = f.rows[0];
  const body = revision.body + '\n공식 수상작 목록 → https://example.com/winners\n상 소개 → https://example.com/about';
  assert.throws(() => parseRevisionBody({ ...revision, body }));
  assert.equal(parseRevisionBody(revision).links.length, 2);
  assert.throws(() => parseRevisionBody({ ...revision, body: revision.body + '\n새 본문이 이어집니다.' }));
  assert.throws(() => parseRevisionBody({ ...revision, body: revision.body + '\n[img:https://example.com/book4.jpg|240|책 4 표지]' }));
  assert.throws(() => parseRevisionBody({ ...revision, body: revision.body.replace(/\n[^\n]+$/, '') }));
});
for (const [name, mutate] of [
  ['본문 한 줄 누락', s => s.text.pop()], ['출처 링크 누락', s => s.links.pop()],
  ['사진 위치 이동', s => s.flow.reverse()], ['알 수 없는 컴포넌트', s => s.flow.push({ kind: 'se-unknown', paragraphs: [] })],
  ['본문이 있는 OG 컴포넌트', s => s.flow.push({ kind: 'se-oglink', paragraphs: ['원고에 없는 본문'] })],
  ['대표사진 누락', s => { s.images[0].representative = false; }], ['사진 원본 교체', s => { s.images[1].src = 'https://example.com/other.jpg'; }],
]) test(`저장 전 ${name} 차단`, () => {
  const f = fixture(), covers = structuredClone(f.snapshot.images); mutate(f.snapshot);
  assert.throws(() => assertRevisionSnapshot(f.target, f.snapshot, { framedCovers: covers }));
});
test('원고 URL의 자동 미리보기는 본문 순서에서 제외하고 본문·출처 링크 검사는 유지한다', () => {
  const f = fixture(), covers = structuredClone(f.snapshot.images);
  f.snapshot.flow.splice(1, 0, { kind: 'se-oglink', paragraphs: [], links: [] });
  assertRevisionSnapshot(f.target, f.snapshot, { framedCovers: covers });
  f.snapshot.links[0].href = 'https://example.com/wrong';
  assert.throws(() => assertRevisionSnapshot(f.target, f.snapshot, { framedCovers: covers }));
});
test('액자는 원본 표지 가로·세로에 40px씩 딱 한 번만 늘어난 상태를 허용한다', () => {
  const f = fixture(), framed = structuredClone(f.snapshot);
  for (const image of framed.images) { image.naturalWidth += 40; image.naturalHeight += 40; }
  assertFramesApplied(f.snapshot, framed);
  framed.images[1].naturalWidth += 40; framed.images[1].naturalHeight += 40;
  assert.throws(() => assertFramesApplied(f.snapshot, framed));
});
test('예약 제목 교정은 허용하고 날짜·시간·예약 수 변화를 막는다', () => {
  const before = { row: '옛 제목\n2026.10.01 09:00', count: 84 }, after = { row: '새 제목\n2026.10.01 09:00', count: 84 };
  assertReservationPreserved(before, after, '새 제목');
  assert.throws(() => assertReservationPreserved(before, { ...after, count: 85 }, '새 제목'));
  assert.throws(() => assertReservationPreserved(before, { ...after, row: '새 제목\n2026.10.01 10:00' }, '새 제목'));
  assert.throws(() => assertReservationPreserved(before, null, '새 제목'));
  assertReservationPreserved(null, null, '새 제목');
});
test('검증 후 원장 동기화는 대상 제목·본문만 갱신하고 다른 글·기존 태그·예약 정보를 보존한다', () => {
  const f = fixture(), other = { logNo: '999', body: '다른 작업자의 원고' };
  const updated = synchronizedRows(f.target, [f.draft, other], [f.post, other], 'now');
  assert.equal(updated.drafts[0].body, f.target.revision.body); assert.deepEqual(updated.drafts[0].tags, f.draft.tags);
  assert.equal(updated.posts[0].scheduledAt, f.post.scheduledAt); assert.equal(updated.posts[0].title, f.target.title);
  assert.deepEqual(updated.drafts[1], other); assert.deepEqual(updated.posts[1], other);
  assert.throws(() => synchronizedRows(f.target, [{ ...f.draft, body: '편집 중 변경' }], [f.post], 'now'));
});

function personFixture() {
  const f = fixture();
  const review = { review_id: 'review-1', content_id: 'book-1', celeb_id: 'person-1', person: '독자', person_label: '독자 · 작가', avatar_url: 'https://example.com/avatar.jpg', review: '나는 **별표도 원문대로** 읽었다.\n\n다음 문단도 그대로 남긴다.' };
  const row = { ...f.rows[0], dbReviews: [review], body: f.rows[0].body.replace('책 1를 읽었습니다.', `책 1를 읽었습니다.\n[avatar:${review.avatar_url}|${AVATAR_WIDTH}|${review.person}]\n[c]**${review.person_label}**[/c]\n[q]${review.review}[/q]`) };
  const plan = parseRevisionBody(row), target = { ...f.target, revision: row, plan };
  const snapshot = { ...f.snapshot, text: [...plan.text], flow: plan.flow.map(item => item.kind === 'image' ? { kind: 'image', src: `https://blogfiles.pstatic.net/${item.index}.jpg` } : item.kind === 'divider' ? { kind: 'se-horizontalLine', paragraphs: [], links: [] } : item.kind === 'quote' ? { kind: 'se-quotation', quoteStyle: 'quotation_line', quoteAlign: 'left', paragraphs: [...item.paragraphs], links: [] } : { kind: 'se-text', paragraphs: [item.text], links: [] }),
    images: plan.images.map((image, i) => ({ ...f.snapshot.images[0], id: `SE-${i}`, src: `https://blogfiles.pstatic.net/${i}.jpg`, representative: i === 0, ...(image.role === 'avatar' ? { width: String(AVATAR_WIDTH), displayWidth: AVATAR_WIDTH, displayHeight: AVATAR_WIDTH * 940 / 640 } : {}) })) };
  const proof = { framedCovers: snapshot.images.filter((_, i) => plan.images[i].role === 'cover').map(x => ({ ...x })), unframedAvatars: snapshot.images.filter((_, i) => plan.images[i].role === 'avatar').map(x => ({ ...x })) };
  return { row, review, target, snapshot, proof };
}

test('인물 사진·중앙 이름·멀티라인 감상 박스를 조립하며 감상 원문의 별표를 해석하지 않는다', () => {
  const f = personFixture();
  assert.equal(f.target.plan.avatars.length, 1); assert.equal(f.target.plan.covers.length, 3);
  assert.equal(f.target.plan.operations.find(item => item.kind === 'quote').text, f.review.review);
  assertRevisionSnapshot(f.target, f.snapshot, f.proof); assertDbReviews(f.target, f.snapshot);
});
for (const [name, change] of [
  ['다른 얼굴', r => { r.body = r.body.replace('avatar.jpg', 'wrong.jpg'); }],
  ['다른 인물 이름', r => { r.body = r.body.replace('**독자 · 작가**', '**다른 사람 · 작가**'); }],
  ['축약 감상', r => { r.body = r.body.replace('다음 문단도 그대로 남긴다.', '줄인 감상'); }],
  ['인용구 닫기 누락', r => { r.body = r.body.replace('[/q]', ''); }],
]) test(`인물 감상 조립에서 ${name} 차단`, () => {
  const f = personFixture(), row = structuredClone(f.row); change(row); assert.throws(() => parseRevisionBody(row));
});
test('책 표지만 액자를 허용하고 인물 사진 원본에 40px이 더해지면 거부한다', () => {
  const f = personFixture(), after = structuredClone(f.snapshot), coverIds = f.proof.framedCovers.map(photo => photo.id);
  for (const photo of after.images) if (coverIds.includes(photo.id)) { photo.naturalWidth += 40; photo.naturalHeight += 40; }
  assertFramesApplied(f.snapshot, after, coverIds);
  const avatar = after.images.find(photo => !coverIds.includes(photo.id)); avatar.naturalWidth += 40; avatar.naturalHeight += 40;
  assert.throws(() => assertFramesApplied(f.snapshot, after, coverIds));
});
test('감상이 일반 본문으로 풀리거나 인물 사진 폭이 커지면 저장을 거부한다', () => {
  const f = personFixture(), plain = structuredClone(f.snapshot);
  plain.flow.find(component => component.kind === 'se-quotation').kind = 'se-text';
  assert.throws(() => assertRevisionSnapshot(f.target, plain, f.proof));
  f.snapshot.images[1].displayWidth = 240;
  assert.throws(() => assertRevisionSnapshot(f.target, f.snapshot, f.proof));
});

for (const [key, value] of [['quoteStyle', 'quotation_fancy'], ['quoteAlign', 'center']]) test(`인용구 스타일 변경 차단: ${key}`, () => {
  const f = personFixture();
  f.snapshot.flow.find(component => component.kind === 'se-quotation')[key] = value;
  assert.throws(() => assertRevisionSnapshot(f.target, f.snapshot, f.proof), /왼쪽 선 스타일/);
});


function tableFixture(count = 58, columns = ['연도', '작품', '작가']) {
  const f = personFixture(), heading = '동인문학상 전체 수상작 58편';
  const fullList = { heading, columns, rows: Array.from({ length: count }, (_, i) => columns.length === 2 ? ['작품 ' + i, i ? '저자 ' + i : ''] : [String(1956 + i), '작품 ' + i, '작가 ' + i]), source_file: 'prepared-list.json' };
  const baseBody = f.row.body.replace(new RegExp(site + '$'), '기존 서비스 안내입니다.\n' + site);
  const added = '[c]**' + heading + '**[/c]\n\n[table]\n' + [fullList.columns, ...fullList.rows].map(row => row.join('\t')).join('\n') + '\n[/table]\n\n';
  const revision = { ...f.row, fullList, body: baseBody.replace('기존 서비스 안내입니다.', added + '기존 서비스 안내입니다.') };
  const target = { ...f.target, revision, plan: parseRevisionBody(revision), post: { ...f.target.post, title: f.target.title }, draft: { ...f.target.draft, body: baseBody } };
  const makeSnapshot = plan => ({ ...structuredClone(f.snapshot), text: [...plan.text], flow: plan.flow.map(item => item.kind === 'table' ? { kind: 'se-table', rows: structuredClone(item.rows), merged: false, paragraphs: item.rows.flat(), links: [] } : item.kind === 'quote' ? { kind: 'se-quotation', quoteStyle: 'quotation_line', quoteAlign: 'left', paragraphs: [...item.paragraphs], links: [] } : item.kind === 'image' ? { kind: 'image', src: f.snapshot.images[item.index].src } : item.kind === 'divider' ? { kind: 'se-horizontalLine', paragraphs: [], links: [] } : { kind: 'se-text', paragraphs: [item.text], links: [] }) });
  const base = tableBaseTarget(target), before = makeSnapshot(base.plan), after = makeSnapshot(target.plan);
  return { target, before, after, source: count === 58 && columns.join(',') === '연도,작품,작가' ? { count, items: fullList.rows.map(([year, title, author]) => ({ year: Number(year), title, author })) } : { count, columns, rows: structuredClone(fullList.rows) } };
}

test('표만 추가 옵션과 58편 원본·소제목·표 원고 일치를 검사한다', () => {
  assert.equal(parseRevisionOptions(['--table-only', '--ids=' + REVISION_IDS[0], '--revisions=x.json']).tableOnly, true);
  const f = tableFixture();
  assertFullListSource(f.target.revision.fullList, f.source);
  assert.equal(f.target.plan.tables[0].rows.length, 59);
  assertTableOnlyChange(f.target, f.before, f.after);
  assertRevisionSnapshot(f.target, f.after, existingImageProof(f.target, f.before));
});
for (const [name, mutate] of [
  ['58편 중 한 작품 값 변경', r => { r.body = r.body.replace('작품 17', '다른 작품'); }],
  ['전체 목록 소제목 중앙 정렬 해제', r => { r.body = r.body.replace('[c]**동인문학상 전체 수상작 58편**[/c]', '**동인문학상 전체 수상작 58편**'); }],
  ['표 닫기 누락', r => { r.body = r.body.replace('[/table]', ''); }],
  ['표 메타 행 누락', r => { r.fullList.rows.pop(); }],
]) test('표 원고 차단: ' + name, () => {
  const f = tableFixture(), revision = structuredClone(f.target.revision); mutate(revision);
  assert.throws(() => parseRevisionBody(revision));
});
test('표 추가는 기존 원고 변경과 다른 원본 목록 순서를 거부한다', () => {
  const f = tableFixture();
  f.target.draft.body = f.target.draft.body.replace('기존 서비스 안내입니다.', '다른 안내입니다.');
  assert.throws(() => tableBaseTarget(f.target));
  f.source.items.reverse(); assert.throws(() => assertFullListSource(f.target.revision.fullList, f.source));
});
for (const [name, mutate] of [
  ['셀 내용 변경', s => { s.flow.find(x => x.kind === 'se-table').rows[17][1] = '다른 책'; }],
  ['셀 병합', s => { s.flow.find(x => x.kind === 'se-table').merged = true; }],
  ['표 위치 변경', s => { const i = s.flow.findIndex(x => x.kind === 'se-table'); s.flow.unshift(...s.flow.splice(i, 1)); }],
  ['기존 사진 변경', s => { s.images[2].naturalWidth += 40; }],
  ['기존 링크 표시 변경', s => { s.links[0].text = '다른 링크 표시'; }],
]) test('표 추가 보존 검사: ' + name, () => {
  const f = tableFixture(); mutate(f.after); assert.throws(() => assertTableOnlyChange(f.target, f.before, f.after));
});


test('CF_HTML은 ASCII만 사용하며 한글·특수문자·58편 셀값이 손실 없이 복원된다', () => {
  const f = tableFixture(), list = structuredClone(f.target.revision.fullList);
  list.rows[0][1] = '한글 & <작품> "제목" 😀';
  const html = fullListHtml(list);
  assert.equal(/[^\x00-\x7f]/.test(html), false);
  const widths = [...html.matchAll(/<td style="[^"]*width:(\d+%);/g)].map(match => match[1]);
  assert.deepEqual(widths, Array.from({ length: 59 }, () => ['22%', '54%', '24%']).flat());
  const decode = value => value.replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  const cells = [...html.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(match => decode(match[1]));
  assert.deepEqual(cells, [list.columns, ...list.rows].flat());
  assert.equal(decode(html.match(/<h3[^>]*>(.*?)<\/h3>/)[1]), list.heading);
  assert.equal((html.match(/<tr>/g) ?? []).length, 59);
});


for (const [count, columns] of [[3, ['연도', '작품', '작가']], [100, ['작품', '저자']], [231, ['학과', '작품', '저자']]]) test('목록별 행수와 열을 보존한다: ' + count + '편 ' + columns.join('/'), () => {
  const f = tableFixture(count, columns), list = f.target.revision.fullList;
  assertFullListSource(list, f.source);
  assertTableOnlyChange(f.target, f.before, f.after);
  assert.equal(f.target.plan.tables[0].rows.length, count + 1);
  const html = fullListHtml(list, { includeHeading: false });
  assert.equal(html.includes('<h3'), false);
  assert.equal((html.match(/<tr>/g) ?? []).length, count + 1);
  assert.equal((html.match(/<td /g) ?? []).length, (count + 1) * columns.length);
  const widths = [...html.matchAll(/<td style="[^"]*width:(\d+%);/g)].map(match => match[1]);
  assert.deepEqual(widths, Array.from({ length: count + 1 }, () => columns.length === 3 ? ['22%', '54%', '24%'] : ['72%', '28%']).flat());
  f.source.rows.reverse(); assert.throws(() => assertFullListSource(list, f.source));
});
test('목록 원본의 잘못된 행수와 열 이름을 차단한다', () => {
  const f = tableFixture(4, ['작품', '저자']), bad = structuredClone(f.source);
  bad.count++; assert.throws(() => assertFullListSource(f.target.revision.fullList, bad));
  bad.count--; bad.columns[0] = '다른 열'; assert.throws(() => assertFullListSource(f.target.revision.fullList, bad));
});


test('마지막 구분선 뒤 기존 연결 문장은 목록 제목 앞에 보존할 수 있다', () => {
  const f = tableFixture(), bridge = '[c]여기까지가 케임브리지 철학 목록에서 고른 네 권입니다.[/c]\n';
  f.target.revision.body = f.target.revision.body.replace('[c]**' + f.target.revision.fullList.heading, bridge + '[c]**' + f.target.revision.fullList.heading);
  f.target.draft.body = f.target.draft.body.replace('기존 서비스 안내입니다.', bridge + '기존 서비스 안내입니다.');
  f.target.plan = parseRevisionBody(f.target.revision);
  const base = tableBaseTarget(f.target);
  assert.equal(base.plan.text.includes(bridge.slice(3, -5)), true);
  f.target.draft.body = f.target.draft.body.replace(bridge, '');
  assert.throws(() => tableBaseTarget(f.target));
});
test('마지막 구분선과 목록 제목 사이에 사진이 끼면 차단한다', () => {
  const f = tableFixture(), revision = structuredClone(f.target.revision);
  revision.body = revision.body.replace('[c]**' + revision.fullList.heading, '[img:https://example.com/unexpected.jpg|240|추가 표지]\n[c]**' + revision.fullList.heading);
  assert.throws(() => parseRevisionBody(revision), /마지막 구분선 뒤/);
});

function newTargetFixture() {
  const f = fixture(), logNo = '224400000001';
  const revision = { ...f.rows[0], logNo, kind: 'curated', source_revision_sha256: 'b'.repeat(64) };
  const post = { ...f.post, logNo }, draft = { ...f.draft, logNo };
  const manifestRows = [{ logNo, target: revision.target, kind: revision.kind, source_revision_sha256: revision.source_revision_sha256 }];
  return { revision, post, draft, options: { ids: [logNo], manifestRows } };
}

test('새 대상은 명시 ID와 검수 manifest가 필요하며 all로 확대할 수 없다', () => {
  const base = ['--revisions=rows.json', '--ids=224400000001'];
  assert.throws(() => parseRevisionOptions(base), /manifest/);
  const options = parseRevisionOptions([...base, '--manifest=manifest.json', '--drafts=celeb-drafts.json', '--apply']);
  assert.equal(options.drafts, 'celeb-drafts.json'); assert.equal(options.apply, true);
  assert.throws(() => parseRevisionOptions(['--all', '--manifest=manifest.json', '--revisions=rows.json']), /완료 18편/);
});

test('검수 목록의 ID·유형·경로·해시 변경과 완료18편 끼워넣기를 차단한다', () => {
  const f = newTargetFixture();
  assert.equal(selectRevisionTargets([f.revision], [f.post], [f.draft], f.options)[0].post.logNo, f.post.logNo);
  for (const change of [{ logNo: REVISION_IDS[0] }, { kind: 'celeb' }, { target: '/celeb/someone' }, { source_revision_sha256: 'c'.repeat(64) }]) {
    assert.throws(() => selectRevisionTargets([f.revision], [f.post], [f.draft], { ...f.options, manifestRows: [{ ...f.options.manifestRows[0], ...change }] }));
  }
  assert.throws(() => selectRevisionTargets([f.revision, f.revision], [f.post], [f.draft], f.options));
  assert.throws(() => selectRevisionTargets([f.revision], [f.post], [{ ...f.draft, revisionSha256: 'done' }], f.options), /이미 개편/);
});

test('초안 없는 기존 기관글을 검증된 게시 행과 seed로 추가하고 동시 변경은 보존한다', () => {
  const f = newTargetFixture(), other = { logNo: '999', body: '다른 원고' };
  f.revision.draftSeed = { logNo: f.post.logNo, target: f.revision.target, kind: 'curated', status: 'check', tags: ['기존 태그'] };
  const [target] = selectRevisionTargets([f.revision], [f.post], [other], f.options);
  const updated = synchronizedRows(target, [other], [f.post], 'now');
  assert.deepEqual(updated.drafts[0], other); assert.equal(updated.drafts[1].body, f.revision.body);
  assert.equal(updated.drafts[1].revisionSha256, target.digest); assert.equal(updated.posts[0].scheduledAt, f.post.scheduledAt);
  assert.throws(() => synchronizedRows(target, [other, f.draft], [f.post], 'now'), /작업 도중/);
  assert.throws(() => selectRevisionTargets([f.revision], [], [], f.options), /원장/);
  assert.throws(() => selectRevisionTargets([{ ...f.revision, draftSeed: undefined }], [f.post], [], f.options), /초안 메타/);
});

function celebFixture() {
  const f = newTargetFixture(), target = '/celeb/person-one', site = 'https://feelandnote.com' + target;
  const reviews = [1, 2, 3].map(i => ({ review_id: 'review-' + i, content_id: 'book-' + i, celeb_id: 'person-1', person: '독자', person_label: '독자 · 작가', avatar_url: 'https://example.com/avatar.jpg', review: `원문 감상 ${i}입니다.` }));
  const body = [`전체 목록 → ${site}`, '[avatar:https://example.com/avatar.jpg|100|독자]', '[c]**독자 · 작가**[/c]', '소개입니다.', '━━━━━━', ...reviews.flatMap((review, i) => [`[c]**책 ${i + 1}**[/c]`, `[img:https://example.com/book${i + 1}.jpg|240|책 ${i + 1} 표지]`, '책 소개입니다.', `[q]${review.review}[/q]`, '━━━━━━']), '다른 책도 확인하세요.', site].join('\n');
  const revision = { ...f.revision, target, kind: 'celeb', body, dbReviews: reviews };
  return { ...f, revision, post: { ...f.post, kind: 'celeb', url: site }, draft: { ...f.draft, target }, options: { ...f.options, manifestRows: [{ ...f.options.manifestRows[0], kind: 'celeb', target }] } };
}

test('인물편은 첫 인물사진과 책 순서별 원문 인용을 사용하며 다른 인물 혼입을 거부한다', () => {
  const f = celebFixture(), [target] = selectRevisionTargets([f.revision], [f.post], [f.draft], f.options);
  assert.equal(target.plan.images[0].role, 'avatar'); assert.equal(target.plan.avatars.length, 1); assert.equal(target.plan.quotes.length, 3);
  const changed = structuredClone(f.revision); changed.dbReviews[1].celeb_id = 'other-person';
  assert.throws(() => parseRevisionBody(changed), /인물 표시/);
  assert.throws(() => parseRevisionBody({ ...f.revision, body: f.revision.body.replace('[q]원문 감상 2입니다.[/q]', '[q]원문 감상 1입니다.[/q]') }), /DB 감상/);
  assert.throws(() => selectRevisionTargets([f.revision], [f.post], [], f.options), /초안 메타/);
});

test('기존 인물 글은 URL이 비었을 때만 slug로 대조하고 원장 원본을 보존한다', () => {
  const f = celebFixture();
  for (const url of [null, '', undefined]) {
    const post = { ...f.post, slug: 'person-one', url }, before = structuredClone(post);
    const [target] = selectRevisionTargets([f.revision], [post], [f.draft], f.options);
    assert.deepEqual(post, before);
    assert.deepEqual(target.post, before);
  }
  for (const change of [
    { url: null, slug: 'other-person' },
    { url: '', slug: '' },
    { url: null, slug: undefined },
    { url: 'https://example.com/other', slug: 'person-one' },
    { url: 'https://feelandnote.com/celeb/other-person', slug: 'person-one' },
    { url: f.post.url, slug: 'other-person' },
    { url: null, slug: 'person-one', link: 'private' },
  ]) assert.throws(() => selectRevisionTargets([f.revision], [{ ...f.post, ...change }], [f.draft], f.options), /활성 글/);
  const institution = newTargetFixture();
  assert.throws(() => selectRevisionTargets([institution.revision], [{ ...institution.post, url: null, slug: 'person-one' }], [institution.draft], institution.options), /활성 글/);
});

test('초안 없는 기존 인물글은 manifest와 동일 ID·경로·유형의 seed가 있어야 한다', () => {
  const f = celebFixture(), post = { ...f.post, slug: 'person-one', url: null };
  const seed = { logNo: post.logNo, target: f.revision.target, kind: 'celeb', status: 'check', tags: ['기존 태그'] };
  const revision = { ...f.revision, draftSeed: seed };
  const [target] = selectRevisionTargets([revision], [post], [], f.options);
  assert.equal(target.draft, null);
  const updated = synchronizedRows(target, [], [post], 'now');
  assert.equal(updated.drafts[0].kind, 'celeb');
  assert.equal(updated.drafts[0].body, revision.body);
  assert.deepEqual(updated.drafts[0].tags, seed.tags);
  assert.equal(updated.posts[0].url, null);
  assert.equal(post.url, null);
  for (const draftSeed of [undefined, { ...seed, logNo: '999' }, { ...seed, target: '/celeb/other' }, { ...seed, kind: 'curated' }]) {
    assert.throws(() => selectRevisionTargets([{ ...revision, draftSeed }], [post], [], f.options), /초안 메타/);
  }
  assert.throws(() => selectRevisionTargets([revision], [post], [], { ids: f.options.ids }), /정확한 18편/);
  assert.throws(() => selectRevisionTargets([revision], [post], [{ ...f.draft, revisionSha256: 'done' }], f.options), /이미 개편/);
});

test('DB 원문 속 URL은 그대로 허용하고 인용구 밖 임의 URL을 차단한다', () => {
  const f = celebFixture(), value = '원문 감상 2입니다. https://example.com/source';
  f.revision.body = f.revision.body.replace(f.revision.dbReviews[1].review, value); f.revision.dbReviews[1].review = value;
  assert.equal(parseRevisionBody(f.revision).links.length, 3);
  assert.throws(() => parseRevisionBody({ ...f.revision, body: f.revision.body.replace('소개입니다.', '소개입니다. https://example.com/source') }), /링크/);
});

function celebBookLinkFixture() {
  const f = celebFixture();
  f.revision.dbReviews.forEach((review, i) => { review.content_id = `00000000-0000-0000-0000-00000000000${i + 1}`; });
  const urls = f.revision.dbReviews.map(review => `https://feelandnote.com/content/${review.content_id}?category=book`);
  const withLink = (body, i, url = urls[i]) => body.replace(`[q]${f.revision.dbReviews[i].review}[/q]`, `[q]${f.revision.dbReviews[i].review}[/q]\n책 정보와 구매 링크 → ${url}`);
  return { ...f, urls, withLink };
}

test('인물편 책 상세 링크는 해당 감상 뒤에 선택적으로 한 번 허용하고 원문 URL 순서를 보존한다', () => {
  const f = celebBookLinkFixture();
  assert.deepEqual(parseRevisionBody(f.revision).bookLinks, []);
  const review = f.revision.dbReviews[1], old = review.review;
  review.review += '\nhttps://example.com/original';
  f.revision.body = f.revision.body.replace(old, review.review);
  const body = [0, 1, 2].reduce((body, i) => f.withLink(body, i), f.revision.body);
  const plan = parseRevisionBody({ ...f.revision, body });
  assert.deepEqual(plan.bookLinks.map(link => link.url), f.urls);
  assert.deepEqual(plan.links, [f.post.url, f.urls[0], 'https://example.com/original', f.urls[1], f.urls[2], f.post.url]);
  assert.equal(parseRevisionBody({ ...f.revision, body: f.withLink(f.revision.body, 1) }).bookLinks.length, 1);
});

for (const [name, mutate] of [
  ['다른 책 ID', f => f.withLink(f.revision.body, 0, f.urls[1])],
  ['미소개 책 ID', f => f.withLink(f.revision.body, 0, f.urls[0].replace(/001\?/, '009?'))],
  ['외부 사이트', f => f.withLink(f.revision.body, 0, 'https://link.coupang.com/a/book')],
  ['다른 카테고리', f => f.withLink(f.revision.body, 0, f.urls[0].replace('category=book', 'category=video'))],
  ['추가 쿼리', f => f.withLink(f.revision.body, 0, f.urls[0] + '&other=1')],
  ['감상 전 링크', f => f.revision.body.replace('[q]', f.urls[0] + '\n[q]')],
  ['첫 표지 전 링크', f => f.revision.body.replace('[c]**책 1**[/c]', f.urls[0] + '\n[c]**책 1**[/c]')],
  ['다음 책 표지 뒤 링크', f => f.withLink(f.revision.body, 1, f.urls[0])],
  ['중복 링크', f => f.withLink(f.revision.body, 0, f.urls[0] + '\n' + f.urls[0])],
  ['마무리 뒤 링크', f => f.revision.body + '\n' + f.urls[2]],
]) test('인물편 책 상세 링크 차단: ' + name, () => {
  const f = celebBookLinkFixture();
  assert.throws(() => parseRevisionBody({ ...f.revision, body: mutate(f) }), /링크/);
});

test('기관편은 감상 뒤에도 책 상세 링크를 추가하지 않는다', () => {
  const f = personFixture();
  f.row.dbReviews[0].content_id = '00000000-0000-0000-0000-000000000001';
  const body = f.row.body.replace('[/q]', '[/q]\nhttps://feelandnote.com/content/00000000-0000-0000-0000-000000000001?category=book');
  assert.throws(() => parseRevisionBody({ ...f.row, body }), /링크/);
});

test('검수 원본 파일 해시와 실제 실행 본문을 함께 묶어 변경된 본문 저장을 막는다', () => {
  const f = celebFixture(), file = path.join(os.tmpdir(), `naver-source-test-${crypto.randomUUID()}.json`);
  const bytes = JSON.stringify(f.revision);
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  const revision = { ...f.revision, source_revision_file: file, source_revision_sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  try {
    checkRevisionSource(revision, { bindContent: true });
    assert.throws(() => checkRevisionSource({ ...revision, body: revision.body + '\n다른 본문' }, { bindContent: true }), /body/);
    fs.writeFileSync(file, bytes + '\n');
    assert.throws(() => checkRevisionSource(revision, { bindContent: true }), /변경/);
  } finally { fs.unlinkSync(file); }
});

test('기관편은 근거가 있는 대표 두 권을 허용하며 한 권으로 줄면 차단한다', () => {
  const f = fixture(), target = '/library/curated/american-library-association/newbery-medal';
  const twoBookBody = f.rows[0].body.replace('[img:https://example.com/book3.jpg|240|책 3 표지]\n책 3를 읽었습니다.\n', '');
  assert.equal(parseRevisionBody({ ...f.rows[0], body: twoBookBody }).covers.length, 2);
  const revision = { ...f.rows[0], logNo: '224399582451', target, body: twoBookBody.replaceAll(targetPath, target) };
  assert.equal(parseRevisionBody(revision).covers.length, 2);
  assert.throws(() => parseRevisionBody({ ...revision, body: revision.body.replace('[img:https://example.com/book2.jpg|240|책 2 표지]\n책 2를 읽었습니다.\n', '') }), /2~5/);
});

test('제목 정렬만 수정할 때는 저장 검증된 동일 본문·제목만 다시 열 수 있다', () => {
  const f = newTargetFixture(), [target] = selectRevisionTargets([f.revision], [f.post], [f.draft], f.options);
  const draft = { ...f.draft, body: f.revision.body, rewrittenAt: 'now', revisionSha256: target.digest };
  assert.equal(parseRevisionOptions(['--ids=' + f.post.logNo, '--manifest=x.json', '--revisions=x.json', '--title-only']).titleOnly, true);
  assert.throws(() => parseRevisionOptions(['--ids=' + REVISION_IDS[0], '--revisions=x.json', '--title-only', '--apply']));
  assert.equal(selectRevisionTargets([f.revision], [f.post], [draft], { ...f.options, titleOnly: true }).length, 1);
  assert.throws(() => selectRevisionTargets([f.revision], [f.post], [draft], f.options), /이미 개편/);
  assert.throws(() => selectRevisionTargets([f.revision], [f.post], [{ ...draft, body: '다른 본문' }], { ...f.options, titleOnly: true }), /제목 정렬만/);
  assert.throws(() => selectRevisionTargets([f.revision], [f.post], [draft], { ...f.options, titleOnly: true, useRevisionTitle: true }), /제목 정렬만/);
});

test('실제 인물 slug의 이니셜 점을 허용하고 쿼리·추가 경로는 거부한다', () => {
  const f = celebFixture();
  for (const slug of ['harry-s.-truman', 't.s.-eliot']) {
    const target = '/celeb/' + slug;
    assert.equal(parseRevisionBody({ ...f.revision, target, body: f.revision.body.replaceAll(f.revision.target, target) }).quotes.length, 3);
  }
  assert.throws(() => parseRevisionBody({ ...f.revision, target: '/celeb/person?query=1' }));
  assert.throws(() => parseRevisionBody({ ...f.revision, target: '/celeb/person/other' }));
});

function authorCellFixture() {
  const f = tableFixture(4, ['작품', '저자']);
  const render = revision => revision.body.replace(/\[table\]\n[\s\S]*?\n\[\/table\]/, '[table]\n' + [revision.fullList.columns, ...revision.fullList.rows].map(row => row.join('\t')).join('\n') + '\n[/table]');
  const previous = { ...structuredClone(f.target.revision), kind: 'curated', logNo: '224400000002' };
  previous.fullList.rows[2][1] = ''; previous.body = render(previous);
  const revision = structuredClone(previous); revision.fullList.rows[0][1] = '저자 0'; revision.fullList.rows[2][1] = '저자 2'; revision.body = render(revision);
  const draft = { ...f.target.draft, logNo: revision.logNo, title: f.target.title, body: previous.body, rewrittenAt: 'verified' };
  const post = { ...f.target.post, logNo: revision.logNo };
  const digest = row => crypto.createHash('sha256').update(JSON.stringify({ title: post.title, body: row.body, logoAsset: row.logoAsset ?? null })).digest('hex');
  draft.revisionSha256 = digest(previous);
  const target = { ...f.target, revision, draft, post, plan: parseRevisionBody(revision), digest: digest(revision) };
  const snapshot = row => {
    const copy = structuredClone(f.after), table = copy.flow.find(item => item.kind === 'se-table');
    table.rows = [row.fullList.columns, ...row.fullList.rows]; table.paragraphs = table.rows.flat().filter(Boolean); return copy;
  };
  return { target, before: snapshot(previous), after: snapshot(revision), render };
}

test('전체 표 마지막 저자열의 빈칸만 찾아 채우고 원본 사진·본문·표 순서를 보존한다', () => {
  const f = authorCellFixture(), patch = tableAuthorBaseTarget(f.target);
  assert.deepEqual(patch.cells, [{ row: 1, column: 1, text: '저자 0' }, { row: 3, column: 1, text: '저자 2' }]);
  assertTableAuthorChange(f.target, f.before, f.after);
  const updated = synchronizedRows(f.target, [f.target.draft], [f.target.post], 'now');
  assert.equal(updated.drafts[0].body, f.target.revision.body);
  assert.equal(updated.drafts[0].revisionSha256, f.target.digest);
  assert.equal(updated.posts[0].scheduledAt, f.target.post.scheduledAt);
});

for (const [name, change] of [
  ['본문', f => { f.target.revision.body = f.target.revision.body.replace('기존 서비스 안내입니다.', '다른 서비스 안내입니다.'); }],
  ['기존 저자', f => { f.target.revision.fullList.rows[1][1] = '다른 저자'; f.target.revision.body = f.render(f.target.revision); }],
  ['작품명', f => { f.target.revision.fullList.rows[0][0] = '다른 작품'; f.target.revision.body = f.render(f.target.revision); }],
  ['행 순서', f => { f.target.revision.fullList.rows.reverse(); f.target.revision.body = f.render(f.target.revision); }],
]) test('작가 빈칸 채우기에서 허용하지 않은 변경 차단: ' + name, () => {
  const f = authorCellFixture(); change(f); f.target.plan = parseRevisionBody(f.target.revision);
  assert.throws(() => tableAuthorBaseTarget(f.target));
});

test('저자 셀 수정 후 다른 사진이나 표 셀이 변하면 저장 검증을 거부한다', () => {
  const f = authorCellFixture(), imageChanged = structuredClone(f.after), cellChanged = structuredClone(f.after);
  imageChanged.images[0].naturalWidth += 40;
  assert.throws(() => assertTableAuthorChange(f.target, f.before, imageChanged));
  cellChanged.flow.find(item => item.kind === 'se-table').rows[2][1] = '';
  assert.throws(() => assertTableAuthorChange(f.target, f.before, cellChanged));
});

test('검증 완료 글도 빈 저자 셀 부분수정으로만 허용하며 같은 수정의 반복은 거부한다', () => {
  const f = authorCellFixture(); f.target.revision.source_revision_sha256 = 'd'.repeat(64);
  const options = { ids: [f.target.post.logNo], fillTableAuthors: true, manifestRows: [{ logNo: f.target.post.logNo, kind: 'curated', target: f.target.revision.target, source_revision_sha256: 'd'.repeat(64) }] };
  assert.equal(selectRevisionTargets([f.target.revision], [f.target.post], [f.target.draft], options).length, 1);
  assert.throws(() => selectRevisionTargets([f.target.revision], [f.target.post], [f.target.draft], { ...options, fillTableAuthors: false }), /이미 개편/);
  const updated = synchronizedRows(f.target, [f.target.draft], [f.target.post], 'now');
  assert.throws(() => selectRevisionTargets([f.target.revision], updated.posts, updated.drafts, options), /채울 작가 빈칸/);
  assert.throws(() => parseRevisionOptions(['--ids=' + f.target.post.logNo, '--revisions=x', '--manifest=x', '--fill-table-authors', '--title-only']), /부분 수정/);
  assert.throws(() => parseRevisionOptions(['--ids=' + REVISION_IDS[0], '--revisions=x', '--manifest=x', '--fill-table-authors', '--apply']), /완료 18편/);
});

test('끝점으로 끝나는 서비스 URL 두 안내줄만 명시 링크 입력을 사용한다', () => {
  const target = '/celeb/martin-luther-king-jr.', site = 'https://feelandnote.com' + target;
  assert.equal(needsExplicitServiceLink('📚 감상 기록 → ' + site, target), true);
  assert.equal(needsExplicitServiceLink('→ ' + site, target), true);
  assert.equal(needsExplicitServiceLink('소개 문장입니다.', target), false);
  assert.equal(needsExplicitServiceLink('→ https://feelandnote.com/celeb/t.s.-eliot', '/celeb/t.s.-eliot'), false);
});

test('CF_HTML 링크는 끝점을 포함한 표시 URL과 href를 정확히 보존한다', () => {
  const site = 'https://feelandnote.com/celeb/martin-luther-king-jr.', line = '📚 감상 기록 → ' + site;
  const html = explicitServiceLinkHtml(line, site);
  assert.equal(/[^\x00-\x7f]/.test(html), false);
  const decoded = html.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
  assert.equal(decoded.replace(/<[^>]+>/g, ''), line);
  assert.equal(decoded.match(/<a href="([^"]+)">([^<]+)<\/a>/)[1], site);
  assert.equal(decoded.match(/<a href="([^"]+)">([^<]+)<\/a>/)[2], site);
  assert.equal(new URL(decoded.match(/href="([^"]+)"/)[1]).pathname.endsWith('.'), true);
  assert.throws(() => explicitServiceLinkHtml(line + ' 다른 문장', site));
  assert.throws(() => explicitServiceLinkHtml('https://example.com', 'https://example.com'));
});

test('글자만 입력되고 링크가 없는 실제 실패 형태는 계속 거부하고 정확한 링크 삽입만 통과시킨다', () => {
  const site = 'https://feelandnote.com/celeb/martin-luther-king-jr.', text = '📚 감상 기록 → ' + site;
  const before = { title: '제목', text: [], links: [], images: [], flow: [] };
  const after = { ...before, text: [text], flow: [{ kind: 'se-text', paragraphs: [text] }], links: [] };
  assert.throws(() => assertExplicitServiceLinkChange(before, after, text, site));
  after.links = [{ text: site, href: site }];
  assertExplicitServiceLinkChange(before, after, text, site);
  assert.throws(() => assertExplicitServiceLinkChange(before, { ...after, links: [{ text: site, href: site.slice(0, -1) }] }, text, site));
  assert.throws(() => assertExplicitServiceLinkChange(before, { ...after, text: [text, '원고 외 본문'] }, text, site));
});

test('첫 링크 입력 전 빈 본문의 UI 안내문만 제외하고 같은 글자의 실제 본문은 보존한다', () => {
  const node = (text, placeholder = '') => ({ querySelectorAll: () => [{ cloneNode: () => {
    let hint = placeholder;
    return { get textContent() { return text + hint; }, querySelectorAll: () => placeholder ? [{ remove() { hint = ''; } }] : [] };
  } }] });
  const hint = '글을 입력하세요.';
  assert.deepEqual(textComponentParagraphs([node('', hint)]), [[]]);
  assert.deepEqual(textComponentParagraphs([node(hint)]), [[hint]]);
  const site = 'https://feelandnote.com/celeb/martin-luther-king-jr.', text = '📚 감상 기록 → ' + site;
  const paragraphs = textComponentParagraphs([node('', hint)])[0];
  const before = { title: '제목', text: paragraphs, links: [], images: [], flow: [{ kind: 'se-text', paragraphs }] };
  const after = { title: '제목', text: [text], links: [{ text: site, href: site }], images: [], flow: [{ kind: 'se-text', paragraphs: [text] }] };
  assertExplicitServiceLinkChange(before, after, text, site);
  assert.throws(() => assertExplicitServiceLinkChange({ ...before, text: [hint] }, after, text, site), /text/);
});
